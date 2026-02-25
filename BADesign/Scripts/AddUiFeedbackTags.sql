-- =============================================
-- Nhãn/tag cho Feedback (lưu dạng NVARCHAR, phân tách bằng dấu phẩy)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UiFeedback') AND name = 'Tags')
BEGIN
    ALTER TABLE dbo.UiFeedback ADD Tags NVARCHAR(512) NULL;
    PRINT 'UiFeedback.Tags added.';
END
GO
