using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using BADesign;
using BADesign.Helpers;
using BADesign.Helpers.Security;
using BADesign.Helpers.Utils;

namespace BADesign.Pages
{
    public partial class HRHelper : System.Web.UI.Page
    {
        public string ConnectedServer { get; private set; } = "";
        public string ConnectedDatabase { get; private set; } = "";
        public bool IsMultiDbMode { get; private set; }
        public bool CanEditSettings => UiAuthHelper.HasFeature("Settings");
        public bool IsGuest => UiAuthHelper.IsAnonymous;

        /// <summary>URL to EncryptDecrypt page with current connection token k (for Generate Demo Reset Script).</summary>
        public string EncryptDecryptUrl
        {
            get
            {
                var k = Request.QueryString["k"];
                var baseUrl = ResolveUrl("~/EncryptDecrypt");
                if (string.IsNullOrWhiteSpace(k)) return baseUrl;
                return baseUrl + "?k=" + System.Web.HttpUtility.UrlEncode(k);
            }
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            var k = Request.QueryString["k"];
            if (string.IsNullOrWhiteSpace(k))
            {
                Response.Redirect(ResolveUrl("~/Pages/DatabaseSearch.aspx"));
                return;
            }
            var id = DataSecurityWrapper.DecryptConnectId(k);
            if (string.IsNullOrEmpty(id))
            {
                Response.Redirect(ResolveUrl("~/Pages/DatabaseSearch.aspx"));
                return;
            }
            var ctx = HttpContext.Current;

            if (id.StartsWith("multi_", StringComparison.OrdinalIgnoreCase))
            {
                var guid = id.Length > 6 ? id.Substring(6) : "";
                var multi = ctx?.Session?["HRConnMulti_" + guid] as DatabaseSearch.HRConnMultiInfo;
                if (multi == null || multi.Databases == null || multi.Databases.Count == 0)
                {
                    Response.Redirect(ResolveUrl("~/Pages/DatabaseSearch.aspx"));
                    return;
                }
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                {
                    Response.Redirect(ResolveUrl("~/DatabaseSearch") + "?msg=" + System.Web.HttpUtility.UrlEncode("Bạn không có quyền Multi-DB Reset."));
                    return;
                }
                IsMultiDbMode = true;
                ConnectedServer = multi.Server ?? "";
                ConnectedDatabase = "All (" + multi.Databases.Count + " databases)";
            }
            else
            {
                var info = ctx?.Session?["HRConn_" + id] as DatabaseSearch.HRConnInfo;
                if (info == null)
                {
                    Response.Redirect(ResolveUrl("~/Pages/DatabaseSearch.aspx"));
                    return;
                }
                ConnectedServer = info.Server ?? "";
                ConnectedDatabase = info.Database ?? "";
            }
            ucBaTopBar.PageTitle = "HR Helper";
        }

        private static DatabaseSearch.HRConnInfo GetConnectionFromToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;
            var id = DataSecurityWrapper.DecryptConnectId(token);
            if (string.IsNullOrEmpty(id) || id.StartsWith("multi_", StringComparison.OrdinalIgnoreCase)) return null;
            return HttpContext.Current?.Session?["HRConn_" + id] as DatabaseSearch.HRConnInfo;
        }

        private static DatabaseSearch.HRConnMultiInfo GetMultiConnFromToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;
            var id = DataSecurityWrapper.DecryptConnectId(token);
            if (string.IsNullOrEmpty(id) || !id.StartsWith("multi_", StringComparison.OrdinalIgnoreCase)) return null;
            var guid = id.Length > 6 ? id.Substring(6) : "";
            return HttpContext.Current?.Session?["HRConnMulti_" + guid] as DatabaseSearch.HRConnMultiInfo;
        }

        private const string UsersQueryBase = @"
                        SELECT U.ID As UserID, U.UserName, E.ID AS EmployeeID, E.LocalEmployeeID,
                               E.FullName AS EmployeeName, U.UserEmailAddress AS UserEmail,
                               CASE WHEN ISNULL(U.IsDefaultTenantAdmin, 0) = 1 OR G.ID IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsTenantAdmin,
                               ISNULL(U.IsWindowADAccount, 0) AS IsWindowADAccount,
                               U.Password,
                               E.BusinessEmailAddress AS EmployeeBusinessEmail,
                               E.PersonalEmailAddress AS EmployeePersonalEmail,
                               T.Code AS Tenant,
                               T.ID AS TenantID,
                               U.IsActive,
                               U.IsApproved
                        FROM Security_Users AS U
                        INNER JOIN MultiTenant_Tenants AS T ON T.ID = U.TenantID
                        LEFT JOIN Staffing_Employees AS E ON E.ID = U.EmployeeID
                        OUTER APPLY ( SELECT GU.ID FROM Security_GroupUsers AS GU INNER JOIN Security_Groups AS G ON G.ID = GU.GroupID WHERE GU.UserID = U.ID AND G.GroupType = 'Tenant' ) AS G
                        WHERE U.IsActive = 1";

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetUsersCount(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT COUNT(*) FROM (" + UsersQueryBase + ") X";
                    conn.Open();
                    var total = Convert.ToInt32(cmd.ExecuteScalar());
                    return new { success = true, total = total };
                }
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        /// <summary>Load user theo trang (server-side paging). Tránh load hết 50k+ user một lần gây treo.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadUsersChunk(string k, int offset, int count)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var list = new List<object>();
                var take = Math.Max(1, Math.Min(5000, count));
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = UsersQueryBase + " ORDER BY U.ID OFFSET @off ROWS FETCH NEXT @cnt ROWS ONLY";
                    cmd.Parameters.AddWithValue("@off", offset);
                    cmd.Parameters.AddWithValue("@cnt", take);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var employeeID = MyConvert.To<long?>(r.GetValue(2));
                            var rawBiz = MyConvert.To<string>(r.GetValue(9));
                            var rawPer = MyConvert.To<string>(r.GetValue(10));
                            string biz = "", per = "";
                            if (!string.IsNullOrWhiteSpace(rawBiz)) { try { biz = DataSecurityWrapper.DecryptData<string>(rawBiz, employeeID) ?? ""; } catch { } }
                            if (!string.IsNullOrWhiteSpace(rawPer)) { try { per = DataSecurityWrapper.DecryptData<string>(rawPer, employeeID) ?? ""; } catch { } }
                            list.Add(new
                            {
                                userID = MyConvert.To<long>(r.GetValue(0)),
                                userName = MyConvert.To<string>(r.GetValue(1)) ?? "",
                                employeeID = employeeID,
                                localEmployeeID = MyConvert.To<string>(r.GetValue(3)) ?? "",
                                employeeName = MyConvert.To<string>(r.GetValue(4)) ?? "",
                                userEmail = MyConvert.To<string>(r.GetValue(5)) ?? "",
                                isTenantAdmin = MyConvert.To<bool>(r.GetValue(6)),
                                isWindowADAccount = MyConvert.To<bool>(r.GetValue(7)),
                                password = MyConvert.To<string>(r.GetValue(8)) ?? "",
                                businessEmail = biz,
                                personalEmail = per,
                                tenant = MyConvert.To<string>(r.GetValue(11)) ?? "",
                                tenantID = MyConvert.To<long?>(r.GetValue(12)),
                                isActive = MyConvert.To<bool>(r.GetValue(13)),
                                isApproved = MyConvert.To<bool>(r.GetValue(14))
                            });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadUsers(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database. Vui lòng Connect từ Database Search." };
                var list = new List<object>();
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = UsersQueryBase + " ORDER BY U.ID";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var employeeID = MyConvert.To<long?>(r.GetValue(2));
                            var rawBiz = MyConvert.To<string>(r.GetValue(9));
                            var rawPer = MyConvert.To<string>(r.GetValue(10));
                            string biz = "", per = "";
                            if (!string.IsNullOrWhiteSpace(rawBiz)) { try { biz = DataSecurityWrapper.DecryptData<string>(rawBiz, employeeID) ?? ""; } catch { } }
                            if (!string.IsNullOrWhiteSpace(rawPer)) { try { per = DataSecurityWrapper.DecryptData<string>(rawPer, employeeID) ?? ""; } catch { } }
                            list.Add(new
                            {
                                userID = MyConvert.To<long>(r.GetValue(0)),
                                userName = MyConvert.To<string>(r.GetValue(1)) ?? "",
                                employeeID = employeeID,
                                localEmployeeID = MyConvert.To<string>(r.GetValue(3)) ?? "",
                                employeeName = MyConvert.To<string>(r.GetValue(4)) ?? "",
                                userEmail = MyConvert.To<string>(r.GetValue(5)) ?? "",
                                isTenantAdmin = MyConvert.To<bool>(r.GetValue(6)),
                                isWindowADAccount = MyConvert.To<bool>(r.GetValue(7)),
                                password = MyConvert.To<string>(r.GetValue(8)) ?? "",
                                businessEmail = biz,
                                personalEmail = per,
                                tenant = MyConvert.To<string>(r.GetValue(11)) ?? "",
                                tenantID = MyConvert.To<long?>(r.GetValue(12)),
                                isActive = MyConvert.To<bool>(r.GetValue(13)),
                                isApproved = MyConvert.To<bool>(r.GetValue(14))
                            });
                        }
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        /// <summary>Chạy update user (dùng nội bộ cho WebMethod và job nền).</summary>
        private static Tuple<bool, string> ExecuteUpdateUsersCore(string connectionString, List<long> userIds, bool isUpdatePassword, string password, int methodHash, bool isUpdateEmail, string email, bool ignoreWindowsAD)
        {
            var hashType = methodHash == 512 ? SimpleHash.HashType.SHA512 : SimpleHash.HashType.SHA256;
            var chosenEmail = isUpdateEmail ? (email ?? "").Trim() : null;
            var updateUsers = LoadUsersForUpdate(connectionString, userIds);
            if (updateUsers == null || updateUsers.Count == 0)
                return Tuple.Create(false, "Không tìm thấy user cần update.");
            try
            {
                var userTable = BuildUserDataTable(updateUsers, isUpdatePassword, password, hashType, isUpdateEmail, chosenEmail, ignoreWindowsAD);
                using (var conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 600;
                        cmd.CommandText = @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET LOCK_TIMEOUT 5000;
IF OBJECT_ID('tempdb..#UserTemp') IS NOT NULL DROP TABLE #UserTemp;
CREATE TABLE #UserTemp(
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    [Password] NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    IsWindowADAccount BIT NOT NULL,
    IsRequireChangePassword BIT NOT NULL,
    LastLoginDateTime DATETIME NULL,
    IsLockedOut BIT NOT NULL,
    LastPasswordChangedDateTime DATETIME NULL,
    FailedPasswordAttemptCount INT NOT NULL,
    ReceiveEmailTypeID INT NULL,
    UserEmailAddress NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    UserName NVARCHAR(100) COLLATE DATABASE_DEFAULT NOT NULL,
    EmployeeBusinessEmail NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    EmployeePersonalEmail NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    UserID BIGINT NULL
);";
                        cmd.ExecuteNonQuery();
                    }

                    using (var bulk = new SqlBulkCopy(conn))
                    {
                        bulk.DestinationTableName = "#UserTemp";
                        bulk.BulkCopyTimeout = 660;
                        bulk.BatchSize = 5000;
                        bulk.ColumnMappings.Add("Password", "Password");
                        bulk.ColumnMappings.Add("IsWindowADAccount", "IsWindowADAccount");
                        bulk.ColumnMappings.Add("IsRequireChangePassword", "IsRequireChangePassword");
                        bulk.ColumnMappings.Add("LastLoginDateTime", "LastLoginDateTime");
                        bulk.ColumnMappings.Add("IsLockedOut", "IsLockedOut");
                        bulk.ColumnMappings.Add("LastPasswordChangedDateTime", "LastPasswordChangedDateTime");
                        bulk.ColumnMappings.Add("FailedPasswordAttemptCount", "FailedPasswordAttemptCount");
                        bulk.ColumnMappings.Add("ReceiveEmailTypeID", "ReceiveEmailTypeID");
                        bulk.ColumnMappings.Add("UserEmailAddress", "UserEmailAddress");
                        bulk.ColumnMappings.Add("UserName", "UserName");
                        bulk.ColumnMappings.Add("EmployeeBusinessEmail", "EmployeeBusinessEmail");
                        bulk.ColumnMappings.Add("EmployeePersonalEmail", "EmployeePersonalEmail");
                        bulk.WriteToServer(userTable);
                    }

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 600;
                        cmd.CommandText = @"
UPDATE UT SET UT.UserID = U.ID
FROM #UserTemp UT
JOIN dbo.Security_Users U WITH (READCOMMITTED) ON U.UserName = UT.UserName COLLATE DATABASE_DEFAULT;";
                        cmd.ExecuteNonQuery();
                        cmd.CommandText = "CREATE NONCLUSTERED INDEX IX_UT_UserID ON #UserTemp(UserID);";
                        try { cmd.ExecuteNonQuery(); } catch { /* ignore */ }
                    }

                    int maxRowId = 0;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ISNULL(MAX(RowId),0) FROM #UserTemp;";
                        var o = cmd.ExecuteScalar();
                        maxRowId = (o == null || o == DBNull.Value) ? 0 : Convert.ToInt32(o);
                    }

                    if (maxRowId == 0)
                        return Tuple.Create(true, "Không có bản ghi nào cần update.");
                    const int batchSize = 2000;
                    int totalBatches = (int)Math.Ceiling(maxRowId / (double)batchSize);

                    for (int b = 0; b < totalBatches; b++)
                    {
                        int start = b * batchSize + 1;
                        int end = Math.Min(maxRowId, start + batchSize - 1);

                        for (int attempt = 1; attempt <= 3; attempt++)
                        {
                            try
                            {
                                using (var cmd = conn.CreateCommand())
                                {
                                    cmd.CommandTimeout = 120;
                                    cmd.Parameters.AddWithValue("@Start", start);
                                    cmd.Parameters.AddWithValue("@End", end);
                                    cmd.CommandText = @"
SET LOCK_TIMEOUT 5000;
BEGIN TRAN;
UPDATE U SET U.[Password]=UT.[Password], U.IsRequireChangePassword=UT.IsRequireChangePassword,
    U.LastLoginDateTime=UT.LastLoginDateTime, U.IsLockedOut=UT.IsLockedOut, U.IsWindowADAccount=UT.IsWindowADAccount,
    U.LastPasswordChangedDateTime=UT.LastPasswordChangedDateTime, U.FailedPasswordAttemptCount=UT.FailedPasswordAttemptCount,
    U.ReceiveEmailTypeID=UT.ReceiveEmailTypeID, U.UserEmailAddress=UT.UserEmailAddress
FROM #UserTemp UT
JOIN dbo.Security_Users U WITH (ROWLOCK, UPDLOCK) ON U.ID = UT.UserID
WHERE UT.RowId BETWEEN @Start AND @End AND UT.UserID IS NOT NULL;
UPDATE E SET E.PersonalEmailAddress=UT.EmployeePersonalEmail, E.BusinessEmailAddress=UT.EmployeeBusinessEmail
FROM #UserTemp UT
JOIN dbo.Security_Users U WITH (READCOMMITTED) ON U.ID = UT.UserID
JOIN dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK) ON E.ID = U.EmployeeID
WHERE UT.RowId BETWEEN @Start AND @End AND UT.UserID IS NOT NULL;
COMMIT TRAN;";
                                    cmd.ExecuteNonQuery();
                                }
                                break;
                            }
                            catch (Exception ex)
                            {
                                if (attempt == 3) throw new Exception("Batch update failed: " + ex.Message);
                            }
                        }
                    }
                }
                return Tuple.Create(true, "Đã update " + updateUsers.Count + " user.");
            }
            catch (Exception ex)
            {
                return Tuple.Create(false, ex.Message);
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateUsers(string k, List<long> userIds, bool isUpdatePassword, string password, int methodHash, bool isUpdateEmail, string email, bool ignoreWindowsAD)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database. Vui lòng Connect từ Database Search." };
                if (userIds == null || userIds.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 user." };
                if (!isUpdatePassword && !isUpdateEmail)
                    return new { success = false, message = "Chọn ít nhất 1 option (Password hoặc Email)." };
                if (isUpdatePassword && string.IsNullOrWhiteSpace(password))
                    return new { success = false, message = "Nhập password khi update password." };
                var result = ExecuteUpdateUsersCore(info.ConnectionString, userIds, isUpdatePassword, password, methodHash, isUpdateEmail, email, ignoreWindowsAD);
                return new { success = result.Item1, message = result.Item2 };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Đưa update user vào job nền; push SignalR khi xong. Client hiển thị overlay và chuông.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartHRHelperUpdateUserJob(string k, List<long> userIds, bool isUpdatePassword, string password, int methodHash, bool isUpdateEmail, string email, bool ignoreWindowsAD)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobId = 0 };
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database.", jobId = 0 };
                if (userIds == null || userIds.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 user.", jobId = 0 };
                if (!isUpdatePassword && !isUpdateEmail)
                    return new { success = false, message = "Chọn ít nhất 1 option (Password hoặc Email).", jobId = 0 };
                if (isUpdatePassword && string.IsNullOrWhiteSpace(password))
                    return new { success = false, message = "Nhập password khi update password.", jobId = 0 };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var connStr = info.ConnectionString;
                var serverName = info.Server ?? "";
                var databaseName = info.Database ?? "";
                int jobId;
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerName, DatabaseName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete)
VALUES (N'HRHelperUpdateUser', @sname, @db, @uid, @uname, SYSDATETIME(), N'Running', 0); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                    cmd.Parameters.AddWithValue("@sname", serverName);
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@uname", userName);
                    appConn.Open();
                    jobId = (int)cmd.ExecuteScalar();
                }
                var detail = "database=" + databaseName + ", userIds=" + (userIds?.Count ?? 0);
                if (isUpdatePassword) detail += ", password=updated";
                if (isUpdateEmail && !string.IsNullOrWhiteSpace(email)) detail += ", email=" + email.Trim();
                UserActionLogHelper.Log("HRHelper.UpdateUser", detail);
                System.Threading.Tasks.Task.Run(() =>
                {
                    try
                    {
                        var result = ExecuteUpdateUsersCore(connStr, userIds, isUpdatePassword, password, methodHash, isUpdateEmail, email, ignoreWindowsAD);
                        UpdateBaJobCompleted(jobId, "HRHelperUpdateUser", result.Item1, result.Item2);
                    }
                    catch (Exception ex)
                    {
                        UpdateBaJobCompleted(jobId, "HRHelperUpdateUser", false, ex.Message);
                    }
                    BaJobHubHelper.PushJobsUpdated("HRHelperUpdateUser", null, userId);
                });
                return new { success = true, jobId = jobId, message = "Đã đưa update user vào hàng đợi." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        private static void UpdateBaJobCompleted(int jobId, string jobType, bool success, string message)
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaJob SET Status = @st, PercentComplete = 100, Message = @msg, CompletedAt = SYSDATETIME() WHERE Id = @id AND JobType = @jt";
                    cmd.Parameters.AddWithValue("@st", success ? "Completed" : "Failed");
                    cmd.Parameters.AddWithValue("@msg", (object)message ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    cmd.Parameters.AddWithValue("@jt", jobType);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
            }
            catch { }
        }

        private sealed class UserForUpdate
        {
            public long UserID { get; set; }
            public string UserName { get; set; }
            public long? EmployeeID { get; set; }
            public bool IsWindowADAccount { get; set; }
            public string Password { get; set; }
            public string UserEmail { get; set; }
            public string PersonalEmail { get; set; }
            public string BusinessEmail { get; set; }
        }

        private static List<UserForUpdate> LoadUsersForUpdate(string connectionString, List<long> userIds)
        {
            var list = new List<UserForUpdate>();
            var ids = string.Join(",", userIds.Select(x => x.ToString()));

            using (var conn = new SqlConnection(connectionString))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT U.ID, U.UserName, E.ID AS EmployeeID, ISNULL(U.IsWindowADAccount,0) AS IsWindowADAccount,
       U.[Password], U.UserEmailAddress, E.PersonalEmailAddress, E.BusinessEmailAddress
FROM Security_Users U
LEFT JOIN Staffing_Employees E ON E.ID = U.EmployeeID
WHERE U.IsActive = 1 AND U.ID IN (" + ids + ") ORDER BY U.ID";

                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        list.Add(new UserForUpdate
                        {
                            UserID = MyConvert.To<long>(r.GetValue(0)),
                            UserName = MyConvert.To<string>(r.GetValue(1)) ?? "",
                            EmployeeID = MyConvert.To<long?>(r.GetValue(2)),
                            IsWindowADAccount = MyConvert.To<bool>(r.GetValue(3)),
                            Password = MyConvert.To<string>(r.GetValue(4)),
                            UserEmail = MyConvert.To<string>(r.GetValue(5)),
                            PersonalEmail = MyConvert.To<string>(r.GetValue(6)),
                            BusinessEmail = MyConvert.To<string>(r.GetValue(7))
                        });
                    }
                }
            }

            return list;
        }

        private static DataTable BuildUserDataTable(List<UserForUpdate> updateUsers, bool isUpdatePassword, string inputPassword,
            SimpleHash.HashType hashType, bool isUpdateEmail, string chosenEmail, bool ignoreWindowsAD)
        {
            var dt = new DataTable();
            dt.Columns.Add("Password", typeof(string));
            dt.Columns.Add("IsWindowADAccount", typeof(bool));
            dt.Columns.Add("IsRequireChangePassword", typeof(bool));
            dt.Columns.Add("LastLoginDateTime", typeof(DateTime));
            dt.Columns.Add("IsLockedOut", typeof(bool));
            dt.Columns.Add("LastPasswordChangedDateTime", typeof(DateTime));
            dt.Columns.Add("FailedPasswordAttemptCount", typeof(int));
            dt.Columns.Add("ReceiveEmailTypeID", typeof(int));
            dt.Columns.Add("UserEmailAddress", typeof(string));
            dt.Columns.Add("UserName", typeof(string));
            dt.Columns.Add("EmployeeBusinessEmail", typeof(string));
            dt.Columns.Add("EmployeePersonalEmail", typeof(string));

            var expire = DateTime.Now.AddYears(1);

            foreach (var u in updateUsers)
            {
                string encPwd = u.Password;
                if (isUpdatePassword)
                    encPwd = SimpleHash.ComputeHash((u.UserName ?? "").Trim().ToLower() + inputPassword, hashType);

                string businessEmail = u.BusinessEmail;
                string personalEmail = u.PersonalEmail;
                string userEmail = u.UserEmail;

                if (isUpdateEmail)
                {
                    if (u.EmployeeID.HasValue)
                    {
                        businessEmail = DataSecurityWrapper.EncryptData(chosenEmail, u.EmployeeID);
                        personalEmail = DataSecurityWrapper.EncryptData(chosenEmail, u.EmployeeID);
                    }
                    else
                    {
                        businessEmail = null;
                        personalEmail = null;
                    }
                    userEmail = chosenEmail;
                }

                bool finalIsAD = u.IsWindowADAccount;
                string finalPwd = encPwd;

                if (finalIsAD && ignoreWindowsAD)
                {
                    finalPwd = null;
                    finalIsAD = true;
                }
                else if (finalIsAD && !ignoreWindowsAD)
                    finalIsAD = false;

                var row = dt.NewRow();
                row["Password"] = (object)finalPwd ?? DBNull.Value;
                row["IsWindowADAccount"] = finalIsAD;
                row["IsRequireChangePassword"] = false;
                row["LastLoginDateTime"] = expire;
                row["IsLockedOut"] = false;
                row["LastPasswordChangedDateTime"] = expire;
                row["FailedPasswordAttemptCount"] = 0;
                row["ReceiveEmailTypeID"] = 2;
                row["UserEmailAddress"] = (object)userEmail ?? DBNull.Value;
                row["UserName"] = u.UserName ?? "";
                row["EmployeeBusinessEmail"] = (object)businessEmail ?? DBNull.Value;
                row["EmployeePersonalEmail"] = (object)personalEmail ?? DBNull.Value;
                dt.Rows.Add(row);
            }

            return dt;
        }

        /* WinForms: OU.NameEN AS ManagerOrganizionStructure; we use OrganizionStructure for OU to avoid duplicate alias with M.ManagerOrganizionStructure. */
        private const string EmployeesQueryBase = @"
SELECT E.ID AS EmployeeID, E.LocalEmployeeID AS EmployeeLocalID, E.FullName AS EmployeeName, E.EnglishName AS EmployeeEnglishName, E.DateOfBirth,
       E.PersonalEmailAddress, E.BusinessEmailAddress, E.MobilePhone1, E.MobilePhone2,
       T.ServiceStartDate,
       TSA.ID AS ALPolicyID, TSA.NameEN AS ALPolicy,
       TS.ID AS TimeSheetPolicyID, TS.NameEN AS TimeSheetPolicy,
       OS.ID AS OrganizionStructureID, OU.NameEN AS OrganizionStructure,
       M.ManagerEmployeeID, M.ManagerLocalEmployeeID, M.ManagerFullName, M.ManagerUserName, M.ManagerOrganizionStructureID, M.ManagerOrganizionStructure,
       U.ID AS UserID, U.UserName, E.PayslipPassword,
       CAST(C.ID AS VARCHAR(10)) + ' - ' + C.Code + ' - ' + C.NameEN AS CompanyInfo
FROM Staffing_Transactions AS T
INNER JOIN Staffing_OrganizationStructures AS OS ON OS.ID = T.OrganizationStructureID
INNER JOIN Staffing_OrganizationUnits AS OU ON OU.ID = OS.OrgUnitID
INNER JOIN Staffing_Employees AS E ON E.ID = T.EmployeeID
OUTER APPLY ( SELECT TOP 1 U.* FROM Security_Users AS U WHERE U.EmployeeID = E.ID ORDER BY U.IsActive DESC ) AS U
INNER JOIN TIM_TimeSheetPolicies AS TS ON TS.ID = T.TimeSheetPolicyID
INNER JOIN TIM_TimeSheetALPolicies AS TSA ON TSA.ID = T.TimeSheetALPolicyID
INNER JOIN MultiTenant_Companies AS C ON C.ID = T.CompanyID
OUTER APPLY (
    SELECT ME.LocalEmployeeID AS ManagerLocalEmployeeID, ME.ID AS ManagerEmployeeID, ME.FullName AS ManagerFullName,
           MOS.ID AS ManagerOrganizionStructureID, MOU.NameEN AS ManagerOrganizionStructure,
           (SELECT TOP 1 MU.UserName FROM Security_Users AS MU WHERE MU.EmployeeID = ME.ID ORDER BY MU.IsActive DESC) AS ManagerUserName
    FROM Staffing_ManagersOrgStructureActives AS MOSA
    INNER JOIN Staffing_Employees AS ME ON ME.ID = MOSA.EmployeeID
    INNER JOIN Staffing_Transactions AS MT ON MT.EmployeeID = ME.ID AND MT.IsActiveTransaction = 1
    INNER JOIN Staffing_OrganizationStructures AS MOS ON MOS.ID = MT.OrganizationStructureID
    INNER JOIN Staffing_OrganizationUnits AS MOU ON MOU.ID = MOS.OrgUnitID
    WHERE MOSA.OrganizationStructureID = T.OrganizationStructureID AND MOSA.ManagerTypeID = 1 AND MOSA.TenantID = T.TenantID AND MOSA.CompanyID = T.CompanyID
) AS M
WHERE T.IsActiveTransaction = 1";

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ClearEmployeesSessionForCompany(string k, int? companyID)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var sessionKey = "HR_Employees_" + (companyID.HasValue ? companyID.Value.ToString() : "All");
                HttpContext.Current.Session.Remove(sessionKey);
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveEmployeesChunkToSession(string k, int? companyID, List<object> chunk, bool isFirstChunk = false)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var sessionKey = "HR_Employees_" + (companyID.HasValue ? companyID.Value.ToString() : "All");
                var session = HttpContext.Current.Session;
                if (isFirstChunk)
                    session.Remove(sessionKey);
                var list = session[sessionKey] as List<object>;
                if (list == null)
                {
                    list = new List<object>();
                    session[sessionKey] = list;
                }
                if (chunk != null && chunk.Count > 0)
                    list.AddRange(chunk);
                return new { success = true, count = list.Count };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmployeesFromSession(string k, int? companyID)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var sessionKey = "HR_Employees_" + (companyID.HasValue ? companyID.Value.ToString() : "All");
                var session = HttpContext.Current.Session;
                if (session == null)
                    return new { success = false, message = "Session không tồn tại." };
                var employees = session[sessionKey] as List<object>;
                if (employees == null || employees.Count == 0)
                    return new { success = false, message = "Không có data trong session cho key: " + sessionKey };
                return new { success = true, list = employees, count = employees.Count };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ClearEmployeesSession(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                // Clear all employee sessions for this connection
                var keys = new List<string>();
                foreach (string key in HttpContext.Current.Session.Keys)
                {
                    if (key != null && key.StartsWith("HR_Employees_"))
                        keys.Add(key);
                }
                foreach (var key in keys)
                {
                    HttpContext.Current.Session.Remove(key);
                }
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private const string UsersSessionKey = "HR_Users";

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ClearUsersSession(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                HttpContext.Current.Session.Remove(UsersSessionKey);
                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveUsersChunkToSession(string k, List<object> chunk, bool isFirstChunk = false)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var session = HttpContext.Current.Session;
                if (isFirstChunk)
                    session.Remove(UsersSessionKey);
                var list = session[UsersSessionKey] as List<object>;
                if (list == null)
                {
                    list = new List<object>();
                    session[UsersSessionKey] = list;
                }
                if (chunk != null && chunk.Count > 0)
                    list.AddRange(chunk);
                return new { success = true, count = list.Count };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadUsersFromSession(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var list = HttpContext.Current.Session[UsersSessionKey] as List<object>;
                if (list == null || list.Count == 0)
                    return new { success = false, message = "Không có data users trong session." };
                return new { success = true, list = list, count = list.Count };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateUsersInSession(string k, List<long> userIds, bool isUpdatePassword, bool isUpdateEmail, string email)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var session = HttpContext.Current.Session;
                if (session == null)
                    return new { success = false, message = "Session không tồn tại." };
                var list = session[UsersSessionKey] as List<object>;
                if (list == null || list.Count == 0)
                    return new { success = false, message = "Không có data users trong session." };
                var userIdSet = new HashSet<long>(userIds);
                foreach (var item in list)
                {
                    var user = item as Dictionary<string, object>;
                    if (user == null) continue;
                    var uid = MyConvert.To<long>(user.ContainsKey("userID") ? user["userID"] : 0);
                    if (!userIdSet.Contains(uid)) continue;
                    if (isUpdateEmail && !string.IsNullOrWhiteSpace(email))
                        user["userEmail"] = email;
                }
                return new { success = true, count = list.Count };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateEmployeesInSession(string k, int? companyID, List<long> employeeIds,
            bool updPersonal, string personalEmail, bool updBusiness, string businessEmail,
            bool updM1, string m1, bool updM2, string m2)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var sessionKey = "HR_Employees_" + (companyID.HasValue ? companyID.Value.ToString() : "All");
                var session = HttpContext.Current.Session;
                if (session == null)
                    return new { success = false, message = "Session không tồn tại." };
                var list = session[sessionKey] as List<object>;
                if (list == null || list.Count == 0)
                    return new { success = false, message = "Không có data employees trong session cho key: " + sessionKey };
                var empIdSet = new HashSet<long>(employeeIds);
                foreach (var item in list)
                {
                    var emp = item as Dictionary<string, object>;
                    if (emp == null) continue;
                    var eid = MyConvert.To<long>(emp.ContainsKey("employeeID") ? emp["employeeID"] : 0);
                    if (!empIdSet.Contains(eid)) continue;
                    if (updPersonal && !string.IsNullOrWhiteSpace(personalEmail))
                        emp["personalEmail"] = personalEmail;
                    if (updBusiness && !string.IsNullOrWhiteSpace(businessEmail))
                        emp["businessEmail"] = businessEmail;
                    if (updM1 && !string.IsNullOrWhiteSpace(m1))
                        emp["mobilePhone1"] = m1;
                    if (updM2 && !string.IsNullOrWhiteSpace(m2))
                        emp["mobilePhone2"] = m2;
                }
                return new { success = true, count = list.Count };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Lấy username/email mặc định: guest = empty, logged-in = username từ web login + @cadena.com.sg</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetCurrentUserName(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                if (UiAuthHelper.IsAnonymous)
                    return new { success = true, userName = "", email = "" };
                var userName = HttpContext.Current?.Session?["UiUserName"] as string ?? "";
                var email = string.IsNullOrEmpty(userName) ? "" : (userName.Trim() + "@cadena.com.sg").ToLowerInvariant();
                return new { success = true, userName = userName, email = email };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Kiểm tra bảng có tồn tại trong database hay không.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object CheckTableExists(string k, string tableName)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                if (string.IsNullOrWhiteSpace(tableName))
                    return new { success = false, exists = false, message = "Tên bảng không được trống." };
                var schema = "dbo";
                var name = tableName.Trim();
                if (name.Contains("."))
                {
                    var parts = name.Split(new[] { '.' }, 2);
                    schema = parts[0].Trim();
                    name = parts[1].Trim();
                }
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @name";
                    cmd.Parameters.AddWithValue("@schema", schema);
                    cmd.Parameters.AddWithValue("@name", name);
                    conn.Open();
                    var exists = cmd.ExecuteScalar() != null;
                    return new { success = true, exists = exists };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, exists = false, message = ex.Message };
            }
        }

        /// <summary>Lấy danh sách table.column có Email. Chỉ base table. Có status (NotReset/Reset) và reason cho mỗi cột.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetTablesWithEmailColumns(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var sql = @"
SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME, c.CHARACTER_MAXIMUM_LENGTH, c.DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
WHERE c.COLUMN_NAME LIKE N'%Email%'
  AND c.COLUMN_NAME NOT IN ('EmailSubject', 'EmailBody')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')
ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME";
                var emailIgnore = LoadEmailIgnoreFromDb();
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = sql;
                    conn.Open();
                    var rows = new List<object[]>();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var schema = MyConvert.To<string>(r.GetValue(0)) ?? "dbo";
                            var table = MyConvert.To<string>(r.GetValue(1)) ?? "";
                            var col = MyConvert.To<string>(r.GetValue(2)) ?? "";
                            if (string.IsNullOrEmpty(table) || string.IsNullOrEmpty(col)) continue;
                            int? maxLen = null;
                            var ml = r.GetValue(3);
                            if (ml != null && ml != DBNull.Value && ml.ToString() != "-1")
                            {
                                int parsed;
                                if (int.TryParse(ml.ToString(), out parsed) && parsed > 0)
                                    maxLen = parsed;
                            }
                            var dataType = MyConvert.To<string>(r.GetValue(4)) ?? "nvarchar";
                            rows.Add(new object[] { schema, table, col, maxLen, dataType });
                        }
                    }
                    var list = new List<object>();
                    foreach (object[] row in rows)
                    {
                        var schema = (string)row[0];
                        var table = (string)row[1];
                        var col = (string)row[2];
                        var maxLen = (int?)row[3];
                        var dataType = (string)row[4];
                        string status = "Reset";
                        string reason = "";
                        if (ColumnNeedsReset(conn, schema, table, col, emailIgnore, out reason))
                            status = "NotReset";
                        list.Add(new { schema = schema, table = table, column = col, key = schema + "." + table + "." + col, maxLen = maxLen, dataType = dataType, status = status, reason = reason });
                    }
                    return new { success = true, list = list };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private static bool ColumnNeedsReset(SqlConnection conn, string schema, string table, string column, List<string> emailIgnore, out string reason)
        {
            reason = "";
            var fullName = "[" + (schema ?? "dbo").Replace("]", "]]") + "].[" + (table ?? "").Replace("]", "]]") + "]";
            var colName = "[" + (column ?? "").Replace("]", "]]") + "]";
            var keyCol = GetEncryptedEmailKeyColumn(schema, table, column);
            try
            {
                if (!string.IsNullOrEmpty(keyCol))
                {
                    var keyColSafe = "[" + keyCol.Replace("]", "]]") + "]";
                    var whereClause = " WHERE LTRIM(RTRIM(ISNULL(" + colName + ",'')) ) <> ''";
                    var selectBase = "SELECT TOP 50 " + keyColSafe + ", " + colName + " FROM " + fullName + " WITH (NOLOCK)" + whereClause;
                    foreach (var orderDir in new[] { " ASC", " DESC" })
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandTimeout = 15;
                            cmd.CommandText = selectBase + " ORDER BY " + keyColSafe + orderDir;
                            using (var rd = cmd.ExecuteReader())
                            {
                                while (rd.Read())
                                {
                                    var keyVal = rd.GetValue(0);
                                    var rawVal = rd.GetValue(1);
                                    if (rawVal == null || rawVal == DBNull.Value) continue;
                                    var raw = ((rawVal as string) ?? rawVal.ToString()).Trim();
                                    if (string.IsNullOrEmpty(raw)) continue;
                                    string email = null;
                                    try
                                    {
                                        var k = keyVal != null && keyVal != DBNull.Value ? MyConvert.To<long?>(keyVal) : null;
                                        email = DataSecurityWrapper.DecryptData<string>(raw, k)?.Trim();
                                    }
                                    catch { continue; }
                                    if (string.IsNullOrEmpty(email)) continue;
                                    if (!IsValidEmailFormat(email)) continue;
                                    if (!EmailMatchesIgnore(email, emailIgnore))
                                    {
                                        var sample = email.Length > 40 ? email.Substring(0, 37) + "..." : email;
                                        reason = "Có email khách hàng (VD: " + HttpUtility.HtmlEncode(sample) + ")";
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
                else
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 15;
                        cmd.CommandText = "SELECT TOP 50 " + colName + " FROM " + fullName + " WITH (NOLOCK) WHERE LTRIM(RTRIM(ISNULL(" + colName + ",'')) ) <> ''";
                        using (var rd = cmd.ExecuteReader())
                        {
                            while (rd.Read())
                            {
                                var val = rd.GetValue(0);
                                if (val == null || val == DBNull.Value) continue;
                                var email = ((val as string) ?? val.ToString()).Trim();
                                if (string.IsNullOrEmpty(email)) continue;
                                if (!IsValidEmailFormat(email)) continue;
                                if (!EmailMatchesIgnore(email, emailIgnore))
                                {
                                    var sample = email.Length > 40 ? email.Substring(0, 37) + "..." : email;
                                    reason = "Có email khách hàng (VD: " + HttpUtility.HtmlEncode(sample) + ")";
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            catch { }
            return false;
        }

        /// <summary>Lấy email mặc định: guest = empty, logged-in = username@cadena.com.sg</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetWindowsUserEmail(string domainSuffix = "cadena.com.sg")
        {
            if (UiAuthHelper.IsAnonymous)
                return new { success = true, email = "" };
            var userName = HttpContext.Current?.Session?["UiUserName"] as string;
            if (string.IsNullOrEmpty(userName))
                return new { success = true, email = "" };
            var domain = string.IsNullOrEmpty(domainSuffix) ? "cadena.com.sg" : domainSuffix;
            var email = (userName.Trim() + "@" + domain).ToLowerInvariant();
            return new { success = true, email = email };
        }

        /// <summary>Reset các cột email đã chọn với giá trị email chung. Chỉ base table, truncate theo max length, batch update, xử lý ntext.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ResetEmailColumns(string k, List<EmailColumnSelection> selections, string email)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var emailVal = (email ?? "").Trim();
                if (string.IsNullOrWhiteSpace(emailVal))
                    return new { success = false, message = "Email không được trống." };
                if (selections == null || selections.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 bảng/cột để reset." };

                var validWithMeta = new List<Tuple<string, string, string, int?, string>>();
                using (var conn = new SqlConnection(info.ConnectionString))
                {
                    conn.Open();
                    foreach (var s in selections)
                    {
                        if (string.IsNullOrWhiteSpace(s.schema)) s.schema = "dbo";
                        var schema = s.schema.Trim();
                        var table = (s.table ?? "").Trim();
                        var column = (s.column ?? "").Trim();
                        if (string.IsNullOrEmpty(table) || string.IsNullOrEmpty(column)) continue;
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
SELECT c.CHARACTER_MAXIMUM_LENGTH, c.DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table AND c.COLUMN_NAME = @col
  AND c.COLUMN_NAME NOT IN ('EmailSubject', 'EmailBody')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')";
                            cmd.Parameters.AddWithValue("@schema", schema);
                            cmd.Parameters.AddWithValue("@table", table);
                            cmd.Parameters.AddWithValue("@col", column);
                            using (var r = cmd.ExecuteReader())
                            {
                                if (r.Read())
                                {
                                    int? maxLen = null;
                                    var ml = r.GetValue(0);
                                    if (ml != null && ml != DBNull.Value && ml.ToString() != "-1")
                                    {
                                        int parsed;
                                        if (int.TryParse(ml.ToString(), out parsed) && parsed > 0)
                                            maxLen = parsed;
                                    }
                                    var dataType = MyConvert.To<string>(r.GetValue(1)) ?? "nvarchar";
                                    validWithMeta.Add(Tuple.Create(schema, table, column, maxLen, dataType));
                                }
                            }
                        }
                    }

                    var totalAffected = 0;
                    using (var cmd = conn.CreateCommand())
                    {
                        foreach (var t in validWithMeta)
                        {
                            var fullName = "[" + t.Item1.Replace("]", "]]") + "].[" + t.Item2.Replace("]", "]]") + "]";
                            var colName = "[" + t.Item3.Replace("]", "]]") + "]";
                            var val = TruncateToColumnLength(emailVal.Trim(), t.Item4);
                            try
                            {
                                totalAffected += ExecuteBatchUpdate(cmd, fullName, colName, "@email", val, t.Item5);
                            }
                            catch (Exception ex)
                            {
                                throw new Exception(string.Format("Email tại {0}.{1}.{2}: {3}", t.Item1, t.Item2, t.Item3, ex.Message), ex);
                            }
                        }
                    }

                    return new { success = true, message = "Đã reset " + validWithMeta.Count + " cột. Tổng bản ghi cập nhật: " + totalAffected, affected = totalAffected, columnsUpdated = validWithMeta.Count };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        public class EmailColumnSelection
        {
            public string schema { get; set; }
            public string table { get; set; }
            public string column { get; set; }
        }

        /// <summary>Lấy danh sách tất cả table.column có tên chứa "Phone" và kiểu dữ liệu text. Chỉ base table, có maxLen và dataType.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetTablesWithPhoneColumns(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var sql = @"
SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME, c.CHARACTER_MAXIMUM_LENGTH, c.DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
WHERE c.COLUMN_NAME LIKE N'%Phone%'
  AND NOT (c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME LIKE 'PAY_MasterPayroll%')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')
ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME";
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = sql;
                    conn.Open();
                    var list = new List<object>();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var schema = MyConvert.To<string>(r.GetValue(0)) ?? "dbo";
                            var table = MyConvert.To<string>(r.GetValue(1)) ?? "";
                            var col = MyConvert.To<string>(r.GetValue(2)) ?? "";
                            if (string.IsNullOrEmpty(table) || string.IsNullOrEmpty(col)) continue;
                            int? maxLen = null;
                            var ml = r.GetValue(3);
                            if (ml != null && ml != DBNull.Value && ml.ToString() != "-1")
                            {
                                int parsed;
                                if (int.TryParse(ml.ToString(), out parsed) && parsed > 0)
                                    maxLen = parsed;
                            }
                            var dataType = MyConvert.To<string>(r.GetValue(4)) ?? "nvarchar";
                            list.Add(new { schema = schema, table = table, column = col, key = schema + "." + table + "." + col, maxLen = maxLen, dataType = dataType });
                        }
                    }
                    return new { success = true, list = list };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Reset các cột Phone đã chọn với giá trị chung. Chỉ base table, truncate theo max length, batch update, xử lý ntext.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ResetPhoneColumns(string k, List<PhoneColumnSelection> selections, string phone)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                if (string.IsNullOrWhiteSpace(phone))
                    return new { success = false, message = "Số điện thoại không được trống." };
                if (selections == null || selections.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 bảng/cột để reset." };

                var validWithMeta = new List<Tuple<string, string, string, int?, string>>();
                using (var conn = new SqlConnection(info.ConnectionString))
                {
                    conn.Open();
                    foreach (var s in selections)
                    {
                        if (string.IsNullOrWhiteSpace(s.schema)) s.schema = "dbo";
                        var schema = s.schema.Trim();
                        var table = (s.table ?? "").Trim();
                        var column = (s.column ?? "").Trim();
                        if (string.IsNullOrEmpty(table) || string.IsNullOrEmpty(column)) continue;
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
SELECT c.CHARACTER_MAXIMUM_LENGTH, c.DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table AND c.COLUMN_NAME = @col
  AND c.COLUMN_NAME LIKE N'%Phone%'
  AND NOT (c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME LIKE 'PAY_MasterPayroll%')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')";
                            cmd.Parameters.AddWithValue("@schema", schema);
                            cmd.Parameters.AddWithValue("@table", table);
                            cmd.Parameters.AddWithValue("@col", column);
                            using (var r = cmd.ExecuteReader())
                            {
                                if (r.Read())
                                {
                                    int? maxLen = null;
                                    var ml = r.GetValue(0);
                                    if (ml != null && ml != DBNull.Value && ml.ToString() != "-1")
                                    {
                                        int parsed;
                                        if (int.TryParse(ml.ToString(), out parsed) && parsed > 0)
                                            maxLen = parsed;
                                    }
                                    var dataType = MyConvert.To<string>(r.GetValue(1)) ?? "nvarchar";
                                    validWithMeta.Add(Tuple.Create(schema, table, column, maxLen, dataType));
                                }
                            }
                        }
                    }

                    var totalAffected = 0;
                    using (var cmd = conn.CreateCommand())
                    {
                        foreach (var t in validWithMeta)
                        {
                            var fullName = "[" + t.Item1.Replace("]", "]]") + "].[" + t.Item2.Replace("]", "]]") + "]";
                            var colName = "[" + t.Item3.Replace("]", "]]") + "]";
                            var val = TruncateToColumnLength(phone.Trim(), t.Item4);
                            try
                            {
                                totalAffected += ExecuteBatchUpdate(cmd, fullName, colName, "@phone", val, t.Item5);
                            }
                            catch (Exception ex)
                            {
                                throw new Exception(string.Format("Phone tại {0}.{1}.{2}: {3}", t.Item1, t.Item2, t.Item3, ex.Message), ex);
                            }
                        }
                    }

                    return new { success = true, message = "Đã reset " + validWithMeta.Count + " cột. Tổng bản ghi cập nhật: " + totalAffected, affected = totalAffected, columnsUpdated = validWithMeta.Count };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        public class PhoneColumnSelection
        {
            public string schema { get; set; }
            public string table { get; set; }
            public string column { get; set; }
        }

        private const string EmailIgnoreSettingKey = "HR_MultiDb_EmailIgnore";

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveEmailIgnoreConfig(string k, List<string> patterns)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("Settings"))
                    return new { success = false, message = "Bạn không có quyền Settings để lưu cấu hình." };
                var multi = GetMultiConnFromToken(k);
                if (multi == null) return new { success = false, message = "Chế độ Multi-DB không hợp lệ." };
                var value = patterns != null && patterns.Count > 0
                    ? string.Join("\n", patterns.Select(p => (p ?? "").Trim()).Where(p => p.Length > 0))
                    : "";
                var userId = UiAuthHelper.CurrentUserId;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM BaAppSetting WHERE [Key] = @key)
    UPDATE BaAppSetting SET [Value] = @val, UpdatedAt = SYSDATETIME(), UpdatedBy = @uid WHERE [Key] = @key;
ELSE
    INSERT INTO BaAppSetting ([Key], [Value], UpdatedBy) VALUES (@key, @val, @uid);";
                    cmd.Parameters.AddWithValue("@key", EmailIgnoreSettingKey);
                    cmd.Parameters.AddWithValue("@val", value);
                    cmd.Parameters.AddWithValue("@uid", userId.HasValue ? (object)userId.Value : DBNull.Value);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                return new { success = true };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmailIgnoreConfig(string k)
        {
            try
            {
                var multi = GetMultiConnFromToken(k);
                if (multi == null) return new { success = false, message = "Chế độ Multi-DB không hợp lệ." };
                var list = LoadEmailIgnoreFromDb();
                return new { success = true, list = list };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        /// <summary>Load Email Ignore từ DB. Dùng cho cả Multi-DB và AppSettings.</summary>
        public static List<string> LoadEmailIgnoreFromDb()
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT [Value] FROM BaAppSetting WHERE [Key] = @key";
                    cmd.Parameters.AddWithValue("@key", EmailIgnoreSettingKey);
                    conn.Open();
                    var val = cmd.ExecuteScalar();
                    if (val == null || val == DBNull.Value || string.IsNullOrWhiteSpace(val.ToString()))
                        return new List<string>();
                    return val.ToString().Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                }
            }
            catch { return new List<string>(); }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmailIgnoreConfigPublic()
        {
            try
            {
                var list = LoadEmailIgnoreFromDb();
                return new { success = true, list = list };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        /// <summary>Lưu Email Ignore từ trang Settings. Chỉ user có quyền Settings.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SaveEmailIgnoreToSettings(List<string> patterns)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("Settings"))
                    return new { success = false, message = "Bạn không có quyền Settings." };
                var value = patterns != null && patterns.Count > 0
                    ? string.Join("\n", patterns.Select(p => (p ?? "").Trim()).Where(p => p.Length > 0))
                    : "";
                var userId = UiAuthHelper.CurrentUserId;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM BaAppSetting WHERE [Key] = @key)
    UPDATE BaAppSetting SET [Value] = @val, UpdatedAt = SYSDATETIME(), UpdatedBy = @uid WHERE [Key] = @key;
ELSE
    INSERT INTO BaAppSetting ([Key], [Value], UpdatedBy) VALUES (@key, @val, @uid);";
                    cmd.Parameters.AddWithValue("@key", EmailIgnoreSettingKey);
                    cmd.Parameters.AddWithValue("@val", value);
                    cmd.Parameters.AddWithValue("@uid", userId.HasValue ? (object)userId.Value : DBNull.Value);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                return new { success = true };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetMultiDbDatabases(string k)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                    return new { success = false, message = "Bạn không có quyền sử dụng Multi-DB Reset." };
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null)
                    return new { success = false, message = "Chế độ Multi-DB không hợp lệ." };
                var list = multi.Databases.Select(d => new { database = d.DatabaseName }).ToList();
                return new { success = true, list = list };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        private static bool EmailMatchesIgnore(string email, List<string> ignorePatterns)
        {
            if (string.IsNullOrWhiteSpace(email)) return true;
            var e = email.Trim();
            if (ignorePatterns == null || ignorePatterns.Count == 0) return false;
            foreach (var p in ignorePatterns)
            {
                var pat = (p ?? "").Trim();
                if (string.IsNullOrEmpty(pat)) continue;
                if (pat.StartsWith("*"))
                {
                    if (e.EndsWith(pat.Substring(1), StringComparison.OrdinalIgnoreCase)) return true;
                }
                else if (string.Equals(e, pat, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        /// <summary>Phân tích 1 database. Client gọi từng DB để hiển thị progress.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object AnalyzeSingleDbStatus(string k, string databaseName, List<string> emailIgnorePatterns)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                    return new { success = false, message = "Bạn không có quyền sử dụng Multi-DB Reset." };
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null)
                    return new { success = false, message = "Chế độ Multi-DB không hợp lệ." };
                var db = multi.Databases.FirstOrDefault(d => string.Equals(d.DatabaseName, databaseName, StringComparison.OrdinalIgnoreCase));
                if (db == null)
                    return new { success = false, message = "Không tìm thấy database." };

                var status = "Reset";
                var reason = "";
                try
                {
                    using (var conn = new SqlConnection(db.ConnectionString))
                    {
                        conn.Open();
                        if (DatabaseNeedsReset(conn, emailIgnorePatterns ?? new List<string>(), out reason))
                            status = "NotReset";
                    }
                }
                catch (Exception ex)
                {
                    status = "Error";
                    reason = ex.Message ?? "Lỗi";
                }
                return new { success = true, database = db.DatabaseName, status = status, reason = reason };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object AnalyzeMultiDbStatus(string k, List<string> emailIgnorePatterns)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                    return new { success = false, message = "Bạn không có quyền sử dụng Multi-DB Reset." };
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null)
                    return new { success = false, message = "Chế độ Multi-DB không hợp lệ." };

                var results = new List<object>();
                var ignore = emailIgnorePatterns ?? new List<string>();

                foreach (var db in multi.Databases)
                {
                    var status = "Reset";
                    var reason = "";
                    try
                    {
                        using (var conn = new SqlConnection(db.ConnectionString))
                        {
                            conn.Open();
                            if (DatabaseNeedsReset(conn, ignore, out reason))
                            {
                                status = "NotReset";
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        status = "Error";
                        reason = ex.Message ?? "Lỗi";
                    }
                    results.Add(new { database = db.DatabaseName, status = status, reason = reason });
                }
                return new { success = true, list = results };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private static bool IsValidEmailFormat(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return false;
            var e = s.Trim();
            if (e.Length < 5) return false; // a@b.c
            var at = e.IndexOf('@');
            if (at <= 0 || at >= e.Length - 2) return false;
            var dot = e.LastIndexOf('.');
            if (dot <= at + 1 || dot >= e.Length - 1) return false;
            return true;
        }

        /// <summary>Cột email mã hóa: (Schema, Table, Column) -> KeyColumn để giải mã. Key dùng DataSecurityWrapper.DecryptData(raw, key).</summary>
        private static string GetEncryptedEmailKeyColumn(string schema, string table, string column)
        {
            var sch = (schema ?? "dbo").Trim();
            var tbl = (table ?? "").Trim();
            var col = (column ?? "").Trim();
            if (string.Equals(tbl, "Staffing_Employees", StringComparison.OrdinalIgnoreCase) &&
                (string.Equals(col, "PersonalEmailAddress", StringComparison.OrdinalIgnoreCase) || string.Equals(col, "BusinessEmailAddress", StringComparison.OrdinalIgnoreCase)))
                return "ID";
            if (string.Equals(tbl, "Staffing_EmployeeInformations", StringComparison.OrdinalIgnoreCase) &&
                (string.Equals(col, "PersonalEmailAddress", StringComparison.OrdinalIgnoreCase) || string.Equals(col, "BusinessEmailAddress", StringComparison.OrdinalIgnoreCase)))
                return "EmployeeID";
            return null;
        }

        private static bool DatabaseNeedsReset(SqlConnection conn, List<string> emailIgnore, out string reason)
        {
            reason = "";
            var cols = new List<Tuple<string, string, string>>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 30;
                cmd.CommandText = @"
SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.COLUMN_NAME LIKE N'%Email%' AND c.COLUMN_NAME NOT IN ('EmailSubject','EmailBody')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var schema = MyConvert.To<string>(r.GetValue(0)) ?? "dbo";
                        var table = MyConvert.To<string>(r.GetValue(1)) ?? "";
                        var col = MyConvert.To<string>(r.GetValue(2)) ?? "";
                        if (!string.IsNullOrEmpty(table) && !string.IsNullOrEmpty(col))
                            cols.Add(Tuple.Create(schema, table, col));
                    }
                }
            }

            foreach (var t in cols)
            {
                var fullName = "[" + t.Item1.Replace("]", "]]") + "].[" + t.Item2.Replace("]", "]]") + "]";
                var colName = "[" + t.Item3.Replace("]", "]]") + "]";
                var keyCol = GetEncryptedEmailKeyColumn(t.Item1, t.Item2, t.Item3);

                try
                {
                    if (!string.IsNullOrEmpty(keyCol))
                    {
                        var keyColSafe = "[" + keyCol.Replace("]", "]]") + "]";
                        var whereClause = " WHERE LTRIM(RTRIM(ISNULL(" + colName + ",'')) ) <> ''";
                        var selectBase = "SELECT TOP 50 " + keyColSafe + ", " + colName + " FROM " + fullName + " WITH (NOLOCK)" + whereClause;
                        foreach (var orderDir in new[] { " ASC", " DESC" })
                        {
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandTimeout = 15;
                                cmd.CommandText = selectBase + " ORDER BY " + keyColSafe + orderDir;
                                using (var rd = cmd.ExecuteReader())
                                {
                                    while (rd.Read())
                                    {
                                        var keyVal = rd.GetValue(0);
                                        var rawVal = rd.GetValue(1);
                                        if (rawVal == null || rawVal == DBNull.Value) continue;
                                        var raw = ((rawVal as string) ?? rawVal.ToString()).Trim();
                                        if (string.IsNullOrEmpty(raw)) continue;
                                        string email = null;
                                        try
                                        {
                                            var k = keyVal != null && keyVal != DBNull.Value ? MyConvert.To<long?>(keyVal) : null;
                                            email = DataSecurityWrapper.DecryptData<string>(raw, k)?.Trim();
                                        }
                                        catch { continue; }
                                        if (string.IsNullOrEmpty(email)) continue;
                                        if (!IsValidEmailFormat(email)) continue;
                                        if (!EmailMatchesIgnore(email, emailIgnore))
                                        {
                                            var sample = email.Length > 40 ? email.Substring(0, 37) + "..." : email;
                                            reason = "Có email khách hàng: " + t.Item2 + "." + t.Item3 + " (VD: " + HttpUtility.HtmlEncode(sample) + ")";
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandTimeout = 15;
                            cmd.CommandText = "SELECT TOP 50 " + colName + " FROM " + fullName + " WITH (NOLOCK) WHERE LTRIM(RTRIM(ISNULL(" + colName + ",'')) ) <> ''";
                            using (var rd = cmd.ExecuteReader())
                            {
                                while (rd.Read())
                                {
                                    var val = rd.GetValue(0);
                                    if (val == null || val == DBNull.Value) continue;
                                    var email = ((val as string) ?? val.ToString()).Trim();
                                    if (string.IsNullOrEmpty(email)) continue;
                                    if (!IsValidEmailFormat(email)) continue;
                                    if (!EmailMatchesIgnore(email, emailIgnore))
                                    {
                                        var sample = email.Length > 40 ? email.Substring(0, 37) + "..." : email;
                                        reason = "Có email khách hàng: " + t.Item2 + "." + t.Item3 + " (VD: " + HttpUtility.HtmlEncode(sample) + ")";
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
                catch { }
            }
            return false;
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetColumnsToReset(string k, List<string> databaseNames, string email, string phone)
        {
            try
            {
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null)
                    return new { success = false, message = "Chế độ Multi-DB không hợp lệ." };
                if (databaseNames == null || databaseNames.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 database." };
                var emailTrim = (email ?? "").Trim();
                var phoneTrim = (phone ?? "").Trim();
                if (string.IsNullOrEmpty(emailTrim) && string.IsNullOrEmpty(phoneTrim))
                    return new { success = false, message = "Nhập Email và/hoặc Phone để reset." };

                var dbSet = new HashSet<string>(databaseNames.Select(x => (x ?? "").Trim()), StringComparer.OrdinalIgnoreCase);
                var toProcess = multi.Databases.Where(d => dbSet.Contains(d.DatabaseName ?? "")).ToList();
                var list = new List<object>();

                foreach (var db in toProcess)
                {
                    try
                    {
                        using (var conn = new SqlConnection(db.ConnectionString))
                        {
                            conn.Open();
                            if (!string.IsNullOrEmpty(emailTrim))
                            {
                                foreach (var c in GetEmailColumns(conn))
                                    list.Add(new { databaseName = db.DatabaseName, schema = c.Item1, table = c.Item2, column = c.Item3, maxLen = c.Item4, dataType = c.Item5, type = "email" });
                            }
                            if (!string.IsNullOrEmpty(phoneTrim))
                            {
                                foreach (var c in GetPhoneColumns(conn))
                                    list.Add(new { databaseName = db.DatabaseName, schema = c.Item1, table = c.Item2, column = c.Item3, maxLen = c.Item4, dataType = c.Item5, type = "phone" });
                            }
                        }
                    }
                    catch { }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ResetSingleColumn(string k, string databaseName, string schema, string table, string column, string value, string columnType, int? maxLen, string dataType)
        {
            try
            {
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null)
                    return new { success = false, affected = 0, error = "Chế độ Multi-DB không hợp lệ." };
                var db = multi.Databases.FirstOrDefault(d => string.Equals(d.DatabaseName, databaseName, StringComparison.OrdinalIgnoreCase));
                if (db == null)
                    return new { success = false, affected = 0, error = "Database không tìm thấy." };

                using (var conn = new SqlConnection(db.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    conn.Open();
                    var fullName = "[" + (schema ?? "dbo").Replace("]", "]]") + "].[" + (table ?? "").Replace("]", "]]") + "]";
                    var colName = "[" + (column ?? "").Replace("]", "]]") + "]";
                    var paramName = columnType == "phone" ? "@phone" : "@email";
                    var val = TruncateToColumnLength(value ?? "", maxLen);
                    var n = ExecuteBatchUpdate(cmd, fullName, colName, paramName, val, dataType ?? "nvarchar");
                    return new { success = true, affected = n, error = (string)null };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, affected = 0, error = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object ResetMultiDbSelected(string k, List<string> databaseNames, string email, string phone)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                    return new { success = false, message = "Bạn không có quyền sử dụng Multi-DB Reset." };
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null)
                    return new { success = false, message = "Chế độ Multi-DB không hợp lệ." };
                if (databaseNames == null || databaseNames.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 database." };
                var emailTrim = (email ?? "").Trim();
                var phoneTrim = (phone ?? "").Trim();
                if (string.IsNullOrEmpty(emailTrim) && string.IsNullOrEmpty(phoneTrim))
                    return new { success = false, message = "Nhập Email và/hoặc Phone để reset." };

                var dbSet = new HashSet<string>(databaseNames.Select(x => (x ?? "").Trim()), StringComparer.OrdinalIgnoreCase);
                var toProcess = multi.Databases.Where(d => dbSet.Contains(d.DatabaseName ?? "")).ToList();

                var done = 0;
                var totalAffected = 0;
                var errors = new List<string>();

                foreach (var db in toProcess)
                {
                    try
                    {
                        using (var conn = new SqlConnection(db.ConnectionString))
                        {
                            conn.Open();
                            if (!string.IsNullOrEmpty(emailTrim))
                                totalAffected += UpdateEmailValuesInDb(conn, emailTrim);
                            if (!string.IsNullOrEmpty(phoneTrim))
                                totalAffected += ResetPhoneColumnsInDb(conn, phoneTrim);
                        }
                        done++;
                    }
                    catch (Exception ex)
                    {
                        errors.Add(db.DatabaseName + ": " + (ex.Message ?? "Lỗi"));
                    }
                }

                var msg = "Đã reset " + done + "/" + toProcess.Count + " database. Tổng bản ghi cập nhật: " + totalAffected;
                if (errors.Count > 0)
                    msg += ". Lỗi: " + string.Join("; ", errors.Take(5));
                return new { success = true, message = msg, done = done, total = toProcess.Count, affected = totalAffected, errors = errors };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private const int UpdateBatchSize = 5000;
        private const int UpdateCommandTimeout = 600;

        private static int ExecuteBatchUpdate(SqlCommand cmd, string fullName, string colName, string paramName, object paramValue, string dataType)
        {
            cmd.Parameters.Clear();
            cmd.Parameters.AddWithValue(paramName, paramValue ?? (object)DBNull.Value);
            cmd.CommandTimeout = UpdateCommandTimeout;
            var isNtextOrText = string.Equals(dataType, "ntext", StringComparison.OrdinalIgnoreCase) || string.Equals(dataType, "text", StringComparison.OrdinalIgnoreCase);
            string whereClause = isNtextOrText
                ? colName + " IS NULL OR CAST(" + colName + " AS NVARCHAR(MAX)) <> " + paramName
                : colName + " IS NULL OR " + colName + " <> " + paramName;
            var total = 0;
            int n;
            do
            {
                cmd.CommandText = "UPDATE TOP (" + UpdateBatchSize + ") " + fullName + " SET " + colName + " = " + paramName + " WHERE " + whereClause;
                n = cmd.ExecuteNonQuery();
                total += n;
            } while (n >= UpdateBatchSize);
            return total;
        }

        private static string TruncateToColumnLength(string value, int? maxLength)
        {
            if (string.IsNullOrEmpty(value)) return value;
            if (!maxLength.HasValue || maxLength.Value <= 0 || maxLength.Value == int.MaxValue) return value;
            if (value.Length <= maxLength.Value) return value;
            return value.Substring(0, maxLength.Value);
        }

        private static readonly string ColumnsQueryBase = @"
SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME, c.CHARACTER_MAXIMUM_LENGTH, c.DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
WHERE {0}";

        private static List<Tuple<string, string, string, int?, string>> GetEmailColumns(SqlConnection conn)
        {
            var sql = string.Format(ColumnsQueryBase, @"c.COLUMN_NAME LIKE N'%Email%' AND c.COLUMN_NAME NOT IN ('EmailSubject','EmailBody')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')");
            return GetColumnsFromQuery(conn, sql);
        }

        private static List<Tuple<string, string, string, int?, string>> GetPhoneColumns(SqlConnection conn)
        {
            var sql = string.Format(ColumnsQueryBase, @"c.COLUMN_NAME LIKE N'%Phone%'
  AND NOT (c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME LIKE 'PAY_MasterPayroll%')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')");
            return GetColumnsFromQuery(conn, sql);
        }

        private static List<Tuple<string, string, string, int?, string>> GetColumnsFromQuery(SqlConnection conn, string sql)
        {
            var cols = new List<Tuple<string, string, string, int?, string>>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = sql;
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var schema = MyConvert.To<string>(r.GetValue(0)) ?? "dbo";
                        var table = MyConvert.To<string>(r.GetValue(1)) ?? "";
                        var col = MyConvert.To<string>(r.GetValue(2)) ?? "";
                        int? maxLen = null;
                        var ml = r.GetValue(3);
                        if (ml != null && ml != DBNull.Value && ml.ToString() != "-1")
                        {
                            int parsed;
                            if (int.TryParse(ml.ToString(), out parsed) && parsed > 0)
                                maxLen = parsed;
                        }
                        var dataType = MyConvert.To<string>(r.GetValue(4)) ?? "nvarchar";
                        if (!string.IsNullOrEmpty(table) && !string.IsNullOrEmpty(col))
                            cols.Add(Tuple.Create(schema, table, col, maxLen, dataType));
                    }
                }
            }
            return cols;
        }

        private static int ResetPhoneColumnsInDb(SqlConnection conn, string phone)
        {
            var cols = GetPhoneColumns(conn);
            using (var cmd = conn.CreateCommand())
            {
                var total = 0;
                foreach (var t in cols)
                {
                    var fullName = "[" + t.Item1.Replace("]", "]]") + "].[" + t.Item2.Replace("]", "]]") + "]";
                    var colName = "[" + t.Item3.Replace("]", "]]") + "]";
                    var val = TruncateToColumnLength(phone, t.Item4);
                    try { total += ExecuteBatchUpdate(cmd, fullName, colName, "@phone", val, t.Item5); }
                    catch (Exception ex) { throw new Exception(string.Format("Phone tại {0}.{1}.{2}: {3}", t.Item1, t.Item2, t.Item3, ex.Message), ex); }
                }
                return total;
            }
        }

        private static int UpdateEmailValuesInDb(SqlConnection conn, string email)
        {
            var cols = GetEmailColumns(conn);
            using (var cmd = conn.CreateCommand())
            {
                var total = 0;
                foreach (var t in cols)
                {
                    var fullName = "[" + t.Item1.Replace("]", "]]") + "].[" + t.Item2.Replace("]", "]]") + "]";
                    var colName = "[" + t.Item3.Replace("]", "]]") + "]";
                    var val = TruncateToColumnLength(email, t.Item4);
                    try { total += ExecuteBatchUpdate(cmd, fullName, colName, "@email", val, t.Item5); }
                    catch (Exception ex) { throw new Exception(string.Format("Email tại {0}.{1}.{2}: {3}", t.Item1, t.Item2, t.Item3, ex.Message), ex); }
                }
                return total;
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadTenants(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT ID, Code FROM MultiTenant_Tenants ORDER BY Code";
                    conn.Open();
                    var list = new List<object>();
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new { id = MyConvert.To<long>(reader.GetValue(0)), code = MyConvert.To<string>(reader.GetValue(1)) ?? "" });
                        }
                    }
                    return new { success = true, list = list };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadCompaniesByTenant(string k, int tenantID)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT C.ID, C.Code, C.NameEN FROM MultiTenant_Companies AS C WHERE C.TenantID = @tid ORDER BY C.Code, C.NameEN";
                    cmd.Parameters.AddWithValue("@tid", tenantID);
                    conn.Open();
                    var list = new List<object>();
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new { id = MyConvert.To<long>(reader.GetValue(0)), code = MyConvert.To<string>(reader.GetValue(1)) ?? "", name = MyConvert.To<string>(reader.GetValue(2)) ?? "" });
                        }
                    }
                    return new { success = true, list = list };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadCompanyInfo(string k, int? tenantID, int? companyID)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    var sql = @"
                        SELECT TOP 1 C.HREmailTo, C.HREmailCC, C.PayrollEmailTo, C.PayrollEmailCC, C.Email,
                               ES.OutgoingMailServer, ES.OutgoingMailServerPort, ES.AccountID, ES.EmailAddress,
                               ES.PasswordPOP3, ES.SSLPort, ES.SMTPDisplayName, ES.IsEnableSSL
                        FROM MultiTenant_Companies AS C
                        LEFT JOIN Setting_EmailServers AS ES ON ES.CompanyID = C.ID";
                    if (companyID.HasValue)
                    {
                        sql += " WHERE C.ID = @cid";
                        cmd.Parameters.AddWithValue("@cid", companyID.Value);
                    }
                    else if (tenantID.HasValue)
                    {
                        sql += " WHERE C.TenantID = @tid";
                        cmd.Parameters.AddWithValue("@tid", tenantID.Value);
                    }
                    cmd.CommandText = sql;
                    conn.Open();
                    using (var reader = cmd.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            var password = MyConvert.To<string>(reader.GetValue(9));
                            string decryptedPassword = null;
                            if (!string.IsNullOrWhiteSpace(password))
                            {
                                try { decryptedPassword = DataSecurityWrapper.DecryptData<string>(password, (long?)null); } catch { }
                            }
                            return new
                            {
                                success = true,
                                data = new
                                {
                                    hrEmailTo = MyConvert.To<string>(reader.GetValue(0)) ?? "",
                                    hrEmailCC = MyConvert.To<string>(reader.GetValue(1)) ?? "",
                                    payrollEmailTo = MyConvert.To<string>(reader.GetValue(2)) ?? "",
                                    payrollEmailCC = MyConvert.To<string>(reader.GetValue(3)) ?? "",
                                    email = MyConvert.To<string>(reader.GetValue(4)) ?? "",
                                    outgoingMailServer = MyConvert.To<string>(reader.GetValue(5)) ?? "",
                                    outgoingMailServerPort = MyConvert.To<int>(reader.GetValue(6)),
                                    accountID = MyConvert.To<string>(reader.GetValue(7)) ?? "",
                                    emailAddress = MyConvert.To<string>(reader.GetValue(8)) ?? "",
                                    password = decryptedPassword ?? "",
                                    sslPort = MyConvert.To<int?>(reader.GetValue(10)),
                                    smtpDisplayName = MyConvert.To<string>(reader.GetValue(11)) ?? "",
                                    isEnableSSL = MyConvert.To<bool>(reader.GetValue(12))
                                }
                            };
                        }
                    }
                    return new { success = false, message = "Không tìm thấy company." };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateCompanyInfo(string k, int? tenantID, int? companyID, bool isUpdateAll,
            bool useCommonEmail, string commonEmail,
            string hrEmailTo, string hrEmailCC, string payrollEmailTo, string payrollEmailCC, string contactEmail,
            string outgoingServer, int serverPort, string accountName, string userName, string emailAddress, string password,
            bool enableSSL, int? sslPort)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var result = ExecuteUpdateCompanyInfoCore(info.ConnectionString, tenantID, companyID, isUpdateAll,
                    useCommonEmail, commonEmail, hrEmailTo, hrEmailCC, payrollEmailTo, payrollEmailCC, contactEmail,
                    outgoingServer, serverPort, accountName, userName, emailAddress, password, enableSSL, sslPort);
                return new { success = result.Item1, message = result.Item2 };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Chạy update company info (trả về Tuple cho job nền).</summary>
        private static Tuple<bool, string> ExecuteUpdateCompanyInfoCore(string connectionString,
            int? tenantID, int? companyID, bool isUpdateAll,
            bool useCommonEmail, string commonEmail,
            string hrEmailTo, string hrEmailCC, string payrollEmailTo, string payrollEmailCC, string contactEmail,
            string outgoingServer, int serverPort, string accountName, string userName, string emailAddress, string password,
            bool enableSSL, int? sslPort)
        {
            try
            {
                using (var conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 600;
                        string payrollEmailToVal, payrollEmailCCVal, hrEmailToVal, hrEmailCCVal, emailVal;
                        if (useCommonEmail && !string.IsNullOrWhiteSpace(commonEmail))
                        {
                            payrollEmailToVal = payrollEmailCCVal = hrEmailToVal = hrEmailCCVal = emailVal = commonEmail;
                        }
                        else
                        {
                            payrollEmailToVal = payrollEmailTo ?? "";
                            payrollEmailCCVal = payrollEmailCC ?? "";
                            hrEmailToVal = hrEmailTo ?? "";
                            hrEmailCCVal = hrEmailCC ?? "";
                            emailVal = contactEmail ?? "";
                        }
                        cmd.CommandText = @"
                            UPDATE MultiTenant_Companies
                            SET PayrollEmailTo = @valPayrollEmailTo,
                                PayrollEmailCC = @valPayrollEmailCC,
                                HREmailTo = @valHREmailTo,
                                HREmailCC = @valHREmailCC,
                                Email = @valEmail
                            WHERE @valIsUpdateAll = 1 OR ID = @valCompanyID";
                        cmd.Parameters.AddWithValue("@valCompanyID", companyID ?? 0);
                        cmd.Parameters.AddWithValue("@valPayrollEmailTo", payrollEmailToVal);
                        cmd.Parameters.AddWithValue("@valPayrollEmailCC", payrollEmailCCVal);
                        cmd.Parameters.AddWithValue("@valHREmailTo", hrEmailToVal);
                        cmd.Parameters.AddWithValue("@valHREmailCC", hrEmailCCVal);
                        cmd.Parameters.AddWithValue("@valEmail", emailVal);
                        cmd.Parameters.AddWithValue("@valIsUpdateAll", isUpdateAll ? 1 : 0);
                        cmd.ExecuteNonQuery();
                        cmd.Parameters.Clear();
                        var encryptedPassword = !string.IsNullOrWhiteSpace(password) ? DataSecurityWrapper.EncryptData(password, null) : null;
                        cmd.CommandText = @"
                            INSERT INTO Setting_EmailServers
                                (ID, ServerTypeID, OutgoingMailServer, OutgoingMailServerPort, AccountID,
                                 IsEnableSSL, EmailAddress, SSLPort, PasswordPOP3, CompanyID, TenantID, SMTPDisplayName)
                            SELECT 
                                dbo.NewGuidComb(NEWID()), 1,
                                @valOutgoingMailServer, @valOutgoingMailServerPort, @valAccountID,
                                @valIsEnableSSL, @valEmailAddress, @valSSLPort, @valPasswordPOP3,
                                C.ID, C.TenantID, @valSMTPDisplayName
                            FROM MultiTenant_Companies AS C
                            LEFT JOIN Setting_EmailServers AS ES ON ES.CompanyID = C.ID
                            WHERE ES.ID IS NULL AND (@valIsUpdateAll = 1 OR C.ID = @valCompanyID) AND (@valTenantID IS NULL OR C.TenantID = @valTenantID);

                            UPDATE Setting_EmailServers
                            SET OutgoingMailServer = @valOutgoingMailServer, OutgoingMailServerPort = @valOutgoingMailServerPort,
                                AccountID = @valAccountID, EmailAddress = @valEmailAddress, SSLPort = @valSSLPort,
                                PasswordPOP3 = @valPasswordPOP3, SMTPDisplayName = @valSMTPDisplayName, IsEnableSSL = @valIsEnableSSL
                            WHERE (@valIsUpdateAll = 1 OR CompanyID = @valCompanyID) AND (@valTenantID IS NULL OR TenantID = @valTenantID);";
                        cmd.Parameters.AddWithValue("@valOutgoingMailServer", outgoingServer ?? "");
                        cmd.Parameters.AddWithValue("@valOutgoingMailServerPort", serverPort);
                        cmd.Parameters.AddWithValue("@valAccountID", userName ?? "");
                        cmd.Parameters.AddWithValue("@valEmailAddress", emailAddress ?? "");
                        cmd.Parameters.AddWithValue("@valPasswordPOP3", encryptedPassword ?? (object)DBNull.Value);
                        cmd.Parameters.AddWithValue("@valSSLPort", sslPort.HasValue ? (object)sslPort.Value : DBNull.Value);
                        cmd.Parameters.AddWithValue("@valSMTPDisplayName", accountName ?? "");
                        cmd.Parameters.AddWithValue("@valIsEnableSSL", enableSSL);
                        cmd.Parameters.AddWithValue("@valIsUpdateAll", isUpdateAll ? 1 : 0);
                        cmd.Parameters.AddWithValue("@valCompanyID", companyID ?? 0);
                        cmd.Parameters.AddWithValue("@valTenantID", tenantID.HasValue ? (object)tenantID.Value : DBNull.Value);
                        cmd.ExecuteNonQuery();
                    }
                }
                return Tuple.Create(true, "Đã update company info thành công.");
            }
            catch (Exception ex)
            {
                return Tuple.Create(false, ex.Message);
            }
        }

        /// <summary>Đưa update company/other info vào job nền.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartHRHelperUpdateOtherJob(string k, int? tenantID, int? companyID, bool isUpdateAll,
            bool useCommonEmail, string commonEmail,
            string hrEmailTo, string hrEmailCC, string payrollEmailTo, string payrollEmailCC, string contactEmail,
            string outgoingServer, int serverPort, string accountName, string userName, string emailAddress, string password,
            bool enableSSL, int? sslPort)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobId = 0 };
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database.", jobId = 0 };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName2 = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var connStr = info.ConnectionString;
                var serverName = info.Server ?? "";
                var databaseName = info.Database ?? "";
                int jobId;
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerName, DatabaseName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete)
VALUES (N'HRHelperUpdateOther', @sname, @db, @uid, @uname, SYSDATETIME(), N'Running', 0); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                    cmd.Parameters.AddWithValue("@sname", serverName);
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@uname", userName2);
                    appConn.Open();
                    jobId = (int)cmd.ExecuteScalar();
                }
                UserActionLogHelper.Log("HRHelper.UpdateOther", "database=" + databaseName + ", tenantID=" + tenantID + ", companyID=" + companyID + " (update company/email config)");
                System.Threading.Tasks.Task.Run(() =>
                {
                    try
                    {
                        var result = ExecuteUpdateCompanyInfoCore(connStr, tenantID, companyID, isUpdateAll,
                            useCommonEmail, commonEmail, hrEmailTo, hrEmailCC, payrollEmailTo, payrollEmailCC, contactEmail,
                            outgoingServer, serverPort, accountName, userName, emailAddress, password, enableSSL, sslPort);
                        UpdateBaJobCompleted(jobId, "HRHelperUpdateOther", result.Item1, result.Item2);
                    }
                    catch (Exception ex)
                    {
                        UpdateBaJobCompleted(jobId, "HRHelperUpdateOther", false, ex.Message);
                    }
                    BaJobHubHelper.PushJobsUpdated("HRHelperUpdateOther", null, userId);
                });
                return new { success = true, jobId = jobId, message = "Đã đưa update company/other info vào hàng đợi." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadCompanies(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
                        SELECT C.ID, C.Code, C.NameEN, C.TenantID
                        FROM MultiTenant_Companies AS C
                        ORDER BY C.Code, C.NameEN";
                    conn.Open();
                    var list = new List<object>();
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new
                            {
                                id = reader.GetValue(0),
                                code = reader.GetValue(1)?.ToString() ?? "",
                                name = reader.GetValue(2)?.ToString() ?? "",
                                tenantID = reader.GetValue(3)
                            });
                        }
                    }
                    return new { success = true, list = list };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetEmployeesCount(string k, int? companyID = null)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    var query = EmployeesQueryBase;
                    if (companyID.HasValue && companyID.Value > 0)
                    {
                        query += " AND T.CompanyID = @companyID";
                        cmd.Parameters.AddWithValue("@companyID", companyID.Value);
                    }
                    cmd.CommandText = "SELECT COUNT(*) FROM (" + query + ") X";
                    conn.Open();
                    var total = Convert.ToInt32(cmd.ExecuteScalar());
                    return new { success = true, total = total };
                }
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        /// <summary>Load employee theo trang (server-side paging). Dùng paging để tránh treo khi DB có 50k+ bản ghi; không đưa load-data vào job trả về client.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmployeesChunk(string k, int offset, int count, int? companyID = null)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var list = new List<object>();
                var take = Math.Max(1, Math.Min(5000, count));
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    var query = EmployeesQueryBase;
                    if (companyID.HasValue && companyID.Value > 0)
                    {
                        query += " AND T.CompanyID = @companyID";
                        cmd.Parameters.AddWithValue("@companyID", companyID.Value);
                    }
                    cmd.CommandText = query + " ORDER BY E.ID, T.ID OFFSET @off ROWS FETCH NEXT @cnt ROWS ONLY";
                    cmd.Parameters.AddWithValue("@off", offset);
                    cmd.Parameters.AddWithValue("@cnt", take);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                            list.Add(ReadEmployeeRow(r));
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        private static object ReadEmployeeRow(SqlDataReader r)
        {
            var empId = MyConvert.To<long>(r.GetValue(0));
            var raw5 = MyConvert.To<string>(r.GetValue(5));
            var raw6 = MyConvert.To<string>(r.GetValue(6));
            var raw7 = MyConvert.To<string>(r.GetValue(7));
            var raw8 = MyConvert.To<string>(r.GetValue(8));
            var raw24 = MyConvert.To<string>(r.GetValue(24));
            string personal = "", business = "", m1 = "", m2 = "", payslip = "";
            if (!string.IsNullOrWhiteSpace(raw5)) { try { personal = DataSecurityWrapper.DecryptData<string>(raw5, empId) ?? ""; } catch { } }
            if (!string.IsNullOrWhiteSpace(raw6)) { try { business = DataSecurityWrapper.DecryptData<string>(raw6, empId) ?? ""; } catch { } }
            if (!string.IsNullOrWhiteSpace(raw7)) { try { m1 = DataSecurityWrapper.DecryptData<string>(raw7, empId) ?? ""; } catch { } }
            if (!string.IsNullOrWhiteSpace(raw8)) { try { m2 = DataSecurityWrapper.DecryptData<string>(raw8, empId) ?? ""; } catch { } }
            if (!string.IsNullOrWhiteSpace(raw24)) { try { payslip = DataSecurityWrapper.DecryptData<string>(raw24, empId) ?? ""; } catch { } }
            var dob = MyConvert.To<DateTime?>(r.GetValue(4));
            var svc = MyConvert.To<DateTime?>(r.GetValue(9));
            return new
            {
                employeeID = empId,
                localEmployeeID = MyConvert.To<string>(r.GetValue(1)) ?? "",
                employeeName = MyConvert.To<string>(r.GetValue(2)) ?? "",
                englishName = MyConvert.To<string>(r.GetValue(3)) ?? "",
                dateOfBirth = dob.HasValue ? dob.Value.ToString("yyyy-MM-dd") : "",
                personalEmail = personal,
                businessEmail = business,
                mobilePhone1 = m1,
                mobilePhone2 = m2,
                serviceStartDate = svc.HasValue ? svc.Value.ToString("yyyy-MM-dd") : "",
                alPolicyID = MyConvert.To<long?>(r.GetValue(10)),
                alPolicy = MyConvert.To<string>(r.GetValue(11)) ?? "",
                timeSheetPolicyID = MyConvert.To<long?>(r.GetValue(12)),
                timeSheetPolicy = MyConvert.To<string>(r.GetValue(13)) ?? "",
                organizionStructureID = MyConvert.To<long?>(r.GetValue(14)),
                organizionStructure = MyConvert.To<string>(r.GetValue(15)) ?? "",
                managerEmployeeID = MyConvert.To<long?>(r.GetValue(16)),
                managerLocalEmployeeID = MyConvert.To<string>(r.GetValue(17)) ?? "",
                managerFullName = MyConvert.To<string>(r.GetValue(18)) ?? "",
                managerUserName = MyConvert.To<string>(r.GetValue(19)) ?? "",
                managerOrganizionStructureID = MyConvert.To<long?>(r.GetValue(20)),
                managerOrganizionStructure = MyConvert.To<string>(r.GetValue(21)) ?? "",
                userID = MyConvert.To<long?>(r.GetValue(22)),
                userName = MyConvert.To<string>(r.GetValue(23)) ?? "",
                payslipPassword = payslip,
                companyInfo = MyConvert.To<string>(r.GetValue(25)) ?? ""
            };
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmployees(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database. Vui lòng Connect từ Database Search." };
                var list = new List<object>();
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = EmployeesQueryBase + " ORDER BY E.ID, T.ID";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                            list.Add(ReadEmployeeRow(r));
                    }
                }
                return new { success = true, list = list };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object UpdateEmployees(string k, List<long> employeeIds,
            bool updPersonal, string personalEmail, bool updBusiness, string businessEmail,
            bool updPayslip, string payslipCommon, bool payslipByEmp,
            bool updM1, string m1, bool updM2, string m2, bool updBasic, decimal basicSalary)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                if (employeeIds == null || employeeIds.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 employee." };
                if (!updPersonal && !updBusiness && !updPayslip && !updM1 && !updM2 && !updBasic)
                    return new { success = false, message = "Chọn ít nhất 1 option để update." };
                if (updPayslip && !payslipByEmp && string.IsNullOrWhiteSpace(payslipCommon))
                    return new { success = false, message = "Nhập Payslip Password Common khi bật Update Payslip mà không chọn Encrypt by Employee." };

                var result = ExecuteUpdateEmployeesCore(info.ConnectionString, employeeIds, updPersonal, personalEmail, updBusiness, businessEmail, updPayslip, payslipCommon, payslipByEmp, updM1, m1, updM2, m2, updBasic, basicSalary);
                return new { success = result.Item1, message = result.Item2 };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Đưa update employee vào job nền.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartHRHelperUpdateEmployeeJob(string k, int? companyID, List<long> employeeIds,
            bool updPersonal, string personalEmail, bool updBusiness, string businessEmail,
            bool updPayslip, string payslipCommon, bool payslipByEmp,
            bool updM1, string m1, bool updM2, string m2, bool updBasic, decimal basicSalary)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobId = 0 };
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database.", jobId = 0 };
                if (employeeIds == null || employeeIds.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 employee.", jobId = 0 };
                if (!updPersonal && !updBusiness && !updPayslip && !updM1 && !updM2 && !updBasic)
                    return new { success = false, message = "Chọn ít nhất 1 option.", jobId = 0 };
                if (updPayslip && !payslipByEmp && string.IsNullOrWhiteSpace(payslipCommon))
                    return new { success = false, message = "Nhập Payslip Password Common khi bật Update Payslip mà không chọn Encrypt by Employee.", jobId = 0 };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var connStr = info.ConnectionString;
                var serverName = info.Server ?? "";
                var databaseName = info.Database ?? "";
                int jobId;
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerName, DatabaseName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete)
VALUES (N'HRHelperUpdateEmployee', @sname, @db, @uid, @uname, SYSDATETIME(), N'Running', 0); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                    cmd.Parameters.AddWithValue("@sname", serverName);
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@uname", userName);
                    appConn.Open();
                    jobId = (int)cmd.ExecuteScalar();
                }
                var empDetail = "database=" + databaseName + ", employeeIds=" + (employeeIds?.Count ?? 0);
                if (updPersonal) empDetail += ", personalEmail" + (string.IsNullOrWhiteSpace(personalEmail) ? "" : "=" + personalEmail);
                if (updBusiness) empDetail += ", businessEmail" + (string.IsNullOrWhiteSpace(businessEmail) ? "" : "=" + businessEmail);
                if (updPayslip) empDetail += ", payslip";
                if (updM1) empDetail += ", M1";
                if (updM2) empDetail += ", M2";
                if (updBasic) empDetail += ", basicSalary";
                UserActionLogHelper.Log("HRHelper.UpdateEmployee", empDetail);
                System.Threading.Tasks.Task.Run(() =>
                {
                    try
                    {
                        var result = ExecuteUpdateEmployeesCore(connStr, employeeIds, updPersonal, personalEmail, updBusiness, businessEmail, updPayslip, payslipCommon, payslipByEmp, updM1, m1, updM2, m2, updBasic, basicSalary);
                        UpdateBaJobCompleted(jobId, "HRHelperUpdateEmployee", result.Item1, result.Item2);
                    }
                    catch (Exception ex)
                    {
                        UpdateBaJobCompleted(jobId, "HRHelperUpdateEmployee", false, ex.Message);
                    }
                    BaJobHubHelper.PushJobsUpdated("HRHelperUpdateEmployee", null, userId);
                });
                return new { success = true, jobId = jobId, message = "Đã đưa update employee vào hàng đợi." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        /// <summary>Chạy update employee (trả về Tuple cho job nền).</summary>
        private static Tuple<bool, string> ExecuteUpdateEmployeesCore(string connectionString, List<long> employeeIds,
            bool updPersonal, string personalEmail, bool updBusiness, string businessEmail,
            bool updPayslip, string payslipCommon, bool payslipByEmp,
            bool updM1, string m1, bool updM2, string m2, bool updBasic, decimal basicSalary)
        {
            try
            {
                var employees = LoadEmployeesForUpdate(connectionString, employeeIds);
                if (employees == null || employees.Count == 0)
                    return Tuple.Create(false, "Không tìm thấy employee cần update.");
                var dt = BuildEmployeeDataTable(employees, updPersonal, personalEmail, updBusiness, businessEmail, updPayslip, payslipCommon, payslipByEmp, updM1, m1, updM2, m2, updBasic, basicSalary);
                using (var conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandTimeout = 600;
                        cmd.CommandText = @"
SET NOCOUNT ON; SET XACT_ABORT ON; SET LOCK_TIMEOUT 5000;
IF OBJECT_ID('tempdb..#EmployeeTemp') IS NOT NULL DROP TABLE #EmployeeTemp;
CREATE TABLE #EmployeeTemp(
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeID BIGINT NOT NULL,
    PersonalEmailAddress NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    BusinessEmailAddress NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    PayslipPassword NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    MobilePhone1 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    MobilePhone2 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    BasicSalary NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL
);";
                        cmd.ExecuteNonQuery();
                    }
                    using (var bulk = new SqlBulkCopy(conn))
                    {
                        bulk.DestinationTableName = "#EmployeeTemp";
                        bulk.BulkCopyTimeout = 660;
                        bulk.BatchSize = 5000;
                        bulk.ColumnMappings.Add("EmployeeID", "EmployeeID");
                        bulk.ColumnMappings.Add("PersonalEmailAddress", "PersonalEmailAddress");
                        bulk.ColumnMappings.Add("BusinessEmailAddress", "BusinessEmailAddress");
                        bulk.ColumnMappings.Add("PayslipPassword", "PayslipPassword");
                        bulk.ColumnMappings.Add("MobilePhone1", "MobilePhone1");
                        bulk.ColumnMappings.Add("MobilePhone2", "MobilePhone2");
                        bulk.ColumnMappings.Add("BasicSalary", "BasicSalary");
                        bulk.WriteToServer(dt);
                    }
                    int maxRowId = 0;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT ISNULL(MAX(RowId),0) FROM #EmployeeTemp;";
                        var o = cmd.ExecuteScalar();
                        maxRowId = (o == null || o == DBNull.Value) ? 0 : Convert.ToInt32(o);
                    }
                    if (maxRowId == 0)
                        return Tuple.Create(true, "Không có bản ghi nào.");
                    const int batchSize = 2000;
                    int totalBatches = (int)Math.Ceiling(maxRowId / (double)batchSize);
                    for (int b = 0; b < totalBatches; b++)
                    {
                        int start = b * batchSize + 1;
                        int end = Math.Min(maxRowId, start + batchSize - 1);
                        for (int attempt = 1; attempt <= 3; attempt++)
                        {
                            try
                            {
                                using (var cmd = conn.CreateCommand())
                                {
                                    cmd.CommandTimeout = 120;
                                    cmd.Parameters.AddWithValue("@Start", start);
                                    cmd.Parameters.AddWithValue("@End", end);
                                    cmd.CommandText = @"
SET LOCK_TIMEOUT 5000;
BEGIN TRAN;
IF OBJECT_ID('tempdb..#B') IS NOT NULL DROP TABLE #B;
SELECT RowId, EmployeeID, PersonalEmailAddress, BusinessEmailAddress, PayslipPassword, MobilePhone1, MobilePhone2, BasicSalary
INTO #B FROM #EmployeeTemp WHERE RowId BETWEEN @Start AND @End;
CREATE NONCLUSTERED INDEX IX_B_EmployeeID ON #B(EmployeeID);
UPDATE E SET E.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,E.PersonalEmailAddress),
    E.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,E.BusinessEmailAddress),
    E.PayslipPassword=COALESCE(B.PayslipPassword,E.PayslipPassword),
    E.MobilePhone1=COALESCE(B.MobilePhone1,E.MobilePhone1),
    E.MobilePhone2=COALESCE(B.MobilePhone2,E.MobilePhone2)
FROM #B B
JOIN dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK) ON E.ID = B.EmployeeID
WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL) OR (B.PayslipPassword IS NOT NULL) OR (B.MobilePhone1 IS NOT NULL) OR (B.MobilePhone2 IS NOT NULL);
IF OBJECT_ID('dbo.Staffing_EmployeeInformations','U') IS NOT NULL
UPDATE EI SET EI.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,EI.PersonalEmailAddress),
    EI.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,EI.BusinessEmailAddress)
FROM #B B
JOIN dbo.Staffing_EmployeeInformations EI WITH (ROWLOCK, UPDLOCK) ON EI.EmployeeID = B.EmployeeID
WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL);
IF EXISTS(SELECT 1 FROM #B WHERE BasicSalary IS NOT NULL)
BEGIN
    IF OBJECT_ID('dbo.PAY_EmployeeSalaries','U') IS NOT NULL
    UPDATE ES SET ES.[Value]=NULL FROM #B B JOIN dbo.PAY_EmployeeSalaries ES WITH (ROWLOCK, UPDLOCK) ON ES.EmployeeID=B.EmployeeID WHERE B.BasicSalary IS NOT NULL;
    IF OBJECT_ID('dbo.PAY_EmployeeSalaryDetails','U') IS NOT NULL
    UPDATE ESD SET ESD.[Value]=NULL FROM #B B JOIN dbo.PAY_EmployeeSalaries ES WITH (READCOMMITTED) ON ES.EmployeeID=B.EmployeeID JOIN dbo.PAY_EmployeeSalaryDetails ESD WITH (ROWLOCK, UPDLOCK) ON ESD.EmployeeSalaryID=ES.ID WHERE B.BasicSalary IS NOT NULL;
    UPDATE T SET T.BasicSalary=B.BasicSalary
    FROM #B B
    JOIN dbo.Staffing_Transactions T WITH (ROWLOCK, UPDLOCK) ON T.EmployeeID=B.EmployeeID AND T.IsActiveTransaction=1
    WHERE B.BasicSalary IS NOT NULL;
END
DROP TABLE #B;
COMMIT TRAN;";
                                    cmd.ExecuteNonQuery();
                                }
                                break;
                            }
                            catch (Exception ex)
                            {
                                if (attempt == 3) return Tuple.Create(false, "Batch update failed: " + ex.Message);
                            }
                        }
                    }
                }
                return Tuple.Create(true, "Đã update " + employees.Count + " employee.");
            }
            catch (Exception ex)
            {
                return Tuple.Create(false, ex.Message);
            }
        }

        private sealed class EmployeeForUpdate
        {
            public long EmployeeID { get; set; }
            public string LocalEmployeeID { get; set; }
        }

        private static List<EmployeeForUpdate> LoadEmployeesForUpdate(string connectionString, List<long> employeeIds)
        {
            var list = new List<EmployeeForUpdate>();
            var ids = string.Join(",", employeeIds.Select(x => x.ToString()));
            using (var conn = new SqlConnection(connectionString))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT ID, LocalEmployeeID FROM Staffing_Employees WHERE ID IN (" + ids + ") ORDER BY ID";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        list.Add(new EmployeeForUpdate
                        {
                            EmployeeID = MyConvert.To<long>(r.GetValue(0)),
                            LocalEmployeeID = MyConvert.To<string>(r.GetValue(1)) ?? ""
                        });
                    }
                }
            }
            return list;
        }

        private static DataTable BuildEmployeeDataTable(List<EmployeeForUpdate> employees,
            bool updPersonal, string personalEmail, bool updBusiness, string businessEmail,
            bool updPayslip, string payslipCommon, bool payslipByEmp,
            bool updM1, string m1, bool updM2, string m2, bool updBasic, decimal basicSalary)
        {
            var dt = new DataTable();
            dt.Columns.Add("EmployeeID", typeof(long));
            dt.Columns.Add("PersonalEmailAddress", typeof(string));
            dt.Columns.Add("BusinessEmailAddress", typeof(string));
            dt.Columns.Add("PayslipPassword", typeof(string));
            dt.Columns.Add("MobilePhone1", typeof(string));
            dt.Columns.Add("MobilePhone2", typeof(string));
            dt.Columns.Add("BasicSalary", typeof(string));
            foreach (var e in employees)
            {
                var row = dt.NewRow();
                row["EmployeeID"] = e.EmployeeID;
                row["PersonalEmailAddress"] = updPersonal && !string.IsNullOrWhiteSpace(personalEmail) ? (object)DataSecurityWrapper.EncryptData(personalEmail, e.EmployeeID) : DBNull.Value;
                row["BusinessEmailAddress"] = updBusiness && !string.IsNullOrWhiteSpace(businessEmail) ? (object)DataSecurityWrapper.EncryptData(businessEmail, e.EmployeeID) : DBNull.Value;
                string payslipSrc = payslipByEmp ? (e.LocalEmployeeID ?? "") : (payslipCommon ?? "");
                row["PayslipPassword"] = updPayslip && !string.IsNullOrWhiteSpace(payslipSrc) ? (object)DataSecurityWrapper.EncryptData(payslipSrc, e.EmployeeID) : DBNull.Value;
                row["MobilePhone1"] = updM1 && !string.IsNullOrWhiteSpace(m1) ? (object)DataSecurityWrapper.EncryptData(m1, e.EmployeeID) : DBNull.Value;
                row["MobilePhone2"] = updM2 && !string.IsNullOrWhiteSpace(m2) ? (object)DataSecurityWrapper.EncryptData(m2, e.EmployeeID) : DBNull.Value;
                row["BasicSalary"] = updBasic ? (object)DataSecurityWrapper.EncryptData(basicSalary, e.EmployeeID) : DBNull.Value;
                dt.Rows.Add(row);
            }
            return dt;
        }
    }
}
