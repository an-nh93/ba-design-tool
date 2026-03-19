using System;
using System.Web;
using System.Data.SqlClient;
using BADesign.Helpers;

namespace BADesign.Handlers
{
    /// <summary>Worker gọi sau mỗi lần cập nhật BaJob (%, completed, failed). Đọc job từ DB rồi trigger SignalR push để mọi client nhận realtime.</summary>
    public class NotifyJobProgress : IHttpHandler
    {
        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json";
            try
            {
                var jobIdStr = context.Request["jobId"];
                if (string.IsNullOrEmpty(jobIdStr) || !int.TryParse(jobIdStr, out int jobId) || jobId <= 0)
                {
                    context.Response.Write("{\"ok\":false,\"message\":\"Missing or invalid jobId\"}");
                    return;
                }

                string jobType = null;
                int? serverId = null;
                int? startedByUserId = null;
                var connStr = Common.UiAuthHelper.ConnStr;
                if (!string.IsNullOrEmpty(connStr))
                {
                    using (var conn = new SqlConnection(connStr))
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT JobType, ServerId, StartedByUserId FROM BaJob WHERE Id = @id";
                        cmd.Parameters.AddWithValue("@id", jobId);
                        conn.Open();
                        using (var r = cmd.ExecuteReader())
                        {
                            if (r.Read())
                            {
                                jobType = r.IsDBNull(r.GetOrdinal("JobType")) ? null : r.GetString(r.GetOrdinal("JobType"));
                                var serverIdOrd = r.GetOrdinal("ServerId");
                                serverId = r.IsDBNull(serverIdOrd) ? (int?)null : r.GetInt32(serverIdOrd);
                                var uidOrd = r.GetOrdinal("StartedByUserId");
                                startedByUserId = r.IsDBNull(uidOrd) ? (int?)null : r.GetInt32(uidOrd);
                            }
                        }
                    }
                }

                BaJobHubHelper.PushJobsUpdated(jobType, serverId, startedByUserId);
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
