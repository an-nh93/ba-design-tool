# Database Search – Bảo mật & tính năng (theo góp ý)

## Đã triển khai

### 1. Đăng nhập – chỉ email CADENA
- **Thực hiện:** Chỉ cho đăng nhập khi tài khoản có email thuộc domain:
  - `*@cadena.com.sg`
  - `*@cadena-hrmseries.com`
  - `*@cadena-it.com`
- **Cách làm:** Trong `Login.aspx.cs` sau khi kiểm tra user/password, lấy `Email` từ `UiUser` và gọi `UiAuthHelper.IsAllowedLoginEmail(email)`. Nếu không thuộc domain trên → báo lỗi và không cho login.
- **Lưu ý:** Tài khoản mới (thêm từ User Management) nên nhập đúng email CADENA; nếu để trống hoặc email khác domain thì sẽ không đăng nhập được.

### 2. Danh sách SQL Server
- **Chỉ admin (role có quyền) mới thêm/sửa/xóa:** Đã có – chỉ user có permission `DatabaseManageServers` (hoặc Super Admin) mới gọi được `SaveServer`, `UpdateServer`, xóa server. UI nút Thêm/Sửa/Xóa chỉ hiện khi `CanManageServers`.
- **Không hiển thị password:** API `GetServers` chỉ trả về `Id, ServerName, Port, Username` (không có `Password`). Form sửa server có ô password “để trống nếu không đổi”, không hiển thị mật khẩu hiện tại.

### 3. Danh sách Database (đã làm phần ẩn connection string)
- **Không show/copy connection string:**
  - API `LoadDatabases` không còn gửi `connectionString` / `connectionStringForCopy` ra client, chỉ gửi `serverId, server, database, username`.
  - Bảng kết quả bỏ cột “Copy”; chỉ còn nút “Connect”.
  - Connect thực hiện qua API `PrepareConnectByServerAndDb(serverId, databaseName)`: server tự build connection string và trả về token, client không bao giờ nhận được connection string.
- **Kết nối bằng dán connection string (ô “Dán connection string”):** Vẫn giữ cho trường hợp đặc biệt (ví dụ admin có connection string từ nguồn khác). Có thể sau này giới hạn chỉ Super Admin nếu cần.

## Cần phát triển tiếp

### 3 (tiếp). Database – metadata restore/reset, backup/restore/delete
- **Thông tin “database được restore từ web tool”:**  
  Cần bảng audit, ví dụ: `BaDatabaseRestoreLog (Id, ServerId, DatabaseName, RestoredByUserId, RestoredAt, ...)`. Khi có chức năng Restore từ web, mỗi lần restore ghi một dòng. Trên danh sách database có thể hiển thị: “Restore bởi X, lúc Y” (và có thể filter/check database chưa từng restore bằng tool → cần rà soát reset thủ công).
- **Thông tin “thực hiện reset data”:**  
  Bảng ví dụ: `BaDatabaseResetLog (Id, ServerId, DatabaseName, UserId, At, DataTypesReset, ...)` (DataTypesReset: JSON hoặc bảng con liệt kê loại data đã reset). Mỗi lần thực hiện reset từ web ghi một dòng. Trên UI có thể hiển thị: “Reset bởi X, lúc Y, các mục: …”.
- **Backup / Restore / Xóa database:**  
  Chức năng chưa có, cần:
  - Backup: API gọi SQL (BACKUP DATABASE), lưu file (path an toàn hoặc blob), có thể ghi `BaDatabaseRestoreLog` khi restore.
  - Restore: API Restore từ file (hoặc từ backup đã lưu), ghi `BaDatabaseRestoreLog` (user, thời gian).
  - Xóa database: Chỉ admin (Super Admin hoặc role tương đương) **hoặc** user từng restore database đó (so sánh với `BaDatabaseRestoreLog.RestoredByUserId`) mới được gọi API xóa (DROP DATABASE hoặc disable tùy chính sách).

### 4. View / Check / Reset data
- **View:**  
  Góp ý: chỉ admin và “người restore” mới được view (hoặc thảo luận chặn hẳn vì lý do an toàn dữ liệu). Cần:
  - Định nghĩa rõ “admin” (Super Admin hay role có quyền đặc biệt).
  - “Người restore” = user từng restore database đó (tra từ `BaDatabaseRestoreLog`).
  - Áp vào trang/màn hình “view data” (ví dụ HR Helper view): kiểm tra quyền trước khi cho xem.
- **Check và Reset (từng database):**
  - Thực hiện theo từng database (không bắt buộc hàng loạt).
  - Danh sách loại data cần reset cần BA + team chuẩn hóa, ví dụ:
    - Password HR account
    - Email, số điện thoại, năm sinh, CCCD
    - Email setting, SFTP setting, …
  - Một số field nhạy cảm có thể “check và reset động theo tên field” (config hoặc list field names).
  - Bắt buộc reset vs tùy chọn reset: cần thảo luận với team để quyết chính sách và thể hiện trên UI (checkbox từng loại, hoặc nhóm bắt buộc/tùy chọn).

### 5. User log (mở rộng sau)
- Ghi log hành động user (ai làm gì, lúc nào). Có thể:
  - Dùng bảng `UiUserActionLog (Id, UserId, ActionCode, Detail, At, ...)`.
  - Gọi log khi: đăng nhập, thêm/sửa/xóa server, connect database, restore, reset data, …
- Ứng dụng hiện đã có `AppLogger` ghi lỗi unhandled; có thể mở rộng thêm helper ghi `UiUserActionLog` cho từng action quan trọng.

## Script SQL gợi ý (bảng audit)

File `Scripts/AddDatabaseRestoreAndResetLog.sql` (tạo khi triển khai backup/restore/reset):

- `BaDatabaseRestoreLog`: ServerId, DatabaseName, RestoredByUserId, RestoredAt, (Optional: BackupFilePath, …).
- `BaDatabaseResetLog`: ServerId, DatabaseName, UserId, At, DataTypesReset (NVARCHAR(MAX) hoặc bảng con).

Khi có bảng trên, phần “danh sách database” có thể thêm cột hoặc tooltip: Restored by/at, Last reset by/at.
