-- =============================================
-- Bảng job chung cho mọi loại tác vụ chạy nền (Restore, Backup, UpdateUser, UpdateEmployee, ...)
-- Hiển thị tại chuông thông báo. Phân biệt theo JobType.
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BaJob')
BEGIN
    CREATE TABLE dbo.BaJob (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        JobType NVARCHAR(32) NOT NULL,
        -- Dùng chung cho Restore/Backup (Server/Database)
        ServerId INT NULL,
        ServerName NVARCHAR(256) NULL,
        DatabaseName NVARCHAR(128) NULL,
        BackupFileName NVARCHAR(512) NULL,
        FileName NVARCHAR(512) NULL,
        SessionId INT NULL,
        -- Chung
        StartedByUserId INT NOT NULL,
        StartedByUserName NVARCHAR(128) NULL,
        StartTime DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        Status NVARCHAR(32) NOT NULL DEFAULT N'Running',
        PercentComplete INT NOT NULL DEFAULT 0,
        Message NVARCHAR(MAX) NULL,
        CompletedAt DATETIME2 NULL,
        DismissedAt DATETIME2 NULL,
        -- Mở rộng sau (UpdateUser, UpdateEmployee, ...): JSON hoặc cột thêm
        Payload NVARCHAR(MAX) NULL
    );
    CREATE INDEX IX_BaJob_JobType ON dbo.BaJob(JobType);
    CREATE INDEX IX_BaJob_Status ON dbo.BaJob(Status);
    CREATE INDEX IX_BaJob_StartTime ON dbo.BaJob(StartTime);
    CREATE INDEX IX_BaJob_SessionId ON dbo.BaJob(SessionId);
    PRINT 'BaJob table created.';
END
GO
