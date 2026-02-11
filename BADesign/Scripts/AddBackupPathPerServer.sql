-- =============================================
-- Thêm cột BackupPath cho từng server (đường dẫn backup/restore trên server hoặc UNC)
-- Giống SQL Studio: mỗi server có thể có đường dẫn backup riêng.
-- Nếu NULL thì dùng DatabaseBackupPath trong Web.config.
-- Chạy script này trước khi dùng Backup/Restore theo từng server.
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.BaDatabaseServer') AND name = 'BackupPath'
)
BEGIN
    ALTER TABLE dbo.BaDatabaseServer ADD BackupPath NVARCHAR(500) NULL;
    PRINT 'BaDatabaseServer.BackupPath added.';
END
ELSE
    PRINT 'BaDatabaseServer.BackupPath already exists.';
GO
