using System;
using System.Globalization;
using System.Text;

namespace BADesign.Helpers.Security
{
    /// <summary>
    /// Encrypt/decrypt sensitive data compatible with Cadena DataSecurityWrapper.
    /// Salt = employeeID/userKey + defaultSalt. Used for email, phone, etc.
    /// </summary>
    public static class DataSecurityWrapper
    {
        private const string Password = "my secret password";
        private const string DefaultSalt = "w9=z4]0h";
        private const string DefaultIv = "fd98w7z3yupz0q41";
        public const string ENCRYPTED_ZERO = "ecUiqG+ws3quNulrHp/d9w==";

        public static string EncryptData(object plainText, object saltText)
        {
            if (plainText == null || string.IsNullOrEmpty(plainText.ToString()))
                return string.Empty;
            if (plainText.Equals(0))
                return ENCRYPTED_ZERO;

            var salt = saltText != null ? saltText + DefaultSalt : DefaultSalt;
            return AesHelper.EncryptText(plainText.ToString(), Password, salt, DefaultIv);
        }

        public static T DecryptData<T>(string encryptedText, long? employeeID)
        {
            if (string.IsNullOrWhiteSpace(encryptedText) || encryptedText == ENCRYPTED_ZERO)
                return default(T);

            try
            {
                var salt = employeeID != null ? employeeID + DefaultSalt : DefaultSalt;
                var decrypted = AesHelper.DecryptText(encryptedText, Password, salt, DefaultIv);
                return ConvertTo<T>(decrypted);
            }
            catch
            {
                return default(T);
            }
        }

        public static T DecryptData<T>(string encryptedText, string key)
        {
            if (string.IsNullOrWhiteSpace(encryptedText) || encryptedText == ENCRYPTED_ZERO)
                return default(T);

            try
            {
                var salt = !string.IsNullOrWhiteSpace(key) ? key + DefaultSalt : DefaultSalt;
                var decrypted = AesHelper.DecryptText(encryptedText, Password, salt, DefaultIv);
                return ConvertTo<T>(decrypted);
            }
            catch
            {
                return default(T);
            }
        }

        public static T ConvertTo<T>(string data)
        {
            if (string.IsNullOrEmpty(data)) return default(T);
            var type = typeof(T);
            if (type == typeof(string)) return (T)(object)data;
            if (Nullable.GetUnderlyingType(type) != null)
                type = Nullable.GetUnderlyingType(type);
            return (T)Convert.ChangeType(data, type, CultureInfo.InvariantCulture);
        }

        private const string ConnectKey = "hr-connect-key-2024";
        private const string ConnectSalt = "hr-connect-salt";
        private const string ConnectIv = "hr-connect-iv-16";  // 16 chars

        /// <summary>Encrypt connect id for URL (base64url-safe).</summary>
        public static string EncryptConnectId(string id)
        {
            if (string.IsNullOrEmpty(id)) return "";
            var enc = AesHelper.EncryptText(id, ConnectKey, ConnectSalt, ConnectIv);
            return enc.Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }

        /// <summary>Decrypt connect token from URL.</summary>
        public static string DecryptConnectId(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return "";
            var b64 = token.Replace('-', '+').Replace('_', '/');
            var pad = b64.Length % 4;
            if (pad > 0) b64 += new string('=', 4 - pad);
            try { return AesHelper.DecryptText(b64, ConnectKey, ConnectSalt, ConnectIv); }
            catch { return ""; }
        }
    }
}
