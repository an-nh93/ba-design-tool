using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class FeedbackManage : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!UiAuthHelper.IsSuperAdmin)
            {
                Response.Redirect(ResolveUrl("~/AccessDenied"), true);
                return;
            }
            ucBaSidebar.ActiveSection = "FeedbackManage";
            ucBaTopBar.PageTitle = "Quản lý góp ý";
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFeedbackList(string status, string dateFrom, string dateTo)
        {
            try
            {
                if (!UiAuthHelper.IsSuperAdmin)
                    return new { success = false, list = new List<object>() };

                var where = new List<string> { "1=1" };
                if (!string.IsNullOrWhiteSpace(status))
                    where.Add("F.Status = @status");
                DateTime dFrom, dTo;
                if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, CultureInfo.InvariantCulture, DateTimeStyles.None, out dFrom))
                    where.Add("F.CreatedAt >= @dateFrom");
                if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, CultureInfo.InvariantCulture, DateTimeStyles.None, out dTo))
                    where.Add("F.CreatedAt < @dateToEnd");

                var sql = @"SELECT F.Id, F.Title, F.Category, F.Status, F.CreatedAt, ISNULL(U.UserName, N'User ' + CAST(F.UserId AS NVARCHAR(20))) AS UserName,
F.StartedAt, F.ExpectedFixAt
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
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var created = r.IsDBNull(4) ? (DateTime?)null : r.GetDateTime(4);
                            var started = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6);
                            var expected = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                title = r.IsDBNull(1) ? "" : r.GetString(1),
                                category = r.IsDBNull(2) ? "" : r.GetString(2),
                                status = r.IsDBNull(3) ? "" : r.GetString(3),
                                createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                userName = r.IsDBNull(5) ? "" : r.GetString(5),
                                startedAt = started.HasValue ? started.Value.ToString("o") : (string)null,
                                expectedFixAt = expected.HasValue ? expected.Value.ToString("o") : (string)null
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
                if (!UiAuthHelper.IsSuperAdmin)
                    return new { success = false, item = (object)null };

                object item = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT F.Id, F.UserId, F.Title, F.Content, F.Category, F.Status, F.PageUrl, F.CreatedAt, F.UpdatedAt, F.AdminNote,
ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName, F.StartedAt, F.ExpectedFixAt
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
                                expectedFixAt = expected.HasValue ? expected.Value.ToString("o") : (string)null
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
        public static object UpdateFeedback(int id, string status, string adminNote, string startedAt, string expectedFixAt)
        {
            try
            {
                if (!UiAuthHelper.IsSuperAdmin)
                    return new { success = false };

                DateTime? dStarted = null, dExpected = null;
                DateTime ds, de;
                if (!string.IsNullOrWhiteSpace(startedAt) && DateTime.TryParse(startedAt, CultureInfo.InvariantCulture, DateTimeStyles.None, out ds))
                    dStarted = ds.Date.Add(DateTime.Now.TimeOfDay);
                if (!string.IsNullOrWhiteSpace(expectedFixAt) && DateTime.TryParse(expectedFixAt, CultureInfo.InvariantCulture, DateTimeStyles.None, out de))
                    dExpected = de;

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"UPDATE UiFeedback SET Status = @st, UpdatedAt = SYSDATETIME(), AdminNote = @note,
StartedAt = @started, ExpectedFixAt = @expected WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@st", (status ?? "New").Trim());
                    cmd.Parameters.AddWithValue("@note", string.IsNullOrWhiteSpace(adminNote) ? (object)DBNull.Value : adminNote.Trim());
                    cmd.Parameters.AddWithValue("@started", dStarted.HasValue ? (object)dStarted.Value : DBNull.Value);
                    cmd.Parameters.AddWithValue("@expected", dExpected.HasValue ? (object)dExpected.Value : DBNull.Value);
                    conn.Open();
                    cmd.ExecuteNonQuery();
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
