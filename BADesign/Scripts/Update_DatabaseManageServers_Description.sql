-- Cập nhật mô tả quyền Database Manage Servers (chạy 1 lần trên DB đã có sẵn).
-- Chỉ dùng cho manager quản lý cấu hình server; Connect mọi DB dùng quyền DatabaseConnectAny.
UPDATE dbo.UiPermission
SET [Description] = N'Quản lý cấu hình server: thêm, sửa, xóa server trong Database Tools; thấy tất cả server. Dùng cho manager.'
WHERE Code = N'DatabaseManageServers';
