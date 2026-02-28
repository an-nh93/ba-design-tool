<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="BaTopBar.ascx.cs" Inherits="BADesign.BaTopBar" %>
<%@ Register Src="~/NotificationBell.ascx" TagName="NotificationBell" TagPrefix="uc" %>
<div class="ba-top-bar">
    <h1 class="ba-top-bar-title"><asp:Literal ID="litPageTitle" runat="server" /></h1>
    <div class="ba-top-bar-actions">
        <uc:NotificationBell ID="ucNotificationBell" runat="server" />
        <button class="theme-switcher" id="themeSwitcher" onclick="toggleTheme(event); return false;">
            <span class="theme-switcher-icon" id="themeIcon">🌙</span>
            <span id="themeText">Dark</span>
        </button>
        <div class="user-menu">
            <button class="user-menu-trigger" type="button" id="userMenuTrigger" onclick="toggleUserMenu(event); return false;">
                <div class="user-avatar"><asp:Literal ID="litUserInitial" runat="server" /></div>
                <span><asp:Literal ID="litUserName" runat="server" /></span><asp:Literal ID="litRoleBadge" runat="server" Visible="false" />
                <span>▼</span>
            </button>
            <div class="user-menu-dropdown" id="userMenuDropdown">
                <a href="#" class="menu-item" onclick="closeUserMenu(); showAccountModal('security'); return false;">🔒 Change Password</a>
                <a href="#" class="menu-item" onclick="closeUserMenu(); showAccountModal('account'); return false;">⚙️ Account Settings</a>
                <div class="menu-item" style="border-top: 1px solid var(--border); margin-top: 0.25rem; padding-top: 0.75rem;">
                    <a href="~/Login?logout=1" runat="server" style="color: inherit; text-decoration: none;" onclick="closeUserMenu();">🚪 Logout</a>
                </div>
            </div>
        </div>
    </div>
</div>
<!-- Account Settings Modal (dùng chung cho mọi trang có BaTopBar) -->
<div class="account-modal" id="accountModal">
    <div class="account-modal-content">
        <div class="account-modal-header">
            <h3 class="account-modal-title">Account Settings</h3>
            <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideAccountModal(); return false;">×</button>
        </div>
        <div class="account-modal-tabs">
            <button class="account-modal-tab active" data-tab="account" onclick="switchAccountTab(event, 'account'); return false;">Account</button>
            <button class="account-modal-tab" data-tab="security" onclick="switchAccountTab(event, 'security'); return false;">Security</button>
        </div>
        <div class="account-modal-body">
            <div id="accountTabContent" class="account-tab-content">
                <div class="account-profile-header">
                    <div class="account-avatar-container" id="accountAvatarContainer">
                        <div class="account-avatar" id="accountAvatar"></div>
                        <button type="button" class="account-avatar-remove-btn" id="avatarRemoveBaTop" title="Remove avatar">🗑</button>
                        <label for="avatarUploadBaTop" class="account-avatar-upload-btn" title="Upload avatar">
                            <input type="file" id="avatarUploadBaTop" accept="image/*" style="display: none;" />
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
                    <div class="account-field"><span class="account-field-label">User ID</span><span class="account-field-value" id="accountUserId"></span></div>
                    <div class="account-field"><span class="account-field-label">Username</span><span class="account-field-value" id="accountUserName"></span></div>
                    <div class="account-field"><span class="account-field-label">Full Name</span><span class="account-field-value" id="accountFullName2"></span></div>
                    <div class="account-field"><span class="account-field-label">Email</span><span class="account-field-value" id="accountEmail2"></span></div>
                    <div class="account-field"><span class="account-field-label">Role</span><span class="account-field-value" id="accountRole"></span></div>
                    <div class="account-field"><span class="account-field-label">Status</span><span class="account-field-value" id="accountStatus"></span></div>
                </div>
            </div>
            <div id="securityTabContent" class="account-tab-content" style="display: none;">
                <div class="account-section">
                    <div class="account-section-title">Change Password</div>
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
                        <button type="button" class="ba-btn ba-btn-primary" onclick="baTopBarChangePassword(); return false;">Change Password</button>
                    </div>
                    <div id="passwordMessageBaTop" style="margin-top: 1rem; display: none;"></div>
                </div>
            </div>
        </div>
    </div>
</div>
<script type="text/javascript">
(function() {
    var getAccountInfoUrl = '<%= ResolveUrl("~/Pages/HomeRole.aspx/GetAccountInfo") %>';
    var changePasswordUrl = '<%= ResolveUrl("~/Pages/HomeRole.aspx/ChangePassword") %>';
    var uploadAvatarUrl = '<%= ResolveUrl("~/Handlers/UploadAvatar.ashx") %>';
    var removeAvatarUrl = '<%= ResolveUrl("~/Handlers/RemoveAvatar.ashx") %>';
    function getEl(id) { return document.getElementById(id); }
    window.showAccountModal = function(tab) {
        var modal = getEl('accountModal');
        if (!modal) return;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        if (!tab) tab = 'account';
        switchAccountTab(null, tab);
    };
    window.hideAccountModal = function() {
        var modal = getEl('accountModal');
        if (modal) modal.classList.remove('show');
        document.body.style.overflow = '';
    };
    function switchAccountTab(e, tab) {
        if (e && e.preventDefault) { e.preventDefault(); e.stopPropagation(); }
        var tabs = document.querySelectorAll('.account-modal-tab');
        if (tabs) tabs.forEach(function(t) { t.classList.remove('active'); });
        var activeTab = document.querySelector('.account-modal-tab[data-tab="' + tab + '"]');
        if (activeTab) activeTab.classList.add('active');
        var accountContent = getEl('accountTabContent');
        var securityContent = getEl('securityTabContent');
        if (accountContent) accountContent.style.display = tab === 'account' ? 'block' : 'none';
        if (securityContent) securityContent.style.display = tab === 'security' ? 'block' : 'none';
        if (tab === 'account') loadAccountInfo();
    }
    window.switchAccountTab = switchAccountTab;
    function loadAccountInfo() {
        var modal = getEl('accountModal');
        if (!modal || !modal.classList.contains('show')) return;
        if (typeof jQuery === 'undefined') return;
        jQuery.ajax({ url: getAccountInfoUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: '{}',
            success: function(r) {
                var d = r.d || r;
                if (!d || !d.success) return;
                var userName = d.userName || '';
                var avatarEl = getEl('accountAvatar');
                var container = getEl('accountAvatarContainer');
                if (avatarEl) {
                    if (d.avatarPath) {
                        avatarEl.style.backgroundImage = 'url(' + d.avatarPath + '?t=' + new Date().getTime() + ')';
                        avatarEl.style.backgroundSize = 'cover';
                        avatarEl.style.backgroundPosition = 'center';
                        avatarEl.style.backgroundColor = 'transparent';
                        avatarEl.textContent = '';
                        if (container) container.classList.add('has-avatar');
                    } else {
                        avatarEl.style.backgroundImage = '';
                        avatarEl.style.backgroundColor = 'var(--primary)';
                        avatarEl.textContent = userName ? userName.substring(0, 1).toUpperCase() : '';
                        if (container) container.classList.remove('has-avatar');
                    }
                }
                var set = function(id, html) { var el = getEl(id); if (el) el.innerHTML = html !== undefined ? html : (d[id] || ''); };
                var esc = function(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
                set('accountFullName', d.fullName || d.userName ? esc(d.fullName || d.userName) : '<em>Not set</em>');
                set('accountEmail', d.email ? esc(d.email) : '<em>Not set</em>');
                set('accountUserId', (d.userId || '').toString());
                set('accountUserName', esc(d.userName));
                set('accountFullName2', (d.fullName2 || d.fullName || d.userName) ? esc(d.fullName2 || d.fullName || d.userName) : '<em>Not set</em>');
                set('accountEmail2', d.email ? esc(d.email) : '<em>Not set</em>');
                var roleBadge = d.isSuperAdmin ? '<span class="account-badge account-badge-success">Super Admin</span>' : (d.roleCode ? '<span class="account-badge account-badge-default">' + (d.roleCode + '').replace(/</g, '&lt;') + '</span>' : '<span class="account-badge account-badge-default">User</span>');
                set('accountRole', roleBadge);
                set('accountStatus', d.isActive ? '<span class="account-badge account-badge-success">Active</span>' : '<span class="account-badge account-badge-danger">Inactive</span>');
            }
        });
    }
    window.baTopBarChangePassword = function() {
        var cur = (getEl('txtModalCurrentPassword') || {}).value;
        var newP = (getEl('txtModalNewPassword') || {}).value;
        var conf = (getEl('txtModalConfirmPassword') || {}).value;
        var msgEl = getEl('passwordMessageBaTop');
        if (!cur || !newP || !conf) {
            if (msgEl) { msgEl.innerHTML = '<div style="color:#ef4444;font-size:0.875rem;">Please fill in all fields.</div>'; msgEl.style.display = 'block'; }
            return;
        }
        if (newP !== conf) {
            if (msgEl) { msgEl.innerHTML = '<div style="color:#ef4444;font-size:0.875rem;">New password and confirmation do not match.</div>'; msgEl.style.display = 'block'; }
            return;
        }
        if (newP.length < 6) {
            if (msgEl) { msgEl.innerHTML = '<div style="color:#ef4444;font-size:0.875rem;">Password must be at least 6 characters.</div>'; msgEl.style.display = 'block'; }
            return;
        }
        if (typeof jQuery === 'undefined') return;
        jQuery.ajax({ url: changePasswordUrl, type: 'POST', contentType: 'application/json; charset=utf-8', data: JSON.stringify({ currentPassword: cur, newPassword: newP }),
            success: function(r) {
                var d = r.d || r;
                if (msgEl) {
                    if (d && d.success) {
                        msgEl.innerHTML = '<div style="color:#10b981;font-size:0.875rem;">Password changed successfully!</div>';
                        var cp = getEl('txtModalCurrentPassword'); var np = getEl('txtModalNewPassword'); var cf = getEl('txtModalConfirmPassword');
                        if (cp) cp.value = ''; if (np) np.value = ''; if (cf) cf.value = '';
                    } else {
                        msgEl.innerHTML = '<div style="color:#ef4444;font-size:0.875rem;">' + (d && d.message ? (d.message + '').replace(/</g, '&lt;') : 'Failed to change password.') + '</div>';
                    }
                    msgEl.style.display = 'block';
                }
            },
            error: function(xhr) {
                var errMsg = 'Failed to change password.';
                try { var resp = JSON.parse(xhr.responseText); if (resp.d && resp.d.message) errMsg = resp.d.message; else if (resp.message) errMsg = resp.message; } catch(e) {}
                if (msgEl) { msgEl.innerHTML = '<div style="color:#ef4444;font-size:0.875rem;">' + errMsg.replace(/</g, '&lt;') + '</div>'; msgEl.style.display = 'block'; }
            }
        });
    };
    jQuery(document).ready(function() {
        var modal = getEl('accountModal');
        if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) hideAccountModal(); });
        var avatarUpload = getEl('avatarUploadBaTop');
        if (avatarUpload) avatarUpload.addEventListener('change', function(e) {
            var file = (e.target || {}).files && (e.target.files[0]);
            if (!file || !file.type.startsWith('image/')) { if (file) alert('Please select an image file.'); return; }
            if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB.'); return; }
            var fd = new FormData(); fd.append('file', file);
            jQuery.ajax({ url: uploadAvatarUrl, type: 'POST', data: fd, processData: false, contentType: false, dataType: 'json',
                success: function(res) {
                    if (res && res.success && res.avatarPath) {
                        loadAccountInfo();
                        var topBarAvatars = document.querySelectorAll('.user-avatar');
                        topBarAvatars.forEach(function(av) {
                            av.innerHTML = '<img src="' + (res.avatarPath + '?t=' + new Date().getTime()).replace(/"/g, '&quot;') + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />';
                        });
                    } else { alert((res && res.message) || 'Failed to upload avatar.'); }
                },
                error: function() { alert('Failed to upload avatar.'); }
            });
        });
        var avatarRemove = getEl('avatarRemoveBaTop');
        function doRemoveAvatar() {
            jQuery.ajax({ url: removeAvatarUrl, type: 'POST', dataType: 'json',
                success: function(res) {
                    if (res && res.success) {
                        loadAccountInfo();
                        var initial = (res.initial || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        var topBarAvatars = document.querySelectorAll('.user-avatar');
                        topBarAvatars.forEach(function(av) {
                            av.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1rem;font-weight:600;color:white;">' + initial + '</span>';
                        });
                    } else { alert((res && res.message) || 'Failed to remove avatar.'); }
                },
                error: function() { alert('Failed to remove avatar.'); }
            });
        }
        if (avatarRemove) avatarRemove.addEventListener('click', function() {
            if (typeof baConfirm === 'function') {
                baConfirm('Xóa ảnh đại diện?', doRemoveAvatar);
            } else if (confirm('Xóa ảnh đại diện?')) {
                doRemoveAvatar();
            }
        });
    });
})();
</script>
