using System;
using System.Web;
using Microsoft.AspNet.SignalR;

namespace BADesign.Hubs
{
    /// <summary>SignalR Hub để push thông báo restore/backup/HR theo user: Restore/Backup = group theo server, HR = group theo user làm.</summary>
    public class RestoreNotificationHub : Hub
    {
        public override System.Threading.Tasks.Task OnConnected()
        {
            try
            {
                var ctx = HttpContext.Current;
                var userId = ctx?.Session?["UiUserId"];
                var roleId = ctx?.Session?["UiRoleId"];
                if (userId != null)
                {
                    var uid = (int)userId;
                    Groups.Add(Context.ConnectionId, "user_" + uid);
                    var isSuperAdmin = (ctx.Session?["IsSuperAdmin"] as bool?) == true;
                    var hasManage = BADesign.UiAuthHelper.HasFeature("DatabaseManageServers");
                    var serverIds = BADesign.Helpers.ServerAccessHelper.GetAccessibleServerIds(
                        uid,
                        roleId as int?,
                        isSuperAdmin,
                        hasManage);
                    if (serverIds != null)
                    {
                        foreach (var sid in serverIds)
                            Groups.Add(Context.ConnectionId, "server_" + sid);
                    }
                    else
                        Groups.Add(Context.ConnectionId, "server_all");
                }
            }
            catch { /* Session có thể null với một số transport */ }
            return base.OnConnected();
        }

        public void NotifyRestoreJobsUpdated() { }
        public void NotifyBackupJobsUpdated() { }
    }
}
