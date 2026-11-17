using System;
using BADesign.Helpers;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace BADesign.Tests
{
    [TestClass]
    public class UiDesignCatalogTests
    {
        private const long MaxSafeJavaScriptInteger = 9007199254740991L;

        private static DesignListItem Item(string thumbnailPath, int? projectId, string projectName, int ownerUserId, int currentUserId)
        {
            return UiDesignCatalog.CreateItem(7, "Màn hình nghỉ phép", "page", true, new DateTime(2026, 1, 21, 21, 15, 43),
                thumbnailPath, projectId, projectName, "owner", ownerUserId, currentUserId);
        }

        [TestMethod]
        public void SafeThumbnail_AcceptsSavedThumbnail()
        {
            Assert.AreEqual("/Content/design-thumbs/design-1013.png", UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/design-1013.png"));
        }

        [TestMethod]
        public void SafeThumbnail_TrimsSpacesAndAcceptsOtherImageTypes()
        {
            Assert.AreEqual("/Content/design-thumbs/a_b-1.JPG", UiDesignCatalog.SafeThumbnail("  /Content/design-thumbs/a_b-1.JPG "));
            Assert.AreEqual("/Content/design-thumbs/x.jpeg", UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/x.jpeg"));
        }

        [TestMethod]
        public void SafeThumbnail_RejectsEmptyValues()
        {
            Assert.IsNull(UiDesignCatalog.SafeThumbnail(null));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail(""));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("   "));
        }

        [TestMethod]
        public void SafeThumbnail_RejectsPathsOutsideTheThumbnailFolder()
        {
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("/Content/images/logo.png"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/../../Web.config"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/sub/design-1.png"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/a..png"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("Content/design-thumbs/design-1.png"));
        }

        [TestMethod]
        public void SafeThumbnail_RejectsUrlsScriptsAndMarkup()
        {
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("http://example.com/Content/design-thumbs/design-1.png"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("//example.com/Content/design-thumbs/design-1.png"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("javascript:alert(1)"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/design-1.png?x=1"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/a\" onerror=\"x.png"));
            Assert.IsNull(UiDesignCatalog.SafeThumbnail("/Content/design-thumbs/design-1.svg"));
        }

        [TestMethod]
        public void FormatUpdated_UsesDayMonthYearAndMinutes()
        {
            Assert.AreEqual("21/01/2026 21:15", UiDesignCatalog.FormatUpdated(new DateTime(2026, 1, 21, 21, 15, 43)));
            Assert.AreEqual("05/12/2025 08:03", UiDesignCatalog.FormatUpdated(new DateTime(2025, 12, 5, 8, 3, 0)));
        }

        [TestMethod]
        public void UpdatedOrder_GrowsWithTimeAndFitsAJavaScriptNumber()
        {
            var earlier = UiDesignCatalog.UpdatedOrder(new DateTime(2026, 1, 21, 21, 15, 43, 100));
            var later = UiDesignCatalog.UpdatedOrder(new DateTime(2026, 1, 21, 21, 15, 43, 101));
            Assert.IsTrue(later > earlier);
            Assert.IsTrue(UiDesignCatalog.UpdatedOrder(DateTime.MaxValue) < MaxSafeJavaScriptInteger);
        }

        [TestMethod]
        public void CreateItem_CopiesTheValuesShownOnTheCard()
        {
            var item = Item("/Content/design-thumbs/design-7.png", 3, "Dự án lương", 5, 5);
            Assert.AreEqual(7, item.Id);
            Assert.AreEqual("Màn hình nghỉ phép", item.Name);
            Assert.AreEqual("page", item.Type);
            Assert.IsTrue(item.IsPublic);
            Assert.AreEqual("21/01/2026 21:15", item.Updated);
            Assert.AreEqual("/Content/design-thumbs/design-7.png", item.Thumb);
            Assert.AreEqual(3, item.ProjectId);
            Assert.AreEqual("Dự án lương", item.ProjectName);
            Assert.AreEqual("owner", item.Owner);
        }

        [TestMethod]
        public void CreateItem_MarksOnlyTheCurrentUsersDesignsAsMine()
        {
            Assert.IsTrue(Item(null, null, null, 5, 5).IsMine);
            Assert.IsFalse(Item(null, null, null, 5, 6).IsMine);
        }

        [TestMethod]
        public void CreateItem_WithoutProject_HasNoProjectName()
        {
            var item = Item(null, null, "Tên còn sót", 5, 5);
            Assert.IsNull(item.ProjectId);
            Assert.IsNull(item.ProjectName);
        }

        [TestMethod]
        public void CreateItem_DropsAnUnsafeThumbnail()
        {
            Assert.IsNull(Item("/Content/design-thumbs/../secret.png", 3, "A", 5, 5).Thumb);
            Assert.IsNull(Item("", 3, "A", 5, 5).Thumb);
        }

        [TestMethod]
        public void CreateItem_ReplacesMissingTextWithEmptyStrings()
        {
            var item = UiDesignCatalog.CreateItem(1, null, null, false, new DateTime(2026, 1, 1), null, 2, null, null, 1, 1);
            Assert.AreEqual("", item.Name);
            Assert.AreEqual("", item.Type);
            Assert.AreEqual("", item.Owner);
            Assert.AreEqual("", item.ProjectName);
        }
    }
}
