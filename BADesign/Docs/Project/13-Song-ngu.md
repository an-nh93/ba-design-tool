# Song ngữ Việt - Anh

Code giữ nguyên tiếng Việt. Tiếng Anh nằm trong một file từ điển, khóa là chính câu tiếng Việt. Thiếu bản dịch thì hiện tiếng Việt, không lỗi.

## Thành phần

| File | Vai trò |
|---|---|
| `Scripts/ba-i18n.js` | Engine chạy trên trình duyệt: đọc cookie `baLang`, nạp từ điển, dịch chữ trên trang, vẽ nút chọn ngôn ngữ |
| `Scripts/i18n/ba-i18n.en.js` | Từ điển tiếng Anh, chia theo nhóm màn hình bằng `BaI18n.add("tên nhóm", { ... })` |
| `Common/BaI18n.cs` | Bản dịch phía server, đọc cùng file từ điển: web đọc ở `Scripts/i18n`, Worker đọc ở thư mục `i18n` cạnh file chạy (build của `BADesign.Worker` tự chép sang) |
| `Tools/i18n/i18n-check.js` | Công cụ rà chuỗi tiếng Việt trong source chưa có bản dịch |

## Trình duyệt

Mỗi trang nạp một dòng `<script src="../Scripts/ba-i18n.js?v=...">` trong `<head>`. Chế độ tiếng Việt: engine không làm gì, không tải từ điển. Chế độ khác: engine tải từ điển rồi theo dõi DOM (MutationObserver), thay chữ ở text, `title`, `placeholder`, `aria-label`, `alt`, nút `input`, và hộp `alert`/`confirm`. Thông báo server trả về bằng tiếng Việt cũng được dịch khi hiện lên, nên code C# của trang không phải sửa.

Nút chọn ngôn ngữ là mọi phần tử có `data-ba-lang-switch` (đã đặt ở top bar và trang đăng nhập). Đổi ngôn ngữ thì ghi cookie 1 năm và tải lại trang.

## Viết khóa trong từ điển

- Khóa là câu tiếng Việt đã bỏ ký tự trang trí ở hai đầu (emoji, dấu `:`, `...`, ngoặc). `"Tìm kiếm"` phủ luôn `🔍 Tìm kiếm`, `Tìm kiếm:`, `Tìm kiếm...`.
- Chỗ trống: `"Đã chọn {0} file": "{0} files selected"`. Chỗ trống chỉ nhận số: `{0#}`.
- Số ít, số nhiều: `"{0} [0:row|rows]"`.
- Cùng chữ khác nghĩa: thêm `data-i18n-ctx="status"` vào phần tử và khóa `"@status:Đóng": "Closed"`.
- Câu có thẻ xen giữa cần đảo trật tự từ: thêm `data-i18n-html` vào phần tử, khóa là toàn bộ HTML bên trong, giá trị là HTML tiếng Anh.
- Thông báo nhiều dòng được dịch từng dòng; câu ghép được dịch từng câu.
- Mỗi khối `BaI18n.add` phải là JSON hợp lệ (nháy kép, không dấu phẩy thừa) vì phía server đọc bằng JSON.

## Vùng dữ liệu

Phần tử chứa dữ liệu (tên nhân viên, nội dung góp ý, bài viết) gắn `translate="no"`. Engine bỏ qua cả cây con, nên vừa không dịch nhầm vừa không tốn thời gian. `script`, `style`, `textarea`, `code`, `pre` và vùng `contenteditable` luôn được bỏ qua.

## Phía server

`BaI18n.CurrentLanguage` đọc cookie của request. `BaI18n.Translate(lang, text)` dịch từng dòng. Chỉ thư gửi cho chính người thao tác được dịch: OTP đăng ký, quên mật khẩu, báo backup/restore xong. Job nền không có request nên ngôn ngữ được ghi vào Payload của job (khóa `lang`) lúc tạo job. Thư và Telegram báo cho quản trị giữ tiếng Việt.

Với thư có mật khẩu hoặc OTP: dịch mẫu thư trước rồi mới `string.Format`, để giá trị bí mật không đi qua bộ dịch.

## Việc thường gặp

- Thêm hoặc sửa chữ trên màn hình: sửa trong code như cũ, thêm khóa vào từ điển, chạy `node Tools/i18n/i18n-check.js --list`, tăng `?v=` của `ba-i18n.js` ở các trang.
- Thêm màn hình: nạp `ba-i18n.js` trong `<head>`, khai báo file của màn hình trong `Tools/i18n/i18n-sections.json`.
- Thêm ngôn ngữ: tạo `Scripts/i18n/ba-i18n.<mã>.js`, thêm một dòng vào `languages` trong `ba-i18n.js` (mã, nhãn, cờ SVG), thêm `Content` trong `BADesign.csproj`, và thêm một mục `Content` có `CopyToOutputDirectory` trong `BADesign.Worker.csproj` giống file `en` để Worker dịch được thư.
- Tìm chữ còn sót khi đang mở trang: gõ `BaI18n.debug()` trong console, thao tác, rồi `BaI18n.missing()`. `BaI18n.stats()` cho thời gian engine đã dùng.

## Bẫy

- Sửa câu tiếng Việt trong code mà không sửa khóa thì câu đó hiện tiếng Việt ở chế độ English. Công cụ rà sẽ báo.
- Chuỗi tiếng Việt không dấu (`Trang`, `Xong`) chỉ được công cụ nhận ra nhờ danh sách `plainWords` trong `i18n-sections.json`.
- Mẫu bắt đầu bằng chỗ trống (`"{0} dòng"`) dễ khớp nhầm: dùng `{0#}` khi chỗ trống là số.
- Từ điển sửa xong thì trình duyệt cần `?v=` mới; Worker đọc file `i18n\ba-i18n.<mã>.js` cạnh `BADesign.Worker.exe`, nên phải build lại Worker hoặc chép file mới vào đó.
- Không nhúng từ điển vào DLL: bản build bằng Build/F5 trong Visual Studio trên máy dev không chứa tài nguyên nhúng nào (kiểm ngày 13/11/2026), chỉ bản publish và MSBuild dòng lệnh mới có.
- Khóa lặp trong một khối `BaI18n.add` bị công cụ rà báo lỗi; phía server lấy giá trị sau cùng.
- File Excel xuất ra và nội dung log lưu trong database không được dịch.

## Số đo (13/11/2026, máy dev)

Trang đăng ký ở chế độ English: engine 3 đến 4 ms, từ điển 66 KB khi truyền. Chèn một lúc bảng 1.000 dòng × 8 cột: khoảng 45 ms; 5.000 dòng: 140 đến 195 ms. Chế độ tiếng Việt: 0 ms.
