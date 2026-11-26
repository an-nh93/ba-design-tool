using System.Collections.Generic;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json.Linq;

namespace BADesign.Tests
{
    [TestClass]
    public class BaJobViewTests
    {
        private const int Me = 7;
        private const int SomeoneElse = 8;
        private const string FakeSecret = "TEST-not-a-real-secret";
        private const string FakeConnection = "Server=TEST-SERVER;Database=TEST_DB;User Id=test;Password=" + FakeSecret;

        private static readonly List<int> NoServer = new List<int>();
        private static readonly List<int> ServersTwoAndFive = new List<int> { 2, 5 };

        private static JObject ShownObject(string payloadJson)
        {
            return JObject.Parse(BaJobView.Payload(payloadJson));
        }

        private static List<string> Keys(JObject shown)
        {
            var keys = new List<string>();
            foreach (var property in shown.Properties()) keys.Add(property.Name);
            keys.Sort(string.CompareOrdinal);
            return keys;
        }

        [TestMethod]
        public void CanView_OwnJob_IsAllowedForEveryJobType()
        {
            Assert.IsTrue(BaJobView.CanView("HRHelperUpdateUser", null, Me, Me, NoServer));
            Assert.IsTrue(BaJobView.CanView("Restore", 9, Me, Me, NoServer));
            Assert.IsTrue(BaJobView.CanView("Backup", 9, Me, Me, ServersTwoAndFive));
        }

        [TestMethod]
        public void CanView_UserWhoSeesEveryServer_IsAllowedForJobsOfOthers()
        {
            Assert.IsTrue(BaJobView.CanView("Restore", 9, SomeoneElse, Me, null));
            Assert.IsTrue(BaJobView.CanView("HRHelperMultiDbReset", null, SomeoneElse, Me, null));
            Assert.IsTrue(BaJobView.CanView("HRHelperDeleteEmployee", null, null, Me, null));
        }

        [TestMethod]
        public void CanView_RestoreOrBackupOfSomeoneElse_FollowsTheServerList()
        {
            Assert.IsTrue(BaJobView.CanView("Restore", 5, SomeoneElse, Me, ServersTwoAndFive));
            Assert.IsTrue(BaJobView.CanView("Backup", 2, SomeoneElse, Me, ServersTwoAndFive));
            Assert.IsTrue(BaJobView.CanView("restore", 5, SomeoneElse, Me, ServersTwoAndFive));
            Assert.IsFalse(BaJobView.CanView("Restore", 9, SomeoneElse, Me, ServersTwoAndFive));
            Assert.IsFalse(BaJobView.CanView("Backup", null, SomeoneElse, Me, ServersTwoAndFive));
            Assert.IsFalse(BaJobView.CanView("Restore", 5, SomeoneElse, Me, NoServer));
        }

        [TestMethod]
        public void CanView_HrHelperJobOfSomeoneElse_IsRefusedEvenOnAnAllowedServer()
        {
            Assert.IsFalse(BaJobView.CanView("HRHelperMultiDbReset", 5, SomeoneElse, Me, ServersTwoAndFive));
            Assert.IsFalse(BaJobView.CanView("HRHelperUpdateUser", null, SomeoneElse, Me, ServersTwoAndFive));
            Assert.IsFalse(BaJobView.CanView("HRHelperUpdateOther", null, SomeoneElse, Me, NoServer));
        }

        [TestMethod]
        public void CanView_JobWithoutOwnerOrType_IsRefusedForAnOrdinaryUser()
        {
            Assert.IsFalse(BaJobView.CanView("Restore", null, null, Me, ServersTwoAndFive));
            Assert.IsFalse(BaJobView.CanView(null, 5, null, Me, ServersTwoAndFive));
            Assert.IsFalse(BaJobView.CanView("", 5, SomeoneElse, Me, ServersTwoAndFive));
        }

        [TestMethod]
        public void Payload_EmptyOrUnreadable_ReturnsNothing()
        {
            Assert.IsNull(BaJobView.Payload(null));
            Assert.IsNull(BaJobView.Payload(""));
            Assert.IsNull(BaJobView.Payload("  \r\n "));
            Assert.IsNull(BaJobView.Payload("{\"connectionString\":\"" + FakeConnection + "\""));
            Assert.IsNull(BaJobView.Payload("connectionString=" + FakeConnection));
            Assert.IsNull(BaJobView.Payload("\"" + FakeConnection + "\""));
            Assert.IsNull(BaJobView.Payload("12345"));
            Assert.IsNull(BaJobView.Payload("true"));
            Assert.IsNull(BaJobView.Payload("null"));
        }

        [TestMethod]
        public void Payload_UpdateUserJob_DropsConnectionStringAndNewPassword()
        {
            var payload = "{\"connectionString\":\"" + FakeConnection + "\",\"userIds\":[11,12],\"isUpdatePassword\":true,\"password\":\"" + FakeSecret
                + "\",\"methodHash\":\"SHA256\",\"isUpdateEmail\":true,\"email\":\"test@example.com\",\"ignoreWindowsAD\":false}";

            var shown = BaJobView.Payload(payload);

            Assert.AreEqual("{\"email\":\"test@example.com\"}", shown);
        }

        [TestMethod]
        public void Payload_UpdateUserSignatureJob_ShowsNothing()
        {
            Assert.AreEqual("{}", BaJobView.Payload("{\"connectionString\":\"" + FakeConnection + "\",\"userIds\":[11]}"));
        }

        [TestMethod]
        public void Payload_UpdateOtherJob_DropsMailServerPassword()
        {
            var payload = "{\"connectionString\":\"" + FakeConnection + "\",\"tenantID\":1,\"companyID\":2,\"isUpdateAll\":true,\"useCommonEmail\":true,\"commonEmail\":\"hr@example.com\","
                + "\"hrEmailTo\":\"\",\"hrEmailCC\":\"\",\"payrollEmailTo\":\"\",\"payrollEmailCC\":\"\",\"contactEmail\":\"\",\"outgoingServer\":\"mail.example.com\",\"serverPort\":\"25\","
                + "\"accountName\":\"TEST\",\"userName\":\"test@example.com\",\"emailAddress\":\"test@example.com\",\"password\":\"" + FakeSecret + "\",\"enableSSL\":false,\"sslPort\":\"0\"}";

            var shown = BaJobView.Payload(payload);

            Assert.AreEqual("{}", shown);
        }

        [TestMethod]
        public void Payload_UpdateEmployeeJob_KeepsWhatTheOverlayShows()
        {
            var payload = "{\"connectionString\":\"" + FakeConnection + "\",\"companyID\":2,\"employeeIds\":[101,102],\"updPersonal\":true,\"personalEmail\":\"a@example.com\","
                + "\"updBusiness\":false,\"businessEmail\":\"\",\"updPayslip\":true,\"payslipCommon\":\"p@example.com\",\"payslipByEmp\":false,\"updM1\":true,\"m1\":\"0900000001\","
                + "\"updM2\":false,\"m2\":\"\",\"updBasic\":true,\"basicSalary\":15000000.50,\"isGenerateTestData\":true,\"emailDomain\":\"example.com\",\"salaryMin\":1,\"salaryMax\":2}";

            var shown = ShownObject(payload);

            CollectionAssert.AreEqual(
                new List<string> { "basicSalary", "businessEmail", "m1", "m2", "personalEmail", "updBasic", "updBusiness", "updM1", "updM2", "updPayslip", "updPersonal" },
                Keys(shown));
            Assert.IsTrue((bool)shown["updPersonal"]);
            Assert.IsFalse((bool)shown["updBusiness"]);
            Assert.AreEqual("a@example.com", (string)shown["personalEmail"]);
            Assert.AreEqual("0900000001", (string)shown["m1"]);
            StringAssert.Contains(BaJobView.Payload(payload), "\"basicSalary\":15000000.50");
        }

        [TestMethod]
        public void Payload_MultiDbResetJob_KeepsTheDatabaseListAndDropsEveryConnectionString()
        {
            var payload = "{\"databaseCount\":2,\"email\":\"reset@example.com\",\"phone\":\"0987654321\",\"emailToNull\":false,\"phoneToNull\":false,"
                + "\"databaseNames\":[\"TEST_A\",\"TEST_B\"],\"connectionStrings\":[\"" + FakeConnection + "\",\"" + FakeConnection + ";Application Name=b\"]}";

            var shown = BaJobView.Payload(payload);

            Assert.AreEqual("{\"databaseCount\":2,\"email\":\"reset@example.com\",\"phone\":\"0987654321\",\"databaseNames\":[\"TEST_A\",\"TEST_B\"]}", shown);
        }

        [TestMethod]
        public void Payload_SanitizeJob_DropsTheNestedOptionsAndKeepsTheReport()
        {
            var payload = "{\"sanitize\":{\"email\":\"reset@example.com\",\"phone\":\"0987654321\",\"password\":\"" + FakeSecret + "\",\"keepRealSalary\":false,\"salaryMin\":1.0,\"salaryMax\":2.0,"
                + "\"maxParallel\":4,\"setSimpleRecovery\":true},\"serverId\":3,\"databaseNames\":[\"TEST_A\"],\"databaseCount\":1,\"email\":\"reset@example.com\",\"phone\":\"0987654321\","
                + "\"sanitizeStep\":\"Email và số điện thoại\",\"sanitizeReport\":{\"clean\":true,\"cancelled\":false,\"error\":\"\",\"hashType\":\"SHA256\",\"keepRealSalary\":false,\"totalMs\":1200,"
                + "\"finishedAt\":\"2026-11-25T10:15:30.0000000+07:00\",\"steps\":[{\"key\":\"email\",\"label\":\"Email\",\"status\":\"done\",\"rows\":12,\"ms\":300,\"detail\":\"\",\"warnings\":[],\"warningCount\":0}]}}";

            var shown = ShownObject(payload);

            CollectionAssert.AreEqual(new List<string> { "databaseCount", "databaseNames", "email", "phone", "sanitizeReport", "sanitizeStep" }, Keys(shown));
            Assert.AreEqual("Email và số điện thoại", (string)shown["sanitizeStep"]);
            Assert.AreEqual(12, (int)shown["sanitizeReport"]["steps"][0]["rows"]);
            StringAssert.Contains(BaJobView.Payload(payload), "\"finishedAt\":\"2026-11-25T10:15:30.0000000+07:00\"");
        }

        [TestMethod]
        public void Payload_RestoreJob_KeepsTheShrinkResultAndDropsTheResetPassword()
        {
            var payload = "{\"withReplace\":true,\"withShrinkLog\":true,\"withAutoReset\":true,\"positions\":[1],\"recovery\":\"RECOVERY\",\"emailForReset\":\"reset@example.com\","
                + "\"passwordForReset\":\"" + FakeSecret + "\",\"phoneForReset\":\"0987654321\",\"keepRealSalary\":false,\"salaryMin\":1.0,\"salaryMax\":2.0,\"lang\":\"vi\","
                + "\"shrinkFinalStatus\":\"success\",\"shrinkFinalMessage\":\"Đã shrink file log\",\"shrinkFinalAt\":\"2026-11-25T10:15:30.0000000+07:00\"}";

            var shown = BaJobView.Payload(payload);

            Assert.AreEqual("{\"withShrinkLog\":true,\"shrinkFinalStatus\":\"success\",\"shrinkFinalMessage\":\"Đã shrink file log\"}", shown);
        }

        [TestMethod]
        public void Payload_DeleteEmployeeJob_KeepsTheEmployeeRows()
        {
            var payload = "[{\"localId\":\"E001\",\"name\":\"Nhân viên thử một\"},{\"localId\":\"E002\",\"name\":null}]";

            Assert.AreEqual(payload, BaJobView.Payload(payload));
        }

        [TestMethod]
        public void Payload_ArrayOfRows_FiltersEachRowAndSkipsWhatIsNotARow()
        {
            var payload = "[{\"localId\":\"E001\",\"name\":\"Test\",\"connectionString\":\"" + FakeConnection + "\"},\"" + FakeConnection + "\",42,null,[{\"localId\":\"nested\"}],{\"password\":\"" + FakeSecret + "\"}]";

            Assert.AreEqual("[{\"localId\":\"E001\",\"name\":\"Test\"},{}]", BaJobView.Payload(payload));
        }

        [TestMethod]
        public void Payload_MultiDbAnalyzeJob_ShowsNothing()
        {
            var payload = "{\"multiGuid\":\"0f8fad5bd9cb469fa16570867728950e\",\"list\":[{\"database\":\"TEST_A\",\"total\":10}]}";

            Assert.AreEqual("{}", BaJobView.Payload(payload));
        }

        [TestMethod]
        public void Payload_KeyNames_AreMatchedExactly()
        {
            var payload = "{\"Email\":\"upper@example.com\",\"EMAIL\":\"caps@example.com\",\"email \":\"space@example.com\",\"emailForReset\":\"reset@example.com\","
                + "\"Password\":\"" + FakeSecret + "\",\"ConnectionString\":\"" + FakeConnection + "\",\"email\":\"shown@example.com\"}";

            Assert.AreEqual("{\"email\":\"shown@example.com\"}", BaJobView.Payload(payload));
        }

        [TestMethod]
        public void Payload_ValueOfAnUnexpectedType_IsPassedOnUnchanged()
        {
            var payload = "{\"databaseNames\":\"TEST_A\",\"databaseCount\":\"hai\",\"updPersonal\":\"yes\",\"email\":null,\"phone\":123,\"sanitizeReport\":[1,2]}";

            Assert.AreEqual(payload, BaJobView.Payload(payload));
        }

        [TestMethod]
        public void Payload_SurroundingSpacesAndByteOrderMark_AreIgnored()
        {
            var payload = (char)0xFEFF + " \r\n{\"email\":\"test@example.com\"}\r\n ";

            Assert.AreEqual("{\"email\":\"test@example.com\"}", BaJobView.Payload(payload));
        }

        [TestMethod]
        public void Payload_NeverContainsASecretValue()
        {
            var payloads = new[]
            {
                "{\"connectionString\":\"" + FakeConnection + "\",\"password\":\"" + FakeSecret + "\",\"email\":\"test@example.com\"}",
                "{\"connectionStrings\":[\"" + FakeConnection + "\"],\"databaseNames\":[\"TEST_A\"]}",
                "{\"passwordForReset\":\"" + FakeSecret + "\",\"withShrinkLog\":false}",
                "{\"sanitize\":{\"password\":\"" + FakeSecret + "\"},\"email\":\"test@example.com\"}",
                "{\"somethingNew\":{\"deep\":[{\"token\":\"" + FakeSecret + "\"}]},\"phone\":\"0987654321\"}",
                "[{\"localId\":\"E001\",\"secret\":\"" + FakeSecret + "\"}]"
            };

            foreach (var payload in payloads)
            {
                var shown = BaJobView.Payload(payload);
                Assert.IsNotNull(shown);
                Assert.IsFalse(shown.Contains(FakeSecret), "Lộ giá trị bí mật: " + payload);
                Assert.IsFalse(shown.Contains("TEST-SERVER"), "Lộ chuỗi kết nối: " + payload);
            }
        }
    }
}
