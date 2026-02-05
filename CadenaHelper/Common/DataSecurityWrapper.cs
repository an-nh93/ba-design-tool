using Cadena.Library.Security.Cryptography;
using System;
using System.Globalization;
using System.IO;
using System.Net.NetworkInformation;
using System.Text;
using System.DirectoryServices;
using System.Net;

namespace CadenaHelper.Security
{
    public static class Constants
    {
        public const string CompetencyModule = "Competency";
        public const string SecurityModule = "Security";
        public const string StaffingModule = "Staffing";
        public const string InsuranceModule = "Insurance";
        public const string TimeAttendanceModule = "TimeAttendanceModule";
        public const string SessionNewJobIdKeyName = "AddJob&NewJobId";
        public const string JSPropertiesResultName = "cpResult";
        public const string SessionJobAssignCompetencyName = "EditCompetency$AssignJobCompetency";
        public const string SessionReferenceCompetencyName = "EditCompetency$ReferenceCompetency";

        public const string MenuAddNew = "Add";
        public const string MenuUpdate = "Update";
        public const string MenuDelete = "Delete";
        public const string MenuPrint = "Print";
        public const string MenuSearch = "Search";
        public const string MenuImport = "Import";
        public const string MenuExport = "Export";
        public const string MenuClose = "Close";
        public const string MenuCancel = "Cancel";
        public const string MenuOK = "OK";
        public const string MenuReset = "Reset";
        public const string MenuSave = "Save";
        public const string MenuClear = "Clear";
        public const string CommandMenuUpdate = "cmdUpdate";
        public const string CommandMenuDelete = "cmdDelete";

        public const int ComboboxNoneSelected = -1;

        public static string DefaultPassEncryptForAudit = "@Cadena!";
        public static string NotAvaiable = "N/A";

        public const string DeathReasonCode = "PA";
        public const double MaxPayInYear = 6000000;
    }

    public class DataSecurityWrapper
    {
        private const string _password = "my secret password";
        private const string _defaultSalt = "w9=z4]0h";
        private const string _defaultIv = "fd98w7z3yupz0q41";
        public const string ENCRYPTED_ZERO = "ecUiqG+ws3quNulrHp/d9w==";
        public const string EnscryptKey = "15051993";
        private const string _prefixPassword = "Cadena";

        private static void GetParamerters(ref string pd, ref string di, ref string ds)
        {
            // Move these contant variables to funtion to avoid reverse engine tool view the secrect keys. The constant is viewable para.
            pd = "my secret password"; // Password
            di = "fd98w7z3yupz0q41"; // default IV
            ds = "w9=z4]0h"; // Default salt
        }


        public static void EncryptFile(byte[] bytes, string outFile, string salt = null)
        {
            // Move these contant variables to funtion to avoid reverse engine tool view the secrect keys. The constant is viewable para.
            string _password = null;
            string _defaultSalt = null;
            string _defaultIv = null;
            GetParamerters(ref _password, ref _defaultIv, ref _defaultSalt);

            using (var aes = SymmetricCryptography.CreateAes())
            {
                string encrypteSalt = salt != null ? salt + _defaultSalt : _defaultSalt; // At least 8 chars long

                var passwordBytes = Encoding.UTF8.GetBytes(_password);
                var saltBytes = Encoding.UTF8.GetBytes(encrypteSalt);
                var ivBytes = Encoding.UTF8.GetBytes(_defaultIv);
                aes.EncryptFile(bytes, outFile, passwordBytes, saltBytes, ivBytes);
            }
        }

        public static bool IsOwner()
        {
            var username = Environment.UserName;
            if (IsInternalNetwork() && (username == "an.nh" || username == "hieu" || username == "hue.nn"))
                return true;

            return false;
        }

        public static bool VerifyPassword(string username, string password)
        {
            if (username != Environment.UserName)
                return false;

            var passwordLogin = GeneratePasswordLoginForUser(username);
            passwordLogin = passwordLogin.Substring(0, 12);
            return password == passwordLogin;
        }

        public static bool IsInternalNetwork()
        {
            var userDomain = System.Environment.UserDomainName;
            var domainName = IPGlobalProperties.GetIPGlobalProperties().DomainName;
            var username = Environment.UserName;
            if (domainName.ToLower() == "cadena.local" || userDomain.ToLower().StartsWith("cadena") || username.ToLower() == "tiend" || username.ToLower() == "tudv" || IsCadenaWorkgroup())
            {
                return true;
            }
            return false;
        }

        //public static bool IsCadenaWorkgroup()
        //{
        //    string computerName = Environment.MachineName;
        //    using (DirectoryEntry root = new DirectoryEntry("WinNT:"))
        //    {
        //        DirectoryEntry computer = root.Children.Find(computerName, "Computer");
        //        if (computer != null && !string.IsNullOrWhiteSpace(computer.Path))
        //        {
        //            return computer.Path.ToLower().Contains("cadena");
        //        }
        //    }
        //    return false;
        //}

        public static bool IsCadenaWorkgroup()
        {
            try
            {
                // Lấy FQDN (Fully Qualified Domain Name)
                string fqdn = Dns.GetHostEntry(Environment.MachineName).HostName;

                return fqdn.ToLower().Contains("cadena");
            }
            catch (Exception ex)
            {
                // Log nếu cần
                return false;
            }
        }

        public static string GeneratePasswordLoginForUser(string username)
        {
            var password = GeneratePasswordLogin(username);
            password = EncryptData(password, EnscryptKey);
            return password.Substring(0, 12);
        }

        public static string GeneratePasswordLogin(string username)
        {
            TimeZoneInfo vnTimezone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");

            DateTime utcTime = DateTime.UtcNow;
            DateTime currentVNTime = TimeZoneInfo.ConvertTimeFromUtc(utcTime, vnTimezone);

            return string.Format("{0}{1}", currentVNTime.ToString("ddMMyyyyHH"), username);
        }

        public static void EncryptFile(string inFile, string outFile, string salt = null)
        {
            // Move these contant variables to funtion to avoid reverse engine tool view the secrect keys. The constant is viewable para.
            string _password = null;
            string _defaultSalt = null;
            string _defaultIv = null;
            GetParamerters(ref _password, ref _defaultIv, ref _defaultSalt);
            //string _defaultSalt = "w9=z4]0h";
            //string _password = "my secret password";
            //string _defaultIv = "fd98w7z3yupz0q41";

            using (var aes = SymmetricCryptography.CreateAes())
            {
                string encrypteSalt = salt != null ? salt + _defaultSalt : _defaultSalt; // At least 8 chars long

                var passwordBytes = Encoding.UTF8.GetBytes(_password);
                var saltBytes = Encoding.UTF8.GetBytes(encrypteSalt);
                var ivBytes = Encoding.UTF8.GetBytes(_defaultIv);
                aes.EncryptFile(inFile, outFile, passwordBytes, saltBytes, ivBytes);
            }
        }

       
        public static Stream DecryptFile(string inFile, string salt = null)
        {
            // Move these contant variables to funtion to avoid reverse engine tool view the secrect keys. The constant is viewable para.
            string _password = null;
            string _defaultSalt = null;
            string _defaultIv = null;
            GetParamerters(ref _password, ref _defaultIv, ref _defaultSalt);

            using (var aes = SymmetricCryptography.CreateAes())
            {
                string decrypteSalt = salt != null ? salt + _defaultSalt : _defaultSalt; // At least 8 chars long

                var passwordBytes = Encoding.UTF8.GetBytes(_password);
                var saltBytes = Encoding.UTF8.GetBytes(decrypteSalt);
                var ivBytes = Encoding.UTF8.GetBytes(_defaultIv);
                var stream = aes.DecryptFile(inFile, passwordBytes, saltBytes, ivBytes);
                return stream;
            }
        }

        /// <summary>
        /// Using for Encrypt the sensitive data.
        /// </summary>
        /// <param name="plainText">Text to Encrypt</param>
        /// <param name="saltText">The salt text.
        /// If the plainText which does not belong to Employee then saltText equal to null.
        /// If the plainText which belong to Employee then the saltText is EmployeeID.</param>
        /// <returns></returns>
        public static string EncryptAuditData(object plainText)
        {
            if (plainText == null || plainText.ToString() == string.Empty)
                return String.Empty;
            plainText = DateTime.Now.Ticks.ToString() + "|_|_|" + plainText;
            using (var aes = SymmetricCryptography.CreateAes())
            {
                string password = "my secret password";
                var defaultSaltText = "w9=z4]0h";
                string salt = Constants.DefaultPassEncryptForAudit + defaultSaltText; // At least 8 chars long // maximum 16 chars
                string iv = "fd98w7z3yupz0q41"; // Have to match the algorithm block size - for all cases can be 16 chars

                var encryptedText = aes.EncryptText(plainText.ToString(), password, salt, iv);

                return encryptedText;
            }
        }

        /// <summary>
        /// Using for Encrypt the sensitive data.
        /// </summary>
        /// <param name="plainText">Text to Encrypt</param>
        /// <param name="saltText">The salt text.
        /// If the plainText which does not belong to Employee then saltText equal to null.
        /// If the plainText which belong to Employee then the saltText is EmployeeID.</param>
        /// <returns></returns>
        public static string EncryptData(object plainText, object saltText)
        {
            if (plainText == null || plainText.ToString() == string.Empty)
                return String.Empty;

            if (plainText.Equals(0))
                return ENCRYPTED_ZERO;

            using (var aes = SymmetricCryptography.CreateAes())
            {
                string password = "my secret password";
                var defaultSaltText = "w9=z4]0h";
                string salt = saltText != null ? saltText + defaultSaltText : defaultSaltText; // At least 8 chars long
                string iv = "fd98w7z3yupz0q41"; // Have to match the algorithm block size - for all cases can be 16 chars

                var encryptedText = aes.EncryptText(plainText.ToString(), password, salt, iv);

                return encryptedText;
            }
        }

        /// <summary>
        /// Using for Decrypt the sensitive data.
        /// </summary>
        /// <typeparam name="T">Type of return value</typeparam>
        /// <param name="encryptedText">Encrypted text</param>
        /// <param name="saltText">
        /// The salt text.
        /// If the plainText which does not belong to Employee then saltText equal to null.
        /// If the plainText which belong to Employee then the saltText is EmployeeID.</param>
        /// </param>
        /// <returns></returns>
        public static T DecryptAuditData<T>(string encryptedText)
        {
            if (String.IsNullOrWhiteSpace(encryptedText))
                return default(T);//(T)Convert.ChangeType(null, typeof(T));

            using (var aes = SymmetricCryptography.CreateAes())
            {
                try
                {
                    string password = "my secret password";
                    var defaultSaltText = "w9=z4]0h";
                    string salt = Constants.DefaultPassEncryptForAudit + defaultSaltText; // At least 8 chars long
                    string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

                    var decryptedText = aes.DecryptText(encryptedText, password, salt, iv);
                    if (!string.IsNullOrEmpty(decryptedText))
                    {
                        var arrs = decryptedText.Split(new string[] { "|_|_|" }, StringSplitOptions.None);
                        if (arrs.Length > 1)
                        {
                            decryptedText = arrs[1];
                        }
                    }
                    return ConvertTo<T>(decryptedText);
                }
                catch
                {
                    return default(T);

                    //return ConvertTo<T>(encryptedText);
                    //return ConvertTo<T>("Invalid Decrypted Value");
                }
            }
        }

        /// <summary>
        /// Using for Decrypt the sensitive data.
        /// </summary>
        /// <typeparam name="T">Type of return value</typeparam>
        /// <param name="encryptedText">Encrypted text</param>
        /// <param name="saltText">
        /// The salt text.
        /// If the plainText which does not belong to Employee then saltText equal to null.
        /// If the plainText which belong to Employee then the saltText is EmployeeID.</param>
        /// </param>
        /// <returns></returns>
        public static T DecryptData<T>(string encryptedText, long? employeeID)
        {
            if (String.IsNullOrWhiteSpace(encryptedText) || encryptedText.Equals(ENCRYPTED_ZERO))
                return default(T);//(T)Convert.ChangeType(null, typeof(T));

            using (var aes = SymmetricCryptography.CreateAes())
            {
                try
                {
                    string password = "my secret password";
                    var defaultSaltText = "w9=z4]0h";
                    string salt = employeeID != null ? employeeID + defaultSaltText : defaultSaltText; // At least 8 chars long
                    string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

                    var decryptedText = aes.DecryptText(encryptedText, password, salt, iv);

                    return ConvertTo<T>(decryptedText);
                }
                catch (Exception ex)
                {
                    return default(T);

                    //return ConvertTo<T>(encryptedText);
                    //return ConvertTo<T>("Invalid Decrypted Value");
                }
            }
        }

        public static T DecryptDataAnyKey<T>(string encryptedText, string key)
        {
            if (String.IsNullOrWhiteSpace(encryptedText) || encryptedText.Equals(ENCRYPTED_ZERO))
                return default(T);//(T)Convert.ChangeType(null, typeof(T));

            using (var aes = SymmetricCryptography.CreateAes())
            {
                try
                {
                    string password = "my secret password";
                    var defaultSaltText = "w9=z4]0h";
                    string salt = !string.IsNullOrWhiteSpace(key) ? key + defaultSaltText : defaultSaltText; // At least 8 chars long
                    string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

                    var decryptedText = aes.DecryptText(encryptedText, password, salt, iv);

                    return ConvertTo<T>(decryptedText);
                }
                catch (Exception ex)
                {
                    return default(T);

                    //return ConvertTo<T>(encryptedText);
                    //return ConvertTo<T>("Invalid Decrypted Value");
                }
            }
        }

        public static double DecryptDataToDouble(ISymmetricCryptography aes, string encryptedText, long? employeeID)
        {
            if (String.IsNullOrWhiteSpace(encryptedText) || encryptedText.Equals(ENCRYPTED_ZERO))
                return 0;//(T)Convert.ChangeType(null, typeof(T));

            //using (var aes = SymmetricCryptography.CreateAes())
            {
                try
                {
                    //return 0;
                    string password = "my secret password";
                    var defaultSaltText = "w9=z4]0h";
                    string salt = employeeID != null ? employeeID + defaultSaltText : defaultSaltText; // At least 8 chars long
                    string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

                    //return 0;
                    //var s1 = Stopwatch.StartNew();
                    var decryptedText = aes.DecryptText(encryptedText, password, salt, iv);

                    //s1.Stop();
                    //var totalSecond = s1.Elapsed.TotalSeconds;
                    //var totalMinute = s1.Elapsed.TotalMinutes;

                    return double.Parse(decryptedText);
                }
                catch
                {
                    return 0;

                    //return ConvertTo<T>(encryptedText);
                    //return ConvertTo<T>("Invalid Decrypted Value");
                }
            }
        }

        //public static string EncryptData(object plainText)
        //{
        //    if (plainText == null) return String.Empty;

        //    using (var aes = SymmetricCryptography.CreateAes())
        //    {
        //        string password = "my secret password";
        //        string salt = "w9=z4]0h"; // at least 8 chars long
        //        string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

        //        var encryptedText = aes.EncryptText(plainText.ToString(), password, salt, iv);

        //        return encryptedText;
        //    }
        //}

        public static T DecryptData<T>(string encryptedText)
        {
            if (String.IsNullOrWhiteSpace(encryptedText) || encryptedText.Equals(ENCRYPTED_ZERO))
                return default(T);//return (T)Convert.ChangeType(null, typeof(T));

            using (var aes = SymmetricCryptography.CreateAes())
            {
                try
                {
                    string password = "my secret password";
                    string salt = "w9=z4]0h"; // at least 8 chars long
                    string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

                    var decryptedText = aes.DecryptText(encryptedText, password, salt, iv);

                    return ConvertTo<T>(decryptedText);
                }
                catch (Exception)
                {
                    return default(T);
                }
            }
        }

        public static T ConvertTo<T>(string data)
        {
            var type = typeof(T);

            if (type.IsGenericType
                && type.GetGenericTypeDefinition() == typeof(Nullable<>))
            {
                return (T)Convert.ChangeType(data, type.GetGenericArguments()[0], new CultureInfo("en-US"));
            }

            //else if (type.Name == "System.Guid")
            //{
            //    return Guid.Parse(data);
            //}

            return (T)Convert.ChangeType(data, type, new CultureInfo("en-US"));
        }

        ////////////////////////////////////////////////////

        /// <summary>
        ///
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="encryptedText"></param>
        /// <param name="employeeID"></param>
        /// <returns></returns>
        public static T DecryptDataByNewAlgo<T>(string encryptedText, long? employeeID)
        {
            if (String.IsNullOrWhiteSpace(encryptedText))
                return default(T);//(T)Convert.ChangeType(null, typeof(T));

            using (var aes = SymmetricCryptography.CreateAes())
            {
                try
                {
                    string password = "my secret password";
                    var defaultSaltText = "w9=z4]0h";
                    string salt = employeeID != null ? employeeID + defaultSaltText : defaultSaltText; // At least 8 chars long
                    string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

                    var decryptedText = aes.DecryptTextByNewAlgo(encryptedText, password, salt, iv);

                    return ConvertTo<T>(decryptedText);
                }
                catch (Exception ex)
                {
                    //Log.Error(string.Format("Decrypt Data Failed. Cause: {0}, on Employee: {1}", ex.Message, employeeID));
                    return default(T);

                    //return ConvertTo<T>(encryptedText);
                    //return ConvertTo<T>("Invalid Decrypted Value");
                }
            }
        }

        /// <summary>
        ///
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="encryptedText"></param>
        /// <param name="employeeID"></param>
        /// <returns></returns>
        public static T DecryptDataByOldAlgo<T>(string encryptedText, long? employeeID)
        {
            if (String.IsNullOrWhiteSpace(encryptedText))
                return default(T);//(T)Convert.ChangeType(null, typeof(T));

            using (var aes = SymmetricCryptography.CreateAes())
            {
                try
                {
                    string password = "my secret password";
                    var defaultSaltText = "w9=z4]0h";
                    string salt = employeeID != null ? employeeID + defaultSaltText : defaultSaltText; // At least 8 chars long
                    string iv = "fd98w7z3yupz0q41"; // have to match the algorithm block size - for all cases can be 16 chars

                    var decryptedText = aes.DecryptTextByOldAlgo(encryptedText, password, salt, iv);

                    return ConvertTo<T>(decryptedText);
                }
                catch (Exception ex)
                {
                    //Log.Error(string.Format("Decrypt Data Failed. Cause: {0}, on Employee: {1}", ex.Message, employeeID));
                    throw ex;

                    //return default(T);

                    //return ConvertTo<T>(encryptedText);
                    //return ConvertTo<T>("Invalid Decrypted Value");
                }
            }
        }

        public static string EncryptDataByNewAlgo(object plainText, object saltText)
        {
            if (plainText == null) return String.Empty;

            using (var aes = SymmetricCryptography.CreateAes())
            {
                string password = "my secret password";
                var defaultSaltText = "w9=z4]0h";
                string salt = saltText != null ? saltText + defaultSaltText : defaultSaltText; // At least 8 chars long
                string iv = "fd98w7z3yupz0q41"; // Have to match the algorithm block size - for all cases can be 16 chars

                var encryptedText = aes.EncryptTextByNewAlgo(plainText.ToString(), password, salt, iv);

                return encryptedText;
            }
        }
    }
}