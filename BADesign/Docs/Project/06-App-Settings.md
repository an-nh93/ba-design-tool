# App Settings

`Pages/AppSettings.aspx`. Một nơi cấu hình dùng chung. Chỉ user có quyền Settings vào được.

## Nhóm cấu hình

- **Email ignore:** pattern email nội bộ coi là đã reset, dùng khi quét multi-db.
- **Public URL:** gốc link đăng ký và quên mật khẩu.
- **Đăng ký:** domain email được phép đăng ký; kênh báo user mới (Telegram hoặc email).
- **Email server:** SMTP ghi vào Setting_EmailServers khi restore + reset, và Cadena email server trong HR Helper.
- **Số điện thoại reset:** mặc định (ví dụ 0987654321) cho restore và HR Helper.
- **Làm sạch dữ liệu sau restore:** mật khẩu đăng nhập chung và khoảng lương giả, điền sẵn ở bước Làm sạch dữ liệu của form Restore.
- **Telegram:** bot token và chat id.
- **SFTP:** dùng cho luồng restore tự động.

## Ý tưởng

Màn nghiệp vụ không hard-code SMTP, số điện thoại, hay domain đăng ký. Chúng đọc App Settings lúc chạy job. Đổi setting không sửa code và không cần deploy lại rule reset.
