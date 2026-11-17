using System;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers.Database
{
    public sealed class DbSanitizeEmailServer
    {
        public string OutgoingServer { get; set; }
        public string Port { get; set; }
        public string AccountName { get; set; }
        public string Username { get; set; }
        public string EmailAddress { get; set; }
        public string Password { get; set; }
        public bool EnableSsl { get; set; }
        public string SslPort { get; set; }

        public bool HasValue
        {
            get
            {
                return !string.IsNullOrWhiteSpace(OutgoingServer)
                    || !string.IsNullOrWhiteSpace(Username)
                    || !string.IsNullOrWhiteSpace(EmailAddress);
            }
        }
    }

    public sealed class DbSanitizeSftp
    {
        public string Host { get; set; }
        public string Port { get; set; }
        public string User { get; set; }
        public string Password { get; set; }

        public bool HasValue
        {
            get
            {
                return !string.IsNullOrWhiteSpace(Host)
                    || !string.IsNullOrWhiteSpace(Port)
                    || !string.IsNullOrWhiteSpace(User)
                    || !string.IsNullOrWhiteSpace(Password);
            }
        }
    }

    public sealed class DbSanitizeOptions
    {
        public const string DefaultPassword = "1";
        public const string DefaultPhone = "0987654321";
        public const decimal DefaultSalaryMin = 5000000m;
        public const decimal DefaultSalaryMax = 30000000m;
        public const int DefaultMaxParallel = 4;
        public const int MaxParallelLimit = 8;

        public DbSanitizeOptions()
        {
            Password = DefaultPassword;
            Phone = DefaultPhone;
            SalaryMin = DefaultSalaryMin;
            SalaryMax = DefaultSalaryMax;
            MaxParallel = DefaultMaxParallel;
            SetSimpleRecovery = true;
        }

        public string Email { get; set; }
        public string Phone { get; set; }
        public string Password { get; set; }
        public bool KeepRealSalary { get; set; }
        public decimal SalaryMin { get; set; }
        public decimal SalaryMax { get; set; }
        public int MaxParallel { get; set; }
        public bool SetSimpleRecovery { get; set; }
        public DbSanitizeEmailServer EmailServer { get; set; }
        public DbSanitizeSftp Sftp { get; set; }

        public void Normalize()
        {
            Email = (Email ?? "").Trim();
            Phone = (Phone ?? "").Trim();
            Password = (Password ?? "").Trim();
            if (Password.Length == 0) Password = DefaultPassword;
            if (Phone.Length == 0) Phone = DefaultPhone;
            if (SalaryMin < 0) SalaryMin = 0;
            if (SalaryMax < 0) SalaryMax = 0;
            if (SalaryMax < SalaryMin)
            {
                var t = SalaryMin;
                SalaryMin = SalaryMax;
                SalaryMax = t;
            }
            if (SalaryMin == 0 && SalaryMax == 0)
            {
                SalaryMin = DefaultSalaryMin;
                SalaryMax = DefaultSalaryMax;
            }
            if (MaxParallel < 1) MaxParallel = 1;
            if (MaxParallel > MaxParallelLimit) MaxParallel = MaxParallelLimit;
        }

        public string Validate()
        {
            if (string.IsNullOrWhiteSpace(Email))
                return "Chưa nhập email dùng để thay thế.";
            var e = Email.Trim();
            var at = e.IndexOf('@');
            if (at <= 0 || at >= e.Length - 3 || e.IndexOf('.', at) < 0 || e.IndexOf(' ') >= 0)
                return "Email dùng để thay thế không hợp lệ.";
            return null;
        }

        public JObject ToPayload()
        {
            var o = new JObject();
            o["email"] = Email ?? "";
            o["phone"] = Phone ?? "";
            o["password"] = Password ?? "";
            o["keepRealSalary"] = KeepRealSalary;
            o["salaryMin"] = SalaryMin;
            o["salaryMax"] = SalaryMax;
            o["maxParallel"] = MaxParallel;
            o["setSimpleRecovery"] = SetSimpleRecovery;
            return o;
        }

        public static DbSanitizeOptions FromPayload(JToken token)
        {
            var options = new DbSanitizeOptions();
            var o = token as JObject;
            if (o == null) return options;
            options.Email = ReadString(o, "email", options.Email);
            options.Phone = ReadString(o, "phone", options.Phone);
            options.Password = ReadString(o, "password", options.Password);
            options.KeepRealSalary = ReadBool(o, "keepRealSalary", options.KeepRealSalary);
            options.SalaryMin = ReadDecimal(o, "salaryMin", options.SalaryMin);
            options.SalaryMax = ReadDecimal(o, "salaryMax", options.SalaryMax);
            options.MaxParallel = (int)ReadDecimal(o, "maxParallel", options.MaxParallel);
            options.SetSimpleRecovery = ReadBool(o, "setSimpleRecovery", options.SetSimpleRecovery);
            return options;
        }

        private static string ReadString(JObject o, string name, string fallback)
        {
            var t = o[name];
            if (t == null || t.Type == JTokenType.Null) return fallback;
            return t.ToString();
        }

        private static bool ReadBool(JObject o, string name, bool fallback)
        {
            var t = o[name];
            if (t == null || t.Type == JTokenType.Null) return fallback;
            if (t.Type == JTokenType.Boolean) return t.Value<bool>();
            bool b;
            return bool.TryParse(t.ToString(), out b) ? b : fallback;
        }

        private static decimal ReadDecimal(JObject o, string name, decimal fallback)
        {
            var t = o[name];
            if (t == null || t.Type == JTokenType.Null) return fallback;
            if (t.Type == JTokenType.Integer || t.Type == JTokenType.Float)
                return Convert.ToDecimal(((JValue)t).Value, System.Globalization.CultureInfo.InvariantCulture);
            decimal d;
            return decimal.TryParse(t.ToString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out d) ? d : fallback;
        }
    }
}
