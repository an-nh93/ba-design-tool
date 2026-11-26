# App Settings

`Pages/AppSettings.aspx`. Một nơi cấu hình dùng chung. Chỉ user có quyền Settings vào được: `Page_Load` đưa người khác tới `AccessDenied`, và mọi page method của trang, đọc lẫn ghi, kiểm `HasFeature("Settings")`. Riêng `LoadEmailServerConfig` còn trả cho người có quyền Database Tools, vì nút Cadena Email Server của Trợ lý HR dùng hàm này (`CanReadEmailServerConfig`).

## Nhóm cấu hình

- **Email ignore:** pattern email nội bộ coi là đã reset, dùng khi quét multi-db.
- **Public URL:** gốc link đăng ký và quên mật khẩu.
- **Đăng ký:** domain email được phép đăng ký; kênh báo user mới (Telegram hoặc email).
- **Email server:** SMTP ghi vào Setting_EmailServers khi restore + reset, và Cadena email server trong HR Helper.
- **Số điện thoại reset:** mặc định (ví dụ 0987654321) cho restore và HR Helper.
- **Làm sạch dữ liệu sau restore:** mật khẩu đăng nhập chung và khoảng lương giả, điền sẵn ở bước Làm sạch dữ liệu của form Restore.
- **Telegram:** bot token và chat id.
- **SFTP:** dùng cho luồng restore tự động.
- **Bảo mật:** mã hóa dữ liệu nhạy cảm đang lưu (mục dưới).

## Mã hóa dữ liệu nhạy cảm (tab Bảo mật)

Bí mật lưu trong database của tool gồm: mật khẩu SQL Server của từng server (`BaDatabaseServer.Password`); `SftpPassword`, `EmailServer_Password`, `Telegram_BotToken` trong `BaAppSetting`; chuỗi kết nối và mật khẩu trong `BaJob.Payload` của job Trợ lý HR.

- **Dạng mã hóa** (`Helpers/Security/BaSecret.cs`): `enc:v1:` + Base64(IV 16 byte + AES-256-CBC + HMAC-SHA256), mỗi lần mã hóa một IV ngẫu nhiên. Khóa suy ra từ hằng `Passphrase` trong source bằng PBKDF2-SHA256 200.000 vòng, tính một lần cho mỗi tiến trình (khoảng 0,4 giây).
- **Khóa nằm trong source** (người dùng quyết định ngày 25/11/2026): mọi bản web và Worker tự có cùng khóa, không phải cấu hình gì. Đổi lại: ai có source hoặc `BADesign.dll` thì giải mã được, nên việc mã hóa chỉ chặn người chỉ có bản sao database hoặc file backup của database. Đổi `Passphrase`, salt hoặc số vòng thì giá trị đã mã hóa không đọc lại được; test `Reveal_StoredSample_IsStillReadable` hỏng là dấu hiệu đó.
- **Đọc** lúc nào cũng nhận cả hai dạng: `BaSecret.Reveal` (giá trị không mang tiền tố, hoặc không giải mã được, thì trả nguyên), `BaJobSecrets.Read` cho bộ chạy job.
- **Ghi** theo công tắc `Security_EncryptStoredSecrets` trong `BaAppSetting`: `BaSecretStore.ForStorage` cho một giá trị, `PayloadForStorage` cho Payload (`BaJobQueue.Enqueue` gọi sẵn). Tắt (mặc định): ghi dạng thường như trước. Bật: ghi dạng mã hóa. Công tắc đọc lại ở mỗi lần ghi, không cache, nên đổi là có hiệu lực ngay ở mọi tiến trình.
- **Thẻ trên trang**: người có quyền Settings thấy trạng thái và số giá trị ở từng dạng (`LoadStoredSecretStatus`; một job tính là một giá trị). Chỉ Super Admin bấm được **Bật và mã hóa dữ liệu đang có** và **Tắt và giải mã** (`SwitchStoredSecrets`, ghi nhật ký `AppSettings.SwitchStoredSecrets`). Một lần bấm đặt công tắc và đổi mọi giá trị đang lưu trong một transaction (`BaSecretStore.Switch`); lỗi giữa chừng thì không có gì đổi. Bấm lại cùng nút thì chỉ đổi phần còn sót, vd giá trị một bản cũ vừa ghi ở dạng thường.
- **Trình tự bật**: (1) publish bản mới cho mọi bản web và Worker dùng chung database, vì bản cũ không đọc được dạng mã hóa (kết nối server và job của bản cũ sẽ lỗi sai mật khẩu); (2) chạy `Scripts/AddStoredSecretEncryption.sql`, nới `BaDatabaseServer.Password` từ `NVARCHAR(256)` lên `NVARCHAR(1024)` (mật khẩu SQL Server 128 ký tự cần tới 607 ký tự khi mã hóa; chưa chạy thì nút Bật từ chối và nhắc tên script); (3) bấm Bật. Quay lui: bấm **Tắt và giải mã** trước khi đưa bản cũ trở lại.
- **Payload**: chỉ mã hóa `connectionString`, `password` ở gốc và `ConnectionString` trong từng phần tử của `connectionStrings` (`Helpers/BaJobSecrets.cs`). Phần còn lại giữ dạng đọc được cho giao diện và cho các câu SQL lọc theo nội dung.
- **Không mã hóa, đúng thiết kế**: mật khẩu reset demo (`passwordForReset`, `sanitize.password`, `App_ResetPasswordDefault`), vì giao diện hiện lại cho người dùng.
- **Giá trị mang tiền tố nhưng không giải mã được** (mã hóa bằng khóa khác, hoặc bị hỏng) được giữ nguyên ở cả hai chiều, không mã hóa chồng lên.
- **Thêm một bí mật mới**: khai nơi lưu trong `BaSecretStore.Sources`, ghi qua `ForStorage`, đọc qua `BaSecret.Reveal`. Khóa bí mật mới trong Payload thì thêm vào `BaJobSecrets`.

Số đo (25/11/2026, LocalDB, 184 giá trị trong đó một Payload 77 KB): bật 22 ms, tắt 25 ms, đọc trạng thái 7 ms. Bộ chạy job đọc Payload đã mã hóa tốn bằng đọc Payload thường (0,27 ms so với 0,23 ms với Payload nhỏ).

**Kiểm lại sau khi sửa phần này**: `Tools/secret-store-check/check-secret-store.ps1` dựng một instance LocalDB tạm bằng các script của dự án, nạp giá trị giả rồi chạy bật, tắt, lỗi giữa chừng, cột còn hẹp, giá trị dạng thường ghi muộn và khóa dòng (26 kiểm tra; cách chạy ở `Tools/secret-store-check/README.md`). Không bao giờ thử hai nút trên database dùng chung.

## Ý tưởng

Màn nghiệp vụ không hard-code SMTP, số điện thoại, hay domain đăng ký. Chúng đọc App Settings lúc chạy job. Đổi setting không sửa code và không cần deploy lại rule reset.
