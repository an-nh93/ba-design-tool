-- =============================================
-- Đánh dấu đã đọc thông báo theo từng user (user nào tắt chỉ ẩn với user đó).
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BaJobDismissedByUser')
BEGIN
    CREATE TABLE dbo.BaJobDismissedByUser (
        JobId INT NOT NULL,
        UserId INT NOT NULL,
        DismissedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT PK_BaJobDismissedByUser PRIMARY KEY (JobId, UserId)
    );
    CREATE INDEX IX_BaJobDismissedByUser_UserId ON dbo.BaJobDismissedByUser(UserId);
    PRINT 'BaJobDismissedByUser table created.';
END
GO
