using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using BADesign;
using BADesign.Helpers;
using BADesign.Helpers.Security;
using BADesign.Helpers.Utils;
using Newtonsoft.Json;

namespace BADesign.Pages
{
    public partial class HRHelper : System.Web.UI.Page
    {
        public string ConnectedServer { get; private set; } = "";
        public string ConnectedDatabase { get; private set; } = "";
        public bool IsMultiDbMode { get; private set; }
        public bool CanEditSettings => UiAuthHelper.HasFeature("Settings");
        public bool CanUseCadenaEmailServer => AppSettings.CanReadEmailServerConfig();

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

        /// <summary>URL to PGP Tool with current connection token k (for Key từ cấu hình DB).</summary>
        public string PgpToolUrl
        {
            get
            {
                var k = Request.QueryString["k"];
                var baseUrl = ResolveUrl("~/PgpTool");
                if (string.IsNullOrWhiteSpace(k)) return baseUrl;
                return baseUrl + "?k=" + System.Web.HttpUtility.UrlEncode(k);
            }
        }

        /// <summary>URL to License Key (Dev) with current connection token k — chỉ hiện cho user trong whitelist.</summary>
        public string LicenseKeyUrl
        {
            get
            {
                var k = Request.QueryString["k"];
                var baseUrl = ResolveUrl("~/LicenseKey");
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
            ucBaTopBar.PageTitle = "Trợ lý HR";
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
                    return new { success = false, message = "Chưa kết nối database. Vui lòng Connect từ Công cụ Database." };
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

        /// <summary>Chạy update user. Mỗi batch dùng connection riêng để retry không reuse connection đã đóng (gốc lỗi Batch update failed / connection closed).</summary>
        private static Tuple<bool, string> ExecuteUpdateUsersCore(string connectionString, List<long> userIds, bool isUpdatePassword, string password, int methodHash, bool isUpdateEmail, string email, bool ignoreWindowsAD)
        {
            connectionString = EnsureMinConnectionTimeout(connectionString, 120);
            var hashType = methodHash == 512 ? SimpleHash.HashType.SHA512 : SimpleHash.HashType.SHA256;
            var chosenEmail = isUpdateEmail ? (email ?? "").Trim() : null;
            var updateUsers = LoadUsersForUpdate(connectionString, userIds);
            if (updateUsers == null || updateUsers.Count == 0)
                return Tuple.Create(false, "Không tìm thấy user cần update.");
            try
            {
                var userTable = BuildUserDataTable(updateUsers, isUpdatePassword, password, hashType, isUpdateEmail, chosenEmail, ignoreWindowsAD);
                const int batchSize = 2000;
                int totalRows = userTable.Rows.Count;
                int totalBatches = (int)Math.Ceiling(totalRows / (double)batchSize);
                for (int b = 0; b < totalBatches; b++)
                {
                    int startIdx = b * batchSize;
                    int endIdx = Math.Min(startIdx + batchSize, totalRows) - 1;
                    var batchDt = userTable.Clone();
                    for (int i = startIdx; i <= endIdx; i++)
                        batchDt.Rows.Add(userTable.Rows[i].ItemArray);
                    bool batchOk = false;
                    for (int attempt = 1; attempt <= 3 && !batchOk; attempt++)
                    {
                        try
                        {
                            RunOneBatchUpdateUser(connectionString, batchDt);
                            batchOk = true;
                        }
                        catch (Exception ex)
                        {
                            if (attempt == 3) throw new Exception("Batch update failed (batch " + (b + 1) + "/" + totalBatches + "): " + ex.Message);
                        }
                    }
                }
                var parts = new List<string>();
                if (isUpdatePassword) parts.Add("Password (đã cập nhật)");
                if (isUpdateEmail) parts.Add(string.IsNullOrEmpty(chosenEmail) ? "Email" : "Email = " + chosenEmail);
                var summary = parts.Count > 0
                    ? ("Đã cập nhật: " + string.Join(", ", parts) + " cho " + updateUsers.Count + " user.")
                    : ("Đã update " + updateUsers.Count + " user.");
                return Tuple.Create(true, summary);
            }
            catch (Exception ex)
            {
                return Tuple.Create(false, ex.Message);
            }
        }

        /// <summary>Một batch update user: mở connection mới, tạo #UserTemp, bulk copy batchDt, UPDATE. Đóng connection. Retry = connection mới.</summary>
        private static void RunOneBatchUpdateUser(string connectionString, DataTable batchDt)
        {
            using (var conn = new SqlConnection(connectionString))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 600;
                    cmd.CommandText = @"
SET NOCOUNT ON; SET XACT_ABORT ON; SET LOCK_TIMEOUT 5000;
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
                    bulk.ColumnMappings.Add("UserID", "UserID");
                    bulk.WriteToServer(batchDt);
                }
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 600;
                    cmd.CommandText = "CREATE NONCLUSTERED INDEX IX_UT_UserID ON #UserTemp(UserID);";
                    try { cmd.ExecuteNonQuery(); } catch { /* ignore */ }
                }
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 120;
                    cmd.CommandText = @"
SET LOCK_TIMEOUT 5000;
BEGIN TRAN;
UPDATE U SET U.[Password]=UT.[Password], U.IsRequireChangePassword=UT.IsRequireChangePassword,
    U.LastLoginDateTime=UT.LastLoginDateTime, U.IsLockedOut=UT.IsLockedOut, U.IsWindowADAccount=UT.IsWindowADAccount,
    U.LastPasswordChangedDateTime=UT.LastPasswordChangedDateTime, U.FailedPasswordAttemptCount=UT.FailedPasswordAttemptCount,
    U.ReceiveEmailTypeID=UT.ReceiveEmailTypeID, U.UserEmailAddress=UT.UserEmailAddress
FROM #UserTemp UT
JOIN dbo.Security_Users U WITH (ROWLOCK, UPDLOCK) ON U.ID = UT.UserID
WHERE UT.UserID IS NOT NULL;
UPDATE E SET E.PersonalEmailAddress=UT.EmployeePersonalEmail, E.BusinessEmailAddress=UT.EmployeeBusinessEmail
FROM #UserTemp UT
JOIN dbo.Security_Users U WITH (READCOMMITTED) ON U.ID = UT.UserID
JOIN dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK) ON E.ID = U.EmployeeID
WHERE UT.UserID IS NOT NULL;
COMMIT TRAN;";
                    cmd.ExecuteNonQuery();
                }
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
                    return new { success = false, message = "Chưa kết nối database. Vui lòng Connect từ Công cụ Database." };
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
                var payload = JsonConvert.SerializeObject(new { connectionString = connStr, userIds, isUpdatePassword, password, methodHash, isUpdateEmail, email = email ?? "", ignoreWindowsAD });
                var jobId = BaJobQueue.Enqueue(new BaJobRequest { JobType = "HRHelperUpdateUser", ServerName = serverName, DatabaseName = databaseName, UserId = userId, UserName = userName, Payload = payload });
                var detail = "jobId=" + jobId + ", database=" + databaseName + ", userIds=" + (userIds?.Count ?? 0);
                if (isUpdatePassword) detail += ", password=updated";
                if (isUpdateEmail && !string.IsNullOrWhiteSpace(email)) detail += ", email=" + email.Trim();
                UserActionLogHelper.Log("HRHelper.UpdateUser", detail);
                return new { success = true, jobId = jobId, message = "Đã đưa update user vào hàng đợi." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        /// <summary>Kiểm tra database HR có bảng Security_Users với cột liên quan User Signature (UserSignature, GeneralCalcSignature, GeneralOidcSignature). Nếu không có thì ẩn nút Update User Signature.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object HasUserSignatureColumn(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, hasColumn = false };
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT 1 FROM sys.columns c
INNER JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = N'Security_Users' AND c.name IN (N'UserSignature', N'GeneralCalcSignature', N'GeneralOidcSignature')";
                    conn.Open();
                    var has = cmd.ExecuteScalar() != null;
                    return new { success = true, hasColumn = has };
                }
            }
            catch
            {
                return new { success = false, hasColumn = false };
            }
        }

        /// <summary>Đưa Update User Signature vào job nền. Công thức tính UserSignature phải khớp với logic login Cadena (UserName + ID + Password hash).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartHRHelperUpdateUserSignatureJob(string k, List<long> userIds)
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
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var connStr = info.ConnectionString;
                var serverName = info.Server ?? "";
                var databaseName = info.Database ?? "";
                var payload = JsonConvert.SerializeObject(new { connectionString = connStr, userIds });
                var jobId = BaJobQueue.Enqueue(new BaJobRequest { JobType = "HRHelperUpdateUserSignature", ServerName = serverName, DatabaseName = databaseName, UserId = userId, UserName = userName, Payload = payload });
                UserActionLogHelper.Log("HRHelper.UpdateUserSignature", "jobId=" + jobId + ", database=" + databaseName + ", userIds=" + userIds.Count);
                return new { success = true, jobId = jobId, message = "Đã đưa Update User Signature vào hàng đợi." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        /// <summary>Cập nhật UserSignature theo Cadena UserAccount.UpdateUserSignature: plain = ID+UserName+EmployeeID+identifiers, hash = SimpleHash.ComputeHash(plain, SHA256) → Base64(hash+salt).</summary>
        private static string BuildCadenaPlainSignature(long id, string userName, long? employeeId,
            string azureAdIdentifier, string oktaIdentifier, string googleIdentifier, string generalOidcIdentifier)
        {
            return id.ToString()
                + (userName ?? "")
                + (employeeId.HasValue ? employeeId.Value.ToString() : "")
                + (azureAdIdentifier ?? "")
                + (oktaIdentifier ?? "")
                + (googleIdentifier ?? "")
                + (generalOidcIdentifier ?? "");
        }

        private static bool SecurityUsersHasColumn(SqlConnection conn, string columnName)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT 1 FROM sys.columns c
INNER JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = N'Security_Users' AND c.name = @col";
                cmd.Parameters.AddWithValue("@col", columnName);
                return cmd.ExecuteScalar() != null;
            }
        }

        private static Tuple<bool, string> ExecuteUpdateUserSignatureCore(string connectionString, List<long> userIds)
        {
            if (userIds == null || userIds.Count == 0)
                return Tuple.Create(false, "Không có user nào.");
            using (var conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string signatureColumn = null;
                using (var cmdCol = conn.CreateCommand())
                {
                    cmdCol.CommandText = @"
SELECT TOP 1 c.name FROM sys.columns c
INNER JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = N'Security_Users' AND c.name IN (N'UserSignature', N'GeneralCalcSignature', N'GeneralOidcSignature')
ORDER BY CASE c.name WHEN N'UserSignature' THEN 1 WHEN N'GeneralCalcSignature' THEN 2 ELSE 3 END";
                    var obj = cmdCol.ExecuteScalar();
                    signatureColumn = obj != null ? obj.ToString() : null;
                }
                if (string.IsNullOrEmpty(signatureColumn))
                    return Tuple.Create(false, "Bảng Security_Users không có cột UserSignature / GeneralCalcSignature / GeneralOidcSignature.");

                var hasAzure = SecurityUsersHasColumn(conn, "AzureADIdentifier");
                var hasOkta = SecurityUsersHasColumn(conn, "OktaIdentifier");
                var hasGoogle = SecurityUsersHasColumn(conn, "GoogleIdentifier");
                var hasOidc = SecurityUsersHasColumn(conn, "GeneralOidcIdentifier");

                var selectCols = new List<string> { "U.ID", "U.UserName", "U.EmployeeID" };
                if (hasAzure) selectCols.Add("U.AzureADIdentifier");
                if (hasOkta) selectCols.Add("U.OktaIdentifier");
                if (hasGoogle) selectCols.Add("U.GoogleIdentifier");
                if (hasOidc) selectCols.Add("U.GeneralOidcIdentifier");

                var idList = string.Join(",", userIds.Select(x => x.ToString()));
                var users = new List<Tuple<long, string>>();
                using (var cmdRead = conn.CreateCommand())
                {
                    cmdRead.CommandText = "SELECT " + string.Join(", ", selectCols)
                        + " FROM dbo.Security_Users U WHERE U.ID IN (" + idList + ")";
                    cmdRead.CommandTimeout = 120;
                    using (var r = cmdRead.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var uid = Convert.ToInt64(r.GetValue(0));
                            var userName = r.IsDBNull(1) ? "" : r.GetValue(1).ToString();
                            long? employeeId = null;
                            if (!r.IsDBNull(2))
                                employeeId = Convert.ToInt64(r.GetValue(2));
                            var colIdx = 3;
                            string azure = "", okta = "", google = "", oidc = "";
                            if (hasAzure) { azure = r.IsDBNull(colIdx) ? "" : r.GetValue(colIdx).ToString(); colIdx++; }
                            if (hasOkta) { okta = r.IsDBNull(colIdx) ? "" : r.GetValue(colIdx).ToString(); colIdx++; }
                            if (hasGoogle) { google = r.IsDBNull(colIdx) ? "" : r.GetValue(colIdx).ToString(); colIdx++; }
                            if (hasOidc) { oidc = r.IsDBNull(colIdx) ? "" : r.GetValue(colIdx).ToString(); colIdx++; }

                            var plain = BuildCadenaPlainSignature(uid, userName, employeeId, azure, okta, google, oidc);
                            var signature = SimpleHash.ComputeHash(plain, SimpleHash.HashType.SHA256);
                            users.Add(Tuple.Create(uid, signature));
                        }
                    }
                }

                if (users.Count == 0)
                    return Tuple.Create(false, "Không tìm thấy user để cập nhật.");

                using (var tran = conn.BeginTransaction())
                {
                    try
                    {
                        using (var cmdUpd = conn.CreateCommand())
                        {
                            cmdUpd.Transaction = tran;
                            cmdUpd.CommandTimeout = 120;
                            cmdUpd.CommandText = "UPDATE dbo.Security_Users SET [" + signatureColumn + "] = @sig WHERE ID = @id";
                            var pSig = cmdUpd.Parameters.Add("@sig", System.Data.SqlDbType.NVarChar, 128);
                            var pId = cmdUpd.Parameters.Add("@id", System.Data.SqlDbType.BigInt);
                            foreach (var u in users)
                            {
                                pSig.Value = u.Item2;
                                pId.Value = u.Item1;
                                cmdUpd.ExecuteNonQuery();
                            }
                        }
                        tran.Commit();
                    }
                    catch
                    {
                        tran.Rollback();
                        throw;
                    }
                }
            }
            return Tuple.Create(true, "Đã cập nhật User Signature cho " + userIds.Count + " user (Cadena SimpleHash SHA256 + salt, Base64).");
        }

        /// <summary>Generate SQL UPDATE script for Security_Users (password + flags). WHERE theo User ID (tránh trùng username giữa tenant).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GeneratePasswordUpdateScript(List<UserPasswordScriptItem> users, string password, string method)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", script = (string)null };
                if (users == null || users.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 user.", script = (string)null };
                if (string.IsNullOrWhiteSpace(password))
                    return new { success = false, message = "Nhập password.", script = (string)null };
                var methodNorm = (method ?? "").Trim().ToUpperInvariant();
                SimpleHash.HashType hashType;
                if (methodNorm == "MD5")
                    hashType = SimpleHash.HashType.MD5;
                else if (methodNorm == "256" || methodNorm == "SHA256")
                    hashType = SimpleHash.HashType.SHA256;
                else
                    return new { success = false, message = "Chọn Method Hash: MD5 hoặc 256.", script = (string)null };

                var dateStr = DateTime.Now.ToString("yyyy-MM-dd");
                var sb = new System.Text.StringBuilder();
                foreach (var item in users)
                {
                    if (item == null || item.userId <= 0) continue;
                    var userName = (item.userName ?? "").Trim();
                    if (string.IsNullOrEmpty(userName)) continue;
                    var plain = userName.ToLowerInvariant() + password;
                    var encPwd = SimpleHash.ComputeHashNoSalt(plain, hashType);
                    var pwdEsc = (encPwd ?? "").Replace("'", "''");
                    sb.AppendLine("UPDATE Security_Users");
                    sb.AppendLine("SET Password='" + pwdEsc + "',");
                    sb.AppendLine("  IsRequireChangePassword = 0,");
                    sb.AppendLine("  LastLoginDateTime = '" + dateStr + "',");
                    sb.AppendLine("  LastPasswordChangedDateTime = '" + dateStr + "',");
                    sb.AppendLine("  IsLockedOut = 0,");
                    sb.AppendLine("  FailedPasswordAttemptCount = 0,");
                    sb.AppendLine("  IsWindowADAccount = 0,");
                    sb.AppendLine("  ReceiveEmailTypeID = 2,");
                    sb.AppendLine("  UserEmailAddress = NULL");
                    sb.AppendLine("WHERE ID = " + item.userId);
                    sb.AppendLine();
                }
                return new { success = true, script = sb.ToString().TrimEnd(), message = (string)null };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, script = (string)null };
            }
        }

        public class UserPasswordScriptItem
        {
            public long userId { get; set; }
            public string userName { get; set; }
        }

        /// <summary>Đảm bảo connection string có Connection Timeout đủ lớn cho job batch (tránh connection đóng giữa chừng).</summary>
        private static string EnsureMinConnectionTimeout(string connectionString, int timeoutSeconds)
        {
            if (string.IsNullOrEmpty(connectionString) || timeoutSeconds <= 0) return connectionString;
            try
            {
                var b = new SqlConnectionStringBuilder(connectionString);
                if (b.ConnectTimeout < timeoutSeconds)
                    b.ConnectTimeout = timeoutSeconds;
                return b.ConnectionString;
            }
            catch { return connectionString; }
        }

        /// <summary>Ghép message kết quả + giá trị đã cập nhật (email, phone, lương) để hiển thị trong chi tiết thông báo.</summary>
        private static string BuildHRHelperUpdateEmployeeResultMessage(string summary, bool updPersonal, string personalEmail, bool updBusiness, string businessEmail, bool updPayslip, string payslipCommon, bool updM1, string m1, bool updM2, string m2, bool updBasic, decimal basicSalary)
        {
            if (string.IsNullOrEmpty(summary)) return summary;
            var parts = new List<string>();
            if (updPersonal && !string.IsNullOrWhiteSpace(personalEmail)) parts.Add("Email cá nhân: " + (personalEmail.Length > 60 ? personalEmail.Substring(0, 60) + "…" : personalEmail));
            if (updBusiness && !string.IsNullOrWhiteSpace(businessEmail)) parts.Add("Email công việc: " + (businessEmail.Length > 60 ? businessEmail.Substring(0, 60) + "…" : businessEmail));
            if (updPayslip && !string.IsNullOrWhiteSpace(payslipCommon)) parts.Add("Payslip: (đã cập nhật)");
            if (updM1 && !string.IsNullOrWhiteSpace(m1)) parts.Add("SĐT 1: " + m1);
            if (updM2 && !string.IsNullOrWhiteSpace(m2)) parts.Add("SĐT 2: " + m2);
            if (updBasic) parts.Add("Lương: " + basicSalary.ToString("N2"));
            if (parts.Count == 0) return summary;
            return summary + "\nGiá trị đã cập nhật: " + string.Join(" | ", parts);
        }

        private static void UpdateBaJobCompleted(int jobId, string jobType, bool success, string message)
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaJob SET Status = @st, PercentComplete = 100, Message = @msg, CompletedAt = SYSDATETIME() WHERE Id = @id AND JobType = @jt AND Status = N'Running'";
                    cmd.Parameters.AddWithValue("@st", success ? "Completed" : "Failed");
                    cmd.Parameters.AddWithValue("@msg", (object)message ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    cmd.Parameters.AddWithValue("@jt", jobType);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                BaJobProgress.End(jobId);
                BaJobWorkerNotify.Notify(jobId);
            }
            catch { }
        }

        /// <summary>Cập nhật % và message cho job đang Running (Worker gọi sau mỗi batch để UI cập nhật).</summary>
        private static void UpdateBaJobProgress(int jobId, string jobType, int percent, string message, string detail = null)
        {
            BaJobProgress.Report(jobId, percent, message, detail);
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
            dt.Columns.Add("UserID", typeof(long));

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
                row["UserID"] = u.UserID;
                dt.Rows.Add(row);
            }

            return dt;
        }

        /* WinForms: OU.NameEN AS ManagerOrganizionStructure; we use OrganizionStructure for OU to avoid duplicate alias with M.ManagerOrganizionStructure.
         * EmployeeUser: CTE thay OUTER APPLY (1 lần). Manager: giữ OUTER APPLY (tránh clash kiểu TenantID giữa bảng). */
        private const string EmployeesQueryBase = @"
;WITH EmployeeUser AS (
    SELECT U.ID, U.UserName, U.EmployeeID,
           ROW_NUMBER() OVER (PARTITION BY U.EmployeeID ORDER BY U.IsActive DESC, U.ID) AS rn
    FROM Security_Users AS U
)
SELECT E.ID AS EmployeeID, E.LocalEmployeeID AS EmployeeLocalID, E.FullName AS EmployeeName, E.EnglishName AS EmployeeEnglishName, E.DateOfBirth,
       E.PersonalEmailAddress, E.BusinessEmailAddress, E.MobilePhone1, E.MobilePhone2,
       T.ServiceStartDate,
       TSA.ID AS ALPolicyID, TSA.NameEN AS ALPolicy,
       TS.ID AS TimeSheetPolicyID, TS.NameEN AS TimeSheetPolicy,
       OS.ID AS OrganizionStructureID, OU.NameEN AS OrganizionStructure,
       M.ManagerEmployeeID, M.ManagerLocalEmployeeID, M.ManagerFullName, M.ManagerUserName, M.ManagerOrganizionStructureID, M.ManagerOrganizionStructure,
       U.ID AS UserID, U.UserName, E.PayslipPassword,
       CAST(C.ID AS VARCHAR(10)) + ' - ' + C.Code + ' - ' + C.NameEN AS CompanyInfo,
       T.ID AS TransactionID
FROM Staffing_Transactions AS T
INNER JOIN Staffing_OrganizationStructures AS OS ON OS.ID = T.OrganizationStructureID
INNER JOIN Staffing_OrganizationUnits AS OU ON OU.ID = OS.OrgUnitID
INNER JOIN Staffing_Employees AS E ON E.ID = T.EmployeeID
LEFT JOIN EmployeeUser AS U ON U.EmployeeID = E.ID AND U.rn = 1
INNER JOIN TIM_TimeSheetPolicies AS TS ON TS.ID = T.TimeSheetPolicyID
INNER JOIN TIM_TimeSheetALPolicies AS TSA ON TSA.ID = T.TimeSheetALPolicyID
INNER JOIN MultiTenant_Companies AS C ON C.ID = T.CompanyID
OUTER APPLY (
    SELECT TOP 1 ME.LocalEmployeeID AS ManagerLocalEmployeeID, ME.ID AS ManagerEmployeeID, ME.FullName AS ManagerFullName,
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

        /* Query nhanh: 1 lần duy nhất — không CTE User, không cột encrypted/payslip (giảm ~90% bytes/row). Decrypt lấy từ DB khi xem trang. */
        private const string EmployeesQueryListFast = @"
SELECT E.ID AS EmployeeID, E.LocalEmployeeID AS EmployeeLocalID, E.FullName AS EmployeeName, E.EnglishName AS EmployeeEnglishName, E.DateOfBirth,
       CAST(NULL AS NVARCHAR(1)) AS PersonalEmailAddress, CAST(NULL AS NVARCHAR(1)) AS BusinessEmailAddress,
       CAST(NULL AS NVARCHAR(1)) AS MobilePhone1, CAST(NULL AS NVARCHAR(1)) AS MobilePhone2,
       T.ServiceStartDate,
       TSA.ID AS ALPolicyID, TSA.NameEN AS ALPolicy,
       TS.ID AS TimeSheetPolicyID, TS.NameEN AS TimeSheetPolicy,
       OS.ID AS OrganizionStructureID, OU.NameEN AS OrganizionStructure,
       CAST(NULL AS BIGINT) AS ManagerEmployeeID, CAST(NULL AS NVARCHAR(1)) AS ManagerLocalEmployeeID,
       CAST(NULL AS NVARCHAR(1)) AS ManagerFullName, CAST(NULL AS NVARCHAR(1)) AS ManagerUserName,
       CAST(NULL AS BIGINT) AS ManagerOrganizionStructureID, CAST(NULL AS NVARCHAR(1)) AS ManagerOrganizionStructure,
       CAST(NULL AS BIGINT) AS UserID, CAST(NULL AS NVARCHAR(1)) AS UserName, CAST(NULL AS NVARCHAR(1)) AS PayslipPassword,
       CAST(C.ID AS VARCHAR(10)) + ' - ' + C.Code + ' - ' + C.NameEN AS CompanyInfo,
       T.ID AS TransactionID
FROM Staffing_Transactions AS T WITH (NOLOCK)
INNER JOIN Staffing_OrganizationStructures AS OS WITH (NOLOCK) ON OS.ID = T.OrganizationStructureID
INNER JOIN Staffing_OrganizationUnits AS OU WITH (NOLOCK) ON OU.ID = OS.OrgUnitID
INNER JOIN Staffing_Employees AS E WITH (NOLOCK) ON E.ID = T.EmployeeID
INNER JOIN TIM_TimeSheetPolicies AS TS WITH (NOLOCK) ON TS.ID = T.TimeSheetPolicyID
INNER JOIN TIM_TimeSheetALPolicies AS TSA WITH (NOLOCK) ON TSA.ID = T.TimeSheetALPolicyID
INNER JOIN MultiTenant_Companies AS C WITH (NOLOCK) ON C.ID = T.CompanyID
WHERE T.IsActiveTransaction = 1";

        /* Phân trang View Data: chỉ T+E+Company — policy/org/user load lazy (LoadEmployeeGridExtras). */
        private const string EmployeesQueryPageMinimal = @"
SELECT E.ID AS EmployeeID, E.LocalEmployeeID AS EmployeeLocalID, E.FullName AS EmployeeName, E.EnglishName AS EmployeeEnglishName, E.DateOfBirth,
       CAST(NULL AS NVARCHAR(1)) AS PersonalEmailAddress, CAST(NULL AS NVARCHAR(1)) AS BusinessEmailAddress,
       CAST(NULL AS NVARCHAR(1)) AS MobilePhone1, CAST(NULL AS NVARCHAR(1)) AS MobilePhone2,
       T.ServiceStartDate,
       CAST(NULL AS BIGINT) AS ALPolicyID, CAST(NULL AS NVARCHAR(1)) AS ALPolicy,
       CAST(NULL AS BIGINT) AS TimeSheetPolicyID, CAST(NULL AS NVARCHAR(1)) AS TimeSheetPolicy,
       CAST(NULL AS BIGINT) AS OrganizionStructureID, CAST(NULL AS NVARCHAR(1)) AS OrganizionStructure,
       CAST(NULL AS BIGINT) AS ManagerEmployeeID, CAST(NULL AS NVARCHAR(1)) AS ManagerLocalEmployeeID,
       CAST(NULL AS NVARCHAR(1)) AS ManagerFullName, CAST(NULL AS NVARCHAR(1)) AS ManagerUserName,
       CAST(NULL AS BIGINT) AS ManagerOrganizionStructureID, CAST(NULL AS NVARCHAR(1)) AS ManagerOrganizionStructure,
       CAST(NULL AS BIGINT) AS UserID, CAST(NULL AS NVARCHAR(1)) AS UserName, CAST(NULL AS NVARCHAR(1)) AS PayslipPassword,
       CAST(C.ID AS VARCHAR(10)) + ' - ' + C.Code + ' - ' + C.NameEN AS CompanyInfo,
       T.ID AS TransactionID
FROM Staffing_Transactions AS T WITH (NOLOCK)
INNER JOIN Staffing_Employees AS E WITH (NOLOCK) ON E.ID = T.EmployeeID
INNER JOIN MultiTenant_Companies AS C WITH (NOLOCK) ON C.ID = T.CompanyID
WHERE T.IsActiveTransaction = 1";

        /* Query list (chunk API): có UserName, vẫn không manager. */
        private const string EmployeesQueryList = @"
;WITH EmployeeUser AS (
    SELECT U.ID, U.UserName, U.EmployeeID,
           ROW_NUMBER() OVER (PARTITION BY U.EmployeeID ORDER BY U.IsActive DESC, U.ID) AS rn
    FROM Security_Users AS U
)
SELECT E.ID AS EmployeeID, E.LocalEmployeeID AS EmployeeLocalID, E.FullName AS EmployeeName, E.EnglishName AS EmployeeEnglishName, E.DateOfBirth,
       E.PersonalEmailAddress, E.BusinessEmailAddress, E.MobilePhone1, E.MobilePhone2,
       T.ServiceStartDate,
       TSA.ID AS ALPolicyID, TSA.NameEN AS ALPolicy,
       TS.ID AS TimeSheetPolicyID, TS.NameEN AS TimeSheetPolicy,
       OS.ID AS OrganizionStructureID, OU.NameEN AS OrganizionStructure,
       CAST(NULL AS BIGINT) AS ManagerEmployeeID, CAST(NULL AS NVARCHAR(250)) AS ManagerLocalEmployeeID,
       CAST(NULL AS NVARCHAR(250)) AS ManagerFullName, CAST(NULL AS NVARCHAR(100)) AS ManagerUserName,
       CAST(NULL AS BIGINT) AS ManagerOrganizionStructureID, CAST(NULL AS NVARCHAR(250)) AS ManagerOrganizionStructure,
       U.ID AS UserID, U.UserName, E.PayslipPassword,
       CAST(C.ID AS VARCHAR(10)) + ' - ' + C.Code + ' - ' + C.NameEN AS CompanyInfo,
       T.ID AS TransactionID
FROM Staffing_Transactions AS T WITH (NOLOCK)
INNER JOIN Staffing_OrganizationStructures AS OS WITH (NOLOCK) ON OS.ID = T.OrganizationStructureID
INNER JOIN Staffing_OrganizationUnits AS OU WITH (NOLOCK) ON OU.ID = OS.OrgUnitID
INNER JOIN Staffing_Employees AS E WITH (NOLOCK) ON E.ID = T.EmployeeID
LEFT JOIN EmployeeUser AS U ON U.EmployeeID = E.ID AND U.rn = 1
INNER JOIN TIM_TimeSheetPolicies AS TS WITH (NOLOCK) ON TS.ID = T.TimeSheetPolicyID
INNER JOIN TIM_TimeSheetALPolicies AS TSA WITH (NOLOCK) ON TSA.ID = T.TimeSheetALPolicyID
INNER JOIN MultiTenant_Companies AS C WITH (NOLOCK) ON C.ID = T.CompanyID
WHERE T.IsActiveTransaction = 1";

        private const int EmployeeFetchBatchSize = 2000;

        private static int GetEmployeesCountInternal(string connectionString, int? companyID)
        {
            using (var conn = new SqlConnection(connectionString))
            using (var cmd = conn.CreateCommand())
            {
                var query = EmployeesCountQuery;
                if (companyID.HasValue && companyID.Value > 0)
                {
                    query += " AND T.CompanyID = @companyID";
                    cmd.Parameters.AddWithValue("@companyID", companyID.Value);
                }
                cmd.CommandText = query;
                conn.Open();
                return Convert.ToInt32(cmd.ExecuteScalar());
            }
        }

        private static List<Dictionary<string, object>> FetchAllEmployees(SqlConnection conn, int? companyID, string progressKey)
        {
            var list = new List<Dictionary<string, object>>(14000);
            var swRead = string.IsNullOrEmpty(progressKey) ? null : HrEmployeeLoadProgress.StartPhase(progressKey, "fetch_all_read");
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 600;
                var whereExtra = "";
                AppendEmployeeCompanyFilter(cmd, companyID, ref whereExtra);
                cmd.CommandText = EmployeesQueryListFast + whereExtra + " ORDER BY T.EmployeeID, T.ID";
                var swOpen = string.IsNullOrEmpty(progressKey) ? null : HrEmployeeLoadProgress.StartPhase(progressKey, "fetch_all_open");
                using (var r = cmd.ExecuteReader(CommandBehavior.SequentialAccess))
                {
                    HrEmployeeLoadProgress.EndPhase(progressKey, "fetch_all_open", swOpen, null);
                    var values = new object[r.FieldCount];
                    var rowIndex = 0;
                    while (r.Read())
                    {
                        r.GetValues(values);
                        list.Add(ReadEmployeeRowDictFromValues(values, false));
                        rowIndex++;
                        if (!string.IsNullOrEmpty(progressKey) && rowIndex % 500 == 0)
                        {
                            HrEmployeeLoadProgress.Set(progressKey, -1, rowIndex, false, false,
                                "Đang đọc " + rowIndex + " dòng...", "fetch_all");
                        }
                    }
                }
            }
            HrEmployeeLoadProgress.EndPhase(progressKey, "fetch_all_read", swRead, "rows=" + list.Count);
            return list;
        }

        private static void LoadEncryptedFieldsFromDb(string connectionString, IList<Dictionary<string, object>> employees, HashSet<long> idSet)
        {
            if (employees == null || idSet == null || idSet.Count == 0) return;
            var idList = idSet.ToList();
            var byId = new Dictionary<long, Dictionary<string, object>>();
            foreach (var emp in employees)
            {
                if (emp == null) continue;
                var eid = MyConvert.To<long>(emp.ContainsKey("employeeID") ? emp["employeeID"] : 0);
                if (idSet.Contains(eid)) byId[eid] = emp;
            }
            const int chunk = 200;
            for (var i = 0; i < idList.Count; i += chunk)
            {
                var take = Math.Min(chunk, idList.Count - i);
                var inList = string.Join(",", idList.Skip(i).Take(take));
                using (var conn = new SqlConnection(connectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 120;
                    cmd.CommandText = @"
SELECT E.ID, E.PersonalEmailAddress, E.BusinessEmailAddress, E.MobilePhone1, E.MobilePhone2, E.PayslipPassword
FROM Staffing_Employees AS E WITH (NOLOCK)
WHERE E.ID IN (" + inList + @")";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var eid = MyConvert.To<long>(r.GetValue(0));
                            Dictionary<string, object> emp;
                            if (!byId.TryGetValue(eid, out emp) || emp == null) continue;
                            var raw5 = MyConvert.To<string>(r.GetValue(1));
                            var raw6 = MyConvert.To<string>(r.GetValue(2));
                            var raw7 = MyConvert.To<string>(r.GetValue(3));
                            var raw8 = MyConvert.To<string>(r.GetValue(4));
                            var raw24 = MyConvert.To<string>(r.GetValue(5));
                            if (!string.IsNullOrWhiteSpace(raw5)) emp["_encPersonal"] = raw5;
                            if (!string.IsNullOrWhiteSpace(raw6)) emp["_encBusiness"] = raw6;
                            if (!string.IsNullOrWhiteSpace(raw7)) emp["_encM1"] = raw7;
                            if (!string.IsNullOrWhiteSpace(raw8)) emp["_encM2"] = raw8;
                            if (!string.IsNullOrWhiteSpace(raw24)) emp["_encPayslip"] = raw24;
                            emp["sensitiveDecrypted"] = false;
                        }
                    }
                }
            }
        }

        private static List<Dictionary<string, object>> FetchEmployeeBatch(
            SqlConnection conn, int? companyID, long afterEmployeeID, int take, bool useListQuery, bool decryptSensitive,
            string progressKey, int loadedBefore, int batchIndex)
        {
            var list = new List<Dictionary<string, object>>(take);
            var phaseOpen = "batch_" + batchIndex + "_open_reader";
            var phaseRead = "batch_" + batchIndex + "_read_rows";
            var swOpen = string.IsNullOrEmpty(progressKey) ? null : HrEmployeeLoadProgress.StartPhase(progressKey, phaseOpen);
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 180;
                var whereExtra = "";
                AppendEmployeeCompanyFilter(cmd, companyID, ref whereExtra);
                whereExtra += AppendEmployeeKeysetFilter(cmd, afterEmployeeID);
                cmd.CommandText = (useListQuery ? EmployeesQueryListFast : EmployeesQueryBase) + whereExtra
                    + " ORDER BY T.EmployeeID, T.ID OFFSET 0 ROWS FETCH NEXT @cnt ROWS ONLY";
                cmd.Parameters.AddWithValue("@cnt", take);
                using (var r = cmd.ExecuteReader(CommandBehavior.SequentialAccess))
                {
                    HrEmployeeLoadProgress.EndPhase(progressKey, phaseOpen, swOpen, "afterEmp=" + afterEmployeeID + " take=" + take);
                    var swRead = string.IsNullOrEmpty(progressKey) ? null : Stopwatch.StartNew();
                    var fieldCount = r.FieldCount;
                    var values = new object[fieldCount];
                    var rowIndex = 0;
                    while (r.Read())
                    {
                        r.GetValues(values);
                        list.Add(ReadEmployeeRowDictFromValues(values, decryptSensitive));
                        rowIndex++;
                        if (!string.IsNullOrEmpty(progressKey) && rowIndex % 200 == 0)
                        {
                            HrEmployeeLoadProgress.Set(progressKey, -1, loadedBefore + rowIndex, false, false,
                                "Đang đọc batch " + batchIndex + ": " + (loadedBefore + rowIndex) + " dòng",
                                "batch_" + batchIndex + "_reading");
                        }
                    }
                    HrEmployeeLoadProgress.EndPhase(progressKey, phaseRead, swRead, "rows=" + rowIndex + " afterEmp=" + afterEmployeeID);
                }
            }
            return list;
        }

        /// <summary>Map 1 dòng từ mảng cột (sau GetValues). SqlDataReader chỉ đọc tuần tự — không parallel được.</summary>
        private static Dictionary<string, object> ReadEmployeeRowDictFromValues(object[] v, bool decryptSensitive)
        {
            var empId = MyConvert.To<long>(v[0]);
            var raw5 = MyConvert.To<string>(v[5]);
            var raw6 = MyConvert.To<string>(v[6]);
            var raw7 = MyConvert.To<string>(v[7]);
            var raw8 = MyConvert.To<string>(v[8]);
            var raw24 = MyConvert.To<string>(v[24]);
            string personal = "", business = "", m1 = "", m2 = "", payslip = "";
            var dict = new Dictionary<string, object>(32, StringComparer.OrdinalIgnoreCase);
            if (decryptSensitive)
            {
                personal = DecryptEmployeeField(raw5, empId);
                business = DecryptEmployeeField(raw6, empId);
                m1 = DecryptEmployeeField(raw7, empId);
                m2 = DecryptEmployeeField(raw8, empId);
                payslip = DecryptEmployeeField(raw24, empId);
                dict["sensitiveDecrypted"] = true;
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(raw5)) dict["_encPersonal"] = raw5;
                if (!string.IsNullOrWhiteSpace(raw6)) dict["_encBusiness"] = raw6;
                if (!string.IsNullOrWhiteSpace(raw7)) dict["_encM1"] = raw7;
                if (!string.IsNullOrWhiteSpace(raw8)) dict["_encM2"] = raw8;
                if (!string.IsNullOrWhiteSpace(raw24)) dict["_encPayslip"] = raw24;
                dict["sensitiveDecrypted"] = false;
            }
            var dob = MyConvert.To<DateTime?>(v[4]);
            var svc = MyConvert.To<DateTime?>(v[9]);
            dict["employeeID"] = empId;
            dict["localEmployeeID"] = MyConvert.To<string>(v[1]) ?? "";
            dict["employeeName"] = MyConvert.To<string>(v[2]) ?? "";
            dict["englishName"] = MyConvert.To<string>(v[3]) ?? "";
            dict["dateOfBirth"] = dob.HasValue ? dob.Value.ToString("yyyy-MM-dd") : "";
            dict["personalEmail"] = personal;
            dict["businessEmail"] = business;
            dict["mobilePhone1"] = m1;
            dict["mobilePhone2"] = m2;
            dict["serviceStartDate"] = svc.HasValue ? svc.Value.ToString("yyyy-MM-dd") : "";
            dict["alPolicyID"] = MyConvert.To<long?>(v[10]);
            dict["alPolicy"] = MyConvert.To<string>(v[11]) ?? "";
            dict["timeSheetPolicyID"] = MyConvert.To<long?>(v[12]);
            dict["timeSheetPolicy"] = MyConvert.To<string>(v[13]) ?? "";
            dict["organizionStructureID"] = MyConvert.To<long?>(v[14]);
            dict["organizionStructure"] = MyConvert.To<string>(v[15]) ?? "";
            dict["managerEmployeeID"] = MyConvert.To<long?>(v[16]);
            dict["managerLocalEmployeeID"] = MyConvert.To<string>(v[17]) ?? "";
            dict["managerFullName"] = MyConvert.To<string>(v[18]) ?? "";
            dict["managerUserName"] = MyConvert.To<string>(v[19]) ?? "";
            dict["managerOrganizionStructureID"] = MyConvert.To<long?>(v[20]);
            dict["managerOrganizionStructure"] = MyConvert.To<string>(v[21]) ?? "";
            dict["userID"] = MyConvert.To<long?>(v[22]);
            dict["userName"] = MyConvert.To<string>(v[23]) ?? "";
            dict["payslipPassword"] = payslip;
            dict["companyInfo"] = MyConvert.To<string>(v[25]) ?? "";
            dict["transactionID"] = MyConvert.To<long?>(v[26]);
            return dict;
        }

        private static string DecryptEmployeeField(string raw, long empId)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "";
            try { return DataSecurityWrapper.DecryptData<string>(raw, empId) ?? ""; }
            catch { return ""; }
        }

        private static Dictionary<string, object> ReadEmployeeRowDict(SqlDataReader r, bool decryptSensitive)
        {
            var values = new object[r.FieldCount];
            r.GetValues(values);
            return ReadEmployeeRowDictFromValues(values, decryptSensitive);
        }

        private static void DecryptEmployeeDict(Dictionary<string, object> emp)
        {
            if (emp == null) return;
            if (MyConvert.To<bool>(emp.ContainsKey("sensitiveDecrypted") ? emp["sensitiveDecrypted"] : false))
                return;
            var empId = MyConvert.To<long>(emp.ContainsKey("employeeID") ? emp["employeeID"] : 0);
            if (emp.ContainsKey("_encPersonal"))
                emp["personalEmail"] = DecryptEmployeeField(MyConvert.To<string>(emp["_encPersonal"]), empId);
            if (emp.ContainsKey("_encBusiness"))
                emp["businessEmail"] = DecryptEmployeeField(MyConvert.To<string>(emp["_encBusiness"]), empId);
            if (emp.ContainsKey("_encM1"))
                emp["mobilePhone1"] = DecryptEmployeeField(MyConvert.To<string>(emp["_encM1"]), empId);
            if (emp.ContainsKey("_encM2"))
                emp["mobilePhone2"] = DecryptEmployeeField(MyConvert.To<string>(emp["_encM2"]), empId);
            if (emp.ContainsKey("_encPayslip"))
                emp["payslipPassword"] = DecryptEmployeeField(MyConvert.To<string>(emp["_encPayslip"]), empId);
            emp.Remove("_encPersonal");
            emp.Remove("_encBusiness");
            emp.Remove("_encM1");
            emp.Remove("_encM2");
            emp.Remove("_encPayslip");
            emp["sensitiveDecrypted"] = true;
        }

        private static Dictionary<string, object> ToClientEmployeeDict(Dictionary<string, object> emp)
        {
            if (emp == null) return new Dictionary<string, object>();
            var copy = new Dictionary<string, object>(emp, StringComparer.OrdinalIgnoreCase);
            copy.Remove("_encPersonal");
            copy.Remove("_encBusiness");
            copy.Remove("_encM1");
            copy.Remove("_encM2");
            copy.Remove("_encPayslip");
            copy.Remove("sensitiveDecrypted");
            return copy;
        }

        private static object ToClientEmployeeObject(object item)
        {
            var d = item as Dictionary<string, object>;
            if (d != null)
                return ToClientEmployeeDict(d);
            return item;
        }

        private static List<object> GetEmployeesSessionList(string sessionKey)
        {
            var session = HttpContext.Current?.Session;
            return session?[sessionKey] as List<object>;
        }

        private const string EmployeesCountQuery = @"
SELECT COUNT(*)
FROM Staffing_Transactions AS T
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
                var clientList = employees.Select(ToClientEmployeeObject).ToList();
                return new { success = true, list = clientList, count = clientList.Count };
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

        /// <summary>Lấy username/email mặc định: username từ web login + @cadena.com.sg</summary>
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
                    return new { success = false, message = "Cần đăng nhập." };
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
  AND NOT (c.TABLE_NAME = 'Setting_EmailManagements' AND c.COLUMN_NAME = 'EmailID')
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

        /// <summary>Lấy email mặc định: username từ web login + @domainSuffix (mặc định cadena.com.sg)</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetWindowsUserEmail(string domainSuffix = "cadena.com.sg")
        {
            if (UiAuthHelper.IsAnonymous)
                return new { success = false, message = "Cần đăng nhập." };
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
  AND NOT (c.TABLE_NAME = 'Setting_EmailManagements' AND c.COLUMN_NAME = 'EmailID')
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

                    var plainOnly = validWithMeta.Where(t => !IsEncryptedEmployeeColumn(t.Item1, t.Item2, t.Item3)).ToList();
                    var totalAffected = 0;
                    if (plainOnly.Count < validWithMeta.Count)
                    {
                        var encResult = ResetEmailAndPhoneEncryptedForRestore(info.ConnectionString, emailVal, "", null, null);
                        if (encResult.Item2 != null)
                            return new { success = false, message = "Reset cột mã hóa (Staffing_Employees) lỗi: " + encResult.Item2 };
                        totalAffected += encResult.Item1;
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        foreach (var t in plainOnly)
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

        /// <summary>Một dòng kết quả phân tích Multi-DB (trả về API với tên thuộc tính cố định để client hiển thị).</summary>
        public class MultiDbAnalyzeResultItem
        {
            public string database { get; set; }
            public string status { get; set; }
            public string reason { get; set; }
        }

        public class EmailColumnSelection
        {
            public string schema { get; set; }
            public string table { get; set; }
            public string column { get; set; }
        }

        /// <summary>Lấy danh sách table.column có Phone; status (NotReset/Reset) và reason. Staffing_Employees (MobilePhone1,2, HomePhone1,2) giải mã như email. defaultPhone từ App Settings (0987654321 nếu chưa cấu hình).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetTablesWithPhoneColumns(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var defaultPhone = LoadResetPhoneDefaultFromAppDb();
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
                        if (ColumnNeedsResetPhone(conn, schema, table, col, defaultPhone, out reason))
                            status = "NotReset";
                        list.Add(new { schema = schema, table = table, column = col, key = schema + "." + table + "." + col, maxLen = maxLen, dataType = dataType, status = status, reason = reason });
                    }
                    return new { success = true, list = list, defaultPhone = defaultPhone };
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

                    var plainOnly = validWithMeta.Where(t => !IsEncryptedEmployeeColumn(t.Item1, t.Item2, t.Item3)).ToList();
                    var totalAffected = 0;
                    if (plainOnly.Count < validWithMeta.Count)
                    {
                        var encResult = ResetEmailAndPhoneEncryptedForRestore(info.ConnectionString, "", phone.Trim(), null, null);
                        if (encResult.Item2 != null)
                            return new { success = false, message = "Reset cột mã hóa (Staffing_Employees) lỗi: " + encResult.Item2 };
                        totalAffected += encResult.Item1;
                    }
                    using (var cmd = conn.CreateCommand())
                    {
                        foreach (var t in plainOnly)
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

        /// <summary>Đưa phân tích Multi-DB xuống job nền; khi xong push SignalR, client lấy kết quả qua GetMultiDbAnalyzeResult(jobId).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartMultiDbAnalyzeJob(string k, List<string> emailIgnorePatterns)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                    return new { success = false, message = "Bạn không có quyền sử dụng Multi-DB Reset.", jobId = 0 };
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null || multi.Databases.Count == 0)
                    return new { success = false, message = "Chế độ Multi-DB không hợp lệ hoặc không có database.", jobId = 0 };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var ignore = emailIgnorePatterns ?? new List<string>();
                var id = DataSecurityWrapper.DecryptConnectId(k);
                var multiGuid = (!string.IsNullOrEmpty(id) && id.StartsWith("multi_", StringComparison.OrdinalIgnoreCase) && id.Length > 6) ? id.Substring(6) : "";
                var payloadInitial = string.IsNullOrEmpty(multiGuid) ? (object)DBNull.Value : "{\"multiGuid\":\"" + multiGuid.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"}";
                int jobId;
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerName, DatabaseName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Payload)
VALUES (N'HRHelperMultiDbAnalyze', @sname, N'Multi', @uid, @uname, SYSDATETIME(), N'Running', 0, @payload); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                    cmd.Parameters.AddWithValue("@sname", multi.Server ?? "");
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@uname", userName);
                    cmd.Parameters.AddWithValue("@payload", payloadInitial);
                    appConn.Open();
                    jobId = (int)cmd.ExecuteScalar();
                }
                BaJobQueue.Track(jobId);
                UserActionLogHelper.Log("HRHelper.MultiDbAnalyze", "jobId=" + jobId + ", dbCount=" + multi.Databases.Count);
                var dbList = multi.Databases;
                System.Threading.Tasks.Task.Run(() =>
                {
                    try
                    {
                    var results = new List<object>();
                    var total = dbList.Count;
                    for (var i = 0; i < dbList.Count; i++)
                    {
                        var db = dbList[i];
                        var status = "Reset";
                        var reason = "";
                        try
                        {
                            using (var conn = new SqlConnection(db.ConnectionString))
                            {
                                conn.Open();
                                if (DatabaseNeedsReset(conn, ignore, out reason))
                                    status = "NotReset";
                            }
                        }
                        catch (Exception ex)
                        {
                            status = "Error";
                            reason = ex.Message ?? "Lỗi";
                        }
                        results.Add(new { database = db.DatabaseName, status = status, reason = reason });
                        try
                        {
                            var pct = (int)Math.Round(((i + 1.0) / total) * 100);
                            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = "UPDATE BaJob SET PercentComplete = @pct WHERE Id = @id AND JobType = N'HRHelperMultiDbAnalyze' AND Status = N'Running'";
                                cmd.Parameters.AddWithValue("@pct", Math.Min(pct, 99));
                                cmd.Parameters.AddWithValue("@id", jobId);
                                conn.Open();
                                cmd.ExecuteNonQuery();
                            }
                        }
                        catch { }
                    }
                    int notReset = 0, errCount = 0;
                    foreach (var r in results)
                    {
                        try
                        {
                            var jo = Newtonsoft.Json.Linq.JObject.FromObject(r);
                            var s = jo["status"]?.ToString();
                            if (s == "NotReset") notReset++;
                            else if (s == "Error") errCount++;
                        }
                        catch { }
                    }
                    var msg = total + " DB. Chưa reset: " + notReset + (errCount > 0 ? ", Lỗi: " + errCount : "");
                    string multiGuidStored = null;
                    try
                    {
                        using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                        {
                            conn.Open();
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = "SELECT Payload FROM BaJob WHERE Id = @id AND JobType = N'HRHelperMultiDbAnalyze' AND Status = N'Running'";
                                cmd.Parameters.AddWithValue("@id", jobId);
                                var raw = cmd.ExecuteScalar();
                                if (raw != null && !DBNull.Value.Equals(raw))
                                {
                                    var s = (string)raw;
                                    if (!string.IsNullOrWhiteSpace(s) && s.TrimStart().StartsWith("{"))
                                    {
                                        var jo = Newtonsoft.Json.Linq.JObject.Parse(s);
                                        multiGuidStored = jo["multiGuid"]?.ToString();
                                    }
                                }
                            }
                            var payloadObj = new { multiGuid = multiGuidStored ?? "", list = results };
                            var resultJson = JsonConvert.SerializeObject(payloadObj);
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandText = "UPDATE BaJob SET Status = N'Completed', PercentComplete = 100, Message = @msg, Payload = @payload, CompletedAt = SYSDATETIME() WHERE Id = @id AND JobType = N'HRHelperMultiDbAnalyze' AND Status = N'Running'";
                                cmd.Parameters.AddWithValue("@msg", msg);
                                cmd.Parameters.AddWithValue("@payload", resultJson);
                                cmd.Parameters.AddWithValue("@id", jobId);
                                cmd.ExecuteNonQuery();
                            }
                        }
                    }
                    catch { }
                    BaJobHubHelper.PushJobsUpdated("HRHelperMultiDbAnalyze", null, userId);
                    }
                    catch (Exception ex)
                    {
                        try
                        {
                            UpdateBaJobCompleted(jobId, "HRHelperMultiDbAnalyze", false, ex.Message ?? "Lỗi");
                            BaJobHubHelper.PushJobsUpdated("HRHelperMultiDbAnalyze", null, userId);
                        }
                        catch { }
                    }
                });
                return new { success = true, jobId = jobId, message = "Đã đưa phân tích Multi-DB vào hàng đợi. Bạn có thể đóng trang và quay lại sau." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        /// <summary>Lấy kết quả phân tích Multi-DB từ job đã hoàn thành (Payload).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetMultiDbAnalyzeResult(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", list = (List<MultiDbAnalyzeResultItem>)null };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Payload, CompletedAt FROM BaJob WHERE Id = @id AND JobType = N'HRHelperMultiDbAnalyze' AND StartedByUserId = @uid AND Status = N'Completed'";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (!r.Read()) return new { success = false, message = "Không tìm thấy kết quả hoặc job chưa xong.", list = (List<MultiDbAnalyzeResultItem>)null, completedAt = (DateTime?)null };
                        var raw = r.IsDBNull(0) ? null : r.GetString(0);
                        var completedAt = r.IsDBNull(1) ? (DateTime?)null : r.GetDateTime(1);
                        if (string.IsNullOrWhiteSpace(raw))
                            return new { success = false, message = "Không có dữ liệu kết quả.", list = (List<MultiDbAnalyzeResultItem>)null, completedAt = completedAt };
                        if (completedAt.HasValue && (DateTime.Now - completedAt.Value).TotalHours > 1)
                            return new { success = false, message = "Kết quả đã hết hạn (quá 1 giờ). Vui lòng phân tích lại.", list = (List<MultiDbAnalyzeResultItem>)null, completedAt = completedAt };
                        var list = ParseMultiDbAnalyzePayloadToList(raw);
                        return new { success = true, list = list ?? new List<MultiDbAnalyzeResultItem>(), completedAt = completedAt };
                    }
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, list = (List<MultiDbAnalyzeResultItem>)null };
            }
        }

        private static List<MultiDbAnalyzeResultItem> ParseMultiDbAnalyzePayloadToList(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var t = raw.TrimStart();
            if (t.StartsWith("["))
                return JsonConvert.DeserializeObject<List<MultiDbAnalyzeResultItem>>(raw);
            if (t.StartsWith("{"))
            {
                var jo = Newtonsoft.Json.Linq.JObject.Parse(raw);
                var listToken = jo["list"];
                if (listToken != null) return listToken.ToObject<List<MultiDbAnalyzeResultItem>>();
            }
            return null;
        }

        /// <summary>Lấy token kết nối Multi-DB cho job đã hoàn thành (để mở HR Helper với k + jobId và tải kết quả). Phiên session phải còn HRConnMulti_guid thì mở trang mới có dữ liệu.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetMultiConnTokenForJob(int jobId)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", token = (string)null };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Payload FROM BaJob WHERE Id = @id AND JobType = N'HRHelperMultiDbAnalyze' AND StartedByUserId = @uid AND Status = N'Completed'";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    var raw = cmd.ExecuteScalar();
                    if (raw == null || DBNull.Value.Equals(raw) || string.IsNullOrWhiteSpace((string)raw))
                        return new { success = false, message = "Không tìm thấy job hoặc job chưa hoàn thành.", token = (string)null };
                    var payloadStr = (string)raw;
                    string multiGuid = null;
                    if (payloadStr.TrimStart().StartsWith("{"))
                    {
                        var jo = Newtonsoft.Json.Linq.JObject.Parse(payloadStr);
                        multiGuid = jo["multiGuid"]?.ToString();
                    }
                    if (string.IsNullOrWhiteSpace(multiGuid))
                        return new { success = false, message = "Job này không lưu thông tin kết nối Multi-DB. Vui lòng vào Công cụ Database chọn lại Multi-DB, vào Trợ lý HR và bấm \"Tải kết quả phân tích gần nhất\".", token = (string)null };
                    var token = DataSecurityWrapper.EncryptConnectId("multi_" + multiGuid);
                    return new { success = true, token = token };
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, token = (string)null };
            }
        }

        /// <summary>Kết quả phân tích Multi-DB gần nhất (để tải lại khi mở trang hoặc khi job vừa xong mà client không lưu jobId).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetMyLastMultiDbAnalyzeResult()
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobId = 0, list = (List<MultiDbAnalyzeResultItem>)null, completedAt = (DateTime?)null };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT TOP 1 Id, Payload, CompletedAt FROM BaJob WHERE JobType = N'HRHelperMultiDbAnalyze' AND StartedByUserId = @uid AND Status = N'Completed' AND CompletedAt IS NOT NULL AND CompletedAt >= DATEADD(hour, -1, SYSDATETIME()) ORDER BY CompletedAt DESC";
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (!r.Read()) return new { success = true, jobId = 0, list = (List<MultiDbAnalyzeResultItem>)null, completedAt = (DateTime?)null, message = "Không có kết quả phân tích trong 1 giờ qua. Kết quả quá 1 giờ coi như hết hạn (database có thể đã thay đổi). Vui lòng bấm Phân tích lại." };
                        var id = r.GetInt32(0);
                        var payload = r.IsDBNull(1) ? null : r.GetString(1);
                        var completedAt = r.IsDBNull(2) ? (DateTime?)null : r.GetDateTime(2);
                        if (string.IsNullOrWhiteSpace(payload))
                            return new { success = true, jobId = id, list = new List<MultiDbAnalyzeResultItem>(), completedAt = completedAt };
                        var list = ParseMultiDbAnalyzePayloadToList(payload);
                        return new { success = true, jobId = id, list = list ?? new List<MultiDbAnalyzeResultItem>(), completedAt = completedAt };
                    }
                }
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0, list = (List<MultiDbAnalyzeResultItem>)null, completedAt = (DateTime?)null };
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

        /// <summary>Cột phone mã hóa: Staffing_Employees (MobilePhone1, MobilePhone2, HomePhone1, HomePhone2) key ID; Staffing_EmployeeInformations cùng tên cột key EmployeeID.</summary>
        private static string GetEncryptedPhoneKeyColumn(string schema, string table, string column)
        {
            var tbl = (table ?? "").Trim();
            var col = (column ?? "").Trim();
            if (string.Equals(tbl, "Staffing_Employees", StringComparison.OrdinalIgnoreCase) &&
                (string.Equals(col, "MobilePhone1", StringComparison.OrdinalIgnoreCase) || string.Equals(col, "MobilePhone2", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(col, "HomePhone1", StringComparison.OrdinalIgnoreCase) || string.Equals(col, "HomePhone2", StringComparison.OrdinalIgnoreCase)))
                return "ID";
            if (string.Equals(tbl, "Staffing_EmployeeInformations", StringComparison.OrdinalIgnoreCase) &&
                (string.Equals(col, "MobilePhone1", StringComparison.OrdinalIgnoreCase) || string.Equals(col, "MobilePhone2", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(col, "HomePhone1", StringComparison.OrdinalIgnoreCase) || string.Equals(col, "HomePhone2", StringComparison.OrdinalIgnoreCase)))
                return "EmployeeID";
            return null;
        }

        private static bool ColumnNeedsResetPhone(SqlConnection conn, string schema, string table, string column, string defaultPhone, out string reason)
        {
            reason = "";
            var fullName = "[" + (schema ?? "dbo").Replace("]", "]]") + "].[" + (table ?? "").Replace("]", "]]") + "]";
            var colName = "[" + (column ?? "").Replace("]", "]]") + "]";
            var keyCol = GetEncryptedPhoneKeyColumn(schema, table, column);
            var defaultTrim = (defaultPhone ?? "").Trim();
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
                                    string phone = null;
                                    try
                                    {
                                        var k = keyVal != null && keyVal != DBNull.Value ? MyConvert.To<long?>(keyVal) : null;
                                        phone = DataSecurityWrapper.DecryptData<string>(raw, k)?.Trim();
                                    }
                                    catch { continue; }
                                    if (string.IsNullOrEmpty(phone)) continue;
                                    if (!string.Equals(phone, defaultTrim, StringComparison.OrdinalIgnoreCase))
                                    {
                                        var sample = phone.Length > 20 ? phone.Substring(0, 17) + "..." : phone;
                                        reason = "Có số chưa reset (VD: " + HttpUtility.HtmlEncode(sample) + ")";
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
                                var phone = ((val as string) ?? val.ToString()).Trim();
                                if (string.IsNullOrEmpty(phone)) continue;
                                if (!string.Equals(phone, defaultTrim, StringComparison.OrdinalIgnoreCase))
                                {
                                    var sample = phone.Length > 20 ? phone.Substring(0, 17) + "..." : phone;
                                    reason = "Có số chưa reset (VD: " + HttpUtility.HtmlEncode(sample) + ")";
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

        private static string LoadResetPhoneDefaultFromAppDb()
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT [Value] FROM BaAppSetting WHERE [Key] = N'App_ResetPhoneDefault'";
                    conn.Open();
                    var obj = cmd.ExecuteScalar();
                    var v = obj != null && obj != DBNull.Value ? obj.ToString().Trim() : "";
                    return string.IsNullOrEmpty(v) ? "0987654321" : v;
                }
            }
            catch { return "0987654321"; }
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

            var defaultPhone = LoadResetPhoneDefaultFromAppDb();
            var phoneCols = new List<Tuple<string, string, string>>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 30;
                cmd.CommandText = @"
SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
WHERE c.COLUMN_NAME LIKE N'%Phone%'
  AND NOT (c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME LIKE 'PAY_MasterPayroll%')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var schema = MyConvert.To<string>(r.GetValue(0)) ?? "dbo";
                        var table = MyConvert.To<string>(r.GetValue(1)) ?? "";
                        var col = MyConvert.To<string>(r.GetValue(2)) ?? "";
                        if (!string.IsNullOrEmpty(table) && !string.IsNullOrEmpty(col))
                            phoneCols.Add(Tuple.Create(schema, table, col));
                    }
                }
            }
            foreach (var t in phoneCols)
            {
                string phoneReason;
                if (ColumnNeedsResetPhone(conn, t.Item1, t.Item2, t.Item3, defaultPhone, out phoneReason))
                {
                    reason = phoneReason;
                    return true;
                }
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
                if (string.Equals(table, "Setting_EmailManagements", StringComparison.OrdinalIgnoreCase) && string.Equals(column, "EmailID", StringComparison.OrdinalIgnoreCase))
                    return new { success = true, affected = 0, error = (string)null };
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
        public static object ResetMultiDbSelected(string k, List<string> databaseNames, string email, string phone, bool emailToNull = false, bool phoneToNull = false)
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
                if (emailToNull && !string.IsNullOrEmpty(emailTrim))
                    return new { success = false, message = "Không kết hợp xóa email (NULL) với giá trị email." };
                if (phoneToNull && !string.IsNullOrEmpty(phoneTrim))
                    return new { success = false, message = "Không kết hợp xóa phone (NULL) với giá trị phone." };
                var anyEmail = emailToNull || !string.IsNullOrEmpty(emailTrim);
                var anyPhone = phoneToNull || !string.IsNullOrEmpty(phoneTrim);
                if (!anyEmail && !anyPhone)
                    return new { success = false, message = "Chọn reset email/phone (giá trị hoặc NULL)." };

                var dbSet = new HashSet<string>(databaseNames.Select(x => (x ?? "").Trim()), StringComparer.OrdinalIgnoreCase);
                var toProcess = multi.Databases.Where(d => dbSet.Contains(d.DatabaseName ?? "")).ToList();

                var done = 0;
                var totalAffected = 0;
                var errors = new List<string>();

                foreach (var db in toProcess)
                {
                    var errCountBefore = errors.Count;
                    RunMultiDbResetPlainAndEncrypted(db.ConnectionString, db.DatabaseName ?? "", emailTrim, phoneTrim, emailToNull, phoneToNull, ref totalAffected, errors);
                    if (errors.Count == errCountBefore)
                        done++;
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

        /// <summary>Đưa reset Multi-DB xuống job nền. Trả về jobId; client disable nút và theo dõi qua chuông/Function Queue.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartMultiDbResetJob(string k, List<string> databaseNames, string email, string phone, bool emailToNull = false, bool phoneToNull = false)
        {
            try
            {
                if (!UiAuthHelper.HasFeature("DatabaseBulkReset"))
                    return new { success = false, message = "Bạn không có quyền sử dụng Multi-DB Reset.", jobId = 0 };
                var multi = GetMultiConnFromToken(k);
                if (multi == null || multi.Databases == null)
                    return new { success = false, message = "Chế độ Multi-DB không hợp lệ.", jobId = 0 };
                if (databaseNames == null || databaseNames.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 database.", jobId = 0 };
                var emailTrim = (email ?? "").Trim();
                var phoneTrim = (phone ?? "").Trim();
                if (emailToNull && !string.IsNullOrEmpty(emailTrim))
                    return new { success = false, message = "Không kết hợp xóa email (NULL) với giá trị email.", jobId = 0 };
                if (phoneToNull && !string.IsNullOrEmpty(phoneTrim))
                    return new { success = false, message = "Không kết hợp xóa phone (NULL) với giá trị phone.", jobId = 0 };
                var anyEmail = emailToNull || !string.IsNullOrEmpty(emailTrim);
                var anyPhone = phoneToNull || !string.IsNullOrEmpty(phoneTrim);
                if (!anyEmail && !anyPhone)
                    return new { success = false, message = "Chọn reset email/phone (giá trị hoặc NULL).", jobId = 0 };

                var dbSet = new HashSet<string>(databaseNames.Select(x => (x ?? "").Trim()), StringComparer.OrdinalIgnoreCase);
                var toProcess = multi.Databases.Where(d => dbSet.Contains(d.DatabaseName ?? "")).ToList();
                if (toProcess.Count == 0)
                    return new { success = false, message = "Không có database nào hợp lệ.", jobId = 0 };

                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var dbNamesList = toProcess.Select(d => d.DatabaseName ?? "").ToList();

                var connectionStringsPayload = toProcess.Select(d => new { DatabaseName = d.DatabaseName ?? "", ConnectionString = d.ConnectionString ?? "" }).ToList();
                var payload = JsonConvert.SerializeObject(new { databaseCount = toProcess.Count, email = emailTrim, phone = phoneTrim, emailToNull, phoneToNull, databaseNames = dbNamesList, connectionStrings = connectionStringsPayload });
                var jobId = BaJobQueue.Enqueue(new BaJobRequest { JobType = "HRHelperMultiDbReset", ServerName = multi.Server ?? "", DatabaseName = "Multi", UserId = userId, UserName = userName, Payload = payload });
                UserActionLogHelper.Log("HRHelper.MultiDbReset", "jobId=" + jobId + ", dbCount=" + toProcess.Count + ", email=" + (string.IsNullOrEmpty(emailTrim) ? "" : emailTrim) + ", phone=" + (string.IsNullOrEmpty(phoneTrim) ? "" : phoneTrim));
                return new { success = true, jobId = jobId, message = "Đã đưa reset Multi-DB vào hàng đợi. Theo dõi tiến độ trên chuông và Hàng đợi xử lý." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        /// <summary>Worker gọi: đọc job HRHelperMultiDbReset Pending, chuyển Running, thực hiện reset theo Payload (connectionStrings, email, phone).</summary>
        public static void ExecuteMultiDbResetJob(int jobId)
        {
            int userId = 0;
            string payloadJson = null;
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "SELECT StartedByUserId, Payload FROM BaJob WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperMultiDbReset'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) return;
                    userId = r.IsDBNull(r.GetOrdinal("StartedByUserId")) ? 0 : r.GetInt32(r.GetOrdinal("StartedByUserId"));
                    payloadJson = r.IsDBNull(r.GetOrdinal("Payload")) ? null : r.GetString(r.GetOrdinal("Payload"));
                }
            }
            if (DatabaseSearch.IsSanitizeJobPayload(payloadJson))
            {
                DatabaseSearch.ExecuteSanitizeJob(jobId);
                return;
            }
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "UPDATE BaJob SET Status = N'Running' WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperMultiDbReset'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                cmd.ExecuteNonQuery();
            }

            var emailTrim = "";
            var phoneTrim = "";
            var emailToNull = false;
            var phoneToNull = false;
            var databases = new List<Tuple<string, string>>();
            if (!string.IsNullOrEmpty(payloadJson))
            {
                try
                {
                    var payload = BaJobSecrets.Read(payloadJson);
                    if (payload["email"] != null) emailTrim = (string)payload["email"] ?? "";
                    if (payload["phone"] != null) phoneTrim = (string)payload["phone"] ?? "";
                    bool en, pn;
                    if (payload["emailToNull"] != null && bool.TryParse(payload["emailToNull"].ToString(), out en)) emailToNull = en;
                    if (payload["phoneToNull"] != null && bool.TryParse(payload["phoneToNull"].ToString(), out pn)) phoneToNull = pn;
                    var conns = payload["connectionStrings"] as Newtonsoft.Json.Linq.JArray;
                    if (conns != null)
                        foreach (var c in conns)
                        {
                            var dbName = c["DatabaseName"]?.ToString() ?? "";
                            var connStr = c["ConnectionString"]?.ToString() ?? "";
                            if (!string.IsNullOrEmpty(connStr)) databases.Add(Tuple.Create(dbName, connStr));
                        }
                }
                catch { }
            }
            if (databases.Count == 0)
            {
                UpdateBaJobCompleted(jobId, "HRHelperMultiDbReset", false, "Payload thiếu connectionStrings.");
                return;
            }

            var totalDbs = databases.Count;
            var done = 0;
            var totalAffected = 0;
            var errors = new List<string>();
            try
            {
                System.Threading.Thread.CurrentThread.Priority = System.Threading.ThreadPriority.BelowNormal;
                foreach (var db in databases)
                {
                    var dbName = db.Item1;
                    var connStr = db.Item2;
                    var errCountBefore = errors.Count;
                    RunMultiDbResetPlainAndEncrypted(connStr, dbName, emailTrim, phoneTrim, emailToNull, phoneToNull, ref totalAffected, errors);
                    if (errors.Count == errCountBefore)
                        done++;
                    var pct = totalDbs > 0 ? (int)Math.Round((done * 100.0) / totalDbs) : 0;
                    pct = Math.Min(pct, 99);
                    try
                    {
                        using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var updateCmd = conn.CreateCommand())
                        {
                            updateCmd.CommandText = "UPDATE BaJob SET PercentComplete = @pct, Message = @msg WHERE Id = @id AND JobType = N'HRHelperMultiDbReset' AND Status = N'Running'";
                            updateCmd.Parameters.AddWithValue("@pct", pct);
                            updateCmd.Parameters.AddWithValue("@msg", done + " / " + totalDbs + " DB");
                            updateCmd.Parameters.AddWithValue("@id", jobId);
                            conn.Open();
                            updateCmd.ExecuteNonQuery();
                        }
                        BaJobWorkerNotify.Notify(jobId);
                        BaJobHubHelper.PushJobsUpdated("HRHelperMultiDbReset", null, userId);
                    }
                    catch { }
                    System.Threading.Thread.Sleep(0);
                }
                var msg = "Đã reset " + done + "/" + totalDbs + " DB. Tổng bản ghi: " + totalAffected;
                if (!string.IsNullOrEmpty(emailTrim)) msg += ". Email: " + emailTrim;
                if (!string.IsNullOrEmpty(phoneTrim)) msg += ". Phone: " + phoneTrim;
                if (errors.Count > 0)
                    msg += ". Lỗi: " + string.Join("; ", errors.Take(5));
                try
                {
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "UPDATE BaJob SET Status = N'Completed', PercentComplete = 100, Message = @msg, CompletedAt = SYSDATETIME() WHERE Id = @id AND JobType = N'HRHelperMultiDbReset' AND Status = N'Running'";
                        cmd.Parameters.AddWithValue("@msg", msg);
                        cmd.Parameters.AddWithValue("@id", jobId);
                        conn.Open();
                        cmd.ExecuteNonQuery();
                    }
                    BaJobWorkerNotify.Notify(jobId);
                    BaJobHubHelper.PushJobsUpdated("HRHelperMultiDbReset", null, userId);
                }
                catch { }
            }
            catch (Exception ex)
            {
                UpdateBaJobCompleted(jobId, "HRHelperMultiDbReset", false, ex.Message ?? "Lỗi");
                BaJobHubHelper.PushJobsUpdated("HRHelperMultiDbReset", null, userId);
            }
        }

        /// <summary>Worker gọi: đọc job HRHelperUpdateUser Pending, chuyển Running, gọi ExecuteUpdateUsersCore theo Payload.</summary>
        public static void ExecuteHRHelperUpdateUserJob(int jobId)
        {
            int userId = 0;
            string payloadJson = null;
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "SELECT StartedByUserId, Payload FROM BaJob WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateUser'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) return;
                    userId = r.IsDBNull(r.GetOrdinal("StartedByUserId")) ? 0 : r.GetInt32(r.GetOrdinal("StartedByUserId"));
                    payloadJson = r.IsDBNull(r.GetOrdinal("Payload")) ? null : r.GetString(r.GetOrdinal("Payload"));
                }
            }
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "UPDATE BaJob SET Status = N'Running' WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateUser'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                cmd.ExecuteNonQuery();
            }
            if (string.IsNullOrEmpty(payloadJson)) { UpdateBaJobCompleted(jobId, "HRHelperUpdateUser", false, "Payload trống."); return; }
            string connStr = null;
            List<long> userIds = null;
            bool isUpdatePassword = false, isUpdateEmail = false, ignoreWindowsAD = false;
            string password = "", email = "";
            int methodHash = 0;
            try
            {
                var payload = BaJobSecrets.Read(payloadJson);
                connStr = (string)payload["connectionString"];
                var userIdsArr = payload["userIds"] as Newtonsoft.Json.Linq.JArray;
                if (userIdsArr != null)
                {
                    userIds = new List<long>();
                    foreach (var x in userIdsArr) userIds.Add((long)x);
                }
                if (payload["isUpdatePassword"] != null) isUpdatePassword = (bool)payload["isUpdatePassword"];
                if (payload["password"] != null) password = (string)payload["password"] ?? "";
                if (payload["methodHash"] != null) methodHash = (int)payload["methodHash"];
                if (payload["isUpdateEmail"] != null) isUpdateEmail = (bool)payload["isUpdateEmail"];
                if (payload["email"] != null) email = (string)payload["email"] ?? "";
                if (payload["ignoreWindowsAD"] != null) ignoreWindowsAD = (bool)payload["ignoreWindowsAD"];
            }
            catch { UpdateBaJobCompleted(jobId, "HRHelperUpdateUser", false, "Payload không hợp lệ."); return; }
            if (string.IsNullOrEmpty(connStr) || userIds == null || userIds.Count == 0) { UpdateBaJobCompleted(jobId, "HRHelperUpdateUser", false, "Payload thiếu connectionString hoặc userIds."); return; }
            try
            {
                System.Threading.Thread.CurrentThread.Priority = System.Threading.ThreadPriority.BelowNormal;
                UpdateBaJobProgress(jobId, "HRHelperUpdateUser", 1, "Đang xử lý...");
                var result = ExecuteUpdateUsersCore(connStr, userIds, isUpdatePassword, password, methodHash, isUpdateEmail, email, ignoreWindowsAD);
                UpdateBaJobCompleted(jobId, "HRHelperUpdateUser", result.Item1, result.Item2);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateUser", null, userId);
            }
            catch (Exception ex)
            {
                UpdateBaJobCompleted(jobId, "HRHelperUpdateUser", false, ex.Message);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateUser", null, userId);
            }
        }

        /// <summary>Worker gọi: đọc job HRHelperUpdateUserSignature Pending, chuyển Running, gọi ExecuteUpdateUserSignatureCore.</summary>
        public static void ExecuteHRHelperUpdateUserSignatureJob(int jobId)
        {
            int userId = 0;
            string payloadJson = null;
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "SELECT StartedByUserId, Payload FROM BaJob WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateUserSignature'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) return;
                    userId = r.IsDBNull(r.GetOrdinal("StartedByUserId")) ? 0 : r.GetInt32(r.GetOrdinal("StartedByUserId"));
                    payloadJson = r.IsDBNull(r.GetOrdinal("Payload")) ? null : r.GetString(r.GetOrdinal("Payload"));
                }
            }
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "UPDATE BaJob SET Status = N'Running' WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateUserSignature'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                cmd.ExecuteNonQuery();
            }
            if (string.IsNullOrEmpty(payloadJson)) { UpdateBaJobCompleted(jobId, "HRHelperUpdateUserSignature", false, "Payload trống."); return; }
            string connStr = null;
            List<long> userIds = null;
            try
            {
                var payload = BaJobSecrets.Read(payloadJson);
                connStr = (string)payload["connectionString"];
                var userIdsArr = payload["userIds"] as Newtonsoft.Json.Linq.JArray;
                if (userIdsArr != null)
                {
                    userIds = new List<long>();
                    foreach (var x in userIdsArr) userIds.Add((long)x);
                }
            }
            catch { UpdateBaJobCompleted(jobId, "HRHelperUpdateUserSignature", false, "Payload không hợp lệ."); return; }
            if (string.IsNullOrEmpty(connStr) || userIds == null || userIds.Count == 0) { UpdateBaJobCompleted(jobId, "HRHelperUpdateUserSignature", false, "Payload thiếu connectionString hoặc userIds."); return; }
            try
            {
                UpdateBaJobProgress(jobId, "HRHelperUpdateUserSignature", 1, "Đang xử lý...");
                var result = ExecuteUpdateUserSignatureCore(connStr, userIds);
                UpdateBaJobCompleted(jobId, "HRHelperUpdateUserSignature", result.Item1, result.Item2);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateUserSignature", null, userId);
            }
            catch (Exception ex)
            {
                UpdateBaJobCompleted(jobId, "HRHelperUpdateUserSignature", false, ex.Message);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateUserSignature", null, userId);
            }
        }

        /// <summary>Worker gọi: đọc job HRHelperUpdateEmployee Pending, chuyển Running, gọi ExecuteUpdateEmployeesCore.</summary>
        public static void ExecuteHRHelperUpdateEmployeeJob(int jobId)
        {
            BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] ExecuteHRHelperUpdateEmployeeJob bắt đầu.");
            int userId = 0;
            string payloadJson = null;
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "SELECT StartedByUserId, Payload FROM BaJob WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateEmployee'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) { BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] Không đọc được job, return."); return; }
                    userId = r.IsDBNull(r.GetOrdinal("StartedByUserId")) ? 0 : r.GetInt32(r.GetOrdinal("StartedByUserId"));
                    payloadJson = r.IsDBNull(r.GetOrdinal("Payload")) ? null : r.GetString(r.GetOrdinal("Payload"));
                }
            }
            BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] Đã đọc payload, length=" + (payloadJson?.Length ?? 0));
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "UPDATE BaJob SET Status = N'Running' WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateEmployee'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                cmd.ExecuteNonQuery();
            }
            if (string.IsNullOrEmpty(payloadJson)) { BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] Payload trống."); UpdateBaJobCompleted(jobId, "HRHelperUpdateEmployee", false, "Payload trống."); return; }
            string connStr = null;
            List<long> employeeIds = null;
            int? companyID = null;
            bool updPersonal = false, updBusiness = false, updPayslip = false, payslipByEmp = false, updM1 = false, updM2 = false, updBasic = false;
            string personalEmail = "", businessEmail = "", payslipCommon = "", m1 = "", m2 = "";
            decimal basicSalary = 0;
            EmployeeTestDataOptions testDataOptions = null;
            try
            {
                var payload = BaJobSecrets.Read(payloadJson);
                connStr = (string)payload["connectionString"];
                if (payload["companyID"] != null && !payload["companyID"].ToString().Equals("")) companyID = (int?)payload["companyID"];
                var employeeIdsArr = payload["employeeIds"] as Newtonsoft.Json.Linq.JArray;
                if (employeeIdsArr != null)
                {
                    employeeIds = new List<long>();
                    foreach (var x in employeeIdsArr) employeeIds.Add((long)x);
                }
                if (payload["updPersonal"] != null) updPersonal = (bool)payload["updPersonal"];
                if (payload["personalEmail"] != null) personalEmail = (string)payload["personalEmail"] ?? "";
                if (payload["updBusiness"] != null) updBusiness = (bool)payload["updBusiness"];
                if (payload["businessEmail"] != null) businessEmail = (string)payload["businessEmail"] ?? "";
                if (payload["updPayslip"] != null) updPayslip = (bool)payload["updPayslip"];
                if (payload["payslipCommon"] != null) payslipCommon = (string)payload["payslipCommon"] ?? "";
                if (payload["payslipByEmp"] != null) payslipByEmp = (bool)payload["payslipByEmp"];
                if (payload["updM1"] != null) updM1 = (bool)payload["updM1"];
                if (payload["m1"] != null) m1 = (string)payload["m1"] ?? "";
                if (payload["updM2"] != null) updM2 = (bool)payload["updM2"];
                if (payload["m2"] != null) m2 = (string)payload["m2"] ?? "";
                if (payload["updBasic"] != null) updBasic = (bool)payload["updBasic"];
                if (payload["basicSalary"] != null) basicSalary = (decimal)payload["basicSalary"];
                var isGenerateTestData = payload["isGenerateTestData"] != null && (bool)payload["isGenerateTestData"];
                if (isGenerateTestData)
                {
                    testDataOptions = new EmployeeTestDataOptions
                    {
                        GenerateEmail = payload["generateEmail"] != null && (bool)payload["generateEmail"],
                        EmailPrefix = payload["emailPrefix"] != null ? ((string)payload["emailPrefix"] ?? "") : "",
                        EmailDomain = payload["emailDomain"] != null ? ((string)payload["emailDomain"] ?? "") : "",
                        EmailStartNumber = payload["emailStartNumber"] != null ? Math.Max(1, (int)payload["emailStartNumber"]) : 1,
                        GeneratePhone = payload["generatePhone"] != null && (bool)payload["generatePhone"],
                        GenerateSalary = payload["generateSalary"] != null && (bool)payload["generateSalary"],
                        SalaryMin = payload["salaryMin"] != null ? (decimal)payload["salaryMin"] : 0m,
                        SalaryMax = payload["salaryMax"] != null ? (decimal)payload["salaryMax"] : 0m,
                        UpdateUserEmailMapping = payload["updateUserEmailMapping"] == null || (bool)payload["updateUserEmailMapping"]
                    };
                }
            }
            catch { BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] Payload không hợp lệ."); UpdateBaJobCompleted(jobId, "HRHelperUpdateEmployee", false, "Payload không hợp lệ."); return; }
            if (string.IsNullOrEmpty(connStr) || employeeIds == null || employeeIds.Count == 0) { BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] Thiếu connectionString hoặc employeeIds."); UpdateBaJobCompleted(jobId, "HRHelperUpdateEmployee", false, "Payload thiếu connectionString hoặc employeeIds."); return; }
            BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] employeeIds count=" + employeeIds.Count + ", gọi ExecuteUpdateEmployeesCore.");
            try
            {
                System.Threading.Thread.CurrentThread.Priority = System.Threading.ThreadPriority.BelowNormal;
                var result = ExecuteUpdateEmployeesCore(connStr, employeeIds, updPersonal, personalEmail, updBusiness, businessEmail, updPayslip, payslipCommon, payslipByEmp, updM1, m1, updM2, m2, updM1, m1, updM2, m2, updBasic, basicSalary, testDataOptions,
                    onProgress: (pct, msg, detail) =>
                    {
                        UpdateBaJobProgress(jobId, "HRHelperUpdateEmployee", pct, msg, detail);
                        BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] progress " + pct + "% " + (msg ?? ""));
                    });
                BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] ExecuteUpdateEmployeesCore xong: success=" + result.Item1 + " msg=" + (result.Item2 ?? ""));
                var fullMessage = BuildHRHelperUpdateEmployeeResultMessage(result.Item2, updPersonal, personalEmail, updBusiness, businessEmail, updPayslip, payslipCommon, updM1, m1, updM2, m2, updBasic, basicSalary);
                UpdateBaJobCompleted(jobId, "HRHelperUpdateEmployee", result.Item1, fullMessage);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateEmployee", null, userId);
            }
            catch (Exception ex)
            {
                BaJobWorkerNotify.Log("JobId=" + jobId + " [HRHelper] Exception: " + ex.Message);
                UpdateBaJobCompleted(jobId, "HRHelperUpdateEmployee", false, ex.Message);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateEmployee", null, userId);
            }
        }

        /// <summary>Worker gọi: đọc job HRHelperUpdateOther Pending, chuyển Running, gọi ExecuteUpdateCompanyInfoCore.</summary>
        public static void ExecuteHRHelperUpdateOtherJob(int jobId)
        {
            int userId = 0;
            string payloadJson = null;
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "SELECT StartedByUserId, Payload FROM BaJob WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateOther'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) return;
                    userId = r.IsDBNull(r.GetOrdinal("StartedByUserId")) ? 0 : r.GetInt32(r.GetOrdinal("StartedByUserId"));
                    payloadJson = r.IsDBNull(r.GetOrdinal("Payload")) ? null : r.GetString(r.GetOrdinal("Payload"));
                }
            }
            using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = appConn.CreateCommand())
            {
                cmd.CommandText = "UPDATE BaJob SET Status = N'Running' WHERE Id = @id AND Status IN (N'Pending', N'Running') AND JobType = N'HRHelperUpdateOther'";
                cmd.Parameters.AddWithValue("@id", jobId);
                appConn.Open();
                cmd.ExecuteNonQuery();
            }
            if (string.IsNullOrEmpty(payloadJson)) { UpdateBaJobCompleted(jobId, "HRHelperUpdateOther", false, "Payload trống."); return; }
            string connStr = null;
            int? tenantID = null, companyID = null, sslPort = null;
            bool isUpdateAll = false, useCommonEmail = false, enableSSL = false;
            string commonEmail = "", hrEmailTo = "", hrEmailCC = "", payrollEmailTo = "", payrollEmailCC = "", contactEmail = "", outgoingServer = "", accountName = "", userName = "", emailAddress = "", password = "";
            int serverPort = 0;
            try
            {
                var payload = BaJobSecrets.Read(payloadJson);
                connStr = (string)payload["connectionString"];
                if (payload["tenantID"] != null && payload["tenantID"].ToString() != "") tenantID = (int?)payload["tenantID"];
                if (payload["companyID"] != null && payload["companyID"].ToString() != "") companyID = (int?)payload["companyID"];
                if (payload["isUpdateAll"] != null) isUpdateAll = (bool)payload["isUpdateAll"];
                if (payload["useCommonEmail"] != null) useCommonEmail = (bool)payload["useCommonEmail"];
                if (payload["commonEmail"] != null) commonEmail = (string)payload["commonEmail"] ?? "";
                if (payload["hrEmailTo"] != null) hrEmailTo = (string)payload["hrEmailTo"] ?? "";
                if (payload["hrEmailCC"] != null) hrEmailCC = (string)payload["hrEmailCC"] ?? "";
                if (payload["payrollEmailTo"] != null) payrollEmailTo = (string)payload["payrollEmailTo"] ?? "";
                if (payload["payrollEmailCC"] != null) payrollEmailCC = (string)payload["payrollEmailCC"] ?? "";
                if (payload["contactEmail"] != null) contactEmail = (string)payload["contactEmail"] ?? "";
                if (payload["outgoingServer"] != null) outgoingServer = (string)payload["outgoingServer"] ?? "";
                if (payload["serverPort"] != null) serverPort = (int)payload["serverPort"];
                if (payload["accountName"] != null) accountName = (string)payload["accountName"] ?? "";
                if (payload["userName"] != null) userName = (string)payload["userName"] ?? "";
                if (payload["emailAddress"] != null) emailAddress = (string)payload["emailAddress"] ?? "";
                if (payload["password"] != null) password = (string)payload["password"] ?? "";
                if (payload["enableSSL"] != null) enableSSL = (bool)payload["enableSSL"];
                if (payload["sslPort"] != null && payload["sslPort"].ToString() != "") sslPort = (int?)payload["sslPort"];
            }
            catch { UpdateBaJobCompleted(jobId, "HRHelperUpdateOther", false, "Payload không hợp lệ."); return; }
            if (string.IsNullOrEmpty(connStr)) { UpdateBaJobCompleted(jobId, "HRHelperUpdateOther", false, "Payload thiếu connectionString."); return; }
            try
            {
                UpdateBaJobProgress(jobId, "HRHelperUpdateOther", 1, "Đang xử lý...");
                var result = ExecuteUpdateCompanyInfoCore(connStr, tenantID, companyID, isUpdateAll, useCommonEmail, commonEmail, hrEmailTo, hrEmailCC, payrollEmailTo, payrollEmailCC, contactEmail, outgoingServer, serverPort, accountName, userName, emailAddress, password, enableSSL, sslPort);
                UpdateBaJobCompleted(jobId, "HRHelperUpdateOther", result.Item1, result.Item2);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateOther", null, userId);
            }
            catch (Exception ex)
            {
                UpdateBaJobCompleted(jobId, "HRHelperUpdateOther", false, ex.Message);
                BaJobHubHelper.PushJobsUpdated("HRHelperUpdateOther", null, userId);
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

        /// <summary>Gán NULL theo lô (tránh chuỗi rỗng — giải mã/đọc nhanh hơn). WHERE cột đang khác NULL.</summary>
        private static int ExecuteBatchSetColumnToNull(SqlCommand cmd, string fullName, string colName)
        {
            cmd.Parameters.Clear();
            cmd.CommandTimeout = UpdateCommandTimeout;
            int total = 0;
            int n;
            do
            {
                cmd.CommandText = "UPDATE TOP (" + UpdateBatchSize + ") " + fullName + " SET " + colName + " = NULL WHERE " + colName + " IS NOT NULL";
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

        /// <summary>Cột email/phone trong Staffing_Employees và Staffing_EmployeeInformations được cập nhật có mã hóa (tab Employee Info / ResetEmailAndPhoneEncryptedForRestore). Bước reset plain không ghi vào các cột này.</summary>
        private static bool IsEncryptedEmployeeColumn(string schema, string table, string column)
        {
            var tbl = string.Equals(table, "Staffing_Employees", StringComparison.OrdinalIgnoreCase) || string.Equals(table, "Staffing_EmployeeInformations", StringComparison.OrdinalIgnoreCase);
            if (!tbl || !string.Equals(schema, "dbo", StringComparison.OrdinalIgnoreCase)) return false;
            return string.Equals(column, "PersonalEmailAddress", StringComparison.OrdinalIgnoreCase)
                || string.Equals(column, "BusinessEmailAddress", StringComparison.OrdinalIgnoreCase)
                || string.Equals(column, "MobilePhone1", StringComparison.OrdinalIgnoreCase)
                || string.Equals(column, "MobilePhone2", StringComparison.OrdinalIgnoreCase)
                || string.Equals(column, "HomePhone1", StringComparison.OrdinalIgnoreCase)
                || string.Equals(column, "HomePhone2", StringComparison.OrdinalIgnoreCase);
        }

        private static List<Tuple<string, string, string, int?, string>> GetEmailColumns(SqlConnection conn)
        {
            var sql = string.Format(ColumnsQueryBase, @"c.COLUMN_NAME LIKE N'%Email%' AND c.COLUMN_NAME NOT IN ('EmailSubject','EmailBody')
  AND NOT (c.TABLE_NAME = 'Setting_EmailManagements' AND c.COLUMN_NAME = 'EmailID')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')");
            var cols = GetColumnsFromQuery(conn, sql);
            return cols.Where(t => !IsEncryptedEmployeeColumn(t.Item1, t.Item2, t.Item3)).ToList();
        }

        private static List<Tuple<string, string, string, int?, string>> GetPhoneColumns(SqlConnection conn)
        {
            var sql = string.Format(ColumnsQueryBase, @"c.COLUMN_NAME LIKE N'%Phone%'
  AND NOT (c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME LIKE 'PAY_MasterPayroll%')
  AND c.DATA_TYPE IN ('nvarchar','varchar','ntext','nchar','char','text')");
            var cols = GetColumnsFromQuery(conn, sql);
            return cols.Where(t => !IsEncryptedEmployeeColumn(t.Item1, t.Item2, t.Item3)).ToList();
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

        private static int ResetPhoneColumnsInDb(SqlConnection conn, string phone, Action afterEachColumn = null)
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
                    afterEachColumn?.Invoke();
                }
                return total;
            }
        }

        private static int UpdateEmailValuesInDb(SqlConnection conn, string email, Action afterEachColumn = null)
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
                    afterEachColumn?.Invoke();
                }
                return total;
            }
        }

        private static int UpdateEmailValuesToNullInDb(SqlConnection conn, Action afterEachColumn = null)
        {
            var cols = GetEmailColumns(conn);
            using (var cmd = conn.CreateCommand())
            {
                var total = 0;
                foreach (var t in cols)
                {
                    var fullName = "[" + t.Item1.Replace("]", "]]") + "].[" + t.Item2.Replace("]", "]]") + "]";
                    var colName = "[" + t.Item3.Replace("]", "]]") + "]";
                    try { total += ExecuteBatchSetColumnToNull(cmd, fullName, colName); }
                    catch (Exception ex) { throw new Exception(string.Format("Email NULL tại {0}.{1}.{2}: {3}", t.Item1, t.Item2, t.Item3, ex.Message), ex); }
                    afterEachColumn?.Invoke();
                }
                return total;
            }
        }

        private static int ResetPhoneColumnsToNullInDb(SqlConnection conn, Action afterEachColumn = null)
        {
            var cols = GetPhoneColumns(conn);
            using (var cmd = conn.CreateCommand())
            {
                var total = 0;
                foreach (var t in cols)
                {
                    var fullName = "[" + t.Item1.Replace("]", "]]") + "].[" + t.Item2.Replace("]", "]]") + "]";
                    var colName = "[" + t.Item3.Replace("]", "]]") + "]";
                    try { total += ExecuteBatchSetColumnToNull(cmd, fullName, colName); }
                    catch (Exception ex) { throw new Exception(string.Format("Phone NULL tại {0}.{1}.{2}: {3}", t.Item1, t.Item2, t.Item3, ex.Message), ex); }
                    afterEachColumn?.Invoke();
                }
                return total;
            }
        }

        private static int ClearStaffingEmployeesEmailEncryptedToNull(SqlConnection conn)
        {
            var total = 0;
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = UpdateCommandTimeout;
                int n;
                do
                {
                    cmd.CommandText = @"
UPDATE TOP (" + UpdateBatchSize + @") E
SET E.PersonalEmailAddress = NULL, E.BusinessEmailAddress = NULL
FROM dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK)
WHERE E.PersonalEmailAddress IS NOT NULL OR E.BusinessEmailAddress IS NOT NULL";
                    n = cmd.ExecuteNonQuery();
                    total += n;
                } while (n >= UpdateBatchSize);
            }
            return total;
        }

        private static int ClearStaffingEmployeeInformationsEmailEncryptedToNull(SqlConnection conn)
        {
            var total = 0;
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = UpdateCommandTimeout;
                int n;
                do
                {
                    cmd.CommandText = @"
IF OBJECT_ID(N'dbo.Staffing_EmployeeInformations', N'U') IS NOT NULL
UPDATE TOP (" + UpdateBatchSize + @") EI
SET EI.PersonalEmailAddress = NULL, EI.BusinessEmailAddress = NULL
FROM dbo.Staffing_EmployeeInformations EI WITH (ROWLOCK, UPDLOCK)
WHERE EI.PersonalEmailAddress IS NOT NULL OR EI.BusinessEmailAddress IS NOT NULL";
                    n = cmd.ExecuteNonQuery();
                    total += n;
                } while (n >= UpdateBatchSize);
            }
            return total;
        }

        private static int ClearStaffingEmployeesPhonesEncryptedToNull(SqlConnection conn)
        {
            var total = 0;
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = UpdateCommandTimeout;
                int n;
                do
                {
                    cmd.CommandText = @"
UPDATE TOP (" + UpdateBatchSize + @") E
SET E.MobilePhone1 = NULL, E.MobilePhone2 = NULL, E.HomePhone1 = NULL, E.HomePhone2 = NULL
FROM dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK)
WHERE E.MobilePhone1 IS NOT NULL OR E.MobilePhone2 IS NOT NULL OR E.HomePhone1 IS NOT NULL OR E.HomePhone2 IS NOT NULL";
                    n = cmd.ExecuteNonQuery();
                    total += n;
                } while (n >= UpdateBatchSize);
            }
            return total;
        }

        private static int ClearStaffingEmployeeInformationsPhonesEncryptedToNull(SqlConnection conn)
        {
            var total = 0;
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = UpdateCommandTimeout;
                int n;
                do
                {
                    cmd.CommandText = @"
IF OBJECT_ID(N'dbo.Staffing_EmployeeInformations', N'U') IS NOT NULL
UPDATE TOP (" + UpdateBatchSize + @") EI
SET EI.MobilePhone1 = NULL, EI.MobilePhone2 = NULL, EI.HomePhone1 = NULL, EI.HomePhone2 = NULL
FROM dbo.Staffing_EmployeeInformations EI WITH (ROWLOCK, UPDLOCK)
WHERE EI.MobilePhone1 IS NOT NULL OR EI.MobilePhone2 IS NOT NULL OR EI.HomePhone1 IS NOT NULL OR EI.HomePhone2 IS NOT NULL";
                    n = cmd.ExecuteNonQuery();
                    total += n;
                } while (n >= UpdateBatchSize);
            }
            return total;
        }

        /// <summary>Reset Email và Phone trong Staffing_Employees (và Staffing_EmployeeInformations) với mã hóa theo từng employee (dùng sau restore + auto-reset). progressCallback(doneChunks, totalChunks). isCancelled: nếu trả về true thì dừng và trả về "Đã hủy". clearStaffing*ToNull: gán NULL (không dùng chuỗi rỗng).</summary>
        public static Tuple<int, string> ResetEmailAndPhoneEncryptedForRestore(string connectionString, string email, string phone, Action<int, int> progressCallback, Func<bool> isCancelled = null, bool clearStaffingEmailToNull = false, bool clearStaffingPhoneToNull = false)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
                return Tuple.Create(0, "Connection string trống.");
            var emailTrim = (email ?? "").Trim();
            var phoneTrim = (phone ?? "").Trim();
            if (clearStaffingEmailToNull && !string.IsNullOrEmpty(emailTrim))
                return Tuple.Create(0, "Không kết hợp xóa email Staffing (NULL) với giá trị email.");
            if (clearStaffingPhoneToNull && !string.IsNullOrEmpty(phoneTrim))
                return Tuple.Create(0, "Không kết hợp xóa phone Staffing (NULL) với giá trị phone.");
            var hasValuePass = !string.IsNullOrEmpty(emailTrim) || !string.IsNullOrEmpty(phoneTrim);
            var hasClearPass = clearStaffingEmailToNull || clearStaffingPhoneToNull;
            if (!hasValuePass && !hasClearPass)
                return Tuple.Create(0, "Cần nhập Email và/hoặc Phone, hoặc chọn xóa NULL trên Staffing.");
            try
            {
                var clearedRows = 0;
                if (hasClearPass)
                {
                    using (var conn = new SqlConnection(connectionString))
                    {
                        conn.Open();
                        if (clearStaffingEmailToNull)
                        {
                            clearedRows += ClearStaffingEmployeesEmailEncryptedToNull(conn);
                            clearedRows += ClearStaffingEmployeeInformationsEmailEncryptedToNull(conn);
                        }
                        if (clearStaffingPhoneToNull)
                        {
                            clearedRows += ClearStaffingEmployeesPhonesEncryptedToNull(conn);
                            clearedRows += ClearStaffingEmployeeInformationsPhonesEncryptedToNull(conn);
                        }
                    }
                }

                if (!hasValuePass)
                    return Tuple.Create(clearedRows, (string)null);

                int totalCount = 0;
                using (var conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT COUNT(1) FROM dbo.Staffing_Employees";
                        cmd.CommandTimeout = 60;
                        var o = cmd.ExecuteScalar();
                        totalCount = (o == null || o == DBNull.Value) ? 0 : Convert.ToInt32(o);
                    }
                }
                if (totalCount == 0)
                    return Tuple.Create(clearedRows, (string)null);
                // Chunk động: data nhỏ (300–1000) cần đủ chunk để progress 20%→100% mượt (tối thiểu 5 bước); 50k–100k dùng chunk lớn
                int desiredChunks;
                int minChunk;
                const int MinChunksForProgress = 10; // Nhiều bước hơn khi ít employee → % mượt hơn (trước: 5)
                if (totalCount >= 20000)
                {
                    desiredChunks = Math.Min(40, Math.Max(15, totalCount / 2500));
                    minChunk = 1500;
                }
                else
                {
                    desiredChunks = Math.Min(60, Math.Max(10, totalCount / 500));
                    minChunk = totalCount < 1000 ? 50 : 100;
                }
                int chunkSize = (int)Math.Ceiling(totalCount / (double)desiredChunks);
                if (chunkSize < minChunk) chunkSize = minChunk;
                int totalChunks = (int)Math.Ceiling(totalCount / (double)chunkSize);
                if (totalCount < 2000 && totalChunks < MinChunksForProgress)
                {
                    totalChunks = MinChunksForProgress;
                    chunkSize = (int)Math.Ceiling(totalCount / (double)totalChunks);
                    if (chunkSize < 1) chunkSize = 1;
                }
                var totalUpdated = 0;
                progressCallback?.Invoke(0, totalChunks);
                for (int c = 0; c < totalChunks; c++)
                {
                    if (isCancelled != null && isCancelled())
                        return Tuple.Create(totalUpdated, "Đã hủy");
                    var offset = c * chunkSize;
                    var employeeIds = new List<long>();
                    using (var conn = new SqlConnection(connectionString))
                    {
                        conn.Open();
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT ID FROM dbo.Staffing_Employees ORDER BY ID OFFSET @off ROWS FETCH NEXT @take ROWS ONLY";
                            cmd.Parameters.AddWithValue("@off", offset);
                            cmd.Parameters.AddWithValue("@take", chunkSize);
                            cmd.CommandTimeout = 120;
                            using (var r = cmd.ExecuteReader())
                            {
                                while (r.Read())
                                    employeeIds.Add(r.GetInt64(0));
                            }
                        }
                    }
                    if (employeeIds.Count == 0) continue;
                    var employees = LoadEmployeesForUpdate(connectionString, employeeIds);
                    if (employees == null || employees.Count == 0) continue;
                    var dt = BuildEmployeeDataTable(employees,
                        updPersonal: !string.IsNullOrEmpty(emailTrim), personalEmail: emailTrim,
                        updBusiness: !string.IsNullOrEmpty(emailTrim), businessEmail: emailTrim,
                        updPayslip: false, payslipCommon: null, payslipByEmp: false,
                        updM1: !string.IsNullOrEmpty(phoneTrim), m1: phoneTrim,
                        updM2: !string.IsNullOrEmpty(phoneTrim), m2: phoneTrim,
                        updH1: !string.IsNullOrEmpty(phoneTrim), h1: phoneTrim,
                        updH2: !string.IsNullOrEmpty(phoneTrim), h2: phoneTrim,
                        updBasic: false, basicSalary: 0);
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
    UserEmailAddress NVARCHAR(512) COLLATE DATABASE_DEFAULT NULL,
    PayslipPassword NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    MobilePhone1 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    MobilePhone2 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    HomePhone1 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    HomePhone2 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
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
                            bulk.ColumnMappings.Add("HomePhone1", "HomePhone1");
                            bulk.ColumnMappings.Add("HomePhone2", "HomePhone2");
                            bulk.ColumnMappings.Add("BasicSalary", "BasicSalary");
                            bulk.WriteToServer(dt);
                        }
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandTimeout = 120;
                            cmd.CommandText = @"
SET LOCK_TIMEOUT 5000;
BEGIN TRAN;
UPDATE E SET E.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,E.PersonalEmailAddress),
    E.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,E.BusinessEmailAddress),
    E.MobilePhone1=COALESCE(B.MobilePhone1,E.MobilePhone1),
    E.MobilePhone2=COALESCE(B.MobilePhone2,E.MobilePhone2),
    E.HomePhone1=COALESCE(B.HomePhone1,E.HomePhone1),
    E.HomePhone2=COALESCE(B.HomePhone2,E.HomePhone2)
FROM #EmployeeTemp B
JOIN dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK) ON E.ID = B.EmployeeID
WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL) OR (B.MobilePhone1 IS NOT NULL) OR (B.MobilePhone2 IS NOT NULL) OR (B.HomePhone1 IS NOT NULL) OR (B.HomePhone2 IS NOT NULL);
/* Cập nhật Staffing_EmployeeInformations: join trực tiếp B.EmployeeID = EI.EmployeeID */
IF OBJECT_ID('dbo.Staffing_EmployeeInformations','U') IS NOT NULL
UPDATE EI SET EI.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,EI.PersonalEmailAddress),
    EI.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,EI.BusinessEmailAddress),
    EI.MobilePhone1=COALESCE(B.MobilePhone1,EI.MobilePhone1),
    EI.MobilePhone2=COALESCE(B.MobilePhone2,EI.MobilePhone2),
    EI.HomePhone1=COALESCE(B.HomePhone1,EI.HomePhone1),
    EI.HomePhone2=COALESCE(B.HomePhone2,EI.HomePhone2)
FROM #EmployeeTemp B
JOIN dbo.Staffing_EmployeeInformations EI WITH (ROWLOCK, UPDLOCK) ON EI.EmployeeID = B.EmployeeID
WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL) OR (B.MobilePhone1 IS NOT NULL) OR (B.MobilePhone2 IS NOT NULL) OR (B.HomePhone1 IS NOT NULL) OR (B.HomePhone2 IS NOT NULL);
COMMIT TRAN;";
                            cmd.ExecuteNonQuery();
                        }
                    }
                    totalUpdated += employees.Count;
                    if (progressCallback != null)
                        progressCallback(c + 1, totalChunks);
                    // Yield để request khác (web) không bị treo khi data lớn (50k+)
                    System.Threading.Thread.Sleep(0);
                }
                return Tuple.Create(totalUpdated + clearedRows, (string)null);
            }
            catch (Exception ex)
            {
                return Tuple.Create(0, ex.Message ?? "Lỗi reset.");
            }
        }

        private static void RunMultiDbResetPlainAndEncrypted(string targetConnectionString, string dbLabelForError, string emailTrim, string phoneTrim, bool emailToNull, bool phoneToNull, ref int totalAffected, List<string> errors)
        {
            try
            {
                using (var conn = new SqlConnection(targetConnectionString))
                {
                    conn.Open();
                    if (emailToNull)
                        totalAffected += UpdateEmailValuesToNullInDb(conn);
                    else if (!string.IsNullOrEmpty(emailTrim))
                        totalAffected += UpdateEmailValuesInDb(conn, emailTrim);
                    if (phoneToNull)
                        totalAffected += ResetPhoneColumnsToNullInDb(conn);
                    else if (!string.IsNullOrEmpty(phoneTrim))
                        totalAffected += ResetPhoneColumnsInDb(conn, phoneTrim);
                }
                if (emailToNull || phoneToNull || !string.IsNullOrEmpty(emailTrim) || !string.IsNullOrEmpty(phoneTrim))
                {
                    var encResult = ResetEmailAndPhoneEncryptedForRestore(targetConnectionString, emailTrim, phoneTrim, null, null, emailToNull, phoneToNull);
                    if (encResult.Item2 != null)
                        errors.Add(dbLabelForError + " (mã hóa): " + encResult.Item2);
                    else
                        totalAffected += encResult.Item1;
                }
            }
            catch (Exception ex)
            {
                errors.Add(dbLabelForError + ": " + (ex.Message ?? "Lỗi"));
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
                var payload = JsonConvert.SerializeObject(new { connectionString = connStr, tenantID, companyID, isUpdateAll, useCommonEmail, commonEmail = commonEmail ?? "", hrEmailTo = hrEmailTo ?? "", hrEmailCC = hrEmailCC ?? "", payrollEmailTo = payrollEmailTo ?? "", payrollEmailCC = payrollEmailCC ?? "", contactEmail = contactEmail ?? "", outgoingServer = outgoingServer ?? "", serverPort, accountName = accountName ?? "", userName = userName ?? "", emailAddress = emailAddress ?? "", password = password ?? "", enableSSL, sslPort });
                var jobId = BaJobQueue.Enqueue(new BaJobRequest { JobType = "HRHelperUpdateOther", ServerName = serverName, DatabaseName = databaseName, UserId = userId, UserName = userName2, Payload = payload });
                UserActionLogHelper.Log("HRHelper.UpdateOther", "jobId=" + jobId + ", database=" + databaseName + ", tenantID=" + tenantID + ", companyID=" + companyID + " (update company/email config)");
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
                var total = GetEmployeesCountInternal(info.ConnectionString, companyID);
                return new { success = true, total = total };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        /// <summary>Phân trang server-side — chỉ trả về 1 trang (View Data nhanh, không load hết vào browser).</summary>
        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SearchEmployeesPage(string k, int companyID, int page, int pageSize, string search, string sortCol, int sortDir, bool skipCount)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var companyFilter = HrEmployeeLoadProgress.ParseCompanyFilter(companyID);
                var safePage = Math.Max(1, page);
                var safeSize = Math.Max(1, Math.Min(5000, pageSize));
                int total = -1;
                List<object> rows;
                long countMs = 0;
                long fetchMs = 0;
                var countKey = HrEmployeeCountCache.BuildKey(info.Database, companyFilter, search);
                Task<int> countTask = null;
                if (!skipCount)
                {
                    int cachedTotal;
                    if (HrEmployeeCountCache.TryGet(countKey, out cachedTotal))
                    {
                        total = cachedTotal;
                    }
                    else
                    {
                        var cs = info.ConnectionString;
                        var cf = companyFilter;
                        var searchCopy = search;
                        countTask = Task.Run(() =>
                        {
                            using (var c = new SqlConnection(cs))
                            {
                                c.Open();
                                return GetEmployeesFilteredCount(c, cf, searchCopy);
                            }
                        });
                    }
                }
                using (var conn = new SqlConnection(info.ConnectionString))
                {
                    conn.Open();
                    var swFetch = Stopwatch.StartNew();
                    List<Dictionary<string, object>> pageRows;
                    if (!skipCount && total == 0)
                        pageRows = new List<Dictionary<string, object>>();
                    else
                    {
                        if (!skipCount && total > 0)
                        {
                            var maxPage = Math.Max(1, (int)Math.Ceiling(total / (double)safeSize));
                            if (safePage > maxPage) safePage = maxPage;
                        }
                        pageRows = FetchEmployeesPageDirect(conn, companyFilter, search, sortCol, sortDir, safePage, safeSize);
                    }
                    swFetch.Stop();
                    fetchMs = swFetch.ElapsedMilliseconds;
                    rows = pageRows.Select(x => (object)ToClientEmployeeDict(x)).ToList();
                }
                if (countTask != null)
                {
                    var swCount = Stopwatch.StartNew();
                    total = countTask.Result;
                    swCount.Stop();
                    countMs = swCount.ElapsedMilliseconds;
                    if (total >= 0)
                        HrEmployeeCountCache.Set(countKey, total, 120);
                }
                sw.Stop();
                HrEmployeeLoadProgress.Log("page", "SearchEmployeesPage page=" + safePage + " size=" + safeSize
                    + " total=" + total + " rows=" + rows.Count + " ms=" + sw.ElapsedMilliseconds
                    + " countMs=" + countMs + " fetchMs=" + fetchMs
                    + (string.IsNullOrWhiteSpace(search) ? "" : " searchLen=" + (search ?? "").Trim().Length));
                return new { success = true, total = total, page = safePage, pageSize = safeSize, list = rows };
            }
            catch (Exception ex)
            {
                sw.Stop();
                HrEmployeeLoadProgress.Log("page", "SearchEmployeesPage ERROR ms=" + sw.ElapsedMilliseconds + " " + ex.Message);
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Lấy toàn bộ EmployeeID khớp filter (Update all / Generate test data khi không chọn checkbox).</summary>
        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetEmployeeIdsForFilter(string k, int companyID, string search)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var companyFilter = HrEmployeeLoadProgress.ParseCompanyFilter(companyID);
                List<long> ids;
                using (var conn = new SqlConnection(info.ConnectionString))
                {
                    conn.Open();
                    ids = FetchEmployeeIdsForFilter(conn, companyFilter, search);
                }
                return new { success = true, ids = ids, total = ids.Count };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        /// <summary>Lazy load policy/org/userName cho trang đang hiển thị (chạy song song decrypt).</summary>
        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmployeeGridExtras(string k, List<long> employeeIds)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                if (employeeIds == null || employeeIds.Count == 0)
                    return new { success = true, list = new List<object>() };
                var inList = string.Join(",", employeeIds.Select(id => id.ToString()));
                var list = new List<object>();
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 45;
                    cmd.CommandText = @"
;WITH EmployeeUser AS (
    SELECT U.ID, U.UserName, U.EmployeeID,
           ROW_NUMBER() OVER (PARTITION BY U.EmployeeID ORDER BY U.IsActive DESC, U.ID) AS rn
    FROM Security_Users AS U WITH (NOLOCK)
    WHERE U.EmployeeID IN (" + inList + @")
)
SELECT E.ID AS EmployeeID,
       TSA.NameEN AS ALPolicy,
       TS.NameEN AS TimeSheetPolicy,
       OU.NameEN AS OrganizionStructure,
       U.UserName
FROM Staffing_Transactions AS T WITH (NOLOCK)
INNER JOIN Staffing_Employees AS E WITH (NOLOCK) ON E.ID = T.EmployeeID
INNER JOIN Staffing_OrganizationStructures AS OS WITH (NOLOCK) ON OS.ID = T.OrganizationStructureID
INNER JOIN Staffing_OrganizationUnits AS OU WITH (NOLOCK) ON OU.ID = OS.OrgUnitID
INNER JOIN TIM_TimeSheetPolicies AS TS WITH (NOLOCK) ON TS.ID = T.TimeSheetPolicyID
INNER JOIN TIM_TimeSheetALPolicies AS TSA WITH (NOLOCK) ON TSA.ID = T.TimeSheetALPolicyID
LEFT JOIN EmployeeUser AS U ON U.EmployeeID = E.ID AND U.rn = 1
WHERE T.IsActiveTransaction = 1 AND E.ID IN (" + inList + @")";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            list.Add(new
                            {
                                employeeID = MyConvert.To<long>(r.GetValue(0)),
                                alPolicy = MyConvert.To<string>(r.GetValue(1)) ?? "",
                                timeSheetPolicy = MyConvert.To<string>(r.GetValue(2)) ?? "",
                                organizionStructure = MyConvert.To<string>(r.GetValue(3)) ?? "",
                                userName = MyConvert.To<string>(r.GetValue(4)) ?? ""
                            });
                        }
                    }
                }
                sw.Stop();
                HrEmployeeLoadProgress.Log("page", "LoadEmployeeGridExtras ids=" + employeeIds.Count + " ms=" + sw.ElapsedMilliseconds);
                return new { success = true, list = list };
            }
            catch (Exception ex)
            {
                sw.Stop();
                HrEmployeeLoadProgress.Log("page", "LoadEmployeeGridExtras ERROR ms=" + sw.ElapsedMilliseconds + " " + ex.Message);
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Tiến trình load bulk (legacy WebMethod — ưu tiên poll qua Handlers/EmployeeLoadProgress.ashx).</summary>
        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetEmployeesLoadProgress(string dbName, int companyID)
        {
            try
            {
                var json = HrEmployeeLoadProgress.ToJson(dbName, companyID);
                return new System.Web.Script.Serialization.JavaScriptSerializer().DeserializeObject(json);
            }
            catch (Exception ex)
            {
                return new { success = false, loading = false, loaded = 0, total = 0, done = false, hasError = true, message = ex.Message, step = "" };
            }
        }

        /// <summary>Load toàn bộ employee vào Session (1 request). Query nhẹ + không decrypt; decrypt theo trang sau.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmployeesToSessionBulk(string k, int companyID)
        {
            var companyFilter = HrEmployeeLoadProgress.ParseCompanyFilter(companyID);
            var progressKey = "";
            var swTotal = (Stopwatch)null;
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                progressKey = HrEmployeeLoadProgress.BuildKey(info.Database, companyFilter);
                var sessionKey = "HR_Employees_" + (companyFilter.HasValue ? companyFilter.Value.ToString() : "All");
                HrEmployeeLoadProgress.Reset(progressKey, "Khởi tạo load...");
                HrEmployeeLoadProgress.Log(progressKey, "LoadEmployeesToSessionBulk START db=" + info.Database + " companyID=" + companyID);
                swTotal = HrEmployeeLoadProgress.StartPhase(progressKey, "bulk_total");

                var swCount = HrEmployeeLoadProgress.StartPhase(progressKey, "count");
                HrEmployeeLoadProgress.Set(progressKey, 0, 0, false, false, "Đang đếm employee...", "count");
                var total = GetEmployeesCountInternal(info.ConnectionString, companyFilter);
                HrEmployeeLoadProgress.EndPhase(progressKey, "count", swCount, "total=" + total);
                HrEmployeeLoadProgress.Set(progressKey, total, 0, false, false, "Tổng " + total + " employee", "count_done");

                var all = new List<object>(total > 0 ? total : 256);
                using (var conn = new SqlConnection(info.ConnectionString))
                {
                    var swConn = HrEmployeeLoadProgress.StartPhase(progressKey, "open_connection");
                    conn.Open();
                    HrEmployeeLoadProgress.EndPhase(progressKey, "open_connection", swConn, null);
                    var rows = FetchAllEmployees(conn, companyFilter, progressKey);
                    all.AddRange(rows.Cast<object>());
                    HrEmployeeLoadProgress.Set(progressKey, total, all.Count, false, false,
                        "Đã đọc " + all.Count + " / " + total, "fetch_all_done");
                }
                var swSession = HrEmployeeLoadProgress.StartPhase(progressKey, "session_save");
                HrEmployeeLoadProgress.Set(progressKey, total, all.Count, false, false, "Đang lưu session...", "session_save");
                HttpContext.Current.Session.Remove(sessionKey);
                HttpContext.Current.Session[sessionKey] = all;
                HrEmployeeLoadProgress.EndPhase(progressKey, "session_save", swSession, "rows=" + all.Count);

                HrEmployeeLoadProgress.EndPhase(progressKey, "bulk_total", swTotal, "totalRows=" + all.Count);
                HrEmployeeLoadProgress.Set(progressKey, total, all.Count, true, false, "Hoàn thành " + all.Count + " employee", "done");
                HrEmployeeLoadProgress.Log(progressKey, "LoadEmployeesToSessionBulk DONE rows=" + all.Count);
                return new { success = true, total = all.Count, progressKey = progressKey };
            }
            catch (Exception ex)
            {
                HrEmployeeLoadProgress.Log(progressKey, "LoadEmployeesToSessionBulk ERROR " + ex.Message);
                if (!string.IsNullOrEmpty(progressKey))
                {
                    HrEmployeeLoadProgress.EndPhase(progressKey, "bulk_total", swTotal, "FAILED");
                    HrEmployeeLoadProgress.Set(progressKey, -1, -1, true, true, ex.Message, "error");
                }
                return new { success = false, message = ex.Message };
            }
        }

        /// <summary>Giải mã email/phone cho danh sách employee (lazy — theo trang hiển thị).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DecryptEmployeesBatch(string k, int? companyID, List<long> employeeIds)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                if (employeeIds == null || employeeIds.Count == 0)
                    return new { success = true, list = new List<object>() };
                var idSet = new HashSet<long>(employeeIds);
                var matches = new List<Dictionary<string, object>>();
                var sessionKey = "HR_Employees_" + (companyID.HasValue ? companyID.Value.ToString() : "All");
                var list = GetEmployeesSessionList(sessionKey);
                if (list != null && list.Count > 0)
                {
                    foreach (var item in list)
                    {
                        var emp = item as Dictionary<string, object>;
                        if (emp == null) continue;
                        var eid = MyConvert.To<long>(emp.ContainsKey("employeeID") ? emp["employeeID"] : 0);
                        if (!idSet.Contains(eid)) continue;
                        matches.Add(emp);
                    }
                }
                if (matches.Count == 0)
                {
                    foreach (var eid in employeeIds)
                    {
                        matches.Add(new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                        {
                            { "employeeID", eid },
                            { "sensitiveDecrypted", false }
                        });
                    }
                }
                var swEnc = HrEmployeeLoadProgress.StartPhase("decrypt", "decrypt_load_db");
                LoadEncryptedFieldsFromDb(info.ConnectionString, matches, idSet);
                HrEmployeeLoadProgress.EndPhase("decrypt", "decrypt_load_db", swEnc, "ids=" + matches.Count);
                System.Threading.Tasks.Parallel.ForEach(matches, DecryptEmployeeDict);
                var result = matches.Select(ToClientEmployeeDict).Cast<object>().ToList();
                return new { success = true, list = result };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        private static void AppendEmployeeCompanyFilter(SqlCommand cmd, int? companyID, ref string whereClause)
        {
            if (companyID.HasValue && companyID.Value > 0)
            {
                whereClause += " AND T.CompanyID = @companyID";
                cmd.Parameters.AddWithValue("@companyID", companyID.Value);
            }
        }

        private static string AppendEmployeeKeysetFilter(SqlCommand cmd, long afterEmployeeID)
        {
            if (afterEmployeeID <= 0) return "";
            cmd.Parameters.AddWithValue("@afterEmpId", afterEmployeeID);
            return " AND T.EmployeeID > @afterEmpId";
        }

        private const string EmployeesCountQueryWithJoins = @"
SELECT COUNT(*)
FROM Staffing_Transactions AS T WITH (NOLOCK)
INNER JOIN Staffing_OrganizationStructures AS OS WITH (NOLOCK) ON OS.ID = T.OrganizationStructureID
INNER JOIN Staffing_OrganizationUnits AS OU WITH (NOLOCK) ON OU.ID = OS.OrgUnitID
INNER JOIN Staffing_Employees AS E WITH (NOLOCK) ON E.ID = T.EmployeeID
INNER JOIN TIM_TimeSheetPolicies AS TS WITH (NOLOCK) ON TS.ID = T.TimeSheetPolicyID
INNER JOIN TIM_TimeSheetALPolicies AS TSA WITH (NOLOCK) ON TSA.ID = T.TimeSheetALPolicyID
INNER JOIN MultiTenant_Companies AS C WITH (NOLOCK) ON C.ID = T.CompanyID
WHERE T.IsActiveTransaction = 1";

        /* Phân trang: chỉ T+E khi có search; không search thì chỉ T (nhanh nhất). */
        private const string EmployeesIdPageBase = @"
SELECT E.ID
FROM Staffing_Transactions AS T WITH (NOLOCK)
INNER JOIN Staffing_Employees AS E WITH (NOLOCK) ON E.ID = T.EmployeeID
WHERE T.IsActiveTransaction = 1";

        private const string EmployeesIdPageBaseNoSearch = @"
SELECT T.EmployeeID
FROM Staffing_Transactions AS T WITH (NOLOCK)
WHERE T.IsActiveTransaction = 1";

        private const string EmployeesCountQueryLight = @"
SELECT COUNT(*)
FROM Staffing_Transactions AS T WITH (NOLOCK)
INNER JOIN Staffing_Employees AS E WITH (NOLOCK) ON E.ID = T.EmployeeID
WHERE T.IsActiveTransaction = 1";

        private static readonly Dictionary<string, string> EmployeeSortSqlColumns =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "employeeID", "T.EmployeeID" },
                { "localEmployeeID", "E.LocalEmployeeID" },
                { "employeeName", "E.FullName" },
                { "englishName", "E.EnglishName" },
                { "dateOfBirth", "E.DateOfBirth" },
                { "serviceStartDate", "T.ServiceStartDate" },
                { "alPolicy", "TSA.NameEN" },
                { "timeSheetPolicy", "TS.NameEN" },
                { "organizionStructure", "OU.NameEN" },
                { "companyInfo", "C.NameEN" }
            };

        private static string EscapeSqlLikePattern(string text)
        {
            if (string.IsNullOrEmpty(text)) return text;
            return text.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");
        }

        private static void AppendEmployeeSearchFilter(SqlCommand cmd, string search, ref string whereClause)
        {
            var q = (search ?? "").Trim();
            if (q.Length == 0) return;
            var like = "%" + EscapeSqlLikePattern(q) + "%";
            var prefix = EscapeSqlLikePattern(q) + "%";
            cmd.Parameters.AddWithValue("@searchLike", like);
            cmd.Parameters.AddWithValue("@searchPrefix", prefix);
            long empId;
            if (long.TryParse(q, out empId) && empId > 0)
            {
                cmd.Parameters.AddWithValue("@empIdSearch", empId);
                whereClause += @"
 AND (
    E.ID = @empIdSearch
    OR E.LocalEmployeeID LIKE @searchPrefix
    OR E.FullName LIKE @searchPrefix
    OR E.EnglishName LIKE @searchPrefix
 )";
            }
            else
            {
                whereClause += @"
 AND (
    E.LocalEmployeeID LIKE @searchPrefix
    OR E.FullName LIKE @searchPrefix
    OR E.EnglishName LIKE @searchPrefix
    OR E.LocalEmployeeID LIKE @searchLike
    OR E.FullName LIKE @searchLike
    OR E.EnglishName LIKE @searchLike
 )";
            }
        }

        private static string BuildEmployeePageOrderBy(string sortCol, int sortDir)
        {
            string colSql;
            switch ((sortCol ?? "").ToLowerInvariant())
            {
                case "localemployeeid": colSql = "E.LocalEmployeeID"; break;
                case "employeename": colSql = "E.FullName"; break;
                case "englishname": colSql = "E.EnglishName"; break;
                case "dateofbirth": colSql = "E.DateOfBirth"; break;
                case "servicestartdate": colSql = "T.ServiceStartDate"; break;
                case "companyinfo": colSql = "C.NameEN"; break;
                default: colSql = "T.EmployeeID"; break;
            }
            var dir = sortDir < 0 ? "DESC" : "ASC";
            if (!string.Equals(colSql, "T.EmployeeID", StringComparison.OrdinalIgnoreCase))
                return " ORDER BY " + colSql + " " + dir + ", T.EmployeeID ASC, T.ID ASC";
            return " ORDER BY T.EmployeeID " + dir + ", T.ID ASC";
        }

        private static List<Dictionary<string, object>> FetchEmployeesPageDirect(
            SqlConnection conn, int? companyID, string search, string sortCol, int sortDir, int page, int pageSize)
        {
            var list = new List<Dictionary<string, object>>(pageSize);
            var safePage = Math.Max(1, page);
            var safeSize = Math.Max(1, Math.Min(5000, pageSize));
            var offset = (safePage - 1) * safeSize;
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 45;
                var whereExtra = "";
                AppendEmployeeCompanyFilter(cmd, companyID, ref whereExtra);
                AppendEmployeeSearchFilter(cmd, search, ref whereExtra);
                cmd.CommandText = EmployeesQueryPageMinimal + whereExtra + BuildEmployeePageOrderBy(sortCol, sortDir)
                    + " OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY";
                cmd.Parameters.AddWithValue("@offset", offset);
                cmd.Parameters.AddWithValue("@pageSize", safeSize);
                using (var r = cmd.ExecuteReader(CommandBehavior.SequentialAccess))
                {
                    var values = new object[r.FieldCount];
                    while (r.Read())
                    {
                        r.GetValues(values);
                        list.Add(ReadEmployeeRowDictFromValues(values, false));
                    }
                }
            }
            return list;
        }

        private static void SortEmployeeDictList(List<Dictionary<string, object>> list, string sortCol, int sortDir)
        {
            if (list == null || list.Count < 2) return;
            var col = (sortCol ?? "employeeID").ToLowerInvariant();
            var dir = sortDir < 0 ? -1 : 1;
            list.Sort((a, b) =>
            {
                object va, vb;
                a.TryGetValue(col, out va);
                b.TryGetValue(col, out vb);
                if (va == null && vb == null) return 0;
                if (va == null) return dir;
                if (vb == null) return -dir;
                if (va is long || va is int || va is decimal || va is double || va is float)
                {
                    var na = Convert.ToDecimal(va);
                    var nb = Convert.ToDecimal(vb);
                    return dir * na.CompareTo(nb);
                }
                if (va is DateTime)
                {
                    var da = (DateTime)va;
                    var db = (DateTime)vb;
                    return dir * da.CompareTo(db);
                }
                var sa = (va ?? "").ToString().ToLowerInvariant();
                var sb = (vb ?? "").ToString().ToLowerInvariant();
                return dir * string.Compare(sa, sb, StringComparison.Ordinal);
            });
        }

        private static int GetEmployeesFilteredCount(SqlConnection conn, int? companyID, string search)
        {
            var hasSearch = !string.IsNullOrWhiteSpace(search);
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 45;
                var whereExtra = "";
                AppendEmployeeCompanyFilter(cmd, companyID, ref whereExtra);
                if (hasSearch)
                    AppendEmployeeSearchFilter(cmd, search, ref whereExtra);
                cmd.CommandText = (hasSearch ? EmployeesCountQueryLight : EmployeesCountQuery) + whereExtra;
                return Convert.ToInt32(cmd.ExecuteScalar());
            }
        }

        private static List<Dictionary<string, object>> FetchEmployeesPage(
            SqlConnection conn, int? companyID, string search, string sortCol, int sortDir, int page, int pageSize)
        {
            return FetchEmployeesPageDirect(conn, companyID, search, sortCol, sortDir, page, pageSize);
        }

        private static List<long> FetchEmployeeIdsForFilter(SqlConnection conn, int? companyID, string search)
        {
            var ids = new List<long>(4096);
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandTimeout = 120;
                var whereExtra = "";
                AppendEmployeeCompanyFilter(cmd, companyID, ref whereExtra);
                AppendEmployeeSearchFilter(cmd, search, ref whereExtra);
                cmd.CommandText = EmployeesIdPageBase + whereExtra + " ORDER BY T.EmployeeID, T.ID";
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                        ids.Add(MyConvert.To<long>(r.GetValue(0)));
                }
            }
            return ids;
        }

        /// <summary>Load employee theo keyset (legacy chunk API).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmployeesChunk(string k, int count, int? companyID, long afterEmployeeID)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var take = Math.Max(1, Math.Min(5000, count));
                long nextAfterEmployeeID = 0;
                var rows = new List<object>();
                using (var conn = new SqlConnection(info.ConnectionString))
                {
                    conn.Open();
                    var batch = FetchEmployeeBatch(conn, companyID, afterEmployeeID, take, true, false, null, 0, 0);
                    foreach (var row in batch)
                    {
                        rows.Add(ToClientEmployeeDict(row));
                        nextAfterEmployeeID = MyConvert.To<long>(row["employeeID"]);
                    }
                }
                var hasMore = rows.Count >= take;
                return new { success = true, list = rows, hasMore = hasMore, nextAfterEmployeeID };
            }
            catch (Exception ex) { return new { success = false, message = ex.Message }; }
        }

        private static object ReadEmployeeRow(SqlDataReader r)
        {
            return ToClientEmployeeDict(ReadEmployeeRowDict(r, true));
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadEmployees(string k)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database. Vui lòng Connect từ Công cụ Database." };
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

                var result = ExecuteUpdateEmployeesCore(info.ConnectionString, employeeIds, updPersonal, personalEmail, updBusiness, businessEmail, updPayslip, payslipCommon, payslipByEmp, updM1, m1, updM2, m2, updM1, m1, updM2, m2, updBasic, basicSalary);
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
                var payload = JsonConvert.SerializeObject(new { connectionString = connStr, companyID, employeeIds, updPersonal, personalEmail = personalEmail ?? "", updBusiness, businessEmail = businessEmail ?? "", updPayslip, payslipCommon = payslipCommon ?? "", payslipByEmp, updM1, m1 = m1 ?? "", updM2, m2 = m2 ?? "", updBasic, basicSalary });
                var jobId = BaJobQueue.Enqueue(new BaJobRequest { JobType = "HRHelperUpdateEmployee", ServerName = serverName, DatabaseName = databaseName, UserId = userId, UserName = userName, Payload = payload });
                var empDetail = "jobId=" + jobId + ", database=" + databaseName + ", employeeIds=" + (employeeIds?.Count ?? 0);
                if (updPersonal) empDetail += ", personalEmail" + (string.IsNullOrWhiteSpace(personalEmail) ? "" : "=" + personalEmail);
                if (updBusiness) empDetail += ", businessEmail" + (string.IsNullOrWhiteSpace(businessEmail) ? "" : "=" + businessEmail);
                if (updPayslip) empDetail += ", payslip";
                if (updM1) empDetail += ", M1";
                if (updM2) empDetail += ", M2";
                if (updBasic) empDetail += ", basicSalary";
                UserActionLogHelper.Log("HRHelper.UpdateEmployee", empDetail);
                return new { success = true, jobId = jobId, message = "Đã đưa update employee vào hàng đợi." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        private static string ExtractEmailDomainFromPattern(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var s = raw.Trim().ToLowerInvariant();
            if (s.Contains("@")) s = s.Substring(s.LastIndexOf("@", StringComparison.Ordinal) + 1);
            s = s.Trim().TrimStart('*').TrimStart('.').Trim();
            if (s.Contains("/")) return null;
            if (!s.Contains(".")) return null;
            return s;
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetHrTestDataEmailDomains()
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", domains = new List<string>() };
                var domains = LoadEmailIgnoreFromDb()
                    .Select(ExtractEmailDomainFromPattern)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(x => x)
                    .ToList();
                return new { success = true, domains = domains };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, domains = new List<string>() };
            }
        }

        /// <summary>Đưa job generate test data (Email/Phone/Lương random) cho Employee Info vào hàng đợi.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartHRHelperGenerateEmployeeTestDataJob(string k, int? companyID, List<long> employeeIds,
            bool generateEmail, string emailDomain, string emailPrefix, int emailStartNumber,
            bool generatePhone,
            bool generateSalary, decimal salaryMin, decimal salaryMax,
            bool updateUserEmailMapping)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobId = 0 };
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database.", jobId = 0 };
                if (employeeIds == null || employeeIds.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 employee (hoặc load all).", jobId = 0 };
                if (!generateEmail && !generatePhone && !generateSalary)
                    return new { success = false, message = "Chọn ít nhất 1 mục cần generate (Email/Phone/Lương).", jobId = 0 };

                var normalizedDomain = (emailDomain ?? "").Trim().TrimStart('@').ToLowerInvariant();
                var normalizedPrefix = (emailPrefix ?? "").Trim().ToLowerInvariant();
                if (generateEmail)
                {
                    if (string.IsNullOrWhiteSpace(normalizedPrefix))
                        return new { success = false, message = "Nhập Email Prefix.", jobId = 0 };
                    if (string.IsNullOrWhiteSpace(normalizedDomain) || !normalizedDomain.Contains("."))
                        return new { success = false, message = "Chọn Email Domain hợp lệ.", jobId = 0 };
                }
                if (generateSalary)
                {
                    if (salaryMin < 0 || salaryMax < 0)
                        return new { success = false, message = "Lương Min/Max phải >= 0.", jobId = 0 };
                    if (salaryMax < salaryMin)
                        return new { success = false, message = "Lương Max phải >= Min.", jobId = 0 };
                }
                var updPersonal = generateEmail;
                var updBusiness = generateEmail;
                var updM1 = generatePhone;
                var updM2 = generatePhone;
                var updBasic = generateSalary;

                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var connStr = info.ConnectionString;
                var serverName = info.Server ?? "";
                var databaseName = info.Database ?? "";
                var payload = JsonConvert.SerializeObject(new
                {
                    connectionString = connStr,
                    companyID,
                    employeeIds,
                    updPersonal,
                    personalEmail = "",
                    updBusiness,
                    businessEmail = "",
                    updPayslip = false,
                    payslipCommon = "",
                    payslipByEmp = false,
                    updM1,
                    m1 = "",
                    updM2,
                    m2 = "",
                    updBasic,
                    basicSalary = 0m,
                    isGenerateTestData = true,
                    generateEmail,
                    emailDomain = normalizedDomain,
                    emailPrefix = normalizedPrefix,
                    emailStartNumber = Math.Max(1, emailStartNumber),
                    generatePhone,
                    generateSalary,
                    salaryMin,
                    salaryMax,
                    updateUserEmailMapping
                });

                var jobId = BaJobQueue.Enqueue(new BaJobRequest { JobType = "HRHelperUpdateEmployee", ServerName = serverName, DatabaseName = databaseName, UserId = userId, UserName = userName, Payload = payload });
                UserActionLogHelper.Log("HRHelper.GenerateData", "Generate test data, jobId=" + jobId + ", employeeIds=" + employeeIds.Count
                    + ", email=" + (generateEmail ? "1" : "0") + ", phone=" + (generatePhone ? "1" : "0") + ", salary=" + (generateSalary ? "1" : "0"));
                return new { success = true, jobId = jobId, message = "Đã đưa Generate test data vào hàng đợi." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }

        /// <summary>Tính batch size theo totalRows để có ~12–40 batch, % cập nhật mượt. Ví dụ: 100→10, 200→17, 500→42, 1k→40, 1.5k→60, 2k→50, 3k→75, 5k→125, 10k→250, 15k→375, 20k→500, 50k→1250.</summary>
        private const int EmployeePrepareShare = 8;
        private const int EmployeeBatchMin = 50;
        private const int EmployeeBatchMax = 2000;
        private const int EmployeeBatchTargetMs = 3000;

        private static int GetEmployeeUpdateBatchSize(int totalRows)
        {
            if (totalRows <= 0) return 10;
            int targetBatches = Math.Min(40, Math.Max(12, totalRows / 400));
            int batchSize = (int)Math.Ceiling(totalRows / (double)targetBatches);
            return Math.Max(10, Math.Min(2000, batchSize));
        }

        /// <summary>Chạy update employee (trả về Tuple cho job nền). onProgress(jobId, percent, message) gọi sau mỗi batch khi chạy từ Worker.</summary>
        private static Tuple<bool, string> ExecuteUpdateEmployeesCore(string connectionString, List<long> employeeIds,
            bool updPersonal, string personalEmail, bool updBusiness, string businessEmail,
            bool updPayslip, string payslipCommon, bool payslipByEmp,
            bool updM1, string m1, bool updM2, string m2,
            bool updH1, string h1, bool updH2, string h2,
            bool updBasic, decimal basicSalary,
            EmployeeTestDataOptions testDataOptions = null,
            Action<int, string, string> onProgress = null)
        {
            connectionString = EnsureMinConnectionTimeout(connectionString, 120);
            try
            {
                BaJobWorkerNotify.Log("ExecuteUpdateEmployeesCore: LoadEmployeesForUpdate bắt đầu (target DB).");
                var watch = System.Diagnostics.Stopwatch.StartNew();
                onProgress?.Invoke(1, "Đang tải danh sách nhân viên...", null);
                var employees = LoadEmployeesForUpdate(connectionString, employeeIds);
                if (employees == null || employees.Count == 0)
                    return Tuple.Create(false, "Không tìm thấy employee cần update.");
                BaJobWorkerNotify.Log("ExecuteUpdateEmployeesCore: LoadEmployees xong count=" + employees.Count + ", BuildEmployeeDataTable.");
                onProgress?.Invoke(3, "Đang chuẩn bị dữ liệu " + employees.Count + " nhân viên...", null);
                var dt = BuildEmployeeDataTable(employees, updPersonal, personalEmail, updBusiness, businessEmail, updPayslip, payslipCommon, payslipByEmp, updM1, m1, updM2, m2, updH1, h1, updH2, h2, updBasic, basicSalary, testDataOptions);
                int totalRows = dt.Rows.Count;
                int batchSize = GetEmployeeUpdateBatchSize(totalRows);
                BaJobWorkerNotify.Log("ExecuteUpdateEmployeesCore: totalRows=" + totalRows + " batchSize=" + batchSize);
                onProgress?.Invoke(EmployeePrepareShare, "Đang xử lý 0/" + totalRows + " nhân viên", null);
                int doneRows = 0;
                int batchNo = 0;
                var batchWatch = new System.Diagnostics.Stopwatch();
                var updateStartMs = watch.ElapsedMilliseconds;
                while (doneRows < totalRows)
                {
                    batchNo++;
                    int endIdx = Math.Min(doneRows + batchSize, totalRows) - 1;
                    var batchDt = dt.Clone();
                    for (int i = doneRows; i <= endIdx; i++)
                        batchDt.Rows.Add(dt.Rows[i].ItemArray);
                    bool batchOk = false;
                    batchWatch.Restart();
                    for (int attempt = 1; attempt <= 3 && !batchOk; attempt++)
                    {
                        try
                        {
                            RunOneBatchUpdateEmployee(connectionString, batchDt);
                            batchOk = true;
                        }
                        catch (Exception ex)
                        {
                            BaJobWorkerNotify.Log("ExecuteUpdateEmployeesCore: batch " + batchNo + " attempt " + attempt + " failed: " + ex.Message);
                            if (attempt == 3) return Tuple.Create(false, "Batch update failed (batch " + batchNo + ", " + (doneRows + 1) + "-" + (endIdx + 1) + "/" + totalRows + "): " + ex.Message);
                        }
                    }
                    doneRows = endIdx + 1;
                    BaJobWorkerNotify.Log("ExecuteUpdateEmployeesCore: batch " + batchNo + " xong " + doneRows + "/" + totalRows + " (" + batchWatch.ElapsedMilliseconds + " ms, " + batchDt.Rows.Count + " dòng).");
                    int pct = EmployeePrepareShare + (int)Math.Floor((99 - EmployeePrepareShare) * (doneRows / (double)totalRows));
                    var elapsedMs = watch.ElapsedMilliseconds;
                    var eta = JobBatchSizer.Eta(elapsedMs - updateStartMs, doneRows, totalRows);
                    var detail = eta == null ? null : "Còn khoảng " + eta;
                    onProgress?.Invoke(Math.Min(pct, 99), "Đang xử lý " + doneRows + "/" + totalRows + " nhân viên", detail);
                    batchSize = JobBatchSizer.Next(batchSize, batchWatch.ElapsedMilliseconds, EmployeeBatchMin, EmployeeBatchMax, EmployeeBatchTargetMs);
                }
                var parts = new List<string>();
                if (updPersonal) parts.Add("Thông tin cá nhân");
                if (updBusiness) parts.Add("Email công việc");
                if (updPayslip) parts.Add("Payslip");
                if (updM1) parts.Add("M1");
                if (updM2) parts.Add("M2");
                if (updBasic) parts.Add("Basic Salary");
                if (testDataOptions != null && testDataOptions.GenerateEmail) parts.Add("Email test data");
                if (testDataOptions != null && testDataOptions.GeneratePhone) parts.Add("Phone test data");
                if (testDataOptions != null && testDataOptions.GenerateSalary) parts.Add("Salary test data");
                var summary = parts.Count > 0
                    ? ("Đã cập nhật: " + string.Join(", ", parts) + " cho " + employees.Count + " nhân viên.")
                    : ("Đã update " + employees.Count + " employee.");
                return Tuple.Create(true, summary);
            }
            catch (Exception ex)
            {
                return Tuple.Create(false, ex.Message);
            }
        }

        /// <summary>Một batch update employee: connection mới, #EmployeeTemp + bulk slice, rồi UPDATE. Retry = connection mới.</summary>
        private static void RunOneBatchUpdateEmployee(string connectionString, DataTable batchDt)
        {
            BaJobWorkerNotify.Log("RunOneBatchUpdateEmployee: mở connection tới DB đích (target).");
            using (var conn = new SqlConnection(connectionString))
            {
                conn.Open();
                BaJobWorkerNotify.Log("RunOneBatchUpdateEmployee: connection đã mở, tạo #EmployeeTemp.");
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 600;
                    cmd.CommandText = @"
SET NOCOUNT ON; SET XACT_ABORT ON; SET LOCK_TIMEOUT 60000;
IF OBJECT_ID('tempdb..#EmployeeTemp') IS NOT NULL DROP TABLE #EmployeeTemp;
CREATE TABLE #EmployeeTemp(
    RowId INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeID BIGINT NOT NULL,
    PersonalEmailAddress NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    BusinessEmailAddress NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,
    UserEmailAddress NVARCHAR(512) COLLATE DATABASE_DEFAULT NULL,
    PayslipPassword NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    MobilePhone1 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    MobilePhone2 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    HomePhone1 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    HomePhone2 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,
    BasicSalary NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL
);";
                    cmd.ExecuteNonQuery();
                }
                BaJobWorkerNotify.Log("RunOneBatchUpdateEmployee: BulkCopy " + batchDt.Rows.Count + " rows vào #EmployeeTemp.");
                using (var bulk = new SqlBulkCopy(conn))
                {
                    bulk.DestinationTableName = "#EmployeeTemp";
                    bulk.BulkCopyTimeout = 660;
                    bulk.BatchSize = 5000;
                    bulk.ColumnMappings.Add("EmployeeID", "EmployeeID");
                    bulk.ColumnMappings.Add("PersonalEmailAddress", "PersonalEmailAddress");
                    bulk.ColumnMappings.Add("BusinessEmailAddress", "BusinessEmailAddress");
                    bulk.ColumnMappings.Add("UserEmailAddress", "UserEmailAddress");
                    bulk.ColumnMappings.Add("PayslipPassword", "PayslipPassword");
                    bulk.ColumnMappings.Add("MobilePhone1", "MobilePhone1");
                    bulk.ColumnMappings.Add("MobilePhone2", "MobilePhone2");
                    bulk.ColumnMappings.Add("HomePhone1", "HomePhone1");
                    bulk.ColumnMappings.Add("HomePhone2", "HomePhone2");
                    bulk.ColumnMappings.Add("BasicSalary", "BasicSalary");
                    bulk.WriteToServer(batchDt);
                }
                BaJobWorkerNotify.Log("RunOneBatchUpdateEmployee: BulkCopy xong, chạy UPDATE batch (Staffing_Employees, ...).");
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandTimeout = 600;
                    cmd.CommandText = @"
SET LOCK_TIMEOUT 60000;
BEGIN TRAN;
IF OBJECT_ID('tempdb..#B') IS NOT NULL DROP TABLE #B;
SELECT RowId, EmployeeID, PersonalEmailAddress, BusinessEmailAddress, UserEmailAddress, PayslipPassword, MobilePhone1, MobilePhone2, HomePhone1, HomePhone2, BasicSalary
INTO #B FROM #EmployeeTemp;
CREATE NONCLUSTERED INDEX IX_B_EmployeeID ON #B(EmployeeID);
UPDATE E SET E.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,E.PersonalEmailAddress),
    E.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,E.BusinessEmailAddress),
    E.PayslipPassword=COALESCE(B.PayslipPassword,E.PayslipPassword),
    E.MobilePhone1=COALESCE(B.MobilePhone1,E.MobilePhone1),
    E.MobilePhone2=COALESCE(B.MobilePhone2,E.MobilePhone2),
    E.HomePhone1=COALESCE(B.HomePhone1,E.HomePhone1),
    E.HomePhone2=COALESCE(B.HomePhone2,E.HomePhone2)
FROM #B B
JOIN dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK) ON E.ID = B.EmployeeID
WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL) OR (B.PayslipPassword IS NOT NULL) OR (B.MobilePhone1 IS NOT NULL) OR (B.MobilePhone2 IS NOT NULL) OR (B.HomePhone1 IS NOT NULL) OR (B.HomePhone2 IS NOT NULL);
/* Cập nhật Staffing_EmployeeInformations (email + phone mã hóa): join trực tiếp #B.EmployeeID = EI.EmployeeID (FK tới Staffing_Employees.ID) */
IF OBJECT_ID('dbo.Staffing_EmployeeInformations','U') IS NOT NULL
UPDATE EI SET EI.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,EI.PersonalEmailAddress),
    EI.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,EI.BusinessEmailAddress),
    EI.MobilePhone1=COALESCE(B.MobilePhone1,EI.MobilePhone1),
    EI.MobilePhone2=COALESCE(B.MobilePhone2,EI.MobilePhone2),
    EI.HomePhone1=COALESCE(B.HomePhone1,EI.HomePhone1),
    EI.HomePhone2=COALESCE(B.HomePhone2,EI.HomePhone2)
FROM #B B
JOIN dbo.Staffing_EmployeeInformations EI WITH (ROWLOCK, UPDLOCK) ON EI.EmployeeID = B.EmployeeID
WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL) OR (B.MobilePhone1 IS NOT NULL) OR (B.MobilePhone2 IS NOT NULL) OR (B.HomePhone1 IS NOT NULL) OR (B.HomePhone2 IS NOT NULL);
/* Khi generate email test data, cập nhật luôn email mapping trên Security_Users theo EmployeeID */
IF OBJECT_ID('dbo.Security_Users','U') IS NOT NULL
UPDATE U SET U.UserEmailAddress = B.UserEmailAddress
FROM #B B
JOIN dbo.Security_Users U WITH (ROWLOCK, UPDLOCK) ON U.EmployeeID = B.EmployeeID
WHERE B.UserEmailAddress IS NOT NULL;
IF EXISTS(SELECT 1 FROM #B WHERE BasicSalary IS NOT NULL)
BEGIN
    
    UPDATE T SET T.BasicSalary=B.BasicSalary
    FROM #B B
    JOIN dbo.Staffing_Transactions T WITH (ROWLOCK, UPDLOCK) ON T.EmployeeID=B.EmployeeID
    WHERE B.BasicSalary IS NOT NULL;
END
DROP TABLE #B;
COMMIT TRAN;";
                    cmd.ExecuteNonQuery();
                }
                BaJobWorkerNotify.Log("RunOneBatchUpdateEmployee: UPDATE xong.");
            }
        }

        private sealed class EmployeeForUpdate
        {
            public long EmployeeID { get; set; }
            public string LocalEmployeeID { get; set; }
        }

        private sealed class EmployeeTestDataOptions
        {
            public bool GenerateEmail { get; set; }
            public string EmailPrefix { get; set; }
            public string EmailDomain { get; set; }
            public int EmailStartNumber { get; set; }
            public bool GeneratePhone { get; set; }
            public bool GenerateSalary { get; set; }
            public decimal SalaryMin { get; set; }
            public decimal SalaryMax { get; set; }
            public bool UpdateUserEmailMapping { get; set; }
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
            bool updM1, string m1, bool updM2, string m2,
            bool updH1, string h1, bool updH2, string h2,
            bool updBasic, decimal basicSalary,
            EmployeeTestDataOptions testDataOptions = null)
        {
            var dt = new DataTable();
            dt.Columns.Add("EmployeeID", typeof(long));
            dt.Columns.Add("PersonalEmailAddress", typeof(string));
            dt.Columns.Add("BusinessEmailAddress", typeof(string));
            dt.Columns.Add("UserEmailAddress", typeof(string));
            dt.Columns.Add("PayslipPassword", typeof(string));
            dt.Columns.Add("MobilePhone1", typeof(string));
            dt.Columns.Add("MobilePhone2", typeof(string));
            dt.Columns.Add("HomePhone1", typeof(string));
            dt.Columns.Add("HomePhone2", typeof(string));
            dt.Columns.Add("BasicSalary", typeof(string));
            var rng = new Random(unchecked(Environment.TickCount * 397) ^ employees.Count);
            var emailCounter = testDataOptions != null ? Math.Max(1, testDataOptions.EmailStartNumber) : 1;
            foreach (var e in employees)
            {
                var row = dt.NewRow();
                string generatedEmail = null;
                string generatedPhone = null;
                decimal generatedSalary = 0m;
                if (testDataOptions != null)
                {
                    if (testDataOptions.GenerateEmail)
                    {
                        var prefix = (testDataOptions.EmailPrefix ?? "test").Trim().ToLowerInvariant();
                        var domain = (testDataOptions.EmailDomain ?? "").Trim().TrimStart('@').ToLowerInvariant();
                        generatedEmail = prefix + emailCounter + "@" + domain;
                        emailCounter++;
                    }
                    if (testDataOptions.GeneratePhone)
                    {
                        var sbPhone = new StringBuilder(10);
                        sbPhone.Append('0');
                        sbPhone.Append('1');
                        sbPhone.Append((char)('0' + rng.Next(1, 10))); // 011..019
                        for (int i = 0; i < 7; i++) sbPhone.Append((char)('0' + rng.Next(0, 10)));
                        generatedPhone = sbPhone.ToString();
                    }
                    if (testDataOptions.GenerateSalary)
                    {
                        var min = testDataOptions.SalaryMin;
                        var max = testDataOptions.SalaryMax;
                        if (max < min) { var t = min; min = max; max = t; }
                        var span = max - min;
                        generatedSalary = span <= 0 ? min : (min + (decimal)rng.NextDouble() * span);
                        generatedSalary = Math.Round(generatedSalary, 2);
                    }
                }
                row["EmployeeID"] = e.EmployeeID;
                var finalPersonalEmail = (testDataOptions != null && testDataOptions.GenerateEmail) ? generatedEmail : personalEmail;
                var finalBusinessEmail = (testDataOptions != null && testDataOptions.GenerateEmail) ? generatedEmail : businessEmail;
                row["PersonalEmailAddress"] = updPersonal && !string.IsNullOrWhiteSpace(finalPersonalEmail) ? (object)DataSecurityWrapper.EncryptData(finalPersonalEmail, e.EmployeeID) : DBNull.Value;
                row["BusinessEmailAddress"] = updBusiness && !string.IsNullOrWhiteSpace(finalBusinessEmail) ? (object)DataSecurityWrapper.EncryptData(finalBusinessEmail, e.EmployeeID) : DBNull.Value;
                row["UserEmailAddress"] = (testDataOptions != null && testDataOptions.GenerateEmail && testDataOptions.UpdateUserEmailMapping && !string.IsNullOrWhiteSpace(generatedEmail))
                    ? (object)generatedEmail
                    : DBNull.Value;
                string payslipSrc = payslipByEmp ? (e.LocalEmployeeID ?? "") : (payslipCommon ?? "");
                row["PayslipPassword"] = updPayslip && !string.IsNullOrWhiteSpace(payslipSrc) ? (object)DataSecurityWrapper.EncryptData(payslipSrc, e.EmployeeID) : DBNull.Value;
                var finalM1 = (testDataOptions != null && testDataOptions.GeneratePhone) ? generatedPhone : m1;
                var finalM2 = (testDataOptions != null && testDataOptions.GeneratePhone) ? generatedPhone : m2;
                row["MobilePhone1"] = updM1 && !string.IsNullOrWhiteSpace(finalM1) ? (object)DataSecurityWrapper.EncryptData(finalM1, e.EmployeeID) : DBNull.Value;
                row["MobilePhone2"] = updM2 && !string.IsNullOrWhiteSpace(finalM2) ? (object)DataSecurityWrapper.EncryptData(finalM2, e.EmployeeID) : DBNull.Value;
                row["HomePhone1"] = updH1 && !string.IsNullOrWhiteSpace(h1) ? (object)DataSecurityWrapper.EncryptData(h1, e.EmployeeID) : DBNull.Value;
                row["HomePhone2"] = updH2 && !string.IsNullOrWhiteSpace(h2) ? (object)DataSecurityWrapper.EncryptData(h2, e.EmployeeID) : DBNull.Value;
                if (testDataOptions != null && testDataOptions.GeneratePhone && !string.IsNullOrWhiteSpace(generatedPhone))
                {
                    if (updM1) row["HomePhone1"] = (object)DataSecurityWrapper.EncryptData(generatedPhone, e.EmployeeID);
                    if (updM2) row["HomePhone2"] = (object)DataSecurityWrapper.EncryptData(generatedPhone, e.EmployeeID);
                }
                var finalBasic = (testDataOptions != null && testDataOptions.GenerateSalary) ? generatedSalary : basicSalary;
                row["BasicSalary"] = updBasic ? (object)DataSecurityWrapper.EncryptData(finalBasic, e.EmployeeID) : DBNull.Value;
                dt.Rows.Add(row);
            }
            return dt;
        }

        // ==================== Delete Employee ====================
        // Luồng: Chạy script GENERATOR trên DB dự án (connection hiện tại) → kết quả trả về là script DELETE
        // đúng với schema từng dự án (FK, bảng khác nhau). Thay placeholder bằng mã nhân viên user truyền vào.
        // Không fix cứng script delete: mỗi DB chạy generator ra một kết quả khác nhau.

        private const string DeleteEmployeePlaceholder = "__NHAP_MA_NHAN_VIEN_VAO_DAY__";

        /// <summary>Lấy nội dung script generator (từ Embedded Resource hoặc App_Data). Generator khi chạy trên DB dự án sẽ query sys.foreign_keys của DB đó và trả về script DELETE đúng schema từng dự án.</summary>
        private static string GetDeleteEmployeeGeneratorScriptContent()
        {
            var asm = typeof(HRHelper).Assembly;
            var resourceName = "BADesign.App_Data.GetEmployeeForeignKeyList.sql";
            using (var stream = asm.GetManifestResourceStream(resourceName))
            {
                if (stream != null)
                {
                    using (var reader = new System.IO.StreamReader(stream, System.Text.Encoding.UTF8))
                        return reader.ReadToEnd();
                }
            }
            var path = HttpContext.Current?.Server?.MapPath("~/App_Data/GetEmployeeForeignKeyList.sql");
            if (!string.IsNullOrEmpty(path) && System.IO.File.Exists(path))
                return System.IO.File.ReadAllText(path);
            return null;
        }

        /// <summary>Chạy script generator trên connection DB dự án, lấy kết quả (SELECT Line FROM @Lines). Kết quả là script DELETE theo đúng schema của DB đó.</summary>
        private static Tuple<bool, string, string> RunDeleteEmployeeGeneratorOnConnection(string connectionString)
        {
            var generatorSql = GetDeleteEmployeeGeneratorScriptContent();
            if (string.IsNullOrWhiteSpace(generatorSql))
                return Tuple.Create(false, (string)null, "Không tìm thấy script generator (EmbeddedResource hoặc App_Data/GetEmployeeForeignKeyList.sql).");
            var lines = new List<string>();
            using (var conn = new SqlConnection(connectionString))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = generatorSql;
                cmd.CommandTimeout = 300; // Generator query metadata + build script; 5 phut tranh timeout DB phuc tap
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                        if (!r.IsDBNull(0)) lines.Add(r.GetString(0));
                }
            }
            // Gop dong bi cat (vd "WHERE fk.referenced_obj" + "ect_id IN ..." do truncate)
            for (var i = 0; i < lines.Count - 1; i++)
            {
                var a = lines[i].TrimEnd();
                var b = lines[i + 1].TrimStart();
                if (a.EndsWith("referenced_obj", StringComparison.OrdinalIgnoreCase) && b.StartsWith("ect_id", StringComparison.OrdinalIgnoreCase))
                {
                    lines[i] = lines[i].TrimEnd() + "ect_object_id" + (b.Length > 6 ? b.Substring(6) : "");
                    lines.RemoveAt(i + 1);
                    i--;
                }
            }
            var template = string.Join("\r\n", lines);
            if (string.IsNullOrWhiteSpace(template) || template.IndexOf(DeleteEmployeePlaceholder, StringComparison.Ordinal) < 0)
                return Tuple.Create(false, (string)null, "Database không có bảng Staffing_Employees hoặc generator không trả về script hợp lệ.");
            return Tuple.Create(true, template, (string)null);
        }

        /// <summary>Lấy template script delete employee: chạy generator trên DB dự án → kết quả khác nhau theo từng dự án.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetDeleteEmployeeScriptTemplate(string k)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", script = (string)null };
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database.", script = (string)null };
                var run = RunDeleteEmployeeGeneratorOnConnection(info.ConnectionString);
                if (!run.Item1)
                    return new { success = false, message = run.Item3 ?? "Lỗi chạy generator.", script = (string)null };
                return new { success = true, script = run.Item2, message = (string)null };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, script = (string)null };
            }
        }

        /// <summary>Generate script delete: chạy generator trên DB dự án lấy template, thay placeholder bằng danh sách LocalEmployeeID user truyền vào.</summary>
        private static Tuple<bool, string, string> GenerateDeleteEmployeeScriptCore(string k, string localIdsCommaSeparated)
        {
            var info = GetConnectionFromToken(k);
            if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                return Tuple.Create(false, (string)null, "Chưa kết nối database.");
            var raw = (localIdsCommaSeparated ?? "").Trim();
            if (string.IsNullOrEmpty(raw))
                return Tuple.Create(false, (string)null, "Nhập ít nhất một mã Local Employee (cách nhau bằng dấu phẩy).");
            var ids = raw.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim().Replace("'", "''"))
                .Where(x => x.Length > 0)
                .ToList();
            if (ids.Count == 0)
                return Tuple.Create(false, (string)null, "Nhập ít nhất một mã Local Employee.");
            var run = RunDeleteEmployeeGeneratorOnConnection(info.ConnectionString);
            if (!run.Item1)
                return Tuple.Create(false, (string)null, run.Item3 ?? "Lỗi chạy generator.");
            var template = run.Item2;
            var replacement = string.Join("', '", ids);
            var script = template.Replace(DeleteEmployeePlaceholder, replacement);
            return Tuple.Create(true, script, "Đã generate script cho " + ids.Count + " mã nhân viên.");
        }

        /// <summary>Generate script thay placeholder bằng danh sách LocalEmployeeID (cách nhau dấu phẩy).</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GenerateDeleteEmployeeScript(string k, string localIdsCommaSeparated)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", script = (string)null };
                var result = GenerateDeleteEmployeeScriptCore(k, localIdsCommaSeparated);
                if (!result.Item1)
                    return new { success = false, message = result.Item3, script = (string)null };
                return new { success = true, script = result.Item2, message = result.Item3 };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, script = (string)null };
            }
        }

        /// <summary>Generate script và chạy luôn trên DB dự án. Audit log + trả về kết quả.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GenerateAndExecuteDeleteEmployeeScript(string k, string localIdsCommaSeparated)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập." };
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                Tuple<bool, string, string> genResult = GenerateDeleteEmployeeScriptCore(k, localIdsCommaSeparated);
                if (!genResult.Item1)
                    return new { success = false, message = genResult.Item3 ?? "Lỗi generate script." };
                var script = genResult.Item2;
                if (string.IsNullOrWhiteSpace(script))
                    return new { success = false, message = "Script rỗng." };
                var databaseName = info.Database ?? "";
                var ids = (localIdsCommaSeparated ?? "").Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => x.Trim()).Where(x => x.Length > 0).ToList();
                UserActionLogHelper.Log("HRHelper.DeleteEmployeeScript", "database=" + databaseName + ", localIds=" + string.Join(",", ids) + " (Generate and Run)");
                var result = ExecuteDeleteEmployeeScriptCore(info.ConnectionString, script);
                return new { success = result.Item1, message = result.Item2 };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private static Tuple<bool, string> ExecuteDeleteEmployeeScriptCore(string connectionString, string script)
        {
            try
            {
                using (var conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = script;
                        cmd.CommandTimeout = 600;
                        cmd.ExecuteNonQuery();
                    }
                }
                return Tuple.Create(true, "Đã chạy script xóa employee thành công.");
            }
            catch (Exception ex)
            {
                return Tuple.Create(false, "Lỗi khi chạy script: " + ex.Message);
            }
        }

        /// <summary>Xóa employee (single/multiple): confirm captcha, đưa vào job nền, audit, push chuông. payloadJson = JSON array of { localId, name } để hiển thị trong chi tiết thông báo / Function Queue / Audit log.</summary>
        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object StartHRHelperDeleteEmployeeJob(string k, List<string> localEmployeeIds, string payloadJson, int captchaA, int captchaB)
        {
            try
            {
                if (UiAuthHelper.IsAnonymous)
                    return new { success = false, message = "Cần đăng nhập.", jobId = 0 };
                if (captchaA + captchaB < 2 || captchaA + captchaB > 18)
                    return new { success = false, message = "Captcha không đúng. Vui lòng nhập lại.", jobId = 0 };
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database.", jobId = 0 };
                var ids = (localEmployeeIds ?? new List<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();
                if (ids.Count == 0)
                    return new { success = false, message = "Chọn ít nhất 1 employee (Local ID) để xóa.", jobId = 0 };
                var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
                var userName = (string)HttpContext.Current?.Session?["UiUserName"] ?? "";
                var connStr = info.ConnectionString;
                var serverName = info.Server ?? "";
                var databaseName = info.Database ?? "";
                var payload = (payloadJson ?? "").Trim();
                if (string.IsNullOrEmpty(payload)) payload = JsonConvert.SerializeObject(ids.Select(localId => new { localId = localId, name = (string)null }).ToList());
                int jobId;
                using (var appConn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = appConn.CreateCommand())
                {
                    cmd.CommandText = @"INSERT INTO BaJob (JobType, ServerName, DatabaseName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Payload)
VALUES (N'HRHelperDeleteEmployee', @sname, @db, @uid, @uname, SYSDATETIME(), N'Running', 0, @payload); SELECT CAST(SCOPE_IDENTITY() AS INT);";
                    cmd.Parameters.AddWithValue("@sname", serverName);
                    cmd.Parameters.AddWithValue("@db", databaseName);
                    cmd.Parameters.AddWithValue("@uid", userId);
                    cmd.Parameters.AddWithValue("@uname", userName);
                    cmd.Parameters.AddWithValue("@payload", string.IsNullOrEmpty(payload) ? (object)DBNull.Value : payload);
                    appConn.Open();
                    jobId = (int)cmd.ExecuteScalar();
                }
                BaJobQueue.Track(jobId);
                UserActionLogHelper.Log("HRHelper.DeleteEmployee","database=" + databaseName + ", localIds=" + string.Join(",", ids) + ", jobId=" + jobId);
                var genResult = GenerateDeleteEmployeeScriptCore(k, string.Join(",", ids));
                var scriptToRun = genResult.Item1 ? genResult.Item2 : null;
                var scriptError = genResult.Item3;
                System.Threading.Tasks.Task.Run(() =>
                {
                    try
                    {
                        if (string.IsNullOrWhiteSpace(scriptToRun))
                        {
                            UpdateBaJobCompleted(jobId, "HRHelperDeleteEmployee", false, scriptError ?? "Lỗi generate script.");
                        }
                        else
                        {
                            UpdateBaJobProgress(jobId, "HRHelperDeleteEmployee", 1, "Đang xử lý...");
                            var result = ExecuteDeleteEmployeeScriptCore(connStr, scriptToRun);
                            UpdateBaJobCompleted(jobId, "HRHelperDeleteEmployee", result.Item1, result.Item2);
                        }
                    }
                    catch (Exception ex)
                    {
                        UpdateBaJobCompleted(jobId, "HRHelperDeleteEmployee", false, ex.Message);
                    }
                    BaJobHubHelper.PushJobsUpdated("HRHelperDeleteEmployee", null, userId);
                });
                return new { success = true, jobId = jobId, message = "Đã đưa xóa employee vào hàng đợi. Job chạy nền." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message, jobId = 0 };
            }
        }
    }
}
