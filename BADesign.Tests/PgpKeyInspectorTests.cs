using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using BADesign.Helpers.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using PgpCore;

namespace BADesign.Tests
{
    [TestClass]
    public class PgpKeyInspectorTests
    {
        private const string Passphrase = "test-passphrase";
        private static KeyPair first;
        private static KeyPair second;

        private sealed class KeyPair
        {
            public byte[] PublicKey;
            public byte[] PrivateKey;
        }

        [ClassInitialize]
        public static void CreateKeys(TestContext context)
        {
            first = Generate();
            second = Generate();
        }

        private static KeyPair Generate()
        {
            var folder = Path.Combine(Path.GetTempPath(), "pgp-inspector-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(folder);
            try
            {
                var publicFile = new FileInfo(Path.Combine(folder, "public.asc"));
                var privateFile = new FileInfo(Path.Combine(folder, "private.asc"));
                using (var pgp = new PGP())
                {
                    pgp.GenerateKey(publicFile, privateFile, "test@example.local", Passphrase);
                }
                return new KeyPair { PublicKey = File.ReadAllBytes(publicFile.FullName), PrivateKey = File.ReadAllBytes(privateFile.FullName) };
            }
            finally
            {
                Directory.Delete(folder, true);
            }
        }

        private static async Task<byte[]> Encrypt(byte[] publicKey, bool armor)
        {
            using (var input = new MemoryStream(Encoding.UTF8.GetBytes("nội dung thử")))
            using (var keyStream = new MemoryStream(publicKey))
            using (var output = new MemoryStream())
            {
                using (var pgp = new PGP(new EncryptionKeys(keyStream)))
                {
                    await pgp.EncryptAsync(input, output, armor, true, "test.txt");
                }
                return output.ToArray();
            }
        }

        private static async Task<string> Decrypt(byte[] message, byte[] privateKey)
        {
            using (var input = new MemoryStream(message))
            using (var keyStream = new MemoryStream(privateKey))
            using (var output = new MemoryStream())
            {
                using (var pgp = new PGP(new EncryptionKeys(keyStream, Passphrase)))
                {
                    await pgp.DecryptAsync(input, output);
                }
                return Encoding.UTF8.GetString(output.ToArray());
            }
        }

        [TestMethod]
        public async Task RecipientOfAMessage_IsAKeyOfTheMatchingPrivateKey()
        {
            foreach (var armor in new[] { false, true })
            {
                var message = await Encrypt(first.PublicKey, armor);
                var recipients = PgpKeyInspector.GetRecipientKeyIds(message);
                Assert.AreEqual(1, recipients.Count, "armor " + armor);
                CollectionAssert.Contains(PgpKeyInspector.GetSecretKeyIds(first.PrivateKey).ToList(), recipients[0], "armor " + armor);
                CollectionAssert.DoesNotContain(PgpKeyInspector.GetSecretKeyIds(second.PrivateKey).ToList(), recipients[0], "armor " + armor);
            }
        }

        [TestMethod]
        public async Task MatchingPair_HasNoMismatchAndDecrypts()
        {
            var message = await Encrypt(first.PublicKey, false);
            Assert.IsNull(PgpKeyInspector.DescribeKeyMismatch(message, first.PrivateKey));
            Assert.AreEqual("nội dung thử", await Decrypt(message, first.PrivateKey));
        }

        [TestMethod]
        public async Task OtherPair_NamesTheKeyOfTheFileAndTheKeyInUse()
        {
            var message = await Encrypt(first.PublicKey, true);
            var text = PgpKeyInspector.DescribeKeyMismatch(message, second.PrivateKey);
            Assert.IsNotNull(text);
            var fileKey = PgpKeyInspector.FormatKeyId(PgpKeyInspector.GetRecipientKeyIds(message)[0]);
            var keysInUse = string.Join(", ", PgpKeyInspector.GetSecretKeyIds(second.PrivateKey).Distinct().Select(PgpKeyInspector.FormatKeyId));
            Assert.AreEqual("File được mã hóa cho key " + fileKey + ", nhưng private key đang dùng là key " + keysInUse + ". Hãy dùng private key cùng cặp với public key đã mã hóa file.", text);
        }

        [TestMethod]
        public async Task OtherPair_IsTheCaseTheLibraryReportsAsSecretKeyNotFound()
        {
            var message = await Encrypt(first.PublicKey, false);
            try
            {
                await Decrypt(message, second.PrivateKey);
                Assert.Fail("decryption with another key pair should fail");
            }
            catch (Exception e) when (!(e is AssertFailedException))
            {
                StringAssert.Contains(e.Message, "Secret key for message not found");
            }
        }

        [TestMethod]
        public async Task UnreadableInput_GivesNoMismatch()
        {
            var message = await Encrypt(first.PublicKey, false);
            var garbage = Encoding.ASCII.GetBytes("not a pgp message");
            Assert.AreEqual(0, PgpKeyInspector.GetRecipientKeyIds(garbage).Count);
            Assert.AreEqual(0, PgpKeyInspector.GetSecretKeyIds(garbage).Count);
            Assert.AreEqual(0, PgpKeyInspector.GetSecretKeyIds(first.PublicKey).Count);
            Assert.IsNull(PgpKeyInspector.DescribeKeyMismatch(garbage, second.PrivateKey));
            Assert.IsNull(PgpKeyInspector.DescribeKeyMismatch(message, first.PublicKey));
            Assert.IsNull(PgpKeyInspector.DescribeKeyMismatch(null, null));
        }

        [TestMethod]
        public async Task GetKind_TellsKeysAndMessagesApart()
        {
            Assert.AreEqual(PgpDataKind.PublicKey, PgpKeyInspector.GetKind(first.PublicKey));
            Assert.AreEqual(PgpDataKind.PrivateKey, PgpKeyInspector.GetKind(first.PrivateKey));
            Assert.AreEqual(PgpDataKind.EncryptedMessage, PgpKeyInspector.GetKind(await Encrypt(first.PublicKey, false)));
            Assert.AreEqual(PgpDataKind.EncryptedMessage, PgpKeyInspector.GetKind(await Encrypt(first.PublicKey, true)));
            Assert.AreEqual(PgpDataKind.Unknown, PgpKeyInspector.GetKind(Encoding.UTF8.GetBytes("2026-11-16 10:00:00 INFO log line")));
            Assert.AreEqual(PgpDataKind.Unknown, PgpKeyInspector.GetKind(new byte[0]));
            Assert.AreEqual(PgpDataKind.Unknown, PgpKeyInspector.GetKind(null));
        }

        [TestMethod]
        public async Task PublicKeyGivenForDecryption_IsTheCaseTheLibraryReportsAsPublicKeyRingFound()
        {
            var message = await Encrypt(first.PublicKey, false);
            try
            {
                await Decrypt(message, first.PublicKey);
                Assert.Fail("decryption with a public key should fail");
            }
            catch (Exception e) when (!(e is AssertFailedException))
            {
                StringAssert.Contains(e.Message, "PgpPublicKeyRing found where PgpSecretKeyRing expected");
            }
        }

        [TestMethod]
        public async Task DescribeDecryptProblem_NamesEachWrongInput()
        {
            var message = await Encrypt(first.PublicKey, false);
            var junk = Encoding.UTF8.GetBytes("2026-11-16 10:00:00 INFO log line");
            Assert.IsNull(PgpKeyInspector.DescribeDecryptProblem(message, first.PrivateKey));
            Assert.IsNull(PgpKeyInspector.DescribeDecryptProblem(await Encrypt(first.PublicKey, true), first.PrivateKey));
            Assert.AreEqual("Key đang dùng để giải mã là Public Key. Giải mã cần Private Key cùng cặp: file Private Key, chuỗi Private Key hoặc key của cấu hình trong DB.", PgpKeyInspector.DescribeDecryptProblem(message, first.PublicKey));
            Assert.AreEqual("Key đang dùng để giải mã là file đã mã hóa, không phải Private Key.", PgpKeyInspector.DescribeDecryptProblem(message, message));
            Assert.AreEqual("Key đang dùng để giải mã không phải key PGP hợp lệ.", PgpKeyInspector.DescribeDecryptProblem(message, junk));
            Assert.AreEqual("File đã chọn để giải mã là file key, không phải file đã mã hóa PGP.", PgpKeyInspector.DescribeDecryptProblem(first.PublicKey, first.PrivateKey));
            Assert.AreEqual("File đã chọn để giải mã là file key, không phải file đã mã hóa PGP.", PgpKeyInspector.DescribeDecryptProblem(first.PrivateKey, first.PrivateKey));
            Assert.AreEqual("File đã chọn để giải mã không phải file đã mã hóa PGP.", PgpKeyInspector.DescribeDecryptProblem(junk, first.PrivateKey));
            Assert.AreEqual(PgpKeyInspector.DescribeKeyMismatch(message, second.PrivateKey), PgpKeyInspector.DescribeDecryptProblem(message, second.PrivateKey));
            Assert.IsNotNull(PgpKeyInspector.DescribeDecryptProblem(message, second.PrivateKey));
        }

        [TestMethod]
        public async Task DescribeEncryptKeyProblem_AcceptsOnlyAPublicKey()
        {
            var message = await Encrypt(first.PublicKey, true);
            Assert.IsNull(PgpKeyInspector.DescribeEncryptKeyProblem(first.PublicKey));
            Assert.AreEqual("Key đang dùng để mã hóa là Private Key. Mã hóa cần Public Key của bên nhận.", PgpKeyInspector.DescribeEncryptKeyProblem(first.PrivateKey));
            Assert.AreEqual("Key đang dùng để mã hóa là file đã mã hóa, không phải Public Key.", PgpKeyInspector.DescribeEncryptKeyProblem(message));
            Assert.AreEqual("Key đang dùng để mã hóa không phải key PGP hợp lệ.", PgpKeyInspector.DescribeEncryptKeyProblem(Encoding.UTF8.GetBytes("not a key")));
        }

        [TestMethod]
        public async Task DescribeExportKeyProblem_RequiresTheSelectedKeyType()
        {
            Assert.IsNull(PgpKeyInspector.DescribeExportKeyProblem(first.PublicKey, false));
            Assert.IsNull(PgpKeyInspector.DescribeExportKeyProblem(first.PrivateKey, true));
            Assert.AreEqual("Chuỗi key là Private Key nhưng loại key đang chọn là Public Key.", PgpKeyInspector.DescribeExportKeyProblem(first.PrivateKey, false));
            Assert.AreEqual("Chuỗi key là Public Key nhưng loại key đang chọn là Private Key.", PgpKeyInspector.DescribeExportKeyProblem(first.PublicKey, true));
            Assert.AreEqual("Chuỗi key không phải key PGP hợp lệ.", PgpKeyInspector.DescribeExportKeyProblem(Encoding.UTF8.GetBytes("not a key"), false));
            Assert.AreEqual("Chuỗi key không phải key PGP hợp lệ.", PgpKeyInspector.DescribeExportKeyProblem(await Encrypt(first.PublicKey, true), true));
        }

        [TestMethod]
        public void ConfigKeyPair_OfOnePair_HasNoProblem()
        {
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(first.PublicKey, first.PrivateKey));
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(second.PublicKey, second.PrivateKey));
        }

        [TestMethod]
        public void ConfigKeyPair_OfTwoPairs_NamesBothKeysAndTheirCreationDates()
        {
            var text = PgpKeyInspector.DescribeConfigKeyPairProblem(first.PublicKey, second.PrivateKey);
            var publicKey = PgpKeyInspector.FormatKeyId(PgpKeyInspector.GetSecretKeyIds(first.PrivateKey)[0]);
            var privateKey = PgpKeyInspector.FormatKeyId(PgpKeyInspector.GetSecretKeyIds(second.PrivateKey)[0]);
            var today = DateTime.Now.ToString("dd/MM/yyyy", System.Globalization.CultureInfo.InvariantCulture);
            Assert.AreEqual(
                "Public Key (key " + publicKey + ", tạo ngày " + today + ") và Private Key (key " + privateKey + ", tạo ngày " + today + ") của cấu hình này không cùng một cặp: file mã hóa bằng Public Key này không giải mã được bằng Private Key này. Cần lưu lại đúng cặp key vào cấu hình.",
                text);
        }

        [TestMethod]
        public void ConfigKeyPair_IsNotCheckedWhenTheDataIsNotAPublicKeyAndAPrivateKey()
        {
            var junk = Encoding.UTF8.GetBytes("not a key");
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(first.PrivateKey, second.PublicKey));
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(first.PublicKey, second.PublicKey));
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(junk, second.PrivateKey));
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(first.PublicKey, junk));
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(new byte[0], second.PrivateKey));
            Assert.IsNull(PgpKeyInspector.DescribeConfigKeyPairProblem(null, null));
        }

        [TestMethod]
        public void FormatKeyId_IsSixteenUpperCaseHexDigits()
        {
            Assert.AreEqual("1297B8EBDE0FFF65", PgpKeyInspector.FormatKeyId(0x1297B8EBDE0FFF65L));
            Assert.AreEqual("0000000000000001", PgpKeyInspector.FormatKeyId(1L));
            Assert.AreEqual("FFFFFFFFFFFFFFFF", PgpKeyInspector.FormatKeyId(-1L));
        }
    }
}
