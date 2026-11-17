using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Diagnostics;
using System.Linq;
using System.Threading;

namespace BADesign.Helpers
{
    public sealed class BaJobRunnerOptions
    {
        public const int DefaultMaxConcurrentJobs = 15;
        public const int MaxConcurrentJobsLimit = 50;
        public const int DefaultPollIntervalSeconds = 10;

        public BaJobRunnerOptions()
        {
            Claiming = true;
            MaxConcurrentJobs = DefaultMaxConcurrentJobs;
            PollInterval = TimeSpan.FromSeconds(DefaultPollIntervalSeconds);
            HeartbeatInterval = TimeSpan.FromSeconds(30);
            StaleAfter = TimeSpan.FromMinutes(3);
        }

        public string QueueName { get; set; }

        public bool Claiming { get; set; }

        public int MaxConcurrentJobs { get; set; }

        public TimeSpan PollInterval { get; set; }

        public TimeSpan HeartbeatInterval { get; set; }

        public TimeSpan StaleAfter { get; set; }

        public static BaJobRunnerOptions FromSettings(NameValueCollection settings, string queueName, bool claiming)
        {
            var options = new BaJobRunnerOptions { QueueName = queueName, Claiming = claiming };
            var max = PositiveInt(settings, "MaxConcurrentJobs");
            if (max > 0) options.MaxConcurrentJobs = Math.Min(max, MaxConcurrentJobsLimit);
            var poll = PositiveInt(settings, "WorkerPollIntervalSeconds");
            if (poll > 0) options.PollInterval = TimeSpan.FromSeconds(poll);
            return options;
        }

        private static int PositiveInt(NameValueCollection settings, string key)
        {
            var raw = settings == null ? null : settings[key];
            int value;
            return !string.IsNullOrWhiteSpace(raw) && int.TryParse(raw.Trim(), out value) && value > 0 ? value : 0;
        }
    }

    public sealed class BaClaimedJob
    {
        public int Id { get; set; }
        public string JobType { get; set; }
    }

    public sealed class BaJobEnded
    {
        public int Id { get; set; }
        public string JobType { get; set; }
        public int? ServerId { get; set; }
        public int? UserId { get; set; }
    }

    public interface IBaJobStore
    {
        BaClaimedJob ClaimNext(string queueName, string runnerId, ICollection<string> jobTypes);
        void Heartbeat(string runnerId);
        IList<BaJobEnded> InterruptOrphans(string queueName, string runnerId, TimeSpan staleAfter, string message);
        IList<BaJobEnded> InterruptOwn(string runnerId, string message);
        BaJobEnded MarkFailed(int jobId, string message);
        BaJobEnded CloseIfStillRunning(int jobId, string runnerId, string message);
        bool Track(int jobId, string queueName, string runnerId);
    }

    public sealed class BaJobRunner
    {
        public const string InterruptedMessage = "Bị gián đoạn: nơi chạy job (site web hoặc Worker) đã dừng khi job đang chạy. Hãy chạy lại.";
        public const string UnfinishedMessage = "Job đã dừng nhưng chưa ghi kết quả. Hãy chạy lại.";

        private const int StateNew = 0;
        private const int StateStarted = 1;
        private const int StateStopping = 2;
        private const int StateStopped = 3;
        private const int RecoveryEveryHeartbeats = 2;
        private static readonly TimeSpan RepeatedErrorQuiet = TimeSpan.FromMinutes(10);

        private readonly IBaJobStore _store;
        private readonly BaJobRunnerOptions _options;
        private readonly IDictionary<string, Action<int>> _handlers;
        private readonly string[] _jobTypes;
        private readonly Action<BaJobEnded> _onFailed;
        private readonly Action<string> _log;
        private readonly AutoResetEvent _wake = new AutoResetEvent(false);
        private readonly object _gate = new object();
        private readonly object _errorGate = new object();
        private readonly HashSet<int> _running = new HashSet<int>();
        private Thread _dispatcher;
        private Timer _heartbeat;
        private int _state;
        private int _beating;
        private int _heartbeats;
        private string _lastReported;
        private DateTime _lastReportedAt;

        public BaJobRunner(IBaJobStore store, BaJobRunnerOptions options, IDictionary<string, Action<int>> handlers, Action<BaJobEnded> onFailed, Action<string> log)
        {
            if (store == null) throw new ArgumentNullException("store");
            _store = store;
            _options = options ?? new BaJobRunnerOptions();
            _handlers = new Dictionary<string, Action<int>>(handlers ?? new Dictionary<string, Action<int>>(), StringComparer.Ordinal);
            _jobTypes = _handlers.Keys.OrderBy(k => k, StringComparer.Ordinal).ToArray();
            _onFailed = onFailed ?? (job => { });
            _log = log ?? (message => { });
            RunnerId = NewRunnerId();
        }

        public string RunnerId { get; private set; }

        public BaJobRunnerOptions Options { get { return _options; } }

        public DateTime? StartedAt { get; private set; }

        public string LastError { get; private set; }

        public DateTime? LastErrorAt { get; private set; }

        public bool IsRunning { get { return Volatile.Read(ref _state) == StateStarted; } }

        public int RunningCount
        {
            get { lock (_gate) return _running.Count; }
        }

        public void Start()
        {
            if (Interlocked.CompareExchange(ref _state, StateStarted, StateNew) != StateNew) return;
            StartedAt = DateTime.Now;
            _log("started runner=" + RunnerId + ", queue=" + (_options.QueueName ?? "(worker)") + ", claiming=" + _options.Claiming + ", maxConcurrentJobs=" + _options.MaxConcurrentJobs);
            _heartbeat = new Timer(OnHeartbeat, null, TimeSpan.Zero, _options.HeartbeatInterval);
            if (!_options.Claiming) return;
            _dispatcher = new Thread(Dispatch) { IsBackground = true, Name = "BaJob dispatcher" };
            _dispatcher.Start();
        }

        public void Wake()
        {
            if (_options.Claiming && IsRunning) _wake.Set();
        }

        public bool Track(int jobId)
        {
            if (jobId <= 0 || !IsRunning) return false;
            try
            {
                return _store.Track(jobId, _options.QueueName, RunnerId);
            }
            catch (Exception ex)
            {
                Report("track job " + jobId, ex);
                return false;
            }
        }

        public void BeginStop()
        {
            if (Interlocked.CompareExchange(ref _state, StateStopping, StateStarted) == StateStarted)
                _log("stopping runner=" + RunnerId + ", running=" + RunningCount);
            _wake.Set();
        }

        public bool WaitIdle(TimeSpan timeout)
        {
            var clock = Stopwatch.StartNew();
            lock (_gate)
            {
                while (_running.Count > 0)
                {
                    var left = timeout - clock.Elapsed;
                    if (left <= TimeSpan.Zero) return false;
                    Monitor.Wait(_gate, left);
                }
            }
            return true;
        }

        public IList<BaJobEnded> Shutdown()
        {
            BeginStop();
            if (Interlocked.Exchange(ref _state, StateStopped) == StateStopped) return new List<BaJobEnded>();
            var timer = Interlocked.Exchange(ref _heartbeat, null);
            if (timer != null) timer.Dispose();
            IList<BaJobEnded> interrupted;
            try
            {
                interrupted = _store.InterruptOwn(RunnerId, InterruptedMessage);
            }
            catch (Exception ex)
            {
                Report("interrupt own jobs", ex);
                interrupted = new List<BaJobEnded>();
            }
            if (interrupted.Count > 0)
                _log("marked interrupted on shutdown: " + string.Join(",", interrupted.Select(j => j.Id)));
            foreach (var job in interrupted) RaiseFailed(job);
            _log("stopped runner=" + RunnerId);
            return interrupted;
        }

        private void Dispatch()
        {
            while (IsRunning)
            {
                try
                {
                    ClaimWhileFree();
                }
                catch (Exception ex)
                {
                    Report("claim", ex);
                }
                _wake.WaitOne(_options.PollInterval);
            }
        }

        private void ClaimWhileFree()
        {
            while (IsRunning && RunningCount < _options.MaxConcurrentJobs)
            {
                var job = _store.ClaimNext(_options.QueueName, RunnerId, _jobTypes);
                if (job == null) return;
                StartJob(job);
            }
        }

        private void StartJob(BaClaimedJob job)
        {
            lock (_gate) _running.Add(job.Id);
            _log("claimed job " + job.Id + " " + job.JobType);
            var thread = new Thread(() => Run(job)) { IsBackground = true, Name = "BaJob " + job.Id };
            try { thread.Priority = ThreadPriority.BelowNormal; } catch { }
            thread.Start();
        }

        private void Run(BaClaimedJob job)
        {
            BaJobEnded failed = null;
            try
            {
                Action<int> handler;
                if (!_handlers.TryGetValue(job.JobType ?? "", out handler))
                    throw new InvalidOperationException("Unknown JobType: " + job.JobType);
                handler(job.Id);
                _log("job " + job.Id + " returned");
                failed = CloseUnfinished(job.Id);
            }
            catch (Exception ex)
            {
                _log("job " + job.Id + " failed: " + ex.Message);
                failed = MarkFailed(job.Id, ex is ThreadAbortException ? InterruptedMessage : ex.Message);
            }
            finally
            {
                lock (_gate)
                {
                    _running.Remove(job.Id);
                    Monitor.PulseAll(_gate);
                }
                _wake.Set();
            }
            if (failed != null) RaiseFailed(failed);
        }

        private BaJobEnded CloseUnfinished(int jobId)
        {
            try
            {
                var closed = _store.CloseIfStillRunning(jobId, RunnerId, UnfinishedMessage);
                if (closed != null) _log("job " + jobId + " returned without a result and was closed");
                return closed;
            }
            catch (Exception ex)
            {
                Report("close job " + jobId, ex);
                return null;
            }
        }

        private BaJobEnded MarkFailed(int jobId, string message)
        {
            try
            {
                return _store.MarkFailed(jobId, message);
            }
            catch (Exception ex)
            {
                Report("mark job " + jobId + " failed", ex);
                return null;
            }
        }

        private void OnHeartbeat(object state)
        {
            if (Interlocked.Exchange(ref _beating, 1) == 1) return;
            try
            {
                if (Volatile.Read(ref _state) == StateStopped) return;
                try
                {
                    _store.Heartbeat(RunnerId);
                }
                catch (Exception ex)
                {
                    Report("heartbeat", ex);
                }
                var beats = Interlocked.Increment(ref _heartbeats);
                if (beats == 1 || beats % RecoveryEveryHeartbeats == 0) RecoverOrphans();
            }
            finally
            {
                Interlocked.Exchange(ref _beating, 0);
            }
        }

        private void RecoverOrphans()
        {
            IList<BaJobEnded> interrupted;
            try
            {
                interrupted = _store.InterruptOrphans(_options.QueueName, RunnerId, _options.StaleAfter, InterruptedMessage);
            }
            catch (Exception ex)
            {
                Report("recover interrupted jobs", ex);
                return;
            }
            if (interrupted.Count == 0) return;
            _log("marked interrupted (no heartbeat): " + string.Join(",", interrupted.Select(j => j.Id)));
            foreach (var job in interrupted) RaiseFailed(job);
            Wake();
        }

        private void RaiseFailed(BaJobEnded job)
        {
            try
            {
                _onFailed(job);
            }
            catch (Exception ex)
            {
                Report("notify job " + job.Id, ex);
            }
        }

        private void Report(string where, Exception ex)
        {
            var text = where + ": " + ex.Message;
            lock (_errorGate)
            {
                LastError = text;
                LastErrorAt = DateTime.Now;
                if (text == _lastReported && DateTime.UtcNow - _lastReportedAt < RepeatedErrorQuiet) return;
                _lastReported = text;
                _lastReportedAt = DateTime.UtcNow;
            }
            _log("error " + text);
        }

        private static string NewRunnerId()
        {
            int processId;
            try { processId = Process.GetCurrentProcess().Id; } catch { processId = 0; }
            return Environment.MachineName + ":" + processId + ":" + Guid.NewGuid().ToString("N").Substring(0, 8);
        }
    }
}
