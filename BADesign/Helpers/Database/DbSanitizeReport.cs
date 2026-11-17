using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers.Database
{
    public static class DbSanitizeStatus
    {
        public const string Done = "done";
        public const string Skipped = "skipped";
        public const string Warning = "warning";
        public const string Failed = "failed";
    }

    public sealed class DbSanitizeProgress
    {
        public string StepKey { get; set; }
        public string StepLabel { get; set; }
        public int Percent { get; set; }
    }

    public sealed class DbSanitizeStepResult
    {
        public DbSanitizeStepResult()
        {
            Warnings = new List<string>();
            Status = DbSanitizeStatus.Done;
        }

        public string Key { get; set; }
        public string Label { get; set; }
        public string Status { get; set; }
        public long Rows { get; set; }
        public long Ms { get; set; }
        public string Detail { get; set; }
        public List<string> Warnings { get; private set; }

        public JObject ToJson()
        {
            var o = new JObject();
            o["key"] = Key ?? "";
            o["label"] = Label ?? "";
            o["status"] = Status ?? "";
            o["rows"] = Rows;
            o["ms"] = Ms;
            o["detail"] = Detail ?? "";
            var warnings = new JArray();
            foreach (var w in Warnings.Take(20)) warnings.Add(w);
            o["warnings"] = warnings;
            o["warningCount"] = Warnings.Count;
            return o;
        }
    }

    public sealed class DbSanitizeReport
    {
        public DbSanitizeReport()
        {
            Steps = new List<DbSanitizeStepResult>();
        }

        public List<DbSanitizeStepResult> Steps { get; private set; }
        public DateTime StartedAt { get; set; }
        public DateTime FinishedAt { get; set; }
        public long TotalMs { get; set; }
        public bool Cancelled { get; set; }
        public string Error { get; set; }
        public string HashType { get; set; }
        public bool KeepRealSalary { get; set; }

        public bool IsClean
        {
            get
            {
                if (Cancelled || !string.IsNullOrEmpty(Error) || Steps.Count == 0) return false;
                return Steps.All(s => s.Status == DbSanitizeStatus.Done || s.Status == DbSanitizeStatus.Skipped);
            }
        }

        public bool HasFailure
        {
            get { return !string.IsNullOrEmpty(Error) || Steps.Any(s => s.Status == DbSanitizeStatus.Failed); }
        }

        public string FirstProblem()
        {
            if (Cancelled) return "Đã hủy";
            if (!string.IsNullOrEmpty(Error)) return Error;
            var failed = Steps.FirstOrDefault(s => s.Status == DbSanitizeStatus.Failed);
            if (failed != null) return failed.Label + ": " + (failed.Detail ?? "lỗi");
            var warned = Steps.FirstOrDefault(s => s.Status == DbSanitizeStatus.Warning);
            if (warned != null) return warned.Label + ": " + (warned.Warnings.FirstOrDefault() ?? warned.Detail ?? "có cảnh báo");
            return null;
        }

        public JObject ToJson()
        {
            var o = new JObject();
            o["clean"] = IsClean;
            o["cancelled"] = Cancelled;
            o["error"] = Error ?? "";
            o["hashType"] = HashType ?? "";
            o["keepRealSalary"] = KeepRealSalary;
            o["totalMs"] = TotalMs;
            o["finishedAt"] = FinishedAt.ToString("o", CultureInfo.InvariantCulture);
            var steps = new JArray();
            foreach (var s in Steps) steps.Add(s.ToJson());
            o["steps"] = steps;
            return o;
        }

        public string ToDataTypesText()
        {
            var parts = new List<string>();
            foreach (var s in Steps)
            {
                if (s.Status == DbSanitizeStatus.Skipped) continue;
                var text = s.Label;
                if (s.Rows > 0) text += " (" + s.Rows.ToString("N0", CultureInfo.InvariantCulture) + " dòng)";
                if (s.Status == DbSanitizeStatus.Failed) text += " [lỗi]";
                else if (s.Status == DbSanitizeStatus.Warning) text += " [cảnh báo]";
                parts.Add(text);
            }
            if (KeepRealSalary) parts.Add("Giữ lương thật");
            return string.Join("; ", parts);
        }
    }
}
