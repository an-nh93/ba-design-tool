-- =============================================
-- Gộp dự án mặc định "Uncategorized" vào "Chưa chọn dự án".
-- Dự án "Uncategorized" do bản cũ của AddProjectSupport.sql tạo cho từng người dùng; nhận bằng tên và mô tả mặc định.
-- Thiết kế thuộc các dự án đó thành chưa chọn dự án (ProjectId = NULL), rồi dự án được xóa mềm như ứng dụng vẫn làm.
-- Dự án người dùng tự đặt tên "Uncategorized" với mô tả khác không bị đụng tới.
-- Chạy lại nhiều lần không lỗi: lần sau không còn dòng nào để đổi.
-- =============================================

IF OBJECT_ID('dbo.UiProject', 'U') IS NOT NULL AND COL_LENGTH('dbo.UiBuilderControl', 'ProjectId') IS NOT NULL
BEGIN
    EXEC sys.sp_executesql N'
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- 1. Thiết kế (kể cả thiết kế đã xóa mềm) rời khỏi dự án mặc định
UPDATE c
SET c.ProjectId = NULL
FROM dbo.UiBuilderControl c
INNER JOIN dbo.UiProject p ON p.ProjectId = c.ProjectId
WHERE p.Name = N''Uncategorized'' AND p.Description = N''Default project for existing designs'';
PRINT CAST(@@ROWCOUNT AS VARCHAR(12)) + '' design(s) moved to no project.'';

-- 2. Xóa mềm dự án mặc định
UPDATE dbo.UiProject
SET IsDeleted = 1, UpdatedAt = SYSDATETIME()
WHERE Name = N''Uncategorized'' AND Description = N''Default project for existing designs'' AND IsDeleted = 0;
PRINT CAST(@@ROWCOUNT AS VARCHAR(12)) + '' default project(s) removed.'';

COMMIT TRANSACTION;';
END
ELSE
BEGIN
    PRINT 'Project support is not installed; nothing to merge.';
END
GO
