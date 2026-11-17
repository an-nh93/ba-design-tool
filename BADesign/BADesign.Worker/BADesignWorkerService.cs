using System.ServiceProcess;
using BADesign.Helpers;

namespace BADesign.Worker
{
    /// <summary>Windows Service: chạy Worker ngầm, không cần mở cửa sổ. Cài đặt bằng sc create hoặc InstallUtil.</summary>
    public sealed class BADesignWorkerService : ServiceBase
    {
        private BaJobRunner _runner;

        public BADesignWorkerService()
        {
            ServiceName = "BADesignWorker";
            CanStop = true;
            CanShutdown = true;
        }

        protected override void OnStart(string[] args)
        {
            _runner = Program.CreateRunner(false);
            _runner.Start();
        }

        protected override void OnStop()
        {
            Program.Stop(_runner);
        }

        protected override void OnShutdown()
        {
            Program.Stop(_runner);
        }
    }
}
