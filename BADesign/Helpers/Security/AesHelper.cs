using System;
using System.Security.Cryptography;
using System.Text;

namespace BADesign.Helpers.Security
{
    /// <summary>
    /// AES/Rijndael encrypt-decrypt – copy logic từ WinForms Cadena SymmetricCryptography.
    /// Key = UTF8(salt) pad tới 32 bytes (256-bit); IV = UTF8(iv) 16 bytes; CBC, PKCS7.
    /// DataSecurityWrapper: password "my secret password", salt = key + "w9=z4]0h", iv "fd98w7z3yupz0q41".
    /// </summary>
    internal static class AesHelper
    {
        private const int KeyLength = 32;
        private const int BlockSize = 16;

        public static byte[] EncryptBytes(byte[] data, byte[] keyBytes, byte[] iv)
        {
            using (var aes = new RijndaelManaged())
            {
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.KeySize = 256;
                aes.BlockSize = 128;
                var key = Resize(keyBytes, KeyLength);
                var ivBytes = Resize(iv, BlockSize);
                using (var encryptor = aes.CreateEncryptor(key, ivBytes))
                {
                    return encryptor.TransformFinalBlock(data, 0, data.Length);
                }
            }
        }

        public static byte[] DecryptBytes(byte[] encryptedData, byte[] keyBytes, byte[] iv)
        {
            using (var aes = new RijndaelManaged())
            {
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.KeySize = 256;
                aes.BlockSize = 128;
                var key = Resize(keyBytes, KeyLength);
                var ivBytes = Resize(iv, BlockSize);
                using (var decryptor = aes.CreateDecryptor(key, ivBytes))
                {
                    return decryptor.TransformFinalBlock(encryptedData, 0, encryptedData.Length);
                }
            }
        }

        public static string EncryptText(string text, string password, string salt, string iv)
        {
            var enc = Encoding.UTF8;
            var saltBytes = enc.GetBytes(salt ?? "");
            var ivBytes = enc.GetBytes(iv ?? "");
            var data = enc.GetBytes(text);
            var encrypted = EncryptBytes(data, saltBytes, ivBytes);
            return Convert.ToBase64String(encrypted);
        }

        public static string DecryptText(string base64Text, string password, string salt, string iv)
        {
            var enc = Encoding.UTF8;
            var saltBytes = enc.GetBytes(salt ?? "");
            var ivBytes = enc.GetBytes(iv ?? "");
            var encrypted = Convert.FromBase64String(base64Text);
            var decrypted = DecryptBytes(encrypted, saltBytes, ivBytes);
            return enc.GetString(decrypted);
        }

        private static byte[] Resize(byte[] bytes, int length)
        {
            if (bytes == null) return new byte[length];
            if (bytes.Length == length) return bytes;
            var result = new byte[length];
            var copy = Math.Min(bytes.Length, length);
            Buffer.BlockCopy(bytes, 0, result, 0, copy);
            return result;
        }
    }
}
