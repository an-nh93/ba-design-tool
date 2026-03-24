using System.Web.UI;
using System.Web.UI.WebControls;
using BADesign;

namespace BADesign
{
    public partial class BaSidebar : UserControl
    {
        /// <summary>Section hiện tại để tô active (Home, DatabaseSearch, EncryptDecrypt, AppSettings, PGPTool, Users, RolePermission, LeaveManager).</summary>
        public string ActiveSection { get; set; }

        protected void Page_Load(object sender, System.EventArgs e)
        {
            UiAuthHelper.RequireLogin();
            // Luôn áp dụng quyền theo DB mỗi request (không bỏ qua PostBack) để đồng bộ sau khi đổi Role/Permission.
            phNavEncryptDecrypt.Visible = UiAuthHelper.HasFeature("EncryptDecrypt");
            phNavPgpTool.Visible = UiAuthHelper.HasFeature("PGPTool");
            phNavAppSettings.Visible = UiAuthHelper.HasFeature("Settings");
            lnkNavUIBuilder.Visible = UiAuthHelper.HasFeature("UIBuilder");
            lnkNavDatabaseSearch.Visible = UiAuthHelper.HasFeature("DatabaseTools");
            lnkNavFunctionQueue.Visible = UiAuthHelper.HasFeature("DatabaseTools");
            phNavSuperAdmin.Visible = UiAuthHelper.IsSuperAdmin;
        }

        protected override void OnPreRender(System.EventArgs e)
        {
            base.OnPreRender(e);
            var active = ActiveSection ?? "";
            lnkNavHome.CssClass = (active == "HomeRole") ? "ba-nav-item active" : "ba-nav-item";
            lnkNavUIBuilder.CssClass = (active == "Home") ? "ba-nav-item active" : "ba-nav-item";
            lnkNavDatabaseSearch.CssClass = (active == "DatabaseTools") ? "ba-nav-item active" : "ba-nav-item";
            lnkNavFunctionQueue.CssClass = (active == "FunctionQueue") ? "ba-nav-item active" : "ba-nav-item";
            lnkNavFeedback.CssClass = (active == "Feedback") ? "ba-nav-item active" : "ba-nav-item";
            lnkNavDevShare.CssClass = (active == "DevShare") ? "ba-nav-item active" : "ba-nav-item";
            if (phNavEncryptDecrypt.Visible)
                lnkNavEncryptDecrypt.CssClass = (active == "EncryptDecrypt") ? "ba-nav-item active" : "ba-nav-item";
            if (phNavAppSettings.Visible)
                lnkNavAppSettings.CssClass = (active == "AppSettings") ? "ba-nav-item active" : "ba-nav-item";
            if (phNavPgpTool.Visible)
                lnkNavPgpTool.CssClass = (active == "PGPTool") ? "ba-nav-item active" : "ba-nav-item";
            if (phNavSuperAdmin.Visible)
            {
                lnkNavUserManagement.CssClass = (active == "Users") ? "ba-nav-item active" : "ba-nav-item";
                lnkNavRolePermission.CssClass = (active == "RolePermission") ? "ba-nav-item active" : "ba-nav-item";
                lnkNavAuditLog.CssClass = (active == "AuditLog") ? "ba-nav-item active" : "ba-nav-item";
                lnkNavFeedbackManage.CssClass = (active == "FeedbackManage") ? "ba-nav-item active" : "ba-nav-item";
                lnkNavLeaveManager.CssClass = (active == "LeaveManager") ? "ba-nav-item active" : "ba-nav-item";
            }
        }
    }
}
