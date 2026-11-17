-- =============================================
-- BaJob: chi tiết tiến độ (ProgressDetail) và nhịp sống (HeartbeatAt)
-- Chạy lại nhiều lần không lỗi. Chưa chạy script này thì tiến độ vẫn hoạt động,
-- chỉ thiếu dòng chi tiết khi job chạy trong Worker.
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BaJob') AND name = 'ProgressDetail')
BEGIN
    ALTER TABLE dbo.BaJob ADD ProgressDetail NVARCHAR(400) NULL;
    PRINT 'BaJob.ProgressDetail added.';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BaJob') AND name = 'HeartbeatAt')
BEGIN
    ALTER TABLE dbo.BaJob ADD HeartbeatAt DATETIME2 NULL;
    PRINT 'BaJob.HeartbeatAt added.';
END
GO
