using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Services;
using System.Web.Script.Serialization;
using System.Web.Script.Services;
using BADesign;
using BADesign.Helpers.Security;
using BADesign.Helpers.Utils;
using System.Web.Services.Description;

namespace BADesign.Pages
{
    public partial class EncryptDecrypt : System.Web.UI.Page
    {
        public string TokenK { get; private set; } = "";
        public string ConnectedServer { get; private set; } = "";
        public string ConnectedDatabase { get; private set; } = "";

        protected void Page_Load(object sender, EventArgs e)
        {
            if (!UiAuthHelper.HasFeature("EncryptDecrypt"))
            {
                Response.Redirect(ResolveUrl(UiAuthHelper.GetHomeUrlByRole()));
                return;
            }
            var k = Request.QueryString["k"];
            if (!string.IsNullOrWhiteSpace(k))
            {
                TokenK = k;
                var info = GetConnectionFromToken(k);
                if (info != null)
                {
                    ConnectedServer = info.Server ?? "";
                    ConnectedDatabase = info.Database ?? "";
                }
            }
        }

        private static DatabaseSearch.HRConnInfo GetConnectionFromToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;
            var id = DataSecurityWrapper.DecryptConnectId(token);
            if (string.IsNullOrEmpty(id)) return null;
            return HttpContext.Current?.Session?["HRConn_" + id] as DatabaseSearch.HRConnInfo;
        }

        // ---- Phase 1: Encrypt / Decrypt ----

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object EncryptValue(string plainText, string keyType, object keyValue)
        {
            try
            {
                if (plainText == null)
                    return new { success = false, message = "Chưa nhập giá trị cần mã hóa." };
                var key = (keyType ?? "").Trim().ToLowerInvariant();
                object saltOrKey = null;
                if (key == "employeeid")
                {
                    var kvStr = keyValue as string;
                    if (keyValue == null || (kvStr != null && string.IsNullOrWhiteSpace(kvStr)))
                        return new { success = false, message = "Nhập Employee ID khi chọn Key theo Employee ID." };
                    long eid;
                    if (keyValue is long)
                        eid = (long)keyValue;
                    else if (!long.TryParse(keyValue.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out eid))
                        return new { success = false, message = "Employee ID phải là số." };
                    saltOrKey = keyValue.ToString().Trim();
                }
                else if (key == "string")
                {
                    var kvStr = keyValue as string;
                    if (keyValue == null || (kvStr != null && string.IsNullOrWhiteSpace(kvStr)))
                        return new { success = false, message = "Nhập chuỗi key khi chọn Key theo String." };
                    saltOrKey = keyValue.ToString().Trim();
                }

                var pt = plainText.Trim();
                if (pt == "")
                    return new { success = false, message = "Chưa nhập giá trị cần mã hóa." };

                object cadenaSalt = key == "employeeid" && saltOrKey != null ? ParseLongOrNull(saltOrKey.ToString()) : saltOrKey;
                decimal n;
                string encrypted;
                if (pt == "0" || (decimal.TryParse(pt, NumberStyles.Number, CultureInfo.InvariantCulture, out n) && n == 0))
                    encrypted = DataSecurityWrapper.ENCRYPTED_ZERO;
                else
                    encrypted = DataSecurityWrapper.EncryptData(pt, cadenaSalt);
                return new { success = true, encrypted = encrypted };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private static long? ParseLongOrNull(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            long v;
            return long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out v) ? v : (long?)null;
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DecryptValue(string encryptedText, string keyType, object keyValue)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(encryptedText))
                    return new { success = false, message = "Chưa nhập chuỗi đã mã hóa." };
                var b64 = NormalizeBase64(encryptedText);
                if (string.IsNullOrEmpty(b64))
                    return new { success = false, message = "Chuỗi mã hóa không hợp lệ (base64)." };
                var key = (keyType ?? "").Trim().ToLowerInvariant();
                string decrypted;
                if (key == "employeeid")
                {
                    var kvStr = keyValue != null ? keyValue.ToString().Trim() : "";
                    if (string.IsNullOrEmpty(kvStr))
                        return new { success = false, message = "Nhập Employee ID khi chọn Key theo Employee ID." };
                    long eid;
                    if (!long.TryParse(kvStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out eid))
                        return new { success = false, message = "Employee ID phải là số." };
                    decrypted = DataSecurityWrapper.DecryptData<string>(b64, kvStr);
                }
                else if (key == "string")
                {
                    var kvStr = keyValue != null ? keyValue.ToString().Trim() : "";
                    if (string.IsNullOrEmpty(kvStr))
                        return new { success = false, message = "Nhập chuỗi key khi chọn Key theo String." };
                    decrypted = DataSecurityWrapper.DecryptData<string>(b64, kvStr);
                }
                else
                {
                    decrypted = DataSecurityWrapper.DecryptData<string>(b64, (long?)null);
                }

                if (decrypted == null)
                    return new { success = false, message = "Giải mã thất bại. Kiểm tra Key (Employee ID hoặc chuỗi) và format base64." };
                return new { success = true, decrypted = decrypted, message = "Giải mã thành công" };
            }
            catch (Exception ex)
            {
                return new { success = false, message = "Lỗi: " + ex.Message };
            }
        }

        private static string NormalizeBase64(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var t = s.Trim().Replace(" ", "").Replace("\r", "").Replace("\n", "");
            return t;
        }

        // ---- Phase 2: Demo Reset Script ----

        private const string EmployeesScriptQueryBase = @"
SELECT E.ID AS EmployeeID, E.LocalEmployeeID AS EmployeeLocalID, T.CompanyID, C.NameEN AS CompanyName
FROM Staffing_Transactions AS T
INNER JOIN Staffing_Employees AS E ON E.ID = T.EmployeeID
INNER JOIN MultiTenant_Companies AS C ON C.ID = T.CompanyID
WHERE T.IsActiveTransaction = 1";

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GetEmployeesForScript(string k, int? companyID)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database. Connect từ Database Search rồi vào HR Helper, sau đó mở Generate Demo Reset Script." };
                var seen = new HashSet<long>();
                var list = new List<object>();
                using (var conn = new SqlConnection(info.ConnectionString))
                using (var cmd = conn.CreateCommand())
                {
                    var sql = EmployeesScriptQueryBase;
                    if (companyID.HasValue && companyID.Value > 0)
                    {
                        sql += " AND T.CompanyID = @companyID";
                        cmd.Parameters.AddWithValue("@companyID", companyID.Value);
                    }
                    cmd.CommandText = sql + " ORDER BY E.ID, T.ID";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var eid = r.GetInt64(0);
                            if (seen.Contains(eid)) continue;
                            seen.Add(eid);
                            list.Add(new
                            {
                                employeeID = eid,
                                localEmployeeID = (r.IsDBNull(1) ? "" : r.GetString(1)) ?? "",
                                companyID = r.GetInt32(2),
                                companyName = (r.IsDBNull(3) ? "" : r.GetString(3)) ?? ""
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

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GenerateDemoResetScript(string k, int? companyID, List<long> employeeIds, object configObj)
        {
            try
            {
                var info = GetConnectionFromToken(k);
                if (info == null || string.IsNullOrEmpty(info.ConnectionString))
                    return new { success = false, message = "Chưa kết nối database." };
                var config = ParseConfig(configObj);
                if (config == null)
                    return new { success = false, message = "Cấu hình không hợp lệ." };
                if (!AnyFieldEnabled(config))
                    return new { success = false, message = "Chọn ít nhất một field để reset (Personal Email, Business Email, Mobile 1/2, Payslip, Basic Salary)." };

                var employees = LoadEmployeesForScript(info.ConnectionString, companyID, employeeIds);
                if (employees == null || employees.Count == 0)
                    return new { success = false, message = "Không có employee nào thỏa điều kiện." };

                var script = BuildDemoResetSql(employees, config);
                var fileName = "DemoReset_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".sql";
                return new { success = true, script = script, fileName = fileName };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GenerateDemoResetScriptFromCsv(string csvText, object configObj)
        {
            try
            {
                var config = ParseConfig(configObj);
                if (config == null)
                    return new { success = false, message = "Cấu hình không hợp lệ." };
                if (!AnyFieldEnabled(config))
                    return new { success = false, message = "Chọn ít nhất một field để reset (Personal Email, Business Email, Mobile 1/2, Payslip, Basic Salary)." };
                var needLocalId = config.Payslip && config.ResetPayslipToLocalID;
                var rows = ParseCsvForScript(csvText, needLocalId);
                if (rows == null || rows.Count == 0)
                    return new { success = false, message = "CSV trống hoặc không hợp lệ. Cần header EmployeeID, LocalEmployeeID (nếu reset payslip theo Local ID)." };

                var script = BuildDemoResetSql(rows, config);
                var fileName = "DemoReset_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".sql";
                return new { success = true, script = script, fileName = fileName };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private sealed class DemoResetConfig
        {
            public string DemoPhone { get; set; }
            public string DemoEmail { get; set; }
            public decimal MaskSalary { get; set; }
            public bool ResetPayslipToLocalID { get; set; }
            public string PayslipCustom { get; set; }
            public bool PersonalEmail { get; set; }
            public bool BusinessEmail { get; set; }
            public bool Mobile1 { get; set; }
            public bool Mobile2 { get; set; }
            public bool Payslip { get; set; }
            public bool BasicSalary { get; set; }
        }

        private static DemoResetConfig ParseConfig(object o)
        {
            if (o == null) return null;
            var d = o as System.Collections.Generic.IDictionary<string, object>;
            if (d == null)
            {
                var js = new JavaScriptSerializer();
                try { d = js.Deserialize<Dictionary<string, object>>(js.Serialize(o)); } catch { return null; }
            }
            if (d == null) return null;
            var fc = d.ContainsKey("fieldsToReset") ? d["fieldsToReset"] as System.Collections.Generic.IDictionary<string, object> : null;
            return new DemoResetConfig
            {
                DemoPhone = GetStr(d, "demoPhone"),
                DemoEmail = GetStr(d, "demoEmail"),
                MaskSalary = GetDecimal(d, "maskSalary"),
                ResetPayslipToLocalID = d.ContainsKey("resetPayslipToLocalID") && Convert.ToBoolean(d["resetPayslipToLocalID"]),
                PayslipCustom = GetStr(d, "payslipCustom"),
                PersonalEmail = GetBoolFromFields(fc, "personalEmail"),
                BusinessEmail = GetBoolFromFields(fc, "businessEmail"),
                Mobile1 = GetBoolFromFields(fc, "mobile1"),
                Mobile2 = GetBoolFromFields(fc, "mobile2"),
                Payslip = GetBoolFromFields(fc, "payslip"),
                BasicSalary = GetBoolFromFields(fc, "basicSalary")
            };
        }

        private static bool AnyFieldEnabled(DemoResetConfig cfg)
        {
            return cfg != null && (cfg.PersonalEmail || cfg.BusinessEmail || cfg.Mobile1 || cfg.Mobile2 || cfg.Payslip || cfg.BasicSalary);
        }

        private static bool GetBoolFromFields(System.Collections.Generic.IDictionary<string, object> fc, string key)
        {
            return fc != null && fc.ContainsKey(key) && fc[key] != null && Convert.ToBoolean(fc[key]);
        }

        private static string GetStr(System.Collections.Generic.IDictionary<string, object> d, string key)
        {
            if (!d.ContainsKey(key) || d[key] == null) return "";
            return (d[key] as string) ?? d[key].ToString() ?? "";
        }

        private static decimal GetDecimal(System.Collections.Generic.IDictionary<string, object> d, string key)
        {
            if (!d.ContainsKey(key) || d[key] == null) return 0;
            var val = d[key];
            if (val is decimal) return (decimal)val;
            decimal v;
            if (decimal.TryParse(val.ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out v)) return v;
            return 0;
        }

        private static List<EmployeeForScript> LoadEmployeesForScript(string connStr, int? companyID, List<long> employeeIds)
        {
            var seen = new HashSet<long>();
            var list = new List<EmployeeForScript>();
            using (var conn = new SqlConnection(connStr))
            using (var cmd = conn.CreateCommand())
            {
                var sql = EmployeesScriptQueryBase;
                if (companyID.HasValue && companyID.Value > 0)
                {
                    sql += " AND T.CompanyID = @companyID";
                    cmd.Parameters.AddWithValue("@companyID", companyID.Value);
                }
                if (employeeIds != null && employeeIds.Count > 0)
                {
                    var ids = string.Join(",", employeeIds.Select(x => x.ToString()));
                    sql += " AND E.ID IN (" + ids + ")";
                }
                cmd.CommandText = sql + " ORDER BY E.ID, T.ID";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var eid = r.GetInt64(0);
                        if (seen.Contains(eid)) continue;
                        seen.Add(eid);
                        list.Add(new EmployeeForScript
                        {
                            EmployeeID = eid,
                            LocalEmployeeID = (r.IsDBNull(1) ? "" : r.GetString(1)) ?? ""
                        });
                    }
                }
            }
            return list;
        }

        private sealed class EmployeeForScript
        {
            public long EmployeeID { get; set; }
            public string LocalEmployeeID { get; set; }
        }

        private static List<EmployeeForScript> ParseCsvForScript(string csvText, bool needLocalId)
        {
            if (string.IsNullOrWhiteSpace(csvText)) return null;
            var lines = csvText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2) return null;
            var header = lines[0].Split(',').Select(x => x.Trim().ToLowerInvariant()).ToArray();
            var colId = Array.IndexOf(header, "employeeid");
            var colLocal = Array.IndexOf(header, "localemployeeid");
            if (colId < 0) return null;
            if (needLocalId && colLocal < 0) return null;
            var list = new List<EmployeeForScript>();
            var seen = new HashSet<long>();
            for (var i = 1; i < lines.Length; i++)
            {
                var parts = lines[i].Split(',');
                if (parts.Length <= colId) continue;
                long eidCsv;
                if (!long.TryParse(parts[colId].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out eidCsv) || eidCsv <= 0) continue;
                if (seen.Contains(eidCsv)) continue;
                seen.Add(eidCsv);
                var local = (colLocal >= 0 && parts.Length > colLocal) ? parts[colLocal].Trim() : "";
                list.Add(new EmployeeForScript { EmployeeID = eidCsv, LocalEmployeeID = local });
            }
            return list;
        }

        private static string BuildDemoResetSql(List<EmployeeForScript> employees, DemoResetConfig cfg)
        {
            var sb = new StringBuilder();
            sb.AppendLine("-- Demo Reset Script. Chạy tại DB khách hàng. Backup DB trước khi chạy.");
            sb.AppendLine("SET NOCOUNT ON; SET XACT_ABORT ON; SET LOCK_TIMEOUT 5000;");
            sb.AppendLine("IF OBJECT_ID('tempdb..#EmployeeTemp') IS NOT NULL DROP TABLE #EmployeeTemp;");
            sb.AppendLine("CREATE TABLE #EmployeeTemp(");
            sb.AppendLine("    RowId INT IDENTITY(1,1) PRIMARY KEY,");
            sb.AppendLine("    EmployeeID BIGINT NOT NULL,");
            sb.AppendLine("    PersonalEmailAddress NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,");
            sb.AppendLine("    BusinessEmailAddress NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL,");
            sb.AppendLine("    PayslipPassword NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,");
            sb.AppendLine("    MobilePhone1 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,");
            sb.AppendLine("    MobilePhone2 NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL,");
            sb.AppendLine("    BasicSalary NVARCHAR(250) COLLATE DATABASE_DEFAULT NULL");
            sb.AppendLine(");");

            var batchSize = 150;
            for (var i = 0; i < employees.Count; i += batchSize)
            {
                var batch = employees.Skip(i).Take(batchSize).ToList();
                var cols = "EmployeeID, PersonalEmailAddress, BusinessEmailAddress, PayslipPassword, MobilePhone1, MobilePhone2, BasicSalary";
                sb.Append("INSERT INTO #EmployeeTemp (").Append(cols).Append(") VALUES ");
                var vals = new List<string>();
                foreach (var e in batch)
                {
                    var pe = cfg.PersonalEmail && !string.IsNullOrWhiteSpace(cfg.DemoEmail) ? DataSecurityWrapper.EncryptData(cfg.DemoEmail, e.EmployeeID) : null;
                    var be = cfg.BusinessEmail && !string.IsNullOrWhiteSpace(cfg.DemoEmail) ? DataSecurityWrapper.EncryptData(cfg.DemoEmail, e.EmployeeID) : null;
                    var pp = cfg.Payslip ? (cfg.ResetPayslipToLocalID ? DataSecurityWrapper.EncryptData(e.LocalEmployeeID ?? "", e.EmployeeID) : (!string.IsNullOrWhiteSpace(cfg.PayslipCustom) ? DataSecurityWrapper.EncryptData(cfg.PayslipCustom, e.EmployeeID) : null)) : null;
                    var m1 = cfg.Mobile1 && !string.IsNullOrWhiteSpace(cfg.DemoPhone) ? DataSecurityWrapper.EncryptData(cfg.DemoPhone, e.EmployeeID) : null;
                    var m2 = cfg.Mobile2 && !string.IsNullOrWhiteSpace(cfg.DemoPhone) ? DataSecurityWrapper.EncryptData(cfg.DemoPhone, e.EmployeeID) : null;
                    var sal = cfg.BasicSalary ? DataSecurityWrapper.EncryptData(cfg.MaskSalary, e.EmployeeID) : null;
                    vals.Add("(" + e.EmployeeID + "," + SqlStr(pe) + "," + SqlStr(be) + "," + SqlStr(pp) + "," + SqlStr(m1) + "," + SqlStr(m2) + "," + SqlStr(sal) + ")");
                }
                sb.AppendLine(string.Join(",", vals) + ";");
            }

            sb.AppendLine("DECLARE @maxRowId INT; SELECT @maxRowId = ISNULL(MAX(RowId),0) FROM #EmployeeTemp;");
            sb.AppendLine("IF @maxRowId = 0 GOTO Done;");
            sb.AppendLine("DECLARE @batchSize INT = 2000, @b INT = 0, @totalBatches INT, @Start INT, @End INT;");
            sb.AppendLine("SET @totalBatches = (@maxRowId + @batchSize - 1) / @batchSize;");
            sb.AppendLine("WHILE @b < @totalBatches");
            sb.AppendLine("BEGIN");
            sb.AppendLine("    SET @Start = @b * @batchSize + 1;");
            sb.AppendLine("    SET @End = CASE WHEN (@b + 1) * @batchSize > @maxRowId THEN @maxRowId ELSE (@b + 1) * @batchSize END;");
            sb.AppendLine("    IF OBJECT_ID('tempdb..#B') IS NOT NULL DROP TABLE #B;");
            sb.AppendLine("    SELECT RowId, EmployeeID, PersonalEmailAddress, BusinessEmailAddress, PayslipPassword, MobilePhone1, MobilePhone2, BasicSalary");
            sb.AppendLine("    INTO #B FROM #EmployeeTemp WHERE RowId BETWEEN @Start AND @End;");
            sb.AppendLine("    CREATE NONCLUSTERED INDEX IX_B_EmployeeID ON #B(EmployeeID);");
            sb.AppendLine("    UPDATE E SET E.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,E.PersonalEmailAddress),");
            sb.AppendLine("        E.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,E.BusinessEmailAddress),");
            sb.AppendLine("        E.PayslipPassword=COALESCE(B.PayslipPassword,E.PayslipPassword),");
            sb.AppendLine("        E.MobilePhone1=COALESCE(B.MobilePhone1,E.MobilePhone1),");
            sb.AppendLine("        E.MobilePhone2=COALESCE(B.MobilePhone2,E.MobilePhone2)");
            sb.AppendLine("    FROM #B B");
            sb.AppendLine("    JOIN dbo.Staffing_Employees E WITH (ROWLOCK, UPDLOCK) ON E.ID = B.EmployeeID");
            sb.AppendLine("    WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL) OR (B.PayslipPassword IS NOT NULL) OR (B.MobilePhone1 IS NOT NULL) OR (B.MobilePhone2 IS NOT NULL);");
            sb.AppendLine("    IF OBJECT_ID('dbo.Staffing_EmployeeInformations','U') IS NOT NULL");
            sb.AppendLine("    UPDATE EI SET EI.PersonalEmailAddress=COALESCE(B.PersonalEmailAddress,EI.PersonalEmailAddress),");
            sb.AppendLine("        EI.BusinessEmailAddress=COALESCE(B.BusinessEmailAddress,EI.BusinessEmailAddress)");
            sb.AppendLine("    FROM #B B");
            sb.AppendLine("    JOIN dbo.Staffing_EmployeeInformations EI WITH (ROWLOCK, UPDLOCK) ON EI.EmployeeID = B.EmployeeID");
            sb.AppendLine("    WHERE (B.PersonalEmailAddress IS NOT NULL) OR (B.BusinessEmailAddress IS NOT NULL);");
            sb.AppendLine("    IF EXISTS(SELECT 1 FROM #B WHERE BasicSalary IS NOT NULL)");
            sb.AppendLine("    BEGIN");
            sb.AppendLine("        IF OBJECT_ID('dbo.PAY_EmployeeSalaries','U') IS NOT NULL");
            sb.AppendLine("        UPDATE ES SET ES.[Value]=NULL FROM #B B JOIN dbo.PAY_EmployeeSalaries ES WITH (ROWLOCK, UPDLOCK) ON ES.EmployeeID=B.EmployeeID WHERE B.BasicSalary IS NOT NULL;");
            sb.AppendLine("        IF OBJECT_ID('dbo.PAY_EmployeeSalaryDetails','U') IS NOT NULL");
            sb.AppendLine("        UPDATE ESD SET ESD.[Value]=NULL FROM #B B JOIN dbo.PAY_EmployeeSalaries ES WITH (READCOMMITTED) ON ES.EmployeeID=B.EmployeeID JOIN dbo.PAY_EmployeeSalaryDetails ESD WITH (ROWLOCK, UPDLOCK) ON ESD.EmployeeSalaryID=ES.ID WHERE B.BasicSalary IS NOT NULL;");
            sb.AppendLine("        UPDATE T SET T.BasicSalary=B.BasicSalary");
            sb.AppendLine("        FROM #B B");
            sb.AppendLine("        JOIN dbo.Staffing_Transactions T WITH (ROWLOCK, UPDLOCK) ON T.EmployeeID=B.EmployeeID AND T.IsActiveTransaction=1");
            sb.AppendLine("        WHERE B.BasicSalary IS NOT NULL;");
            sb.AppendLine("    END");
            sb.AppendLine("    DROP TABLE #B;");
            sb.AppendLine("    SET @b = @b + 1;");
            sb.AppendLine("END");
            sb.AppendLine("Done:");
            sb.AppendLine("IF OBJECT_ID('tempdb..#EmployeeTemp') IS NOT NULL DROP TABLE #EmployeeTemp;");
            return sb.ToString();
        }

        private static string SqlStr(string s)
        {
            if (s == null) return "NULL";
            return "N'" + (s ?? "").Replace("'", "''") + "'";
        }

        // ---- Phase 2a: Decrypt Grid ----

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object DecryptGrid(string csvText, string keyColumnName, List<string> decryptColumnNames)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(csvText))
                    return new { success = false, message = "Chưa dán dữ liệu." };
                if (decryptColumnNames == null || decryptColumnNames.Count == 0)
                    return new { success = false, message = "Chọn ít nhất một cột cần giải mã." };

                var parsed = ParseCsvToRows(csvText);
                if (parsed == null || parsed.Headers == null || parsed.Rows == null || parsed.Rows.Count == 0)
                    return new { success = false, message = "CSV không hợp lệ. Cần header và ít nhất một dòng dữ liệu." };

                var headers = parsed.Headers;
                var keyIdx = string.IsNullOrWhiteSpace(keyColumnName) ? -1 : IndexOfColumn(headers, keyColumnName);
                if (keyIdx < 0 && !string.IsNullOrWhiteSpace(keyColumnName))
                    return new { success = false, message = "Không tìm thấy cột Key: " + keyColumnName };

                var decryptIndices = new List<int>();
                foreach (var cn in decryptColumnNames)
                {
                    var idx = IndexOfColumn(headers, cn);
                    if (idx >= 0 && idx != keyIdx) decryptIndices.Add(idx);
                }
                if (decryptIndices.Count == 0)
                    return new { success = false, message = "Không có cột nào cần giải mã hoặc tên cột không đúng." };

                const int maxRows = 2000;
                if (parsed.Rows.Count > maxRows)
                    return new { success = false, message = "Tối đa " + maxRows + " dòng. Hiện có " + parsed.Rows.Count + "." };

                var outRows = new List<List<string>>();
                for (var i = 0; i < parsed.Rows.Count; i++)
                {
                    var row = parsed.Rows[i];
                    var outRow = new List<string>(row);
                    var keyVal = (keyIdx >= 0 && keyIdx < row.Length && row[keyIdx] != null) ? row[keyIdx].Trim() : "";

                    foreach (var colIdx in decryptIndices)
                    {
                        if (colIdx >= row.Length) continue;
                        var enc = row[colIdx] == null ? "" : NormalizeBase64(row[colIdx].Trim());
                        if (string.IsNullOrEmpty(enc))
                        {
                            outRow[colIdx] = "";
                            continue;
                        }
                        try
                        {
                            // Thử giải mã với key (kể cả key rỗng - một số data dùng key trống hoặc key mặc định)
                            var dec = DataSecurityWrapper.DecryptData<string>(enc, keyVal ?? "");
                            outRow[colIdx] = dec ?? "[?]";
                        }
                        catch
                        {
                            outRow[colIdx] = string.IsNullOrEmpty(keyVal) ? "[key trống]" : "[?]";
                        }
                    }
                    outRows.Add(outRow);
                }

                // Thêm cột " (gốc)" cạnh mỗi cột đã giải mã để đối chiếu dữ liệu gốc với kết quả
                var newHeaders = new List<string>();
                for (var c = 0; c < headers.Length; c++)
                {
                    if (decryptIndices.Contains(c))
                    {
                        newHeaders.Add(headers[c] + " (gốc)");
                        newHeaders.Add(headers[c]);
                    }
                    else
                    {
                        newHeaders.Add(headers[c]);
                    }
                }
                var newRows = new List<List<string>>();
                for (var i = 0; i < outRows.Count; i++)
                {
                    var row = parsed.Rows[i];
                    var outRow = outRows[i];
                    var newRow = new List<string>();
                    for (var c = 0; c < row.Length; c++)
                    {
                        if (decryptIndices.Contains(c))
                        {
                            newRow.Add(row[c] ?? "");
                            newRow.Add(outRow[c] ?? "");
                        }
                        else
                        {
                            newRow.Add(outRow[c] ?? "");
                        }
                    }
                    newRows.Add(newRow);
                }

                return new { success = true, headers = newHeaders, rows = newRows };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        // ---- Phase 2b: Encrypt + Script ----

        [WebMethod(EnableSession = true)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object GenerateEncryptScript(string csvText, string keyColumnName, List<string> encryptColumnNames, object scriptConfigObj)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(csvText))
                    return new { success = false, message = "Chưa dán dữ liệu." };
                if (string.IsNullOrWhiteSpace(keyColumnName))
                    return new { success = false, message = "Chọn cột Key." };
                if (encryptColumnNames == null || encryptColumnNames.Count == 0)
                    return new { success = false, message = "Chọn ít nhất một cột cần mã hóa." };

                var cfg = ParseEncryptScriptConfig(scriptConfigObj);
                if (cfg == null || string.IsNullOrWhiteSpace(cfg.TableName) || cfg.Mappings == null || cfg.Mappings.Count == 0)
                    return new { success = false, message = "Cấu hình script: nhập bảng đích và ít nhất một mapping (cột nguồn → cột đích)." };

                var parsed = ParseCsvToRows(csvText);
                if (parsed == null || parsed.Rows == null || parsed.Rows.Count == 0)
                    return new { success = false, message = "CSV không hợp lệ." };

                var keyIdx = IndexOfColumn(parsed.Headers, keyColumnName);
                if (keyIdx < 0)
                    return new { success = false, message = "Không tìm thấy cột Key: " + keyColumnName };

                var encColIndices = new Dictionary<string, int>();
                foreach (var cn in encryptColumnNames)
                {
                    var idx = IndexOfColumn(parsed.Headers, cn);
                    if (idx >= 0) encColIndices[cn] = idx;
                }

                var sb = new StringBuilder();
                sb.AppendLine("-- Script mã hóa. Chạy tại DB khách hàng. Backup trước khi chạy.");
                sb.AppendLine("SET NOCOUNT ON; SET XACT_ABORT ON;");

                const int maxRows = 2000;
                var rows = parsed.Rows.Take(maxRows).ToList();
                foreach (var row in rows)
                {
                    if (keyIdx >= row.Length) continue;
                    var keyVal = row[keyIdx] == null ? "" : row[keyIdx].Trim();
                    if (string.IsNullOrEmpty(keyVal)) continue;

                    var setParts = new List<string>();
                    foreach (var m in cfg.Mappings)
                    {
                        int srcIdx;
                        if (!encColIndices.TryGetValue(m.InputColumn, out srcIdx)) continue;
                        if (srcIdx >= row.Length) continue;
                        var plain = row[srcIdx] == null ? "" : row[srcIdx].Trim();
                        var enc = DataSecurityWrapper.EncryptData(plain, keyVal);
                        setParts.Add("[" + m.DbColumn + "] = N'" + (enc ?? "").Replace("'", "''") + "'");
                    }
                    if (setParts.Count == 0) continue;

                    var whereVal = keyVal.Replace("'", "''");
                    sb.Append("UPDATE ").Append(cfg.TableName).Append(" SET ");
                    sb.Append(string.Join(", ", setParts));
                    sb.Append(" WHERE ").Append(cfg.WhereColumn).Append(" = '").Append(whereVal).Append("';");
                    sb.AppendLine();
                }

                var fileName = "EncryptScript_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".sql";
                return new { success = true, script = sb.ToString(), fileName = fileName };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        private sealed class EncryptScriptConfig
        {
            public string TableName { get; set; }
            public string WhereColumn { get; set; }
            public List<ColumnMapping> Mappings { get; set; }
        }

        private sealed class ColumnMapping
        {
            public string InputColumn { get; set; }
            public string DbColumn { get; set; }
        }

        private static EncryptScriptConfig ParseEncryptScriptConfig(object o)
        {
            if (o == null) return null;
            var d = o as System.Collections.Generic.IDictionary<string, object>;
            if (d == null)
            {
                var js = new JavaScriptSerializer();
                try { d = js.Deserialize<Dictionary<string, object>>(js.Serialize(o)); } catch { return null; }
            }
            if (d == null) return null;
            var tableName = GetStr(d, "tableName");
            var whereColumn = GetStr(d, "whereColumn");
            if (string.IsNullOrWhiteSpace(whereColumn)) whereColumn = "ID";

            var maps = new List<ColumnMapping>();
            var mapsArr = d.ContainsKey("mappings") ? d["mappings"] as System.Collections.IEnumerable : null;
            if (mapsArr != null)
            {
                foreach (var m in mapsArr)
                {
                    var md = m as System.Collections.Generic.IDictionary<string, object>;
                    if (md == null) continue;
                    var input = GetStr(md, "inputColumn");
                    var db = GetStr(md, "dbColumn");
                    if (!string.IsNullOrWhiteSpace(input) && !string.IsNullOrWhiteSpace(db))
                        maps.Add(new ColumnMapping { InputColumn = input, DbColumn = db });
                }
            }
            return new EncryptScriptConfig { TableName = tableName, WhereColumn = whereColumn, Mappings = maps };
        }

        private static int IndexOfColumn(string[] headers, string name)
        {
            if (headers == null || string.IsNullOrWhiteSpace(name)) return -1;
            var n = name.Trim().ToLowerInvariant();
            for (var i = 0; i < headers.Length; i++)
                if (headers[i] == n) return i;
            return -1;
        }

        private static CsvParseResult ParseCsvToRows(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2) return null;
            var delimiter = lines[0].IndexOf('\t') >= 0 ? '\t' : ',';
            var headers = SplitCsvLine(lines[0], delimiter);
            if (headers == null || headers.Length == 0) return null;
            var rows = new List<string[]>();
            for (var i = 1; i < lines.Length; i++)
            {
                var parts = SplitCsvLine(lines[i], delimiter);
                if (parts != null && parts.Length > 0) rows.Add(parts);
            }
            return new CsvParseResult { Headers = headers.Select(h => h.Trim().ToLowerInvariant()).ToArray(), Rows = rows };
        }

        private static string[] SplitCsvLine(string line, char delimiter)
        {
            if (string.IsNullOrEmpty(line)) return new string[0];
            var list = new List<string>();
            var i = 0;
            while (i < line.Length)
            {
                if (line[i] == '"')
                {
                    var sb = new StringBuilder();
                    i++;
                    while (i < line.Length)
                    {
                        if (line[i] == '"')
                        {
                            i++;
                            if (i < line.Length && line[i] == '"') { sb.Append('"'); i++; }
                            else break;
                        }
                        else { sb.Append(line[i]); i++; }
                    }
                    list.Add(sb.ToString());
                }
                else
                {
                    var start = i;
                    while (i < line.Length && line[i] != delimiter) i++;
                    list.Add(line.Substring(start, i - start));
                    if (i < line.Length) i++;
                }
            }
            return list.ToArray();
        }

        private sealed class CsvParseResult
        {
            public string[] Headers { get; set; }
            public List<string[]> Rows { get; set; }
        }
    }
}
