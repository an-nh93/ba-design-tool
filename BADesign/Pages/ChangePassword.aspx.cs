using System;
using System.Data.SqlClient;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class ChangePassword : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();

            if (!IsPostBack)
            {
                // Check for success message
                var message = Request.QueryString["m"];
                if (message == "ChangePwdSuccess")
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

            var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
            var currentPassword = txtCurrentPassword.Text.Trim();
            var newPassword = txtNewPassword.Text.Trim();
            var confirmPassword = txtConfirmPassword.Text.Trim();

            // Validate passwords match
            if (newPassword != confirmPassword)
            {
                litError.Text = "New password and confirmation do not match.";
                phError.Visible = true;
                return;
            }

            // Verify current password
            var currentHash = UiAuthHelper.HashPassword(currentPassword);
            bool isValidPassword = false;

            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT PasswordHash
FROM UiUser
WHERE UserId = @id AND PasswordHash = @hash";
                cmd.Parameters.AddWithValue("@id", userId);
                cmd.Parameters.AddWithValue("@hash", currentHash);

                conn.Open();
                using (var rd = cmd.ExecuteReader())
                {
                    isValidPassword = rd.Read();
                }
            }

            if (!isValidPassword)
            {
                litError.Text = "Current password is incorrect.";
                phError.Visible = true;
                return;
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

            // Show success and redirect
            phSuccess.Visible = true;
            txtCurrentPassword.Text = "";
            txtNewPassword.Text = "";
            txtConfirmPassword.Text = "";

            // Redirect after 2 seconds
            Response.AddHeader("REFRESH", "2;URL=ChangePassword?m=ChangePwdSuccess");
        }
    }
}
