using System;
using CadenaHelper.Security;

namespace BADesign.Helpers.Security
{
    /// <summary>
    /// Wrapper: dùng CadenaHelper.DataSecurityWrapper (WinForms) cho Encrypt/Decrypt employee data;
    /// AesHelper riêng cho EncryptConnectId/DecryptConnectId (URL token).
    /// </summary>
    public static class DataSecurityWrapper
    {
        public const string ENCRYPTED_ZERO = CadenaHelper.Security.DataSecurityWrapper.ENCRYPTED_ZERO;

        public static string EncryptData(object plainText, object saltText)
        {
            return CadenaHelper.Security.DataSecurityWrapper.EncryptData(plainText, saltText);
        }

        public static T DecryptData<T>(string encryptedText, long? employeeID)
        {
            return CadenaHelper.Security.DataSecurityWrapper.DecryptData<T>(encryptedText, employeeID);
        }

        public static T DecryptData<T>(string encryptedText, string key)
        {
            return CadenaHelper.Security.DataSecurityWrapper.DecryptDataAnyKey<T>(encryptedText, key);
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
