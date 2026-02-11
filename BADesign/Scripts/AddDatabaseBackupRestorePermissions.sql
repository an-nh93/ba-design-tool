-- =============================================
-- Database Backup & Restore permissions
-- Phân quyền Backup database và Restore database (có thể cấp riêng)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseBackup')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES 
    (N'DatabaseBackup', N'Database Backup', N'Quyền backup database từ web tool');
    PRINT 'UiPermission DatabaseBackup added.';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseRestore')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES 
    (N'DatabaseRestore', N'Database Restore', N'Quyền restore database từ web tool; xem tiến trình restore trong nền');
    PRINT 'UiPermission DatabaseRestore added.';
END
GO
