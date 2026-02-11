using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    /// <summary>Trang xem audit log: Restore/Backup/Delete DB, Update User/Employee/Other. Chỉ SuperAdmin.</summary>
    public partial class AuditLog : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!UiAuthHelper.IsSuperAdmin)
            {
                Response.Redirect(ResolveUrl("~/AccessDenied"), true);
                return;
            }
            ucBaSidebar.ActiveSection = "AuditLog";
            ucBaTopBar.PageTitle = "Audit Log";
        }

        /// <summary>Danh sách ActionCode có nhãn hiển thị (dropdown filter).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetActionCodes()
        {
            try
            {
                if (!UiAuthHelper.IsSuperAdmin)
                    return new { success = false, message = "Unauthorized." };
                var codes = new List<object>
                {
                    new { code = "Login", label = "Đăng nhập" },
                    new { code = "DatabaseSearch.Connect", label = "Kết nối database" },
                    new { code = "DatabaseSearch.Backup", label = "Backup database" },
                    new { code = "DatabaseSearch.BackupJob", label = "Backup job (nền)" },
                    new { code = "DatabaseSearch.StartRestore", label = "Bắt đầu Restore" },
                    new { code = "DatabaseSearch.Restore", label = "Restore database" },
                    new { code = "DatabaseSearch.DeleteDatabase", label = "Xóa database" },
                    new { code = "DatabaseSearch.ShrinkLog", label = "Shrink log" },
                    new { code = "DatabaseSearch.SaveServer", label = "Thêm server" },
                    new { code = "DatabaseSearch.UpdateServer", label = "Cập nhật server" },
                    new { code = "DatabaseSearch.DeleteServer", label = "Xóa server" },
                    new { code = "HRHelper.UpdateUser", label = "HR: Update User" },
                    new { code = "HRHelper.UpdateEmployee", label = "HR: Update Employee" },
                    new { code = "HRHelper.UpdateOther", label = "HR: Update Company/Other" }
                };
                return new { success = true, codes = codes };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Lấy bản ghi audit log có phân trang và lọc (date, actionCode, userOrIp).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetAuditLogs(int pageIndex, int pageSize, string dateFrom, string dateTo, string actionCode, string userOrIp)
        {
            try
            {
                if (!UiAuthHelper.IsSuperAdmin)
                    return new { success = false, message = "Unauthorized.", total = 0, rows = new List<object>() };
                if (pageSize <= 0 || pageSize > 200) pageSize = 50;

                var hasUserName = ColumnExists("UiUserActionLog", "UserName");
                var hasUserAgent = ColumnExists("UiUserActionLog", "UserAgent");

                var where = new List<string> { "1=1" };
                var pars = new List<SqlParameter>();

                DateTime dtFrom;
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, CultureInfo.InvariantCulture, DateTimeStyles.None, out dtFrom))
                {
                    where.Add("L.At >= @from");
                    pars.Add(new SqlParameter("@from", dtFrom));
                }
                DateTime dtTo;
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, CultureInfo.InvariantCulture, DateTimeStyles.None, out dtTo))
                {
                    dtTo = dtTo.Date.AddDays(1);
                    where.Add("L.At < @to");
                    pars.Add(new SqlParameter("@to", dtTo));
                }
                if (!string.IsNullOrEmpty(actionCode))
                {
                    where.Add("L.ActionCode = @code");
                    pars.Add(new SqlParameter("@code", actionCode));
                }
                if (!string.IsNullOrEmpty(userOrIp))
                {
                    var like = "%" + userOrIp.Replace("[", "[[]").Replace("%", "[%]") + "%";
                    where.Add("(L.UserName LIKE @uip OR L.IpAddress LIKE @uip OR CAST(L.UserId AS NVARCHAR(20)) LIKE @uip)");
                    pars.Add(new SqlParameter("@uip", like));
                }

                var whereClause = " AND " + string.Join(" AND ", where);
                var selCols = "L.Id, L.UserId, L.ActionCode, L.Detail, L.At, L.IpAddress";
                if (hasUserName) selCols += ", L.UserName";
                else selCols += ", CAST(NULL AS NVARCHAR(128)) AS UserName";
                if (hasUserAgent) selCols += ", L.UserAgent";
                else selCols += ", CAST(NULL AS NVARCHAR(512)) AS UserAgent";

                var sqlCount = "SELECT COUNT(1) FROM UiUserActionLog L WHERE " + string.Join(" AND ", where);
                var sqlRows = "SELECT " + selCols + " FROM UiUserActionLog L WHERE " + string.Join(" AND ", where) +
                    " ORDER BY L.At DESC OFFSET @off ROWS FETCH NEXT @ps ROWS ONLY";
                pars.Add(new SqlParameter("@off", pageIndex * pageSize));
                pars.Add(new SqlParameter("@ps", pageSize));

                var total = 0;
                var rows = new List<object>();

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmdCount = conn.CreateCommand())
                    {
                        cmdCount.CommandText = sqlCount;
                        foreach (var p in pars)
                            if (p.ParameterName != "@off" && p.ParameterName != "@ps")
                                cmdCount.Parameters.Add(new SqlParameter(p.ParameterName, p.Value ?? DBNull.Value));
                        total = (int)cmdCount.ExecuteScalar();
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = sqlRows;
                        foreach (var p in pars)
                            cmd.Parameters.Add(new SqlParameter(p.ParameterName, p.Value ?? DBNull.Value));
                        using (var r = cmd.ExecuteReader())
                        {
                            var ixUserName = 6;
                            var ixUserAgent = 7;
                            while (r.Read())
                            {
                                var at = r.IsDBNull(4) ? "" : ((DateTime)r.GetValue(4)).ToString("yyyy-MM-dd HH:mm:ss");
                                var userName = r.FieldCount > ixUserName && !r.IsDBNull(ixUserName) ? r.GetString(ixUserName) : null;
                                var userAgent = r.FieldCount > ixUserAgent && !r.IsDBNull(ixUserAgent) ? r.GetString(ixUserAgent) : null;
                                var userAgentShort = userAgent != null && userAgent.Length > 80 ? userAgent.Substring(0, 80) + "…" : userAgent;
                                rows.Add(new
                                {
                                    id = r.GetInt64(0),
                                    userId = r.IsDBNull(1) ? (int?)null : r.GetInt32(1),
                                    actionCode = r.GetString(2),
                                    actionLabel = GetActionLabel(r.GetString(2)),
                                    detail = r.IsDBNull(3) ? "" : r.GetString(3),
                                    at = at,
                                    ipAddress = r.IsDBNull(5) ? "" : r.GetString(5),
                                    userName = userName,
                                    userAgent = userAgent,
                                    userAgentShort = userAgentShort
                                });
                            }
                        }
                    }
                }
                return new { success = true, total = total, rows = rows };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, total = 0, rows = new List<object>() };
            }
        }

        private static bool ColumnExists(string tableName, string columnName)
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(@t) AND name = @c";
                    cmd.Parameters.AddWithValue("@t", tableName);
                    cmd.Parameters.AddWithValue("@c", columnName);
                    conn.Open();
                    return cmd.ExecuteScalar() != null;
                }
            }
            catch { return false; }
        }

        private static string GetActionLabel(string code)
        {
            if (string.IsNullOrEmpty(code)) return code;
            switch (code)
            {
                case "Login": return "Đăng nhập";
                case "DatabaseSearch.Connect": return "Kết nối DB";
                case "DatabaseSearch.Backup": return "Backup DB";
                case "DatabaseSearch.BackupJob": return "Backup job";
                case "DatabaseSearch.StartRestore": return "Bắt đầu Restore";
                case "DatabaseSearch.Restore": return "Restore DB";
                case "DatabaseSearch.DeleteDatabase": return "Xóa DB";
                case "DatabaseSearch.ShrinkLog": return "Shrink log";
                case "DatabaseSearch.SaveServer": return "Thêm server";
                case "DatabaseSearch.UpdateServer": return "Sửa server";
                case "DatabaseSearch.DeleteServer": return "Xóa server";
                case "HRHelper.UpdateUser": return "HR: Update User";
                case "HRHelper.UpdateEmployee": return "HR: Update Employee";
                case "HRHelper.UpdateOther": return "HR: Update Other";
                default: return code;
            }
        }
    }
}
