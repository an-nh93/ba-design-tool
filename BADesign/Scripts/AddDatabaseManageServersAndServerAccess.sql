-- =============================================
-- Database Manage Servers permission
-- Phân quyền thêm/sửa/xóa server trong cấu hình
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseManageServers')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES 
    (N'DatabaseManageServers', N'Database Manage Servers', N'Thêm, sửa, xóa server trong cấu hình Database Search');
    PRINT 'UiPermission DatabaseManageServers added.';
END
GO

-- =============================================
-- UiRoleServerAccess: Role được dùng server nào
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiRoleServerAccess')
BEGIN
    CREATE TABLE dbo.UiRoleServerAccess (
        RoleId INT NOT NULL,
        ServerId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        PRIMARY KEY (RoleId, ServerId),
        CONSTRAINT FK_UiRoleServerAccess_Role FOREIGN KEY (RoleId) REFERENCES dbo.UiRole(RoleId),
        CONSTRAINT FK_UiRoleServerAccess_Server FOREIGN KEY (ServerId) REFERENCES dbo.BaDatabaseServer(Id)
    );
    CREATE INDEX IX_UiRoleServerAccess_ServerId ON dbo.UiRoleServerAccess(ServerId);
    PRINT 'UiRoleServerAccess table created.';
END
GO

-- =============================================
-- UiUserServerAccess: User được dùng server nào (bổ sung cho role)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiUserServerAccess')
BEGIN
    CREATE TABLE dbo.UiUserServerAccess (
        UserId INT NOT NULL,
        ServerId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        PRIMARY KEY (UserId, ServerId),
        CONSTRAINT FK_UiUserServerAccess_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId),
        CONSTRAINT FK_UiUserServerAccess_Server FOREIGN KEY (ServerId) REFERENCES dbo.BaDatabaseServer(Id)
    );
    CREATE INDEX IX_UiUserServerAccess_ServerId ON dbo.UiUserServerAccess(ServerId);
    PRINT 'UiUserServerAccess table created.';
END
GO
