using System;
using System.Configuration;
using System.IO;
using System.Net.Http;
using System.ServiceProcess;
using System.Threading;
using BADesign.Helpers;

namespace BADesign.Worker
{
    internal static class Program
    {
        private static readonly TimeSpan StopWait = TimeSpan.FromSeconds(15);
        private static string _webBaseUrl;
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
            var runner = CreateRunner(true);
            Console.WriteLine("BADesign.Worker — multi-job: poll Pending, run up to N jobs concurrently. Ctrl+C to exit.");
            Console.WriteLine("[{0}] MaxConcurrentJobs={1}, PollIntervalMs={2}", DateTime.Now, runner.Options.MaxConcurrentJobs, (int)runner.Options.PollInterval.TotalMilliseconds);
            var exit = new ManualResetEvent(false);
            Console.CancelKeyPress += (s, e) => { e.Cancel = true; exit.Set(); };
            runner.Start();
            exit.WaitOne();
            Stop(runner);
            return 0;
        }

        internal static BaJobRunner CreateRunner(bool echoToConsole)
        {
            var connection = ConfigurationManager.ConnectionStrings["UiBuilderDb"];
            var options = BaJobRunnerOptions.FromSettings(ConfigurationManager.AppSettings, null, true);
            Action<string> log = Log;
            if (echoToConsole)
                log = message => { Console.WriteLine("[{0}] {1}", DateTime.Now, message); Log(message); };
            return new BaJobRunner(new BaJobSqlStore(connection == null ? null : connection.ConnectionString), options, BaJobQueue.Handlers(), BaJobQueue.Failed, log);
        }

        internal static void Stop(BaJobRunner runner)
        {
            if (runner == null) return;
            runner.BeginStop();
            runner.WaitIdle(StopWait);
            runner.Shutdown();
        }

        /// <summary>Đọc cấu hình từ App.config (gọi trước khi chạy service hoặc console).</summary>
        internal static void LoadConfig()
        {
            _webBaseUrl = ConfigurationManager.AppSettings["WebBaseUrl"]?.Trim();
            if (!string.IsNullOrEmpty(_webBaseUrl))
            {
                _webBaseUrl = _webBaseUrl.TrimEnd('/');
                BaJobWorkerNotify.OnBaJobUpdated = NotifyWeb;
            }
            _logPath = ConfigurationManager.AppSettings["WorkerLogPath"]?.Trim();
            if (!string.IsNullOrEmpty(_logPath) && !Path.IsPathRooted(_logPath))
                _logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory ?? "", _logPath);
            if (string.IsNullOrEmpty(_logPath))
                _logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory ?? "", "WorkerLog.txt");
            BaJobWorkerNotify.OnLogMessage = Log;
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
    }
}
