using System;

namespace BADesign.Helpers
{
    public sealed class JobProgressUpdate
    {
        public int Percent { get; set; }
        public string Message { get; set; }
        public string Detail { get; set; }
    }

    public sealed class JobProgressThrottle
    {
        private readonly long _minIntervalMs;
        private readonly Func<long> _clock;
        private readonly object _gate = new object();
        private bool _emitted;
        private long _lastEmitMs;
        private int _highestPercent;
        private string _lastMessage;
        private string _lastDetail;
        private string _lastPhase;
        private JobProgressUpdate _held;

        public JobProgressThrottle(long minIntervalMs, Func<long> clock)
        {
            if (clock == null) throw new ArgumentNullException("clock");
            _minIntervalMs = Math.Max(0, minIntervalMs);
            _clock = clock;
        }

        public long LastEmitMs
        {
            get { lock (_gate) return _lastEmitMs; }
        }

        public JobProgressUpdate Offer(int percent, string message, string detail, bool force, string phase = null)
        {
            lock (_gate)
            {
                var clamped = Math.Max(0, Math.Min(100, percent));
                if (clamped > _highestPercent) _highestPercent = clamped;
                var update = new JobProgressUpdate { Percent = _highestPercent, Message = message ?? _lastMessage, Detail = detail };
                var now = _clock();
                var phaseChanged = phase != null && !string.Equals(phase, _lastPhase, StringComparison.OrdinalIgnoreCase);
                if (phase != null) _lastPhase = phase;
                if (force || !_emitted || phaseChanged || now - _lastEmitMs >= _minIntervalMs)
                    return Emit(update, now);
                _held = update;
                return null;
            }
        }

        public JobProgressUpdate Flush(bool force)
        {
            lock (_gate)
            {
                if (_held == null) return null;
                var now = _clock();
                if (!force && now - _lastEmitMs < _minIntervalMs) return null;
                return Emit(_held, now);
            }
        }

        public JobProgressUpdate Current()
        {
            lock (_gate)
            {
                if (!_emitted && _held == null) return null;
                var source = _held ?? new JobProgressUpdate { Message = _lastMessage, Detail = _lastDetail };
                return new JobProgressUpdate { Percent = _highestPercent, Message = source.Message ?? _lastMessage, Detail = source.Detail };
            }
        }

        private JobProgressUpdate Emit(JobProgressUpdate update, long now)
        {
            _emitted = true;
            _lastEmitMs = now;
            _lastMessage = update.Message;
            _lastDetail = update.Detail;
            _held = null;
            return update;
        }
    }

    public sealed class JobProgressPlan
    {
        private readonly string[] _phases;
        private readonly int[] _starts;
        private readonly int[] _ends;

        private JobProgressPlan(string[] phases, int[] starts, int[] ends)
        {
            _phases = phases;
            _starts = starts;
            _ends = ends;
        }

        public static JobProgressPlan Create(params object[] phaseAndWeight)
        {
            if (phaseAndWeight == null || phaseAndWeight.Length == 0 || phaseAndWeight.Length % 2 != 0)
                throw new ArgumentException("Expected pairs of phase name and weight.");
            var count = phaseAndWeight.Length / 2;
            var phases = new string[count];
            var weights = new int[count];
            var total = 0;
            for (var i = 0; i < count; i++)
            {
                phases[i] = (string)phaseAndWeight[i * 2];
                weights[i] = Math.Max(0, Convert.ToInt32(phaseAndWeight[i * 2 + 1]));
                total += weights[i];
            }
            if (total <= 0) throw new ArgumentException("Total weight must be positive.");
            var starts = new int[count];
            var ends = new int[count];
            var run = 0;
            for (var i = 0; i < count; i++)
            {
                starts[i] = (int)Math.Round(run * 99.0 / total);
                run += weights[i];
                ends[i] = (int)Math.Round(run * 99.0 / total);
            }
            return new JobProgressPlan(phases, starts, ends);
        }

        public static JobProgressPlan ForRestore(bool sanitize, bool shrinkLog)
        {
            if (sanitize)
                return Create("Restore", 55, "PostRestore", 2, "Reset Information", 38, "ShrinkLog", shrinkLog ? 4 : 0, "Completing", 1);
            return Create("Restore", 90, "PostRestore", 2, "ShrinkLog", shrinkLog ? 7 : 0, "Completing", 1);
        }

        public bool Knows(string phase)
        {
            return IndexOf(phase) >= 0;
        }

        public int Overall(string phase, int localPercent)
        {
            var at = IndexOf(phase);
            if (at < 0) return Math.Max(0, Math.Min(99, localPercent));
            var local = Math.Max(0, Math.Min(100, localPercent));
            var value = _starts[at] + (int)Math.Floor((_ends[at] - _starts[at]) * local / 100.0);
            return Math.Max(0, Math.Min(99, value));
        }

        private int IndexOf(string phase)
        {
            if (phase == null) return -1;
            for (var i = 0; i < _phases.Length; i++)
                if (string.Equals(_phases[i], phase.Trim(), StringComparison.OrdinalIgnoreCase)) return i;
            return -1;
        }
    }

    public static class JobBatchSizer
    {
        public static int Next(int current, long lastBatchMs, int min, int max, int targetMs)
        {
            var size = Math.Max(min, Math.Min(max, current));
            if (lastBatchMs <= 0 || targetMs <= 0) return size;
            double ratio = targetMs / (double)lastBatchMs;
            if (ratio > 2) ratio = 2;
            if (ratio < 0.5) ratio = 0.5;
            var next = (int)Math.Round(size * ratio);
            return Math.Max(min, Math.Min(max, next));
        }

        public static string Eta(long elapsedMs, int done, int total)
        {
            if (done <= 0 || total <= done || elapsedMs <= 0) return null;
            var remainingMs = (long)(elapsedMs * ((total - done) / (double)done));
            return Clock(remainingMs);
        }

        public static string Clock(long ms)
        {
            if (ms < 0) ms = 0;
            var seconds = ms / 1000;
            var h = seconds / 3600;
            var m = (seconds % 3600) / 60;
            var s = seconds % 60;
            return h > 0
                ? h + ":" + m.ToString("00") + ":" + s.ToString("00")
                : m.ToString("00") + ":" + s.ToString("00");
        }
    }
}
