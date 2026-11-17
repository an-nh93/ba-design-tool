-- =============================================
-- BaJob: hàng đợi và nhịp sống cho bộ chạy job dùng chung (site web hoặc BADesign.Worker)
-- QueueName: hàng đợi của job. NULL là job cho BADesign.Worker; job chạy trong site web mang tên máy và tên site IIS.
-- RunnerId: bộ chạy đang giữ job. HeartbeatAt: nhịp sống gần nhất của job đang chạy.
-- Chạy lại nhiều lần không lỗi.
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BaJob') AND name = 'QueueName')
BEGIN
    ALTER TABLE dbo.BaJob ADD QueueName NVARCHAR(200) NULL;
    PRINT 'BaJob.QueueName added.';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BaJob') AND name = 'RunnerId')
BEGIN
    ALTER TABLE dbo.BaJob ADD RunnerId NVARCHAR(100) NULL;
    PRINT 'BaJob.RunnerId added.';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BaJob') AND name = 'HeartbeatAt')
BEGIN
    ALTER TABLE dbo.BaJob ADD HeartbeatAt DATETIME2 NULL;
    PRINT 'BaJob.HeartbeatAt added.';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.BaJob') AND name = 'IX_BaJob_Status_Queue')
BEGIN
    CREATE NONCLUSTERED INDEX IX_BaJob_Status_Queue ON dbo.BaJob (Status, QueueName)
        INCLUDE (JobType, ServerName, DatabaseName, RunnerId, HeartbeatAt, StartTime);
    PRINT 'IX_BaJob_Status_Queue created.';
END
GO
