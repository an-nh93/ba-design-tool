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

        public bool AllowAnonymous { get; set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            var guest = AllowAnonymous && UiAuthHelper.IsAnonymous;
            ucNotificationBell.Visible = !guest;
            phUserMenu.Visible = !guest;
            phAccount.Visible = !guest;
            lnkLogin.Visible = guest;
            if (guest) return;
            if (Page.IsPostBack) return;
            UiAuthHelper.RequireLogin();
            var roleCode = (UiAuthHelper.GetCurrentUserRoleCode() ?? "").Trim();
            var roleUpper = roleCode.Length > 0 ? roleCode.ToUpperInvariant() : "";
            var userName = (string)Page.Session["UiUserName"] ?? "";
            var userId = UiAuthHelper.GetCurrentUserIdOrThrow();
            string dbRoleName = null;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT u.AvatarPath, r.Name FROM UiUser u LEFT JOIN UiRole r ON r.RoleId = u.RoleId WHERE u.UserId = @id";
                cmd.Parameters.AddWithValue("@id", userId);
                conn.Open();
                string avatarPath = null;
                using (var rd = cmd.ExecuteReader())
                {
                    if (rd.Read())
                    {
                        avatarPath = rd.IsDBNull(0) ? null : rd.GetString(0);
                        dbRoleName = rd.IsDBNull(1) ? null : rd.GetString(1);
                    }
                }
                if (!string.IsNullOrEmpty(avatarPath))
                    litUserInitial.Text = $"<img src=\"{VirtualPathUtility.ToAbsolute(avatarPath)}\" style=\"width: 100%; height: 100%; object-fit: cover; border-radius: 50%;\" />";
                else if (!string.IsNullOrEmpty(userName))
                    litUserInitial.Text = userName.Substring(0, 1).ToUpper();
            }
            litUserName.Text = userName;
            var roleName = roleUpper == "DEV" ? "Developer" :
                (roleUpper == "CONS" ? "Consultant" :
                (roleUpper == "BA" ? "Business Analyst" : (roleCode.Length > 0 ? roleCode : "User")));
            if (!string.IsNullOrWhiteSpace(dbRoleName)) roleName = dbRoleName.Trim();
            litRoleBadge.Text = $"<span class=\"ba-role-badge\">{HttpUtility.HtmlEncode(roleName)}</span>";
            litRoleBadge.Visible = !string.IsNullOrEmpty(roleCode);
        }

        protected override void OnPreRender(EventArgs e)
        {
            base.OnPreRender(e);
            litPageTitle.Text = PageTitle ?? "";
        }
    }
}
