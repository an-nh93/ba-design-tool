-- Kiểm tra xem cột đã tồn tại chưa
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[UiUser]') 
    AND name = 'AvatarPath'
)
BEGIN
    ALTER TABLE [dbo].[UiUser]
    ADD AvatarPath NVARCHAR(500) NULL;
    
    PRINT 'Column AvatarPath added successfully.';
END
ELSE
BEGIN
    PRINT 'Column AvatarPath already exists.';
END
GO
