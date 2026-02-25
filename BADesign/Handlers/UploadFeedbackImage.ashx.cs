using System;
using System.IO;
using System.Web;
using System.Web.SessionState;

namespace BADesign.Handlers
{
    /// <summary>Handler upload ảnh cho CKEditor (paste/drag). CKEditor 5 Simple Upload gửi file với tên "upload". Trả về JSON { "url": "..." }.</summary>
    public class UploadFeedbackImage : IHttpHandler, IRequiresSessionState
    {
        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";

            try
            {
                if (context.Session["UiUserId"] == null)
                {
                    WriteError(context, "Cần đăng nhập.");
                    return;
                }

                HttpPostedFile file = context.Request.Files["upload"] ?? context.Request.Files["file"] ?? (context.Request.Files.Count > 0 ? context.Request.Files[0] : null);
                if (file == null || file.ContentLength == 0)
                {
                    WriteError(context, "Không có file.");
                    return;
                }

                if (!file.ContentType.StartsWith("image/"))
                {
                    WriteError(context, "Chỉ chấp nhận ảnh.");
                    return;
                }

                if (file.ContentLength > 5 * 1024 * 1024)
                {
                    WriteError(context, "Ảnh tối đa 5MB.");
                    return;
                }

                var baseDir = context.Server.MapPath("~/Content/FeedbackImages/");
                var yearFolder = Path.Combine(baseDir, DateTime.Now.Year.ToString());
                if (!Directory.Exists(yearFolder))
                    Directory.CreateDirectory(yearFolder);

                var ext = Path.GetExtension(file.FileName);
                if (string.IsNullOrEmpty(ext) || ext.Length > 5)
                    ext = ".png";
                var fileName = Guid.NewGuid().ToString("N") + ext;
                var physicalPath = Path.Combine(yearFolder, fileName);
                file.SaveAs(physicalPath);

                var virtualPath = "~/Content/FeedbackImages/" + DateTime.Now.Year + "/" + fileName;
                var url = VirtualPathUtility.ToAbsolute(virtualPath);
                context.Response.Write("{\"url\":\"" + HttpUtility.JavaScriptStringEncode(url, false) + "\"}");
            }
            catch (Exception ex)
            {
                WriteError(context, ex.Message);
            }
        }

        private static void WriteError(HttpContext context, string message)
        {
            context.Response.Write("{\"error\":{\"message\":\"" + HttpUtility.JavaScriptStringEncode(message) + "\"}}");
        }

        public bool IsReusable => false;
    }
}
