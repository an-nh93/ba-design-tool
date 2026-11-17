using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class BaJobRunnerTests
    {
        private sealed class FakeStore : IBaJobStore
        {
            public readonly object Gate = new object();
            public readonly Queue<BaClaimedJob> Pending = new Queue<BaClaimedJob>();
            public readonly List<Tuple<int, string>> Failed = new List<Tuple<int, string>>();
            public readonly List<int> Tracked = new List<int>();
            public readonly List<int> CloseChecks = new List<int>();
            public readonly HashSet<int> StillRunningAfterReturn = new HashSet<int>();
            public string CloseMessage;
            public List<string> ClaimTypes;
            public string ClaimQueue;
            public int Claims;
            public int Heartbeats;
            public int OrphanChecks;
            public string OwnMessage;
            public string OrphanMessage;
            public TimeSpan OrphanStaleAfter;
            public IList<BaJobEnded> Orphans = new List<BaJobEnded>();
            public IList<BaJobEnded> Own = new List<BaJobEnded>();
            public Exception ClaimError;

            public void Add(int id, string type)
            {
                lock (Gate) Pending.Enqueue(new BaClaimedJob { Id = id, JobType = type });
            }

            public int PendingCount
            {
                get { lock (Gate) return Pending.Count; }
            }

            public BaClaimedJob ClaimNext(string queueName, string runnerId, ICollection<string> jobTypes)
            {
                lock (Gate)
                {
                    Claims++;
                    ClaimQueue = queueName;
                    ClaimTypes = jobTypes.ToList();
                    if (ClaimError != null) throw ClaimError;
                    return Pending.Count > 0 ? Pending.Dequeue() : null;
                }
            }

            public void Heartbeat(string runnerId)
            {
                Interlocked.Increment(ref Heartbeats);
            }

            public IList<BaJobEnded> InterruptOrphans(string queueName, string runnerId, TimeSpan staleAfter, string message)
            {
                Interlocked.Increment(ref OrphanChecks);
                lock (Gate)
                {
                    OrphanMessage = message;
                    OrphanStaleAfter = staleAfter;
                    var result = Orphans;
                    Orphans = new List<BaJobEnded>();
                    return result;
                }
            }

            public IList<BaJobEnded> InterruptOwn(string runnerId, string message)
            {
                lock (Gate)
                {
                    OwnMessage = message;
                    var result = Own;
                    Own = new List<BaJobEnded>();
                    return result;
                }
            }

            public BaJobEnded MarkFailed(int jobId, string message)
            {
                lock (Gate) Failed.Add(Tuple.Create(jobId, message));
                return new BaJobEnded { Id = jobId, JobType = "Restore", ServerId = 3, UserId = 4 };
            }

            public BaJobEnded CloseIfStillRunning(int jobId, string runnerId, string message)
            {
                lock (Gate)
                {
                    CloseChecks.Add(jobId);
                    if (!StillRunningAfterReturn.Contains(jobId)) return null;
                    CloseMessage = message;
                    return new BaJobEnded { Id = jobId, JobType = "HRHelperUpdateUser", UserId = 4 };
                }
            }

            public bool Track(int jobId, string queueName, string runnerId)
            {
                lock (Gate) Tracked.Add(jobId);
                return true;
            }
        }

        private readonly List<BaJobEnded> _failed = new List<BaJobEnded>();
        private readonly List<string> _log = new List<string>();
        private readonly List<BaJobRunner> _runners = new List<BaJobRunner>();

        [TestCleanup]
        public void Cleanup()
        {
            foreach (var runner in _runners) runner.Shutdown();
        }

        private BaJobRunner Create(FakeStore store, IDictionary<string, Action<int>> handlers, Action<BaJobRunnerOptions> configure = null)
        {
            var options = new BaJobRunnerOptions
            {
                QueueName = "PC/BADesign/",
                MaxConcurrentJobs = 2,
                PollInterval = TimeSpan.FromMinutes(5),
                HeartbeatInterval = TimeSpan.FromMinutes(5),
                StaleAfter = TimeSpan.FromMinutes(3)
            };
            if (configure != null) configure(options);
            var runner = new BaJobRunner(store, options, handlers,
                job => { lock (_failed) _failed.Add(job); },
                message => { lock (_log) _log.Add(message); });
            _runners.Add(runner);
            return runner;
        }

        private static bool WaitFor(Func<bool> condition, int timeoutMs = 5000)
        {
            var clock = Stopwatch.StartNew();
            while (clock.ElapsedMilliseconds < timeoutMs)
            {
                if (condition()) return true;
                Thread.Sleep(10);
            }
            return condition();
        }

        private int FailedCount
        {
            get { lock (_failed) return _failed.Count; }
        }

        [TestMethod]
        public void Runs_at_most_the_configured_number_of_jobs_and_takes_the_next_one_when_a_job_ends()
        {
            var store = new FakeStore();
            var gates = new Dictionary<int, ManualResetEventSlim>();
            for (var id = 1; id <= 4; id++) { gates[id] = new ManualResetEventSlim(false); store.Add(id, "Restore"); }
            var started = new List<int>();
            var runner = Create(store, new Dictionary<string, Action<int>>
            {
                { "Restore", id => { lock (started) started.Add(id); gates[id].Wait(10000); } }
            });

            runner.Start();
            Assert.IsTrue(WaitFor(() => runner.RunningCount == 2), "two jobs should run");
            Thread.Sleep(150);
            lock (started) CollectionAssert.AreEqual(new[] { 1, 2 }, started.OrderBy(x => x).ToArray());
            Assert.AreEqual(2, store.PendingCount);

            gates[1].Set();
            Assert.IsTrue(WaitFor(() => { lock (started) return started.Count == 3; }), "a finished job frees a slot at once");
            lock (started) Assert.AreEqual(3, started[2]);

            foreach (var gate in gates.Values) gate.Set();
            Assert.IsTrue(WaitFor(() => runner.RunningCount == 0 && store.PendingCount == 0));
            lock (started) Assert.AreEqual(4, started.Count);
            Assert.AreEqual(0, FailedCount);
        }

        [TestMethod]
        public void Wake_takes_a_new_job_without_waiting_for_the_poll_interval()
        {
            var store = new FakeStore();
            var ran = new ManualResetEventSlim(false);
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => ran.Set() } });
            runner.Start();
            Assert.IsTrue(WaitFor(() => store.Claims >= 1), "the first poll happens at start");

            store.Add(10, "Restore");
            runner.Wake();

            Assert.IsTrue(ran.Wait(3000), "the job runs right after Wake, the poll interval is five minutes");
        }

        [TestMethod]
        public void A_job_that_throws_is_marked_failed_with_its_message_and_reported()
        {
            var store = new FakeStore();
            store.Add(5, "Restore");
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => { throw new InvalidOperationException("server unreachable"); } } });

            runner.Start();

            Assert.IsTrue(WaitFor(() => FailedCount == 1));
            lock (store.Gate) Assert.AreEqual("5|server unreachable", store.Failed[0].Item1 + "|" + store.Failed[0].Item2);
            lock (_failed) Assert.AreEqual("5|3|4", _failed[0].Id + "|" + _failed[0].ServerId + "|" + _failed[0].UserId);
            Assert.IsTrue(WaitFor(() => runner.RunningCount == 0));
        }

        [TestMethod]
        public void A_job_that_returns_without_a_result_is_closed_and_a_finished_one_is_left_alone()
        {
            var store = new FakeStore();
            store.Add(21, "Restore");
            store.Add(22, "Restore");
            lock (store.Gate) store.StillRunningAfterReturn.Add(21);
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => { } } });

            runner.Start();

            Assert.IsTrue(WaitFor(() => { lock (store.Gate) return store.CloseChecks.Count == 2; }));
            Assert.IsTrue(WaitFor(() => FailedCount == 1));
            lock (_failed) Assert.AreEqual(21, _failed[0].Id);
            lock (store.Gate)
            {
                Assert.AreEqual(BaJobRunner.UnfinishedMessage, store.CloseMessage);
                Assert.AreEqual(0, store.Failed.Count, "a job that returned normally is not marked failed");
            }
        }

        [TestMethod]
        public void A_job_thread_aborted_by_the_host_is_marked_interrupted_not_with_the_abort_text()
        {
            var store = new FakeStore();
            store.Add(31, "Restore");
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => Thread.CurrentThread.Abort() } });

            runner.Start();

            Assert.IsTrue(WaitFor(() => { lock (store.Gate) return store.Failed.Count == 1; }));
            lock (store.Gate) Assert.AreEqual("31|" + BaJobRunner.InterruptedMessage, store.Failed[0].Item1 + "|" + store.Failed[0].Item2);
            Assert.IsTrue(WaitFor(() => runner.RunningCount == 0), "the slot is freed even when the thread is aborted");
        }

        [TestMethod]
        public void Only_job_types_with_a_handler_are_asked_for_in_the_runner_queue()
        {
            var store = new FakeStore();
            var runner = Create(store, new Dictionary<string, Action<int>>
            {
                { "HRHelperUpdateUser", id => { } },
                { "Restore", id => { } }
            });

            runner.Start();

            Assert.IsTrue(WaitFor(() => store.Claims >= 1));
            lock (store.Gate)
            {
                Assert.AreEqual("PC/BADesign/", store.ClaimQueue);
                CollectionAssert.AreEqual(new[] { "HRHelperUpdateUser", "Restore" }, store.ClaimTypes);
            }
        }

        [TestMethod]
        public void A_runner_that_does_not_claim_never_takes_jobs_but_keeps_heartbeat_and_recovery()
        {
            var store = new FakeStore();
            store.Add(1, "Restore");
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => { } } }, options =>
            {
                options.Claiming = false;
                options.HeartbeatInterval = TimeSpan.FromMilliseconds(40);
            });

            runner.Start();

            Assert.IsTrue(WaitFor(() => store.Heartbeats >= 4), "heartbeat keeps running");
            Assert.IsTrue(store.OrphanChecks >= 2, "recovery runs at start and every second heartbeat");
            runner.Wake();
            Thread.Sleep(100);
            Assert.AreEqual(0, store.Claims);
            Assert.AreEqual(1, store.PendingCount);
        }

        [TestMethod]
        public void Start_marks_jobs_without_heartbeat_as_interrupted_and_reports_each()
        {
            var store = new FakeStore();
            store.Orphans = new List<BaJobEnded> { new BaJobEnded { Id = 7, JobType = "Restore", ServerId = 1 }, new BaJobEnded { Id = 8, JobType = "HRHelperUpdateUser", UserId = 2 } };
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => { } } });

            runner.Start();

            Assert.IsTrue(WaitFor(() => FailedCount == 2), "the first recovery runs right after start, off the starting thread");
            lock (_failed) Assert.AreEqual("7,8", string.Join(",", _failed.Select(j => j.Id)));
            lock (store.Gate)
            {
                Assert.AreEqual(BaJobRunner.InterruptedMessage, store.OrphanMessage);
                Assert.AreEqual(TimeSpan.FromMinutes(3), store.OrphanStaleAfter);
            }
        }

        [TestMethod]
        public void BeginStop_stops_taking_jobs_and_WaitIdle_waits_for_the_running_one()
        {
            var store = new FakeStore();
            var gate = new ManualResetEventSlim(false);
            store.Add(1, "Restore");
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => gate.Wait(10000) } });
            runner.Start();
            Assert.IsTrue(WaitFor(() => runner.RunningCount == 1));

            runner.BeginStop();
            store.Add(2, "Restore");
            runner.Wake();
            Thread.Sleep(150);

            Assert.IsFalse(runner.IsRunning);
            Assert.AreEqual(1, store.PendingCount, "no job is taken after BeginStop");
            Assert.IsFalse(runner.WaitIdle(TimeSpan.FromMilliseconds(100)));
            gate.Set();
            Assert.IsTrue(runner.WaitIdle(TimeSpan.FromSeconds(5)));
            Assert.AreEqual(1, store.PendingCount);
        }

        [TestMethod]
        public void Shutdown_marks_the_jobs_of_this_runner_interrupted_once()
        {
            var store = new FakeStore();
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => { } } });
            runner.Start();
            store.Own = new List<BaJobEnded> { new BaJobEnded { Id = 9, JobType = "Backup", ServerId = 2 } };

            var first = runner.Shutdown();
            var second = runner.Shutdown();

            Assert.AreEqual("9", string.Join(",", first.Select(j => j.Id)));
            Assert.AreEqual(0, second.Count);
            lock (store.Gate) Assert.AreEqual(BaJobRunner.InterruptedMessage, store.OwnMessage);
            lock (_failed) Assert.AreEqual("9", string.Join(",", _failed.Select(j => j.Id)));
            Assert.IsFalse(runner.Track(12));
        }

        [TestMethod]
        public void Track_works_only_while_the_runner_runs()
        {
            var store = new FakeStore();
            var runner = Create(store, new Dictionary<string, Action<int>>());

            Assert.IsFalse(runner.Track(11), "not started yet");
            runner.Start();
            Assert.IsTrue(runner.Track(12));
            Assert.IsFalse(runner.Track(0));

            lock (store.Gate) CollectionAssert.AreEqual(new[] { 12 }, store.Tracked);
        }

        [TestMethod]
        public void The_same_error_is_logged_once_and_kept_as_last_error()
        {
            var store = new FakeStore { ClaimError = new InvalidOperationException("database offline") };
            var runner = Create(store, new Dictionary<string, Action<int>> { { "Restore", id => { } } }, options => options.PollInterval = TimeSpan.FromMilliseconds(20));

            runner.Start();

            Assert.IsTrue(WaitFor(() => store.Claims >= 5));
            Assert.AreEqual("claim: database offline", runner.LastError);
            lock (_log) Assert.AreEqual(1, _log.Count(line => line.Contains("database offline")));
        }

        [TestMethod]
        public void Options_read_the_worker_settings_with_defaults_and_limits()
        {
            var defaults = BaJobRunnerOptions.FromSettings(new NameValueCollection(), "q", true);
            Assert.AreEqual("15|10|q|True", defaults.MaxConcurrentJobs + "|" + defaults.PollInterval.TotalSeconds + "|" + defaults.QueueName + "|" + defaults.Claiming);

            var set = BaJobRunnerOptions.FromSettings(new NameValueCollection { { "MaxConcurrentJobs", " 3 " }, { "WorkerPollIntervalSeconds", "4" } }, null, false);
            Assert.AreEqual("3|4|False", set.MaxConcurrentJobs + "|" + set.PollInterval.TotalSeconds + "|" + set.Claiming);

            var capped = BaJobRunnerOptions.FromSettings(new NameValueCollection { { "MaxConcurrentJobs", "99" } }, null, true);
            Assert.AreEqual(BaJobRunnerOptions.MaxConcurrentJobsLimit, capped.MaxConcurrentJobs);

            var invalid = BaJobRunnerOptions.FromSettings(new NameValueCollection { { "MaxConcurrentJobs", "0" }, { "WorkerPollIntervalSeconds", "abc" } }, null, true);
            Assert.AreEqual("15|10", invalid.MaxConcurrentJobs + "|" + invalid.PollInterval.TotalSeconds);
            Assert.AreEqual(15, BaJobRunnerOptions.FromSettings(null, null, true).MaxConcurrentJobs);
        }

        [TestMethod]
        public void Queue_name_is_machine_site_and_path_and_fits_the_column()
        {
            Assert.AreEqual("PC01/BADesign/", BaJobQueue.BuildQueueName("PC01", "BADesign", "/"));
            Assert.AreEqual("SRV/Default Web Site/BADesign", BaJobQueue.BuildQueueName("SRV", "Default Web Site", "/BADesign"));
            Assert.AreEqual("PC01//", BaJobQueue.BuildQueueName("PC01", null, null));
            Assert.AreEqual(BaJobQueue.QueueNameMaxLength, BaJobQueue.BuildQueueName("PC01", new string('s', 300), "/").Length);
        }

        [TestMethod]
        public void The_runner_handles_every_job_type_the_worker_ran()
        {
            CollectionAssert.AreEquivalent(
                new[] { "Restore", "HRHelperMultiDbReset", "HRHelperUpdateUser", "HRHelperUpdateUserSignature", "HRHelperUpdateEmployee", "HRHelperUpdateOther" },
                BaJobQueue.Handlers().Keys.ToArray());
        }
    }
}
