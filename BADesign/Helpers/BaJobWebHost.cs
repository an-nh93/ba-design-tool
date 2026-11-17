using System;
using System.Configuration;
using System.Threading;
using System.Web.Hosting;

namespace BADesign.Helpers
{
    public sealed class BaJobWebHost : IRegisteredObject
    {
        private static readonly object Gate = new object();
        private static readonly TimeSpan DrainLimit = TimeSpan.FromMinutes(10);
        private static BaJobWebHost _current;

        private readonly BaJobRunner _runner;
        private int _released;

        private BaJobWebHost(BaJobRunner runner)
        {
            _runner = runner;
        }

        public static BaJobRunner Runner
        {
            get
            {
                var host = _current;
                return host == null ? null : host._runner;
            }
        }

        public static void Start()
        {
            lock (Gate)
            {
                if (_current != null) return;
                var options = BaJobRunnerOptions.FromSettings(ConfigurationManager.AppSettings, BaJobQueue.WebQueueName, !BaJobQueue.UseBackgroundWorker);
                var runner = new BaJobRunner(new BaJobSqlStore(UiAuthHelper.ConnStr), options, BaJobQueue.Handlers(), BaJobQueue.Failed, message => AppLogger.Log("[BaJobRunner] " + message));
                var host = new BaJobWebHost(runner);
                HostingEnvironment.RegisterObject(host);
                _current = host;
                runner.Start();
            }
        }

        public void Stop(bool immediate)
        {
            if (immediate)
            {
                _runner.Shutdown();
                Release();
                return;
            }
            _runner.BeginStop();
            var drain = new Thread(() =>
            {
                if (!_runner.WaitIdle(DrainLimit)) return;
                _runner.Shutdown();
                Release();
            }) { IsBackground = true, Name = "BaJob drain" };
            drain.Start();
        }

        private void Release()
        {
            if (Interlocked.Exchange(ref _released, 1) == 1) return;
            HostingEnvironment.UnregisterObject(this);
        }
    }
}
