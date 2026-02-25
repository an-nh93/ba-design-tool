using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Text;
using System.Web;
using System.Web.SessionState;
using BADesign;

namespace BADesign.Handlers
{
    /// <summary>Xuất danh sách feedback theo bộ lọc ra file CSV.</summary>
    public class ExportFeedback : IHttpHandler, IRequiresSessionState
    {
        private static bool CanManageFeedback()
        {
            return UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("FeedbackManage");
        }

        private static string CsvEscape(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            if (s.IndexOfAny(new[] { '"', ',', '\r', '\n' }) >= 0)
                return "\"" + s.Replace("\"", "\"\"") + "\"";
            return s;
        }

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "text/csv; charset=utf-8";
            context.Response.BufferOutput = true;

            try
            {
                if (context.Session["UiUserId"] == null)
                {
                    context.Response.StatusCode = 403;
                    context.Response.Write("Cần đăng nhập.");
                    return;
                }
                if (!CanManageFeedback())
                {
                    context.Response.StatusCode = 403;
                    context.Response.Write("Không có quyền xuất.");
                    return;
                }

                var status = context.Request["status"] ?? "";
                var dateFrom = context.Request["dateFrom"] ?? "";
                var dateTo = context.Request["dateTo"] ?? "";
                var keyword = context.Request["keyword"] ?? "";
                var tags = context.Request["tags"] ?? "";

                var where = new List<string> { "1=1" };
                if (!string.IsNullOrWhiteSpace(status))
                    where.Add("F.Status = @status");
                DateTime dFrom, dTo;
                if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, CultureInfo.InvariantCulture, DateTimeStyles.None, out dFrom))
                    where.Add("F.CreatedAt >= @dateFrom");
                if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, CultureInfo.InvariantCulture, DateTimeStyles.None, out dTo))
                    where.Add("F.CreatedAt < @dateToEnd");
                if (!string.IsNullOrWhiteSpace(keyword))
                    where.Add("(F.Title LIKE @kw OR F.Content LIKE @kw OR F.AdminNote LIKE @kw)");
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

                var filename = "feedback-" + DateTime.Now.ToString("yyyyMMdd-HHmm") + ".csv";
                context.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

                var utf8NoBom = new UTF8Encoding(false);
                using (var writer = new StreamWriter(context.Response.OutputStream, utf8NoBom))
                {
                    writer.WriteLine("Id;Title;Category;Status;CreatedAt;UserName;StartedAt;ExpectedFixAt;Tags");
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
                                var created = r.IsDBNull(4) ? "" : r.GetDateTime(4).ToString("o");
                                var started = r.IsDBNull(6) ? "" : r.GetDateTime(6).ToString("o");
                                var expected = r.IsDBNull(7) ? "" : r.GetDateTime(7).ToString("o");
                                var tagsVal = r.FieldCount > 8 && !r.IsDBNull(8) ? r.GetString(8) : "";
                                var line = string.Join(";",
                                    r.GetInt32(0).ToString(),
                                    CsvEscape(r.IsDBNull(1) ? "" : r.GetString(1)),
                                    CsvEscape(r.IsDBNull(2) ? "" : r.GetString(2)),
                                    CsvEscape(r.IsDBNull(3) ? "" : r.GetString(3)),
                                    CsvEscape(created),
                                    CsvEscape(r.IsDBNull(5) ? "" : r.GetString(5)),
                                    CsvEscape(started),
                                    CsvEscape(expected),
                                    CsvEscape(tagsVal));
                                writer.WriteLine(line);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                context.Response.ContentType = "text/plain; charset=utf-8";
                context.Response.StatusCode = 500;
                context.Response.Write("Lỗi: " + ex.Message);
            }
        }

        public bool IsReusable => false;
    }
}
