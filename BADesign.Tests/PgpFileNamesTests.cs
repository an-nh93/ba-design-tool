using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using BADesign.Helpers.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using PgpCore;

namespace BADesign.Tests
{
    [TestClass]
    public class PgpFileNamesTests
    {
        private const string Passphrase = "test-passphrase";

        [TestMethod]
        public void WithoutEncryptedExtension_KeepsTheNameAndDropsOnlyThePgpExtension()
        {
            Assert.AreEqual("APAC-VNM_QAA_QAA_Outbound_20261118172157.xls", PgpFileNames.WithoutEncryptedExtension("APAC-VNM_QAA_QAA_Outbound_20261118172157.xls.pgp"));
            Assert.AreEqual("OT.xlsx", PgpFileNames.WithoutEncryptedExtension("OT.xlsx.pgp"));
            Assert.AreEqual("OT.xlsx", PgpFileNames.WithoutEncryptedExtension("OT.xlsx.asc"));
            Assert.AreEqual("OT.xlsx", PgpFileNames.WithoutEncryptedExtension("OT.xlsx.gpg"));
            Assert.AreEqual("OT.xlsx", PgpFileNames.WithoutEncryptedExtension("OT.xlsx.PGP"));
            Assert.AreEqual("OT (1).xlsx", PgpFileNames.WithoutEncryptedExtension(" OT (1).xlsx.pgp "));
            Assert.AreEqual("report", PgpFileNames.WithoutEncryptedExtension("report.pgp"));
            Assert.AreEqual("a.pgp", PgpFileNames.WithoutEncryptedExtension("a.pgp.pgp"));
        }

        [TestMethod]
        public void WithoutEncryptedExtension_GivesNullWhenTheNameHasNoPgpExtension()
        {
            Assert.IsNull(PgpFileNames.WithoutEncryptedExtension("OT.xlsx"));
            Assert.IsNull(PgpFileNames.WithoutEncryptedExtension("filepgp"));
            Assert.IsNull(PgpFileNames.WithoutEncryptedExtension(".pgp"));
            Assert.IsNull(PgpFileNames.WithoutEncryptedExtension("   "));
            Assert.IsNull(PgpFileNames.WithoutEncryptedExtension(""));
            Assert.IsNull(PgpFileNames.WithoutEncryptedExtension(null));
        }

        [TestMethod]
        public async Task NameStoredInsideTheFile_IsTheNameGivenWhenEncrypting_NotTheFileName()
        {
            var folder = Path.Combine(Path.GetTempPath(), "pgp-names-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(folder);
            try
            {
                var publicFile = new FileInfo(Path.Combine(folder, "public.asc"));
                var privateFile = new FileInfo(Path.Combine(folder, "private.asc"));
                using (var pgp = new PGP())
                {
                    pgp.GenerateKey(publicFile, privateFile, "test@example.local", Passphrase);
                }

                byte[] message;
                using (var input = new MemoryStream(Encoding.UTF8.GetBytes("nội dung thử")))
                using (var keyStream = File.OpenRead(publicFile.FullName))
                using (var output = new MemoryStream())
                {
                    using (var pgp = new PGP(new EncryptionKeys(keyStream)))
                    {
                        await pgp.EncryptAsync(input, output, false, true, "a7e847dd-e02b-4bd8-8f8a-ef14f1bc6eec.txt");
                    }
                    message = output.ToArray();
                }

                using (var input = new MemoryStream(message))
                using (var keyStream = File.OpenRead(privateFile.FullName))
                using (var pgp = new PGP(new EncryptionKeys(keyStream, Passphrase)))
                {
                    var inspected = await pgp.InspectAsync(input);
                    Assert.AreEqual("a7e847dd-e02b-4bd8-8f8a-ef14f1bc6eec.txt", inspected.FileName);
                }
                Assert.AreEqual("APAC-VNM_QAA_QAA_Outbound_20261118172157.xls", PgpFileNames.WithoutEncryptedExtension("APAC-VNM_QAA_QAA_Outbound_20261118172157.xls.pgp"));
            }
            finally
            {
                Directory.Delete(folder, true);
            }
        }
    }
}
