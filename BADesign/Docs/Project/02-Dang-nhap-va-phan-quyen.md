# Đăng nhập và phân quyền

Cửa vào của cả web. Trang chủ (`HomeRole`) chỉ hiện thẻ chức năng user được phép.

## Đăng nhập

- Login, đăng ký, quên mật khẩu, đổi mật khẩu, account settings.
- Đăng ký giới hạn domain email được phép (cấu hình ở App Settings). User mới có thể kích hoạt thông báo Telegram hoặc email.
- Cookie remember (`UiRemember`, 30 ngày) tự đăng nhập lại khi phiên đã hết: `Global.asax.cs` khôi phục ở `Application_AcquireRequestState` (ở `BeginRequest` chưa có Session). Cookie ký bằng `RememberMeSecret` trong `Web.config`; để trống thì tính năng tắt. Đổi khóa này là hủy mọi cookie đã cấp. Đăng xuất (`UiAuthHelper.SignOut`) xóa cookie và chặn khôi phục trong phiên đó.
- Không đủ quyền thì `AccessDenied`.

## Role và permission

Role điển hình: BA chuẩn (mã `BA`), BA dự án (mã `BA_PROJECT`), CONS, DEV, QC, CSS, Super Admin. Quyền hiệu lực = quyền của role cộng quyền gán riêng cho user (`UiAuthHelper.GetEffectivePermissionCodesForUser`).

Role do script tạo (`Scripts/AddUiRoles.sql`, `Scripts/AddUiRoleManagers.sql`), chưa có màn hình thêm role. Code chỉ so mã role ở trang chủ theo role (`HomeRole.aspx.cs`: `BA` và `BA_PROJECT` dùng chung trang chủ của BA); nơi hiện role cho người dùng (Users, Role Permission, thanh trên, hộp tài khoản, mẫu UI) lấy tên role trong database.

`HasFeature` kiểm tra trước khi hiện thẻ và trước khi chạy WebMethod. Super Admin thấy thêm User Management, Role Permission, Leave Manager.

## User Management

Super Admin thêm, sửa user, đổi mật khẩu, gán role và quyền lẻ. Quyền đến từ role không gỡ được ở user; chỉ thêm quyền đặc biệt (UI Builder, Database Tools, Encrypt, HR Helper, …).

## Role Permission

Ma trận role × permission: UI Builder, Database Tools, backup, restore, delete DB, bulk reset, manage servers, shrink log, settings, HR Helper, server access theo role.

Thẻ **Sếp của từng Role** (bảng `UiRoleManager`, `Helpers/UiRoleManagers.cs`): Super Admin chọn một user làm sếp của mỗi role (ô chọn một người, mỗi role đúng một sếp), lưu bằng nút **Lưu cấu hình**. Quy trình duyệt mẫu UI dùng người này cho bước "Sếp của role người gửi". Mỗi lần sếp của một role đổi, hệ thống ghi nhật ký `UiTemplate.SaveRoleManagers`.

Quyền `UITemplateAdmin` (Quản trị mẫu UI): định nghĩa quy trình duyệt mẫu, duyệt thay, gỡ mẫu khỏi thư viện chung. Người duyệt mẫu không cần quyền riêng: họ được chỉ định theo từng bước của quy trình. Xem [15-Thu-vien-mau-va-quy-trinh-duyet.md](15-Thu-vien-mau-va-quy-trinh-duyet.md).

## Ý tưởng

Mọi trang và mọi API phải hỏi cùng một tập permission. Ẩn nút trên UI không thay cho kiểm tra ở server. Connection string và mật khẩu SQL không được lộ cho role không có quyền server.
