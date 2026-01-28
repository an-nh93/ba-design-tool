<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="HRHelper.aspx.cs"
    Inherits="BADesign.Pages.HRHelper" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>HR Helper - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <style>
        :root {
            --primary: #0078d4;
            --primary-hover: #006bb3;
            --primary-light: #0D9EFF;
            --primary-soft: rgba(0, 120, 212, 0.1);
            --bg-main: #1e1e1e;
            --bg-dark: #1e1e1e;
            --bg-darker: #161616;
            --bg-card: #2d2d30;
            --bg-hover: #3e3e42;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #969696;
            --border: #3e3e42;
            --border-light: #464647;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }
        .ba-container { 
            display: flex; 
            min-height: 100vh;
            overflow: hidden;
        }
        .ba-sidebar {
            width: 240px;
            background: var(--bg-darker);
            border-right: 1px solid var(--border);
            padding: 1.5rem 0;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 1000;
        }
        .ba-sidebar-header {
            padding: 0 1.5rem 1rem;
            border-bottom: 1px solid var(--border);
        }
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-nav { padding: 1rem 0; }
        .ba-nav-item {
            display: block;
            padding: 0.75rem 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            transition: all 0.2s;
        }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--bg-hover); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin-left: 240px;
        }
        .ba-top-bar {
            padding: 1rem 2rem;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.75rem;
            flex-shrink: 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
        .ba-conn-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        .ba-conn-label strong { color: var(--primary-light); }
        .ba-content {
            flex: 1;
            padding: 0.5rem;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .ba-tabs {
            display: flex;
            gap: 0.5rem;
            border-bottom: 2px solid var(--border);
            margin-bottom: 1.5rem;
            position: sticky;
            top: 0;
            z-index: 99;
            background: var(--bg-main);
            padding-top: 1rem;
            flex-shrink: 0;
        }
        .ba-tab {
            padding: 0.75rem 1.5rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.9375rem;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s;
        }
        .ba-tab:hover { color: var(--text-primary); }
        .ba-tab.active {
            color: var(--primary-light);
            border-bottom-color: var(--primary);
        }
        .ba-tab-content { display: none; }
        .ba-tab-content.active { display: block; }
        .ba-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .ba-card.ba-card-scrollable {
            display: flex;
            flex-direction: column;
            max-height: calc(100vh - 200px);
            overflow-y: auto;
            overflow-x: hidden;
        }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .ba-btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-secondary:hover { background: var(--bg-card); }
        .ba-btn:disabled,
        .ba-btn[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }
        .ba-btn-primary:disabled,
        .ba-btn-primary[disabled] {
            background: var(--primary);
            opacity: 0.5;
        }
        .ba-btn-secondary:disabled,
        .ba-btn-secondary[disabled] {
            background: var(--bg-hover);
            opacity: 0.5;
        }
        .ba-grid-toolbar {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
            margin-bottom: 1rem;
        }
        .ba-grid-toolbar .ba-search {
            flex: 1;
            min-width: 200px;
            max-width: 360px;
        }
        .ba-table-wrap {
            overflow: auto;
            margin: 1rem 0;
            max-height: 60vh;
            min-height: 320px;
            border: 1px solid var(--border);
            border-radius: 6px;
            position: relative;
        }
        .ba-table {
            width: max-content;
            min-width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
            table-layout: fixed;
        }
        .ba-table thead { 
            background: var(--bg-darker); 
            border-bottom: 1px solid var(--border); 
            position: sticky; 
            top: 0; 
            z-index: 2; 
        }
        .ba-table td { z-index: 0; }
        .ba-table th.ba-col-locked,
        .ba-table td.ba-col-locked {
            position: sticky;
            background: var(--bg-card);
        }
        .ba-table thead th.ba-col-locked {
            z-index: 15;
            background: var(--bg-darker);
            position: sticky;
            top: 0;
        }
        .ba-table tbody td.ba-col-locked {
            background: var(--bg-card);
        }
        .ba-table th .ba-lock-icon {
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            opacity: 0;
            cursor: pointer;
            transition: opacity 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: var(--text-muted);
        }
        .ba-table th:hover .ba-lock-icon {
            opacity: 1;
        }
        .ba-table th.ba-col-locked .ba-lock-icon {
            opacity: 1;
            color: var(--primary);
        }
        .ba-table th .ba-lock-icon:hover {
            color: var(--primary-light);
        }
        .ba-column-context-menu {
            position: fixed;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 0.25rem 0;
            min-width: 150px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: none;
        }
        .ba-column-context-menu.show {
            display: block;
        }
        .ba-column-context-menu-item {
            padding: 0.5rem 1rem;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .ba-column-context-menu-item:hover {
            background: var(--bg-hover);
        }
        .ba-table th {
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.8125rem;
            text-transform: uppercase;
            white-space: nowrap;
            position: relative;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ba-table th .ba-th-inner { overflow: hidden; text-overflow: ellipsis; }
        .ba-table th.ba-sortable {
            cursor: pointer;
            user-select: none;
        }
        .ba-table th.ba-sortable:hover { background: var(--bg-hover); }
        .ba-table th .sort-icon { margin-left: 4px; opacity: 0.6; }
        .ba-table .ba-col-resize {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 6px;
            cursor: col-resize;
            user-select: none;
        }
        .ba-table .ba-col-resize:hover { background: rgba(255,255,255,0.15); }
        .ba-table .ba-col-resize:active { background: var(--primary); }
        .ba-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            color: var(--text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ba-table tbody tr:hover { background: var(--bg-hover); }
        .ba-pager {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-top: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        .ba-pager button:disabled { opacity: 0.5; cursor: not-allowed; }
        .ba-pager .ba-pager-size { min-width: 80px; }
        .ba-form-group { margin-bottom: 1rem; }
        .ba-update-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem 2rem;
            align-items: start;
        }
        @media (max-width: 900px) {
            .ba-update-grid { grid-template-columns: 1fr; }
        }
        .ba-form-label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            font-weight: 500;
        }
        .ba-input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }
        .ba-input:focus {
            outline: none;
            border-color: var(--primary);
        }
        .ba-input:disabled,
        .ba-input[disabled],
        select.ba-input:disabled,
        select.ba-input[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--bg-main);
            color: var(--text-muted);
        }
        .ba-required {
            color: var(--danger);
            font-weight: 600;
        }
        .ba-input.ba-error {
            border-color: var(--danger) !important;
            background: rgba(239, 68, 68, 0.1);
        }
        .ba-field-error {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            color: var(--danger);
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }
        .ba-field-error::before {
            content: "⚠";
            font-size: 0.875rem;
        }
        .ba-checkbox {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
        }
        .ba-checkbox input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        .ba-progress-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1.5rem;
        }
        .ba-progress-overlay.show { display: flex; }
        .ba-progress-content {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            min-width: 400px;
            text-align: center;
        }
        .ba-progress-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 1rem;
        }
        .ba-progress-bar-wrap {
            width: 100%;
            height: 24px;
            background: var(--bg-darker);
            border-radius: 12px;
            overflow: hidden;
            margin: 1rem 0;
        }
        .ba-progress-bar {
            height: 100%;
            background: var(--primary);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .ba-progress-text {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        .ba-empty { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; }
        .ba-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .ba-modal {
            position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10001;
            display: none; align-items: center; justify-content: center; padding: 1rem;
        }
        .ba-modal.show { display: flex; }
        .ba-modal-content {
            background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
            max-width: 480px; width: 100%; max-height: 90vh; overflow: hidden;
            display: flex; flex-direction: column;
        }
        .ba-modal-header {
            padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
            display: flex; align-items: center; justify-content: space-between;
        }
        .ba-modal-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; line-height: 1; }
        .ba-modal-close:hover { color: var(--text-primary); }
        .ba-modal-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
        .ba-modal-footer {
            padding: 1rem 1.25rem; border-top: 1px solid var(--border);
            display: flex; justify-content: flex-end; gap: 0.5rem;
        }
        .ba-btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8125rem; }
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10002;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .toast {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem 1.25rem;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: none;
            align-items: center;
            gap: 0.75rem;
            animation: slideInRight 0.3s ease;
        }
        .toast.show { display: flex; }
        .toast.success { border-left: 4px solid var(--success); }
        .toast.error { border-left: 4px solid var(--danger); }
        .toast.info { border-left: 4px solid var(--primary); }
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <aside class="ba-sidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">UI Builder</div>
                </div>
                <nav class="ba-nav">
                    <a href="<%= ResolveUrl("~/Pages/DesignerHome.aspx") %>" class="ba-nav-item">Về trang chủ</a>
                    <a href="<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>" class="ba-nav-item">Database Search</a>
                    <a href="#" class="ba-nav-item active">HR Helper</a>
                </nav>
            </aside>
            <main class="ba-main">
                <div class="ba-top-bar">
                    <h1 class="ba-top-bar-title">HR Helper</h1>
                    <div class="ba-conn-label">
                        <span>Server: <strong><%= ConnectedServer %></strong></span>
                        <span style="margin-left: 1rem;">Database: <strong><%= ConnectedDatabase %></strong></span>
                    </div>
                </div>
                <div class="ba-content">
                    <div class="ba-tabs">
                        <button type="button" class="ba-tab active" data-tab="users">Users</button>
                        <button type="button" class="ba-tab" data-tab="employees">Employee Info</button>
                        <button type="button" class="ba-tab" data-tab="company">Company Info</button>
                    </div>

                    <!-- Tab Users -->
                    <div id="tabUsers" class="ba-tab-content active">
                        <div class="ba-card ba-card-scrollable">
                            <h2 class="ba-card-title">User Management</h2>
                            <div class="ba-actions" style="margin-bottom: 1rem;">
                                <button type="button" class="ba-btn ba-btn-primary" onclick="loadUsers(); return false;">View Data</button>
                            </div>
                            <div class="ba-grid-toolbar">
                                <input type="text" id="txtSearchUsers" class="ba-input ba-search" placeholder="Search User ID, Name, Employee, Email, Tenant... (có dấu / không dấu)" />
                            </div>
                            <div class="ba-table-wrap">
                                <table class="ba-table ba-table-resizable" id="tableUsers">
                                    <colgroup>
                                        <col style="width: 48px" /><col style="width: 88px" /><col style="width: 120px" /><col style="width: 88px" /><col style="width: 150px" />
                                        <col style="width: 200px" /><col style="width: 100px" /><col style="width: 100px" /><col style="width: 100px" /><col style="width: 80px" /><col style="width: 80px" />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th><span class="ba-th-inner"><input type="checkbox" id="chkSelectAllUsers" /></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="userID"><span class="ba-th-inner">User ID <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="userName"><span class="ba-th-inner">User Name <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="employeeID"><span class="ba-th-inner">Employee ID <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:265px" data-col="employeeName"><span class="ba-th-inner">Employee Name <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:235px" data-col="userEmail"><span class="ba-th-inner">Email <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="isTenantAdmin"><span class="ba-th-inner">Is Tenant Admin <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="isWindowADAccount"><span class="ba-th-inner">Is Window AD <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:150px" data-col="tenant"><span class="ba-th-inner">Tenant <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="isActive"><span class="ba-th-inner">Is Active <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="isApproved"><span class="ba-th-inner">Is Approved <span class="sort-icon"></span></span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblUsers">
                                        <tr><td colspan="11" class="ba-empty">Chưa load data. Bấm "View Data" để tải danh sách user.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div id="pagerUsers" class="ba-pager" style="display: none;"></div>
                            <div class="ba-card ba-update-section" style="margin-top: 1.5rem;">
                                <h3 class="ba-card-title" style="font-size: 1.1rem; margin-bottom: 1rem;">Update email &amp; password</h3>
                                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Chọn user ở bảng trên, bật option dưới đây rồi bấm <strong>Generate and Update</strong>.</p>
                                <div class="ba-form-group">
                                    <div class="ba-checkbox">
                                        <input type="checkbox" id="chkUpdatePassword" />
                                        <label for="chkUpdatePassword">Update Password</label>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                                        <input type="text" id="txtPassword" class="ba-input" placeholder="Enter password" disabled />
                                        <select id="selMethodHash" class="ba-input" disabled>
                                            <option value="256">256 (for Project ISC-01)</option>
                                            <option value="512">512</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-checkbox">
                                        <input type="checkbox" id="chkUpdateEmail" />
                                        <label for="chkUpdateEmail">Update Email</label>
                                    </div>
                                    <input type="text" id="txtEmail" class="ba-input" placeholder="Example: an.nh@cadena-hrmseries.com" style="margin-top: 0.5rem;" disabled />
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-checkbox">
                                        <input type="checkbox" id="chkIgnoreWindowsAD" />
                                        <label for="chkIgnoreWindowsAD">Is Ignore Window AD Account</label>
                                    </div>
                                    <p style="color: var(--text-muted); font-size: 0.8125rem; margin-top: 0.25rem;">When checked system will change type Window AD Account to Normal Account and generate password.</p>
                                </div>
                                <div class="ba-actions" style="margin-top: 1rem;">
                                    <button type="button" class="ba-btn ba-btn-primary" onclick="updateUsers(); return false;">Generate and Update</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Employees -->
                    <div id="tabEmployees" class="ba-tab-content">
                        <div class="ba-card ba-card-scrollable">
                            <h2 class="ba-card-title">Employee Management</h2>
                            <div class="ba-actions" style="margin-bottom: 1rem;">
                                <button type="button" class="ba-btn ba-btn-primary" onclick="loadEmployees(); return false;">View Data</button>
                            </div>
                            <div class="ba-grid-toolbar" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 200px;">
                                    <input type="text" id="txtSearchEmployees" class="ba-input ba-search" placeholder="Search Employee ID, Name, English Name, Email, Phone, Org, Manager, Company... (có dấu / không dấu)" />
                                </div>
                                <div style="min-width: 250px; display: flex; align-items: center; gap: 0.5rem;">
                                    <label class="ba-form-label" style="margin: 0; white-space: nowrap;">Company</label>
                                    <select id="selCompanyFilter" class="ba-input" style="flex: 1;">
                                        <option value="">Loading companies...</option>
                                    </select>
                                </div>
                            </div>
                            <div class="ba-table-wrap">
                                <table class="ba-table ba-table-resizable" id="tableEmployees">
                                    <colgroup>
                                        <col style="width: 48px" /><col style="width: 92px" /><col style="width: 88px" /><col style="width: 170px" /><col style="width: 170px" /><col style="width: 110px" />
                                        <col style="width: 200px" /><col style="width: 200px" /><col style="width: 110px" /><col style="width: 110px" /><col style="width: 110px" />
                                        <col style="width: 100px" /><col style="width: 200px" /><col style="width: 130px" /><col style="width: 170px" /><col style="width: 120px" /><col style="width: 200px" />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th data-col-index="0"><span class="ba-th-inner"><input type="checkbox" id="chkSelectAllEmployees" /></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="employeeID" data-col-index="1"><span class="ba-th-inner">Employee ID <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="localEmployeeID" data-col-index="2"><span class="ba-th-inner">Local ID <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:265px" data-col="employeeName" data-col-index="3"><span class="ba-th-inner">Name <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:265px" data-col="englishName" data-col-index="4"><span class="ba-th-inner">English Name <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="dateOfBirth" data-col-index="5"><span class="ba-th-inner">Date of Birth <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:235px" data-col="personalEmail" data-col-index="6"><span class="ba-th-inner">Personal Email <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:235px" data-col="businessEmail" data-col-index="7"><span class="ba-th-inner">Business Email <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="mobilePhone1" data-col-index="8"><span class="ba-th-inner">Mobile 1 <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="mobilePhone2" data-col-index="9"><span class="ba-th-inner">Mobile 2 <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="serviceStartDate" data-col-index="10"><span class="ba-th-inner">Service Start <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:215px" data-col="alPolicy" data-col-index="11"><span class="ba-th-inner">AL Policy <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:215px" data-col="timeSheetPolicy" data-col-index="12"><span class="ba-th-inner">TimeSheet Policy <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:325px" data-col="organizionStructure" data-col-index="13"><span class="ba-th-inner">Org <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:265px" data-col="managerFullName" data-col-index="14"><span class="ba-th-inner">Manager <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" data-col="userName" data-col-index="15"><span class="ba-th-inner">User Name <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                            <th class="ba-sortable" style="width:450px" data-col="companyInfo" data-col-index="16"><span class="ba-th-inner">Company <span class="sort-icon"></span></span><span class="ba-lock-icon" title="Click để khóa/mở khóa cột">🔓</span><span class="ba-col-resize" title="Kéo để đổi độ rộng"></span></th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblEmployees">
                                        <tr><td colspan="17" class="ba-empty">Chưa load data. Bấm "View Data" để tải danh sách employee.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div id="pagerEmployees" class="ba-pager" style="display: none;"></div>
                            <div class="ba-card ba-update-section" style="margin-top: 1.5rem;">
                                <h3 class="ba-card-title" style="font-size: 1.1rem; margin-bottom: 0.5rem;">Update employee info</h3>
                                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Chọn employee ở bảng trên, bật option dưới đây rồi bấm <strong>Generate and Update</strong>. Không chọn = update all.</p>
                                <div class="ba-update-grid">
                                    <div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox"><input type="checkbox" id="chkUpdPersonalEmail" /><label for="chkUpdPersonalEmail">Update Personal Email</label></div>
                                            <input type="text" id="txtPersonalEmail" class="ba-input" placeholder="user@cadena-hrmseries.com" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox"><input type="checkbox" id="chkUpdBusinessEmail" /><label for="chkUpdBusinessEmail">Update Business Email</label></div>
                                            <input type="text" id="txtBusinessEmail" class="ba-input" placeholder="user@company.com" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox"><input type="checkbox" id="chkUpdPayslip" /><label for="chkUpdPayslip">Update Payslip Password</label></div>
                                            <div class="ba-checkbox" style="margin-top: 0.5rem;"><input type="checkbox" id="chkPayslipByEmployee" /><label for="chkPayslipByEmployee">Encrypt by Employee (Local ID)</label></div>
                                            <input type="text" id="txtPayslipCommon" class="ba-input" placeholder="Payslip common (nếu không encrypt by employee)" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                    </div>
                                    <div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox"><input type="checkbox" id="chkUpdMobile1" /><label for="chkUpdMobile1">Update Mobile 1</label></div>
                                            <input type="text" id="txtMobile1" class="ba-input" placeholder="Số điện thoại 1" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox"><input type="checkbox" id="chkUpdMobile2" /><label for="chkUpdMobile2">Update Mobile 2</label></div>
                                            <input type="text" id="txtMobile2" class="ba-input" placeholder="Số điện thoại 2" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox"><input type="checkbox" id="chkUpdBasicSalary" /><label for="chkUpdBasicSalary">Update Basic Salary</label></div>
                                            <input type="number" id="txtBasicSalary" class="ba-input" placeholder="0" min="0" step="0.01" style="margin-top: 0.5rem; max-width: 100%;" disabled />
                                        </div>
                                    </div>
                                </div>
                                <div class="ba-actions" style="margin-top: 1rem;">
                                    <button type="button" class="ba-btn ba-btn-primary" onclick="updateEmployees(); return false;">Generate and Update</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Company -->
                    <div id="tabCompany" class="ba-tab-content">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Company Management</h2>
                            <div class="ba-card ba-update-section" style="margin-bottom: 1.5rem;">
                                <h3 class="ba-card-title" style="font-size: 1.1rem; margin-bottom: 1rem;">Company Selection</h3>
                                <div class="ba-form-group" style="margin-bottom: 1rem;">
                                    <label class="ba-form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <input type="radio" name="rbCompanyUpdateMode" id="rbCompanySelect" value="select" checked />
                                        <span>Select Company</span>
                                    </label>
                                    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 1rem; margin-top: 0.5rem; align-items: end;">
                                        <div class="ba-form-group" style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                            <label class="ba-form-label" style="margin: 0; white-space: nowrap; min-width: 60px;">Tenant</label>
                                            <select id="selCompanyTenant" class="ba-input" style="flex: 1;">
                                                <option value="">Loading tenants...</option>
                                            </select>
                                        </div>
                                        <div class="ba-form-group" style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                            <label class="ba-form-label" style="margin: 0; white-space: nowrap; min-width: 70px;">Company</label>
                                            <select id="selCompanyCompany" class="ba-input" style="flex: 1;" disabled>
                                                <option value="">Select tenant first</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <input type="radio" name="rbCompanyUpdateMode" id="rbCompanyAll" value="all" />
                                        <span>Update for all Companies</span>
                                    </label>
                                </div>
                                <div class="ba-actions" style="margin-top: 1rem;">
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnCompanyViewData" onclick="loadCompanyInfo(); return false;" disabled>View Data</button>
                                </div>
                            </div>
                            <div class="ba-card ba-update-section" style="margin-top: 1.5rem;">
                                <h3 class="ba-card-title" style="font-size: 1.1rem; margin-bottom: 1rem;">Company Email Settings</h3>
                                <div class="ba-actions" style="margin-bottom: 1rem;">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnCompanyUserAction" onclick="loadUserActionEmail(); return false;" disabled>User Action Email</button>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-checkbox">
                                        <input type="checkbox" id="chkCompanyUseCommonEmail" />
                                        <label for="chkCompanyUseCommonEmail">Use Default Email</label>
                                    </div>
                                    <input type="text" id="txtCompanyCommonEmail" class="ba-input" placeholder="Default email (if checked)" style="margin-top: 0.5rem;" disabled />
                                </div>
                                <div class="ba-update-grid" style="margin-top: 1rem;">
                                    <div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">HR Support Email <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyHREmailTo" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">HR CC Email <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyHREmailCC" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Payroll Support Email <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyPayrollEmailTo" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Payroll CC Email <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyPayrollEmailCC" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Contact Email <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyContactEmail" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                    </div>
                                </div>
                                <p style="color: var(--text-muted); font-size: 0.8125rem; margin-top: 1rem; font-style: italic;">
                                    If user not input data, program will reset value is Email of User Action.
                                </p>
                            </div>
                            <div class="ba-card ba-update-section" style="margin-top: 1.5rem;">
                                <h3 class="ba-card-title" style="font-size: 1.1rem; margin-bottom: 1rem;">Email Server Settings</h3>
                                <div class="ba-actions" style="margin-bottom: 1rem;">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnCompanyCadenaServer" onclick="loadCadenaEmailServer(); return false;" disabled>Cadena Email Server</button>
                                </div>
                                <div class="ba-update-grid">
                                    <div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Outgoing Email Server <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyOutgoingServer" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Port <span class="ba-required">(*)</span></label>
                                            <input type="number" id="txtCompanyServerPort" class="ba-input" min="1" max="65535" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Account Name <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyAccountName" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Username <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyUserName" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Email Address <span class="ba-required">(*)</span></label>
                                            <input type="text" id="txtCompanyEmailAddress" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <label class="ba-form-label">Password <span class="ba-required">(*)</span></label>
                                            <input type="password" id="txtCompanyPassword" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox">
                                                <input type="checkbox" id="chkCompanyEnableSSL" />
                                                <label for="chkCompanyEnableSSL">Enable SSL</label>
                                            </div>
                                            <input type="number" id="txtCompanySSLPort" class="ba-input" placeholder="SSL Port" min="1" max="65535" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                    </div>
                                </div>
                                <p style="color: var(--text-muted); font-size: 0.8125rem; margin-top: 1rem; font-style: italic;">
                                    When user fill this group, program change Email Server to SMTP<br />
                                    With Company Use Server Email type is Lotus, please manual update on HR (not support in Helper)
                                </p>
                            </div>
                            <div class="ba-actions" style="margin-top: 1.5rem;">
                                <button type="button" class="ba-btn ba-btn-primary" id="btnCompanyUpdate" onclick="updateCompanyInfo(); return false;" disabled>Update Company Info</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <div id="columnContextMenu" class="ba-column-context-menu">
            <div class="ba-column-context-menu-item" data-action="lock">🔒 Khóa cột</div>
            <div class="ba-column-context-menu-item" data-action="unlock">🔓 Mở khóa cột</div>
        </div>

        <!-- Progress Overlay -->
        <div id="progressOverlay" class="ba-progress-overlay">
            <div class="ba-progress-content">
                <div class="ba-progress-title" id="progressTitle">Đang xử lý...</div>
                <div class="ba-progress-bar-wrap">
                    <div class="ba-progress-bar" id="progressBar" style="width: 0%;">0%</div>
                </div>
                <div class="ba-progress-text" id="progressText">Đang khởi tạo...</div>
            </div>
        </div>

        <!-- Confirm Modal -->
        <div id="confirmUpdateModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 440px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Xác nhận</h3>
                    <button type="button" class="ba-modal-close" onclick="hideConfirmUpdateModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <p id="confirmUpdateMessage" style="margin: 0; color: var(--text-primary); font-size: 0.9375rem; line-height: 1.6;"></p>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="confirmUpdateCancel">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="confirmUpdateOk">Cập nhật</button>
                </div>
            </div>
        </div>

        <!-- Toast Container -->
        <div id="toastContainer" class="toast-container"></div>
    </form>
    <script>
        var hrToken = '';
        var users = [];
        var employees = [];
        var company = null;

        var PAGE_SIZE_OPTS = [50, 100, 500, 1000, 5000, 10000];
        var USER_PAGE_SIZE = 100;
        var userPage = 1;
        var userSortCol = 'userID';
        var userSortDir = 1;
        var userSearch = '';
        var EMPLOYEE_PAGE_SIZE = 100;
        var employeePage = 1;
        var employeeSortCol = 'employeeID';
        var employeeSortDir = 1;
        var employeeSearch = '';
        var employeeCompanyFilter = null;
        var companies = [];
        var UPDATE_CHUNK_SIZE = 2000;
        var LOAD_CHUNK_SIZE = 2000;
        var LOAD_CONCURRENCY = 4;
        var updateInProgress = false;
        var lockedColumns = {}; // { tableId: { colIndex: true } }

        var _diacriticsMap = null;
        var _diacriticsRe = null;
        function _initDiacritics() {
            if (_diacriticsMap) return;
            var from = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựýỳỹỷỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰÝỲỸỶỴĐ';
            var to   = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD';
            _diacriticsMap = {};
            for (var i = 0; i < from.length; i++) _diacriticsMap[from[i]] = to[i];
            _diacriticsRe = new RegExp('[' + from.replace(/[\\\]^-]/g, '\\$&') + ']', 'g');
        }
        function removeDiacritics(s) {
            if (s == null || s === '') return '';
            _initDiacritics();
            return String(s).replace(_diacriticsRe, function(c) { return _diacriticsMap[c] || c; });
        }

        function debounce(fn, ms) {
            var t;
            return function() {
                var self = this, args = arguments;
                clearTimeout(t);
                t = setTimeout(function() { fn.apply(self, args); }, ms);
            };
        }
        var debouncedRenderUsers = debounce(function() { renderUsers(); }, 120);
        var debouncedRenderEmployees = debounce(function() { renderEmployees(); }, 120);

        $(document).ready(function() {
            var urlParams = new URLSearchParams(window.location.search);
            hrToken = urlParams.get('k') || '';
            if (!hrToken) {
                showToast('Thiếu tham số kết nối. Vui lòng Connect từ Database Search.', 'error');
                setTimeout(function() { window.location.href = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>'; }, 2000);
                return;
            }
            // Clear session khi reload trang
            $.ajax({ url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/ClearEmployeesSession") %>', type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ k: hrToken }), timeout: 10000, error: function() {} });
            $.ajax({ url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/ClearUsersSession") %>', type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ k: hrToken }), timeout: 10000, error: function() {} });

            $('.ba-tab').on('click', function() {
                var tab = $(this).data('tab');
                $('.ba-tab').removeClass('active');
                $('.ba-tab-content').removeClass('active');
                $(this).addClass('active');
                $('#tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).addClass('active');
                if (tab === 'users' && users.length === 0) loadUsersFromSession();
            });

            $('#txtSearchUsers').on('input', function() {
                userSearch = $(this).val();
                userPage = 1;
                if (!(userSearch || '').trim()) renderUsers();
                else debouncedRenderUsers();
            });
            $('#tableUsers').on('click', 'th.ba-sortable', function(e) {
                if ($(e.target).closest('.ba-col-resize').length) return;
                var col = $(this).data('col');
                if (userSortCol === col) userSortDir = -userSortDir; else { userSortCol = col; userSortDir = 1; }
                userPage = 1;
                renderUsers();
            });
            loadCompanies();
            $('#txtSearchEmployees').on('input', function() {
                employeeSearch = $(this).val();
                employeePage = 1;
                if (!(employeeSearch || '').trim()) renderEmployees();
                else debouncedRenderEmployees();
            });
            $('#selCompanyFilter').on('change', function() {
                var val = $(this).val();
                employeeCompanyFilter = val === '' || val === '-1' ? null : parseInt(val, 10);
                employeePage = 1;
                // Thử load từ session trước
                loadEmployeesFromSession();
            });
            $('#tableEmployees').on('click', 'th.ba-sortable', function(e) {
                if ($(e.target).closest('.ba-col-resize').length) return;
                var col = $(this).data('col');
                if (employeeSortCol === col) employeeSortDir = -employeeSortDir; else { employeeSortCol = col; employeeSortDir = 1; }
                employeePage = 1;
                renderEmployees();
            });
            initResizableColumns('#tableUsers');
            initResizableColumns('#tableEmployees');
            initColumnLocking('#tableEmployees');
            // Enable/disable controls based on checkboxes
            $('#chkUpdatePassword').on('change', function() {
                var checked = $(this).is(':checked');
                $('#txtPassword, #selMethodHash').prop('disabled', !checked);
            });
            $('#chkUpdateEmail').on('change', function() {
                $('#txtEmail').prop('disabled', !$(this).is(':checked'));
            });
            $('#chkUpdPersonalEmail').on('change', function() {
                $('#txtPersonalEmail').prop('disabled', !$(this).is(':checked'));
            });
            $('#chkUpdBusinessEmail').on('change', function() {
                $('#txtBusinessEmail').prop('disabled', !$(this).is(':checked'));
            });
            $('#chkUpdPayslip').on('change', function() {
                var checked = $(this).is(':checked');
                $('#txtPayslipCommon').prop('disabled', !checked || $('#chkPayslipByEmployee').is(':checked'));
            });
            $('#chkPayslipByEmployee').on('change', function() {
                $('#txtPayslipCommon').prop('disabled', !$('#chkUpdPayslip').is(':checked') || $(this).is(':checked'));
            });
            $('#chkUpdMobile1').on('change', function() {
                $('#txtMobile1').prop('disabled', !$(this).is(':checked'));
            });
            $('#chkUpdMobile2').on('change', function() {
                $('#txtMobile2').prop('disabled', !$(this).is(':checked'));
            });
            $('#chkUpdBasicSalary').on('change', function() {
                $('#txtBasicSalary').prop('disabled', !$(this).is(':checked'));
            });
            // Company Info tab handlers
            $('#chkCompanyUseCommonEmail').on('change', function() {
                var checked = $(this).is(':checked');
                $('#txtCompanyCommonEmail').prop('disabled', !checked);
                var otherFields = ['#txtCompanyHREmailTo', '#txtCompanyHREmailCC', '#txtCompanyPayrollEmailTo', '#txtCompanyPayrollEmailCC', '#txtCompanyContactEmail'];
                otherFields.forEach(function(sel) {
                    $(sel).prop('disabled', checked);
                });
                clearCompanyValidation();
            });
            $('#chkCompanyEnableSSL').on('change', function() {
                $('#txtCompanySSLPort').prop('disabled', !$(this).is(':checked'));
            });
            // Clear validation errors when user types in fields
            $('#txtCompanyCommonEmail, #txtCompanyHREmailTo, #txtCompanyHREmailCC, #txtCompanyPayrollEmailTo, #txtCompanyPayrollEmailCC, #txtCompanyContactEmail, #txtCompanyOutgoingServer, #txtCompanyServerPort, #txtCompanyAccountName, #txtCompanyUserName, #txtCompanyEmailAddress, #txtCompanyPassword').on('input change', function() {
                var $this = $(this);
                if ($this.hasClass('ba-error')) {
                    $this.removeClass('ba-error');
                    $this.siblings('.ba-field-error').hide().text('');
                }
            });
            $('#selCompanyTenant').on('change', function() {
                var tenantId = $(this).val();
                var isSelect = $('#rbCompanySelect').is(':checked');
                if (!isSelect) return;
                companyInfoViewed = false;
                updateCompanyButtonsState();
                if (tenantId) {
                    loadCompaniesByTenant(tenantId);
                } else {
                    $('#selCompanyCompany').html('<option value="">Select tenant first</option>').prop('disabled', true);
                    $('#btnCompanyViewData').prop('disabled', true);
                }
            });
            $('#selCompanyCompany').on('change', function() {
                var companyId = $(this).val();
                var tenantId = $('#selCompanyTenant').val();
                var isSelect = $('#rbCompanySelect').is(':checked');
                if (!isSelect) return;
                companyInfoViewed = false;
                updateCompanyButtonsState();
                $('#btnCompanyViewData').prop('disabled', !tenantId || !companyId);
            });
            $('input[name="rbCompanyUpdateMode"]').on('change', function() {
                var isSelect = $('#rbCompanySelect').is(':checked');
                if (isSelect) {
                    $('#selCompanyTenant').prop('disabled', false);
                    $('#selCompanyCompany').prop('disabled', false);
                    var tenantId = $('#selCompanyTenant').val();
                    var companyId = $('#selCompanyCompany').val();
                    $('#btnCompanyViewData').prop('disabled', !tenantId || !companyId);
                    companyInfoViewed = false;
                    updateCompanyButtonsState();
                    if (!tenantId) {
                        $('#selCompanyCompany').html('<option value="">Select tenant first</option>').prop('disabled', true);
                    }
                } else {
                    // Update for all: Tenant/Company về trống, disable; View Data disable; 3 button enable
                    $('#selCompanyTenant').val('').prop('disabled', true);
                    $('#selCompanyCompany').html('<option value="">Select tenant first</option>').prop('disabled', true);
                    $('#btnCompanyViewData').prop('disabled', true);
                    updateCompanyButtonsState();
                }
            });
            loadTenants();
            updateCompanyButtonsState();
            // Tự động lock cột select (index 0)
            if (!lockedColumns['tableEmployees']) lockedColumns['tableEmployees'] = {};
            lockedColumns['tableEmployees'][0] = true;
            applyColumnLocks('tableEmployees');
            $(document).on('click', '#confirmUpdateModal', function(e) { if (e.target === this) hideConfirmUpdateModal(); });
            $(document).on('click', function(e) {
                if (!$(e.target).closest('#columnContextMenu').length && !$(e.target).closest('.ba-table th').length) {
                    $('#columnContextMenu').removeClass('show');
                }
            });
            $(document).on('contextmenu', function(e) {
                if (!$(e.target).closest('#columnContextMenu').length && !$(e.target).closest('.ba-table th').length) {
                    $('#columnContextMenu').removeClass('show');
                }
            });
            $(window).on('beforeunload', function() {
                if (updateInProgress) return 'Đang update. Refresh hoặc đóng trang có thể làm mất tiến trình. Bạn có chắc chắn muốn thoát?';
            });
        });

        function initResizableColumns(tableSelector) {
            var $t = $(tableSelector);
            if (!$t.length || !$t.hasClass('ba-table-resizable')) return;
            var $cols = $t.find('colgroup col');
            var $headers = $t.find('thead th');
            var minW = 40;
            $t.find('.ba-col-resize').each(function(idx) {
                var $h = $headers.eq(idx);
                var $col = $cols.eq(idx);
                if (!$col.length) return;
                $(this).on('mousedown', function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    var startX = ev.pageX;
                    var raw = ($col.attr('style') || '').match(/width:\s*(\d+)px/);
                    var startW = raw ? parseInt(raw[1], 10) : 100;
                    function move(e) {
                        var dx = e.pageX - startX;
                        var w = Math.max(minW, startW + dx);
                        $col.attr('style', 'width: ' + w + 'px');
                    }
                    function up() {
                        $(document).off('mousemove', move).off('mouseup', up);
                    }
                    $(document).on('mousemove', move).on('mouseup', up);
                });
            });
        }

        function showToast(msg, type) {
            type = type || 'info';
            var icons = { success: '✓', error: '✕', info: 'ℹ' };
            var titles = { success: 'Thành công', error: 'Lỗi', info: 'Thông báo' };
            var $t = $('<div class="toast ' + type + '"><span>' + (icons[type] || 'ℹ') + '</span> ' + (titles[type] || '') + ': ' + msg + '</div>');
            $('#toastContainer').append($t);
            setTimeout(function() { $t.addClass('show'); }, 10);
            setTimeout(function() { $t.removeClass('show'); setTimeout(function() { $t.remove(); }, 300); }, 3000);
        }

        function showProgress(title, percent, text) {
            $('#progressTitle').text(title || 'Đang xử lý...');
            $('#progressBar').css('width', (percent || 0) + '%').text((percent || 0) + '%');
            $('#progressText').text(text || '');
            $('#progressOverlay').addClass('show');
        }

        function hideProgress() {
            $('#progressOverlay').removeClass('show');
        }

        function loadUsers() {
            showProgress('Đang load danh sách user...', 0, 'Đang đếm...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetUsersCount") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 60000,
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        hideProgress();
                        showToast(d && d.message ? d.message : 'Lỗi đếm user.', 'error');
                        return;
                    }
                    var total = parseInt(d.total, 10) || 0;
                    if (total === 0) {
                        users = [];
                        userPage = 1;
                        hideProgress();
                        renderUsers();
                        showToast('Không có user.', 'info');
                        return;
                    }
                    users = [];
                    var chunkSize = LOAD_CHUNK_SIZE;
                    var loaded = 0;
                    var completed = 0;
                    var totalChunks = Math.ceil(total / chunkSize);
                    var activeRequests = 0;
                    var hasError = false;
                    var loadingOffsets = {};
                    var nextOffsetToLoad = 0;
                    var firstUserChunkSaved = false;
                    function checkComplete() {
                        if (completed >= totalChunks && activeRequests === 0) {
                            showProgress('Hoàn thành', 100, users.length + ' / ' + total + ' user');
                            setTimeout(function() {
                                hideProgress();
                                userPage = 1;
                                renderUsers();
                                if (users.length > 0) {
                                    showToast('Đã load ' + users.length + ' user.', hasError ? 'warning' : 'success');
                                } else {
                                    showToast('Không load được user nào.', 'error');
                                }
                            }, 300);
                        }
                    }
                    function startNextChunk() {
                        while (activeRequests < LOAD_CONCURRENCY && nextOffsetToLoad < total && !hasError) {
                            var offset = nextOffsetToLoad;
                            nextOffsetToLoad += chunkSize;
                            if (loadingOffsets[offset]) continue;
                            loadingOffsets[offset] = true;
                            fetchChunk(offset);
                        }
                    }
                    function fetchChunk(offset) {
                        if (offset >= total) {
                            completed++;
                            checkComplete();
                            return;
                        }
                        if (hasError) {
                            checkComplete();
                            return;
                        }
                        activeRequests++;
                        var pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
                        showProgress('Đang load user...', Math.min(99, pct), loaded + ' / ' + total + ' user');
                        $.ajax({
                            url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadUsersChunk") %>',
                            type: 'POST',
                            contentType: 'application/json; charset=utf-8',
                            dataType: 'json',
                            data: JSON.stringify({ k: hrToken, offset: offset, count: chunkSize }),
                            timeout: 180000,
                            success: function(r2) {
                                activeRequests--;
                                var d2 = r2.d || r2;
                                if (!d2 || !d2.success) {
                                    hasError = true;
                                    completed++;
                                    checkComplete();
                                    return;
                                }
                                var list = d2.list || [];
                                for (var i = 0; i < list.length; i++) users.push(list[i]);
                                loaded += list.length;
                                var isFirst = !firstUserChunkSaved;
                                if (isFirst) firstUserChunkSaved = true;
                                saveUsersChunkToSession(list, isFirst);
                                completed++;
                                startNextChunk();
                                checkComplete();
                            },
                            error: function(xhr, status, err) {
                                activeRequests--;
                                hasError = true;
                                completed++;
                                startNextChunk();
                                checkComplete();
                            }
                        });
                    }
                    startNextChunk();
                },
                error: function(xhr, status, err) {
                    hideProgress();
                    var msg = 'Lỗi đếm user.';
                    if (xhr.responseText) {
                        try {
                            var json = JSON.parse(xhr.responseText);
                            if (json.d && json.d.message) msg = json.d.message;
                            else if (json.message) msg = json.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                }
            });
        }

        function filterUsers() {
            var q = (userSearch || '').trim();
            if (!q) return users.slice();
            var qNorm = removeDiacritics(q).toLowerCase();
            return users.filter(function(u) {
                var a = ['' + (u.userID || ''), (u.userName || ''), '' + (u.employeeID || ''), (u.employeeName || ''), (u.userEmail || ''), (u.tenant || ''), (u.businessEmail || ''), (u.personalEmail || '')];
                return a.some(function(s) { return removeDiacritics(s).toLowerCase().indexOf(qNorm) >= 0; });
            });
        }

        function sortUsers(list) {
            var col = userSortCol, dir = userSortDir;
            return list.slice().sort(function(a, b) {
                var va = a[col], vb = b[col];
                if (va == null && vb == null) return 0;
                if (va == null) return dir; if (vb == null) return -dir;
                if (typeof va === 'number' && typeof vb === 'number') return dir * (va - vb);
                if (typeof va === 'boolean' && typeof vb === 'boolean') return dir * ((va ? 1 : 0) - (vb ? 1 : 0));
                var sa = ('' + va).toLowerCase(), sb = ('' + vb).toLowerCase();
                return dir * (sa < sb ? -1 : sa > sb ? 1 : 0);
            });
        }

        function renderUsers() {
            var $tb = $('#tblUsers');
            var $pg = $('#pagerUsers');
            var $table = $tb.closest('table');
            if (!users.length) {
                $tb.html('<tr><td colspan="11" class="ba-empty">Không có user nào.</td></tr>');
                $('#chkSelectAllUsers').off('change').prop('checked', false);
                $pg.hide();
                return;
            }
            var filtered = filterUsers();
            var sorted = sortUsers(filtered);
            var total = sorted.length;
            var pages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
            userPage = Math.max(1, Math.min(userPage, pages));
            var from = (userPage - 1) * USER_PAGE_SIZE;
            var chunk = sorted.slice(from, from + USER_PAGE_SIZE);

            var html = '';
            chunk.forEach(function(u) {
                html += '<tr data-id="' + u.userID + '">' +
                    '<td><input type="checkbox" class="chkUser" data-id="' + u.userID + '" /></td>' +
                    '<td>' + (u.userID || '-') + '</td>' +
                    '<td>' + (u.userName || '-') + '</td>' +
                    '<td>' + (u.employeeID || '-') + '</td>' +
                    '<td>' + (u.employeeName || '-') + '</td>' +
                    '<td>' + (u.userEmail || '-') + '</td>' +
                    '<td>' + (u.isTenantAdmin ? '✓' : '-') + '</td>' +
                    '<td>' + (u.isWindowADAccount ? '✓' : '-') + '</td>' +
                    '<td>' + (u.tenant || '-') + '</td>' +
                    '<td>' + (u.isActive ? '✓' : '-') + '</td>' +
                    '<td>' + (u.isApproved ? '✓' : '-') + '</td>' +
                    '</tr>';
            });
            $tb.html(html);

            if ($table.length) {
                $table.find('th .sort-icon').text('');
                var $active = $table.find('th.ba-sortable[data-col="' + userSortCol + '"] .sort-icon');
                if ($active.length) $active.text(userSortDir === 1 ? '↑' : '↓');
            }

            $('#chkSelectAllUsers').off('change').prop('checked', false).on('change', function() {
                var v = $(this).prop('checked');
                $('.chkUser').prop('checked', v);
            });

            $pg.show().empty();
            $pg.append('<span>Trang ' + userPage + ' / ' + pages + ' (' + total + ' user)</span> ');
            var $sel = $('<select class="ba-pager-size ba-input" id="selUserPageSize" style="width:auto;padding:0.25rem 0.5rem;margin:0 0.5rem;"></select>');
            PAGE_SIZE_OPTS.forEach(function(n) { $sel.append($('<option></option>').val(n).text(n)); });
            $sel.val(USER_PAGE_SIZE);
            $pg.append($sel);
            $pg.append('<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" ' + (userPage <= 1 ? 'disabled' : '') + ' id="btnUserPrev">Trước</button>');
            $pg.append('<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" ' + (userPage >= pages ? 'disabled' : '') + ' id="btnUserNext">Sau</button>');
            $('#btnUserPrev').on('click', function() { if (userPage > 1) { userPage--; renderUsers(); } });
            $('#btnUserNext').on('click', function() { if (userPage < pages) { userPage++; renderUsers(); } });
            $('#selUserPageSize').off('change').on('change', function() { USER_PAGE_SIZE = parseInt($(this).val(), 10); userPage = 1; renderUsers(); });
        }

        function loadUsersFromSession() {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadUsersFromSession") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 10000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.list && Array.isArray(d.list) && d.list.length > 0) {
                        users = d.list;
                        userPage = 1;
                        renderUsers();
                    }
                },
                error: function() {}
            });
        }

        function saveUsersChunkToSession(chunk, isFirstChunk) {
            if (!chunk || chunk.length === 0) return;
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/SaveUsersChunkToSession") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, chunk: chunk, isFirstChunk: !!isFirstChunk }),
                timeout: 60000,
                async: true,
                error: function() {}
            });
        }

        function loadCompanies() {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadCompanies") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        $('#selCompanyFilter').html('<option value="">Lỗi load companies</option>');
                        return;
                    }
                    companies = d.list || [];
                    var html = '<option value="-1">All</option>';
                    companies.forEach(function(c) {
                        var text = (c.code || '') + ' - ' + (c.name || '');
                        html += '<option value="' + c.id + '">' + text + '</option>';
                    });
                    $('#selCompanyFilter').html(html);
                },
                error: function() {
                    $('#selCompanyFilter').html('<option value="">Lỗi load companies</option>');
                }
            });
        }

        function loadEmployeesFromSession() {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadEmployeesFromSession") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, companyID: employeeCompanyFilter }),
                timeout: 10000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.list && Array.isArray(d.list) && d.list.length > 0) {
                        var raw = d.list;
                        var byId = {};
                        for (var i = 0; i < raw.length; i++) {
                            var e = raw[i];
                            var id = e.employeeID;
                            if (!byId[id]) byId[id] = e;
                        }
                        var list = [];
                        for (var k in byId) if (byId.hasOwnProperty(k)) list.push(byId[k]);
                        list.sort(function(a, b) { return (a.employeeID || 0) - (b.employeeID || 0); });
                        employees = list;
                        employeePage = 1;
                        renderEmployees();
                    } else {
                        loadEmployees();
                    }
                },
                error: function() {
                    loadEmployees();
                }
            });
        }

        function saveEmployeesChunkToSession(chunk, isFirstChunk) {
            if (!chunk || chunk.length === 0) return;
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/SaveEmployeesChunkToSession") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, companyID: employeeCompanyFilter, chunk: chunk, isFirstChunk: !!isFirstChunk }),
                timeout: 60000,
                async: true,
                error: function() { /* ignore */ }
            });
        }

        function loadEmployees() {
            showProgress('Đang load danh sách employee...', 0, 'Đang đếm...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetEmployeesCount") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, companyID: employeeCompanyFilter }),
                timeout: 60000,
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        hideProgress();
                        showToast(d && d.message ? d.message : 'Lỗi đếm employee.', 'error');
                        return;
                    }
                    var total = parseInt(d.total, 10) || 0;
                    if (total === 0) {
                        employees = [];
                        employeePage = 1;
                        hideProgress();
                        renderEmployees();
                        showToast('Không có employee.', 'info');
                        return;
                    }
                    employees = [];
                    var byId = {};
                    var chunkSize = LOAD_CHUNK_SIZE;
                    var firstChunkSaved = false;
                    var rowsLoaded = 0;
                    var completed = 0;
                    var totalChunks = Math.ceil(total / chunkSize);
                    var activeRequests = 0;
                    var hasError = false;
                    var loadingOffsets = {};
                    var nextOffsetToLoad = 0;
                    function getUniqueCount() {
                        var cnt = 0;
                        for (var id in byId) if (byId.hasOwnProperty(id)) cnt++;
                        return cnt;
                    }
                    function checkComplete() {
                        if (completed >= totalChunks && activeRequests === 0) {
                            var list = [];
                            for (var id in byId) if (byId.hasOwnProperty(id)) list.push(byId[id]);
                            list.sort(function(a, b) { return (a.employeeID || 0) - (b.employeeID || 0); });
                            employees = list;
                            var uniqueCount = list.length;
                            if (hasError) {
                                showProgress('Hoàn thành (có lỗi)', 100, uniqueCount + ' / ' + total + ' employee');
                            } else {
                                showProgress('Hoàn thành', 100, uniqueCount + ' / ' + total + ' employee');
                            }
                            setTimeout(function() {
                                hideProgress();
                                employeePage = 1;
                                renderEmployees();
                                if (uniqueCount > 0) {
                                    showToast('Đã load ' + uniqueCount + ' employee.', hasError ? 'warning' : 'success');
                                } else {
                                    showToast('Không load được employee nào.', 'error');
                                }
                            }, 300);
                        }
                    }
                    function startNextChunk() {
                        while (activeRequests < LOAD_CONCURRENCY && nextOffsetToLoad < total && !hasError) {
                            var offset = nextOffsetToLoad;
                            nextOffsetToLoad += chunkSize;
                            if (loadingOffsets[offset]) continue;
                            loadingOffsets[offset] = true;
                            fetchChunk(offset);
                        }
                    }
                    function fetchChunk(offset) {
                        if (offset >= total) {
                            completed++;
                            checkComplete();
                            return;
                        }
                        if (hasError) {
                            checkComplete();
                            return;
                        }
                        activeRequests++;
                        var uniqueCount = getUniqueCount();
                        var pct = total > 0 ? Math.round((rowsLoaded / total) * 100) : 0;
                        showProgress('Đang load employee...', Math.min(99, pct), uniqueCount + ' / ' + total + ' employee');
                        $.ajax({
                            url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadEmployeesChunk") %>',
                            type: 'POST',
                            contentType: 'application/json; charset=utf-8',
                            dataType: 'json',
                            data: JSON.stringify({ k: hrToken, offset: offset, count: chunkSize, companyID: employeeCompanyFilter }),
                            timeout: 180000,
                            success: function(r2) {
                                activeRequests--;
                                var d2 = r2.d || r2;
                                if (!d2 || !d2.success) {
                                    hasError = true;
                                    completed++;
                                    checkComplete();
                                    return;
                                }
                                var list = d2.list || [];
                                for (var i = 0; i < list.length; i++) {
                                    var e = list[i];
                                    var id = e.employeeID;
                                    if (!byId[id]) byId[id] = e;
                                }
                                rowsLoaded += list.length;
                                var isFirst = !firstChunkSaved;
                                if (isFirst) firstChunkSaved = true;
                                saveEmployeesChunkToSession(list, isFirst);
                                completed++;
                                startNextChunk();
                                checkComplete();
                            },
                            error: function(xhr, status, err) {
                                activeRequests--;
                                hasError = true;
                                completed++;
                                startNextChunk();
                                checkComplete();
                            }
                        });
                    }
                    startNextChunk();
                },
                error: function(xhr, status, err) {
                    hideProgress();
                    var msg = 'Lỗi đếm employee.';
                    if (xhr.responseText) {
                        try {
                            var json = JSON.parse(xhr.responseText);
                            if (json.d && json.d.message) msg = json.d.message;
                            else if (json.message) msg = json.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                }
            });
        }

        function filterEmployees() {
            var filtered = employees.slice();
            if (employeeCompanyFilter !== null) {
                filtered = filtered.filter(function(e) {
                    if (!e.companyInfo) return false;
                    var parts = e.companyInfo.split(' - ');
                    if (parts.length < 1) return false;
                    var companyId = parseInt(parts[0], 10);
                    return companyId === employeeCompanyFilter;
                });
            }
            var q = (employeeSearch || '').trim();
            if (!q) return filtered;
            var qNorm = removeDiacritics(q).toLowerCase();
            return filtered.filter(function(e) {
                var a = ['' + (e.employeeID || ''), (e.localEmployeeID || ''), (e.employeeName || ''), (e.englishName || ''), (e.dateOfBirth || ''), (e.personalEmail || ''), (e.businessEmail || ''), (e.mobilePhone1 || ''), (e.mobilePhone2 || ''), (e.serviceStartDate || ''), (e.alPolicy || ''), (e.timeSheetPolicy || ''), (e.organizionStructure || ''), (e.managerFullName || ''), (e.userName || ''), (e.companyInfo || '')];
                return a.some(function(s) { return removeDiacritics(s).toLowerCase().indexOf(qNorm) >= 0; });
            });
        }

        function sortEmployees(list) {
            var col = employeeSortCol, dir = employeeSortDir;
            return list.slice().sort(function(a, b) {
                var va = a[col], vb = b[col];
                if (va == null && vb == null) return 0;
                if (va == null) return dir; if (vb == null) return -dir;
                if (typeof va === 'number' && typeof vb === 'number') return dir * (va - vb);
                var sa = ('' + va).toLowerCase(), sb = ('' + vb).toLowerCase();
                return dir * (sa < sb ? -1 : sa > sb ? 1 : 0);
            });
        }

        function initColumnLocking(tableSelector) {
            var tableId = $(tableSelector).attr('id');
            if (!lockedColumns[tableId]) lockedColumns[tableId] = {};
            var contextMenuOpen = false;
            
            $(tableSelector).on('click', 'th .ba-lock-icon', function(e) {
                e.stopPropagation();
                var $th = $(this).closest('th');
                var colIndex = parseInt($th.data('col-index'), 10);
                if (isNaN(colIndex)) return;
                toggleColumnLock(tableId, colIndex);
            });
            
            $(tableSelector).on('contextmenu', 'th', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var $th = $(this);
                var colIndex = parseInt($th.data('col-index'), 10);
                if (isNaN(colIndex)) return;
                // Không cho phép unlock cột select (index 0)
                if (colIndex === 0) return;
                
                var $menu = $('#columnContextMenu');
                // Luôn đóng menu cũ trước (bất kể cột nào)
                $menu.removeClass('show');
                
                // Delay nhỏ để đảm bảo menu cũ đã đóng hoàn toàn
                setTimeout(function() {
                    var isLocked = lockedColumns[tableId] && lockedColumns[tableId][colIndex] === true;
                    $menu.data('tableId', tableId).data('colIndex', colIndex);
                    $menu.find('[data-action="lock"]').toggle(!isLocked);
                    $menu.find('[data-action="unlock"]').toggle(isLocked);
                    $menu.css({ top: e.pageY + 'px', left: e.pageX + 'px' }).addClass('show');
                }, 50);
            });
            
            $('#columnContextMenu').on('click', '.ba-column-context-menu-item', function(e) {
                e.stopPropagation();
                var action = $(this).data('action');
                var tableId = $('#columnContextMenu').data('tableId');
                var colIndex = $('#columnContextMenu').data('colIndex');
                if (!lockedColumns[tableId]) lockedColumns[tableId] = {};
                var locks = lockedColumns[tableId];
                
                if (action === 'lock') {
                    // Lock từ cột này về bên trái (tất cả cột <= colIndex)
                    for (var i = 0; i <= colIndex; i++) {
                        locks[i] = true;
                    }
                } else if (action === 'unlock') {
                    // Unlock từ cột này về bên phải (tất cả cột >= colIndex)
                    for (var i = colIndex; i < 100; i++) {
                        delete locks[i];
                    }
                }
                // Cột select (index 0) luôn được lock
                locks[0] = true;
                applyColumnLocks(tableId);
                $('#columnContextMenu').removeClass('show');
            });
        }
        
        function toggleColumnLock(tableId, colIndex) {
            // Không cho phép unlock cột select (index 0)
            if (colIndex === 0) return;
            
            if (!lockedColumns[tableId]) lockedColumns[tableId] = {};
            var locks = lockedColumns[tableId];
            var isLocked = locks[colIndex];
            
            if (isLocked) {
                // Unlock: unlock từ cột này về bên phải (tất cả cột >= colIndex)
                for (var i = colIndex; i < 100; i++) {
                    delete locks[i];
                }
            } else {
                // Lock: lock từ cột này về bên trái (tất cả cột <= colIndex)
                for (var i = 0; i <= colIndex; i++) {
                    locks[i] = true;
                }
            }
            // Cột select (index 0) luôn được lock
            locks[0] = true;
            applyColumnLocks(tableId);
        }
        
        function applyColumnLocks(tableId) {
            var $table = $('#' + tableId);
            if (!$table.length) return;
            var locks = lockedColumns[tableId] || {};
            
            // Đảm bảo cột select (index 0) luôn được lock
            locks[0] = true;
            
            var lockedIndices = Object.keys(locks).map(Number).sort(function(a, b) { return a - b; });
            
            $table.find('th, td').removeClass('ba-col-locked').css('left', '');
            
            if (lockedIndices.length === 0) {
                // Update lock icons
                $table.find('th').each(function() {
                    var colIndex = parseInt($(this).data('col-index'), 10);
                    if (!isNaN(colIndex)) {
                        $(this).find('.ba-lock-icon').text('🔓');
                    }
                });
                return;
            }
            
            var leftPos = 0;
            lockedIndices.forEach(function(colIndex) {
                var $th = $table.find('th[data-col-index="' + colIndex + '"]');
                var $tds = $table.find('tbody tr td[data-col-index="' + colIndex + '"]');
                
                if ($th.length) {
                    var colWidth = $th.outerWidth();
                    $th.addClass('ba-col-locked').css({
                        'left': leftPos + 'px',
                        'position': 'sticky',
                        'top': '0',
                        'z-index': '15'
                    });
                    $tds.addClass('ba-col-locked').css({
                        'left': leftPos + 'px',
                        'position': 'sticky'
                    });
                    leftPos += colWidth;
                }
            });
            
            // Update lock icons
            $table.find('th').each(function() {
                var colIndex = parseInt($(this).data('col-index'), 10);
                if (!isNaN(colIndex)) {
                    var isLocked = locks[colIndex];
                    $(this).find('.ba-lock-icon').text(isLocked ? '🔒' : '🔓');
                }
            });
        }

        function renderEmployees() {
            var $tb = $('#tblEmployees');
            var $pg = $('#pagerEmployees');
            var $table = $tb.closest('table');
            if (!employees.length) {
                $tb.html('<tr><td colspan="17" class="ba-empty">Không có employee nào.</td></tr>');
                $('#chkSelectAllEmployees').off('change').prop('checked', false);
                $pg.hide();
                return;
            }
            var filtered = filterEmployees();
            var sorted = sortEmployees(filtered);
            var total = sorted.length;
            var pages = Math.max(1, Math.ceil(total / EMPLOYEE_PAGE_SIZE));
            employeePage = Math.max(1, Math.min(employeePage, pages));
            var from = (employeePage - 1) * EMPLOYEE_PAGE_SIZE;
            var chunk = sorted.slice(from, from + EMPLOYEE_PAGE_SIZE);
            var html = '';
            chunk.forEach(function(e) {
                html += '<tr data-id="' + e.employeeID + '">' +
                    '<td data-col-index="0"><input type="checkbox" class="chkEmployee" data-id="' + e.employeeID + '" /></td>' +
                    '<td data-col-index="1">' + (e.employeeID || '-') + '</td>' +
                    '<td data-col-index="2">' + (e.localEmployeeID || '-') + '</td>' +
                    '<td data-col-index="3">' + (e.employeeName || '-') + '</td>' +
                    '<td data-col-index="4">' + (e.englishName || '-') + '</td>' +
                    '<td data-col-index="5">' + (e.dateOfBirth || '-') + '</td>' +
                    '<td data-col-index="6">' + (e.personalEmail || '-') + '</td>' +
                    '<td data-col-index="7">' + (e.businessEmail || '-') + '</td>' +
                    '<td data-col-index="8">' + (e.mobilePhone1 || '-') + '</td>' +
                    '<td data-col-index="9">' + (e.mobilePhone2 || '-') + '</td>' +
                    '<td data-col-index="10">' + (e.serviceStartDate || '-') + '</td>' +
                    '<td data-col-index="11">' + (e.alPolicy || '-') + '</td>' +
                    '<td data-col-index="12">' + (e.timeSheetPolicy || '-') + '</td>' +
                    '<td data-col-index="13">' + (e.organizionStructure || '-') + '</td>' +
                    '<td data-col-index="14">' + (e.managerFullName || '-') + '</td>' +
                    '<td data-col-index="15">' + (e.userName || '-') + '</td>' +
                    '<td data-col-index="16">' + (e.companyInfo || '-') + '</td></tr>';
            });
            $tb.html(html);
            setTimeout(function() { applyColumnLocks('tableEmployees'); }, 10);
            if ($table.length) {
                $table.find('th .sort-icon').text('');
                var $active = $table.find('th.ba-sortable[data-col="' + employeeSortCol + '"] .sort-icon');
                if ($active.length) $active.text(employeeSortDir === 1 ? '↑' : '↓');
            }
            $('#chkSelectAllEmployees').off('change').prop('checked', false).on('change', function() {
                var v = $(this).prop('checked');
                $('.chkEmployee').prop('checked', v);
            });
            $pg.show().empty();
            $pg.append('<span>Trang ' + employeePage + ' / ' + pages + ' (' + total + ' employee)</span> ');
            var $selEmp = $('<select class="ba-pager-size ba-input" id="selEmpPageSize" style="width:auto;padding:0.25rem 0.5rem;margin:0 0.5rem;"></select>');
            PAGE_SIZE_OPTS.forEach(function(n) { $selEmp.append($('<option></option>').val(n).text(n)); });
            $selEmp.val(EMPLOYEE_PAGE_SIZE);
            $pg.append($selEmp);
            $pg.append('<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" ' + (employeePage <= 1 ? 'disabled' : '') + ' id="btnEmpPrev">Trước</button>');
            $pg.append('<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" ' + (employeePage >= pages ? 'disabled' : '') + ' id="btnEmpNext">Sau</button>');
            $('#btnEmpPrev').on('click', function() { if (employeePage > 1) { employeePage--; renderEmployees(); } });
            $('#btnEmpNext').on('click', function() { if (employeePage < pages) { employeePage++; renderEmployees(); } });
            $('#selEmpPageSize').off('change').on('change', function() { EMPLOYEE_PAGE_SIZE = parseInt($(this).val(), 10); employeePage = 1; renderEmployees(); });
        }

        function showConfirmUpdateModal(message, onConfirm, onCancel) {
            $('#confirmUpdateMessage').text(message);
            $('#confirmUpdateModal').addClass('show').css('display', 'flex');
            $('#confirmUpdateOk').off('click');
            $('#confirmUpdateCancel').off('click');
            $('#confirmUpdateOk').on('click', function() {
                hideConfirmUpdateModal();
                if (typeof onConfirm === 'function') onConfirm();
            });
            $('#confirmUpdateCancel').on('click', function() {
                hideConfirmUpdateModal();
                if (typeof onCancel === 'function') onCancel();
            });
        }

        function hideConfirmUpdateModal() {
            $('#confirmUpdateModal').removeClass('show').css('display', 'none');
        }

        /** IDs để update: nếu không chọn ai = update all (danh sách đang hiển thị sau search/sort). */
        function getUpdateTargetIds() {
            var selected = [];
            $('.chkUser:checked').each(function() { selected.push(parseInt($(this).data('id'), 10)); });
            if (selected.length > 0) return selected;
            var list = sortUsers(filterUsers());
            return list.map(function(u) { return u.userID; });
        }

        function updateUsers() {
            var targetIds = getUpdateTargetIds();
            if (targetIds.length === 0) {
                showToast('Chưa có user nào để update. Bấm View Data trước.', 'error');
                return;
            }

            var isUpdatePassword = $('#chkUpdatePassword').is(':checked');
            var isUpdateEmail = $('#chkUpdateEmail').is(':checked');
            var ignoreWindowsAD = $('#chkIgnoreWindowsAD').is(':checked');

            if (!isUpdatePassword && !isUpdateEmail) {
                showToast('Vui lòng chọn ít nhất 1 option để update (Password hoặc Email).', 'error');
                return;
            }

            if (isUpdatePassword && !$('#txtPassword').val().trim()) {
                showToast('Đã chọn Update Password thì bắt buộc nhập password.', 'error');
                return;
            }
            if (isUpdateEmail && !$('#txtEmail').val().trim()) {
                showToast('Đã chọn Update Email thì bắt buộc nhập email.', 'error');
                return;
            }

            var isUpdateAll = $('.chkUser:checked').length === 0;
            var msg = isUpdateAll
                ? 'Chắc chắn update thông tin cho TẤT CẢ ' + targetIds.length + ' user? (Bạn không chọn ai = update cho all.)'
                : 'Chắc chắn update thông tin ' + targetIds.length + ' user đã chọn?';
            showConfirmUpdateModal(msg, function() {
                doUpdateUsers(targetIds, isUpdatePassword, isUpdateEmail, ignoreWindowsAD);
            });
        }

        function doUpdateUsers(targetIds, isUpdatePassword, isUpdateEmail, ignoreWindowsAD) {
            var chunks = [];
            for (var i = 0; i < targetIds.length; i += UPDATE_CHUNK_SIZE) {
                chunks.push(targetIds.slice(i, i + UPDATE_CHUNK_SIZE));
            }
            var totalChunks = chunks.length;
            var totalUsers = targetIds.length;

            updateInProgress = true;
            showProgress('Đang update users...', 0, '0 / ' + totalUsers + ' user');
            $('.ba-btn').prop('disabled', true);

            function runChunk(idx) {
                if (idx >= totalChunks) {
                    // All chunks completed - update session
                    $.ajax({
                        url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/UpdateUsersInSession") %>',
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        data: JSON.stringify({
                            k: hrToken,
                            userIds: targetIds,
                            isUpdatePassword: isUpdatePassword,
                            isUpdateEmail: isUpdateEmail,
                            email: isUpdateEmail ? $('#txtEmail').val().trim() : null
                        }),
                        timeout: 30000,
                        success: function(sessRes) {
                            var sd = sessRes.d || sessRes;
                            if (sd && sd.success) {
                                // Update local users array
                                var userIdSet = new Set(targetIds);
                                var newEmail = isUpdateEmail ? $('#txtEmail').val().trim() : null;
                                users.forEach(function(u) {
                                    if (userIdSet.has(u.userID)) {
                                        if (isUpdateEmail && newEmail) {
                                            u.userEmail = newEmail;
                                        }
                                    }
                                });
                                renderUsers();
                            }
                            showProgress('Hoàn thành', 100, totalUsers + ' / ' + totalUsers + ' user');
                            setTimeout(function() {
                                updateInProgress = false;
                                hideProgress();
                                $('.ba-btn').prop('disabled', false);
                                showToast('Đã update ' + totalUsers + ' user thành công.', 'success');
                            }, 400);
                        },
                        error: function() {
                            showProgress('Hoàn thành', 100, totalUsers + ' / ' + totalUsers + ' user');
                            setTimeout(function() {
                                updateInProgress = false;
                                hideProgress();
                                $('.ba-btn').prop('disabled', false);
                                showToast('Đã update ' + totalUsers + ' user thành công (session chưa cập nhật).', 'warning');
                            }, 400);
                        }
                    });
                    return;
                }
                var chunk = chunks[idx];
                var doneSoFar = Math.min(idx * UPDATE_CHUNK_SIZE, totalUsers);
                var pct = totalUsers > 0 ? Math.round((doneSoFar / totalUsers) * 100) : 0;
                showProgress('Đang update users...', Math.min(99, pct), doneSoFar + ' / ' + totalUsers + ' user');

                var payload = {
                    k: hrToken,
                    userIds: chunk,
                    isUpdatePassword: isUpdatePassword,
                    password: isUpdatePassword ? $('#txtPassword').val().trim() : null,
                    methodHash: parseInt($('#selMethodHash').val(), 10) || 256,
                    isUpdateEmail: isUpdateEmail,
                    email: isUpdateEmail ? $('#txtEmail').val().trim() : null,
                    ignoreWindowsAD: ignoreWindowsAD
                };

                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/UpdateUsers") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify(payload),
                    timeout: 300000,
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            runChunk(idx + 1);
                        } else {
                            updateInProgress = false;
                            hideProgress();
                            $('.ba-btn').prop('disabled', false);
                            showToast(d && d.message ? d.message : 'Lỗi update users.', 'error');
                        }
                    },
                    error: function(xhr, status, err) {
                        updateInProgress = false;
                        hideProgress();
                        $('.ba-btn').prop('disabled', false);
                        var msg = 'Lỗi kết nối hoặc timeout.';
                        if (xhr.responseText) {
                            try {
                                var json = JSON.parse(xhr.responseText);
                                if (json.d && json.d.message) msg = json.d.message;
                                else if (json.message) msg = json.message;
                            } catch(e) {}
                        }
                        showToast(msg, 'error');
                    }
                });
            }

            runChunk(0);
        }

        function getUpdateTargetEmployeeIds() {
            var selected = [];
            $('.chkEmployee:checked').each(function() { selected.push(parseInt($(this).data('id'), 10)); });
            if (selected.length > 0) return selected;
            var list = sortEmployees(filterEmployees());
            return list.map(function(e) { return e.employeeID; });
        }

        function updateEmployees() {
            var targetIds = getUpdateTargetEmployeeIds();
            if (targetIds.length === 0) {
                showToast('Chưa có employee nào để update. Bấm View Data trước.', 'error');
                return;
            }
            var updPersonal = $('#chkUpdPersonalEmail').is(':checked');
            var updBusiness = $('#chkUpdBusinessEmail').is(':checked');
            var updPayslip = $('#chkUpdPayslip').is(':checked');
            var payslipByEmp = $('#chkPayslipByEmployee').is(':checked');
            var updM1 = $('#chkUpdMobile1').is(':checked');
            var updM2 = $('#chkUpdMobile2').is(':checked');
            var updBasic = $('#chkUpdBasicSalary').is(':checked');
            if (!updPersonal && !updBusiness && !updPayslip && !updM1 && !updM2 && !updBasic) {
                showToast('Chọn ít nhất 1 option để update.', 'error');
                return;
            }
            if (updPersonal && !$('#txtPersonalEmail').val().trim()) {
                showToast('Đã chọn Update Personal Email thì bắt buộc nhập email.', 'error');
                return;
            }
            if (updBusiness && !$('#txtBusinessEmail').val().trim()) {
                showToast('Đã chọn Update Business Email thì bắt buộc nhập email.', 'error');
                return;
            }
            if (updPayslip && !payslipByEmp && !$('#txtPayslipCommon').val().trim()) {
                showToast('Đã chọn Update Payslip mà không Encrypt by Employee thì bắt buộc nhập Payslip password common.', 'error');
                return;
            }
            var isUpdateAll = $('.chkEmployee:checked').length === 0;
            var msg = isUpdateAll
                ? 'Chắc chắn update thông tin cho TẤT CẢ ' + targetIds.length + ' employee? (Bạn không chọn ai = update cho all.)'
                : 'Chắc chắn update thông tin ' + targetIds.length + ' employee đã chọn?';
            showConfirmUpdateModal(msg, function() {
                doUpdateEmployees(targetIds, updPersonal, updBusiness, updPayslip, payslipByEmp, updM1, updM2, updBasic);
            });
        }

        function doUpdateEmployees(targetIds, updPersonal, updBusiness, updPayslip, payslipByEmp, updM1, updM2, updBasic) {
            var chunks = [];
            for (var i = 0; i < targetIds.length; i += UPDATE_CHUNK_SIZE) {
                chunks.push(targetIds.slice(i, i + UPDATE_CHUNK_SIZE));
            }
            var totalChunks = chunks.length;
            var total = targetIds.length;

            var personalEmail = $('#txtPersonalEmail').val().trim();
            var businessEmail = $('#txtBusinessEmail').val().trim();
            var payslipCommon = $('#txtPayslipCommon').val().trim();
            var m1 = $('#txtMobile1').val().trim();
            var m2 = $('#txtMobile2').val().trim();
            var basicSalary = parseFloat($('#txtBasicSalary').val()) || 0;

            updateInProgress = true;
            showProgress('Đang update employees...', 0, '0 / ' + total + ' employee');
            $('.ba-btn').prop('disabled', true);

            function runChunk(idx) {
                if (idx >= totalChunks) {
                    // All chunks completed - update session
                    $.ajax({
                        url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/UpdateEmployeesInSession") %>',
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        data: JSON.stringify({
                            k: hrToken,
                            companyID: employeeCompanyFilter,
                            employeeIds: targetIds,
                            updPersonal: updPersonal,
                            personalEmail: personalEmail,
                            updBusiness: updBusiness,
                            businessEmail: businessEmail,
                            updM1: updM1,
                            m1: m1,
                            updM2: updM2,
                            m2: m2
                        }),
                        timeout: 30000,
                        success: function(sessRes) {
                            var sd = sessRes.d || sessRes;
                            if (sd && sd.success) {
                                // Update local employees array
                                var empIdSet = new Set(targetIds);
                                employees.forEach(function(e) {
                                    if (empIdSet.has(e.employeeID)) {
                                        if (updPersonal && personalEmail) e.personalEmail = personalEmail;
                                        if (updBusiness && businessEmail) e.businessEmail = businessEmail;
                                        if (updM1 && m1) e.mobilePhone1 = m1;
                                        if (updM2 && m2) e.mobilePhone2 = m2;
                                    }
                                });
                                renderEmployees();
                            }
                            showProgress('Hoàn thành', 100, total + ' / ' + total + ' employee');
                            setTimeout(function() {
                                updateInProgress = false;
                                hideProgress();
                                $('.ba-btn').prop('disabled', false);
                                showToast('Đã update ' + total + ' employee thành công.', 'success');
                            }, 400);
                        },
                        error: function() {
                            showProgress('Hoàn thành', 100, total + ' / ' + total + ' employee');
                            setTimeout(function() {
                                updateInProgress = false;
                                hideProgress();
                                $('.ba-btn').prop('disabled', false);
                                showToast('Đã update ' + total + ' employee thành công (session chưa cập nhật).', 'warning');
                            }, 400);
                        }
                    });
                    return;
                }
                var chunk = chunks[idx];
                var doneSoFar = Math.min(idx * UPDATE_CHUNK_SIZE, total);
                var pct = total > 0 ? Math.round((doneSoFar / total) * 100) : 0;
                showProgress('Đang update employees...', Math.min(99, pct), doneSoFar + ' / ' + total + ' employee');

                var payload = {
                    k: hrToken,
                    employeeIds: chunk,
                    updPersonal: updPersonal,
                    personalEmail: personalEmail,
                    updBusiness: updBusiness,
                    businessEmail: businessEmail,
                    updPayslip: updPayslip,
                    payslipCommon: payslipCommon,
                    payslipByEmp: payslipByEmp,
                    updM1: updM1,
                    m1: m1,
                    updM2: updM2,
                    m2: m2,
                    updBasic: updBasic,
                    basicSalary: basicSalary
                };

                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/UpdateEmployees") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify(payload),
                    timeout: 300000,
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            runChunk(idx + 1);
                        } else {
                            updateInProgress = false;
                            hideProgress();
                            $('.ba-btn').prop('disabled', false);
                            showToast(d && d.message ? d.message : 'Lỗi update employees.', 'error');
                        }
                    },
                    error: function(xhr, status, err) {
                        updateInProgress = false;
                        hideProgress();
                        $('.ba-btn').prop('disabled', false);
                        var msg = 'Lỗi kết nối hoặc timeout.';
                        if (xhr.responseText) {
                            try {
                                var json = JSON.parse(xhr.responseText);
                                if (json.d && json.d.message) msg = json.d.message;
                                else if (json.message) msg = json.message;
                            } catch(e) {}
                        }
                        showToast(msg, 'error');
                    }
                });
            }

            runChunk(0);
        }

        var companyTenants = [];
        var companyCompanies = [];
        var currentCompanyData = null;
        var companyInfoViewed = false;

        function updateCompanyButtonsState() {
            var isAll = $('#rbCompanyAll').is(':checked');
            var isSelect = $('#rbCompanySelect').is(':checked');
            var canEnable = isAll || (isSelect && companyInfoViewed);
            $('#btnCompanyUserAction, #btnCompanyCadenaServer, #btnCompanyUpdate').prop('disabled', !canEnable);
        }

        function loadTenants() {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadTenants") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.list) {
                        companyTenants = d.list || [];
                        var html = '<option value="">Select Tenant</option>';
                        companyTenants.forEach(function(t) {
                            html += '<option value="' + t.id + '">' + (t.code || '') + '</option>';
                        });
                        $('#selCompanyTenant').html(html);
                        $('#btnCompanyViewData').prop('disabled', true);
                        $('#selCompanyCompany').html('<option value="">Select tenant first</option>').prop('disabled', true);
                        updateCompanyButtonsState();
                    }
                },
                error: function() {
                    $('#selCompanyTenant').html('<option value="">Error loading tenants</option>');
                }
            });
        }

        function loadCompaniesByTenant(tenantId) {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadCompaniesByTenant") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, tenantID: parseInt(tenantId, 10) }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.list) {
                        companyCompanies = d.list || [];
                        var html = '<option value="">Select Company</option>';
                        companyCompanies.forEach(function(c) {
                            var text = (c.code || '') + ' - ' + (c.name || '');
                            html += '<option value="' + c.id + '">' + text + '</option>';
                        });
                        $('#selCompanyCompany').html(html).prop('disabled', false);
                        $('#btnCompanyViewData').prop('disabled', true);
                    }
                },
                error: function() {
                    $('#selCompanyCompany').html('<option value="">Error loading companies</option>');
                }
            });
        }

        function loadCompanyInfo() {
            var tenantId = $('#selCompanyTenant').val();
            var companyId = $('#selCompanyCompany').val();
            var isAll = $('#rbCompanyAll').is(':checked');
            if (!isAll && (!tenantId || !companyId)) {
                showToast('Chọn Tenant và Company hoặc chọn "Update for all Companies".', 'error');
                return;
            }
            clearCompanyValidation();
            showProgress('Đang load...', 0, 'Đang tải thông tin company...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadCompanyInfo") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, tenantID: tenantId ? parseInt(tenantId, 10) : null, companyID: companyId ? parseInt(companyId, 10) : null }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.data) {
                        currentCompanyData = d.data;
                        $('#txtCompanyHREmailTo').val(d.data.hrEmailTo || '').prop('disabled', false);
                        $('#txtCompanyHREmailCC').val(d.data.hrEmailCC || '').prop('disabled', false);
                        $('#txtCompanyPayrollEmailTo').val(d.data.payrollEmailTo || '').prop('disabled', false);
                        $('#txtCompanyPayrollEmailCC').val(d.data.payrollEmailCC || '').prop('disabled', false);
                        $('#txtCompanyContactEmail').val(d.data.email || '').prop('disabled', false);
                        $('#txtCompanyOutgoingServer').val(d.data.outgoingMailServer || '').prop('disabled', false);
                        $('#txtCompanyServerPort').val(d.data.outgoingMailServerPort || '').prop('disabled', false);
                        $('#txtCompanyAccountName').val(d.data.smtpDisplayName || '').prop('disabled', false);
                        $('#txtCompanyUserName').val(d.data.accountID || '').prop('disabled', false);
                        $('#txtCompanyEmailAddress').val(d.data.emailAddress || '').prop('disabled', false);
                        $('#txtCompanyPassword').val('').prop('disabled', false);
                        $('#chkCompanyEnableSSL').prop('checked', d.data.isEnableSSL || false);
                        $('#txtCompanySSLPort').val(d.data.sslPort || '').prop('disabled', !d.data.isEnableSSL);
                        companyInfoViewed = true;
                        updateCompanyButtonsState();
                    } else {
                        showToast(d && d.message ? d.message : 'Lỗi load company info.', 'error');
                    }
                    hideProgress();
                },
                error: function() {
                    showToast('Lỗi kết nối khi load company info.', 'error');
                    hideProgress();
                }
            });
        }

        function loadUserActionEmail() {
            showProgress('Đang xử lý...', 0, 'User Action Email...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetCurrentUserName") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 10000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.userName) {
                        var email = d.userName + '@cadena-hrmseries.com';
                        $('#txtCompanyPayrollEmailTo').val(email);
                        $('#txtCompanyPayrollEmailCC').val(email);
                        $('#txtCompanyHREmailTo').val(email);
                        $('#txtCompanyHREmailCC').val(email);
                        $('#txtCompanyContactEmail').val(email);
                    }
                    hideProgress();
                },
                error: function() {
                    hideProgress();
                }
            });
        }

        function loadCadenaEmailServer() {
            showProgress('Đang xử lý...', 0, 'Cadena Email Server...');
            $('#txtCompanyOutgoingServer').val('ns3.cadena-it.com');
            $('#txtCompanyUserName').val('test-noreply@cadena-hrmseries.com');
            $('#txtCompanyEmailAddress').val('test-noreply@cadena-hrmseries.com');
            $('#txtCompanyPassword').val('JOg7DBCMfjI5RZ05');
            $('#txtCompanyAccountName').val('CADENA');
            $('#txtCompanyServerPort').val('587');
            $('#chkCompanyEnableSSL').prop('checked', false);
            $('#txtCompanySSLPort').val('0').prop('disabled', true);
            setTimeout(function() { hideProgress(); }, 80);
        }

        function clearCompanyValidation() {
            $('.ba-input.ba-error').removeClass('ba-error');
            $('.ba-field-error').hide().text('');
        }

        function validateCompanyInfo() {
            clearCompanyValidation();
            var hasError = false;
            var useCommon = $('#chkCompanyUseCommonEmail').is(':checked');
            if (useCommon) {
                if (!$('#txtCompanyCommonEmail').val().trim()) {
                    showFieldError('#txtCompanyCommonEmail', 'Common email is required');
                    hasError = true;
                }
            } else {
                var requiredFields = ['#txtCompanyHREmailTo', '#txtCompanyHREmailCC', '#txtCompanyPayrollEmailTo', '#txtCompanyPayrollEmailCC', '#txtCompanyContactEmail'];
                requiredFields.forEach(function(sel) {
                    if (!$(sel).val().trim()) {
                        showFieldError(sel, 'This field is required');
                        hasError = true;
                    }
                });
            }
            var serverRequired = ['#txtCompanyOutgoingServer', '#txtCompanyServerPort', '#txtCompanyAccountName', '#txtCompanyUserName', '#txtCompanyEmailAddress', '#txtCompanyPassword'];
            serverRequired.forEach(function(sel) {
                if (!$(sel).val().trim() && $(sel).is(':not(:disabled)')) {
                    showFieldError(sel, 'This field is required');
                    hasError = true;
                }
            });
            return !hasError;
        }

        function showFieldError(selector, message) {
            var $input = $(selector);
            $input.addClass('ba-error');
            var $error = $input.siblings('.ba-field-error');
            if ($error.length === 0) {
                $error = $('<span class="ba-field-error"></span>');
                $input.after($error);
            }
            $error.text(message).show();
        }

        function updateCompanyInfo() {
            if (!validateCompanyInfo()) {
                showToast('Vui lòng điền đầy đủ các trường bắt buộc (*).', 'error');
                return;
            }
            var tenantId = $('#selCompanyTenant').val();
            var companyId = $('#selCompanyCompany').val();
            var isAll = $('#rbCompanyAll').is(':checked');
            var useCommon = $('#chkCompanyUseCommonEmail').is(':checked');
            if (!isAll && (!tenantId || !companyId)) {
                showToast('Chọn Tenant và Company hoặc chọn "Update for all Companies".', 'error');
                return;
            }
            var msg = isAll ? 'Chắc chắn update thông tin cho TẤT CẢ companies?' : 'Chắc chắn update thông tin company đã chọn?';
            showConfirmUpdateModal(msg, function() {
                var payload = {
                    k: hrToken,
                    tenantID: tenantId ? parseInt(tenantId, 10) : null,
                    companyID: companyId ? parseInt(companyId, 10) : null,
                    isUpdateAll: isAll,
                    useCommonEmail: useCommon,
                    commonEmail: $('#txtCompanyCommonEmail').val().trim(),
                    hrEmailTo: $('#txtCompanyHREmailTo').val().trim(),
                    hrEmailCC: $('#txtCompanyHREmailCC').val().trim(),
                    payrollEmailTo: $('#txtCompanyPayrollEmailTo').val().trim(),
                    payrollEmailCC: $('#txtCompanyPayrollEmailCC').val().trim(),
                    contactEmail: $('#txtCompanyContactEmail').val().trim(),
                    outgoingServer: $('#txtCompanyOutgoingServer').val().trim(),
                    serverPort: parseInt($('#txtCompanyServerPort').val(), 10) || 0,
                    accountName: $('#txtCompanyAccountName').val().trim(),
                    userName: $('#txtCompanyUserName').val().trim(),
                    emailAddress: $('#txtCompanyEmailAddress').val().trim(),
                    password: $('#txtCompanyPassword').val().trim(),
                    enableSSL: $('#chkCompanyEnableSSL').is(':checked'),
                    sslPort: parseInt($('#txtCompanySSLPort').val(), 10) || null
                };
                showProgress('Đang update...', 0, 'Đang cập nhật company info...');
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/UpdateCompanyInfo") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify(payload),
                    timeout: 300000,
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            // Không toast thành công
                        } else {
                            showToast(d && d.message ? d.message : 'Lỗi update company info.', 'error');
                        }
                        hideProgress();
                    },
                    error: function() {
                        showToast('Lỗi kết nối khi update company info.', 'error');
                        hideProgress();
                    }
                });
            });
        }
    </script>
</body>
</html>
