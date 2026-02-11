-- =============================================
-- Bảng audit: Database restore từ web tool & Reset data
-- Dùng cho: rà soát database nào đã restore bằng tool, ai reset gì và khi nào
-- =============================================

-- Restore: database nào được restore từ web tool, bởi user nào, lúc nào
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BaDatabaseRestoreLog')
BEGIN
    CREATE TABLE dbo.BaDatabaseRestoreLog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServerId INT NOT NULL,
        DatabaseName NVARCHAR(128) NOT NULL,
        RestoredByUserId INT NOT NULL,
        RestoredAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        Note NVARCHAR(500) NULL
    );
    CREATE INDEX IX_BaDatabaseRestoreLog_ServerDb ON dbo.BaDatabaseRestoreLog(ServerId, DatabaseName);
    CREATE INDEX IX_BaDatabaseRestoreLog_User ON dbo.BaDatabaseRestoreLog(RestoredByUserId);
    PRINT 'BaDatabaseRestoreLog table created.';
END
GO

-- Reset: thực hiện reset data trên database nào, user nào, lúc nào, các loại data đã reset (JSON hoặc mô tả)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BaDatabaseResetLog')
BEGIN
    CREATE TABLE dbo.BaDatabaseResetLog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServerId INT NOT NULL,
        DatabaseName NVARCHAR(128) NOT NULL,
        UserId INT NOT NULL,
        At DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        DataTypesReset NVARCHAR(MAX) NULL,  -- JSON hoặc mô tả: ["HR password","Email","Phone",...]
        Note NVARCHAR(500) NULL
    );
    CREATE INDEX IX_BaDatabaseResetLog_ServerDb ON dbo.BaDatabaseResetLog(ServerId, DatabaseName);
    CREATE INDEX IX_BaDatabaseResetLog_User ON dbo.BaDatabaseResetLog(UserId);
    PRINT 'BaDatabaseResetLog table created.';
END
GO

-- User action log (mở rộng sau): ghi log hành động user
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiUserActionLog')
BEGIN
    CREATE TABLE dbo.UiUserActionLog (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        ActionCode NVARCHAR(64) NOT NULL,
        Detail NVARCHAR(MAX) NULL,
        At DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        IpAddress NVARCHAR(64) NULL
    );
    CREATE INDEX IX_UiUserActionLog_User ON dbo.UiUserActionLog(UserId);
    CREATE INDEX IX_UiUserActionLog_At ON dbo.UiUserActionLog(At);
    PRINT 'UiUserActionLog table created.';
END
GO
