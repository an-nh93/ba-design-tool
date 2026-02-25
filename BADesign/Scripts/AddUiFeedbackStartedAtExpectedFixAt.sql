-- =============================================
-- Thêm cột Bắt đầu xử lý, Dự kiến fix cho UiFeedback (admin cập nhật, user xem trạng thái)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UiFeedback') AND name = 'StartedAt')
BEGIN
    ALTER TABLE dbo.UiFeedback ADD StartedAt DATETIME2 NULL;
    PRINT 'UiFeedback.StartedAt added.';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UiFeedback') AND name = 'ExpectedFixAt')
BEGIN
    ALTER TABLE dbo.UiFeedback ADD ExpectedFixAt DATETIME2 NULL;
    PRINT 'UiFeedback.ExpectedFixAt added.';
END
GO
