using System;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class HubAccessTokenTests
    {
        private static readonly byte[] Key = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 };
        private static readonly byte[] OtherKey = { 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 };
        private static readonly DateTime Now = new DateTime(2026, 11, 14, 8, 0, 0, DateTimeKind.Utc);

        private static HubIdentity Sample()
        {
            return new HubIdentity { UserId = 42, RoleId = 3, IsSuperAdmin = false, CanManageServers = true };
        }

        [TestMethod]
        public void RoundTrip_ReturnsTheSameIdentity()
        {
            var token = HubAccessToken.Create(Sample(), Now, Key);
            HubIdentity read;
            Assert.IsTrue(HubAccessToken.TryRead(token, Now.AddMinutes(5), Key, out read));
            Assert.AreEqual(42, read.UserId);
            Assert.AreEqual(3, read.RoleId);
            Assert.IsFalse(read.IsSuperAdmin);
            Assert.IsTrue(read.CanManageServers);
        }

        [TestMethod]
        public void RoundTrip_KeepsMissingRoleAsNull()
        {
            var token = HubAccessToken.Create(new HubIdentity { UserId = 7, RoleId = null, IsSuperAdmin = true }, Now, Key);
            HubIdentity read;
            Assert.IsTrue(HubAccessToken.TryRead(token, Now, Key, out read));
            Assert.AreEqual(7, read.UserId);
            Assert.IsNull(read.RoleId);
            Assert.IsTrue(read.IsSuperAdmin);
            Assert.IsFalse(read.CanManageServers);
        }

        [TestMethod]
        public void TryRead_RejectsTokenSignedWithAnotherKey()
        {
            var token = HubAccessToken.Create(Sample(), Now, OtherKey);
            HubIdentity read;
            Assert.IsFalse(HubAccessToken.TryRead(token, Now, Key, out read));
            Assert.IsNull(read);
        }

        [TestMethod]
        public void TryRead_RejectsChangedUserId()
        {
            var token = HubAccessToken.Create(Sample(), Now, Key);
            var forged = "1" + token.Substring(token.IndexOf('.'));
            HubIdentity read;
            Assert.IsFalse(HubAccessToken.TryRead(forged, Now, Key, out read));
        }

        [TestMethod]
        public void TryRead_RejectsRaisedPrivilegeFlag()
        {
            var token = HubAccessToken.Create(Sample(), Now, Key);
            var parts = token.Split('.');
            parts[2] = "1";
            HubIdentity read;
            Assert.IsFalse(HubAccessToken.TryRead(string.Join(".", parts), Now, Key, out read));
        }

        [TestMethod]
        public void TryRead_AcceptsUntilExpiryAndRejectsAfter()
        {
            var token = HubAccessToken.Create(Sample(), Now, Key);
            HubIdentity read;
            Assert.IsTrue(HubAccessToken.TryRead(token, Now.AddHours(HubAccessToken.LifetimeHours), Key, out read));
            Assert.IsFalse(HubAccessToken.TryRead(token, Now.AddHours(HubAccessToken.LifetimeHours).AddSeconds(1), Key, out read));
        }

        [TestMethod]
        public void TryRead_RejectsEmptyAndMalformedInput()
        {
            HubIdentity read;
            Assert.IsFalse(HubAccessToken.TryRead(null, Now, Key, out read));
            Assert.IsFalse(HubAccessToken.TryRead("", Now, Key, out read));
            Assert.IsFalse(HubAccessToken.TryRead("42", Now, Key, out read));
            Assert.IsFalse(HubAccessToken.TryRead("42.3.0.1.9999999999.", Now, Key, out read));
            Assert.IsFalse(HubAccessToken.TryRead(".x", Now, Key, out read));
            Assert.IsFalse(HubAccessToken.TryRead(new string('a', 500), Now, Key, out read));
        }

        [TestMethod]
        public void Create_ReturnsEmptyForInvalidIdentityOrKey()
        {
            Assert.AreEqual("", HubAccessToken.Create(null, Now, Key));
            Assert.AreEqual("", HubAccessToken.Create(new HubIdentity { UserId = 0 }, Now, Key));
            Assert.AreEqual("", HubAccessToken.Create(Sample(), Now, null));
            Assert.AreEqual("", HubAccessToken.Create(Sample(), Now, new byte[0]));
        }

        [TestMethod]
        public void ProcessKeyOverloads_RoundTripWithinTheSameProcess()
        {
            var token = HubAccessToken.Create(Sample(), Now);
            HubIdentity read;
            Assert.IsTrue(HubAccessToken.TryRead(token, Now, out read));
            Assert.AreEqual(42, read.UserId);
        }

        [TestMethod]
        public void Token_ContainsOnlyCharactersSafeInsideScriptAndQueryString()
        {
            var token = HubAccessToken.Create(Sample(), Now, Key);
            Assert.IsTrue(System.Text.RegularExpressions.Regex.IsMatch(token, "^[A-Za-z0-9._-]+$"), token);
        }
    }
}
