using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using Org.BouncyCastle.Bcpg.OpenPgp;

namespace BADesign.Helpers.Security
{
    public enum PgpDataKind
    {
        Unknown,
        PublicKey,
        PrivateKey,
        EncryptedMessage
    }

    public static class PgpKeyInspector
    {
        public static PgpDataKind GetKind(byte[] data)
        {
            var first = ReadFirstObject(data);
            if (first is PgpPublicKeyRing) return PgpDataKind.PublicKey;
            if (first is PgpSecretKeyRing) return PgpDataKind.PrivateKey;
            if (first is PgpEncryptedDataList) return PgpDataKind.EncryptedMessage;
            return PgpDataKind.Unknown;
        }

        public static IList<long> GetRecipientKeyIds(byte[] encryptedMessage)
        {
            var ids = new List<long>();
            var list = ReadFirstObject(encryptedMessage) as PgpEncryptedDataList;
            if (list == null) return ids;
            foreach (var data in list.GetEncryptedDataObjects())
            {
                var forKey = data as PgpPublicKeyEncryptedData;
                if (forKey != null) ids.Add(forKey.KeyId);
            }
            return ids;
        }

        public static IList<long> GetSecretKeyIds(byte[] privateKey)
        {
            return ReadSecretKeys(privateKey).Select(key => key.KeyId).ToList();
        }

        public static string DescribeConfigKeyPairProblem(byte[] publicKey, byte[] privateKey)
        {
            var publicKeys = ReadPublicKeys(publicKey);
            var secretKeys = ReadSecretKeys(privateKey);
            if (publicKeys.Count == 0 || secretKeys.Count == 0) return null;
            if (publicKeys.Any(p => secretKeys.Any(s => s.KeyId == p.KeyId))) return null;
            return string.Format(
                "Public Key (key {0}, tạo ngày {1}) và Private Key (key {2}, tạo ngày {3}) của cấu hình này không cùng một cặp: file mã hóa bằng Public Key này không giải mã được bằng Private Key này. Cần lưu lại đúng cặp key vào cấu hình.",
                FormatKeyId(publicKeys[0].KeyId), FormatCreationDate(publicKeys[0]),
                FormatKeyId(secretKeys[0].KeyId), FormatCreationDate(secretKeys[0].PublicKey));
        }

        public static string DescribeDecryptProblem(byte[] encryptedMessage, byte[] privateKey)
        {
            var fileKind = GetKind(encryptedMessage);
            if (fileKind == PgpDataKind.PublicKey || fileKind == PgpDataKind.PrivateKey)
                return "File đã chọn để giải mã là file key, không phải file đã mã hóa PGP.";
            if (fileKind != PgpDataKind.EncryptedMessage)
                return "File đã chọn để giải mã không phải file đã mã hóa PGP.";
            switch (GetKind(privateKey))
            {
                case PgpDataKind.PublicKey:
                    return "Key đang dùng để giải mã là Public Key. Giải mã cần Private Key cùng cặp: file Private Key, chuỗi Private Key hoặc key của cấu hình trong DB.";
                case PgpDataKind.EncryptedMessage:
                    return "Key đang dùng để giải mã là file đã mã hóa, không phải Private Key.";
                case PgpDataKind.Unknown:
                    return "Key đang dùng để giải mã không phải key PGP hợp lệ.";
            }
            return DescribeKeyMismatch(encryptedMessage, privateKey);
        }

        public static string DescribeKeyMismatch(byte[] encryptedMessage, byte[] privateKey)
        {
            var recipients = GetRecipientKeyIds(encryptedMessage);
            var available = GetSecretKeyIds(privateKey);
            if (recipients.Count == 0 || available.Count == 0 || recipients.Contains(0L) || recipients.Any(available.Contains))
                return null;
            return string.Format(
                "File được mã hóa cho key {0}, nhưng private key đang dùng là key {1}. Hãy dùng private key cùng cặp với public key đã mã hóa file.",
                FormatKeyIds(recipients), FormatKeyIds(available));
        }

        public static string DescribeEncryptKeyProblem(byte[] publicKey)
        {
            switch (GetKind(publicKey))
            {
                case PgpDataKind.PrivateKey:
                    return "Key đang dùng để mã hóa là Private Key. Mã hóa cần Public Key của bên nhận.";
                case PgpDataKind.EncryptedMessage:
                    return "Key đang dùng để mã hóa là file đã mã hóa, không phải Public Key.";
                case PgpDataKind.Unknown:
                    return "Key đang dùng để mã hóa không phải key PGP hợp lệ.";
            }
            return null;
        }

        public static string DescribeExportKeyProblem(byte[] key, bool privateKeyExpected)
        {
            var kind = GetKind(key);
            if (kind == PgpDataKind.PrivateKey && !privateKeyExpected)
                return "Chuỗi key là Private Key nhưng loại key đang chọn là Public Key.";
            if (kind == PgpDataKind.PublicKey && privateKeyExpected)
                return "Chuỗi key là Public Key nhưng loại key đang chọn là Private Key.";
            if (kind != PgpDataKind.PublicKey && kind != PgpDataKind.PrivateKey)
                return "Chuỗi key không phải key PGP hợp lệ.";
            return null;
        }

        public static string FormatKeyId(long keyId)
        {
            return keyId.ToString("X16");
        }

        private static string FormatKeyIds(IEnumerable<long> ids)
        {
            return string.Join(", ", ids.Distinct().Select(FormatKeyId));
        }

        private static string FormatCreationDate(PgpPublicKey key)
        {
            return DateTime.SpecifyKind(key.CreationTime, DateTimeKind.Utc).ToLocalTime().ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
        }

        private static IList<PgpPublicKey> ReadPublicKeys(byte[] publicKey)
        {
            return ReadKeys(publicKey, input => new PgpPublicKeyRingBundle(input).GetKeyRings().SelectMany(ring => ring.GetPublicKeys()));
        }

        private static IList<PgpSecretKey> ReadSecretKeys(byte[] privateKey)
        {
            return ReadKeys(privateKey, input => new PgpSecretKeyRingBundle(input).GetKeyRings().SelectMany(ring => ring.GetSecretKeys()));
        }

        private static IList<T> ReadKeys<T>(byte[] data, Func<Stream, IEnumerable<T>> read)
        {
            var keys = new List<T>();
            if (data == null || data.Length == 0) return keys;
            try
            {
                using (var input = PgpUtilities.GetDecoderStream(new MemoryStream(data)))
                {
                    keys.AddRange(read(input));
                }
            }
            catch (Exception)
            {
                keys.Clear();
            }
            return keys;
        }

        private static object ReadFirstObject(byte[] data)
        {
            if (data == null || data.Length == 0) return null;
            try
            {
                using (var input = PgpUtilities.GetDecoderStream(new MemoryStream(data)))
                {
                    var factory = new PgpObjectFactory(input);
                    var item = factory.NextPgpObject();
                    while (item is PgpMarker) item = factory.NextPgpObject();
                    return item;
                }
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
