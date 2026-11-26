using System;
using System.Collections.Generic;
using System.Data.SqlClient;

namespace BADesign.Helpers.Security
{
    public sealed class BaSecretStatus
    {
        public bool On { get; set; }
        public int ProtectedCount { get; set; }
        public int PlainCount { get; set; }
        public int ChangedCount { get; set; }
    }

    /// <summary>
    /// Công tắc "mã hóa bí mật đang lưu" (dòng Security_EncryptStoredSecrets của BaAppSetting) và việc đổi dạng dữ liệu đã có.
    /// Tắt (mặc định): ghi dạng thường như trước, để bản web hoặc Worker cũ dùng chung database vẫn đọc được.
    /// Bật: ghi dạng đã mã hóa. Đọc thì lúc nào cũng nhận cả hai dạng (BaSecret.Reveal, BaJobSecrets.Read).
    /// Thêm một nơi lưu bí mật mới: thêm vào Sources, ghi qua ForStorage, đọc qua BaSecret.Reveal.
    /// </summary>
    public static class BaSecretStore
    {
        public const string SwitchKey = "Security_EncryptStoredSecrets";

        /// <summary>Mật khẩu SQL Server dài tối đa 128 ký tự; ở dạng đã mã hóa nó cần tới 607 ký tự, cột Password ban đầu chỉ có 256.</summary>
        private const int ServerPasswordColumnLength = 1024;

        private sealed class SecretSource
        {
            public string Table;
            public string IdColumn;
            public string ValueColumn;
            public string Filter;
            public bool HoldsJobPayload;
        }

        private sealed class StoredValue
        {
            public object Id;
            public string Wanted;
        }

        private sealed class SourceScan
        {
            public int Total;
            public readonly List<StoredValue> Misplaced = new List<StoredValue>();
        }

        private static readonly SecretSource[] Sources =
        {
            new SecretSource
            {
                Table = "BaDatabaseServer", IdColumn = "Id", ValueColumn = "Password",
                Filter = "ISNULL(Password, N'') <> N''"
            },
            new SecretSource
            {
                Table = "BaAppSetting", IdColumn = "[Key]", ValueColumn = "[Value]",
                Filter = "[Key] IN (N'SftpPassword', N'EmailServer_Password', N'Telegram_BotToken') AND ISNULL([Value], N'') <> N''"
            },
            new SecretSource
            {
                Table = "BaJob", IdColumn = "Id", ValueColumn = "Payload", HoldsJobPayload = true,
                Filter = "JobType IN (N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperMultiDbReset') AND Payload LIKE N'%connectionString%'"
            }
        };

        public static bool IsOn(string appConnectionString)
        {
            using (var conn = new SqlConnection(appConnectionString))
            {
                conn.Open();
                return ReadSwitch(conn);
            }
        }

        /// <summary>Một bí mật ở dạng sẽ ghi vào database theo công tắc hiện tại.</summary>
        public static string ForStorage(string appConnectionString, string plain)
        {
            if (string.IsNullOrEmpty(plain)) return plain;
            return IsOn(appConnectionString) ? BaSecret.Protect(plain) : plain;
        }

        /// <summary>Payload của job ở dạng sẽ ghi vào database theo công tắc hiện tại.</summary>
        public static string PayloadForStorage(string appConnectionString, string payloadJson)
        {
            if (string.IsNullOrEmpty(payloadJson)) return payloadJson;
            return IsOn(appConnectionString) ? BaJobSecrets.Recode(payloadJson, true) : payloadJson;
        }

        /// <summary>Trạng thái công tắc và số giá trị đang lưu ở từng dạng. Một job tính là một giá trị, dù Payload của nó có mấy bí mật.</summary>
        public static BaSecretStatus Status(string appConnectionString)
        {
            using (var conn = new SqlConnection(appConnectionString))
            {
                conn.Open();
                var on = ReadSwitch(conn);
                var total = 0;
                var misplaced = 0;
                foreach (var source in Sources)
                {
                    var scan = Scan(conn, null, source, on);
                    total += scan.Total;
                    misplaced += scan.Misplaced.Count;
                }
                var inPlace = total - misplaced;
                return new BaSecretStatus
                {
                    On = on,
                    ProtectedCount = on ? inPlace : misplaced,
                    PlainCount = on ? misplaced : inPlace
                };
            }
        }

        /// <summary>
        /// Đặt công tắc và đổi mọi giá trị đang lưu sang dạng tương ứng, trong một transaction. Gọi lại với cùng trạng thái thì chỉ đổi phần còn sót.
        /// Chỉ bật khi mọi bản web và Worker dùng chung database đã là bản đọc được dạng mã hóa.
        /// </summary>
        public static BaSecretStatus Switch(string appConnectionString, bool on, int? userId)
        {
            using (var conn = new SqlConnection(appConnectionString))
            {
                conn.Open();
                if (on) RequireRoomForProtectedPasswords(conn);
                var total = 0;
                var changed = 0;
                using (var transaction = conn.BeginTransaction())
                {
                    SaveSwitch(conn, transaction, on, userId);
                    foreach (var source in Sources)
                    {
                        var scan = Scan(conn, transaction, source, on);
                        total += scan.Total;
                        foreach (var value in scan.Misplaced)
                        {
                            Write(conn, transaction, source, value);
                            changed++;
                        }
                    }
                    transaction.Commit();
                }
                return new BaSecretStatus
                {
                    On = on,
                    ProtectedCount = on ? total : 0,
                    PlainCount = on ? 0 : total,
                    ChangedCount = changed
                };
            }
        }

        private static bool ReadSwitch(SqlConnection conn)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT [Value] FROM BaAppSetting WHERE [Key] = @k";
                cmd.Parameters.AddWithValue("@k", SwitchKey);
                return string.Equals(cmd.ExecuteScalar() as string, "1", StringComparison.Ordinal);
            }
        }

        private static void SaveSwitch(SqlConnection conn, SqlTransaction transaction, bool on, int? userId)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM BaAppSetting WHERE [Key] = @k)
    UPDATE BaAppSetting SET [Value] = @v, UpdatedAt = SYSDATETIME(), UpdatedBy = @uid WHERE [Key] = @k;
ELSE
    INSERT INTO BaAppSetting ([Key], [Value], UpdatedAt, UpdatedBy) VALUES (@k, @v, SYSDATETIME(), @uid);";
                cmd.Parameters.AddWithValue("@k", SwitchKey);
                cmd.Parameters.AddWithValue("@v", on ? "1" : "0");
                cmd.Parameters.AddWithValue("@uid", (object)userId ?? DBNull.Value);
                cmd.ExecuteNonQuery();
            }
        }

        private static void RequireRoomForProtectedPasswords(SqlConnection conn)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT COL_LENGTH('dbo.BaDatabaseServer', 'Password')";
                var length = cmd.ExecuteScalar();
                if (length == null || length == DBNull.Value) return;
                var bytes = Convert.ToInt32(length);
                if (bytes == -1 || bytes >= ServerPasswordColumnLength * 2) return;
            }
            throw new InvalidOperationException("Cột BaDatabaseServer.Password chưa đủ rộng cho mật khẩu đã mã hóa: hãy chạy Scripts/AddStoredSecretEncryption.sql rồi bật lại.");
        }

        /// <summary>
        /// Đọc các giá trị của một nơi lưu và tìm giá trị chưa ở dạng mong muốn.
        /// Trong transaction thì giữ khóa cập nhật trên các dòng đã đọc, để giá trị người khác vừa lưu không bị ghi đè bằng bản cũ.
        /// </summary>
        private static SourceScan Scan(SqlConnection conn, SqlTransaction transaction, SecretSource source, bool on)
        {
            var scan = new SourceScan();
            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = "SELECT " + source.IdColumn + ", " + source.ValueColumn + " FROM " + source.Table
                    + (transaction == null ? "" : " WITH (UPDLOCK)")
                    + " WHERE " + source.Filter;
                using (var r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        if (r.IsDBNull(1)) continue;
                        scan.Total++;
                        var stored = r.GetString(1);
                        var wanted = source.HoldsJobPayload ? BaJobSecrets.Recode(stored, on) : BaSecret.Recode(stored, on);
                        if (string.Equals(wanted, stored, StringComparison.Ordinal)) continue;
                        scan.Misplaced.Add(new StoredValue { Id = r.GetValue(0), Wanted = wanted });
                    }
                }
            }
            return scan;
        }

        private static void Write(SqlConnection conn, SqlTransaction transaction, SecretSource source, StoredValue value)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = "UPDATE " + source.Table + " SET " + source.ValueColumn + " = @v WHERE " + source.IdColumn + " = @id";
                cmd.Parameters.AddWithValue("@v", value.Wanted);
                cmd.Parameters.AddWithValue("@id", value.Id);
                cmd.ExecuteNonQuery();
            }
        }
    }
}
