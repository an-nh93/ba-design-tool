using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;
using BADesign.Helpers.Security;
using BADesign.Hubs;
using Microsoft.AspNet.SignalR;

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
        /// <summary>True khi user có quyền backup database (DatabaseManageServers hoặc DatabaseBackup).</summary>
        public bool CanBackup { get; private set; }
        /// <summary>True khi user có quyền restore database (DatabaseManageServers hoặc DatabaseRestore).</summary>
        public bool CanRestore { get; private set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            IsGuest = UiAuthHelper.IsAnonymous;
            CanManageServers = UiAuthHelper.HasFeature("DatabaseManageServers");
            CanBulkReset = UiAuthHelper.HasFeature("DatabaseBulkReset");
            CanUseServers = !IsGuest && UiAuthHelper.HasFeature("DatabaseSearch");
            CanBackup = UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseBackup");
            CanRestore = UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseRestore");

            lnkHome.NavigateUrl = ResolveUrl(UiAuthHelper.GetHomeUrlByRole() ?? "~/");
        }

        private static bool CanBackupStatic() { return UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseBackup"); }
        private static bool CanRestoreStatic() { return UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseRestore"); }

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
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username, BackupPath FROM BaDatabaseServer WHERE IsActive = 1 ORDER BY Id";
                    else if (accessibleIds.Count == 0)
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username, BackupPath FROM BaDatabaseServer WHERE 1=0";
                    else
                    {
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username, BackupPath FROM BaDatabaseServer WHERE IsActive = 1 AND Id IN (" + string.Join(",", accessibleIds) + ") ORDER BY Id";
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
                                username = r.IsDBNull(3) ? null : r.GetString(3),
                                backupPath = r.FieldCount > 4 && !r.IsDBNull(4) ? r.GetString(4) : null
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

        /// <summary>True nếu user là Admin (SuperAdmin/DatabaseManageServers) hoặc là người đã restore database này.</summary>
        private static bool CanViewDatabase(int serverId, string databaseName)
        {
            if (UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers"))
                return true;
            var uid = UiAuthHelper.CurrentUserId;
            if (!uid.HasValue) return false;
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT TOP 1 1 FROM BaDatabaseRestoreLog WHERE ServerId = @sid AND DatabaseName = @db AND RestoredByUserId = @uid";
                    cmd.Parameters.AddWithValue("@sid", serverId);
                    cmd.Parameters.AddWithValue("@db", (databaseName ?? "").Trim());
                    cmd.Parameters.AddWithValue("@uid", uid.Value);
                    conn.Open();
                    return cmd.ExecuteScalar() != null;
                }
            }
            catch { return false; }
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
        public static object SaveServer(string serverName, int? port, string username, string password, string backupPath = null)
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
INSERT INTO BaDatabaseServer (ServerName, Port, Username, Password, BackupPath, IsActive, CreatedAt)
VALUES (@sn, @port, @u, @p, @backupPath, 1, SYSDATETIME());";
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    cmd.Parameters.AddWithValue("@p", password);
                    cmd.Parameters.AddWithValue("@backupPath", string.IsNullOrWhiteSpace(backupPath) ? (object)DBNull.Value : backupPath.Trim().TrimEnd('\\'));
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                UserActionLogHelper.Log("DatabaseSearch.SaveServer", "serverName=" + (serverName ?? "").Trim());
                return new { success = true, message = "Đã thêm server." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateServer(int id, string serverName, int? port, string username, string password, string backupPath = null)
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
                    cmd.CommandText = changePassword
                    ? @"UPDATE BaDatabaseServer SET ServerName=@sn, Port=@port, Username=@u, Password=@p, BackupPath=@backupPath, UpdatedAt=SYSDATETIME() WHERE Id=@id AND IsActive=1"
                    : @"UPDATE BaDatabaseServer SET ServerName=@sn, Port=@port, Username=@u, BackupPath=@backupPath, UpdatedAt=SYSDATETIME() WHERE Id=@id AND IsActive=1";
                    if (changePassword)
                        cmd.Parameters.AddWithValue("@p", password);
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    cmd.Parameters.AddWithValue("@backupPath", string.IsNullOrWhiteSpace(backupPath) ? (object)DBNull.Value : backupPath.Trim().TrimEnd('\\'));
                    conn.Open();
                    var n = cmd.ExecuteNonQuery();
                    if (n == 0)
                        return new { success = false, message = "Không tìm thấy server hoặc đã bị xóa." };
                }
                UserActionLogHelper.Log("DatabaseSearch.UpdateServer", "id=" + id);
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
                UserActionLogHelper.Log("DatabaseSearch.DeleteServer", "id=" + id);
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
                var list = new List<Dictionary<string, object>>();
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
                                var row = new Dictionary<string, object>
                                {
                                    { "serverId", s.Id },
                                    { "server", s.ServerName },
                                    { "database", db },
                                    { "username", s.Username }
                                };
                                list.Add(row);
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

                EnrichWithRestoreAndResetLog(list);
                return new { success = true, list = list, log = log, serverStatuses = serverStatuses };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Bổ sung thông tin restore/reset cuối cùng từ BaDatabaseRestoreLog, BaDatabaseResetLog.</summary>
        private static void EnrichWithRestoreAndResetLog(List<Dictionary<string, object>> list)
        {
            if (list == null || list.Count == 0) return;
            try
            {
                var serverIds = list.Select(x => (int)x["serverId"]).Distinct().ToList();
                if (serverIds.Count == 0) return;
                var restoreByKey = new Dictionary<string, object[]>();
                var resetByKey = new Dictionary<string, object[]>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    var idsStr = string.Join(",", serverIds);
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = $@"
SELECT r.ServerId, r.DatabaseName, r.RestoredAt, u.UserName
FROM (SELECT ServerId, DatabaseName, RestoredByUserId, RestoredAt, ROW_NUMBER() OVER (PARTITION BY ServerId, DatabaseName ORDER BY RestoredAt DESC) AS rn
      FROM BaDatabaseRestoreLog WHERE ServerId IN ({idsStr})) r
LEFT JOIN UiUser u ON u.UserId = r.RestoredByUserId
WHERE r.rn = 1";
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                            {
                                var key = r.GetInt32(0) + "|" + (r.IsDBNull(1) ? "" : r.GetString(1));
                                restoreByKey[key] = new object[] { r.IsDBNull(2) ? (object)null : (object)r.GetDateTime(2), r.IsDBNull(3) ? null : r.GetString(3) };
                            }
                        }
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = $@"
SELECT r.ServerId, r.DatabaseName, r.At, u.UserName, r.DataTypesReset
FROM (SELECT ServerId, DatabaseName, UserId, At, DataTypesReset, ROW_NUMBER() OVER (PARTITION BY ServerId, DatabaseName ORDER BY At DESC) AS rn
      FROM BaDatabaseResetLog WHERE ServerId IN ({idsStr})) r
LEFT JOIN UiUser u ON u.UserId = r.UserId
WHERE r.rn = 1";
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                            {
                                var key = r.GetInt32(0) + "|" + (r.IsDBNull(1) ? "" : r.GetString(1));
                                resetByKey[key] = new object[] { r.IsDBNull(2) ? (object)null : (object)r.GetDateTime(2), r.IsDBNull(3) ? null : r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4) };
                            }
                        }
                    }
                }
                foreach (var row in list)
                {
                    var sid = row["serverId"];
                    var db = row["database"] as string;
                    var key = sid + "|" + (db ?? "");
                    object[] rest;
                    if (restoreByKey.TryGetValue(key, out rest))
                    {
                        row["lastRestoredAt"] = rest[0];
                        row["lastRestoredBy"] = rest[1];
                    }
                    object[] res;
                    if (resetByKey.TryGetValue(key, out res))
                    {
                        row["lastResetAt"] = res[0];
                        row["lastResetBy"] = res[1];
                        row["lastResetDataTypes"] = res[2];
                    }
                }
            }
            catch
            {
                // Bảng log có thể chưa có
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

        /// <summary>Kết nối đến database bằng serverId + tên database (connection string không gửi ra client).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object PrepareConnectByServerAndDb(int serverId, string databaseName)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập để kết nối." };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Bạn không có quyền truy cập server này." };
                if (string.IsNullOrWhiteSpace(databaseName))
                    return new { success = false, message = "Chưa chọn database." };

                if (!CanViewDatabase(serverId, databaseName))
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được kết nối/xem." };

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

                var connStr = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, databaseName.Trim());
                var parsedServer = (s.ServerName ?? "") + (s.Port.HasValue ? "," + s.Port.Value : "");
                var id = Guid.NewGuid().ToString("N");
                var ctx = HttpContext.Current;
                if (ctx?.Session != null)
                    ctx.Session["HRConn_" + id] = new HRConnInfo { ConnectionString = connStr, Server = parsedServer, Database = databaseName.Trim() };
                var token = DataSecurityWrapper.EncryptConnectId(id);
                UserActionLogHelper.Log("DatabaseSearch.Connect", "serverId=" + serverId + ", database=" + databaseName.Trim());
                return new { success = true, token = token };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object PrepareConnect(string connectionString, string server, string database)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(connectionString))
                    return new { success = false, message = "Connection string trống." };
                var connStr = connectionString.Trim();
                var isConnStrDirect = string.IsNullOrWhiteSpace(server) && string.IsNullOrWhiteSpace(database);
                var parsedServer = server ?? "";
                var parsedDatabase = database ?? "";
                if (isConnStrDirect)
                {
                    var toValidate = connStr;
                    if (toValidate.IndexOf("Connect Timeout=", StringComparison.OrdinalIgnoreCase) < 0
                        && toValidate.IndexOf("Connection Timeout=", StringComparison.OrdinalIgnoreCase) < 0)
                        toValidate = toValidate.TrimEnd(';') + ";Connect Timeout=10";
                    try
                    {
                        using (var conn = new SqlConnection(toValidate))
                        {
                            conn.Open();
                        }
                    }
                    catch (SqlException ex)
                    {
                        var msg = "Không kết nối được. ";
                        if (ex.Number == 18456) msg += "Sai tên đăng nhập hoặc mật khẩu.";
                        else if (ex.Number == -1 || ex.Number == 53) msg += "Không truy cập được server.";
                        else if (ex.Number == 4060) msg += "Database không tồn tại hoặc không có quyền truy cập.";
                        else msg += ex.Message;
                        return new { success = false, message = msg };
                    }
                    try
                    {
                        var builder = new SqlConnectionStringBuilder(connStr);
                        parsedServer = builder.DataSource ?? "";
                        parsedDatabase = builder.InitialCatalog ?? "";
                    }
                    catch { }
                }
                var id = Guid.NewGuid().ToString("N");
                var ctx = HttpContext.Current;
                if (ctx?.Session != null)
                    ctx.Session["HRConn_" + id] = new HRConnInfo { ConnectionString = connStr, Server = parsedServer, Database = parsedDatabase };
                var token = DataSecurityWrapper.EncryptConnectId(id);
                return new { success = true, token = token };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private static string GetDatabaseBackupPath()
        {
            var path = System.Configuration.ConfigurationManager.AppSettings["DatabaseBackupPath"];
            return string.IsNullOrWhiteSpace(path) ? null : path.Trim().TrimEnd('\\');
        }

        /// <summary>Backup database. Chỉ Admin (DatabaseManageServers) hoặc người đã restore DB này.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object BackupDatabase(int serverId, string databaseName)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (!CanBackupStatic())
                    return new { success = false, message = "Không có quyền backup database." };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền truy cập server này." };
                if (string.IsNullOrWhiteSpace(databaseName))
                    return new { success = false, message = "Chưa chọn database." };
                if (!CanViewDatabase(serverId, databaseName))
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được backup." };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                var backupPath = GetBackupPathForServer(serverId);
                if (string.IsNullOrEmpty(backupPath))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup: Sửa server, nhập \"Đường dẫn backup\", hoặc cấu hình DatabaseBackupPath trong Web.config." };
                var dbSafe = databaseName.Trim().Replace("]", "]]");
                var fileName = new string(databaseName.Trim().Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '.').ToArray());
                if (string.IsNullOrEmpty(fileName)) fileName = "db";
                fileName += "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".bak";
                var fullPath = backupPath + "\\" + fileName;

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 3600;
                        cmd.CommandText = "BACKUP DATABASE [" + dbSafe + "] TO DISK = @path WITH INIT, COMPRESSION";
                        cmd.Parameters.AddWithValue("@path", fullPath);
                        cmd.ExecuteNonQuery();
                    }
                }
                UserActionLogHelper.Log("DatabaseSearch.Backup", "serverId=" + serverId + ", database=" + databaseName + ", file=" + fileName);
                return new { success = true, message = "Đã backup.", fileName = fileName, path = fullPath };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Lấy danh sách backup sets trong file .bak (RESTORE HEADERONLY). Path là đường dẫn đầy đủ mà SQL Server đọc được.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetBackupSets(int serverId, string backupFilePath)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", sets = new List<object>() };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền.", sets = new List<object>() };
                if (string.IsNullOrWhiteSpace(backupFilePath))
                    return new { success = false, message = "Chưa chọn file backup.", sets = new List<object>() };
                var backupPath = GetBackupPathForServer(serverId);
                if (string.IsNullOrEmpty(backupPath)) return new { success = false, message = "Chưa cấu hình đường dẫn backup.", sets = new List<object>() };
                var backupRoot = backupPath.Trim().TrimEnd('\\');
                var rel = NormalizeBackupRelativePath(backupFilePath);
                if (rel.Contains("..") || rel.Contains("/")) return new { success = false, message = "Đường dẫn không hợp lệ.", sets = new List<object>() };
                var fullPath = string.IsNullOrEmpty(rel) ? backupRoot : System.IO.Path.Combine(backupRoot, rel);
                fullPath = System.IO.Path.GetFullPath(fullPath);
                if (!fullPath.StartsWith(System.IO.Path.GetFullPath(backupRoot), StringComparison.OrdinalIgnoreCase))
                    return new { success = false, message = "Đường dẫn không hợp lệ.", sets = new List<object>() };

                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server.", sets = new List<object>() };
                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                var sets = new List<object>();
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 120;
                        cmd.CommandText = "RESTORE HEADERONLY FROM DISK = @path";
                        cmd.Parameters.AddWithValue("@path", fullPath);
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                            {
                                var posOrd = r.GetOrdinal("Position");
                                var posVal = r.IsDBNull(posOrd) ? (object)1 : r.GetValue(posOrd);
                                var position = Convert.ToInt16(posVal);
                                var btOrd = r.GetOrdinal("BackupType");
                                var btVal = r.IsDBNull(btOrd) ? (object)0 : r.GetValue(btOrd);
                                var backupType = (short)Convert.ToInt32(btVal); // 1=Full, 2=Log, 5=Differential; SQL có thể trả tinyint/smallint
                                var typeName = backupType == 1 ? "Full" : backupType == 2 ? "Transaction Log" : backupType == 5 ? "Differential" : "Type " + backupType;
                                var nameCol = -1;
                                try { nameCol = r.GetOrdinal("BackupName"); } catch { try { nameCol = r.GetOrdinal("BackupSetName"); } catch { } }
                                var name = nameCol >= 0 && !r.IsDBNull(nameCol) ? r.GetString(nameCol) : null;
                                if (string.IsNullOrWhiteSpace(name)) name = r.IsDBNull(r.GetOrdinal("DatabaseName")) ? "" : r.GetString(r.GetOrdinal("DatabaseName")) + " - " + typeName;
                                var dbName = r.IsDBNull(r.GetOrdinal("DatabaseName")) ? "" : r.GetString(r.GetOrdinal("DatabaseName"));
                                var startDate = r.IsDBNull(r.GetOrdinal("BackupStartDate")) ? (DateTime?)null : r.GetDateTime(r.GetOrdinal("BackupStartDate"));
                                var firstLsn = r.IsDBNull(r.GetOrdinal("FirstLSN")) ? "" : r.GetValue(r.GetOrdinal("FirstLSN")).ToString();
                                var lastLsn = r.IsDBNull(r.GetOrdinal("LastLSN")) ? "" : r.GetValue(r.GetOrdinal("LastLSN")).ToString();
                                sets.Add(new { position, backupType, typeName, name = (name ?? "").Trim(), databaseName = dbName, backupStartDate = startDate, firstLSN = firstLsn, lastLSN = lastLsn });
                            }
                        }
                    }
                }
                return new { success = true, sets = sets };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, sets = new List<object>() };
            }
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, SqlConnection> RestoreSessions = new System.Collections.Concurrent.ConcurrentDictionary<int, SqlConnection>();
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, object> RestoreSessionStatus = new System.Collections.Concurrent.ConcurrentDictionary<int, object>();
        private static System.Threading.Timer _restoreProgressUpdateTimer;
        private static readonly object _restoreProgressUpdateTimerLock = new object();

        /// <summary>Timer callback: cập nhật PercentComplete cho mọi job Running từ sys.dm_exec_requests (trên server đích). Chạy trên server nên DB luôn được cập nhật dù client không poll.</summary>
        private static void UpdateAllRestoreProgressCallback(object state)
        {
            try
            {
                string connStr = UiAuthHelper.ConnStr;
                if (string.IsNullOrEmpty(connStr)) return;
                var jobs = new List<Tuple<int, int, int>>();
                using (var conn = new SqlConnection(connStr))
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT Id, ServerId, SessionId FROM BaRestoreJob WHERE Status = N'Running'";
                        conn.Open();
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                                jobs.Add(Tuple.Create(r.GetInt32(0), r.GetInt32(1), r.GetInt32(2)));
                        }
                    }
                }
                foreach (var j in jobs)
                {
                    try
                    {
                        var s = GetServerInfo(j.Item2);
                        if (s == null) continue;
                        var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                        using (var conn = new SqlConnection(masterConn))
                        {
                            conn.Open();
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = "SELECT percent_complete FROM sys.dm_exec_requests WHERE session_id = @sid";
                                cmd.Parameters.AddWithValue("@sid", j.Item3);
                                var o = cmd.ExecuteScalar();
                                if (o != null && !(o is DBNull))
                                {
                                    var pct = (int)Math.Round(Convert.ToSingle(o));
                                    using (var appConn = new SqlConnection(connStr))
                                    using (var upd = appConn.CreateCommand())
                                    {
                                        upd.CommandText = "UPDATE BaRestoreJob SET PercentComplete = @pct WHERE Id = @id";
                                        upd.Parameters.AddWithValue("@pct", pct);
                                        upd.Parameters.AddWithValue("@id", j.Item1);
                                        appConn.Open();
                                        upd.ExecuteNonQuery();
                                    }
                                }
                            }
                        }
                    }
                    catch { /* bỏ qua lỗi từng job (server down, session đã thoát, v.v.) */ }
                }
                if (jobs.Count > 0)
                    PushRestoreJobsUpdated();
            }
            catch { /* tránh làm sập app pool */ }
        }

        /// <summary>Push SignalR: báo cho mọi client refresh thông báo restore (badge/panel). Gọi khi cập nhật progress hoặc job completed.</summary>
        private static void PushRestoreJobsUpdated()
        {
            try
            {
                var ctx = GlobalHost.ConnectionManager.GetHubContext<RestoreNotificationHub>();
                ctx?.Clients.All.RestoreJobsUpdated();
            }
            catch { /* SignalR chưa map hoặc lỗi kết nối */ }
        }

        /// <summary>Bắt đầu restore chạy nền, trả về sessionId để client poll tiến độ. positions: thứ tự backup set (FILE=n), recoveryState: RECOVERY|NORECOVERY|STANDBY, withReplace: WITH REPLACE.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartRestore(int serverId, string databaseName, string backupFileName, string positionsJson, string recoveryState, bool withReplace, bool withShrinkLog = false)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", sessionId = 0, jobId = 0 };
                if (!CanRestoreStatic())
                    return new { success = false, message = "Không có quyền restore database.", sessionId = 0, jobId = 0 };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền.", sessionId = 0, jobId = 0 };
                if (string.IsNullOrWhiteSpace(databaseName) || string.IsNullOrWhiteSpace(backupFileName))
                    return new { success = false, message = "Nhập tên database đích và chọn file backup.", sessionId = 0, jobId = 0 };
                databaseName = databaseName.Trim();
                var backupPath = GetBackupPathForServer(serverId);
                if (string.IsNullOrEmpty(backupPath))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup.", sessionId = 0, jobId = 0 };
                var backupFileNameNorm = NormalizeBackupRelativePath(backupFileName);
                if (backupFileNameNorm.Contains("..") || backupFileNameNorm.Contains("/"))
                    return new { success = false, message = "Tên file không hợp lệ.", sessionId = 0, jobId = 0 };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server.", sessionId = 0, jobId = 0 };
                var backupRoot = backupPath.Trim().TrimEnd('\\');
                var fullPath = string.IsNullOrEmpty(backupFileNameNorm) ? backupRoot : System.IO.Path.Combine(backupRoot, backupFileNameNorm);
                fullPath = System.IO.Path.GetFullPath(fullPath);
                if (!fullPath.StartsWith(System.IO.Path.GetFullPath(backupRoot), StringComparison.OrdinalIgnoreCase))
                    return new { success = false, message = "Đường dẫn file không hợp lệ.", sessionId = 0, jobId = 0 };

                List<int> positions = new List<int>();
                if (!string.IsNullOrWhiteSpace(positionsJson))
                {
                    try
                    {
                        var ser = new System.Web.Script.Serialization.JavaScriptSerializer();
                        var arr = ser.Deserialize<int[]>(positionsJson);
                        if (arr != null) positions.AddRange(arr);
                    }
                    catch { }
                }
                if (positions.Count == 0) positions.Add(1);
                var recovery = (recoveryState ?? "RECOVERY").ToUpperInvariant();
                if (recovery != "RECOVERY" && recovery != "NORECOVERY" && recovery != "STANDBY") recovery = "RECOVERY";

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                var conn = new SqlConnection(masterConn);
                conn.Open();
                int sessionId;
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT @@SPID";
                    var spidVal = cmd.ExecuteScalar();
                    sessionId = spidVal == null || spidVal is DBNull ? 0 : Convert.ToInt32(spidVal);
                }
                RestoreSessions.TryAdd(sessionId, conn);

                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var startedByName = "";
                try
                {
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT FullName FROM UiUser WHERE UserId = @uid";
                        cmd.Parameters.AddWithValue("@uid", userId);
                        appConn.Open();
                        var o = cmd.ExecuteScalar();
                        startedByName = o != null && !(o is DBNull) ? o.ToString() : ("User " + userId);
                    }
                }
                catch (Exception ex)
                {
                    startedByName = "User " + userId; 
                }

                int jobId = 0;
                try
                {
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        cmd.CommandText = @"INSERT INTO BaRestoreJob (ServerId, ServerName, DatabaseName, BackupFileName, StartedByUserId, StartedByUserName, StartTime, SessionId, Status, PercentComplete)
VALUES (@sid, @sname, @db, @file, @uid, @uname, SYSDATETIME(), @sess, N'Running', 0); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                        cmd.Parameters.AddWithValue("@sid", serverId);
                        cmd.Parameters.AddWithValue("@sname", (s.ServerName ?? "") + (s.Port.HasValue ? "," + s.Port.Value : ""));
                        cmd.Parameters.AddWithValue("@db", databaseName);
                        cmd.Parameters.AddWithValue("@file", backupFileName);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@uname", startedByName);
                        cmd.Parameters.AddWithValue("@sess", sessionId);
                        appConn.Open();
                        jobId = (int)cmd.ExecuteScalar();
                    }
                }
                catch { jobId = 0; }

                var dbSafe = databaseName.Replace("]", "]]");
                var shrinkLog = withShrinkLog;
                System.Threading.Tasks.Task.Run(() =>
                {
                    try
                    {
                        bool isNewDb = false;
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT name FROM sys.databases WHERE name = @db";
                            cmd.Parameters.AddWithValue("@db", databaseName);
                            isNewDb = cmd.ExecuteScalar() == null;
                        }
                        if (!isNewDb)
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandTimeout = 60;
                                cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;";
                                try { cmd.ExecuteNonQuery(); } catch { }
                            }
                        }
                        // Lấy đường dẫn mặc định và danh sách file logic trong backup để dùng WITH MOVE (tránh lỗi path not found)
                        string defaultDataPath = null, defaultLogPath = null;
                        var moveClauses = new List<string>();
                        try
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = "SELECT CONVERT(nvarchar(260), SERVERPROPERTY('InstanceDefaultDataPath')), CONVERT(nvarchar(260), SERVERPROPERTY('InstanceDefaultLogPath'))";
                                using (var r = cmd.ExecuteReader())
                                {
                                    if (r.Read())
                                    {
                                        defaultDataPath = r.IsDBNull(0) ? null : r.GetString(0);
                                        defaultLogPath = r.IsDBNull(1) ? null : r.GetString(1);
                                    }
                                }
                            }
                            if (!string.IsNullOrEmpty(defaultDataPath) && !string.IsNullOrEmpty(defaultLogPath))
                            {
                                defaultDataPath = defaultDataPath.TrimEnd('\\') + "\\";
                                defaultLogPath = defaultLogPath.TrimEnd('\\') + "\\";
                                var safeName = System.Text.RegularExpressions.Regex.Replace(databaseName, @"[\:\*\?\""\<\>\|]", "_");
                                if (string.IsNullOrEmpty(safeName)) safeName = "Database";
                                using (var cmd = conn.CreateCommand())
                                {
                                    cmd.CommandTimeout = 60;
                                    cmd.CommandText = "RESTORE FILELISTONLY FROM DISK = @path";
                                    cmd.Parameters.AddWithValue("@path", fullPath);
                                    using (var r = cmd.ExecuteReader())
                                    {
                                        int dataIndex = 0;
                                        while (r.Read())
                                        {
                                            var logicalName = r.GetString(r.GetOrdinal("LogicalName"));
                                            var type = r.GetString(r.GetOrdinal("Type"));
                                            string physicalPath;
                                            if (type == "D")
                                            {
                                                physicalPath = dataIndex == 0
                                                    ? defaultDataPath + safeName + ".mdf"
                                                    : defaultDataPath + safeName + "_" + (dataIndex + 1) + ".ndf";
                                                dataIndex++;
                                            }
                                            else if (type == "L")
                                                physicalPath = defaultLogPath + safeName + "_log.ldf";
                                            else
                                                continue;
                                            moveClauses.Add("MOVE N'" + logicalName.Replace("'", "''") + "' TO N'" + physicalPath.Replace("'", "''") + "'");
                                        }
                                    }
                                }
                            }
                        }
                        catch { /* bỏ qua nếu không lấy được file list; restore không dùng MOVE */ }

                        for (int i = 0; i < positions.Count; i++)
                        {
                            bool isLast = (i == positions.Count - 1);
                            var withClause = new List<string>();
                            withClause.Add("FILE = " + positions[i]);
                            if (moveClauses.Count > 0) withClause.AddRange(moveClauses);
                            if (!isLast) withClause.Add("NORECOVERY");
                            else
                            {
                                if (recovery == "NORECOVERY") withClause.Add("NORECOVERY");
                                else if (recovery == "STANDBY") withClause.Add("STANDBY = N''");
                                if (withReplace) withClause.Add("REPLACE");
                            }
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandTimeout = 3600;
                                cmd.CommandText = "RESTORE DATABASE [" + dbSafe + "] FROM DISK = @path WITH " + string.Join(", ", withClause);
                                cmd.Parameters.AddWithValue("@path", fullPath);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        if (shrinkLog)
                        {
                            try
                            {
                                var dbConnStr = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, databaseName);
                                using (var dbConn = new SqlConnection(dbConnStr))
                                {
                                    dbConn.Open();
                                    using (var cmd = dbConn.CreateCommand())
                                    {
                                        cmd.CommandTimeout = 300;
                                        cmd.CommandText = "SELECT name FROM sys.database_files WHERE type_desc = N'LOG'";
                                        var logName = cmd.ExecuteScalar() as string;
                                        if (!string.IsNullOrEmpty(logName))
                                        {
                                            using (var cmd2 = dbConn.CreateCommand())
                                            {
                                                cmd2.CommandTimeout = 300;
                                                cmd2.CommandText = "DBCC SHRINKFILE (N'" + logName.Replace("'", "''") + "', 1)";
                                                cmd2.ExecuteNonQuery();
                                            }
                                        }
                                    }
                                }
                            }
                            catch { }
                        }
                        if (!isNewDb)
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET MULTI_USER;";
                                try { cmd.ExecuteNonQuery(); } catch { }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        RestoreSessionStatus.TryAdd(sessionId, new { status = "failed", message = ex.Message });
                    }
                    finally
                    {
                        try { conn.Dispose(); } catch { }
                        SqlConnection removedConn;
                        RestoreSessions.TryRemove(sessionId, out removedConn);
                        if (!RestoreSessionStatus.ContainsKey(sessionId))
                            RestoreSessionStatus.TryAdd(sessionId, new { status = "success" });
                        try
                        {
                            object statusObj;
                            var status = "Completed";
                            var msg = (string)null;
                            if (RestoreSessionStatus.TryRemove(sessionId, out statusObj))
                            {
                                try
                                {
                                    dynamic st = statusObj;
                                    if ((string)st.status == "failed") { status = "Failed"; msg = (string)st.message; }
                                }
                                catch { }
                            }
                            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                            using (var cmd = appConn.CreateCommand())
                            {
                                cmd.CommandText = "UPDATE BaRestoreJob SET Status = @st, PercentComplete = 100, Message = @msg, CompletedAt = SYSDATETIME() WHERE SessionId = @sess";
                                cmd.Parameters.AddWithValue("@st", status);
                                cmd.Parameters.AddWithValue("@msg", (object)msg ?? DBNull.Value);
                                cmd.Parameters.AddWithValue("@sess", sessionId);
                                appConn.Open();
                                cmd.ExecuteNonQuery();
                            }
                            PushRestoreJobsUpdated();
                        }
                        catch { }
                    }
                });

                lock (_restoreProgressUpdateTimerLock)
                {
                    if (_restoreProgressUpdateTimer == null)
                        _restoreProgressUpdateTimer = new System.Threading.Timer(UpdateAllRestoreProgressCallback, null, 2000, 2000);
                }
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = "INSERT INTO BaDatabaseRestoreLog (ServerId, DatabaseName, RestoredByUserId, Note) VALUES (@sid, @db, @uid, @note)";
                    cmd.Parameters.AddWithValue("@sid", serverId);
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@note", "File: " + backupFileName);
                    appConn.Open();
                    cmd.ExecuteNonQuery();
                }
                UserActionLogHelper.Log("DatabaseSearch.StartRestore", "serverId=" + serverId + ", database=" + databaseName + ", file=" + backupFileName);
                return new { success = true, sessionId = sessionId, jobId = jobId };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, sessionId = 0, jobId = 0 };
            }
        }

        /// <summary>Danh sách job restore (đang chạy + mới xong). Chỉ user có DatabaseBackup hoặc DatabaseRestore.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetRestoreJobs()
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobs = new List<object>() };
                if (!CanBackupStatic() && !CanRestoreStatic())
                    return new { success = false, message = "Không có quyền.", jobs = new List<object>() };
                var jobs = new List<object>();
                try
                {
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    {
                        conn.Open();
                        var sqlWithDismiss = @"SELECT Id, ServerId, ServerName, DatabaseName, BackupFileName, StartedByUserId, StartedByUserName, StartTime, SessionId, Status, PercentComplete, Message, CompletedAt
FROM BaRestoreJob WHERE (DismissedAt IS NULL) AND (Status = N'Running' OR (Status IN (N'Completed', N'Failed') AND CompletedAt >= DATEADD(day, -1, SYSDATETIME())))
ORDER BY CASE WHEN Status = N'Running' THEN 0 ELSE 1 END, StartTime DESC";
                        var sqlWithoutDismiss = @"SELECT Id, ServerId, ServerName, DatabaseName, BackupFileName, StartedByUserId, StartedByUserName, StartTime, SessionId, Status, PercentComplete, Message, CompletedAt
FROM BaRestoreJob WHERE Status = N'Running' OR (Status IN (N'Completed', N'Failed') AND CompletedAt >= DATEADD(day, -1, SYSDATETIME()))
ORDER BY CASE WHEN Status = N'Running' THEN 0 ELSE 1 END, StartTime DESC";
                        try
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = sqlWithDismiss;
                                using (var r = cmd.ExecuteReader())
                                {
                                    while (r.Read())
                                    {
                                        jobs.Add(new
                                        {
                                            id = r.GetInt32(0),
                                            serverId = r.GetInt32(1),
                                            serverName = r.IsDBNull(2) ? "" : r.GetString(2),
                                            databaseName = r.IsDBNull(3) ? "" : r.GetString(3),
                                            backupFileName = r.IsDBNull(4) ? "" : r.GetString(4),
                                            startedByUserId = r.GetInt32(5),
                                            startedByUserName = r.IsDBNull(6) ? "" : r.GetString(6),
                                            startTime = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7),
                                            sessionId = r.IsDBNull(8) ? (int?)null : r.GetInt32(8),
                                            status = r.IsDBNull(9) ? "" : r.GetString(9),
                                            percentComplete = r.IsDBNull(10) ? 0 : r.GetInt32(10),
                                            message = r.IsDBNull(11) ? "" : r.GetString(11),
                                            completedAt = r.IsDBNull(12) ? (DateTime?)null : r.GetDateTime(12)
                                        });
                                    }
                                }
                            }
                        }
                        catch (SqlException)
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = sqlWithoutDismiss;
                                using (var r = cmd.ExecuteReader())
                                {
                                    while (r.Read())
                                    {
                                        jobs.Add(new
                                        {
                                            id = r.GetInt32(0),
                                            serverId = r.GetInt32(1),
                                            serverName = r.IsDBNull(2) ? "" : r.GetString(2),
                                            databaseName = r.IsDBNull(3) ? "" : r.GetString(3),
                                            backupFileName = r.IsDBNull(4) ? "" : r.GetString(4),
                                            startedByUserId = r.GetInt32(5),
                                            startedByUserName = r.IsDBNull(6) ? "" : r.GetString(6),
                                            startTime = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7),
                                            sessionId = r.IsDBNull(8) ? (int?)null : r.GetInt32(8),
                                            status = r.IsDBNull(9) ? "" : r.GetString(9),
                                            percentComplete = r.IsDBNull(10) ? 0 : r.GetInt32(10),
                                            message = r.IsDBNull(11) ? "" : r.GetString(11),
                                            completedAt = r.IsDBNull(12) ? (DateTime?)null : r.GetDateTime(12)
                                        });
                                    }
                                }
                            }
                        }
                    }
                    return new { success = true, jobs = jobs };
                }
                catch
                {
                    return new { success = true, jobs = new List<object>() };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobs = new List<object>() };
            }
        }

        /// <summary>Đánh dấu thông báo đã đọc (ẩn khỏi danh sách). Cần chạy script AddBaRestoreJobDismissedAt.sql trước.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DismissRestoreJob(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (!CanBackupStatic() && !CanRestoreStatic())
                    return new { success = false, message = "Không có quyền." };
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaRestoreJob SET DismissedAt = SYSDATETIME() WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    var rows = cmd.ExecuteNonQuery();
                    return new { success = rows > 0 };
                }
            }
            catch (SqlException ex)
            {
                if (ex.Message.IndexOf("DismissedAt", StringComparison.OrdinalIgnoreCase) >= 0)
                    return new { success = false, message = "Chạy script AddBaRestoreJobDismissedAt.sql để bật tính năng đánh dấu đã đọc." };
                return new { success = false, message = ex.Message };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Lấy tiến độ restore (%) từ session đang chạy trên SQL Server. Cập nhật BaRestoreJob.PercentComplete.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetRestoreProgress(int serverId, int sessionId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, percentComplete = 0, completed = false };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds == null || accessibleIds.Count > 0 && !accessibleIds.Contains(serverId))
                    return new { success = false, percentComplete = 0, completed = false };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, percentComplete = 0, completed = false };
                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT percent_complete, estimated_completion_time FROM sys.dm_exec_requests WHERE session_id = @sid";
                        cmd.Parameters.AddWithValue("@sid", sessionId);
                        using (var r = cmd.ExecuteReader())
                        {
                            if (r.Read())
                            {
                                var pct = r.IsDBNull(0) ? 0 : Convert.ToSingle(r.GetValue(0));
                                var eta = r.IsDBNull(1) ? 0L : r.GetInt64(1);
                                var pctInt = (int)Math.Round(pct);
                                try
                                {
                                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                                    using (var upd = appConn.CreateCommand())
                                    {
                                        upd.CommandText = "UPDATE BaRestoreJob SET PercentComplete = @pct WHERE SessionId = @sess";
                                        upd.Parameters.AddWithValue("@pct", pctInt);
                                        upd.Parameters.AddWithValue("@sess", sessionId);
                                        appConn.Open();
                                        upd.ExecuteNonQuery();
                                    }
                                }
                                catch { }
                                return new { success = true, percentComplete = pctInt, estimatedCompletionTime = eta, completed = false };
                            }
                        }
                    }
                }
                object statusObj;
                if (RestoreSessionStatus.TryRemove(sessionId, out statusObj))
                {
                    try
                    {
                        dynamic st = statusObj;
                        if ((string)st.status == "failed")
                            return new { success = false, message = (string)(st.message ?? "Restore thất bại."), percentComplete = 0, completed = true };
                    }
                    catch { }
                }
                return new { success = true, percentComplete = 100, completed = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, percentComplete = 0, completed = true };
            }
        }

        /// <summary>Restore database đồng bộ (một backup set, tương thích cũ). UI mới dùng StartRestore + GetRestoreProgress.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object RestoreDatabase(int serverId, string databaseName, string backupFileName)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (!CanRestoreStatic())
                    return new { success = false, message = "Không có quyền restore database." };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền truy cập server này." };
                if (string.IsNullOrWhiteSpace(databaseName) || string.IsNullOrWhiteSpace(backupFileName))
                    return new { success = false, message = "Nhập tên database đích và chọn file backup." };
                databaseName = databaseName.Trim();
                var backupPath = GetBackupPathForServer(serverId);
                if (string.IsNullOrEmpty(backupPath))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup." };
                var backupFileNameNorm = NormalizeBackupRelativePath(backupFileName);
                if (backupFileNameNorm.Contains("..") || backupFileNameNorm.Contains("/"))
                    return new { success = false, message = "Tên file không hợp lệ." };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                var backupRoot = backupPath.Trim().TrimEnd('\\');
                var fullPath = string.IsNullOrEmpty(backupFileNameNorm) ? backupRoot : System.IO.Path.Combine(backupRoot, backupFileNameNorm);
                fullPath = System.IO.Path.GetFullPath(fullPath);
                if (!fullPath.StartsWith(System.IO.Path.GetFullPath(backupRoot), StringComparison.OrdinalIgnoreCase))
                    return new { success = false, message = "Đường dẫn file không hợp lệ." };
                var dbSafe = databaseName.Replace("]", "]]");
                bool isNewDatabase;
                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT name FROM sys.databases WHERE name = @db";
                        cmd.Parameters.AddWithValue("@db", databaseName);
                        isNewDatabase = cmd.ExecuteScalar() == null;
                    }
                }
                if (!isNewDatabase && !CanViewDatabase(serverId, databaseName))
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được restore (ghi đè)." };
                if (isNewDatabase && !UiAuthHelper.IsSuperAdmin && !UiAuthHelper.HasFeature("DatabaseManageServers"))
                    return new { success = false, message = "Chỉ Admin mới được restore lên database mới." };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    if (!isNewDatabase)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandTimeout = 60;
                            cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;";
                            try { cmd.ExecuteNonQuery(); } catch { }
                        }
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 3600;
                        cmd.CommandText = isNewDatabase
                            ? "RESTORE DATABASE [" + dbSafe + "] FROM DISK = @path"
                            : "RESTORE DATABASE [" + dbSafe + "] FROM DISK = @path WITH REPLACE;";
                        cmd.Parameters.AddWithValue("@path", fullPath);
                        cmd.ExecuteNonQuery();
                    }
                    if (!isNewDatabase)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET MULTI_USER;";
                            try { cmd.ExecuteNonQuery(); } catch { }
                        }
                    }
                }
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = "INSERT INTO BaDatabaseRestoreLog (ServerId, DatabaseName, RestoredByUserId, Note) VALUES (@sid, @db, @uid, @note)";
                    cmd.Parameters.AddWithValue("@sid", serverId);
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@note", "File: " + backupFileName);
                    appConn.Open();
                    cmd.ExecuteNonQuery();
                }
                UserActionLogHelper.Log("DatabaseSearch.Restore", "serverId=" + serverId + ", database=" + databaseName + ", file=" + backupFileName);
                return new { success = true, message = "Đã restore." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Xóa database. Chỉ Admin hoặc người đã restore DB này.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DeleteDatabase(int serverId, string databaseName)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (string.IsNullOrWhiteSpace(databaseName))
                    return new { success = false, message = "Chưa chọn database." };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền truy cập server này." };

                var canDelete = UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers");
                if (!canDelete)
                {
                    var uid = UiAuthHelper.CurrentUserId;
                    if (uid.HasValue)
                    {
                        using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT TOP 1 1 FROM BaDatabaseRestoreLog WHERE ServerId = @sid AND DatabaseName = @db AND RestoredByUserId = @uid";
                            cmd.Parameters.AddWithValue("@sid", serverId);
                            cmd.Parameters.AddWithValue("@db", databaseName.Trim());
                            cmd.Parameters.AddWithValue("@uid", uid.Value);
                            conn.Open();
                            canDelete = cmd.ExecuteScalar() != null;
                        }
                    }
                }
                if (!canDelete)
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được xóa." };

                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                var dbSafe = databaseName.Trim().Replace("]", "]]");

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 60;
                        cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;";
                        try { cmd.ExecuteNonQuery(); } catch { }
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 60;
                        cmd.CommandText = "DROP DATABASE [" + dbSafe + "]";
                        cmd.ExecuteNonQuery();
                    }
                }
                UserActionLogHelper.Log("DatabaseSearch.DeleteDatabase", "serverId=" + serverId + ", database=" + databaseName);
                return new { success = true, message = "Đã xóa database." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Liệt kê file .bak trên máy SQL Server qua xp_cmdshell (giống SSMS), chỉ cần quyền SA. Đường dẫn backup là path trên máy SQL.</summary>
        private static bool TryListBackupFilesViaSqlServer(ServerInfo s, string backupPath, out string[] files, out string message)
        {
            files = new string[0];
            message = null;
            if (s == null || string.IsNullOrWhiteSpace(backupPath)) return false;
            backupPath = backupPath.Trim().TrimEnd('\\');
            var pathForCmd = backupPath.Replace("\"", "");
            var dirCmd = "dir /b \"" + pathForCmd + "\\*.bak\"";
            var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
            try
            {
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 30;
                        cmd.CommandText = "EXEC xp_cmdshell @cmd";
                        cmd.Parameters.AddWithValue("@cmd", dirCmd);
                        var list = new List<string>();
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                            {
                                var line = r.IsDBNull(0) ? null : (r.GetString(0) ?? "").Trim();
                                if (string.IsNullOrEmpty(line) || line.Equals("NULL", StringComparison.OrdinalIgnoreCase)) continue;
                                if (line.EndsWith(".bak", StringComparison.OrdinalIgnoreCase) && line.IndexOfAny(new[] { '\\', '/', ':' }) < 0)
                                    list.Add(line);
                            }
                        }
                        files = list.OrderByDescending(f => f).Take(100).ToArray();
                        message = files.Length == 0 ? "Không có file .bak trong thư mục trên máy SQL: " + backupPath + "." : null;
                        return true;
                    }
                }
            }
            catch (SqlException ex)
            {
                if (ex.Number == 15281 || ex.Message.IndexOf("xp_cmdshell", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    message = "Trên server không bật xp_cmdshell (thường do chính sách). Cách khác: nhờ người quản lý máy SQL share thư mục backup (vd. E:\\...\\Backup), rồi trong Sửa server nhập Đường dẫn backup = UNC (vd: \\\\HRS05\\BackupShare). Máy chạy web cần truy cập được share đó.";
                    return false;
                }
                message = ex.Message;
                return false;
            }
            catch (Exception ex)
            {
                message = ex.Message;
                return false;
            }
        }

        /// <summary>Lấy danh sách file .bak: ưu tiên liệt kê qua SQL Server (xp_cmdshell, path trên máy SQL — giống SSMS, chỉ cần SA). Nếu không được thì thử đọc từ máy web (path/UNC trên máy web).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ListBackupFiles(int serverId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", files = new string[0] };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền.", files = new string[0] };
                var backupPath = GetBackupPathForServer(serverId);
                if (string.IsNullOrWhiteSpace(backupPath))
                    return new { success = true, files = new string[0], message = "Chưa cấu hình đường dẫn backup. Sửa server → nhập Đường dẫn backup (path trên máy SQL), hoặc Web.config DatabaseBackupPath." };
                backupPath = backupPath.Trim().TrimEnd('\\');
                var s = GetServerInfo(serverId);

                // Ưu tiên: liệt kê trên máy SQL qua xp_cmdshell (giống SSMS, chỉ cần SA)
                string[] files;
                string msg;
                if (TryListBackupFilesViaSqlServer(s, backupPath, out files, out msg))
                    return new { success = true, files = files, message = msg };

                // Fallback: đọc từ máy chạy web (UNC hoặc path local — máy web cần truy cập được)
                if (!System.IO.Directory.Exists(backupPath))
                    return new { success = true, files = new string[0], message = "Thư mục không tồn tại trên máy chạy web: " + backupPath + ". Đường dẫn backup nên là path trên máy SQL (ứng dụng sẽ liệt kê qua SQL Server); nếu dùng path máy web thì dùng UNC (vd: \\\\TênMáySQL\\Share)." };
                try
                {
                    files = System.IO.Directory.GetFiles(backupPath, "*.bak")
                        .Select(System.IO.Path.GetFileName)
                        .OrderByDescending(f => f)
                        .Take(100)
                        .ToArray();
                }
                catch (UnauthorizedAccessException)
                {
                    return new { success = true, files = new string[0], message = "Không có quyền đọc thư mục (máy web): " + backupPath + "." };
                }
                return new { success = true, files = files, message = files.Length == 0 ? "Không có file .bak trong thư mục: " + backupPath + "." : null };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, files = new string[0] };
            }
        }

        /// <summary>Liệt kê thư mục con và file .bak trong một thư mục backup (hỗ trợ chọn file theo cây thư mục). subPath tương đối so với root backup, trống = root.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ListBackupFolder(int serverId, string subPath)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", folders = new object[0], files = new object[0] };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền.", folders = new object[0], files = new object[0] };
                var backupRoot = GetBackupPathForServer(serverId);
                if (string.IsNullOrWhiteSpace(backupRoot))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup.", folders = new object[0], files = new object[0] };
                backupRoot = System.IO.Path.GetFullPath(backupRoot.Trim().TrimEnd('\\'));
                var sub = (subPath ?? "").Trim().Replace('/', '\\').TrimStart('\\');
                var fullPath = string.IsNullOrEmpty(sub) ? backupRoot : System.IO.Path.Combine(backupRoot, sub);
                fullPath = System.IO.Path.GetFullPath(fullPath);
                if (!fullPath.StartsWith(backupRoot, StringComparison.OrdinalIgnoreCase))
                    return new { success = false, message = "Đường dẫn không hợp lệ.", folders = new object[0], files = new object[0] };
                if (!System.IO.Directory.Exists(fullPath))
                    return new { success = false, message = "Thư mục không tồn tại: " + sub, folders = new object[0], files = new object[0] };
                var folderList = new List<object>();
                var fileList = new List<object>();
                try
                {
                    var dirInfo = new System.IO.DirectoryInfo(fullPath);
                    foreach (var d in dirInfo.GetDirectories().OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase))
                    {
                        try
                        {
                            folderList.Add(new { name = d.Name, lastWriteTime = d.LastWriteTime, size = (long?)null });
                        }
                        catch { folderList.Add(new { name = d.Name, lastWriteTime = (DateTime?)null, size = (long?)null }); }
                    }
                    foreach (var f in dirInfo.GetFiles("*.bak").OrderByDescending(x => x.Name, StringComparer.OrdinalIgnoreCase))
                    {
                        try
                        {
                            fileList.Add(new { name = f.Name, lastWriteTime = f.LastWriteTime, size = f.Length });
                        }
                        catch { fileList.Add(new { name = f.Name, lastWriteTime = (DateTime?)null, size = (long?)null }); }
                    }
                }
                catch (UnauthorizedAccessException ex)
                {
                    return new { success = false, message = ex.Message, folders = new object[0], files = new object[0] };
                }
                return new { success = true, folders = folderList, files = fileList, currentPath = sub };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, folders = new object[0], files = new object[0] };
            }
        }

        /// <summary>Tìm sâu file .bak theo tên (tên file hoặc đường dẫn chứa searchText). Trả về danh sách có relativePath, name, lastWriteTime, size.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SearchBackupFiles(int serverId, string searchText)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", items = new List<object>() };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền.", items = new List<object>() };
                var backupRoot = GetBackupPathForServer(serverId);
                if (string.IsNullOrWhiteSpace(backupRoot))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup.", items = new List<object>() };
                backupRoot = System.IO.Path.GetFullPath(backupRoot.Trim().TrimEnd('\\'));
                var search = (searchText ?? "").Trim();
                var results = new List<object>();
                const int maxFiles = 500;
                try
                {
                    foreach (var f in System.IO.Directory.EnumerateFiles(backupRoot, "*.bak", System.IO.SearchOption.AllDirectories))
                    {
                        if (results.Count >= maxFiles) break;
                        try
                        {
                            var fullPath = System.IO.Path.GetFullPath(f);
                            if (!fullPath.StartsWith(backupRoot, StringComparison.OrdinalIgnoreCase)) continue;
                            var rel = fullPath.Length > backupRoot.Length ? fullPath.Substring(backupRoot.Length).TrimStart('\\') : "";
                            var name = System.IO.Path.GetFileName(fullPath);
                            var pathAndName = string.IsNullOrEmpty(rel) ? name : rel;
                            if (!string.IsNullOrEmpty(search) && pathAndName.IndexOf(search, StringComparison.OrdinalIgnoreCase) < 0)
                                continue;
                            var fi = new System.IO.FileInfo(fullPath);
                            results.Add(new { relativePath = rel, name = name, lastWriteTime = fi.LastWriteTime, size = fi.Length });
                        }
                        catch { }
                    }
                }
                catch (UnauthorizedAccessException) { }
                return new { success = true, items = results };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, items = new List<object>() };
            }
        }

        /// <summary>Lấy thông tin log cho nhiều database. itemsJson: JSON array of { serverId, databaseName }.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetDatabaseLogInfoBatch(string itemsJson)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", list = new List<object>() };
                var accessibleIds = GetAccessibleServerIds();
                var list = new List<object>();
                if (string.IsNullOrWhiteSpace(itemsJson))
                    return new { success = true, list = list };
                List<object> items;
                try
                {
                    var ser = new System.Web.Script.Serialization.JavaScriptSerializer();
                    items = ser.Deserialize<List<object>>(itemsJson);
                }
                catch { return new { success = false, message = "itemsJson không hợp lệ.", list = list }; }
                if (items == null || items.Count == 0)
                    return new { success = true, list = list };
                var serverCache = new Dictionary<int, ServerInfo>();
                foreach (var it in items)
                {
                    var dict = it as Dictionary<string, object>;
                    if (dict == null) continue;
                    object so, dn;
                    if (!dict.TryGetValue("serverId", out so) || !dict.TryGetValue("databaseName", out dn)) continue;
                    int sid = Convert.ToInt32(so);
                    string db = (dn ?? "").ToString().Trim();
                    if (string.IsNullOrEmpty(db)) continue;
                    if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(sid)))
                        continue;
                    if (!CanViewDatabase(sid, db)) continue;
                    ServerInfo s;
                    if (!serverCache.TryGetValue(sid, out s))
                    {
                        s = GetServerInfo(sid);
                        if (s != null) serverCache[sid] = s;
                    }
                    if (s == null) continue;
                    var info = GetDatabaseLogInfo(s, db);
                    list.Add(new
                    {
                        serverId = sid,
                        databaseName = db,
                        logFileName = info != null ? info.FileName : null,
                        logSizeMb = info != null ? info.SizeMb : (int?)null,
                        recoveryModel = info != null ? info.RecoveryModel : null
                    });
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, list = new List<object>() };
            }
        }

        /// <summary>Lấy thông tin log (recovery model, tên file, dung lượng MB) để hiển thị trong modal Shrink.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetDatabaseLogInfoApi(int serverId, string databaseName)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền truy cập server này." };
                if (!CanViewDatabase(serverId, databaseName))
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được shrink log." };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                var info = GetDatabaseLogInfo(s, databaseName.Trim());
                if (info == null)
                    return new { success = false, message = "Không lấy được thông tin log." };
                return new { success = true, logFileName = info.FileName, logSizeMb = info.SizeMb, recoveryModel = info.RecoveryModel };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Shrink file log: đổi sang SIMPLE (nếu FULL), SHRINKFILE, rồi đổi lại FULL nếu cần. Không ảnh hưởng data.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ShrinkDatabaseLog(int serverId, string databaseName, int targetSizeMb)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền truy cập server này." };
                if (!CanViewDatabase(serverId, databaseName))
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được shrink log." };
                if (targetSizeMb < 1 || targetSizeMb > 1024 * 100)
                    return new { success = false, message = "Target size phải từ 1 đến 102400 MB." };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                var db = databaseName.Trim();
                var dbSafe = db.Replace("]", "]]");

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                string recoveryBefore = null;
                string logFileName = null;
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT recovery_model_desc FROM sys.databases WHERE name = @db";
                        cmd.Parameters.AddWithValue("@db", db);
                        recoveryBefore = cmd.ExecuteScalar() as string;
                    }
                }
                using (var connDb = new SqlConnection(BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, db)))
                using (var cmd = connDb.CreateCommand())
                {
                    cmd.CommandText = "SELECT name FROM sys.database_files WHERE type = 1";
                    connDb.Open();
                    var o = cmd.ExecuteScalar();
                    logFileName = o != null ? o.ToString() : null;
                }
                if (string.IsNullOrEmpty(logFileName))
                    return new { success = false, message = "Không tìm thấy file log." };

                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    var wasFull = string.Equals(recoveryBefore, "FULL", StringComparison.OrdinalIgnoreCase);
                    if (wasFull)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET RECOVERY SIMPLE";
                            cmd.CommandTimeout = 120;
                            cmd.ExecuteNonQuery();
                        }
                    }
                    try
                    {
                        using (var connDb = new SqlConnection(BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, db)))
                        {
                            connDb.Open();
                            using (var cmd = connDb.CreateCommand())
                            {
                                cmd.CommandTimeout = 1800; /* 30 phút cho log lớn (vài GB trở lên) */
                                cmd.CommandText = "DBCC SHRINKFILE (N'" + logFileName.Replace("'", "''") + "', " + targetSizeMb + ")";
                                cmd.ExecuteNonQuery();
                            }
                        }
                    }
                    finally
                    {
                        if (wasFull)
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET RECOVERY FULL";
                                cmd.CommandTimeout = 120;
                                try { cmd.ExecuteNonQuery(); } catch { }
                            }
                        }
                    }
                }
                UserActionLogHelper.Log("DatabaseSearch.ShrinkLog", "serverId=" + serverId + ", database=" + db + ", targetMb=" + targetSizeMb);
                return new { success = true, message = "Đã shrink log. Dung lượng log đã giảm (chỉ thu hồi phần trống, không ảnh hưởng data)." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private static ServerInfo GetServerInfo(int serverId)
        {
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT Id, ServerName, Port, Username, Password, BackupPath FROM BaDatabaseServer WHERE IsActive = 1 AND Id = @id";
                cmd.Parameters.AddWithValue("@id", serverId);
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (r.Read())
                        return new ServerInfo
                        {
                            Id = r.GetInt32(0),
                            ServerName = r.IsDBNull(1) ? "" : r.GetString(1),
                            Port = r.IsDBNull(2) ? (int?)null : r.GetInt32(2),
                            Username = r.IsDBNull(3) ? "" : r.GetString(3),
                            Password = r.IsDBNull(4) ? "" : r.GetString(4),
                            BackupPath = r.FieldCount > 5 && !r.IsDBNull(5) ? r.GetString(5) : null
                        };
                }
            }
            return null;
        }

        /// <summary>Đường dẫn backup cho server: ưu tiên BackupPath của server, không có thì dùng Web.config.</summary>
        private static string GetBackupPathForServer(int serverId)
        {
            var s = GetServerInfo(serverId);
            var path = s != null && !string.IsNullOrWhiteSpace(s.BackupPath) ? s.BackupPath.Trim().TrimEnd('\\') : null;
            return path ?? GetDatabaseBackupPath();
        }

        /// <summary>Chuẩn hóa path tương đối: bỏ đoạn cuối trùng (vd. A\B\B → A\B) để tránh lỗi path không tìm thấy.</summary>
        private static string NormalizeBackupRelativePath(string rel)
        {
            if (string.IsNullOrWhiteSpace(rel)) return rel ?? "";
            var parts = rel.Trim().Replace('/', '\\').TrimStart('\\').Split(new[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2 && string.Equals(parts[parts.Length - 1], parts[parts.Length - 2], StringComparison.OrdinalIgnoreCase))
                return string.Join("\\", parts.Take(parts.Length - 1));
            return string.Join("\\", parts);
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

        /// <summary>Lấy tên file log, dung lượng (MB) và recovery model của database.</summary>
        private static LogInfo GetDatabaseLogInfo(ServerInfo s, string db)
        {
            var connStr = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, db);
            using (var conn = new SqlConnection(connStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 10;
                cmd.CommandText = @"SELECT (SELECT recovery_model_desc FROM sys.databases WHERE name = DB_NAME()) AS recovery_model,
  (SELECT name FROM sys.database_files WHERE type = 1) AS log_name,
  (SELECT size * 8 / 1024 FROM sys.database_files WHERE type = 1) AS size_mb";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (r.Read() && !r.IsDBNull(1) && !r.IsDBNull(2))
                    {
                        return new LogInfo
                        {
                            RecoveryModel = r.IsDBNull(0) ? "" : r.GetString(0),
                            FileName = r.GetString(1),
                            SizeMb = r.IsDBNull(2) ? 0 : r.GetInt32(2)
                        };
                    }
                }
            }
            return null;
        }

        // Helper class thay cho tuple (tương thích .NET Framework cũ)
        private class ServerInfo
        {
            public int Id { get; set; }
            public string ServerName { get; set; }
            public int? Port { get; set; }
            public string Username { get; set; }
            public string Password { get; set; }
            public string BackupPath { get; set; }
        }

        private class LogInfo
        {
            public int SizeMb { get; set; }
            public string FileName { get; set; }
            public string RecoveryModel { get; set; }
        }

        public class HRConnInfo
        {
            public string ConnectionString { get; set; }
            public string Server { get; set; }
            public string Database { get; set; }
        }
    }
}
