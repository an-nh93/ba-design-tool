using System;
using System.Data.SqlClient;
using BADesign;

namespace UiBuilderFull
{
	public partial class Login : System.Web.UI.Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			if (!IsPostBack)
			{
				Session.Clear();
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
SELECT UserId, UserName, IsSuperAdmin, IsActive
FROM UiUser
WHERE UserName = @u AND PasswordHash = @p";
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

					Session["UiUserId"] = (int)rd["UserId"];
					Session["UiUserName"] = (string)rd["UserName"];
					Session["IsSuperAdmin"] = (bool)rd["IsSuperAdmin"];
				}
			}

			Response.Redirect("~/DesignerHome");
		}
	}
}
