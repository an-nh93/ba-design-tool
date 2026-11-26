using System;
using System.IO;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class UiDesignScratchTests
    {
        private string _root;
        private string _folder;

        [TestInitialize]
        public void SetUp()
        {
            _root = Path.Combine(Path.GetTempPath(), "ba-scratch-" + Guid.NewGuid().ToString("N"));
            _folder = Path.Combine(_root, "BuilderScratch");
        }

        [TestCleanup]
        public void TearDown()
        {
            if (Directory.Exists(_root)) Directory.Delete(_root, true);
        }

        [TestMethod]
        public void Read_WithoutSavedDesign_ReturnsEmptyDesign()
        {
            Assert.AreEqual("[]", UiDesignScratch.Read(_folder, 7));
            Assert.IsFalse(Directory.Exists(_folder));
        }

        [TestMethod]
        public void Write_CreatesTheFolderAndKeepsTheText()
        {
            var json = "[{\"id\":\"field_1\",\"label\":\"Họ và tên nhân viên\"}]";

            UiDesignScratch.Write(_folder, 7, json);

            Assert.AreEqual(json, UiDesignScratch.Read(_folder, 7));
        }

        [TestMethod]
        public void Write_KeepsEachUsersDesignApart()
        {
            UiDesignScratch.Write(_folder, 7, "[{\"id\":\"a\"}]");
            UiDesignScratch.Write(_folder, 8, "[{\"id\":\"b\"}]");

            Assert.AreEqual("[{\"id\":\"a\"}]", UiDesignScratch.Read(_folder, 7));
            Assert.AreEqual("[{\"id\":\"b\"}]", UiDesignScratch.Read(_folder, 8));
            Assert.AreEqual("[]", UiDesignScratch.Read(_folder, 9));
        }

        [TestMethod]
        public void Write_ReplacesTheUsersEarlierDesign()
        {
            UiDesignScratch.Write(_folder, 7, "[{\"id\":\"old\"},{\"id\":\"older\"}]");
            UiDesignScratch.Write(_folder, 7, "[{\"id\":\"new\"}]");

            Assert.AreEqual("[{\"id\":\"new\"}]", UiDesignScratch.Read(_folder, 7));
        }

        [TestMethod]
        public void Write_Null_SavesEmptyDesign()
        {
            UiDesignScratch.Write(_folder, 7, "[{\"id\":\"a\"}]");
            UiDesignScratch.Write(_folder, 7, null);

            Assert.AreEqual("[]", UiDesignScratch.Read(_folder, 7));
        }

        [TestMethod]
        public void Write_SavesWithoutByteOrderMark()
        {
            UiDesignScratch.Write(_folder, 7, "[]");

            var bytes = File.ReadAllBytes(UiDesignScratch.FilePath(_folder, 7));
            Assert.AreEqual(2, bytes.Length);
        }

        [TestMethod]
        public void FilePath_IsOneFilePerUserInsideTheFolder()
        {
            Assert.AreEqual(Path.Combine(_folder, "design-7.json"), UiDesignScratch.FilePath(_folder, 7));
            Assert.AreEqual(Path.Combine(_folder, "design--1.json"), UiDesignScratch.FilePath(_folder, -1));
            Assert.AreEqual(_folder, Path.GetDirectoryName(UiDesignScratch.FilePath(_folder, int.MaxValue)));
        }
    }
}
