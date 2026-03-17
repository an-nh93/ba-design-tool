using System;
using System.Data.SqlClient;
using System.Web;
using System.Web.Services;
using System.Web.Script.Services;
using BADesign;

namespace UiBuilderFull
{
	public partial class Login : System.Web.UI.Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			if (!IsPostBack)
			{
				// User bấm "Quay lại đăng nhập" trên màn OTP: xóa session OTP rồi redirect về form login
				if (Request.QueryString["clearOtp"] == "1")
				{
					Session.Remove("PendingOtpUserId");
					Session.Remove("PendingOtpUserName");
					Session.Remove("PendingOtpIsSuperAdmin");
					Session.Remove("PendingOtpRoleId");
					Session.Remove("PendingOtpRoleCode");
					Session.Remove("PendingOtpRememberMe");
					Response.Redirect(VirtualPathUtility.ToAbsolute("~/Login"));
					return;
				}
				if (Request.QueryString["logout"] == "1")
				{
					UiAuthHelper.ClearRememberMeCookie();
					Session.Clear();
					// Không redirect, hiển thị form login
				}
				else if (Session["UiUserId"] != null)
				{
					Response.Redirect(VirtualPathUtility.ToAbsolute(UiAuthHelper.GetHomeUrlByRole() ?? "~/HomeRole"));
					return;
				}
				else if (Session["PendingOtpUserId"] == null && Request.QueryString["otp"] != "1")
				{
					// Chỉ clear session khi không ở bước OTP (tránh xóa PendingOtp* khi user vừa được redirect tới ?otp=1)
					Session.Clear();
				}
				if (Request.QueryString["m"] == "ResetPwdSuccess" && phSuccess != null)
					phSuccess.Visible = true;

				// Hiển thị panel OTP khi user vừa đăng nhập đúng nhưng chưa xác thực email
				var showOtp = Request.QueryString["otp"] == "1" || Session["PendingOtpUserId"] != null;
				phOtpPanel.Visible = showOtp;
				phLoginPanel.Visible = !showOtp;
			}
		}

		protected void btnLogin_Click(object sender, EventArgs e)
		{
			var user = txtUser.Text.Trim();
			var pass = txtPass.Text;

			if (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
			{
				lblError.Text = "Vui lòng nhập user và password.";
				return;
			}

			var hash = UiAuthHelper.HashPassword(pass);
			var isEmail = user.Contains("@");

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = isEmail
					? @"
SELECT u.UserId, u.UserName, u.Email, u.IsSuperAdmin, u.IsActive, u.RoleId, r.Code AS RoleCode, ISNULL(u.EmailVerified, 1) AS EmailVerified
FROM UiUser u
LEFT JOIN UiRole r ON r.RoleId = u.RoleId
WHERE u.Email IS NOT NULL AND LOWER(RTRIM(u.Email)) = LOWER(@u) AND u.PasswordHash = @p"
					: @"
SELECT u.UserId, u.UserName, u.Email, u.IsSuperAdmin, u.IsActive, u.RoleId, r.Code AS RoleCode, ISNULL(u.EmailVerified, 1) AS EmailVerified
FROM UiUser u
LEFT JOIN UiRole r ON r.RoleId = u.RoleId
WHERE u.UserName = @u AND u.PasswordHash = @p";
				cmd.Parameters.AddWithValue("@u", user);
				cmd.Parameters.AddWithValue("@p", hash);

				conn.Open();
				using (var rd = cmd.ExecuteReader())
				{
					if (!rd.Read())
					{
						lblError.Text = "Sai user hoặc mật khẩu.";
						return;
					}

					if (!(bool)rd["IsActive"])
					{
						lblError.Text = "Tài khoản đã bị khóa.";
						return;
					}

					// Chỉ cho phép đăng nhập bằng email CADENA (*@cadena.com.sg, *@cadena-hrmseries.com, *@cadena-it.com). Super admin bỏ qua rule này.
					var isSuperAdmin = (bool)rd["IsSuperAdmin"];
					if (!isSuperAdmin)
					{
						var email = rd["Email"] as string;
						if (!UiAuthHelper.IsAllowedLoginEmail(email))
						{
							lblError.Text = "Chỉ tài khoản email CADENA (@cadena.com.sg, @cadena-hrmseries.com, @cadena-it.com) mới được đăng nhập.";
							return;
						}
					}

					var emailVerified = (bool)rd["EmailVerified"];
					if (!emailVerified)
					{
						// Chưa xác thực email: chuyển sang bước nhập OTP, không set session đăng nhập
						Session["PendingOtpUserId"] = (int)rd["UserId"];
						Session["PendingOtpUserName"] = (string)rd["UserName"];
						Session["PendingOtpIsSuperAdmin"] = (bool)rd["IsSuperAdmin"];
						Session["PendingOtpRoleId"] = rd["RoleId"] != DBNull.Value && rd["RoleId"] != null ? (object)(int)rd["RoleId"] : null;
						Session["PendingOtpRoleCode"] = rd["RoleCode"] != DBNull.Value && rd["RoleCode"] != null ? (rd["RoleCode"] as string) : null;
						Session["PendingOtpRememberMe"] = chkRemember.Checked;
						var qReturnUrl = Request.QueryString["returnUrl"];
						var redirect = "~/Login?otp=1";
						if (!string.IsNullOrEmpty(qReturnUrl) && qReturnUrl.StartsWith("/"))
							redirect += "&returnUrl=" + HttpUtility.UrlEncode(qReturnUrl);
						Response.Redirect(VirtualPathUtility.ToAbsolute(redirect));
						return;
					}

					Session["UiUserId"] = (int)rd["UserId"];
					Session["UiUserName"] = (string)rd["UserName"];
					Session["IsSuperAdmin"] = (bool)rd["IsSuperAdmin"];
					Session["UiRoleId"] = rd["RoleId"] != DBNull.Value && rd["RoleId"] != null ? (object)(int)rd["RoleId"] : null;
					Session["UiRoleCode"] = rd["RoleCode"] != DBNull.Value && rd["RoleCode"] != null ? (rd["RoleCode"] as string) : null;
				}
			}

			if (chkRemember.Checked)
				UiAuthHelper.SetRememberMeCookie((int)Session["UiUserId"]);

			var returnUrl = Request.QueryString["returnUrl"];
			if (!string.IsNullOrEmpty(returnUrl) && returnUrl.StartsWith("/"))
			{
				Response.Redirect(VirtualPathUtility.ToAbsolute(returnUrl));
			}
			else
			{
				// Redirect theo role
				var homeUrl = UiAuthHelper.GetHomeUrlByRole();
				Response.Redirect(homeUrl);
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object VerifyOtp(string otp, int captchaA, int captchaB)
		{
			try
			{
				var ctx = HttpContext.Current;
				if (ctx == null || ctx.Session == null)
					return new { success = false, message = "Phiên không hợp lệ." };
				var userIdObj = ctx.Session["PendingOtpUserId"];
				if (userIdObj == null)
					return new { success = false, message = "Phiên xác thực OTP đã hết. Vui lòng đăng nhập lại." };
				int userId = (int)userIdObj;
				otp = (otp ?? "").Trim();
				if (otp.Length != 6 || !System.Text.RegularExpressions.Regex.IsMatch(otp, @"^\d{6}$"))
					return new { success = false, message = "Mã OTP phải là 6 chữ số." };
				if (captchaA + captchaB < 2 || captchaA + captchaB > 18)
					return new { success = false, message = "Captcha không hợp lệ. Vui lòng thử lại." };

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
SELECT 1 FROM UiUserOtp WHERE UserId = @uid AND OtpCode = @otp AND ExpiresAt > GETUTCDATE()";
					cmd.Parameters.AddWithValue("@uid", userId);
					cmd.Parameters.AddWithValue("@otp", otp);
					conn.Open();
					if (cmd.ExecuteScalar() == null)
						return new { success = false, message = "Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra email hoặc đăng nhập lại để nhận mã mới." };
				}

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				{
					conn.Open();
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = "UPDATE UiUser SET EmailVerified = 1 WHERE UserId = @uid";
						cmd.Parameters.AddWithValue("@uid", userId);
						cmd.ExecuteNonQuery();
					}
					using (var cmd = conn.CreateCommand())
					{
						cmd.CommandText = "DELETE FROM UiUserOtp WHERE UserId = @uid";
						cmd.Parameters.AddWithValue("@uid", userId);
						cmd.ExecuteNonQuery();
					}
				}

				ctx.Session["UiUserId"] = ctx.Session["PendingOtpUserId"];
				ctx.Session["UiUserName"] = ctx.Session["PendingOtpUserName"];
				ctx.Session["IsSuperAdmin"] = ctx.Session["PendingOtpIsSuperAdmin"];
				ctx.Session["UiRoleId"] = ctx.Session["PendingOtpRoleId"];
				ctx.Session["UiRoleCode"] = ctx.Session["PendingOtpRoleCode"];
				var rememberMe = ctx.Session["PendingOtpRememberMe"] as bool?;
				ctx.Session.Remove("PendingOtpUserId");
				ctx.Session.Remove("PendingOtpUserName");
				ctx.Session.Remove("PendingOtpIsSuperAdmin");
				ctx.Session.Remove("PendingOtpRoleId");
				ctx.Session.Remove("PendingOtpRoleCode");
				ctx.Session.Remove("PendingOtpRememberMe");
				if (rememberMe == true)
					UiAuthHelper.SetRememberMeCookie((int)ctx.Session["UiUserId"]);

				var returnUrl = ctx.Request.QueryString["returnUrl"];
				var homeUrl = VirtualPathUtility.ToAbsolute(UiAuthHelper.GetHomeUrlByRole() ?? "~/HomeRole");
				if (!string.IsNullOrEmpty(returnUrl) && returnUrl.StartsWith("/"))
					return new { success = true, homeUrl = homeUrl, returnUrl = VirtualPathUtility.ToAbsolute(returnUrl) };
				return new { success = true, homeUrl = homeUrl, returnUrl = (string)null };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}
	}
}
