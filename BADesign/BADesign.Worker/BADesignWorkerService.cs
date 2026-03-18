using System;
using System.ServiceProcess;
using System.Threading;

namespace BADesign.Worker
{
    /// <summary>Windows Service: chạy Worker ngầm, không cần mở cửa sổ. Cài đặt bằng sc create hoặc InstallUtil.</summary>
    public sealed class BADesignWorkerService : ServiceBase
    {
        private CancellationTokenSource _cts;
        private Thread _workerThread;

        public BADesignWorkerService()
        {
            ServiceName = "BADesignWorker";
            CanStop = true;
            CanShutdown = true;
        }

        protected override void OnStart(string[] args)
        {
            _cts = new CancellationTokenSource();
            _workerThread = new Thread(() =>
            {
                try
                {
                    Program.RunWorkerLoop(_cts);
                }
                catch (Exception ex)
                {
                    // Có thể ghi EventLog hoặc file log tại đây
                    System.Diagnostics.Debug.WriteLine("BADesignWorkerService loop error: " + ex.Message);
                }
            })
            { IsBackground = true };
            _workerThread.Start();
        }

        protected override void OnStop()
        {
            try
            {
                _cts?.Cancel();
                if (_workerThread != null && _workerThread.IsAlive)
                    _workerThread.Join(TimeSpan.FromSeconds(15));
            }
            finally
            {
                _cts?.Dispose();
            }
        }
    }
}
