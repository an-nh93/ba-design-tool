using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers
{
    /// <summary>Phần của một job mà trình duyệt được nhận: ai được xem job, và những khóa nào của Payload được gửi đi.</summary>
    public static class BaJobView
    {
        /// <summary>
        /// Khóa của Payload mà giao diện đọc (chuông, Function Queue, Nhật ký thao tác, lớp phủ của Trợ lý HR).
        /// Payload còn là đầu vào của bộ chạy job (chuỗi kết nối, mật khẩu, tùy chọn chạy): khóa không có ở đây không rời server.
        /// </summary>
        private static readonly HashSet<string> DisplayKeys = new HashSet<string>(StringComparer.Ordinal)
        {
            "withShrinkLog", "shrinkFinalStatus", "shrinkFinalMessage",
            "sanitizeReport", "sanitizeStep",
            "email", "phone", "databaseNames", "databaseCount",
            "localId", "name",
            "updPersonal", "updBusiness", "updPayslip", "updM1", "updM2", "updBasic",
            "personalEmail", "businessEmail", "m1", "m2", "basicSalary"
        };

        /// <summary>
        /// Người tạo job xem được job của mình. Người thấy mọi server (accessibleServerIds = null: Super Admin hoặc quyền quản lý server) xem được mọi job.
        /// Người còn lại chỉ xem được job Restore / Backup trên server mình được cấp.
        /// </summary>
        public static bool CanView(string jobType, int? serverId, int? startedByUserId, int userId, ICollection<int> accessibleServerIds)
        {
            if (startedByUserId == userId) return true;
            if (accessibleServerIds == null) return true;
            return IsServerJob(jobType) && serverId.HasValue && accessibleServerIds.Contains(serverId.Value);
        }

        /// <summary>Payload gửi về trình duyệt: chỉ còn các khóa hiển thị. Payload không đọc được thì không gửi gì.</summary>
        public static string Payload(string payloadJson)
        {
            var shown = Shown(BaJobJson.Load(payloadJson));
            return shown == null ? null : shown.ToString(Formatting.None);
        }

        private static bool IsServerJob(string jobType)
        {
            return string.Equals(jobType, "Restore", StringComparison.OrdinalIgnoreCase)
                || string.Equals(jobType, "Backup", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Payload là một object, hoặc một mảng object (danh sách nhân viên của job xóa nhân viên).</summary>
        private static JToken Shown(JToken root)
        {
            var single = root as JObject;
            if (single != null) return ShownObject(single);
            var rows = root as JArray;
            if (rows == null) return null;
            var shownRows = new JArray();
            foreach (var row in rows)
            {
                var rowObject = row as JObject;
                if (rowObject != null) shownRows.Add(ShownObject(rowObject));
            }
            return shownRows;
        }

        private static JObject ShownObject(JObject source)
        {
            var shown = new JObject();
            foreach (var property in source.Properties())
            {
                if (DisplayKeys.Contains(property.Name)) shown[property.Name] = property.Value;
            }
            return shown;
        }
    }
}
