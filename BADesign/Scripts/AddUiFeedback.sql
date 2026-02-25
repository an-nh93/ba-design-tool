-- =============================================
-- Bảng góp ý từ người dùng (feedback). Nội dung lưu HTML từ rich editor (có thể chứa ảnh).
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiFeedback')
BEGIN
    CREATE TABLE dbo.UiFeedback (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        Title NVARCHAR(256) NOT NULL,
        Content NVARCHAR(MAX) NULL,
        Category NVARCHAR(64) NULL,
        Status NVARCHAR(32) NOT NULL DEFAULT N'New',
        PageUrl NVARCHAR(512) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL,
        AdminNote NVARCHAR(MAX) NULL,
        CONSTRAINT FK_UiFeedback_UserId FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiFeedback_UserId ON dbo.UiFeedback(UserId);
    CREATE INDEX IX_UiFeedback_Status ON dbo.UiFeedback(Status);
    CREATE INDEX IX_UiFeedback_CreatedAt ON dbo.UiFeedback(CreatedAt);
    PRINT 'UiFeedback table created.';
END
GO
