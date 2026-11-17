-- =============================================
-- Thư viện mẫu UI dùng chung của UI Builder: quy trình duyệt theo role (bộ phận),
-- yêu cầu gửi mẫu, tiến trình duyệt từng bước và quyền quản trị mẫu.
-- Chạy lại nhiều lần không lỗi.
-- =============================================

-- 1. Quyền quản trị mẫu UI
IF NOT EXISTS (SELECT 1 FROM dbo.UiPermission WHERE Code = N'UITemplateAdmin')
BEGIN
    INSERT INTO dbo.UiPermission (Code, Name, [Description])
    VALUES (N'UITemplateAdmin', N'Quản trị mẫu UI', N'Định nghĩa quy trình duyệt mẫu UI, duyệt thay khi người duyệt vắng và gỡ mẫu khỏi thư viện chung');
    PRINT 'UiPermission UITemplateAdmin inserted.';
END
GO

-- 2. Quy trình duyệt
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiTemplateWorkflow')
BEGIN
    CREATE TABLE dbo.UiTemplateWorkflow (
        WorkflowId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(128) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        IsDefault BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedByUserId INT NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedByUserId INT NULL,
        CONSTRAINT FK_UiTemplateWorkflow_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.UiUser(UserId),
        CONSTRAINT FK_UiTemplateWorkflow_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.UiUser(UserId)
    );
    PRINT 'UiTemplateWorkflow table created.';
END
GO

-- 3. Role (bộ phận) áp dụng quy trình: mỗi role chỉ thuộc một quy trình
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiTemplateWorkflowRole')
BEGIN
    CREATE TABLE dbo.UiTemplateWorkflowRole (
        WorkflowId INT NOT NULL,
        RoleId INT NOT NULL,
        CONSTRAINT PK_UiTemplateWorkflowRole PRIMARY KEY (WorkflowId, RoleId),
        CONSTRAINT UQ_UiTemplateWorkflowRole_Role UNIQUE (RoleId),
        CONSTRAINT FK_UiTemplateWorkflowRole_Workflow FOREIGN KEY (WorkflowId) REFERENCES dbo.UiTemplateWorkflow(WorkflowId) ON DELETE CASCADE,
        CONSTRAINT FK_UiTemplateWorkflowRole_Role FOREIGN KEY (RoleId) REFERENCES dbo.UiRole(RoleId)
    );
    PRINT 'UiTemplateWorkflowRole table created.';
END
GO

-- 4. Các bước duyệt của quy trình
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiTemplateWorkflowStep')
BEGIN
    CREATE TABLE dbo.UiTemplateWorkflowStep (
        StepId INT IDENTITY(1,1) PRIMARY KEY,
        WorkflowId INT NOT NULL,
        StepNo INT NOT NULL,
        StepName NVARCHAR(128) NOT NULL,
        UseRoleManager BIT NOT NULL CONSTRAINT DF_UiTemplateWorkflowStep_UseRoleManager DEFAULT 0,
        CONSTRAINT UQ_UiTemplateWorkflowStep_No UNIQUE (WorkflowId, StepNo),
        CONSTRAINT FK_UiTemplateWorkflowStep_Workflow FOREIGN KEY (WorkflowId) REFERENCES dbo.UiTemplateWorkflow(WorkflowId) ON DELETE CASCADE
    );
    PRINT 'UiTemplateWorkflowStep table created.';
END
GO

-- 4b. Bước duyệt lấy thêm sếp của role người gửi (khai ở bảng UiRoleManager)
IF COL_LENGTH('dbo.UiTemplateWorkflowStep', 'UseRoleManager') IS NULL
BEGIN
    ALTER TABLE dbo.UiTemplateWorkflowStep ADD UseRoleManager BIT NOT NULL CONSTRAINT DF_UiTemplateWorkflowStep_UseRoleManager DEFAULT 0;
    PRINT 'UiTemplateWorkflowStep.UseRoleManager added.';
END
GO

-- 5. Người duyệt của từng bước (một người duyệt là qua bước)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiTemplateWorkflowStepApprover')
BEGIN
    CREATE TABLE dbo.UiTemplateWorkflowStepApprover (
        StepId INT NOT NULL,
        UserId INT NOT NULL,
        CONSTRAINT PK_UiTemplateWorkflowStepApprover PRIMARY KEY (StepId, UserId),
        CONSTRAINT FK_UiTemplateWorkflowStepApprover_Step FOREIGN KEY (StepId) REFERENCES dbo.UiTemplateWorkflowStep(StepId) ON DELETE CASCADE,
        CONSTRAINT FK_UiTemplateWorkflowStepApprover_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    PRINT 'UiTemplateWorkflowStepApprover table created.';
END
GO

-- 6. Yêu cầu gửi mẫu: bản chụp thiết kế lúc gửi, người gửi, kết quả duyệt
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiTemplateRequest')
BEGIN
    CREATE TABLE dbo.UiTemplateRequest (
        RequestId INT IDENTITY(1,1) PRIMARY KEY,
        SourceControlId INT NULL,
        Name NVARCHAR(200) NOT NULL,
        Category NVARCHAR(100) NULL,
        UiKind NVARCHAR(16) NULL,
        [Description] NVARCHAR(1000) NULL,
        JsonConfig NVARCHAR(MAX) NOT NULL,
        ThumbnailPath NVARCHAR(255) NULL,
        ControlCount INT NOT NULL DEFAULT 0,
        [Status] NVARCHAR(16) NOT NULL,
        SubmitterUserId INT NOT NULL,
        SubmitterRoleId INT NULL,
        SubmitNote NVARCHAR(1000) NULL,
        SubmittedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        WorkflowId INT NULL,
        WorkflowName NVARCHAR(128) NULL,
        CurrentStepNo INT NULL,
        TotalSteps INT NOT NULL DEFAULT 0,
        CompletedAt DATETIME2 NULL,
        CompletedByUserId INT NULL,
        CompletedNote NVARCHAR(1000) NULL,
        IsInLibrary BIT NOT NULL DEFAULT 0,
        ReplacedByRequestId INT NULL,
        RemovedAt DATETIME2 NULL,
        RemovedByUserId INT NULL,
        CONSTRAINT FK_UiTemplateRequest_Submitter FOREIGN KEY (SubmitterUserId) REFERENCES dbo.UiUser(UserId),
        CONSTRAINT FK_UiTemplateRequest_CompletedBy FOREIGN KEY (CompletedByUserId) REFERENCES dbo.UiUser(UserId),
        CONSTRAINT FK_UiTemplateRequest_RemovedBy FOREIGN KEY (RemovedByUserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiTemplateRequest_Status ON dbo.UiTemplateRequest([Status], CurrentStepNo);
    CREATE INDEX IX_UiTemplateRequest_Submitter ON dbo.UiTemplateRequest(SubmitterUserId, SubmittedAt);
    CREATE INDEX IX_UiTemplateRequest_Library ON dbo.UiTemplateRequest(IsInLibrary, CompletedAt);
    PRINT 'UiTemplateRequest table created.';
END
GO

-- 7. Các bước của một yêu cầu (chép từ quy trình lúc gửi) và kết quả từng bước
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiTemplateRequestStep')
BEGIN
    CREATE TABLE dbo.UiTemplateRequestStep (
        RequestStepId INT IDENTITY(1,1) PRIMARY KEY,
        RequestId INT NOT NULL,
        StepNo INT NOT NULL,
        StepName NVARCHAR(128) NOT NULL,
        [Status] NVARCHAR(16) NOT NULL,
        ActedByUserId INT NULL,
        ActedAt DATETIME2 NULL,
        Comment NVARCHAR(1000) NULL,
        CONSTRAINT UQ_UiTemplateRequestStep_No UNIQUE (RequestId, StepNo),
        CONSTRAINT FK_UiTemplateRequestStep_Request FOREIGN KEY (RequestId) REFERENCES dbo.UiTemplateRequest(RequestId) ON DELETE CASCADE,
        CONSTRAINT FK_UiTemplateRequestStep_ActedBy FOREIGN KEY (ActedByUserId) REFERENCES dbo.UiUser(UserId)
    );
    PRINT 'UiTemplateRequestStep table created.';
END
GO

-- 8. Người được duyệt ở từng bước của yêu cầu
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiTemplateRequestStepApprover')
BEGIN
    CREATE TABLE dbo.UiTemplateRequestStepApprover (
        RequestStepId INT NOT NULL,
        UserId INT NOT NULL,
        CONSTRAINT PK_UiTemplateRequestStepApprover PRIMARY KEY (RequestStepId, UserId),
        CONSTRAINT FK_UiTemplateRequestStepApprover_Step FOREIGN KEY (RequestStepId) REFERENCES dbo.UiTemplateRequestStep(RequestStepId) ON DELETE CASCADE,
        CONSTRAINT FK_UiTemplateRequestStepApprover_User FOREIGN KEY (UserId) REFERENCES dbo.UiUser(UserId)
    );
    CREATE INDEX IX_UiTemplateRequestStepApprover_User ON dbo.UiTemplateRequestStepApprover(UserId);
    PRINT 'UiTemplateRequestStepApprover table created.';
END
GO

PRINT 'UI template library is ready.';
