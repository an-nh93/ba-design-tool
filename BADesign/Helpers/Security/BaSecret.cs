using System;
using System.Security.Cryptography;
using System.Text;

namespace BADesign.Helpers.Security
{
    /// <summary>
    /// Mã hóa hai chiều cho bí mật lưu trong database của tool: mật khẩu SQL Server, mật khẩu trong Cài đặt, chuỗi kết nối trong payload job.
    /// Giá trị đã mã hóa: "enc:v1:" + Base64(IV 16 byte + bản mã AES-256-CBC + HMAC-SHA256 32 byte); mỗi lần mã hóa dùng một IV ngẫu nhiên.
    /// Giá trị không đúng dạng đó là dữ liệu cũ dạng thường và được đọc nguyên như vậy.
    /// Đổi Passphrase, DerivationSalt hoặc DerivationRounds thì mọi giá trị đã mã hóa trong database không đọc lại được.
    /// </summary>
    public static class BaSecret
    {
        public const string Prefix = "enc:v1:";

        private const string Passphrase = "150519930708";
        private const string DerivationSalt = "BADesign.BaSecret.v1";
        private const int DerivationRounds = 200000;
        private const int KeySize = 32;
        private const int BlockSize = 16;
        private const int MacSize = 32;

        private static readonly byte[] PrefixBytes = Encoding.UTF8.GetBytes(Prefix);
        private static readonly Lazy<SecretKeys> Keys = new Lazy<SecretKeys>(DeriveKeys);

        private sealed class SecretKeys
        {
            public byte[] Encryption;
            public byte[] Signing;
        }

        public static string Protect(string plain)
        {
            if (string.IsNullOrEmpty(plain)) return plain;
            var keys = Keys.Value;
            var iv = new byte[BlockSize];
            using (var random = RandomNumberGenerator.Create())
            {
                random.GetBytes(iv);
            }
            var cipher = AesHelper.EncryptBytes(Encoding.UTF8.GetBytes(plain), keys.Encryption, iv);
            var signedLength = BlockSize + cipher.Length;
            var body = new byte[signedLength + MacSize];
            Buffer.BlockCopy(iv, 0, body, 0, BlockSize);
            Buffer.BlockCopy(cipher, 0, body, BlockSize, cipher.Length);
            Buffer.BlockCopy(Sign(keys.Signing, body, signedLength), 0, body, signedLength, MacSize);
            return Prefix + Convert.ToBase64String(body);
        }

        public static string Reveal(string stored)
        {
            string plain;
            return TryReveal(stored, out plain) ? plain : stored;
        }

        public static bool IsProtected(string stored)
        {
            string plain;
            return TryReveal(stored, out plain);
        }

        /// <summary>
        /// Đưa một giá trị đang lưu về dạng mong muốn (đã mã hóa hoặc dạng thường). Giá trị đã ở đúng dạng thì giữ nguyên.
        /// Giá trị mang tiền tố nhưng không giải mã được (mã hóa bằng khóa khác, hoặc bị hỏng) cũng giữ nguyên: mã hóa chồng lên thì không còn cách lấy lại.
        /// </summary>
        public static string Recode(string stored, bool protect)
        {
            string plain;
            var isProtected = TryReveal(stored, out plain);
            if (!protect) return isProtected ? plain : stored;
            if (isProtected || HasPrefix(stored)) return stored;
            return Protect(stored);
        }

        private static bool HasPrefix(string stored)
        {
            return stored != null && stored.StartsWith(Prefix, StringComparison.Ordinal);
        }

        private static bool TryReveal(string stored, out string plain)
        {
            plain = null;
            if (!HasPrefix(stored)) return false;
            byte[] body;
            try
            {
                body = Convert.FromBase64String(stored.Substring(Prefix.Length));
            }
            catch (FormatException)
            {
                return false;
            }
            var cipherLength = body.Length - BlockSize - MacSize;
            if (cipherLength < BlockSize || cipherLength % BlockSize != 0) return false;
            var keys = Keys.Value;
            var signedLength = BlockSize + cipherLength;
            if (!SameBytes(Sign(keys.Signing, body, signedLength), body, signedLength)) return false;
            var iv = new byte[BlockSize];
            var cipher = new byte[cipherLength];
            Buffer.BlockCopy(body, 0, iv, 0, BlockSize);
            Buffer.BlockCopy(body, BlockSize, cipher, 0, cipherLength);
            plain = Encoding.UTF8.GetString(AesHelper.DecryptBytes(cipher, keys.Encryption, iv));
            return true;
        }

        /// <summary>Khóa trong source ngắn, nên kéo dài bằng PBKDF2 một lần cho mỗi tiến trình, rồi tách thành khóa mã hóa và khóa ký.</summary>
        private static SecretKeys DeriveKeys()
        {
            byte[] master;
            using (var derive = new Rfc2898DeriveBytes(Passphrase, Encoding.UTF8.GetBytes(DerivationSalt), DerivationRounds, HashAlgorithmName.SHA256))
            {
                master = derive.GetBytes(KeySize);
            }
            using (var expand = new HMACSHA256(master))
            {
                return new SecretKeys
                {
                    Encryption = expand.ComputeHash(Encoding.UTF8.GetBytes("encryption")),
                    Signing = expand.ComputeHash(Encoding.UTF8.GetBytes("signing"))
                };
            }
        }

        private static byte[] Sign(byte[] key, byte[] body, int length)
        {
            using (var hmac = new HMACSHA256(key))
            {
                hmac.TransformBlock(PrefixBytes, 0, PrefixBytes.Length, null, 0);
                hmac.TransformFinalBlock(body, 0, length);
                return hmac.Hash;
            }
        }

        /// <summary>So sánh chữ ký không dừng sớm ở byte khác đầu tiên, để thời gian trả lời không lộ chữ ký đúng.</summary>
        private static bool SameBytes(byte[] expected, byte[] body, int offset)
        {
            var difference = 0;
            for (var i = 0; i < expected.Length; i++)
            {
                difference |= expected[i] ^ body[offset + i];
            }
            return difference == 0;
        }
    }
}
