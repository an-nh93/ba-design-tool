-- =============================================
-- Thêm cột RestorePath cho từng server (đường dẫn đọc file .bak khi restore)
-- Backup: ghi file vào BackupPath. Restore: đọc file từ RestorePath (nếu có), không thì dùng BackupPath.
-- VD: BackupPath = E:\...\Backup (trên máy SQL), RestorePath = \\Hrs05\sqlbak\RestoreDB (share chứa file restore).
-- Chạy script này sau AddBackupPathPerServer.sql
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.BaDatabaseServer') AND name = 'RestorePath'
)
BEGIN
    ALTER TABLE dbo.BaDatabaseServer ADD RestorePath NVARCHAR(500) NULL;
    PRINT 'BaDatabaseServer.RestorePath added.';
END
ELSE
    PRINT 'BaDatabaseServer.RestorePath already exists.';
GO
