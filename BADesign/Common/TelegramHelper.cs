using System;
using System.Data.SqlClient;
using System.Net;
using System.Text;

namespace BADesign
{
    /// <summary>Gửi thông báo Telegram qua Bot API. Config lưu trong BaAppSetting (Telegram_BotToken, Telegram_ChatId).</summary>
    public static class TelegramHelper
    {
        private const string Key_BotToken = "Telegram_BotToken";
        private const string Key_ChatId = "Telegram_ChatId";

        private static void LoadConfig(out string botToken, out string chatId)
        {
            botToken = "";
            chatId = "";
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT [Key], [Value] FROM BaAppSetting WHERE [Key] IN (N'Telegram_BotToken', N'Telegram_ChatId')";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var k = r.GetString(0);
                            var v = r.IsDBNull(1) ? "" : (r.GetString(1) ?? "").Trim();
                            if (k == Key_BotToken) botToken = v;
                            else if (k == Key_ChatId) chatId = v;
                        }
                    }
                }
            }
            catch { }
        }

        /// <summary>Gửi tin nhắn thông báo bug mới (tiêu đề) cho Super Admin. Trả về true nếu gửi thành công.</summary>
        public static bool SendBugNotification(string title)
        {
            string botToken;
            string chatId;
            LoadConfig(out botToken, out chatId);
            if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId))
                return false;

            var msg = "🐛 <b>Bug mới (Cadena Helper)</b>\n\n";
            msg += "📌 " + EscapeHtml(title ?? "(Không có tiêu đề)") + "\n";
            msg += "🕐 " + DateTime.Now.ToString("yyyy-MM-dd HH:mm");

            return SendMessage(botToken, chatId, msg);
        }

        /// <summary>Gửi tin nhắn thông báo user mới đăng ký. Trả về true nếu gửi thành công.</summary>
        public static bool SendNewUserNotification(string userName, string email, string roleName)
        {
            string botToken;
            string chatId;
            LoadConfig(out botToken, out chatId);
            if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId))
                return false;

            var msg = "🆕 <b>User mới đăng ký Cadena Helper</b>\n\n";
            msg += "👤 <b>Username:</b> " + EscapeHtml(userName) + "\n";
            msg += "📧 <b>Email:</b> " + EscapeHtml(email) + "\n";
            msg += "🏢 <b>Phòng ban (chọn khi đăng ký):</b> " + EscapeHtml(roleName ?? "-") + "\n";
            msg += "🕐 <b>Thời gian:</b> " + DateTime.Now.ToString("yyyy-MM-dd HH:mm") + "\n\n";
            msg += "<i>Vui lòng gán quyền cho user.</i>";

            return SendMessage(botToken, chatId, msg);
        }

        private static string EscapeHtml(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s
                .Replace("&", "&amp;")
                .Replace("<", "&lt;")
                .Replace(">", "&gt;");
        }

        /// <summary>Gửi tin nhắn tới Telegram. Trả về true nếu thành công.</summary>
        public static bool SendMessage(string botToken, string chatId, string text, string parseMode = "HTML")
        {
            if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId))
                return false;

            var ids = NormalizeChatId(chatId.Trim());
            foreach (var tryId in ids)
            {
                if (SendMessageToChatId(botToken, tryId, text, parseMode))
                    return true;
            }
            return false;
        }

        private static string[] NormalizeChatId(string chatId)
        {
            var numeric = chatId.TrimStart('-');
            if (string.IsNullOrEmpty(numeric) || !IsDigitsOnly(numeric))
                return new[] { chatId };
            if (chatId.StartsWith("-"))
                return new[] { chatId };
            return new[] { "-100" + numeric, "-" + numeric, numeric };
        }

        private static bool IsDigitsOnly(string s)
        {
            foreach (var c in s) if (c < '0' || c > '9') return false;
            return true;
        }

        private static bool SendMessageToChatId(string botToken, string chatId, string text, string parseMode)
        {
            try
            {
                var url = "https://api.telegram.org/bot" + Uri.EscapeDataString(botToken) + "/sendMessage"
                    + "?chat_id=" + Uri.EscapeDataString(chatId)
                    + "&text=" + Uri.EscapeDataString(text)
                    + "&parse_mode=" + Uri.EscapeDataString(parseMode)
                    + "&disable_web_page_preview=true";

                using (var wc = new WebClient { Encoding = Encoding.UTF8 })
                {
                    wc.Headers[HttpRequestHeader.UserAgent] = "BADesign/1.0";
                    var result = wc.DownloadString(url);
                    var ok = result.Contains("\"ok\":true");
                    if (!ok)
                        try { BADesign.AppLogger.Log("TelegramHelper: sendMessage failed. Response: " + result); } catch { }
                    return ok;
                }
            }
            catch (Exception ex)
            {
                try { BADesign.AppLogger.Log("TelegramHelper: sendMessage error. " + ex.Message); } catch { }
                return false;
            }
        }
    }
}
