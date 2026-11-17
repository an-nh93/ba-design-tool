using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using BADesign.Helpers.Security;

namespace BADesign.Helpers.Database
{
    public sealed class DbSanitizer
    {
        private const int CommandTimeoutSeconds = 3600;
        private const int SchemaTimeoutSeconds = 180;
        private const long BatchThresholdRows = 300000;
        private const int BatchRows = 100000;
        private const int BulkChunkRows = 20000;
        private const int DeleteBatchRows = 50000;
        private const int MaxPredicateColumns = 40;
        private const int HashSampleSize = 500;
        private const int LockTimeoutMs = 60000;

        private sealed class StepDefinition
        {
            public string Key;
            public string Label;
            public int Weight;
            public Action<DbSanitizeStepResult, Action<double>> Run;
        }

        private sealed class TableWork
        {
            public string Name;
            public Func<SqlConnection, long> Run;
        }

        private sealed class UserRow
        {
            public long Id;
            public string UserName;
            public long? EmployeeId;
        }

        private readonly string _connectionString;
        private readonly DbSanitizeOptions _options;
        private readonly Action<DbSanitizeProgress> _onProgress;
        private readonly Func<bool> _isCancelled;
        private readonly DbSanitizeReport _report = new DbSanitizeReport();
        private readonly object _progressLock = new object();
        private readonly object _cancelLock = new object();
        private DbSchemaSnapshot _schema;
        private int _totalWeight;
        private int _completedWeight;
        private int _lastPercent = -1;
        private bool _cancelRequested;
        private DateTime _lastCancelCheck = DateTime.MinValue;

        private DbSanitizer(string connectionString, DbSanitizeOptions options, Action<DbSanitizeProgress> onProgress, Func<bool> isCancelled)
        {
            var builder = new SqlConnectionStringBuilder(connectionString);
            if (builder.ConnectTimeout < 30) builder.ConnectTimeout = 30;
            builder.ApplicationName = "BADesign.Sanitize";
            _connectionString = builder.ConnectionString;
            _options = options;
            _onProgress = onProgress;
            _isCancelled = isCancelled;
        }

        public static DbSanitizeReport Run(string connectionString, DbSanitizeOptions options, Action<DbSanitizeProgress> onProgress, Func<bool> isCancelled)
        {
            if (string.IsNullOrWhiteSpace(connectionString)) throw new ArgumentException("connectionString");
            if (options == null) throw new ArgumentNullException("options");
            options.Normalize();
            var error = options.Validate();
            if (error != null)
            {
                var invalid = new DbSanitizeReport { StartedAt = DateTime.Now, FinishedAt = DateTime.Now, Error = error };
                return invalid;
            }
            return new DbSanitizer(connectionString, options, onProgress, isCancelled).Execute();
        }

        private DbSanitizeReport Execute()
        {
            var total = Stopwatch.StartNew();
            _report.StartedAt = DateTime.Now;
            _report.KeepRealSalary = _options.KeepRealSalary;
            var steps = BuildSteps();
            _totalWeight = steps.Sum(s => s.Weight);
            try
            {
                foreach (var definition in steps)
                {
                    ThrowIfCancelled();
                    RunStep(definition);
                    if (definition.Key == "prepare" && _schema == null)
                    {
                        _report.Error = _report.Steps.Last().Detail ?? "Không đọc được cấu trúc database.";
                        break;
                    }
                }
            }
            catch (OperationCanceledException)
            {
                _report.Cancelled = true;
            }
            catch (Exception ex)
            {
                _report.Error = ex.Message;
            }
            total.Stop();
            _report.TotalMs = total.ElapsedMilliseconds;
            _report.FinishedAt = DateTime.Now;
            return _report;
        }

        private List<StepDefinition> BuildSteps()
        {
            var steps = new List<StepDefinition>
            {
                new StepDefinition { Key = "prepare", Label = "Chuẩn bị", Weight = 2, Run = StepPrepare },
                new StepDefinition { Key = "outbound", Label = "Chặn kết nối ra ngoài", Weight = 6, Run = StepOutbound },
                new StepDefinition { Key = "accounts", Label = "Tài khoản đăng nhập", Weight = 8, Run = StepAccounts },
                new StepDefinition { Key = "contact_plain", Label = "Email, điện thoại dạng thường", Weight = 34, Run = StepPlainContact },
                new StepDefinition { Key = "employee", Label = "Email, điện thoại, lương cơ bản của nhân viên (mã hóa)", Weight = 14, Run = StepEmployee }
            };
            if (!_options.KeepRealSalary)
                steps.Add(new StepDefinition { Key = "amounts", Label = "Số liệu lương, thuế, bảo hiểm (mã hóa)", Weight = 28, Run = StepAmounts });
            steps.Add(new StepDefinition { Key = "other", Label = "Dữ liệu mã hóa khác", Weight = 8, Run = StepOther });
            return steps;
        }

        private void RunStep(StepDefinition definition)
        {
            var result = new DbSanitizeStepResult { Key = definition.Key, Label = definition.Label };
            _report.Steps.Add(result);
            var weight = definition.Weight;
            Action<double> progress = fraction => ReportProgress(definition, weight, fraction);
            progress(0);
            var watch = Stopwatch.StartNew();
            try
            {
                definition.Run(result, progress);
                if (result.Status == DbSanitizeStatus.Done && result.Warnings.Count > 0)
                    result.Status = DbSanitizeStatus.Warning;
            }
            catch (OperationCanceledException)
            {
                result.Status = DbSanitizeStatus.Failed;
                result.Detail = "Đã hủy";
                watch.Stop();
                result.Ms = watch.ElapsedMilliseconds;
                throw;
            }
            catch (Exception ex)
            {
                result.Status = DbSanitizeStatus.Failed;
                result.Detail = ex.Message;
            }
            watch.Stop();
            result.Ms = watch.ElapsedMilliseconds;
            lock (_progressLock)
            {
                _completedWeight += weight;
            }
            ReportProgress(definition, 0, 0);
        }

        private void ReportProgress(StepDefinition definition, int weight, double fraction)
        {
            if (_onProgress == null) return;
            if (fraction < 0) fraction = 0;
            if (fraction > 1) fraction = 1;
            lock (_progressLock)
            {
                var percent = _totalWeight <= 0 ? 0 : (int)Math.Floor((_completedWeight + weight * fraction) * 100.0 / _totalWeight);
                if (percent > 99) percent = 99;
                if (percent <= _lastPercent && fraction > 0) return;
                if (percent < _lastPercent) percent = _lastPercent;
                _lastPercent = percent;
                try
                {
                    _onProgress(new DbSanitizeProgress { StepKey = definition.Key, StepLabel = definition.Label, Percent = percent });
                }
                catch
                {
                }
            }
        }

        private bool IsCancelRequested()
        {
            if (_isCancelled == null) return false;
            lock (_cancelLock)
            {
                if (_cancelRequested) return true;
                var now = DateTime.UtcNow;
                if ((now - _lastCancelCheck).TotalMilliseconds < 1500) return false;
                _lastCancelCheck = now;
                try { _cancelRequested = _isCancelled(); }
                catch { _cancelRequested = false; }
                return _cancelRequested;
            }
        }

        private void ThrowIfCancelled()
        {
            if (IsCancelRequested()) throw new OperationCanceledException();
        }

        private SqlConnection Open()
        {
            var conn = new SqlConnection(_connectionString);
            conn.Open();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SET LOCK_TIMEOUT " + LockTimeoutMs.ToString(CultureInfo.InvariantCulture) + ";";
                cmd.ExecuteNonQuery();
            }
            return conn;
        }

        private static SqlCommand Command(SqlConnection conn, string sql)
        {
            var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            cmd.CommandTimeout = CommandTimeoutSeconds;
            return cmd;
        }

        private static int Exec(SqlConnection conn, string sql)
        {
            using (var cmd = Command(conn, sql))
                return cmd.ExecuteNonQuery();
        }

        private long ExecuteUpdate(SqlConnection conn, DbTableInfo table, Func<string, string> buildSql, Action<SqlCommand> addParameters)
        {
            var useRange = table.KeyColumn != null && table.Rows >= BatchThresholdRows;
            if (!useRange)
            {
                using (var cmd = Command(conn, buildSql(null)))
                {
                    if (addParameters != null) addParameters(cmd);
                    return Math.Max(0, cmd.ExecuteNonQuery());
                }
            }
            var sql = buildSql(table.KeyColumn);
            var firstSql = sql.Replace(DbSanitizeSql.RangeClause(table.KeyColumn), DbSanitizeSql.UpperRangeClause(table.KeyColumn));
            if (string.Equals(firstSql, sql, StringComparison.Ordinal))
                throw new InvalidOperationException("Batch update for " + table.Name + " has no key range.");
            var firstKeySql = DbSanitizeSql.BuildFirstKeyQuery(table.QuotedName, table.KeyColumn);
            var nextKeySql = DbSanitizeSql.BuildNextKeyQuery(table.QuotedName, table.KeyColumn);
            long total = 0;
            object from = null;
            while (true)
            {
                ThrowIfCancelled();
                object to;
                using (var cmd = Command(conn, from == null ? firstKeySql : nextKeySql))
                {
                    if (from != null) cmd.Parameters.AddWithValue(DbSanitizeSql.FromKeyParameter, from);
                    cmd.Parameters.AddWithValue(DbSanitizeSql.BatchParameter, BatchRows);
                    to = cmd.ExecuteScalar();
                }
                if (to == null || to == DBNull.Value) break;
                using (var cmd = Command(conn, from == null ? firstSql : sql))
                {
                    if (addParameters != null) addParameters(cmd);
                    if (from != null) cmd.Parameters.AddWithValue(DbSanitizeSql.FromKeyParameter, from);
                    cmd.Parameters.AddWithValue(DbSanitizeSql.ToKeyParameter, to);
                    total += Math.Max(0, cmd.ExecuteNonQuery());
                }
                from = to;
            }
            return total;
        }

        private void RunParallel(IList<TableWork> items, DbSanitizeStepResult step, Action<double> progress)
        {
            if (items.Count == 0)
            {
                progress(1);
                return;
            }
            var sync = new object();
            var done = 0;
            long rows = 0;
            var options = new ParallelOptions { MaxDegreeOfParallelism = Math.Max(1, _options.MaxParallel) };
            Parallel.ForEach(items, options, (item, state) =>
            {
                if (state.IsStopped) return;
                if (IsCancelRequested())
                {
                    state.Stop();
                    return;
                }
                try
                {
                    long affected;
                    using (var conn = Open())
                        affected = item.Run(conn);
                    lock (sync) rows += affected;
                }
                catch (OperationCanceledException)
                {
                    state.Stop();
                }
                catch (Exception ex)
                {
                    lock (sync) step.Warnings.Add(item.Name + ": " + ex.Message);
                }
                int finished;
                lock (sync)
                {
                    done++;
                    finished = done;
                }
                progress(finished / (double)items.Count);
            });
            step.Rows += rows;
            ThrowIfCancelled();
        }

        private string DescribeUnsupportedSchema()
        {
            var missing = new List<string>();
            var users = _schema.Find(DbSanitizeCatalog.UserTable);
            if (users == null || !users.HasColumn("ID") || !users.HasColumn("UserName") || !users.HasColumn("Password"))
                missing.Add(DbSanitizeCatalog.UserTable);
            var employees = _schema.Find(DbSanitizeCatalog.EmployeeTable);
            if (employees == null || !employees.HasColumn("ID"))
                missing.Add(DbSanitizeCatalog.EmployeeTable);
            if (missing.Count == 0) return null;
            return "Database không theo cấu trúc HRM 5 (thiếu bảng " + string.Join(", ", missing)
                + "): mật khẩu, lương và dữ liệu mã hóa CHƯA được làm sạch, chỉ email và điện thoại dạng thường được thay.";
        }

        private void StepPrepare(DbSanitizeStepResult step, Action<double> progress)
        {
            using (var conn = Open())
            {
                _schema = DbSchemaSnapshot.Load(conn, SchemaTimeoutSeconds);
                progress(0.7);
                var unsupported = DescribeUnsupportedSchema();
                if (unsupported != null)
                {
                    step.Status = DbSanitizeStatus.Failed;
                    step.Detail = unsupported;
                    return;
                }
                var details = new List<string> { _schema.Tables.Count.ToString(CultureInfo.InvariantCulture) + " bảng" };
                var model = _schema.RecoveryModel ?? "";
                if (_options.SetSimpleRecovery && model.Length > 0 && !string.Equals(model, "SIMPLE", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        Exec(conn, "DECLARE @sql NVARCHAR(600); SET @sql = N'ALTER DATABASE ' + QUOTENAME(DB_NAME()) + N' SET RECOVERY SIMPLE'; EXEC (@sql);");
                        details.Add("recovery model " + model + " -> SIMPLE");
                    }
                    catch (Exception ex)
                    {
                        step.Warnings.Add("Không đổi được recovery model sang SIMPLE: " + ex.Message);
                    }
                }
                step.Detail = string.Join(", ", details);
            }
        }

        private static string FitPlain(DbColumnInfo column, string valueExpression)
        {
            if (column == null || !column.IsString || !column.MaxChars.HasValue || column.MaxChars.Value <= 0) return valueExpression;
            return "LEFT(" + valueExpression + ", " + column.MaxChars.Value.ToString(CultureInfo.InvariantCulture) + ")";
        }

        private static string FitCipher(DbColumnInfo column, string valueExpression)
        {
            if (column == null || !column.IsString || !column.MaxChars.HasValue || column.MaxChars.Value <= 0) return valueExpression;
            return "CASE WHEN LEN(" + valueExpression + ") <= " + column.MaxChars.Value.ToString(CultureInfo.InvariantCulture)
                + " THEN " + valueExpression + " ELSE N'' END";
        }

        private static string StringSetIfConfigured(DbTableInfo table, string column, string valueExpression)
        {
            var info = table.Column(column);
            if (info == null) return null;
            var name = DbSanitizeSql.Quote(info.Name);
            var configured = info.IsString ? "ISNULL(" + name + ", N'') <> N''" : name + " IS NOT NULL";
            return name + " = CASE WHEN " + configured + " THEN " + FitPlain(info, valueExpression) + " ELSE " + name + " END";
        }

        private static void AddSet(DbTableInfo table, List<string> sets, string column, string valueExpression)
        {
            var info = table.Column(column);
            if (info == null) return;
            sets.Add(DbSanitizeSql.Quote(info.Name) + " = " + FitPlain(info, valueExpression));
        }

        private static void AddBlankSet(DbTableInfo table, List<string> sets, string column)
        {
            var info = table.Column(column);
            if (info == null || !info.IsString) return;
            sets.Add(DbSanitizeSql.Quote(info.Name) + " = N''");
        }

        private static void AddConfiguredSet(DbTableInfo table, List<string> sets, string column, string valueExpression)
        {
            var set = StringSetIfConfigured(table, column, valueExpression);
            if (set != null) sets.Add(set);
        }

        private void StepOutbound(DbSanitizeStepResult step, Action<double> progress)
        {
            var details = new List<string>();
            using (var conn = Open())
            {
                try
                {
                    var n = ResetEmailServers(conn, step);
                    if (n >= 0) details.Add("Email server: " + n.ToString(CultureInfo.InvariantCulture) + " dòng");
                }
                catch (Exception ex)
                {
                    step.Warnings.Add("Email server: " + ex.Message);
                }
                progress(0.25);
                try
                {
                    var n = ResetFolderConfigurations(conn, step);
                    if (n >= 0) details.Add("SFTP: " + n.ToString(CultureInfo.InvariantCulture) + " dòng");
                }
                catch (Exception ex)
                {
                    step.Warnings.Add("SFTP: " + ex.Message);
                }
                progress(0.5);
                long cleared = 0;
                var clearedTables = 0;
                foreach (var name in DbSanitizeCatalog.TablesToClear)
                {
                    ThrowIfCancelled();
                    var table = _schema.Find(name);
                    if (table == null || table.Rows <= 0) continue;
                    try
                    {
                        cleared += ClearTable(conn, table);
                        clearedTables++;
                    }
                    catch (Exception ex)
                    {
                        step.Warnings.Add("Không xóa được " + name + ": " + ex.Message);
                    }
                }
                if (clearedTables > 0)
                    details.Add("Hàng đợi mail, token, lịch sử mật khẩu: xóa " + cleared.ToString("N0", CultureInfo.InvariantCulture) + " dòng ở " + clearedTables.ToString(CultureInfo.InvariantCulture) + " bảng");
                step.Rows += cleared;
                progress(0.8);
                long secrets = 0;
                foreach (var entry in DbSanitizeCatalog.IntegrationSecrets)
                {
                    try
                    {
                        secrets += BlankCatalogEntry(conn, entry);
                    }
                    catch (Exception ex)
                    {
                        step.Warnings.Add(entry.Table + ": " + ex.Message);
                    }
                }
                if (secrets > 0)
                    details.Add("Khóa tích hợp: " + secrets.ToString("N0", CultureInfo.InvariantCulture) + " dòng");
                step.Rows += secrets;
            }
            step.Detail = string.Join("; ", details);
        }

        private long ResetEmailServers(SqlConnection conn, DbSanitizeStepResult step)
        {
            var table = _schema.Find(DbSanitizeCatalog.EmailServerTable);
            if (table == null) return -1;
            var server = _options.EmailServer;
            var sets = new List<string>();
            using (var cmd = Command(conn, ""))
            {
                if (server != null && server.HasValue)
                {
                    int port;
                    if (!int.TryParse((server.Port ?? "").Trim(), out port) || port <= 0) port = 25;
                    int sslPort;
                    var hasSslPort = int.TryParse((server.SslPort ?? "").Trim(), out sslPort) && sslPort > 0;
                    var password = string.IsNullOrWhiteSpace(server.Password) ? "" : DataSecurityWrapper.EncryptData(server.Password, null);
                    cmd.Parameters.AddWithValue("@out", server.OutgoingServer ?? "");
                    cmd.Parameters.AddWithValue("@port", port.ToString(CultureInfo.InvariantCulture));
                    cmd.Parameters.AddWithValue("@acc", server.Username ?? "");
                    cmd.Parameters.AddWithValue("@disp", server.AccountName ?? "");
                    cmd.Parameters.AddWithValue("@email", server.EmailAddress ?? "");
                    cmd.Parameters.AddWithValue("@ssl", server.EnableSsl);
                    cmd.Parameters.AddWithValue("@sslPort", hasSslPort ? (object)sslPort : DBNull.Value);
                    cmd.Parameters.AddWithValue("@pw", password);
                    AddSet(table, sets, "OutgoingMailServer", "@out");
                    AddSet(table, sets, "OutgoingMailServerPort", "@port");
                    AddSet(table, sets, "AccountID", "@acc");
                    AddSet(table, sets, "SMTPDisplayName", "@disp");
                    AddSet(table, sets, "EmailAddress", "@email");
                    AddSet(table, sets, "IsEnableSSL", "@ssl");
                    AddSet(table, sets, "SSLPort", "@sslPort");
                    AddSet(table, sets, "PasswordPOP3", "@pw");
                    AddConfiguredSet(table, sets, "OutgoingMailServerRec", "@out");
                    AddConfiguredSet(table, sets, "OutgoingMailServerPortRec", "@port");
                    AddConfiguredSet(table, sets, "AccountIDRec", "@acc");
                    AddConfiguredSet(table, sets, "SMTPDisplayNameRec", "@disp");
                    AddConfiguredSet(table, sets, "EmailAddressRec", "@email");
                    AddConfiguredSet(table, sets, "PasswordPOP3Rec", "@pw");
                }
                else
                {
                    AddBlankSet(table, sets, "PasswordPOP3");
                    AddBlankSet(table, sets, "PasswordPOP3Rec");
                    step.Warnings.Add("Chưa cấu hình Email Server trong Cài đặt ứng dụng: đã xóa mật khẩu SMTP của khách nhưng chưa trỏ sang SMTP thử nghiệm.");
                }
                AddBlankSet(table, sets, "IncomingMailServerRec");
                AddBlankSet(table, sets, "SMTPTenantID");
                AddBlankSet(table, sets, "SMTPClientID");
                AddBlankSet(table, sets, "SMTPClientSecret");
                AddBlankSet(table, sets, "SMTPTenantIDRec");
                AddBlankSet(table, sets, "SMTPClientIDRec");
                AddBlankSet(table, sets, "SMTPClientSecretRec");
                AddBlankSet(table, sets, "PasswordLotusNoteID");
                if (sets.Count == 0) return 0;
                cmd.CommandText = "UPDATE " + table.QuotedName + " SET " + string.Join(", ", sets);
                return Math.Max(0, cmd.ExecuteNonQuery());
            }
        }

        private long ResetFolderConfigurations(SqlConnection conn, DbSanitizeStepResult step)
        {
            var table = _schema.Find(DbSanitizeCatalog.FolderConfigurationTable);
            if (table == null) return -1;
            var sftp = _options.Sftp;
            var sets = new List<string>();
            using (var cmd = Command(conn, ""))
            {
                if (sftp != null && sftp.HasValue)
                {
                    var password = string.IsNullOrWhiteSpace(sftp.Password) ? "" : DataSecurityWrapper.EncryptData(sftp.Password, null);
                    cmd.Parameters.AddWithValue("@h", sftp.Host ?? "");
                    cmd.Parameters.AddWithValue("@p", sftp.Port ?? "");
                    cmd.Parameters.AddWithValue("@u", sftp.User ?? "");
                    cmd.Parameters.AddWithValue("@pw", password);
                    AddSet(table, sets, "Host", "@h");
                    AddSet(table, sets, "Port", "@p");
                    AddSet(table, sets, "UserNameSourceFolder", "@u");
                    AddSet(table, sets, "PasswordSourceFolder", "@pw");
                    AddConfiguredSet(table, sets, "UserNameTrackingFolder", "@u");
                    AddConfiguredSet(table, sets, "PasswordTrackingFolder", "@pw");
                }
                else
                {
                    AddBlankSet(table, sets, "PasswordSourceFolder");
                    AddBlankSet(table, sets, "PasswordTrackingFolder");
                    step.Warnings.Add("Chưa cấu hình SFTP trong Cài đặt ứng dụng: đã xóa mật khẩu SFTP của khách nhưng chưa trỏ sang SFTP thử nghiệm.");
                }
                if (sets.Count == 0) return 0;
                cmd.CommandText = "UPDATE " + table.QuotedName + " SET " + string.Join(", ", sets);
                return Math.Max(0, cmd.ExecuteNonQuery());
            }
        }

        private long ClearTable(SqlConnection conn, DbTableInfo table)
        {
            try
            {
                Exec(conn, "TRUNCATE TABLE " + table.QuotedName);
                return table.Rows;
            }
            catch (SqlException)
            {
            }
            long total = 0;
            while (true)
            {
                ThrowIfCancelled();
                var n = Exec(conn, "DELETE TOP (" + DeleteBatchRows.ToString(CultureInfo.InvariantCulture) + ") FROM " + table.QuotedName);
                if (n <= 0) break;
                total += n;
            }
            return total;
        }

        private long BlankCatalogEntry(SqlConnection conn, DbEncryptedColumns entry)
        {
            var table = _schema.Find(entry.Table);
            if (table == null || table.Rows <= 0) return 0;
            var columns = table.ExistingStringColumns(entry.Columns);
            if (columns.Count == 0) return 0;
            return BlankColumns(conn, table, columns, entry.Mode, entry.Filter, entry.Replacement);
        }

        private long BlankColumns(SqlConnection conn, DbTableInfo table, IList<string> columns, DbBlankMode mode, string filter, string replacement)
        {
            var byPredicates = columns.Count <= MaxPredicateColumns;
            return ExecuteUpdate(conn, table,
                key => DbSanitizeSql.BuildBlankUpdate(table.QuotedName, columns, mode, filter, key, byPredicates, replacement),
                null);
        }

        private void StepAccounts(DbSanitizeStepResult step, Action<double> progress)
        {
            var table = _schema.Find(DbSanitizeCatalog.UserTable);
            if (table == null || !table.HasColumn("ID") || !table.HasColumn("UserName") || !table.HasColumn("Password"))
            {
                step.Status = DbSanitizeStatus.Skipped;
                step.Detail = "Không có bảng Security_Users.";
                return;
            }
            var hasEmployee = table.HasColumn("EmployeeID");
            var users = new List<UserRow>();
            var hashes = new List<string>();
            using (var conn = Open())
            {
                var select = "SELECT U.[ID], U.[UserName], " + (hasEmployee ? "U.[EmployeeID]" : "CAST(NULL AS BIGINT)") + ", U.[Password] FROM " + table.QuotedName + " U";
                using (var cmd = Command(conn, select))
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        users.Add(new UserRow
                        {
                            Id = Convert.ToInt64(r.GetValue(0)),
                            UserName = r.IsDBNull(1) ? "" : Convert.ToString(r.GetValue(1)),
                            EmployeeId = r.IsDBNull(2) ? (long?)null : Convert.ToInt64(r.GetValue(2))
                        });
                        if (hashes.Count < HashSampleSize && !r.IsDBNull(3))
                            hashes.Add(Convert.ToString(r.GetValue(3)));
                    }
                }
                if (users.Count == 0)
                {
                    step.Status = DbSanitizeStatus.Skipped;
                    step.Detail = "Không có user.";
                    return;
                }
                progress(0.15);
                var hashType = DbSanitizeSql.DetectPasswordHashType(hashes);
                _report.HashType = hashType.ToString();
                var signatureColumn = DbSanitizeCatalog.UserSignatureColumns.FirstOrDefault(c => table.Column(c) != null && table.Column(c).IsString);
                var ssoColumns = table.ExistingStringColumns(DbSanitizeCatalog.UserSsoIdentifierColumns);
                var mfaEmailColumns = table.ExistingStringColumns(DbSanitizeCatalog.UserMfaEmailColumns);
                var mfaSecretColumns = table.ExistingStringColumns(DbSanitizeCatalog.UserMfaSecretColumns);
                var needSignature = signatureColumn != null && ssoColumns.Count > 0;

                Exec(conn, @"CREATE TABLE #BaSanUser (
    UserID BIGINT NOT NULL PRIMARY KEY,
    Pwd NVARCHAR(400) COLLATE DATABASE_DEFAULT NULL,
    Sig NVARCHAR(400) COLLATE DATABASE_DEFAULT NULL,
    MfaEmail NVARCHAR(600) COLLATE DATABASE_DEFAULT NULL
);");
                var data = new DataTable();
                data.Columns.Add("UserID", typeof(long));
                data.Columns.Add("Pwd", typeof(string));
                data.Columns.Add("Sig", typeof(string));
                data.Columns.Add("MfaEmail", typeof(string));
                var seen = new HashSet<long>();
                for (var i = 0; i < users.Count; i++)
                {
                    var u = users[i];
                    if (!seen.Add(u.Id)) continue;
                    var row = data.NewRow();
                    row["UserID"] = u.Id;
                    row["Pwd"] = SimpleHash.ComputeHash((u.UserName ?? "").Trim().ToLower() + _options.Password, hashType);
                    row["Sig"] = needSignature
                        ? (object)SimpleHash.ComputeHash(DbSanitizeSql.BuildUserSignaturePlainText(u.Id, u.UserName, u.EmployeeId), SimpleHash.HashType.SHA256)
                        : DBNull.Value;
                    row["MfaEmail"] = mfaEmailColumns.Count > 0
                        ? (object)DataSecurityWrapper.EncryptData(_options.Email, u.Id)
                        : DBNull.Value;
                    data.Rows.Add(row);
                    if (data.Rows.Count >= BulkChunkRows)
                    {
                        BulkCopy(conn, "#BaSanUser", data);
                        data.Clear();
                        ThrowIfCancelled();
                    }
                }
                if (data.Rows.Count > 0) BulkCopy(conn, "#BaSanUser", data);
                progress(0.5);

                var sets = new List<string> { "U.[Password] = " + FitCipher(table.Column("Password"), "B.Pwd") };
                AddUserSet(table, sets, "IsRequireChangePassword", "0");
                AddUserSet(table, sets, "IsLockedOut", "0");
                AddUserSet(table, sets, "FailedPasswordAttemptCount", "0");
                AddUserSet(table, sets, "IsWindowADAccount", "0");
                AddUserSet(table, sets, "LastLoginDateTime", "@expire");
                AddUserSet(table, sets, "LastPasswordChangedDateTime", "@expire");
                AddUserSet(table, sets, "ReceiveEmailTypeID", "2");
                AddUserSet(table, sets, "UserEmailAddress", "@email");
                var loginEmail = table.Column("Email");
                if (loginEmail != null && loginEmail.IsString)
                    sets.Add("U.[Email] = CASE WHEN U.[Email] LIKE N'%_@_%' THEN " + FitPlain(loginEmail, "@email") + " ELSE U.[Email] END");
                foreach (var column in mfaEmailColumns)
                {
                    var name = "U." + DbSanitizeSql.Quote(column);
                    sets.Add(name + " = CASE WHEN ISNULL(" + name + ", N'') <> N'' THEN " + FitCipher(table.Column(column), "B.MfaEmail") + " ELSE " + name + " END");
                }
                foreach (var column in mfaSecretColumns)
                    sets.Add("U." + DbSanitizeSql.Quote(column) + " = N''");
                using (var cmd = Command(conn, "UPDATE U SET " + string.Join(", ", sets) + " FROM " + table.QuotedName + " U INNER JOIN #BaSanUser B ON B.UserID = U.[ID]"))
                {
                    cmd.Parameters.AddWithValue("@expire", DateTime.Now.AddYears(1));
                    cmd.Parameters.AddWithValue("@email", _options.Email);
                    step.Rows = Math.Max(0, cmd.ExecuteNonQuery());
                }
                progress(0.85);

                var details = new List<string>
                {
                    step.Rows.ToString("N0", CultureInfo.InvariantCulture) + " user, kiểu hash " + hashType
                };
                if (ssoColumns.Count > 0)
                {
                    try
                    {
                        var ssoSets = ssoColumns.Select(c => "U." + DbSanitizeSql.Quote(c) + " = NULL").ToList();
                        if (needSignature) ssoSets.Add("U." + DbSanitizeSql.Quote(signatureColumn) + " = " + FitCipher(table.Column(signatureColumn), "B.Sig"));
                        var ssoWhere = string.Join(" OR ", ssoColumns.Select(c => "ISNULL(U." + DbSanitizeSql.Quote(c) + ", N'') <> N''"));
                        var n = Exec(conn, "UPDATE U SET " + string.Join(", ", ssoSets) + " FROM " + table.QuotedName + " U INNER JOIN #BaSanUser B ON B.UserID = U.[ID] WHERE " + ssoWhere);
                        if (n > 0) details.Add("xóa định danh SSO của " + n.ToString("N0", CultureInfo.InvariantCulture) + " user");
                    }
                    catch (Exception ex)
                    {
                        step.Warnings.Add("Không xóa được định danh SSO: " + ex.Message);
                    }
                }
                step.Detail = string.Join("; ", details);
            }
        }

        private static void AddUserSet(DbTableInfo table, List<string> sets, string column, string valueExpression)
        {
            var info = table.Column(column);
            if (info == null) return;
            sets.Add("U." + DbSanitizeSql.Quote(info.Name) + " = " + FitPlain(info, valueExpression));
        }

        private static void BulkCopy(SqlConnection conn, string destination, DataTable data)
        {
            using (var bulk = new SqlBulkCopy(conn))
            {
                bulk.DestinationTableName = destination;
                bulk.BulkCopyTimeout = CommandTimeoutSeconds;
                bulk.BatchSize = 5000;
                foreach (DataColumn column in data.Columns)
                    bulk.ColumnMappings.Add(column.ColumnName, column.ColumnName);
                bulk.WriteToServer(data);
            }
        }

        private static bool IsCatalogOwnedColumn(string table, string column)
        {
            if (DbSanitizeCatalog.IsEncryptedContactColumn(table, column)) return true;
            foreach (var entry in DbSanitizeCatalog.OtherEncryptedColumns)
            {
                if (!string.Equals(entry.Table, table, StringComparison.OrdinalIgnoreCase)) continue;
                if (entry.Columns.Any(c => string.Equals(c, column, StringComparison.OrdinalIgnoreCase))) return true;
            }
            foreach (var entry in DbSanitizeCatalog.IntegrationSecrets)
            {
                if (!string.Equals(entry.Table, table, StringComparison.OrdinalIgnoreCase)) continue;
                if (entry.Columns.Any(c => string.Equals(c, column, StringComparison.OrdinalIgnoreCase))) return true;
            }
            return false;
        }

        private void StepPlainContact(DbSanitizeStepResult step, Action<double> progress)
        {
            var excludedTables = new HashSet<string>(DbSanitizeCatalog.AllPlainContactExcludedTables(), StringComparer.OrdinalIgnoreCase);
            var items = new List<TableWork>();
            var columnCount = 0;
            foreach (var table in _schema.Tables.OrderByDescending(t => t.Rows))
            {
                if (table.Rows <= 0) continue;
                if (excludedTables.Contains(table.Name)) continue;
                if (DbSanitizeCatalog.IsDynamicEncryptedTable(table.Name)) continue;
                var columns = new List<DbPlainColumn>();
                foreach (var column in table.Columns.Values)
                {
                    if (!column.IsString && !column.IsLob) continue;
                    DbPlainKind kind;
                    if (!DbSanitizeSql.IsPlainContactCandidate(column.Name, out kind)) continue;
                    if (IsCatalogOwnedColumn(table.Name, column.Name)) continue;
                    columns.Add(new DbPlainColumn
                    {
                        Name = column.Name,
                        Kind = kind,
                        MaxChars = column.MaxChars,
                        IsLob = column.IsLob,
                        BlankCipher = !column.IsLob && DbSanitizeSql.ShouldBlankCipher(column.Name, kind, column.MaxChars)
                    });
                }
                if (columns.Count == 0) continue;
                columnCount += columns.Count;
                var target = table;
                var normal = columns.Where(c => !c.IsLob).ToList();
                var lobs = columns.Where(c => c.IsLob).ToList();
                items.Add(new TableWork
                {
                    Name = target.Name,
                    Run = conn =>
                    {
                        long rows = 0;
                        if (normal.Count > 0)
                        {
                            rows += ExecuteUpdate(conn, target,
                                key => DbSanitizeSql.BuildPlainContactUpdate(target.QuotedName, normal, key),
                                AddContactParameters);
                        }
                        foreach (var lob in lobs)
                        {
                            using (var cmd = Command(conn, DbSanitizeSql.BuildPlainLobUpdate(target.QuotedName, lob)))
                            {
                                AddContactParameters(cmd);
                                rows += Math.Max(0, cmd.ExecuteNonQuery());
                            }
                        }
                        return rows;
                    }
                });
            }
            RunParallel(items, step, progress);
            step.Detail = items.Count.ToString(CultureInfo.InvariantCulture) + " bảng, " + columnCount.ToString(CultureInfo.InvariantCulture) + " cột";
        }

        private void AddContactParameters(SqlCommand cmd)
        {
            cmd.Parameters.AddWithValue(DbSanitizeSql.EmailParameter, _options.Email);
            cmd.Parameters.AddWithValue(DbSanitizeSql.PhoneParameter, _options.Phone);
        }

        private void StepEmployee(DbSanitizeStepResult step, Action<double> progress)
        {
            var employees = _schema.Find(DbSanitizeCatalog.EmployeeTable);
            if (employees == null || !employees.HasColumn("ID"))
            {
                step.Status = DbSanitizeStatus.Skipped;
                step.Detail = "Không có bảng Staffing_Employees.";
                return;
            }
            var details = new List<string>();
            using (var conn = Open())
            {
                var ids = new List<long>();
                using (var cmd = Command(conn, "SELECT E.[ID] FROM " + employees.QuotedName + " E"))
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read()) ids.Add(Convert.ToInt64(r.GetValue(0)));
                }
                if (ids.Count == 0)
                {
                    step.Status = DbSanitizeStatus.Skipped;
                    step.Detail = "Không có nhân viên.";
                    return;
                }
                Exec(conn, @"CREATE TABLE #BaSanEmp (
    EmployeeID BIGINT NOT NULL PRIMARY KEY,
    EncEmail NVARCHAR(600) COLLATE DATABASE_DEFAULT NULL,
    EncPhone NVARCHAR(300) COLLATE DATABASE_DEFAULT NULL,
    EncPayslip NVARCHAR(300) COLLATE DATABASE_DEFAULT NULL,
    EncSalary NVARCHAR(300) COLLATE DATABASE_DEFAULT NULL
);");
                var data = new DataTable();
                data.Columns.Add("EmployeeID", typeof(long));
                data.Columns.Add("EncEmail", typeof(string));
                data.Columns.Add("EncPhone", typeof(string));
                data.Columns.Add("EncPayslip", typeof(string));
                data.Columns.Add("EncSalary", typeof(string));
                var random = new Random();
                var seen = new HashSet<long>();
                var fakeSalaryByEmployee = new Dictionary<long, string>();
                for (var i = 0; i < ids.Count; i++)
                {
                    var id = ids[i];
                    if (!seen.Add(id)) continue;
                    var row = data.NewRow();
                    row["EmployeeID"] = id;
                    row["EncEmail"] = DataSecurityWrapper.EncryptData(_options.Email, id);
                    row["EncPhone"] = DataSecurityWrapper.EncryptData(_options.Phone, id);
                    row["EncPayslip"] = DataSecurityWrapper.EncryptData(_options.Password, id);
                    if (_options.KeepRealSalary)
                    {
                        row["EncSalary"] = DBNull.Value;
                    }
                    else
                    {
                        var fakeSalary = DataSecurityWrapper.EncryptData(
                            DbSanitizeSql.NextFakeSalary(random, _options.SalaryMin, _options.SalaryMax).ToString("0", CultureInfo.InvariantCulture), id);
                        row["EncSalary"] = fakeSalary;
                        fakeSalaryByEmployee[id] = fakeSalary;
                    }
                    data.Rows.Add(row);
                    if (data.Rows.Count >= BulkChunkRows)
                    {
                        BulkCopy(conn, "#BaSanEmp", data);
                        data.Clear();
                        ThrowIfCancelled();
                        progress(0.5 * (i + 1) / ids.Count);
                    }
                }
                if (data.Rows.Count > 0) BulkCopy(conn, "#BaSanEmp", data);
                progress(0.5);

                long contactRows = 0;
                foreach (var contact in DbSanitizeCatalog.EmployeeContactTables)
                {
                    ThrowIfCancelled();
                    var table = _schema.Find(contact.Table);
                    if (table == null || table.Rows <= 0 || !table.HasColumn(contact.EmployeeKeyColumn)) continue;
                    var emails = table.ExistingStringColumns(contact.EmailColumns);
                    var phones = table.ExistingStringColumns(contact.PhoneColumns);
                    if (emails.Count + phones.Count == 0) continue;
                    try
                    {
                        var sets = new List<string>();
                        var predicates = new List<string>();
                        foreach (var column in emails) AddEmployeeSet(sets, predicates, table.Column(column), "B.EncEmail");
                        foreach (var column in phones) AddEmployeeSet(sets, predicates, table.Column(column), "B.EncPhone");
                        contactRows += Exec(conn, "UPDATE T SET " + string.Join(", ", sets) + " FROM " + table.QuotedName
                            + " T INNER JOIN #BaSanEmp B ON B.EmployeeID = T." + DbSanitizeSql.Quote(contact.EmployeeKeyColumn)
                            + " WHERE " + string.Join(" OR ", predicates));
                    }
                    catch (Exception ex)
                    {
                        step.Warnings.Add(contact.Table + ": " + ex.Message);
                    }
                }
                details.Add("email/điện thoại: " + contactRows.ToString("N0", CultureInfo.InvariantCulture) + " dòng");
                step.Rows += contactRows;
                progress(0.75);

                try
                {
                    var n = UpdateEmployeeColumn(conn, DbSanitizeCatalog.PayslipPassword, "B.EncPayslip");
                    if (n > 0) details.Add("mật khẩu phiếu lương: " + n.ToString("N0", CultureInfo.InvariantCulture) + " dòng");
                    step.Rows += n;
                }
                catch (Exception ex)
                {
                    step.Warnings.Add(DbSanitizeCatalog.PayslipPassword.Table + ".PayslipPassword: " + ex.Message);
                }
                progress(0.85);

                if (_options.KeepRealSalary)
                {
                    details.Add("giữ lương thật");
                }
                else
                {
                    long salaryRows = 0;
                    foreach (var salary in DbSanitizeCatalog.SalaryColumns)
                    {
                        ThrowIfCancelled();
                        try
                        {
                            salaryRows += UpdateEmployeeColumn(conn, salary, "B.EncSalary");
                        }
                        catch (Exception ex)
                        {
                            step.Warnings.Add(salary.Table + "." + salary.Column + ": " + ex.Message);
                        }
                    }
                    foreach (var list in DbSanitizeCatalog.EmployeeListColumns)
                    {
                        ThrowIfCancelled();
                        try
                        {
                            salaryRows += UpdateEmployeeListColumn(conn, list, fakeSalaryByEmployee);
                        }
                        catch (Exception ex)
                        {
                            step.Warnings.Add(list.Table + "." + list.Column + ": " + ex.Message);
                        }
                    }
                    details.Add("lương cơ bản giả: " + salaryRows.ToString("N0", CultureInfo.InvariantCulture) + " dòng");
                    step.Rows += salaryRows;
                }
            }
            step.Detail = string.Join("; ", details);
        }

        private static void AddEmployeeSet(List<string> sets, List<string> predicates, DbColumnInfo column, string valueExpression)
        {
            var name = "T." + DbSanitizeSql.Quote(column.Name);
            var predicate = "ISNULL(" + name + ", N'') <> N''";
            sets.Add(name + " = CASE WHEN " + predicate + " THEN " + FitCipher(column, valueExpression) + " ELSE " + name + " END");
            predicates.Add(predicate);
        }

        private long UpdateEmployeeColumn(SqlConnection conn, DbEmployeeColumn target, string valueExpression)
        {
            var table = _schema.Find(target.Table);
            if (table == null || table.Rows <= 0 || !table.HasColumn(target.EmployeeKeyColumn)) return 0;
            var column = table.Column(target.Column);
            if (column == null || !column.IsString) return 0;
            var name = "T." + DbSanitizeSql.Quote(column.Name);
            return Math.Max(0, Exec(conn, "UPDATE T SET " + name + " = " + FitCipher(column, valueExpression) + " FROM " + table.QuotedName
                + " T INNER JOIN #BaSanEmp B ON B.EmployeeID = T." + DbSanitizeSql.Quote(target.EmployeeKeyColumn)
                + " WHERE ISNULL(" + name + ", N'') <> N''"));
        }

        private static Type KeyClrType(string keyType)
        {
            if (string.Equals(keyType, "uniqueidentifier", StringComparison.OrdinalIgnoreCase)) return typeof(Guid);
            if (string.Equals(keyType, "bigint", StringComparison.OrdinalIgnoreCase)) return typeof(long);
            if (string.Equals(keyType, "int", StringComparison.OrdinalIgnoreCase)) return typeof(int);
            return null;
        }

        private long UpdateEmployeeListColumn(SqlConnection conn, DbEmployeeListColumn target, Dictionary<long, string> fakeSalaryByEmployee)
        {
            var table = _schema.Find(target.Table);
            if (table == null || table.Rows <= 0) return 0;
            var column = table.Column(target.Column);
            if (column == null || !column.IsString) return 0;
            var keyType = KeyClrType(table.KeyType);
            if (!target.FakeSalary || keyType == null || !table.HasColumn(target.EmployeeKeyColumn))
                return Math.Max(0, Exec(conn, DbSanitizeSql.BuildBlankListUpdate(table.QuotedName, column.Name, DbSanitizeCatalog.ListSeparator)));

            var name = DbSanitizeSql.Quote(column.Name);
            var key = DbSanitizeSql.Quote(table.KeyColumn);
            Exec(conn, "CREATE TABLE #BaSanList (K " + table.KeyType + " NOT NULL PRIMARY KEY, V NVARCHAR(MAX) COLLATE DATABASE_DEFAULT NULL);");
            try
            {
                var data = new DataTable();
                data.Columns.Add("K", keyType);
                data.Columns.Add("V", typeof(string));
                using (var cmd = Command(conn, "SELECT T." + key + ", T." + DbSanitizeSql.Quote(target.EmployeeKeyColumn) + ", T." + name
                    + " FROM " + table.QuotedName + " T WHERE ISNULL(T." + name + ", N'') <> N''"))
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        var value = Convert.ToString(r.GetValue(2));
                        string fake = null;
                        if (!r.IsDBNull(1)) fakeSalaryByEmployee.TryGetValue(Convert.ToInt64(r.GetValue(1)), out fake);
                        var replaced = DbSanitizeSql.ReplaceListElements(value, DbSanitizeCatalog.ListSeparator, fake);
                        if (column.MaxChars.HasValue && replaced.Length > column.MaxChars.Value)
                            replaced = DbSanitizeSql.ReplaceListElements(value, DbSanitizeCatalog.ListSeparator, "");
                        if (string.Equals(replaced, value, StringComparison.Ordinal)) continue;
                        var row = data.NewRow();
                        row["K"] = r.GetValue(0);
                        row["V"] = replaced;
                        data.Rows.Add(row);
                    }
                }
                if (data.Rows.Count == 0) return 0;
                BulkCopy(conn, "#BaSanList", data);
                return Math.Max(0, Exec(conn, "UPDATE T SET T." + name + " = L.V FROM " + table.QuotedName + " T INNER JOIN #BaSanList L ON L.K = T." + key));
            }
            finally
            {
                try
                {
                    Exec(conn, "IF OBJECT_ID(N'tempdb..#BaSanList') IS NOT NULL DROP TABLE #BaSanList;");
                }
                catch (SqlException)
                {
                }
            }
        }

        private void AddCatalogWork(List<TableWork> items, HashSet<string> usedTables, IEnumerable<DbEncryptedColumns> entries)
        {
            foreach (var entry in entries)
            {
                var table = _schema.Find(entry.Table);
                if (table == null || table.Rows <= 0) continue;
                var columns = table.ExistingStringColumns(entry.Columns);
                if (columns.Count == 0) continue;
                usedTables.Add(table.Name);
                var target = table;
                var mode = entry.Mode;
                var filter = entry.Filter;
                var replacement = entry.Replacement;
                items.Add(new TableWork { Name = target.Name, Run = conn => BlankColumns(conn, target, columns, mode, filter, replacement) });
            }
        }

        private void AddDynamicWork(List<TableWork> items, HashSet<string> usedTables, IEnumerable<DbDynamicEncryptedTables> patterns)
        {
            var keyColumns = new HashSet<string>(DbSanitizeCatalog.DynamicKeyColumns, StringComparer.OrdinalIgnoreCase);
            foreach (var pattern in patterns)
            {
                foreach (var table in _schema.FindLike(pattern.LikePattern))
                {
                    if (table.Rows <= 0 || usedTables.Contains(table.Name)) continue;
                    List<string> columns;
                    if (pattern.AllStringColumns)
                        columns = table.Columns.Values.Where(c => c.IsString && !keyColumns.Contains(c.Name)).Select(c => c.Name).ToList();
                    else
                        columns = table.ExistingStringColumns(pattern.Columns);
                    if (columns.Count == 0) continue;
                    usedTables.Add(table.Name);
                    var target = table;
                    items.Add(new TableWork { Name = target.Name, Run = conn => BlankColumns(conn, target, columns, DbBlankMode.CipherOnly, null, null) });
                }
            }
        }

        private void StepAmounts(DbSanitizeStepResult step, Action<double> progress)
        {
            var items = new List<TableWork>();
            var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            AddCatalogWork(items, used, DbSanitizeCatalog.AmountColumns);
            AddDynamicWork(items, used, DbSanitizeCatalog.DynamicAmountTables);
            RunParallel(items, step, progress);
            step.Detail = items.Count.ToString(CultureInfo.InvariantCulture) + " bảng";
        }

        private void StepOther(DbSanitizeStepResult step, Action<double> progress)
        {
            var items = new List<TableWork>();
            var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            AddCatalogWork(items, used, DbSanitizeCatalog.OtherEncryptedColumns);
            AddDynamicWork(items, used, DbSanitizeCatalog.DynamicOtherTables);
            RunParallel(items, step, progress);
            step.Detail = items.Count.ToString(CultureInfo.InvariantCulture) + " bảng";
        }
    }
}
