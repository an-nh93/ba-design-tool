-- Vote Hữu ích cho bình luận + cột UsefulCount
-- Chạy sau DevShare_Schema.sql

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DevShareComment') AND name = 'UsefulCount')
BEGIN
    ALTER TABLE dbo.DevShareComment ADD UsefulCount INT NOT NULL DEFAULT 0;
END
GO

IF OBJECT_ID('dbo.DevShareCommentUseful', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DevShareCommentUseful (
        CommentId INT NOT NULL,
        UserId INT NOT NULL,
        CreatedAt DATETIME2(2) NOT NULL DEFAULT SYSDATETIME(),
        PRIMARY KEY (CommentId, UserId),
        CONSTRAINT FK_DevShareCommentUseful_Comment FOREIGN KEY (CommentId) REFERENCES dbo.DevShareComment(Id) ON DELETE CASCADE,
        CONSTRAINT FK_DevShareCommentUseful_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_DevShareCommentUseful_CommentId ON dbo.DevShareCommentUseful(CommentId);
END
GO
