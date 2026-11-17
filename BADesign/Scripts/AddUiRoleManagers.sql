-- =============================================
-- Role "BA chuẩn" / "BA dự án" và sếp của từng role (dùng cho quy trình duyệt mẫu UI).
-- 1. Role BA đổi tên hiển thị thành "BA chuẩn" (mã BA giữ nguyên).
-- 2. Thêm role BA_PROJECT "BA dự án", chép quyền và server access của role BA lúc tạo.
-- 3. Bảng UiRoleManager: sếp của từng role (mapping role - user).
-- 4. Mỗi role chỉ có một sếp: unique index theo RoleId. Role đang có nhiều sếp thì script chỉ báo, không xóa dữ liệu.
-- Chạy lại nhiều lần không lỗi.
-- =============================================

-- 1. Role BA -> "BA chuẩn"
IF EXISTS (SELECT 1 FROM dbo.UiRole WHERE Code = N'BA' AND Name = N'Business Analyst')
BEGIN
    UPDATE dbo.UiRole SET Name = N'BA chuẩn' WHERE Code = N'BA' AND Name = N'Business Analyst';
    PRINT 'UiRole BA renamed.';
END
GO

-- 2. Role "BA dự án"
IF NOT EXISTS (SELECT 1 FROM dbo.UiRole WHERE Code = N'BA_PROJECT')
BEGIN
    DECLARE @baRoleId INT = (SELECT RoleId FROM dbo.UiRole WHERE Code = N'BA');
    DECLARE @projectRoleId INT;

    INSERT INTO dbo.UiRole (Code, Name) VALUES (N'BA_PROJECT', N'BA dự án');
    SET @projectRoleId = SCOPE_IDENTITY();

    IF @baRoleId IS NOT NULL
    BEGIN
        INSERT INTO dbo.UiRolePermission (RoleId, PermissionId)
        SELECT @projectRoleId, PermissionId FROM dbo.UiRolePermission WHERE RoleId = @baRoleId;

        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'UiRoleServerAccess')
            INSERT INTO dbo.UiRoleServerAccess (RoleId, ServerId)
            SELECT @projectRoleId, ServerId FROM dbo.UiRoleServerAccess WHERE RoleId = @baRoleId;
    END
    PRINT 'UiRole BA_PROJECT inserted with the permissions of BA.';
END
GO

-- 3. Sếp của role
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiRoleManager')
BEGIN
    CREATE TABLE dbo.UiRoleManager (
        RoleId INT NOT NULL,
        UserId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedByUserId INT NULL,
        CONSTRAINT PK_UiRoleManager PRIMARY KEY (RoleId, UserId),
        CONSTRAINT FK_UiRoleManager_Role FOREIGN KEY (RoleId) REFERENCES dbo.UiRole(RoleId),
        CONSTRAINT FK_UiRoleManager_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiRoleManager_User ON dbo.UiRoleManager(UserId);
    PRINT 'UiRoleManager table created.';
END
GO

-- 4. Mỗi role một sếp
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_UiRoleManager_Role' AND object_id = OBJECT_ID('dbo.UiRoleManager'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.UiRoleManager GROUP BY RoleId HAVING COUNT(*) > 1)
        PRINT 'UiRoleManager: some roles have more than one manager. Keep one manager per role, then run this script again.';
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_UiRoleManager_Role ON dbo.UiRoleManager(RoleId);
        PRINT 'UiRoleManager: one manager per role (unique index created).';
    END
END
GO
