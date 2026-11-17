using System;
using Microsoft.AspNet.SignalR;
using BADesign.Hubs;

namespace BADesign.Helpers
{
    /// <summary>Gửi SignalR push theo nghiệp vụ: Restore/Backup = user có quyền server mới nhận; HR Helper = chỉ user làm mới nhận.</summary>
    public static class BaJobHubHelper
    {
        /// <summary>Báo client refresh chuông: Restore/Backup = push tới group server (user có quyền server đó); HR Helper = push tới user làm.</summary>
        /// <param name="jobType">Restore, Backup, HRHelperUpdateUser, HRHelperUpdateEmployee, HRHelperUpdateOther, HRHelperMultiDbAnalyze</param>
        /// <param name="serverId">Cho Restore/Backup: server của job.</param>
        /// <param name="startedByUserId">Cho HR Helper: user thực hiện job.</param>
        public static void PushJobsUpdated(string jobType = null, int? serverId = null, int? startedByUserId = null)
        {
            try
            {
                var ctx = GlobalHost.ConnectionManager.GetHubContext<RestoreNotificationHub>();
                if (ctx == null) return;
                if (!string.IsNullOrEmpty(jobType) && (jobType.Equals("HRHelperUpdateUser", StringComparison.OrdinalIgnoreCase) || jobType.Equals("HRHelperUpdateUserSignature", StringComparison.OrdinalIgnoreCase) || jobType.Equals("HRHelperUpdateEmployee", StringComparison.OrdinalIgnoreCase) || jobType.Equals("HRHelperUpdateOther", StringComparison.OrdinalIgnoreCase) || jobType.Equals("HRHelperMultiDbAnalyze", StringComparison.OrdinalIgnoreCase) || jobType.Equals("HRHelperMultiDbReset", StringComparison.OrdinalIgnoreCase) || jobType.Equals("HRHelperDeleteEmployee", StringComparison.OrdinalIgnoreCase)))
                {
                    // Gửi All để client chắc chắn nhận (Session thường null khi SignalR OnConnected nên connection có thể không vào group user_X). Client gọi GetMyRunningHRHelperJobs và chỉ user có job mới đóng overlay.
                    ctx.Clients.All.jobsUpdated();
                }
                else if (!string.IsNullOrEmpty(jobType) && (jobType.Equals("Restore", StringComparison.OrdinalIgnoreCase) || jobType.Equals("Backup", StringComparison.OrdinalIgnoreCase)) && serverId.HasValue)
                {
                    ctx.Clients.Group("server_" + serverId.Value).jobsUpdated();
                    ctx.Clients.Group("server_all").jobsUpdated();
                }
                else
                    ctx.Clients.All.jobsUpdated();
            }
            catch { /* SignalR chưa map hoặc lỗi */ }
        }

        public static void PushJobProgress(JobProgressInfo info)
        {
            if (info == null || info.Id <= 0) return;
            try
            {
                var ctx = GlobalHost.ConnectionManager.GetHubContext<RestoreNotificationHub>();
                if (ctx == null) return;
                var payload = new
                {
                    id = info.Id,
                    jobType = info.JobType,
                    status = info.Status,
                    percent = info.Percent,
                    message = info.Message,
                    detail = info.Detail,
                    elapsed = info.ElapsedSeconds
                };
                var serverJob = info.ServerId.HasValue
                    && (string.Equals(info.JobType, "Restore", StringComparison.OrdinalIgnoreCase) || string.Equals(info.JobType, "Backup", StringComparison.OrdinalIgnoreCase));
                if (serverJob)
                {
                    ctx.Clients.Group("server_" + info.ServerId.Value).jobProgress(payload);
                    ctx.Clients.Group("server_all").jobProgress(payload);
                }
                else
                    ctx.Clients.All.jobProgress(payload);
            }
            catch { }
        }
    }
}
