using System;
using Microsoft.AspNet.SignalR;
using BADesign.Helpers;

namespace BADesign.Hubs
{
    /// <summary>SignalR Hub để push thông báo restore/backup/HR theo user: Restore/Backup = group theo server, HR = group theo user làm.</summary>
    public class RestoreNotificationHub : Hub
    {
        public override System.Threading.Tasks.Task OnConnected()
        {
            try
            {
                HubIdentity identity;
                if (HubAccessToken.TryRead(Context.QueryString["t"], DateTime.UtcNow, out identity))
                {
                    Groups.Add(Context.ConnectionId, "user_" + identity.UserId);
                    var serverIds = ServerAccessHelper.GetAccessibleServerIds(
                        identity.UserId,
                        identity.RoleId,
                        identity.IsSuperAdmin,
                        identity.CanManageServers);
                    if (serverIds != null)
                    {
                        foreach (var sid in serverIds)
                            Groups.Add(Context.ConnectionId, "server_" + sid);
                    }
                    else
                        Groups.Add(Context.ConnectionId, "server_all");
                }
            }
            catch { }
            return base.OnConnected();
        }

        public void NotifyRestoreJobsUpdated() { }
        public void NotifyBackupJobsUpdated() { }
    }
}
