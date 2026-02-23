using System;
using System.Data.SqlClient;
using System.Web;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class ChangePassword : Page
    {
        private bool IsResetByTokenMode
        {
            get
            {
                var token = GetQueryOrUrlParam("token");
                var code = GetQueryOrUrlParam("code");
                return !string.IsNullOrWhiteSpace(token) || !string.IsNullOrWhiteSpace(code);
            }
        }

        /// <summary>Lấy tham số từ QueryString; nếu rỗng (do routing/FriendlyUrls) thì parse từ RawUrl.</summary>
        private string GetQueryOrUrlParam(string key)
        {
            var v = Request.QueryString[key];
            if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
            var raw = Request.RawUrl;
            if (string.IsNullOrEmpty(raw)) return null;
            var q = key + "=";
            var i = raw.IndexOf(q, StringComparison.OrdinalIgnoreCase);
            if (i < 0) return null;
            i += q.Length;
            var end = raw.IndexOf('&', i);
            var val = end >= 0 ? raw.Substring(i, end - i) : raw.Substring(i);
            return string.IsNullOrEmpty(val) ? null : HttpUtility.UrlDecode(val);
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            if (IsResetByTokenMode)
            {
                phCurrentPassword.Visible = false;
                rfvCurrentPassword.Enabled = false;
                litTitle.Text = "Đặt lại mật khẩu";
                litSubtitle.Text = "Nhập mật khẩu mới cho tài khoản của bạn";
                lnkBack.NavigateUrl = ResolveUrl("~/Login");
                litSuccessTitle.Text = "Thành công! ";
                litSuccessMsg.Text = "Mật khẩu đã được đặt lại. Bạn sẽ được chuyển đến trang đăng nhập.";
            }
            else
            {
                UiAuthHelper.RequireLogin();
                phCurrentPassword.Visible = true;
                rfvCurrentPassword.Enabled = true;
                litTitle.Text = "Change Password";
                litSubtitle.Text = "Update your account password";
                lnkBack.NavigateUrl = ResolveUrl("~/Home");
            }

            if (!IsPostBack)
            {
                var message = Request.QueryString["m"];
                if (message == "ChangePwdSuccess")
                {
                    phSuccess.Visible = true;
                }
                else if (message == "ResetPwdSuccess")
                {
                    phSuccess.Visible = true;
                }
            }
        }

        protected void btnChangePassword_Click(object sender, EventArgs e)
        {
            phError.Visible = false;
            phSuccess.Visible = false;

            if (!Page.IsValid)
                return;

            int userId;
            if (IsResetByTokenMode)
            {
                var token = GetQueryOrUrlParam("token");
                var code = GetQueryOrUrlParam("code");
                if (!string.IsNullOrEmpty(code))
                    userId = ValidateShortCodeAndGetUserId(code);
                else if (!string.IsNullOrEmpty(token))
                    userId = ValidateTokenAndGetUserId(token);
                else
                    userId = 0;
                if (userId <= 0)
                {
                    litError.Text = "Link đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới từ trang Quên mật khẩu.";
                    phError.Visible = true;
                    return;
                }
            }
            else
            {
                userId = UiAuthHelper.GetCurrentUserIdOrThrow();
            }

            var newPassword = txtNewPassword.Text.Trim();
            var confirmPassword = txtConfirmPassword.Text.Trim();

            if (newPassword != confirmPassword)
            {
                litError.Text = "New password and confirmation do not match.";
                phError.Visible = true;
                return;
            }

            if (!IsResetByTokenMode)
            {
                var currentPassword = txtCurrentPassword.Text.Trim();
                var currentHash = UiAuthHelper.HashPassword(currentPassword);
                bool isValidPassword = false;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT PasswordHash FROM UiUser WHERE UserId = @id AND PasswordHash = @hash";
                    cmd.Parameters.AddWithValue("@id", userId);
                    cmd.Parameters.AddWithValue("@hash", currentHash);
                    conn.Open();
                    using (var rd = cmd.ExecuteReader())
                        isValidPassword = rd.Read();
                }
                if (!isValidPassword)
                {
                    litError.Text = "Current password is incorrect.";
                    phError.Visible = true;
                    return;
                }
            }

            // Update password
            var newHash = UiAuthHelper.HashPassword(newPassword);

            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
UPDATE UiUser 
SET PasswordHash = @hash
WHERE UserId = @id";
                cmd.Parameters.AddWithValue("@hash", newHash);
                cmd.Parameters.AddWithValue("@id", userId);

                conn.Open();
                cmd.ExecuteNonQuery();
            }

            if (IsResetByTokenMode)
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "DELETE FROM UiPasswordResetToken WHERE UserId = @uid";
                    cmd.Parameters.AddWithValue("@uid", userId);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
            }

            phSuccess.Visible = true;
            txtCurrentPassword.Text = "";
            txtNewPassword.Text = "";
            txtConfirmPassword.Text = "";

            if (IsResetByTokenMode)
                Response.AddHeader("REFRESH", "2;URL=" + ResolveUrl("~/Login") + "?m=ResetPwdSuccess");
            else
                Response.AddHeader("REFRESH", "2;URL=" + ResolveUrl("~/ChangePassword") + "?m=ChangePwdSuccess");
        }

        private static int ValidateTokenAndGetUserId(string token)
        {
            try
            {
                var nowUtc = DateTime.UtcNow;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT UserId FROM UiPasswordResetToken WHERE Token = @t AND ExpiresAt > @now";
                    cmd.Parameters.AddWithValue("@t", token);
                    cmd.Parameters.AddWithValue("@now", nowUtc);
                    conn.Open();
                    var obj = cmd.ExecuteScalar();
                    return obj != null && obj != DBNull.Value ? Convert.ToInt32(obj) : 0;
                }
            }
            catch { return 0; }
        }

        private static int ValidateShortCodeAndGetUserId(string code)
        {
            try
            {
                var nowUtc = DateTime.UtcNow;
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"SELECT UserId FROM UiPasswordResetToken WHERE ShortCode = @c AND ExpiresAt > @now";
                    cmd.Parameters.AddWithValue("@c", code);
                    cmd.Parameters.AddWithValue("@now", nowUtc);
                    conn.Open();
                    var obj = cmd.ExecuteScalar();
                    return obj != null && obj != DBNull.Value ? Convert.ToInt32(obj) : 0;
                }
            }
            catch { return 0; }
        }
    }
}
