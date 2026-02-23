-- Bảng token reset password (Forgot Password flow)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiPasswordResetToken')
BEGIN
    CREATE TABLE dbo.UiPasswordResetToken (
        Token NVARCHAR(64) NOT NULL PRIMARY KEY,
        ShortCode NVARCHAR(16) NULL,
        UserId INT NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_UiPasswordResetToken_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE UNIQUE INDEX IX_UiPasswordResetToken_ShortCode ON dbo.UiPasswordResetToken(ShortCode) WHERE ShortCode IS NOT NULL;
    CREATE INDEX IX_UiPasswordResetToken_ExpiresAt ON dbo.UiPasswordResetToken(ExpiresAt);
    PRINT 'UiPasswordResetToken table created.';
END
GO
