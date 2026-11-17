# Cấu hình đường dẫn Backup và Restore

## Tình huống

- **Restore** trên web: chọn file .bak từ `\\Hrs05\sqlbak` → dùng **Thư mục restore** = `\\Hrs05\sqlbak` (hoặc thư mục con chứa .bak).
- **Backup** trên web: báo **Access is denied** khi ghi vào `\\Hrs05\sqlbak\BACKUP`.
- **Backup trong SSMS**: khi bạn chọn một đường dẫn nào đó thì chạy được.

## Vì sao web báo không có quyền?

Lệnh `BACKUP DATABASE` chạy **trên máy SQL Server** (HRS05). Ứng dụng web chỉ gửi lệnh + đường dẫn; SQL Server mới là process ghi file. Tài khoản **dịch vụ SQL Server** (vd. `NT SERVICE\MSSQL$SQL2022`) phải có **quyền Ghi** vào thư mục/share đó. SSMS cũng gửi lệnh tới SQL Server; nếu SSMS backup được thì path bạn chọn trong SSMS là path mà tài khoản SQL đã ghi được.

## Bạn cần làm gì?

### Cách 1: Dùng thư mục backup mặc định của SQL Server (nhanh)

1. Trong web: **Database Tools** → danh sách server → **Sửa** (HRS05\SQL2022).
2. Ở **Thư mục backup** bấm **Tự dò**: tool điền thư mục backup mặc định của SQL Server, cũng là path SSMS chọn sẵn khi backup (vd. `E:\...\Backup`).
3. **Thư mục restore** giữ `\\Hrs05\sqlbak` (hoặc thư mục chứa file .bak khi restore).
4. Bấm **Kiểm tra cấu hình**: tool báo SQL Server có thấy hai thư mục không và máy web có đọc được thư mục restore không. Bước này chỉ đọc.
5. Bấm **Thử ghi file**: SQL Server ghi thử một file backup nhỏ vào thư mục backup rồi xóa. Báo thành công nghĩa là tài khoản dịch vụ SQL có quyền ghi.
6. Bấm **Lưu**, thử backup lại trên web.

Nếu muốn dùng path khác path mặc định: mở SSMS, chuột phải database → **Backup**, xem path ở **Destination** rồi copy nguyên vào **Thư mục backup**.

### Cách 2: Cấp quyền cho SQL Server ghi vào \\Hrs05\sqlbak\BACKUP

Nếu bạn muốn backup từ web vẫn ghi vào `\\Hrs05\sqlbak\BACKUP`:

1. Trên máy **HRS05**: mở **Services** (services.msc) → tìm **SQL Server (SQL2022)** → tab **Log On** → xem tài khoản (vd. `NT SERVICE\MSSQL$SQL2022`).
2. Trên máy HRS05 (hoặc máy quản lý share): mở **Sharing** / **Security** của thư mục được share là `sqlbak` (tương ứng `\\Hrs05\sqlbak`).
3. Cấp quyền **Modify** (hoặc ít nhất **Write**) cho tài khoản dịch vụ SQL Server ở bước 1.
4. Đảm bảo thư mục con `BACKUP` (tức `\\Hrs05\sqlbak\BACKUP`) cũng kế thừa/quyền tương tự.
5. Trong web giữ **Thư mục backup** = `\\Hrs05\sqlbak\BACKUP`, bấm **Thử ghi file** để xác nhận quyền, rồi **Lưu**.

## Tóm tắt

| Việc        | Path dùng trong web                         |
|------------|---------------------------------------------|
| **Backup** | Path mà **SQL Server có quyền Ghi** (giống path bạn chọn trong SSMS khi backup). |
| **Restore**| Path chứa file .bak (vd. `\\Hrs05\sqlbak`).  |

Hai path có thể khác nhau: backup ghi vào chỗ SQL có quyền ghi, restore đọc từ chỗ bạn để file .bak.
