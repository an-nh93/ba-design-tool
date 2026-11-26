using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.Web;
using System.Web.Script.Services;
using System.Web.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers;
using BADesign.Helpers.Database;
using BADesign.Helpers.Security;

namespace BADesign.Pages
{
    /// <summary>
    /// Sinh / giải mã License Key HRM cho môi trường dev-debug.
    /// CHỈ các user trong whitelist (LicenseKeyAccess) thấy và dùng được — không theo Role, không theo SuperAdmin.
    /// Thuật toán port nguyên văn từ Cadena.BusinessLayer (SKGL) nên key tương thích với bản HRM đang chạy.
    /// Có thể kết nối DB (Server → Database) để chọn Tenant từ danh sách và tự fill dữ liệu.
    /// </summary>
    public partial class LicenseKey : Page
    {
        private const string SessConnStr = "LicenseKey_ConnStr";
        private const string SessConnLabel = "LicenseKey_ConnLabel";

        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            if (!LicenseKeyAccess.IsAllowed())
            {
                Response.Redirect(ResolveUrl("~/AccessDenied"), true);
                return;
            }
            if (!IsPostBack)
            {
                ucBaSidebar.ActiveSection = "LicenseKey";
                ucBaTopBar.PageTitle = "Khóa bản quyền (Dev)";
                TryConnectFromToken();
            }
        }

        private static void EnsureAccess()
        {
            if (!LicenseKeyAccess.IsAllowed())
                throw new UnauthorizedAccessException("Bạn không có quyền sử dụng License Key.");
        }

        /// <summary>Nếu mở từ Database Tools / HR Helper qua ?k= thì lấy connection string đã kết nối sẵn (lưu trong Session HRConn_).</summary>
        private void TryConnectFromToken()
        {
            try
            {
                var k = Request.QueryString["k"];
                if (string.IsNullOrWhiteSpace(k)) return;
                var id = DataSecurityWrapper.DecryptConnectId(k);
                if (string.IsNullOrEmpty(id)) return;
                var info = Session["HRConn_" + id] as DatabaseSearch.HRConnInfo;
                if (info != null && !string.IsNullOrEmpty(info.ConnectionString))
                {
                    Session[SessConnStr] = info.ConnectionString;
                    Session[SessConnLabel] = (info.Server ?? "") + (string.IsNullOrEmpty(info.Database) ? "" : " / " + info.Database);
                }
            }
            catch { }
        }

        // =====================================================================
        // Sinh / giải mã key
        // =====================================================================

        /// <summary>Sinh license key. licenseType: "trial" | "limited" | "permanent". productType: 1 HRMS5, 2 Paytime, 3 Paytime Cloud.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GenerateKey(string licenseType, int productType, string tenantCode,
            string machineId, int numCompany, int numEmployee, int licenseMonth, string effectiveDate)
        {
            try
            {
                EnsureAccess();

                var type = (licenseType ?? "").Trim().ToLowerInvariant();
                bool isTrial = type == "trial";
                bool isPermanent = type == "permanent";

                tenantCode = (tenantCode ?? "").Trim();
                machineId = (machineId ?? "").Trim();

                if (!isTrial && string.IsNullOrEmpty(tenantCode))
                    return new { success = false, message = "Vui lòng nhập/chọn Tenant Code." };
                if (numCompany <= 0)
                    return new { success = false, message = "Number of Company phải lớn hơn 0." };
                if (numEmployee <= 0)
                    return new { success = false, message = "Number of Employee phải lớn hơn 0." };
                if (numEmployee >= 100000)
                    return new { success = false, message = "Number of Employee vượt giới hạn. Nhập giá trị nhỏ hơn 100.000." };
                if (!isPermanent && licenseMonth <= 0)
                    return new { success = false, message = "License Month phải lớn hơn 0." };
                if (licenseMonth >= 1000)
                    return new { success = false, message = "License Month vượt giới hạn. Nhập giá trị nhỏ hơn 1.000." };
                if (!isTrial && string.IsNullOrEmpty(machineId))
                    return new { success = false, message = "Vui lòng nhập Machine ID (hoặc bấm 'Lấy Machine ID')." };

                DateTime eff;
                if (!DateTime.TryParse(effectiveDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out eff))
                    eff = DateTime.UtcNow;

                int months = isPermanent ? 0 : licenseMonth;

                string key = CadenaLicenseKeyHelper.GenerateLicenseKey(
                    tenantCode, numCompany, numEmployee,
                    isTrial ? string.Empty : machineId,
                    eff, months, isTrial, isPermanent, productType);

                try
                {
                    UserActionLogHelper.Log("LICENSEKEY_GENERATE",
                        string.Format("type={0};product={1};tenant={2};emp={3};comp={4};month={5}",
                            type, productType, tenantCode, numEmployee, numCompany, months));
                }
                catch { }

                return new { success = true, key = key };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Giải mã một license key để xem thông tin bên trong.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DecodeKey(string key)
        {
            try
            {
                EnsureAccess();
                if (string.IsNullOrWhiteSpace(key))
                    return new { success = false, message = "Vui lòng nhập License Key." };

                var info = CadenaLicenseKeyHelper.ValidateLicenseKey(key.Trim());
                if (!info.IsValidKey)
                    return new { success = false, message = "License Key không hợp lệ." };

                return new
                {
                    success = true,
                    tenantCode = info.TenantCode,
                    machineId = info.MachineID,
                    numCompany = info.NumberOfCompany,
                    numEmployee = info.NumberOfEmployee,
                    licenseMonth = info.LicenseMonth,
                    effectiveDate = info.EffectiveDate.ToString("yyyy-MM-dd"),
                    expiredDate = info.IsNonExpired ? "" : info.ExpiredDate.ToString("yyyy-MM-dd"),
                    isTrial = info.IsTrialKey,
                    isNonExpired = info.IsNonExpired,
                    productType = info.ProductType
                };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Lấy Machine ID của máy đang chạy HR Helper (dựa trên ProcessorId). Chỉ đúng khi HR Helper chạy cùng máy với HRM.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetServerMachineId()
        {
            try
            {
                EnsureAccess();
                return new { success = true, machineId = CadenaLicenseKeyHelper.GetMachineID() };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        // =====================================================================
        // Kết nối Database & chọn Tenant (tái dùng BaDatabaseServer như Database Tools)
        // =====================================================================

        /// <summary>Danh sách server đang active (từ BaDatabaseServer).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LkGetServers()
        {
            try
            {
                EnsureAccess();
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Id, ServerName, Port FROM BaDatabaseServer WHERE IsActive = 1 ORDER BY Id";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var name = r.IsDBNull(1) ? "" : r.GetString(1);
                            var port = r.IsDBNull(2) ? (int?)null : r.GetInt32(2);
                            var label = name + (port.HasValue ? "," + port.Value : "");
                            list.Add(new { id = r.GetInt32(0), name = label });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Danh sách database ONLINE (trừ system db) của 1 server.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LkGetDatabases(int serverId)
        {
            try
            {
                EnsureAccess();
                var s = GetServer(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };

                var list = new List<string>();
                var master = DbConnectionString.ForServer(s.Item1, s.Item2, s.Item3, s.Item4, "master", 10);
                using (var c = new SqlConnection(master))
                using (var q = c.CreateCommand())
                {
                    q.CommandText = "SELECT name FROM sys.databases WHERE state_desc = N'ONLINE' ORDER BY name";
                    q.CommandTimeout = 15;
                    c.Open();
                    using (var rd = q.ExecuteReader())
                    {
                        while (rd.Read())
                        {
                            var db = rd.IsDBNull(0) ? "" : rd.GetString(0);
                            if (IsSystemDb(db)) continue;
                            list.Add(db);
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Kết nối Server + Database; lưu connection string vào Session (không trả ra client).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LkConnect(int serverId, string databaseName)
        {
            try
            {
                EnsureAccess();
                if (string.IsNullOrWhiteSpace(databaseName))
                    return new { success = false, message = "Chưa chọn database." };
                var s = GetServer(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };

                var connStr = DbConnectionString.ForServer(s.Item1, s.Item2, s.Item3, s.Item4, databaseName.Trim(), 10);
                // Thử mở để chắc chắn kết nối được
                using (var c = new SqlConnection(connStr))
                {
                    c.Open();
                }
                var label = s.Item1 + (s.Item2.HasValue ? "," + s.Item2.Value : "") + " / " + databaseName.Trim();
                var ctx = HttpContext.Current;
                if (ctx?.Session != null)
                {
                    ctx.Session[SessConnStr] = connStr;
                    ctx.Session[SessConnLabel] = label;
                }
                return new { success = true, label = label };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Trạng thái kết nối hiện tại (để trang tự hiện khi mở từ ?k= hoặc đã kết nối trước đó).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LkGetConnStatus()
        {
            try
            {
                EnsureAccess();
                var cs = GetSessionConnStr();
                var label = HttpContext.Current?.Session?[SessConnLabel] as string;
                return new { success = true, connected = !string.IsNullOrEmpty(cs), label = label ?? "" };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Kết nối trực tiếp bằng Connection String (SQL). Lưu vào Session, không trả chuỗi ra client.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LkConnectByConnString(string connectionString)
        {
            try
            {
                EnsureAccess();
                var cs = (connectionString ?? "").Trim();
                if (cs.Length == 0)
                    return new { success = false, message = "Vui lòng nhập connection string." };

                string server, database;
                try
                {
                    var b = new SqlConnectionStringBuilder(cs);
                    server = b.DataSource;
                    database = b.InitialCatalog;
                }
                catch
                {
                    return new { success = false, message = "Connection string không hợp lệ." };
                }

                using (var c = new SqlConnection(cs))
                {
                    c.Open();
                }

                var label = server + (string.IsNullOrEmpty(database) ? "" : " / " + database);
                var ctx = HttpContext.Current;
                if (ctx?.Session != null)
                {
                    ctx.Session[SessConnStr] = cs;
                    ctx.Session[SessConnLabel] = label;
                }
                return new { success = true, label = label };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Danh sách Tenant của DB đang kết nối (MultiTenant_Tenants).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LkGetTenants()
        {
            try
            {
                EnsureAccess();
                var connStr = GetSessionConnStr();
                if (string.IsNullOrEmpty(connStr))
                    return new { success = false, message = "Chưa kết nối database. Hãy chọn Server & Database rồi bấm Kết nối." };

                var list = new List<object>();
                using (var conn = new SqlConnection(connStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT ID, Code FROM MultiTenant_Tenants ORDER BY Code";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var id = r.IsDBNull(0) ? 0 : Convert.ToInt32(r.GetValue(0));
                            var code = r.IsDBNull(1) ? "" : (r.GetString(1) ?? "").Trim();
                            list.Add(new { id = id, code = code });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Số liệu hiện tại của Tenant: số company active và số employee active (tham khảo để điền cap license).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LkGetTenantStats(int tenantId)
        {
            try
            {
                EnsureAccess();
                var connStr = GetSessionConnStr();
                if (string.IsNullOrEmpty(connStr))
                    return new { success = false, message = "Chưa kết nối database." };

                int? company = null;
                int? employee = null;

                using (var conn = new SqlConnection(connStr))
                {
                    conn.Open();

                    // Số company active của tenant (fallback nếu không có cột IsActive)
                    try { company = CountScalar(conn, "SELECT COUNT(*) FROM MultiTenant_Companies WHERE TenantID = @tid AND IsActive = 1", tenantId); }
                    catch
                    {
                        try { company = CountScalar(conn, "SELECT COUNT(*) FROM MultiTenant_Companies WHERE TenantID = @tid", tenantId); }
                        catch { company = null; }
                    }

                    // Số employee active (Active=1, Future=3) — best-effort, bỏ qua nếu schema khác
                    try
                    {
                        employee = CountScalar(conn,
                            @"SELECT COUNT(*)
                              FROM Staffing_EmployeeInformations EI
                              INNER JOIN MultiTenant_Companies C ON C.ID = EI.CompanyID
                              WHERE EI.TenantID = @tid AND EI.EmployeeStatusID IN (1, 3) AND C.IsActive = 1", tenantId);
                    }
                    catch { employee = null; }
                }

                return new { success = true, company = company, employee = employee };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        // ---------------------------------------------------------------------
        // Helpers
        // ---------------------------------------------------------------------

        private static string GetSessionConnStr()
        {
            return HttpContext.Current?.Session?[SessConnStr] as string;
        }

        private static int CountScalar(SqlConnection conn, string sql, int tenantId)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = sql;
                cmd.CommandTimeout = 30;
                cmd.Parameters.AddWithValue("@tid", tenantId);
                var o = cmd.ExecuteScalar();
                return (o == null || o == DBNull.Value) ? 0 : Convert.ToInt32(o);
            }
        }

        /// <summary>Đọc server (ServerName, Port, Username, Password) từ BaDatabaseServer.</summary>
        private static Tuple<string, int?, string, string> GetServer(int serverId)
        {
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT ServerName, Port, Username, Password FROM BaDatabaseServer WHERE IsActive = 1 AND Id = @id";
                cmd.Parameters.AddWithValue("@id", serverId);
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (r.Read())
                    {
                        return Tuple.Create(
                            r.IsDBNull(0) ? "" : r.GetString(0),
                            r.IsDBNull(1) ? (int?)null : r.GetInt32(1),
                            r.IsDBNull(2) ? "" : r.GetString(2),
                            BaSecret.Reveal(r.IsDBNull(3) ? "" : r.GetString(3)));
                    }
                }
            }
            return null;
        }

        private static bool IsSystemDb(string db)
        {
            if (string.IsNullOrWhiteSpace(db)) return true;
            switch (db.Trim().ToLowerInvariant())
            {
                case "master":
                case "model":
                case "msdb":
                case "tempdb":
                case "distribution":
                    return true;
                default:
                    return false;
            }
        }
    }
}
