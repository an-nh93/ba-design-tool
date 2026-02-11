-- =============================================
-- Thêm cột DismissedAt để đánh dấu thông báo đã đọc (ẩn khỏi danh sách)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BaRestoreJob') AND name = 'DismissedAt')
BEGIN
    ALTER TABLE dbo.BaRestoreJob ADD DismissedAt DATETIME2 NULL;
    PRINT 'BaRestoreJob.DismissedAt added.';
END
GO
