using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class Feedback : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            ucBaSidebar.ActiveSection = "Feedback";
            ucBaTopBar.PageTitle = "Góp ý";
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SubmitFeedback(string title, string content, string category, string pageUrl)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (string.IsNullOrWhiteSpace(title))
                    return new { success = false, message = "Vui lòng nhập tiêu đề." };
                if (string.IsNullOrWhiteSpace(content))
                    return new { success = false, message = "Vui lòng nhập nội dung." };

                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var pageUrlTrim = (pageUrl ?? "").Trim();
                if (pageUrlTrim.Length > 512) pageUrlTrim = pageUrlTrim.Substring(0, 512);
                var categoryTrim = (category ?? "").Trim();
                if (categoryTrim.Length > 64) categoryTrim = categoryTrim.Substring(0, 64);

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"INSERT INTO UiFeedback (UserId, Title, Content, Category, Status, PageUrl) VALUES (@uid, @title, @content, @cat, N'New', @pageUrl)";
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@title", title.Trim());
                    cmd.Parameters.AddWithValue("@content", content.Trim());
                    cmd.Parameters.AddWithValue("@cat", string.IsNullOrEmpty(categoryTrim) ? (object)DBNull.Value : categoryTrim);
                    cmd.Parameters.AddWithValue("@pageUrl", string.IsNullOrEmpty(pageUrlTrim) ? (object)DBNull.Value : pageUrlTrim);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                if (string.Equals(categoryTrim, "Bug", StringComparison.OrdinalIgnoreCase))
                {
                    try { TelegramHelper.SendBugNotification(title.Trim()); } catch { }
                }
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Bug gần đây (category=Bug) để user kiểm tra trước khi gửi, tránh trùng.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetSimilarBugs(string keyword, int top = 15)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT TOP (@top) F.Id, F.Title, F.Status, F.CreatedAt,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName
FROM UiFeedback F
LEFT JOIN UiUser U ON U.UserId = F.UserId
WHERE F.Category = N'Bug' AND (F.Status IN (N'New', N'Read', N'InProgress', N'Reopen') OR F.UpdatedAt >= DATEADD(day, -30, SYSDATETIME()))
AND (@kw IS NULL OR @kw = '' OR F.Title LIKE N'%' + @kw + N'%')
ORDER BY F.CreatedAt DESC";
                    cmd.Parameters.AddWithValue("@top", Math.Min(Math.Max(top, 1), 50));
                    cmd.Parameters.AddWithValue("@kw", string.IsNullOrWhiteSpace(keyword) ? (object)DBNull.Value : keyword.Trim());
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var created = r.IsDBNull(3) ? (DateTime?)null : r.GetDateTime(3);
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                status = r.IsDBNull(2) ? "" : r.GetString(2),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
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

        /// <summary>Xem chi tiết một bug (chỉ Bug, để user kiểm tra trùng). Trả về title, content, ngày, người gửi.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetBugDetailForView(int id)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                object item = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT F.Id, F.Title, F.Content, F.Category, F.Status, F.CreatedAt,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName
FROM UiFeedback F
LEFT JOIN UiUser U ON U.UserId = F.UserId
WHERE F.Id = @id AND F.Category = N'Bug'";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            var created = r.IsDBNull(5) ? (DateTime?)null : r.GetDateTime(5);
                            item = new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                content = r.IsDBNull(2) ? "" : r.GetString(2),
                                category = r.IsDBNull(3) ? "" : r.GetString(3),
                                status = r.IsDBNull(4) ? "" : r.GetString(4),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                userName = r.IsDBNull(6) ? "" : r.GetString(6)
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

        /// <summary>Góp ý của user hiện tại: trạng thái, bắt đầu xử lý, dự kiến fix, phản hồi admin.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetMyFeedback()
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, list = new List<object>() };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT F.Id, F.Title, F.Category, F.Status, F.CreatedAt, F.UpdatedAt, F.StartedAt, F.ExpectedFixAt, F.AdminNote
FROM UiFeedback F
WHERE F.UserId = @uid
ORDER BY F.CreatedAt DESC";
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var created = r.IsDBNull(4) ? (DateTime?)null : r.GetDateTime(4);
                            var updated = r.IsDBNull(5) ? (DateTime?)null : r.GetDateTime(5);
                            var started = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6);
                            var expected = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                category = r.IsDBNull(2) ? "" : r.GetString(2),
                                status = r.IsDBNull(3) ? "" : r.GetString(3),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                updatedAt = updated.HasValue ? updated.Value.ToString("o") : (string)null,
                                startedAt = started.HasValue ? started.Value.ToString("o") : (string)null,
                                expectedFixAt = expected.HasValue ? expected.Value.ToString("o") : (string)null,
                                adminNote = r.IsDBNull(8) ? "" : r.GetString(8)
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

        /// <summary>Danh sách góp ý/bug có filter: từ ngày, đến ngày, chỉ của tôi. Dùng cho lưới gộp.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFeedbackList(string fromDate, string toDate, bool onlyMine, int top = 100)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                DateTime? from = null, to = null;
                DateTime df, dt;
                if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate.Trim(), System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out df)) from = df.Date;
                if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate.Trim(), System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out dt)) to = dt.Date.AddDays(1).AddTicks(-1);
                if (from.HasValue && to.HasValue && from.Value > to.Value) { var earlier = to.Value.Date; var laterEnd = from.Value.Date.AddDays(1).AddTicks(-1); from = earlier; to = laterEnd; }
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    var topVal = Math.Min(Math.Max(top, 1), 200);
                    var sql = "SELECT TOP (" + topVal + @") F.Id, F.Title, F.Category, F.Status, F.CreatedAt, F.UpdatedAt, F.StartedAt, F.ExpectedFixAt,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName
FROM UiFeedback F
LEFT JOIN UiUser U ON U.UserId = F.UserId
WHERE 1=1";
                    if (onlyMine) { sql += " AND F.UserId = @uid"; }
                    if (from.HasValue) { sql += " AND F.CreatedAt >= @from"; }
                    if (to.HasValue) { sql += " AND F.CreatedAt <= @to"; }
                    sql += " ORDER BY F.CreatedAt DESC";
                    cmd.CommandText = sql;
                    if (onlyMine) cmd.Parameters.AddWithValue("@uid", userId);
                    if (from.HasValue) cmd.Parameters.AddWithValue("@from", from.Value);
                    if (to.HasValue) cmd.Parameters.AddWithValue("@to", to.Value);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var created = r.IsDBNull(4) ? (DateTime?)null : r.GetDateTime(4);
                            var updated = r.IsDBNull(5) ? (DateTime?)null : r.GetDateTime(5);
                            var started = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6);
                            var expected = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                category = r.IsDBNull(2) ? "" : r.GetString(2),
                                status = r.IsDBNull(3) ? "" : r.GetString(3),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                updatedAt = updated.HasValue ? updated.Value.ToString("o") : (string)null,
                                startedAt = started.HasValue ? started.Value.ToString("o") : (string)null,
                                expectedFixAt = expected.HasValue ? expected.Value.ToString("o") : (string)null,
                                userName = r.IsDBNull(8) ? "" : r.GetString(8)
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

        /// <summary>Chi tiết một góp ý (mọi hạng mục) để xem nội dung + timeline (createdAt, startedAt, expectedFixAt, updatedAt).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFeedbackDetailForView(int id)
        {
            try
            {
                UiAuthHelper.RequireLogin();
                object item = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT F.Id, F.Title, F.Content, F.Category, F.Status, F.CreatedAt, F.UpdatedAt, F.StartedAt, F.ExpectedFixAt, F.AdminNote,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName
FROM UiFeedback F
LEFT JOIN UiUser U ON U.UserId = F.UserId
WHERE F.Id = @id";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            var created = r.IsDBNull(5) ? (DateTime?)null : r.GetDateTime(5);
                            var updated = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6);
                            var started = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                            var expected = r.IsDBNull(8) ? (DateTime?)null : r.GetDateTime(8);
                            item = new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                content = r.IsDBNull(2) ? "" : r.GetString(2),
                                category = r.IsDBNull(3) ? "" : r.GetString(3),
                                status = r.IsDBNull(4) ? "" : r.GetString(4),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                updatedAt = updated.HasValue ? updated.Value.ToString("o") : (string)null,
                                startedAt = started.HasValue ? started.Value.ToString("o") : (string)null,
                                expectedFixAt = expected.HasValue ? expected.Value.ToString("o") : (string)null,
                                adminNote = r.IsDBNull(9) ? "" : r.GetString(9),
                                userName = r.IsDBNull(10) ? "" : r.GetString(10)
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

        /// <summary>Lịch sử trạng thái (chỉ tác giả hoặc admin).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFeedbackStatusHistoryForView(int id)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, list = new List<object>() };
                var userId = UiAuthHelper.CurrentUserId;
                if (!userId.HasValue) return new { success = false, list = new List<object>() };
                if (!UiAuthHelper.IsSuperAdmin && !UiAuthHelper.HasFeature("FeedbackManage"))
                {
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT UserId FROM UiFeedback WHERE Id = @id";
                        cmd.Parameters.AddWithValue("@id", id);
                        conn.Open();
                        var o = cmd.ExecuteScalar();
                        if (o == null || o == DBNull.Value || (int)o != userId.Value)
                            return new { success = false, list = new List<object>() };
                    }
                }
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT H.FromStatus, H.ToStatus, H.ChangedAt, H.Note, ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS ChangedByUserName
FROM UiFeedbackStatusHistory H LEFT JOIN UiUser U ON U.UserId = H.ChangedByUserId WHERE H.FeedbackId = @id ORDER BY H.ChangedAt DESC";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var changedAt = r.IsDBNull(2) ? (DateTime?)null : r.GetDateTime(2);
                            list.Add(new { fromStatus = r.IsDBNull(0) ? "" : r.GetString(0), toStatus = r.IsDBNull(1) ? "" : r.GetString(1), changedAt = changedAt.HasValue ? changedAt.Value.ToString("o") : (string)null, note = r.IsDBNull(3) ? "" : r.GetString(3), changedByUserName = r.IsDBNull(4) ? "" : r.GetString(4) });
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

        /// <summary>Comment của góp ý (chỉ tác giả hoặc admin).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFeedbackCommentsForView(int id)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, list = new List<object>() };
                var userId = UiAuthHelper.CurrentUserId;
                if (!userId.HasValue) return new { success = false, list = new List<object>() };
                if (!UiAuthHelper.IsSuperAdmin && !UiAuthHelper.HasFeature("FeedbackManage"))
                {
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT UserId FROM UiFeedback WHERE Id = @id";
                        cmd.Parameters.AddWithValue("@id", id);
                        conn.Open();
                        var o = cmd.ExecuteScalar();
                        if (o == null || o == DBNull.Value || (int)o != userId.Value)
                            return new { success = false, list = new List<object>() };
                    }
                }
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT C.Content, C.CreatedAt, ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName FROM UiFeedbackComment C LEFT JOIN UiUser U ON U.UserId = C.UserId WHERE C.FeedbackId = @id ORDER BY C.CreatedAt ASC";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var createdAt = r.IsDBNull(1) ? (DateTime?)null : r.GetDateTime(1);
                            list.Add(new { content = r.IsDBNull(0) ? "" : r.GetString(0), createdAt = createdAt.HasValue ? createdAt.Value.ToString("o") : (string)null, userName = r.IsDBNull(2) ? "" : r.GetString(2) });
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

        /// <summary>Mở lại góp ý/bug (chỉ tác giả). Trạng thái phải là Resolved, Closed hoặc NotABug. Ghi vào UiFeedbackStatusHistory để hiển thị rõ ai mở lại.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ReopenFeedback(int id, string reopenNote)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var note = (reopenNote ?? "").Trim();
                if (note.Length > 2000) note = note.Substring(0, 2000);
                string currentStatus = null;
                string feedbackTitle = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT Status, Title FROM UiFeedback WHERE Id = @id AND UserId = @uid AND Status IN (N'Resolved', N'Closed', N'NotABug')";
                        cmd.Parameters.AddWithValue("@id", id);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        using (var r = cmd.ExecuteReader())
                        {
                            if (r.Read())
                            {
                                currentStatus = r.IsDBNull(0) ? null : r.GetString(0);
                                feedbackTitle = r.IsDBNull(1) ? null : r.GetString(1);
                            }
                        }
                    }
                    if (string.IsNullOrEmpty(currentStatus))
                        return new { success = false, message = "Không thể mở lại. Chỉ tác giả mới mở lại được và trạng thái phải là Đã xử lý hoặc Đóng." };
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"INSERT INTO UiFeedbackStatusHistory (FeedbackId, FromStatus, ToStatus, ChangedByUserId, Note) VALUES (@id, @from, N'Reopen', @uid, @note)";
                        cmd.Parameters.AddWithValue("@id", id);
                        cmd.Parameters.AddWithValue("@from", currentStatus);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@note", string.IsNullOrEmpty(note) ? (object)DBNull.Value : note);
                        cmd.ExecuteNonQuery();
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "UPDATE UiFeedback SET Status = N'Reopen', UpdatedAt = SYSDATETIME() WHERE Id = @id AND UserId = @uid";
                        cmd.Parameters.AddWithValue("@id", id);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.ExecuteNonQuery();
                    }
                }
                try
                {
                    var userName = (HttpContext.Current?.Session?["UiUserName"] as string) ?? "User";
                    TelegramHelper.SendReopenNotification(id, feedbackTitle ?? "", userName, note);
                }
                catch { }
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }
    }
}
