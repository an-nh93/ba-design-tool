using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;

namespace BADesign.Helpers.Database
{
    public static class DbSanitizeSettings
    {
        public const string PhoneKey = "App_ResetPhoneDefault";
        public const string PasswordKey = "App_ResetPasswordDefault";
        public const string SalaryMinKey = "App_ResetSalaryMin";
        public const string SalaryMaxKey = "App_ResetSalaryMax";
        public const string MaxParallelKey = "App_ResetMaxParallel";

        private static readonly string[] DefaultKeys = { PhoneKey, PasswordKey, SalaryMinKey, SalaryMaxKey, MaxParallelKey };

        private static readonly string[] EmailServerKeys =
        {
            "EmailServer_OutgoingServer", "EmailServer_Port", "EmailServer_AccountName", "EmailServer_Username",
            "EmailServer_EmailAddress", "EmailServer_Password", "EmailServer_EnableSSL", "EmailServer_SSLPort"
        };

        private static readonly string[] SftpKeys = { "SftpHost", "SftpPort", "SftpUser", "SftpPassword" };

        public static Dictionary<string, string> Load(string appConnectionString, IEnumerable<string> keys)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var list = (keys ?? new string[0]).Where(k => !string.IsNullOrWhiteSpace(k)).Distinct().ToList();
            if (string.IsNullOrEmpty(appConnectionString) || list.Count == 0) return result;
            using (var conn = new SqlConnection(appConnectionString))
            using (var cmd = conn.CreateCommand())
            {
                var names = new List<string>();
                for (var i = 0; i < list.Count; i++)
                {
                    var name = "@k" + i.ToString(CultureInfo.InvariantCulture);
                    names.Add(name);
                    cmd.Parameters.AddWithValue(name, list[i]);
                }
                cmd.CommandText = "SELECT [Key], [Value] FROM BaAppSetting WHERE [Key] IN (" + string.Join(", ", names) + ")";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                        result[r.GetString(0)] = r.IsDBNull(1) ? "" : r.GetString(1);
                }
            }
            return result;
        }

        public static DbSanitizeOptions LoadDefaults(string appConnectionString)
        {
            var options = new DbSanitizeOptions();
            Dictionary<string, string> values;
            try { values = Load(appConnectionString, DefaultKeys); }
            catch (SqlException) { return options; }
            options.Phone = Text(values, PhoneKey, options.Phone);
            options.Password = Text(values, PasswordKey, options.Password);
            options.SalaryMin = Number(values, SalaryMinKey, options.SalaryMin);
            options.SalaryMax = Number(values, SalaryMaxKey, options.SalaryMax);
            options.MaxParallel = (int)Number(values, MaxParallelKey, options.MaxParallel);
            options.Normalize();
            return options;
        }

        public static void ApplyConnections(string appConnectionString, DbSanitizeOptions options)
        {
            if (options == null) return;
            Dictionary<string, string> values;
            try { values = Load(appConnectionString, EmailServerKeys.Concat(SftpKeys)); }
            catch (SqlException) { return; }
            var ssl = Text(values, "EmailServer_EnableSSL", "");
            options.EmailServer = new DbSanitizeEmailServer
            {
                OutgoingServer = Text(values, "EmailServer_OutgoingServer", ""),
                Port = Text(values, "EmailServer_Port", ""),
                AccountName = Text(values, "EmailServer_AccountName", ""),
                Username = Text(values, "EmailServer_Username", ""),
                EmailAddress = Text(values, "EmailServer_EmailAddress", ""),
                Password = Text(values, "EmailServer_Password", ""),
                EnableSsl = ssl == "1" || string.Equals(ssl, "true", StringComparison.OrdinalIgnoreCase),
                SslPort = Text(values, "EmailServer_SSLPort", "")
            };
            options.Sftp = new DbSanitizeSftp
            {
                Host = Text(values, "SftpHost", ""),
                Port = Text(values, "SftpPort", ""),
                User = Text(values, "SftpUser", ""),
                Password = Text(values, "SftpPassword", "")
            };
        }

        public static void Save(string appConnectionString, IDictionary<string, string> values, int? userId)
        {
            if (values == null || values.Count == 0) return;
            using (var conn = new SqlConnection(appConnectionString))
            {
                conn.Open();
                foreach (var pair in values)
                {
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM BaAppSetting WHERE [Key] = @k)
    UPDATE BaAppSetting SET [Value] = @v, UpdatedAt = SYSDATETIME(), UpdatedBy = @uid WHERE [Key] = @k;
ELSE
    INSERT INTO BaAppSetting ([Key], [Value], UpdatedAt, UpdatedBy) VALUES (@k, @v, SYSDATETIME(), @uid);";
                        cmd.Parameters.AddWithValue("@k", pair.Key);
                        cmd.Parameters.AddWithValue("@v", (object)pair.Value ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@uid", userId.HasValue ? (object)userId.Value : DBNull.Value);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
        }

        private static string Text(Dictionary<string, string> values, string key, string fallback)
        {
            string v;
            if (values != null && values.TryGetValue(key, out v) && !string.IsNullOrWhiteSpace(v)) return v.Trim();
            return fallback;
        }

        private static decimal Number(Dictionary<string, string> values, string key, decimal fallback)
        {
            string v;
            if (values == null || !values.TryGetValue(key, out v) || string.IsNullOrWhiteSpace(v)) return fallback;
            decimal d;
            return decimal.TryParse(v.Trim(), NumberStyles.Any, CultureInfo.InvariantCulture, out d) ? d : fallback;
        }
    }
}
