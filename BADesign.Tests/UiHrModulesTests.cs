using System.Collections.Generic;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class UiHrModulesTests
    {
        [TestMethod]
        public void CleanName_TrimsAndCollapsesWhitespace()
        {
            Assert.AreEqual("Time - Attendance", UiHrModules.CleanName("  Time \t -  Attendance \r\n"));
        }

        [TestMethod]
        public void CleanName_ReturnsEmptyForNull()
        {
            Assert.AreEqual("", UiHrModules.CleanName(null));
        }

        [TestMethod]
        public void NameProblem_AcceptsModuleNames()
        {
            Assert.IsNull(UiHrModules.NameProblem("Staffing"));
            Assert.IsNull(UiHrModules.NameProblem("Time-Attendance"));
            Assert.IsNull(UiHrModules.NameProblem("Bảo hiểm & Thuế"));
            Assert.IsNull(UiHrModules.NameProblem(new string('a', UiHrModules.MaxNameLength)));
        }

        [TestMethod]
        public void NameProblem_RejectsEmptyName()
        {
            Assert.AreEqual("Chưa nhập tên phân hệ.", UiHrModules.NameProblem(""));
            Assert.AreEqual("Chưa nhập tên phân hệ.", UiHrModules.NameProblem(null));
            Assert.AreEqual("Chưa nhập tên phân hệ.", UiHrModules.NameProblem(UiHrModules.CleanName("   ")));
        }

        [TestMethod]
        public void NameProblem_RejectsNameOverLimit()
        {
            Assert.IsNotNull(UiHrModules.NameProblem(new string('a', UiHrModules.MaxNameLength + 1)));
        }

        [TestMethod]
        public void NameProblem_RejectsMarkupAndControlCharacters()
        {
            Assert.IsNotNull(UiHrModules.NameProblem("<img src=x onerror=alert(1)>"));
            Assert.IsNotNull(UiHrModules.NameProblem("Payroll>"));
            Assert.IsNotNull(UiHrModules.NameProblem("Pay\u0001roll"));
        }

        [TestMethod]
        public void IsScreenKey_AcceptsLibraryKeys()
        {
            Assert.IsTrue(UiHrModules.IsScreenKey("core-overtime"));
            Assert.IsTrue(UiHrModules.IsScreenKey("coreess-13th-month-payment"));
        }

        [TestMethod]
        public void IsScreenKey_RejectsOtherText()
        {
            Assert.IsFalse(UiHrModules.IsScreenKey(null));
            Assert.IsFalse(UiHrModules.IsScreenKey(""));
            Assert.IsFalse(UiHrModules.IsScreenKey("Core-Overtime"));
            Assert.IsFalse(UiHrModules.IsScreenKey("../index"));
            Assert.IsFalse(UiHrModules.IsScreenKey("core overtime"));
            Assert.IsFalse(UiHrModules.IsScreenKey("'; DROP TABLE UiHrModule;--"));
            Assert.IsFalse(UiHrModules.IsScreenKey(new string('a', 65)));
        }

        [TestMethod]
        public void CleanOrder_KeepsFirstOccurrenceOfPositiveIds()
        {
            CollectionAssert.AreEqual(new List<int> { 3, 1, 2 }, UiHrModules.CleanOrder(new[] { 3, 1, 3, 0, -5, 2, 1 }));
        }

        [TestMethod]
        public void CleanOrder_ReturnsEmptyForNull()
        {
            Assert.AreEqual(0, UiHrModules.CleanOrder(null).Count);
        }

        [TestMethod]
        public void CleanOrder_StopsAtTheModuleLimit()
        {
            var ids = new List<int>();
            for (var i = 1; i <= UiHrModules.MaxModules + 20; i++) ids.Add(i);
            Assert.AreEqual(UiHrModules.MaxModules, UiHrModules.CleanOrder(ids).Count);
        }
    }
}
