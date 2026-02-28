using System;
using System.IO;
using System.Web;
using System.Web.SessionState;
using System.Data.SqlClient;
using BADesign;

namespace BADesign.Handlers
{
    /// <summary>Download file đính kèm Dev Share theo Id. Chỉ cho phép khi bài đã xuất bản hoặc user là tác giả.</summary>
    public class DownloadDevShareAttachment : IHttpHandler, IRequiresSessionState
    {
        public void ProcessRequest(HttpContext context)
        {
            if (context.Session?["UiUserId"] == null)
            {
                context.Response.StatusCode = 401;
                context.Response.End();
                return;
            }
            var idStr = context.Request.QueryString["id"];
            int id;
            if (string.IsNullOrEmpty(idStr) || !int.TryParse(idStr, out id))
            {
                context.Response.StatusCode = 400;
                context.Response.End();
                return;
            }
            string storagePath = null, originalFileName = null;
            int postId = 0, authorId = 0;
            DateTime? publishedAt = null;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"SELECT A.StoragePath, A.OriginalFileName, A.PostId, P.AuthorId, P.PublishedAt
FROM DevShareCodeAttachment A
INNER JOIN DevSharePost P ON P.Id = A.PostId
WHERE A.Id = @id";
                cmd.Parameters.AddWithValue("@id", id);
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (r.Read())
                    {
                        storagePath = r.IsDBNull(0) ? null : r.GetString(0);
                        originalFileName = r.IsDBNull(1) ? null : r.GetString(1);
                        postId = r.GetInt32(2);
                        authorId = r.GetInt32(3);
                        publishedAt = r.IsDBNull(4) ? (DateTime?)null : r.GetDateTime(4);
                    }
                }
            }
            if (string.IsNullOrEmpty(storagePath))
            {
                context.Response.StatusCode = 404;
                context.Response.End();
                return;
            }
            var userId = (int)context.Session["UiUserId"];
            if (!publishedAt.HasValue && authorId != userId)
            {
                context.Response.StatusCode = 403;
                context.Response.End();
                return;
            }
            var physicalPath = context.Server.MapPath("~/Content/" + storagePath);
            if (!File.Exists(physicalPath))
            {
                context.Response.StatusCode = 404;
                context.Response.End();
                return;
            }
            var safeName = originalFileName ?? Path.GetFileName(physicalPath) ?? "download";
            foreach (var c in Path.GetInvalidFileNameChars())
                safeName = safeName.Replace(c, '_');
            context.Response.ContentType = "application/octet-stream";
            context.Response.AppendHeader("Content-Disposition", "attachment; filename=\"" + safeName + "\"");
            context.Response.TransmitFile(physicalPath);
        }

        public bool IsReusable => false;
    }
}
