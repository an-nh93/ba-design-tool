using System.Globalization;
using System.IO;
using System.Text;

namespace BADesign.Helpers
{
    public static class UiDesignScratch
    {
        public const string EmptyDesign = "[]";

        public static string DefaultFolder
        {
            get { return System.Web.HttpContext.Current.Server.MapPath("~/App_Data/BuilderScratch"); }
        }

        public static string FilePath(string folder, int userId)
        {
            return Path.Combine(folder, "design-" + userId.ToString(CultureInfo.InvariantCulture) + ".json");
        }

        public static void Write(string folder, int userId, string json)
        {
            Directory.CreateDirectory(folder);
            File.WriteAllText(FilePath(folder, userId), json ?? EmptyDesign, new UTF8Encoding(false));
        }

        public static string Read(string folder, int userId)
        {
            var path = FilePath(folder, userId);
            return File.Exists(path) ? File.ReadAllText(path, Encoding.UTF8) : EmptyDesign;
        }
    }
}
