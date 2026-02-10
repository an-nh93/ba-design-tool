-- =============================================
-- Database Bulk Reset Permission
-- Quyền kiểm tra và reset nhiều database trên server sau restore từ khách hàng.
-- Chỉ Server Manager / người có quyền mới sử dụng được Multi-DB Reset.
-- =============================================

IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseBulkReset')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES 
    (N'DatabaseBulkReset', N'Database Bulk Reset', N'Kiểm tra và reset nhiều DB trên server sau restore. Chỉ Server Manager.');
    PRINT 'UiPermission DatabaseBulkReset added.';
END
ELSE
BEGIN
    PRINT 'UiPermission DatabaseBulkReset already exists.';
END
GO
