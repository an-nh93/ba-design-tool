<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="HRHelper.aspx.cs"
    Inherits="BADesign.Pages.HRHelper" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>HR Helper</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/jquery.signalR.min.js"></script>
    <script src="../Scripts/ba-signalr.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        /* Layout, nút, modal dùng ba-layout.css; chỉ giữ style riêng HR Helper bên dưới */
        .ba-conn-label { font-size: 0.875rem; color: var(--text-secondary); }
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
        .ba-btn:disabled, .ba-btn[disabled] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .ba-btn-dimmed { opacity: 0.6; cursor: not-allowed; }
        .ba-multi-load-dimmed { opacity: 0.6 !important; pointer-events: none !important; cursor: not-allowed; }
        .ba-multi-load-ready { font-weight: 600; color: var(--primary-light, #5ac8fa) !important; }
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
        .ba-collapsible-group {
            margin-bottom: 1.5rem;
            border-left: 3px solid var(--primary);
        }
        .ba-collapsible-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0;
            cursor: pointer;
            user-select: none;
            transition: background 0.2s;
        }
        .ba-collapsible-header:hover {
            background: rgba(255,255,255,0.03);
            margin: 0 -1rem;
            padding-left: 1rem;
            padding-right: 1rem;
        }
        .ba-collapsible-header .ba-collapse-icon {
            font-size: 0.75rem;
            color: var(--text-muted);
            transition: transform 0.2s;
        }
        .ba-collapsible-group.collapsed .ba-collapse-icon {
            transform: rotate(-90deg);
        }
        .ba-collapsible-body {
            padding-top: 0.5rem;
        }
        .ba-collapsible-group.collapsed .ba-collapsible-body {
            display: none;
        }
        .ba-column-row {
            border-radius: 4px;
            transition: background 0.15s;
        }
        .ba-column-row:focus-within,
        .ba-column-row.ba-column-row-focused {
            background: var(--bg-hover);
            outline: 1px solid var(--primary);
            outline-offset: -1px;
        }
        .ba-column-row.ba-column-row-checked {
            background: rgba(0, 120, 212, 0.12);
            border-left: 2px solid var(--primary);
        }
        .ba-column-row.ba-column-row-checked:focus-within,
        .ba-column-row.ba-column-row-checked.ba-column-row-focused {
            background: rgba(0, 120, 212, 0.18);
        }
        .ba-column-row .ba-copy-select-btn {
            opacity: 0;
            padding: 0.15rem 0.4rem;
            font-size: 0.7rem;
            flex-shrink: 0;
            transition: opacity 0.2s;
            background: var(--bg-hover);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text-primary);
            cursor: pointer;
            margin-left: 0.25rem;
        }
        .ba-column-row .ba-copy-select-btn:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        .ba-column-row:hover .ba-copy-select-btn {
            opacity: 1;
        }
        #generateEmployeeTestDataModal { z-index: 10020; }
        #generateEmployeeTestDataConfirmModal { z-index: 10030; }
        /* Overlay chừa menu trái (sidebar) để user vẫn dùng được các chức năng khác */
        /* Overlay full viewport (kể cả khi sidebar thu hẹp) để không bị hở */
        .ba-progress-overlay {
            position: fixed;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1.5rem;
        }
        .ba-progress-overlay.show { display: flex; }
        /* Overlay full viewport (kể cả khi sidebar thu hẹp). z-index thấp hơn .ba-notif-panel (10050) để bấm chuông vẫn xem được % */
        .ba-hr-job-overlay {
            display: none;
            position: fixed;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.75);
            z-index: 1050;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1rem;
        }
        .ba-hr-job-overlay.show { display: flex; }
        .ba-hr-job-overlay .ba-hr-job-spinner {
            width: 48px;
            height: 48px;
            min-width: 48px;
            min-height: 48px;
            border: 4px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            will-change: transform;
        }
        .ba-hr-job-overlay .ba-hr-job-text {
            color: var(--text-primary);
            font-size: 1rem;
        }
        .ba-hr-job-overlay-inner {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem 2rem;
            max-width: 480px;
            width: 90%;
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .ba-hr-job-overlay-detail {
            color: var(--text-muted);
            font-size: 0.875rem;
            max-width: 420px;
            text-align: center;
            line-height: 1.5;
            margin-top: 0.25rem;
        }
        .ba-progress-content {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            width: 560px;
            min-width: 560px;
            max-width: 95vw;
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
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .ba-progress-db-section {
            width: 100%;
            margin-top: 0.5rem;
        }
        .ba-progress-db-label {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-bottom: 0.35rem;
            text-align: left;
        }
        .ba-empty { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; }
        .ba-empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem 1rem; }
        .ba-empty-state-icon { font-size: 2rem; opacity: 0.6; line-height: 1; }
        .ba-empty-state-link { color: var(--primary); text-decoration: none; font-weight: 500; cursor: pointer; }
        .ba-empty-state-link:hover { text-decoration: underline; }
        .ba-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        /* Modal + nút × dùng chung từ ba-layout.css */
        .ba-btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8125rem; }
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10040;
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
        .toast { position: relative; padding-right: 2rem; padding-top: 0.25rem; }
        .toast .toast-close { position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0 4px; margin: 0; font-size: 1.25rem; line-height: 1; flex-shrink: 0; }
        .toast .toast-close:hover { color: var(--text-primary); }
        .toast.success { border-left: 4px solid var(--success); }
        .toast.error { border-left: 4px solid var(--danger); }
        .toast.info { border-left: 4px solid var(--primary); }
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .ba-collapse-section { margin-top: 1.5rem; }
        .ba-collapse-header {
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0;
        }
        .ba-collapse-header:hover { color: var(--primary-light); }
        .ba-collapse-icon {
            display: inline-block;
            transition: transform 0.2s ease;
            font-size: 0.75rem;
        }
        .ba-collapse-section.collapsed .ba-collapse-icon { transform: rotate(-90deg); }
        .ba-collapse-section.collapsed .ba-collapse-body { display: none; }
        .ba-collapse-body { margin-top: 0.5rem; }
        .ba-hash-hint {
            font-size: 0.8125rem;
            margin: 0.5rem 0 0;
            padding: 0.5rem 0.75rem;
            background: var(--primary-soft);
            border-left: 3px solid var(--primary);
            color: var(--text-secondary);
            border-radius: 0 4px 4px 0;
        }
        /* Info icon + popover: đảm bảo hiển thị và click hoạt động trên HR Helper */
        .ba-info-icon {
            display: inline-flex !important; align-items: center; justify-content: center;
            width: 18px !important; height: 18px !important; border-radius: 50%;
            border: 1px solid var(--text-muted, #969696); color: var(--text-muted, #969696);
            font-size: 0.75rem; font-weight: 600; font-style: italic;
            cursor: pointer; flex-shrink: 0;
        }
        .ba-info-icon:hover { border-color: var(--primary-light, #0D9EFF) !important; color: var(--primary-light, #0D9EFF) !important; }
        .ba-info-wrap { position: relative !important; }
        .ba-info-popover {
            position: absolute !important; z-index: 10003 !important;
            bottom: 100%; left: 0; margin-bottom: 6px;
            width: 360px; max-width: min(380px, calc(100vw - 2rem));
            padding: 0.75rem 1rem;
            background: var(--bg-card, #2d2d30); border: 1px solid var(--border, #3e3e42);
            border-radius: 8px; font-size: 0.8125rem; line-height: 1.5;
            color: var(--text-secondary, #cccccc); box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            box-sizing: border-box; white-space: normal;
            overflow-wrap: break-word; word-break: break-word;
            display: none;
        }
        .ba-info-popover.show { display: block !important; }
        /* Giữ icon (i) cùng dòng với label; căn giữa dọc, không sát caption */
        .ba-form-label-row { flex-wrap: nowrap !important; display: flex !important; align-items: center; gap: 0.5rem !important; }
        .ba-form-label-row .ba-form-label { line-height: 1.25; }
        .ba-form-label-row .ba-info-wrap { flex-shrink: 0; align-self: center; }
        .ba-form-label-row .ba-form-label { display: inline-flex; align-items: center; }
        .ba-label-with-info { display: inline-flex !important; align-items: center; flex-wrap: nowrap; gap: 0.5rem !important; flex-shrink: 0; }
        .ba-info-icon { line-height: 1; vertical-align: middle; margin-top: -1px; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <aside class="ba-sidebar" id="baSidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">HR Helper</div>
                    <button type="button" class="ba-sidebar-toggle" id="baSidebarToggle" title="Thu nhỏ menu">◀</button>
                </div>
                <nav class="ba-nav">
                    <a href="<%= ResolveUrl(BADesign.UiAuthHelper.GetHomeUrlByRole() ?? "~/") %>" class="ba-nav-item" data-icon="🏠" title="Về trang chủ"><span>🏠 Về trang chủ</span></a>
                    <a href="<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>" class="ba-nav-item" data-icon="🔍" title="Database Tools"><span>🔍 Database Tools</span></a>
                    <a href="#" class="ba-nav-item active" data-icon="👥" title="HR Helper"><span>👥 HR Helper</span></a>
                    <% if (CanEditSettings) { %><a href="<%= ResolveUrl("~/AppSettings") %>" class="ba-nav-item" data-icon="⚙" title="App Settings"><span>⚙ App Settings</span></a><% } %>
                </nav>
            </aside>
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <% if (!IsMultiDbMode) { %>
                <input type="hidden" id="hrCurrentServer" value="<%= Server.HtmlEncode(ConnectedServer ?? "") %>" />
                <input type="hidden" id="hrCurrentDatabase" value="<%= Server.HtmlEncode(ConnectedDatabase ?? "") %>" />
                <div class="ba-hr-conn-bar" style="padding: 0.5rem 2rem; background: var(--bg-darker, #161616); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                    <span class="ba-conn-label" style="font-size: 0.875rem;"><span>Server: <strong><%= ConnectedServer %></strong></span><span style="margin-left: 1rem;">Database: <strong><%= ConnectedDatabase %></strong></span></span>
                    <a href="<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>" class="ba-btn ba-btn-secondary" style="flex-shrink: 0;">← Về Database Tools</a>
                    <a href="<%= EncryptDecryptUrl %>" class="ba-btn ba-btn-secondary" style="flex-shrink: 0;">Generate Demo Reset Script</a>
                    <a href="<%= PgpToolUrl %>" class="ba-btn ba-btn-secondary" style="flex-shrink: 0;">PGP Tool</a>
                </div>
                <% } %>
                <div class="ba-content">
                    <% if (!IsMultiDbMode) { %>
                    <p class="ba-page-desc" style="color: var(--text-muted); font-size: 0.9rem; margin: 0 0 1rem 0;">Xem và cập nhật User, Employee, Company; reset Email/Phone và cấu hình demo.</p>
                    <div class="ba-tabs">
                        <button type="button" class="ba-tab active" data-tab="users">Users</button>
                        <button type="button" class="ba-tab" data-tab="employees">Employee Info</button>
                        <button type="button" class="ba-tab" data-tab="company">Company Info</button>
                        <button type="button" class="ba-tab" data-tab="other">Other Information</button>
                    </div>
                    <div id="tabUsers" class="ba-tab-content active">
                        <div class="ba-card ba-card-scrollable">
                            <h2 class="ba-card-title">User Management</h2>
                            <div class="ba-grid-toolbar" style="display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnViewDataUsers" onclick="loadUsers(); return false;">View Data</button>
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnUpdateUserSignature" onclick="updateUserSignature(); return false;" style="display: none;" disabled title="Chọn ít nhất 1 user ở bảng dưới">Update User Signature</button>
                                </div>
                                <input type="text" id="txtSearchUsers" class="ba-input ba-search" placeholder="Search User ID, Name, Employee, Email, Tenant... (có dấu / không dấu)" style="width: 360px; flex: none; margin-left: auto;" />
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
                                        <tr><td colspan="11" class="ba-empty"><div class="ba-empty-state"><span class="ba-empty-state-icon">👥</span><span>Chưa tải dữ liệu. Bấm <a href="#" class="ba-empty-state-link" id="usersEmptyLink">View Data</a> để tải danh sách user.</span></div></td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div id="pagerUsers" class="ba-pager" style="display: none;"></div>
                            <div class="ba-card ba-update-section ba-collapse-section" id="sectionUpdateEmailPassword">
                                <div class="ba-collapse-header" onclick="toggleCollapseSection(this)">
                                    <span class="ba-collapse-icon">▼</span>
                                    <h3 class="ba-card-title" style="font-size: 1.1rem; margin: 0;">Update email &amp; password</h3>
                                </div>
                                <div class="ba-collapse-body">
                                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Chọn user ở bảng trên, bật option dưới đây rồi bấm <strong>Generate and Update</strong>.</p>
                                <div class="ba-form-group">
                                    <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                        <input type="checkbox" id="chkUpdatePassword" />
                                        <label for="chkUpdatePassword">Update Password</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Bật để đổi mật khẩu user đã chọn. Nhập password bên dưới và chọn Method Hash (SHA256/SHA512) tương ứng phiên bản Cadena.</div>
                                        </span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; align-items: start;">
                                        <input type="text" id="txtPassword" class="ba-input" placeholder="Enter password" disabled />
                                        <div>
                                            <select id="selMethodHash" class="ba-input" disabled>
                                                <option value="256">Hash 256 (SHA256)</option>
                                                <option value="512">Hash 512 (SHA512)</option>
                                            </select>
                                            <p class="ba-hash-hint">MD5: version 5.0.73 trở xuống. Hash 256: phiên bản mới hơn.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="ba-form-group">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; align-items: start;">
                                        <div>
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkUpdateEmail" />
                                                <label for="chkUpdateEmail">Update Email</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Bật để cập nhật email đăng nhập cho user đã chọn. Nhập email mới vào ô bên dưới.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtEmail" class="ba-input" placeholder="Example: an.nh@cadena-hrmseries.com" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div>
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkIgnoreWindowsAD" />
                                                <label for="chkIgnoreWindowsAD">Is Ignore Window AD Account</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Khi bật: hệ thống đổi loại tài khoản từ Windows AD sang Normal và generate password. Dùng khi cần tách user khỏi AD.</div>
                                                </span>
                                            </div>
                                            <p style="color: var(--text-muted); font-size: 0.8125rem; margin-top: 0.25rem;">When checked system will change type Window AD Account to Normal Account and generate password.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="ba-actions" style="margin-top: 1rem;">
                                    <button type="button" class="ba-btn ba-btn-primary" onclick="updateUsers(); return false;">Generate and Update</button>
                                </div>
                                </div>
                            </div>
                            <div class="ba-card ba-update-section ba-collapse-section" id="sectionGenerateScript">
                                <div class="ba-collapse-header" onclick="toggleCollapseSection(this)">
                                    <span class="ba-collapse-icon">▼</span>
                                    <h3 class="ba-card-title" style="font-size: 1.1rem; margin: 0;">Generate password update script (SQL)</h3>
                                </div>
                                <div class="ba-collapse-body">
                                <p class="ba-script-instruction" style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Chọn user ở bảng trên, nhập password và chọn cách mã hóa. Script chỉ generate để copy chạy tay.</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; align-items: start; margin-bottom: 1rem;">
                                    <div class="ba-form-group" style="margin: 0;">
                                        <div class="ba-form-label-row">
                                            <label class="ba-form-label" for="txtScriptPassword">Password</label>
                                            <span class="ba-info-wrap">
                                                <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                <div class="ba-info-popover" style="display: none;">Mật khẩu sẽ được hash và ghi vào script. Chạy script tại DB để cập nhật password cho user đã chọn.</div>
                                            </span>
                                        </div>
                                        <input type="text" id="txtScriptPassword" class="ba-input" placeholder="Nhập password" autocomplete="off" />
                                    </div>
                                    <div class="ba-form-group" style="margin: 0;">
                                        <div class="ba-form-label-row">
                                            <label class="ba-form-label" for="selScriptMethodHash">Method Hash</label>
                                            <span class="ba-info-wrap">
                                                <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                <div class="ba-info-popover" style="display: none;">MD5: dùng cho Cadena version 5.0.73 trở xuống. Hash 256 (SHA256): phiên bản mới hơn. Chọn đúng theo phiên bản DB đang dùng.</div>
                                            </span>
                                        </div>
                                        <select id="selScriptMethodHash" class="ba-input">
                                            <option value="256">Hash 256 (SHA256)</option>
                                            <option value="MD5">MD5</option>
                                        </select>
                                        <p class="ba-hash-hint">MD5: version 5.0.73 trở xuống. Hash 256: phiên bản mới hơn.</p>
                                    </div>
                                </div>
                                <div class="ba-actions" style="margin-bottom: 0.75rem;">
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnGeneratePasswordScript" onclick="generatePasswordScript(); return false;">Generate script</button>
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyPasswordScript" onclick="copyPasswordScript(); return false;" style="display: none;">Copy</button>
                                </div>
                                <textarea id="txtPasswordScript" class="ba-input" readonly rows="12" placeholder="Script SQL sẽ hiển thị ở đây..." style="width: 100%; font-family: Consolas, monospace; font-size: 0.875rem;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Employees -->
                    <div id="tabEmployees" class="ba-tab-content">
                        <div class="ba-card ba-card-scrollable">
                            <h2 class="ba-card-title">Employee Management</h2>
                            <div class="ba-actions" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button type="button" class="ba-btn ba-btn-primary" id="btnViewDataEmployees" onclick="loadEmployees(); return false;">View Data</button>
                                <button type="button" class="ba-btn ba-btn-secondary" id="btnGenerateEmployeeTestData" onclick="openGenerateEmployeeTestDataModal(); return false;">Generate Test Data</button>
                                <button type="button" class="ba-btn ba-btn-danger" id="btnDeleteEmployees" style="display: none;" onclick="openDeleteEmployeeConfirm(); return false;" title="Xóa employee đã chọn">Delete Employee</button>
                                <button type="button" class="ba-btn ba-btn-secondary" id="btnGenerateDeleteScript" onclick="openGenerateDeleteScriptModal(); return false;">Generate Delete Script</button>
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
                                        <tr><td colspan="17" class="ba-empty"><div class="ba-empty-state"><span class="ba-empty-state-icon">👤</span><span>Chưa tải dữ liệu. Bấm <a href="#" class="ba-empty-state-link" id="employeesEmptyLink">View Data</a> để tải danh sách employee.</span></div></td></tr>
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
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkUpdPersonalEmail" />
                                                <label for="chkUpdPersonalEmail">Update Personal Email</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Cập nhật email cá nhân cho employee đã chọn. Không chọn employee = áp dụng cho tất cả.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtPersonalEmail" class="ba-input" placeholder="user@cadena-hrmseries.com" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkUpdBusinessEmail" />
                                                <label for="chkUpdBusinessEmail">Update Business Email</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Cập nhật email công việc cho employee đã chọn.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtBusinessEmail" class="ba-input" placeholder="user@company.com" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkUpdPayslip" />
                                                <label for="chkUpdPayslip">Update Payslip Password</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Cập nhật mật khẩu payslip. Bật &quot;Encrypt by Employee (Local ID)&quot; để mã hóa theo từng nhân viên; không bật thì dùng chuỗi chung.</div>
                                                </span>
                                            </div>
                                            <div class="ba-checkbox" style="margin-top: 0.5rem; margin-left: 1.5rem;"><input type="checkbox" id="chkPayslipByEmployee" /><label for="chkPayslipByEmployee">Encrypt by Employee (Local ID)</label></div>
                                            <input type="text" id="txtPayslipCommon" class="ba-input" placeholder="Payslip common (nếu không encrypt by employee)" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                    </div>
                                    <div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkUpdMobile1" />
                                                <label for="chkUpdMobile1">Update Mobile 1</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Cập nhật số điện thoại 1 cho employee đã chọn.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtMobile1" class="ba-input" placeholder="Số điện thoại 1" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkUpdMobile2" />
                                                <label for="chkUpdMobile2">Update Mobile 2</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Cập nhật số điện thoại 2 cho employee đã chọn.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtMobile2" class="ba-input" placeholder="Số điện thoại 2" style="margin-top: 0.5rem;" disabled />
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkUpdBasicSalary" />
                                                <label for="chkUpdBasicSalary">Update Basic Salary</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Cập nhật lương cơ bản (vd. 0 để mask).</div>
                                                </span>
                                            </div>
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
                                        <div class="ba-form-group" style="margin: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: nowrap;">
                                            <span class="ba-label-with-info">
                                                <label class="ba-form-label" style="margin: 0; white-space: nowrap;">Tenant</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Chọn tenant trước, sau đó chọn Company trong tenant đó để xem/cập nhật cấu hình email company.</div>
                                                </span>
                                            </span>
                                            <select id="selCompanyTenant" class="ba-input" style="flex: 1; min-width: 0;">
                                                <option value="">Loading tenants...</option>
                                            </select>
                                        </div>
                                        <div class="ba-form-group" style="margin: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: nowrap;">
                                            <span class="ba-label-with-info">
                                                <label class="ba-form-label" style="margin: 0; white-space: nowrap;">Company</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Danh sách company thuộc tenant đã chọn. Chọn xong bấm View Data để tải thông tin.</div>
                                                </span>
                                            </span>
                                            <select id="selCompanyCompany" class="ba-input" style="flex: 1; min-width: 0;" disabled>
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
                                <p id="companyViewDataHint" class="ba-company-hint" style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.5rem;">Chọn Tenant và Company ở trên rồi bấm View Data.</p>
                            </div>
                            <div class="ba-card ba-update-section ba-collapse-section" style="margin-top: 1.5rem;">
                                <div class="ba-collapse-header" onclick="toggleCollapseSection(this)">
                                    <span class="ba-collapse-icon">▼</span>
                                    <h3 class="ba-card-title" style="font-size: 1.1rem; margin: 0;">Company Email Settings</h3>
                                </div>
                                <div class="ba-collapse-body">
                                <div class="ba-actions" style="margin-bottom: 1rem;" id="companyUserActionWrap">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnCompanyUserAction" onclick="loadUserActionEmail(); return false;" disabled>User Action Email</button>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                        <input type="checkbox" id="chkCompanyUseCommonEmail" />
                                        <label for="chkCompanyUseCommonEmail">Use Default Email</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Khi bật: dùng một email mặc định cho các trường HR/Payroll; nhập email đó vào ô bên dưới.</div>
                                        </span>
                                    </div>
                                    <input type="text" id="txtCompanyCommonEmail" class="ba-input" placeholder="Default email (if checked)" style="margin-top: 0.5rem;" disabled />
                                </div>
                                <div class="ba-update-grid" style="margin-top: 1rem;">
                                    <div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">HR Support Email <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Email nhận thông báo hỗ trợ HR. Bắt buộc nhập.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyHREmailTo" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">HR CC Email <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Email CC cho thông báo HR. Bắt buộc nhập.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyHREmailCC" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Payroll Support Email <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Email nhận thông báo hỗ trợ Payroll. Bắt buộc nhập.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyPayrollEmailTo" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Payroll CC Email <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Email CC cho thông báo Payroll. Bắt buộc nhập.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyPayrollEmailCC" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Contact Email <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Email liên hệ. Bắt buộc nhập. Nếu không nhập, chương trình sẽ dùng Email của User Action.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyContactEmail" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                    </div>
                                </div>
                                <p style="color: var(--text-muted); font-size: 0.8125rem; margin-top: 1rem; font-style: italic;">
                                    If user not input data, program will reset value is Email of User Action.
                                </p>
                                </div>
                            </div>
                            <div class="ba-card ba-update-section ba-collapse-section" style="margin-top: 1.5rem;">
                                <div class="ba-collapse-header" onclick="toggleCollapseSection(this)">
                                    <span class="ba-collapse-icon">▼</span>
                                    <h3 class="ba-card-title" style="font-size: 1.1rem; margin: 0;">Email Server Settings</h3>
                                </div>
                                <div class="ba-collapse-body">
                                <div class="ba-actions" style="margin-bottom: 1rem;">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnCompanyCadenaServer" onclick="loadCadenaEmailServer(); return false;" disabled>Cadena Email Server</button>
                                </div>
                                <div class="ba-update-grid">
                                    <div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Outgoing Email Server <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">SMTP server gửi mail (vd. smtp.company.com). Khi điền nhóm này, chương trình chuyển Email Server sang SMTP.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyOutgoingServer" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Port <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Cổng SMTP (thường 25 hoặc 587). Bật SSL thì dùng SSL Port.</div>
                                                </span>
                                            </div>
                                            <input type="number" id="txtCompanyServerPort" class="ba-input" min="1" max="65535" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Account Name <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Tên tài khoản SMTP dùng để gửi mail.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyAccountName" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Username <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Username đăng nhập SMTP.</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyUserName" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Email Address <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Địa chỉ email gửi đi (From).</div>
                                                </span>
                                            </div>
                                            <input type="text" id="txtCompanyEmailAddress" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-form-label-row">
                                                <label class="ba-form-label">Password <span class="ba-required">(*)</span></label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Mật khẩu tài khoản SMTP.</div>
                                                </span>
                                            </div>
                                            <input type="password" id="txtCompanyPassword" class="ba-input" data-required="true" disabled />
                                            <span class="ba-field-error" style="display: none;"></span>
                                        </div>
                                        <div class="ba-form-group">
                                            <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                                <input type="checkbox" id="chkCompanyEnableSSL" />
                                                <label for="chkCompanyEnableSSL">Enable SSL</label>
                                                <span class="ba-info-wrap">
                                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                    <div class="ba-info-popover" style="display: none;">Bật kết nối SMTP qua SSL. Sau khi bật có thể nhập SSL Port (vd. 465).</div>
                                                </span>
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
                            </div>
                            <div class="ba-actions" style="margin-top: 1.5rem;">
                                <button type="button" class="ba-btn ba-btn-primary" id="btnCompanyUpdate" onclick="updateCompanyInfo(); return false;" disabled>Update Company Info</button>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Other Information -->
                    <div id="tabOther" class="ba-tab-content">
                        <div class="ba-card ba-card-scrollable">
                            <h2 class="ba-card-title">Reset Other Information</h2>
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.5rem;">Reset các thông tin cấu hình khác trong database. Mỗi phần dưới đây tương ứng với một bảng/cấu hình cụ thể.</p>

                            <!-- Section: Reset tất cả cột Email -->
                            <div class="ba-card ba-update-section ba-collapsible-group" id="groupEmail">
                                <div class="ba-collapsible-header" onclick="toggleOtherGroup('groupEmail'); return false;">
                                    <span class="ba-collapse-icon">▼</span>
                                    <h3 class="ba-card-title" style="font-size: 1.1rem; margin: 0;">Reset trường Email (Gợi ý)</h3>
                                </div>
                                <div class="ba-collapsible-body">
                                <p style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 1rem;">Liệt kê tất cả bảng có cột tên chứa "Email" và kiểu text. Chọn các bảng cần reset rồi nhập email chung.</p>
                                <div class="ba-actions" style="margin-bottom: 0.75rem;">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnLoadEmailColumns" onclick="loadEmailColumnsList(); return false;">Tải danh sách bảng có cột Email</button>
                                </div>
                                <div id="emailColumnsStatus" class="ba-other-status" style="font-size: 0.8125rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Bấm nút trên để tải danh sách.</div>
                                <div id="emailColumnsControls" style="margin-bottom: 0.5rem; display: none;">
                                    <input type="text" id="searchEmailColumns" class="ba-input" placeholder="Tìm theo tên bảng hoặc trạng thái (Cần reset, OK)..." style="width: 100%; margin-bottom: 0.5rem; padding: 0.35rem 0.5rem; font-size: 0.8125rem;" />
                                    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
                                        <label class="ba-checkbox" style="display: inline-flex; align-items: center; cursor: pointer; margin: 0;">
                                            <input type="checkbox" id="chkSelectAllEmailColumns" />
                                            <span style="margin-left: 0.5rem;">Chọn tất cả</span>
                                        </label>
                                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" onclick="selectEmailColumnsNeedReset(); return false;" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem;">Chọn tất cả cần reset</button>
                                        <span style="font-size: 0.8125rem; color: var(--text-muted);">Sắp xếp:</span>
                                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm email-sort-btn" data-sort="name" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem;">Tên bảng <span class="sort-icon" id="emailSortNameIcon"></span></button>
                                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm email-sort-btn" data-sort="status" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem;">Trạng thái <span class="sort-icon" id="emailSortStatusIcon"></span></button>
                                        <span id="emailSelectedCount" style="font-size: 0.8125rem; color: var(--primary); font-weight: 500;"></span>
                                        <label class="ba-checkbox" style="display: inline-flex; align-items: center; cursor: pointer; margin: 0;">
                                            <input type="checkbox" id="chkEmailFilterSelected" />
                                            <span style="margin-left: 0.5rem; font-size: 0.8125rem;">Chỉ hiện đã chọn</span>
                                        </label>
                                    </div>
                                </div>
                                <div id="emailSelectedSummary" style="display: none; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(0,120,212,0.08); border-radius: 6px; border: 1px solid var(--border);">
                                    <div style="font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.35rem;">Đã chọn:</div>
                                    <div id="emailSelectedList" style="font-size: 0.75rem; font-family: monospace; max-height: 80px; overflow-y: auto;"></div>
                                </div>
                                <div id="emailColumnsListWrap" style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; background: var(--bg-darker); margin-bottom: 1rem; display: none;">
                                    <div id="emailColumnsList" style="display: flex; flex-direction: column; gap: 0.25rem;"></div>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="txtOtherEmailColumnsEmail">Email reset chung</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Email sẽ gán cho tất cả cột đã chọn trong danh sách bảng có cột Email. Bấm &quot;Reset các cột đã chọn&quot; để thực hiện.</div>
                                        </span>
                                    </div>
                                    <input type="text" id="txtOtherEmailColumnsEmail" class="ba-input" placeholder="user@cadena.com.sg" style="max-width: 400px;" />
                                </div>
                                <div class="ba-actions">
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnResetEmailColumns" onclick="resetEmailColumns(); return false;" disabled>Reset các cột đã chọn <span id="btnEmailCount"></span></button>
                                </div>
                                </div>
                            </div>

                            <!-- Section: Reset tất cả cột Phone -->
                            <div class="ba-card ba-update-section ba-collapsible-group" id="groupPhone">
                                <div class="ba-collapsible-header" onclick="toggleOtherGroup('groupPhone'); return false;">
                                    <span class="ba-collapse-icon">▼</span>
                                    <h3 class="ba-card-title" style="font-size: 1.1rem; margin: 0;">Reset trường Phone (Gợi ý)</h3>
                                </div>
                                <div class="ba-collapsible-body">
                                <p style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 1rem;">Liệt kê tất cả bảng có cột tên chứa "Phone" và kiểu text. Chọn các bảng cần reset rồi nhập số điện thoại chung.</p>
                                <div class="ba-actions" style="margin-bottom: 0.75rem;">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnLoadPhoneColumns" onclick="loadPhoneColumnsList(); return false;">Tải danh sách bảng có cột Phone</button>
                                </div>
                                <div id="phoneColumnsStatus" class="ba-other-status" style="font-size: 0.8125rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Bấm nút trên để tải danh sách.</div>
                                <div id="phoneColumnsControls" style="margin-bottom: 0.5rem; display: none;">
                                    <input type="text" id="searchPhoneColumns" class="ba-input" placeholder="Tìm theo tên bảng..." style="width: 100%; margin-bottom: 0.5rem; padding: 0.35rem 0.5rem; font-size: 0.8125rem;" />
                                    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
                                        <label class="ba-checkbox" style="display: inline-flex; align-items: center; cursor: pointer; margin: 0;">
                                            <input type="checkbox" id="chkSelectAllPhoneColumns" />
                                            <span style="margin-left: 0.5rem;">Chọn tất cả</span>
                                        </label>
                                        <span style="font-size: 0.8125rem; color: var(--text-muted);">Sắp xếp:</span>
                                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm phone-sort-btn" data-sort="name" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem;">Tên bảng <span class="sort-icon" id="phoneSortNameIcon"></span></button>
                                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm phone-sort-btn" data-sort="status" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem;">Trạng thái <span class="sort-icon" id="phoneSortStatusIcon"></span></button>
                                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" onclick="selectPhoneColumnsNeedReset(); return false;" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem;">Chọn cột cần reset</button>
                                        <span id="phoneSelectedCount" style="font-size: 0.8125rem; color: var(--primary); font-weight: 500;"></span>
                                        <label class="ba-checkbox" style="display: inline-flex; align-items: center; cursor: pointer; margin: 0;">
                                            <input type="checkbox" id="chkPhoneFilterSelected" />
                                            <span style="margin-left: 0.5rem; font-size: 0.8125rem;">Chỉ hiện đã chọn</span>
                                        </label>
                                    </div>
                                </div>
                                <div id="phoneSelectedSummary" style="display: none; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(0,120,212,0.08); border-radius: 6px; border: 1px solid var(--border);">
                                    <div style="font-size: 0.8125rem; font-weight: 500; margin-bottom: 0.35rem;">Đã chọn:</div>
                                    <div id="phoneSelectedList" style="font-size: 0.75rem; font-family: monospace; max-height: 80px; overflow-y: auto;"></div>
                                </div>
                                <div id="phoneColumnsListWrap" style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; background: var(--bg-darker); margin-bottom: 1rem; display: none;">
                                    <div id="phoneColumnsList" style="display: flex; flex-direction: column; gap: 0.25rem;"></div>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="txtOtherPhoneColumnsPhone">Số điện thoại reset chung</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Số điện thoại sẽ gán cho tất cả cột đã chọn trong danh sách bảng có cột Phone. Bấm &quot;Reset các cột đã chọn&quot; để thực hiện.</div>
                                        </span>
                                    </div>
                                    <input type="text" id="txtOtherPhoneColumnsPhone" class="ba-input" placeholder="Mặc định: 0987654321 (load từ App Settings khi tải danh sách)" style="max-width: 400px;" />
                                </div>
                                <div class="ba-actions">
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnResetPhoneColumns" onclick="resetPhoneColumns(); return false;" disabled>Reset các cột đã chọn <span id="btnPhoneCount"></span></button>
                                </div>
                                </div>
                            </div>

                            <!-- Placeholder cho các section reset khác sau này -->
                            <div id="otherResetSections" style="margin-top: 1rem;">
                                <!-- Có thể thêm các section mới tại đây -->
                            </div>
                        </div>
                    </div>
                    <% } else { %>
                    <!-- Multi-Database Reset Mode -->
                    <div class="ba-multi-db-wrapper" style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">
                    <div class="ba-card" style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">
                        <h2 class="ba-card-title">Multi-Database Reset</h2>
                        <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.5rem;">Phân tích và reset Email/Phone cho tất cả database trên server. Cấu hình Email Ignore để loại trừ email nội bộ.</p>

                        <div class="ba-card ba-update-section ba-collapsible-group" id="groupEmailIgnoreConfig" style="margin-bottom: 1.5rem;">
                            <div class="ba-collapsible-header" onclick="toggleMultiDbSection('groupEmailIgnoreConfig'); return false;">
                                <span class="ba-collapse-icon">▼</span>
                                <h3 class="ba-card-title" style="font-size: 1.1rem; margin: 0;">Email Ignore (Config)</h3>
                            </div>
                            <div class="ba-collapsible-body">
                                <p style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 0.75rem;">Các email/pattern trong danh sách được coi là nội bộ (đã reset). Email khách hàng khác sẽ được đánh dấu "Chưa reset". Mỗi dòng 1 giá trị. Dùng *@domain.com cho suffix. Load từ Settings.</p>
                                <textarea id="txtMultiEmailIgnore" class="ba-input" rows="4" placeholder="*@cadena.com.sg&#10;test@internal.com" style="max-width: 600px;" readonly></textarea>
                                <div class="ba-actions" style="margin-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                                    <% if (CanEditSettings) { %>
                                    <a href="<%= ResolveUrl("~/AppSettings") %>" class="ba-btn ba-btn-secondary" style="text-decoration: none;">Cấu hình tại Settings</a>
                                    <% } %>
                                </div>
                            </div>
                        </div>

                        <div class="ba-actions" style="margin-bottom: 1rem;">
                            <button type="button" class="ba-btn ba-btn-primary" id="btnMultiAnalyze" onclick="analyzeMultiDb(); return false;">Phân tích</button>
                            <a href="#" id="linkLoadLastMultiDbResult" style="margin-left: 1rem; font-size: 0.875rem;" onclick="loadLastMultiDbAnalyzeResult(); return false;">Tải kết quả phân tích gần nhất</a>
                        </div>
                        <div id="multiAnalyzeStatus" style="font-size: 0.875rem; margin-bottom: 1rem; color: var(--text-secondary);"></div>
                        <div id="multiAnalyzeHint" style="font-size: 0.8125rem; color: var(--text-muted); margin-top: -0.5rem; margin-bottom: 0.5rem; display: none;"></div>

                        <div id="multiDbResultsSection" style="display: none; flex: 1; flex-direction: column; min-height: 0; overflow: hidden;">
                            <div id="multiDbSearchWrap" style="margin-bottom: 0.5rem;">
                                <input type="text" id="txtMultiDbSearch" class="ba-input" placeholder="Tìm database..." style="max-width: 300px;" />
                            </div>
                            <div class="ba-table-wrap" id="multiDbTableWrap" style="flex: 1; min-height: 200px; max-height: 400px; overflow-y: auto;">
                                <table class="ba-table">
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" id="chkMultiSelectAll" /></th>
                                            <th class="ba-sortable" data-sort="1" style="cursor: pointer; user-select: none;">Database</th>
                                            <th class="ba-sortable" data-sort="2" style="cursor: pointer; user-select: none;">Trạng thái</th>
                                            <th class="ba-sortable" data-sort="3" style="cursor: pointer; user-select: none;">Chi tiết</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblMultiDb"></tbody>
                                </table>
                            </div>
                            <div class="ba-actions" style="margin-top: 1rem;">
                                <button type="button" class="ba-btn ba-btn-secondary" id="btnMultiSelectNotReset" onclick="selectNotResetOnly(); return false;" disabled>Chọn Chưa reset</button>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnMultiReset" onclick="resetMultiDbSelected(); return false;" disabled>Reset đã chọn</button>
                            </div>
                        </div>

                        <div class="ba-card ba-update-section" style="margin-top: 1.5rem;">
                            <h3 class="ba-card-title" style="font-size: 1.1rem;">Giá trị reset</h3>
                            <div class="ba-form-group" style="margin-bottom: 0.65rem;">
                                <div id="wrapMultiEmailRow" class="ba-multi-reset-compact" style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem 0.75rem; width: 100%; max-width: 720px;">
                                    <label for="chkMultiResetEmail" style="display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; margin: 0; user-select: none; min-width: 5.5rem;">
                                        <input type="checkbox" id="chkMultiResetEmail" />
                                        <span class="ba-form-label" style="margin: 0;">Email</span>
                                    </label>
                                    <input type="text" id="txtMultiResetEmail" class="ba-input" placeholder="user@…" title="Có giá trị: đặt email demo. Trống: gán NULL." style="flex: 1; min-width: 200px; max-width: 100%;" disabled="disabled" />
                                </div>
                            </div>
                            <div class="ba-form-group" style="margin-bottom: 0;">
                                <div id="wrapMultiPhoneRow" class="ba-multi-reset-compact" style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem 0.75rem; width: 100%; max-width: 720px;">
                                    <label for="chkMultiResetPhone" style="display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; margin: 0; user-select: none; min-width: 5.5rem;">
                                        <input type="checkbox" id="chkMultiResetPhone" />
                                        <span class="ba-form-label" style="margin: 0;">Phone</span>
                                    </label>
                                    <input type="text" id="txtMultiResetPhone" class="ba-input" placeholder="VD: 0123…" title="Có giá trị: đặt số demo. Trống: gán NULL." style="flex: 1; min-width: 200px; max-width: 100%;" disabled="disabled" />
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                    <% } %>
                </div>
            </main>
            <!-- HR job overlay đặt trong ba-container để nằm dưới .ba-top-bar (z 1100), không che chuông thông báo -->
            <div id="hrJobOverlay" class="ba-hr-job-overlay">
                <div class="ba-hr-job-overlay-inner">
                    <div class="ba-hr-job-spinner"></div>
                    <div class="ba-hr-job-text">Đang xử lý... Không thao tác cho đến khi job hoàn thành.</div>
                    <div id="hrJobOverlayDetail" class="ba-hr-job-overlay-detail" style="display:none;"></div>
                </div>
            </div>
        </div>
        <div id="columnContextMenu" class="ba-column-context-menu">
            <div class="ba-column-context-menu-item" data-action="lock">🔒 Khóa cột</div>
            <div class="ba-column-context-menu-item" data-action="unlock">🔓 Mở khóa cột</div>
        </div>

        <!-- Progress Overlay -->
        <div id="progressOverlay" class="ba-progress-overlay">
            <div class="ba-progress-content">
                <div class="ba-progress-title" id="progressTitle">Đang xử lý...</div>
                <div id="progressDbSection" class="ba-progress-db-section" style="display: none;">
                    <div class="ba-progress-db-label">Tiến trình database</div>
                    <div class="ba-progress-bar-wrap">
                        <div class="ba-progress-bar" id="progressDbBar" style="width: 0%; background: var(--primary);">0%</div>
                    </div>
                    <div class="ba-progress-text" id="progressDbText" style="font-size: 0.8rem; margin-top: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</div>
                </div>
                <div id="progressColLabel" class="ba-progress-db-label" style="margin-top: 0.75rem; display: none;">Chi tiết cột đang xử lý</div>
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
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideConfirmUpdateModal(); return false;">×</button>
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

        <!-- Delete Employee Confirm Modal (có captcha) -->
        <div id="deleteEmployeeConfirmModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 440px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Xác nhận xóa employee</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideDeleteEmployeeConfirmModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <p id="deleteEmployeeConfirmMessage" style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 0.9375rem;"></p>
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Xác thực (Captcha)</label>
                    <div class="captcha-box" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-darker); border-radius: 4px; font-size: 14px;">
                        <span id="deleteEmployeeCaptchaQuestion"></span>
                        <input type="number" id="deleteEmployeeCaptchaInput" class="ba-input" placeholder="?" style="width: 80px; text-align: center;" />
                        <button type="button" id="btnRefreshDeleteCaptcha" class="ba-btn ba-btn-secondary" title="Làm mới">↻</button>
                    </div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="deleteEmployeeConfirmCancel">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-danger" id="deleteEmployeeConfirmOk">Xóa</button>
                </div>
            </div>
        </div>

        <!-- Generate Delete Script Modal -->
        <div id="generateDeleteScriptModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 720px; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Generate Delete Script</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideGenerateDeleteScriptModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body" style="overflow-y: auto;">
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.75rem;">Nhập mã Local Employee (cách nhau bằng dấu phẩy). Sau khi Generate có thể copy script hoặc bấm <strong>Generate and Run</strong> để chạy luôn trên database.</p>
                    <div class="ba-form-group" style="margin-bottom: 1rem;">
                        <label class="ba-form-label" for="txtDeleteScriptLocalIds">Mã Local Employee</label>
                        <input type="text" id="txtDeleteScriptLocalIds" class="ba-input" placeholder="VD: 24314, 24322" style="width: 100%;" />
                    </div>
                    <div class="ba-actions" style="margin-bottom: 0.75rem;">
                        <button type="button" class="ba-btn ba-btn-primary" id="btnDoGenerateDeleteScript" onclick="doGenerateDeleteScript(); return false;">Generate script</button>
                        <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyDeleteScript" onclick="copyDeleteScript(); return false;" style="display: none;">Copy</button>
                        <button type="button" class="ba-btn ba-btn-primary" id="btnGenerateAndRunDeleteScript" onclick="generateAndRunDeleteScript(); return false;">Generate and Run</button>
                    </div>
                    <label class="ba-form-label" style="display: block; margin-bottom: 0.25rem;">Script (copy hoặc chạy)</label>
                    <textarea id="txtDeleteScriptOutput" class="ba-input" readonly rows="22" placeholder="Script sẽ hiển thị sau khi Generate... (keo thanh cuon de xem het)" style="width: 100%; font-family: Consolas, monospace; font-size: 0.8125rem; min-height: 320px;"></textarea>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideGenerateDeleteScriptModal(); return false;">Đóng</button>
                </div>
            </div>
        </div>

        <!-- Generate Employee Test Data Modal -->
        <div id="generateEmployeeTestDataModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 640px; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Generate Test Data (Employee)</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideGenerateEmployeeTestDataModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body" style="overflow-y: auto;">
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">
                        Tick chọn các nhân viên cần tạo dữ liệu test rồi bấm <strong>Generate and Update</strong>. Không chọn employee = áp dụng cho toàn bộ danh sách đang lọc.
                    </p>
                    <div class="ba-form-group" style="margin-bottom: 1rem;">
                        <label class="ba-form-label">Tổng Employee Generate Data:</label>
                        <div id="generateEmployeeTestDataTargetCount" style="padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-darker); color: var(--text-primary);">0</div>
                    </div>

                    <div class="ba-form-group" style="margin-bottom: 1rem;">
                        <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="chkGenTestEmail" />
                            <label for="chkGenTestEmail">Generate Email</label>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem;">
                            <div>
                                <label class="ba-form-label" for="selGenTestEmailDomain">Domain</label>
                                <select id="selGenTestEmailDomain" class="ba-input" disabled>
                                    <option value="">Loading...</option>
                                </select>
                            </div>
                            <div>
                                <label class="ba-form-label" for="txtGenTestEmailPrefix">Prefix</label>
                                <input type="text" id="txtGenTestEmailPrefix" class="ba-input" placeholder="test" disabled />
                            </div>
                        </div>
                        <div style="margin-top: 0.5rem; max-width: 220px;">
                            <label class="ba-form-label" for="txtGenTestEmailStart">Số bắt đầu</label>
                            <input type="number" id="txtGenTestEmailStart" class="ba-input" min="1" step="1" value="1" disabled />
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.8125rem; margin: 0.5rem 0 0;">
                            Ví dụ prefix <strong>test</strong> + domain <strong>@yopmail.com</strong> => test1@yopmail.com, test2@yopmail.com...
                        </p>
                    </div>

                    <div class="ba-form-group" style="margin-bottom: 1rem;">
                        <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="chkGenTestPhone" />
                            <label for="chkGenTestPhone">Generate Phone</label>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.8125rem; margin: 0.5rem 0 0;">
                            Sinh số điện thoại 10 chữ số ngẫu nhiên với đầu số <strong>011..019</strong>.
                        </p>
                    </div>

                    <div class="ba-form-group" style="margin-bottom: 1rem;">
                        <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="chkGenTestSalary" />
                            <label for="chkGenTestSalary">Generate Basic Salary</label>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem;">
                            <div>
                                <label class="ba-form-label" for="txtGenTestSalaryMin">Min</label>
                                <input type="number" id="txtGenTestSalaryMin" class="ba-input" min="0" step="0.01" placeholder="1000" disabled />
                            </div>
                            <div>
                                <label class="ba-form-label" for="txtGenTestSalaryMax">Max</label>
                                <input type="number" id="txtGenTestSalaryMax" class="ba-input" min="0" step="0.01" placeholder="5000" disabled />
                            </div>
                        </div>
                    </div>

                    <div class="ba-form-group" style="margin-bottom: 0;">
                        <div class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="chkGenTestUpdateUserEmail" checked />
                            <label for="chkGenTestUpdateUserEmail">Update User.Email mapping theo email mới</label>
                        </div>
                    </div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="btnGenerateEmployeeTestDataCancel" onclick="hideGenerateEmployeeTestDataModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="btnGenerateEmployeeTestDataRun" onclick="generateEmployeeTestData(); return false;">Generate and Update</button>
                </div>
            </div>
        </div>

        <!-- Generate Test Data Confirm Modal (captcha) -->
        <div id="generateEmployeeTestDataConfirmModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 460px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Xác nhận</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideGenerateEmployeeTestDataConfirmModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <p id="generateEmployeeTestDataConfirmMessage" style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 0.9375rem;"></p>
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Xác thực (Captcha)</label>
                    <div class="captcha-box" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-darker); border-radius: 4px; font-size: 14px;">
                        <span id="generateEmployeeTestDataCaptchaQuestion"></span>
                        <input type="number" id="generateEmployeeTestDataCaptchaInput" class="ba-input" placeholder="?" style="width: 80px; text-align: center;" />
                        <button type="button" id="btnRefreshGenerateEmployeeTestDataCaptcha" class="ba-btn ba-btn-secondary" title="Làm mới">↻</button>
                    </div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="generateEmployeeTestDataConfirmCancel">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="generateEmployeeTestDataConfirmOk">Cập nhật</button>
                </div>
            </div>
        </div>

        <!-- Generate and Run Confirm Modal (captcha) -->
        <div id="generateRunConfirmModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 440px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Xác nhận Generate and Run</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideGenerateRunConfirmModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <p id="generateRunConfirmMessage" style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 0.9375rem;">Bạn có chắc muốn generate delete script và chạy luôn trên database này không? Nhập captcha để xác nhận.</p>
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Xác thực (Captcha)</label>
                    <div class="captcha-box" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-darker); border-radius: 4px; font-size: 14px;">
                        <span id="generateRunCaptchaQuestion"></span>
                        <input type="number" id="generateRunCaptchaInput" class="ba-input" placeholder="?" style="width: 80px; text-align: center;" />
                        <button type="button" id="btnRefreshGenerateRunCaptcha" class="ba-btn ba-btn-secondary" title="Làm mới">↻</button>
                    </div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="generateRunConfirmCancel">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-danger" id="generateRunConfirmOk">Generate and Run</button>
                </div>
            </div>
        </div>

        <!-- Multi Reset Confirm Modal (thiết kế giống Function Queue Chi tiết Reset Multi-DB: cao vừa + scrollbar trong danh sách database) -->
        <div id="multiResetConfirmModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 560px; max-height: 85vh; min-height: 320px; overflow: hidden; display: flex; flex-direction: column;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Xác nhận Reset Multi-DB</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideMultiResetConfirmModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <p style="margin: 0 0 1rem 0; color: var(--text-secondary); font-size: 0.875rem;">Kiểm tra thông tin dưới đây đúng chưa trước khi bấm Đồng ý Reset.</p>
                    <table class="ba-restore-detail" style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                        <tbody>
                            <tr><th style="text-align:left;padding:6px 12px 6px 0;font-weight:600;color:var(--text-secondary);width:130px;">Email reset</th><td id="multiResetConfirmEmail" style="padding:6px 0;">—</td></tr>
                            <tr><th style="text-align:left;padding:6px 12px 6px 0;font-weight:600;color:var(--text-secondary);width:130px;">Phone reset</th><td id="multiResetConfirmPhone" style="padding:6px 0;">—</td></tr>
                            <tr><th style="text-align:left;padding:6px 12px 6px 0;vertical-align:top;font-weight:600;color:var(--text-secondary);width:130px;">Danh sách database</th><td style="padding:6px 0;vertical-align:top;"><div id="multiResetConfirmDbs" style="max-height:280px;overflow-y:auto;word-break:break-all;border:1px solid var(--border);border-radius:8px;background:var(--bg-darker);padding:0;">—</div></td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="multiResetConfirmCancel">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="multiResetConfirmOk">Đồng ý Reset</button>
                </div>
            </div>
        </div>

        <!-- Toast Container -->
        <div id="toastContainer" class="toast-container"></div>
    </form>
    <script>
        (function() {
            var key = 'baSidebarCollapsed';
            var $sb = $('#baSidebar');
            var $btn = $('#baSidebarToggle');
            if (localStorage.getItem(key) === '1') $sb.addClass('collapsed');
            $btn.on('click', function() {
                $sb.toggleClass('collapsed');
                localStorage.setItem(key, $sb.hasClass('collapsed') ? '1' : '0');
            });
        })();
        var hrToken = '';
        var isMultiDbMode = <%= IsMultiDbMode ? "true" : "false" %>;
        var isGuest = <%= IsGuest ? "true" : "false" %>;
        var multiDbAnalyzeResults = [];
        var multiDbSortCol = 1;
        var multiDbSortDir = 1;
        /** JobId của lần "Phân tích" vừa start (job nền). Khi SignalR báo xong sẽ gọi GetMultiDbAnalyzeResult(jobId) và render. */
        var pendingMultiDbAnalyzeJobId = null;
        var multiDbAnalyzePollTimer = null;

        function renderMultiDbTable() {
            var arr = multiDbAnalyzeResults.slice();
            arr.sort(function(a, b) {
                var va = multiDbSortCol === 1 ? (a.database || '') : (multiDbSortCol === 2 ? (a.status || '') : (a.reason || ''));
                var vb = multiDbSortCol === 1 ? (b.database || '') : (multiDbSortCol === 2 ? (b.status || '') : (b.reason || ''));
                var cmp = (va + '').localeCompare(vb + '', undefined, { numeric: true });
                return multiDbSortDir > 0 ? cmp : -cmp;
            });
            var html = '';
            arr.forEach(function(r) {
                var statusCls = r.status === 'Reset' ? 'var(--success)' : (r.status === 'NotReset' ? 'var(--warning)' : 'var(--danger)');
                html += '<tr><td><input type="checkbox" class="chkMultiDb" data-db="' + (r.database || '').replace(/"/g, '&quot;') + '" /></td>' +
                    '<td>' + (r.database || '-') + '</td>' +
                    '<td><span style="color: ' + statusCls + ';">' + (r.status || '-') + '</span></td>' +
                    '<td>' + (r.reason || '-') + '</td></tr>';
            });
            $('#tblMultiDb').html(html);
        }

        function applyMultiDbAnalyzeResult(list, label, completedAt) {
            if (!list) return;
            if (typeof list === 'string') { try { list = JSON.parse(list); } catch (e) { return; } }
            if (!Array.isArray(list)) return;
            function getVal(obj, keys) {
                if (!obj) return null;
                for (var i = 0; i < keys.length; i++) {
                    var v = obj[keys[i]];
                    if (v !== undefined && v !== null && v !== '') return v;
                }
                return null;
            }
            multiDbAnalyzeResults = list.map(function(x) {
                var db = getVal(x, ['database', 'Database', 'databaseName', 'DatabaseName']);
                var st = getVal(x, ['status', 'Status']);
                var re = getVal(x, ['reason', 'Reason']);
                return {
                    database: (db != null && db !== '') ? String(db) : '-',
                    status: (st != null && st !== '') ? String(st) : 'Reset',
                    reason: (re != null && re !== '') ? String(re) : '-'
                };
            });
            var notReset = multiDbAnalyzeResults.filter(function(x) { return x.status === 'NotReset'; }).length;
            var errCount = multiDbAnalyzeResults.filter(function(x) { return x.status === 'Error'; }).length;
            var timeStr = '';
            if (completedAt != null && completedAt !== '') {
                try {
                    var completed;
                    if (completedAt instanceof Date) {
                        completed = completedAt;
                    } else if (typeof completedAt === 'string' && completedAt.match(/\/Date\((-?\d+)\)\//)) {
                        completed = new Date(parseInt(completedAt.match(/\/Date\((-?\d+)\)\//)[1], 10));
                    } else {
                        completed = new Date(completedAt);
                    }
                    if (!isNaN(completed.getTime())) {
                        timeStr = ' · Lần phân tích: ' + completed.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    }
                } catch (e) {}
            }
            $('#multiAnalyzeStatus').html('<span style="color: var(--success);">Phân tích xong (' + (label || '') + '). ' + multiDbAnalyzeResults.length + ' DB. Chưa reset: ' + notReset + (errCount ? ', Lỗi: ' + errCount : '') + timeStr + '</span>');
            renderMultiDbTable();
            bindMultiDbSortHeaders();
            $('#multiDbResultsSection').css('display', 'flex').show();
            $('#txtMultiDbSearch').val('').off('input').on('input', filterMultiDbTable);
            filterMultiDbTable();
            $('#btnMultiSelectNotReset').prop('disabled', false);
            $('#btnMultiReset').prop('disabled', false);
            $('#chkMultiSelectAll').off('change').on('change', function() { var v = $(this).prop('checked'); $('.chkMultiDb').prop('checked', v); });
        }

        function bindMultiDbSortHeaders() {
            $('#multiDbTableWrap').off('click.multiDbSort').on('click.multiDbSort', '.ba-sortable', function() {
                var col = parseInt($(this).data('sort'), 10);
                if (col === multiDbSortCol) multiDbSortDir = -multiDbSortDir; else { multiDbSortCol = col; multiDbSortDir = 1; }
                renderMultiDbTable();
                filterMultiDbTable();
            });
        }
        var users = [];
        var hasUserSignatureSupport = false;
        var employees = [];
        var company = null;
        var usersDataLoaded = false;
        var employeesDataLoaded = false;

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
                showToast('Thiếu tham số kết nối. Vui lòng Connect từ Database Tools.', 'error');
                setTimeout(function() { window.location.href = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>'; }, 2000);
                return;
            }
            if (isMultiDbMode) {
                setMultiDbAnalyzeUIState(true, 'Đang kiểm tra job...', null);
                $('#btnMultiReset').prop('disabled', true);
                $('#btnMultiSelectNotReset').prop('disabled', true);
                initMultiDbMode();
                checkHRHelperJobsAndShowOverlay();
                if (typeof BA_SignalR !== 'undefined') {
                    BA_SignalR.onJobsUpdated(function() {
                        checkHRHelperJobsAndShowOverlay();
                        if (typeof window.loadRestoreJobsPanel === 'function') window.loadRestoreJobsPanel();
                    });
                    BA_SignalR.start('<%= ResolveUrl("~/signalr") %>', '<%= ResolveUrl("~/signalr/hubs") %>');
                }
                return;
            }
            // Clear session khi reload trang
            $.ajax({ url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/ClearEmployeesSession") %>', type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ k: hrToken }), timeout: 10000, error: function() {} });
            $.ajax({ url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/ClearUsersSession") %>', type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ k: hrToken }), timeout: 10000, error: function() {} });

            // Kiểm tra DB có cột User Signature (GeneralCalcSignature/GeneralOidcSignature) để hiện nút Update User Signature ngay khi load trang
            checkUserSignatureSupport();

            // Nếu trước đó có start job (vd. delete employee), reload vẫn hiện overlay ngay để không mất loading / data treo
            try {
                if (sessionStorage.getItem('baHRHelperJobRunning')) {
                    window.__hrOverlayWaitingForJob = true;
                    $('#hrJobOverlay').addClass('show');
                    $('#hrJobOverlay .ba-hr-job-text').text('Đang kiểm tra job... Không thao tác cho đến khi job hoàn thành.');
                    $('#hrJobOverlayDetail').empty().hide();
                    startHrOverlayPoll();
                }
            } catch (e) {}
            // Kiểm tra job HR Helper đang chạy (update user/employee/other) → hiển thị overlay; SignalR để cập nhật khi job xong
            checkHRHelperJobsAndShowOverlay();
            if (typeof BA_SignalR !== 'undefined') {
                BA_SignalR.onJobsUpdated(function() {
                    checkHRHelperJobsAndShowOverlay();
                    var activeTab = $('.ba-tab.active').data('tab');
                    if (activeTab === 'users') { if (typeof loadUsers === 'function') loadUsers(); }
                    else if (activeTab === 'employees') { if (typeof loadEmployees === 'function') loadEmployees(); }
                    else if (activeTab === 'company') { if (typeof loadCompanyInfo === 'function') loadCompanyInfo(); }
                    else if (activeTab === 'other') { otherTabLoaded = false; if (typeof loadOtherTab === 'function') loadOtherTab(); }
                });
                BA_SignalR.start('<%= ResolveUrl("~/signalr") %>', '<%= ResolveUrl("~/signalr/hubs") %>');
            }

            var tabKey = 'HR_HELPER_TAB';
            var savedTab = sessionStorage.getItem(tabKey);
            if (savedTab && ['users', 'employees', 'company', 'other'].indexOf(savedTab) >= 0) {
                $('.ba-tab').removeClass('active');
                $('.ba-tab-content').removeClass('active');
                $('.ba-tab[data-tab="' + savedTab + '"]').addClass('active');
                $('#tab' + savedTab.charAt(0).toUpperCase() + savedTab.slice(1)).addClass('active');
                if (savedTab === 'users' && users.length === 0) loadUsersFromSession();
                if (savedTab === 'other') loadOtherTab();
            }
            restoreMultiDbSectionState();
            $('.ba-tab').on('click', function() {
                var tab = $(this).data('tab');
                sessionStorage.setItem(tabKey, tab);
                $('.ba-tab').removeClass('active');
                $('.ba-tab-content').removeClass('active');
                $(this).addClass('active');
                $('#tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).addClass('active');
                if (tab === 'users' && users.length === 0) loadUsersFromSession();
                if (tab === 'other') loadOtherTab();
            });
            $(document).on('click', '#usersEmptyLink', function(e) { e.preventDefault(); $('#btnViewDataUsers')[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); });
            $(document).on('click', '#employeesEmptyLink', function(e) { e.preventDefault(); $('#btnViewDataEmployees')[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); });

            $('#deleteEmployeeConfirmOk').on('click', function() { submitDeleteEmployees(); });
            $('#deleteEmployeeConfirmCancel').on('click', function() { hideDeleteEmployeeConfirmModal(); });
            $('#btnRefreshDeleteCaptcha').on('click', function() { refreshDeleteEmployeeCaptcha(); });

            $('#chkGenTestEmail').on('change', syncGenerateEmployeeTestDataControls);
            $('#chkGenTestSalary').on('change', syncGenerateEmployeeTestDataControls);
            $('#generateEmployeeTestDataModal').on('click', function(e) { if (e.target.id === 'generateEmployeeTestDataModal') hideGenerateEmployeeTestDataModal(); });
            $('#generateEmployeeTestDataConfirmCancel').on('click', function() { hideGenerateEmployeeTestDataConfirmModal(); });
            $('#generateEmployeeTestDataConfirmOk').on('click', function() { submitGenerateEmployeeTestDataWithCaptcha(); });
            $('#btnRefreshGenerateEmployeeTestDataCaptcha').on('click', function() { refreshGenerateEmployeeTestDataCaptcha(); });
            $('#generateEmployeeTestDataConfirmModal').on('click', function(e) { if (e.target.id === 'generateEmployeeTestDataConfirmModal') hideGenerateEmployeeTestDataConfirmModal(); });

            $('#generateRunConfirmOk').on('click', function() { doExecuteGenerateAndRunDeleteScript(); });
            $('#generateRunConfirmCancel').on('click', function() { hideGenerateRunConfirmModal(); });
            $('#btnRefreshGenerateRunCaptcha').on('click', function() { refreshGenerateRunCaptcha(); });

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
            if (isGuest) $('#companyUserActionWrap').hide();
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
                $('#chkPayslipByEmployee').prop('disabled', !checked);
                if (!checked) $('#chkPayslipByEmployee').prop('checked', false);
            });
            $('#chkPayslipByEmployee').on('change', function() {
                $('#txtPayslipCommon').prop('disabled', !$('#chkUpdPayslip').is(':checked') || $(this).is(':checked'));
            });
            $('#chkPayslipByEmployee').prop('disabled', !$('#chkUpdPayslip').is(':checked'));
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
            /* Modal xác nhận: không đóng khi click ra ngoài; dùng nút Hủy/Cập nhật hoặc Escape/Enter */
            $(document).on('click', '.ba-copy-select-btn', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var schema = $(this).data('schema') || 'dbo', table = $(this).data('table'), column = $(this).data('column');
                copyColumnSelectToClipboard(schema, table, column);
            });
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
            var duration = type === 'error' ? 10000 : (type === 'success' ? 5000 : 4000);
            var $t = $('<div class="toast ' + type + '"><button type="button" class="toast-close" title="Đóng">&times;</button><span>' + (icons[type] || 'ℹ') + '</span> ' + (titles[type] || '') + ': ' + msg + '</div>');
            $('#toastContainer').append($t);
            setTimeout(function() { $t.addClass('show'); }, 10);
            var tmr = setTimeout(function() { $t.removeClass('show'); setTimeout(function() { $t.remove(); }, 300); }, duration);
            $t.find('.toast-close').on('click', function() { clearTimeout(tmr); $t.removeClass('show'); setTimeout(function() { $t.remove(); }, 300); });
        }

        var hrJobOverlayPollTimer = null;
        var hrJobOverlayFastPollCount = 0;
        /** Bắt đầu poll overlay: 1s trong ~20 lần đầu (để sớm bắt job Running và cập nhật % lên overlay), sau đó 3s. */
        function startHrOverlayPoll() {
            if (hrJobOverlayPollTimer) return;
            hrJobOverlayFastPollCount = 0;
            function tick() {
                checkHRHelperJobsAndShowOverlay();
                hrJobOverlayFastPollCount++;
                if (hrJobOverlayFastPollCount === 21) {
                    clearInterval(hrJobOverlayPollTimer);
                    hrJobOverlayPollTimer = setInterval(tick, 3000);
                }
            }
            hrJobOverlayPollTimer = setInterval(tick, 1000);
        }
        /** Gọi GetMyRunningHRHelperJobs: nếu có job đang chạy thì show overlay (và cập nhật %/chi tiết), không thì hide (và toast khi vừa xong). Khi overlay đang hiện thì poll mỗi 3s để tắt ngay khi job xong. Nếu overlay đang hiện do vừa bấm Update (__hrOverlayWaitingForJob) thì khi count=0 chưa tắt, đợi đến khi thấy job Running rồi mới cho phép tắt khi count=0. */
        function checkHRHelperJobsAndShowOverlay() {
            var wasShowing = $('#hrJobOverlay').hasClass('show');
            var waitingForJob = !!(window.__hrOverlayWaitingForJob === true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetMyRunningHRHelperJobs") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({}),
                timeout: 15000,
                success: function(res) {
                    var d = res.d || res;
                    var count = 0;
                    if (d && (d.success === true || d.Success === true)) {
                        var rc = d.runningCount != null ? d.runningCount : d.RunningCount;
                        if (rc != null) count = parseInt(rc, 10) || 0;
                    }
                    var jobs = (d && (d.jobs || d.Jobs)) ? (d.jobs || d.Jobs) : [];
                    var isAnalyzeJob = jobs.some(function(j) { return (j.jobType || '').indexOf('MultiDbAnalyze') >= 0; });
                    var curServer = ($('#hrCurrentServer').val() || '').trim();
                    var curDb = ($('#hrCurrentDatabase').val() || '').trim();
                    var jobMatchesCurrentDb = !isMultiDbMode && curServer !== '' && curDb !== '' && jobs.some(function(j) {
                        var js = j.serverName != null ? j.serverName : j.ServerName;
                        var jd = j.databaseName != null ? j.databaseName : j.DatabaseName;
                        return (js || '').trim() === curServer && (jd || '').trim() === curDb;
                    });
                    if (count > 0) {
                        window.__hrOverlayWaitingForJob = false;
                        if (hrJobOverlayPollTimer) clearInterval(hrJobOverlayPollTimer);
                        hrJobOverlayPollTimer = setInterval(function() { checkHRHelperJobsAndShowOverlay(); }, 3000);
                        $('#btnMultiAnalyze').prop('disabled', true);
                        $('#btnMultiReset').prop('disabled', true);
                        $('#btnMultiSelectNotReset').prop('disabled', true);
                        var pctStr = '';
                        if (jobs.length > 0) {
                            var j0 = jobs[0];
                            var pctVal = j0.percentComplete != null ? j0.percentComplete : (j0.PercentComplete != null ? j0.PercentComplete : j0.percentcomplete);
                            var pct = (pctVal != null && pctVal !== '') ? parseInt(pctVal, 10) : null;
                            if (pct != null && !isNaN(pct)) pctStr = ' ' + pct + '%';
                        }
                        if (isMultiDbMode) {
                            var msg = isAnalyzeJob ? ('Đang phân tích nền...' + pctStr) : ('Đang chạy job...' + pctStr + ' Không thao tác vùng Multi-DB cho đến khi xong.');
                            setMultiDbAnalyzeUIState(true, msg, null);
                        } else if (jobMatchesCurrentDb || (jobs.length > 0 && (wasShowing || waitingForJob))) {
                            /* Cập nhật overlay: khi job khớp DB hiện tại HOẶC overlay đang hiện / đang chờ (vừa submit) để tránh lệch server/db format mà vẫn hiện % và tự đóng khi xong */
                            $('#hrJobOverlay').addClass('show');
                            var j0 = jobs[0];
                            var jt = (j0 && (j0.jobType || j0.JobType)) ? (j0.jobType || j0.JobType) : '';
                            var overlayText = (jt === 'HRHelperDeleteEmployee') ? ('Đang xóa employee...' + pctStr) : (isAnalyzeJob ? ('Đang phân tích Multi-DB...' + pctStr) : ('Đang xử lý...' + pctStr));
                            $('#hrJobOverlay .ba-hr-job-text').text(overlayText + ' Không thao tác cho đến khi job hoàn thành.');
                            var detailHtml = '';
                            var j0msg = j0.message != null ? j0.message : j0.Message;
                            if ((j0msg || '').trim()) detailHtml += (j0msg || '').trim().replace(/</g, '&lt;');
                            var j0payload = j0.payload != null ? j0.payload : j0.Payload;
                            if ((j0payload || '').trim() && (jt === 'HRHelperUpdateEmployee' || jt === 'HRHelperUpdateUser' || jt === 'HRHelperUpdateOther')) {
                                try {
                                    var pl = JSON.parse((j0payload || '').replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, ''));
                                    var parts = [];
                                    if (pl.updPersonal || pl.updatePersonalInfo) parts.push('Thông tin cá nhân');
                                    if (pl.updBusiness || pl.updateBusinessEmail) parts.push('Email công việc');
                                    if (pl.updPayslip) parts.push('Payslip');
                                    if (pl.updM1) parts.push('M1');
                                    if (pl.updM2) parts.push('M2');
                                    if (pl.updBasic) parts.push('Basic Salary');
                                    if (parts.length) { if (detailHtml) detailHtml += '<br/>'; detailHtml += 'Nội dung cập nhật: ' + parts.join(', '); }
                                } catch (e) {}
                            }
                            var $detail = $('#hrJobOverlayDetail');
                            if (detailHtml) { $detail.html(detailHtml).show(); } else { $detail.empty().hide(); }
                        } else {
                            $('#hrJobOverlay').removeClass('show');
                        }
                    } else {
                        /* Chỉ clear timer và ẩn overlay khi thực sự kết thúc (không còn chờ job). Khi waitingForJob=true (vừa ấn Update) phải giữ timer để tiếp tục poll đến khi thấy job Running rồi mới cho phép tắt khi count=0. */
                        if (!waitingForJob) {
                            if (hrJobOverlayPollTimer) { clearInterval(hrJobOverlayPollTimer); hrJobOverlayPollTimer = null; }
                            $('#hrJobOverlay').removeClass('show');
                            $('#hrJobOverlay .ba-hr-job-text').text('Đang xử lý... Không thao tác cho đến khi job hoàn thành.');
                            $('#hrJobOverlayDetail').empty().hide();
                            window.__hrOverlayWaitingForJob = false;
                        }
                        $('#btnMultiAnalyze').prop('disabled', false);
                        if ($('#multiDbResultsSection').is(':visible')) {
                            $('#btnMultiReset').prop('disabled', false);
                            $('#btnMultiSelectNotReset').prop('disabled', false);
                        }
                        try { if (!waitingForJob) sessionStorage.removeItem('baHRHelperJobRunning'); } catch (e) {}
                        if (wasShowing && !waitingForJob) showToast('Job đã hoàn thành.', 'success');
                        if (isMultiDbMode) {
                            if (multiDbAnalyzePollTimer) { clearInterval(multiDbAnalyzePollTimer); multiDbAnalyzePollTimer = null; }
                            setMultiDbAnalyzeUIState(false, '', 'Có kết quả phân tích gần nhất. Bấm link bên cạnh để tải.');
                            if (pendingMultiDbAnalyzeJobId) {
                                var jobIdToFetch = pendingMultiDbAnalyzeJobId;
                                pendingMultiDbAnalyzeJobId = null;
                                $.ajax({
                                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMultiDbAnalyzeResult") %>',
                                    type: 'POST',
                                    contentType: 'application/json; charset=utf-8',
                                    dataType: 'json',
                                    data: JSON.stringify({ jobId: jobIdToFetch }),
                                    timeout: 30000,
                                    success: function(r) {
                                        var rd = r.d || r;
                                        if (rd && rd.success && rd.list && rd.list.length > 0) {
                                            applyMultiDbAnalyzeResult(rd.list, 'job nền', rd.completedAt);
                                            $('#multiAnalyzeHint').hide();
                                        } else if (rd && !rd.success && rd.message) {
                                            showToast(rd.message, 'info');
                                        }
                                    }
                                });
                            } else {
                                $.ajax({
                                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMyLastMultiDbAnalyzeResult") %>',
                                    type: 'POST',
                                    contentType: 'application/json; charset=utf-8',
                                    dataType: 'json',
                                    data: JSON.stringify({}),
                                    timeout: 15000,
                                    success: function(r) {
                                        var rd = r.d || r;
                                        if (rd && rd.success && rd.list && rd.list.length > 0 && rd.completedAt) {
                                            var completed = new Date(rd.completedAt);
                                            var diffMin = (Date.now() - completed.getTime()) / 60000;
                                            if (diffMin <= 10) {
                                                applyMultiDbAnalyzeResult(rd.list, 'vừa hoàn thành', rd.completedAt);
                                                $('#multiAnalyzeHint').hide();
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }
                },
                error: function() {
                    if (hrJobOverlayPollTimer) { clearInterval(hrJobOverlayPollTimer); hrJobOverlayPollTimer = null; }
                    if (wasShowing) $('#hrJobOverlay').removeClass('show');
                }
            });
        }

        function showProgress(title, percent, text) {
            $('#progressDbSection').hide();
            $('#progressColLabel').hide();
            $('#progressTitle').text(title || 'Đang xử lý...');
            $('#progressBar').css('width', (percent || 0) + '%').text((percent || 0) + '%');
            $('#progressText').text(text || '');
            $('#progressOverlay').addClass('show');
        }

        function showProgressDual(title, dbPercent, dbText, colPercent, colText) {
            $('#progressDbSection').show();
            $('#progressColLabel').show();
            $('#progressTitle').text(title || 'Đang xử lý...');
            $('#progressDbBar').css('width', (dbPercent || 0) + '%').text((dbPercent || 0) + '%');
            $('#progressDbText').text(dbText || '-');
            $('#progressBar').css('width', (colPercent || 0) + '%').text((colPercent || 0) + '%');
            $('#progressText').text(colText || '');
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
                        usersDataLoaded = true;
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
                                usersDataLoaded = true;
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
            var filtered = filterUsers();
            if (!users.length) {
                var emptyMsg = !usersDataLoaded
                    ? '<div class="ba-empty-state"><span class="ba-empty-state-icon">👥</span><span>Chưa tải dữ liệu. Bấm <a href="#" class="ba-empty-state-link" id="usersEmptyLink">View Data</a> để tải danh sách user.</span></div>'
                    : '<div class="ba-empty-state"><span class="ba-empty-state-icon">📭</span><span>Không có user nào.</span></div>';
                $tb.html('<tr><td colspan="11" class="ba-empty">' + emptyMsg + '</td></tr>');
                $('#chkSelectAllUsers').off('change').prop('checked', false);
                $pg.hide();
                return;
            }
            if (filtered.length === 0) {
                $tb.html('<tr><td colspan="11" class="ba-empty"><div class="ba-empty-state"><span class="ba-empty-state-icon">🔍</span><span>Không có bản ghi phù hợp. Thử đổi từ khóa tìm kiếm.</span></div></td></tr>');
                $('#chkSelectAllUsers').off('change').prop('checked', false);
                $pg.hide();
                return;
            }
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
                if (hasUserSignatureSupport && typeof updateUpdateUserSignatureButtonState === 'function') updateUpdateUserSignatureButtonState();
            });
            $tb.off('change.userSig').on('change.userSig', '.chkUser', function() {
                if (hasUserSignatureSupport && typeof updateUpdateUserSignatureButtonState === 'function') updateUpdateUserSignatureButtonState();
            });
            if (hasUserSignatureSupport && typeof updateUpdateUserSignatureButtonState === 'function') updateUpdateUserSignatureButtonState();

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
                        usersDataLoaded = true;
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

        function syncMultiResetValueFields() {
            if (!$('#chkMultiResetEmail').length) return;
            var emailOn = $('#chkMultiResetEmail').prop('checked');
            var phoneOn = $('#chkMultiResetPhone').prop('checked');
            $('#txtMultiResetEmail').prop('disabled', !emailOn);
            $('#txtMultiResetPhone').prop('disabled', !phoneOn);
            $('#wrapMultiEmailRow').css('opacity', emailOn ? 1 : 0.45);
            $('#wrapMultiPhoneRow').css('opacity', phoneOn ? 1 : 0.45);
        }

        function initMultiDbMode() {
            $('#chkMultiResetEmail, #chkMultiResetPhone').off('change.multiReset').on('change.multiReset', syncMultiResetValueFields);
            syncMultiResetValueFields();
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadEmailIgnoreConfig") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.list && d.list.length) {
                        $('#txtMultiEmailIgnore').val(d.list.join('\n'));
                    }
                }
            });
            // Fill email từ Windows user (VD: cadena\an.nh → an.nh@cadena.com.sg)
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetWindowsUserEmail") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ domainSuffix: 'cadena.com.sg' }),
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.email) {
                        var e = (d.email || '').trim();
                        if (e && !$('#txtMultiResetEmail').val()) $('#txtMultiResetEmail').val(e);
                    }
                }
            });
            // Nếu mở từ chuông "Xem chi tiết" (HRHelper?k=...&jobId=...) thì tải kết quả phân tích và hiển thị bảng
            var urlParams = new URLSearchParams(window.location.search);
            var jobIdParam = urlParams.get('jobId');
            if (jobIdParam) {
                var jobId = parseInt(jobIdParam, 10);
                if (jobId > 0) {
                    $.ajax({
                        url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMultiDbAnalyzeResult") %>',
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        data: JSON.stringify({ jobId: jobId }),
                        timeout: 15000,
                        success: function(r) {
                            var rd = r.d || r;
                            if (rd && rd.success && rd.list && rd.list.length > 0) {
                                applyMultiDbAnalyzeResult(rd.list, 'từ thông báo', rd.completedAt);
                                $('#multiAnalyzeHint').hide();
                            } else if (rd && !rd.success && rd.message) {
                                showToast(rd.message, 'info');
                            }
                        }
                    });
                }
            }
            // Khi mới vào: kiểm tra có job phân tích đang chạy không → mờ nút/link; có kết quả gần nhất không → bật sáng link
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetMyRunningHRHelperJobs") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({}),
                timeout: 10000,
                success: function(res) {
                    var d = res.d || res;
                    var count = (d && d.success && d.runningCount) ? parseInt(d.runningCount, 10) : 0;
                    if (count > 0) {
                        var jobs = (d && d.jobs) ? d.jobs : [];
                        var isAnalyzeRunning = jobs.some(function(j) { return (j.jobType || '').indexOf('MultiDbAnalyze') >= 0; });
                        var pctStr = '';
                        if (jobs.length > 0) {
                            var j0 = jobs[0];
                            var pct = (j0.percentComplete != null && j0.percentComplete !== '') ? parseInt(j0.percentComplete, 10) : (j0.percentcomplete != null ? parseInt(j0.percentcomplete, 10) : null);
                            if (pct != null && !isNaN(pct)) pctStr = ' ' + pct + '%';
                        }
                        var msg = isAnalyzeRunning ? ('Đang phân tích nền...' + pctStr) : ('Đang chạy job...' + pctStr + ' Không thao tác vùng Multi-DB cho đến khi xong.');
                        setMultiDbAnalyzeUIState(true, msg, null);
                        $('#btnMultiReset').prop('disabled', true);
                        $('#btnMultiSelectNotReset').prop('disabled', true);
                        return;
                    }
                    $.ajax({
                        url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMyLastMultiDbAnalyzeResult") %>',
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        data: JSON.stringify({}),
                        timeout: 10000,
                        success: function(r) {
                            var rd = r.d || r;
                            if (rd && rd.success && rd.list && rd.list.length > 0) {
                                setMultiDbAnalyzeUIState(false, '', 'Có kết quả phân tích gần nhất (trong 1 giờ). Bấm link bên cạnh để tải.');
                            } else if (rd && rd.success && rd.message) {
                                $('#multiAnalyzeHint').text(rd.message).show();
                            }
                        }
                    });
                }
            });
        }

        function saveEmailIgnoreConfig() {
            var lines = ($('#txtMultiEmailIgnore').val() || '').split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/SaveEmailIgnoreConfig") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, patterns: lines }),
                success: function(res) {
                    var d = res.d || res;
                    showToast(d && d.success ? 'Đã lưu config.' : (d && d.message ? d.message : 'Lỗi'), d && d.success ? 'success' : 'error');
                }
            });
        }

        /** Cập nhật trạng thái nút Phân tích + link Tải kết quả gần nhất: analyzing=true thì mờ/disable, false thì bật và có thể highlight link. Khi analyzing bật polling dự phòng (SignalR có thể không tới). */
        function setMultiDbAnalyzeUIState(analyzing, statusText, hintText) {
            var $btn = $('#btnMultiAnalyze');
            var $link = $('#linkLoadLastMultiDbResult');
            if (analyzing) {
                $btn.prop('disabled', true).addClass('ba-btn-dimmed');
                $link.addClass('ba-multi-load-dimmed').removeClass('ba-multi-load-ready');
                if (statusText) $('#multiAnalyzeStatus').html(statusText).css('color', 'var(--text-secondary)');
                $('#multiAnalyzeHint').hide().text('');
                if (!multiDbAnalyzePollTimer) {
                    multiDbAnalyzePollTimer = setInterval(function() {
                        $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetMyRunningHRHelperJobs") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', timeout: 10000,
                            success: function(res) {
                                var d = res.d || res;
                                var count = (d && d.success && d.runningCount) ? parseInt(d.runningCount, 10) : 0;
                                var jobs = (d && d.jobs) ? d.jobs : [];
                                var isAnalyze = jobs.some(function(j) { return (j.jobType || '').indexOf('MultiDbAnalyze') >= 0; });
                                if (count === 0) {
                                    if (multiDbAnalyzePollTimer) { clearInterval(multiDbAnalyzePollTimer); multiDbAnalyzePollTimer = null; }
                                    setMultiDbAnalyzeUIState(false, '', 'Có kết quả phân tích gần nhất. Bấm link bên cạnh để tải.');
                                    if (pendingMultiDbAnalyzeJobId) {
                                        var jobIdToFetch = pendingMultiDbAnalyzeJobId;
                                        pendingMultiDbAnalyzeJobId = null;
                                        $.ajax({ url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMultiDbAnalyzeResult") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobIdToFetch }), timeout: 30000,
                                            success: function(r) { var rd = r.d || r; if (rd && rd.success && rd.list && rd.list.length > 0) { applyMultiDbAnalyzeResult(rd.list, 'job nền', rd.completedAt); $('#multiAnalyzeHint').hide(); } }
                                        });
                                    } else {
                                        $.ajax({ url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMyLastMultiDbAnalyzeResult") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', timeout: 15000,
                                            success: function(r) {
                                                var rd = r.d || r;
                                                if (rd && rd.success && rd.list && rd.list.length > 0 && rd.completedAt) {
                                                    var completed = new Date(rd.completedAt);
                                                    var diffMin = (Date.now() - completed.getTime()) / 60000;
                                                    if (diffMin <= 10) { applyMultiDbAnalyzeResult(rd.list, 'vừa hoàn thành', rd.completedAt); $('#multiAnalyzeHint').hide(); }
                                                }
                                            }
                                        });
                                    }
                                } else if (jobs.length > 0) {
                                    var j0 = jobs[0];
                                    var pct = (j0.percentComplete != null && j0.percentComplete !== '') ? parseInt(j0.percentComplete, 10) : (j0.percentcomplete != null ? parseInt(j0.percentcomplete, 10) : null);
                                    var pctStr = (pct != null && !isNaN(pct)) ? (' ' + pct + '%') : '';
                                    var msg = isAnalyze ? ('Đang phân tích nền...' + pctStr) : ('Đang chạy job...' + pctStr + ' Không thao tác vùng Multi-DB cho đến khi xong.');
                                    $('#multiAnalyzeStatus').html(msg).css('color', 'var(--text-secondary)');
                                }
                            }
                        });
                    }, 2500);
                }
            } else {
                if (multiDbAnalyzePollTimer) { clearInterval(multiDbAnalyzePollTimer); multiDbAnalyzePollTimer = null; }
                $btn.prop('disabled', false).removeClass('ba-btn-dimmed');
                $link.removeClass('ba-multi-load-dimmed');
                if (hintText) $link.addClass('ba-multi-load-ready');
                if (statusText) $('#multiAnalyzeStatus').html(statusText).css('color', 'var(--text-secondary)');
                if (hintText) { $('#multiAnalyzeHint').text(hintText).show(); } else { $('#multiAnalyzeHint').hide().text(''); }
            }
        }

        function loadLastMultiDbAnalyzeResult() {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetMyLastMultiDbAnalyzeResult") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({}),
                timeout: 15000,
                success: function(r) {
                    var rd = r.d || r;
                    if (rd && rd.success && rd.list && rd.list.length > 0) {
                        var completedAt = (rd.completedAt != null && rd.completedAt !== '') ? rd.completedAt : (rd.CompletedAt != null && rd.CompletedAt !== '') ? rd.CompletedAt : null;
                        applyMultiDbAnalyzeResult(rd.list, 'gần nhất', completedAt);
                    } else {
                        showToast(rd && rd.message ? rd.message : 'Không có kết quả phân tích trong 1 giờ qua. Vui lòng bấm Phân tích.', 'info');
                    }
                },
                error: function() { showToast('Lỗi khi tải kết quả.', 'error'); }
            });
        }

        function analyzeMultiDb() {
            var lines = ($('#txtMultiEmailIgnore').val() || '').split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
            $('#multiDbResultsSection').hide();
            $('#multiAnalyzeStatus').text('');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartMultiDbAnalyzeJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, emailIgnorePatterns: lines }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        $('#multiAnalyzeStatus').text('Lỗi: ' + (d && d.message ? d.message : 'Không thể bắt đầu phân tích.'));
                        return;
                    }
                    pendingMultiDbAnalyzeJobId = d.jobId;
                    setMultiDbAnalyzeUIState(true, 'Đã đưa phân tích vào hàng đợi. Khi xong bấm &quot;Tải kết quả phân tích gần nhất&quot; hoặc chờ thông báo.');
                    showToast('Đã đưa phân tích vào hàng đợi. Bạn vẫn có thể dùng trang.', 'success');
                    checkHRHelperJobsAndShowOverlay();
                },
                error: function() {
                    $('#multiAnalyzeStatus').text('Lỗi khi gọi server.');
                }
            });
        }

        function filterMultiDbTable() {
            var q = ($('#txtMultiDbSearch').val() || '').trim().toLowerCase();
            $('#tblMultiDb tr').each(function() {
                var $tr = $(this);
                var db = ($tr.find('td:eq(1)').text() || '').toLowerCase();
                $tr.toggle(!q || db.indexOf(q) >= 0);
            });
        }

        function selectNotResetOnly() {
            $('.chkMultiDb').each(function() {
                var db = $(this).data('db');
                var r = multiDbAnalyzeResults.filter(function(x) { return x.database === db; })[0];
                $(this).prop('checked', r && r.status === 'NotReset');
            });
        }

        var _multiResetConfirmData = null;
        function showMultiResetConfirmModal(selected, email, phone, emailToNull, phoneToNull) {
            _multiResetConfirmData = {
                selected: selected,
                email: (email || '').trim(),
                phone: (phone || '').trim(),
                emailToNull: !!emailToNull,
                phoneToNull: !!phoneToNull
            };
            var emailLine = '— (không reset)';
            if (_multiResetConfirmData.emailToNull) emailLine = 'Gán NULL (SQL)';
            else if (_multiResetConfirmData.email) emailLine = _multiResetConfirmData.email;
            var phoneLine = '— (không reset)';
            if (_multiResetConfirmData.phoneToNull) phoneLine = 'Gán NULL (SQL)';
            else if (_multiResetConfirmData.phone) phoneLine = _multiResetConfirmData.phone;
            $('#multiResetConfirmEmail').text(emailLine);
            $('#multiResetConfirmPhone').text(phoneLine);
            var html = '<div class="ba-db-list-grid">' + selected.map(function(name){ return '<span>' + (name || '').replace(/</g,'&lt;') + '</span>'; }).join('') + '</div>';
            $('#multiResetConfirmDbs').html(html);
            $('#multiResetConfirmModal').addClass('show').css('display', 'flex');
        }
        function hideMultiResetConfirmModal() {
            _multiResetConfirmData = null;
            $('#multiResetConfirmModal').removeClass('show').css('display', 'none');
        }
        $(function() {
            $('#multiResetConfirmOk').on('click', function() { doMultiResetJob(); });
            $('#multiResetConfirmCancel').on('click', function() { hideMultiResetConfirmModal(); });
            $('#multiResetConfirmModal').on('click', function(e) { if (e.target.id === 'multiResetConfirmModal') hideMultiResetConfirmModal(); });
        });
        function doMultiResetJob() {
            if (!_multiResetConfirmData) return;
            var selected = _multiResetConfirmData.selected, email = _multiResetConfirmData.email, phone = _multiResetConfirmData.phone;
            var emailToNull = _multiResetConfirmData.emailToNull, phoneToNull = _multiResetConfirmData.phoneToNull;
            hideMultiResetConfirmModal();
            $('#btnMultiAnalyze').prop('disabled', true);
            $('#btnMultiReset').prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartMultiDbResetJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, databaseNames: selected, email: email, phone: phone, emailToNull: emailToNull, phoneToNull: phoneToNull }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.jobId) {
                        showToast(d.message || 'Đã đưa reset vào hàng đợi. Theo dõi tiến độ trên chuông và Function Queue.', 'success');
                        checkHRHelperJobsAndShowOverlay();
                    } else {
                        $('#btnMultiAnalyze').prop('disabled', false);
                        if ($('#multiDbResultsSection').is(':visible')) $('#btnMultiReset').prop('disabled', false);
                        showToast((d && d.message) ? d.message : 'Không thể tạo job reset.', 'error');
                    }
                },
                error: function(xhr) {
                    $('#btnMultiAnalyze').prop('disabled', false);
                    if ($('#multiDbResultsSection').is(':visible')) $('#btnMultiReset').prop('disabled', false);
                    var msg = 'Lỗi kết nối.';
                    if (xhr && xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                }
            });
        }
        function resetMultiDbSelected() {
            var selected = [];
            $('.chkMultiDb:checked').each(function() { selected.push($(this).data('db')); });
            if (selected.length === 0) {
                showToast('Chọn ít nhất 1 database.', 'error');
                return;
            }
            var wantEmail = $('#chkMultiResetEmail').prop('checked');
            var wantPhone = $('#chkMultiResetPhone').prop('checked');
            if (!wantEmail && !wantPhone) {
                showToast('Chọn ít nhất một mục: Email hoặc Phone để reset.', 'error');
                return;
            }
            var emailToNull = false, phoneToNull = false;
            var email = '', phone = '';
            if (wantEmail) {
                email = ($('#txtMultiResetEmail').val() || '').trim();
                if (!email) emailToNull = true;
            }
            if (wantPhone) {
                phone = ($('#txtMultiResetPhone').val() || '').trim();
                if (!phone) phoneToNull = true;
            }
            showMultiResetConfirmModal(selected, email, phone, emailToNull, phoneToNull);
        }

        var otherTabLoaded = false;

        function toggleOtherGroup(groupId) {
            var $g = $('#' + groupId);
            if ($g.length) $g.toggleClass('collapsed');
        }
        var MULTIDB_EMAIL_IGNORE_COLLAPSED_KEY = 'hrHelper_emailIgnoreConfig_collapsed';
        function toggleMultiDbSection(groupId) {
            var $g = $('#' + groupId);
            if (!$g.length) return;
            $g.toggleClass('collapsed');
            try { sessionStorage.setItem(MULTIDB_EMAIL_IGNORE_COLLAPSED_KEY, $g.hasClass('collapsed') ? '1' : '0'); } catch (e) {}
        }
        function restoreMultiDbSectionState() {
            try {
                var v = sessionStorage.getItem(MULTIDB_EMAIL_IGNORE_COLLAPSED_KEY);
                if (v === '1') $('#groupEmailIgnoreConfig').addClass('collapsed');
            } catch (e) {}
        }

        function loadOtherTab() {
            if (otherTabLoaded) return;
            otherTabLoaded = true;
            // Load default email từ Windows user (VD: cadena\an.nh → an.nh@cadena.com.sg)
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetWindowsUserEmail") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ domainSuffix: 'cadena.com.sg' }),
                timeout: 10000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.email) {
                        var defaultEmail = (d.email || '').trim();
                        if (defaultEmail) {
                            var $ec = $('#txtOtherEmailColumnsEmail');
                            if (!$ec.val() || $ec.data('default-set')) $ec.val(defaultEmail).data('default-set', true);
                        }
                    }
                }
            });
        }

        var emailColumnsList = [];
        var emailColumnsSortCol = 'name';
        var emailColumnsSortDir = 1;

        function renderEmailColumnsList() {
            var q = ($('#searchEmailColumns').val() || '').toLowerCase().trim();
            var filterSelected = $('#chkEmailFilterSelected').prop('checked');
            var checkedKeys = {};
            if (filterSelected) {
                $('.chkEmailColumn:checked').each(function() {
                    var k = ($(this).data('schema') || 'dbo') + '|' + $(this).data('table') + '|' + $(this).data('column');
                    checkedKeys[k] = true;
                });
                var numChecked = Object.keys(checkedKeys).length;
                if (numChecked === 0) {
                    $('#chkEmailFilterSelected').prop('checked', false);
                    filterSelected = false;
                    showToast('Chưa chọn item nào. Chọn ít nhất một dòng rồi bật "Chỉ hiện đã chọn".', 'info');
                }
            }
            var filtered = emailColumnsList.filter(function(item) {
                var key = ((item.schema || 'dbo') + '.' + (item.table || '') + '.' + (item.column || '')).toLowerCase();
                var statusLabel = (item.status === 'NotReset' ? 'Cần reset' : 'OK').toLowerCase();
                var ck = (item.schema || 'dbo') + '|' + (item.table || '') + '|' + (item.column || '');
                if (filterSelected && !checkedKeys[ck]) return false;
                if (!q) return true;
                return key.indexOf(q) >= 0 || statusLabel.indexOf(q) >= 0;
            });
            filtered.sort(function(a, b) {
                var va, vb;
                if (emailColumnsSortCol === 'name') {
                    va = ((a.schema || 'dbo') + '.' + (a.table || '') + '.' + (a.column || '')).toLowerCase();
                    vb = ((b.schema || 'dbo') + '.' + (b.table || '') + '.' + (b.column || '')).toLowerCase();
                    return emailColumnsSortDir * va.localeCompare(vb);
                } else {
                    va = a.status === 'NotReset' ? 0 : 1;
                    vb = b.status === 'NotReset' ? 0 : 1;
                    return emailColumnsSortDir * (va - vb);
                }
            });
            var checked = [];
            $('.chkEmailColumn:checked').each(function() {
                checked.push($(this).data('schema') + '|' + $(this).data('table') + '|' + $(this).data('column'));
            });
            var html = '';
            filtered.forEach(function(item) {
                var key = (item.schema || 'dbo') + '.' + (item.table || '') + '.' + (item.column || '');
                var isNotReset = item.status === 'NotReset';
                var statusCls = isNotReset ? 'var(--warning)' : 'var(--success)';
                var statusLabel = isNotReset ? 'Cần reset' : 'OK';
                var reasonPart = item.reason ? ' — ' + (item.reason || '') : '';
                var needResetAttr = isNotReset ? ' data-need-reset="1"' : '';
                var ck = (item.schema || 'dbo') + '|' + (item.table || '') + '|' + (item.column || '');
                var checkedAttr = checked.indexOf(ck) >= 0 ? ' checked' : '';
                var sch = (item.schema || 'dbo').replace(/"/g, '&quot;'), tbl = (item.table || '').replace(/"/g, '&quot;'), col = (item.column || '').replace(/"/g, '&quot;');
                var checkedClass = checked.indexOf(ck) >= 0 ? ' ba-column-row-checked' : '';
                html += '<div class="ba-column-row' + checkedClass + '" style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; padding: 0.3rem 0.5rem;" tabindex="0">' +
                    '<label class="ba-checkbox" style="display: flex; flex-wrap: wrap; align-items: center; cursor: pointer; font-size: 0.875rem; gap: 0.35rem; flex: 1; min-width: 0; margin: 0;">' +
                    '<input type="checkbox" class="chkEmailColumn" data-schema="' + sch + '" data-table="' + tbl + '" data-column="' + col + '"' + needResetAttr + checkedAttr + ' />' +
                    '<span style="font-family: monospace;">' + key + '</span>' +
                    '<span style="color: ' + statusCls + '; font-size: 0.75rem; font-weight: 500;">[' + statusLabel + ']</span>' +
                    (reasonPart ? '<span style="color: ' + statusCls + '; font-size: 0.75rem;">' + reasonPart + '</span>' : '') +
                    '<button type="button" class="ba-copy-select-btn" data-schema="' + sch + '" data-table="' + tbl + '" data-column="' + col + '" title="Copy câu SELECT">📋</button>' +
                    '</label>' +
                    '</div>';
            });
            $('#emailColumnsList').html(html);
            $('#emailSortNameIcon').text(emailColumnsSortCol === 'name' ? (emailColumnsSortDir === 1 ? '↑' : '↓') : '');
            $('#emailSortStatusIcon').text(emailColumnsSortCol === 'status' ? (emailColumnsSortDir === 1 ? '↑' : '↓') : '');
            updateEmailSelectedCount();
        }

        function updateEmailSelectedCount() {
            var $checked = $('.chkEmailColumn:checked');
            var n = $checked.length;
            $('#emailSelectedCount').text(n > 0 ? 'Đang chọn: ' + n + ' dòng' : '');
            var $sum = $('#emailSelectedSummary');
            var $list = $('#emailSelectedList');
            if (n > 0) {
                var items = [];
                $checked.each(function() {
                    var s = $(this).data('schema') || 'dbo', t = $(this).data('table'), c = $(this).data('column');
                    items.push(s + '.' + t + '.' + c);
                });
                $list.html(items.map(function(k) { return '<div>' + k + '</div>'; }).join(''));
                $sum.show();
                $('#btnEmailCount').text('(' + n + ')');
            } else {
                $sum.hide();
                $('#chkEmailFilterSelected').prop('checked', false);
                $('#btnEmailCount').text('');
            }
        }

        function loadEmailColumnsList() {
            showProgress('Đang tải danh sách bảng có cột Email...', 0, 'Đang xử lý...');
            $('#emailColumnsListWrap').hide();
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetTablesWithEmailColumns") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        hideProgress();
                        $('#emailColumnsStatus').text('Lỗi: ' + (d && d.message ? d.message : 'Không tải được.'));
                        return;
                    }
                    emailColumnsList = d.list || [];
                    hideProgress();
                    if (emailColumnsList.length === 0) {
                        $('#emailColumnsStatus').html('<span style="color: var(--text-muted);">Không tìm thấy bảng nào có cột Email (kiểu text).</span>');
                        return;
                    }
                    var notReset = emailColumnsList.filter(function(x) { return x.status === 'NotReset'; }).length;
                    var resetCount = emailColumnsList.length - notReset;
                    $('#emailColumnsStatus').html(
                        '<span style="color: var(--success);">Tìm thấy ' + emailColumnsList.length + ' cột Email.</span> ' +
                        '<span style="color: var(--warning);">Cần reset: ' + notReset + '</span>. ' +
                        '<span style="color: var(--text-muted);">Đã reset: ' + resetCount + '</span>');
                    $('#searchEmailColumns').val('');
                    $('#emailColumnsControls').show();
                    $('#emailColumnsListWrap').show();
                    $('#btnResetEmailColumns').prop('disabled', false);
                    renderEmailColumnsList();
                    $('#chkSelectAllEmailColumns').off('change').prop('checked', false).on('change', function() {
                        var v = $(this).prop('checked');
                        $('.chkEmailColumn').prop('checked', v);
                        $('#emailColumnsList .ba-column-row').toggleClass('ba-column-row-checked', v);
                        updateEmailSelectedCount();
                    });
                    $('#searchEmailColumns').off('input').on('input', renderEmailColumnsList);
                    $('#chkEmailFilterSelected').off('change').on('change', renderEmailColumnsList);
                    $(document).off('change', '.chkEmailColumn').on('change', '.chkEmailColumn', function() {
                        $(this).closest('.ba-column-row').toggleClass('ba-column-row-checked', $(this).prop('checked'));
                        updateEmailSelectedCount();
                    });
                    $('.email-sort-btn').off('click').on('click', function() {
                        var col = $(this).data('sort');
                        if (emailColumnsSortCol === col) emailColumnsSortDir = -emailColumnsSortDir;
                        else { emailColumnsSortCol = col; emailColumnsSortDir = 1; }
                        renderEmailColumnsList();
                    });
                },
                error: function() {
                    hideProgress();
                    $('#emailColumnsStatus').text('Lỗi khi tải danh sách.');
                }
            });
        }

        function selectEmailColumnsNeedReset() {
            $('.chkEmailColumn').each(function() {
                var needReset = $(this).attr('data-need-reset') === '1';
                $(this).prop('checked', needReset);
                $(this).closest('.ba-column-row').toggleClass('ba-column-row-checked', needReset);
            });
            $('#chkSelectAllEmailColumns').prop('checked', false);
            updateEmailSelectedCount();
        }

        function buildColumnSelectSql(schema, table, column) {
            var s = schema || 'dbo', t = table || '', c = column || '';
            var tbl = '[' + s + '].[' + t + ']';
            var col = '[' + c + ']';
            return 'SELECT ' + col + ', * FROM ' + tbl + ' WHERE ISNULL(' + col + ', \'\') <> \'\'';
        }

        function copyColumnSelectToClipboard(schema, table, column) {
            var sql = buildColumnSelectSql(schema, table, column);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(sql).then(function() {
                    showToast('Đã copy câu SELECT vào clipboard.', 'success');
                }).catch(function() { fallbackCopy(sql); });
            } else {
                fallbackCopy(sql);
            }
        }

        function fallbackCopy(text) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                showToast('Đã copy câu SELECT vào clipboard.', 'success');
            } catch (e) {
                showToast('Không copy được.', 'error');
            }
            document.body.removeChild(ta);
        }

        function resetEmailColumns() {
            var selected = [];
            $('.chkEmailColumn:checked').each(function() {
                selected.push({
                    schema: $(this).data('schema') || 'dbo',
                    table: $(this).data('table'),
                    column: $(this).data('column')
                });
            });
            if (selected.length === 0) {
                showToast('Chọn ít nhất 1 bảng/cột để reset.', 'error');
                return;
            }
            var email = $('#txtOtherEmailColumnsEmail').val();
            if (!email || !email.trim()) {
                showToast('Nhập Email reset chung.', 'error');
                return;
            }
            updateInProgress = true;
            showProgress('Đang reset các cột Email...', 0, '0 / ' + selected.length + ' cột');
            $('.ba-btn').prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/ResetEmailColumns") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, selections: selected, email: email.trim() }),
                timeout: 60000,
                success: function(res) {
                    var d = res.d || res;
                    showProgress('Hoàn thành', 100, d && d.message ? d.message : 'Reset xong.');
                    setTimeout(function() {
                        updateInProgress = false;
                        hideProgress();
                        $('.ba-btn').prop('disabled', false);
                        showToast(d && d.success ? (d.message || 'Đã reset thành công.') : (d && d.message ? d.message : 'Lỗi'), d && d.success ? 'success' : 'error');
                    }, 400);
                },
                error: function(xhr, status, err) {
                    var msg = 'Lỗi khi reset.';
                    if (xhr.responseText) {
                        try {
                            var json = JSON.parse(xhr.responseText);
                            if (json.d && json.d.message) msg = json.d.message;
                            else if (json.message) msg = json.message;
                        } catch(e) {}
                    }
                    showProgress('Lỗi', 100, msg);
                    setTimeout(function() {
                        updateInProgress = false;
                        hideProgress();
                        $('.ba-btn').prop('disabled', false);
                        showToast(msg, 'error');
                    }, 400);
                }
            });
        }

        var phoneColumnsList = [];
        var phoneColumnsSortCol = 'name';
        var phoneColumnsSortDir = 1;

        function renderPhoneColumnsList() {
            var q = ($('#searchPhoneColumns').val() || '').toLowerCase().trim();
            var filterSelected = $('#chkPhoneFilterSelected').prop('checked');
            var checkedKeys = {};
            if (filterSelected) {
                $('.chkPhoneColumn:checked').each(function() {
                    var k = ($(this).data('schema') || 'dbo') + '|' + $(this).data('table') + '|' + $(this).data('column');
                    checkedKeys[k] = true;
                });
                var numChecked = Object.keys(checkedKeys).length;
                if (numChecked === 0) {
                    $('#chkPhoneFilterSelected').prop('checked', false);
                    filterSelected = false;
                    showToast('Chưa chọn item nào. Chọn ít nhất một dòng rồi bật "Chỉ hiện đã chọn".', 'info');
                }
            }
            var filtered = phoneColumnsList.filter(function(item) {
                var key = ((item.schema || 'dbo') + '.' + (item.table || '') + '.' + (item.column || '')).toLowerCase();
                var ck = (item.schema || 'dbo') + '|' + (item.table || '') + '|' + (item.column || '');
                if (filterSelected && !checkedKeys[ck]) return false;
                if (!q) return true;
                return key.indexOf(q) >= 0;
            });
            filtered.sort(function(a, b) {
                if (phoneColumnsSortCol === 'status') {
                    var va = a.status === 'NotReset' ? 0 : 1;
                    var vb = b.status === 'NotReset' ? 0 : 1;
                    return phoneColumnsSortDir * (va - vb);
                }
                var va = ((a.schema || 'dbo') + '.' + (a.table || '') + '.' + (a.column || '')).toLowerCase();
                var vb = ((b.schema || 'dbo') + '.' + (b.table || '') + '.' + (b.column || '')).toLowerCase();
                return phoneColumnsSortDir * va.localeCompare(vb);
            });
            var checked = [];
            $('.chkPhoneColumn:checked').each(function() {
                checked.push($(this).data('schema') + '|' + $(this).data('table') + '|' + $(this).data('column'));
            });
            var html = '';
            filtered.forEach(function(item) {
                var key = (item.schema || 'dbo') + '.' + (item.table || '') + '.' + (item.column || '');
                var isNotReset = item.status === 'NotReset';
                var statusCls = isNotReset ? 'var(--warning)' : 'var(--success)';
                var statusLabel = isNotReset ? 'Cần reset' : 'OK';
                var reasonPart = item.reason ? ' — ' + (item.reason || '') : '';
                var needResetAttr = isNotReset ? ' data-need-reset="1"' : '';
                var sch = (item.schema || 'dbo').replace(/"/g, '&quot;'), tbl = (item.table || '').replace(/"/g, '&quot;'), col = (item.column || '').replace(/"/g, '&quot;');
                var ck = (item.schema || 'dbo') + '|' + (item.table || '') + '|' + (item.column || '');
                var checkedAttr = checked.indexOf(ck) >= 0 ? ' checked' : '';
                var checkedClass = checked.indexOf(ck) >= 0 ? ' ba-column-row-checked' : '';
                html += '<div class="ba-column-row' + checkedClass + '" style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; padding: 0.3rem 0.5rem;" tabindex="0">' +
                    '<label class="ba-checkbox" style="display: flex; flex-wrap: wrap; align-items: center; cursor: pointer; font-size: 0.875rem; gap: 0.35rem; flex: 1; min-width: 0; margin: 0;">' +
                    '<input type="checkbox" class="chkPhoneColumn" data-schema="' + sch + '" data-table="' + tbl + '" data-column="' + col + '"' + needResetAttr + checkedAttr + ' />' +
                    '<span style="font-family: monospace;">' + key + '</span>' +
                    '<span style="color: ' + statusCls + '; font-size: 0.75rem; font-weight: 500;">[' + statusLabel + ']</span>' +
                    (reasonPart ? '<span style="color: ' + statusCls + '; font-size: 0.75rem;">' + reasonPart + '</span>' : '') +
                    '<button type="button" class="ba-copy-select-btn" data-schema="' + sch + '" data-table="' + tbl + '" data-column="' + col + '" title="Copy câu SELECT">📋</button>' +
                    '</label>' +
                    '</div>';
            });
            $('#phoneColumnsList').html(html);
            $('#phoneSortNameIcon').text(phoneColumnsSortCol === 'name' ? (phoneColumnsSortDir === 1 ? '↑' : '↓') : '');
            $('#phoneSortStatusIcon').text(phoneColumnsSortCol === 'status' ? (phoneColumnsSortDir === 1 ? '↑' : '↓') : '');
            updatePhoneSelectedCount();
        }

        function selectPhoneColumnsNeedReset() {
            $('.chkPhoneColumn').each(function() {
                var needReset = $(this).attr('data-need-reset') === '1';
                $(this).prop('checked', needReset);
                $(this).closest('.ba-column-row').toggleClass('ba-column-row-checked', needReset);
            });
            $('#chkSelectAllPhoneColumns').prop('checked', false);
            updatePhoneSelectedCount();
        }

        function updatePhoneSelectedCount() {
            var $checked = $('.chkPhoneColumn:checked');
            var n = $checked.length;
            $('#phoneSelectedCount').text(n > 0 ? 'Đang chọn: ' + n + ' dòng' : '');
            var $sum = $('#phoneSelectedSummary');
            var $list = $('#phoneSelectedList');
            if (n > 0) {
                var items = [];
                $checked.each(function() {
                    var s = $(this).data('schema') || 'dbo', t = $(this).data('table'), c = $(this).data('column');
                    items.push(s + '.' + t + '.' + c);
                });
                $list.html(items.map(function(k) { return '<div>' + k + '</div>'; }).join(''));
                $sum.show();
                $('#btnPhoneCount').text('(' + n + ')');
            } else {
                $sum.hide();
                $('#chkPhoneFilterSelected').prop('checked', false);
                $('#btnPhoneCount').text('');
            }
        }

        function loadPhoneColumnsList() {
            showProgress('Đang tải danh sách bảng có cột Phone...', 0, 'Đang xử lý...');
            $('#phoneColumnsListWrap').hide();
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetTablesWithPhoneColumns") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        hideProgress();
                        $('#phoneColumnsStatus').text('Lỗi: ' + (d && d.message ? d.message : 'Không tải được.'));
                        return;
                    }
                    phoneColumnsList = d.list || [];
                    hideProgress();
                    if (d.defaultPhone)
                        $('#txtOtherPhoneColumnsPhone').val($('#txtOtherPhoneColumnsPhone').val().trim() || d.defaultPhone);
                    if (phoneColumnsList.length === 0) {
                        $('#phoneColumnsStatus').html('<span style="color: var(--text-muted);">Không tìm thấy bảng nào có cột Phone (kiểu text).</span>');
                        return;
                    }
                    var notReset = phoneColumnsList.filter(function(x) { return x.status === 'NotReset'; }).length;
                    var resetCount = phoneColumnsList.length - notReset;
                    $('#phoneColumnsStatus').html(
                        '<span style="color: var(--success);">Tìm thấy ' + phoneColumnsList.length + ' cột Phone.</span> ' +
                        '<span style="color: var(--warning);">Cần reset: ' + notReset + '</span>. ' +
                        '<span style="color: var(--text-muted);">Đã reset: ' + resetCount + '</span>');
                    $('#searchPhoneColumns').val('');
                    $('#phoneColumnsControls').show();
                    $('#phoneColumnsListWrap').show();
                    $('#btnResetPhoneColumns').prop('disabled', false);
                    renderPhoneColumnsList();
                    $('#chkSelectAllPhoneColumns').off('change').prop('checked', false).on('change', function() {
                        var v = $(this).prop('checked');
                        $('.chkPhoneColumn').prop('checked', v);
                        $('#phoneColumnsList .ba-column-row').toggleClass('ba-column-row-checked', v);
                        updatePhoneSelectedCount();
                    });
                    $('#searchPhoneColumns').off('input').on('input', renderPhoneColumnsList);
                    $('#chkPhoneFilterSelected').off('change').on('change', renderPhoneColumnsList);
                    $('.phone-sort-btn').off('click').on('click', function() {
                        var col = $(this).data('sort');
                        if (phoneColumnsSortCol === col) phoneColumnsSortDir = -phoneColumnsSortDir;
                        else { phoneColumnsSortCol = col; phoneColumnsSortDir = 1; }
                        renderPhoneColumnsList();
                    });
                    $(document).off('change', '.chkPhoneColumn').on('change', '.chkPhoneColumn', function() {
                        $(this).closest('.ba-column-row').toggleClass('ba-column-row-checked', $(this).prop('checked'));
                        updatePhoneSelectedCount();
                    });
                },
                error: function() {
                    hideProgress();
                    $('#phoneColumnsStatus').text('Lỗi khi tải danh sách.');
                }
            });
        }

        function resetPhoneColumns() {
            var selected = [];
            $('.chkPhoneColumn:checked').each(function() {
                selected.push({
                    schema: $(this).data('schema') || 'dbo',
                    table: $(this).data('table'),
                    column: $(this).data('column')
                });
            });
            if (selected.length === 0) {
                showToast('Chọn ít nhất 1 bảng/cột để reset.', 'error');
                return;
            }
            var phone = $('#txtOtherPhoneColumnsPhone').val();
            if (!phone || !phone.trim()) {
                showToast('Nhập số điện thoại reset chung.', 'error');
                return;
            }
            updateInProgress = true;
            showProgress('Đang reset các cột Phone...', 0, '0 / ' + selected.length + ' cột');
            $('.ba-btn').prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/ResetPhoneColumns") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, selections: selected, phone: phone.trim() }),
                timeout: 60000,
                success: function(res) {
                    var d = res.d || res;
                    showProgress('Hoàn thành', 100, d && d.message ? d.message : 'Reset xong.');
                    setTimeout(function() {
                        updateInProgress = false;
                        hideProgress();
                        $('.ba-btn').prop('disabled', false);
                        showToast(d && d.success ? (d.message || 'Đã reset thành công.') : (d && d.message ? d.message : 'Lỗi'), d && d.success ? 'success' : 'error');
                    }, 400);
                },
                error: function(xhr, status, err) {
                    var msg = 'Lỗi khi reset.';
                    if (xhr.responseText) {
                        try {
                            var json = JSON.parse(xhr.responseText);
                            if (json.d && json.d.message) msg = json.d.message;
                            else if (json.message) msg = json.message;
                        } catch(e) {}
                    }
                    showProgress('Lỗi', 100, msg);
                    setTimeout(function() {
                        updateInProgress = false;
                        hideProgress();
                        $('.ba-btn').prop('disabled', false);
                        showToast(msg, 'error');
                    }, 400);
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
                        employeesDataLoaded = true;
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
                        employeesDataLoaded = true;
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
                                employeesDataLoaded = true;
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
            var filtered = filterEmployees();
            if (!employees.length) {
                var emptyMsg = !employeesDataLoaded
                    ? '<div class="ba-empty-state"><span class="ba-empty-state-icon">👤</span><span>Chưa tải dữ liệu. Bấm <a href="#" class="ba-empty-state-link" id="employeesEmptyLink">View Data</a> để tải danh sách employee.</span></div>'
                    : '<div class="ba-empty-state"><span class="ba-empty-state-icon">📭</span><span>Không có employee nào.</span></div>';
                $tb.html('<tr><td colspan="17" class="ba-empty">' + emptyMsg + '</td></tr>');
                $('#chkSelectAllEmployees').off('change').prop('checked', false);
                $pg.hide();
                return;
            }
            if (filtered.length === 0) {
                $tb.html('<tr><td colspan="17" class="ba-empty"><div class="ba-empty-state"><span class="ba-empty-state-icon">🔍</span><span>Không có bản ghi phù hợp. Thử đổi từ khóa tìm kiếm hoặc bộ lọc Company.</span></div></td></tr>');
                $('#chkSelectAllEmployees').off('change').prop('checked', false);
                $pg.hide();
                return;
            }
            var sorted = sortEmployees(filtered);
            var total = sorted.length;
            var pages = Math.max(1, Math.ceil(total / EMPLOYEE_PAGE_SIZE));
            employeePage = Math.max(1, Math.min(employeePage, pages));
            var from = (employeePage - 1) * EMPLOYEE_PAGE_SIZE;
            var chunk = sorted.slice(from, from + EMPLOYEE_PAGE_SIZE);
            var html = '';
            chunk.forEach(function(e) {
                var localId = (e.localEmployeeID != null && e.localEmployeeID !== '') ? String(e.localEmployeeID) : '';
                var empName = (e.employeeName != null ? String(e.employeeName) : '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                html += '<tr data-id="' + e.employeeID + '" data-local-id="' + (localId || '') + '" data-name="' + empName + '">' +
                    '<td data-col-index="0"><input type="checkbox" class="chkEmployee" data-id="' + e.employeeID + '" data-local-id="' + (localId || '') + '" data-name="' + empName + '" /></td>' +
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
                toggleDeleteEmployeeButton();
            });
            $(document).off('change', '#tabEmployees .chkEmployee').on('change', '#tabEmployees .chkEmployee', function() { toggleDeleteEmployeeButton(); });
            toggleDeleteEmployeeButton();
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

        var _confirmModalKeydown = null;
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
            _confirmModalKeydown = function(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    hideConfirmUpdateModal();
                    if (typeof onCancel === 'function') onCancel();
                } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    hideConfirmUpdateModal();
                    if (typeof onConfirm === 'function') onConfirm();
                }
            };
            $(document).on('keydown', _confirmModalKeydown);
        }

        function hideConfirmUpdateModal() {
            if (_confirmModalKeydown) {
                $(document).off('keydown', _confirmModalKeydown);
                _confirmModalKeydown = null;
            }
            $('#confirmUpdateModal').removeClass('show').css('display', 'none');
        }

        function toggleCollapseSection(headerEl) {
            var section = headerEl.closest('.ba-collapse-section');
            if (section) section.classList.toggle('collapsed');
        }

        function getSelectedEmployeeLocalIds() {
            var ids = [];
            $('#tabEmployees .chkEmployee:checked').each(function() {
                var lid = $(this).data('local-id');
                if (lid != null && String(lid).trim() !== '') ids.push(String(lid).trim());
            });
            return ids;
        }
        /** Trả về [{ localId, name }] để gửi lên server lưu Payload (chi tiết thông báo / Function Queue / Audit). */
        function getSelectedEmployeesForDelete() {
            var list = [];
            $('#tabEmployees .chkEmployee:checked').each(function() {
                var $cb = $(this);
                var lid = $cb.data('local-id');
                if (lid == null || String(lid).trim() === '') return;
                var name = $cb.data('name');
                if (typeof name === 'string') name = name.replace(/&quot;/g, '"').replace(/&lt;/g, '<');
                list.push({ localId: String(lid).trim(), name: name || '' });
            });
            return list;
        }

        function toggleDeleteEmployeeButton() {
            var n = $('#tabEmployees .chkEmployee:checked').length;
            $('#btnDeleteEmployees').toggle(n > 0);
        }

        var deleteEmployeeCaptchaA = 0, deleteEmployeeCaptchaB = 0;
        function refreshDeleteEmployeeCaptcha() {
            deleteEmployeeCaptchaA = Math.floor(Math.random() * 9) + 1;
            deleteEmployeeCaptchaB = Math.floor(Math.random() * 9) + 1;
            $('#deleteEmployeeCaptchaQuestion').text(deleteEmployeeCaptchaA + ' + ' + deleteEmployeeCaptchaB + ' = ');
            $('#deleteEmployeeCaptchaInput').val('');
        }
        function openDeleteEmployeeConfirm() {
            var localIds = getSelectedEmployeeLocalIds();
            if (localIds.length === 0) {
                showToast('Chọn ít nhất 1 employee (cột Local ID) để xóa.', 'error');
                return;
            }
            $('#deleteEmployeeConfirmMessage').text('Bạn chắc chắn xóa ' + localIds.length + ' employee (Local ID: ' + localIds.slice(0, 5).join(', ') + (localIds.length > 5 ? '...' : '') + ')? Nhập captcha bên dưới để xác nhận.');
            refreshDeleteEmployeeCaptcha();
            $('#deleteEmployeeConfirmModal').addClass('show').css('display', 'flex');
        }
        function hideDeleteEmployeeConfirmModal() {
            $('#deleteEmployeeConfirmModal').removeClass('show').css('display', 'none');
        }
        function submitDeleteEmployees() {
            var localIds = getSelectedEmployeeLocalIds();
            if (localIds.length === 0) {
                showToast('Chọn ít nhất 1 employee để xóa.', 'error');
                return;
            }
            var captchaVal = parseInt($('#deleteEmployeeCaptchaInput').val(), 10);
            if (captchaVal !== deleteEmployeeCaptchaA + deleteEmployeeCaptchaB) {
                showToast('Captcha không đúng. Vui lòng nhập lại.', 'error');
                refreshDeleteEmployeeCaptcha();
                return;
            }
            hideDeleteEmployeeConfirmModal();
            var employeesPayload = getSelectedEmployeesForDelete();
            if (employeesPayload.length === 0) employeesPayload = localIds.map(function(lid) { return { localId: lid, name: '' }; });
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartHRHelperDeleteEmployeeJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, localEmployeeIds: localIds, payloadJson: JSON.stringify(employeesPayload), captchaA: deleteEmployeeCaptchaA, captchaB: deleteEmployeeCaptchaB }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        try { sessionStorage.setItem('baHRHelperJobRunning', '1'); } catch (e) {}
                        window.__hrOverlayWaitingForJob = true;
                        $('#hrJobOverlay').addClass('show');
                        $('#hrJobOverlay .ba-hr-job-text').text('Đang xử lý... Không thao tác cho đến khi job hoàn thành.');
                        $('#hrJobOverlayDetail').empty().hide();
                        startHrOverlayPoll();
                        checkHRHelperJobsAndShowOverlay();
                        showToast('Đã đưa xóa employee vào hàng đợi. Job chạy nền.', 'success');
                    } else {
                        showToast(d && d.message ? d.message : 'Lỗi tạo job.', 'error');
                    }
                },
                error: function(xhr) {
                    var msg = 'Lỗi kết nối.';
                    if (xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message; else if (j.message) msg = j.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                }
            });
        }

        function syncGenerateEmployeeTestDataControls() {
            var genEmail = $('#chkGenTestEmail').is(':checked');
            $('#selGenTestEmailDomain, #txtGenTestEmailPrefix, #txtGenTestEmailStart').prop('disabled', !genEmail);
            var genSalary = $('#chkGenTestSalary').is(':checked');
            $('#txtGenTestSalaryMin, #txtGenTestSalaryMax').prop('disabled', !genSalary);
        }

        function loadGenerateEmployeeEmailDomains() {
            return $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GetHrTestDataEmailDomains") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}',
                timeout: 30000
            }).then(function(res) {
                var d = res.d || res;
                var domains = (d && d.success && d.domains) ? d.domains : [];
                var html = '<option value="">-- Chọn domain --</option>';
                for (var i = 0; i < domains.length; i++) {
                    var v = (domains[i] || '').toString().trim().toLowerCase();
                    if (!v) continue;
                    html += '<option value="' + v.replace(/"/g, '&quot;') + '">@' + v + '</option>';
                }
                $('#selGenTestEmailDomain').html(html);
                if (domains.length > 0) $('#selGenTestEmailDomain').val((domains[0] || '').toString().trim().toLowerCase());
                if (!(d && d.success)) showToast((d && d.message) ? d.message : 'Không tải được domain email.', 'error');
            }, function(xhr) {
                var msg = 'Không tải được domain email.';
                if (xhr && xhr.responseText) {
                    try {
                        var j = JSON.parse(xhr.responseText);
                        if (j.d && j.d.message) msg = j.d.message;
                        else if (j.message) msg = j.message;
                    } catch (e) {}
                }
                showToast(msg, 'error');
                $('#selGenTestEmailDomain').html('<option value="">-- Chọn domain --</option>');
            });
        }

        function openGenerateEmployeeTestDataModal() {
            var targetIds = getUpdateTargetEmployeeIds();
            if (!targetIds || targetIds.length === 0) {
                showToast('Chưa có employee nào để generate. Bấm View Data trước.', 'error');
                return;
            }
            $('#generateEmployeeTestDataTargetCount').text(targetIds.length + ' employee');
            $('#chkGenTestEmail').prop('checked', true);
            $('#chkGenTestPhone').prop('checked', false);
            $('#chkGenTestSalary').prop('checked', false);
            $('#txtGenTestEmailPrefix').val('test');
            $('#txtGenTestEmailStart').val('1');
            $('#txtGenTestSalaryMin').val('');
            $('#txtGenTestSalaryMax').val('');
            $('#chkGenTestUpdateUserEmail').prop('checked', true);
            syncGenerateEmployeeTestDataControls();
            loadGenerateEmployeeEmailDomains();
            $('#generateEmployeeTestDataModal').addClass('show').css('display', 'flex');
        }

        function hideGenerateEmployeeTestDataModal() {
            $('#generateEmployeeTestDataModal').removeClass('show').css('display', 'none');
        }

        var generateEmployeeTestDataCaptchaA = 0, generateEmployeeTestDataCaptchaB = 0;
        var pendingGenerateEmployeeTestData = null;
        function refreshGenerateEmployeeTestDataCaptcha() {
            generateEmployeeTestDataCaptchaA = Math.floor(Math.random() * 9) + 1;
            generateEmployeeTestDataCaptchaB = Math.floor(Math.random() * 9) + 1;
            $('#generateEmployeeTestDataCaptchaQuestion').text(generateEmployeeTestDataCaptchaA + ' + ' + generateEmployeeTestDataCaptchaB + ' = ');
            $('#generateEmployeeTestDataCaptchaInput').val('');
        }
        function openGenerateEmployeeTestDataConfirmModal(message, payload) {
            pendingGenerateEmployeeTestData = payload || null;
            $('#generateEmployeeTestDataConfirmMessage').text(message || 'Xác nhận thực hiện Generate Test Data?');
            refreshGenerateEmployeeTestDataCaptcha();
            $('#generateEmployeeTestDataConfirmModal').addClass('show').css('display', 'flex');
        }
        function hideGenerateEmployeeTestDataConfirmModal() {
            $('#generateEmployeeTestDataConfirmModal').removeClass('show').css('display', 'none');
        }
        function submitGenerateEmployeeTestDataWithCaptcha() {
            if (!pendingGenerateEmployeeTestData || !pendingGenerateEmployeeTestData.targetIds || pendingGenerateEmployeeTestData.targetIds.length === 0) {
                hideGenerateEmployeeTestDataConfirmModal();
                showToast('Không có dữ liệu để chạy.', 'error');
                return;
            }
            var captchaVal = parseInt($('#generateEmployeeTestDataCaptchaInput').val(), 10);
            if (captchaVal !== generateEmployeeTestDataCaptchaA + generateEmployeeTestDataCaptchaB) {
                showToast('Captcha không đúng. Vui lòng nhập lại.', 'error');
                refreshGenerateEmployeeTestDataCaptcha();
                return;
            }
            var data = pendingGenerateEmployeeTestData;
            pendingGenerateEmployeeTestData = null;
            hideGenerateEmployeeTestDataConfirmModal();
            doGenerateEmployeeTestData(data.targetIds, data.opts);
        }

        function generateEmployeeTestData() {
            var targetIds = getUpdateTargetEmployeeIds();
            if (!targetIds || targetIds.length === 0) {
                showToast('Chưa có employee nào để generate.', 'error');
                return;
            }
            var generateEmail = $('#chkGenTestEmail').is(':checked');
            var generatePhone = $('#chkGenTestPhone').is(':checked');
            var generateSalary = $('#chkGenTestSalary').is(':checked');
            if (!generateEmail && !generatePhone && !generateSalary) {
                showToast('Chọn ít nhất 1 mục (Email / Phone / Lương).', 'error');
                return;
            }
            var emailDomain = ($('#selGenTestEmailDomain').val() || '').toString().trim().replace(/^@+/, '').toLowerCase();
            var emailPrefix = ($('#txtGenTestEmailPrefix').val() || '').toString().trim().toLowerCase();
            var emailStart = parseInt($('#txtGenTestEmailStart').val(), 10);
            if (generateEmail) {
                if (!emailPrefix) {
                    showToast('Nhập Email Prefix.', 'error');
                    return;
                }
                if (!emailDomain || emailDomain.indexOf('.') < 0) {
                    showToast('Chọn Email Domain hợp lệ.', 'error');
                    return;
                }
                if (!emailStart || emailStart < 1) emailStart = 1;
            } else {
                emailStart = 1;
            }
            var salaryMin = parseFloat($('#txtGenTestSalaryMin').val());
            var salaryMax = parseFloat($('#txtGenTestSalaryMax').val());
            if (generateSalary) {
                if (!isFinite(salaryMin) || !isFinite(salaryMax)) {
                    showToast('Nhập đầy đủ Min/Max cho lương.', 'error');
                    return;
                }
                if (salaryMin < 0 || salaryMax < 0) {
                    showToast('Lương Min/Max phải >= 0.', 'error');
                    return;
                }
                if (salaryMax < salaryMin) {
                    showToast('Lương Max phải >= Min.', 'error');
                    return;
                }
            } else {
                salaryMin = 0;
                salaryMax = 0;
            }
            var updateUserEmailMapping = $('#chkGenTestUpdateUserEmail').is(':checked');
            var selectedCount = $('#tabEmployees .chkEmployee:checked').length;
            var isUpdateAll = selectedCount === 0;
            var msg = isUpdateAll
                ? 'Chắc chắn generate test data cho TẤT CẢ ' + targetIds.length + ' employee?'
                : 'Chắc chắn generate test data cho ' + targetIds.length + ' employee đã chọn?';
            openGenerateEmployeeTestDataConfirmModal(msg, {
                targetIds: targetIds,
                opts: {
                    generateEmail: generateEmail,
                    emailDomain: emailDomain,
                    emailPrefix: emailPrefix,
                    emailStartNumber: emailStart,
                    generatePhone: generatePhone,
                    generateSalary: generateSalary,
                    salaryMin: salaryMin,
                    salaryMax: salaryMax,
                    updateUserEmailMapping: updateUserEmailMapping
                }
            });
        }

        function doGenerateEmployeeTestData(targetIds, opts) {
            var payload = {
                k: hrToken,
                companyID: employeeCompanyFilter,
                employeeIds: targetIds,
                generateEmail: !!opts.generateEmail,
                emailDomain: opts.emailDomain || '',
                emailPrefix: opts.emailPrefix || '',
                emailStartNumber: parseInt(opts.emailStartNumber, 10) || 1,
                generatePhone: !!opts.generatePhone,
                generateSalary: !!opts.generateSalary,
                salaryMin: isFinite(opts.salaryMin) ? opts.salaryMin : 0,
                salaryMax: isFinite(opts.salaryMax) ? opts.salaryMax : 0,
                updateUserEmailMapping: !!opts.updateUserEmailMapping
            };
            $('#btnGenerateEmployeeTestDataRun').prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartHRHelperGenerateEmployeeTestDataJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(payload),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        hideGenerateEmployeeTestDataModal();
                        window.__hrOverlayWaitingForJob = true;
                        $('#hrJobOverlay').addClass('show');
                        $('#hrJobOverlay .ba-hr-job-text').text('Đang xử lý... Không thao tác cho đến khi job hoàn thành.');
                        $('#hrJobOverlayDetail').empty().hide();
                        startHrOverlayPoll();
                        checkHRHelperJobsAndShowOverlay();
                        showToast(d.message || 'Đã đưa Generate Test Data vào hàng đợi. Job chạy nền.', 'success');
                    } else {
                        showToast(d && d.message ? d.message : 'Lỗi tạo job Generate Test Data.', 'error');
                    }
                },
                error: function(xhr) {
                    var msg = 'Lỗi kết nối hoặc timeout.';
                    if (xhr && xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message;
                            else if (j.message) msg = j.message;
                        } catch (e) {}
                    }
                    showToast(msg, 'error');
                },
                complete: function() {
                    $('#btnGenerateEmployeeTestDataRun').prop('disabled', false);
                }
            });
        }

        function openGenerateDeleteScriptModal() {
            var selectedIds = getSelectedEmployeeLocalIds();
            $('#txtDeleteScriptLocalIds').val(selectedIds.length > 0 ? selectedIds.join(', ') : '');
            $('#txtDeleteScriptOutput').val('');
            $('#btnCopyDeleteScript').hide();
            $('#btnGenerateAndRunDeleteScript').show();
            $('#generateDeleteScriptModal').addClass('show').css('display', 'flex');
        }
        function hideGenerateDeleteScriptModal() {
            $('#generateDeleteScriptModal').removeClass('show').css('display', 'none');
        }
        function doGenerateDeleteScript() {
            var raw = $('#txtDeleteScriptLocalIds').val();
            if (!raw || !raw.trim()) {
                showToast('Nhập mã Local Employee (cách nhau bằng dấu phẩy).', 'error');
                return;
            }
            $('#btnCopyDeleteScript').hide();
            $('#btnDoGenerateDeleteScript').prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GenerateDeleteEmployeeScript") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, localIdsCommaSeparated: raw.trim() }),
                timeout: 60000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.script) {
                        $('#txtDeleteScriptOutput').val(d.script);
                        $('#btnCopyDeleteScript').show();
                        showToast(d.message || 'Đã generate script.', 'success');
                    } else {
                        $('#txtDeleteScriptOutput').val('');
                        $('#btnCopyDeleteScript').hide();
                        showToast(d && d.message ? d.message : 'Lỗi generate script.', 'error');
                    }
                },
                error: function(xhr) {
                    $('#btnCopyDeleteScript').hide();
                    var msg = 'Lỗi kết nối.';
                    if (xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message; else if (j.message) msg = j.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                },
                complete: function() { $('#btnDoGenerateDeleteScript').prop('disabled', false); }
            });
        }
        function copyDeleteScript() {
            var ta = document.getElementById('txtDeleteScriptOutput');
            if (!ta || !ta.value.trim()) {
                showToast('Chưa có nội dung để copy.', 'error');
                return;
            }
            ta.select();
            try {
                document.execCommand('copy');
                showToast('Đã copy script vào clipboard.', 'success');
            } catch (e) {
                try {
                    navigator.clipboard.writeText(ta.value).then(function() { showToast('Đã copy script vào clipboard.', 'success'); }, function() { showToast('Không copy được.', 'error'); });
                } catch (e2) { showToast('Không copy được.', 'error'); }
            }
        }
        var generateRunCaptchaA = 0, generateRunCaptchaB = 0;
        function refreshGenerateRunCaptcha() {
            generateRunCaptchaA = Math.floor(Math.random() * 9) + 1;
            generateRunCaptchaB = Math.floor(Math.random() * 9) + 1;
            $('#generateRunCaptchaQuestion').text(generateRunCaptchaA + ' + ' + generateRunCaptchaB + ' = ');
            $('#generateRunCaptchaInput').val('');
        }
        function showGenerateRunConfirmModal() {
            $('#generateRunConfirmMessage').text('Bạn có chắc muốn generate delete script và chạy luôn trên database này không? Nhập captcha để xác nhận.');
            refreshGenerateRunCaptcha();
            $('#generateRunConfirmModal').addClass('show').css('display', 'flex');
        }
        function hideGenerateRunConfirmModal() {
            $('#generateRunConfirmModal').removeClass('show').css('display', 'none');
        }
        function generateAndRunDeleteScript() {
            var raw = ($('#txtDeleteScriptLocalIds').val() || '').trim();
            if (!raw) {
                showToast('Nhập mã Local Employee trước.', 'error');
                return;
            }
            showGenerateRunConfirmModal();
        }
        function doExecuteGenerateAndRunDeleteScript() {
            var raw = ($('#txtDeleteScriptLocalIds').val() || '').trim();
            if (!raw) return;
            var captchaVal = parseInt($('#generateRunCaptchaInput').val(), 10);
            if (captchaVal !== generateRunCaptchaA + generateRunCaptchaB) {
                showToast('Captcha không đúng. Vui lòng nhập lại.', 'error');
                refreshGenerateRunCaptcha();
                return;
            }
            hideGenerateRunConfirmModal();
            hideGenerateDeleteScriptModal();
            var ids = raw.split(/[\s,;]+/).map(function(s) { return s.trim(); }).filter(Boolean);
            var payloadJson = JSON.stringify(ids.map(function(lid) { return { localId: lid, name: '' }; }));
            $('#hrJobOverlay').addClass('show');
            $('#hrJobOverlay .ba-hr-job-text').text('Đang đưa job xóa employee vào hàng đợi...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartHRHelperDeleteEmployeeJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, localEmployeeIds: ids, payloadJson: payloadJson, captchaA: generateRunCaptchaA, captchaB: generateRunCaptchaB }),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        try { sessionStorage.setItem('baHRHelperJobRunning', '1'); } catch (e) {}
                        $('#hrJobOverlay .ba-hr-job-text').text('Đang xóa employee... Không thao tác cho đến khi job hoàn thành.');
                        showToast(d.message || 'Đã đưa xóa employee vào hàng đợi. Xem tiến độ trên chuông.', 'success');
                        if (typeof checkHRHelperJobsAndShowOverlay === 'function') checkHRHelperJobsAndShowOverlay();
                        if (typeof loadRestoreJobsPanel === 'function') loadRestoreJobsPanel();
                    } else {
                        $('#hrJobOverlay').removeClass('show');
                        showToast(d && d.message ? d.message : 'Lỗi tạo job.', 'error');
                    }
                },
                error: function(xhr) {
                    $('#hrJobOverlay').removeClass('show');
                    var msg = 'Lỗi kết nối.';
                    if (xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message; else if (j.message) msg = j.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                }
            });
        }

        /** IDs để update: nếu không chọn ai = update all (danh sách đang hiển thị sau search/sort). */
        function getUpdateTargetIds() {
            var selected = [];
            $('.chkUser:checked').each(function() { selected.push(parseInt($(this).data('id'), 10)); });
            if (selected.length > 0) return selected;
            var list = sortUsers(filterUsers());
            return list.map(function(u) { return u.userID; });
        }

        function checkUserSignatureSupport() {
            if (!hrToken) return;
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/HasUserSignatureColumn") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken }),
                timeout: 10000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.hasColumn) {
                        hasUserSignatureSupport = true;
                        $('#btnUpdateUserSignature').show();
                        $('#sectionUpdateUserSignature').show();
                        updateUpdateUserSignatureButtonState();
                    }
                }
            });
        }

        function updateUpdateUserSignatureButtonState() {
            if (!hasUserSignatureSupport) return;
            var n = $('#tblUsers .chkUser:checked').length;
            $('#btnUpdateUserSignature').prop('disabled', n === 0).attr('title', n === 0 ? 'Chọn ít nhất 1 user ở bảng trên' : '');
        }

        function updateUserSignature() {
            var selected = [];
            $('.chkUser:checked').each(function() { selected.push(parseInt($(this).data('id'), 10)); });
            if (selected.length === 0) {
                showToast('Chọn ít nhất 1 user ở bảng trên.', 'error');
                return;
            }
            if (typeof baConfirm !== 'function') {
                if (!confirm('Bạn có chắc muốn update User Signature cho ' + selected.length + ' user đã chọn không?')) return;
                doUpdateUserSignature(selected);
                return;
            }
            baConfirm('Bạn có chắc muốn update User Signature cho ' + selected.length + ' user đã chọn không?', function() { doUpdateUserSignature(selected); }, null, 'Đồng ý', 'Hủy');
        }

        function doUpdateUserSignature(targetIds) {
            var $btn = $('#btnUpdateUserSignature');
            $btn.prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartHRHelperUpdateUserSignatureJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ k: hrToken, userIds: targetIds }),
                timeout: 15000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        showToast(d.message || 'Đã đưa Update User Signature vào hàng đợi. Xem tiến độ tại chuông / Function Queue.', 'success');
                        if (typeof checkHRHelperJobsAndShowOverlay === 'function') checkHRHelperJobsAndShowOverlay();
                        if (typeof loadRestoreJobsPanel === 'function') loadRestoreJobsPanel();
                    } else {
                        showToast(d && d.message ? d.message : 'Lỗi.', 'error');
                    }
                },
                error: function(xhr) {
                    var msg = 'Lỗi kết nối.';
                    try {
                        var j = xhr.responseJSON && (xhr.responseJSON.d || xhr.responseJSON);
                        if (j && j.message) msg = j.message;
                    } catch (e) {}
                    showToast(msg, 'error');
                },
                complete: function() {
                    $btn.prop('disabled', $('#tblUsers .chkUser:checked').length === 0);
                }
            });
        }

        /** User names của các user đang chọn (hoặc tất cả nếu không chọn ai) – dùng cho Generate script. */
        function getSelectedUserNames() {
            var ids = getUpdateTargetIds();
            var names = [];
            ids.forEach(function(id) {
                var u = users.find(function(x) { return x.userID === id; });
                if (u && u.userName) names.push(u.userName);
            });
            return names;
        }

        function generatePasswordScript() {
            var userNames = getSelectedUserNames();
            if (userNames.length === 0) {
                showToast('Chưa có user nào. Bấm View Data và chọn user (hoặc không chọn = tất cả).', 'error');
                return;
            }
            var password = $('#txtScriptPassword').val();
            if (!password || !password.trim()) {
                showToast('Nhập password.', 'error');
                return;
            }
            var method = $('#selScriptMethodHash').val() || '256';
            $('#btnGeneratePasswordScript').prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/GeneratePasswordUpdateScript") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ userNames: userNames, password: password.trim(), method: method }),
                timeout: 15000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.script !== undefined) {
                        $('#txtPasswordScript').val(d.script);
                        $('#btnCopyPasswordScript').show();
                        showToast('Đã tạo script cho ' + userNames.length + ' user.', 'success');
                    } else {
                        $('#txtPasswordScript').val('');
                        $('#btnCopyPasswordScript').hide();
                        showToast(d && d.message ? d.message : 'Lỗi tạo script.', 'error');
                    }
                },
                error: function(xhr) {
                    var msg = 'Lỗi kết nối.';
                    if (xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message; else if (j.message) msg = j.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                },
                complete: function() { $('#btnGeneratePasswordScript').prop('disabled', false); }
            });
        }

        function copyPasswordScript() {
            var ta = document.getElementById('txtPasswordScript');
            if (!ta || !ta.value.trim()) {
                showToast('Chưa có nội dung để copy.', 'error');
                return;
            }
            ta.select();
            try {
                document.execCommand('copy');
                showToast('Đã copy script vào clipboard.', 'success');
            } catch (e) {
                try {
                    navigator.clipboard.writeText(ta.value).then(function() { showToast('Đã copy script vào clipboard.', 'success'); }, function() { showToast('Không copy được.', 'error'); });
                } catch (e2) { showToast('Không copy được.', 'error'); }
            }
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
            var payload = {
                k: hrToken,
                userIds: targetIds,
                isUpdatePassword: isUpdatePassword,
                password: isUpdatePassword ? $('#txtPassword').val().trim() : null,
                methodHash: parseInt($('#selMethodHash').val(), 10) || 256,
                isUpdateEmail: isUpdateEmail,
                email: isUpdateEmail ? $('#txtEmail').val().trim() : null,
                ignoreWindowsAD: ignoreWindowsAD
            };
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartHRHelperUpdateUserJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(payload),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        window.__hrOverlayWaitingForJob = true;
                        $('#hrJobOverlay').addClass('show');
                        $('#hrJobOverlay .ba-hr-job-text').text('Đang xử lý... Không thao tác cho đến khi job hoàn thành.');
                        $('#hrJobOverlayDetail').empty().hide();
                        startHrOverlayPoll();
                        checkHRHelperJobsAndShowOverlay();
                        showToast('Đã đưa update user vào hàng đợi. Job chạy nền.', 'success');
                    } else {
                        showToast(d && d.message ? d.message : 'Lỗi tạo job.', 'error');
                    }
                },
                error: function(xhr, status, err) {
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
            var payload = {
                k: hrToken,
                companyID: employeeCompanyFilter,
                employeeIds: targetIds,
                updPersonal: updPersonal,
                personalEmail: $('#txtPersonalEmail').val().trim(),
                updBusiness: updBusiness,
                businessEmail: $('#txtBusinessEmail').val().trim(),
                updPayslip: updPayslip,
                payslipCommon: $('#txtPayslipCommon').val().trim(),
                payslipByEmp: payslipByEmp,
                updM1: updM1,
                m1: $('#txtMobile1').val().trim(),
                updM2: updM2,
                m2: $('#txtMobile2').val().trim(),
                updBasic: updBasic,
                basicSalary: parseFloat($('#txtBasicSalary').val()) || 0
            };
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartHRHelperUpdateEmployeeJob") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(payload),
                timeout: 30000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        window.__hrOverlayWaitingForJob = true;
                        $('#hrJobOverlay').addClass('show');
                        $('#hrJobOverlay .ba-hr-job-text').text('Đang xử lý... Không thao tác cho đến khi job hoàn thành.');
                        $('#hrJobOverlayDetail').empty().hide();
                        startHrOverlayPoll();
                        checkHRHelperJobsAndShowOverlay();
                        showToast('Đã đưa update employee vào hàng đợi. Job chạy nền.', 'success');
                    } else {
                        showToast(d && d.message ? d.message : 'Lỗi tạo job.', 'error');
                    }
                },
                error: function(xhr, status, err) {
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

        var companyTenants = [];
        var companyCompanies = [];
        var currentCompanyData = null;
        var companyInfoViewed = false;

        function updateCompanyButtonsState() {
            var isAll = $('#rbCompanyAll').is(':checked');
            var isSelect = $('#rbCompanySelect').is(':checked');
            var canEnable = isAll || (isSelect && companyInfoViewed);
            $('#btnCompanyUserAction, #btnCompanyCadenaServer, #btnCompanyUpdate').prop('disabled', !canEnable);
            var viewDataDisabled = $('#btnCompanyViewData').prop('disabled');
            $('#companyViewDataHint').toggle(!!viewDataDisabled);
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
                    if (d && d.success && (d.userName || d.email)) {
                        var email = (d.email && d.email.indexOf('@') > 0)
                            ? d.email.replace(/@[^@]+$/, '@cadena-hrmseries.com')
                            : ((d.userName || '').trim() + '@cadena-hrmseries.com');
                        if (email && email !== '@cadena-hrmseries.com') {
                            $('#txtCompanyPayrollEmailTo').val(email);
                            $('#txtCompanyPayrollEmailCC').val(email);
                            $('#txtCompanyHREmailTo').val(email);
                            $('#txtCompanyHREmailCC').val(email);
                            $('#txtCompanyContactEmail').val(email);
                        }
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
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadEmailServerConfig") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                dataType: 'json'
            }).done(function(r) {
                var d = (typeof r.d !== 'undefined') ? r.d : r;
                if (d && d.success) {
                    $('#txtCompanyOutgoingServer').val(d.outgoingServer || '');
                    $('#txtCompanyServerPort').val(d.port || '');
                    $('#txtCompanyAccountName').val(d.accountName || '');
                    $('#txtCompanyUserName').val(d.username || '');
                    $('#txtCompanyEmailAddress').val(d.emailAddress || '');
                    $('#txtCompanyPassword').val(d.password || '');
                    $('#chkCompanyEnableSSL').prop('checked', !!d.enableSSL);
                    var sslPort = (d.sslPort != null && d.sslPort !== '') ? d.sslPort : '0';
                    $('#txtCompanySSLPort').val(sslPort).prop('disabled', !d.enableSSL);
                } else {
                    showToast((d && d.message) ? d.message : 'Không load được Email Server Settings. Cấu hình tại App Settings.', 'error');
                }
            }).fail(function() {
                showToast('Không load được Email Server Settings. Cấu hình tại App Settings.', 'error');
            }).always(function() {
                hideProgress();
            });
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
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/StartHRHelperUpdateOtherJob") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify(payload),
                    timeout: 30000,
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            window.__hrOverlayWaitingForJob = true;
                            $('#hrJobOverlay').addClass('show');
                            $('#hrJobOverlay .ba-hr-job-text').text('Đang xử lý... Không thao tác cho đến khi job hoàn thành.');
                            $('#hrJobOverlayDetail').empty().hide();
                            startHrOverlayPoll();
                            checkHRHelperJobsAndShowOverlay();
                            showToast('Đã đưa update company/other info vào hàng đợi. Job chạy nền.', 'success');
                        } else {
                            showToast(d && d.message ? d.message : 'Lỗi tạo job.', 'error');
                        }
                    },
                    error: function() {
                        showToast('Lỗi kết nối khi tạo job.', 'error');
                    }
                });
            });
        }
        // Chuông thông báo (job Backup/Restore/HR Helper) - dùng GetJobs từ DatabaseSearch
        (function() {
            var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
            var dismissJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissJob") %>';
            var cancelJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/CancelRestoreJob") %>';
            function parseDateSafe(v) {
                if (v == null || v === '') return null;
                if (typeof v === 'number') return new Date(v);
                var s = (typeof v === 'string') ? v : String(v);
                var m = s.match(/\/Date\((\d+)\)\//);
                if (m) return new Date(parseInt(m[1], 10));
                var n = Date.parse(s);
                return isNaN(n) ? null : new Date(n);
            }
            var DISMISSED_JOBS_KEY = 'baDismissedJobIds';
            function getDismissedJobIds() { try { var raw = localStorage.getItem(DISMISSED_JOBS_KEY); if (!raw) return []; var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; } }
            function addDismissedJobId(id, type) { var key = (type === 'Backup' ? 'b:' : 'r:') + id; var arr = getDismissedJobIds(); if (arr.indexOf(key) < 0) { arr.push(key); localStorage.setItem(DISMISSED_JOBS_KEY, JSON.stringify(arr)); } }
            function isJobDismissed(job) { var key = (job.type === 'Backup' ? 'b:' : 'r:') + (job.id || ''); return getDismissedJobIds().indexOf(key) >= 0; }
            function formatNotifTime(v) { var dt = parseDateSafe(v); return dt ? dt.toLocaleString() : '—'; }
            function showNotificationDetail(job) {
                if (!job) return;
                var jtEarly = (job.type || '').trim();
                if (jtEarly === 'Restore' || jtEarly === 'Backup' || (!jtEarly && (job.databaseName || job.DatabaseName))) {
                    if (typeof window.showNotificationDetail === 'function') {
                        window.showNotificationDetail(job);
                        return;
                    }
                }
                var typeLabel = (job.typeLabel || job.type || 'Restore').replace(/</g, '&lt;');
                var dbName = (job.databaseName || job.DatabaseName || '').trim();
                var isRestore = (job.type === 'Restore' || !job.type);
                var hasReset = isRestore && (job.withAutoReset === true || (job.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
                var resetBadge = '';
                if (isRestore) {
                    resetBadge = hasReset ? '<span class="ba-notif-type-badge ba-notif-reset-tag">Có Reset</span>' : '<span class="ba-notif-type-badge ba-notif-no-reset-tag">Không Reset</span>';
                    if (hasReset) {
                        var srvId = job.serverId != null ? job.serverId : (job.ServerId != null ? job.ServerId : 0);
                        var jobIdVal = job.id != null ? job.id : (job.Id != null ? job.Id : 0);
                        resetBadge += ' <button type="button" class="ba-notif-reset-info-btn" title="Xem thông tin reset (email, phone, password)" data-job-id="' + jobIdVal + '" data-server-id="' + srvId + '" data-database-name="' + (dbName.replace(/"/g, '&quot;')) + '">ℹ</button>';
                    }
                }
                var payloadRows = '';
                if ((job.type || '') === 'HRHelperMultiDbReset' && job.payload) {
                    try {
                        var pl = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                        if (pl) {
                            payloadRows += '<tr><th>Email reset</th><td>' + (pl.email || '—').replace(/</g, '&lt;') + '</td></tr>';
                            payloadRows += '<tr><th>Phone reset</th><td>' + (pl.phone || '—').replace(/</g, '&lt;') + '</td></tr>';
                            var dbArr = pl.databaseNames || [];
                            var nDb = dbArr.length || pl.databaseCount || 0;
                            var dbCell = nDb + ' Database';
                            if (dbArr.length > 0) {
                                var esc = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                                dbCell += ' <button type="button" class="ba-db-list-toggle" data-dbs="' + esc(JSON.stringify(dbArr)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button>';
                                dbCell += '<div class="ba-db-list-popover"></div>';
                            }
                            payloadRows += '<tr><th>Danh sách database</th><td>' + dbCell + '</td></tr>';
                        }
                    } catch (e) {}
                }
                var isRunningOrPending = (job.status === 'Running' || job.status === 'Pending');
                if ((job.type || '') === 'HRHelperDeleteEmployee' && job.payload) {
                    try {
                        var pl = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                        var empList = Array.isArray(pl) ? pl : (pl && pl.employees) ? pl.employees : [];
                        if (empList.length > 0) {
                            var esc = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                            var empCell = empList.length + ' nhân viên';
                            empCell += ' <button type="button" class="ba-emp-list-toggle" data-emps="' + esc(JSON.stringify(empList)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button>';
                            empCell += '<div class="ba-db-list-popover ba-emp-list-popover"></div>';
                            payloadRows += '<tr><th>' + (isRunningOrPending ? 'Danh sách nhân viên sẽ xóa' : 'Danh sách nhân viên đã xóa') + '</th><td>' + empCell + '</td></tr>';
                        }
                    } catch (e) {}
                }
                var resetRow = ((job.type || '') === 'HRHelperMultiDbReset') ? ('<tr><th>Loại reset</th><td>' + (resetBadge || '—') + '</td></tr>') : '';
                var html = '<table><tbody><tr><th>Loại</th><td>' + typeLabel + '</td></tr><tr><th>Server</th><td>' + (job.serverName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Database</th><td>' + (job.databaseName || '—').replace(/</g, '&lt;') + '</td></tr>' + resetRow + '<tr><th>Thực hiện bởi</th><td>' + (job.startedByUserName || '—').replace(/</g, '&lt;') + '</td></tr><tr><th>Trạng thái</th><td>' + (job.status === 'Running' ? 'Đang chạy' : (job.status === 'Completed' ? 'Thành công' : (job.status === 'Failed' ? 'Lỗi' : job.status))) + '</td></tr><tr><th>Bắt đầu</th><td>' + formatNotifTime(job.startTime) + '</td></tr><tr><th>Kết thúc</th><td>' + formatNotifTime(job.completedAt) + '</td></tr>' + payloadRows + '</tbody></table>';
                /* Khi job đang chạy: hiển thị "Dự kiến cập nhật" / "Giá trị dự kiến" từ payload để user kiểm tra và kịp hủy nếu nhầm */
                if (isRunningOrPending && job.payload) {
                    var jt = (job.type || '').trim();
                    if (jt === 'HRHelperUpdateEmployee' || jt === 'HRHelperUpdateUser' || jt === 'HRHelperUpdateOther') {
                        try {
                            var pl = typeof job.payload === 'string' ? JSON.parse((job.payload || '').replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '')) : job.payload;
                            if (pl) {
                                var parts = [];
                                if (pl.updPersonal || pl.updatePersonalInfo) parts.push('Thông tin cá nhân');
                                if (pl.updBusiness || pl.updateBusinessEmail) parts.push('Email công việc');
                                if (pl.updPayslip) parts.push('Payslip');
                                if (pl.updM1) parts.push('M1');
                                if (pl.updM2) parts.push('M2');
                                if (pl.updBasic) parts.push('Basic Salary');
                                if (parts.length) {
                                    html += '<div class="ba-notif-full-msg" style="margin-top:10px;padding:10px;background:var(--surface-alt,var(--bg-darker));border-radius:8px;border:1px solid var(--border);">';
                                    html += '<strong>Dự kiến cập nhật:</strong> ' + parts.join(', ');
                                    var vals = [];
                                    if (pl.personalEmail != null && pl.personalEmail !== '') vals.push('Email cá nhân: ' + (pl.personalEmail + '').replace(/</g, '&lt;'));
                                    if (pl.businessEmail != null && pl.businessEmail !== '') vals.push('Email công việc: ' + (pl.businessEmail + '').replace(/</g, '&lt;'));
                                    if (pl.m1 != null && pl.m1 !== '') vals.push('SĐT 1: ' + (pl.m1 + '').replace(/</g, '&lt;'));
                                    if (pl.m2 != null && pl.m2 !== '') vals.push('SĐT 2: ' + (pl.m2 + '').replace(/</g, '&lt;'));
                                    if (pl.basicSalary != null && pl.basicSalary !== '') vals.push('Lương: ' + (pl.basicSalary + '').replace(/</g, '&lt;'));
                                    if (vals.length) html += '<br/><strong>Giá trị dự kiến:</strong> ' + vals.join(' | ');
                                    html += '</div>';
                                }
                            }
                        } catch (e) {}
                    }
                    if (jt === 'HRHelperMultiDbReset' && !payloadRows) {
                        try {
                            var pl = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                            if (pl) {
                                html += '<div class="ba-notif-full-msg" style="margin-top:10px;padding:10px;background:var(--surface-alt);border-radius:8px;"><strong>Dự kiến reset:</strong> Email: ' + (pl.email || '—').replace(/</g, '&lt;') + ', Phone: ' + (pl.phone || '—').replace(/</g, '&lt;') + '</div>';
                            }
                        } catch (e) {}
                    }
                }
                if (job.message) html += '<div class="ba-notif-full-msg">' + (job.message || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</div>';
                html += '<div id="baResetInfoPopup" class="ba-reset-info-popup" style="display:none;"></div>';
                $('#notificationDetailBody').html(html);
                $('#notificationDetailBody').off('click.baDbList').on('click.baDbList', '.ba-db-list-toggle', function() {
                    var $btn = $(this), $pop = $btn.siblings('.ba-db-list-popover').first();
                    var raw = $btn.attr('data-dbs');
                    if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
                    try {
                        var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                        var grid = '<div class="ba-db-list-grid">' + (arr.map(function(name) { return '<span>' + (name || '').replace(/</g, '&lt;') + '</span>'; }).join('')) + '</div>';
                        $pop.html(grid).addClass('show');
                    } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
                });
                $('#notificationDetailBody').off('click.baEmpList').on('click.baEmpList', '.ba-emp-list-toggle', function() {
                    var $btn = $(this), $pop = $btn.siblings('.ba-emp-list-popover').first();
                    var raw = $btn.attr('data-emps');
                    if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
                    try {
                        var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                        var esc = function(s){ return (s||'').replace(/</g, '&lt;').replace(/&/g, '&amp;'); };
                        var grid = '<div class="ba-db-list-grid">' + (arr.map(function(o) { var lid = o.localId != null ? o.localId : o.LocalId || ''; var name = o.name != null ? o.name : o.Name || ''; return '<span>' + esc(lid) + (name ? ' – ' + esc(name) : '') + '</span>'; }).join('')) + '</div>';
                        $pop.html(grid).addClass('show');
                    } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
                });
                $('#notificationDetailBody').off('click.baResetInfo').on('click.baResetInfo', '.ba-notif-reset-info-btn', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    var $btn = $(this), jobId = $btn.data('job-id'), serverId = $btn.data('server-id'), dbName = $btn.data('database-name');
                    var $popup = $('#baResetInfoPopup');
                    if ($popup.length && (serverId != null && dbName || jobId)) {
                        $popup.html('<span class="ba-reset-info-loading">Đang tải...</span>').show();
                        var payload = { serverId: serverId || 0, databaseName: dbName || '' };
                        if (jobId) payload.jobId = jobId;
                        $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreResetInfo") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify(payload) })
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
                $('#notificationDetailModal').addClass('show');
            }
            $('#notificationDetailModal').on('click', function(e) { if (e.target === this) $('#notificationDetailModal').removeClass('show'); });
            $('#notificationDetailClose').on('click', function(e) { e.preventDefault(); $('#notificationDetailModal').removeClass('show'); });
            var NOTIF_MSG_MAX_LEN = 120;
            var restoreJobsPanelTimer = null;
            var restoreProgressTimer = null;
            function loadRestoreJobsPanel() {
                var $list = $('#restoreJobsList'); var $badge = $('#restoreJobsBadge');
                if (!$list.length) return;
                $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); window.__notifJobsList = []; if (restoreProgressTimer) { clearInterval(restoreProgressTimer); restoreProgressTimer = null; } if (restoreJobsPanelTimer) { clearInterval(restoreJobsPanelTimer); restoreJobsPanelTimer = null; } return; }
                        var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }).sort(function(a,b) { var ta = parseDateSafe(a.startTime); var tb = parseDateSafe(b.startTime); return (tb && ta) ? (tb - ta) : 0; });
                        var newBugs = d.newBugs || [];
                        var totalCount = jobs.length + newBugs.length;
                        if (totalCount === 0) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); window.__notifJobsList = []; if (restoreProgressTimer) { clearInterval(restoreProgressTimer); restoreProgressTimer = null; } if (restoreJobsPanelTimer) { clearInterval(restoreJobsPanelTimer); restoreJobsPanelTimer = null; } return; }
                        $badge.text(totalCount).addClass('visible');
                        var currentUserId = (d.currentUserId != null) ? parseInt(d.currentUserId, 10) : 0;
                        var isSuperAdmin = !!(d.isSuperAdmin === true || d.isSuperAdmin === 'true');
                        var runningMultiDbAnalyze = jobs.filter(function(j) { return j.status === 'Running' && (j.type || '') === 'HRHelperMultiDbAnalyze'; });
                        var hasRunningJobs = jobs.some(function(j) { return j.status === 'Running'; });
                        window.__notifJobsList = jobs;
                        var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
                        var notifBugsCollapsed = sessionStorage.getItem('ba_notif_bugs_collapsed') === '1';
                        var notifJobsCollapsed = sessionStorage.getItem('ba_notif_jobs_collapsed') === '1';
                        var html = '';
                        if (newBugs.length > 0) {
                            html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifBugsCollapsed ? '▶' : '▼') + '</span> 🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs" style="' + (notifBugsCollapsed ? 'display:none;' : '') + '">';
                            newBugs.forEach(function(b) { var created = formatNotifTime(b.createdAt); var bugUrl = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug" data-bug-id="' + (b.id || '') + '"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + created + '</div><a class="ba-notif-detail-link" href="' + bugUrl + '" data-action="bug">Xem / Xử lý</a></div>'; });
                            html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">';
                        }
                        jobs.forEach(function(j, idx) {
                            var st = j.status || ''; var msg = (j.message || '').trim(); var msgShort = msg.length > NOTIF_MSG_MAX_LEN ? msg.substring(0, NOTIF_MSG_MAX_LEN) + '…' : msg;
                            var jobType = j.type || 'Restore';
                            var typeLabel = (j.typeLabel || (jobType === 'HRHelperMultiDbAnalyze' ? 'Phân tích Multi-DB' : jobType === 'HRHelperMultiDbReset' ? 'Reset Multi-DB' : jobType === 'HRHelperDeleteEmployee' ? 'Xóa Employee' : jobType) || 'Restore').replace(/</g, '&lt;');
                            var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : (jobType === 'HRHelperUpdateUser' || jobType === 'HRHelperUpdateUserSignature') ? 'ba-notif-type-hr-user' : (jobType === 'HRHelperUpdateEmployee') ? 'ba-notif-type-hr-employee' : (jobType === 'HRHelperUpdateOther') ? 'ba-notif-type-hr-other' : (jobType === 'HRHelperMultiDbAnalyze') ? 'ba-notif-type-hr-analyze' : (jobType === 'HRHelperMultiDbReset') ? 'ba-notif-type-hr-analyze' : (jobType === 'HRHelperDeleteEmployee') ? 'ba-notif-type-hr-employee' : '';
                            var startedByUid = (j.startedByUserId != null) ? parseInt(j.startedByUserId, 10) : 0;
                            var cancellableTypes = ['Restore','Backup','HRHelperUpdateUser','HRHelperUpdateUserSignature','HRHelperUpdateEmployee','HRHelperUpdateOther','HRHelperMultiDbAnalyze','HRHelperMultiDbReset','HRHelperDeleteEmployee'];
                            var canCancel = (st === 'Running') && (cancellableTypes.indexOf(jobType) >= 0) && currentUserId && (startedByUid === currentUserId || isSuperAdmin);
                            var serverPct = (j.percentComplete != null && j.percentComplete !== '') ? Number(j.percentComplete) : (j.PercentComplete != null && j.PercentComplete !== '') ? Number(j.PercentComplete) : 0;
                            var startTimeStr = formatNotifTime(j.startTime);
                            var endTimeStr = formatNotifTime(j.completedAt);
                            var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + (j.type || 'Restore') + '"><button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + typeLabel + '</span> ' + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div>' + BaNotif.wrapMetaWithBadge((j.startedByUserName || '').replace(/</g, '&lt;') + ' · Bắt đầu: ' + startTimeStr + (endTimeStr !== '—' ? ' · Kết thúc: ' + endTimeStr : ''), st);
                            if (st === 'Running' || st === 'Pending') {
                                var pct = Math.min(100, Math.max(0, serverPct));
                                var msgPhase = (j.message || '').toString().trim();
                                var progressLabel = (jobType === 'Restore' && msgPhase) ? (pct + '% - ' + BaNotif.restorePhaseDisplay(msgPhase)) : (jobType === 'HRHelperMultiDbAnalyze') ? (pct + '% - Phân tích') : (jobType === 'HRHelperMultiDbReset') ? (pct + '% - Reset') : (jobType === 'HRHelperDeleteEmployee') ? (pct + '% - Xóa employee') : (pct + '%');
                                row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt);height:6px;border-radius:3px;overflow:hidden;"><div class="ba-notif-progress-bar" style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span class="ba-notif-progress-pct">' + progressLabel + '</span></div>';
                                row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                                if (canCancel) row += ' <button type="button" class="ba-notif-cancel-btn" data-job-id="' + (j.id || '') + '" title="Hủy job đang chạy">Hủy</button>';
                            }
                            else if (st === 'Failed') { row += BaNotif.failedBadgeRow() + '<div class="ba-notif-msg ba-notif-msg-error">' + msgShort.replace(/</g, '&lt;') + '</div>'; row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>'; }
                            else if (st === 'Completed') { row += BaNotif.completedBadgeRow(); if (msgShort) row += '<div class="ba-notif-msg" style="margin-top:2px;">' + msgShort.replace(/</g, '&lt;') + '</div>'; row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>'; }
                            if (st !== 'Running' && st !== 'Pending' && st !== 'Failed' && st !== 'Completed') row += '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                            row += '</div>';
                            html += row;
                        });
                        if (newBugs.length > 0) html += '</div></div>';
                        else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                        $list.html(html);
                        $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function(e) { var g = $(this).data('group'); var $body = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); var $arrow = $(this).find('.ba-notif-group-arrow'); if ($body.is(':visible')) { $body.slideUp(200); $arrow.text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $body.slideDown(200); $arrow.text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                        $list.off('click.baNotif').on('click.baNotif', '.ba-notif-detail-link[data-action="detail"]', function(e) { e.preventDefault(); var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); var job = window.__notifJobsList && window.__notifJobsList[idx]; if (!job) return; var jid = job.id || 0; if (jid) { $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobResult") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jid }), success: function(res) { var d = res.d || res; if (d && d.success) { if (d.message != null) job.message = d.message; if (d.payload != null) job.payload = d.payload; } showNotificationDetail(job); }, error: function() { showNotificationDetail(job); } }); } else { showNotificationDetail(job); } });
                        $list.off('click.baNotifDismiss').on('click.baNotifDismiss', '.ba-notif-dismiss', function(e) { e.preventDefault(); e.stopPropagation(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($item.data('job-id'), 10); var jobType = $item.data('job-type') || 'Restore'; if (jobId) { addDismissedJobId(jobId, jobType); var $listEl = $('#restoreJobsList'), $badgeEl = $('#restoreJobsBadge'); var newCount = Math.max(0, $listEl.find('.ba-notif-item').length - 1); if (newCount > 0) { $badgeEl.text(newCount).addClass('visible'); } else { $badgeEl.removeClass('visible'); } $.ajax({ url: dismissJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobId }) }); $item.slideUp(200, function() { $(this).remove(); var $listEl = $('#restoreJobsList'); var left = $listEl.find('.ba-notif-item').length; var $badgeEl = $('#restoreJobsBadge'); if (left > 0) { $badgeEl.text(left).addClass('visible'); var bugsCount = $listEl.find('.ba-notif-group-body[data-group="bugs"] .ba-notif-item').length; var jobsCount = $listEl.find('.ba-notif-group-body[data-group="jobs"] .ba-notif-item').length; $listEl.find('.ba-notif-group-toggle[data-group="bugs"]').html(function(i, h) { return (h || '').replace(/(🐛 )?Bugs mới \(\d+\)/, '🐛 Bugs mới (' + bugsCount + ')'); }); $listEl.find('.ba-notif-group-toggle[data-group="jobs"]').html(function(i, h) { return (h || '').replace(/Thông báo job \(\d+\)/, 'Thông báo job (' + jobsCount + ')'); }); } else { $badgeEl.removeClass('visible'); $listEl.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } }); } });
                        $list.off('click.baNotifCancel').on('click.baNotifCancel', '.ba-notif-cancel-btn', function(e) { e.preventDefault(); var $btn = $(this), jobId = parseInt($btn.data('job-id'), 10); if (!jobId) return; var $item = $btn.closest('.ba-notif-item'), idx = parseInt($item.data('notif-index'), 10), job = (window.__notifJobsList && window.__notifJobsList[idx]) || {}; var serverName = (job.serverName || '').trim(), dbName = (job.databaseName || '').trim(), jobType = (job.type || job.typeLabel || 'Restore').toString(); var jobDesc = (serverName || dbName) ? (serverName + ' → ' + dbName) : ('Job #' + jobId); var msg = 'Bạn có chắc muốn hủy job:\n' + jobDesc + '\nLoại: ' + jobType + '\n\nHành động không thể hoàn tác.'; if (typeof baConfirm === 'function') baConfirm(msg, function() { $btn.prop('disabled', true); $.ajax({ url: cancelJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobId }), success: function(r) { var d = r.d || r; if (d && d.success) { if (typeof loadRestoreJobsPanel === 'function') loadRestoreJobsPanel(); } else { $btn.prop('disabled', false); showToast((d && d.message) ? d.message : 'Không thể hủy.', 'error'); } }, error: function() { $btn.prop('disabled', false); showToast('Lỗi kết nối.', 'error'); } }); }, null, 'Đồng ý', 'Thoát'); });
                        if (restoreProgressTimer) { clearInterval(restoreProgressTimer); restoreProgressTimer = null; }
                        if (hasRunningJobs && !document.hidden && $('#restoreJobsPanel').is(':visible') && !restoreProgressTimer) {
                            if (restoreJobsPanelTimer) { clearInterval(restoreJobsPanelTimer); restoreJobsPanelTimer = null; }
                            restoreProgressTimer = setInterval(loadRestoreJobsPanel, 2000);
                        }
                        else if (hasRunningJobs && !document.hidden && !$('#restoreJobsPanel').is(':visible') && !restoreJobsPanelTimer) {
                            restoreJobsPanelTimer = setInterval(function() {
                                $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) {
                                    var d = res.d || res; if (!d || !d.jobs) return;
                                    var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); });
                                    var hasRunning = jobs.some(function(j) { return j.status === 'Running'; });
                                    var total = jobs.length + (d.newBugs || []).length;
                                    if (total > 0) { $('#restoreJobsBadge').text(total).addClass('visible'); } else { $('#restoreJobsBadge').removeClass('visible'); }
                                    if (!hasRunning && restoreJobsPanelTimer) { clearInterval(restoreJobsPanelTimer); restoreJobsPanelTimer = null; }
                                } });
                            }, 5000);
                        }
                        if (!hasRunningJobs && restoreJobsPanelTimer) { clearInterval(restoreJobsPanelTimer); restoreJobsPanelTimer = null; }
                    }
                });
            }
            window.loadRestoreJobsPanel = loadRestoreJobsPanel;
            $(function() {
                if ($('#restoreJobsBellWrap').length) {
                    $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isJobDismissed(j); }); var newBugs = d.newBugs || []; var total = jobs.length + newBugs.length; if (total > 0) $('#restoreJobsBadge').text(total).addClass('visible'); } } });
                    $('#restoreJobsBellBtn').on('click', function(e) {
                        e.stopPropagation();
                        var $p = $('#restoreJobsPanel');
                        if ($p.is(':visible')) {
                            $p.hide();
                            if (restoreProgressTimer) { clearInterval(restoreProgressTimer); restoreProgressTimer = null; }
                            loadRestoreJobsPanel();
                        } else {
                            loadRestoreJobsPanel();
                            $p.show();
                        }
                    });
                    $(document).on('click', function() { $('#restoreJobsPanel').hide(); if (restoreProgressTimer) { clearInterval(restoreProgressTimer); restoreProgressTimer = null; } loadRestoreJobsPanel(); });
                    $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
                    if (typeof BA_SignalR !== 'undefined') { BA_SignalR.onJobsUpdated(function() { loadRestoreJobsPanel(); }); }
                }
            });
        })();
    </script>
    <script>
        (function() {
            function initInfoIcons() {
                document.querySelectorAll('.ba-info-icon').forEach(function(icon) {
                    icon.removeEventListener('click', onInfoClick);
                    icon.addEventListener('click', onInfoClick);
                });
                document.removeEventListener('click', closeAllPopovers);
                document.addEventListener('click', closeAllPopovers);
            }
            function onInfoClick(e) {
                e.stopPropagation();
                var wrap = e.target.closest('.ba-info-wrap');
                if (!wrap) return;
                var pop = wrap.querySelector('.ba-info-popover');
                if (!pop) return;
                var isShow = pop.classList.toggle('show');
                pop.style.display = isShow ? 'block' : 'none';
            }
            function closeAllPopovers() {
                document.querySelectorAll('.ba-info-popover.show').forEach(function(pop) {
                    pop.classList.remove('show');
                    pop.style.display = 'none';
                });
            }
            document.querySelectorAll('.ba-info-popover').forEach(function(pop) {
                pop.addEventListener('click', function(e) { e.stopPropagation(); });
            });
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initInfoIcons);
            } else {
                initInfoIcons();
            }
        })();
    </script>
</body>
</html>
