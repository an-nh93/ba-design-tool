using System;
using System.Data.SqlClient;
using BADesign;
using System.Globalization;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers
{
    /// <summary>Gửi email cho người tạo job khi backup/restore xong (thành công hoặc thất bại).</summary>
    public static class BaJobEmailHelper
    {
        static readonly CultureInfo ViCulture = CultureInfo.GetCultureInfo("vi-VN");

        /// <summary>Chạy nền, không chặn luồng gọi.</summary>
        public static void NotifyBackupOrRestoreFinishedAsync(int jobId)
        {
            if (jobId <= 0) return;
            Task.Run(() => TrySendNotification(jobId));
        }

        static void TrySendNotification(int jobId)
        {
            try
            {
                string jobType = null, serverName = null, databaseName = null, status = null, message = null;
                string backupFileName = null, fileName = null, payloadJson = null, startedByUserName = null;
                DateTime? startTime = null, completedAt = null;
                string toEmail = null;

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
SELECT j.JobType, j.ServerName, j.DatabaseName, j.Status, j.Message, j.StartTime, j.CompletedAt,
       j.BackupFileName, j.FileName, j.Payload, j.StartedByUserName, LTRIM(RTRIM(u.Email)) AS Email
FROM BaJob j
LEFT JOIN UiUser u ON u.UserId = j.StartedByUserId
WHERE j.Id = @id";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (!r.Read()) return;
                        jobType = r.IsDBNull(0) ? null : r.GetString(0);
                        serverName = r.IsDBNull(1) ? null : r.GetString(1);
                        databaseName = r.IsDBNull(2) ? null : r.GetString(2);
                        status = r.IsDBNull(3) ? null : r.GetString(3);
                        message = r.IsDBNull(4) ? null : r.GetString(4);
                        startTime = r.IsDBNull(5) ? (DateTime?)null : r.GetDateTime(5);
                        completedAt = r.IsDBNull(6) ? (DateTime?)null : r.GetDateTime(6);
                        backupFileName = r.IsDBNull(7) ? null : r.GetString(7);
                        fileName = r.IsDBNull(8) ? null : r.GetString(8);
                        payloadJson = r.IsDBNull(9) ? null : r.GetString(9);
                        startedByUserName = r.IsDBNull(10) ? null : r.GetString(10);
                        toEmail = r.IsDBNull(11) ? null : r.GetString(11);
                    }
                }

                if (jobType != "Backup" && jobType != "Restore") return;
                if (status != "Completed" && status != "Failed") return;
                if (string.IsNullOrWhiteSpace(toEmail)) return;

                var kindVi = jobType == "Backup" ? "Backup Database" : "Restore Database";
                var ok = status == "Completed";
                var subject = string.Format(CultureInfo.InvariantCulture,
					"[HR Helper] {0} — {1}: {2}",
                    kindVi,
                    ok ? "Hoàn thành" : "Thất bại",
                    string.IsNullOrWhiteSpace(databaseName) ? "(database)" : databaseName.Trim());

                var sb = new StringBuilder();
                var srvDisp = string.IsNullOrWhiteSpace(serverName) ? "(không rõ)" : serverName.Trim();
                var dbDisp = string.IsNullOrWhiteSpace(databaseName) ? "(không rõ)" : databaseName.Trim();
                sb.AppendLine("Thông báo tác vụ Database — HR Helper");
                sb.AppendLine();
                if (ok)
                    sb.AppendLine(string.Format(ViCulture, "Tóm tắt: {0} cho database \"{1}\" trên server \"{2}\" đã hoàn thành lúc {3}.", kindVi, dbDisp, srvDisp, FormatDt(completedAt)));
                else
                    sb.AppendLine(string.Format(ViCulture, "Tóm tắt: {0} cho database \"{1}\" trên server \"{2}\" thất bại; kết thúc lúc {3}.", kindVi, dbDisp, srvDisp, FormatDt(completedAt)));
                sb.AppendLine(string.Format(ViCulture, "Thời gian: bắt đầu {0} — kết thúc {1}.", FormatDt(startTime), FormatDt(completedAt)));
                sb.AppendLine("Mã job (tham chiếu): #" + jobId.ToString(CultureInfo.InvariantCulture));
                sb.AppendLine();
                sb.AppendLine("- Loại: " + kindVi);
                if (!string.IsNullOrWhiteSpace(startedByUserName))
                    sb.AppendLine("- Người thực hiện: " + startedByUserName.Trim());
                sb.AppendLine("- Server: " + srvDisp);
                sb.AppendLine("- Database: " + dbDisp);
                if (jobType == "Backup" && !string.IsNullOrWhiteSpace(fileName))
                    sb.AppendLine("- File backup tạo ra: " + fileName.Trim());
                if (jobType == "Restore" && !string.IsNullOrWhiteSpace(backupFileName))
                    sb.AppendLine("- File backup nguồn: " + backupFileName.Trim());
                AppendMultiBackupFilesIfAny(sb, payloadJson);
                sb.AppendLine("- Thời điểm bắt đầu: " + FormatDt(startTime));
                sb.AppendLine("- Thời điểm kết thúc: " + FormatDt(completedAt));
                AppendDurationIfAny(sb, startTime, completedAt);
                sb.AppendLine("- Kết quả: " + (ok ? "Thành công" : "Thất bại"));
                if (!string.IsNullOrWhiteSpace(message))
                    sb.AppendLine("- Chi tiết (Message): " + message.Trim());
                if (string.Equals(jobType, "Backup", StringComparison.OrdinalIgnoreCase))
                    AppendBackupPayloadSection(sb, payloadJson);
                if (string.Equals(jobType, "Restore", StringComparison.OrdinalIgnoreCase))
                    AppendRestorePayloadSection(sb, payloadJson);
                sb.AppendLine();
                sb.AppendLine("HR Helper Team,");
				sb.AppendLine("Trân trọng");

				EmailHelper.SendEmail(toEmail.Trim(), subject, sb.ToString(), isHtml: false);
            }
            catch
            {
                /* không làm sập backup/restore */
            }
        }

        static void AppendMultiBackupFilesIfAny(StringBuilder sb, string payloadJson)
        {
            if (string.IsNullOrWhiteSpace(payloadJson)) return;
            try
            {
                var jo = JObject.Parse(payloadJson);
                var arr = jo["backupFileNames"] as JArray;
                if (arr == null || arr.Count < 2) return;
                var names = new StringBuilder();
                foreach (var t in arr)
                {
                    var s = (t != null ? t.ToString() : "").Trim();
                    if (s.Length > 0)
                    {
                        if (names.Length > 0) names.Append(", ");
                        names.Append(s);
                    }
                }
                if (names.Length > 0)
                    sb.AppendLine("- Các file backup nguồn: " + names);
            }
            catch { /* bỏ qua */ }
        }

        /// <summary>Giải thích tùy chọn restore và reset Employee (mã hóa) từ Payload; không gửi mật khẩu thật.</summary>
        static void AppendRestorePayloadSection(StringBuilder sb, string payloadJson)
        {
            sb.AppendLine();
            sb.AppendLine("--- Tùy chọn restore & reset ---");
            sb.AppendLine();
            if (string.IsNullOrWhiteSpace(payloadJson))
            {
                sb.AppendLine("- Không có Payload chi tiết (restore chạy trực tiếp trên web với tùy chọn cơ bản).");
                return;
            }

            JObject jo;
            try { jo = JObject.Parse(payloadJson); }
            catch
            {
                sb.AppendLine("- Payload không đọc được dạng JSON.");
                return;
            }

            var withReplace = JsonNullableBool(jo["withReplace"]);
            var withShrink = JsonNullableBool(jo["withShrinkLog"]);
            var withAutoReset = JsonNullableBool(jo["withAutoReset"]);
            var rec = (jo["recovery"] != null ? jo["recovery"].ToString() : "").Trim();
            if (rec.Length > 0)
                sb.AppendLine("- Chế độ recovery SQL (RESTORE ... WITH): " + DescribeRecoveryMode(rec));

            sb.AppendLine("- Ghi đè database đích (WITH REPLACE): " + TriStateVi(withReplace, "Có", "Không"));
            sb.AppendLine("- Shrink transaction log sau restore: " + TriStateVi(withShrink, "Có", "Không"));
            sb.AppendLine("- Auto-reset Employee sau restore: " + TriStateVi(withAutoReset, "Có", "Không"));

            if (withAutoReset == true)
            {
                sb.AppendLine();
                sb.AppendLine("Thông tin reset (chỉ mô tả, không gửi mật khẩu):");
                var em = (jo["emailForReset"] != null ? jo["emailForReset"].ToString() : "").Trim();
                var ph = (jo["phoneForReset"] != null ? jo["phoneForReset"].ToString() : "").Trim();
                var hasPw = jo["passwordForReset"] != null && !string.IsNullOrWhiteSpace(jo["passwordForReset"].ToString());
                sb.AppendLine("- Email pattern dùng khi reset: " + (em.Length > 0 ? em : "Mặc định hệ thống"));
                sb.AppendLine("- Số điện thoại dùng khi reset: " + (ph.Length > 0 ? ph : "Mặc định hệ thống"));
                sb.AppendLine("- Mật khẩu reset: " + (hasPw ? "Đã nhập khi khởi chạy restore (không hiển thị trong email)" : "Mặc định hệ thống"));
            }
            else if (withAutoReset == false)
            {
                sb.AppendLine("- Không chạy bước reset sau restore; database ở trạng thái sau lệnh RESTORE/SQL như đã cấu hình.");
            }

            var shrinkSt = (jo["shrinkFinalStatus"] != null ? jo["shrinkFinalStatus"].ToString() : "").Trim();
            if (shrinkSt.Length > 0)
            {
                sb.AppendLine();
                sb.AppendLine("Kết quả shrink log cuối (nếu có bật shrink):");
                sb.AppendLine("- Trạng thái: " + (string.Equals(shrinkSt, "success", StringComparison.OrdinalIgnoreCase) ? "Thành công" : "Thất bại / cảnh báo"));
                var sm = (jo["shrinkFinalMessage"] != null ? jo["shrinkFinalMessage"].ToString() : "").Trim();
                if (sm.Length > 0)
                    sb.AppendLine("- Ghi chú: " + sm);
                var sat = (jo["shrinkFinalAt"] != null ? jo["shrinkFinalAt"].ToString() : "").Trim();
                if (sat.Length > 0)
                    sb.AppendLine("- Thời điểm ghi nhận: " + sat);
            }
        }

        static string DescribeRecoveryMode(string rec)
        {
            if (string.Equals(rec, "NORECOVERY", StringComparison.OrdinalIgnoreCase))
                return "NORECOVERY (chuỗi restore nhiều bước)";
            if (string.Equals(rec, "STANDBY", StringComparison.OrdinalIgnoreCase))
                return "STANDBY (log shipping / đọc)";
            if (string.Equals(rec, "RECOVERY", StringComparison.OrdinalIgnoreCase))
                return "RECOVERY (mở database bình thường)";
            return rec;
        }

        /// <summary>Tùy chọn backup đã chọn lúc khởi chạy (đọc từ Payload).</summary>
        static void AppendBackupPayloadSection(StringBuilder sb, string payloadJson)
        {
            sb.AppendLine();
            sb.AppendLine("--- Tùy chọn backup ---");
            if (string.IsNullOrWhiteSpace(payloadJson))
            {
                sb.AppendLine("- Không lưu Payload chi tiết (job cũ hoặc phiên bản trước khi bổ sung).");
                return;
            }
            JObject jo;
            try { jo = JObject.Parse(payloadJson); }
            catch
            {
                sb.AppendLine("- Payload không đọc được dạng JSON.");
                return;
            }
            sb.AppendLine("- Nén backup (COMPRESSION): " + TriStateVi(JsonNullableBool(jo["compression"]), "Bật", "Tắt"));
            sb.AppendLine("- COPY_ONLY: " + TriStateVi(JsonNullableBool(jo["copyOnly"]), "Có", "Không"));
            sb.AppendLine("- CHECKSUM: " + TriStateVi(JsonNullableBool(jo["checksum"]), "Có", "Không"));
            sb.AppendLine("- Verify sau backup: " + TriStateVi(JsonNullableBool(jo["verifyBackup"]), "Có", "Không"));
            sb.AppendLine("- CONTINUE_AFTER_ERROR: " + TriStateVi(JsonNullableBool(jo["continueOnError"]), "Có", "Không"));
            sb.AppendLine("- Shrink log sau backup: " + TriStateVi(JsonNullableBool(jo["withShrinkLog"]), "Có", "Không"));
            var stripe = jo["stripeCount"];
            if (stripe != null && stripe.Type != JTokenType.Null)
                sb.AppendLine("- Số file stripe: " + (stripe.Type == JTokenType.Integer ? stripe.Value<int>().ToString(CultureInfo.InvariantCulture) : stripe.ToString()));
            var ed = (jo["expireDate"] != null ? jo["expireDate"].ToString() : "").Trim();
            if (ed.Length > 0)
                sb.AppendLine("- Hết hạn backup (EXPIREDATE): " + ed);
            else
            {
                var days = jo["expireDays"];
                if (days != null && days.Type == JTokenType.Integer && days.Value<int>() > 0)
                    sb.AppendLine("- Giữ backup (RETAINDAYS): " + days.Value<int>().ToString(CultureInfo.InvariantCulture) + " ngày");
            }
        }

        static bool? JsonNullableBool(JToken t)
        {
            if (t == null || t.Type == JTokenType.Null) return null;
            if (t.Type == JTokenType.Boolean) return t.Value<bool>();
            if (t.Type == JTokenType.Integer) return t.Value<int>() != 0;
            var s = (t.ToString() ?? "").Trim();
            if (string.Equals(s, "true", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(s, "false", StringComparison.OrdinalIgnoreCase)) return false;
            return null;
        }

        static string TriStateVi(bool? v, string yes, string no)
        {
            if (!v.HasValue) return "Không ghi trong Payload";
            return v.Value ? yes : no;
        }

        static void AppendDurationIfAny(StringBuilder sb, DateTime? start, DateTime? end)
        {
            if (!start.HasValue || !end.HasValue) return;
            var d = end.Value - start.Value;
            if (d.TotalSeconds < 0) return;
            sb.AppendLine("- Thời lượng (kết thúc - bắt đầu): " + FormatDuration(d));
        }

        static string FormatDuration(TimeSpan d)
        {
            if (d.TotalSeconds < 60)
                return string.Format(CultureInfo.InvariantCulture, "{0:F0} giây", d.TotalSeconds);
            if (d.TotalHours < 1)
                return string.Format(CultureInfo.InvariantCulture, "{0} phút {1} giây", (int)d.TotalMinutes, d.Seconds);
            return string.Format(CultureInfo.InvariantCulture, "{0} giờ {1} phút", (int)d.TotalHours, d.Minutes);
        }

        static string FormatDt(DateTime? dt)
        {
            if (!dt.HasValue) return "(không có)";
            return dt.Value.ToString("dd/MM/yyyy HH:mm:ss", ViCulture);
        }
    }
}
