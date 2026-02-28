using System;
using System.Collections.Generic;
using System.IO;
using System.Web;
using System.Web.SessionState;

namespace BADesign.Handlers
{
    /// <summary>Upload file đính kèm Dev Share (ZIP hoặc file code). postId=0 hoặc rỗng => lưu tạm _temp/{guid}.</summary>
    public class UploadDevShareAttachment : IHttpHandler, IRequiresSessionState
    {
        private static readonly HashSet<string> AllowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".zip", ".cs", ".js", ".sql", ".config", ".html", ".htm", ".css", ".php", ".aspx", ".cshtml", ".json", ".xml", ".txt", ".vb", ".md"
        };
        private const int MaxFileSizeBytes = 20 * 1024 * 1024; // 20 MB
        private const int MaxFilesPerRequest = 5;

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";

            try
            {
                if (context.Session?["UiUserId"] == null)
                {
                    WriteJson(context, false, "Cần đăng nhập.", null);
                    return;
                }

                int postId = 0;
                var postIdStr = context.Request["postId"];
                if (!string.IsNullOrEmpty(postIdStr))
                    int.TryParse(postIdStr, out postId);

                var baseDir = context.Server.MapPath("~/Content/DevShareAttachments/");
                if (!Directory.Exists(baseDir))
                    Directory.CreateDirectory(baseDir);

                var files = new List<object>();
                var fileCount = 0;
                for (int i = 0; i < context.Request.Files.Count && fileCount < MaxFilesPerRequest; i++)
                {
                    var file = context.Request.Files[i];
                    if (file == null || file.ContentLength == 0) continue;

                    if (file.ContentLength > MaxFileSizeBytes)
                    {
                        WriteJson(context, false, "Mỗi file tối đa 20MB.", null);
                        return;
                    }

                    var ext = Path.GetExtension(file.FileName);
                    if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
                    {
                        WriteJson(context, false, "Định dạng file không được phép. Chấp nhận: ZIP, .cs, .js, .sql, .config, .html, .css, .php, .aspx, .json, .xml, .txt, .vb, .md", null);
                        return;
                    }

                    string physicalPath;
                    string storagePath;
                    string fileName;

                    if (postId > 0)
                    {
                        var yearFolder = Path.Combine(baseDir, DateTime.Now.Year.ToString());
                        var postFolder = Path.Combine(yearFolder, postId.ToString());
                        if (!Directory.Exists(yearFolder)) Directory.CreateDirectory(yearFolder);
                        if (!Directory.Exists(postFolder)) Directory.CreateDirectory(postFolder);
                        fileName = Guid.NewGuid().ToString("N") + ext;
                        physicalPath = Path.Combine(postFolder, fileName);
                        storagePath = string.Format("DevShareAttachments/{0}/{1}/{2}", DateTime.Now.Year, postId, fileName);
                    }
                    else
                    {
                        var tempGuid = Guid.NewGuid().ToString("N");
                        var tempFolder = Path.Combine(baseDir, "_temp", tempGuid);
                        if (!Directory.Exists(Path.Combine(baseDir, "_temp"))) Directory.CreateDirectory(Path.Combine(baseDir, "_temp"));
                        Directory.CreateDirectory(tempFolder);
                        fileName = Guid.NewGuid().ToString("N") + ext;
                        physicalPath = Path.Combine(tempFolder, fileName);
                        storagePath = string.Format("DevShareAttachments/_temp/{0}/{1}", tempGuid, fileName);
                    }

                    var safeOriginal = Path.GetFileName(file.FileName) ?? "file" + ext;
                    if (safeOriginal.Length > 255) safeOriginal = safeOriginal.Substring(0, 255);

                    file.SaveAs(physicalPath);

                    files.Add(new
                    {
                        fileKey = storagePath,
                        originalFileName = safeOriginal,
                        fileSizeBytes = file.ContentLength,
                        contentType = file.ContentType ?? "application/octet-stream"
                    });
                    fileCount++;
                }

                if (files.Count == 0)
                {
                    WriteJson(context, false, "Không có file hợp lệ.", null);
                    return;
                }

                WriteJson(context, true, null, files);
            }
            catch (Exception ex)
            {
                WriteJson(context, false, ex.Message, null);
            }
        }

        private static void WriteJson(HttpContext context, bool success, string message, System.Collections.Generic.List<object> files)
        {
            var sb = new System.Text.StringBuilder();
            sb.Append("{\"success\":").Append(success ? "true" : "false");
            if (!string.IsNullOrEmpty(message))
                sb.Append(",\"message\":").Append(Newtonsoft.Json.JsonConvert.SerializeObject(message));
            if (files != null)
            {
                sb.Append(",\"files\":");
                sb.Append(Newtonsoft.Json.JsonConvert.SerializeObject(files));
            }
            sb.Append("}");
            context.Response.Write(sb.ToString());
        }

        public bool IsReusable => false;
    }
}
