-- =============================================
-- Bảng job restore chạy nền — hiển thị tại chuông thông báo
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BaRestoreJob')
BEGIN
    CREATE TABLE dbo.BaRestoreJob (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServerId INT NOT NULL,
        ServerName NVARCHAR(256) NOT NULL,
        DatabaseName NVARCHAR(128) NOT NULL,
        BackupFileName NVARCHAR(512) NULL,
        StartedByUserId INT NOT NULL,
        StartedByUserName NVARCHAR(128) NULL,
        StartTime DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        SessionId INT NULL,
        Status NVARCHAR(32) NOT NULL DEFAULT N'Running',
        PercentComplete INT NOT NULL DEFAULT 0,
        Message NVARCHAR(MAX) NULL,
        CompletedAt DATETIME2 NULL
    );
    CREATE INDEX IX_BaRestoreJob_Status ON dbo.BaRestoreJob(Status);
    CREATE INDEX IX_BaRestoreJob_SessionId ON dbo.BaRestoreJob(SessionId);
    CREATE INDEX IX_BaRestoreJob_StartTime ON dbo.BaRestoreJob(StartTime);
    PRINT 'BaRestoreJob table created.';
END
GO
