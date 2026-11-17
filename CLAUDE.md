# BADesign - quy tắc riêng của dự án cho AI

File này là hướng dẫn riêng của project (theo `rules/common/common-rules.md` của bộ rule Cadena).
Mọi công cụ AI và mọi skill `s5-*` chạy trong repo này PHẢI đọc file này ở bước đầu tiên, trước khi phân tích hay sửa code,
và trong báo cáo cuối phải nêu đã tuân thủ từng điều ở mục 1 như thế nào.
Khi file này khác bộ rule dùng chung thì file này được ưu tiên (người dùng quy định ngày 2026-11-15).

## 1. Điều cấm kỵ (bắt buộc)

1. **Cấm hardcode để chữa một trường hợp cụ thể khi chưa tìm ra nguyên nhân gốc.**
   Không thêm `if` theo id, tên, giá trị, cỡ màn hình hay dữ liệu của đúng trường hợp đang lỗi.
   Không thêm `setTimeout`, `!important` hay hằng số chọn mò để che triệu chứng.
2. **Không suy đoán.** Tái hiện lỗi, lần theo luồng chạy thật và chỉ ra nguyên nhân gốc bằng bằng chứng (đo, log, test) trước khi sửa.
   Chưa tìm ra nguyên nhân thì nói rõ là chưa tìm ra, không sửa mò.
3. **Tổ chức code theo đúng một kiến trúc, dùng cách làm hiện đại và nhất quán.**
   Trước khi viết, tìm mẫu đang dùng trong module và làm theo. Không tạo thêm một kiểu tổ chức, một cách đặt tên
   hay một cách dựng giao diện khác với phần đã có. Muốn đổi kiến trúc thì đổi cho cả module và ghi vào tài liệu;
   không để hai kiểu cùng tồn tại khiến người sau không biết debug ở đâu.
4. **Viết code dễ mở rộng, dễ bảo trì nhưng phải giữ hiệu năng.**
   Logic dùng lại đặt ở một chỗ, không chép sang nơi thứ hai. Đo khi thay đổi có thể ảnh hưởng tốc độ
   (vòng lặp trên toàn bộ control, truy vấn SQL, vẽ lại giao diện).
5. **Front-end cũng theo chuẩn.** Không chữa lỗi giao diện bằng cách chồng thêm CSS, thêm file hay viết thẳng `style` vào HTML.
   Mỗi thành phần giao diện có một nơi duy nhất chứa kiểu trình bày; sửa ở đúng nơi đó
   và kiểm tra các màn hình cùng dùng thành phần ấy.
6. **Luôn chạy test, không được đoán là code đã đúng.** Backend: viết và chạy unit test. Front-end: chạy test Playwright.
   Báo cáo số test đã chạy và kết quả thật; phần nào chưa chạy thì ghi là chưa chạy.
7. **Làm việc như một kỹ sư phần mềm cao cấp ở cả backend và front-end.**
   Sau khi viết xong, rà lại và refactor phần code vừa viết hoặc vừa chạm tới (trùng lặp, đặt tên, tầng trách nhiệm, xử lý lỗi)
   trước khi báo hoàn thành.

## 2. Áp dụng cùng bộ skill S5

- Điều 6 là yêu cầu rõ của người dùng cho mọi task trong repo này: agent tự build, viết test và chạy test,
  không hỏi lại câu hỏi build / test ở `rules/common/testing.md`, mục 0. Các điểm dừng khác của skill giữ nguyên
  (số giờ ước lượng, câu hỏi nghiệp vụ, ghi dữ liệu vào database dùng chung của tool).
- Điều 7 không mở rộng sang code không liên quan tới task (vẫn theo "Tránh refactor không liên quan" của rule dùng chung).
- Không được vi phạm một điều cấm kỵ để kịp việc. Không thể tuân thủ thì dừng lại và báo người dùng lý do.

## 3. Cách chạy test

- Backend: project `BADesign.Tests` (MSTest, .NET Framework 4.8). Build `BADesign.Tests/BADesign.Tests.csproj` bằng MSBuild của Visual Studio,
  rồi chạy `dotnet test BADesign.Tests/bin/Debug/net48/BADesign.Tests.dll`. Build thay `BADesign/bin/BADesign.dll`
  nên site đang chạy sẽ khởi động lại và mọi phiên đăng nhập bị mất.
- Front-end của UI Builder: bộ kịch bản Playwright trong `Tools/builder-harness` (cách chạy ở `Tools/builder-harness/README.md`).
  Thay đổi giao diện phải có kịch bản kiểm tra và phải chạy lại toàn bộ bộ kịch bản.
- Trang khác của tool: thử bằng Playwright trên `http://localhost:3393` với tài khoản test do người dùng cấp cho từng lần;
  không lưu tài khoản vào file, log hay bộ nhớ. Kịch bản lưu lại được đặt ở `Tools/page-checks` (hiện có `home.js` cho trang `/Home`
  và `hr-modules.js` cho trang `/HrModules`, cách chạy ở `Tools/page-checks/README.md`).
- Bộ chuyển đổi màn hình và bộ đọc file draw.io (chạy bằng Node, không cần trình duyệt): `node Tools/ui-capture/test/convert.test.js`
  và `node Tools/ui-capture/test/drawio.test.js`.
- Chữ giao diện: `node Tools/i18n/i18n-check.js` phải báo 0 chữ thiếu bản dịch.

## 4. Kiến trúc cần giữ

- Tài liệu của từng module nằm ở `BADesign/Docs/Project/`. Đọc tài liệu của module trước khi sửa và cập nhật nó sau khi sửa.
- Web project biên dịch bằng Microsoft.Net.Compilers 1.0.0: chỉ dùng cú pháp C# 6.
- Script SQL đặt ở `BADesign/Scripts/Add*.sql`, chạy lại nhiều lần không lỗi.
- Phần Thuộc tính của UI Builder: HTML chỉ dựng bằng `BADesign/Scripts/builder/builder-props.js` (`builderProps`), kiểu trình bày chỉ nằm trong
  `BADesign/Content/builder-props.css` (class `pp-*`, không `!important`, không `style` trong mã dựng panel). Module control không gắn handler
  ủy quyền lên `#propPanel`. Chi tiết ở `BADesign/Docs/Project/01-UI-Builder.md`, mục 15.11.
- Viết lại mã có sẵn thì ghi hành vi trước (bước `golden` của `Tools/builder-harness`), sửa, rồi so lại; chỉ ghi đè giá trị đã ghi khi thay đổi
  là có chủ đích và đã soát từng chỗ khác.
