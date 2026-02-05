using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace BADesign.Helpers.Security
{
    /// <summary>
    /// DWB encrypt/decrypt – copy from WinForms CadenaHelper DWBDataSecurityWrapper.
    /// Rijndael 256-bit, PasswordDeriveBytes(key, null), IV "Cadena$hrm@@0717".
    /// Use when "Apply for DWB" is checked; data encrypted by old WinForms tool.
    /// </summary>
    public static class DWBDataSecurityWrapper
    {
        private const string InitVector = "Cadena$hrm@@0717";
        private const int KeySize = 256;

        public static string EncryptData(object plainText, object key)
        {
            if (plainText == null || string.IsNullOrEmpty(plainText.ToString()))
                return string.Empty;
            var k = key != null ? key.ToString() : "@Cedan1#1";
            var initVectorBytes = Encoding.UTF8.GetBytes(InitVector);
            var plainTextBytes = Encoding.UTF8.GetBytes(plainText.ToString());
            using (var password = new PasswordDeriveBytes(k, null))
            {
                var keyBytes = password.GetBytes(KeySize / 8);
                using (var rijndael = new RijndaelManaged())
                {
                    rijndael.Mode = CipherMode.CBC;
                    using (var encryptor = rijndael.CreateEncryptor(keyBytes, initVectorBytes))
                    {
                        using (var ms = new System.IO.MemoryStream())
                        {
                            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                            {
                                cs.Write(plainTextBytes, 0, plainTextBytes.Length);
                                cs.FlushFinalBlock();
                                return Convert.ToBase64String(ms.ToArray());
                            }
                        }
                    }
                }
            }
        }

        /// <summary>
        /// Decrypt using DWB algorithm. key null -> "@Cedan1#1"; else key.ToString().Replace("-","").ToLower().
        /// </summary>
        public static T DecryptData<T>(string source, object key)
        {
            if (string.IsNullOrWhiteSpace(source))
                return default(T);
            try
            {
                var k = key != null ? key.ToString().Replace("-", "").ToLowerInvariant() : "@Cedan1#1";
                var initVectorBytes = Encoding.UTF8.GetBytes(InitVector);
                var cipherTextBytes = Convert.FromBase64String(source);
                using (var password = new PasswordDeriveBytes(k, null))
                {
                    var keyBytes = password.GetBytes(KeySize / 8);
                    using (var rijndael = new RijndaelManaged())
                    {
                        rijndael.Mode = CipherMode.CBC;
                        using (var decryptor = rijndael.CreateDecryptor(keyBytes, initVectorBytes))
                        {
                            using (var ms = new System.IO.MemoryStream(cipherTextBytes))
                            {
                                using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
                                {
                                    var plainTextBytes = new byte[cipherTextBytes.Length];
                                    var count = cs.Read(plainTextBytes, 0, plainTextBytes.Length);
                                    var result = Encoding.UTF8.GetString(plainTextBytes, 0, count);
                                    return ConvertTo<T>(result);
                                }
                            }
                        }
                    }
                }
            }
            catch
            {
                return default(T);
            }
        }

        private static T ConvertTo<T>(string data)
        {
            if (string.IsNullOrEmpty(data)) return default(T);
            var type = typeof(T);
            if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>))
                type = Nullable.GetUnderlyingType(type);
            if (type == typeof(string)) return (T)(object)data;
            return (T)Convert.ChangeType(data, type, new CultureInfo("en-US"));
        }
    }
}
