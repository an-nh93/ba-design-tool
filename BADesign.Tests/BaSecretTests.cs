using System;
using System.Text;
using BADesign.Helpers.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class BaSecretTests
    {
        private const string FakeSecret = "TEST-not-a-real-secret";

        /// <summary>
        /// FakeSecret đã mã hóa bằng một bản cài đặt thứ hai của cùng định dạng (Node, IV cố định 00..0F).
        /// Test đọc mẫu này hỏng nghĩa là khóa, salt, số vòng hoặc định dạng đã đổi: dữ liệu đã mã hóa trong database sẽ không đọc lại được.
        /// </summary>
        private const string StoredSample = "enc:v1:AAECAwQFBgcICQoLDA0ODzhklX1Z4TkcCKY9Rn58Skd0sYYDjjJg5PYyHWeMRXOiYJ/rL+J10PSWk7qs1OwR7odwyWEYs6wok8NAPRU9JBA=";

        private static string Tampered(string stored, int offsetFromEnd)
        {
            var body = Convert.FromBase64String(stored.Substring(BaSecret.Prefix.Length));
            body[body.Length - offsetFromEnd] ^= 1;
            return BaSecret.Prefix + Convert.ToBase64String(body);
        }

        [TestMethod]
        public void Protect_ThenReveal_ReturnsTheOriginal()
        {
            var values = new[]
            {
                FakeSecret,
                "a",
                "1234567890123456",
                "Mật khẩu có dấu và ký tự đặc biệt ;=\"'\\ {}",
                "  khoảng trắng hai đầu  ",
                "Server=TEST-SERVER,1433;Database=TEST_DB;User Id=test;Password=" + FakeSecret + ";",
                new string('x', 5000)
            };
            foreach (var value in values)
            {
                var stored = BaSecret.Protect(value);
                Assert.IsTrue(stored.StartsWith(BaSecret.Prefix, StringComparison.Ordinal), value);
                Assert.IsTrue(BaSecret.IsProtected(stored), value);
                Assert.AreEqual(value, BaSecret.Reveal(stored));
            }
        }

        [TestMethod]
        public void Protect_NothingToProtect_ReturnsTheInput()
        {
            Assert.IsNull(BaSecret.Protect(null));
            Assert.AreEqual("", BaSecret.Protect(""));
        }

        [TestMethod]
        public void Protect_SameValueTwice_GivesDifferentStoredValues()
        {
            var first = BaSecret.Protect(FakeSecret);
            var second = BaSecret.Protect(FakeSecret);
            Assert.AreNotEqual(first, second);
            Assert.AreEqual(FakeSecret, BaSecret.Reveal(first));
            Assert.AreEqual(FakeSecret, BaSecret.Reveal(second));
        }

        [TestMethod]
        public void Protect_StoredValue_DoesNotContainThePlainText()
        {
            var stored = BaSecret.Protect(FakeSecret);
            Assert.IsFalse(stored.Contains(FakeSecret));
            var body = Convert.FromBase64String(stored.Substring(BaSecret.Prefix.Length));
            Assert.IsFalse(Encoding.UTF8.GetString(body).Contains(FakeSecret));
        }

        [TestMethod]
        public void Protect_LongestSqlServerPassword_FitsTheWidenedColumn()
        {
            var longest = new string('ế', 128);
            Assert.AreEqual(607, BaSecret.Protect(longest).Length);
        }

        [TestMethod]
        public void Reveal_StoredSample_IsStillReadable()
        {
            Assert.IsTrue(BaSecret.IsProtected(StoredSample));
            Assert.AreEqual(FakeSecret, BaSecret.Reveal(StoredSample));
        }

        [TestMethod]
        public void Reveal_PlainValue_IsReturnedAsStored()
        {
            Assert.IsNull(BaSecret.Reveal(null));
            Assert.AreEqual("", BaSecret.Reveal(""));
            Assert.AreEqual(FakeSecret, BaSecret.Reveal(FakeSecret));
            Assert.AreEqual("enc:", BaSecret.Reveal("enc:"));
            Assert.AreEqual("ENC:V1:abcd", BaSecret.Reveal("ENC:V1:abcd"));
            Assert.IsFalse(BaSecret.IsProtected(FakeSecret));
            Assert.IsFalse(BaSecret.IsProtected(null));
        }

        [TestMethod]
        public void Reveal_ChangedCipherOrSignature_IsReturnedAsStored()
        {
            var changedSignature = Tampered(StoredSample, 1);
            var changedCipher = Tampered(StoredSample, 40);
            var changedInitialVector = BaSecret.Prefix + "B" + StoredSample.Substring(BaSecret.Prefix.Length + 1);
            foreach (var stored in new[] { changedSignature, changedCipher, changedInitialVector })
            {
                Assert.IsFalse(BaSecret.IsProtected(stored), stored);
                Assert.AreEqual(stored, BaSecret.Reveal(stored));
            }
        }

        [TestMethod]
        public void Reveal_PrefixWithoutAValidBody_IsReturnedAsStored()
        {
            var values = new[]
            {
                BaSecret.Prefix,
                BaSecret.Prefix + "not base64 !!",
                BaSecret.Prefix + "AAAA",
                BaSecret.Prefix + Convert.ToBase64String(new byte[48]),
                BaSecret.Prefix + Convert.ToBase64String(new byte[65]),
                BaSecret.Prefix + Convert.ToBase64String(new byte[64])
            };
            foreach (var stored in values)
            {
                Assert.IsFalse(BaSecret.IsProtected(stored), stored);
                Assert.AreEqual(stored, BaSecret.Reveal(stored));
            }
        }

        [TestMethod]
        public void Recode_ToProtected_ProtectsPlainAndKeepsProtected()
        {
            var stored = BaSecret.Recode(FakeSecret, true);
            Assert.IsTrue(BaSecret.IsProtected(stored));
            Assert.AreEqual(FakeSecret, BaSecret.Reveal(stored));
            Assert.AreEqual(stored, BaSecret.Recode(stored, true));
            Assert.AreEqual(StoredSample, BaSecret.Recode(StoredSample, true));
        }

        [TestMethod]
        public void Recode_ToPlain_RevealsProtectedAndKeepsPlain()
        {
            Assert.AreEqual(FakeSecret, BaSecret.Recode(StoredSample, false));
            Assert.AreEqual(FakeSecret, BaSecret.Recode(FakeSecret, false));
        }

        [TestMethod]
        public void Recode_NothingStored_StaysAsItIs()
        {
            Assert.IsNull(BaSecret.Recode(null, true));
            Assert.IsNull(BaSecret.Recode(null, false));
            Assert.AreEqual("", BaSecret.Recode("", true));
            Assert.AreEqual("", BaSecret.Recode("", false));
        }

        [TestMethod]
        public void Recode_PrefixedValueThatCannotBeRead_IsNeverWrappedAgain()
        {
            var unreadable = Tampered(StoredSample, 1);
            Assert.AreEqual(unreadable, BaSecret.Recode(unreadable, true));
            Assert.AreEqual(unreadable, BaSecret.Recode(unreadable, false));
        }
    }
}
