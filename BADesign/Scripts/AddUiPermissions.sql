-- =============================================
-- UiPermission, UiRolePermission, UiUserPermission
-- Super Admin định nghĩa quyền cho từng Role; User có thể thêm quyền riêng.
-- =============================================

-- UiPermission
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiPermission')
BEGIN
    CREATE TABLE dbo.UiPermission (
        PermissionId INT IDENTITY(1,1) PRIMARY KEY,
        Code NVARCHAR(64) NOT NULL UNIQUE,
        Name NVARCHAR(128) NOT NULL,
        [Description] NVARCHAR(256) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );

    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES
        (N'UIBuilder',      N'UI Builder',        N'Thiết kế giao diện, tạo controls/forms'),
        (N'DatabaseSearch', N'Database Search',   N'Quét server, xem danh sách database, copy connection string'),
        (N'EncryptDecrypt', N'Encrypt/Decrypt',   N'Mã hóa / giải mã dữ liệu'),
        (N'HRHelper',       N'HR Helper',         N'Quản lý User, Employee, Company trong DB HR');

    PRINT 'UiPermission table created and seeded.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'UIBuilder')
        INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES (N'UIBuilder', N'UI Builder', N'Thiết kế giao diện, tạo controls/forms');
    IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'DatabaseSearch')
        INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES (N'DatabaseSearch', N'Database Search', N'Quét server, xem danh sách database, copy connection string');
    IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'EncryptDecrypt')
        INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES (N'EncryptDecrypt', N'Encrypt/Decrypt', N'Mã hóa / giải mã dữ liệu');
    IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'HRHelper')
        INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES (N'HRHelper', N'HR Helper', N'Quản lý User, Employee, Company trong DB HR');
    PRINT 'UiPermission seeded if missing.';
END
GO

-- UiRolePermission (Role -> Permissions)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiRolePermission')
BEGIN
    CREATE TABLE dbo.UiRolePermission (
        RoleId INT NOT NULL,
        PermissionId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        PRIMARY KEY (RoleId, PermissionId),
        CONSTRAINT FK_UiRolePermission_Role FOREIGN KEY (RoleId) REFERENCES dbo.UiRole(RoleId),
        CONSTRAINT FK_UiRolePermission_Permission FOREIGN KEY (PermissionId) REFERENCES dbo.UiPermission(PermissionId)
    );
    CREATE INDEX IX_UiRolePermission_PermissionId ON dbo.UiRolePermission(PermissionId);
    PRINT 'UiRolePermission table created.';
END
GO

-- Seed default role permissions: BA, CONS, DEV
DECLARE @ridBa INT, @ridCons INT, @ridDev INT;
SELECT @ridBa = RoleId FROM dbo.UiRole WHERE Code = N'BA';
SELECT @ridCons = RoleId FROM dbo.UiRole WHERE Code = N'CONS';
SELECT @ridDev = RoleId FROM dbo.UiRole WHERE Code = N'DEV';

DECLARE @pidUI INT, @pidDb INT, @pidEnc INT, @pidHR INT;
SELECT @pidUI = PermissionId FROM dbo.UiPermission WHERE Code = N'UIBuilder';
SELECT @pidDb = PermissionId FROM dbo.UiPermission WHERE Code = N'DatabaseSearch';
SELECT @pidEnc = PermissionId FROM dbo.UiPermission WHERE Code = N'EncryptDecrypt';
SELECT @pidHR = PermissionId FROM dbo.UiPermission WHERE Code = N'HRHelper';

-- BA: UIBuilder, DatabaseSearch, HRHelper
IF @ridBa IS NOT NULL AND @pidUI IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridBa AND PermissionId = @pidUI)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridBa, @pidUI);
IF @ridBa IS NOT NULL AND @pidDb IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridBa AND PermissionId = @pidDb)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridBa, @pidDb);
IF @ridBa IS NOT NULL AND @pidHR IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridBa AND PermissionId = @pidHR)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridBa, @pidHR);

-- CONS: UIBuilder, DatabaseSearch, HRHelper
IF @ridCons IS NOT NULL AND @pidUI IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridCons AND PermissionId = @pidUI)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridCons, @pidUI);
IF @ridCons IS NOT NULL AND @pidDb IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridCons AND PermissionId = @pidDb)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridCons, @pidDb);
IF @ridCons IS NOT NULL AND @pidHR IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridCons AND PermissionId = @pidHR)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridCons, @pidHR);

-- DEV: UIBuilder, DatabaseSearch, EncryptDecrypt
IF @ridDev IS NOT NULL AND @pidUI IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridDev AND PermissionId = @pidUI)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridDev, @pidUI);
IF @ridDev IS NOT NULL AND @pidDb IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridDev AND PermissionId = @pidDb)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridDev, @pidDb);
IF @ridDev IS NOT NULL AND @pidEnc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UiRolePermission WHERE RoleId = @ridDev AND PermissionId = @pidEnc)
    INSERT INTO dbo.UiRolePermission (RoleId, PermissionId) VALUES (@ridDev, @pidEnc);

PRINT 'UiRolePermission default mappings applied.';
GO

-- UiUserPermission (User extra permissions; role permissions cannot be removed)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiUserPermission')
BEGIN
    CREATE TABLE dbo.UiUserPermission (
        UserId INT NOT NULL,
        PermissionId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        PRIMARY KEY (UserId, PermissionId),
        CONSTRAINT FK_UiUserPermission_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId),
        CONSTRAINT FK_UiUserPermission_Permission FOREIGN KEY (PermissionId) REFERENCES dbo.UiPermission(PermissionId)
    );
    CREATE INDEX IX_UiUserPermission_PermissionId ON dbo.UiUserPermission(PermissionId);
    PRINT 'UiUserPermission table created.';
END
GO
