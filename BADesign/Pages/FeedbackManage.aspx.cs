using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.Text;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class FeedbackManage : Page
    {
        private static bool CanManageFeedback()
        {
            return UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("FeedbackManage");
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!CanManageFeedback())
            {
                Response.Redirect(ResolveUrl("~/AccessDenied"), true);
                return;
            }
            ucBaSidebar.ActiveSection = "FeedbackManage";
            ucBaTopBar.PageTitle = "Quản lý góp ý";
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFeedbackList(string status, string dateFrom, string dateTo, string keyword, string tags)
        {
            try
            {
                if (!CanManageFeedback())
                    return new { success = false, list = new List<object>() };

                var where = new List<string> { "1=1" };
                if (!string.IsNullOrWhiteSpace(status))
                    where.Add("F.Status = @status");
                DateTime dFrom, dTo;
                if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, CultureInfo.InvariantCulture, DateTimeStyles.None, out dFrom))
                    where.Add("F.CreatedAt >= @dateFrom");
                if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, CultureInfo.InvariantCulture, DateTimeStyles.None, out dTo))
                    where.Add("F.CreatedAt < @dateToEnd");
                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    where.Add("(F.Title LIKE @kw OR F.Content LIKE @kw OR F.AdminNote LIKE @kw)");
                }
                if (!string.IsNullOrWhiteSpace(tags))
                {
                    var tagParts = tags.Trim().Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                    if (tagParts.Length > 0)
                    {
                        var tagConditions = new List<string>();
                        for (int i = 0; i < tagParts.Length; i++)
                            tagConditions.Add("(F.Tags IS NOT NULL AND F.Tags LIKE @tag" + i + ")");
                        where.Add("(" + string.Join(" OR ", tagConditions) + ")");
                    }
                }

                var sql = @"SELECT F.Id, F.Title, F.Category, F.Status, F.CreatedAt, ISNULL(U.UserName, N'User ' + CAST(F.UserId AS NVARCHAR(20))) AS UserName,
F.StartedAt, F.ExpectedFixAt, ISNULL(F.Tags, N'') AS Tags
FROM UiFeedback F
LEFT JOIN UiUser U ON U.UserId = F.UserId
WHERE " + string.Join(" AND ", where) + @"
ORDER BY F.CreatedAt DESC";
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = sql;
                    if (!string.IsNullOrWhiteSpace(status)) cmd.Parameters.AddWithValue("@status", status.Trim());
                    if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, CultureInfo.InvariantCulture, DateTimeStyles.None, out dFrom))
                        cmd.Parameters.AddWithValue("@dateFrom", dFrom);
                    if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, CultureInfo.InvariantCulture, DateTimeStyles.None, out dTo))
                        cmd.Parameters.AddWithValue("@dateToEnd", dTo.Date.AddDays(1));
                    if (!string.IsNullOrWhiteSpace(keyword))
                        cmd.Parameters.AddWithValue("@kw", "%" + keyword.Trim() + "%");
                    if (!string.IsNullOrWhiteSpace(tags))
                    {
                        var tagParts = tags.Trim().Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                        for (int i = 0; i < tagParts.Length; i++)
                            cmd.Parameters.AddWithValue("@tag" + i, "%" + tagParts[i].Trim() + "%");
                    }
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var created = r.IsDBNull(4) ? (DateTime?)null : r.GetDateTime(4);
                            var started = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6);
                            var expected = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                            var tagsVal = r.FieldCount > 8 && !r.IsDBNull(8) ? r.GetString(8) : "";
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                category = r.IsDBNull(2) ? "" : r.GetString(2),
                                status = r.IsDBNull(3) ? "" : r.GetString(3),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                userName = r.IsDBNull(5) ? "" : r.GetString(5),
                                startedAt = started.HasValue ? started.Value.ToString("o") : (string)null,
                                expectedFixAt = expected.HasValue ? expected.Value.ToString("o") : (string)null,
                                tags = tagsVal
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
        public static object GetFeedbackDetail(int id)
        {
            try
            {
                if (!CanManageFeedback())
                    return new { success = false, item = (object)null };

                object item = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT F.Id, F.UserId, F.Title, F.Content, F.Category, F.Status, F.PageUrl, F.CreatedAt, F.UpdatedAt, F.AdminNote,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName, F.StartedAt, F.ExpectedFixAt, ISNULL(F.Tags, N'') AS Tags
FROM UiFeedback F
LEFT JOIN UiUser U ON U.UserId = F.UserId
WHERE F.Id = @id";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            var created = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                            var updated = r.IsDBNull(8) ? (DateTime?)null : r.GetDateTime(8);
                            var started = r.IsDBNull(11) ? (DateTime?)null : r.GetDateTime(11);
                            var expected = r.IsDBNull(12) ? (DateTime?)null : r.GetDateTime(12);
                            var tagsVal = r.FieldCount > 13 && !r.IsDBNull(13) ? r.GetString(13) : "";
                            item = new
                            {
                                id = r.GetInt32(0),
                                userId = r.GetInt32(1),
                                title = r.IsDBNull(2) ? "" : r.GetString(2),
                                content = r.IsDBNull(3) ? "" : r.GetString(3),
                                category = r.IsDBNull(4) ? "" : r.GetString(4),
                                status = r.IsDBNull(5) ? "" : r.GetString(5),
                                pageUrl = r.IsDBNull(6) ? "" : r.GetString(6),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                updatedAt = updated.HasValue ? updated.Value.ToString("o") : (string)null,
                                adminNote = r.IsDBNull(9) ? "" : r.GetString(9),
                                userName = r.IsDBNull(10) ? "" : r.GetString(10),
                                startedAt = started.HasValue ? started.Value.ToString("o") : (string)null,
                                expectedFixAt = expected.HasValue ? expected.Value.ToString("o") : (string)null,
                                tags = tagsVal
                            };
                        }
                    }
                }
                return new { success = item != null, item = item };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, item = (object)null };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFeedbackStatusHistory(int id)
        {
            try
            {
                if (!CanManageFeedback())
                    return new { success = false, list = new List<object>() };
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT H.Id, H.FromStatus, H.ToStatus, H.ChangedAt, H.ChangedByUserId, H.Note,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS ChangedByUserName
FROM UiFeedbackStatusHistory H
LEFT JOIN UiUser U ON U.UserId = H.ChangedByUserId
WHERE H.FeedbackId = @id ORDER BY H.ChangedAt DESC";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var changedAt = r.IsDBNull(3) ? (DateTime?)null : r.GetDateTime(3);
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                fromStatus = r.IsDBNull(1) ? "" : r.GetString(1),
                                toStatus = r.IsDBNull(2) ? "" : r.GetString(2),
                                changedAt = changedAt.HasValue ? changedAt.Value.ToString("o") : (string)null,
                                changedByUserId = r.IsDBNull(4) ? (int?)null : r.GetInt32(4),
                                note = r.IsDBNull(5) ? "" : r.GetString(5),
                                changedByUserName = r.IsDBNull(6) ? "" : r.GetString(6)
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
        public static object GetFeedbackComments(int id)
        {
            try
            {
                if (!CanManageFeedback())
                    return new { success = false, list = new List<object>() };
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT C.Id, C.UserId, C.Content, C.CreatedAt,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName
FROM UiFeedbackComment C
LEFT JOIN UiUser U ON U.UserId = C.UserId
WHERE C.FeedbackId = @id ORDER BY C.CreatedAt ASC";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var createdAt = r.IsDBNull(3) ? (DateTime?)null : r.GetDateTime(3);
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                userId = r.GetInt32(1),
                                content = r.IsDBNull(2) ? "" : r.GetString(2),
                                createdAt = createdAt.HasValue ? createdAt.Value.ToString("o") : (string)null,
                                userName = r.IsDBNull(4) ? "" : r.GetString(4)
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
        public static object AddFeedbackComment(int feedbackId, string content)
        {
            try
            {
                if (!CanManageFeedback())
                    return new { success = false, message = "Không có quyền." };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                content = (content ?? "").Trim();
                if (content.Length == 0)
                    return new { success = false, message = "Nội dung comment không được để trống." };
                int authorUserId = 0;
                int newId = 0;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT UserId FROM UiFeedback WHERE Id = @fid";
                        cmd.Parameters.AddWithValue("@fid", feedbackId);
                        var o = cmd.ExecuteScalar();
                        if (o != null && o != DBNull.Value) authorUserId = Convert.ToInt32(o);
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "INSERT INTO UiFeedbackComment (FeedbackId, UserId, Content) VALUES (@fid, @uid, @content); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                        cmd.Parameters.AddWithValue("@fid", feedbackId);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@content", content);
                        newId = (int)cmd.ExecuteScalar();
                    }
                }
                if (authorUserId != 0)
                {
                    try
                    {
                        string authorEmail = null;
                        using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT Email FROM UiUser WHERE UserId = @uid";
                            cmd.Parameters.AddWithValue("@uid", authorUserId);
                            conn.Open();
                            var o = cmd.ExecuteScalar();
                            authorEmail = (o != null && o != DBNull.Value) ? o.ToString().Trim() : null;
                        }
                        if (!string.IsNullOrEmpty(authorEmail))
                        {
                            var body = "Có phản hồi mới cho góp ý #" + feedbackId + ".<br/>Nội dung: " + HttpUtility.HtmlEncode(content);
                            EmailHelper.SendEmail(authorEmail, "[BADesign] Phản hồi góp ý #" + feedbackId, body, true);
                        }
                    }
                    catch { /* ignore */ }
                }
                return new { success = true, id = newId };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateFeedback(int id, string status, string adminNote, string startedAt, string expectedFixAt, string tags)
        {
            try
            {
                if (!CanManageFeedback())
                    return new { success = false };

                var newStatus = (status ?? "New").Trim();
                DateTime? dStarted = null, dExpected = null;
                DateTime ds, de;
                if (!string.IsNullOrWhiteSpace(startedAt) && DateTime.TryParse(startedAt, CultureInfo.InvariantCulture, DateTimeStyles.None, out ds))
                    dStarted = ds.Date.Add(DateTime.Now.TimeOfDay);
                if (!string.IsNullOrWhiteSpace(expectedFixAt) && DateTime.TryParse(expectedFixAt, CultureInfo.InvariantCulture, DateTimeStyles.None, out de))
                    dExpected = de;
                var tagsVal = string.IsNullOrWhiteSpace(tags) ? null : tags.Trim();

                int authorUserId = 0;
                string oldStatus = null;

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT Status, UserId FROM UiFeedback WHERE Id = @id";
                        cmd.Parameters.AddWithValue("@id", id);
                        using (var r = cmd.ExecuteReader())
                        {
                            if (r.Read())
                            {
                                oldStatus = r.IsDBNull(0) ? null : r.GetString(0);
                                authorUserId = r.GetInt32(1);
                            }
                        }
                    }

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"UPDATE UiFeedback SET Status = @st, UpdatedAt = SYSDATETIME(), AdminNote = @note,
StartedAt = @started, ExpectedFixAt = @expected, Tags = @tags WHERE Id = @id";
                        cmd.Parameters.AddWithValue("@id", id);
                        cmd.Parameters.AddWithValue("@st", newStatus);
                        cmd.Parameters.AddWithValue("@note", string.IsNullOrWhiteSpace(adminNote) ? (object)DBNull.Value : adminNote.Trim());
                        cmd.Parameters.AddWithValue("@started", dStarted.HasValue ? (object)dStarted.Value : DBNull.Value);
                        cmd.Parameters.AddWithValue("@expected", dExpected.HasValue ? (object)dExpected.Value : DBNull.Value);
                        cmd.Parameters.AddWithValue("@tags", string.IsNullOrEmpty(tagsVal) ? (object)DBNull.Value : tagsVal);
                        cmd.ExecuteNonQuery();
                    }

                    if (oldStatus != null && !string.Equals(oldStatus, newStatus, StringComparison.OrdinalIgnoreCase))
                    {
                        var changedBy = UiAuthHelper.CurrentUserId;
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"INSERT INTO UiFeedbackStatusHistory (FeedbackId, FromStatus, ToStatus, ChangedByUserId, Note)
VALUES (@fid, @from, @to, @uid, @note)";
                            cmd.Parameters.AddWithValue("@fid", id);
                            cmd.Parameters.AddWithValue("@from", (object)oldStatus ?? DBNull.Value);
                            cmd.Parameters.AddWithValue("@to", newStatus);
                            cmd.Parameters.AddWithValue("@uid", changedBy.HasValue ? (object)changedBy.Value : DBNull.Value);
                            cmd.Parameters.AddWithValue("@note", string.IsNullOrWhiteSpace(adminNote) ? (object)DBNull.Value : adminNote.Trim());
                            cmd.ExecuteNonQuery();
                        }
                    }
                }

                if (authorUserId != 0)
                {
                    try
                    {
                        string authorEmail = null;
                        string feedbackTitle = null;
                        using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT Email FROM UiUser WHERE UserId = @uid";
                            cmd.Parameters.AddWithValue("@uid", authorUserId);
                            conn.Open();
                            var o = cmd.ExecuteScalar();
                            authorEmail = (o != null && o != DBNull.Value) ? o.ToString().Trim() : null;
                        }
                        using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT Title FROM UiFeedback WHERE Id = @id";
                            cmd.Parameters.AddWithValue("@id", id);
                            conn.Open();
                            var o = cmd.ExecuteScalar();
                            feedbackTitle = (o != null && o != DBNull.Value) ? o.ToString().Trim() : ("#" + id);
                        }
                        if (!string.IsNullOrEmpty(authorEmail))
                        {
                            var body = string.Format("Góp ý của bạn (Id: {0}, Tiêu đề: {1}) đã được cập nhật.<br/>Trạng thái mới: {2}.<br/>Bạn có thể xem chi tiết tại trang Góp ý.", id, HttpUtility.HtmlEncode(feedbackTitle ?? ""), HttpUtility.HtmlEncode(newStatus));
                            EmailHelper.SendEmail(authorEmail, "[BADesign] Cập nhật góp ý #" + id, body, true);
                        }
                    }
                    catch { /* ignore email failure */ }
                }

                return new { success = true };
            }
            catch
            {
                return new { success = false };
            }
        }
    }
}
