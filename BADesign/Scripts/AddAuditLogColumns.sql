-- =============================================
-- Mở rộng UiUserActionLog: UserName, UserAgent để audit rõ client (ai, thiết bị gì, IP, thời gian).
-- Chạy sau khi đã có bảng UiUserActionLog (AddDatabaseRestoreAndResetLog.sql).
-- =============================================

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'UiUserActionLog')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UiUserActionLog') AND name = 'UserName')
        ALTER TABLE dbo.UiUserActionLog ADD UserName NVARCHAR(128) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UiUserActionLog') AND name = 'UserAgent')
        ALTER TABLE dbo.UiUserActionLog ADD UserAgent NVARCHAR(512) NULL;
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UiUserActionLog') AND name = 'IX_UiUserActionLog_ActionCode')
        CREATE INDEX IX_UiUserActionLog_ActionCode ON dbo.UiUserActionLog(ActionCode);
    PRINT 'UiUserActionLog: UserName, UserAgent columns and ActionCode index added.';
END
GO
