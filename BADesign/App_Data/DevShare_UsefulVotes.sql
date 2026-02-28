-- Bảng vote Hữu ích: 1 user 1 lần (toggle like)
-- Chạy sau DevShare_Schema.sql
-- Nếu chưa chạy, GetPost và ToggleUseful sẽ lỗi. Chạy script này trước khi dùng tính năng Hữu ích.

IF OBJECT_ID('dbo.DevShareUseful', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DevShareUseful (
        PostId INT NOT NULL,
        UserId INT NOT NULL,
        CreatedAt DATETIME2(2) NOT NULL DEFAULT SYSDATETIME(),
        PRIMARY KEY (PostId, UserId),
        CONSTRAINT FK_DevShareUseful_Post FOREIGN KEY (PostId) REFERENCES dbo.DevSharePost(Id) ON DELETE CASCADE,
        CONSTRAINT FK_DevShareUseful_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_DevShareUseful_PostId ON dbo.DevShareUseful(PostId);
END
GO
