using System;
using System.Collections.Generic;
using BADesign.Helpers.Database;
using BADesign.Helpers.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class DbSanitizeSqlTests
    {
        [TestMethod]
        public void Quote_EscapesClosingBracket()
        {
            Assert.AreEqual("[a]]b]", DbSanitizeSql.Quote("a]b"));
            Assert.AreEqual("[dbo].[Staffing_Employees]", DbSanitizeSql.QuoteTable(null, "Staffing_Employees"));
            Assert.AreEqual("[hr].[T]", DbSanitizeSql.QuoteTable("hr", "T"));
        }

        [TestMethod]
        public void Literal_EscapesSingleQuote()
        {
            Assert.AreEqual("N'O''Brien'", DbSanitizeSql.Literal("O'Brien"));
        }

        [DataTestMethod]
        [DataRow(DataSecurityWrapper.ENCRYPTED_ZERO, true)]
        [DataRow("ecU", false)]
        [DataRow("", false)]
        [DataRow(null, false)]
        [DataRow("15000000", false)]
        [DataRow("an.nh@cadena.com.sg-12345", false)]
        [DataRow("Nguyen Van An Nguyen Van", false)]
        [DataRow("ABCDEFGHIJKLMNOPQRSTUVW", false)]
        public void LooksLikeCipher_MatchesBase64BlocksOnly(string value, bool expected)
        {
            Assert.AreEqual(expected, DbSanitizeSql.LooksLikeCipher(value));
        }

        [TestMethod]
        public void LooksLikeCipher_ChecksLengthIsMultipleOfFour()
        {
            Assert.IsTrue(DbSanitizeSql.LooksLikeCipher(new string('A', 43) + "="));
            Assert.IsFalse(DbSanitizeSql.LooksLikeCipher(new string('A', 42) + "="));
            Assert.IsTrue(DbSanitizeSql.LooksLikeCipher(new string('A', 24) + "   "));
        }

        [TestMethod]
        public void LooksLikeCipher_AcceptsRealEncryptedValue()
        {
            var cipher = DataSecurityWrapper.EncryptData("someone@customer.com", 1234567890123456L);
            Assert.IsTrue(DbSanitizeSql.LooksLikeCipher(cipher));
            var amount = DataSecurityWrapper.EncryptData("15000000", 1234567890123456L);
            Assert.IsTrue(DbSanitizeSql.LooksLikeCipher(amount));
        }

        [TestMethod]
        public void BuildBlankUpdate_AllMode_BlanksNonEmptyValuesOnly()
        {
            var sql = DbSanitizeSql.BuildBlankUpdate("[dbo].[T]", new[] { "Amount" }, DbBlankMode.All, null, null, true);
            Assert.AreEqual(
                "UPDATE T SET T.[Amount] = CASE WHEN (T.[Amount] IS NOT NULL AND T.[Amount] <> N'') THEN N'' ELSE T.[Amount] END"
                + " FROM [dbo].[T] T WHERE ((T.[Amount] IS NOT NULL AND T.[Amount] <> N''))",
                sql);
        }

        [TestMethod]
        public void BuildBlankUpdate_CipherMode_UsesCipherPredicateAndRange()
        {
            var sql = DbSanitizeSql.BuildBlankUpdate("[dbo].[T]", new[] { "Value", "AdjustedValue" }, DbBlankMode.CipherOnly, "T.[IsEncrypted] = 1", "ID", true);
            StringAssert.Contains(sql, "LEN(T.[Value]) >= 24");
            StringAssert.Contains(sql, "LEN(T.[Value]) % 4 = 0");
            StringAssert.Contains(sql, "T.[Value] COLLATE Latin1_General_BIN2 NOT LIKE N'%[^A-Za-z0-9+/=]%'");
            StringAssert.Contains(sql, "T.[AdjustedValue] = CASE WHEN");
            StringAssert.Contains(sql, " AND (T.[IsEncrypted] = 1)");
            StringAssert.EndsWith(sql, "T.[ID] > @fromKey AND T.[ID] <= @toKey");
        }

        [TestMethod]
        public void BuildBlankUpdate_WideTable_SkipsPredicateFilter()
        {
            var sql = DbSanitizeSql.BuildBlankUpdate("[dbo].[PAY_MasterPayroll1]", new[] { "A", "B" }, DbBlankMode.CipherOnly, null, null, false);
            Assert.IsFalse(sql.Contains(" WHERE "));
            StringAssert.Contains(sql, "T.[A] = CASE WHEN");
            StringAssert.Contains(sql, "T.[B] = CASE WHEN");
        }

        [TestMethod]
        [ExpectedException(typeof(ArgumentException))]
        public void BuildBlankUpdate_RejectsEmptyColumnList()
        {
            DbSanitizeSql.BuildBlankUpdate("[dbo].[T]", new string[0], DbBlankMode.All, null, null, true);
        }

        [TestMethod]
        public void BuildPlainContactUpdate_ReplacesOnlyExistingEmailAndPhoneValues()
        {
            var columns = new List<DbPlainColumn>
            {
                new DbPlainColumn { Name = "HREmailTo", Kind = DbPlainKind.Email, MaxChars = 250 },
                new DbPlainColumn { Name = "CompanyPhone", Kind = DbPlainKind.Phone, MaxChars = null }
            };
            var sql = DbSanitizeSql.BuildPlainContactUpdate("[dbo].[MultiTenant_Companies]", columns, null);
            StringAssert.Contains(sql, "T.[HREmailTo] = CASE WHEN (T.[HREmailTo] LIKE N'%_@_%' AND LEN(T.[HREmailTo]) <= 1000 AND T.[HREmailTo] <> LEFT(@email, 250)) THEN LEFT(@email, 250) ELSE T.[HREmailTo] END");
            StringAssert.Contains(sql, "T.[CompanyPhone] = CASE WHEN (T.[CompanyPhone] LIKE N'%[0-9]%' AND T.[CompanyPhone] <> @phone) THEN @phone ELSE T.[CompanyPhone] END");
            StringAssert.Contains(sql, " WHERE ((T.[HREmailTo] LIKE N'%_@_%'");
            Assert.IsFalse(sql.Contains("IS NULL"));
            Assert.IsFalse(sql.Contains("@fromKey"));
        }

        [TestMethod]
        public void BuildPlainContactUpdate_WithKey_AddsRange()
        {
            var columns = new List<DbPlainColumn> { new DbPlainColumn { Name = "Email", Kind = DbPlainKind.Email } };
            var sql = DbSanitizeSql.BuildPlainContactUpdate("[dbo].[T]", columns, "ID");
            StringAssert.EndsWith(sql, " AND T.[ID] > @fromKey AND T.[ID] <= @toKey");
        }

        [TestMethod]
        [ExpectedException(typeof(ArgumentException))]
        public void BuildPlainContactUpdate_RejectsLobColumns()
        {
            var columns = new List<DbPlainColumn> { new DbPlainColumn { Name = "Email", Kind = DbPlainKind.Email, IsLob = true } };
            DbSanitizeSql.BuildPlainContactUpdate("[dbo].[T]", columns, null);
        }

        [TestMethod]
        public void BuildPlainLobUpdate_CastsAndLimitsByDataLength()
        {
            var sql = DbSanitizeSql.BuildPlainLobUpdate("[dbo].[T]", new DbPlainColumn { Name = "EmailCC", Kind = DbPlainKind.Email, IsLob = true });
            Assert.AreEqual(
                "UPDATE T SET T.[EmailCC] = @email FROM [dbo].[T] T WHERE (CAST(T.[EmailCC] AS NVARCHAR(MAX)) LIKE N'%_@_%' AND DATALENGTH(T.[EmailCC]) <= 2000 AND CAST(T.[EmailCC] AS NVARCHAR(MAX)) <> @email)",
                sql);
        }

        [TestMethod]
        public void BuildNextKeyQuery_ReturnsUpperBoundOfNextBatch()
        {
            Assert.AreEqual(
                "SELECT TOP (1) X.K FROM (SELECT TOP (@batch) T.[ID] AS K FROM [dbo].[T] T WHERE T.[ID] > @fromKey ORDER BY T.[ID]) X ORDER BY X.K DESC",
                DbSanitizeSql.BuildNextKeyQuery("[dbo].[T]", "ID"));
            Assert.AreEqual(
                "SELECT TOP (1) X.K FROM (SELECT TOP (@batch) T.[ID] AS K FROM [dbo].[T] T ORDER BY T.[ID]) X ORDER BY X.K DESC",
                DbSanitizeSql.BuildFirstKeyQuery("[dbo].[T]", "ID"));
        }

        [TestMethod]
        public void KeyQueries_AvoidAggregatesSoGuidKeysWorkOnOldServers()
        {
            Assert.IsFalse(DbSanitizeSql.BuildNextKeyQuery("[dbo].[T]", "ID").Contains("MAX("));
            Assert.IsFalse(DbSanitizeSql.BuildFirstKeyQuery("[dbo].[T]", "ID").Contains("MAX("));
        }

        [TestMethod]
        public void UpperRangeClause_ReplacesFullRangeForTheFirstBatch()
        {
            var sql = DbSanitizeSql.BuildBlankUpdate("[dbo].[T]", new[] { "Value" }, DbBlankMode.CipherOnly, null, "ID", true);
            var first = sql.Replace(DbSanitizeSql.RangeClause("ID"), DbSanitizeSql.UpperRangeClause("ID"));
            Assert.AreNotEqual(sql, first);
            StringAssert.EndsWith(first, " AND T.[ID] <= @toKey");
            Assert.IsFalse(first.Contains("@fromKey"));
        }

        [TestMethod]
        public void BuildBlankUpdate_WithReplacement_WritesTheReplacementLiteral()
        {
            var sql = DbSanitizeSql.BuildBlankUpdate("[dbo].[T]", new[] { "JsonSalary" }, DbBlankMode.All, "T.[JsonSalary] <> N'[]'", null, true, "[]");
            StringAssert.Contains(sql, "THEN N'[]' ELSE T.[JsonSalary] END");
            StringAssert.EndsWith(sql, " AND (T.[JsonSalary] <> N'[]')");
        }

        [DataTestMethod]
        [DataRow("AAA{{|}}BBB{{|}}CCC", "X", "X{{|}}X{{|}}X")]
        [DataRow("{{|}}AAA{{|}}BBB", "X", "{{|}}X{{|}}X")]
        [DataRow("AAA{{|}}{{|}}", "X", "X{{|}}{{|}}")]
        [DataRow("AAA", "X", "X")]
        [DataRow("{{|}}{{|}}", "X", "{{|}}{{|}}")]
        [DataRow("AAA{{|}}BBB", null, "{{|}}")]
        [DataRow("", "X", "")]
        [DataRow(null, "X", null)]
        public void ReplaceListElements_KeepsSeparatorsAndEmptyElements(string value, string replacement, string expected)
        {
            Assert.AreEqual(expected, DbSanitizeSql.ReplaceListElements(value, "{{|}}", replacement));
        }

        [TestMethod]
        public void BuildBlankListUpdate_KeepsOneSeparatorPerOriginalSeparator()
        {
            var sql = DbSanitizeSql.BuildBlankListUpdate("[dbo].[T]", "AllowanceValue", "{{|}}");
            Assert.AreEqual(
                "UPDATE T SET T.[AllowanceValue] = REPLICATE(CAST(N'{{|}}' AS NVARCHAR(MAX)), (DATALENGTH(CAST(T.[AllowanceValue] AS NVARCHAR(MAX))) - DATALENGTH(REPLACE(CAST(T.[AllowanceValue] AS NVARCHAR(MAX)), N'{{|}}', N''))) / DATALENGTH(N'{{|}}'))"
                + " FROM [dbo].[T] T WHERE REPLACE(CAST(T.[AllowanceValue] AS NVARCHAR(MAX)), N'{{|}}', N'') <> N''",
                sql);
        }

        [DataTestMethod]
        [DataRow("MobilePhone", DbPlainKind.Phone, null, true)]
        [DataRow("HomePhone1", DbPlainKind.Phone, 300, true)]
        [DataRow("PhoneExt", DbPlainKind.Phone, 5, false)]
        [DataRow("EmailAddress", DbPlainKind.Email, 600, true)]
        [DataRow("PersonalEmail2", DbPlainKind.Email, null, true)]
        [DataRow("HREmailTo", DbPlainKind.Email, 250, false)]
        [DataRow("EmailTemplateCode", DbPlainKind.Email, 100, false)]
        [DataRow("", DbPlainKind.Email, null, false)]
        public void ShouldBlankCipher_OnlyForColumnsThatHoldContactValues(string column, DbPlainKind kind, int? maxChars, bool expected)
        {
            Assert.AreEqual(expected, DbSanitizeSql.ShouldBlankCipher(column, kind, maxChars));
        }

        [TestMethod]
        public void BuildPlainContactUpdate_BlankCipher_BlanksEncryptedValuesBeforeReplacingPlainOnes()
        {
            var columns = new List<DbPlainColumn>
            {
                new DbPlainColumn { Name = "MobilePhone", Kind = DbPlainKind.Phone, BlankCipher = true }
            };
            var sql = DbSanitizeSql.BuildPlainContactUpdate("[dbo].[REC_Candidates]", columns, null);
            var cipher = DbSanitizeSql.CipherPredicate("T.[MobilePhone]");
            StringAssert.Contains(sql, "T.[MobilePhone] = CASE WHEN " + cipher + " THEN N'' WHEN (T.[MobilePhone] LIKE N'%[0-9]%' AND T.[MobilePhone] <> @phone) THEN @phone ELSE T.[MobilePhone] END");
            StringAssert.EndsWith(sql, " WHERE ((" + cipher + " OR (T.[MobilePhone] LIKE N'%[0-9]%' AND T.[MobilePhone] <> @phone)))");
        }

        [DataTestMethod]
        [DataRow("UserEmailAddress", true, DbPlainKind.Email)]
        [DataRow("HREmailTo", true, DbPlainKind.Email)]
        [DataRow("MobilePhone", true, DbPlainKind.Phone)]
        [DataRow("telephoneNumber", true, DbPlainKind.Phone)]
        [DataRow("EmailSubject", false, DbPlainKind.Email)]
        [DataRow("EmailBody", false, DbPlainKind.Email)]
        [DataRow("FullName", false, DbPlainKind.Email)]
        [DataRow("", false, DbPlainKind.Email)]
        public void IsPlainContactCandidate_DetectsEmailAndPhoneColumns(string column, bool expected, DbPlainKind expectedKind)
        {
            DbPlainKind kind;
            var actual = DbSanitizeSql.IsPlainContactCandidate(column, out kind);
            Assert.AreEqual(expected, actual);
            if (expected) Assert.AreEqual(expectedKind, kind);
        }

        [TestMethod]
        public void DetectPasswordHashType_UsesMajorityOfStoredHashes()
        {
            var sha256 = SimpleHash.ComputeHash("admin1", SimpleHash.HashType.SHA256);
            var sha512 = SimpleHash.ComputeHash("admin1", SimpleHash.HashType.SHA512);
            var md5 = SimpleHash.ComputeHash("admin1", SimpleHash.HashType.MD5);
            Assert.AreEqual(SimpleHash.HashType.SHA256, DbSanitizeSql.DetectPasswordHashType(new[] { sha256, sha256, sha512 }));
            Assert.AreEqual(SimpleHash.HashType.SHA512, DbSanitizeSql.DetectPasswordHashType(new[] { sha512, sha512, sha256 }));
            Assert.AreEqual(SimpleHash.HashType.MD5, DbSanitizeSql.DetectPasswordHashType(new[] { md5, md5, sha256 }));
        }

        [TestMethod]
        public void DetectPasswordHashType_DefaultsToSha256()
        {
            Assert.AreEqual(SimpleHash.HashType.SHA256, DbSanitizeSql.DetectPasswordHashType(null));
            Assert.AreEqual(SimpleHash.HashType.SHA256, DbSanitizeSql.DetectPasswordHashType(new[] { "", null, "not base64 !!", "abc" }));
        }

        [TestMethod]
        public void BuildUserSignaturePlainText_MatchesCadenaFormatWithoutSsoIdentifiers()
        {
            Assert.AreEqual("42admin1001", DbSanitizeSql.BuildUserSignaturePlainText(42, "admin", 1001));
            Assert.AreEqual("42admin", DbSanitizeSql.BuildUserSignaturePlainText(42, "admin", null));
        }

        [TestMethod]
        public void NextFakeSalary_StaysInsideRangeAndIsRounded()
        {
            var random = new Random(7);
            for (var i = 0; i < 500; i++)
            {
                var value = DbSanitizeSql.NextFakeSalary(random, 5000000m, 30000000m);
                Assert.IsTrue(value >= 5000000m && value <= 30000000m, value.ToString());
                Assert.AreEqual(0m, value % 100000m);
            }
        }

        [TestMethod]
        public void NextFakeSalary_HandlesSwappedAndNarrowRanges()
        {
            var random = new Random(3);
            var swapped = DbSanitizeSql.NextFakeSalary(random, 5000m, 1000m);
            Assert.IsTrue(swapped >= 1000m && swapped <= 5000m);
            var narrow = DbSanitizeSql.NextFakeSalary(random, 1250000m, 1290000m);
            Assert.IsTrue(narrow >= 1250000m && narrow <= 1290000m, narrow.ToString());
            Assert.AreEqual(2500m, DbSanitizeSql.NextFakeSalary(random, 2500m, 2500m));
        }
    }
}
