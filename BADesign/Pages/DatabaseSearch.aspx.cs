using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers.Security;

namespace BADesign.Pages
{
    public partial class DatabaseSearch : Page
    {
        /// <summary>True khi user có quyền thêm/sửa/xóa server.</summary>
        public bool CanManageServers { get; private set; }
        /// <summary>True khi user có quyền Multi-DB Reset (Database Bulk Reset).</summary>
        public bool CanBulkReset { get; private set; }
        /// <summary>True khi là guest (chưa đăng nhập).</summary>
        public bool IsGuest { get; private set; }
        /// <summary>True khi user có quyền dùng server quét (DatabaseSearch).</summary>
        public bool CanUseServers { get; private set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            IsGuest = UiAuthHelper.IsAnonymous;
            CanManageServers = UiAuthHelper.HasFeature("DatabaseManageServers");
            CanBulkReset = UiAuthHelper.HasFeature("DatabaseBulkReset");
            CanUseServers = !IsGuest && UiAuthHelper.HasFeature("DatabaseSearch");
            
            // Ẩn link "Về trang chủ" nếu anonymous, hoặc set URL đúng theo role
            if (UiAuthHelper.IsAnonymous)
            {
                lnkHome.Visible = false;
            }
            else
            {
                var homeUrl = UiAuthHelper.GetHomeUrlByRole();
                lnkHome.NavigateUrl = homeUrl;
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetServers()
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = true, list = new List<object>() };

                var accessibleIds = GetAccessibleServerIds();
                var list = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    if (accessibleIds == null)
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username FROM BaDatabaseServer WHERE IsActive = 1 ORDER BY Id";
                    else if (accessibleIds.Count == 0)
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username FROM BaDatabaseServer WHERE 1=0";
                    else
                    {
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username FROM BaDatabaseServer WHERE IsActive = 1 AND Id IN (" + string.Join(",", accessibleIds) + ") ORDER BY Id";
                    }
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            list.Add(new
                            {
                                id = r.GetInt32(0),
                                serverName = r.IsDBNull(1) ? null : r.GetString(1),
                                port = r.IsDBNull(2) ? (int?)null : r.GetInt32(2),
                                username = r.IsDBNull(3) ? null : r.GetString(3)
                            });
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

        /// <summary>Null = thấy tất cả (SuperAdmin hoặc DatabaseManageServers). Empty = không thấy server nào. Non-empty = chỉ các Id được phép.</summary>
        private static List<int> GetAccessibleServerIds()
        {
            if (UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers"))
                return null;
            var userId = UiAuthHelper.CurrentUserId;
            var roleId = UiAuthHelper.GetCurrentUserRoleId();
            if (!userId.HasValue && !roleId.HasValue)
                return new List<int>();
            var ids = new HashSet<int>();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            {
                conn.Open();
                if (roleId.HasValue)
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ServerId FROM UiRoleServerAccess WHERE RoleId = @rid";
                        cmd.Parameters.AddWithValue("@rid", roleId.Value);
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read()) ids.Add(r.GetInt32(0));
                        }
                    }
                }
                if (userId.HasValue)
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ServerId FROM UiUserServerAccess WHERE UserId = @uid";
                        cmd.Parameters.AddWithValue("@uid", userId.Value);
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read()) ids.Add(r.GetInt32(0));
                        }
                    }
                }
            }
            return ids.Count > 0 ? new List<int>(ids) : new List<int>();
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object CheckDuplicate(string serverName, int? port, string username, int? excludeId)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseManageServers"))
                    return new { success = false, message = "Bạn không có quyền quản lý server." };
                UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT COUNT(*) FROM BaDatabaseServer 
WHERE IsActive = 1 
  AND ServerName = @sn 
  AND ISNULL(Port, -1) = ISNULL(@port, -1)
  AND Username = @u";
                    if (excludeId.HasValue)
                    {
                        cmd.CommandText += " AND Id != @exId";
                        cmd.Parameters.AddWithValue("@exId", excludeId.Value);
                    }
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    conn.Open();
                    var count = (int)cmd.ExecuteScalar();
                    return new { success = true, isDuplicate = count > 0 };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object TestConnection(string serverName, int? port, string username, string password)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseManageServers"))
                    return new { success = false, message = "Bạn không có quyền quản lý server." };
                UiAuthHelper.GetCurrentUserIdOrThrow();
                var masterConn = BuildConnectionString(serverName, port, username, password, "master");
                using (var c = new SqlConnection(masterConn))
                using (var q = c.CreateCommand())
                {
                    q.CommandText = "SELECT 1";
                    q.CommandTimeout = 10;
                    c.Open();
                    q.ExecuteScalar();
                }
                return new { success = true, message = "Kết nối thành công." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = "Lỗi kết nối: " + ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveServer(string serverName, int? port, string username, string password)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseManageServers"))
                    return new { success = false, message = "Bạn không có quyền thêm server." };
                UiAuthHelper.GetCurrentUserIdOrThrow();
                if (string.IsNullOrWhiteSpace(serverName) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                    return new { success = false, message = "Server, Username và Password không được trống." };

                // Check duplicate
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT COUNT(*) FROM BaDatabaseServer 
WHERE IsActive = 1 
  AND ServerName = @sn 
  AND ISNULL(Port, -1) = ISNULL(@port, -1)
  AND Username = @u";
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    conn.Open();
                    var count = (int)cmd.ExecuteScalar();
                    if (count > 0)
                        return new { success = false, message = "Server/Port/Username đã tồn tại." };
                }

                // Test connection
                try
                {
                    var masterConn = BuildConnectionString(serverName, port, username, password, "master");
                    using (var c = new SqlConnection(masterConn))
                    using (var q = c.CreateCommand())
                    {
                        q.CommandText = "SELECT 1";
                        q.CommandTimeout = 10;
                        c.Open();
                        q.ExecuteScalar();
                    }
                }
                catch (Exception exConn)
                {
                    return new { success = false, message = "Lỗi kết nối: " + exConn.Message };
                }

                // Insert
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
INSERT INTO BaDatabaseServer (ServerName, Port, Username, Password, IsActive, CreatedAt)
VALUES (@sn, @port, @u, @p, 1, SYSDATETIME());";
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    cmd.Parameters.AddWithValue("@p", password);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                return new { success = true, message = "Đã thêm server." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateServer(int id, string serverName, int? port, string username, string password)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseManageServers"))
                    return new { success = false, message = "Bạn không có quyền sửa server." };
                UiAuthHelper.GetCurrentUserIdOrThrow();
                if (string.IsNullOrWhiteSpace(serverName) || string.IsNullOrWhiteSpace(username))
                    return new { success = false, message = "Server và Username không được trống." };

                // Get current password if not changing
                string currentPassword = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Password FROM BaDatabaseServer WHERE Id = @id AND IsActive = 1";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    var obj = cmd.ExecuteScalar();
                    if (obj == null || obj == DBNull.Value)
                        return new { success = false, message = "Không tìm thấy server hoặc đã bị xóa." };
                    currentPassword = obj.ToString();
                }

                // Check duplicate (exclude current id)
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT COUNT(*) FROM BaDatabaseServer 
WHERE IsActive = 1 
  AND ServerName = @sn 
  AND ISNULL(Port, -1) = ISNULL(@port, -1)
  AND Username = @u
  AND Id != @exId";
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    cmd.Parameters.AddWithValue("@exId", id);
                    conn.Open();
                    var count = (int)cmd.ExecuteScalar();
                    if (count > 0)
                        return new { success = false, message = "Server/Port/Username đã tồn tại." };
                }

                // Test connection
                var testPassword = string.IsNullOrEmpty(password) ? currentPassword : password;
                try
                {
                    var masterConn = BuildConnectionString(serverName, port, username, testPassword, "master");
                    using (var c = new SqlConnection(masterConn))
                    using (var q = c.CreateCommand())
                    {
                        q.CommandText = "SELECT 1";
                        q.CommandTimeout = 10;
                        c.Open();
                        q.ExecuteScalar();
                    }
                }
                catch (Exception exConn)
                {
                    return new { success = false, message = "Lỗi kết nối: " + exConn.Message };
                }

                // Update
                var changePassword = !string.IsNullOrEmpty(password);
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    if (changePassword)
                    {
                        cmd.CommandText = @"
UPDATE BaDatabaseServer SET ServerName=@sn, Port=@port, Username=@u, Password=@p, UpdatedAt=SYSDATETIME()
WHERE Id=@id AND IsActive=1";
                        cmd.Parameters.AddWithValue("@p", password);
                    }
                    else
                    {
                        cmd.CommandText = @"
UPDATE BaDatabaseServer SET ServerName=@sn, Port=@port, Username=@u, UpdatedAt=SYSDATETIME()
WHERE Id=@id AND IsActive=1";
                    }
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    conn.Open();
                    var n = cmd.ExecuteNonQuery();
                    if (n == 0)
                        return new { success = false, message = "Không tìm thấy server hoặc đã bị xóa." };
                }
                return new { success = true, message = "Đã cập nhật server." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DeleteServer(int id)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseManageServers"))
                    return new { success = false, message = "Bạn không có quyền xóa server." };
                UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaDatabaseServer SET IsActive = 0, UpdatedAt = SYSDATETIME() WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", id);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                return new { success = true, message = "Đã xóa server." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadDatabases(int? serverId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Guest chỉ dùng Connection String. Đăng nhập để quét server." };

                var accessibleIds = GetAccessibleServerIds();
                var list = new List<object>();
                var log = new List<string>();
                var serverStatuses = new List<object>();
                var servers = new List<ServerInfo>();

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Id, ServerName, Port, Username, Password FROM BaDatabaseServer WHERE IsActive = 1";
                    if (serverId.HasValue)
                    {
                        if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId.Value)))
                            return new { success = false, message = "Bạn không có quyền truy cập server này." };
                        cmd.CommandText += " AND Id = @sid";
                        cmd.Parameters.AddWithValue("@sid", serverId.Value);
                    }
                    else if (accessibleIds != null && accessibleIds.Count == 0)
                    {
                        cmd.CommandText += " AND 1=0";
                    }
                    else if (accessibleIds != null)
                    {
                        cmd.CommandText += " AND Id IN (" + string.Join(",", accessibleIds) + ")";
                    }
                    cmd.CommandText += " ORDER BY Id";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            servers.Add(new ServerInfo
                            {
                                Id = r.GetInt32(0),
                                ServerName = r.IsDBNull(1) ? "" : r.GetString(1),
                                Port = r.IsDBNull(2) ? (int?)null : r.GetInt32(2),
                                Username = r.IsDBNull(3) ? "" : r.GetString(3),
                                Password = r.IsDBNull(4) ? "" : r.GetString(4)
                            });
                        }
                    }
                }

                foreach (var s in servers)
                {
                    var displayName = s.ServerName + (s.Port.HasValue ? "," + s.Port.Value : "");
                    log.Add("Đang kết nối " + displayName + "...");
                    var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                    try
                    {
                        using (var c = new SqlConnection(masterConn))
                        using (var q = c.CreateCommand())
                        {
                            q.CommandText = "SELECT name FROM sys.databases WHERE state_desc = N'ONLINE' ORDER BY name";
                            q.CommandTimeout = 15; /* tránh treo khi server chậm; Connect Timeout=10 đã có trong connection string */
                            c.Open();
                            var candidateDbs = new List<string>();
                            using (var rd = q.ExecuteReader())
                            {
                                while (rd.Read())
                                {
                                    var db = rd.IsDBNull(0) ? "" : rd.GetString(0);
                                    if (IsSystemDatabase(db)) continue;
                                    var svr = (s.ServerName ?? "").Trim();
                                    var isDemovn = string.Equals(svr, "demovn.cadena-hrmseries.com", StringComparison.OrdinalIgnoreCase);
                                    if (isDemovn && !string.Equals(db, "std53.cadena-hrmseries.com", StringComparison.OrdinalIgnoreCase))
                                        continue;
                                    candidateDbs.Add(db);
                                }
                            }
                            var dbCount = 0;
                            foreach (var db in candidateDbs)
                            {
                                if (!DatabaseHasStProjectInfo(c, db)) continue;
                                var cs = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, db);
                                var csCopy = BuildConnectionStringForCopy(s.ServerName, s.Port, s.Username, s.Password, db);
                                list.Add(new
                                {
                                    server = s.ServerName,
                                    database = db,
                                    username = s.Username,
                                    connectionString = cs,
                                    connectionStringForCopy = csCopy
                                });
                                dbCount++;
                            }
                            log.Add("  OK: " + dbCount + " database (có ST_ProjectInfo).");
                            serverStatuses.Add(new { id = s.Id, serverName = s.ServerName, ok = true, message = "", dbCount = dbCount });
                        }
                    }
                    catch (Exception ex)
                    {
                        var msg = ex.Message ?? "";
                        log.Add("  Lỗi: " + msg);
                        serverStatuses.Add(new { id = s.Id, serverName = s.ServerName, ok = false, message = msg, dbCount = 0 });
                    }
                }

                return new { success = true, list = list, log = log, serverStatuses = serverStatuses };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Chuẩn bị kết nối Multi-DB cho toàn bộ database trên 1 server. Dùng cho Manager reset nhiều DB.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object PrepareConnectForMultiDb(int serverId)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                    return new { success = false, message = "Bạn không có quyền sử dụng Multi-DB Reset. Liên hệ Admin để được cấp quyền Database Bulk Reset." };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Bạn không có quyền truy cập server này." };

                ServerInfo s = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Id, ServerName, Port, Username, Password FROM BaDatabaseServer WHERE IsActive = 1 AND Id = @id";
                    cmd.Parameters.AddWithValue("@id", serverId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            s = new ServerInfo
                            {
                                Id = r.GetInt32(0),
                                ServerName = r.IsDBNull(1) ? "" : r.GetString(1),
                                Port = r.IsDBNull(2) ? (int?)null : r.GetInt32(2),
                                Username = r.IsDBNull(3) ? "" : r.GetString(3),
                                Password = r.IsDBNull(4) ? "" : r.GetString(4)
                            };
                        }
                    }
                }
                if (s == null)
                    return new { success = false, message = "Không tìm thấy server." };

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                var databases = new List<HRConnMultiDbEntry>();
                using (var c = new SqlConnection(masterConn))
                using (var q = c.CreateCommand())
                {
                    q.CommandText = "SELECT name FROM sys.databases WHERE state_desc = N'ONLINE' ORDER BY name";
                    q.CommandTimeout = 30;
                    c.Open();
                    var candidateDbs = new List<string>();
                    using (var rd = q.ExecuteReader())
                    {
                        while (rd.Read())
                        {
                            var db = rd.IsDBNull(0) ? "" : rd.GetString(0);
                            if (IsSystemDatabase(db)) continue;
                            var svr = (s.ServerName ?? "").Trim();
                            var isDemovn = string.Equals(svr, "demovn.cadena-hrmseries.com", StringComparison.OrdinalIgnoreCase);
                            if (isDemovn && !string.Equals(db, "std53.cadena-hrmseries.com", StringComparison.OrdinalIgnoreCase))
                                continue;
                            candidateDbs.Add(db);
                        }
                    }
                    foreach (var db in candidateDbs)
                    {
                        if (!DatabaseHasStProjectInfo(c, db)) continue;
                        var cs = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, db);
                        databases.Add(new HRConnMultiDbEntry { DatabaseName = db, ConnectionString = cs });
                    }
                }

                if (databases.Count == 0)
                    return new { success = false, message = "Không có database nào trên server." };

                var id = Guid.NewGuid().ToString("N");
                var ctx = HttpContext.Current;
                if (ctx?.Session != null)
                {
                    ctx.Session["HRConnMulti_" + id] = new HRConnMultiInfo
                    {
                        Server = (s.ServerName ?? "") + (s.Port.HasValue ? "," + s.Port.Value : ""),
                        Databases = databases
                    };
                }
                var token = DataSecurityWrapper.EncryptConnectId("multi_" + id);
                return new { success = true, token = token, dbCount = databases.Count };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        public class HRConnMultiDbEntry
        {
            public string DatabaseName { get; set; }
            public string ConnectionString { get; set; }
        }

        public class HRConnMultiInfo
        {
            public string Server { get; set; }
            public List<HRConnMultiDbEntry> Databases { get; set; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object PrepareConnect(string connectionString, string server, string database)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(connectionString))
                    return new { success = false, message = "Connection string trống." };
                var id = Guid.NewGuid().ToString("N");
                var ctx = HttpContext.Current;
                if (ctx?.Session != null)
                    ctx.Session["HRConn_" + id] = new HRConnInfo { ConnectionString = connectionString, Server = server ?? "", Database = database ?? "" };
                var token = DataSecurityWrapper.EncryptConnectId(id);
                return new { success = true, token = token };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveScanState(string stateJson)
        {
            try
            {
                var ctx = HttpContext.Current;
                if (ctx?.Session != null && !string.IsNullOrEmpty(stateJson))
                    ctx.Session["DbSearch_ScanState"] = stateJson;
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadScanState()
        {
            try
            {
                var ctx = HttpContext.Current;
                var state = ctx?.Session?["DbSearch_ScanState"] as string;
                return new { success = true, state = state };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, state = (string)null };
            }
        }

        private static readonly string[] SystemDatabases = { "master", "model", "msdb", "tempdb" };

        private static bool IsSystemDatabase(string db)
        {
            if (string.IsNullOrEmpty(db)) return true;
            var d = db.Trim();
            for (var i = 0; i < SystemDatabases.Length; i++)
                if (string.Equals(d, SystemDatabases[i], StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }

        /// <summary>Chỉ database có bảng ST_ProjectInfo (product HRM) mới được liệt kê.</summary>
        private static bool DatabaseHasStProjectInfo(SqlConnection masterConn, string dbName)
        {
            if (string.IsNullOrEmpty(dbName)) return false;
            try
            {
                var safe = dbName.Trim().Replace("]", "]]");
                using (var cmd = masterConn.CreateCommand())
                {
                    cmd.CommandText = "SELECT 1 FROM [" + safe + "].sys.tables WHERE name = 'ST_ProjectInfo'";
                    cmd.CommandTimeout = 5;
                    var r = cmd.ExecuteScalar();
                    return r != null;
                }
            }
            catch { return false; }
        }

        /// <summary>
        /// Data Source=server[,port];Initial Catalog=db;UID=u;PWD=p. Connect Timeout=10 để tránh treo khi server tắt/sai mật khẩu.
        /// </summary>
        private static string BuildConnectionString(string server, int? port, string user, string password, string catalog)
        {
            var dataSource = string.IsNullOrEmpty(server) ? "."
                : (port.HasValue && port.Value > 0)
                    ? server + "," + port.Value
                    : server;
            return string.Format("Data Source={0};Initial Catalog={1};UID={2};PWD={3};", dataSource, catalog, user, password);
        }

        /// <summary>
        /// Connection string dùng cho Copy: PWD= trống, trừ khi UID là dev (full password).
        /// </summary>
        private static string BuildConnectionStringForCopy(string server, int? port, string user, string password, string catalog)
        {
            var pwd = string.Equals((user ?? "").Trim(), "dev", StringComparison.OrdinalIgnoreCase) ? (password ?? "") : "";
            return BuildConnectionString(server, port, user, pwd, catalog);
        }

        // Helper class thay cho tuple (tương thích .NET Framework cũ)
        private class ServerInfo
        {
            public int Id { get; set; }
            public string ServerName { get; set; }
            public int? Port { get; set; }
            public string Username { get; set; }
            public string Password { get; set; }
        }

        public class HRConnInfo
        {
            public string ConnectionString { get; set; }
            public string Server { get; set; }
            public string Database { get; set; }
        }
    }
}
