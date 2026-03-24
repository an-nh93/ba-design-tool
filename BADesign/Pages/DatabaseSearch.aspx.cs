using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using System.Web.Hosting;
using BADesign;
using BADesign.Helpers;
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
        /// <summary>True khi user có quyền xóa database (DatabaseManageServers hoặc DatabaseDelete, hoặc đã restore DB đó).</summary>
        public bool CanDelete { get; private set; }
        /// <summary>True khi user có quyền shrink log (DatabaseManageServers hoặc DatabaseShrinkLog).</summary>
        public bool CanShrinkLog { get; private set; }
        /// <summary>Username đăng nhập (để làm default email reset: UserName@cadena.com.sg).</summary>
        public string CurrentUserName { get; private set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            IsGuest = UiAuthHelper.IsAnonymous;
            CanManageServers = UiAuthHelper.HasFeature("DatabaseManageServers");
            CanBulkReset = UiAuthHelper.HasFeature("DatabaseBulkReset");
            CanUseServers = !IsGuest && UiAuthHelper.HasFeature("DatabaseTools");
            CanBackup = UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseBackup");
            CanRestore = UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseRestore");
            CanDelete = UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseDelete");
            CanShrinkLog = UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseShrinkLog");
            CurrentUserName = (string)(Session["UiUserName"] ?? "");

            ucBaSidebar.ActiveSection = "DatabaseSearch";
            ucBaTopBar.PageTitle = "Database Tools";
        }

        private static bool CanBackupStatic() { return UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseBackup"); }
        private static bool CanRestoreStatic() { return UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseRestore"); }
        private static bool CanDeleteStatic() { return UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseDelete"); }
        private static bool CanShrinkLogStatic() { return UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseShrinkLog"); }

        private static bool EmailMatchesAnyPattern(string email, System.Collections.Generic.List<string> patterns)
        {
            if (string.IsNullOrWhiteSpace(email) || patterns == null) return false;
            var e = email.Trim().ToLowerInvariant();
            foreach (var p in patterns)
            {
                if (string.IsNullOrWhiteSpace(p)) continue;
                var pt = p.Trim().ToLowerInvariant();
                if (pt.StartsWith("*"))
                {
                    var suffix = pt.Substring(1).Trim();
                    if (e.EndsWith(suffix, StringComparison.OrdinalIgnoreCase)) return true;
                }
                else if (string.Equals(e, pt, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        /// <summary>True nếu user được phép shrink log database này (quyền DatabaseShrinkLog/ManageServers hoặc đã restore DB này).</summary>
        private static bool CanShrinkDatabase(int serverId, string databaseName)
        {
            if (UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers"))
                return true;
            if (UiAuthHelper.HasFeature("DatabaseShrinkLog"))
            {
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && accessibleIds.Contains(serverId))
                    return true;
            }
            return CanViewDatabase(serverId, databaseName);
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
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username, BackupPath, RestorePath FROM BaDatabaseServer WHERE IsActive = 1 ORDER BY Id";
                    else if (accessibleIds.Count == 0)
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username, BackupPath, RestorePath FROM BaDatabaseServer WHERE 1=0";
                    else
                    {
                        cmd.CommandText = "SELECT Id, ServerName, Port, Username, BackupPath, RestorePath FROM BaDatabaseServer WHERE IsActive = 1 AND Id IN (" + string.Join(",", accessibleIds) + ") ORDER BY Id";
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
                                backupPath = r.FieldCount > 4 && !r.IsDBNull(4) ? r.GetString(4) : null,
                                restorePath = r.FieldCount > 5 && !r.IsDBNull(5) ? r.GetString(5) : null
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

        /// <summary>True nếu user được phép Connect: SuperAdmin, DatabaseManageServers, DatabaseConnectAny, hoặc là người đã restore database này.</summary>
        private static bool CanViewDatabase(int serverId, string databaseName)
        {
            if (UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseConnectAny"))
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
            return Helpers.ServerAccessHelper.GetAccessibleServerIds(
                UiAuthHelper.CurrentUserId,
                UiAuthHelper.GetCurrentUserRoleId(),
                UiAuthHelper.IsSuperAdmin,
                UiAuthHelper.HasFeature("DatabaseManageServers"));
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
        public static object SaveServer(string serverName, int? port, string username, string password, string backupPath = null, string restorePath = null)
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
INSERT INTO BaDatabaseServer (ServerName, Port, Username, Password, BackupPath, RestorePath, IsActive, CreatedAt)
VALUES (@sn, @port, @u, @p, @backupPath, @restorePath, 1, SYSDATETIME());";
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    cmd.Parameters.AddWithValue("@p", password);
                    cmd.Parameters.AddWithValue("@backupPath", string.IsNullOrWhiteSpace(backupPath) ? (object)DBNull.Value : backupPath.Trim().TrimEnd('\\'));
                    cmd.Parameters.AddWithValue("@restorePath", string.IsNullOrWhiteSpace(restorePath) ? (object)DBNull.Value : restorePath.Trim().TrimEnd('\\'));
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
        public static object UpdateServer(int id, string serverName, int? port, string username, string password, string backupPath = null, string restorePath = null)
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
                    ? @"UPDATE BaDatabaseServer SET ServerName=@sn, Port=@port, Username=@u, Password=@p, BackupPath=@backupPath, RestorePath=@restorePath, UpdatedAt=SYSDATETIME() WHERE Id=@id AND IsActive=1"
                    : @"UPDATE BaDatabaseServer SET ServerName=@sn, Port=@port, Username=@u, BackupPath=@backupPath, RestorePath=@restorePath, UpdatedAt=SYSDATETIME() WHERE Id=@id AND IsActive=1";
                    if (changePassword)
                        cmd.Parameters.AddWithValue("@p", password);
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@sn", serverName.Trim());
                    cmd.Parameters.AddWithValue("@port", (object)port ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@u", username.Trim());
                    cmd.Parameters.AddWithValue("@backupPath", string.IsNullOrWhiteSpace(backupPath) ? (object)DBNull.Value : backupPath.Trim().TrimEnd('\\'));
                    cmd.Parameters.AddWithValue("@restorePath", string.IsNullOrWhiteSpace(restorePath) ? (object)DBNull.Value : restorePath.Trim().TrimEnd('\\'));
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
                            var bag = new ConcurrentBag<Dictionary<string, object>>();
                            Parallel.ForEach(candidateDbs, new ParallelOptions { MaxDegreeOfParallelism = 12 }, db =>
                            {
                                if (!DatabaseHasStProjectInfoStandalone(s, db)) return;
                                bag.Add(new Dictionary<string, object>
                                {
                                    { "serverId", s.Id },
                                    { "server", s.ServerName },
                                    { "database", db },
                                    { "username", s.Username }
                                });
                            });
                            var dbCount = bag.Count;
                            foreach (var row in bag.OrderBy(x => x["database"]))
                                list.Add(row);
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
                    var multiBag = new ConcurrentBag<HRConnMultiDbEntry>();
                    Parallel.ForEach(candidateDbs, new ParallelOptions { MaxDegreeOfParallelism = 12 }, db =>
                    {
                        if (!DatabaseHasStProjectInfoStandalone(s, db)) return;
                        var cs = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, db);
                        multiBag.Add(new HRConnMultiDbEntry { DatabaseName = db, ConnectionString = cs });
                    });
                    foreach (var entry in multiBag.OrderBy(x => x.DatabaseName))
                        databases.Add(entry);
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
                    return new { success = false, message = "Chỉ Admin, người có quyền Connect (mọi DB), hoặc người đã restore database này mới được kết nối/xem." };

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
            string backupPath = null;
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
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                backupPath = GetBackupPathForServer(serverId);
                if (string.IsNullOrEmpty(backupPath))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup: Sửa server, nhập \"Đường dẫn backup\", hoặc cấu hình DatabaseBackupPath trong Web.config." };
                var dbSafe = databaseName.Trim().Replace("]", "]]");
                var baseName = new string(databaseName.Trim().Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '.').ToArray());
                if (string.IsNullOrEmpty(baseName)) baseName = "db";
                var stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var fileName = baseName + "_" + stamp + ".bak";
                var fullPath = backupPath + "\\" + fileName;
                int suffix = 0;
                while (System.IO.File.Exists(fullPath))
                {
                    suffix++;
                    fileName = baseName + "_" + stamp + "_" + suffix + ".bak";
                    fullPath = backupPath + "\\" + fileName;
                }

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
                UserActionLogHelper.Log("DatabaseSearch.Backup", "database=" + databaseName + " -> file=" + fileName);
                return new { success = true, message = "Đã backup.", fileName = fileName, path = fullPath };
            }
            catch (Exception ex)
            {
                var msg = ex.Message;
                if (msg != null && (msg.IndexOf("Access is denied", StringComparison.OrdinalIgnoreCase) >= 0 || msg.IndexOf("error 5", StringComparison.OrdinalIgnoreCase) >= 0))
                {
                    msg += " [Đường dẫn đang dùng: " + (backupPath ?? "") + "] Gợi ý: Đổi Sửa server → Đường dẫn backup sang path mà SQL Server có quyền ghi (vd. cùng Đường dẫn restore: \\\\Hrs05\\sqldata2\\...\\Backup).";
                }
                return new { success = false, message = msg };
            }
        }

        /// <summary>Đưa backup vào job chạy nền, trả về jobId. Tham số: serverId, databaseName, withShrinkLog, expireDays, expireDate, copyOnly, compression, checksum, verifyBackup, continueOnError.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartBackup(string requestJson)
        {
            int serverId = 0;
            string databaseName = null;
            bool withShrinkLog = false;
            int expireDays = 0;
            string expireDate = null;
            bool copyOnly = false;
            bool compression = true;
            bool checksum = false;
            bool verifyBackup = false;
            bool continueOnError = false;
            int stripeCount = 1;
            try
            {
                if (!string.IsNullOrWhiteSpace(requestJson))
                {
                    var dict = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, Newtonsoft.Json.Linq.JToken>>(requestJson);
                    if (dict != null)
                    {
                        if (dict.ContainsKey("serverId") && dict["serverId"] != null) serverId = dict["serverId"].ToObject<int>();
                        if (dict.ContainsKey("databaseName") && dict["databaseName"] != null) databaseName = dict["databaseName"].ToObject<string>();
                        if (dict.ContainsKey("withShrinkLog") && dict["withShrinkLog"] != null) withShrinkLog = dict["withShrinkLog"].ToObject<bool>();
                        if (dict.ContainsKey("expireDays") && dict["expireDays"] != null) expireDays = Math.Max(0, dict["expireDays"].ToObject<int>());
                        if (dict.ContainsKey("expireDate") && dict["expireDate"] != null) expireDate = dict["expireDate"].ToObject<string>();
                        if (dict.ContainsKey("copyOnly") && dict["copyOnly"] != null) copyOnly = dict["copyOnly"].ToObject<bool>();
                        if (dict.ContainsKey("compression") && dict["compression"] != null) compression = dict["compression"].ToObject<bool>();
                        if (dict.ContainsKey("checksum") && dict["checksum"] != null) checksum = dict["checksum"].ToObject<bool>();
                        if (dict.ContainsKey("verifyBackup") && dict["verifyBackup"] != null) verifyBackup = dict["verifyBackup"].ToObject<bool>();
                        if (dict.ContainsKey("continueOnError") && dict["continueOnError"] != null) continueOnError = dict["continueOnError"].ToObject<bool>();
                        if (dict.ContainsKey("stripeCount") && dict["stripeCount"] != null) { var n = dict["stripeCount"].ToObject<int>(); stripeCount = n < 1 ? 1 : (n > 64 ? 64 : n); }
                    }
                }
            }
            catch (Exception parseEx)
            {
                return new { success = false, message = "Lỗi tham số: " + parseEx.Message, jobId = 0 };
            }
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobId = 0 };
                if (!CanBackupStatic())
                    return new { success = false, message = "Không có quyền backup database.", jobId = 0 };
                var accessibleIds = GetAccessibleServerIds();
                if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                    return new { success = false, message = "Không có quyền truy cập server này.", jobId = 0 };
                if (string.IsNullOrWhiteSpace(databaseName))
                    return new { success = false, message = "Chưa chọn database.", jobId = 0 };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server.", jobId = 0 };
                var backupPath = GetBackupPathForServer(serverId);
                if (string.IsNullOrEmpty(backupPath))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup.", jobId = 0 };

                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var startedByName = "";
                try
                {
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ISNULL(NULLIF(RTRIM(FullName),N''), UserName) FROM UiUser WHERE UserId = @uid";
                        cmd.Parameters.AddWithValue("@uid", userId);
                        appConn.Open();
                        var o = cmd.ExecuteScalar();
                        startedByName = (o != null && !(o is DBNull) && !string.IsNullOrWhiteSpace(o.ToString())) ? o.ToString().Trim() : ("User " + userId);
                    }
                }
                catch { startedByName = "User " + userId; }

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                var backupConn = new SqlConnection(masterConn);
                backupConn.Open();
                int sessionId;
                using (var cmd = backupConn.CreateCommand())
                {
                    cmd.CommandText = "SELECT @@SPID";
                    var spidVal = cmd.ExecuteScalar();
                    sessionId = spidVal == null || spidVal is DBNull ? 0 : Convert.ToInt32(spidVal);
                }
                BackupSessions.TryAdd(sessionId, backupConn);

                int jobId = 0;
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerId, ServerName, DatabaseName, StartedByUserId, StartedByUserName, StartTime, SessionId, Status, PercentComplete)
VALUES (N'Backup', @sid, @sname, @db, @uid, @uname, SYSDATETIME(), @sess, N'Running', 0); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                    cmd.Parameters.AddWithValue("@sid", serverId);
                    cmd.Parameters.AddWithValue("@sname", (s.ServerName ?? "") + (s.Port.HasValue ? "," + s.Port.Value : ""));
                    cmd.Parameters.AddWithValue("@db", databaseName.Trim());
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@uname", startedByName);
                    cmd.Parameters.AddWithValue("@sess", sessionId);
                    appConn.Open();
                    jobId = (int)cmd.ExecuteScalar();
                }

                var jobIdCopy = jobId;
                var sessionIdCopy = sessionId;
                var serverIdCopy = serverId;
                var databaseNameCopy = databaseName.Trim();
                var withShrinkLogCopy = withShrinkLog;
                var expireDaysCopy = Math.Max(0, expireDays);
                var expireDateCopy = string.IsNullOrWhiteSpace(expireDate) ? null : expireDate.Trim();
                var copyOnlyCopy = copyOnly;
                var compressionCopy = compression;
                var checksumCopy = checksum;
                var verifyBackupCopy = verifyBackup;
                var continueOnErrorCopy = continueOnError;
                var stripeCountCopy = stripeCount < 1 ? 1 : (stripeCount > 64 ? 64 : stripeCount);
                System.Threading.Tasks.Task.Run(() =>
                {
                    SqlConnection conn = null;
                    if (!BackupSessions.TryGetValue(sessionIdCopy, out conn))
                        conn = null;
                    string fileName = null;
                    string status = "Failed";
                    string message = null;
                    try
                    {
                        if (conn == null)
                        {
                            message = "Mất kết nối backup.";
                            return;
                        }
                        var path = GetBackupPathForServer(serverIdCopy);
                        if (string.IsNullOrEmpty(path))
                        {
                            message = "Chưa cấu hình đường dẫn backup.";
                            return;
                        }
                        var dbSafe = databaseNameCopy.Replace("]", "]]");
                        var safeName = new string(databaseNameCopy.Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '.').ToArray());
                        if (string.IsNullOrEmpty(safeName)) safeName = "db";
                        var stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                        var pathBase = path.TrimEnd('\\') + "\\";
                        int suffix = 0;
                        var fullPaths = new List<string>();
                        for (; ; )
                        {
                            fullPaths.Clear();
                            for (int i = 1; i <= stripeCountCopy; i++)
                            {
                                var fname = stripeCountCopy == 1
                                    ? (suffix == 0 ? safeName + "_" + stamp + ".bak" : safeName + "_" + stamp + "_" + suffix + ".bak")
                                    : (suffix == 0 ? safeName + "_" + stamp + "_" + i + ".bak" : safeName + "_" + stamp + "_" + suffix + "_" + i + ".bak");
                                fullPaths.Add(pathBase + fname);
                            }
                            if (fullPaths.Any(f => System.IO.File.Exists(f)))
                                suffix++;
                            else
                                break;
                        }
                        fileName = System.IO.Path.GetFileName(fullPaths[0]);
                        var withClauses = new List<string> { "INIT" };
                        withClauses.Add(compressionCopy ? "COMPRESSION" : "NO_COMPRESSION");
                        if (copyOnlyCopy) withClauses.Add("COPY_ONLY");
                        if (checksumCopy) withClauses.Add("CHECKSUM");
                        if (continueOnErrorCopy) withClauses.Add("CONTINUE_AFTER_ERROR");
                        if (!string.IsNullOrEmpty(expireDateCopy))
                            withClauses.Add("EXPIREDATE = N'" + expireDateCopy.Replace("'", "''") + "'");
                        else if (expireDaysCopy > 0)
                            withClauses.Add("RETAINDAYS = " + expireDaysCopy.ToString(System.Globalization.CultureInfo.InvariantCulture));
                        var withClause = string.Join(", ", withClauses);
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandTimeout = 3600;
                            if (stripeCountCopy == 1)
                            {
                                cmd.CommandText = "BACKUP DATABASE [" + dbSafe + "] TO DISK = @path WITH " + withClause;
                                cmd.Parameters.AddWithValue("@path", fullPaths[0]);
                            }
                            else
                            {
                                var diskParams = string.Join(", ", fullPaths.Select((_, i) => "DISK = @path" + (i + 1)));
                                cmd.CommandText = "BACKUP DATABASE [" + dbSafe + "] TO " + diskParams + " WITH " + withClause;
                                for (int i = 0; i < fullPaths.Count; i++)
                                    cmd.Parameters.AddWithValue("@path" + (i + 1), fullPaths[i]);
                            }
                            cmd.ExecuteNonQuery();
                        }
                        UserActionLogHelper.Log("DatabaseSearch.BackupJob", "database=" + databaseNameCopy + " -> file(s)=" + string.Join(",", fullPaths.Select(System.IO.Path.GetFileName)));
                        status = "Completed";
                        message = fullPaths.Count == 1 ? "Đã backup. File: " + fileName : ("Đã backup " + fullPaths.Count + " file: " + string.Join(", ", fullPaths.Select(System.IO.Path.GetFileName)));
                        if (verifyBackupCopy)
                        {
                            try
                            {
                                using (var cmdVerify = conn.CreateCommand())
                                {
                                    cmdVerify.CommandTimeout = 600;
                                    if (fullPaths.Count == 1)
                                    {
                                        cmdVerify.CommandText = "RESTORE VERIFYONLY FROM DISK = @path";
                                        cmdVerify.Parameters.AddWithValue("@path", fullPaths[0]);
                                    }
                                    else
                                    {
                                        var diskParams = string.Join(", ", fullPaths.Select((_, i) => "DISK = @path" + (i + 1)));
                                        cmdVerify.CommandText = "RESTORE VERIFYONLY FROM " + diskParams;
                                        for (int i = 0; i < fullPaths.Count; i++)
                                            cmdVerify.Parameters.AddWithValue("@path" + (i + 1), fullPaths[i]);
                                    }
                                    cmdVerify.ExecuteNonQuery();
                                }
                            }
                            catch (Exception exVerify)
                            {
                                message = "Đã backup nhưng verify lỗi: " + exVerify.Message;
                            }
                        }
                        if (withShrinkLogCopy)
                        {
                            try
                            {
                                RunShrinkLogForDatabase(serverIdCopy, databaseNameCopy, 1);
                                message += " Đã shrink log.";
                            }
                            catch (Exception exShrink)
                            {
                                message += " Shrink log: " + exShrink.Message;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        message = ex.Message ?? "Lỗi backup.";
                    }
                    finally
                    {
                        if (conn != null)
                        {
                            SqlConnection removed;
                            BackupSessions.TryRemove(sessionIdCopy, out removed);
                            try { conn.Dispose(); } catch { }
                        }
                    }
                    try
                    {
                        using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = appConn.CreateCommand())
                        {
                            cmd.CommandText = "UPDATE BaJob SET Status = @st, PercentComplete = 100, Message = @msg, CompletedAt = SYSDATETIME(), FileName = @fname WHERE Id = @id AND JobType = N'Backup' AND Status = N'Running'";
                            cmd.Parameters.AddWithValue("@st", status);
                            cmd.Parameters.AddWithValue("@msg", (object)message ?? DBNull.Value);
                            cmd.Parameters.AddWithValue("@fname", (object)fileName ?? DBNull.Value);
                            cmd.Parameters.AddWithValue("@id", jobIdCopy);
                            appConn.Open();
                            cmd.ExecuteNonQuery();
                        }
                        Helpers.BaJobWorkerNotify.Notify(jobIdCopy);
                        PushBackupJobsUpdated(serverIdCopy);
                    }
                    catch { }
                });

                lock (_restoreProgressUpdateTimerLock)
                {
                    if (_restoreProgressUpdateTimer == null)
                        _restoreProgressUpdateTimer = new System.Threading.Timer(UpdateAllRestoreProgressCallback, null, 2000, 2000);
                }
                return new { success = true, message = "Đã đưa backup vào hàng đợi.", jobId = jobId };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        /// <summary>Danh sách job backup (đang chạy + mới xong). Hiển thị cùng chuông với restore.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetBackupJobs()
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
                        var sqlWithDismiss = @"SELECT J.Id, J.ServerId, J.ServerName, J.DatabaseName, J.StartedByUserId,
  (CASE WHEN J.StartedByUserName IS NULL OR LTRIM(RTRIM(J.StartedByUserName)) = N'' OR J.StartedByUserName = N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))
    THEN ISNULL(U.UserName, N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))) ELSE J.StartedByUserName END) AS StartedByUserName,
  J.StartTime, J.Status, J.PercentComplete, J.Message, J.CompletedAt, J.FileName
FROM BaJob J LEFT JOIN UiUser U ON U.UserId = J.StartedByUserId
WHERE J.JobType = N'Backup' AND (J.DismissedAt IS NULL) AND (J.Status = N'Running' OR (J.Status IN (N'Completed', N'Failed') AND J.CompletedAt >= DATEADD(day, -1, SYSDATETIME())))
ORDER BY CASE WHEN J.Status = N'Running' THEN 0 ELSE 1 END, J.StartTime DESC";
                        var sqlWithoutDismiss = @"SELECT J.Id, J.ServerId, J.ServerName, J.DatabaseName, J.StartedByUserId,
  (CASE WHEN J.StartedByUserName IS NULL OR LTRIM(RTRIM(J.StartedByUserName)) = N'' OR J.StartedByUserName = N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))
    THEN ISNULL(U.UserName, N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))) ELSE J.StartedByUserName END) AS StartedByUserName,
  J.StartTime, J.Status, J.PercentComplete, J.Message, J.CompletedAt, J.FileName
FROM BaJob J LEFT JOIN UiUser U ON U.UserId = J.StartedByUserId
WHERE J.JobType = N'Backup' AND (J.Status = N'Running' OR (J.Status IN (N'Completed', N'Failed') AND J.CompletedAt >= DATEADD(day, -1, SYSDATETIME())))
ORDER BY CASE WHEN J.Status = N'Running' THEN 0 ELSE 1 END, J.StartTime DESC";
                        try
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = sqlWithDismiss;
                                using (var r = cmd.ExecuteReader())
                                {
                                    while (r.Read())
                                        jobs.Add(ReadBackupJobRow(r));
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
                                        jobs.Add(ReadBackupJobRow(r));
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

        private static object ReadBackupJobRow(SqlDataReader r)
        {
            var fileName = r.FieldCount > 11 && !r.IsDBNull(11) ? r.GetString(11) : "";
            return new
            {
                id = r.GetInt32(0),
                serverId = r.GetInt32(1),
                serverName = r.IsDBNull(2) ? "" : r.GetString(2),
                databaseName = r.IsDBNull(3) ? "" : r.GetString(3),
                startedByUserId = r.GetInt32(4),
                startedByUserName = r.IsDBNull(5) ? "" : r.GetString(5),
                startTime = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6),
                sessionId = (int?)null,
                status = r.IsDBNull(8) ? "" : r.GetString(8),
                percentComplete = r.IsDBNull(9) ? 0 : r.GetInt32(9),
                message = r.IsDBNull(9) ? "" : r.GetString(9),
                completedAt = r.FieldCount > 10 && !r.IsDBNull(10) ? (DateTime?)r.GetDateTime(10) : (DateTime?)null,
                backupFileName = fileName
            };
        }

        /// <summary>Đánh dấu job backup đã đọc. Giữ để tương thích; nên dùng DismissJob(jobId).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DismissBackupJob(int jobId)
        {
            return DismissJob(jobId);
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
                var restorePath = GetRestorePathForServer(serverId);
                if (string.IsNullOrEmpty(restorePath)) return new { success = false, message = "Chưa cấu hình đường dẫn backup/restore.", sets = new List<object>() };
                var backupRoot = restorePath.Trim().TrimEnd('\\');
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

        /// <summary>Đọc cấu hình SFTP từ BaAppSetting (SftpHost, SftpPort, SftpUser, SftpPassword).</summary>
        private static void GetSftpConfigFromAppSettings(string appConnStr, out string host, out string port, out string user, out string password)
        {
            host = port = user = password = "";
            if (string.IsNullOrEmpty(appConnStr)) return;
            try
            {
                using (var conn = new SqlConnection(appConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT [Key], [Value] FROM BaAppSetting WHERE [Key] IN (N'SftpHost', N'SftpPort', N'SftpUser', N'SftpPassword')";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var k = r.GetString(0);
                            var v = r.IsDBNull(1) ? null : r.GetString(1);
                            if (k == "SftpHost") host = v ?? "";
                            else if (k == "SftpPort") port = v ?? "";
                            else if (k == "SftpUser") user = v ?? "";
                            else if (k == "SftpPassword") password = v ?? "";
                        }
                    }
                }
            }
            catch { }
        }

        private static void UpdateJobPercentComplete(int jobId, int percent)
        {
            try
            {
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaJob SET PercentComplete = @pct WHERE Id = @id AND JobType = N'Restore'";
                    cmd.Parameters.AddWithValue("@pct", percent);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    appConn.Open();
                    cmd.ExecuteNonQuery();
                }
                Helpers.BaJobWorkerNotify.Notify(jobId);
            }
            catch { }
        }

        private static readonly object _resetProgressLogLock = new object();

        /// <summary>Ghi log debug tiến độ Reset Information ra file App_Data/BaRestoreProgress.log để debug % treo 0 rồi nhảy 100%. Dùng HostingEnvironment để chạy được từ background thread (restore task). Đã comment để tắt log; bỏ comment khi cần debug.</summary>
        private static void LogResetProgress(int jobId, string phase, int percent)
        {
            // DEBUG: bỏ comment block dưới để bật ghi file log
            /*
            try
            {
                var path = HostingEnvironment.MapPath("~/App_Data/BaRestoreProgress.log");
                if (string.IsNullOrEmpty(path)) path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data", "BaRestoreProgress.log");
                var dir = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
                var line = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] JobId={1}, Phase={2}, Percent={3}\r\n", DateTime.Now, jobId, phase ?? "", percent);
                lock (_resetProgressLogLock)
                {
                    File.AppendAllText(path, line);
                }
            }
            catch { }
            */
        }

        /// <summary>True = Restore / Multi-DB Reset enqueue Pending, Worker chạy; False = chạy trong process (Task.Run).</summary>
        private static bool UseBackgroundWorker()
        {
            try
            {
                var v = ConfigurationManager.AppSettings["UseBackgroundWorker"];
                return string.Equals(v, "true", StringComparison.OrdinalIgnoreCase);
            }
            catch { return false; }
        }

        private static void TryLogBaJobPhaseIssue(string message)
        {
            try
            {
                var dir = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                if (string.IsNullOrEmpty(dir)) return;
                System.IO.Directory.CreateDirectory(dir);
                var path = System.IO.Path.Combine(dir, "BaJobPhaseUpdate.log");
                System.IO.File.AppendAllText(path, System.DateTime.UtcNow.ToString("o") + " " + (message ?? "") + "\r\n");
            }
            catch { }
        }

        private static void UpdateJobPhaseAndPercent(int jobId, string phaseMessage, int percent)
        {
            try
            {
                // DEBUG: bỏ comment dòng dưới để bật log file Reset Information %
                // if (string.Equals(phaseMessage, "Reset Information", StringComparison.OrdinalIgnoreCase)) LogResetProgress(jobId, phaseMessage, percent);
                int rows = 0;
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    // phaseMessage == null: chỉ cập nhật % — KHÔNG ghi Message = NULL (client coi msg rỗng = "Restore" và ép 0% Reset → chớp 0↔100 với poll/dm_exec).
                    if (phaseMessage != null)
                    {
                        cmd.CommandText = "UPDATE BaJob SET Message = @msg, PercentComplete = @pct WHERE Id = @id AND JobType = N'Restore' AND Status = N'Running'";
                        cmd.Parameters.AddWithValue("@msg", phaseMessage);
                    }
                    else
                    {
                        cmd.CommandText = "UPDATE BaJob SET PercentComplete = @pct WHERE Id = @id AND JobType = N'Restore' AND Status = N'Running'";
                    }
                    cmd.Parameters.AddWithValue("@pct", percent);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    appConn.Open();
                    rows = cmd.ExecuteNonQuery();
                }
                if (jobId > 0 && rows == 0)
                    TryLogBaJobPhaseIssue("UPDATE 0 rows (job không Running / Cancelled / sai Id?) jobId=" + jobId + " phase=" + (phaseMessage ?? "(percent-only)") + " pct=" + percent);
                Helpers.BaJobWorkerNotify.Notify(jobId);
            }
            catch (Exception ex)
            {
                TryLogBaJobPhaseIssue("EXCEPTION jobId=" + jobId + " phase=" + (phaseMessage ?? "") + " — " + ex.Message);
            }
        }

        /// <summary>Cập nhật Setting_FolderConfigurations trong database đích (Host, Port, UserNameSourceFolder, PasswordSourceFolder) từ cấu hình SFTP App Settings. Chạy khi có bất kỳ giá trị nào.</summary>
        private static void UpdateSettingFolderConfigurationsIfExists(string targetDbConnStr, string host, string port, string userName, string password)
        {
            if (string.IsNullOrEmpty(targetDbConnStr)) return;
            if (string.IsNullOrWhiteSpace(host) && string.IsNullOrWhiteSpace(port) && string.IsNullOrWhiteSpace(userName) && string.IsNullOrWhiteSpace(password))
                return;
            try
            {
                using (var conn = new SqlConnection(targetDbConnStr))
                {
                    conn.Open();
                    string schema = null;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT OBJECT_SCHEMA_NAME(t.object_id) FROM sys.tables t WHERE t.name = N'Setting_FolderConfigurations'";
                        var o = cmd.ExecuteScalar();
                        if (o == null || o == DBNull.Value || string.IsNullOrWhiteSpace(o.ToString())) return;
                        schema = o.ToString().Trim();
                    }
                    var quotedTable = "[" + schema.Replace("]", "]]") + "].[Setting_FolderConfigurations]";
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 30;
                        cmd.CommandText = "UPDATE " + quotedTable + " SET Host = @h, Port = @p, UserNameSourceFolder = @u, PasswordSourceFolder = @pw WHERE (1=1)";
                        cmd.Parameters.AddWithValue("@h", (object)host ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@p", (object)port ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@u", (object)userName ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@pw", (object)password ?? DBNull.Value);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            catch { /* bảng có thể thiếu cột hoặc quyền */ }
        }

        /// <summary>Đọc cấu hình Email Server từ BaAppSetting (EmailServer_*). Dùng cho restore và HR Helper Cadena button.</summary>
        private static void GetEmailServerConfigFromAppSettings(string appConnStr, out string outgoingServer, out string port, out string accountName, out string username, out string emailAddress, out string password, out bool enableSSL, out string sslPort)
        {
            outgoingServer = port = accountName = username = emailAddress = password = sslPort = "";
            enableSSL = false;
            if (string.IsNullOrEmpty(appConnStr)) return;
            try
            {
                using (var conn = new SqlConnection(appConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT [Key], [Value] FROM BaAppSetting WHERE [Key] IN (
                        N'EmailServer_OutgoingServer', N'EmailServer_Port', N'EmailServer_AccountName', N'EmailServer_Username',
                        N'EmailServer_EmailAddress', N'EmailServer_Password', N'EmailServer_EnableSSL', N'EmailServer_SSLPort')";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var k = r.GetString(0);
                            var v = r.IsDBNull(1) ? null : r.GetString(1);
                            if (k == "EmailServer_OutgoingServer") outgoingServer = v ?? "";
                            else if (k == "EmailServer_Port") port = v ?? "";
                            else if (k == "EmailServer_AccountName") accountName = v ?? "";
                            else if (k == "EmailServer_Username") username = v ?? "";
                            else if (k == "EmailServer_EmailAddress") emailAddress = v ?? "";
                            else if (k == "EmailServer_Password") password = v ?? "";
                            else if (k == "EmailServer_EnableSSL") enableSSL = (v == "1" || string.Equals(v, "true", StringComparison.OrdinalIgnoreCase));
                            else if (k == "EmailServer_SSLPort") sslPort = v ?? "";
                        }
                    }
                }
            }
            catch { }
        }

        /// <summary>Cập nhật Setting_EmailServers trong database đích từ giá trị đã đọc (cùng cột như HR Helper: OutgoingMailServer, OutgoingMailServerPort, AccountID, SMTPDisplayName, EmailAddress, PasswordPOP3, IsEnableSSL, SSLPort).</summary>
        private static void UpdateSettingEmailServersIfExists(string targetDbConnStr, string outgoingServer, string port, string accountName, string username, string emailAddress, string password, bool enableSSL, string sslPort)
        {
            if (string.IsNullOrEmpty(targetDbConnStr)) return;
            if (string.IsNullOrWhiteSpace(outgoingServer) && string.IsNullOrWhiteSpace(username) && string.IsNullOrWhiteSpace(emailAddress))
                return;
            try
            {
                int serverPort = 25;
                int.TryParse(port ?? "", out serverPort);
                int? sslPortInt = null;
                int tmpSsl;
                if (int.TryParse(sslPort ?? "", out tmpSsl) && tmpSsl > 0) sslPortInt = tmpSsl;
                var encryptedPassword = !string.IsNullOrWhiteSpace(password) ? DataSecurityWrapper.EncryptData(password, null) : null;

                using (var conn = new SqlConnection(targetDbConnStr))
                {
                    conn.Open();
                    string schema = null;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT OBJECT_SCHEMA_NAME(t.object_id) FROM sys.tables t WHERE t.name = N'Setting_EmailServers'";
                        var o = cmd.ExecuteScalar();
                        if (o == null || o == DBNull.Value || string.IsNullOrWhiteSpace(o.ToString())) return;
                        schema = o.ToString().Trim();
                    }
                    var quotedTable = "[" + schema.Replace("]", "]]") + "].[Setting_EmailServers]";
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 30;
                        cmd.CommandText = "UPDATE " + quotedTable + " SET OutgoingMailServer = @out, OutgoingMailServerPort = @port, AccountID = @acc, SMTPDisplayName = @disp, EmailAddress = @email, IsEnableSSL = @ssl, SSLPort = @sslPort" + (encryptedPassword != null ? ", PasswordPOP3 = @pw" : "") + " WHERE (1=1)";
                        cmd.Parameters.AddWithValue("@out", (object)outgoingServer ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@port", serverPort);
                        cmd.Parameters.AddWithValue("@acc", (object)username ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@disp", (object)accountName ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@email", (object)emailAddress ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@ssl", enableSSL ? 1 : 0);
                        cmd.Parameters.AddWithValue("@sslPort", sslPortInt.HasValue ? (object)sslPortInt.Value : DBNull.Value);
                        if (encryptedPassword != null) cmd.Parameters.AddWithValue("@pw", encryptedPassword);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            catch { /* bảng có thể thiếu cột hoặc quyền */ }
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, SqlConnection> BackupSessions = new System.Collections.Concurrent.ConcurrentDictionary<int, SqlConnection>();
        private static System.Threading.Timer _restoreProgressUpdateTimer;
        private static readonly object _restoreProgressUpdateTimerLock = new object();

        /// <summary>Timer callback: cập nhật PercentComplete cho Restore và Backup đang chạy từ sys.dm_exec_requests.</summary>
        private static void UpdateAllRestoreProgressCallback(object state)
        {
            try
            {
                string connStr = UiAuthHelper.ConnStr;
                if (string.IsNullOrEmpty(connStr)) return;
                var jobs = new List<Tuple<int, int, int, string, string>>();
                using (var conn = new SqlConnection(connStr))
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT Id, ServerId, SessionId, JobType, ISNULL(Message, N'') FROM BaJob WHERE JobType IN (N'Restore', N'Backup') AND Status = N'Running' AND SessionId IS NOT NULL";
                        conn.Open();
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                                jobs.Add(Tuple.Create(r.GetInt32(0), r.GetInt32(1), r.GetInt32(2), r.IsDBNull(3) ? "" : r.GetString(3), r.IsDBNull(4) ? "" : r.GetString(4)));
                        }
                    }
                }
                bool anyRestore = false, anyBackup = false;
                var restoreServerIds = new List<int>();
                var backupServerIds = new List<int>();
                foreach (var j in jobs)
                {
                    try
                    {
                        var jobType = j.Item4;
                        var message = (j.Item5 ?? "").Trim();
                        var msgTrim = (message ?? "").Trim();
                        // Restore: chỉ sync % từ dm_exec khi đang phase RESTORE thật (SPID chạy RESTORE). PostRestore / Reset Information / … — không ghi đè BaJob
                        if (string.Equals(jobType, "Restore", StringComparison.OrdinalIgnoreCase))
                        {
                            if (string.Equals(msgTrim, "Reset Information", StringComparison.OrdinalIgnoreCase)) continue;
                            if (string.Equals(msgTrim, "Pending", StringComparison.OrdinalIgnoreCase)) continue;
                            if (!string.Equals(msgTrim, "Restore", StringComparison.OrdinalIgnoreCase)) continue;
                        }
                        var s = GetServerInfo(j.Item2);
                        if (s == null) continue;
                        var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                        using (var sqlConn = new SqlConnection(masterConn))
                        {
                            sqlConn.Open();
                            using (var cmd = sqlConn.CreateCommand())
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
                                        // Restore: chỉ tăng % từ dm_exec — tránh RESTORE xong session còn mở báo 0% làm nhấp nháy 100% → 0%.
                                        if (string.Equals(jobType, "Restore", StringComparison.OrdinalIgnoreCase))
                                            upd.CommandText = "UPDATE BaJob SET PercentComplete = CASE WHEN @pct > ISNULL(PercentComplete, 0) THEN @pct ELSE ISNULL(PercentComplete, 0) END WHERE Id = @id AND JobType = N'Restore'";
                                        else
                                            upd.CommandText = "UPDATE BaJob SET PercentComplete = @pct WHERE Id = @id";
                                        upd.Parameters.AddWithValue("@pct", pct);
                                        upd.Parameters.AddWithValue("@id", j.Item1);
                                        appConn.Open();
                                        upd.ExecuteNonQuery();
                                    }
                                    if (string.Equals(jobType, "Restore", StringComparison.OrdinalIgnoreCase)) { anyRestore = true; restoreServerIds.Add(j.Item2); }
                                    else if (string.Equals(jobType, "Backup", StringComparison.OrdinalIgnoreCase)) { anyBackup = true; backupServerIds.Add(j.Item2); }
                                }
                            }
                        }
                    }
                    catch { /* bỏ qua lỗi từng job */ }
                }
                if (anyRestore) PushRestoreJobsUpdated(restoreServerIds.Distinct().ToList());
                if (anyBackup) PushBackupJobsUpdated(backupServerIds.Distinct().ToList());
            }
            catch { /* tránh làm sập app pool */ }
        }

        /// <summary>Push SignalR: chỉ user có quyền server đó mới nhận (group server_*).</summary>
        private static void PushRestoreJobsUpdated(int serverId)
        {
            Helpers.BaJobHubHelper.PushJobsUpdated("Restore", serverId, null);
        }

        /// <summary>Push SignalR: nhiều server (timer progress).</summary>
        private static void PushRestoreJobsUpdated(System.Collections.Generic.IList<int> serverIds)
        {
            if (serverIds == null || serverIds.Count == 0) return;
            foreach (var sid in serverIds)
                Helpers.BaJobHubHelper.PushJobsUpdated("Restore", sid, null);
        }

        /// <summary>Push SignalR: chỉ user có quyền server đó mới nhận.</summary>
        private static void PushBackupJobsUpdated(int serverId)
        {
            Helpers.BaJobHubHelper.PushJobsUpdated("Backup", serverId, null);
        }

        /// <summary>Push SignalR: nhiều server (timer).</summary>
        private static void PushBackupJobsUpdated(System.Collections.Generic.IList<int> serverIds)
        {
            if (serverIds == null || serverIds.Count == 0) return;
            foreach (var sid in serverIds)
                Helpers.BaJobHubHelper.PushJobsUpdated("Backup", sid, null);
        }

        /// <summary>Bắt đầu restore chạy nền. backupFileNamesJson: optional JSON array of file names (vd. ["f1.bak","f2.bak"]) cho backup chia nhiều file; nếu có thì bỏ qua backupFileName đơn. withAutoReset: sau restore gọi reset User/Employee/Company (email/phone).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartRestore(int serverId, string databaseName, string backupFileName, string positionsJson, string recoveryState, bool withReplace, bool withShrinkLog = false, bool withAutoReset = false, string resetEmail = null, string resetPassword = null, string resetPhone = null, string backupFileNamesJson = null)
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
                var backupFileList = new List<string>();
                if (!string.IsNullOrWhiteSpace(backupFileNamesJson))
                {
                    try
                    {
                        var arr = Newtonsoft.Json.JsonConvert.DeserializeObject<string[]>(backupFileNamesJson);
                        if (arr != null) foreach (var f in arr) { var t = (f ?? "").Trim(); if (!string.IsNullOrEmpty(t)) backupFileList.Add(t); }
                    }
                    catch { }
                }
                if (backupFileList.Count == 0 && !string.IsNullOrWhiteSpace(backupFileName))
                    backupFileList.Add(backupFileName.Trim());
                if (string.IsNullOrWhiteSpace(databaseName) || backupFileList.Count == 0)
                    return new { success = false, message = "Nhập tên database đích và chọn ít nhất một file backup (có thể chọn nhiều file cho backup đã chia).", sessionId = 0, jobId = 0 };
                databaseName = databaseName.Trim();
                backupFileName = backupFileList[0];
                // Defaults cho auto-reset
                var emailForReset = (resetEmail ?? "").Trim();
                var passwordForReset = (resetPassword ?? "").Trim();
                var phoneForReset = (resetPhone ?? "").Trim();
                if (withAutoReset)
                {
                    if (string.IsNullOrWhiteSpace(emailForReset))
                        return new { success = false, message = "Vui lòng nhập Email khi chọn tích hợp reset.", sessionId = 0, jobId = 0 };
                    var emailIgnorePatterns = HRHelper.LoadEmailIgnoreFromDb();
                    if (emailIgnorePatterns == null || emailIgnorePatterns.Count == 0)
                        return new { success = false, message = "Chưa cấu hình Email Ignore (HR Multi-DB) trong App Settings. Vui lòng thêm domain email được phép.", sessionId = 0, jobId = 0 };
                    if (!EmailMatchesAnyPattern(emailForReset, emailIgnorePatterns))
                    {
                        var domainList = string.Join(", ", emailIgnorePatterns);
                        return new { success = false, message = "Email phải thuộc một trong các domain: " + domainList, sessionId = 0, jobId = 0 };
                    }
                    if (string.IsNullOrEmpty(passwordForReset)) passwordForReset = "1";
                    if (string.IsNullOrEmpty(phoneForReset)) phoneForReset = "0987654321";
                }
                var restorePath = GetRestorePathForServer(serverId);
                if (string.IsNullOrEmpty(restorePath))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup/restore.", sessionId = 0, jobId = 0 };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server.", sessionId = 0, jobId = 0 };
                var backupRoot = restorePath.Trim().TrimEnd('\\');
                var fullPaths = new List<string>();
                foreach (var bf in backupFileList)
                {
                    var norm = NormalizeBackupRelativePath(bf);
                    if (norm.Contains("..") || norm.Contains("/"))
                        return new { success = false, message = "Tên file không hợp lệ: " + (bf ?? ""), sessionId = 0, jobId = 0 };
                    var fp = string.IsNullOrEmpty(norm) ? backupRoot : System.IO.Path.Combine(backupRoot, norm);
                    fp = System.IO.Path.GetFullPath(fp);
                    if (!fp.StartsWith(System.IO.Path.GetFullPath(backupRoot), StringComparison.OrdinalIgnoreCase))
                        return new { success = false, message = "Đường dẫn file không hợp lệ.", sessionId = 0, jobId = 0 };
                    fullPaths.Add(fp);
                }
                var fullPath = fullPaths[0];

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
                // Pre-check dung lượng đĩa trước khi enqueue/chạy restore, tránh job chạy một lúc rồi fail "insufficient free space".
                var diskSpaceError = ValidateRestoreDiskFreeSpace(s, databaseName, fullPaths, positions.Count > 0 ? positions[0] : 1);
                if (!string.IsNullOrEmpty(diskSpaceError))
                    return new { success = false, message = diskSpaceError, sessionId = 0, jobId = 0 };

                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var startedByName = "";
                try
                {
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ISNULL(NULLIF(RTRIM(FullName),N''), UserName) FROM UiUser WHERE UserId = @uid";
                        cmd.Parameters.AddWithValue("@uid", userId);
                        appConn.Open();
                        var o = cmd.ExecuteScalar();
                        startedByName = (o != null && !(o is DBNull) && !string.IsNullOrWhiteSpace(o.ToString())) ? o.ToString().Trim() : ("User " + userId);
                    }
                }
                catch { startedByName = "User " + userId; }

                if (UseBackgroundWorker())
                {
                    var payloadDict = new Dictionary<string, object> {
                        { "withReplace", withReplace },
                        { "withShrinkLog", withShrinkLog },
                        { "withAutoReset", withAutoReset },
                        { "positions", positions },
                        { "recovery", recovery },
                        { "emailForReset", emailForReset ?? "" },
                        { "passwordForReset", passwordForReset ?? "" },
                        { "phoneForReset", phoneForReset ?? "" }
                    };
                    if (backupFileList.Count > 1)
                        payloadDict["backupFileNames"] = backupFileList;
                    var payloadJson = Newtonsoft.Json.JsonConvert.SerializeObject(payloadDict);
                    int pendingJobId = 0;
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerId, ServerName, DatabaseName, BackupFileName, StartedByUserId, StartedByUserName, StartTime, SessionId, Status, PercentComplete, Message, Payload)
VALUES (N'Restore', @sid, @sname, @db, @file, @uid, @uname, SYSDATETIME(), 0, N'Pending', 0, N'Pending', @payload); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                        cmd.Parameters.AddWithValue("@sid", serverId);
                        cmd.Parameters.AddWithValue("@sname", (s.ServerName ?? "") + (s.Port.HasValue ? "," + s.Port.Value : ""));
                        cmd.Parameters.AddWithValue("@db", databaseName);
                        cmd.Parameters.AddWithValue("@file", backupFileName);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@uname", startedByName);
                        cmd.Parameters.AddWithValue("@payload", (object)payloadJson ?? DBNull.Value);
                        appConn.Open();
                        pendingJobId = (int)cmd.ExecuteScalar();
                    }
                    if (pendingJobId > 0)
                    {
                        using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = appConn.CreateCommand())
                        {
                            cmd.CommandText = "UPDATE BaJob SET SessionId = @sess WHERE Id = @id";
                            cmd.Parameters.AddWithValue("@sess", -pendingJobId);
                            cmd.Parameters.AddWithValue("@id", pendingJobId);
                            appConn.Open();
                            cmd.ExecuteNonQuery();
                        }
                        using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = appConn.CreateCommand())
                        {
                            cmd.CommandText = "INSERT INTO BaDatabaseRestoreLog (ServerId, DatabaseName, RestoredByUserId, Note) VALUES (@sid, @db, @uid, @note)";
                            cmd.Parameters.AddWithValue("@sid", serverId);
                            cmd.Parameters.AddWithValue("@db", databaseName);
                            cmd.Parameters.AddWithValue("@uid", userId);
                            var notePending = backupFileList.Count > 1 ? ("Files: " + string.Join(", ", backupFileList) + " (Pending Worker)") : ("File: " + backupFileName + " (Pending Worker)");
                            cmd.Parameters.AddWithValue("@note", notePending);
                            appConn.Open();
                            cmd.ExecuteNonQuery();
                        }
                        UserActionLogHelper.Log("DatabaseSearch.StartRestore", "Pending Worker, jobId=" + pendingJobId + ", file=" + backupFileName + " -> " + databaseName);
                    }
                    lock (_restoreProgressUpdateTimerLock)
                    {
                        if (_restoreProgressUpdateTimer == null)
                            _restoreProgressUpdateTimer = new System.Threading.Timer(UpdateAllRestoreProgressCallback, null, 2000, 2000);
                    }
                    return new { success = true, sessionId = 0, jobId = pendingJobId };
                }

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                var conn = new SqlConnection(masterConn);
                conn.Open();
                bool isNewDbCheck;
                using (var cmdCheck = conn.CreateCommand())
                {
                    cmdCheck.CommandText = "SELECT name FROM sys.databases WHERE name = @db";
                    cmdCheck.Parameters.AddWithValue("@db", databaseName);
                    isNewDbCheck = cmdCheck.ExecuteScalar() == null;
                }
                if (!isNewDbCheck && !CanViewDatabase(serverId, databaseName))
                {
                    try { conn.Dispose(); } catch { }
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được restore (ghi đè). Database đích đã tồn tại do user khác restore.", sessionId = 0, jobId = 0 };
                }
                int sessionId;
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT @@SPID";
                    var spidVal = cmd.ExecuteScalar();
                    sessionId = spidVal == null || spidVal is DBNull ? 0 : Convert.ToInt32(spidVal);
                }
                RestoreSessions.TryAdd(sessionId, conn);

                int jobId = 0;
                try
                {
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        var payloadJson = Newtonsoft.Json.JsonConvert.SerializeObject(new Dictionary<string, object> {
                            { "withAutoReset", withAutoReset },
                            { "withReplace", withReplace },
                            { "withShrinkLog", withShrinkLog }
                        });
                        cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerId, ServerName, DatabaseName, BackupFileName, StartedByUserId, StartedByUserName, StartTime, SessionId, Status, PercentComplete, Message, Payload)
VALUES (N'Restore', @sid, @sname, @db, @file, @uid, @uname, SYSDATETIME(), @sess, N'Running', 0, N'Restore', @payload); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                        cmd.Parameters.AddWithValue("@sid", serverId);
                        cmd.Parameters.AddWithValue("@sname", (s.ServerName ?? "") + (s.Port.HasValue ? "," + s.Port.Value : ""));
                        cmd.Parameters.AddWithValue("@db", databaseName);
                        cmd.Parameters.AddWithValue("@file", backupFileName);
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@uname", startedByName);
                        cmd.Parameters.AddWithValue("@sess", sessionId);
                        cmd.Parameters.AddWithValue("@payload", (object)payloadJson ?? DBNull.Value);
                        appConn.Open();
                        jobId = (int)cmd.ExecuteScalar();
                    }
                }
                catch { jobId = 0; }

                var shrinkLog = withShrinkLog;
                var doAutoReset = withAutoReset;
                var autoResetEmail = emailForReset;
                var autoResetPassword = passwordForReset;
                var autoResetPhone = phoneForReset;
                System.Threading.Tasks.Task.Run(() =>
                {
                    var prev = System.Threading.Thread.CurrentThread.Priority;
                    try
                    {
                        System.Threading.Thread.CurrentThread.Priority = System.Threading.ThreadPriority.BelowNormal;
                        DoRestoreWork(jobId, serverId, databaseName, fullPaths, positions, recovery, withReplace, shrinkLog, doAutoReset, autoResetEmail, autoResetPassword, autoResetPhone, conn, sessionId);
                    }
                    finally
                    {
                        try { System.Threading.Thread.CurrentThread.Priority = prev; } catch { }
                    }
                });

                lock (_restoreProgressUpdateTimerLock)
                {
                    if (_restoreProgressUpdateTimer == null)
                        _restoreProgressUpdateTimer = new System.Threading.Timer(UpdateAllRestoreProgressCallback, null, 2000, 2000);
                }
                var note = fullPaths.Count > 1 ? ("Files: " + string.Join(", ", backupFileList)) : ("File: " + backupFileName);
                if (withAutoReset)
                {
                    var resetInfo = " | Reset: Email=" + (string.IsNullOrEmpty(emailForReset) ? "(mặc định)" : emailForReset) + ", Phone=" + (string.IsNullOrEmpty(phoneForReset) ? "(mặc định)" : phoneForReset) + ", Password=" + (string.IsNullOrEmpty(passwordForReset) ? "(mặc định)" : "***");
                    note = (note + resetInfo).Length <= 500 ? (note + resetInfo) : note + " | Reset: đã đặt email/phone/password";
                }
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = "INSERT INTO BaDatabaseRestoreLog (ServerId, DatabaseName, RestoredByUserId, Note) VALUES (@sid, @db, @uid, @note)";
                    cmd.Parameters.AddWithValue("@sid", serverId);
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@note", note);
                    appConn.Open();
                    cmd.ExecuteNonQuery();
                }
                var resetOption = withAutoReset ? "có reset" : "không reset";
                var auditDetail = (fullPaths.Count > 1 ? "files=" + string.Join(";", backupFileList) : "file=" + backupFileName) + " -> database=" + databaseName + ", autoReset=" + withAutoReset + ", option=" + resetOption;
                if (withAutoReset)
                    auditDetail += ", resetEmail=" + (string.IsNullOrEmpty(emailForReset) ? "(mặc định)" : emailForReset) + ", resetPhone=" + (string.IsNullOrEmpty(phoneForReset) ? "(mặc định)" : phoneForReset) + ", resetPassword=***";
                UserActionLogHelper.Log("DatabaseSearch.StartRestore", auditDetail);
                return new { success = true, sessionId = sessionId, jobId = jobId };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, sessionId = 0, jobId = 0 };
            }
        }

        /// <summary>Ngắt mọi session đang đặt context vào database đích (kết nối phải là master). Giảm lỗi RESTORE: Exclusive access could not be obtained.</summary>
        private static void KillOtherSessionsOnDatabase(SqlConnection masterConn, string databaseName)
        {
            if (masterConn == null || string.IsNullOrWhiteSpace(databaseName)) return;
            int dbId;
            using (var cmd = masterConn.CreateCommand())
            {
                cmd.CommandText = "SELECT database_id FROM sys.databases WHERE name = @db";
                cmd.Parameters.AddWithValue("@db", databaseName);
                var o = cmd.ExecuteScalar();
                if (o == null || o is DBNull) return;
                dbId = Convert.ToInt32(o);
            }
            var toKill = new List<int>();
            using (var cmd = masterConn.CreateCommand())
            {
                cmd.CommandText = "SELECT session_id FROM sys.dm_exec_sessions WHERE database_id = @id AND session_id <> @@SPID";
                cmd.Parameters.AddWithValue("@id", dbId);
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                        toKill.Add(Convert.ToInt32(r.GetValue(0)));
                }
            }
            foreach (var sid in toKill)
            {
                try
                {
                    using (var k = masterConn.CreateCommand())
                    {
                        k.CommandTimeout = 30;
                        k.CommandText = "KILL " + sid.ToString(System.Globalization.CultureInfo.InvariantCulture);
                        k.ExecuteNonQuery();
                    }
                }
                catch { /* session đã đóng */ }
            }
        }

        /// <summary>Đưa DB về SINGLE_USER để RESTORE; có kill session khác + retry. Không nuốt lỗi như trước (tránh RESTORE fail với message exclusive access mơ hồ).</summary>
        private static void EnsureExclusiveAccessForRestore(SqlConnection masterConn, string databaseName)
        {
            var dbSafe = databaseName.Replace("]", "]]");
            Exception lastEx = null;
            for (var attempt = 0; attempt < 3; attempt++)
            {
                if (attempt > 0)
                {
                    KillOtherSessionsOnDatabase(masterConn, databaseName);
                    System.Threading.Thread.Sleep(attempt == 1 ? 400 : 800);
                }
                try
                {
                    using (var cmd = masterConn.CreateCommand())
                    {
                        cmd.CommandTimeout = 120;
                        cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;";
                        cmd.ExecuteNonQuery();
                    }
                    return;
                }
                catch (Exception ex)
                {
                    lastEx = ex;
                }
            }
            var hint = lastEx != null ? lastEx.Message : "";
            throw new InvalidOperationException(
                "Không thể chiếm quyền độc quyền lên database để RESTORE (database đang có session khác — SSMS/ứng dụng đang mở DB đích, hoặc thiếu quyền ALTER DATABASE). "
                + "Hãy đóng mọi tab query đang chọn database đích, ngắt app kết nối tới DB đó, rồi thử lại. Chi tiết: " + hint, lastEx);
        }

        /// <summary>
        /// Kiểm tra nhanh dung lượng ổ đĩa còn trống trước restore bằng RESTORE FILELISTONLY + xp_fixeddrives.
        /// Trả message lỗi khi xác định chắc chắn thiếu dung lượng; trả null nếu đủ hoặc không thể xác minh.
        /// </summary>
        private static string ValidateRestoreDiskFreeSpace(ServerInfo s, string databaseName, List<string> fullPaths, int position)
        {
            if (s == null || fullPaths == null || fullPaths.Count == 0) return null;
            try
            {
                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    string defaultDataPath = null, defaultLogPath = null;
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
                    }
                    catch { }
                    if (!string.IsNullOrWhiteSpace(defaultDataPath)) defaultDataPath = defaultDataPath.TrimEnd('\\') + "\\";
                    if (!string.IsNullOrWhiteSpace(defaultLogPath)) defaultLogPath = defaultLogPath.TrimEnd('\\') + "\\";

                    var fromDiskClause = fullPaths.Count == 1 ? "FROM DISK = @path" : "FROM " + string.Join(", ", fullPaths.Select((_, i) => "DISK = @path" + (i + 1)));
                    var requiredByDrive = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 90;
                        cmd.CommandText = "RESTORE FILELISTONLY " + fromDiskClause + " WITH FILE = @file";
                        for (int i = 0; i < fullPaths.Count; i++)
                            cmd.Parameters.AddWithValue(i == 0 ? "@path" : ("@path" + (i + 1)), fullPaths[i]);
                        cmd.Parameters.AddWithValue("@file", position <= 0 ? 1 : position);
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                            {
                                var type = r["Type"] == DBNull.Value ? "" : Convert.ToString(r["Type"]);
                                if (type != "D" && type != "L") continue;
                                var sizeBytes = r["Size"] == DBNull.Value ? 0L : Convert.ToInt64(r["Size"]);
                                if (sizeBytes <= 0) continue;
                                var physicalName = r["PhysicalName"] == DBNull.Value ? "" : Convert.ToString(r["PhysicalName"]);
                                string targetPath = physicalName;
                                if (type == "D" && !string.IsNullOrWhiteSpace(defaultDataPath)) targetPath = defaultDataPath;
                                if (type == "L" && !string.IsNullOrWhiteSpace(defaultLogPath)) targetPath = defaultLogPath;
                                var root = Path.GetPathRoot(targetPath ?? "") ?? "";
                                if (string.IsNullOrWhiteSpace(root) || root.Length < 1) continue;
                                var drive = root.Substring(0, 1).ToUpperInvariant();
                                if (!requiredByDrive.ContainsKey(drive)) requiredByDrive[drive] = 0;
                                requiredByDrive[drive] += sizeBytes;
                            }
                        }
                    }
                    if (requiredByDrive.Count == 0) return null;

                    var freeMbByDrive = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
                    try
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandTimeout = 20;
                            cmd.CommandText = "CREATE TABLE #d (Drive char(1), FreeMB int); INSERT INTO #d EXEC master..xp_fixeddrives; SELECT Drive, FreeMB FROM #d;";
                            using (var r = cmd.ExecuteReader())
                            {
                                while (r.Read())
                                {
                                    var drive = (r.IsDBNull(0) ? "" : r.GetString(0)).ToUpperInvariant();
                                    var freeMb = r.IsDBNull(1) ? 0L : Convert.ToInt64(r.GetValue(1));
                                    if (!string.IsNullOrWhiteSpace(drive))
                                        freeMbByDrive[drive] = freeMb;
                                }
                            }
                        }
                    }
                    catch
                    {
                        return null; // Không đọc được free disk từ SQL => bỏ qua pre-check để không chặn restore hợp lệ.
                    }

                    const long mb = 1024L * 1024L;
                    var missing = new List<string>();
                    foreach (var kv in requiredByDrive)
                    {
                        var drive = kv.Key;
                        var requiredBytes = kv.Value;
                        // Buffer 10% + 256MB để giảm false-pass khi file grow thêm trong lúc restore.
                        var needMb = (long)Math.Ceiling((requiredBytes * 1.10) / (double)mb) + 256L;
                        long freeMb;
                        if (!freeMbByDrive.TryGetValue(drive, out freeMb)) continue;
                        if (freeMb < needMb)
                        {
                            var lackMb = needMb - freeMb;
                            missing.Add("Ổ " + drive + ": cần khoảng " + needMb.ToString("N0") + " MB, hiện còn " + freeMb.ToString("N0") + " MB (thiếu " + lackMb.ToString("N0") + " MB)");
                        }
                    }
                    if (missing.Count > 0)
                    {
                        var dbName = string.IsNullOrWhiteSpace(databaseName) ? "(không rõ DB)" : databaseName.Trim();
                        return "Không đủ dung lượng để restore database '" + dbName + "'. " + string.Join("; ", missing) + ". Vui lòng giải phóng dung lượng hoặc đổi đường dẫn data/log mặc định của SQL Server rồi thử lại.";
                    }
                }
            }
            catch { }
            return null;
        }

        /// <summary>Thực hiện công việc Restore (dùng trong process qua Task.Run hoặc từ Worker qua ExecuteRestoreJob). fullPaths: một hoặc nhiều file backup (cùng backup set).</summary>
        private static void DoRestoreWork(int jobId, int serverId, string databaseName, List<string> fullPaths, List<int> positions, string recovery, bool withReplace, bool shrinkLog, bool doAutoReset, string autoResetEmail, string autoResetPassword, string autoResetPhone, SqlConnection conn, int sessionId)
        {
            if (fullPaths == null || fullPaths.Count == 0) return;
            var fullPath = fullPaths[0];
            var s = GetServerInfo(serverId);
            var appConnStr = UiAuthHelper.ConnStr;
            var dbSafe = databaseName.Replace("]", "]]");
            var fromDiskClause = fullPaths.Count == 1 ? "FROM DISK = @path" : "FROM " + string.Join(", ", fullPaths.Select((_, i) => "DISK = @path" + (i + 1)));
            try
            {
                System.Threading.Thread.CurrentThread.Priority = System.Threading.ThreadPriority.BelowNormal;
                if (IsJobCancelled(jobId)) return;
                bool isNewDb = false;
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT name FROM sys.databases WHERE name = @db";
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    isNewDb = cmd.ExecuteScalar() == null;
                }
                if (!isNewDb)
                    EnsureExclusiveAccessForRestore(conn, databaseName);
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
                            cmd.CommandText = "RESTORE FILELISTONLY " + fromDiskClause;
                            for (int i = 0; i < fullPaths.Count; i++)
                                cmd.Parameters.AddWithValue(i == 0 ? "@path" : ("@path" + (i + 1)), fullPaths[i]);
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
                                        physicalPath = dataIndex == 0 ? defaultDataPath + safeName + ".mdf" : defaultDataPath + safeName + "_" + (dataIndex + 1) + ".ndf";
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
                catch { }
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
                        cmd.CommandText = "RESTORE DATABASE [" + dbSafe + "] " + fromDiskClause + " WITH " + string.Join(", ", withClause);
                        for (int pi = 0; pi < fullPaths.Count; pi++)
                            cmd.Parameters.AddWithValue(pi == 0 ? "@path" : ("@path" + (pi + 1)), fullPaths[pi]);
                        cmd.ExecuteNonQuery();
                    }
                    if (IsJobCancelled(jobId))
                    {
                        RestoreSessionStatus.TryAdd(sessionId, new { status = "cancelled", message = "Đã hủy bởi người dùng" });
                        return;
                    }
                }
                // Sau khi RESTORE SQL xong: luôn ghi PostRestore (kể cả không auto-reset) để BaJob/UI không treo "Restore 100%" trong shrink/MULTI_USER; timer dm_exec chỉ sync khi Message=Restore.
                if (jobId > 0 && !IsJobCancelled(jobId))
                {
                    UpdateJobPhaseAndPercent(jobId, "PostRestore", 100);
                    PushRestoreJobsUpdated(serverId);
                }
                // Giai đoạn shrink log (tùy chọn): ghi Message để UI/DB khớp, không còn treo ở "Restore" trong lúc DBCC.
                if (shrinkLog && !doAutoReset && jobId > 0 && !IsJobCancelled(jobId))
                {
                    UpdateJobPhaseAndPercent(jobId, "ShrinkLog", 100);
                    PushRestoreJobsUpdated(serverId);
                }
                if (shrinkLog && !doAutoReset)
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
                        if (jobId > 0) UpdateRestoreShrinkFinalStatus(jobId, true, "Shrink log hoàn tất.");
                    }
                    catch (Exception exShrinkEarly)
                    {
                        if (jobId > 0) UpdateRestoreShrinkFinalStatus(jobId, false, exShrinkEarly.Message);
                    }
                }
                if (!isNewDb)
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "ALTER DATABASE [" + dbSafe + "] SET MULTI_USER;";
                        try { cmd.ExecuteNonQuery(); } catch { }
                    }
                }
                if (doAutoReset && jobId > 0 && !IsJobCancelled(jobId))
                {
                    try
                    {
                        var restoredConnStr = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, databaseName);
                        string sftpHost, sftpPort, sftpUser, sftpPassword;
                        GetSftpConfigFromAppSettings(appConnStr, out sftpHost, out sftpPort, out sftpUser, out sftpPassword);
                        // Báo Reset Information ngay — tránh treo PostRestore/ShrinkLog lâu trong lúc cập nhật folder config (có thể chậm).
                        UpdateJobPhaseAndPercent(jobId, "Reset Information", 1);
                        PushRestoreJobsUpdated(serverId);
                        UpdateSettingFolderConfigurationsIfExists(restoredConnStr, sftpHost ?? "", sftpPort ?? "", sftpUser ?? "", sftpPassword ?? "");
                        var lastResetPct = 1;
                        var plainResult = HRHelper.ResetEmailAndPhoneInDatabase(restoredConnStr, autoResetEmail, autoResetPhone, (step, totalSteps) =>
                        {
                            if (jobId <= 0 || IsJobCancelled(jobId)) return;
                            // Reset plain (User/Other): ~2%–22% theo từng cột — tránh treo 0% lâu như trước
                            var pct = totalSteps > 0 ? 2 + (20 * step) / totalSteps : 22;
                            if (pct > 22) pct = 22;
                            if (pct <= lastResetPct) return;
                            lastResetPct = pct;
                            UpdateJobPhaseAndPercent(jobId, "Reset Information", pct);
                            PushRestoreJobsUpdated(serverId);
                        });
                        if (plainResult.Item2 != null)
                            RestoreSessionStatus.TryAdd(sessionId, new { status = "failed", message = "Restore xong nhưng reset User/Other lỗi: " + plainResult.Item2 });
                        else if (!IsJobCancelled(jobId))
                        {
                            UpdateJobPhaseAndPercent(jobId, "Reset Information", 23);
                            PushRestoreJobsUpdated(serverId);
                            string emailOutgoing, emailPort, emailAccountName, emailUsername, emailEmailAddress, emailPassword, emailSslPort;
                            bool emailEnableSSL;
                            GetEmailServerConfigFromAppSettings(appConnStr, out emailOutgoing, out emailPort, out emailAccountName, out emailUsername, out emailEmailAddress, out emailPassword, out emailEnableSSL, out emailSslPort);
                            UpdateSettingEmailServersIfExists(restoredConnStr, emailOutgoing, emailPort, emailAccountName, emailUsername, emailEmailAddress, emailPassword, emailEnableSSL, emailSslPort);
                            UpdateJobPhaseAndPercent(jobId, "Reset Information", 25);
                            PushRestoreJobsUpdated(serverId);
                            lastResetPct = 25;
                            var resetResult = HRHelper.ResetEmailAndPhoneEncryptedForRestore(restoredConnStr, autoResetEmail, autoResetPhone, (doneChunks, totalChunks) =>
                            {
                                if (jobId <= 0 || IsJobCancelled(jobId)) return;
                                // 26%–100%: chunk 0 = bắt đầu khối mã hóa (gọi từ HRHelper trước vòng lặp + sau mỗi chunk)
                                var pct = totalChunks > 0 ? 26 + (74 * doneChunks) / totalChunks : 100;
                                if (pct > 100) pct = 100;
                                if (pct <= lastResetPct) return;
                                lastResetPct = pct;
                                UpdateJobPhaseAndPercent(jobId, "Reset Information", pct);
                                PushRestoreJobsUpdated(serverId);
                            }, () => IsJobCancelled(jobId));
                            if (resetResult.Item2 != null)
                                RestoreSessionStatus.TryAdd(sessionId, new { status = "failed", message = resetResult.Item2 == "Đã hủy" ? "Đã hủy bởi người dùng" : ("Restore xong nhưng reset Employee (mã hóa) lỗi: " + resetResult.Item2) });
                            else if (!IsJobCancelled(jobId))
                                UpdateJobPhaseAndPercent(jobId, "Completing", 100);
                        }
                        if (IsJobCancelled(jobId) && !RestoreSessionStatus.ContainsKey(sessionId))
                            RestoreSessionStatus.TryAdd(sessionId, new { status = "cancelled", message = "Đã hủy bởi người dùng" });
                    }
                    catch (Exception exReset)
                    {
                        RestoreSessionStatus.TryAdd(sessionId, new { status = "failed", message = "Restore xong nhưng auto-reset lỗi: " + (exReset.Message ?? "Lỗi") });
                    }
                    try { UpdateJobPhaseAndPercent(jobId, "Completing", 100); } catch { }
                }
                else if (jobId > 0 && !IsJobCancelled(jobId))
                {
                    // Không auto-reset: báo đang hoàn tất trước khi finally đánh dấu Completed (worker/UI thấy không còn "Restore").
                    try
                    {
                        UpdateJobPhaseAndPercent(jobId, "Completing", 100);
                        PushRestoreJobsUpdated(serverId);
                    }
                    catch { }
                }
                if (shrinkLog && doAutoReset && jobId > 0 && !IsJobCancelled(jobId))
                {
                    // Auto-reset có thể làm log nở lại lớn; chạy shrink lần cuối sau reset để log thực tế giảm.
                    try
                    {
                        UpdateJobPhaseAndPercent(jobId, "ShrinkLog", 100);
                        PushRestoreJobsUpdated(serverId);
                        RunShrinkLogForDatabase(serverId, databaseName, 200);
                        UpdateRestoreShrinkFinalStatus(jobId, true, "Shrink log cuối sau reset hoàn tất (target 200 MB).");
                    }
                    catch (Exception exShrinkFinal)
                    {
                        UpdateRestoreShrinkFinalStatus(jobId, false, exShrinkFinal.Message);
                        /* Không fail toàn job nếu shrink cuối lỗi */
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
                    try { EnsureRestoreShrinkFinalStatusBySession(sessionId, status, msg); } catch { }
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        cmd.CommandText = "UPDATE BaJob SET Status = @st, PercentComplete = 100, Message = @msg, CompletedAt = SYSDATETIME() WHERE SessionId = @sess AND JobType = N'Restore' AND Status = N'Running'";
                        cmd.Parameters.AddWithValue("@st", status);
                        cmd.Parameters.AddWithValue("@msg", (object)msg ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@sess", sessionId);
                        appConn.Open();
                        cmd.ExecuteNonQuery();
                    }
                    Helpers.BaJobWorkerNotify.Notify(-sessionId);
                    PushRestoreJobsUpdated(serverId);
                }
                catch { }
            }
        }

        /// <summary>Worker gọi: đọc job Restore (Pending hoặc đã claim Running), đảm bảo SessionId, mở conn target, gọi DoRestoreWork.</summary>
        public static void ExecuteRestoreJob(int jobId)
        {
            int serverId = 0;
            string databaseName = null, backupFileName = null, payloadJson = null;
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "SELECT ServerId, DatabaseName, BackupFileName, Payload FROM BaJob WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'Restore'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) return;
                    serverId = r.GetInt32(r.GetOrdinal("ServerId"));
                    databaseName = r.GetString(r.GetOrdinal("DatabaseName"));
                    backupFileName = r.IsDBNull(r.GetOrdinal("BackupFileName")) ? "" : r.GetString(r.GetOrdinal("BackupFileName"));
                    payloadJson = r.IsDBNull(r.GetOrdinal("Payload")) ? null : r.GetString(r.GetOrdinal("Payload"));
                }
            }
            var positions = new List<int>();
            var recovery = "RECOVERY";
            var withReplace = true;
            var shrinkLog = false;
            var withAutoReset = false;
            var emailForReset = "";
            var passwordForReset = "";
            var phoneForReset = "";
            if (!string.IsNullOrEmpty(payloadJson))
            {
                try
                {
                    var payload = Newtonsoft.Json.Linq.JObject.Parse(payloadJson);
                    if (payload["positions"] != null && payload["positions"].Type == Newtonsoft.Json.Linq.JTokenType.Array)
                        foreach (var p in payload["positions"]) positions.Add((int)p);
                    if (positions.Count == 0) positions.Add(1);
                    if (payload["recovery"] != null) recovery = (string)payload["recovery"] ?? "RECOVERY";
                    if (payload["withReplace"] != null) withReplace = (bool)payload["withReplace"];
                    if (payload["withShrinkLog"] != null) shrinkLog = (bool)payload["withShrinkLog"];
                    if (payload["withAutoReset"] != null) withAutoReset = (bool)payload["withAutoReset"];
                    if (payload["emailForReset"] != null) emailForReset = (string)payload["emailForReset"] ?? "";
                    if (payload["passwordForReset"] != null) passwordForReset = (string)payload["passwordForReset"] ?? "";
                    if (payload["phoneForReset"] != null) phoneForReset = (string)payload["phoneForReset"] ?? "";
                }
                catch { }
            }
            if (positions.Count == 0) positions.Add(1);
            var s = GetServerInfo(serverId);
            if (s == null) { MarkJobFailed(jobId, "Không tìm thấy server."); return; }
            var restorePath = GetRestorePathForServer(serverId);
            if (string.IsNullOrEmpty(restorePath)) { MarkJobFailed(jobId, "Chưa cấu hình đường dẫn restore."); return; }
            var fullPaths = new List<string>();
            var backupFileNamesList = new List<string>();
            try
            {
                if (!string.IsNullOrEmpty(payloadJson))
                {
                    var payload = Newtonsoft.Json.Linq.JObject.Parse(payloadJson);
                    if (payload["backupFileNames"] != null && payload["backupFileNames"].Type == Newtonsoft.Json.Linq.JTokenType.Array)
                    {
                        foreach (var f in payload["backupFileNames"])
                            backupFileNamesList.Add((string)f);
                    }
                }
            }
            catch { }
            if (backupFileNamesList.Count == 0 && !string.IsNullOrWhiteSpace(backupFileName))
                backupFileNamesList.Add(backupFileName.Trim());
            var backupRoot = restorePath.Trim().TrimEnd('\\');
            foreach (var bf in backupFileNamesList)
            {
                var norm = NormalizeBackupRelativePath(bf ?? "");
                if (norm.Contains("..") || norm.Contains("/")) { MarkJobFailed(jobId, "Tên file không hợp lệ."); return; }
                var fp = string.IsNullOrEmpty(norm) ? backupRoot : System.IO.Path.Combine(backupRoot, norm);
                fp = System.IO.Path.GetFullPath(fp);
                if (!fp.StartsWith(System.IO.Path.GetFullPath(backupRoot), StringComparison.OrdinalIgnoreCase)) { MarkJobFailed(jobId, "Đường dẫn file không hợp lệ."); return; }
                fullPaths.Add(fp);
            }
            if (fullPaths.Count == 0) { MarkJobFailed(jobId, "Chưa có file backup."); return; }
            var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
            var conn = new SqlConnection(masterConn);
            try
            {
                conn.Open();
                int sessionId;
                using (var cmdSpid = conn.CreateCommand())
                {
                    cmdSpid.CommandText = "SELECT @@SPID";
                    sessionId = Convert.ToInt32(cmdSpid.ExecuteScalar());
                }
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    // Đặt Message = Restore (job Pending từ Worker có Message = Pending; nếu không đổi thì timer/GetRestoreProgress vẫn đọc dm_exec và ghi đè % → nhấp nháy 100% ↔ 0% khi sang Reset).
                    cmd.CommandText = "UPDATE BaJob SET Status = N'Running', SessionId = @sess, Message = N'Restore' WHERE Id = @id AND JobType = N'Restore'";
                    cmd.Parameters.AddWithValue("@sess", sessionId);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    appConn.Open();
                    cmd.ExecuteNonQuery();
                }
                RestoreSessions.TryAdd(sessionId, conn);
                try
                {
                    DoRestoreWork(jobId, serverId, databaseName, fullPaths, positions, recovery, withReplace, shrinkLog, withAutoReset, emailForReset, passwordForReset, phoneForReset, conn, sessionId);
                }
                catch (Exception ex)
                {
                    MarkJobFailed(jobId, ex.Message);
                }
                finally
                {
                    SqlConnection removed;
                    RestoreSessions.TryRemove(sessionId, out removed);
                }
            }
            catch (Exception ex)
            {
                try { conn.Dispose(); } catch { }
                MarkJobFailed(jobId, ex.Message);
            }
        }

        private static void MarkJobFailed(int jobId, string message)
        {
            try
            {
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaJob SET Status = N'Failed', Message = @msg, PercentComplete = 100, CompletedAt = SYSDATETIME() WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@msg", (object)message ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    appConn.Open();
                    cmd.ExecuteNonQuery();
                }
                Helpers.BaJobWorkerNotify.Notify(jobId);
            }
            catch { }
        }

        /// <summary>Kiểm tra job Restore đã bị hủy chưa (dùng trong background restore để thoát sớm).</summary>
        private static bool IsJobCancelled(int jobId)
        {
            if (jobId <= 0) return false;
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT 1 FROM BaJob WHERE Id = @id AND JobType = N'Restore' AND Status = N'Cancelled'";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    return cmd.ExecuteScalar() != null;
                }
            }
            catch { return false; }
        }

        /// <summary>Hủy job đang chạy (Restore/Backup/HRHelper). Được phép: người tạo job (StartedByUserId) hoặc SuperAdmin.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object CancelJob(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                var uid = UiAuthHelper.GetCurrentUserIdOrThrow();
                var isSuperAdmin = UiAuthHelper.IsSuperAdmin;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"UPDATE BaJob SET Status = N'Cancelled', Message = N'Đã hủy bởi người dùng', CompletedAt = SYSDATETIME() WHERE Id = @id AND Status = N'Running' AND JobType IN (N'Restore', N'Backup', N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperMultiDbAnalyze', N'HRHelperMultiDbReset', N'HRHelperDeleteEmployee') AND (StartedByUserId = @uid OR @isSuperAdmin = 1)";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    cmd.Parameters.AddWithValue("@uid", uid);
                    cmd.Parameters.AddWithValue("@isSuperAdmin", isSuperAdmin);
                    conn.Open();
                    int n = cmd.ExecuteNonQuery();
                    if (n == 0)
                        return new { success = false, message = "Không thể hủy (job không tồn tại, đã xong, hoặc chỉ người tạo job / SuperAdmin mới được hủy)." };
                }
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Lấy withAutoReset từ Payload JSON của Restore job. Null nếu không có hoặc parse lỗi.</summary>
        private static bool? ParseWithAutoResetFromPayload(string payloadJson)
        {
            if (string.IsNullOrWhiteSpace(payloadJson)) return null;
            try
            {
                var obj = Newtonsoft.Json.Linq.JObject.Parse(payloadJson);
                var tok = obj["withAutoReset"];
                return tok != null ? tok.ToObject<bool>() : (bool?)null;
            }
            catch { return null; }
        }

        /// <summary>Lấy withAutoReset, withReplace, withShrinkLog từ Payload JSON của Restore job.</summary>
        private static void ParseRestorePayloadOptions(string payloadJson, out bool? withAutoReset, out bool? withReplace, out bool? withShrinkLog)
        {
            withAutoReset = null;
            withReplace = null;
            withShrinkLog = null;
            if (string.IsNullOrWhiteSpace(payloadJson)) return;
            try
            {
                var obj = Newtonsoft.Json.Linq.JObject.Parse(payloadJson);
                withAutoReset = obj["withAutoReset"] != null ? (bool?)obj["withAutoReset"].ToObject<bool>() : null;
                withReplace = obj["withReplace"] != null ? (bool?)obj["withReplace"].ToObject<bool>() : null;
                withShrinkLog = obj["withShrinkLog"] != null ? (bool?)obj["withShrinkLog"].ToObject<bool>() : null;
            }
            catch { }
        }

        /// <summary>Cập nhật trạng thái shrink cuối vào Payload của Restore job để UI chuông hiển thị chi tiết.</summary>
        private static void UpdateRestoreShrinkFinalStatus(int jobId, bool success, string message)
        {
            if (jobId <= 0) return;
            try
            {
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmdSel = appConn.CreateCommand())
                {
                    cmdSel.CommandText = "SELECT ISNULL(Payload, N'') FROM BaJob WHERE Id = @id AND JobType = N'Restore'";
                    cmdSel.Parameters.AddWithValue("@id", jobId);
                    appConn.Open();
                    var payloadStr = (cmdSel.ExecuteScalar() ?? "").ToString();
                    Newtonsoft.Json.Linq.JObject obj;
                    try { obj = string.IsNullOrWhiteSpace(payloadStr) ? new Newtonsoft.Json.Linq.JObject() : Newtonsoft.Json.Linq.JObject.Parse(payloadStr); }
                    catch { obj = new Newtonsoft.Json.Linq.JObject(); }
                    obj["shrinkFinalStatus"] = success ? "success" : "failed";
                    obj["shrinkFinalMessage"] = (message ?? "").Trim();
                    obj["shrinkFinalAt"] = DateTime.Now.ToString("o");
                    var payloadNew = obj.ToString(Newtonsoft.Json.Formatting.None);
                    using (var cmdUpd = appConn.CreateCommand())
                    {
                        cmdUpd.CommandText = "UPDATE BaJob SET Payload = @p WHERE Id = @id";
                        cmdUpd.Parameters.AddWithValue("@p", (object)payloadNew ?? DBNull.Value);
                        cmdUpd.Parameters.AddWithValue("@id", jobId);
                        cmdUpd.ExecuteNonQuery();
                    }
                }
            }
            catch { }
        }

        /// <summary>
        /// Fallback: khi job đã kết thúc nhưng chưa có shrinkFinalStatus trong payload thì tự chốt trạng thái để UI không treo "Đang xử lý".
        /// </summary>
        private static void EnsureRestoreShrinkFinalStatusBySession(int sessionId, string finalJobStatus, string finalJobMessage)
        {
            if (sessionId <= 0) return;
            try
            {
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = "SELECT TOP 1 Id, ISNULL(Payload, N'') FROM BaJob WHERE SessionId = @sess AND JobType = N'Restore' AND Status = N'Running' ORDER BY Id DESC";
                    cmd.Parameters.AddWithValue("@sess", sessionId);
                    appConn.Open();
                    int jobId = 0;
                    string payloadStr = "";
                    using (var r = cmd.ExecuteReader())
                    {
                        if (!r.Read()) return;
                        jobId = r.IsDBNull(0) ? 0 : r.GetInt32(0);
                        payloadStr = r.IsDBNull(1) ? "" : r.GetString(1);
                    }
                    if (jobId <= 0) return;

                    Newtonsoft.Json.Linq.JObject obj;
                    try { obj = string.IsNullOrWhiteSpace(payloadStr) ? new Newtonsoft.Json.Linq.JObject() : Newtonsoft.Json.Linq.JObject.Parse(payloadStr); }
                    catch { obj = new Newtonsoft.Json.Linq.JObject(); }
                    var withShrink = obj["withShrinkLog"] != null && obj["withShrinkLog"].ToObject<bool>();
                    if (!withShrink) return;
                    var existing = (obj["shrinkFinalStatus"] ?? "").ToString().Trim();
                    if (!string.IsNullOrEmpty(existing)) return;

                    var ok = string.Equals(finalJobStatus ?? "", "Completed", StringComparison.OrdinalIgnoreCase);
                    var fallbackMsg = ok
                        ? "Job đã hoàn tất; không ghi nhận lỗi ở bước shrink cuối."
                        : ("Job kết thúc với trạng thái " + (finalJobStatus ?? "Failed") + (string.IsNullOrWhiteSpace(finalJobMessage) ? "" : (": " + finalJobMessage)));
                    UpdateRestoreShrinkFinalStatus(jobId, ok, fallbackMsg);
                }
            }
            catch { }
        }

        /// <summary>Hủy job Restore đang chạy. Chỉ người thực hiện restore (StartedByUserId) mới được hủy. Giữ để tương thích chuông; chuông có thể gọi CancelJob.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object CancelRestoreJob(int jobId)
        {
            return CancelJob(jobId);
        }

        /// <summary>Lấy Payload của job (để Audit Log hiển thị danh sách database cho HRHelperMultiDbReset).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetJobPayload(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, payload = (string)null };
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Payload FROM BaJob WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    var obj = cmd.ExecuteScalar();
                    var payload = (obj != null && obj != DBNull.Value) ? obj.ToString() : null;
                    return new { success = true, payload = payload };
                }
            }
            catch
            {
                return new { success = false, payload = (string)null };
            }
        }

        /// <summary>Lấy kết quả job (Status, Message, Payload) để hiển thị chi tiết trong Audit Log / Chuông / Function Queue.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetJobResult(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, status = (string)null, message = (string)null, payload = (string)null };
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Status, ISNULL(Message, N''), ISNULL(Payload, N'') FROM BaJob WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (!r.Read())
                            return new { success = true, status = (string)null, message = (string)null, payload = (string)null };
                        var status = r.IsDBNull(0) ? null : r.GetString(0);
                        var message = r.IsDBNull(1) ? "" : r.GetString(1);
                        var payload = r.IsDBNull(2) ? null : r.GetString(2);
                        return new { success = true, status = status, message = message, payload = payload };
                    }
                }
            }
            catch
            {
                return new { success = false, status = (string)null, message = (string)null, payload = (string)null };
            }
        }

        /// <summary>Danh sách job cho Function Queue: Restore, Backup, HR Helper (không lọc Dismissed, có lịch sử 7 ngày). Super Admin / quản lý server: thấy mọi Restore/Backup và mọi job HR; user thường: Restore/Backup theo server được phép + job HR do chính họ tạo.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetFunctionQueueJobs(string dateFrom, string dateTo, string jobTypeFilter)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobs = new List<object>(), currentUserId = 0 };
                var currentUserId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var accessibleIds = GetAccessibleServerIds();
                var jobs = new List<object>();
                try
                {
                    var serverFilter = accessibleIds == null
                        ? "((J.JobType IN (N'Restore', N'Backup')))"
                        : (accessibleIds.Count == 0
                            ? "((J.JobType IN (N'Restore', N'Backup') AND 1=0))"
                            : "((J.JobType IN (N'Restore', N'Backup') AND J.ServerId IN (" + string.Join(",", accessibleIds) + ")))");
                    var hrJobTypes = "N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperMultiDbAnalyze', N'HRHelperMultiDbReset', N'HRHelperDeleteEmployee'";
                    var hrVisibilityFilter = accessibleIds == null
                        ? "((J.JobType IN (" + hrJobTypes + ")))"
                        : "((J.JobType IN (" + hrJobTypes + ") AND J.StartedByUserId = @uid))";
                    var timeFilter = "(J.Status = N'Running' OR (J.Status IN (N'Completed', N'Failed', N'Cancelled') AND J.CompletedAt >= DATEADD(day, -7, SYSDATETIME())))";
                    DateTime? fromDt = null, toDt = null;
                    DateTime parsedFrom;
                    if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom.Trim(), out parsedFrom)) fromDt = parsedFrom;
                    DateTime parsedTo;
                    if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo.Trim(), out parsedTo)) toDt = parsedTo.Date.AddDays(1);
                    if (fromDt.HasValue) timeFilter += " AND J.StartTime >= @from";
                    if (toDt.HasValue) timeFilter += " AND J.StartTime < @to";
                    var typeFilter = "";
                    if (!string.IsNullOrWhiteSpace(jobTypeFilter))
                    {
                        var typeVal = jobTypeFilter.Trim();
                        if (typeVal == "Restore") typeFilter = " AND J.JobType = N'Restore'";
                        else if (typeVal == "Backup") typeFilter = " AND J.JobType = N'Backup'";
                        else if (typeVal == "HRHelperUpdateUser") typeFilter = " AND J.JobType = N'HRHelperUpdateUser'";
                        else if (typeVal == "HRHelperUpdateUserSignature") typeFilter = " AND J.JobType = N'HRHelperUpdateUserSignature'";
                        else if (typeVal == "HRHelperUpdateEmployee") typeFilter = " AND J.JobType = N'HRHelperUpdateEmployee'";
                        else if (typeVal == "HRHelperUpdateOther") typeFilter = " AND J.JobType = N'HRHelperUpdateOther'";
                        else if (typeVal == "HRHelperMultiDbAnalyze") typeFilter = " AND J.JobType = N'HRHelperMultiDbAnalyze'";
                        else if (typeVal == "HRHelperMultiDbReset") typeFilter = " AND J.JobType = N'HRHelperMultiDbReset'";
                        else if (typeVal == "HRHelperDeleteEmployee") typeFilter = " AND J.JobType = N'HRHelperDeleteEmployee'";
                    }
                    var sql = @"SELECT TOP 500 J.Id, J.JobType, J.ServerId, J.ServerName, J.DatabaseName, J.BackupFileName, J.FileName, J.SessionId, J.StartedByUserId,
  (CASE WHEN J.StartedByUserName IS NULL OR LTRIM(RTRIM(J.StartedByUserName)) = N'' OR J.StartedByUserName = N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))
    THEN ISNULL(U.UserName, N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))) ELSE J.StartedByUserName END) AS StartedByUserName,
  J.StartTime, J.Status, J.PercentComplete, J.Message, J.CompletedAt, J.Payload
FROM BaJob J
LEFT JOIN UiUser U ON U.UserId = J.StartedByUserId
WHERE J.JobType IN (N'Restore', N'Backup', N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperMultiDbAnalyze', N'HRHelperMultiDbReset', N'HRHelperDeleteEmployee')
  AND " + timeFilter + @"
  AND (" + serverFilter + " OR " + hrVisibilityFilter + ")" + typeFilter + @"
ORDER BY CASE WHEN J.Status = N'Running' THEN 0 ELSE 1 END, J.StartTime DESC";
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = sql;
                        cmd.Parameters.AddWithValue("@uid", currentUserId);
                        if (fromDt.HasValue) cmd.Parameters.AddWithValue("@from", fromDt.Value);
                        if (toDt.HasValue) cmd.Parameters.AddWithValue("@to", toDt.Value);
                        conn.Open();
                        using (var r = cmd.ExecuteReader())
                        {
                            while (r.Read())
                            {
                                var jobType = r.IsDBNull(1) ? "" : r.GetString(1);
                                var typeLabel = string.Equals(jobType, "Backup", StringComparison.OrdinalIgnoreCase) ? "Backup"
                                    : string.Equals(jobType, "Restore", StringComparison.OrdinalIgnoreCase) ? "Restore"
                                    : string.Equals(jobType, "HRHelperUpdateUser", StringComparison.OrdinalIgnoreCase) ? "Update User"
                                    : string.Equals(jobType, "HRHelperUpdateUserSignature", StringComparison.OrdinalIgnoreCase) ? "Update User Signature"
                                    : string.Equals(jobType, "HRHelperUpdateEmployee", StringComparison.OrdinalIgnoreCase) ? "Update Employee"
                                    : string.Equals(jobType, "HRHelperUpdateOther", StringComparison.OrdinalIgnoreCase) ? "Update Company/Other"
                                    : string.Equals(jobType, "HRHelperMultiDbAnalyze", StringComparison.OrdinalIgnoreCase) ? "Phân tích Multi-DB"
                                    : string.Equals(jobType, "HRHelperMultiDbReset", StringComparison.OrdinalIgnoreCase) ? "Reset Multi-DB"
                                    : string.Equals(jobType, "HRHelperDeleteEmployee", StringComparison.OrdinalIgnoreCase) ? "Delete Employee"
                                    : string.IsNullOrEmpty(jobType) ? "Job" : jobType;
                                var backupFileName = string.Equals(jobType, "Backup", StringComparison.OrdinalIgnoreCase)
                                    ? (r.FieldCount > 6 && !r.IsDBNull(6) ? r.GetString(6) : "")
                                    : (r.FieldCount > 5 && !r.IsDBNull(5) ? r.GetString(5) : "");
                                var payloadStr = r.FieldCount > 15 && !r.IsDBNull(15) ? r.GetString(15) : null;
                                bool? withReplaceOpt, withShrinkLogOpt;
                                bool? withAutoResetOpt;
                                ParseRestorePayloadOptions(payloadStr, out withAutoResetOpt, out withReplaceOpt, out withShrinkLogOpt);
                                jobs.Add(new
                                {
                                    id = r.GetInt32(0),
                                    type = jobType,
                                    typeLabel = typeLabel,
                                    serverId = r.FieldCount > 2 && !r.IsDBNull(2) ? r.GetInt32(2) : 0,
                                    serverName = r.FieldCount > 3 && !r.IsDBNull(3) ? r.GetString(3) : "",
                                    databaseName = r.FieldCount > 4 && !r.IsDBNull(4) ? r.GetString(4) : "",
                                    backupFileName = backupFileName,
                                    fileName = r.FieldCount > 6 && !r.IsDBNull(6) ? r.GetString(6) : "",
                                    startedByUserId = r.FieldCount > 8 && !r.IsDBNull(8) ? r.GetInt32(8) : 0,
                                    startedByUserName = r.FieldCount > 9 && !r.IsDBNull(9) ? r.GetString(9) : "",
                                    startTime = r.FieldCount > 10 && !r.IsDBNull(10) ? r.GetDateTime(10).ToString("o") : null,
                                    sessionId = r.FieldCount > 7 && !r.IsDBNull(7) ? (int?)r.GetInt32(7) : (int?)null,
                                    status = r.FieldCount > 11 && !r.IsDBNull(11) ? r.GetString(11) : "",
                                    percentComplete = r.FieldCount > 12 && !r.IsDBNull(12) ? r.GetInt32(12) : 0,
                                    message = r.FieldCount > 13 && !r.IsDBNull(13) ? r.GetString(13) : "",
                                    completedAt = r.FieldCount > 14 && !r.IsDBNull(14) ? r.GetDateTime(14).ToString("o") : null,
                                    withAutoReset = withAutoResetOpt,
                                    withReplace = withReplaceOpt,
                                    withShrinkLog = withShrinkLogOpt,
                                    payload = payloadStr
                                });
                            }
                        }
                    }
                    return new { success = true, jobs = jobs, currentUserId = currentUserId, isSuperAdmin = UiAuthHelper.IsSuperAdmin };
                }
                catch
                {
                    return new { success = true, jobs = new List<object>(), currentUserId = currentUserId, isSuperAdmin = UiAuthHelper.IsSuperAdmin };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobs = new List<object>(), currentUserId = 0 };
            }
        }

        /// <summary>Lấy thông tin reset (email, phone, password đã che) của lần restore có reset. jobId: ưu tiên lấy từ đúng job; không có thì tìm theo serverId+databaseName. Dùng cho popup chi tiết thông báo.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetRestoreResetInfo(int serverId, string databaseName, int jobId = 0)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", resetDetail = (string)null };
                var currentUserId = UiAuthHelper.CurrentUserId ?? 0;
                var accessibleIds = GetAccessibleServerIds();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    string payloadJson = null;
                    int? jobServerId = null;
                    string jobDbName = null;
                    int? jobStartedByUserId = null;
                    if (jobId > 0)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"SELECT Payload, ServerId, DatabaseName, StartedByUserId FROM BaJob WHERE Id = @id AND JobType = N'Restore'";
                            cmd.Parameters.AddWithValue("@id", jobId);
                            using (var r = cmd.ExecuteReader())
                            {
                                if (r.Read())
                                {
                                    payloadJson = r.IsDBNull(r.GetOrdinal("Payload")) ? null : r.GetString(r.GetOrdinal("Payload"));
                                    jobServerId = r.IsDBNull(r.GetOrdinal("ServerId")) ? (int?)null : r.GetInt32(r.GetOrdinal("ServerId"));
                                    jobDbName = r.IsDBNull(r.GetOrdinal("DatabaseName")) ? null : r.GetString(r.GetOrdinal("DatabaseName"));
                                    jobStartedByUserId = r.IsDBNull(r.GetOrdinal("StartedByUserId")) ? (int?)null : r.GetInt32(r.GetOrdinal("StartedByUserId"));
                                }
                            }
                        }
                        bool canViewByJob = !string.IsNullOrWhiteSpace(jobDbName) && (jobServerId.HasValue && accessibleIds != null && accessibleIds.Contains(jobServerId.Value) || (jobStartedByUserId.HasValue && jobStartedByUserId.Value == currentUserId) || UiAuthHelper.IsSuperAdmin);
                        if (canViewByJob)
                        {
                            if (jobServerId.HasValue)
                            {
                                using (var cmd = conn.CreateCommand())
                                {
                                    cmd.CommandText = @"SELECT TOP 1 Note FROM BaDatabaseRestoreLog WHERE ServerId = @sid AND DatabaseName = @db AND Note LIKE N'%Reset:%' ORDER BY RestoredAt DESC";
                                    cmd.Parameters.AddWithValue("@sid", jobServerId.Value);
                                    cmd.Parameters.AddWithValue("@db", jobDbName.Trim());
                                    var note = cmd.ExecuteScalar() as string;
                                    if (!string.IsNullOrEmpty(note) && note.IndexOf("Reset:", StringComparison.OrdinalIgnoreCase) >= 0)
                                    {
                                        var idx = note.IndexOf(" | Reset:", StringComparison.OrdinalIgnoreCase);
                                        var resetPart = idx >= 0 ? note.Substring(idx + 3).Trim() : note;
                                        return new { success = true, resetDetail = resetPart };
                                    }
                                }
                            }
                            if (!string.IsNullOrEmpty(payloadJson))
                            {
                                try
                                {
                                    var payload = Newtonsoft.Json.Linq.JObject.Parse(payloadJson);
                                    if (payload["withAutoReset"] != null && (bool)payload["withAutoReset"] || payload["emailForReset"] != null)
                                    {
                                        var email = (payload["emailForReset"] ?? "").ToString().Trim();
                                        var phone = (payload["phoneForReset"] ?? "").ToString().Trim();
                                        var password = (payload["passwordForReset"] ?? "").ToString().Trim();
                                        if (string.IsNullOrEmpty(email)) email = "(mặc định)";
                                        if (string.IsNullOrEmpty(phone)) phone = "(mặc định)";
                                        if (string.IsNullOrEmpty(password)) password = "***";
                                        return new { success = true, resetDetail = "Reset: Email=" + email + ", Phone=" + phone + ", Password=" + password };
                                    }
                                }
                                catch { }
                            }
                        }
                    }
                    if (accessibleIds != null && (accessibleIds.Count == 0 || !accessibleIds.Contains(serverId)))
                        return new { success = false, message = "Không có quyền truy cập server này.", resetDetail = (string)null };
                    if (string.IsNullOrWhiteSpace(databaseName)) databaseName = jobDbName ?? "";
                    if (string.IsNullOrWhiteSpace(databaseName))
                        return new { success = false, message = "Thiếu database.", resetDetail = (string)null };
                    serverId = jobServerId ?? serverId;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"SELECT TOP 1 Note FROM BaDatabaseRestoreLog WHERE ServerId = @sid AND DatabaseName = @db AND Note LIKE N'%Reset:%' ORDER BY RestoredAt DESC";
                        cmd.Parameters.AddWithValue("@sid", serverId);
                        cmd.Parameters.AddWithValue("@db", databaseName.Trim());
                        var note = cmd.ExecuteScalar() as string;
                        if (!string.IsNullOrEmpty(note) && note.IndexOf("Reset:", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            var idx = note.IndexOf(" | Reset:", StringComparison.OrdinalIgnoreCase);
                            var resetPart = idx >= 0 ? note.Substring(idx + 3).Trim() : note;
                            return new { success = true, resetDetail = resetPart };
                        }
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"SELECT TOP 1 Payload FROM BaJob WHERE JobType = N'Restore' AND ServerId = @sid AND DatabaseName = @db AND Status = N'Completed' AND Payload IS NOT NULL AND (Payload LIKE N'%emailForReset%' OR Payload LIKE N'%withAutoReset%') ORDER BY CompletedAt DESC";
                        cmd.Parameters.AddWithValue("@sid", serverId);
                        cmd.Parameters.AddWithValue("@db", databaseName.Trim());
                        payloadJson = cmd.ExecuteScalar() as string;
                    }
                    if (!string.IsNullOrEmpty(payloadJson))
                    {
                        try
                        {
                            var payload = Newtonsoft.Json.Linq.JObject.Parse(payloadJson);
                            var email = (payload["emailForReset"] ?? "").ToString().Trim();
                            var phone = (payload["phoneForReset"] ?? "").ToString().Trim();
                            var password = (payload["passwordForReset"] ?? "").ToString().Trim();
                            if (string.IsNullOrEmpty(email)) email = "(mặc định)";
                            if (string.IsNullOrEmpty(phone)) phone = "(mặc định)";
                            if (string.IsNullOrEmpty(password)) password = "***";
                            var resetDetail = "Reset: Email=" + email + ", Phone=" + phone + ", Password=" + password;
                            return new { success = true, resetDetail = resetDetail };
                        }
                        catch { }
                    }
                }
                return new { success = true, resetDetail = (string)null };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, resetDetail = (string)null };
            }
        }

        /// <summary>Danh sách job cho chuông: Restore/Backup = user có quyền server mới thấy; HR Helper = chỉ user làm mới thấy; đánh dấu đã đọc theo từng user.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetJobs()
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobs = new List<object>() };
                var currentUserId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var accessibleIds = GetAccessibleServerIds();
                var jobs = new List<object>();
                try
                {
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    {
                        conn.Open();
                        // Chuông: Restore/Backup chỉ người tạo job (StartedByUserId) hoặc Super Admin mới thấy; HR Helper chỉ user làm mới thấy.
                        var isSuperAdmin = UiAuthHelper.IsSuperAdmin;
                        var jobFilter = "(J.JobType IN (N'Restore', N'Backup') AND (J.StartedByUserId = @uid OR @isSuperAdmin = 1)) OR (J.JobType IN (N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperMultiDbAnalyze', N'HRHelperMultiDbReset', N'HRHelperDeleteEmployee') AND J.StartedByUserId = @uid)";
                        var sql = @"SELECT J.Id, J.JobType, J.ServerId, J.ServerName, J.DatabaseName, J.BackupFileName, J.FileName, J.SessionId, J.StartedByUserId,
  (CASE WHEN J.StartedByUserName IS NULL OR LTRIM(RTRIM(J.StartedByUserName)) = N'' OR J.StartedByUserName = N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))
    THEN ISNULL(U.UserName, N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))) ELSE J.StartedByUserName END) AS StartedByUserName,
  J.StartTime, J.Status, J.PercentComplete, J.Message, J.CompletedAt, J.Payload
FROM BaJob J
LEFT JOIN UiUser U ON U.UserId = J.StartedByUserId
WHERE J.JobType IN (N'Restore', N'Backup', N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperMultiDbAnalyze', N'HRHelperMultiDbReset', N'HRHelperDeleteEmployee')
  AND (J.Status = N'Running' OR (J.Status IN (N'Completed', N'Failed') AND J.CompletedAt >= DATEADD(day, -1, SYSDATETIME())))
  AND NOT EXISTS (SELECT 1 FROM BaJobDismissedByUser d WHERE d.JobId = J.Id AND d.UserId = @uid)
  AND (" + jobFilter + @")
ORDER BY CASE WHEN J.Status = N'Running' THEN 0 ELSE 1 END, J.StartTime DESC";
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = sql;
                            cmd.Parameters.AddWithValue("@uid", currentUserId);
                            cmd.Parameters.AddWithValue("@isSuperAdmin", isSuperAdmin ? 1 : 0);
                            using (var r = cmd.ExecuteReader())
                            {
                                while (r.Read())
                                {
                                    var jobType = r.IsDBNull(1) ? "" : r.GetString(1);
                                    var typeLabel = string.Equals(jobType, "Backup", StringComparison.OrdinalIgnoreCase) ? "Backup"
                                        : string.Equals(jobType, "Restore", StringComparison.OrdinalIgnoreCase) ? "Restore"
                                        : string.Equals(jobType, "HRHelperUpdateUser", StringComparison.OrdinalIgnoreCase) ? "Update User"
                                        : string.Equals(jobType, "HRHelperUpdateUserSignature", StringComparison.OrdinalIgnoreCase) ? "Update User Signature"
                                        : string.Equals(jobType, "HRHelperUpdateEmployee", StringComparison.OrdinalIgnoreCase) ? "Update Employee"
                                        : string.Equals(jobType, "HRHelperUpdateOther", StringComparison.OrdinalIgnoreCase) ? "Update Company/Other"
                                        : string.Equals(jobType, "HRHelperMultiDbAnalyze", StringComparison.OrdinalIgnoreCase) ? "Phân tích Multi-DB"
                                        : string.Equals(jobType, "HRHelperMultiDbReset", StringComparison.OrdinalIgnoreCase) ? "Reset Multi-DB"
                                        : string.Equals(jobType, "HRHelperDeleteEmployee", StringComparison.OrdinalIgnoreCase) ? "Delete Employee"
                                        : string.IsNullOrEmpty(jobType) ? "Job" : jobType;
                                    var backupFileName = string.Equals(jobType, "Backup", StringComparison.OrdinalIgnoreCase)
                                        ? (r.FieldCount > 6 && !r.IsDBNull(6) ? r.GetString(6) : "")
                                        : (r.FieldCount > 5 && !r.IsDBNull(5) ? r.GetString(5) : "");
                                    var payloadStr = r.FieldCount > 15 && !r.IsDBNull(15) ? r.GetString(15) : null;
                                    var withAutoReset = ParseWithAutoResetFromPayload(payloadStr);
                                    jobs.Add(new
                                    {
                                        id = r.GetInt32(0),
                                        type = jobType,
                                        typeLabel = typeLabel,
                                        serverId = r.FieldCount > 2 && !r.IsDBNull(2) ? r.GetInt32(2) : 0,
                                        serverName = r.FieldCount > 3 && !r.IsDBNull(3) ? r.GetString(3) : "",
                                        databaseName = r.FieldCount > 4 && !r.IsDBNull(4) ? r.GetString(4) : "",
                                        backupFileName = backupFileName,
                                        startedByUserId = r.FieldCount > 8 && !r.IsDBNull(8) ? r.GetInt32(8) : 0,
                                        startedByUserName = r.FieldCount > 9 && !r.IsDBNull(9) ? r.GetString(9) : "",
                                        startTime = r.FieldCount > 10 && !r.IsDBNull(10) ? r.GetDateTime(10).ToString("o") : null,
                                        sessionId = r.FieldCount > 7 && !r.IsDBNull(7) ? (int?)r.GetInt32(7) : (int?)null,
                                        status = r.FieldCount > 11 && !r.IsDBNull(11) ? r.GetString(11) : "",
                                        percentComplete = r.FieldCount > 12 && !r.IsDBNull(12) ? r.GetInt32(12) : 0,
                                        message = r.FieldCount > 13 && !r.IsDBNull(13) ? r.GetString(13) : "",
                                        completedAt = r.FieldCount > 14 && !r.IsDBNull(14) ? r.GetDateTime(14).ToString("o") : null,
                                        withAutoReset = withAutoReset,
                                        payload = r.FieldCount > 15 && !r.IsDBNull(15) ? r.GetString(15) : null
                                    });
                                }
                            }
                        }
                    }
                    var newBugs = new List<object>();
                    if (UiAuthHelper.IsSuperAdmin)
                    {
                        try
                        {
                            using (var conn2 = new SqlConnection(UiAuthHelper.ConnStr))
                            using (var cmd2 = conn2.CreateCommand())
                            {
                                cmd2.CommandText = @"SELECT F.Id, F.Title, F.CreatedAt, ISNULL(NULLIF(RTRIM(U.FullName),''), U.UserName) AS UserName
FROM UiFeedback F
LEFT JOIN UiUser U ON U.UserId = F.UserId
WHERE F.Category = N'Bug' AND F.Status NOT IN (N'Resolved', N'Closed', N'NotABug')
ORDER BY F.CreatedAt DESC";
                                conn2.Open();
                                using (var r2 = cmd2.ExecuteReader())
                                {
                                    while (r2.Read())
                                    {
                                        var created = r2.IsDBNull(2) ? (DateTime?)null : r2.GetDateTime(2);
                                        newBugs.Add(new
                                        {
                                            id = r2.GetInt32(0),
                                            title = r2.IsDBNull(1) ? "" : r2.GetString(1),
                                            createdAt = created.HasValue ? created.Value.ToString("o") : (string)null,
                                            userName = r2.IsDBNull(3) ? "" : r2.GetString(3)
                                        });
                                    }
                                }
                            }
                        }
                        catch { newBugs = new List<object>(); }
                    }
                    return new { success = true, jobs = jobs, currentUserId = currentUserId, newBugs = newBugs, isSuperAdmin = UiAuthHelper.IsSuperAdmin };
                }
                catch
                {
                    return new { success = true, jobs = new List<object>(), currentUserId = currentUserId, newBugs = new List<object>(), isSuperAdmin = UiAuthHelper.IsSuperAdmin };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobs = new List<object>() };
            }
        }

        /// <summary>HR Helper: trả về job đang chạy của user hiện tại (update user/employee/other). Dùng để hiển thị overlay.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetMyRunningHRHelperJobs()
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", runningCount = 0, jobs = new List<object>() };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var jobs = new List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT Id, JobType, ServerName, DatabaseName, StartTime, Status, Message, PercentComplete, ISNULL(Payload, N'')
FROM BaJob WHERE JobType IN (N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperMultiDbAnalyze', N'HRHelperMultiDbReset', N'HRHelperDeleteEmployee') AND StartedByUserId = @uid AND Status = N'Running'
ORDER BY StartTime DESC";
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var payloadStr = r.FieldCount > 8 && !r.IsDBNull(8) ? r.GetString(8) : "";
                            jobs.Add(new
                            {
                                id = r.GetInt32(0),
                                jobType = r.IsDBNull(1) ? "" : r.GetString(1),
                                serverName = r.FieldCount > 2 && !r.IsDBNull(2) ? r.GetString(2) : "",
                                databaseName = r.FieldCount > 3 && !r.IsDBNull(3) ? r.GetString(3) : "",
                                startTime = r.FieldCount > 4 && !r.IsDBNull(4) ? (DateTime?)r.GetDateTime(4) : (DateTime?)null,
                                status = r.FieldCount > 5 && !r.IsDBNull(5) ? r.GetString(5) : "",
                                message = r.FieldCount > 6 && !r.IsDBNull(6) ? r.GetString(6) : "",
                                percentComplete = r.FieldCount > 7 && !r.IsDBNull(7) ? (int?)r.GetInt32(7) : (int?)null,
                                payload = string.IsNullOrEmpty(payloadStr) ? null : payloadStr,
                                canCancel = true
                            });
                        }
                    }
                }
                return new { success = true, runningCount = jobs.Count, jobs = jobs };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, runningCount = 0, jobs = new List<object>() };
            }
        }

        /// <summary>Danh sách job restore (đang chạy + mới xong). Gọi từ BaJob, giữ để tương thích.</summary>
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
                        var sqlWithDismiss = @"SELECT J.Id, J.ServerId, J.ServerName, J.DatabaseName, J.BackupFileName, J.StartedByUserId,
  (CASE WHEN J.StartedByUserName IS NULL OR LTRIM(RTRIM(J.StartedByUserName)) = N'' OR J.StartedByUserName = N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))
    THEN ISNULL(U.UserName, N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))) ELSE J.StartedByUserName END) AS StartedByUserName,
  J.StartTime, J.SessionId, J.Status, J.PercentComplete, J.Message, J.CompletedAt, J.Payload
FROM BaJob J LEFT JOIN UiUser U ON U.UserId = J.StartedByUserId
WHERE J.JobType = N'Restore' AND (J.DismissedAt IS NULL) AND (J.Status = N'Running' OR (J.Status IN (N'Completed', N'Failed') AND J.CompletedAt >= DATEADD(day, -1, SYSDATETIME())))
ORDER BY CASE WHEN J.Status = N'Running' THEN 0 ELSE 1 END, J.StartTime DESC";
                        var sqlWithoutDismiss = @"SELECT J.Id, J.ServerId, J.ServerName, J.DatabaseName, J.BackupFileName, J.StartedByUserId,
  (CASE WHEN J.StartedByUserName IS NULL OR LTRIM(RTRIM(J.StartedByUserName)) = N'' OR J.StartedByUserName = N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))
    THEN ISNULL(U.UserName, N'User ' + CAST(ISNULL(J.StartedByUserId,0) AS NVARCHAR(20))) ELSE J.StartedByUserName END) AS StartedByUserName,
  J.StartTime, J.SessionId, J.Status, J.PercentComplete, J.Message, J.CompletedAt, J.Payload
FROM BaJob J LEFT JOIN UiUser U ON U.UserId = J.StartedByUserId
WHERE J.JobType = N'Restore' AND (J.Status = N'Running' OR (J.Status IN (N'Completed', N'Failed') AND J.CompletedAt >= DATEADD(day, -1, SYSDATETIME())))
ORDER BY CASE WHEN J.Status = N'Running' THEN 0 ELSE 1 END, J.StartTime DESC";
                        try
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = sqlWithDismiss;
                                using (var r = cmd.ExecuteReader())
                                {
                                    while (r.Read())
                                    {
                                        var payloadStr = r.FieldCount > 13 && !r.IsDBNull(13) ? r.GetString(13) : null;
                                        var withAutoReset = ParseWithAutoResetFromPayload(payloadStr);
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
                                            completedAt = r.IsDBNull(12) ? (DateTime?)null : r.GetDateTime(12),
                                            withAutoReset = withAutoReset
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
                                        var payloadStr = r.FieldCount > 13 && !r.IsDBNull(13) ? r.GetString(13) : null;
                                        var withAutoReset = ParseWithAutoResetFromPayload(payloadStr);
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
                                            completedAt = r.IsDBNull(12) ? (DateTime?)null : r.GetDateTime(12),
                                            withAutoReset = withAutoReset
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

        /// <summary>Đánh dấu job đã đọc cho user hiện tại (chỉ ẩn với user này, không ảnh hưởng user khác).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DismissJob(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"MERGE BaJobDismissedByUser AS t
USING (SELECT @jid AS JobId, @uid AS UserId) AS s ON t.JobId = s.JobId AND t.UserId = s.UserId
WHEN NOT MATCHED THEN INSERT (JobId, UserId, DismissedAt) VALUES (@jid, @uid, SYSDATETIME());";
                    cmd.Parameters.AddWithValue("@jid", jobId);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                    return new { success = true };
                }
            }
            catch (SqlException ex)
            {
                if (ex.Message.IndexOf("BaJobDismissedByUser", StringComparison.OrdinalIgnoreCase) >= 0)
                    return new { success = false, message = "Chưa tạo bảng BaJobDismissedByUser. Chạy script AddBaJobDismissedByUser.sql." };
                return new { success = false, message = ex.Message };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Đánh dấu job restore đã đọc. Giữ để tương thích; nên dùng DismissJob(jobId).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DismissRestoreJob(int jobId)
        {
            return DismissJob(jobId);
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
                // Nếu job đang ở phase "Reset Information" thì % do callback C# cập nhật; không lấy từ dm_exec_requests (session còn mở nhưng RESTORE đã xong, percent_complete không còn ý nghĩa)
                string currentMessage = null;
                int currentPctFromJob = 0;
                string jobStartTimeIso = null;
                try
                {
                    using (var appConnCheck = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmdCheck = appConnCheck.CreateCommand())
                    {
                        cmdCheck.CommandText = "SELECT Message, PercentComplete, StartTime FROM BaJob WHERE SessionId = @sess AND JobType = N'Restore' AND Status = N'Running'";
                        cmdCheck.Parameters.AddWithValue("@sess", sessionId);
                        appConnCheck.Open();
                        using (var rCheck = cmdCheck.ExecuteReader())
                        {
                            if (rCheck.Read())
                            {
                                if (!rCheck.IsDBNull(0)) currentMessage = rCheck.GetString(0);
                                if (!rCheck.IsDBNull(1)) currentPctFromJob = rCheck.GetInt32(1);
                                if (!rCheck.IsDBNull(2)) jobStartTimeIso = rCheck.GetDateTime(2).ToString("o");
                            }
                        }
                    }
                }
                catch { }
                var curMsgTrim = (currentMessage ?? "").Trim();
                const string hintRestore100 = "Server đang chạy bước sau RESTORE (shrink log / cấu hình / reset). % có thể giữ 100% vài phút — không phải lỗi nếu thời gian chạy vẫn tăng.";
                string hintForRestore100 = (string.Equals(curMsgTrim, "Restore", StringComparison.OrdinalIgnoreCase) && currentPctFromJob >= 99) ? hintRestore100 : null;
                if (curMsgTrim == "Reset Information" || curMsgTrim == "PostRestore" || string.Equals(curMsgTrim, "ShrinkLog", StringComparison.OrdinalIgnoreCase) || string.Equals(curMsgTrim, "Completing", StringComparison.OrdinalIgnoreCase))
                {
                    return new { success = true, percentComplete = currentPctFromJob, phase = curMsgTrim, completed = false, jobStartTime = jobStartTimeIso, phaseHint = hintForRestore100 };
                }
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
                                        // Không giảm % Restore từ dm_exec (RESTORE xong SPID có thể còn với percent_complete = 0).
                                        upd.CommandText = "UPDATE BaJob SET PercentComplete = CASE WHEN @pct > ISNULL(PercentComplete, 0) THEN @pct ELSE ISNULL(PercentComplete, 0) END WHERE SessionId = @sess AND JobType = N'Restore' AND Status = N'Running'";
                                        upd.Parameters.AddWithValue("@pct", pctInt);
                                        upd.Parameters.AddWithValue("@sess", sessionId);
                                        appConn.Open();
                                        upd.ExecuteNonQuery();
                                    }
                                }
                                catch { }
                                try
                                {
                                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                                    using (var rd = appConn.CreateCommand())
                                    {
                                        rd.CommandText = "SELECT ISNULL(PercentComplete, 0) FROM BaJob WHERE SessionId = @sess AND JobType = N'Restore' AND Status = N'Running'";
                                        rd.Parameters.AddWithValue("@sess", sessionId);
                                        appConn.Open();
                                        var o2 = rd.ExecuteScalar();
                                        if (o2 != null && o2 != DBNull.Value) pctInt = Convert.ToInt32(o2);
                                    }
                                }
                                catch { }
                                return new { success = true, percentComplete = pctInt, phase = "Restore", estimatedCompletionTime = eta, completed = false, jobStartTime = jobStartTimeIso, phaseHint = hintForRestore100 };
                            }
                        }
                    }
                }
                // Session không còn trong dm_exec_requests: có thể restore đã xong (hoặc đang chạy reset). Chỉ trả về completed khi Task đã set RestoreSessionStatus.
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
                    return new { success = true, percentComplete = 100, completed = true };
                }
                // Task chưa xong (ví dụ đang reset): trả về PercentComplete và Message (phase) từ BaJob
                var pctFromJob = 0;
                var phaseMessage = (string)null;
                var startIsoFallback = jobStartTimeIso;
                try
                {
                    using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = appConn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT PercentComplete, Message, StartTime FROM BaJob WHERE SessionId = @sess AND JobType = N'Restore' AND Status = N'Running'";
                        cmd.Parameters.AddWithValue("@sess", sessionId);
                        appConn.Open();
                        using (var r = cmd.ExecuteReader())
                        {
                            if (r.Read())
                            {
                                if (!r.IsDBNull(0)) pctFromJob = r.GetInt32(0);
                                if (!r.IsDBNull(1)) phaseMessage = r.GetString(1);
                                if (!r.IsDBNull(2)) startIsoFallback = r.GetDateTime(2).ToString("o");
                            }
                        }
                    }
                }
                catch { }
                var pm = (phaseMessage ?? "").Trim();
                var hintTail = (string.Equals(pm, "Restore", StringComparison.OrdinalIgnoreCase) && pctFromJob >= 99) ? hintRestore100 : null;
                return new { success = true, percentComplete = pctFromJob, phase = phaseMessage, completed = false, jobStartTime = startIsoFallback, phaseHint = hintTail };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, percentComplete = 0, completed = true };
            }
        }

        /// <summary>Giám sát restore từ web: đọc BaJob + sys.dm_exec_requests (session restore) + sys.databases (RESTORING/ONLINE).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetRestoreJobDiagnostics(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                if (jobId <= 0)
                    return new { success = false, message = "Thiếu jobId." };
                // Chỉ quản trị (Super Admin hoặc DatabaseManageServers) — không cho Developer/User thường xem dm_exec / trạng thái DB.
                if (!UiAuthHelper.IsSuperAdmin && !UiAuthHelper.HasFeature("DatabaseManageServers"))
                    return new { success = false, message = "Chỉ quản trị viên mới được xem giám sát SQL Server." };

                int serverId = 0;
                string serverName = null;
                string databaseName = null;
                int? sessionId = null;
                string status = null;
                string message = null;
                int percentComplete = 0;
                DateTime? startTime = null;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"SELECT ServerId, ServerName, DatabaseName, SessionId, Status, Message, PercentComplete, StartTime
                            FROM BaJob WHERE Id = @id AND JobType = N'Restore'";
                        cmd.Parameters.AddWithValue("@id", jobId);
                        using (var r = cmd.ExecuteReader())
                        {
                            if (!r.Read())
                                return new { success = false, message = "Không tìm thấy job restore." };
                            serverId = r.IsDBNull(0) ? 0 : r.GetInt32(0);
                            serverName = r.IsDBNull(1) ? null : r.GetString(1);
                            databaseName = r.IsDBNull(2) ? null : r.GetString(2);
                            sessionId = r.IsDBNull(3) ? (int?)null : r.GetInt32(3);
                            status = r.IsDBNull(4) ? null : r.GetString(4);
                            message = r.IsDBNull(5) ? null : r.GetString(5);
                            percentComplete = r.IsDBNull(6) ? 0 : r.GetInt32(6);
                            startTime = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7);
                        }
                    }
                }

                var s = GetServerInfo(serverId);
                if (s == null)
                    return new { success = false, message = "Không tìm thấy cấu hình server." };

                var hints = new List<string>();
                object sqlSession = null;
                object databaseOnServer = null;

                var masterConn = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
                try
                {
                    using (var sqlConn = new SqlConnection(masterConn))
                    {
                        sqlConn.Open();

                        if (sessionId.HasValue && sessionId.Value > 0)
                        {
                            using (var cmd = sqlConn.CreateCommand())
                            {
                                cmd.CommandTimeout = 20;
                                cmd.CommandText = @"SELECT r.status, r.command, r.wait_type, r.wait_time, r.last_wait_type,
                                    r.percent_complete, r.estimated_completion_time, r.cpu_time, r.total_elapsed_time, r.blocking_session_id
                                    FROM sys.dm_exec_requests r WHERE r.session_id = @spid";
                                cmd.Parameters.AddWithValue("@spid", sessionId.Value);
                                using (var r = cmd.ExecuteReader())
                                {
                                    if (r.Read())
                                    {
                                        var blk = r.IsDBNull(9) ? (int?)null : Convert.ToInt32(r.GetValue(9));
                                        sqlSession = new
                                        {
                                            found = true,
                                            sessionId = sessionId.Value,
                                            status = r.IsDBNull(0) ? null : r.GetString(0),
                                            command = r.IsDBNull(1) ? null : r.GetString(1),
                                            waitType = r.IsDBNull(2) ? null : r.GetString(2),
                                            waitTimeMs = r.IsDBNull(3) ? 0 : r.GetInt32(3),
                                            lastWaitType = r.IsDBNull(4) ? null : r.GetString(4),
                                            percentCompleteSql = r.IsDBNull(5) ? (double?)null : Convert.ToDouble(r.GetValue(5)),
                                            estimatedCompletionTimeMs = r.IsDBNull(6) ? (long?)null : Convert.ToInt64(r.GetValue(6)),
                                            cpuTimeMs = r.IsDBNull(7) ? (int?)null : r.GetInt32(7),
                                            totalElapsedTimeMs = r.IsDBNull(8) ? (int?)null : r.GetInt32(8),
                                            blockingSessionId = blk
                                        };
                                        if (blk.HasValue && blk.Value > 0)
                                            hints.Add("Session restore đang bị chặn bởi session_id " + blk.Value + " — có thể deadlock/blocking; cần DBA xử lý trên server.");
                                    }
                                    else
                                    {
                                        sqlSession = new { found = false, sessionId = sessionId.Value };
                                        var phase = (message ?? "").Trim();
                                        if (string.Equals(phase, "Restore", StringComparison.OrdinalIgnoreCase))
                                            hints.Add("Không còn dòng trong sys.dm_exec_requests cho session này: RESTORE có thể vừa kết thúc hoặc session đã đóng; kiểm tra trạng thái database bên dưới.");
                                        else
                                            hints.Add("Không có request SQL đang chạy trên session_id này — bình thường khi job đang ở bước C# (Reset / Shrink log / Hoàn tất). % trên UI lúc đó phản ánh tiến độ app, không phải percent_complete của RESTORE.");
                                    }
                                }
                            }
                        }
                        else
                            hints.Add("Job chưa có SessionId (đang chờ worker / chưa bắt đầu trên SQL).");

                        if (!string.IsNullOrWhiteSpace(databaseName))
                        {
                            var dbSafe = databaseName.Trim();
                            using (var cmd = sqlConn.CreateCommand())
                            {
                                cmd.CommandTimeout = 15;
                                cmd.CommandText = "SELECT name, state_desc, user_access_desc FROM sys.databases WHERE name = @db";
                                cmd.Parameters.AddWithValue("@db", dbSafe);
                                using (var r = cmd.ExecuteReader())
                                {
                                    if (r.Read())
                                    {
                                        var stateDesc = r.IsDBNull(1) ? null : r.GetString(1);
                                        databaseOnServer = new
                                        {
                                            found = true,
                                            name = r.IsDBNull(0) ? dbSafe : r.GetString(0),
                                            stateDesc = stateDesc,
                                            userAccessDesc = r.IsDBNull(2) ? null : r.GetString(2)
                                        };
                                        if (string.Equals(stateDesc, "RESTORING", StringComparison.OrdinalIgnoreCase))
                                            hints.Add("Database trên SQL đang ở trạng thái RESTORING — server vẫn đang restore (hoặc chưa RECOVERY xong).");
                                        else if (string.Equals(stateDesc, "ONLINE", StringComparison.OrdinalIgnoreCase))
                                        {
                                            var phase = (message ?? "").Trim();
                                            if (string.Equals(phase, "Restore", StringComparison.OrdinalIgnoreCase) && percentComplete >= 99)
                                                hints.Add("Database đã ONLINE nhưng job vẫn ghi phase Restore / % cao: thường là đồng bộ chậm hoặc đang chờ bước tiếp theo trong app.");
                                        }
                                    }
                                    else
                                    {
                                        databaseOnServer = new { found = false, name = dbSafe };
                                        hints.Add("Chưa thấy database trên server (có thể restore tạo DB mới chưa xong hoặc tên khác).");
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception exSql)
                {
                    hints.Add("Không truy vấn được SQL Server đích: " + exSql.Message);
                }

                if (string.Equals(status, "Running", StringComparison.OrdinalIgnoreCase) && percentComplete >= 99)
                    hints.Add("UI 100% (hoặc gần 100%) trong lúc job vẫn Running là bình thường nếu đang shrink log / reset dữ liệu / hoàn tất — thời gian có thể vài phút tùy kích thước DB.");

                return new
                {
                    success = true,
                    job = new
                    {
                        id = jobId,
                        serverId,
                        serverName,
                        databaseName,
                        sessionId,
                        status,
                        message = (message ?? "").Trim(),
                        percentComplete,
                        startTime = startTime.HasValue ? startTime.Value.ToString("o") : (string)null
                    },
                    sqlSession,
                    databaseOnServer,
                    hints,
                    queriedAt = DateTime.UtcNow.ToString("o")
                };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
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
                var restorePath = GetRestorePathForServer(serverId);
                if (string.IsNullOrEmpty(restorePath))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup/restore." };
                var backupFileNameNorm = NormalizeBackupRelativePath(backupFileName);
                if (backupFileNameNorm.Contains("..") || backupFileNameNorm.Contains("/"))
                    return new { success = false, message = "Tên file không hợp lệ." };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                var backupRoot = restorePath.Trim().TrimEnd('\\');
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
                    return new { success = false, message = "Chỉ Admin hoặc người đã restore database này mới được restore (ghi đè). Database N1 đã tồn tại do user khác restore." };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(masterConn))
                {
                    conn.Open();
                    if (!isNewDatabase)
                        EnsureExclusiveAccessForRestore(conn, databaseName);
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
                UserActionLogHelper.Log("DatabaseSearch.Restore", "file=" + backupFileName + " -> database=" + databaseName);
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

                var canDelete = UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers") || UiAuthHelper.HasFeature("DatabaseDelete");
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
                UserActionLogHelper.Log("DatabaseSearch.DeleteDatabase", "database=" + databaseName);
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
                var restorePath = GetRestorePathForServer(serverId);
                if (string.IsNullOrWhiteSpace(restorePath))
                    return new { success = true, files = new string[0], message = "Chưa cấu hình đường dẫn backup/restore. Sửa server → Đường dẫn backup hoặc Đường dẫn restore." };
                restorePath = restorePath.Trim().TrimEnd('\\');
                var s = GetServerInfo(serverId);

                // Ưu tiên: liệt kê trên máy SQL qua xp_cmdshell (giống SSMS, chỉ cần SA)
                string[] files;
                string msg;
                if (TryListBackupFilesViaSqlServer(s, restorePath, out files, out msg))
                    return new { success = true, files = files, message = msg };

                // Fallback: đọc từ máy chạy web (UNC hoặc path local — máy web cần truy cập được)
                if (!System.IO.Directory.Exists(restorePath))
                    return new { success = true, files = new string[0], message = "Thư mục không tồn tại trên máy chạy web: " + restorePath + ". Đường dẫn restore nên là path trên máy SQL hoặc UNC (vd: \\\\TênMáySQL\\Share)." };
                try
                {
                    files = System.IO.Directory.GetFiles(restorePath, "*.bak")
                        .Select(System.IO.Path.GetFileName)
                        .OrderByDescending(f => f)
                        .Take(100)
                        .ToArray();
                }
                catch (UnauthorizedAccessException)
                {
                    return new { success = true, files = new string[0], message = "Không có quyền đọc thư mục (máy web): " + restorePath + "." };
                }
                return new { success = true, files = files, message = files.Length == 0 ? "Không có file .bak trong thư mục: " + restorePath + "." : null };
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
                var backupRoot = GetRestorePathForServer(serverId);
                if (string.IsNullOrWhiteSpace(backupRoot))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup/restore.", folders = new object[0], files = new object[0] };
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
                var backupRoot = GetRestorePathForServer(serverId);
                if (string.IsNullOrWhiteSpace(backupRoot))
                    return new { success = false, message = "Chưa cấu hình đường dẫn backup/restore.", items = new List<object>() };
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
                if (!CanShrinkLogStatic())
                    return new { success = false, message = "Không có quyền lấy thông tin log.", list = new List<object>() };
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
                if (!CanShrinkDatabase(serverId, databaseName))
                    return new { success = false, message = "Không có quyền shrink log database này." };
                var s = GetServerInfo(serverId);
                if (s == null) return new { success = false, message = "Không tìm thấy server." };
                var info = GetDatabaseLogInfo(s, databaseName.Trim());
                if (info == null)
                    return new { success = false, message = "Không lấy được thông tin log." };
                if (!string.Equals(info.StateDesc ?? "", "ONLINE", StringComparison.OrdinalIgnoreCase))
                    return new { success = false, message = "Database đang ở trạng thái " + (string.IsNullOrEmpty(info.StateDesc) ? "không xác định" : info.StateDesc) + " nên chưa lấy log theo cách thông thường được. Vui lòng đợi database ONLINE.", dbState = info.StateDesc };
                return new { success = true, logFileName = info.FileName, logSizeMb = info.SizeMb, recoveryModel = info.RecoveryModel, dbState = info.StateDesc };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Chạy shrink log cho database (dùng nội bộ sau backup khi withShrinkLog). Ném exception nếu lỗi.</summary>
        private static void RunShrinkLogForDatabase(int serverId, string databaseName, int targetMb = 1)
        {
            var s = GetServerInfo(serverId);
            if (s == null) throw new InvalidOperationException("Không tìm thấy server.");
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
                throw new InvalidOperationException("Không tìm thấy file log.");
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
                            cmd.CommandTimeout = 1800;
                            cmd.CommandText = "CHECKPOINT; DBCC SHRINKFILE (N'" + logFileName.Replace("'", "''") + "', " + targetMb + "); CHECKPOINT; DBCC SHRINKFILE (N'" + logFileName.Replace("'", "''") + "', " + targetMb + ")";
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
                if (!CanShrinkDatabase(serverId, databaseName))
                    return new { success = false, message = "Không có quyền shrink log database này." };
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
                                cmd.CommandText = "CHECKPOINT; DBCC SHRINKFILE (N'" + logFileName.Replace("'", "''") + "', " + targetSizeMb + "); CHECKPOINT; DBCC SHRINKFILE (N'" + logFileName.Replace("'", "''") + "', " + targetSizeMb + ")";
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
                cmd.CommandText = "SELECT Id, ServerName, Port, Username, Password, BackupPath, RestorePath FROM BaDatabaseServer WHERE IsActive = 1 AND Id = @id";
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
                            BackupPath = r.FieldCount > 5 && !r.IsDBNull(5) ? r.GetString(5) : null,
                            RestorePath = r.FieldCount > 6 && !r.IsDBNull(6) ? r.GetString(6) : null
                        };
                }
            }
            return null;
        }

        /// <summary>Đường dẫn backup cho server: ưu tiên BackupPath của server, không có thì dùng Web.config. Dùng khi ghi file .bak.</summary>
        private static string GetBackupPathForServer(int serverId)
        {
            var s = GetServerInfo(serverId);
            var path = s != null && !string.IsNullOrWhiteSpace(s.BackupPath) ? s.BackupPath.Trim().TrimEnd('\\') : null;
            return path ?? GetDatabaseBackupPath();
        }

        /// <summary>Đường dẫn đọc file .bak khi restore: ưu tiên RestorePath, không có thì dùng BackupPath. Dùng khi liệt kê/chọn file restore.</summary>
        private static string GetRestorePathForServer(int serverId)
        {
            var s = GetServerInfo(serverId);
            var path = s != null && !string.IsNullOrWhiteSpace(s.RestorePath) ? s.RestorePath.Trim().TrimEnd('\\') : null;
            return path ?? GetBackupPathForServer(serverId);
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

        /// <summary>Kiểm tra ST_ProjectInfo bằng kết nối riêng (dùng khi quét song song). Connect Timeout ngắn để tránh treo.</summary>
        private static bool DatabaseHasStProjectInfoStandalone(ServerInfo s, string dbName)
        {
            if (string.IsNullOrEmpty(dbName)) return false;
            var connStr = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master") + ";Connect Timeout=5";
            try
            {
                using (var conn = new SqlConnection(connStr))
                using (var cmd = conn.CreateCommand())
                {
                    var safe = dbName.Trim().Replace("]", "]]");
                    cmd.CommandText = "SELECT 1 FROM [" + safe + "].sys.tables WHERE name = 'ST_ProjectInfo'";
                    cmd.CommandTimeout = 5;
                    conn.Open();
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

        /// <summary>
        /// Lấy tên file log, dung lượng (MB), recovery model và state từ master (sys.databases + sys.master_files).
        /// Không mở kết nối trực tiếp vào database đích để tránh lỗi "Cannot open database ... requested by login" khi DB vừa restore/chưa ONLINE.
        /// </summary>
        private static LogInfo GetDatabaseLogInfo(ServerInfo s, string db)
        {
            var connStr = BuildConnectionString(s.ServerName, s.Port, s.Username, s.Password, "master");
            using (var conn = new SqlConnection(connStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 10;
                cmd.CommandText = @"
SELECT d.state_desc,
       d.recovery_model_desc,
       mf.name AS log_name,
       CAST((mf.size * 8) / 1024 AS int) AS size_mb
FROM sys.databases d
LEFT JOIN sys.master_files mf ON d.database_id = mf.database_id AND mf.type = 1
WHERE d.name = @db";
                cmd.Parameters.AddWithValue("@db", db);
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (r.Read())
                    {
                        return new LogInfo
                        {
                            StateDesc = r.IsDBNull(0) ? "" : r.GetString(0),
                            RecoveryModel = r.IsDBNull(1) ? "" : r.GetString(1),
                            FileName = r.IsDBNull(2) ? null : r.GetString(2),
                            SizeMb = r.IsDBNull(3) ? 0 : r.GetInt32(3)
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
            public string RestorePath { get; set; }
        }

        private class LogInfo
        {
            public int SizeMb { get; set; }
            public string FileName { get; set; }
            public string RecoveryModel { get; set; }
            public string StateDesc { get; set; }
        }

        public class HRConnInfo
        {
            public string ConnectionString { get; set; }
            public string Server { get; set; }
            public string Database { get; set; }
        }
    }
}
