-- Dev Share: Chia sẻ kỹ năng code (tutorial + comment + đính kèm file)
-- Chạy trên DB UiBuilderDb (cùng ConnectionString với ứng dụng)

IF OBJECT_ID('dbo.DevShareCodeAttachment', 'U') IS NOT NULL DROP TABLE dbo.DevShareCodeAttachment;
IF OBJECT_ID('dbo.DevShareComment', 'U') IS NOT NULL DROP TABLE dbo.DevShareComment;
IF OBJECT_ID('dbo.DevSharePost', 'U') IS NOT NULL DROP TABLE dbo.DevSharePost;

CREATE TABLE dbo.DevSharePost (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Slug NVARCHAR(600) NOT NULL,
    Summary NVARCHAR(1000) NULL,
    Body NVARCHAR(MAX) NOT NULL,
    AuthorId INT NOT NULL,
    CreatedAt DATETIME2(2) NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2(2) NOT NULL DEFAULT SYSDATETIME(),
    PublishedAt DATETIME2(2) NULL,
    LanguageTags NVARCHAR(500) NULL,
    ViewCount INT NOT NULL DEFAULT 0,
    UsefulCount INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_DevSharePost_Author FOREIGN KEY (AuthorId) REFERENCES dbo.UiUser(UserId)
);

CREATE INDEX IX_DevSharePost_PublishedAt ON dbo.DevSharePost(PublishedAt) WHERE PublishedAt IS NOT NULL;
CREATE INDEX IX_DevSharePost_AuthorId ON dbo.DevSharePost(AuthorId);
CREATE UNIQUE INDEX IX_DevSharePost_Slug ON dbo.DevSharePost(Slug);

CREATE TABLE dbo.DevShareComment (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PostId INT NOT NULL,
    ParentId INT NULL,
    AuthorId INT NOT NULL,
    Body NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2(2) NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2(2) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_DevShareComment_Post FOREIGN KEY (PostId) REFERENCES dbo.DevSharePost(Id) ON DELETE CASCADE,
    CONSTRAINT FK_DevShareComment_Parent FOREIGN KEY (ParentId) REFERENCES dbo.DevShareComment(Id),
    CONSTRAINT FK_DevShareComment_Author FOREIGN KEY (AuthorId) REFERENCES dbo.UiUser(UserId)
);

CREATE INDEX IX_DevShareComment_PostId ON dbo.DevShareComment(PostId);

CREATE TABLE dbo.DevShareCodeAttachment (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PostId INT NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    OriginalFileName NVARCHAR(500) NOT NULL,
    StoragePath NVARCHAR(1000) NOT NULL,
    FileSizeBytes BIGINT NOT NULL,
    ContentType NVARCHAR(255) NULL,
    UploadedAt DATETIME2(2) NOT NULL DEFAULT SYSDATETIME(),
    UploadedBy INT NOT NULL,
    CONSTRAINT FK_DevShareCodeAttachment_Post FOREIGN KEY (PostId) REFERENCES dbo.DevSharePost(Id) ON DELETE CASCADE,
    CONSTRAINT FK_DevShareCodeAttachment_User FOREIGN KEY (UploadedBy) REFERENCES dbo.UiUser(UserId)
);

CREATE INDEX IX_DevShareCodeAttachment_PostId ON dbo.DevShareCodeAttachment(PostId);
