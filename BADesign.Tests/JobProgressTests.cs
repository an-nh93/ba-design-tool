using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class JobProgressThrottleTests
    {
        private long _now;

        private JobProgressThrottle Create(long minIntervalMs = 800)
        {
            _now = 0;
            return new JobProgressThrottle(minIntervalMs, () => _now);
        }

        [TestMethod]
        public void Offer_FirstUpdateIsEmittedImmediately()
        {
            var throttle = Create();
            var update = throttle.Offer(5, "Bước 1", null, false);
            Assert.IsNotNull(update);
            Assert.AreEqual(5, update.Percent);
            Assert.AreEqual("Bước 1", update.Message);
        }

        [TestMethod]
        public void Offer_FastUpdatesAreHeldUntilIntervalPasses()
        {
            var throttle = Create();
            Assert.IsNotNull(throttle.Offer(1, "Chạy", null, false));
            var emitted = 0;
            for (var i = 2; i <= 50; i++)
            {
                _now += 10;
                if (throttle.Offer(i, "Chạy", null, false) != null) emitted++;
            }
            Assert.AreEqual(0, emitted);
            Assert.IsNull(throttle.Flush(false));
            _now = 800;
            var held = throttle.Flush(false);
            Assert.IsNotNull(held);
            Assert.AreEqual(50, held.Percent);
        }

        [TestMethod]
        public void Offer_HundredQuickStepsProduceAtMostTwoWritesPerSecond()
        {
            var throttle = Create();
            var emitted = 0;
            for (var i = 1; i <= 100; i++)
            {
                if (throttle.Offer(i, "Chạy", null, false) != null) emitted++;
                _now += 10;
            }
            Assert.IsTrue(emitted <= 2, "emitted " + emitted);
        }

        [TestMethod]
        public void Offer_PhaseChangeIsEmittedEvenInsideTheInterval()
        {
            var throttle = Create();
            throttle.Offer(10, "Restore", null, false, "Restore");
            _now += 50;
            Assert.IsNull(throttle.Offer(20, "Restore", null, false, "Restore"));
            _now += 50;
            var update = throttle.Offer(55, "Reset Information", null, false, "Reset Information");
            Assert.IsNotNull(update);
            Assert.AreEqual("Reset Information", update.Message);
        }

        [TestMethod]
        public void Offer_MessageChangeAloneStaysThrottled()
        {
            var throttle = Create();
            Assert.IsNotNull(throttle.Offer(1, "Đang xử lý 0/100 nhân viên", null, false));
            _now += 50;
            Assert.IsNull(throttle.Offer(10, "Đang xử lý 10/100 nhân viên", null, false));
            _now = 800;
            var held = throttle.Flush(false);
            Assert.IsNotNull(held);
            Assert.AreEqual("Đang xử lý 10/100 nhân viên", held.Message);
        }

        [TestMethod]
        public void Offer_ForceIsEmittedEvenInsideTheInterval()
        {
            var throttle = Create();
            throttle.Offer(10, "Chạy", null, false);
            _now += 5;
            Assert.IsNotNull(throttle.Offer(11, "Chạy", null, true));
        }

        [TestMethod]
        public void Offer_PercentNeverGoesBackwards()
        {
            var throttle = Create();
            throttle.Offer(79, "Restore", null, false);
            _now += 1000;
            var update = throttle.Offer(1, "Restore", null, false);
            Assert.AreEqual(79, update.Percent);
        }

        [TestMethod]
        public void Offer_PercentIsClampedToRange()
        {
            var throttle = Create();
            Assert.AreEqual(0, throttle.Offer(-5, "A", null, false).Percent);
            _now += 1000;
            Assert.AreEqual(100, throttle.Offer(250, "A", null, false).Percent);
        }

        [TestMethod]
        public void Offer_NullMessageKeepsThePreviousOne()
        {
            var throttle = Create();
            throttle.Offer(10, "Restore", null, false);
            _now += 1000;
            var update = throttle.Offer(20, null, null, false);
            Assert.AreEqual("Restore", update.Message);
        }

        [TestMethod]
        public void Flush_ForceReturnsTheHeldUpdateAtOnce()
        {
            var throttle = Create();
            throttle.Offer(10, "Chạy", null, false);
            _now += 5;
            Assert.IsNull(throttle.Offer(40, "Chạy", "40/100", false));
            var held = throttle.Flush(true);
            Assert.IsNotNull(held);
            Assert.AreEqual(40, held.Percent);
            Assert.AreEqual("40/100", held.Detail);
            Assert.IsNull(throttle.Flush(true));
        }

        [TestMethod]
        public void Current_ReturnsLatestStateForHeartbeat()
        {
            var throttle = Create();
            Assert.IsNull(throttle.Current());
            throttle.Offer(30, "Reset Information", "Bước 2", false);
            var current = throttle.Current();
            Assert.AreEqual(30, current.Percent);
            Assert.AreEqual("Reset Information", current.Message);
            Assert.AreEqual("Bước 2", current.Detail);
        }

        [TestMethod]
        public void Current_PrefersHeldUpdateOverLastEmittedDetail()
        {
            var throttle = Create();
            throttle.Offer(30, "Reset Information", "Bước 2", false);
            _now += 10;
            Assert.IsNull(throttle.Offer(35, "Reset Information", "Bước 3", false));
            var current = throttle.Current();
            Assert.AreEqual(35, current.Percent);
            Assert.AreEqual("Bước 3", current.Detail);
        }

        [TestMethod]
        public void Current_ClearsDetailWhenLastEmittedUpdateHadNone()
        {
            var throttle = Create();
            throttle.Offer(30, "Reset Information", "Bước 2", false);
            _now += 1000;
            Assert.IsNotNull(throttle.Offer(98, "Completing", null, false));
            Assert.IsNull(throttle.Current().Detail);
        }
    }

    [TestClass]
    public class JobProgressPlanTests
    {
        [TestMethod]
        public void Restore_WithSanitize_IsOneContinuousScale()
        {
            var plan = JobProgressPlan.ForRestore(true, true);
            Assert.AreEqual(0, plan.Overall("Restore", 0));
            var restoreEnd = plan.Overall("Restore", 100);
            var sanitizeStart = plan.Overall("Reset Information", 0);
            var sanitizeEnd = plan.Overall("Reset Information", 100);
            Assert.IsTrue(restoreEnd > 40 && restoreEnd < 70, "restore end " + restoreEnd);
            Assert.IsTrue(sanitizeStart >= restoreEnd, "sanitize must start after restore");
            Assert.IsTrue(sanitizeEnd > sanitizeStart);
            Assert.IsTrue(plan.Overall("Completing", 100) <= 99);
        }

        [TestMethod]
        public void Restore_SanitizeProgressMovesTheBarAfterRestoreStoppedAt79()
        {
            var plan = JobProgressPlan.ForRestore(true, false);
            var atRestore79 = plan.Overall("Restore", 79);
            var atSanitize1 = plan.Overall("Reset Information", 1);
            var atSanitize50 = plan.Overall("Reset Information", 50);
            Assert.IsTrue(atSanitize1 >= atRestore79, "bar must not go back when the sanitize phase starts");
            Assert.IsTrue(atSanitize50 > atSanitize1, "bar must move during the sanitize phase");
        }

        [TestMethod]
        public void Restore_WithoutSanitize_GivesRestoreMostOfTheScale()
        {
            var plan = JobProgressPlan.ForRestore(false, false);
            Assert.IsTrue(plan.Overall("Restore", 100) >= 85);
            Assert.IsFalse(plan.Knows("Reset Information"));
        }

        [TestMethod]
        public void Overall_IsMonotonicAcrossPhases()
        {
            var plan = JobProgressPlan.ForRestore(true, true);
            var phases = new[] { "Restore", "PostRestore", "Reset Information", "ShrinkLog", "Completing" };
            var last = -1;
            foreach (var phase in phases)
            {
                for (var local = 0; local <= 100; local += 10)
                {
                    var value = plan.Overall(phase, local);
                    Assert.IsTrue(value >= last, phase + " " + local + " gave " + value + " after " + last);
                    last = value;
                }
            }
            Assert.IsTrue(last <= 99);
        }

        [TestMethod]
        public void Overall_UnknownPhaseFallsBackToLocalPercent()
        {
            var plan = JobProgressPlan.ForRestore(true, false);
            Assert.AreEqual(42, plan.Overall("Khác", 42));
            Assert.AreEqual(99, plan.Overall("Khác", 150));
        }

        [TestMethod]
        public void Overall_PhaseNameIgnoresCaseAndSpaces()
        {
            var plan = JobProgressPlan.ForRestore(true, false);
            Assert.AreEqual(plan.Overall("Reset Information", 50), plan.Overall(" reset information ", 50));
        }
    }

    [TestClass]
    public class JobBatchSizerTests
    {
        [TestMethod]
        public void Next_ShrinksWhenBatchIsSlow()
        {
            Assert.AreEqual(625, JobBatchSizer.Next(1250, 30000, 50, 2000, 3000));
        }

        [TestMethod]
        public void Next_GrowsWhenBatchIsFast()
        {
            Assert.AreEqual(20, JobBatchSizer.Next(10, 20, 10, 2000, 3000));
        }

        [TestMethod]
        public void Next_StaysInsideLimits()
        {
            Assert.AreEqual(50, JobBatchSizer.Next(60, 60000, 50, 2000, 3000));
            Assert.AreEqual(2000, JobBatchSizer.Next(1500, 100, 50, 2000, 3000));
        }

        [TestMethod]
        public void Next_KeepsSizeWhenTimeIsUnknown()
        {
            Assert.AreEqual(400, JobBatchSizer.Next(400, 0, 50, 2000, 3000));
        }

        [TestMethod]
        public void Eta_ScalesWithRemainingWork()
        {
            Assert.AreEqual("09:00", JobBatchSizer.Eta(60000, 5000, 50000));
            Assert.IsNull(JobBatchSizer.Eta(60000, 0, 50000));
            Assert.IsNull(JobBatchSizer.Eta(60000, 50000, 50000));
        }

        [TestMethod]
        public void Clock_FormatsMinutesAndHours()
        {
            Assert.AreEqual("00:05", JobBatchSizer.Clock(5000));
            Assert.AreEqual("03:20", JobBatchSizer.Clock(200000));
            Assert.AreEqual("1:01:01", JobBatchSizer.Clock(3661000));
        }
    }
}
