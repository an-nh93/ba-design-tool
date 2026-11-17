using System.Web.UI;
using System.Web.UI.WebControls;
using BADesign;

namespace BADesign
{
    public partial class BaSidebar : UserControl
    {
        /// <summary>Section hiện tại để tô active (Home, DatabaseSearch, EncryptDecrypt, AppSettings, PGPTool, Users, RolePermission, LeaveManager).</summary>
        public string ActiveSection { get; set; }

        public bool AllowAnonymous { get; set; }

        protected void Page_Load(object sender, System.EventArgs e)
        {
            if (!AllowAnonymous) UiAuthHelper.RequireLogin();
            var anonymous = UiAuthHelper.IsAnonymous;
            // Luôn áp dụng quyền theo DB mỗi request (không bỏ qua PostBack) để đồng bộ sau khi đổi Role/Permission.
            phNavEncryptDecrypt.Visible = UiAuthHelper.HasFeature("EncryptDecrypt");
            phNavLicenseKey.Visible = !anonymous && LicenseKeyAccess.IsAllowed();
            phNavPgpTool.Visible = anonymous || UiAuthHelper.HasFeature("PGPTool");
            phNavAppSettings.Visible = UiAuthHelper.HasFeature("Settings");
            lnkNavUIBuilder.Visible = UiAuthHelper.HasFeature("UIBuilder");
            lnkNavDatabaseSearch.Visible = anonymous || UiAuthHelper.HasFeature("DatabaseTools");
            lnkNavHRHelper.Visible = lnkNavDatabaseSearch.Visible;
            lnkNavFunctionQueue.Visible = UiAuthHelper.HasFeature("DatabaseTools");
            lnkNavHome.Visible = !anonymous;
            lnkNavDevShare.Visible = !anonymous;
            lnkNavFeedback.Visible = !anonymous;
            phNavSuperAdmin.Visible = UiAuthHelper.IsSuperAdmin;

            var templateAdmin = !anonymous && Helpers.UiTemplateLibrary.IsAdmin();
            phNavTemplateAdmin.Visible = templateAdmin;
            lnkNavTemplateRequests.Visible = !anonymous && (lnkNavUIBuilder.Visible || templateAdmin || Helpers.UiTemplateLibrary.IsApproverSomewhere());
            if (lnkNavTemplateRequests.Visible)
            {
                var todo = Helpers.UiTemplateLibrary.CountTodo();
                litTemplateTodo.Text = todo > 0 ? "<b class=\"ba-nav-badge\">" + todo + "</b>" : "";
            }
        }

        private static string ItemClass(bool active)
        {
            return active ? "ba-nav-item active" : "ba-nav-item";
        }

        protected override void OnPreRender(System.EventArgs e)
        {
            base.OnPreRender(e);
            var active = ActiveSection ?? "";
            lnkNavHome.CssClass = ItemClass(active == "HomeRole");
            lnkNavUIBuilder.CssClass = ItemClass(active == "Home");
            if (lnkNavTemplateRequests.Visible)
                lnkNavTemplateRequests.CssClass = ItemClass(active == "TemplateRequests");
            if (phNavTemplateAdmin.Visible)
            {
                lnkNavTemplateWorkflow.CssClass = ItemClass(active == "TemplateWorkflow");
                lnkNavHrModules.CssClass = ItemClass(active == "HrModules");
            }
            lnkNavDatabaseSearch.CssClass = ItemClass(active == "DatabaseTools" || active == "DatabaseSearch");
            lnkNavHRHelper.CssClass = ItemClass(active == "HRHelper");
            lnkNavFunctionQueue.CssClass = ItemClass(active == "FunctionQueue");
            lnkNavFeedback.CssClass = ItemClass(active == "Feedback");
            lnkNavDevShare.CssClass = ItemClass(active == "DevShare");
            if (phNavEncryptDecrypt.Visible)
                lnkNavEncryptDecrypt.CssClass = ItemClass(active == "EncryptDecrypt");
            if (phNavLicenseKey.Visible)
                lnkNavLicenseKey.CssClass = ItemClass(active == "LicenseKey");
            if (phNavAppSettings.Visible)
                lnkNavAppSettings.CssClass = ItemClass(active == "AppSettings");
            if (phNavPgpTool.Visible)
                lnkNavPgpTool.CssClass = ItemClass(active == "PGPTool");
            if (phNavSuperAdmin.Visible)
            {
                lnkNavUserManagement.CssClass = ItemClass(active == "Users");
                lnkNavRolePermission.CssClass = ItemClass(active == "RolePermission");
                lnkNavAuditLog.CssClass = ItemClass(active == "AuditLog");
                lnkNavServerMonitor.CssClass = ItemClass(active == "ServerMonitor");
                lnkNavFeedbackManage.CssClass = ItemClass(active == "FeedbackManage");
                lnkNavLeaveManager.CssClass = ItemClass(active == "LeaveManager");
            }
        }
    }
}
