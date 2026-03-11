using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    internal class TempAttachmentItem
    {
        public string fileKey { get; set; }
        public string originalFileName { get; set; }
        public long fileSizeBytes { get; set; }
    }

    public partial class DevShareEdit : Page
    {
        public int? EditPostId { get; private set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            ucBaSidebar.ActiveSection = "DevShare";
            ucBaTopBar.PageTitle = "Community Share - " + (Request.QueryString["id"] != null ? "Chỉnh sửa" : "Viết bài");
            if (!IsPostBack)
            {
                int id;
                if (int.TryParse(Request.QueryString["id"], out id) || (Page.RouteData?.Values["id"] != null && int.TryParse(Page.RouteData.Values["id"].ToString(), out id)))
                    EditPostId = id;
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetPost(int id)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                object post = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT P.Id, P.Title, P.Slug, P.Summary, P.Body, P.AuthorId, P.PublishedAt, P.LanguageTags
FROM DevSharePost P WHERE P.Id = @id AND P.AuthorId = @uid";
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            post = new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                slug = r.IsDBNull(2) ? "" : r.GetString(2),
                                summary = r.IsDBNull(3) ? "" : r.GetString(3),
                                body = r.IsDBNull(4) ? "" : r.GetString(4),
                                authorId = r.GetInt32(5),
                                publishedAt = r.IsDBNull(6) ? (string)null : r.GetDateTime(6).ToString("o"),
                                languageTags = r.IsDBNull(7) ? "" : r.GetString(7)
                            };
                        }
                    }
                }
                if (post == null)
                    return new { success = false, message = "Bài viết không tồn tại hoặc bạn không có quyền sửa." };
                return new { success = true, post = post };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SavePost(int id, string title, string summary, string body, string languageTags, bool publish, string tempFileKeysJson, string tempAttachmentsJson)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (string.IsNullOrWhiteSpace(title))
                    return new { success = false, message = "Vui lòng nhập tiêu đề." };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var titleTrim = title.Trim();
                if (titleTrim.Length > 500) titleTrim = titleTrim.Substring(0, 500);
                var summaryTrim = string.IsNullOrWhiteSpace(summary) ? null : summary.Trim();
                if (summaryTrim != null && summaryTrim.Length > 1000) summaryTrim = summaryTrim.Substring(0, 1000);
                var bodyTrim = body?.Trim() ?? "";
                var tagsTrim = string.IsNullOrWhiteSpace(languageTags) ? null : languageTags.Trim();
                if (tagsTrim != null && tagsTrim.Length > 500) tagsTrim = tagsTrim.Substring(0, 500);

                int postId;
                var now = DateTime.UtcNow;
                var ctx = HttpContext.Current;
                var baseDir = ctx.Server.MapPath("~/Content/DevShareAttachments/");

                if (id > 0)
                {
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "UPDATE DevSharePost SET Title=@title, Summary=@summary, Body=@body, LanguageTags=@tags, UpdatedAt=@now" + (publish ? ", PublishedAt=ISNULL(PublishedAt,@now)" : "") + " WHERE Id=@id AND AuthorId=@uid";
                        cmd.Parameters.AddWithValue("@id", id);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@title", titleTrim);
                        cmd.Parameters.AddWithValue("@summary", summaryTrim ?? (object)DBNull.Value);
                        cmd.Parameters.AddWithValue("@body", bodyTrim);
                        cmd.Parameters.AddWithValue("@tags", tagsTrim ?? (object)DBNull.Value);
                        cmd.Parameters.AddWithValue("@now", now);
                        conn.Open();
                        if (cmd.ExecuteNonQuery() == 0)
                            return new { success = false, message = "Bài viết không tồn tại hoặc không có quyền sửa." };
                    }
                    postId = id;
                }
                else
                {
                    var slug = DevShareHelper.EnsureUniqueSlug(titleTrim, 0);
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"INSERT INTO DevSharePost (Title, Slug, Summary, Body, AuthorId, PublishedAt, LanguageTags)
OUTPUT INSERTED.Id
VALUES (@title, @slug, @summary, @body, @uid, " + (publish ? "@now" : "NULL") + ", @tags)";
                        cmd.Parameters.AddWithValue("@title", titleTrim);
                        cmd.Parameters.AddWithValue("@slug", slug);
                        cmd.Parameters.AddWithValue("@summary", summaryTrim ?? (object)DBNull.Value);
                        cmd.Parameters.AddWithValue("@body", bodyTrim);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@tags", tagsTrim ?? (object)DBNull.Value);
                        if (publish) cmd.Parameters.AddWithValue("@now", now);
                        conn.Open();
                        postId = (int)cmd.ExecuteScalar();
                    }
                }

                var tempItems = new List<TempAttachmentItem>();
                if (!string.IsNullOrWhiteSpace(tempAttachmentsJson))
                {
                    try
                    {
                        var arr = Newtonsoft.Json.JsonConvert.DeserializeObject<TempAttachmentItem[]>(tempAttachmentsJson);
                        if (arr != null) tempItems.AddRange(arr);
                    }
                    catch { }
                }
                if (tempItems.Count == 0 && !string.IsNullOrWhiteSpace(tempFileKeysJson))
                {
                    try
                    {
                        var arr = Newtonsoft.Json.JsonConvert.DeserializeObject<string[]>(tempFileKeysJson);
                        if (arr != null) { foreach (var k in arr) tempItems.Add(new TempAttachmentItem { fileKey = k }); }
                    }
                    catch { }
                }
                foreach (var item in tempItems)
                {
                    var key = item?.fileKey;
                    if (string.IsNullOrWhiteSpace(key) || !key.StartsWith("DevShareAttachments/_temp/", StringComparison.OrdinalIgnoreCase)) continue;
                    var relPath = key.Trim();
                    var physicalSrc = ctx.Server.MapPath("~/Content/" + relPath);
                    if (!File.Exists(physicalSrc)) continue;
                    var yearFolder = Path.Combine(baseDir, DateTime.Now.Year.ToString());
                    var postFolder = Path.Combine(yearFolder, postId.ToString());
                    if (!Directory.Exists(yearFolder)) Directory.CreateDirectory(yearFolder);
                    if (!Directory.Exists(postFolder)) Directory.CreateDirectory(postFolder);
                    var fileName = Path.GetFileName(physicalSrc);
                    var destPath = Path.Combine(postFolder, fileName);
                    File.Move(physicalSrc, destPath);
                    var storagePath = string.Format("DevShareAttachments/{0}/{1}/{2}", DateTime.Now.Year, postId, fileName);
                    var originalName = !string.IsNullOrWhiteSpace(item.originalFileName) ? Path.GetFileName(item.originalFileName) : fileName;
                    if (originalName.Length > 255) originalName = originalName.Substring(0, 255);
                    var fi = new FileInfo(destPath);
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "INSERT INTO DevShareCodeAttachment (PostId, FileName, OriginalFileName, StoragePath, FileSizeBytes, UploadedBy) VALUES (@pid, @fname, @orig, @path, @size, @uid)";
                        cmd.Parameters.AddWithValue("@pid", postId);
                        cmd.Parameters.AddWithValue("@fname", fileName);
                        cmd.Parameters.AddWithValue("@orig", originalName);
                        cmd.Parameters.AddWithValue("@path", storagePath);
                        cmd.Parameters.AddWithValue("@size", fi.Length);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        conn.Open();
                        cmd.ExecuteNonQuery();
                    }
                    try
                    {
                        var tempDir = Path.GetDirectoryName(physicalSrc);
                        if (Directory.Exists(tempDir) && tempDir.IndexOf("_temp", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            if (Directory.GetFileSystemEntries(tempDir).Length == 0)
                                Directory.Delete(tempDir, true);
                        }
                    }
                    catch { }
                }

                return new { success = true, postId = postId };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetAttachments(int postId)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Id, OriginalFileName, FileSizeBytes FROM DevShareCodeAttachment WHERE PostId = @pid ORDER BY UploadedAt";
                    cmd.Parameters.AddWithValue("@pid", postId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            list.Add(new { id = r.GetInt32(0), originalFileName = r.IsDBNull(1) ? "" : r.GetString(1), fileSizeBytes = r.GetInt64(2) });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch { return new { success = true, list = new List<object>() }; }
        }
    }
}
