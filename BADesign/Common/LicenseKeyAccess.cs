using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;

namespace BADesign
{
    /// <summary>
    /// Giới hạn tính năng License Key chỉ cho một số user cụ thể — KHÔNG theo Role/Permission và
    /// KHÔNG phụ thuộc SuperAdmin — vì tính năng nhạy cảm, không muốn đồng nghiệp khác thấy.
    ///
    /// Danh sách mặc định: romls93, an.nh.
    /// Có thể chỉnh không cần build lại: thêm appSetting "LicenseKeyAllowedUsers" trong Web.config,
    /// giá trị là các username cách nhau bởi dấu phẩy, ví dụ:
    ///   &lt;add key="LicenseKeyAllowedUsers" value="romls93,an.nh" /&gt;
    /// Khi appSetting có giá trị thì nó thay thế hoàn toàn danh sách mặc định.
    /// So khớp theo UserName đăng nhập (Session["UiUserName"]), không phân biệt hoa thường.
    /// </summary>
    public static class LicenseKeyAccess
    {
        private static readonly string[] DefaultAllowed = { "romls93", "an.nh" };

        public static bool IsAllowed()
        {
            var ctx = HttpContext.Current;
            var userName = ctx?.Session?["UiUserName"] as string;
            if (string.IsNullOrWhiteSpace(userName)) return false;
            userName = userName.Trim();
            foreach (var u in GetAllowedUsers())
            {
                if (string.Equals(u, userName, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        private static IEnumerable<string> GetAllowedUsers()
        {
            var cfg = ConfigurationManager.AppSettings["LicenseKeyAllowedUsers"];
            if (!string.IsNullOrWhiteSpace(cfg))
                return cfg.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0);
            return DefaultAllowed;
        }
    }
}
