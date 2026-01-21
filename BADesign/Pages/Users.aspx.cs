using System;
using System.Data;
using System.Data.SqlClient;
using System.Web.Services;
using System.Web.Script.Services;
using System.Web.UI.WebControls;
using BADesign;

namespace UiBuilderFull.Admin
{
	public partial class Users : System.Web.UI.Page
	{
		protected void Page_Load(object sender, EventArgs e)
		{
			UiAuthHelper.RequireLogin();
			if (!UiAuthHelper.IsSuperAdmin)
			{
				Response.StatusCode = 403;
				Response.End();
			}

			if (!IsPostBack)
			{
				BindUsers();
			}
		}

		private void BindUsers()
		{
			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = "SELECT UserId, UserName, FullName, Email, IsSuperAdmin, IsActive FROM UiUser ORDER BY UserId";
				conn.Open();
				using (var da = new SqlDataAdapter(cmd))
				{
					var dt = new DataTable();
					da.Fill(dt);
					rpUsers.DataSource = dt;
					rpUsers.DataBind();
				}
			}
		}

		protected void btnAddUser_Click(object sender, EventArgs e)
		{
			var user = txtNewUser.Text.Trim();
			var pass = txtNewPass.Text;
			if (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
			{
				lblMsg.Text = "User và password không được trống.";
				return;
			}

			var hash = UiAuthHelper.HashPassword(pass);

			using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
			using (var cmd = conn.CreateCommand())
			{
				cmd.CommandText = @"
INSERT INTO UiUser(UserName, PasswordHash, FullName, Email, IsSuperAdmin)
VALUES (@u, @p, @f, @e, @sa);";
				cmd.Parameters.AddWithValue("@u", user);
				cmd.Parameters.AddWithValue("@p", hash);
				cmd.Parameters.AddWithValue("@f", txtNewFullName.Text.Trim());
				cmd.Parameters.AddWithValue("@e", txtNewEmail.Text.Trim());
				cmd.Parameters.AddWithValue("@sa", chkNewSuper.Checked);

				conn.Open();
				cmd.ExecuteNonQuery();
			}

			txtNewUser.Text = txtNewPass.Text = txtNewFullName.Text = txtNewEmail.Text = "";
			chkNewSuper.Checked = false;
			lblMsg.Text = "Đã thêm user.";
			BindUsers();
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ChangePassword(int userId, string newPassword)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				newPassword = newPassword ?? "";
				if (newPassword.Trim().Length < 1)
				{
					return new { success = false, message = "Password mới phải >= 1 ký tự!" };
				}

				string hash = UiAuthHelper.HashPassword(newPassword);

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "UPDATE UiUser SET PasswordHash=@p WHERE UserId=@id";
					cmd.Parameters.AddWithValue("@p", hash);
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, message = $"Đã đổi password cho User {userId}." };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ResetPassword(int userId)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				// Reset về "123456"
				string newPass = "123456";
				string hash = UiAuthHelper.HashPassword(newPass);

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = "UPDATE UiUser SET PasswordHash=@p WHERE UserId=@id";
					cmd.Parameters.AddWithValue("@p", hash);
					cmd.Parameters.AddWithValue("@id", userId);

					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, message = $"User {userId} password reset = 123456" };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}

		[WebMethod(EnableSession = true)]
		[ScriptMethod(ResponseFormat = ResponseFormat.Json)]
		public static object ToggleActive(int userId)
		{
			try
			{
				UiAuthHelper.RequireLogin();
				if (!UiAuthHelper.IsSuperAdmin)
				{
					return new { success = false, message = "Unauthorized." };
				}

				using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
				using (var cmd = conn.CreateCommand())
				{
					cmd.CommandText = @"
UPDATE UiUser SET IsActive = CASE WHEN IsActive=1 THEN 0 ELSE 1 END
WHERE UserId=@id";
					cmd.Parameters.AddWithValue("@id", userId);
					conn.Open();
					cmd.ExecuteNonQuery();
				}

				return new { success = true, message = "User status updated successfully." };
			}
			catch (Exception ex)
			{
				return new { success = false, message = ex.Message };
			}
		}
	}
}
