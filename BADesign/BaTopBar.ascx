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
