# Page checks

Kịch bản Playwright cho các trang phải đăng nhập mới mở được (không chạy được trong `Tools/builder-harness`). Mỗi file là một hàm `async (page) => ...` chạy trên trang thật `http://localhost:3393`.

| File | Trang | Kiểm tra gì |
|---|---|---|
| `home.js` | `/Home` (danh sách thiết kế của UI Builder) | Khung chung, nút Từ file draw.io mở hộp thoại trong Builder, tìm, lọc dự án / trạng thái, sắp xếp, lưới / danh sách, tạo và xóa dự án, công khai / riêng tư, nhân bản, xem ảnh lớn, ô "Chưa có ảnh xem trước", xóa thiết kế, tên chứa mã HTML, chế độ sáng, tiếng Anh (kể cả ô lọc phân hệ và nút Mở file draw.io của hộp Màn hình chuẩn), người chưa đăng nhập không lấy được dữ liệu |
| `server-monitor.js` | `/ServerMonitor` (Giám sát máy chủ) | Nhóm Bộ chạy job ghi đúng nơi chạy job theo `UseBackgroundWorker`; nhóm BADesign.Worker.exe và câu giới thiệu nhắc Worker chỉ có khi job chạy trong Worker, server cũng chỉ gửi số liệu Worker khi đó; không cuộn ngang; tiếng Anh không sót chữ; không lỗi script |
| `hr-modules.js` | `/HrModules` (phân hệ HR) | Khung chung, thêm phân hệ, tên rỗng / chứa mã HTML / trùng, đổi tên, ẩn và hiện, đổi thứ tự, gán phân hệ cho một màn hình chuẩn, lọc Chưa gán, tìm, id không tồn tại, người chưa đăng nhập, ô lọc phân hệ trong hộp Màn hình chuẩn, xóa phân hệ, chế độ sáng, tiếng Anh |
| `pgp-tool.js` | `/PgpTool?k=...` (Công cụ PGP, mở từ Database Tools) | Tạo cặp key mới (không lưu DB), xuất key ra `.asc` từ chuỗi Base64 dán vào và từ cấu hình DB (public, private, tên file, chuỗi không phải Base64; chuyển sang nguồn DB rồi quay lại thì chuỗi đã dán và mã tên file vẫn giữ nguyên), mã hóa bằng key lấy từ file `.asc` / chuỗi Base64 / cấu hình DB ra `.pgp` và `.asc`, có và không nén, giải mã mọi file đó bằng private key từ file / chuỗi / cấu hình DB: đúng cặp key thì mở được, nội dung và tên file trùng file gốc; khác cặp key thì trang báo file được mã hóa cho key nào và private key đang dùng là key nào (cùng một cặp thì luôn cùng key ID, key của file nằm trong các key của private key cùng cặp), có cả bản tiếng Anh; sai passphrase thì báo passphrase sai; nhập sai loại dữ liệu thì báo đúng lỗi (giải mã bằng public key dạng file hoặc chuỗi, bằng file đã mã hóa, bằng chuỗi không phải key, chuỗi không phải Base64; giải mã một file chưa mã hóa hoặc một file key; mã hóa bằng private key, bằng file đã mã hóa, bằng chuỗi không phải key; xuất private key với loại Public Key và ngược lại, xuất chuỗi không phải key); tên file giải mã là tên file đã chọn bỏ đuôi `.pgp` / `.PGP` / `.gpg` / `.asc`, kể cả khi tên ghi bên trong file khác (như file HRM mã hóa từ file tạm), còn file không có các đuôi đó thì lấy tên ghi bên trong; Nạp key báo khi public key và private key của cấu hình không cùng một cặp (có cả bản tiếng Anh); mỗi lần thành công tải đúng một file, đúng tên trang trả về; không ghi key xuống DB |

## Chạy

1. Bật site cục bộ (IIS Express, cổng 3393).
2. Trong phiên Playwright, đăng nhập bằng tài khoản test có quyền UI Builder; `hr-modules.js` cần thêm quyền Quản trị mẫu UI (`UITemplateAdmin`) hoặc Super Admin; `server-monitor.js` cần Super Admin. Không ghi tài khoản vào file hay log.
   `server-monitor.js` tự nhận chế độ (job chạy trong site hay trong Worker) từ dữ liệu của trang. Muốn kiểm cả hai chế độ thì đổi tạm `UseBackgroundWorker` trong `Web.config` của site dev, chạy lại, rồi trả file về như cũ; không tạo job nào trong lúc đổi.
3. Chạy file kịch bản trong phiên đó (với Playwright MCP: `browser_run_code_unsafe` và tham số `filename: "Tools/page-checks/home.js"`).

`pgp-tool.js` cần trang đang mở sẵn ở `/PgpTool?k=...`: vào Database Tools, bấm "Công cụ PGP" của một database có bảng `Setting_FolderConfigurations`, đợi dòng "Đã chọn: ..." hiện ra rồi mới chạy (chưa vậy thì kịch bản dừng với dòng `NOT CONNECTED`). Cấu hình đang chọn phải có cả public key và private key, và private key phải dùng passphrase mặc định của ô Passphrase ở tab Generate Key. Chạy bằng `filename` thì kịch bản tự tạo một file văn bản để mã hóa. Muốn thử thêm file thật thì gọi hàm với tham số thứ hai (với Playwright MCP, `browser_run_code_unsafe` không có `require`: phục vụ file kịch bản qua một server tĩnh trên 127.0.0.1, `fetch` rồi `eval` để lấy hàm và gọi với tham số):

```
{
  inputFile: '<file gốc để mã hóa>',
  otherPublicKeyFile: '<file .asc public key của một cặp khác cặp trong DB>',
  configPrivateKeyPublicFile: '<file .asc public key cùng cặp với private key của cấu hình, khi hai key của cấu hình không cùng cặp>',
  encryptedFiles: [{ label: '<tên hiển thị>', path: '<file .pgp có sẵn>', pair: 'DB' | 'DB public' | 'DB private' | 'other', sameContent: true }],
  publicKeyFiles: ['<file .asc public key: dùng thử làm private key cho từng file trong encryptedFiles, phải bị từ chối>']
}
```

`pair: 'DB'` nghĩa là file được mã hóa bằng key của cấu hình đang chọn (phải mở được bằng private key của cấu hình), `'other'` là bằng key khác (phải bị từ chối với mọi private key). Khi public key và private key của cấu hình không cùng một cặp (trang báo lúc Nạp key), kịch bản coi chúng là hai cặp `'DB public'` và `'DB private'`: kiểm câu báo, kiểm mọi file mã hóa bằng public key của cấu hình bị private key của cấu hình từ chối, và kiểm giải mã thành công bằng private key của cấu hình với file mã hóa bằng `configPrivateKeyPublicFile` (public key này đọc được từ chính private key bằng BouncyCastle: ghi `PgpSecretKey.PublicKey.GetEncoded()` của từng key rồi bọc `ArmoredOutputStream`). `sameContent: true` so nội dung giải mã với `inputFile`. Thêm `keyIds: { DB: '<key ID>', other: '<key ID>' }` thì kịch bản so key ID trong câu báo với giá trị đó (key ID đọc bằng BouncyCastle, xem `BADesign/Docs/Project/07-PGP-Tool.md`).

Dòng cuối của kết quả:

```
=== Home: 52 checks passed, 0 failed
=== HR modules: 31 checks passed, 0 failed
=== PGP tool: 136 checks passed, 0 failed
=== Server monitor (jobs run in the web site): 11 checks passed, 0 failed
```

Số kiểm tra của `pgp-tool.js` tùy dữ liệu: 136 khi hai key của cấu hình không cùng một cặp (chạy bằng `filename`), 159 khi cùng một cặp và có `keyIds`, nhiều hơn khi truyền thêm file thật.

Chưa đăng nhập thì kịch bản dừng ngay với dòng `NOT LOGGED IN`; tài khoản không có quyền quản lý phân hệ thì `hr-modules.js` dừng với dòng `NOT ALLOWED`. Tài khoản chưa có thiết kế nào kèm ảnh xem trước thì bước thử "ảnh không tải được" của `home.js` bị bỏ qua: kết quả có thêm dòng `skip ...` và dòng cuối ghi `51 checks passed, 0 failed, 1 skipped`.

## Dữ liệu thử

- `home.js` tạo ba thiết kế và một dự án có tên bắt đầu bằng `TEST Home`, bằng chính các hàm của ứng dụng, rồi xóa hết ở cuối (kể cả khi có bước lỗi). Đầu mỗi lần chạy nó cũng dọn phần `TEST Home` còn sót của lần trước.
- Xóa ở đây là xóa mềm như người dùng bấm xóa: dòng dữ liệu còn trong cơ sở dữ liệu với `IsDeleted = 1`.
- Kịch bản không đụng tới thiết kế và dự án khác của tài khoản, và chỉ gọi thử quyền bằng id không tồn tại.
- Một thiết kế thử được chuyển thành công khai trong vài giây để kiểm tra tab Thiết kế công khai, rồi chuyển lại riêng tư và xóa.
- `hr-modules.js` tạo một phân hệ tên bắt đầu bằng `TEST Phân hệ`, gán nó cho màn hình chuẩn `pattern-core-list` (màn hình này phải đang chưa gán phân hệ), rồi xóa phân hệ; xóa phân hệ là xóa thật và trả màn hình về chưa gán. Bước cuối so danh sách phân hệ và mọi phép gán với lúc bắt đầu. Trong vài giây chạy, phân hệ thử hiện trong hộp Màn hình chuẩn của mọi người đang dùng.
- Các thao tác thử được ghi vào nhật ký thao tác (`UiHrModule.Save`, `UiHrModule.Delete`, `UiHrModule.Assign`) như thao tác thật.
- `server-monitor.js` chỉ đọc trang và số liệu, không tạo hay sửa dữ liệu.
- `pgp-tool.js` chỉ đọc key của cấu hình đang chọn; cặp key mới được tạo với ô "Lưu key xuống cấu hình đã chọn (DB)" bỏ chọn và kịch bản kiểm tra không có lệnh ghi key nào được gửi đi. Mỗi lần xuất, mã hóa, giải mã thành công trình duyệt tải một file (với Playwright MCP là vào thư mục `.playwright-mcp`), trong đó có file private key và nội dung đã giải mã: xóa thư mục đó sau khi chạy.
