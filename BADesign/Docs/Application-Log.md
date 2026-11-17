# Log lỗi ứng dụng

## Vị trí file log

- **Mặc định:** `App_Data\Logs\app_yyyyMMdd.log` (trong thư mục gốc của web, ví dụ `c:\...\BADesign\App_Data\Logs\`).
- Tên file theo ngày (ví dụ `app_20250211.log`), mỗi ngày một file.
- Có thể đổi thư mục qua **Web.config** → `appSettings` → key `AppLogPath` (đường dẫn tương đối so với `App_Data` hoặc đường dẫn tuyệt đối).

## Khi nào có log

- Mọi **exception không xử lý** (unhandled) trong ứng dụng web sẽ được ghi vào log (trong `Application_Error`), kèm URL, method, IP và stack trace.

## Debug local – xem lỗi chi tiết trên trình duyệt

- **Web.config** → `system.web` → `customErrors mode="Off"` → trình duyệt sẽ hiển thị trang vàng (YSOD) với stack trace khi có lỗi.
- **Web.config** → `system.webServer` → `httpErrors errorMode="DetailedLocalOnly"` → khi truy cập bằng **localhost** sẽ thấy lỗi chi tiết từ IIS thay vì trang 500 chung.
- Khi deploy production nên đổi `customErrors` sang `RemoteOnly` hoặc `On` + `defaultRedirect` để người dùng không thấy stack trace.

## Nhiều người dùng / production

- Log được ghi append theo ngày, dùng lock nên an toàn khi nhiều request.
- Nên định kỳ xem hoặc rotate file log (xóa/archive file cũ) để tránh đầy ổ đĩa.
- Có thể đặt `AppLogPath` trỏ ra thư mục ngoài (ví dụ `D:\Logs\BADesign`) để dễ backup và xem trên server.
