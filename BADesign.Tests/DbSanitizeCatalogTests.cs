using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using BADesign.Helpers.Database;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class DbSanitizeCatalogTests
    {
        private static readonly Regex Identifier = new Regex("^[A-Za-z][A-Za-z0-9_]*$");

        private static IEnumerable<DbEncryptedColumns> AllEntries()
        {
            return DbSanitizeCatalog.AmountColumns
                .Concat(DbSanitizeCatalog.OtherEncryptedColumns)
                .Concat(DbSanitizeCatalog.IntegrationSecrets);
        }

        [TestMethod]
        public void Entries_UseValidIdentifiersAndHaveColumns()
        {
            foreach (var entry in AllEntries())
            {
                Assert.IsTrue(Identifier.IsMatch(entry.Table), entry.Table);
                Assert.IsTrue(entry.Columns.Length > 0, entry.Table);
                foreach (var column in entry.Columns)
                    Assert.IsTrue(Identifier.IsMatch(column), entry.Table + "." + column);
                Assert.AreEqual(entry.Columns.Length, entry.Columns.Distinct(StringComparer.OrdinalIgnoreCase).Count(), entry.Table);
            }
        }

        [TestMethod]
        public void Entries_DoNotRepeatTables()
        {
            var tables = AllEntries().Select(e => e.Table).ToList();
            var duplicates = tables.GroupBy(t => t, StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
            Assert.AreEqual(0, duplicates.Count, string.Join(", ", duplicates));
        }

        [TestMethod]
        public void TablesToClear_DeleteChildrenBeforeParents()
        {
            var list = DbSanitizeCatalog.TablesToClear.ToList();
            Assert.IsTrue(list.IndexOf("Setting_SendMailPendingAttachments") < list.IndexOf("Setting_SendMailPendings"));
            Assert.IsTrue(list.IndexOf("Security_UserTokenDetails") < list.IndexOf("Security_UserTokens"));
            Assert.AreEqual(list.Count, list.Distinct(StringComparer.OrdinalIgnoreCase).Count());
            foreach (var table in list)
                Assert.IsTrue(Identifier.IsMatch(table), table);
        }

        [TestMethod]
        public void TablesToClear_CoverPasswordHistoryAndTokensButKeepAuditTrail()
        {
            var list = new HashSet<string>(DbSanitizeCatalog.TablesToClear, StringComparer.OrdinalIgnoreCase);
            Assert.IsTrue(list.Contains("Security_PasswordHistories"));
            Assert.IsTrue(list.Contains("Security_UserTokenDetails"));
            Assert.IsFalse(list.Contains("Setting_AuditTrailHierarchy"));
            Assert.IsFalse(list.Contains("Setting_AuditTrails"));
        }

        [TestMethod]
        public void AuditTrailValues_OnlyEncryptedRowsAreBlanked()
        {
            var entry = DbSanitizeCatalog.OtherEncryptedColumns.Single(e => e.Table == "Setting_AuditTrailHierarchy");
            Assert.AreEqual(DbBlankMode.All, entry.Mode);
            CollectionAssert.AreEqual(new[] { "StringValue", "StringOldValue" }, entry.Columns);
            StringAssert.Contains(entry.Filter, "[IsEncrypted] = 1");
            Assert.IsNull(entry.Replacement);
        }

        [TestMethod]
        public void MigrationHistoryTables_AreKeptForThePlainContactStep()
        {
            const string table = "MIG_History_4d2d561b_Staffing_Transaction_AddNew";
            var excluded = new HashSet<string>(DbSanitizeCatalog.AllPlainContactExcludedTables(), StringComparer.OrdinalIgnoreCase);
            Assert.IsFalse(excluded.Contains(table));
            Assert.IsFalse(DbSanitizeCatalog.IsDynamicEncryptedTable(table));
            CollectionAssert.DoesNotContain(DbSanitizeCatalog.TablesToClear, table);
        }

        [TestMethod]
        public void SalaryColumns_CoverTransactionCopies()
        {
            var salary = DbSanitizeCatalog.SalaryColumns.Select(s => s.Table + "." + s.Column).ToList();
            CollectionAssert.Contains(salary, "Staffing_Transactions.BasicSalary");
            CollectionAssert.Contains(salary, "Staffing_TransactionExportDatas.BasicSalary");
            foreach (var column in DbSanitizeCatalog.SalaryColumns)
                Assert.AreEqual("EmployeeID", column.EmployeeKeyColumn, column.Table);
        }

        [TestMethod]
        public void EmployeeListColumns_FakeSalariesAndBlankAllowances()
        {
            var lists = DbSanitizeCatalog.EmployeeListColumns.ToDictionary(l => l.Table + "." + l.Column, l => l.FakeSalary);
            Assert.IsTrue(lists["SET_EmployeeTransactionHistories.BasicSalary"]);
            Assert.IsTrue(lists["SET_EmployeeTransactionHistories.PreBasicSalary"]);
            Assert.IsFalse(lists["SET_EmployeeTransactionHistories.AllowanceValue"]);
            Assert.AreEqual("{{|}}", DbSanitizeCatalog.ListSeparator);
            var scalar = new HashSet<string>(DbSanitizeCatalog.SalaryColumns.Select(s => s.Table), StringComparer.OrdinalIgnoreCase);
            foreach (var list in DbSanitizeCatalog.EmployeeListColumns)
                Assert.IsFalse(scalar.Contains(list.Table), list.Table);
        }

        [TestMethod]
        public void SalaryJson_IsReplacedByAnEmptyArray()
        {
            var entry = DbSanitizeCatalog.AmountColumns.Single(e => e.Table == "PAY_MasterEmployeeSalaryDetails");
            Assert.AreEqual("[]", entry.Replacement);
            Assert.AreEqual(DbBlankMode.All, entry.Mode);
            StringAssert.Contains(entry.Filter, "N'[]'");
            Assert.IsNull(DbSanitizeCatalog.AmountColumns.First(e => e.Table == "PAY_Allowances").Replacement);
        }

        [TestMethod]
        public void SalaryAndContactTables_AreNotBlankedAsAmounts()
        {
            var blanked = new HashSet<string>(AllEntries().Select(e => e.Table), StringComparer.OrdinalIgnoreCase);
            foreach (var salary in DbSanitizeCatalog.SalaryColumns)
                Assert.IsFalse(blanked.Contains(salary.Table), salary.Table);
            foreach (var contact in DbSanitizeCatalog.EmployeeContactTables)
                Assert.IsFalse(blanked.Contains(contact.Table), contact.Table);
            Assert.IsFalse(blanked.Contains(DbSanitizeCatalog.UserTable));
        }

        [DataTestMethod]
        [DataRow("Staffing_Employees", "PersonalEmailAddress", true)]
        [DataRow("staffing_employeeinformations", "homephone2", true)]
        [DataRow("ESS_EmployeeProfileContactInformations", "MobilePhone1", true)]
        [DataRow("Staffing_EmployeeRelationships", "MobilePhone", true)]
        [DataRow("Staffing_EmployeeRelationships", "EmailAddress", false)]
        [DataRow("REC_Candidates", "MobilePhone", false)]
        public void IsEncryptedContactColumn_CoversEmployeeContactTables(string table, string column, bool expected)
        {
            Assert.AreEqual(expected, DbSanitizeCatalog.IsEncryptedContactColumn(table, column));
        }

        [DataTestMethod]
        [DataRow("PAY_MasterPayroll12", "PAY[_]MasterPayroll%", true)]
        [DataRow("PAY_MasterPayroll", "PAY[_]MasterPayroll%", true)]
        [DataRow("PAY_MasterPayroll_3_2025_01", "PAY[_]MasterPayroll%", true)]
        [DataRow("PAYXMasterPayroll1", "PAY[_]MasterPayroll%", false)]
        [DataRow("PAY_MasterPayrol", "PAY[_]MasterPayroll%", false)]
        [DataRow("Chat_Messages_2025", "Chat[_]Messages[_]%", true)]
        [DataRow("Chat_Messages", "Chat[_]Messages[_]%", false)]
        [DataRow("Staffing_EmployeeAllwanceInfor12Temps", "Staffing[_]EmployeeAllwanceInfor%Temps", true)]
        [DataRow("Staffing_EmployeeAllwanceInforTemps", "Staffing[_]EmployeeAllwanceInfor%Temps", true)]
        [DataRow("Staffing_EmployeeAllwanceInfor12", "Staffing[_]EmployeeAllwanceInfor%Temps", false)]
        [DataRow("PAY_SGPIRASInformationAppendixes", "PAY[_]SGPIRASInformationAppendixes", true)]
        [DataRow("PAY_SGPIRASInformationAppendixesX", "PAY[_]SGPIRASInformationAppendixes", false)]
        [DataRow("pay_masterpayroll7", "PAY[_]MasterPayroll%", true)]
        public void MatchesLikePattern_SupportsPrefixSuffixAndLiteralUnderscore(string table, string pattern, bool expected)
        {
            Assert.AreEqual(expected, DbSanitizeCatalog.MatchesLikePattern(table, pattern));
        }

        [TestMethod]
        public void IsDynamicEncryptedTable_CoversPayrollPivotAndChat()
        {
            Assert.IsTrue(DbSanitizeCatalog.IsDynamicEncryptedTable("PAY_MasterPayroll5"));
            Assert.IsTrue(DbSanitizeCatalog.IsDynamicEncryptedTable("Chat_Messages_2024"));
            Assert.IsFalse(DbSanitizeCatalog.IsDynamicEncryptedTable("Staffing_Employees"));
            Assert.IsFalse(DbSanitizeCatalog.IsDynamicEncryptedTable(null));
        }

        [TestMethod]
        public void PlainContactExclusions_CoverTablesHandledByOtherSteps()
        {
            var excluded = new HashSet<string>(DbSanitizeCatalog.AllPlainContactExcludedTables(), StringComparer.OrdinalIgnoreCase);
            Assert.IsTrue(excluded.Contains("Setting_EmailServers"));
            Assert.IsTrue(excluded.Contains("Security_Users"));
            Assert.IsTrue(excluded.Contains("Setting_SendMailPendings"));
            Assert.IsTrue(excluded.Contains("INS_Hospitals"));
            Assert.IsFalse(excluded.Contains("Staffing_Employees"));
        }
    }
}
