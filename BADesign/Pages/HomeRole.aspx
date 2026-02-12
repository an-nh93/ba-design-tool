<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="HomeRole.aspx.cs"
    Inherits="BADesign.Pages.HomeRole" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Home - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/jquery.signalR.min.js"></script>
    <script src="../Scripts/ba-signalr.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        .ba-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 1.5rem;
        }
        .ba-card-title { 
            font-size: 1.5rem; 
            font-weight: 600; 
            color: var(--text-primary); 
            margin-bottom: 1rem;
        }
        .ba-card-desc {
            color: var(--text-secondary);
            font-size: 0.9375rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .ba-feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
        }
        .ba-feature-card {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.2s;
            text-decoration: none;
            display: block;
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
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        .ba-feature-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        .ba-feature-desc {
            color: var(--text-muted);
            font-size: 0.875rem;
            line-height: 1.5;
        }
        /* Account Settings Modal */
        .account-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            overflow-y: auto;
            padding: 2rem;
            box-sizing: border-box;
        }
        .account-modal.show { display: flex; }
        .account-modal-content {
            background: var(--bg-card);
            border-radius: 12px;
            width: 90%;
            max-width: 640px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: modalSlideIn 0.2s ease-out;
        }
        @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .account-modal-header {
            padding: 1.5rem 2rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        .account-modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .account-modal-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        .account-modal-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        .account-modal-tabs {
            display: flex;
            border-bottom: 1px solid var(--border);
            padding: 0 2rem;
            flex-shrink: 0;
        }
        .account-modal-tab {
            padding: 1rem 1.5rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
            position: relative;
            top: 1px;
        }
        .account-modal-tab:hover { color: var(--text-primary); }
        .account-modal-tab.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }
        .account-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
        }
        .account-section {
            margin-bottom: 2rem;
        }
        .account-section:last-child { margin-bottom: 0; }
        .account-section-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        .account-field {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 0;
            border-bottom: 1px solid var(--border);
        }
        .account-field:last-child { border-bottom: none; }
        .account-field-label {
            font-size: 0.875rem;
            color: var(--text-primary);
            font-weight: 500;
        }
        .account-field-value {
            font-size: 0.875rem;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .account-profile-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .account-avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            font-weight: 600;
            flex-shrink: 0;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-sizing: border-box;
            overflow: hidden;
        }
        .account-avatar[style*="background-image"] {
            background-color: transparent !important;
        }
        .account-profile-info { flex: 1; }
        .account-profile-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }
        .account-form-group { margin-bottom: 1.5rem; }
        .account-form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        .account-form-input {
            width: 100%;
            padding: 0.75rem;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }
        .account-form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
        }
        .account-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .account-badge-success {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }
        .account-badge-default {
            background: rgba(107, 114, 128, 0.2);
            color: var(--text-secondary);
        }
        .account-badge-danger {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        .account-avatar-container {
            position: relative;
            display: inline-block;
        }
        .account-avatar-upload-btn {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 24px;
            height: 24px;
            background: var(--primary);
            border: 2px solid var(--bg-card);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.75rem;
        }
        .account-tab-content { display: block; }
        .btn {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn-primary {
            background: var(--primary);
            color: white;
        }
        .btn-primary:hover { background: var(--primary-hover); }
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
                                <div class="ba-feature-title">UI Builder</div>
                                <div class="ba-feature-desc">Thiết kế và tạo giao diện người dùng. Tạo controls, forms, và các component UI.</div>
                            </asp:HyperLink>
                            <asp:HyperLink ID="lnkFeatureDbSearch" runat="server" CssClass="ba-feature-card" NavigateUrl="~/DatabaseSearch">
                                <div class="ba-feature-icon">🔍</div>
                                <div class="ba-feature-title">Database Search</div>
                                <div class="ba-feature-desc">Tìm kiếm và quản lý database connections. Quét server, xem danh sách database, copy connection string.</div>
                            </asp:HyperLink>
                            <asp:PlaceHolder ID="phFeatureEncryptDecrypt" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureEncryptDecrypt" runat="server" CssClass="ba-feature-card" NavigateUrl="~/EncryptDecrypt">
                                    <div class="ba-feature-icon">🔐</div>
                                    <div class="ba-feature-title">Encrypt/Decrypt Data</div>
                                    <div class="ba-feature-desc">Mã hóa / giải mã đơn, tạo script Demo Reset (phone, email, lương) theo nhân viên.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phFeatureAppSettings" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureAppSettings" runat="server" CssClass="ba-feature-card" NavigateUrl="~/AppSettings">
                                    <div class="ba-feature-icon">⚙️</div>
                                    <div class="ba-feature-title">App Settings</div>
                                    <div class="ba-feature-desc">Cấu hình hệ thống: Email Ignore (HR Multi-DB), v.v.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:HyperLink ID="lnkFeaturePgpTool" runat="server" CssClass="ba-feature-card" NavigateUrl="~/PgpTool">
                                <div class="ba-feature-icon">🧰</div>
                                <div class="ba-feature-title">PGP Tool</div>
                                <div class="ba-feature-desc">Xuất key .asc, mã hóa và giải mã file PGP.</div>
                            </asp:HyperLink>
                            <asp:PlaceHolder ID="phNoFeatures" runat="server" Visible="false">
                                <div class="ba-feature-card disabled" style="grid-column: 1 / -1; text-align: center; opacity: 1;">
                                    <div class="ba-feature-icon">📋</div>
                                    <div class="ba-feature-title">Chưa có quyền chức năng</div>
                                    <div class="ba-feature-desc">Bạn chưa được gán quyền nào. Liên hệ Super Admin để được cấp quyền (Role hoặc quyền riêng lẻ trong Edit User).</div>
                                </div>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phSuperAdminCards" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureUserManagement" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Users">
                                    <div class="ba-feature-icon">👥</div>
                                    <div class="ba-feature-title">User Management</div>
                                    <div class="ba-feature-desc">Quản lý user: thêm, sửa, đổi mật khẩu, gán role và quyền riêng lẻ.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureRolePermission" runat="server" CssClass="ba-feature-card" NavigateUrl="~/RolePermission">
                                    <div class="ba-feature-icon">🛡</div>
                                    <div class="ba-feature-title">Role Permission</div>
                                    <div class="ba-feature-desc">Định nghĩa quyền theo Role (BA, CONS, DEV, QC) và cấu hình UIBuilder, Database Search, EncryptDecrypt, HR Helper.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureLeaveManager" runat="server" CssClass="ba-feature-card" NavigateUrl="~/LeaveManager">
                                    <div class="ba-feature-icon">📅</div>
                                    <div class="ba-feature-title">Leave Manager</div>
                                    <div class="ba-feature-desc">Quản lý lịch nghỉ phép team. Xem hôm nay bao nhiêu NV nghỉ, ai làm.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <!-- Account Settings Modal -->
        <div class="account-modal" id="accountModal">
            <div class="account-modal-content">
                <div class="account-modal-header">
                    <h3 class="account-modal-title">Account Settings</h3>
                    <button type="button" class="account-modal-close" onclick="hideAccountModal(); return false;">×</button>
                </div>
                <div class="account-modal-tabs">
                    <button class="account-modal-tab active" data-tab="account" onclick="switchAccountTab(event, 'account'); return false;">Account</button>
                    <button class="account-modal-tab" data-tab="security" onclick="switchAccountTab(event, 'security'); return false;">Security</button>
                </div>
                <div class="account-modal-body">
                    <div id="accountTabContent" class="account-tab-content">
                        <div class="account-profile-header">
                            <div class="account-avatar-container">
                                <div class="account-avatar" id="accountAvatar">
                                    <img id="accountAvatarImg" src="" alt="Avatar" style="display: none; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
                                </div>
                                <label for="avatarUpload" class="account-avatar-upload-btn" title="Upload avatar">
                                    <input type="file" id="avatarUpload" accept="image/*" style="display: none;" />
                                    <span>📷</span>
                                </label>
                            </div>
                            <div class="account-profile-info">
                                <div class="account-profile-name" id="accountFullName"></div>
                                <div class="account-field-value" id="accountEmail"></div>
                            </div>
                        </div>
                        <div class="account-section">
                            <div class="account-section-title">Account Information</div>
                            <div class="account-field">
                                <span class="account-field-label">User ID</span>
                                <span class="account-field-value" id="accountUserId"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Username</span>
                                <span class="account-field-value" id="accountUserName"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Full Name</span>
                                <span class="account-field-value" id="accountFullName2"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Email</span>
                                <span class="account-field-value" id="accountEmail2"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Role</span>
                                <span class="account-field-value" id="accountRole"></span>
                            </div>
                            <div class="account-field">
                                <span class="account-field-label">Status</span>
                                <span class="account-field-value" id="accountStatus"></span>
                            </div>
                        </div>
                    </div>
                    <div id="securityTabContent" class="account-tab-content" style="display: none;">
                        <div class="account-section">
                            <div class="account-section-title">Change Password</div>
                            <form id="changePasswordForm">
                                <div class="account-form-group">
                                    <label class="account-form-label" for="txtModalCurrentPassword">Current Password</label>
                                    <input type="password" id="txtModalCurrentPassword" class="account-form-input" />
                                </div>
                                <div class="account-form-group">
                                    <label class="account-form-label" for="txtModalNewPassword">New Password</label>
                                    <input type="password" id="txtModalNewPassword" class="account-form-input" />
                                </div>
                                <div class="account-form-group">
                                    <label class="account-form-label" for="txtModalConfirmPassword">Confirm New Password</label>
                                    <input type="password" id="txtModalConfirmPassword" class="account-form-input" />
                                </div>
                                <div class="account-form-group">
                                    <button type="button" class="btn btn-primary" onclick="changePassword(); return false;">Change Password</button>
                                </div>
                                <div id="passwordMessage" style="margin-top: 1rem; display: none;"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <script>
        function showAccountModal(tab) {
            var modal = document.getElementById('accountModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            if (!tab) tab = 'account';
            switchAccountTab(null, tab);
        }
        function loadAccountInfo(retryCount) {
            var modal = document.getElementById('accountModal');
            if (!modal || !modal.classList.contains('show')) return;
            retryCount = retryCount || 0;
            var maxRetries = 5;
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HomeRole.aspx/GetAccountInfo") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                success: function(response) {
                    if (response.d && response.d.success) {
                        var data = response.d;
                        var userName = data.userName || '';
                        var avatarEl = document.getElementById('accountAvatar');
                        if (!avatarEl) {
                            if (retryCount < maxRetries) {
                                setTimeout(function() { loadAccountInfo(retryCount + 1); }, 100);
                            }
                            return;
                        }
                        if (data.avatarPath) {
                            var avatarUrl = data.avatarPath + '?t=' + new Date().getTime();
                            avatarEl.style.backgroundImage = 'url(' + avatarUrl + ')';
                            avatarEl.style.backgroundSize = 'cover';
                            avatarEl.style.backgroundPosition = 'center';
                            avatarEl.style.backgroundRepeat = 'no-repeat';
                            avatarEl.style.backgroundColor = 'transparent';
                            avatarEl.textContent = '';
                            var avatarImg = document.getElementById('accountAvatarImg');
                            if (avatarImg) avatarImg.style.display = 'none';
                        } else {
                            avatarEl.style.backgroundImage = '';
                            avatarEl.style.backgroundColor = 'var(--primary)';
                            avatarEl.textContent = userName.length > 0 ? userName.substring(0, 1).toUpperCase() : '';
                            var avatarImg = document.getElementById('accountAvatarImg');
                            if (avatarImg) avatarImg.style.display = 'none';
                        }
                        var accountFullName = document.getElementById('accountFullName');
                        var accountEmail = document.getElementById('accountEmail');
                        if (accountFullName) accountFullName.textContent = data.fullName || data.userName || '';
                        if (accountEmail) accountEmail.innerHTML = data.email || '<em>Not set</em>';
                        var accountUserId = document.getElementById('accountUserId');
                        var accountUserName = document.getElementById('accountUserName');
                        var accountFullName2 = document.getElementById('accountFullName2');
                        var accountEmail2 = document.getElementById('accountEmail2');
                        if (accountUserId) accountUserId.textContent = data.userId || '';
                        if (accountUserName) accountUserName.textContent = data.userName || '';
                        if (accountFullName2) accountFullName2.innerHTML = data.fullName2 || '<em>Not set</em>';
                        if (accountEmail2) accountEmail2.innerHTML = data.email || '<em>Not set</em>';
                        var roleBadge = data.isSuperAdmin 
                            ? '<span class="account-badge account-badge-success">Super Admin</span>' 
                            : (data.roleCode ? '<span class="account-badge account-badge-default">' + data.roleCode + '</span>' : '<span class="account-badge account-badge-default">User</span>');
                        var accountRole = document.getElementById('accountRole');
                        if (accountRole) accountRole.innerHTML = roleBadge;
                        var statusBadge = data.isActive 
                            ? '<span class="account-badge account-badge-success">Active</span>' 
                            : '<span class="account-badge account-badge-danger">Inactive</span>';
                        var accountStatus = document.getElementById('accountStatus');
                        if (accountStatus) accountStatus.innerHTML = statusBadge;
                    }
                },
                error: function() {
                    console.error('Failed to load account info');
                }
            });
        }
        function hideAccountModal(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var modal = document.getElementById('accountModal');
            modal.classList.remove('show');
            document.body.style.overflow = '';
            return false;
        }
        function switchAccountTab(e, tab) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            document.querySelectorAll('.account-modal-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            document.querySelector('.account-modal-tab[data-tab="' + tab + '"]').classList.add('active');
            document.getElementById('accountTabContent').style.display = tab === 'account' ? 'block' : 'none';
            document.getElementById('securityTabContent').style.display = tab === 'security' ? 'block' : 'none';
            if (tab === 'account') {
                loadAccountInfo();
            }
            return false;
        }
        document.getElementById('accountModal').addEventListener('click', function(e) {
            if (e.target === this) {
                hideAccountModal();
            }
        });
        document.getElementById('avatarUpload').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB.');
                return;
            }
            var formData = new FormData();
            formData.append('file', file);
            $.ajax({
                url: '/Handlers/UploadAvatar.ashx',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function(response) {
                    if (response && response.success) {
                        var avatarUrl = response.avatarPath + '?t=' + new Date().getTime();
                        var modal = document.getElementById('accountModal');
                        if (modal && modal.classList.contains('show')) {
                            var avatarEl = document.getElementById('accountAvatar');
                            if (avatarEl) {
                                avatarEl.style.backgroundImage = 'url(' + avatarUrl + ')';
                                avatarEl.style.backgroundSize = 'cover';
                                avatarEl.style.backgroundPosition = 'center';
                                avatarEl.style.backgroundRepeat = 'no-repeat';
                                avatarEl.style.backgroundColor = 'transparent';
                                avatarEl.textContent = '';
                                var avatarImg = document.getElementById('accountAvatarImg');
                                if (avatarImg) avatarImg.style.display = 'none';
                            }
                            loadAccountInfo();
                        }
                        var topBarAvatars = document.querySelectorAll('.user-avatar');
                        topBarAvatars.forEach(function(avatarEl) {
                            avatarEl.innerHTML = '<img src="' + avatarUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />';
                        });
                    } else {
                        alert(response && response.message ? response.message : 'Failed to upload avatar.');
                    }
                },
                error: function(xhr) {
                    var errorMsg = 'Failed to upload avatar.';
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.message) errorMsg = response.message;
                    } catch(e) {
                        if (xhr.responseText) {
                            errorMsg += ' ' + xhr.responseText.substring(0, 200);
                        }
                    }
                    alert(errorMsg);
                }
            });
        });
        function changePassword() {
            var currentPassword = document.getElementById('txtModalCurrentPassword').value;
            var newPassword = document.getElementById('txtModalNewPassword').value;
            var confirmPassword = document.getElementById('txtModalConfirmPassword').value;
            var messageDiv = document.getElementById('passwordMessage');
            if (!currentPassword || !newPassword || !confirmPassword) {
                messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">Please fill in all fields.</div>';
                messageDiv.style.display = 'block';
                return;
            }
            if (newPassword !== confirmPassword) {
                messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">New password and confirmation do not match.</div>';
                messageDiv.style.display = 'block';
                return;
            }
            if (newPassword.length < 6) {
                messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">Password must be at least 6 characters.</div>';
                messageDiv.style.display = 'block';
                return;
            }
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HomeRole.aspx/ChangePassword") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                }),
                success: function(response) {
                    if (response.d && response.d.success) {
                        messageDiv.innerHTML = '<div style="color: #10b981; font-size: 0.875rem;">Password changed successfully!</div>';
                        messageDiv.style.display = 'block';
                        document.getElementById('txtModalCurrentPassword').value = '';
                        document.getElementById('txtModalNewPassword').value = '';
                        document.getElementById('txtModalConfirmPassword').value = '';
                        setTimeout(function() {
                            hideAccountModal();
                        }, 1500);
                    } else {
                        messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">' + (response.d && response.d.message ? response.d.message : 'Failed to change password.') + '</div>';
                        messageDiv.style.display = 'block';
                    }
                },
                error: function(xhr) {
                    var errorMsg = 'Failed to change password.';
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.Message) errorMsg = response.Message;
                        else if (response.d && response.d.message) errorMsg = response.d.message;
                    } catch(e) {}
                    messageDiv.innerHTML = '<div style="color: #ef4444; font-size: 0.875rem;">' + errorMsg + '</div>';
                    messageDiv.style.display = 'block';
                }
            });
        }
        (function() {
            var apiBase = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>';
            var DISMISSED_KEY = 'baDismissedJobIds';
            var MSG_MAX = 120;
            function getDismissed() { try { var r = localStorage.getItem(DISMISSED_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } }
            function addDismissed(id) { var a = getDismissed(); var key = 'j:' + id; if (a.indexOf(key) < 0) { a.push(key); localStorage.setItem(DISMISSED_KEY, JSON.stringify(a)); } }
            function isDismissed(job) { return getDismissed().indexOf('j:' + (job.id || '')) >= 0; }
            function fmtTime(v) {
                if (!v) return '—';
                var m = String(v).match(/^\/Date\((\d+)\)\/$/);
                var d = m ? new Date(parseInt(m[1], 10)) : new Date(v);
                return isNaN(d.getTime()) ? v : d.toLocaleString();
            }
            function showDetail(job) {
                var typeLabel = (job.type === 'Backup') ? 'Backup database' : ((job.type === 'Restore' || !job.type) ? 'Restore database' : (job.typeLabel || job.type));
                var dbName = (job.databaseName || job.DatabaseName || '').trim();
                var isRestore = (job.type === 'Restore' || !job.type);
                var hasReset = isRestore && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0;
                var resetBadge = '';
                if (isRestore) {
                    resetBadge = hasReset ? '<span class="ba-notif-type-badge ba-notif-reset-tag">Có Reset</span>' : '<span class="ba-notif-type-badge ba-notif-no-reset-tag">Không Reset</span>';
                    if (hasReset) {
                        var srvId = job.serverId != null ? job.serverId : (job.ServerId != null ? job.ServerId : 0);
                        resetBadge += ' <button type="button" class="ba-notif-reset-info-btn" title="Xem thông tin reset (email, phone, password)" data-server-id="' + srvId + '" data-database-name="' + (dbName.replace(/"/g, '&quot;')) + '">ℹ</button>';
                    }
                }
                var html = '<table><tbody>';
                html += '<tr><th>Loại</th><td>' + (typeLabel.replace(/</g, '&lt;')) + '</td></tr>';
                html += '<tr><th>Server</th><td>' + (job.serverName || '—').replace(/</g, '&lt;') + '</td></tr>';
                html += '<tr><th>Database</th><td>' + (job.databaseName || '—').replace(/</g, '&lt;') + '</td></tr>';
                html += '<tr><th>Loại reset</th><td>' + (resetBadge || '—') + '</td></tr>';
                html += '<tr><th>Thực hiện bởi</th><td>' + (job.startedByUserName || '—').replace(/</g, '&lt;') + '</td></tr>';
                html += '<tr><th>Tiến trình</th><td>' + (job.percentComplete != null ? job.percentComplete + '%' : '—') + '</td></tr>';
                html += '<tr><th>Trạng thái</th><td>' + (job.status === 'Running' ? 'Đang chạy' : (job.status === 'Completed' ? 'Thành công' : (job.status === 'Failed' ? 'Lỗi' : job.status))) + '</td></tr>';
                html += '<tr><th>Bắt đầu</th><td>' + fmtTime(job.startTime) + '</td></tr>';
                html += '<tr><th>Kết thúc</th><td>' + fmtTime(job.completedAt) + '</td></tr>';
                if (job.backupFileName) html += '<tr><th>File backup</th><td>' + (job.backupFileName || '').replace(/</g, '&lt;') + '</td></tr>';
                html += '</tbody></table>';
                if (job.message) html += '<div class="ba-notif-full-msg">' + (job.message || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</div>';
                html += '<div id="baResetInfoPopup" class="ba-reset-info-popup" style="display:none;"></div>';
                $('#notificationDetailBody').html(html);
                $('#notificationDetailBody').off('click.baResetInfo').on('click.baResetInfo', '.ba-notif-reset-info-btn', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    var $btn = $(this), serverId = $btn.data('server-id'), dbName = $btn.data('database-name');
                    var $popup = $('#baResetInfoPopup');
                    if ($popup.length && serverId != null && dbName) {
                        $popup.html('<span class="ba-reset-info-loading">Đang tải...</span>').show();
                        $.ajax({ url: apiBase + '/GetRestoreResetInfo', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ serverId: serverId, databaseName: dbName }) })
                            .done(function(res) {
                                var d = res.d || res;
                                if (d && d.success && d.resetDetail) {
                                    var raw = d.resetDetail.replace(/^Reset:\s*/i, '').trim();
                                    var rows = [];
                                    raw.split(/\s*,\s*/).forEach(function(pair) {
                                        var idx = pair.indexOf('=');
                                        if (idx > 0) {
                                            var label = pair.substring(0, idx).trim();
                                            var value = pair.substring(idx + 1).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                            var lbl = label === 'Email' ? 'Email' : label === 'Phone' ? 'Phone' : label === 'Password' ? 'Password' : label;
                                            rows.push('<div class="ba-reset-info-row"><span class="ba-reset-info-label">' + lbl + '</span><span class="ba-reset-info-value">' + value + '</span></div>');
                                        }
                                    });
                                    $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">' + (rows.length ? rows.join('') : raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</div>');
                                } else
                                    $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không có thông tin reset.</div>');
                            })
                            .fail(function() { $popup.html('<div class="ba-reset-info-title">Thông tin reset</div><div class="ba-reset-info-content">Không tải được thông tin.</div>'); });
                    }
                });
                $(document).off('click.baResetInfoClose').on('click.baResetInfoClose', function(ev) { if ($(ev.target).closest('#baResetInfoPopup').length === 0 && !$(ev.target).hasClass('ba-notif-reset-info-btn')) $('#baResetInfoPopup').hide(); });
                $('#notificationDetailModal').addClass('show').css('display', 'flex');
            }
            function loadPanel() {
                var $list = $('#restoreJobsList'), $badge = $('#restoreJobsBadge');
                if (!$list.length) return;
                $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                        var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isDismissed(j); }).sort(function(a,b) { var ta = a.startTime ? new Date(a.startTime).getTime() : 0; var tb = b.startTime ? new Date(b.startTime).getTime() : 0; return tb - ta; });
                        if (jobs.length) $badge.text(jobs.length).addClass('visible'); else $badge.removeClass('visible');
                        window.__notifJobsList = jobs;
                        var html = '';
                        jobs.forEach(function(j, idx) {
                            var st = j.status || '', msg = (j.message || '').trim(), msgShort = msg.length > MSG_MAX ? msg.substring(0, MSG_MAX) + '…' : msg;
                            var pct = j.percentComplete != null ? j.percentComplete : 0;
                            var jobType = j.type || 'Restore';
                            var typeLabel = j.typeLabel || (jobType === 'Backup' ? 'Backup' : 'Restore');
                            var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : (jobType === 'HRHelperUpdateUser') ? 'ba-notif-type-hr-user' : (jobType === 'HRHelperUpdateEmployee') ? 'ba-notif-type-hr-employee' : (jobType === 'HRHelperUpdateOther') ? 'ba-notif-type-hr-other' : '';
                            var dbName = (j.databaseName || j.DatabaseName || '').trim();
                            var hasReset = (jobType === 'Restore' && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0);
                            var resetTag = (jobType === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag" title="Restore có tích hợp Reset thông tin">Có Reset' : 'ba-notif-no-reset-tag" title="Restore không reset">Không Reset') + '</span> ') : '';
                            var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '">';
                            row += '<button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button>';
                            row += '<div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + (typeLabel.replace(/</g, '&lt;')) + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div>';
                            row += '<div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + fmtTime(j.startTime) + '</div>';
                            if (st === 'Running') row += '<div style="margin-top:6px;"><div style="background:var(--bg-darker);height:6px;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span>' + pct + '%</span></div>';
                            else if (st === 'Failed') { row += '<div class="ba-notif-msg">' + msgShort.replace(/</g, '&lt;') + '</div>'; }
                            else if (st === 'Completed') row += '<div style="margin-top:4px;color:#10b981;">Đã xong</div>';
                            row += '<a class="ba-notif-detail-link" href="#">Xem chi tiết</a></div>';
                            html += row;
                        });
                        $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                        $list.off('click.nb').on('click.nb', '.ba-notif-detail-link', function(e) { e.preventDefault(); var i = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); if (window.__notifJobsList && window.__notifJobsList[i]) showDetail(window.__notifJobsList[i]); });
                        $list.off('click.dismiss').on('click.dismiss', '.ba-notif-dismiss', function(e) {
                            e.preventDefault(); e.stopPropagation();
                            var $item = $(this).closest('.ba-notif-item'), id = parseInt($item.data('job-id'), 10);
                            if (!id) return;
                            addDismissed(id);
                            $.ajax({ url: apiBase + '/DismissJob', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: id }) });
                            $item.slideUp(200, function() { $(this).remove(); var n = $('#restoreJobsList .ba-notif-item').length; if (n) $('#restoreJobsBadge').text(n).addClass('visible'); else { $('#restoreJobsBadge').removeClass('visible'); $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } });
                        });
                    }
                });
            }
            $(function() {
                if (!$('#restoreJobsBellWrap').length) return;
                $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.jobs && d.jobs.length) {
                            var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); });
                            if (jobs.length) { $('#restoreJobsBadge').text(jobs.length).addClass('visible'); }
                        }
                    }
                });
                $('#restoreJobsBellBtn').on('click', function(e) {
                    e.stopPropagation();
                    var $p = $('#restoreJobsPanel');
                    if ($p.is(':visible')) { $p.hide(); } else { loadPanel(); $p.show(); }
                });
                $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
                $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
                $('#notificationDetailClose').on('click', function() { $('#notificationDetailModal').removeClass('show').hide(); });
                $('#notificationDetailModal').on('click', function(e) { if (e.target === this) $(this).removeClass('show').hide(); });
                if (typeof BA_SignalR !== 'undefined') {
                    BA_SignalR.onRestoreJobsUpdated(function() {
                        $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                            success: function(res) {
                                var d = res.d || res;
                                if (d && d.jobs) {
                                    var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); });
                                    if (jobs.length) { $('#restoreJobsBadge').text(jobs.length).addClass('visible'); } else { $('#restoreJobsBadge').removeClass('visible'); }
                                }
                            }
                        });
                        if ($('#restoreJobsPanel').is(':visible')) loadPanel();
                    });
                    BA_SignalR.onBackupJobsUpdated(function() {
                        $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                            success: function(res) {
                                var d = res.d || res;
                                if (d && d.jobs) {
                                    var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); });
                                    if (jobs.length) { $('#restoreJobsBadge').text(jobs.length).addClass('visible'); } else { $('#restoreJobsBadge').removeClass('visible'); }
                                }
                            }
                        });
                        if ($('#restoreJobsPanel').is(':visible')) loadPanel();
                    });
                    BA_SignalR.start('<%= ResolveUrl("~/signalr") %>', '<%= ResolveUrl("~/signalr/hubs") %>');
                }
            });
        })();
    </script>
</body>
</html>
