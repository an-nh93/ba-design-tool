-- =============================================
-- UiRole: BA, CONS, DEV. Phân quyền tính năng theo role.
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiRole')
BEGIN
    CREATE TABLE dbo.UiRole (
        RoleId INT IDENTITY(1,1) PRIMARY KEY,
        Code NVARCHAR(32) NOT NULL UNIQUE,
        Name NVARCHAR(128) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );

    INSERT INTO dbo.UiRole (Code, Name) VALUES
        (N'BA', N'Business Analyst'),
        (N'CONS', N'Consultant'),
        (N'DEV', N'Developer');

    PRINT 'UiRole table created and seeded.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.UiRole WHERE Code = N'BA')
        INSERT INTO dbo.UiRole (Code, Name) VALUES (N'BA', N'Business Analyst');
    IF NOT EXISTS (SELECT 1 FROM dbo.UiRole WHERE Code = N'CONS')
        INSERT INTO dbo.UiRole (Code, Name) VALUES (N'CONS', N'Consultant');
    IF NOT EXISTS (SELECT 1 FROM dbo.UiRole WHERE Code = N'DEV')
        INSERT INTO dbo.UiRole (Code, Name) VALUES (N'DEV', N'Developer');
    IF NOT EXISTS (SELECT 1 FROM dbo.UiRole WHERE Code = N'QC')
        INSERT INTO dbo.UiRole (Code, Name) VALUES (N'QC', N'Quality Control');
        
    PRINT 'UiRole seeded if missing.';
END
GO

-- Add RoleId to UiUser (nullable for existing rows)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.UiUser') AND name = 'RoleId')
BEGIN
    ALTER TABLE dbo.UiUser ADD RoleId INT NULL;

    UPDATE dbo.UiUser SET RoleId = (SELECT TOP 1 RoleId FROM dbo.UiRole WHERE Code = N'BA') WHERE RoleId IS NULL;

    ALTER TABLE dbo.UiUser ADD CONSTRAINT FK_UiUser_RoleId
        FOREIGN KEY (RoleId) REFERENCES dbo.UiRole(RoleId);

    CREATE INDEX IX_UiUser_RoleId ON dbo.UiUser(RoleId);
    PRINT 'UiUser.RoleId added.';
END
GO
