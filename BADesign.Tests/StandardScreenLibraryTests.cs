using System;
using System.IO;
using System.Linq;
using System.Text;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class StandardScreenLibraryTests
    {
        private string _root;
        private string _folder;

        [TestInitialize]
        public void SetUp()
        {
            _root = Path.Combine(Path.GetTempPath(), "ba-std-" + Guid.NewGuid().ToString("N"));
            _folder = Path.Combine(_root, "BuilderTemplates");
            Directory.CreateDirectory(_folder);
        }

        [TestCleanup]
        public void TearDown()
        {
            if (Directory.Exists(_root)) Directory.Delete(_root, true);
        }

        private void WriteFile(string name, string content)
        {
            File.WriteAllText(Path.Combine(_folder, name), content, new UTF8Encoding(false));
        }

        private void WriteIndex(string json)
        {
            WriteFile("index.json", json);
        }

        [TestMethod]
        public void List_ReturnsEntriesWithExistingFiles()
        {
            WriteFile("core-policy.json", "{\"kind\":\"ba-screen\"}");
            WriteFile("ess-leave.json", "{\"kind\":\"ba-screen\"}");
            WriteIndex("[{\"key\":\"core-policy\",\"name\":\"Time-Sheet Policy\",\"ui\":\"core\",\"group\":\"Setup\",\"description\":\"List\",\"thumb\":\"core-policy.png\",\"controls\":12,\"file\":\"core-policy.json\"},"
                + "{\"key\":\"ess-leave\",\"name\":\"Request Leave\",\"ui\":\"ess\",\"file\":\"ess-leave.json\"}]");

            var list = StandardScreenLibrary.List(_folder);

            Assert.AreEqual(2, list.Count);
            Assert.AreEqual("core-policy", list[0].Key);
            Assert.AreEqual("Time-Sheet Policy", list[0].Name);
            Assert.AreEqual("core", list[0].Ui);
            Assert.AreEqual("Setup", list[0].Group);
            Assert.AreEqual("core-policy.png", list[0].Thumb);
            Assert.AreEqual(12, list[0].Controls);
            Assert.AreEqual("", list[1].Thumb);
            Assert.AreEqual("", list[1].Description);
        }

        [TestMethod]
        public void List_IsEmptyWhenFolderOrIndexIsMissingOrBroken()
        {
            Assert.AreEqual(0, StandardScreenLibrary.List(null).Count);
            Assert.AreEqual(0, StandardScreenLibrary.List(Path.Combine(_root, "missing")).Count);
            Assert.AreEqual(0, StandardScreenLibrary.List(_folder).Count);
            WriteIndex("{ not json");
            Assert.AreEqual(0, StandardScreenLibrary.List(_folder).Count);
            WriteIndex("null");
            Assert.AreEqual(0, StandardScreenLibrary.List(_folder).Count);
        }

        [TestMethod]
        public void List_SkipsInvalidEntries()
        {
            WriteFile("good.json", "{}");
            File.WriteAllText(Path.Combine(_root, "outside.json"), "{}");
            WriteIndex("[null,"
                + "{\"key\":\"Bad Key\",\"ui\":\"core\",\"file\":\"good.json\"},"
                + "{\"key\":\"no-ui\",\"ui\":\"mobile\",\"file\":\"good.json\"},"
                + "{\"key\":\"no-file\",\"ui\":\"core\",\"file\":\"missing.json\"},"
                + "{\"key\":\"escape\",\"ui\":\"core\",\"file\":\"..\\\\outside.json\"},"
                + "{\"key\":\"wrong-ext\",\"ui\":\"core\",\"file\":\"good.txt\"},"
                + "{\"key\":\"good\",\"ui\":\"core\",\"file\":\"good.json\",\"thumb\":\"../x.png\",\"controls\":-4},"
                + "{\"key\":\"good\",\"ui\":\"ess\",\"file\":\"good.json\"}]");

            var list = StandardScreenLibrary.List(_folder);

            Assert.AreEqual(1, list.Count);
            Assert.AreEqual("good", list[0].Key);
            Assert.AreEqual("core", list[0].Ui);
            Assert.AreEqual("good", list[0].Name);
            Assert.AreEqual("", list[0].Thumb);
            Assert.AreEqual(0, list[0].Controls);
        }

        [TestMethod]
        public void Read_ReturnsFileContentForKnownKey()
        {
            WriteFile("core-policy.json", "{\"kind\":\"ba-screen\",\"title\":\"Chính sách\"}");
            WriteIndex("[{\"key\":\"core-policy\",\"ui\":\"core\",\"file\":\"core-policy.json\"}]");

            var json = StandardScreenLibrary.Read(_folder, "core-policy");

            Assert.AreEqual("{\"kind\":\"ba-screen\",\"title\":\"Chính sách\"}", json);
        }

        [TestMethod]
        public void Read_ReturnsNullForUnknownOrUnsafeKey()
        {
            WriteFile("core-policy.json", "{}");
            File.WriteAllText(Path.Combine(_root, "secret.json"), "{\"secret\":true}");
            WriteIndex("[{\"key\":\"core-policy\",\"ui\":\"core\",\"file\":\"core-policy.json\"}]");

            Assert.IsNull(StandardScreenLibrary.Read(_folder, null));
            Assert.IsNull(StandardScreenLibrary.Read(_folder, ""));
            Assert.IsNull(StandardScreenLibrary.Read(_folder, "unknown"));
            Assert.IsNull(StandardScreenLibrary.Read(_folder, "..\\secret"));
            Assert.IsNull(StandardScreenLibrary.Read(_folder, "../secret"));
            Assert.IsNull(StandardScreenLibrary.Read(_folder, "core-policy.json"));
            Assert.IsNull(StandardScreenLibrary.Read(_folder, "CORE-POLICY"));
            Assert.IsNull(StandardScreenLibrary.Read(_folder, "index"));
        }

        [TestMethod]
        public void Read_IgnoresIndexEntryPointingOutsideTheFolder()
        {
            File.WriteAllText(Path.Combine(_root, "secret.json"), "{\"secret\":true}");
            WriteIndex("[{\"key\":\"leak\",\"ui\":\"core\",\"file\":\"../secret.json\"}]");

            Assert.IsNull(StandardScreenLibrary.Read(_folder, "leak"));
            Assert.AreEqual(0, StandardScreenLibrary.List(_folder).Count);
        }

        [TestMethod]
        public void OversizedFilesAreIgnored()
        {
            WriteFile("big.json", new string('x', StandardScreenLibrary.MaxFileBytes + 1));
            WriteFile("small.json", "{}");
            WriteIndex("[{\"key\":\"big\",\"ui\":\"core\",\"file\":\"big.json\"},{\"key\":\"small\",\"ui\":\"core\",\"file\":\"small.json\"}]");

            var list = StandardScreenLibrary.List(_folder);

            Assert.AreEqual(1, list.Count);
            Assert.AreEqual("small", list.Single().Key);
            Assert.IsNull(StandardScreenLibrary.Read(_folder, "big"));
        }

        [TestMethod]
        public void List_PassesOutlineOnlyWhenItIsPlainShapeData()
        {
            WriteFile("a.json", "{}");
            WriteFile("b.json", "{}");
            WriteFile("c.json", "{}");
            WriteIndex("[{\"key\":\"a\",\"ui\":\"core\",\"file\":\"a.json\",\"width\":640,\"height\":-5,\"outline\":\"[[\\\"f\\\",1,2,30,-4]]\"},"
                + "{\"key\":\"b\",\"ui\":\"core\",\"file\":\"b.json\",\"width\":99999999,\"outline\":\"<svg onload=alert(1)>\"},"
                + "{\"key\":\"c\",\"ui\":\"core\",\"file\":\"c.json\",\"outline\":\"" + new string('1', StandardScreenLibrary.MaxOutlineLength + 1) + "\"}]");

            var list = StandardScreenLibrary.List(_folder);

            Assert.AreEqual("[[\"f\",1,2,30,-4]]", list[0].Outline);
            Assert.AreEqual(640, list[0].Width);
            Assert.AreEqual(0, list[0].Height);
            Assert.AreEqual("", list[1].Outline);
            Assert.AreEqual(20000, list[1].Width);
            Assert.AreEqual("", list[2].Outline);
        }

        [TestMethod]
        public void LongTextIsClipped()
        {
            WriteFile("a.json", "{}");
            WriteIndex("[{\"key\":\"a\",\"ui\":\"core\",\"file\":\"a.json\",\"name\":\"" + new string('n', 1000) + "\"}]");

            var list = StandardScreenLibrary.List(_folder);

            Assert.AreEqual(300, list[0].Name.Length);
        }
    }
}
