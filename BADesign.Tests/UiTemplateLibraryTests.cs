using System.Collections.Generic;
using System.Linq;
using System.Text;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class UiTemplateLibraryTests
    {
        private static string Design(string extra)
        {
            return "[{\"id\":\"c1\",\"type\":\"field\"" + (extra == null ? "" : "," + extra) + "}]";
        }

        private static void AssertAccepted(string json, int expectedCount)
        {
            string error;
            var count = UiTemplateLibrary.ValidateDesign(json, out error);
            Assert.IsNull(error, "Unexpected error: " + error);
            Assert.AreEqual(expectedCount, count);
        }

        private static string AssertRejected(string json)
        {
            string error;
            var count = UiTemplateLibrary.ValidateDesign(json, out error);
            Assert.IsNotNull(error, "The design should have been rejected.");
            Assert.AreEqual(0, count);
            return error;
        }

        [TestMethod]
        public void ValidateDesign_AcceptsPlainDesign_ReturnsControlCount()
        {
            AssertAccepted("[{\"id\":\"c1\",\"type\":\"field\",\"caption\":\"Mã nhân viên\"},{\"id\":\"c2\",\"type\":\"grid\",\"columns\":[{\"caption\":\"Họ tên\",\"width\":120}]}]", 2);
        }

        [TestMethod]
        public void ValidateDesign_RejectsMissingContent()
        {
            AssertRejected(null);
            AssertRejected("");
            AssertRejected("   ");
            AssertRejected("[]");
        }

        [TestMethod]
        public void ValidateDesign_RejectsContentThatIsNotAnArrayOfControls()
        {
            AssertRejected("not json");
            AssertRejected("{\"id\":\"c1\",\"type\":\"field\"}");
            AssertRejected("[1]");
            AssertRejected("[\"text\"]");
            AssertRejected("[null]");
        }

        [TestMethod]
        public void ValidateDesign_RejectsControlWithoutIdOrType()
        {
            AssertRejected("[{\"type\":\"field\"}]");
            AssertRejected("[{\"id\":\"c1\"}]");
            AssertRejected("[{\"id\":\"\",\"type\":\"field\"}]");
            AssertRejected("[{\"id\":12,\"type\":\"field\"}]");
            AssertRejected("[{\"id\":\"c1\",\"type\":null}]");
        }

        [TestMethod]
        public void ValidateDesign_AcceptsIdMadeOfLettersDigitsAndAllowedPunctuation()
        {
            AssertAccepted("[{\"id\":\"field_1.a:b-2\",\"type\":\"ess-grid\"}]", 1);
        }

        [TestMethod]
        public void ValidateDesign_RejectsIdOrTypeThatCouldBreakOutOfAnAttribute()
        {
            AssertRejected("[{\"id\":\"c1\\\" onclick=\\\"x\",\"type\":\"field\"}]");
            AssertRejected("[{\"id\":\"c 1\",\"type\":\"field\"}]");
            AssertRejected("[{\"id\":\"c1'\",\"type\":\"field\"}]");
            AssertRejected("[{\"id\":\"c1\",\"type\":\"field><b\"}]");
            AssertRejected("[{\"id\":\"" + new string('a', 121) + "\",\"type\":\"field\"}]");
        }

        [TestMethod]
        public void ValidateDesign_RejectsHtmlTagsInAnyText()
        {
            AssertRejected(Design("\"caption\":\"<img src=x onerror=alert(1)>\""));
            AssertRejected(Design("\"caption\":\"<script>alert(1)</script>\""));
            AssertRejected(Design("\"caption\":\"abc</div>\""));
            AssertRejected(Design("\"caption\":\"<!-- x -->\""));
            AssertRejected(Design("\"caption\":\"<?xml\""));
        }

        [TestMethod]
        public void ValidateDesign_RejectsEventHandlerAndScriptUrl()
        {
            AssertRejected(Design("\"caption\":\"x\\\" onmouseover=alert(1)\""));
            AssertRejected(Design("\"caption\":\"ONCLICK = run()\""));
            AssertRejected(Design("\"link\":\"javascript:alert(1)\""));
            AssertRejected(Design("\"link\":\"JaVaScRiPt :alert(1)\""));
        }

        [TestMethod]
        public void ValidateDesign_RejectsUnsafeTextNestedInsideColumnsAndItems()
        {
            AssertRejected(Design("\"columns\":[{\"caption\":\"Tên\"},{\"caption\":\"<b>Lương</b>\"}]"));
            AssertRejected(Design("\"tabs\":[{\"items\":[{\"text\":\"<iframe src=x>\"}]}]"));
        }

        [TestMethod]
        public void ValidateDesign_AcceptsOrdinaryLabelsWithComparisonSigns()
        {
            AssertAccepted(Design("\"caption\":\"Tuổi < 18\""), 1);
            AssertAccepted(Design("\"caption\":\"Số ngày <= 5 và > 0\""), 1);
            AssertAccepted(Design("\"caption\":\"x<5\""), 1);
            AssertAccepted(Design("\"caption\":\"A & B \\\"C\\\" 'D'\""), 1);
        }

        [TestMethod]
        public void ValidateDesign_AcceptsOrdinaryWordsThatContainOn()
        {
            AssertAccepted(Design("\"caption\":\"Condition = A\""), 1);
            AssertAccepted(Design("\"caption\":\"Online\""), 1);
            AssertAccepted(Design("\"caption\":\"on = 1\""), 1);
            AssertAccepted(Design("\"caption\":\"only=1\""), 1);
        }

        [TestMethod]
        public void ValidateDesign_AcceptsBase64ImageData()
        {
            AssertAccepted(Design("\"imageData\":\"data:image/png;base64,iVBORw0KGgo=\""), 1);
            AssertAccepted(Design("\"imageData\":\"DATA:image/JPEG;base64,/9j/4AAQ\""), 1);
        }

        [TestMethod]
        public void ValidateDesign_RejectsDataUrlThatIsNotAnImage()
        {
            AssertRejected(Design("\"imageData\":\"data:text/html;base64,PHNjcmlwdD4=\""));
            AssertRejected(Design("\"imageData\":\"data:image/svg+xml;base64,PHN2Zz4=\""));
            AssertRejected(Design("\"imageData\":\"data:image/png;base64,AAAA\\\" onerror=\\\"x\""));
            AssertRejected(Design("\"imageData\":\"data:image/png,notbase64\""));
        }

        [TestMethod]
        public void ValidateDesign_ErrorQuotesAtMostFortyCharactersOfTheOffendingText()
        {
            var text = "<b>" + new string('a', 100);
            var error = AssertRejected(Design("\"caption\":\"" + text + "\""));
            StringAssert.Contains(error, text.Substring(0, 40) + "...");
            Assert.IsFalse(error.Contains(text.Substring(0, 41)), "The error must not repeat the whole text.");
        }

        [TestMethod]
        public void ValidateDesign_AcceptsThreeThousandControls_RejectsOneMore()
        {
            var controls = Enumerable.Range(1, 3000).Select(i => "{\"id\":\"c" + i + "\",\"type\":\"field\"}").ToList();
            AssertAccepted("[" + string.Join(",", controls) + "]", 3000);
            controls.Add("{\"id\":\"c3001\",\"type\":\"field\"}");
            AssertRejected("[" + string.Join(",", controls) + "]");
        }

        [TestMethod]
        public void ValidateDesign_RejectsDesignLargerThanEightMegabytes()
        {
            var limit = 8 * 1024 * 1024;
            var prefix = "[{\"id\":\"c1\",\"type\":\"field\",\"note\":\"";
            var suffix = "\"}]";
            var atLimit = new StringBuilder(prefix).Append('a', limit - prefix.Length - suffix.Length).Append(suffix).ToString();
            Assert.AreEqual(limit, atLimit.Length);
            AssertAccepted(atLimit, 1);
            var overLimit = new StringBuilder(prefix).Append('a', limit - prefix.Length - suffix.Length + 1).Append(suffix).ToString();
            AssertRejected(overLimit);
        }

        private static TemplateWorkflowDto Workflow(params int[] approversPerStep)
        {
            var workflow = new TemplateWorkflowDto { WorkflowId = 1, Name = "Test", IsActive = true, RoleIds = new List<int>(), Steps = new List<TemplateWorkflowStepDto>() };
            for (var i = 0; i < approversPerStep.Length; i++)
            {
                workflow.Steps.Add(new TemplateWorkflowStepDto
                {
                    StepNo = i + 1,
                    StepName = "Step " + (i + 1),
                    ApproverIds = Enumerable.Range(100, approversPerStep[i]).ToList(),
                    ApproverNames = Enumerable.Range(100, approversPerStep[i]).Select(id => "User " + id).ToList()
                });
            }
            return workflow;
        }

        [TestMethod]
        public void WorkflowProblem_NoWorkflow_ReturnsMessage()
        {
            Assert.IsNotNull(UiTemplateLibrary.WorkflowProblem(null));
        }

        [TestMethod]
        public void WorkflowProblem_EveryStepHasAnApprover_ReturnsNull()
        {
            Assert.IsNull(UiTemplateLibrary.WorkflowProblem(Workflow(1)));
            Assert.IsNull(UiTemplateLibrary.WorkflowProblem(Workflow(2, 1, 3)));
        }

        [TestMethod]
        public void WorkflowProblem_StepWithoutApprover_NamesThatStep()
        {
            var problem = UiTemplateLibrary.WorkflowProblem(Workflow(1, 0, 2));
            Assert.IsNotNull(problem);
            StringAssert.Contains(problem, "2");
            Assert.IsFalse(problem.Contains("3"), "Only the first step without an approver is reported.");
        }

        [TestMethod]
        public void WorkflowProblem_RoleManagerStepWithoutManager_SaysTheRoleHasNoManager()
        {
            var workflow = Workflow(1, 0);
            workflow.Steps[1].UseRoleManager = true;
            var forManager = UiTemplateLibrary.WorkflowProblem(workflow);
            var forNamedApprovers = UiTemplateLibrary.WorkflowProblem(Workflow(1, 0));
            Assert.IsNotNull(forManager);
            StringAssert.Contains(forManager, "2");
            StringAssert.Contains(forManager, "role");
            Assert.AreNotEqual(forNamedApprovers, forManager);
        }

        [TestMethod]
        public void WorkflowProblem_RoleManagerStepWithManager_ReturnsNull()
        {
            var workflow = Workflow(1, 1);
            workflow.Steps[0].UseRoleManager = true;
            Assert.IsNull(UiTemplateLibrary.WorkflowProblem(workflow));
        }

        private const int Submitter = 10;
        private const int Lead = 20;
        private const int Manager = 30;
        private const int Admin = 99;

        private static TemplateAdvanceStep Step(int stepNo, params int[] approvers)
        {
            return new TemplateAdvanceStep { StepNo = stepNo, ApproverIds = approvers.ToList() };
        }

        private static string Describe(TemplateAdvancePlan plan)
        {
            return string.Join(",", plan.AutoSteps.Select(a => a.Key + ":" + a.Value)) + "|" + plan.PendingStepNo;
        }

        [TestMethod]
        public void PlanAdvance_NoStepLeft_IsFullyApproved()
        {
            Assert.AreEqual("|0", Describe(UiTemplateLibrary.PlanAdvance(new List<TemplateAdvanceStep>(), Submitter, Lead)));
            Assert.AreEqual("|0", Describe(UiTemplateLibrary.PlanAdvance(null, Submitter, Lead)));
        }

        [TestMethod]
        public void PlanAdvance_NextStepBelongsToSomeoneElse_WaitsThere()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(1, Lead), Step(2, Manager) }, Submitter, Submitter);
            Assert.AreEqual("|1", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_SubmitterIsApproverOfTheFirstStep_PassesItAndWaitsAtTheNext()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(1, Submitter, Lead), Step(2, Manager) }, Submitter, Submitter);
            Assert.AreEqual("1:" + Submitter + "|2", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_SubmitterIsApproverOfEveryStep_IsFullyApproved()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(1, Submitter), Step(2, Submitter, Manager) }, Submitter, Submitter);
            Assert.AreEqual("1:" + Submitter + ",2:" + Submitter + "|0", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_ApproverOfThePreviousStepIsAlsoNext_PassesTheNextStepAsThatApprover()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(2, Lead, Manager), Step(3, Manager) }, Submitter, Lead);
            Assert.AreEqual("2:" + Lead + "|3", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_SameApproverOnEveryRemainingStep_IsFullyApproved()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(2, Lead), Step(3, Manager, Lead) }, Submitter, Lead);
            Assert.AreEqual("2:" + Lead + ",3:" + Lead + "|0", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_AdminApprovingOnBehalfIsNotNamedInTheNextStep_DoesNotPassIt()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(2, Manager) }, Submitter, Admin);
            Assert.AreEqual("|2", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_StopsAtTheFirstStepOfSomeoneElse_EvenIfALaterStepMatches()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(2, Lead), Step(3, Manager), Step(4, Lead) }, Submitter, Lead);
            Assert.AreEqual("2:" + Lead + "|3", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_StepNamesBothSubmitterAndApprover_IsRecordedForTheSubmitter()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(2, Lead, Submitter) }, Submitter, Lead);
            Assert.AreEqual("2:" + Submitter + "|0", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_StepsGivenOutOfOrder_AreHandledByStepNumber()
        {
            var plan = UiTemplateLibrary.PlanAdvance(new[] { Step(3, Manager), Step(2, Lead) }, Submitter, Lead);
            Assert.AreEqual("2:" + Lead + "|3", Describe(plan));
        }

        [TestMethod]
        public void PlanAdvance_StepWithoutApprovers_WaitsThere()
        {
            var steps = new[] { new TemplateAdvanceStep { StepNo = 2, ApproverIds = null }, Step(3, Lead) };
            Assert.AreEqual("|2", Describe(UiTemplateLibrary.PlanAdvance(steps, Submitter, Lead)));
        }

        private const int RoleBoss = 500;
        private const int BigBoss = 600;
        private const int LockedUser = 700;
        private static readonly int[] ActiveUsers = { RoleBoss, BigBoss, 101, 102 };

        private static TemplateWorkflowStepDto BossStep()
        {
            return new TemplateWorkflowStepDto { UseRoleManager = true, ApproverIds = new List<int>() };
        }

        private static TemplateWorkflowStepDto PersonStep(params int[] ids)
        {
            return new TemplateWorkflowStepDto { UseRoleManager = false, ApproverIds = ids.ToList() };
        }

        [TestMethod]
        public void StepsProblem_RoleBossThenNamedPeople_IsAccepted()
        {
            var steps = new List<TemplateWorkflowStepDto> { BossStep(), PersonStep(101), PersonStep(BigBoss) };
            Assert.IsNull(UiTemplateLibrary.StepsProblem(steps, ActiveUsers));
        }

        [TestMethod]
        public void StepsProblem_NoStep_IsRejected()
        {
            Assert.IsNotNull(UiTemplateLibrary.StepsProblem(null, ActiveUsers));
            Assert.IsNotNull(UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto>(), ActiveUsers));
        }

        [TestMethod]
        public void StepsProblem_MoreStepsThanTheLimit_IsRejected()
        {
            var atLimit = Enumerable.Range(0, UiTemplateLibrary.MaxSteps).Select(i => BossStep()).ToList();
            var overLimit = Enumerable.Range(0, UiTemplateLibrary.MaxSteps + 1).Select(i => BossStep()).ToList();
            Assert.IsNull(UiTemplateLibrary.StepsProblem(atLimit, ActiveUsers));
            Assert.IsNotNull(UiTemplateLibrary.StepsProblem(overLimit, ActiveUsers));
        }

        [TestMethod]
        public void StepsProblem_StepWithNeitherBossNorPerson_NamesThatStep()
        {
            var problem = UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto> { BossStep(), PersonStep() }, ActiveUsers);
            Assert.IsNotNull(problem);
            StringAssert.Contains(problem, "2");
        }

        [TestMethod]
        public void StepsProblem_StepWithBothBossAndPerson_IsRejected()
        {
            var both = new TemplateWorkflowStepDto { UseRoleManager = true, ApproverIds = new List<int> { 101 } };
            var problem = UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto> { both }, ActiveUsers);
            Assert.IsNotNull(problem);
            StringAssert.Contains(problem, "1");
        }

        [TestMethod]
        public void StepsProblem_NamedPersonWhoIsLocked_IsRejected()
        {
            Assert.IsNotNull(UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto> { PersonStep(LockedUser) }, ActiveUsers));
        }

        [TestMethod]
        public void StepsProblem_MorePeopleThanTheLimitInOneStep_IsRejected()
        {
            var people = Enumerable.Range(1000, UiTemplateLibrary.MaxApproversPerStep + 1).ToArray();
            var problem = UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto> { PersonStep(people) }, people);
            Assert.IsNotNull(problem);
            Assert.IsNull(UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto> { PersonStep(people.Take(UiTemplateLibrary.MaxApproversPerStep).ToArray()) }, people));
        }

        [TestMethod]
        public void StepsProblem_SamePersonListedTwice_CountsOnce()
        {
            Assert.IsNull(UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto> { PersonStep(101, 101) }, ActiveUsers));
        }

        [TestMethod]
        public void StepsProblem_MissingStepEntry_IsRejected()
        {
            Assert.IsNotNull(UiTemplateLibrary.StepsProblem(new List<TemplateWorkflowStepDto> { null }, ActiveUsers));
        }

        [TestMethod]
        public void StepApproverIds_BossStep_IsTheBossOfTheSubmittersRole()
        {
            CollectionAssert.AreEqual(new[] { RoleBoss }, UiTemplateLibrary.StepApproverIds(BossStep(), RoleBoss, ActiveUsers));
        }

        [TestMethod]
        public void StepApproverIds_BossStep_RoleWithoutBoss_HasNoApprover()
        {
            Assert.AreEqual(0, UiTemplateLibrary.StepApproverIds(BossStep(), null, ActiveUsers).Count);
        }

        [TestMethod]
        public void StepApproverIds_BossStep_LockedBoss_HasNoApprover()
        {
            Assert.AreEqual(0, UiTemplateLibrary.StepApproverIds(BossStep(), LockedUser, ActiveUsers).Count);
        }

        [TestMethod]
        public void StepApproverIds_PersonStep_IgnoresTheRoleBoss()
        {
            CollectionAssert.AreEqual(new[] { BigBoss }, UiTemplateLibrary.StepApproverIds(PersonStep(BigBoss), RoleBoss, ActiveUsers));
        }

        [TestMethod]
        public void StepApproverIds_PersonStep_DropsLockedPeopleAndDuplicates()
        {
            CollectionAssert.AreEqual(new[] { 101, 102 }, UiTemplateLibrary.StepApproverIds(PersonStep(101, LockedUser, 102, 101), RoleBoss, ActiveUsers));
        }

        [TestMethod]
        public void StepApproverIds_BossStepThatStillCarriesPeople_UsesOnlyTheBoss()
        {
            var both = new TemplateWorkflowStepDto { UseRoleManager = true, ApproverIds = new List<int> { 101 } };
            CollectionAssert.AreEqual(new[] { RoleBoss }, UiTemplateLibrary.StepApproverIds(both, RoleBoss, ActiveUsers));
        }

        [TestMethod]
        public void StepApproverIds_MissingInput_HasNoApprover()
        {
            Assert.AreEqual(0, UiTemplateLibrary.StepApproverIds(null, RoleBoss, ActiveUsers).Count);
            Assert.AreEqual(0, UiTemplateLibrary.StepApproverIds(PersonStep(101), RoleBoss, null).Count);
            Assert.AreEqual(0, UiTemplateLibrary.StepApproverIds(new TemplateWorkflowStepDto { UseRoleManager = false, ApproverIds = null }, RoleBoss, ActiveUsers).Count);
        }

        [TestMethod]
        public void ThreeStepExample_BossOfEachRoleThenTheSameBigBoss()
        {
            var standardBoss = 500;
            var projectBoss = 501;
            var active = new[] { standardBoss, projectBoss, BigBoss };
            var steps = new List<TemplateWorkflowStepDto> { BossStep(), PersonStep(BigBoss) };
            Assert.IsNull(UiTemplateLibrary.StepsProblem(steps, active));
            CollectionAssert.AreEqual(new[] { standardBoss }, UiTemplateLibrary.StepApproverIds(steps[0], standardBoss, active));
            CollectionAssert.AreEqual(new[] { projectBoss }, UiTemplateLibrary.StepApproverIds(steps[0], projectBoss, active));
            CollectionAssert.AreEqual(new[] { BigBoss }, UiTemplateLibrary.StepApproverIds(steps[1], standardBoss, active));
            CollectionAssert.AreEqual(new[] { BigBoss }, UiTemplateLibrary.StepApproverIds(steps[1], projectBoss, active));
        }
    }
}
