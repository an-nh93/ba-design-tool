using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class DevShareView : Page
    {
        public int? PostId { get; private set; }
        public int CurrentUserId => UiAuthHelper.CurrentUserId ?? 0;
        public bool IsSuperAdmin => UiAuthHelper.IsSuperAdmin;

        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            ucBaSidebar.ActiveSection = "DevShare";
            ucBaTopBar.PageTitle = "Community Share";
            if (!IsPostBack)
            {
                var routeId = Page.RouteData?.Values["id"] as string;
                int id;
                if (!string.IsNullOrEmpty(routeId) && int.TryParse(routeId, out id))
                    PostId = id;
                else
                {
                    int qid;
                    if (int.TryParse(Request.QueryString["id"], out qid))
                        PostId = qid;
                }
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetPost(int id)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                object post = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT P.Id, P.Title, P.Slug, P.Summary, P.Body, P.AuthorId, P.CreatedAt, P.UpdatedAt, P.PublishedAt, P.LanguageTags, P.ViewCount, P.UsefulCount,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS AuthorName,
CAST(CASE WHEN EXISTS(SELECT 1 FROM DevShareUseful UU WHERE UU.PostId = P.Id AND UU.UserId = @uid) THEN 1 ELSE 0 END AS BIT) AS HasVoted
FROM DevSharePost P
LEFT JOIN UiUser U ON U.UserId = P.AuthorId
WHERE P.Id = @id AND (P.PublishedAt IS NOT NULL OR P.AuthorId = @uid)";
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@uid", UiAuthHelper.GetCurrentUserIdOrThrow());
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            var published = r.IsDBNull(8) ? (DateTime?)null : r.GetDateTime(8);
                            post = new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                slug = r.IsDBNull(2) ? "" : r.GetString(2),
                                summary = r.IsDBNull(3) ? "" : r.GetString(3),
                                body = r.IsDBNull(4) ? "" : r.GetString(4),
                                authorId = r.GetInt32(5),
                                createdAt = r.GetDateTime(6).ToString("o"),
                                updatedAt = r.GetDateTime(7).ToString("o"),
                                publishedAt = published.HasValue ? published.Value.ToString("o") : (string)null,
                                languageTags = r.IsDBNull(9) ? "" : r.GetString(9),
                                viewCount = r.GetInt32(10),
                                usefulCount = r.GetInt32(11),
                                authorName = r.IsDBNull(12) ? "" : r.GetString(12),
                                hasVoted = r.FieldCount > 13 && !r.IsDBNull(13) && r.GetBoolean(13)
                            };
                        }
                    }
                }
                if (post == null)
                    return new { success = false, message = "Bài viết không tồn tại hoặc chưa xuất bản." };
                return new { success = true, post = post };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object IncrementViewCount(int id)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE DevSharePost SET ViewCount = ViewCount + 1 WHERE Id = @id AND PublishedAt IS NOT NULL";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                return new { success = true };
            }
            catch { return new { success = false }; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetComments(int postId, string sort = "time_asc")
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var list = new List<object>();
                string orderBy = "C.CreatedAt ASC";
                if (sort == "time_desc") orderBy = "C.CreatedAt DESC";
                else if (sort == "useful_desc") orderBy = "ISNULL(C.UsefulCount, 0) DESC, C.CreatedAt DESC";
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT C.Id, C.PostId, C.AuthorId, C.Body, C.CreatedAt,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS AuthorName,
ISNULL(C.UsefulCount, 0) AS UsefulCount,
CAST(CASE WHEN EXISTS(SELECT 1 FROM DevShareCommentUseful UU WHERE UU.CommentId = C.Id AND UU.UserId = @uid) THEN 1 ELSE 0 END AS BIT) AS HasVoted
FROM DevShareComment C
LEFT JOIN UiUser U ON U.UserId = C.AuthorId
WHERE C.PostId = @pid AND C.ParentId IS NULL
ORDER BY " + orderBy;
                    cmd.Parameters.AddWithValue("@pid", postId);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                postId = r.GetInt32(1),
                                authorId = r.GetInt32(2),
                                body = r.IsDBNull(3) ? "" : r.GetString(3),
                                createdAt = r.GetDateTime(4).ToString("o"),
                                authorName = r.IsDBNull(5) ? "" : r.GetString(5),
                                usefulCount = r.FieldCount > 6 ? (r.IsDBNull(6) ? 0 : r.GetInt32(6)) : 0,
                                hasVoted = r.FieldCount > 7 && !r.IsDBNull(7) && r.GetBoolean(7)
                            });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, list = new List<object>() };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ToggleCommentUseful(int commentId)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                int usefulCount;
                bool hasVoted;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT 1 FROM DevShareCommentUseful WHERE CommentId = @cid AND UserId = @uid";
                        cmd.Parameters.AddWithValue("@cid", commentId);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        var exists = cmd.ExecuteScalar() != null;
                        if (exists)
                        {
                            cmd.CommandText = "DELETE FROM DevShareCommentUseful WHERE CommentId = @cid AND UserId = @uid; UPDATE DevShareComment SET UsefulCount = CASE WHEN ISNULL(UsefulCount,0) > 0 THEN UsefulCount - 1 ELSE 0 END WHERE Id = @cid";
                            cmd.ExecuteNonQuery();
                            hasVoted = false;
                        }
                        else
                        {
                            cmd.CommandText = "INSERT INTO DevShareCommentUseful (CommentId, UserId) VALUES (@cid, @uid); UPDATE DevShareComment SET UsefulCount = ISNULL(UsefulCount,0) + 1 WHERE Id = @cid";
                            cmd.ExecuteNonQuery();
                            hasVoted = true;
                        }
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ISNULL(UsefulCount,0) FROM DevShareComment WHERE Id = @cid";
                        cmd.Parameters.AddWithValue("@cid", commentId);
                        usefulCount = Convert.ToInt32(cmd.ExecuteScalar());
                    }
                }
                return new { success = true, usefulCount = usefulCount, hasVoted = hasVoted };
            }
            catch { return new { success = false }; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object AddComment(int postId, string body)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (string.IsNullOrWhiteSpace(body))
                    return new { success = false, message = "Vui lòng nhập nội dung." };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var bodyTrim = body.Trim();
                if (bodyTrim.Length > 8000) bodyTrim = bodyTrim.Substring(0, 8000);
                int newId = 0;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "INSERT INTO DevShareComment (PostId, AuthorId, Body) OUTPUT INSERTED.Id VALUES (@pid, @uid, @body)";
                    cmd.Parameters.AddWithValue("@pid", postId);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@body", bodyTrim);
                    conn.Open();
                    newId = (int)cmd.ExecuteScalar();
                }
                var authorName = DevShareHelper.GetUserName(userId);
                return new { success = true, id = newId, authorName = authorName, createdAt = DateTime.UtcNow.ToString("o") };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ToggleUseful(int postId)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                int usefulCount;
                bool hasVoted;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT 1 FROM DevShareUseful WHERE PostId = @pid AND UserId = @uid";
                        cmd.Parameters.AddWithValue("@pid", postId);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        var exists = cmd.ExecuteScalar() != null;
                        if (exists)
                        {
                            cmd.CommandText = "DELETE FROM DevShareUseful WHERE PostId = @pid AND UserId = @uid; UPDATE DevSharePost SET UsefulCount = UsefulCount - 1 WHERE Id = @pid";
                            cmd.ExecuteNonQuery();
                            hasVoted = false;
                        }
                        else
                        {
                            cmd.CommandText = "INSERT INTO DevShareUseful (PostId, UserId) VALUES (@pid, @uid); UPDATE DevSharePost SET UsefulCount = UsefulCount + 1 WHERE Id = @pid";
                            cmd.ExecuteNonQuery();
                            hasVoted = true;
                        }
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT UsefulCount FROM DevSharePost WHERE Id = @pid";
                        cmd.Parameters.AddWithValue("@pid", postId);
                        usefulCount = Convert.ToInt32(cmd.ExecuteScalar());
                    }
                }
                return new { success = true, usefulCount = usefulCount, hasVoted = hasVoted };
            }
            catch { return new { success = false }; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DeletePost(int postId)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var isSuperAdmin = UiAuthHelper.IsSuperAdmin;
                int authorId = 0;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT AuthorId FROM DevSharePost WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", postId);
                    conn.Open();
                    var obj = cmd.ExecuteScalar();
                    if (obj == null || obj == DBNull.Value)
                        return new { success = false, message = "Bài viết không tồn tại." };
                    authorId = Convert.ToInt32(obj);
                }
                if (authorId != userId && !isSuperAdmin)
                    return new { success = false, message = "Chỉ chủ bài viết hoặc Super Admin mới được xóa." };
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "DELETE FROM DevSharePost WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", postId);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                return new { success = true };
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
                    cmd.CommandText = "SELECT Id, OriginalFileName, FileSizeBytes, StoragePath FROM DevShareCodeAttachment WHERE PostId = @pid ORDER BY UploadedAt";
                    cmd.Parameters.AddWithValue("@pid", postId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                originalFileName = r.IsDBNull(1) ? "" : r.GetString(1),
                                fileSizeBytes = r.GetInt64(2),
                                storagePath = r.IsDBNull(3) ? "" : r.GetString(3)
                            });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, list = new List<object>() };
            }
        }
    }
}
