-- =============================================
-- Add Project Support to UI Builder
-- =============================================

-- 1. Create Project table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UiProject')
BEGIN
    CREATE TABLE dbo.UiProject (
        ProjectId INT IDENTITY(1,1) PRIMARY KEY,
        OwnerUserId INT NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_UiProject_OwnerUserId FOREIGN KEY (OwnerUserId) REFERENCES dbo.UiUser(UserId)
    );
    
    CREATE INDEX IX_UiProject_OwnerUserId ON dbo.UiProject(OwnerUserId, IsDeleted);
END
GO

-- 2. Add ProjectId column to UiBuilderControl (nullable for backward compatibility)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UiBuilderControl') AND name = 'ProjectId')
BEGIN
    ALTER TABLE dbo.UiBuilderControl
    ADD ProjectId INT NULL;
    
    ALTER TABLE dbo.UiBuilderControl
    ADD CONSTRAINT FK_UiBuilderControl_ProjectId FOREIGN KEY (ProjectId) REFERENCES dbo.UiProject(ProjectId);
    
    CREATE INDEX IX_UiBuilderControl_ProjectId ON dbo.UiBuilderControl(ProjectId, IsDeleted);
END
GO

-- 3. Create default "Uncategorized" project for each existing user
INSERT INTO dbo.UiProject (OwnerUserId, Name, Description, CreatedAt)
SELECT DISTINCT OwnerUserId, N'Uncategorized', N'Default project for existing designs', SYSDATETIME()
FROM dbo.UiBuilderControl
WHERE IsDeleted = 0
  AND OwnerUserId NOT IN (SELECT DISTINCT OwnerUserId FROM dbo.UiProject WHERE Name = N'Uncategorized')
GO

-- 4. Update existing controls to use "Uncategorized" project
UPDATE c
SET c.ProjectId = p.ProjectId
FROM dbo.UiBuilderControl c
INNER JOIN dbo.UiProject p ON c.OwnerUserId = p.OwnerUserId AND p.Name = N'Uncategorized'
WHERE c.ProjectId IS NULL AND c.IsDeleted = 0
GO

PRINT 'Project support added successfully!';
