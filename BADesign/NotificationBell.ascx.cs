using System.Web.UI;

namespace BADesign
{
    public partial class NotificationBell : UserControl
    {
        /// <summary>Giám sát SQL (GetRestoreJobDiagnostics + UI) — chỉ Super Admin hoặc DatabaseManageServers.</summary>
        protected bool CanViewRestoreDiagnostics =>
            UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers");
    }
}
