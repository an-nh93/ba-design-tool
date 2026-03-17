-- =============================================
-- EmailVerified: đánh dấu user đã xác thực email (OTP lần đầu).
-- UiUserOtp: lưu mã OTP 6 số gửi qua email khi đăng ký, hết hạn sau 15 phút.
-- =============================================

-- UiUser.EmailVerified (BIT, mặc định 1 cho user cũ để không bắt nhập OTP)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.UiUser') AND name = 'EmailVerified')
BEGIN
    ALTER TABLE dbo.UiUser ADD EmailVerified BIT NOT NULL DEFAULT 1;
    -- User đã tồn tại coi như đã xác thực
    UPDATE dbo.UiUser SET EmailVerified = 1 WHERE EmailVerified IS NULL;
    PRINT 'UiUser.EmailVerified added.';
END
GO

-- Bảng OTP cho xác thực email lần đầu đăng nhập
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiUserOtp')
BEGIN
    CREATE TABLE dbo.UiUserOtp (
        UserId INT NOT NULL,
        OtpCode NVARCHAR(6) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT PK_UiUserOtp PRIMARY KEY (UserId),
        CONSTRAINT FK_UiUserOtp_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId) ON DELETE CASCADE
    );
    CREATE INDEX IX_UiUserOtp_ExpiresAt ON dbo.UiUserOtp(ExpiresAt);
    PRINT 'UiUserOtp table created.';
END
GO
