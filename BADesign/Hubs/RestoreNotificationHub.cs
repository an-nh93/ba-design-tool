using Microsoft.AspNet.SignalR;

namespace BADesign.Hubs
{
    /// <summary>SignalR Hub để push thông báo restore xuống client. Client lắng nghe RestoreJobsUpdated để refresh badge/panel.</summary>
    public class RestoreNotificationHub : Hub
    {
        /// <summary>Gọi từ server (DatabaseSearch) khi có job restore thay đổi (progress hoặc completed). Client không gọi method này.</summary>
        public void NotifyRestoreJobsUpdated()
        {
            // Server gọi Clients.All.RestoreJobsUpdated() từ bên ngoài Hub (IHubContext). Method này chỉ để document.
        }
    }
}
