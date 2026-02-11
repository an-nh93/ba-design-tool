-- =============================================
-- Database Delete & Shrink log permissions
-- Phân quyền Xóa database và Shrink log (cấp trong Role Permission)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseDelete')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES 
    (N'DatabaseDelete', N'Database Delete', N'Quyền xóa database từ web tool');
    PRINT 'UiPermission DatabaseDelete added.';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseShrinkLog')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES 
    (N'DatabaseShrinkLog', N'Database Shrink Log', N'Quyền shrink log database từ web tool');
    PRINT 'UiPermission DatabaseShrinkLog added.';
END
GO
