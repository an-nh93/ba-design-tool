-- =============================================
-- BA Database Search: Bảng lưu thông tin server
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BaDatabaseServer')
BEGIN
    CREATE TABLE dbo.BaDatabaseServer (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServerName NVARCHAR(256) NOT NULL,
        Port INT NULL,
        Username NVARCHAR(128) NOT NULL,
        Password NVARCHAR(256) NOT NULL,
        DisplayName NVARCHAR(200) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL
    );

    CREATE INDEX IX_BaDatabaseServer_IsActive ON dbo.BaDatabaseServer(IsActive);

    PRINT 'BaDatabaseServer table created successfully.';
END
ELSE
BEGIN
    PRINT 'BaDatabaseServer table already exists.';
END
GO
