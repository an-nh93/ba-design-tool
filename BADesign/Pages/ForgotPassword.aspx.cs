using System;
using System.Data.SqlClient;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class ForgotPassword : Page
    {

        protected void Page_Load(object sender, EventArgs e)
        {
            if (Session["UiUserId"] != null)
            {
                Response.Redirect(VirtualPathUtility.ToAbsolute(UiAuthHelper.GetHomeUrlByRole() ?? "~/HomeRole"));
            }
        }

        private static string GenerateToken()
        {
            var bytes = new byte[32];
            using (var rng = new RNGCryptoServiceProvider())
                rng.GetBytes(bytes);
            return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        }
        private static string GenerateShortCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var bytes = new byte[16];
            using (var rng = new RNGCryptoServiceProvider())
                rng.GetBytes(bytes);
            var sb = new System.Text.StringBuilder(16);
            for (int i = 0; i < 16; i++) sb.Append(chars[bytes[i] % chars.Length]);
            return sb.ToString();
        }

        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object RequestReset(string userOrEmail, int captchaA, int captchaB)
        {
            try
            {
                userOrEmail = (userOrEmail ?? "").Trim();
                if (string.IsNullOrEmpty(userOrEmail))
                    return new { success = false, message = "Vui lòng nhập Username hoặc Email." };
                if (captchaA + captchaB < 2 || captchaA + captchaB > 18)
                    return new { success = false, message = "Captcha không hợp lệ. Vui lòng thử lại." };

                int? userId = null;
                string email = null;
                string userName = null;

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        var input = userOrEmail.Trim().ToLowerInvariant();
                        var looksLikeEmail = input.Contains("@");
                        cmd.CommandText = looksLikeEmail
                            ? @"SELECT UserId, UserName, Email FROM UiUser WHERE Email IS NOT NULL AND LOWER(RTRIM(Email)) = @input AND IsActive = 1"
                            : @"SELECT UserId, UserName, Email FROM UiUser WHERE LOWER(RTRIM(UserName)) = @input AND IsActive = 1";
                        cmd.Parameters.AddWithValue("@input", input);
                        using (var rd = cmd.ExecuteReader())
                        {
                            if (rd.Read())
                            {
                                userId = rd.GetInt32(0);
                                userName = rd.IsDBNull(1) ? null : rd.GetString(1);
                                email = rd.IsDBNull(2) ? null : rd.GetString(2);
                            }
                        }
                    }
                }

                if (!userId.HasValue || string.IsNullOrWhiteSpace(email))
                {
                    return new { success = false, message = "Tài khoản không tồn tại." };
                }

                // Tránh spam: nếu đã gửi link cho user này trong 10 phút gần đây thì không gửi lại
                using (var connCheck = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmdCheck = connCheck.CreateCommand())
                {
                    cmdCheck.CommandText = "SELECT 1 FROM UiPasswordResetToken WHERE UserId = @uid AND CreatedAt > DATEADD(MINUTE, -10, SYSDATETIME())";
                    cmdCheck.Parameters.AddWithValue("@uid", userId.Value);
                    connCheck.Open();
                    if (cmdCheck.ExecuteScalar() != null)
                    {
                        return new { success = true, message = "Đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư. Nếu chưa nhận được, đợi 10 phút rồi thử lại." };
                    }
                }

                var token = GenerateToken();
                var shortCode = GenerateShortCode();
                var expiresAt = DateTime.UtcNow.AddHours(1);

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"
DELETE FROM UiPasswordResetToken WHERE UserId = @uid;
INSERT INTO UiPasswordResetToken (Token, ShortCode, UserId, ExpiresAt) VALUES (@token, @code, @uid, @exp);";
                        cmd.Parameters.AddWithValue("@token", token);
                        cmd.Parameters.AddWithValue("@code", shortCode);
                        cmd.Parameters.AddWithValue("@uid", userId.Value);
                        cmd.Parameters.AddWithValue("@exp", expiresAt);
                        cmd.ExecuteNonQuery();
                    }
                }

                var baseUrl = UiAuthHelper.GetBaseUrlForEmail().TrimEnd('/');
                // Bỏ protocol (http/https) để Outlook không biến thành link clickable -> Safe Links sẽ không wrap -> tránh mất ?code= khi redirect
                var urlWithoutProtocol = baseUrl;
                if (urlWithoutProtocol.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    urlWithoutProtocol = urlWithoutProtocol.Substring(8);
                else if (urlWithoutProtocol.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                    urlWithoutProtocol = urlWithoutProtocol.Substring(7);
                var resetLink = urlWithoutProtocol + "/ChangePassword?code=" + shortCode;
                var body = string.Format(
                    "Chào {0},\n\nBạn đã yêu cầu đặt lại mật khẩu tại Cadena Helper.\n\n" +
                    "Sao chép link sau và dán vào trình duyệt (thêm http:// hoặc https:// ở đầu). Không click trực tiếp vì Outlook Safe Links có thể làm mất tham số. Link có hiệu lực 1 giờ:\n\n{1}\n\n" +
                    "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\nTrân trọng,\nCadena Helper Team",
                    userName ?? "bạn", resetLink);

                var err = BADesign.EmailHelper.SendEmail(email,
                    "[Cadena Helper] Đặt lại mật khẩu",
                    body);
                if (!string.IsNullOrEmpty(err))
                {
                    try { BADesign.AppLogger.Log("ForgotPassword.SendResetEmail failed: " + err); } catch { }
                }

                return new { success = true, message = "Đã gửi email hướng dẫn đặt lại mật khẩu." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }
    }
}
