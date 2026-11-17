using System;
using System.Web;
using System.Data.SqlClient;
using BADesign;
using BADesign.Helpers;

namespace BADesign.Handlers
{
    /// <summary>Worker gọi sau mỗi lần cập nhật BaJob (%, completed, failed). Đọc job từ DB rồi trigger SignalR push để mọi client nhận realtime.</summary>
    public class NotifyJobProgress : IHttpHandler
    {
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, long> LastPush = new System.Collections.Concurrent.ConcurrentDictionary<int, long>();
        private static readonly long MinPushGapTicks = TimeSpan.FromMilliseconds(300).Ticks;

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json";
            try
            {
                string jobIdStr = context.Request["jobId"];
                if (string.IsNullOrEmpty(jobIdStr))
                {
                    context.Response.Write("{\"ok\":false,\"message\":\"Missing or invalid jobId\"}");
                    return;
                }
                int jobId;
                if (!int.TryParse(jobIdStr, out jobId) || jobId <= 0)
                {
                    context.Response.Write("{\"ok\":false,\"message\":\"Missing or invalid jobId\"}");
                    return;
                }

                var info = BaJobProgress.Read(jobId);
                if (info == null)
                {
                    context.Response.Write("{\"ok\":false,\"message\":\"Missing or invalid jobId\"}");
                    return;
                }
                var running = string.Equals(info.Status, "Running", StringComparison.OrdinalIgnoreCase);
                var now = DateTime.UtcNow.Ticks;
                long last;
                var known = LastPush.TryGetValue(jobId, out last);
                var tooSoon = running && known && now - last < MinPushGapTicks;
                if (!tooSoon)
                {
                    LastPush[jobId] = now;
                    if (running)
                    {
                        if (!known) BaJobHubHelper.PushJobsUpdated(info.JobType, info.ServerId, info.UserId);
                        BaJobHubHelper.PushJobProgress(info);
                    }
                    else
                    {
                        long removed;
                        LastPush.TryRemove(jobId, out removed);
                        BaJobHubHelper.PushJobsUpdated(info.JobType, info.ServerId, info.UserId);
                    }
                }
                context.Response.Write("{\"ok\":true}");
            }
            catch (Exception ex)
            {
                context.Response.Write("{\"ok\":false,\"message\":\"" + HttpUtility.JavaScriptStringEncode(ex.Message) + "\"}");
            }
        }

        public bool IsReusable => false;
    }
}
