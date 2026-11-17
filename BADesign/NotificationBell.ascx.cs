using System;
using System.Web.UI;
using BADesign.Helpers;

namespace BADesign
{
    public partial class NotificationBell : UserControl
    {
        /// <summary>Giám sát SQL (GetRestoreJobDiagnostics + UI) — chỉ Super Admin hoặc DatabaseManageServers.</summary>
        protected bool CanViewRestoreDiagnostics =>
            UiAuthHelper.IsSuperAdmin || UiAuthHelper.HasFeature("DatabaseManageServers");

        protected string HubToken
        {
            get
            {
                var userId = UiAuthHelper.CurrentUserId;
                if (!userId.HasValue) return "";
                return HubAccessToken.Create(new HubIdentity
                {
                    UserId = userId.Value,
                    RoleId = UiAuthHelper.GetCurrentUserRoleId(),
                    IsSuperAdmin = UiAuthHelper.IsSuperAdmin,
                    CanManageServers = UiAuthHelper.HasFeature("DatabaseManageServers")
                }, DateTime.UtcNow);
            }
        }
    }
}
