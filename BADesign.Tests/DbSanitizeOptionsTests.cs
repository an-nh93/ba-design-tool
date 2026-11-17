using BADesign.Helpers.Database;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json.Linq;

namespace BADesign.Tests
{
    [TestClass]
    public class DbSanitizeOptionsTests
    {
        [TestMethod]
        public void Normalize_AppliesDefaultsForEmptyValues()
        {
            var options = new DbSanitizeOptions { Email = "  dev@cadena.com.sg ", Password = " ", Phone = null, SalaryMin = 0, SalaryMax = 0, MaxParallel = 0 };
            options.Normalize();
            Assert.AreEqual("dev@cadena.com.sg", options.Email);
            Assert.AreEqual(DbSanitizeOptions.DefaultPassword, options.Password);
            Assert.AreEqual(DbSanitizeOptions.DefaultPhone, options.Phone);
            Assert.AreEqual(DbSanitizeOptions.DefaultSalaryMin, options.SalaryMin);
            Assert.AreEqual(DbSanitizeOptions.DefaultSalaryMax, options.SalaryMax);
            Assert.AreEqual(1, options.MaxParallel);
        }

        [TestMethod]
        public void Normalize_SwapsSalaryRangeAndLimitsParallelism()
        {
            var options = new DbSanitizeOptions { Email = "dev@cadena.com.sg", SalaryMin = 9000, SalaryMax = 1000, MaxParallel = 99 };
            options.Normalize();
            Assert.AreEqual(1000m, options.SalaryMin);
            Assert.AreEqual(9000m, options.SalaryMax);
            Assert.AreEqual(DbSanitizeOptions.MaxParallelLimit, options.MaxParallel);
        }

        [DataTestMethod]
        [DataRow("dev@cadena.com.sg", true)]
        [DataRow("a@b.co", true)]
        [DataRow("", false)]
        [DataRow(null, false)]
        [DataRow("no-at-sign", false)]
        [DataRow("@cadena.com.sg", false)]
        [DataRow("dev@cadena", false)]
        [DataRow("dev @cadena.com.sg", false)]
        public void Validate_RequiresPlausibleEmail(string email, bool valid)
        {
            var options = new DbSanitizeOptions { Email = email };
            Assert.AreEqual(valid, options.Validate() == null);
        }

        [TestMethod]
        public void Payload_RoundTripsAllFields()
        {
            var options = new DbSanitizeOptions
            {
                Email = "dev@cadena.com.sg",
                Phone = "0900000000",
                Password = "abc",
                KeepRealSalary = true,
                SalaryMin = 1234.5m,
                SalaryMax = 9876m,
                MaxParallel = 2,
                SetSimpleRecovery = false
            };
            var copy = DbSanitizeOptions.FromPayload(JObject.Parse(options.ToPayload().ToString()));
            Assert.AreEqual(options.Email, copy.Email);
            Assert.AreEqual(options.Phone, copy.Phone);
            Assert.AreEqual(options.Password, copy.Password);
            Assert.AreEqual(options.KeepRealSalary, copy.KeepRealSalary);
            Assert.AreEqual(options.SalaryMin, copy.SalaryMin);
            Assert.AreEqual(options.SalaryMax, copy.SalaryMax);
            Assert.AreEqual(options.MaxParallel, copy.MaxParallel);
            Assert.AreEqual(options.SetSimpleRecovery, copy.SetSimpleRecovery);
        }

        [TestMethod]
        public void FromPayload_ReturnsDefaultsForMissingOrInvalidInput()
        {
            var fromNull = DbSanitizeOptions.FromPayload(null);
            Assert.AreEqual(DbSanitizeOptions.DefaultPassword, fromNull.Password);
            Assert.IsFalse(fromNull.KeepRealSalary);
            var fromText = DbSanitizeOptions.FromPayload(JObject.Parse("{\"keepRealSalary\":\"true\",\"salaryMin\":\"abc\",\"maxParallel\":3}"));
            Assert.IsTrue(fromText.KeepRealSalary);
            Assert.AreEqual(DbSanitizeOptions.DefaultSalaryMin, fromText.SalaryMin);
            Assert.AreEqual(3, fromText.MaxParallel);
        }

        [TestMethod]
        public void Report_IsCleanOnlyWhenEveryStepSucceeded()
        {
            var report = new DbSanitizeReport();
            Assert.IsFalse(report.IsClean);
            report.Steps.Add(new DbSanitizeStepResult { Key = "a", Label = "A", Status = DbSanitizeStatus.Done, Rows = 12 });
            report.Steps.Add(new DbSanitizeStepResult { Key = "b", Label = "B", Status = DbSanitizeStatus.Skipped });
            Assert.IsTrue(report.IsClean);
            Assert.IsNull(report.FirstProblem());
            var warned = new DbSanitizeStepResult { Key = "c", Label = "C", Status = DbSanitizeStatus.Warning };
            warned.Warnings.Add("bảng X: lỗi");
            report.Steps.Add(warned);
            Assert.IsFalse(report.IsClean);
            Assert.IsFalse(report.HasFailure);
            Assert.AreEqual("C: bảng X: lỗi", report.FirstProblem());
            report.Steps.Add(new DbSanitizeStepResult { Key = "d", Label = "D", Status = DbSanitizeStatus.Failed, Detail = "timeout" });
            Assert.IsTrue(report.HasFailure);
            Assert.AreEqual("D: timeout", report.FirstProblem());
            var json = report.ToJson();
            Assert.AreEqual(false, (bool)json["clean"]);
            Assert.AreEqual(4, ((JArray)json["steps"]).Count);
            StringAssert.Contains(report.ToDataTypesText(), "A (12 dòng)");
            Assert.IsFalse(report.ToDataTypesText().Contains("B"));
        }
    }
}
