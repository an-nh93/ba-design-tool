using System;

namespace BADesign.Helpers
{
    /// <summary>Worker đăng ký callback; BADesign gọi Notify sau mỗi lần UPDATE BaJob để Worker có thể gọi web trigger SignalR push (realtime % lên mọi client).</summary>
    public static class BaJobWorkerNotify
    {
        /// <summary>Worker set: Action(jobId) gọi sau mỗi lần cập nhật BaJob. Ví dụ: POST tới /Handlers/NotifyJobProgress.ashx?jobId=...</summary>
        public static Action<int> OnBaJobUpdated { get; set; }

        /// <summary>Worker set: Action(message) ghi log chi tiết (cùng file WorkerLog.txt). BADesign gọi Log() để ghi từng bước xử lý job.</summary>
        public static Action<string> OnLogMessage { get; set; }

        /// <summary>Gọi sau UPDATE BaJob (percent, message, completed, failed). Nếu Worker đã set OnBaJobUpdated thì gọi delegate.</summary>
        public static void Notify(int jobId)
        {
            if (jobId <= 0) return;
            try
            {
                OnBaJobUpdated?.Invoke(jobId);
            }
            catch { /* Worker callback lỗi không làm sập process */ }
        }

        /// <summary>Ghi log (Worker đăng ký OnLogMessage → ghi vào WorkerLog.txt). Dùng trong job để biết Worker đang làm bước nào.</summary>
        public static void Log(string message)
        {
            if (string.IsNullOrEmpty(message)) return;
            try
            {
                OnLogMessage?.Invoke(message);
            }
            catch { }
        }
    }
}
