using System;
using System.Data.SqlClient;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using BADesign;

namespace BADesign
{
    public partial class BaTopBar : UserControl
    {
        /// <summary>Tiêu đề trang hiển thị trên header.</summary>
        public string PageTitle { get; set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            if (Page.IsPostBack) return;
            UiAuthHelper.RequireLogin();
            var roleCode = (UiAuthHelper.GetCurrentUserRoleCode() ?? "").Trim();
            var roleUpper = roleCode.Length > 0 ? roleCode.ToUpperInvariant() : "";
            var userName = (string)Page.Session["UiUserName"] ?? "";
            var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT AvatarPath FROM UiUser WHERE UserId = @id";
                cmd.Parameters.AddWithValue("@id", userId);
                conn.Open();
                var avatarPath = cmd.ExecuteScalar() as string;
                if (!string.IsNullOrEmpty(avatarPath))
                    litUserInitial.Text = $"<img src=\"{VirtualPathUtility.ToAbsolute(avatarPath)}\" style=\"width: 100%; height: 100%; object-fit: cover; border-radius: 50%;\" />";
                else if (!string.IsNullOrEmpty(userName))
                    litUserInitial.Text = userName.Substring(0, 1).ToUpper();
            }
            litUserName.Text = userName;
            var roleName = roleUpper == "DEV" ? "Developer" :
                (roleUpper == "CONS" ? "Consultant" :
                (roleUpper == "BA" ? "Business Analyst" : (roleCode.Length > 0 ? roleCode : "User")));
            litRoleBadge.Text = $"<span class=\"ba-role-badge\">{roleName}</span>";
            litRoleBadge.Visible = !string.IsNullOrEmpty(roleCode);
        }

        protected override void OnPreRender(EventArgs e)
        {
            base.OnPreRender(e);
            litPageTitle.Text = PageTitle ?? "";
        }
    }
}
