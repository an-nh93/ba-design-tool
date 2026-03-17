using System;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class Register : Page
    {
        private const string Registration_AllowedEmailPatterns = "Registration_AllowedEmailPatterns";
        private const string Registration_NotificationMethod = "Registration_NotificationMethod";
        private const string Registration_NotifyEmails = "Registration_NotifyEmails";

        protected void Page_Load(object sender, EventArgs e)
        {
            if (Session["UiUserId"] != null)
            {
                Response.Redirect(VirtualPathUtility.ToAbsolute(UiAuthHelper.GetHomeUrlByRole() ?? "~/HomeRole"));
            }
        }

        private static bool EmailMatchesPattern(string email, string pattern)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(pattern))
                return false;
            var e = email.Trim().ToLowerInvariant();
            var p = pattern.Trim().ToLowerInvariant();
            if (p.StartsWith("*"))
            {
                var suffix = p.Substring(1).Trim();
                return e.EndsWith(suffix, StringComparison.OrdinalIgnoreCase);
            }
            return string.Equals(e, p, StringComparison.OrdinalIgnoreCase);
        }

        private static string[] LoadAllowedPatterns()
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT [Value] FROM BaAppSetting WHERE [Key] = @key";
                    cmd.Parameters.AddWithValue("@key", Registration_AllowedEmailPatterns);
                    conn.Open();
                    var obj = cmd.ExecuteScalar();
                    if (obj == null || obj == DBNull.Value) return new string[0];
                    var raw = obj.ToString();
                    if (string.IsNullOrWhiteSpace(raw)) return new string[0];
                    return raw.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Where(s => s.Length > 0).ToArray();
                }
            }
            catch { return new string[0]; }
        }

        /// <summary>Gửi thông báo user mới đăng ký: theo App Settings gửi Telegram hoặc Email tới danh sách cấu hình.</summary>
        private static void SendRegistrationNotification(string userName, string email, string roleName)
        {
            string method = "Email";
            string notifyEmails = "an.nh@cadena.com.sg";
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT [Key], [Value] FROM BaAppSetting WHERE [Key] IN (N'Registration_NotificationMethod', N'Registration_NotifyEmails')";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            var k = r.GetString(0);
                            var v = r.IsDBNull(1) ? null : r.GetString(1);
                            if (k == Registration_NotificationMethod) method = (v ?? "Email").Trim();
                            else if (k == Registration_NotifyEmails) notifyEmails = v ?? "an.nh@cadena.com.sg";
                        }
                    }
                }
            }
            catch { return; }
            if (string.Equals(method, "Telegram", StringComparison.OrdinalIgnoreCase))
            {
                try { TelegramHelper.SendNewUserNotification(userName, email, roleName); } catch { }
                return;
            }
            var subject = "[Cadena Helper] User mới đăng ký - " + (userName ?? "");
            var body = "Thông báo user mới đăng ký Cadena Helper.\r\n\r\n"
                + "Username: " + (userName ?? "") + "\r\n"
                + "Email: " + (email ?? "") + "\r\n"
                + "Phòng ban: " + (roleName ?? "-") + "\r\n"
                + "Thời gian: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm") + "\r\n\r\n"
                + "Vui lòng gán quyền cho user.";
            var toList = (notifyEmails ?? "an.nh@cadena.com.sg")
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrEmpty(s) && s.Contains("@"))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
            foreach (var to in toList)
            {
                try
                {
                    var err = EmailHelper.SendEmail(to, subject, body, false);
                    if (!string.IsNullOrEmpty(err))
                        try { AppLogger.Log("Register.SendRegistrationNotification to " + to + ": " + err); } catch { }
                }
                catch (Exception ex) { try { AppLogger.Log("Register.SendRegistrationNotification: " + ex.Message); } catch { } }
            }
        }

        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object CheckAvailability(string userName, string email)
        {
            try
            {
                userName = (userName ?? "").Trim();
                email = (email ?? "").Trim().ToLowerInvariant();
                bool userNameOk = true, emailOk = true;
                if (!string.IsNullOrEmpty(userName))
                {
                    using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT 1 FROM UiUser WHERE LOWER(RTRIM(UserName)) = LOWER(RTRIM(@u))";
                        cmd.Parameters.AddWithValue("@u", userName);
                        conn.Open();
                        userNameOk = cmd.ExecuteScalar() == null;
                    }
                }
                if (!string.IsNullOrEmpty(email))
                {
                    var emailRe = new System.Text.RegularExpressions.Regex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$");
                    if (emailRe.IsMatch(email))
                    {
                        using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT 1 FROM UiUser WHERE Email IS NOT NULL AND LOWER(RTRIM(Email)) = @e";
                            cmd.Parameters.AddWithValue("@e", email);
                            conn.Open();
                            emailOk = cmd.ExecuteScalar() == null;
                        }
                    }
                    else
                        emailOk = false;
                }
                return new { success = true, userNameAvailable = userNameOk, emailAvailable = emailOk };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object LoadRoles()
        {
            try
            {
                var roles = new System.Collections.Generic.List<object>();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT RoleId, Code, Name FROM UiRole ORDER BY RoleId";
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        while (r.Read())
                        {
                            roles.Add(new { id = r.GetInt32(0), code = r.GetString(1), name = r.IsDBNull(2) ? r.GetString(1) : r.GetString(2) });
                        }
                    }
                }
                return new { success = true, roles = roles };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }

        [WebMethod(EnableSession = false)]
        [ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public static object SubmitRegister(string userName, string email, string password, int roleId, int captchaA, int captchaB)
        {
            try
            {
                userName = (userName ?? "").Trim();
                email = (email ?? "").Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(userName))
                    return new { success = false, message = "Username không được để trống." };
                if (string.IsNullOrEmpty(email))
                    return new { success = false, message = "Email không được để trống." };
                if (string.IsNullOrEmpty(password))
                    return new { success = false, message = "Password không được để trống." };
                if (password.Length < 6)
                    return new { success = false, message = "Password tối thiểu 6 ký tự." };
                if (roleId <= 0)
                    return new { success = false, message = "Vui lòng chọn Phòng ban." };
                if (captchaA + captchaB < 2 || captchaA + captchaB > 18)
                    return new { success = false, message = "Captcha không hợp lệ. Vui lòng thử lại." };

                var patterns = LoadAllowedPatterns();
                if (patterns == null || patterns.Length == 0)
                    return new { success = false, message = "Domain email của bạn không được hỗ trợ. Vui lòng liên hệ quản trị viên." };

                if (!patterns.Any(p => EmailMatchesPattern(email, p)))
                    return new { success = false, message = "Email không thuộc domain được phép đăng ký. Vui lòng dùng email công ty." };

                var hash = UiAuthHelper.HashPassword(password);
                string roleName = null;
                int userId = 0;
                string otpCode = null;

                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                {
                    conn.Open();

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT 1 FROM UiUser WHERE LOWER(RTRIM(UserName)) = LOWER(RTRIM(@u))";
                        cmd.Parameters.AddWithValue("@u", userName);
                        if (cmd.ExecuteScalar() != null)
                            return new { success = false, message = "Username đã tồn tại." };
                    }

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT 1 FROM UiUser WHERE Email IS NOT NULL AND LOWER(RTRIM(Email)) = @e";
                        cmd.Parameters.AddWithValue("@e", email);
                        if (cmd.ExecuteScalar() != null)
                            return new { success = false, message = "Email đã được sử dụng." };
                    }

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT Name FROM UiRole WHERE RoleId = @rid";
                        cmd.Parameters.AddWithValue("@rid", roleId);
                        var r = cmd.ExecuteScalar();
                        if (r == null || r == DBNull.Value)
                            return new { success = false, message = "Phòng ban không hợp lệ." };
                        roleName = r.ToString();
                    }

                    // EmailVerified = 0: lần đầu đăng nhập sẽ phải nhập OTP gửi vào email
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = @"
INSERT INTO UiUser(UserName, PasswordHash, FullName, Email, IsSuperAdmin, IsActive, RoleId, EmailVerified)
OUTPUT INSERTED.UserId
VALUES (@u, @p, NULL, @e, 0, 1, NULL, 0);";
                        cmd.Parameters.AddWithValue("@u", userName);
                        cmd.Parameters.AddWithValue("@p", hash);
                        cmd.Parameters.AddWithValue("@e", email);
                        userId = (int)cmd.ExecuteScalar();
                    }

                    // OTP 6 số, hết hạn sau 60 phút
                    var rng = new System.Security.Cryptography.RNGCryptoServiceProvider();
                    var otpBytes = new byte[4];
                    rng.GetBytes(otpBytes);
                    int otpNum = (int)(BitConverter.ToUInt32(otpBytes, 0) % 1000000);
                    if (otpNum < 0) otpNum = -otpNum;
                    if (otpNum < 100000) otpNum += 100000;
                    otpCode = otpNum.ToString("D6");
                    var expiresAt = DateTime.UtcNow.AddMinutes(60);
                    using (var conn2 = new SqlConnection(UiAuthHelper.ConnStr))
                    using (var cmd = conn2.CreateCommand())
                    {
                        cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM UiUserOtp WHERE UserId = @uid) UPDATE UiUserOtp SET OtpCode = @otp, ExpiresAt = @exp WHERE UserId = @uid;
ELSE INSERT INTO UiUserOtp(UserId, OtpCode, ExpiresAt) VALUES (@uid, @otp, @exp);";
                        cmd.Parameters.AddWithValue("@uid", userId);
                        cmd.Parameters.AddWithValue("@otp", otpCode);
                        cmd.Parameters.AddWithValue("@exp", expiresAt);
                        conn2.Open();
                        cmd.ExecuteNonQuery();
                    }
                }

                SendRegistrationNotification(userName, email, roleName);

                var baseUrl = UiAuthHelper.GetBaseUrlForEmail();
                var loginUrl = baseUrl.TrimEnd('/') + "/Login";
                var loginUrlShort = loginUrl;
                if (loginUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    loginUrlShort = loginUrl.Substring(8);
                else if (loginUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                    loginUrlShort = loginUrl.Substring(7);
                var err = BADesign.EmailHelper.SendEmail(email,
                    "[Cadena Helper] Thông tin tài khoản đăng ký – xác thực email",
                    string.Format("Chào bạn,\n\nBạn đã đăng ký tài khoản Cadena Helper thành công.\n\nUsername: {0}\nPassword: {1}\n\nMã OTP xác thực email (6 số): {2}\nMã có hiệu lực 60 phút. Khi đăng nhập lần đầu, bạn sẽ được yêu cầu nhập mã OTP này.\n\nĐăng nhập tại - sao chép và dán vào trình duyệt:\n{3}\n\nTrân trọng,\nCadena Helper Team",
                        userName, password, otpCode, loginUrlShort));
                if (!string.IsNullOrEmpty(err))
                {
                    // Đăng ký thành công nhưng gửi email thất bại - vẫn trả success, chỉ log
                    try { BADesign.AppLogger.Log("Register.SendWelcomeEmail failed: " + err); } catch { }
                }

                return new { success = true, message = "Đăng ký thành công." };
            }
            catch (Exception ex)
            {
                return new { success = false, message = ex.Message };
            }
        }
    }
}
