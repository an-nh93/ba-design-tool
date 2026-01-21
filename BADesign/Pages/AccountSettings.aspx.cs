using System;
using System.Data.SqlClient;
using System.Web.UI;
using BADesign;

namespace BADesign.Pages
{
    public partial class AccountSettings : Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            UiAuthHelper.RequireLogin();

            if (!IsPostBack)
            {
                LoadUserInfo();
            }
        }

        private void LoadUserInfo()
        {
            var userId = UiAuthHelper.GetCurrentUserIdOrThrow();

            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
SELECT UserId, UserName, ISNULL(FullName, '') AS FullName, 
       ISNULL(Email, '') AS Email, IsSuperAdmin, IsActive
FROM UiUser
WHERE UserId = @id";
                cmd.Parameters.AddWithValue("@id", userId);

                conn.Open();
                using (var rd = cmd.ExecuteReader())
                {
                    if (rd.Read())
                    {
                        litUserId.Text = rd["UserId"].ToString();
                        litUserName.Text = rd["UserName"].ToString();
                        litFullName.Text = string.IsNullOrEmpty(rd["FullName"].ToString()) 
                            ? "<em>Not set</em>" 
                            : rd["FullName"].ToString();
                        litEmail.Text = string.IsNullOrEmpty(rd["Email"].ToString()) 
                            ? "<em>Not set</em>" 
                            : rd["Email"].ToString();
                        
                        var isSuperAdmin = (bool)rd["IsSuperAdmin"];
                        litRole.Text = isSuperAdmin 
                            ? "<span class='badge badge-success'>Super Admin</span>" 
                            : "<span class='badge badge-default'>User</span>";
                        
                        var isActive = (bool)rd["IsActive"];
                        litStatus.Text = isActive 
                            ? "<span class='badge badge-success'>Active</span>" 
                            : "<span class='badge badge-danger'>Inactive</span>";
                    }
                }
            }
        }
    }
}
