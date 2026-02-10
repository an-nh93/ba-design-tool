-- BaAppSetting: Key-Value config cho ứng dụng (Email Ignore, v.v.)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BaAppSetting')
BEGIN
    CREATE TABLE dbo.BaAppSetting (
        [Key] NVARCHAR(128) NOT NULL PRIMARY KEY,
        [Value] NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedBy INT NULL
    );
    PRINT 'BaAppSetting table created.';
END
GO

-- Thêm permission Settings
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'Settings')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES
        (N'Settings', N'Settings', N'Cấu hình hệ thống (Email Ignore, v.v.)');
    PRINT 'UiPermission Settings added.';
END
GO
