using System;
using BADesign.Helpers;
using BADesign.Helpers.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json.Linq;

namespace BADesign.Tests
{
    [TestClass]
    public class BaJobSecretsTests
    {
        private const string FakeSecret = "TEST-not-a-real-secret";
        private const string FakeConnection = "Server=TEST-SERVER;Database=TEST_DB;User Id=test;Password=" + FakeSecret;
        private const string OtherConnection = "Server=TEST-SERVER;Database=TEST_DB_2;User Id=test;Password=" + FakeSecret;

        private const string UpdateUserPayload =
            "{\"connectionString\":\"" + FakeConnection + "\",\"userIds\":[1,2],\"isUpdatePassword\":true,\"password\":\"" + FakeSecret
            + "\",\"methodHash\":1,\"isUpdateEmail\":true,\"email\":\"test@example.com\",\"ignoreWindowsAD\":false}";

        private const string MultiDbResetPayload =
            "{\"databaseCount\":2,\"email\":\"test@example.com\",\"phone\":\"0900000000\",\"emailToNull\":false,\"phoneToNull\":false,"
            + "\"databaseNames\":[\"TEST_DB\",\"TEST_DB_2\"],\"connectionStrings\":["
            + "{\"DatabaseName\":\"TEST_DB\",\"ConnectionString\":\"" + FakeConnection + "\"},"
            + "{\"DatabaseName\":\"TEST_DB_2\",\"ConnectionString\":\"" + OtherConnection + "\"}]}";

        private const string SanitizeJobPayload =
            "{\"sanitize\":{\"email\":\"test@example.com\",\"phone\":\"0900000000\",\"password\":\"1\",\"keepRealSalary\":false},"
            + "\"serverId\":3,\"databaseNames\":[\"TEST_DB\"],\"databaseCount\":1,\"email\":\"test@example.com\",\"phone\":\"0900000000\"}";

        private const string RestorePayload =
            "{\"withReplace\":true,\"withAutoReset\":true,\"emailForReset\":\"test@example.com\",\"passwordForReset\":\"1\",\"lang\":\"vi\"}";

        private static bool IsProtectedText(JToken value)
        {
            return value != null && value.Type == JTokenType.String && BaSecret.IsProtected((string)value);
        }

        [TestMethod]
        public void Recode_SingleDatabaseJob_ProtectsConnectionStringAndPassword()
        {
            var stored = BaJobSecrets.Recode(UpdateUserPayload, true);
            Assert.IsFalse(stored.Contains(FakeSecret));
            Assert.IsFalse(stored.Contains("TEST-SERVER"));
            var payload = JObject.Parse(stored);
            Assert.IsTrue(IsProtectedText(payload["connectionString"]));
            Assert.IsTrue(IsProtectedText(payload["password"]));
            Assert.AreEqual("test@example.com", (string)payload["email"]);
            Assert.AreEqual(2, ((JArray)payload["userIds"]).Count);
            Assert.AreEqual(true, (bool)payload["isUpdatePassword"]);
            Assert.AreEqual(1, (int)payload["methodHash"]);
        }

        [TestMethod]
        public void Recode_MultiDatabaseJob_ProtectsEveryConnectionString()
        {
            var stored = BaJobSecrets.Recode(MultiDbResetPayload, true);
            Assert.IsFalse(stored.Contains(FakeSecret));
            var payload = JObject.Parse(stored);
            var connections = (JArray)payload["connectionStrings"];
            Assert.AreEqual(2, connections.Count);
            foreach (var connection in connections)
            {
                Assert.IsTrue(IsProtectedText(connection["ConnectionString"]));
            }
            Assert.AreEqual("TEST_DB_2", (string)connections[1]["DatabaseName"]);
            Assert.AreEqual("TEST_DB", (string)payload["databaseNames"][0]);
            Assert.AreEqual(2, (int)payload["databaseCount"]);
        }

        [TestMethod]
        public void Recode_PayloadWithoutStoredSecrets_IsReturnedUnchanged()
        {
            Assert.AreSame(SanitizeJobPayload, BaJobSecrets.Recode(SanitizeJobPayload, true));
            Assert.AreSame(RestorePayload, BaJobSecrets.Recode(RestorePayload, true));
            Assert.AreSame(SanitizeJobPayload, BaJobSecrets.Recode(SanitizeJobPayload, false));
        }

        [TestMethod]
        public void Recode_AlreadyProtected_IsNotProtectedAgain()
        {
            var once = BaJobSecrets.Recode(UpdateUserPayload, true);
            Assert.AreSame(once, BaJobSecrets.Recode(once, true));
            var listOnce = BaJobSecrets.Recode(MultiDbResetPayload, true);
            Assert.AreSame(listOnce, BaJobSecrets.Recode(listOnce, true));
        }

        [TestMethod]
        public void Recode_BackToPlain_GivesTheOriginalValues()
        {
            var restored = BaJobSecrets.Recode(BaJobSecrets.Recode(UpdateUserPayload, true), false);
            Assert.IsTrue(JToken.DeepEquals(JObject.Parse(UpdateUserPayload), JObject.Parse(restored)));
            var restoredList = BaJobSecrets.Recode(BaJobSecrets.Recode(MultiDbResetPayload, true), false);
            Assert.IsTrue(JToken.DeepEquals(JObject.Parse(MultiDbResetPayload), JObject.Parse(restoredList)));
            Assert.AreSame(UpdateUserPayload, BaJobSecrets.Recode(UpdateUserPayload, false));
        }

        [TestMethod]
        public void Recode_OnlyPartProtected_FinishesTheRest()
        {
            var partly = JObject.Parse(UpdateUserPayload);
            partly["connectionString"] = BaSecret.Protect(FakeConnection);
            var stored = BaJobSecrets.Recode(partly.ToString(Newtonsoft.Json.Formatting.None), true);
            var payload = JObject.Parse(stored);
            Assert.IsTrue(IsProtectedText(payload["connectionString"]));
            Assert.IsTrue(IsProtectedText(payload["password"]));
            Assert.AreEqual(FakeConnection, BaSecret.Reveal((string)payload["connectionString"]));
        }

        [TestMethod]
        public void Recode_SecretOfAnotherShape_IsLeftAlone()
        {
            var emptyPassword = "{\"connectionString\":\"\",\"password\":\"\"}";
            var notText = "{\"connectionString\":null,\"password\":123,\"connectionStrings\":[\"text\",5,{\"ConnectionString\":null},{\"Other\":\"x\"}]}";
            var listIsNotAList = "{\"connectionStrings\":\"" + FakeConnection + "\"}";
            var otherCase = "{\"ConnectionString\":\"" + FakeConnection + "\",\"Password\":\"" + FakeSecret + "\"}";
            foreach (var payload in new[] { emptyPassword, notText, listIsNotAList, otherCase })
            {
                Assert.AreSame(payload, BaJobSecrets.Recode(payload, true), payload);
            }
        }

        [TestMethod]
        public void Recode_NotAnObject_IsReturnedUnchanged()
        {
            var rows = "[{\"localId\":\"E001\",\"name\":\"Test\",\"password\":\"" + FakeSecret + "\"}]";
            var values = new[] { null, "", "   ", "not json", "{\"connectionString\":\"unfinished", rows, "5", "\"text\"" };
            foreach (var payload in values)
            {
                Assert.AreSame(payload, BaJobSecrets.Recode(payload, true), payload);
                Assert.AreSame(payload, BaJobSecrets.Recode(payload, false), payload);
            }
        }

        [TestMethod]
        public void Recode_OtherValues_AreWrittenBackAsTheyWere()
        {
            var payload = "{\"connectionString\":\"" + FakeConnection + "\",\"basicSalary\":12345678901234567890.50,\"startedAt\":\"2026-11-25T10:00:00\",\"companyID\":null,\"note\":\"Tiếng Việt có dấu\"}";
            var stored = BaJobSecrets.Recode(payload, true);
            StringAssert.Contains(stored, "\"basicSalary\":12345678901234567890.50,");
            StringAssert.Contains(stored, "\"startedAt\":\"2026-11-25T10:00:00\"");
            StringAssert.Contains(stored, "\"companyID\":null");
            StringAssert.Contains(stored, "\"note\":\"Tiếng Việt có dấu\"");
            Assert.AreEqual(payload, BaJobSecrets.Recode(stored, false));
        }

        [TestMethod]
        public void Read_ProtectedPayload_GivesTheRunnerPlainSecrets()
        {
            var payload = BaJobSecrets.Read(BaJobSecrets.Recode(UpdateUserPayload, true));
            Assert.AreEqual(FakeConnection, (string)payload["connectionString"]);
            Assert.AreEqual(FakeSecret, (string)payload["password"]);
            Assert.AreEqual(true, (bool)payload["isUpdatePassword"]);
            Assert.AreEqual(1, (int)payload["methodHash"]);

            var multi = BaJobSecrets.Read(BaJobSecrets.Recode(MultiDbResetPayload, true));
            var connections = (JArray)multi["connectionStrings"];
            Assert.AreEqual(FakeConnection, (string)connections[0]["ConnectionString"]);
            Assert.AreEqual(OtherConnection, (string)connections[1]["ConnectionString"]);
        }

        [TestMethod]
        public void Read_PlainPayload_GivesTheSameAsBefore()
        {
            Assert.IsTrue(JToken.DeepEquals(JObject.Parse(UpdateUserPayload), BaJobSecrets.Read(UpdateUserPayload)));
            Assert.IsTrue(JToken.DeepEquals(JObject.Parse(MultiDbResetPayload), BaJobSecrets.Read(MultiDbResetPayload)));
            Assert.IsTrue(JToken.DeepEquals(JObject.Parse(SanitizeJobPayload), BaJobSecrets.Read(SanitizeJobPayload)));
        }

        [TestMethod]
        public void Read_PayloadThatIsNotJson_FailsLikeBefore()
        {
            Exception error = null;
            try { BaJobSecrets.Read("not json"); }
            catch (Newtonsoft.Json.JsonException ex) { error = ex; }
            Assert.IsNotNull(error);
        }

        [TestMethod]
        public void View_OfProtectedPayload_IsTheSameAsOfPlainPayload()
        {
            Assert.AreEqual(BaJobView.Payload(UpdateUserPayload), BaJobView.Payload(BaJobSecrets.Recode(UpdateUserPayload, true)));
            Assert.AreEqual(BaJobView.Payload(MultiDbResetPayload), BaJobView.Payload(BaJobSecrets.Recode(MultiDbResetPayload, true)));
        }
    }
}
