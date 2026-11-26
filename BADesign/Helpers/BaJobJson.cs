using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace BADesign.Helpers
{
    /// <summary>Đọc Payload của job để ghi lại sau khi sửa một phần: ngày giờ và số thập phân giữ nguyên như chữ đã lưu.</summary>
    internal static class BaJobJson
    {
        private static readonly char[] Edges = { ' ', '\t', '\r', '\n', (char)0xFEFF };

        /// <summary>Trả null khi Payload trống hoặc không phải JSON.</summary>
        public static JToken Load(string payloadJson)
        {
            var text = (payloadJson ?? "").Trim(Edges);
            if (text.Length == 0) return null;
            try
            {
                using (var reader = new JsonTextReader(new StringReader(text)))
                {
                    reader.DateParseHandling = DateParseHandling.None;
                    reader.FloatParseHandling = FloatParseHandling.Decimal;
                    return JToken.Load(reader);
                }
            }
            catch (JsonException)
            {
                return null;
            }
        }
    }
}
