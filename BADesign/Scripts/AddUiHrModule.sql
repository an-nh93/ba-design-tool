-- =============================================
-- Phân hệ HR (Staffing, Payroll, ...) dùng để nhóm màn hình trong hộp Màn hình chuẩn của UI Builder:
-- danh sách phân hệ dùng chung, phân hệ của từng màn hình chuẩn, phân hệ của mẫu của team.
-- Chạy lại nhiều lần không lỗi. Dữ liệu mẫu chỉ được thêm lúc bảng vừa tạo, nên chạy lại không ghi đè
-- phần quản trị đã sửa.
-- =============================================

-- 1. Danh sách phân hệ
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiHrModule')
BEGIN
    CREATE TABLE dbo.UiHrModule (
        ModuleId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedByUserId INT NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedByUserId INT NULL,
        CONSTRAINT FK_UiHrModule_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.UiUser(UserId),
        CONSTRAINT FK_UiHrModule_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE UNIQUE INDEX UX_UiHrModule_Name ON dbo.UiHrModule(Name);

    INSERT INTO dbo.UiHrModule (Name, SortOrder)
    VALUES (N'Staffing', 1), (N'Time-Attendance', 2), (N'Payroll', 3), (N'Insurance', 4);
    PRINT 'UiHrModule table created.';
END
GO

-- 2. Phân hệ của màn hình chuẩn (khóa là key trong App_Data/BuilderTemplates/index.json)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiStandardScreenModule')
BEGIN
    CREATE TABLE dbo.UiStandardScreenModule (
        ScreenKey NVARCHAR(64) NOT NULL PRIMARY KEY,
        ModuleId INT NOT NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedByUserId INT NULL,
        CONSTRAINT FK_UiStandardScreenModule_Module FOREIGN KEY (ModuleId) REFERENCES dbo.UiHrModule(ModuleId) ON DELETE CASCADE,
        CONSTRAINT FK_UiStandardScreenModule_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiStandardScreenModule_Module ON dbo.UiStandardScreenModule(ModuleId);

    INSERT INTO dbo.UiStandardScreenModule (ScreenKey, ModuleId)
    SELECT s.ScreenKey, m.ModuleId
    FROM (VALUES
        (N'core-employee-profile', N'Staffing'),
        (N'core-transaction', N'Staffing'),
        (N'core-add-employee', N'Staffing'),
        (N'core-popup-select-employee', N'Staffing'),
        (N'core-popup-transaction-new-hire', N'Staffing'),
        (N'core-popup-transaction-edit', N'Staffing'),
        (N'core-timesheet-policy', N'Time-Attendance'),
        (N'core-overtime', N'Time-Attendance'),
        (N'core-popup-shift', N'Time-Attendance'),
        (N'core-popup-request-overtime', N'Time-Attendance'),
        (N'ess-request-overtime', N'Time-Attendance'),
        (N'ess-request-leave', N'Time-Attendance'),
        (N'ess-leave-history', N'Time-Attendance'),
        (N'ess-overtime-history', N'Time-Attendance'),
        (N'core-salary-withholding', N'Payroll'),
        (N'core-popup-salary-withholding', N'Payroll'),
        (N'coreess-tax-deductions', N'Payroll'),
        (N'coreess-tax-deductions-details', N'Payroll'),
        (N'coreess-13th-month-payment', N'Payroll'),
        (N'coreess-offcycle-approval', N'Payroll')
    ) AS s (ScreenKey, ModuleName)
    JOIN dbo.UiHrModule m ON m.Name = s.ModuleName;
    PRINT 'UiStandardScreenModule table created.';
END
GO

-- 3. Phân hệ của mẫu của team (bảng UiTemplateRequest do AddUiTemplateLibrary.sql tạo)
IF OBJECT_ID('dbo.UiTemplateRequest', 'U') IS NOT NULL AND COL_LENGTH('dbo.UiTemplateRequest', 'ModuleId') IS NULL
BEGIN
    ALTER TABLE dbo.UiTemplateRequest ADD ModuleId INT NULL
        CONSTRAINT FK_UiTemplateRequest_Module FOREIGN KEY REFERENCES dbo.UiHrModule(ModuleId) ON DELETE SET NULL;
    PRINT 'UiTemplateRequest.ModuleId column added.';
END
GO
