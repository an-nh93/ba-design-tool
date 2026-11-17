using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Web;
using System.Web.Hosting;
using System.Web.Script.Serialization;

namespace BADesign
{
    /// <summary>Tiến trình + log timing load employee HR Helper. Dùng static map (handler .ashx không lock session).</summary>
    public static class HrEmployeeLoadProgress
    {
        public sealed class State
        {
            public int Total;
            public int Loaded;
            public bool Done;
            public bool Error;
            public string Message = "";
            public string Step = "";
        }

        private static readonly ConcurrentDictionary<string, State> Map
            = new ConcurrentDictionary<string, State>(StringComparer.OrdinalIgnoreCase);

        private static readonly object LogLock = new object();

        public static string BuildKey(string databaseName, int? companyID)
        {
            return (databaseName ?? "") + "|" + (companyID.HasValue && companyID.Value > 0 ? companyID.Value.ToString() : "All");
        }

        public static int? ParseCompanyFilter(int companyID)
        {
            return companyID > 0 ? (int?)companyID : null;
        }

        public static void Reset(string progressKey, string step)
        {
            if (string.IsNullOrEmpty(progressKey)) return;
            Map[progressKey] = new State { Step = step ?? "", Message = step ?? "" };
        }

        public static void Set(string progressKey, int total, int loaded, bool done, bool hasError, string message, string step)
        {
            if (string.IsNullOrEmpty(progressKey)) return;
            State s;
            if (!Map.TryGetValue(progressKey, out s) || s == null)
            {
                s = new State();
                Map[progressKey] = s;
            }
            if (total >= 0) s.Total = total;
            if (loaded >= 0) s.Loaded = loaded;
            s.Done = done;
            s.Error = hasError;
            if (message != null) s.Message = message;
            if (step != null) s.Step = step;
        }

        public static State Get(string progressKey)
        {
            if (string.IsNullOrEmpty(progressKey)) return null;
            State s;
            return Map.TryGetValue(progressKey, out s) ? s : null;
        }

        public static string ToJson(string dbName, int companyID)
        {
            var key = BuildKey(dbName, ParseCompanyFilter(companyID));
            var s = Get(key);
            if (s == null)
            {
                return new JavaScriptSerializer().Serialize(new
                {
                    success = true,
                    loading = false,
                    loaded = 0,
                    total = 0,
                    done = false,
                    hasError = false,
                    message = "",
                    step = ""
                });
            }
            return new JavaScriptSerializer().Serialize(new
            {
                success = true,
                loading = !s.Done && !s.Error,
                loaded = s.Loaded,
                total = s.Total,
                done = s.Done,
                hasError = s.Error,
                message = s.Message ?? "",
                step = s.Step ?? ""
            });
        }

        private static string LogFilePath()
        {
            var dir = AppLogger.LogDirectory;
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);
            return Path.Combine(dir, "hr_employee_load_" + DateTime.Now.ToString("yyyyMMdd") + ".log");
        }

        public static void Log(string progressKey, string message)
        {
            var line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + " [" + (progressKey ?? "-") + "] " + (message ?? "");
            try
            {
                AppLogger.Log("[HR_EmpLoad] " + line);
            }
            catch { }
            try
            {
                lock (LogLock)
                {
                    File.AppendAllText(LogFilePath(), line + Environment.NewLine, Encoding.UTF8);
                }
            }
            catch { }
        }

        public static void LogTiming(string progressKey, string phase, long elapsedMs, string detail)
        {
            var sb = new StringBuilder();
            sb.Append("TIMING ").Append(phase).Append(" ").Append(elapsedMs).Append("ms");
            if (!string.IsNullOrEmpty(detail))
                sb.Append(" | ").Append(detail);
            Log(progressKey, sb.ToString());
        }

        public static Stopwatch StartPhase(string progressKey, string phase)
        {
            if (string.IsNullOrEmpty(progressKey)) return null;
            Log(progressKey, "START " + phase);
            return Stopwatch.StartNew();
        }

        public static void EndPhase(string progressKey, string phase, Stopwatch sw, string detail)
        {
            if (string.IsNullOrEmpty(progressKey) || sw == null) return;
            sw.Stop();
            LogTiming(progressKey, phase, sw.ElapsedMilliseconds, detail);
        }
    }
}
