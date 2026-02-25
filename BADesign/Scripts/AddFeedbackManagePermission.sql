-- =============================================
-- Quyền Quản lý góp ý (Feedback Manage). Gán cho role CSS (Customer Service) hoặc SuperAdmin.
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'FeedbackManage')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES (N'FeedbackManage', N'Quản lý góp ý', N'Xem và cập nhật trạng thái, ghi chú, comment cho feedback từ người dùng');
    PRINT 'UiPermission FeedbackManage inserted.';
END
GO

-- Gán quyền FeedbackManage cho role CSS (Customer Service)
DECLARE @pid INT, @ridCss INT;
SELECT @pid = PermissionId FROM dbo.UiPermission WHERE Code = N'FeedbackManage';
SELECT @ridCss = RoleId FROM dbo.UiRole WHERE Code = N'CSS';
IF @pid IS NOT NULL AND @ridCss IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridCss AND PermissionId = @pid)
BEGIN
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridCss, @pid);
    PRINT 'FeedbackManage permission assigned to role CSS.';
END
GO
