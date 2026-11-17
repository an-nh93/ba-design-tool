-- =============================================
-- Lịch sử phiên bản của thiết kế UI Builder: mỗi lần lưu có nội dung khác trước tạo một phiên bản,
-- kèm bản gốc (baseline) khi thiết kế được tạo từ màn hình chuẩn hoặc mẫu của team.
-- Chạy lại nhiều lần không lỗi.
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiBuilderControlVersion')
BEGIN
    CREATE TABLE dbo.UiBuilderControlVersion (
        VersionId INT IDENTITY(1,1) PRIMARY KEY,
        ControlId INT NOT NULL,
        VersionNo INT NOT NULL,
        Kind NVARCHAR(16) NOT NULL DEFAULT N'save',
        Name NVARCHAR(200) NOT NULL,
        JsonConfig NVARCHAR(MAX) NOT NULL,
        ControlCount INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedByUserId INT NOT NULL,
        CONSTRAINT FK_UiBuilderControlVersion_Control FOREIGN KEY (ControlId) REFERENCES dbo.UiBuilderControl(ControlId),
        CONSTRAINT FK_UiBuilderControlVersion_User FOREIGN KEY (CreatedByUserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiBuilderControlVersion_Control ON dbo.UiBuilderControlVersion(ControlId, VersionNo);
    PRINT 'UiBuilderControlVersion table created.';
END
GO
