<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="HomeRole.aspx.cs"
    Inherits="BADesign.Pages.HomeRole" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Trang chủ - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
.ba-card-desc {
            color: var(--text-secondary);
            font-size: 0.9375rem;
            line-height: 1.5;
            margin-bottom: 0.75rem;
        }
        .ba-feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 0.875rem;
            margin-top: 1rem;
        }
        .ba-feature-card {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.875rem 1rem;
            transition: all 0.2s;
            text-decoration: none;
            display: grid;
            grid-template-columns: auto 1fr;
            column-gap: 0.875rem;
            align-items: start;
            color: inherit;
        }
        .ba-feature-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
        }
        .ba-feature-card.disabled {
            opacity: 0.6;
            cursor: default;
            pointer-events: none;
        }
        .ba-feature-icon {
            font-size: 1.75rem;
            line-height: 1.2;
            grid-row: 1 / span 2;
        }
        .ba-feature-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.125rem;
        }
        .ba-feature-desc {
            color: var(--text-muted);
            font-size: 0.8125rem;
            line-height: 1.45;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-content">
                    <div class="ba-card">
                        <h2 class="ba-card-title">
                            <asp:Literal ID="litWelcomeTitle" runat="server" />
                        </h2>
                        <p class="ba-card-desc">
                            <asp:Literal ID="litWelcomeDesc" runat="server" />
                        </p>
                        <div class="ba-feature-grid">
                            <asp:HyperLink ID="lnkFeatureUIBuilder" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Home">
                                <div class="ba-feature-icon">🛠️</div>
                                <div class="ba-feature-title">Thiết kế giao diện</div>
                                <div class="ba-feature-desc">Thiết kế và tạo giao diện người dùng. Tạo controls, forms, và các component UI.</div>
                            </asp:HyperLink>
                            <asp:HyperLink ID="lnkFeatureDbSearch" runat="server" CssClass="ba-feature-card" NavigateUrl="~/DatabaseSearch">
                                <div class="ba-feature-icon">🔍</div>
                                <div class="ba-feature-title">Công cụ Database</div>
                                <div class="ba-feature-desc">Quản lý công cụ database: quét server, xem danh sách database, backup/restore, shrink log, copy connection string.</div>
                            </asp:HyperLink>
                            <asp:PlaceHolder ID="phFeatureEncryptDecrypt" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureEncryptDecrypt" runat="server" CssClass="ba-feature-card" NavigateUrl="~/EncryptDecrypt">
                                    <div class="ba-feature-icon">🔐</div>
                                    <div class="ba-feature-title">Mã hóa / Giải mã</div>
                                    <div class="ba-feature-desc">Mã hóa / giải mã đơn, tạo script Demo Reset (phone, email, lương) theo nhân viên.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phFeatureAppSettings" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureAppSettings" runat="server" CssClass="ba-feature-card" NavigateUrl="~/AppSettings">
                                    <div class="ba-feature-icon">⚙️</div>
                                    <div class="ba-feature-title">Cài đặt ứng dụng</div>
                                    <div class="ba-feature-desc">Cấu hình hệ thống: Email Server, SFTP, Telegram, Public URL, ...</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phFeatureLicenseKey" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureLicenseKey" runat="server" CssClass="ba-feature-card" NavigateUrl="~/LicenseKey">
                                    <div class="ba-feature-icon">🔑</div>
                                    <div class="ba-feature-title">Khóa bản quyền</div>
                                    <div class="ba-feature-desc">Sinh / giải mã license key HRM cho môi trường dev-debug (Trial, Limited, Permanent).</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phFeaturePgpTool" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeaturePgpTool" runat="server" CssClass="ba-feature-card" NavigateUrl="~/PgpTool">
                                    <div class="ba-feature-icon">🧰</div>
                                    <div class="ba-feature-title">Công cụ PGP</div>
                                    <div class="ba-feature-desc">Xuất key .asc, mã hóa và giải mã file PGP.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:HyperLink ID="lnkFeatureFeedback" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Feedback">
                                <div class="ba-feature-icon">💬</div>
                                <div class="ba-feature-title">Góp ý</div>
                                <div class="ba-feature-desc">Gửi ý kiến, báo lỗi hoặc đề xuất cải tiến cho HR Helper.</div>
                            </asp:HyperLink>
                            <asp:HyperLink ID="lnkFeatureCommunityShare" runat="server" CssClass="ba-feature-card" NavigateUrl="~/DevShare">
                                <div class="ba-feature-icon">📤</div>
                                <div class="ba-feature-title">Chia sẻ cộng đồng</div>
                                <div class="ba-feature-desc">Chia sẻ bài hướng dẫn code, ví dụ C#, SQL, ASP.NET... Mọi người đều có thể viết và đọc.</div>
                            </asp:HyperLink>
                            <asp:PlaceHolder ID="phNoFeatures" runat="server" Visible="false">
                                <div class="ba-feature-card disabled" style="grid-column: 1 / -1; text-align: center; opacity: 1;">
                                    <div class="ba-feature-icon">📋</div>
                                    <div class="ba-feature-title">Chưa có quyền chức năng</div>
                                    <div class="ba-feature-desc">Bạn chưa được gán quyền nào. Liên hệ Super Admin để được cấp quyền sử dụng nhiều tính năng của HR Helper.</div>
                                </div>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phSuperAdminCards" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureUserManagement" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Users">
                                    <div class="ba-feature-icon">👥</div>
                                    <div class="ba-feature-title">Quản lý người dùng</div>
                                    <div class="ba-feature-desc">Quản lý user: thêm, sửa, đổi mật khẩu, gán role và quyền riêng lẻ.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureRolePermission" runat="server" CssClass="ba-feature-card" NavigateUrl="~/RolePermission">
                                    <div class="ba-feature-icon">🛡</div>
                                    <div class="ba-feature-title">Phân quyền</div>
                                    <div class="ba-feature-desc">Định nghĩa quyền theo Role (DEV, BA, CONS, CSS, QC) và cấu hình quyền cho Thiết kế giao diện, Công cụ Database, Mã hóa / Giải mã, Trợ lý HR.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureLeaveManager" runat="server" CssClass="ba-feature-card" NavigateUrl="~/LeaveManager">
                                    <div class="ba-feature-icon">📅</div>
                                    <div class="ba-feature-title">Quản lý nghỉ phép</div>
                                    <div class="ba-feature-desc">Quản lý lịch nghỉ phép team. Xem hôm nay bao nhiêu NV nghỉ, ai làm.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                        </div>
                    </div>
                </div>
            </main>
        </div>

    </form>
</body>
</html>
