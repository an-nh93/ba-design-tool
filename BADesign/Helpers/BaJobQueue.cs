using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Web.Hosting;
using BADesign.Helpers.Security;
using BADesign.Pages;

namespace BADesign.Helpers
{
    public sealed class BaJobRequest
    {
        public string JobType { get; set; }
        public int? ServerId { get; set; }
        public string ServerName { get; set; }
        public string DatabaseName { get; set; }
        public string BackupFileName { get; set; }
        public string Message { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string Payload { get; set; }
    }

    public static class BaJobQueue
    {
        public const int QueueNameMaxLength = 200;

        private const string EnqueueSql = @"
INSERT INTO dbo.BaJob (JobType, ServerId, ServerName, DatabaseName, BackupFileName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Message, Payload, QueueName)
VALUES (@type, @sid, @sname, @db, @file, @uid, @uname, SYSDATETIME(), N'Pending', 0, @msg, @payload, @queue);
DECLARE @id INT = CAST(SCOPE_IDENTITY() AS INT);
IF @type = N'Restore' UPDATE dbo.BaJob SET SessionId = -@id WHERE Id = @id;
SELECT @id;";

        public static bool UseBackgroundWorker
        {
            get { return string.Equals((ConfigurationManager.AppSettings["UseBackgroundWorker"] ?? "").Trim(), "true", StringComparison.OrdinalIgnoreCase); }
        }

        public static string WebQueueName
        {
            get { return BuildQueueName(Environment.MachineName, HostingEnvironment.SiteName, HostingEnvironment.ApplicationVirtualPath); }
        }

        public static string QueueForNewJobs
        {
            get { return UseBackgroundWorker ? null : WebQueueName; }
        }

        public static string BuildQueueName(string machineName, string siteName, string virtualPath)
        {
            var name = (machineName ?? "").Trim() + "/" + (siteName ?? "").Trim() + (string.IsNullOrEmpty(virtualPath) ? "/" : virtualPath.Trim());
            return name.Length > QueueNameMaxLength ? name.Substring(0, QueueNameMaxLength) : name;
        }

        public static object QueueParameter
        {
            get { return (object)QueueForNewJobs ?? DBNull.Value; }
        }

        public static int Enqueue(BaJobRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.JobType)) throw new ArgumentException("JobType is required.", "request");
            int jobId;
            using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = EnqueueSql;
                cmd.Parameters.AddWithValue("@type", request.JobType);
                cmd.Parameters.AddWithValue("@sid", (object)request.ServerId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@sname", (object)request.ServerName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@db", (object)request.DatabaseName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@file", (object)request.BackupFileName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@uid", request.UserId);
                cmd.Parameters.AddWithValue("@uname", (object)request.UserName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@msg", (object)request.Message ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@payload", (object)BaSecretStore.PayloadForStorage(UiAuthHelper.ConnStr, request.Payload) ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@queue", QueueParameter);
                conn.Open();
                jobId = Convert.ToInt32(cmd.ExecuteScalar());
            }
            Wake();
            return jobId;
        }

        public static void Wake()
        {
            var runner = BaJobWebHost.Runner;
            if (runner != null) runner.Wake();
        }

        public static bool Track(int jobId)
        {
            var runner = BaJobWebHost.Runner;
            return runner != null && runner.Track(jobId);
        }

        public static IDictionary<string, Action<int>> Handlers()
        {
            return new Dictionary<string, Action<int>>(StringComparer.Ordinal)
            {
                { "Restore", DatabaseSearch.ExecuteRestoreJob },
                { "HRHelperMultiDbReset", HRHelper.ExecuteMultiDbResetJob },
                { "HRHelperUpdateUser", HRHelper.ExecuteHRHelperUpdateUserJob },
                { "HRHelperUpdateUserSignature", HRHelper.ExecuteHRHelperUpdateUserSignatureJob },
                { "HRHelperUpdateEmployee", HRHelper.ExecuteHRHelperUpdateEmployeeJob },
                { "HRHelperUpdateOther", HRHelper.ExecuteHRHelperUpdateOtherJob }
            };
        }

        public static void Failed(BaJobEnded job)
        {
            if (job == null) return;
            BaJobWorkerNotify.Notify(job.Id);
            BaJobHubHelper.PushJobsUpdated(job.JobType, job.ServerId, job.UserId);
            BaJobEmailHelper.NotifyBackupOrRestoreFinishedAsync(job.Id);
        }
    }
}
