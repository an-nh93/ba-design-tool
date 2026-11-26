using System.Data.SqlClient;
using BADesign.Helpers.Database;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class DbConnectionStringTests
    {
        private static SqlConnectionStringBuilder Read(string connectionString)
        {
            return new SqlConnectionStringBuilder(connectionString);
        }

        [TestMethod]
        public void ForServer_PlainValues_GiveTheSameConnectionAsTheOldFormat()
        {
            var built = Read(DbConnectionString.ForServer("TEST-SERVER", null, "test_user", "TEST-pass1", "TEST_DB"));
            var old = Read("Data Source=TEST-SERVER;Initial Catalog=TEST_DB;UID=test_user;PWD=TEST-pass1;");

            Assert.AreEqual(old.DataSource, built.DataSource);
            Assert.AreEqual(old.InitialCatalog, built.InitialCatalog);
            Assert.AreEqual(old.UserID, built.UserID);
            Assert.AreEqual(old.Password, built.Password);
            Assert.AreEqual(old.ConnectTimeout, built.ConnectTimeout);
        }

        [TestMethod]
        public void ForServer_Port_IsAddedToTheDataSource()
        {
            Assert.AreEqual("TEST-SERVER,1533", Read(DbConnectionString.ForServer("TEST-SERVER", 1533, "u", "p", "master")).DataSource);
            Assert.AreEqual("TEST-SERVER", Read(DbConnectionString.ForServer("TEST-SERVER", 0, "u", "p", "master")).DataSource);
            Assert.AreEqual(@"TEST-SERVER\SQLEXPRESS", Read(DbConnectionString.ForServer(@"TEST-SERVER\SQLEXPRESS", null, "u", "p", "master")).DataSource);
        }

        [TestMethod]
        public void ForServer_EmptyServer_MeansThisMachine()
        {
            Assert.AreEqual(".", Read(DbConnectionString.ForServer("", null, "u", "p", "master")).DataSource);
            Assert.AreEqual(".", Read(DbConnectionString.ForServer(null, 1433, "u", "p", "master")).DataSource);
        }

        [TestMethod]
        public void ForServer_PasswordWithSeparators_StaysOneValue()
        {
            const string password = "TEST;Data Source=other-host;Initial Catalog=other_db";
            var built = Read(DbConnectionString.ForServer("TEST-SERVER", null, "test_user", password, "TEST_DB"));

            Assert.AreEqual(password, built.Password);
            Assert.AreEqual("TEST-SERVER", built.DataSource);
            Assert.AreEqual("TEST_DB", built.InitialCatalog);
        }

        [TestMethod]
        public void ForServer_QuotesBracesAndSpaces_AreKeptExactly()
        {
            const string password = " 'TEST\" {pass}=; ";
            const string user = "test 'user\"";
            var built = Read(DbConnectionString.ForServer("TEST-SERVER", null, user, password, "TEST DB;x"));

            Assert.AreEqual(password, built.Password);
            Assert.AreEqual(user, built.UserID);
            Assert.AreEqual("TEST DB;x", built.InitialCatalog);
        }

        [TestMethod]
        public void ForServer_MissingValues_BecomeEmpty()
        {
            var built = Read(DbConnectionString.ForServer("TEST-SERVER", null, null, null, null));

            Assert.AreEqual("", built.UserID);
            Assert.AreEqual("", built.Password);
            Assert.AreEqual("", built.InitialCatalog);
        }

        [TestMethod]
        public void ForServer_ConnectTimeout_IsSetOnlyWhenGiven()
        {
            var withDefault = DbConnectionString.ForServer("TEST-SERVER", null, "u", "p", "master");
            var withFive = DbConnectionString.ForServer("TEST-SERVER", null, "u", "p", "master", 5);

            Assert.IsFalse(withDefault.Contains("Timeout"));
            Assert.AreEqual(15, Read(withDefault).ConnectTimeout);
            Assert.AreEqual(5, Read(withFive).ConnectTimeout);
        }
    }
}
