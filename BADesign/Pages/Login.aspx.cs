using System;
using System.Data.SqlClient;
using System.Web;
using BADesign;

namespace UiBuilderFull
{
	public partial class Login : System.Web.UI.Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			if (!IsPostBack)
			{
				if (Request.QueryString["logout"] == "1")
				{
					UiAuthHelper.ClearRememberMeCookie();
					Session.Clear();
					// Không redirect, hiển thị form login
				}
				else if (Session["UiUserId"] != null)
				{
					// Đã login (vd. từ Remember cookie) thì chuyển về trang chủ
					Response.Redirect(VirtualPathUtility.ToAbsolute(UiAuthHelper.GetHomeUrlByRole() ?? "~/HomeRole"));
					return;
				}
				else
				{
					Session.Clear();
				}
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

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
SELECT u.UserId, u.UserName, u.Email, u.IsSuperAdmin, u.IsActive, u.RoleId, r.Code AS RoleCode
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

					// Chỉ cho phép đăng nhập bằng email CADENA (*@cadena.com.sg, *@cadena-hrmseries.com, *@cadena-it.com)
					var email = rd["Email"] as string;
					if (!UiAuthHelper.IsAllowedLoginEmail(email))
					{
						lblError.Text = "Chỉ tài khoản email CADENA (@cadena.com.sg, @cadena-hrmseries.com, @cadena-it.com) mới được đăng nhập.";
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
	}
}
