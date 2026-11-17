using System;
using System.Collections.Concurrent;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Threading;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers
{
    public sealed class JobProgressInfo
    {
        public int Id { get; set; }
        public string JobType { get; set; }
        public int? ServerId { get; set; }
        public int? UserId { get; set; }
        public string Status { get; set; }
        public int Percent { get; set; }
        public string Message { get; set; }
        public string Detail { get; set; }
        public int? ElapsedSeconds { get; set; }
    }

    public static class BaJobProgress
    {
        public const int MinIntervalMs = 800;
        public const int HeartbeatMs = 5000;
        private const int TickMs = 1000;
        private const long StaleMs = 12L * 60 * 60 * 1000;
        private const long ColumnRecheckMs = 5L * 60 * 1000;
        private const int DetailMaxLength = 400;

        private sealed class Entry
        {
            public JobProgressThrottle Throttle;
            public JobProgressPlan Plan;
            public string JobType;
            public int? ServerId;
            public int? UserId;
            public long StartedMs;
            public long LastWriteMs;
            public readonly object WriteGate = new object();
        }

        private static readonly Stopwatch Clock = Stopwatch.StartNew();
        private static readonly ConcurrentDictionary<int, Entry> Jobs = new ConcurrentDictionary<int, Entry>();
        private static readonly object TimerGate = new object();
        private static Timer _timer;
        private static int _ticking;
        private static int _columnState;
        private static long _columnCheckedMs;

        public static long ElapsedMs(int jobId)
        {
            Entry entry;
            return Jobs.TryGetValue(jobId, out entry) ? Clock.ElapsedMilliseconds - entry.StartedMs : 0;
        }

        public static void Report(int jobId, int percent, string message, string detail = null, bool force = false)
        {
            Offer(jobId, percent, message, detail, force, null);
        }

        public static void ReportPhase(int jobId, string phase, int localPercent, string detail = null, bool force = false)
        {
            if (jobId <= 0) return;
            try
            {
                var entry = Ensure(jobId);
                var percent = entry.Plan != null && entry.Plan.Knows(phase) ? entry.Plan.Overall(phase, localPercent) : localPercent;
                Offer(jobId, percent, phase, detail, force, phase);
            }
            catch { }
        }

        private static void Offer(int jobId, int percent, string message, string detail, bool force, string phase)
        {
            if (jobId <= 0) return;
            try
            {
                var entry = Ensure(jobId);
                var update = entry.Throttle.Offer(Math.Min(percent, 99), message, detail, force, phase);
                if (update != null) Write(jobId, entry, update);
                EnsureTimer();
            }
            catch { }
        }

        public static void End(int jobId)
        {
            Entry removed;
            Jobs.TryRemove(jobId, out removed);
        }

        public static JobProgressInfo Read(int jobId)
        {
            var connStr = UiAuthHelper.ConnStr;
            if (jobId <= 0 || string.IsNullOrEmpty(connStr)) return null;
            var withDetail = HasProgressColumns();
            using (var conn = new SqlConnection(connStr))
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT JobType, ServerId, StartedByUserId, Status, ISNULL(PercentComplete, 0), Message, DATEDIFF(SECOND, StartTime, SYSDATETIME())"
                    + (withDetail ? ", ProgressDetail" : ", CAST(NULL AS NVARCHAR(400))")
                    + " FROM BaJob WHERE Id = @id";
                cmd.Parameters.AddWithValue("@id", jobId);
                conn.Open();
                using (var r = cmd.ExecuteReader())
                {
                    if (!r.Read()) return null;
                    return new JobProgressInfo
                    {
                        Id = jobId,
                        JobType = r.IsDBNull(0) ? null : r.GetString(0),
                        ServerId = r.IsDBNull(1) ? (int?)null : r.GetInt32(1),
                        UserId = r.IsDBNull(2) ? (int?)null : r.GetInt32(2),
                        Status = r.IsDBNull(3) ? null : r.GetString(3),
                        Percent = r.GetInt32(4),
                        Message = r.IsDBNull(5) ? null : r.GetString(5),
                        ElapsedSeconds = r.IsDBNull(6) ? (int?)null : Math.Max(0, r.GetInt32(6)),
                        Detail = r.IsDBNull(7) ? null : r.GetString(7)
                    };
                }
            }
        }

        public static bool HasProgressColumns()
        {
            var now = Clock.ElapsedMilliseconds;
            if (_columnState == 1) return true;
            if (_columnState == 2 && now - _columnCheckedMs < ColumnRecheckMs) return false;
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT CASE WHEN COL_LENGTH('dbo.BaJob', 'ProgressDetail') IS NOT NULL AND COL_LENGTH('dbo.BaJob', 'HeartbeatAt') IS NOT NULL THEN 1 ELSE 0 END";
                    conn.Open();
                    _columnState = Convert.ToInt32(cmd.ExecuteScalar()) == 1 ? 1 : 2;
                }
            }
            catch
            {
                _columnState = 2;
            }
            _columnCheckedMs = now;
            return _columnState == 1;
        }

        private static Entry Ensure(int jobId)
        {
            Entry entry;
            if (Jobs.TryGetValue(jobId, out entry)) return entry;
            var created = new Entry
            {
                Throttle = new JobProgressThrottle(MinIntervalMs, () => Clock.ElapsedMilliseconds),
                StartedMs = Clock.ElapsedMilliseconds
            };
            LoadJob(jobId, created);
            return Jobs.GetOrAdd(jobId, created);
        }

        private static void LoadJob(int jobId, Entry entry)
        {
            try
            {
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT JobType, ServerId, StartedByUserId, Payload, DATEDIFF(MILLISECOND, StartTime, SYSDATETIME()) FROM BaJob WHERE Id = @id";
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    using (var r = cmd.ExecuteReader())
                    {
                        if (!r.Read()) return;
                        entry.JobType = r.IsDBNull(0) ? null : r.GetString(0);
                        entry.ServerId = r.IsDBNull(1) ? (int?)null : r.GetInt32(1);
                        entry.UserId = r.IsDBNull(2) ? (int?)null : r.GetInt32(2);
                        if (string.Equals(entry.JobType, "Restore", StringComparison.OrdinalIgnoreCase))
                            entry.Plan = RestorePlan(r.IsDBNull(3) ? null : r.GetString(3));
                        if (!r.IsDBNull(4)) entry.StartedMs = Clock.ElapsedMilliseconds - Math.Max(0, r.GetInt32(4));
                    }
                }
            }
            catch { }
        }

        private static JobProgressPlan RestorePlan(string payloadJson)
        {
            var sanitize = false;
            var shrink = false;
            if (!string.IsNullOrEmpty(payloadJson))
            {
                try
                {
                    var payload = JObject.Parse(payloadJson);
                    sanitize = payload["withAutoReset"] != null && payload["withAutoReset"].Type == JTokenType.Boolean && (bool)payload["withAutoReset"];
                    shrink = payload["withShrinkLog"] != null && payload["withShrinkLog"].Type == JTokenType.Boolean && (bool)payload["withShrinkLog"];
                }
                catch { }
            }
            return JobProgressPlan.ForRestore(sanitize, shrink);
        }

        private static void Write(int jobId, Entry entry, JobProgressUpdate update)
        {
            var rows = 0;
            var first = false;
            var detail = update.Detail;
            if (detail != null && detail.Length > DetailMaxLength) detail = detail.Substring(0, DetailMaxLength);
            lock (entry.WriteGate)
            {
                first = entry.LastWriteMs == 0;
                var withDetail = HasProgressColumns();
                using (var conn = new SqlConnection(UiAuthHelper.ConnStr))
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "UPDATE BaJob SET PercentComplete = CASE WHEN @pct > ISNULL(PercentComplete, 0) THEN @pct ELSE ISNULL(PercentComplete, 0) END, Message = ISNULL(@msg, Message)"
                        + (withDetail ? ", ProgressDetail = @detail, HeartbeatAt = SYSDATETIME()" : "")
                        + " WHERE Id = @id AND Status = N'Running'";
                    cmd.Parameters.AddWithValue("@pct", update.Percent);
                    cmd.Parameters.AddWithValue("@msg", (object)update.Message ?? DBNull.Value);
                    if (withDetail) cmd.Parameters.AddWithValue("@detail", (object)detail ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@id", jobId);
                    conn.Open();
                    rows = cmd.ExecuteNonQuery();
                }
                entry.LastWriteMs = Clock.ElapsedMilliseconds;
            }
            if (rows == 0)
            {
                End(jobId);
                return;
            }
            BaJobWorkerNotify.Notify(jobId);
            if (first) BaJobHubHelper.PushJobsUpdated(entry.JobType, entry.ServerId, entry.UserId);
            BaJobHubHelper.PushJobProgress(new JobProgressInfo
            {
                Id = jobId,
                JobType = entry.JobType,
                ServerId = entry.ServerId,
                UserId = entry.UserId,
                Status = "Running",
                Percent = update.Percent,
                Message = update.Message,
                Detail = detail,
                ElapsedSeconds = (int)Math.Max(0, (Clock.ElapsedMilliseconds - entry.StartedMs) / 1000)
            });
        }

        private static void EnsureTimer()
        {
            if (_timer != null) return;
            lock (TimerGate)
            {
                if (_timer == null) _timer = new Timer(Tick, null, TickMs, TickMs);
            }
        }

        private static void Tick(object state)
        {
            if (Interlocked.Exchange(ref _ticking, 1) == 1) return;
            try
            {
                foreach (var pair in Jobs)
                {
                    try
                    {
                        var entry = pair.Value;
                        var now = Clock.ElapsedMilliseconds;
                        if (now - entry.StartedMs > StaleMs) { End(pair.Key); continue; }
                        var held = entry.Throttle.Flush(false);
                        if (held != null) { Write(pair.Key, entry, held); continue; }
                        if (now - entry.LastWriteMs < HeartbeatMs) continue;
                        var current = entry.Throttle.Current();
                        if (current != null) Write(pair.Key, entry, current);
                    }
                    catch { }
                }
            }
            finally
            {
                Interlocked.Exchange(ref _ticking, 0);
            }
        }
    }
}
