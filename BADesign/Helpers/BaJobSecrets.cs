using System;
using BADesign.Helpers.Security;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers
{
    /// <summary>
    /// Bí mật nằm trong Payload của job Trợ lý HR: chuỗi kết nối tới database HRM và mật khẩu người dùng gõ (mật khẩu mới của user, mật khẩu mail server).
    /// Ở gốc: connectionString, password. Trong từng phần tử của connectionStrings: ConnectionString.
    /// Chỉ đúng các khóa này đổi dạng; phần còn lại của Payload giữ dạng đọc được cho giao diện và cho các câu SQL lọc theo nội dung.
    /// </summary>
    public static class BaJobSecrets
    {
        private const string ListKey = "connectionStrings";
        private const string ListItemKey = "ConnectionString";
        private static readonly string[] RootKeys = { "connectionString", "password" };

        /// <summary>Payload với các bí mật ở dạng mong muốn (đã mã hóa hoặc dạng thường). Payload không phải một object JSON, hoặc không có gì để đổi, thì trả nguyên chuỗi đã nhận.</summary>
        public static string Recode(string payloadJson, bool protect)
        {
            var payload = BaJobJson.Load(payloadJson) as JObject;
            if (payload == null || !RecodeSecrets(payload, protect)) return payloadJson;
            return payload.ToString(Formatting.None);
        }

        /// <summary>Payload cho bộ chạy job: các bí mật đã được giải mã.</summary>
        public static JObject Read(string payloadJson)
        {
            var payload = JObject.Parse(payloadJson);
            RecodeSecrets(payload, false);
            return payload;
        }

        private static bool RecodeSecrets(JObject payload, bool protect)
        {
            var changed = false;
            foreach (var key in RootKeys)
            {
                if (RecodeValue(payload, key, protect)) changed = true;
            }
            var list = payload[ListKey] as JArray;
            if (list == null) return changed;
            foreach (var item in list)
            {
                var entry = item as JObject;
                if (entry != null && RecodeValue(entry, ListItemKey, protect)) changed = true;
            }
            return changed;
        }

        private static bool RecodeValue(JObject owner, string key, bool protect)
        {
            var value = owner[key] as JValue;
            if (value == null || value.Type != JTokenType.String) return false;
            var current = (string)value.Value;
            var wanted = BaSecret.Recode(current, protect);
            if (string.Equals(wanted, current, StringComparison.Ordinal)) return false;
            value.Value = wanted;
            return true;
        }
    }
}
