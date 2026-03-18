-- =============================================
-- Quyền Connect mọi database (dùng HR Helper trên bất kỳ DB nào, không chỉ DB do mình restore).
-- Tách riêng khỏi Database Manage Servers (quản lý cấu hình server).
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseConnectAny')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES
    (N'DatabaseConnectAny', N'Database Connect (mọi DB)', N'Được Connect và dùng HR Helper trên mọi database, không chỉ database do mình restore. Dùng cho user cần truy cập nhiều DB (BA/QC/DEV) mà không cần quyền quản lý server.');
    PRINT 'UiPermission DatabaseConnectAny added.';
END
GO
