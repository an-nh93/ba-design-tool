-- Thêm quyền PGPTool
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'PGPTool')
    INSERT INTO dbo.UiPermission (Code, Name, [Description]) VALUES (N'PGPTool', N'PGP Tool', N'Xuất key, mã hóa và giải mã file PGP');
GO
