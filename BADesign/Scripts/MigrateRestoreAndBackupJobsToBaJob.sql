-- =============================================
-- Chạy SAU khi đã có bảng BaJob. Copy dữ liệu từ BaRestoreJob, BaBackupJob sang BaJob.
-- Id mới (không giữ Id cũ). DismissedAt không copy (user đánh dấu lại nếu cần).
-- =============================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BaRestoreJob') AND EXISTS (SELECT * FROM sys.tables WHERE name = 'BaJob')
BEGIN
    INSERT INTO dbo.BaJob (JobType, ServerId, ServerName, DatabaseName, BackupFileName, SessionId, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Message, CompletedAt)
    SELECT N'Restore', ServerId, ServerName, DatabaseName, BackupFileName, SessionId, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Message, CompletedAt
    FROM dbo.BaRestoreJob;
    PRINT 'Migrated BaRestoreJob -> BaJob.';
END
GO
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BaBackupJob') AND EXISTS (SELECT * FROM sys.tables WHERE name = 'BaJob')
BEGIN
    INSERT INTO dbo.BaJob (JobType, ServerId, ServerName, DatabaseName, FileName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Message, CompletedAt)
    SELECT N'Backup', ServerId, ServerName, DatabaseName, FileName, StartedByUserId, StartedByUserName, StartTime, Status, PercentComplete, Message, CompletedAt
    FROM dbo.BaBackupJob;
    PRINT 'Migrated BaBackupJob -> BaJob.';
END
GO
