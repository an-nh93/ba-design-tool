using System;
using System.Security.Cryptography;
using System.Text;

namespace BADesign.Helpers.Security
{
    /// <summary>
    /// Hash for user password (MD5 or SHA256) compatible with HR Helper.
    /// Uses random salt; result is base64(hash + salt) for storage.
    /// </summary>
    public static class SimpleHash
    {
        public enum HashType { SHA1, SHA256, SHA384, SHA512, MD5 }

        public static string ComputeHash(string plainText, HashType hashAlgorithm, byte[] saltBytes = null)
        {
            if (saltBytes == null)
                saltBytes = GenerateSalt();

            var plainTextBytes = Encoding.UTF8.GetBytes(plainText);
            var plainTextWithSaltBytes = new byte[plainTextBytes.Length + saltBytes.Length];
            Buffer.BlockCopy(plainTextBytes, 0, plainTextWithSaltBytes, 0, plainTextBytes.Length);
            Buffer.BlockCopy(saltBytes, 0, plainTextWithSaltBytes, plainTextBytes.Length, saltBytes.Length);

            HashAlgorithm hash;
            switch (hashAlgorithm)
            {
                case HashType.SHA1: hash = SHA1.Create(); break;
                case HashType.SHA256: hash = SHA256.Create(); break;
                case HashType.SHA384: hash = SHA384.Create(); break;
                case HashType.SHA512: hash = SHA512.Create(); break;
                case HashType.MD5: hash = MD5.Create(); break;
                default: throw new ArgumentException("HashAlgorithm not supported");
            }

            using (hash)
            {
                var hashBytes = hash.ComputeHash(plainTextWithSaltBytes);
                var hashWithSaltBytes = new byte[hashBytes.Length + saltBytes.Length];
                Buffer.BlockCopy(hashBytes, 0, hashWithSaltBytes, 0, hashBytes.Length);
                Buffer.BlockCopy(saltBytes, 0, hashWithSaltBytes, hashBytes.Length, saltBytes.Length);
                return Convert.ToBase64String(hashWithSaltBytes);
            }
        }

        public static byte[] GenerateSalt(int length = 8)
        {
            if (length < 4) length = 4;
            if (length > 8) length = 8;
            var bytes = new byte[length];
            using (var rng = new RNGCryptoServiceProvider())
                rng.GetNonZeroBytes(bytes);
            return bytes;
        }
    }
}
