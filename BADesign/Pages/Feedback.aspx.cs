using System;
using System.Collections.Generic;
using System.Data.SqlClient;
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
WHERE F.Category = N'Bug' AND (F.Status IN (N'New', N'Read', N'InProgress') OR F.UpdatedAt >= DATEADD(day, -30, SYSDATETIME()))
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

        /// <summary>Mở lại góp ý/bug (chỉ tác giả). Trạng thái phải là Resolved hoặc Closed.</summary>
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
                var reopenLabel = "[Reopen " + DateTime.Now.ToString("yyyy-MM-dd HH:mm") + ": " + (string.IsNullOrEmpty(note) ? "(không ghi chú)" : note) + "]";
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"UPDATE UiFeedback SET Status = N'New', UpdatedAt = SYSDATETIME(), AdminNote = ISNULL(AdminNote, N'') + @reopenLabel
WHERE Id = @id AND UserId = @uid AND Status IN (N'Resolved', N'Closed')";
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@reopenLabel", "\r\n" + reopenLabel);
                    conn.Open();
                    var updated = cmd.ExecuteNonQuery();
                    if (updated == 0)
                        return new { success = false, message = "Không thể mở lại. Chỉ tác giả mới mở lại được và trạng thái phải là Đã xử lý hoặc Đóng." };
                }
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }
    }
}
