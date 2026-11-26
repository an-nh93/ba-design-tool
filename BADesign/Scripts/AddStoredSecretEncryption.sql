-- =============================================
-- Mã hóa bí mật đang lưu: nới cột BaDatabaseServer.Password
-- Mật khẩu ở dạng đã mã hóa ("enc:v1:...") dài hơn dạng thường: mật khẩu SQL Server 128 ký tự cần tới 607 ký tự,
-- cột ban đầu chỉ có 256. Chạy script này trước khi bật "Mã hóa dữ liệu nhạy cảm" ở trang Cài đặt.
-- Chạy lại nhiều lần không lỗi. Bản web cũ vẫn đọc được cột sau khi nới.
-- =============================================

IF COL_LENGTH('dbo.BaDatabaseServer', 'Password') IS NULL
BEGIN
    PRINT 'BaDatabaseServer.Password not found: run AddBaDatabaseSearch.sql first.';
END
ELSE IF COL_LENGTH('dbo.BaDatabaseServer', 'Password') BETWEEN 0 AND 2047
BEGIN
    ALTER TABLE dbo.BaDatabaseServer ALTER COLUMN Password NVARCHAR(1024) NOT NULL;
    PRINT 'BaDatabaseServer.Password widened to NVARCHAR(1024).';
END
ELSE
BEGIN
    PRINT 'BaDatabaseServer.Password is already wide enough.';
END
GO
