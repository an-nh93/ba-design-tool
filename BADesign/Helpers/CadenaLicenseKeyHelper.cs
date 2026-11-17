using System;
using System.Management;
using System.Numerics;
using System.Text;
using System.Web.Hosting;

namespace BADesign.Helpers
{
    /// <summary>
    /// Kết quả giải mã (decode) một License Key.
    /// </summary>
    public class LicenseKeyInfo
    {
        public bool IsValidKey { get; set; }
        public string ProductKey { get; set; }
        public string TenantCode { get; set; }
        public int NumberOfCompany { get; set; }
        public int NumberOfEmployee { get; set; }
        public DateTime EffectiveDate { get; set; }
        public int LicenseMonth { get; set; }
        public DateTime ExpiredDate { get; set; }
        public bool IsTrialKey { get; set; }
        public bool IsNonExpired { get; set; }
        public string MachineID { get; set; }
        /// <summary>1: HRMS5; 2: Paytime; 3: Paytime Cloud</summary>
        public int ProductType { get; set; }
    }

    /// <summary>
    /// Sinh / giải mã License Key cho mục đích dev-debug HRM (Cadena HRM 5.0 / STD5).
    ///
    /// Đây là bản port NGUYÊN VĂN thuật toán từ source gốc của chính sản phẩm:
    ///   Cadena.BusinessLayer.License.LicenseHelper + ProductKeyManager + SKGL (SKGLGenerate/SKGLValidate).
    /// Khác biệt kỹ thuật duy nhất: dùng System.Numerics.BigInteger thay cho BigIntegerLibrary.BigInteger
    /// (cùng phép toán số nguyên lớn trên số không âm -> kết quả giống hệt).
    /// secretPhase cố định "ca$d$e$na" giữ nguyên như source gốc, nên key sinh ra tương thích 100%
    /// với bản HRM đang dùng và với Cadena.LicenseGenerator.
    /// </summary>
    public static class CadenaLicenseKeyHelper
    {
        private const string SecretPhaseRaw = "ca$d$e$na";

        // ---------------------------------------------------------------------
        // Public API
        // ---------------------------------------------------------------------

        /// <summary>Sinh license key. Với key Trial thì machineID bị bỏ qua (không gắn máy).</summary>
        public static string GenerateLicenseKey(string tenantCode, int numOfCompany, int numOfEmployee,
            string machineID, DateTime effectiveDate, int licenseMonth, bool isTrialKey, bool isNonExpire, int productType)
        {
            // Mirror ProductKeyInformation.TenantCode: set = GetProjectCode(value) (pad '!' + upper), get = bỏ '!'.
            string tenant = GetProjectCode(tenantCode ?? string.Empty).Replace("!", string.Empty);
            string mid = isTrialKey ? string.Empty : (machineID ?? string.Empty);

            var secret = TwentyfiveByteHash(SecretPhaseRaw);

            string stageThree = Encrypt(tenant, isNonExpire, numOfEmployee, secret, mid,
                effectiveDate, licenseMonth, numOfCompany, isTrialKey, productType);

            // addSplitChar = true: chèn '-' sau mỗi 5 ký tự.
            var sb = new StringBuilder();
            int i = 0;
            foreach (char c in stageThree)
            {
                if (i % 5 == 0 && i != 0) sb.Append('-');
                sb.Append(c);
                i++;
            }
            return sb.ToString();
        }

        /// <summary>Giải mã license key, trả về thông tin đã nhúng trong key.</summary>
        public static LicenseKeyInfo ValidateLicenseKey(string key)
        {
            var info = new LicenseKeyInfo { ProductKey = key };
            if (string.IsNullOrWhiteSpace(key)) { info.IsValidKey = false; return info; }

            var secret = TwentyfiveByteHash(SecretPhaseRaw);
            string res;
            try
            {
                string compact = key.Replace("-", string.Empty).Trim();
                res = Decrypt(compact, secret);
            }
            catch
            {
                info.IsValidKey = false;
                return info;
            }

            if (!IsValid(res)) { info.IsValidKey = false; return info; }

            try
            {
                info.IsValidKey = true;
                info.EffectiveDate = new DateTime(
                    Convert.ToInt32(res.Substring(9, 4)),
                    Convert.ToInt32(res.Substring(13, 2)),
                    Convert.ToInt32(res.Substring(15, 2)));
                info.IsNonExpired = Convert.ToInt32(res.Substring(17, 1)) == 1;
                info.TenantCode = Base10ToBase36AllChars(res.Substring(18, 19)).Replace("!", string.Empty);
                info.LicenseMonth = Convert.ToInt32(res.Substring(37, 4));
                info.NumberOfEmployee = Convert.ToInt32(res.Substring(41, 5));
                info.NumberOfCompany = Convert.ToInt32(res.Substring(46, 3));
                info.IsTrialKey = Convert.ToInt32(res.Substring(49, 1)) == 1;
                string rawMachine = info.IsTrialKey
                    ? string.Empty
                    : Base10ToBase36AllChars(res.Substring(50, 19)).Replace("!", string.Empty);
                info.MachineID = GetFormalID(rawMachine);
                info.ProductType = res.Length >= 70 ? Convert.ToInt32(res.Substring(69, 1)) : 1;

                if (info.LicenseMonth > 0 && !info.IsNonExpired)
                    info.ExpiredDate = res.Length >= 70
                        ? info.EffectiveDate.AddMonths(info.LicenseMonth)   // key mới: SetTime = số tháng
                        : info.EffectiveDate.AddDays(info.LicenseMonth);    // key cũ: SetTime = số ngày
                else
                    info.ExpiredDate = info.EffectiveDate;
            }
            catch
            {
                info.IsValidKey = false;
            }
            return info;
        }

        /// <summary>
        /// Lấy Machine ID của máy đang chạy (dựa trên ProcessorId qua WMI) — giống hệt LicenseHelper.GetMachineID gốc.
        /// Dùng cho key không phải Trial (key gắn máy chủ chạy HRM).
        /// </summary>
        public static string GetMachineID()
        {
            using (HostingEnvironment.Impersonate())
            {
                string volumeSerial = string.Empty; // giữ nguyên như source gốc (không dùng volume serial)
                string cpuID = GetCPUID();
                string mixedID = cpuID.Substring(13) + cpuID.Substring(1, 4) + volumeSerial + cpuID.Substring(4, 4);
                return GetFormalID(mixedID);
            }
        }

        // ---------------------------------------------------------------------
        // Machine ID helpers (port từ LicenseHelper)
        // ---------------------------------------------------------------------

        private static string GetCPUID()
        {
            string cpuid = string.Empty;
            using (var searcher = new ManagementObjectSearcher("Select ProcessorID From Win32_processor"))
            {
                foreach (ManagementObject mo in searcher.Get())
                {
                    cpuid = mo["ProcessorID"].ToString();
                    break;
                }
            }
            return cpuid;
        }

        private static string GetFormalID(string mixedID)
        {
            if (mixedID == null) return string.Empty;
            var sb = new StringBuilder();
            int i = 0;
            foreach (char c in mixedID)
            {
                if (i % 4 == 0 && i != 0) sb.Append('-');
                sb.Append(c);
                i++;
            }
            return sb.ToString();
        }

        /// <summary>Port Helpers.GetProjectCode: pad '!' bên trái cho đủ 11 ký tự, cắt còn 11, in hoa.</summary>
        private static string GetProjectCode(string stringProjectCode)
        {
            if (stringProjectCode == null) stringProjectCode = string.Empty;
            int len = stringProjectCode.Length;
            if (len >= 1 && len <= 10)
                stringProjectCode = new string('!', 11 - len) + stringProjectCode;
            if (stringProjectCode.Length > 11)
                stringProjectCode = stringProjectCode.Substring(0, 11);
            return stringProjectCode.ToUpper();
        }

        // ---------------------------------------------------------------------
        // SKGL core (port nguyên văn methods class, BigInteger -> System.Numerics)
        // ---------------------------------------------------------------------

        private const string LicenseCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        private const string AllCharacters = "!ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.-";

        private static string Encrypt(string stringProjectCode, bool boolNonExpired, int numOfEmployee,
            string secretPhase, string machineID, DateTime effectiveDate, int licenseMonth, int numOfCompany,
            bool isTrialKey, int productType)
        {
            int retInt = Convert.ToInt32(effectiveDate.ToString("yyyyMMdd"));
            string keygen = retInt.ToString("D8");
            keygen += boolNonExpired ? "1" : "0";
            long longProjectCode = long.Parse(Base36ToBase10AllChars(stringProjectCode));
            keygen += longProjectCode.ToString("D19");
            keygen += licenseMonth.ToString("D4");
            keygen += numOfEmployee.ToString("D5");
            keygen += numOfCompany.ToString("D3");
            keygen += isTrialKey ? "1" : "0";
            machineID = (machineID ?? string.Empty).Replace("-", string.Empty);
            string machineIDInNumber = Base36ToBase10AllChars(machineID);
            long longMachineID = long.Parse(machineIDInNumber);
            keygen += longMachineID.ToString("D19");
            keygen += productType.ToString("D1");

            if (string.IsNullOrEmpty(secretPhase))
                return Base10ToBase36(GetEightByteHash(keygen, 1000000000).ToString() + keygen);
            return Base10ToBase36(GetEightByteHash(keygen, 1000000000).ToString() + EncText(keygen, secretPhase));
        }

        private static string Decrypt(string key, string secretPhase)
        {
            if (string.IsNullOrEmpty(secretPhase))
                return Base36ToBase10(key);
            string usefulInformation = Base36ToBase10(key);
            return usefulInformation.Substring(0, 9) + DecText(usefulInformation.Substring(9), secretPhase);
        }

        private static bool IsValid(string res)
        {
            try
            {
                if (string.IsNullOrEmpty(res)) return false;
                string decodedHash = res.Substring(0, 9);
                string calculatedHash = GetEightByteHash(res.Substring(9, res.Length - 9), 1000000000)
                    .ToString().Substring(0, 9);
                return decodedHash == calculatedHash;
            }
            catch
            {
                return false;
            }
        }

        private static string EncText(string inputPhase, string secretPhase)
        {
            var sb = new StringBuilder();
            for (int i = 0; i <= inputPhase.Length - 1; i++)
                sb.Append(Modulo(
                    Convert.ToInt32(inputPhase.Substring(i, 1)) +
                    Convert.ToInt32(secretPhase.Substring(Modulo(i, secretPhase.Length), 1)), 10));
            return sb.ToString();
        }

        private static string DecText(string encryptedPhase, string secretPhase)
        {
            var sb = new StringBuilder();
            for (int i = 0; i <= encryptedPhase.Length - 1; i++)
                sb.Append(Modulo(
                    Convert.ToInt32(encryptedPhase.Substring(i, 1)) -
                    Convert.ToInt32(secretPhase.Substring(Modulo(i, secretPhase.Length), 1)), 10));
            return sb.ToString();
        }

        private static int Modulo(int num, int baseN)
        {
            return num - baseN * Convert.ToInt32(Math.Floor((decimal)num / (decimal)baseN));
        }

        private static string TwentyfiveByteHash(string s)
        {
            int amountOfBlocks = s.Length / 5;
            string[] preHash = new string[amountOfBlocks + 1];

            if (s.Length <= 5)
            {
                preHash[0] = GetEightByteHash(s, 1000000000).ToString();
            }
            else
            {
                for (int i = 0; i <= amountOfBlocks - 2; i++)
                    preHash[i] = GetEightByteHash(s.Substring(i * 5, 5), 1000000000).ToString();

                preHash[preHash.Length - 2] = GetEightByteHash(
                    s.Substring((preHash.Length - 2) * 5, s.Length - (preHash.Length - 2) * 5),
                    1000000000).ToString();
            }
            return string.Join(string.Empty, preHash);
        }

        private static int GetEightByteHash(string s, int mustBeLessThan)
        {
            if (mustBeLessThan == 0) mustBeLessThan = 1000000000;
            uint hash = 0;
            foreach (byte b in Encoding.Unicode.GetBytes(s))
            {
                hash += b;
                hash += (hash << 10);
                hash ^= (hash >> 6);
            }
            hash += (hash << 3);
            hash ^= (hash >> 11);
            hash += (hash << 15);

            int result = (int)(hash % (uint)mustBeLessThan);
            int check = mustBeLessThan / result;
            if (check > 1) result *= check;
            return result;
        }

        private static string Base10ToBase36(string s)
        {
            char[] allowedLetters = LicenseCharacters.ToCharArray();
            int numletters = allowedLetters.Length;
            BigInteger num = BigInteger.Parse(s);

            char[] result = new char[s.Length + 1];
            int j = 0;
            while (num >= numletters)
            {
                int reminder = (int)(num % numletters);
                result[j] = allowedLetters[reminder];
                num = (num - reminder) / numletters;
                j++;
            }
            result[j] = allowedLetters[(int)num];

            var sb = new StringBuilder();
            for (int k = j; k >= 0; k--) sb.Append(result[k]);
            return sb.ToString();
        }

        private static string Base36ToBase10(string s)
        {
            BigInteger result = BigInteger.Zero;
            for (int i = 0; i <= s.Length - 1; i++)
            {
                BigInteger pow = Powof(LicenseCharacters.Length, s.Length - i - 1);
                result = result + LicenseCharacters.IndexOf(s.Substring(i, 1)) * pow;
            }
            return result.ToString();
        }

        private static string Base10ToBase36AllChars(string s)
        {
            char[] allowedLetters = AllCharacters.ToCharArray();
            int numletters = allowedLetters.Length;
            BigInteger num = BigInteger.Parse(s);

            char[] result = new char[s.Length + 1];
            int j = 0;
            while (num >= numletters)
            {
                int reminder = (int)(num % numletters);
                result[j] = allowedLetters[reminder];
                num = (num - reminder) / numletters;
                j++;
            }
            result[j] = allowedLetters[(int)num];

            var sb = new StringBuilder();
            for (int k = j; k >= 0; k--) sb.Append(result[k]);
            return sb.ToString();
        }

        private static string Base36ToBase10AllChars(string s)
        {
            BigInteger result = BigInteger.Zero;
            for (int i = 0; i <= s.Length - 1; i++)
            {
                BigInteger pow = Powof(AllCharacters.Length, s.Length - i - 1);
                result = result + AllCharacters.IndexOf(s.Substring(i, 1)) * pow;
            }
            return result.ToString();
        }

        private static BigInteger Powof(int x, int y)
        {
            if (y == 0) return BigInteger.One;
            if (y == 1) return x;
            BigInteger newNum = BigInteger.One;
            for (int i = 0; i <= y - 1; i++) newNum = newNum * x;
            return newNum;
        }
    }
}
