using System;
using System.Data;
using System.Data.SqlClient;
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
					gvUsers.DataSource = dt;
					gvUsers.DataBind();
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

		protected void gvUsers_RowCommand(object sender, GridViewCommandEventArgs e)
		{
			int index = Convert.ToInt32(e.CommandArgument);
			int userId = (int)gvUsers.DataKeys[index].Value;

			if (e.CommandName == "ChangePwd")
			{
				// lấy password từ textbox trong row
				var row = gvUsers.Rows[index];
				var txt = row.FindControl("txtRowNewPass") as TextBox;
				var newPass = txt != null ? txt.Text : "";

				ChangePassword(userId, newPass);

				// clear textbox sau khi đổi
				if (txt != null) txt.Text = "";
			}
			else if (e.CommandName == "ResetPwd")
			{
				ResetPassword(userId);
			}
			else if (e.CommandName == "ToggleActive")
			{
				ToggleActive(userId);
			}

			BindUsers();
		}

		private void ChangePassword(int userId, string newPass)
		{
			newPass = newPass ?? "";
			if (newPass.Trim().Length < 1)
			{
				lblMsg.Text = "Password mới phải >= 1 ký tự!";
				return;
			}


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

			lblMsg.Text = $"Đã đổi password cho User {userId}.";
		}



		private void ResetPassword(int userId)
		{
			// Ở demo: reset về "123456"
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

			lblMsg.Text = $"User {userId} password reset = 123456";
		}

		private void ToggleActive(int userId)
		{
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
		}
	}
}
