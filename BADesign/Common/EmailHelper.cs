using System;
using System.Data.SqlClient;
using System.Net;
using System.Net.Mail;

namespace BADesign
{
    /// <summary>Helper gửi email dùng SMTP config trong BaAppSetting.</summary>
    public static class EmailHelper
    {
        private const string Key_Outgoing = "EmailServer_OutgoingServer";
        private const string Key_Port = "EmailServer_Port";
        private const string Key_AccountName = "EmailServer_AccountName";
        private const string Key_Username = "EmailServer_Username";
        private const string Key_EmailAddress = "EmailServer_EmailAddress";
        private const string Key_Password = "EmailServer_Password";
        private const string Key_EnableSSL = "EmailServer_EnableSSL";
        private const string Key_SSLPort = "EmailServer_SSLPort";

        /// <summary>Load SMTP config từ BaAppSetting. Trả về null nếu thiếu config.</summary>
        public static SmtpConfig LoadSmtpConfig()
        {
            try
            {
                string outgoing = null, port = null, accountName = null, username = null, emailAddress = null, password = null, sslPort = null;
                bool enableSSL = false;

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
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
                            if (k == Key_Outgoing) outgoing = v;
                            else if (k == Key_Port) port = v;
                            else if (k == Key_AccountName) accountName = v;
                            else if (k == Key_Username) username = v;
                            else if (k == Key_EmailAddress) emailAddress = v;
                            else if (k == Key_Password) password = v;
                            else if (k == Key_EnableSSL) enableSSL = (v == "1" || string.Equals(v, "true", StringComparison.OrdinalIgnoreCase));
                            else if (k == Key_SSLPort) sslPort = v;
                        }
                    }
                }

                if (string.IsNullOrWhiteSpace(outgoing))
                    return null;

                var from = !string.IsNullOrWhiteSpace(emailAddress) ? emailAddress.Trim() : (username ?? "").Trim();
                if (string.IsNullOrWhiteSpace(from))
                    return null;

                var portNum = 25;
                if (!string.IsNullOrWhiteSpace(port) && !int.TryParse(port.Trim(), out portNum))
                    portNum = 25;
                if (enableSSL && !string.IsNullOrWhiteSpace(sslPort))
                    int.TryParse(sslPort.Trim(), out portNum);

                return new SmtpConfig
                {
                    OutgoingServer = outgoing.Trim(),
                    Port = portNum,
                    AccountName = accountName ?? "BADesign",
                    Username = username ?? "",
                    Password = password ?? "",
                    EnableSSL = enableSSL,
                    FromEmail = from
                };
            }
            catch
            {
                return null;
            }
        }

        /// <summary>Gửi email. Trả về null nếu thành công, message lỗi nếu thất bại.</summary>
        public static string SendEmail(string to, string subject, string body, bool isHtml = false)
        {
            var cfg = LoadSmtpConfig();
            if (cfg == null)
                return "Chưa cấu hình SMTP trong App Settings.";

            try
            {
                using (var client = new SmtpClient(cfg.OutgoingServer, cfg.Port))
                {
                    client.EnableSsl = cfg.EnableSSL;
                    if (!string.IsNullOrWhiteSpace(cfg.Username) || !string.IsNullOrWhiteSpace(cfg.Password))
                        client.Credentials = new NetworkCredential(cfg.Username, cfg.Password);

                    var msg = new MailMessage
                    {
                        From = new MailAddress(cfg.FromEmail, cfg.AccountName),
                        Subject = subject,
                        Body = body,
                        IsBodyHtml = isHtml
                    };
                    msg.To.Add(to.Trim());
                    client.Send(msg);
                }
                return null;
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }

        public class SmtpConfig
        {
            public string OutgoingServer { get; set; }
            public int Port { get; set; }
            public string AccountName { get; set; }
            public string Username { get; set; }
            public string Password { get; set; }
            public bool EnableSSL { get; set; }
            public string FromEmail { get; set; }
        }
    }
}
