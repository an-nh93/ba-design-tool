using System;
using System.Collections.Generic;
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
            var ids = new List<long>();
            if (privateKey == null || privateKey.Length == 0) return ids;
            try
            {
                using (var input = PgpUtilities.GetDecoderStream(new MemoryStream(privateKey)))
                {
                    var bundle = new PgpSecretKeyRingBundle(input);
                    foreach (var ring in bundle.GetKeyRings())
                    {
                        foreach (var key in ring.GetSecretKeys()) ids.Add(key.KeyId);
                    }
                }
            }
            catch (Exception)
            {
                ids.Clear();
            }
            return ids;
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
