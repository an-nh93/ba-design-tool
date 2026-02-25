-- =============================================
-- Lịch sử thay đổi trạng thái + Comment theo mốc thời gian cho Feedback
-- =============================================

-- UiFeedbackStatusHistory: mỗi lần đổi trạng thái
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiFeedbackStatusHistory')
BEGIN
    CREATE TABLE dbo.UiFeedbackStatusHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FeedbackId INT NOT NULL,
        FromStatus NVARCHAR(32) NULL,
        ToStatus NVARCHAR(32) NOT NULL,
        ChangedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        ChangedByUserId INT NULL,
        Note NVARCHAR(512) NULL,
        CONSTRAINT FK_UiFeedbackStatusHistory_Feedback FOREIGN KEY (FeedbackId) REFERENCES dbo.UiFeedback(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UiFeedbackStatusHistory_User FOREIGN KEY (ChangedByUserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiFeedbackStatusHistory_FeedbackId ON dbo.UiFeedbackStatusHistory(FeedbackId);
    CREATE INDEX IX_UiFeedbackStatusHistory_ChangedAt ON dbo.UiFeedbackStatusHistory(ChangedAt);
    PRINT 'UiFeedbackStatusHistory table created.';
END
GO

-- UiFeedbackComment: comment theo từng bước (admin/user)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiFeedbackComment')
BEGIN
    CREATE TABLE dbo.UiFeedbackComment (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FeedbackId INT NOT NULL,
        UserId INT NOT NULL,
        Content NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_UiFeedbackComment_Feedback FOREIGN KEY (FeedbackId) REFERENCES dbo.UiFeedback(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UiFeedbackComment_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiFeedbackComment_FeedbackId ON dbo.UiFeedbackComment(FeedbackId);
    CREATE INDEX IX_UiFeedbackComment_CreatedAt ON dbo.UiFeedbackComment(CreatedAt);
    PRINT 'UiFeedbackComment table created.';
END
GO
