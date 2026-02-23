-- Thêm cột ShortCode để dùng link ngắn trong email Forgot Password
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UiPasswordResetToken') AND name = 'ShortCode')
BEGIN
    ALTER TABLE dbo.UiPasswordResetToken ADD ShortCode NVARCHAR(16) NULL;
    CREATE UNIQUE INDEX IX_UiPasswordResetToken_ShortCode ON dbo.UiPasswordResetToken(ShortCode) WHERE ShortCode IS NOT NULL;
    PRINT 'Added ShortCode column to UiPasswordResetToken.';
END
GO
