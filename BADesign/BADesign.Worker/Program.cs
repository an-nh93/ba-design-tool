using System;
using System.Configuration;
using System.Data.SqlClient;
using System.IO;
using System.Net.Http;
using System.ServiceProcess;
using System.Threading;
using System.Threading.Tasks;

namespace BADesign.Worker
{
    internal static class Program
    {
        private const int DefaultPollIntervalSeconds = 10;
        private const int DefaultMaxConcurrentJobs = 15;
        private static string _webBaseUrl;
        private static int _pollMs = 10000;
        private static int _maxConcurrent = DefaultMaxConcurrentJobs;
        private static string _logPath;
        private static readonly object _logLock = new object();

        private static int Main(string[] args)
        {
            LoadConfig();

            // Chạy như Windows Service khi: được gọi bởi SCM (không có console) hoặc tham số --service
            bool runAsService = !Environment.UserInteractive
                || (args.Length > 0 && string.Equals(args[0], "--service", StringComparison.OrdinalIgnoreCase));

            if (runAsService)
            {
                ServiceBase.Run(new ServiceBase[] { new BADesignWorkerService() });
                return 0;
            }

            // Chạy console (cửa sổ CMD, có thể tắt nhầm)
            Console.WriteLine("BADesign.Worker — multi-job: poll Pending, run up to N jobs concurrently. Ctrl+C to exit.");
            Console.WriteLine("[{0}] MaxConcurrentJobs={1}, PollIntervalMs={2}", DateTime.Now, _maxConcurrent, _pollMs);
            var cts = new CancellationTokenSource();
            Console.CancelKeyPress += (s, e) => { e.Cancel = true; cts.Cancel(); };
            RunWorkerLoop(cts);
            return 0;
        }

        /// <summary>Đọc cấu hình từ App.config (gọi trước khi chạy service hoặc console).</summary>
        internal static void LoadConfig()
        {
            try
            {
                var v = ConfigurationManager.AppSettings["WorkerPollIntervalSeconds"];
                if (!string.IsNullOrEmpty(v) && int.TryParse(v, out var n) && n > 0)
                    _pollMs = n * 1000;
            }
            catch { }
            try
            {
                var v = ConfigurationManager.AppSettings["MaxConcurrentJobs"];
                if (!string.IsNullOrEmpty(v) && int.TryParse(v, out var n) && n > 0)
                    _maxConcurrent = Math.Min(n, 50);
            }
            catch { }
            _webBaseUrl = ConfigurationManager.AppSettings["WebBaseUrl"]?.Trim();
            if (!string.IsNullOrEmpty(_webBaseUrl))
            {
                _webBaseUrl = _webBaseUrl.TrimEnd('/');
                BADesign.Helpers.BaJobWorkerNotify.OnBaJobUpdated = NotifyWeb;
            }
            _logPath = ConfigurationManager.AppSettings["WorkerLogPath"]?.Trim();
            if (!string.IsNullOrEmpty(_logPath) && !Path.IsPathRooted(_logPath))
                _logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory ?? "", _logPath);
            if (string.IsNullOrEmpty(_logPath))
                _logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory ?? "", "WorkerLog.txt");
            BADesign.Helpers.BaJobWorkerNotify.OnLogMessage = Log;
        }

        private static void Log(string message)
        {
            if (string.IsNullOrEmpty(_logPath)) return;
            try
            {
                lock (_logLock)
                {
                    File.AppendAllText(_logPath, "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] " + message + Environment.NewLine);
                }
            }
            catch { }
        }

        /// <summary>Chạy vòng lặp N worker cho đến khi bị cancel (dùng chung cho console và service).</summary>
        internal static void RunWorkerLoop(CancellationTokenSource cts)
        {
            var tasks = new Task[_maxConcurrent];
            for (int i = 0; i < _maxConcurrent; i++)
            {
                var slot = i;
                tasks[i] = Task.Run(() => WorkerLoop(slot, cts.Token), cts.Token);
            }
            try
            {
                Task.WaitAll(tasks);
            }
            catch (AggregateException)
            {
                cts.Cancel();
            }
            catch (ThreadInterruptedException)
            {
                cts.Cancel();
            }
        }

        private static void WorkerLoop(int slot, CancellationToken cancel)
        {
            var connStr = ConfigurationManager.ConnectionStrings["UiBuilderDb"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr)) return;

            while (!cancel.IsCancellationRequested)
            {
                int jobId = 0;
                string jobType = null;
                try
                {
                    TryClaimOneJob(connStr, out jobId, out jobType);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("[{0}] Slot {1} claim error: {2}", DateTime.Now, slot, ex.Message);
                }

                if (jobId > 0 && !string.IsNullOrEmpty(jobType))
                {
                    Console.WriteLine("[{0}] Slot {1} running Id={2}, Type={3}", DateTime.Now, slot, jobId, jobType);
                    Log("Slot " + slot + " claimed JobId=" + jobId + " Type=" + (jobType ?? ""));
                    Log("Slot " + slot + " JobId=" + jobId + " started.");
                    try
                    {
                        Log("JobId=" + jobId + " [Worker] gọi RunJob Type=" + (jobType ?? ""));
                        RunJob(jobId, jobType);
                        Log("JobId=" + jobId + " [Worker] RunJob xong.");
                        Log("Slot " + slot + " JobId=" + jobId + " completed.");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("[{0}] Job Id={1} failed: {2}", DateTime.Now, jobId, ex.Message);
                        Log("Slot " + slot + " JobId=" + jobId + " failed: " + ex.Message);
                        if (ex.InnerException != null)
                            Log("  Inner: " + ex.InnerException.Message);
                        MarkJobFailed(jobId, ex.Message);
                    }
                }
                else
                {
                    try
                    {
                        cancel.WaitHandle.WaitOne(Math.Max(500, _pollMs));
                    }
                    catch { }
                }
            }
        }

        /// <summary>Claim one Pending job atomically. Cùng hành động trên cùng một Server+Database: chỉ một job Running, còn lại đợi (User X nhấn trước chạy trước, xong tới User Y).</summary>
        private static void TryClaimOneJob(string connStr, out int jobId, out string jobType)
        {
            jobId = 0;
            jobType = null;
            using (var conn = new SqlConnection(connStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
;WITH Claimable AS (
  SELECT TOP (1) j.Id, j.JobType
  FROM BaJob j
  WHERE j.Status = N'Pending'
    AND j.JobType IN (N'Restore', N'HRHelperMultiDbReset', N'HRHelperUpdateUser', N'HRHelperUpdateUserSignature', N'HRHelperUpdateEmployee', N'HRHelperUpdateOther', N'HRHelperDeleteEmployee')
    AND NOT EXISTS (
      SELECT 1 FROM BaJob R
      WHERE R.Status = N'Running' AND R.JobType = j.JobType
        AND R.Id <> j.Id
        AND ISNULL(R.ServerName,'') = ISNULL(j.ServerName,'')
        AND ISNULL(R.DatabaseName,'') = ISNULL(j.DatabaseName,'')
    )
  ORDER BY j.Id
)
UPDATE BaJob
SET Status = N'Running',
    SessionId = CASE WHEN BaJob.JobType = N'Restore' THEN -BaJob.Id ELSE BaJob.SessionId END
OUTPUT INSERTED.Id, INSERTED.JobType
FROM BaJob
INNER JOIN Claimable c ON c.Id = BaJob.Id";
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (r.Read())
                    {
                        jobId = r.GetInt32(0);
                        jobType = r.IsDBNull(1) ? null : r.GetString(1);
                    }
                }
            }
        }

        private static void RunJob(int jobId, string jobType)
        {
            if (jobType == "Restore")
                BADesign.Pages.DatabaseSearch.ExecuteRestoreJob(jobId);
            else if (jobType == "HRHelperMultiDbReset")
                BADesign.Pages.HRHelper.ExecuteMultiDbResetJob(jobId);
            else if (jobType == "HRHelperUpdateUser")
                BADesign.Pages.HRHelper.ExecuteHRHelperUpdateUserJob(jobId);
            else if (jobType == "HRHelperUpdateUserSignature")
                BADesign.Pages.HRHelper.ExecuteHRHelperUpdateUserSignatureJob(jobId);
            else if (jobType == "HRHelperUpdateEmployee")
            {
                Log("JobId=" + jobId + " [Worker] gọi ExecuteHRHelperUpdateEmployeeJob.");
                BADesign.Pages.HRHelper.ExecuteHRHelperUpdateEmployeeJob(jobId);
                Log("JobId=" + jobId + " [Worker] ExecuteHRHelperUpdateEmployeeJob trả về.");
            }
            else if (jobType == "HRHelperUpdateOther")
                BADesign.Pages.HRHelper.ExecuteHRHelperUpdateOtherJob(jobId);
            else
                MarkJobFailed(jobId, "Unknown JobType: " + jobType);
        }

        private static void NotifyWeb(int jobId)
        {
            if (jobId <= 0 || string.IsNullOrEmpty(_webBaseUrl)) return;
            try
            {
                var url = _webBaseUrl + "/Handlers/NotifyJobProgress.ashx?jobId=" + Uri.EscapeDataString(jobId.ToString());
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    client.PostAsync(url, null).Wait(6000);
                }
            }
            catch { /* không làm sập Worker */ }
        }

        private static void MarkJobFailed(int jobId, string message)
        {
            try
            {
                var connStr = ConfigurationManager.ConnectionStrings["UiBuilderDb"]?.ConnectionString;
                if (string.IsNullOrEmpty(connStr)) return;
                using (var conn = new SqlConnection(connStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaJob SET Status = N'Failed', Message = @msg, PercentComplete = 100, CompletedAt = SYSDATETIME() WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@msg", (object)message ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
                NotifyWeb(jobId);
            }
            catch { }
        }
    }
}
