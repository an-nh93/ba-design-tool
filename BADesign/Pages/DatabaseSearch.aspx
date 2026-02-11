<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DatabaseSearch.aspx.cs"
    Inherits="BADesign.Pages.DatabaseSearch" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Database Search - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/jquery.signalR.min.js"></script>
    <script src="../Scripts/ba-signalr.js"></script>
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
        .ba-container { display: flex; min-height: 100vh; overflow: hidden; }
        .ba-sidebar {
            width: 240px;
            flex-shrink: 0;
            background: var(--bg-darker);
            border-right: 1px solid var(--border);
            padding: 1.5rem 0;
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 1000;
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            transition: width 0.25s ease;
        }
        .ba-sidebar.collapsed { width: 64px; padding: 1rem 0; }
        .ba-sidebar.collapsed .ba-sidebar-header { padding: 0 0.75rem 1rem; }
        .ba-sidebar.collapsed .ba-sidebar-title { display: none; }
        .ba-sidebar.collapsed .ba-nav-item { padding: 0.75rem; text-align: center; font-size: 0; }
        .ba-sidebar.collapsed .ba-nav-item span { display: none; }
        .ba-sidebar.collapsed .ba-nav-item::before { content: attr(data-icon); font-size: 1.25rem; }
        .ba-sidebar-toggle { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; font-size: 1rem; }
        .ba-sidebar-toggle:hover { color: var(--text-primary); }
        .ba-sidebar.collapsed .ba-sidebar-toggle { transform: rotate(180deg); }
        .ba-sidebar-header {
            padding: 0 1.5rem 1.5rem;
            border-bottom: 1px solid var(--border);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        }
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-nav-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--primary-soft); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main {
            flex: 1;
            margin-left: 240px;
            min-height: 100vh;
            transition: margin-left 0.25s ease;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .ba-sidebar.collapsed ~ .ba-main { margin-left: 64px; }
        .ba-top-bar {
            position: fixed;
            top: 0;
            left: 240px;
            right: 0;
            z-index: 100;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        .ba-sidebar.collapsed ~ .ba-main .ba-top-bar { left: 64px; }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
        .ba-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0.5rem; margin-top: 57px; }
        .ba-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .ba-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .ba-form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .ba-form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); }
        .ba-input {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            width: 100%;
        }
        .ba-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-soft); }
        .ba-input::placeholder { color: var(--text-muted); }
        .ba-btn {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-secondary:hover { background: var(--bg-card); }
        .ba-btn-danger { background: var(--danger); color: white; }
        .ba-btn-danger:hover { background: #dc2626; }
        .ba-btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
        .ba-table-wrap {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: auto;
            margin-bottom: 1rem;
            max-height: min(55vh, 520px);
        }
        .ba-table { width: 100%; border-collapse: collapse; }
        .ba-table thead { background: var(--bg-darker); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 2; }
        .ba-table th {
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .ba-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.875rem;
            color: var(--text-primary);
        }
        .ba-table tbody tr:hover { background: var(--bg-hover); }
        .ba-table tbody tr:last-child td { border-bottom: none; }
        .ba-copy-btn {
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.35rem 0.5rem;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            title: "Copy connection string";
        }
        .ba-copy-btn:hover { background: var(--primary-soft); color: var(--primary-light); border-color: var(--primary); }
        .ba-copy-btn svg { width: 16px; height: 16px; }
        .ba-empty { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; }
        .ba-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .ba-badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .ba-badge-ok { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .ba-badge-fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10002;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            pointer-events: none;
        }
        .toast {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.75rem 1rem;
            min-width: 260px;
            max-width: 360px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s, transform 0.3s;
        }
        .toast.show { opacity: 1; transform: translateX(0); }
        .toast.success .toast-icon { color: var(--success); }
        .toast.error .toast-icon { color: var(--danger); }
        .toast.info .toast-icon { color: var(--primary); }
        .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ba-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        .ba-card-title-wrap { display: flex; align-items: center; gap: 0.5rem; }
        .ba-toggle-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.25rem;
            font-size: 1rem;
            line-height: 1;
            transition: color 0.2s;
        }
        .ba-toggle-btn:hover { color: var(--primary-light); }
        .ba-search-wrap { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .ba-search-inp { min-width: 180px; }
        .ba-pagination {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.75rem;
            flex-wrap: wrap;
        }
        .ba-pagination span { color: var(--text-muted); font-size: 0.875rem; }
        .ba-pagination button {
            padding: 0.35rem 0.6rem;
            font-size: 0.8125rem;
            border-radius: 4px;
            border: 1px solid var(--border);
            background: var(--bg-darker);
            color: var(--text-primary);
            cursor: pointer;
        }
        .ba-pagination button:hover:not(:disabled) { background: var(--bg-hover); }
        .ba-pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .ba-pagination .ba-pager-size { min-width: 80px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; }
        .ba-status-ok { color: var(--success); }
        .ba-status-fail { color: var(--danger); }
        .ba-status-none { color: var(--text-muted); }
        .ba-btn-log { margin-left: 4px; }
        .ba-section-collapsed .ba-card-body { display: none; }
        .ba-modal {
            position: fixed;
            inset: 0;
            z-index: 10001;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            padding: 1.5rem;
            box-sizing: border-box;
        }
        .ba-modal.show { display: flex; }
        .ba-modal-content {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            max-width: 480px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .ba-modal-header {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ba-modal-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-modal-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.25rem;
            cursor: pointer;
            padding: 0.25rem;
            line-height: 1;
        }
        .ba-modal-close:hover { color: var(--text-primary); }
        .ba-modal-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
        .ba-modal-footer {
            padding: 1rem 1.25rem;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
        }
        .ba-log-pre {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1rem;
            font-size: 0.8125rem;
            font-family: Consolas, monospace;
            color: var(--text-secondary);
            max-height: 280px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .ba-modal .ba-form-group { margin-bottom: 1rem; }
        .ba-modal .ba-form-group:last-child { margin-bottom: 0; }
        /* Restore Explorer tree (left pane) */
        .rex-tree-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 6px;
            font-size: 0.8125rem;
            cursor: pointer;
            border-radius: 4px;
        }
        .rex-tree-item:hover { background: var(--surface-hover, rgba(0,0,0,0.06)); }
        .rex-tree-item.rex-tree-selected { background: var(--surface-hover, rgba(0,0,0,0.08)); font-weight: 500; }
        .rex-tree-expand {
            width: 16px;
            flex-shrink: 0;
            color: var(--text-muted);
            font-size: 0.65rem;
        }
        .rex-tree-expand:hover { color: var(--text-primary); }
        .rex-tree-expand.loading { opacity: 0.6; }
        .rex-tree-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #restoreExplorerTable td:nth-child(2),
        #restoreExplorerTable td:nth-child(3),
        #restoreExplorerTable td:nth-child(4) { white-space: nowrap; }
        #restoreJobsBellBtn { opacity: 1 !important; background: var(--bg-card) !important; color: var(--text-primary) !important; border: 1px solid var(--border) !important; }
        #restoreJobsBellBtn:hover { background: var(--bg-hover) !important; }
        .ba-notif-badge {
            display: none;
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 18px;
            height: 18px;
            padding: 0 4px;
            border-radius: 9px;
            background: #eb0b52;
            color: #fff;
            font-size: 0.7rem;
            font-weight: 600;
            line-height: 18px;
            text-align: center;
            box-sizing: border-box;
        }
        .ba-notif-badge.visible { display: inline-flex !important; align-items: center; justify-content: center; }
        .ba-notif-panel {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 4px;
            width: 380px;
            max-height: 420px;
            overflow: hidden;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            z-index: 1001;
        }
        .ba-notif-panel .ba-notif-panel-title {
            padding: 10px 12px;
            border-bottom: 1px solid var(--border);
            font-weight: 600;
            background: var(--bg-card);
            color: var(--text-primary);
        }
        .ba-notif-list {
            padding: 6px;
            overflow-y: auto;
            max-height: 380px;
            background: var(--bg-card);
        }
        .ba-notif-item {
            padding: 10px 12px;
            border-bottom: 1px solid var(--border-color);
            font-size: 0.8125rem;
            background: var(--bg-card);
            max-height: 120px;
            overflow: hidden;
        }
        .ba-notif-item:last-child { border-bottom: none; }
        .ba-notif-item .ba-notif-msg {
            margin-top: 4px;
            color: var(--danger);
            font-size: 0.75rem;
            line-height: 1.35;
            max-height: 2.7em;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        .ba-notif-item .ba-notif-detail-link {
            margin-top: 4px;
            font-size: 0.75rem;
            color: var(--primary);
            cursor: pointer;
            text-decoration: none;
        }
        .ba-notif-item .ba-notif-detail-link:hover { text-decoration: underline; }
        .ba-notif-item { position: relative; padding-right: 28px; }
        .ba-notif-item .ba-notif-dismiss {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 20px;
            height: 20px;
            padding: 0;
            border: none;
            background: transparent;
            color: var(--text-muted);
            font-size: 1rem;
            line-height: 1;
            cursor: pointer;
            border-radius: 4px;
        }
        .ba-notif-item .ba-notif-dismiss:hover { color: var(--text-primary); background: var(--surface-hover, rgba(0,0,0,0.06)); }
        /* Modal chi tiết thông báo */
        #notificationDetailModal { position: fixed; inset: 0; z-index: 10002; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
        #notificationDetailModal.show { display: flex; }
        #notificationDetailModal .ba-modal-content { max-width: 520px; width: 96%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
        #notificationDetailModal .ba-notif-detail-body { overflow-y: auto; padding: 1rem; font-size: 0.875rem; }
        #notificationDetailModal .ba-notif-detail-body table { width: 100%; border-collapse: collapse; }
        #notificationDetailModal .ba-notif-detail-body th { text-align: left; padding: 6px 10px; color: var(--text-muted); font-weight: 500; width: 120px; }
        #notificationDetailModal .ba-notif-detail-body td { padding: 6px 10px; border-bottom: 1px solid var(--border-color); }
        #notificationDetailModal .ba-notif-detail-body .ba-notif-full-msg { margin-top: 10px; padding: 10px; background: var(--surface-alt); border-radius: 6px; font-size: 0.8125rem; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; }
        /* Multi-DB loading overlay */
        .ba-multidb-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10003;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1.5rem;
        }
        .ba-multidb-overlay.show { display: flex; }
        .ba-multidb-overlay-content {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            min-width: 360px;
            text-align: center;
        }
        .ba-multidb-overlay-title { font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem; }
        .ba-multidb-overlay-text { font-size: 0.9375rem; color: var(--text-muted); margin-bottom: 1.25rem; }
        .ba-multidb-spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: multidb-spin 0.8s linear infinite; margin: 0 auto 1rem; }
        @keyframes multidb-spin { to { transform: rotate(360deg); } }
        /* Popup lấy log: cố định kích thước, không giật; đủ chỗ cho progress bar */
        .ba-loadlog-overlay-content {
            width: 420px !important;
            min-width: 420px !important;
            max-width: 420px !important;
            height: 220px !important;
            min-height: 220px !important;
            max-height: 220px !important;
            box-sizing: border-box;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .ba-loadlog-overlay-content .loadlog-text {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            word-break: break-word;
            overflow-wrap: break-word;
            min-height: 2.5em;
            flex-shrink: 0;
        }
        .ba-loadlog-overlay-content .loadlog-progress-wrap {
            flex-shrink: 0;
            margin-top: 0.5rem;
        }
        #restoreModalFileBrowser .restore-folder-item:hover,
        #restoreModalFileBrowser .restore-file-item:hover {
            background: var(--surface-hover, rgba(255,255,255,0.06)) !important;
        }
        #restoreModalFileBrowser .restore-breadcrumb-item {
            cursor: pointer;
        }
        #restoreModalFileBrowser .restore-breadcrumb-item:hover {
            text-decoration: underline;
        }
        .restore-nav-item.active { background: var(--surface-hover, rgba(255,255,255,0.08)); color: var(--primary); }
        .restore-nav-item:hover { background: var(--surface-hover, rgba(255,255,255,0.06)); }
        #restoreModalBackupSets table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        #restoreModalBackupSets th, #restoreModalBackupSets td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border-color); }
        #restoreModalBackupSets th { color: var(--text-muted); font-weight: 500; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <aside class="ba-sidebar" id="baSidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">UI Builder</div>
                    <button type="button" class="ba-sidebar-toggle" id="baSidebarToggle" title="Thu nhỏ menu">◀</button>
                </div>
                <asp:HyperLink ID="lnkHome" runat="server" CssClass="ba-nav-item" NavigateUrl="~/HomeRole" data-icon="🏠" title="Về trang chủ">
                    <span>← Về trang chủ</span>
                </asp:HyperLink>
                <div class="ba-nav-item active" data-icon="🔍" title="Database Search"><span>🔍 Database Search</span></div>
            </aside>
            <main class="ba-main">
                <div class="ba-top-bar" style="display: flex; align-items: center; justify-content: space-between;">
                    <h1 class="ba-top-bar-title">Database Search</h1>
                    <% if (CanBackup || CanRestore) { %>
                    <div id="restoreJobsBellWrap" style="position: relative;">
                        <button type="button" id="restoreJobsBellBtn" class="ba-btn ba-btn-secondary" style="padding: 6px 10px; min-width: auto; opacity: 1; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary);" title="Tiến trình restore">🔔</button>
                        <span id="restoreJobsBadge" class="ba-notif-badge">0</span>
                        <div id="restoreJobsPanel" class="ba-notif-panel">
                            <div class="ba-notif-panel-title">Thông báo</div>
                            <div id="restoreJobsList" class="ba-notif-list"></div>
                        </div>
                    </div>
                    <% } %>
                </div>
                <div class="ba-content">
                    <!-- Connection String (Guest + Logged-in) -->
                    <div class="ba-card" id="cardConnStr">
                        <div class="ba-card-header">
                            <h2 class="ba-card-title">Kết nối bằng Connection String</h2>
                        </div>
                        <div class="ba-card-body">
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Dán connection string vào ô bên dưới rồi bấm Connect để mở HR Helper.</p>
                            <div class="ba-form-group" style="margin-bottom: 1rem;">
                                <input type="text" id="txtConnStr" class="ba-input" placeholder="Data Source=...;Initial Catalog=...;User ID=...;Password=..." style="width:100%; font-family: Consolas, monospace; font-size: 0.8125rem;" />
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnConnStrConnect" onclick="connectByConnStr(); return false;">Connect</button>
                        </div>
                    </div>
                    <!-- Server config (chỉ khi đăng nhập + có quyền DatabaseSearch) -->
                    <div class="ba-card" id="cardServers">
                        <div class="ba-card-header">
                            <div class="ba-card-title-wrap">
                                <button type="button" class="ba-toggle-btn" id="toggleServers" title="Thu gọn / Mở rộng">▼</button>
                                <h2 class="ba-card-title">Cấu hình Server</h2>
                            </div>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <div class="ba-search-wrap">
                                    <input type="text" id="searchServers" class="ba-input ba-search-inp" placeholder="Tìm server..." />
                                </div>
                                <span id="addServerWrap"><button type="button" class="ba-btn ba-btn-primary" onclick="showAddServerModal(); return false;">+ Thêm server</button></span>
                            </div>
                        </div>
                        <div class="ba-card-body">
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Thêm server để quét. Có thể quét tất cả hoặc chọn 1 server rồi bấm &quot;Quét&quot; để load database.</p>
                            <p style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 0.75rem;">Quét tất cả server: bấm nút bên dưới để quét và load danh sách database từ tất cả server đã cấu hình.</p>
                            <div style="margin-bottom: 1rem;">
                                <button type="button" class="ba-btn ba-btn-primary" id="btnLoadDb" onclick="loadDatabases(); return false;">
                                    <span class="btn-text">Quét & load danh sách Database</span>
                                </button>
                            </div>
                            <div class="ba-table-wrap">
                                <table class="ba-table">
                                    <thead>
                                        <tr>
                                            <th>Server</th>
                                            <th>Port</th>
                                            <th>User</th>
                                            <th>Status</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblServers">
                                        <tr><td colspan="5" class="ba-empty">Chưa có server. Thêm server ở trên.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="ba-pagination" id="pagerServers"></div>
                        </div>
                    </div>
                    <!-- Results -->
                    <div class="ba-card" id="cardDatabases">
                        <div class="ba-card-header">
                            <div class="ba-card-title-wrap">
                                <button type="button" class="ba-toggle-btn" id="toggleDatabases" title="Thu gọn / Mở rộng">▼</button>
                                <h2 class="ba-card-title" id="dbListTitle">Danh sách Database</h2>
                            </div>
                            <div class="ba-search-wrap">
                                <input type="text" id="searchDatabases" class="ba-input ba-search-inp" placeholder="Tìm database hoặc server..." />
                            </div>
                        </div>
                        <div class="ba-card-body">
                            <p id="dbListDesc" style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Kết quả sau khi quét. Bấm Connect để mở HR Helper (connection string không hiển thị/copy để bảo mật).</p>
                            <div style="margin-bottom: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                                <% if (CanBackup) { %><button type="button" class="ba-btn ba-btn-primary ba-btn-sm" onclick="showBackupModal(); return false;" title="Backup database (chọn server + database)">Backup database</button><% } %>
                                <% if (CanRestore) { %><button type="button" class="ba-btn ba-btn-primary ba-btn-sm" onclick="showRestoreModalStandalone(); return false;" title="Restore từ file backup lên server (database mới hoặc ghi đè)">Restore database</button><% } %>
                                <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" id="btnLoadLogAll" onclick="loadLogInfoAll(); return false;" title="Lấy dung lượng log cho tất cả database trong danh sách">Lấy thông tin log (tất cả)</button>
                            </div>
                            <div class="ba-table-wrap">
                                <table class="ba-table">
                                    <thead>
                                        <tr>
                                            <th>Server</th>
                                            <th>Database</th>
                                            <th>User</th>
                                            <th>Dung lượng log</th>
                                            <th>Restore / Reset</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblResults">
                                        <tr><td colspan="6" class="ba-empty">Chưa quét. Bấm &quot;Quét & load danh sách Database&quot; hoặc &quot;Quét&quot; trên từng server.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="ba-pagination" id="pagerDatabases"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <div id="toastContainer" class="toast-container"></div>

        <!-- Add/Edit Server Modal -->
        <div id="serverModal" class="ba-modal">
            <div class="ba-modal-content">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="serverModalTitle">Thêm server</h3>
                    <button type="button" class="ba-modal-close" onclick="hideServerModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <input type="hidden" id="serverModalId" />
                    <div class="ba-form-group">
                        <label class="ba-form-label">Server *</label>
                        <input type="text" id="serverModalServerName" class="ba-input" placeholder="vd: localhost hoặc 192.168.1.10" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Port</label>
                        <input type="number" id="serverModalPort" class="ba-input" placeholder="1433 (để trống = mặc định)" min="1" max="65535" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Username *</label>
                        <input type="text" id="serverModalUsername" class="ba-input" placeholder="vd: sa" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Password *</label>
                        <input type="password" id="serverModalPassword" class="ba-input" placeholder="Mật khẩu (để trống nếu sửa và không đổi)" />
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Đường dẫn backup (tùy chọn)</label>
                        <input type="text" id="serverModalBackupPath" class="ba-input" placeholder="vd: E:\Backup hoặc \\server\share. Để trống = dùng mặc định Web.config" />
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Path trên <strong>máy SQL Server</strong> (vd: E:\...\Backup). Ứng dụng liệt kê file qua SQL Server (giống SQL Studio), chỉ cần SA; nếu cần bật xp_cmdshell trên SQL.</span>
                    </div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideServerModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" onclick="saveServer(); return false;">Lưu</button>
                </div>
            </div>
        </div>

        <!-- Scan Log Modal -->
        <div id="scanLogModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 560px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Log quét database</h3>
                    <button type="button" class="ba-modal-close" id="scanLogClose" style="display:none;">×</button>
                </div>
                <div class="ba-modal-body">
                    <pre id="scanLogPre" class="ba-log-pre">Đang quét...</pre>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-primary" id="scanLogDone" style="display:none;" onclick="closeScanLog(); return false;">Đóng</button>
                </div>
            </div>
        </div>

        <!-- Error detail modal (log lỗi từng server) -->
        <div id="errorDetailModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 520px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Chi tiết lỗi</h3>
                    <button type="button" class="ba-modal-close" onclick="closeErrorDetail(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <pre id="errorDetailPre" class="ba-log-pre"></pre>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-primary" onclick="closeErrorDetail(); return false;">Đóng</button>
                </div>
            </div>
        </div>

        <!-- Multi-DB Loading Overlay -->
        <div id="multiDbOverlay" class="ba-multidb-overlay">
            <div class="ba-multidb-overlay-content">
                <div class="ba-multidb-spinner"></div>
                <div class="ba-multidb-overlay-title">Đang quét database trên server</div>
                <div class="ba-multidb-overlay-text">Đang lấy danh sách database có ST_ProjectInfo...<br />Vui lòng chờ, không click nhiều lần.</div>
            </div>
        </div>

        <!-- Shrink log progress overlay -->
        <div id="shrinkLogOverlay" class="ba-multidb-overlay">
            <div class="ba-multidb-overlay-content">
                <div class="ba-multidb-spinner"></div>
                <div class="ba-multidb-overlay-title">Đang shrink log</div>
                <div class="ba-multidb-overlay-text">Vui lòng chờ, không đóng trang.<br />Với log lớn (vài GB trở lên) có thể mất 5–15 phút hoặc hơn.</div>
            </div>
        </div>

        <!-- Lấy thông tin log (tất cả) - overlay che màn hình -->
        <div id="loadLogOverlay" class="ba-multidb-overlay">
            <div class="ba-multidb-overlay-content ba-loadlog-overlay-content">
                <div class="ba-multidb-spinner"></div>
                <div class="ba-multidb-overlay-title">Đang lấy thông tin log</div>
                <div id="loadLogOverlayText" class="ba-multidb-overlay-text loadlog-text" style="margin-bottom: 0.5rem;">Đang lấy log...</div>
                <div class="loadlog-progress-wrap" style="background: var(--bg-darker); border-radius: 6px; height: 10px; overflow: hidden;">
                    <div id="loadLogOverlayBar" style="height: 100%; background: var(--primary); width: 0%; transition: width 0.2s ease;"></div>
                </div>
            </div>
        </div>

        <!-- Shrink log modal -->
        <div id="shrinkLogModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 440px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Shrink log</h3>
                    <button type="button" class="ba-modal-close" onclick="hideShrinkLogModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <p id="shrinkLogDbInfo" style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;"></p>
                    <p id="shrinkLogDetail" style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 1rem;"></p>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Target dung lượng log (MB)</label>
                        <input type="number" id="shrinkLogTargetMb" class="ba-input" value="200" min="1" max="102400" />
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.8125rem;">Sẽ đổi sang SIMPLE (nếu đang FULL), shrink file log, rồi đổi lại FULL. Chỉ thu hồi phần trống, không ảnh hưởng data.</p>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideShrinkLogModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="shrinkLogConfirm" onclick="doShrinkLog(); return false;">Shrink log</button>
                </div>
            </div>
        </div>

        <!-- Backup database modal (giống SQL Studio: chọn server + database) -->
        <div id="backupModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 480px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Backup database</h3>
                    <button type="button" class="ba-modal-close" onclick="hideBackupModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <div class="ba-form-group">
                        <label class="ba-form-label">Server (đích backup)</label>
                        <select id="backupModalServer" class="ba-input" style="min-height: 36px;"></select>
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Database</label>
                        <select id="backupModalDatabase" class="ba-input" style="min-height: 36px;"></select>
                        <span id="backupModalNoDb" style="display:none; color: var(--text-muted); font-size: 0.8125rem;">Quét server trước để thấy danh sách database.</span>
                    </div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideBackupModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="backupModalConfirm" onclick="doBackupFromModal(); return false;">Backup</button>
                </div>
            </div>
        </div>

        <!-- Restore database modal (giống SQL Studio: General + Options, backup sets, progress) -->
        <div id="restoreModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 860px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Restore database</h3>
                    <button type="button" class="ba-modal-close" onclick="hideRestoreModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body" style="display: flex; gap: 16px; min-height: 420px;">
                    <div id="restoreModalNav" style="flex-shrink: 0; width: 140px; border-right: 1px solid var(--border-color); padding-right: 12px;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">Select a page</div>
                        <div id="restoreNavGeneral" class="restore-nav-item active" data-page="general" style="padding: 6px 8px; cursor: pointer; border-radius: 4px;">General</div>
                        <div id="restoreNavOptions" class="restore-nav-item" data-page="options" style="padding: 6px 8px; cursor: pointer; border-radius: 4px;">Options</div>
                    </div>
                    <div id="restoreModalPages" style="flex: 1; overflow: hidden;">
                        <div id="restorePageGeneral" class="restore-page">
                            <div class="ba-form-group">
                                <label class="ba-form-label">Server (restore lên server này)</label>
                                <select id="restoreModalServer" class="ba-input" style="min-height: 36px;"></select>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">To database</label>
                                <input type="text" id="restoreModalToDatabase" class="ba-input" placeholder="Tên database mới hoặc có sẵn để ghi đè" />
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Từ file backup (.bak)</label>
                                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                    <span id="restoreModalSelectedFile" style="flex:1;min-width:120px;font-size:0.875rem;color:var(--text-muted);">Chưa chọn file</span>
                                    <button type="button" class="ba-btn ba-btn-primary" id="restoreModalBrowseBtn" onclick="openRestoreFileExplorer(); return false;">Chọn file backup...</button>
                                </div>
                                <input type="hidden" id="restoreModalFileValue" value="" />
                                <span id="restoreModalNoFiles" style="display:none; color: var(--text-muted); font-size: 0.8125rem; margin-top: 4px;" class="ba-block">Chọn server trước.</span>
                            </div>
                            <!-- Popup Explorer: trái = cây thư mục, phải = breadcrumb + nút Back + danh sách file -->
                            <div id="restoreFileExplorerModal" class="ba-modal">
                                <div class="ba-modal-content" style="max-width: 1180px; width: 96%; max-height: 85vh; display: flex; flex-direction: column;">
                                    <div class="ba-modal-header" style="flex-shrink:0;">
                                        <h3 class="ba-modal-title">Chọn file backup (.bak)</h3>
                                        <button type="button" class="ba-modal-close" onclick="closeRestoreFileExplorer(); return false;">×</button>
                                    </div>
                                    <div style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                                        <input type="text" id="restoreExplorerSearch" class="ba-input" placeholder="Tìm theo tên (vd: EMI01)" style="width: 200px;" />
                                        <button type="button" class="ba-btn ba-btn-primary ba-btn-sm" onclick="restoreExplorerSearchRun(); return false;">Tìm</button>
                                        <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" onclick="restoreExplorerBrowseRoot(); return false;">Về thư mục gốc</button>
                                    </div>
                                    <div style="flex: 1; display: flex; overflow: hidden; min-height: 300px;">
                                        <div id="restoreExplorerTreeWrap" style="width: 240px; border-right: 1px solid var(--border-color); overflow-y: auto; padding: 8px; flex-shrink: 0; background: var(--surface-alt);">
                                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">Thư mục</div>
                                            <div id="restoreExplorerTree"></div>
                                        </div>
                                        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;">
                                            <div style="padding: 6px 10px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                                <button type="button" id="restoreExplorerUpBtn" class="ba-btn ba-btn-secondary" style="padding: 4px 10px; min-width: 36px;" title="Lên folder cha">↑</button>
                                                <div id="restoreExplorerBreadcrumb" style="font-size: 0.8125rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">BACKUP</div>
                                            </div>
                                            <div style="flex: 1; overflow: auto;">
                                                <table class="ba-table" id="restoreExplorerTable" style="margin: 0;">
                                                    <thead>
                                                        <tr>
                                                            <th style="cursor:pointer;" data-sort="name">Name</th>
                                                            <th style="cursor:pointer;white-space:nowrap;min-width:130px;" data-sort="date">Date modified</th>
                                                            <th style="cursor:pointer;white-space:nowrap;min-width:100px;" data-sort="type">Type</th>
                                                            <th style="cursor:pointer;text-align:right;white-space:nowrap;min-width:90px;" data-sort="size">Size</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="restoreExplorerTbody"></tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="padding: 6px 12px; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0;">Click folder để mở · Click file .bak để chọn</div>
                                </div>
                            </div>
                            <div class="ba-form-group" id="restoreModalBackupSetsWrap" style="display: none;">
                                <label class="ba-form-label">Select the backup sets to restore</label>
                                <div id="restoreModalBackupSets" style="border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface-alt); max-height: 160px; overflow: auto;"></div>
                            </div>
                        </div>
                        <div id="restorePageOptions" class="restore-page" style="display: none;">
                            <div class="ba-form-group">
                                <label class="ba-form-label">Recovery state</label>
                                <select id="restoreModalRecovery" class="ba-input" style="min-height: 36px;">
                                    <option value="RECOVERY">RECOVERY — Database sẵn sàng dùng</option>
                                    <option value="NORECOVERY">NORECOVERY — Restore thêm (log, diff) sau</option>
                                    <option value="STANDBY">STANDBY — Chỉ đọc tạm</option>
                                </select>
                            </div>
                            <div class="ba-form-group">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" id="restoreModalReplace" />
                                    <span>WITH REPLACE — Ghi đè database có sẵn</span>
                                </label>
                            </div>
                            <div class="ba-form-group">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" id="restoreModalShrinkLog" />
                                    <span>Shrink log sau khi restore — Thu nhỏ file log (nếu backup không shrink trước đó)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="restoreModalProgressWrap" style="display: none; padding: 0 24px 12px; border-top: 1px solid var(--border-color);">
                    <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 6px;">Tiến độ restore</div>
                    <div style="background: var(--surface-alt); border-radius: 6px; height: 24px; overflow: hidden;">
                        <div id="restoreModalProgressBar" style="height: 100%; width: 0%; background: var(--primary); transition: width 0.3s;"></div>
                    </div>
                    <div id="restoreModalProgressPct" style="font-size: 0.8125rem; margin-top: 4px;">0%</div>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideRestoreModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="restoreModalConfirm" onclick="doRestoreDatabase(); return false;">Restore</button>
                </div>
            </div>
        </div>

        <!-- Modal chi tiết thông báo (Restore / mở rộng sau) -->
        <div id="notificationDetailModal" class="ba-modal">
            <div class="ba-modal-content">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Chi tiết thông báo</h3>
                    <button type="button" class="ba-modal-close" id="notificationDetailClose" title="Đóng">×</button>
                </div>
                <div id="notificationDetailBody" class="ba-notif-detail-body"></div>
            </div>
        </div>

        <!-- Confirm modal (giống Designer Home) -->
        <div id="confirmModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 440px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="confirmModalTitle">Xác nhận</h3>
                    <button type="button" class="ba-modal-close" onclick="hideConfirmModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <p id="confirmModalMessage" style="margin: 0; color: var(--text-primary); font-size: 0.9375rem; line-height: 1.6; white-space: pre-line;"></p>
                </div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-secondary" id="confirmModalCancel">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="confirmModalOk">OK</button>
                </div>
            </div>
        </div>
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
        var isGuest = <%= IsGuest ? "true" : "false" %>;
        var canUseServers = <%= CanUseServers ? "true" : "false" %>;
        var canManageServers = <%= CanManageServers ? "true" : "false" %>;
        var canBulkReset = <%= CanBulkReset ? "true" : "false" %>;
        var servers = [];
        var results = [];
        var serverStatuses = {};
        var canBackup = <%= (CanBackup ? "true" : "false") %>;
        var canRestore = <%= (CanRestore ? "true" : "false") %>;
        var PAGE_SIZE_OPTS = [50, 100, 500, 1000, 5000, 10000];
        var serverPageSize = 100;
        var dbPageSize = 100;
        var serverPage = 1;
        var dbPage = 1;

        function showToast(msg, type) {
            type = type || 'info';
            var icons = { success: '✓', error: '✕', info: 'ℹ' };
            var titles = { success: 'Thành công', error: 'Lỗi', info: 'Thông báo' };
            var $t = $('<div class="toast ' + type + '"><span class="toast-icon">' + (icons[type] || 'ℹ') + '</span> ' + (titles[type] || '') + ': ' + msg + '</div>');
            $('#toastContainer').append($t);
            $t[0].offsetHeight;
            setTimeout(function() { $t.addClass('show'); }, 10);
            setTimeout(function() { $t.removeClass('show'); setTimeout(function() { $t.remove(); }, 300); }, 4000);
        }

        function filteredServers() {
            var q = ($('#searchServers').val() || '').toLowerCase().trim();
            if (!q) return servers;
            return servers.filter(function(s) {
                var sn = (s.serverName || '').toLowerCase();
                var un = (s.username || '').toLowerCase();
                var pt = (s.port != null ? String(s.port) : '');
                return sn.indexOf(q) >= 0 || un.indexOf(q) >= 0 || pt.indexOf(q) >= 0;
            });
        }

        function filteredResults() {
            var q = ($('#searchDatabases').val() || '').toLowerCase().trim();
            if (!q) return results;
            return results.filter(function(r) {
                var s = (r.server || '').toLowerCase();
                var d = (r.database || '').toLowerCase();
                var u = (r.username || '').toLowerCase();
                return s.indexOf(q) >= 0 || d.indexOf(q) >= 0 || u.indexOf(q) >= 0;
            });
        }

        function renderServers() {
            var $tb = $('#tblServers');
            var $pg = $('#pagerServers');
            var list = filteredServers();
            if (!list.length) {
                $tb.html('<tr><td colspan="5" class="ba-empty">' + (canManageServers ? 'Chưa có server. Thêm server ở trên.' : 'Chưa có server.') + '</td></tr>');
                $pg.empty();
                return;
            }
            var total = list.length;
            var pages = Math.max(1, Math.ceil(total / serverPageSize));
            serverPage = Math.max(1, Math.min(serverPage, pages));
            var from = (serverPage - 1) * serverPageSize;
            var chunk = list.slice(from, from + serverPageSize);
            var html = '';
            chunk.forEach(function(s) {
                var st = serverStatuses[s.id];
                var statusCell;
                if (st === undefined) {
                    statusCell = '<span class="ba-status-none" title="Chưa quét">—</span>';
                } else if (st.ok) {
                    statusCell = '<span class="ba-status-ok" title="OK: ' + st.dbCount + ' database">✓</span>';
                } else if (st.pending) {
                    statusCell = '<span class="ba-status-none" title="Đang chờ quét">...</span>';
                } else {
                    statusCell = '<span class="ba-status-fail" title="Lỗi">✕</span> ' +
                        '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-btn-log" data-id="' + s.id + '" title="Xem log lỗi">Log</button>';
                }
                var actions = '<button type="button" class="ba-btn ba-btn-primary ba-btn-sm" onclick="scanServer(' + s.id + '); return false;">Quét</button>';
                if (canBulkReset) actions += ' <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-multidb-btn" onclick="connectMultiDb(' + s.id + '); return false;" title="Connect Multi-DB Reset">Multi-DB</button>';
                if (canManageServers) {
                    actions = '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" onclick="editServer(' + s.id + '); return false;">Sửa</button> ' + actions + ' ' +
                        '<button type="button" class="ba-btn ba-btn-danger ba-btn-sm" onclick="deleteServer(' + s.id + '); return false;">Xóa</button>';
                }
                html += '<tr data-id="' + s.id + '">' +
                    '<td>' + (s.serverName || '-') + '</td>' +
                    '<td>' + (s.port != null ? s.port : '-') + '</td>' +
                    '<td>' + (s.username || '-') + '</td>' +
                    '<td>' + statusCell + '</td>' +
                    '<td><div class="ba-actions">' + actions + '</div></td></tr>';
            });
            $tb.html(html);
            $tb.find('.ba-btn-log').on('click', function() {
                var id = parseInt($(this).data('id'), 10);
                showErrorDetail(id);
            });
            var selOpts = PAGE_SIZE_OPTS.map(function(n) { return '<option value="' + n + '"' + (n === serverPageSize ? ' selected' : '') + '>' + n + '</option>'; }).join('');
            var pagerHtml = '<span>Trang ' + serverPage + ' / ' + pages + ' (' + total + ' server)</span> ' +
                '<select class="ba-pager-size" id="selServerPageSize" style="width:auto;padding:0.25rem 0.5rem;margin:0 0.5rem;">' + selOpts + '</select> ' +
                '<button type="button" onclick="setServerPage(' + (serverPage - 1) + '); return false;" ' + (serverPage <= 1 ? 'disabled' : '') + '>Trước</button> ' +
                '<button type="button" onclick="setServerPage(' + (serverPage + 1) + '); return false;" ' + (serverPage >= pages ? 'disabled' : '') + '>Sau</button>';
            $pg.html(pagerHtml);
            $('#selServerPageSize').off('change').on('change', function() { serverPageSize = parseInt($(this).val(), 10); serverPage = 1; renderServers(); });
        }

        function setServerPage(p) {
            serverPage = p;
            renderServers();
        }

        function setDbPage(p) {
            dbPage = p;
            renderResults();
        }

        function showAddServerModal() {
            $('#serverModalTitle').text('Thêm server');
            $('#serverModalId').val('');
            $('#serverModalServerName').val('').prop('readonly', false);
            $('#serverModalPort').val('');
            $('#serverModalUsername').val('');
            $('#serverModalPassword').val('').attr('placeholder', 'Mật khẩu');
            $('#serverModalBackupPath').val('');
            $('#serverModal').addClass('show');
        }

        function editServer(id) {
            var s = servers.filter(function(x) { return x.id === id; })[0];
            if (!s) return;
            $('#serverModalTitle').text('Sửa server');
            $('#serverModalId').val(s.id);
            $('#serverModalServerName').val(s.serverName || '').prop('readonly', true);
            $('#serverModalPort').val(s.port != null ? s.port : '');
            $('#serverModalUsername').val(s.username || '');
            $('#serverModalPassword').val('').attr('placeholder', 'Để trống nếu không đổi');
            $('#serverModalBackupPath').val(s.backupPath || '');
            $('#serverModal').addClass('show');
        }

        function hideServerModal() {
            $('#serverModal').removeClass('show');
        }

        function saveServer() {
            var id = $('#serverModalId').val();
            var isEdit = id && id !== '';
            var serverName = $('#serverModalServerName').val().trim();
            var portVal = $('#serverModalPort').val().trim();
            var port = portVal ? parseInt(portVal, 10) : null;
            var username = $('#serverModalUsername').val().trim();
            var password = $('#serverModalPassword').val();
            var backupPath = ($('#serverModalBackupPath').val() || '').trim();

            if (!serverName || !username) {
                showToast('Server và Username không được trống.', 'error');
                return;
            }
            if (!isEdit && !password) {
                showToast('Password không được trống khi thêm mới.', 'error');
                return;
            }

            var url = isEdit 
                ? '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/UpdateServer") %>'
                : '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/SaveServer") %>';
            var payload = isEdit
                ? { id: parseInt(id, 10), serverName: serverName, port: port, username: username, password: password || '', backupPath: backupPath || '' }
                : { serverName: serverName, port: port, username: username, password: password, backupPath: backupPath || '' };

            $.ajax({
                url: url,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify(payload),
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        showToast(isEdit ? 'Đã cập nhật server.' : 'Đã thêm server.', 'success');
                        hideServerModal();
                        fetchServers();
                    } else {
                        showToast(d && d.message ? d.message : (isEdit ? 'Lỗi cập nhật.' : 'Lỗi thêm server.'), 'error');
                    }
                },
                error: function(xhr, status, err) {
                    var msg = isEdit ? 'Lỗi cập nhật.' : 'Lỗi thêm server.';
                    if (xhr.responseText) {
                        try {
                            var json = JSON.parse(xhr.responseText);
                            if (json.d && json.d.message) msg = json.d.message;
                            else if (json.message) msg = json.message;
                        } catch(e) {
                            if (xhr.responseText.indexOf('Authentication') >= 0 || xhr.responseText.indexOf('Session') >= 0) {
                                msg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                                setTimeout(function() { window.location.href = '<%= ResolveUrl("~/Login") %>'; }, 2000);
                            }
                        }
                    }
                    showToast(msg, 'error');
                }
            });
        }

        function deleteServer(id) {
            showConfirmModal('Xác nhận', 'Xóa server này?', function() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DeleteServer") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({ id: id }),
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            showToast('Đã xóa server.', 'success');
                            fetchServers();
                        } else {
                            showToast(d && d.message ? d.message : 'Lỗi xóa server.', 'error');
                        }
                    },
                    error: function(xhr, status, err) {
                        var msg = 'Lỗi xóa server.';
                        if (xhr.responseText) {
                            try {
                                var json = JSON.parse(xhr.responseText);
                                if (json.d && json.d.message) msg = json.d.message;
                                else if (json.message) msg = json.message;
                            } catch(e) {
                                if (xhr.responseText.indexOf('Authentication') >= 0 || xhr.responseText.indexOf('Session') >= 0) {
                                    msg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                                    setTimeout(function() { window.location.href = '<%= ResolveUrl("~/Login") %>'; }, 2000);
                                }
                            }
                        }
                        showToast(msg, 'error');
                    }
                });
            });
        }

        function fetchServers() {
            var getServersUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetServers") %>';
            var loadStateUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/LoadScanState") %>';
            var p1 = $.ajax({
                url: getServersUrl,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}'
            }).then(function(res) {
                var d = res.d || res;
                servers = (d && d.list) ? d.list : [];
                return servers;
            }, function(xhr) {
                servers = [];
                if (xhr && (xhr.status === 401 || (xhr.responseText && xhr.responseText.indexOf('Authentication') >= 0)))
                    showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                return null;
            });
            var p2 = $.ajax({
                url: loadStateUrl,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: '{}'
            }).then(function(res) {
                var d = res.d || res;
                return (d && d.state) ? d.state : null;
            }, function() { return null; });
            $.when(p1, p2).always(function() {
                var stateJson = (arguments.length >= 2 && arguments[1] !== undefined && arguments[1] != null) ? arguments[1] : null;
                if (stateJson) {
                    try {
                        var s = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;
                        results = s.list || [];
                        serverStatuses = {};
                        (s.serverStatuses || []).forEach(function(st) {
                            serverStatuses[st.id] = { ok: !!st.ok, message: st.message || '', dbCount: st.dbCount || 0 };
                        });
                        updateDbListLabel(s.mode || 'default', s.serverDisplay || '');
                    } catch (e) { results = []; serverStatuses = {}; updateDbListLabel('default'); }
                }
                renderServers();
                renderResults();
            });
        }

        function saveScanState(mode, serverId, serverDisplay, list, statusMap) {
            var arr = [];
            for (var k in statusMap) {
                if (!statusMap.hasOwnProperty(k)) continue;
                var st = statusMap[k];
                arr.push({ id: parseInt(k, 10), ok: !!st.ok, message: st.message || '', dbCount: st.dbCount || 0 });
            }
            var state = { mode: mode, serverId: serverId, serverDisplay: serverDisplay || null, list: list || [], serverStatuses: arr };
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/SaveScanState") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ stateJson: JSON.stringify(state) }),
                error: function() {}
            });
        }

        var SCAN_POOL_SIZE = 5;
        var scanLogPreEl = null;

        function showScanLog(initialText) {
            var txt = initialText != null ? initialText : 'Đang quét...';
            $('#scanLogPre').text(txt);
            $('#scanLogClose').hide();
            $('#scanLogDone').hide();
            $('#scanLogModal').addClass('show');
            scanLogPreEl = document.getElementById('scanLogPre');
        }

        function appendScanLog(lines) {
            if (!scanLogPreEl) scanLogPreEl = document.getElementById('scanLogPre');
            if (!scanLogPreEl || !lines || !lines.length) return;
            var chunk = lines.join('\n') + '\n';
            var cur = scanLogPreEl.textContent || '';
            scanLogPreEl.textContent = cur + chunk;
            scanLogPreEl.scrollTop = scanLogPreEl.scrollHeight;
        }

        function closeScanLog() {
            $('#scanLogModal').removeClass('show');
        }

        function showErrorDetail(serverId) {
            var st = serverStatuses[serverId];
            var msg = (st && st.message) ? st.message : 'Không có thông tin lỗi.';
            var sn = (servers.filter(function(x) { return x.id === serverId; })[0] || {}).serverName || '';
            $('#errorDetailPre').text((sn ? 'Server: ' + sn + '\n\n' : '') + msg);
            $('#errorDetailModal').addClass('show');
        }

        function closeErrorDetail() {
            $('#errorDetailModal').removeClass('show');
        }

        function showConfirmModal(title, message, onConfirm, onCancel) {
            $('#confirmModalTitle').text(title || 'Xác nhận');
            $('#confirmModalMessage').text(message);
            $('#confirmModal').addClass('show').css('display', 'flex');
            $('#confirmModalCancel').show();
            $('#confirmModalOk').text('OK');
            $('#confirmModalOk').off('click');
            $('#confirmModalCancel').off('click');
            $('#confirmModalOk').on('click', function() {
                hideConfirmModal();
                if (onConfirm) onConfirm();
            });
            $('#confirmModalCancel').on('click', function() {
                hideConfirmModal();
                if (onCancel) onCancel();
            });
        }

        function hideConfirmModal() {
            $('#confirmModal').removeClass('show').css('display', 'none');
        }

        function updateDbListLabel(mode, serverName) {
            var $t = $('#dbListTitle');
            var $d = $('#dbListDesc');
            if (!$t.length) return;
            if (mode === 'all') {
                $t.text('Danh sách Database - All Server');
                if ($d.length) $d.text('Kết quả quét tất cả server. Bấm Connect để mở HR Helper.');
            } else if (mode === 'single' && serverName) {
                $t.text('Danh sách database của ' + serverName);
                if ($d.length) $d.text('Kết quả quét ' + serverName + '. Bấm Connect để mở HR Helper.');
            } else {
                $t.text('Danh sách Database');
                if ($d.length) $d.text('Kết quả sau khi quét. Bấm Connect để mở HR Helper.');
            }
        }

        function runScan(serverId) {
            var $btn = $('#btnLoadDb');
            var $text = $btn.find('.btn-text');
            $btn.prop('disabled', true);

            if (serverId != null) {
                var s = servers.filter(function(x) { return x.id === serverId; })[0];
                var serverDisplay = (s && s.serverName) ? s.serverName + (s.port != null && String(s.port) !== '' ? ',' + s.port : '') : ('ID ' + serverId);
                var initialMsg = 'Đang quét server: ' + serverDisplay + '\n\n' +
                    'Đang kết nối và liệt kê database, kiểm tra ST_ProjectInfo.\n' +
                    'Có thể mất 1–2 phút nếu server có nhiều database.';
                showScanLog(initialMsg);
                $text.html('<span class="spinner"></span> Đang quét...');
                var heartbeatInterval = setInterval(function() {
                    if (!scanLogPreEl) scanLogPreEl = document.getElementById('scanLogPre');
                    if (scanLogPreEl) {
                        var cur = scanLogPreEl.textContent || '';
                        if (cur.indexOf('Hoàn thành') < 0 && cur.indexOf('Lỗi:') < 0)
                            scanLogPreEl.textContent = cur + '.';
                    }
                }, 2000);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/LoadDatabases") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({ serverId: serverId }),
                    timeout: 120000,
                    success: function(res) {
                        clearInterval(heartbeatInterval);
                        var d = res.d || res;
                        $btn.prop('disabled', false);
                        $text.text('Quét & load danh sách Database');
                        if (d && d.success) {
                            results = d.list || [];
                            updateDbListLabel('single', serverDisplay);
                            var logLines = d.log || [];
                            $('#scanLogPre').text(logLines.length ? logLines.join('\n') : 'Hoàn thành.');
                            $('#scanLogClose, #scanLogDone').show();
                            if (d.serverStatuses && d.serverStatuses.length) {
                                for (var i = 0; i < d.serverStatuses.length; i++) {
                                    var st = d.serverStatuses[i];
                                    serverStatuses[st.id] = { ok: st.ok, message: st.message || '', dbCount: st.dbCount || 0 };
                                }
                            }
                            saveScanState('single', serverId, serverDisplay, results, serverStatuses);
                            renderServers();
                            renderResults();
                            showToast('Đã load ' + results.length + ' database.', 'success');
                        } else {
                            $('#scanLogPre').text('Lỗi: ' + (d && d.message ? d.message : 'Không xác định'));
                            $('#scanLogClose, #scanLogDone').show();
                            showToast(d && d.message ? d.message : 'Lỗi khi quét.', 'error');
                        }
                    },
                    error: function(xhr, status, err) {
                        clearInterval(heartbeatInterval);
                        $btn.prop('disabled', false);
                        $text.text('Quét & load danh sách Database');
                        var msg = 'Lỗi kết nối hoặc timeout.';
                        if (xhr.responseText) {
                            try {
                                var json = JSON.parse(xhr.responseText);
                                if (json.d && json.d.message) msg = json.d.message;
                                else if (json.message) msg = json.message;
                            } catch(e) {
                                if (xhr.responseText.indexOf('Authentication') >= 0 || xhr.responseText.indexOf('Session') >= 0) {
                                    msg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                                    setTimeout(function() { window.location.href = '<%= ResolveUrl("~/Login") %>'; }, 2000);
                                }
                            }
                        }
                        $('#scanLogPre').text('Lỗi: ' + msg);
                        $('#scanLogClose, #scanLogDone').show();
                        showToast(msg, 'error');
                    }
                });
                return;
            }

            var list = servers;
            if (!list.length) {
                showScanLog('Chưa có server. Thêm server rồi thử lại.');
                $btn.prop('disabled', false);
                $('#scanLogClose, #scanLogDone').show();
                showToast('Chưa có server để quét.', 'error');
                return;
            }

            $text.html('<span class="spinner"></span> Đang quét...');
            var poolSize = Math.min(SCAN_POOL_SIZE, list.length);
            showScanLog('Đang quét ' + list.length + ' server.\n\nKhi mỗi server xong sẽ hiện dòng tương ứng bên dưới.\n');
            scanLogPreEl = document.getElementById('scanLogPre');
            if (scanLogPreEl) scanLogPreEl.scrollTop = scanLogPreEl.scrollHeight;

            results = [];
            var idx;
            for (idx = 0; idx < list.length; idx++) {
                serverStatuses[list[idx].id] = { ok: false, message: 'Đang chờ...', dbCount: 0, pending: true };
            }
            renderServers();

            var queue = list.map(function(s) { return s.id; });
            var inFlight = 0;
            var doneCount = 0;

            function onOneDone(id, success, d, errMsg) {
                var s = list.filter(function(x) { return x.id === id; })[0];
                var displayName = (s && s.serverName) ? s.serverName + (s.port != null ? ',' + s.port : '') : ('ID ' + id);
                if (success && d && d.success) {
                    var logLines = d.log || [];
                    appendScanLog(logLines);
                    if (d.list && d.list.length) {
                        results = results.concat(d.list);
                    }
                    if (d.serverStatuses && d.serverStatuses.length) {
                        for (var i = 0; i < d.serverStatuses.length; i++) {
                            var st = d.serverStatuses[i];
                            serverStatuses[st.id] = { ok: st.ok, message: st.message || '', dbCount: st.dbCount || 0 };
                        }
                    }
                } else {
                    var msg = errMsg || (d && d.message) || 'Lỗi không xác định';
                    appendScanLog(['Đang kết nối ' + displayName + '...', '  Lỗi: ' + msg]);
                    serverStatuses[id] = { ok: false, message: msg, dbCount: 0 };
                }
                doneCount++;
                renderServers();
                renderResults();
                inFlight--;
                runNext();
            }

            function runNext() {
                while (queue.length > 0 && inFlight < poolSize) {
                    var id = queue.shift();
                    inFlight++;
                    (function(pid) {
                        var sv = list.filter(function(x) { return x.id === pid; })[0];
                        var disp = (sv && sv.serverName) ? sv.serverName + (sv.port != null ? ',' + sv.port : '') : ('ID ' + pid);
                        appendScanLog(['  → Đang quét ' + disp + '...']);
                        $.ajax({
                            url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/LoadDatabases") %>',
                            type: 'POST',
                            contentType: 'application/json; charset=utf-8',
                            dataType: 'json',
                            data: JSON.stringify({ serverId: pid }),
                            timeout: 120000,
                            success: function(res) {
                                var d = (res && res.d) ? res.d : res;
                                onOneDone(pid, true, d, null);
                            },
                            error: function(xhr, status, err) {
                                var msg = 'Lỗi kết nối hoặc timeout.';
                                if (xhr.responseText) {
                                    try {
                                        var json = JSON.parse(xhr.responseText);
                                        if (json.d && json.d.message) msg = json.d.message;
                                        else if (json.message) msg = json.message;
                                    } catch(e) {
                                        if (xhr.responseText.indexOf('Authentication') >= 0 || xhr.responseText.indexOf('Session') >= 0) {
                                            msg = 'Phiên đăng nhập đã hết hạn.';
                                            setTimeout(function() { window.location.href = '<%= ResolveUrl("~/Login") %>'; }, 2000);
                                        }
                                    }
                                }
                                onOneDone(pid, false, null, msg);
                            }
                        });
                    })(id);
                }
                if (queue.length === 0 && inFlight === 0) {
                    appendScanLog(['Hoàn thành.']);
                    $btn.prop('disabled', false);
                    $text.text('Quét & load danh sách Database');
                    updateDbListLabel('all');
                    saveScanState('all', null, null, results, serverStatuses);
                    $('#scanLogClose, #scanLogDone').show();
                    if (scanLogPreEl) scanLogPreEl.scrollTop = scanLogPreEl.scrollHeight;
                    showToast('Đã load ' + results.length + ' database.', 'success');
                }
            }

            runNext();
        }

        function loadDatabases() { runScan(null); }
        function scanServer(id) { runScan(id); }

        var restoreModalServerId = null;
        var restoreModalDatabaseName = null;

        function backupDatabase(serverId, databaseName, $btn) {
            if (!$btn) $btn = $('<button/>');
            $btn.prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/BackupDatabase") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, databaseName: databaseName || '' }),
                timeout: 600000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        showToast((d.message || 'Đã backup.') + (d.fileName ? ' File: ' + d.fileName : ''), 'success');
                    } else {
                        showToast((d && d.message) ? d.message : 'Lỗi backup.', 'error');
                    }
                    $btn.prop('disabled', false);
                },
                error: function(xhr) {
                    $btn.prop('disabled', false);
                    var msg = 'Lỗi backup.';
                    try {
                        var j = JSON.parse(xhr.responseText);
                        if (j.d && j.d.message) msg = j.d.message;
                    } catch (e) {}
                    showToast(msg, 'error');
                }
            });
        }

        function fillRestoreModalServerDropdown() {
            var $sel = $('#restoreModalServer');
            $sel.empty().append('<option value="">-- Chọn server --</option>');
            servers.forEach(function(s) {
                var label = (s.serverName || '') + (s.port != null ? ',' + s.port : '');
                if (!label) label = 'ID ' + s.id;
                $sel.append('<option value="' + s.id + '">' + (label || s.id) + '</option>');
            });
        }

        function loadRestoreModalFolder(serverId, subPath) {
            var $list = $('#restoreModalFolderList');
            var $bc = $('#restoreModalBreadcrumb');
            var $sel = $('#restoreModalSelectedFile');
            var $val = $('#restoreModalFileValue');
            $list.html('<div style="padding:12px;color:var(--text-muted);">Đang tải...</div>');
            $('#restoreModalNoFiles').hide();
            if (!serverId) {
                $list.html('<div style="padding:12px;color:var(--text-muted);">Chọn server trước.</div>');
                $bc.text('');
                return;
            }
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/ListBackupFolder") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, subPath: subPath || '' }),
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        $list.empty();
                        $('#restoreModalNoFiles').text((d && d.message) ? d.message : 'Không tải được thư mục.').show();
                        $bc.text('');
                        return;
                    }
                    $('#restoreModalNoFiles').hide();
                    var path = (d.currentPath || '').trim();
                    var parts = path ? path.split('\\') : [];
                    var bcHtml = '<span class="restore-breadcrumb-item" data-path="">BACKUP</span>';
                    for (var i = 0; i < parts.length; i++) {
                        var p = parts.slice(0, i + 1).join('\\');
                        bcHtml += ' <span style="color:var(--text-muted);">›</span> <span class="restore-breadcrumb-item" data-path="' + escapeAttr(p) + '">' + escapeHtml(parts[i]) + '</span>';
                    }
                    $bc.html(bcHtml);
                    var folders = (d.folders || []);
                    var files = (d.files || []);
                    var html = '';
                    folders.forEach(function(item) {
                        var name = (item && item.name !== undefined) ? item.name : item;
                        html += '<div class="restore-folder-item" data-name="' + escapeAttr(name) + '" style="padding:6px 10px;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:6px;" title="Mở thư mục">';
                        html += '<span style="opacity:0.85;">📁</span> <span>' + escapeHtml(name) + '</span></div>';
                    });
                    files.forEach(function(item) {
                        var name = (item && item.name !== undefined) ? item.name : item;
                        html += '<div class="restore-file-item" data-name="' + escapeAttr(name) + '" style="padding:6px 10px;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:6px;" title="Chọn file">';
                        html += '<span style="opacity:0.85;">📄</span> <span>' + escapeHtml(name) + '</span></div>';
                    });
                    if (!html) html = '<div style="padding:12px;color:var(--text-muted);font-size:0.875rem;">Không có thư mục con hoặc file .bak.</div>';
                    $list.html(html);
                    $('#restoreModalFileBrowser').off('click.restoreNav').on('click.restoreNav', '.restore-breadcrumb-item', function() {
                        loadRestoreModalFolder(parseInt($('#restoreModalServer').val(), 10), $(this).data('path') || '');
                    });
                    $list.off('click.restoreList').on('click.restoreList', '.restore-folder-item', function() {
                        var name = $(this).data('name');
                        var nextPath = path ? path + '\\' + name : name;
                        loadRestoreModalFolder(parseInt($('#restoreModalServer').val(), 10), nextPath);
                    });
                    $list.on('click.restoreList', '.restore-file-item', function() {
                        var name = $(this).data('name');
                        var fileValue = path ? path + '\\' + name : name;
                        $val.val(fileValue);
                        $sel.text('Đã chọn: ' + fileValue).css('color', 'var(--text-primary)');
                        $list.find('.restore-file-item').css('background', '');
                        $(this).css('background', 'var(--border-color)');
                        loadRestoreModalBackupSets(parseInt($('#restoreModalServer').val(), 10), fileValue);
                    });
                },
                error: function(xhr, status, err) {
                    $list.html('<div style="padding:12px;color:var(--danger);">Lỗi tải.</div>');
                    $('#restoreModalNoFiles').text((xhr.responseJSON && xhr.responseJSON.d && xhr.responseJSON.d.message) ? xhr.responseJSON.d.message : (err || 'Lỗi tải.')).show();
                    $bc.text('');
                }
            });
            function escapeAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
            function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        }

        var restoreModalBackupSetsData = [];
        function loadRestoreModalBackupSets(serverId, backupFilePath) {
            var $wrap = $('#restoreModalBackupSetsWrap');
            var $table = $('#restoreModalBackupSets');
            $wrap.hide();
            $table.empty();
            restoreModalBackupSetsData = [];
            if (!serverId || !backupFilePath) return;
            $table.html('<div style="padding:12px;color:var(--text-muted);">Đang tải backup sets...</div>');
            $wrap.show();
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetBackupSets") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, backupFilePath: backupFilePath }),
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        $table.html('<div style="padding:12px;color:var(--danger);">' + (d && d.message ? d.message : 'Không tải được.') + '</div>');
                        return;
                    }
                    var sets = (d.sets || []);
                    restoreModalBackupSetsData = sets;
                    var html = '<table><thead><tr><th><input type="checkbox" id="restoreSetsSelectAll" title="Chọn tất cả" /></th><th>Name</th><th>Type</th><th>Database</th><th>Position</th><th>First LSN</th></tr></thead><tbody>';
                    sets.forEach(function(s, idx) {
                        html += '<tr><td><input type="checkbox" class="restore-set-cb" data-position="' + (s.position || 0) + '" /></td>';
                        html += '<td>' + (s.name || '').replace(/</g,'&lt;') + '</td><td>' + (s.typeName || '').replace(/</g,'&lt;') + '</td><td>' + (s.databaseName || '').replace(/</g,'&lt;') + '</td>';
                        html += '<td>' + (s.position || '') + '</td><td style="font-size:0.75rem;">' + (s.firstLSN || '').replace(/</g,'&lt;') + '</td></tr>';
                    });
                    html += '</tbody></table>';
                    $table.html(html);
                    if (sets.length > 0) $table.find('.restore-set-cb').first().prop('checked', true);
                    $('#restoreSetsSelectAll').on('change', function() {
                        $table.find('.restore-set-cb').prop('checked', $(this).prop('checked'));
                    });
                },
                error: function() {
                    $table.html('<div style="padding:12px;color:var(--danger);">Lỗi tải backup sets.</div>');
                }
            });
        }

        var restoreExplorerCurrentPath = '';
        var restoreExplorerRows = [];
        var restoreExplorerSort = { key: 'name', dir: 1 };
        var restoreExplorerTreeCache = {};  // path -> [ { name } ] subfolders
        var restoreExplorerTreeExpanded = {};  // path -> true

        function formatSize(bytes) {
            if (bytes == null || bytes === undefined) return '—';
            if (bytes >= 1073741824) return (Math.round(bytes / 107374182.4) / 10) + ' GB';
            if (bytes >= 1048576) return (Math.round(bytes / 104857.6) / 10) + ' MB';
            if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
            return bytes + ' B';
        }
        function formatDate(d) {
            if (!d) return '—';
            var dt = new Date(d);
            return isNaN(dt.getTime()) ? '—' : dt.toLocaleString();
        }
        function parseDateSafe(v) {
            if (v == null || v === '') return null;
            var s = String(v).trim();
            var ms = s.match(/^\/Date\((-?\d+)\)\/$/);
            if (ms) return new Date(parseInt(ms[1], 10));
            var num = Number(v);
            if (!isNaN(num)) return new Date(num);
            var dt = new Date(s);
            return isNaN(dt.getTime()) ? null : dt;
        }

        function openRestoreFileExplorer() {
            var serverId = parseInt($('#restoreModalServer').val(), 10);
            if (!serverId) { showToast('Chọn server trước.', 'error'); return; }
            $('#restoreExplorerSearch').val('');
            restoreExplorerCurrentPath = '';
            restoreExplorerTreeCache = {};
            restoreExplorerTreeExpanded = {};
            restoreExplorerBrowseRoot();
            $('#restoreFileExplorerModal').addClass('show');
        }
        function closeRestoreFileExplorer() {
            $('#restoreFileExplorerModal').removeClass('show');
        }
        function restoreExplorerBrowseRoot() {
            restoreExplorerCurrentPath = '';
            restoreExplorerLoadFolder('');
        }

        function renderRestoreExplorerTree() {
            var serverId = parseInt($('#restoreModalServer').val(), 10);
            if (!serverId) return;
            var rootPath = '';
            var html = buildRestoreExplorerTreeNode(serverId, rootPath, 'BACKUP', 0, true);
            $('#restoreExplorerTree').html(html || '<div style="padding:4px;color:var(--text-muted);font-size:0.8125rem;">Đang tải...</div>');
            $('#restoreExplorerTree .rex-tree-expand').on('click', function(e) {
                e.stopPropagation();
                var path = $(this).closest('.rex-tree-item').data('path') || '';
                if (restoreExplorerTreeExpanded[path]) {
                    restoreExplorerTreeExpanded[path] = false;
                    renderRestoreExplorerTree();
                    return;
                }
                if (restoreExplorerTreeCache[path] !== undefined) {
                    restoreExplorerTreeExpanded[path] = true;
                    renderRestoreExplorerTree();
                    return;
                }
                $(this).addClass('loading');
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/ListBackupFolder") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({ serverId: serverId, subPath: path || '' }),
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success && d.folders) {
                            restoreExplorerTreeCache[path] = (d.folders || []).map(function(item) {
                                return { name: (item && item.name !== undefined) ? item.name : item };
                            });
                            restoreExplorerTreeExpanded[path] = true;
                        }
                        renderRestoreExplorerTree();
                    },
                    error: function() { renderRestoreExplorerTree(); }
                });
            });
            $('#restoreExplorerTree .rex-tree-label').on('click', function(e) {
                e.stopPropagation();
                var path = $(this).closest('.rex-tree-item').data('path') || '';
                restoreExplorerLoadFolder(path);
            });
            $('#restoreExplorerTree .rex-tree-item').each(function() {
                var path = $(this).data('path') || '';
                if (path === restoreExplorerCurrentPath) $(this).addClass('rex-tree-selected');
            });
        }
        function buildRestoreExplorerTreeNode(serverId, path, label, level, isRoot) {
            var expanded = !!restoreExplorerTreeExpanded[path];
            var children = restoreExplorerTreeCache[path];
            var hasChildren = children && children.length > 0;
            var indent = (level || 0) * 14;
            var esc = function(s) { return (s || '').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
            var pathAttr = esc(path);
            var labelEsc = esc(label);
            var caret = hasChildren || isRoot
                ? ('<span class="rex-tree-expand" title="' + (expanded ? 'Thu gọn' : 'Mở rộng') + '">' + (expanded ? '▼' : '▶') + '</span>')
                : '<span class="rex-tree-expand" style="visibility:hidden;">▶</span>';
            var row = '<div class="rex-tree-item" data-path="' + pathAttr + '" style="padding-left:' + indent + 'px;">' + caret + '<span class="rex-tree-label">' + labelEsc + '</span></div>';
            if (!expanded || !children || children.length === 0) return row;
            for (var i = 0; i < children.length; i++) {
                var name = children[i].name || children[i];
                var childPath = path ? path + '\\' + name : name;
                row += buildRestoreExplorerTreeNode(serverId, childPath, name, level + 1, false);
            }
            return row;
        }

        function restoreExplorerLoadFolder(subPath) {
            var serverId = parseInt($('#restoreModalServer').val(), 10);
            if (!serverId) return;
            $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;color:var(--text-muted);">Đang tải...</td></tr>');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/ListBackupFolder") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, subPath: subPath || '' }),
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;color:var(--danger);">' + (d && d.message ? d.message : 'Lỗi') + '</td></tr>');
                        return;
                    }
                    restoreExplorerCurrentPath = (d.currentPath || '').trim();
                    restoreExplorerTreeCache[restoreExplorerCurrentPath] = (d.folders || []).map(function(item) {
                        return { name: (item && item.name !== undefined) ? item.name : item };
                    });
                    restoreExplorerTreeExpanded[restoreExplorerCurrentPath] = true;
                    var parts = restoreExplorerCurrentPath ? restoreExplorerCurrentPath.split('\\') : [];
                    var bcHtml = '<span class="rex-bc" data-path="">BACKUP</span>';
                    for (var i = 0; i < parts.length; i++) {
                        var p = parts.slice(0, i + 1).join('\\');
                        bcHtml += ' <span style="color:var(--text-muted);">›</span> <span class="rex-bc" data-path="' + (p.replace(/"/g, '&quot;')) + '">' + (parts[i].replace(/</g, '&lt;')) + '</span>';
                    }
                    $('#restoreExplorerBreadcrumb').html(bcHtml);
                    $('#restoreExplorerUpBtn').toggle(restoreExplorerCurrentPath !== '');
                    restoreExplorerRows = [];
                    if (restoreExplorerCurrentPath) {
                        restoreExplorerRows.push({ type: 'parent', name: '..', relativePath: null, lastWriteTime: null, size: null });
                    }
                    (d.folders || []).forEach(function(item) {
                        var n = (item && item.name !== undefined) ? item.name : item;
                        restoreExplorerRows.push({ type: 'folder', name: n, relativePath: null, lastWriteTime: item.lastWriteTime, size: null });
                    });
                    (d.files || []).forEach(function(item) {
                        var n = (item && item.name !== undefined) ? item.name : item;
                        restoreExplorerRows.push({ type: 'file', name: n, relativePath: restoreExplorerCurrentPath, lastWriteTime: item.lastWriteTime, size: item.size });
                    });
                    renderRestoreExplorerTree();
                    restoreExplorerRenderTable();
                },
                error: function() {
                    $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;color:var(--danger);">Lỗi tải.</td></tr>');
                }
            });
        }
        function restoreExplorerSearchRun() {
            var serverId = parseInt($('#restoreModalServer').val(), 10);
            var q = ($('#restoreExplorerSearch').val() || '').trim();
            if (!serverId) return;
            $('#restoreExplorerBreadcrumb').html(q ? 'Kết quả tìm: "' + (q.replace(/</g, '&lt;')) + '"' : 'BACKUP');
            $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;color:var(--text-muted);">Đang tìm...</td></tr>');
            if (!q) { restoreExplorerBrowseRoot(); return; }
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/SearchBackupFiles") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, searchText: q }),
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;">' + (d && d.message ? d.message : 'Lỗi') + '</td></tr>');
                        return;
                    }
                    restoreExplorerRows = (d.items || []).map(function(x) {
                        return { type: 'file', name: x.name, relativePath: x.relativePath || '', lastWriteTime: x.lastWriteTime, size: x.size };
                    });
                    restoreExplorerRenderTable();
                },
                error: function() {
                    $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;">Lỗi tìm kiếm.</td></tr>');
                }
            });
        }
        function restoreExplorerRenderTable() {
            var key = restoreExplorerSort.key, dir = restoreExplorerSort.dir;
            var parentRow = restoreExplorerRows.filter(function(r) { return r.type === 'parent'; })[0];
            var rest = restoreExplorerRows.filter(function(r) { return r.type !== 'parent'; });
            var sorted = rest.slice().sort(function(a, b) {
                if (key === 'name') {
                    return dir * ((a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
                }
                if (key === 'date') {
                    var ta = a.lastWriteTime ? new Date(a.lastWriteTime).getTime() : 0;
                    var tb = b.lastWriteTime ? new Date(b.lastWriteTime).getTime() : 0;
                    return dir * (ta - tb);
                }
                if (key === 'type') {
                    return dir * ((a.type || '').localeCompare(b.type || ''));
                }
                if (key === 'size') {
                    return dir * ((a.size || 0) - (b.size || 0));
                }
                return 0;
            });
            if (parentRow) sorted.unshift(parentRow);
            var html = '';
            sorted.forEach(function(row) {
                var typeStr = row.type === 'folder' ? 'File folder' : (row.type === 'parent' ? '' : 'BAK File');
                var icon = row.type === 'parent' ? '↑ ' : (row.type === 'folder' ? '📁 ' : '📄 ');
                html += '<tr class="rex-row" data-type="' + row.type + '" data-name="' + (row.name.replace(/"/g, '&quot;')) + '" data-relpath="' + (row.relativePath || '').replace(/"/g, '&quot;') + '" style="cursor:pointer;">';
                html += '<td>' + icon + (row.name.replace(/</g, '&lt;')) + '</td>';
                html += '<td style="white-space:nowrap;">' + formatDate(row.lastWriteTime) + '</td>';
                html += '<td>' + typeStr + '</td>';
                html += '<td style="text-align:right;">' + (row.type === 'file' ? formatSize(row.size) : '—') + '</td></tr>';
            });
            if (!html) html = '<tr><td colspan="4" style="padding:16px;color:var(--text-muted);">Không có mục nào.</td></tr>';
            $('#restoreExplorerTbody').html(html);
            $('#restoreExplorerTbody .rex-row').on('click', function() {
                var typ = $(this).data('type');
                if (typ === 'parent') {
                    var parts = restoreExplorerCurrentPath.split('\\');
                    parts.pop();
                    restoreExplorerLoadFolder(parts.join('\\'));
                    return;
                }
                if (typ === 'folder') {
                    var name = $(this).data('name');
                    var next = restoreExplorerCurrentPath ? restoreExplorerCurrentPath + '\\' + name : name;
                    restoreExplorerLoadFolder(next);
                    return;
                }
                if (typ === 'file') {
                    var name = $(this).data('name');
                    var rel = $(this).data('relpath') || '';
                    var fileValue = rel ? rel + '\\' + name : name;
                    $('#restoreModalFileValue').val(fileValue);
                    $('#restoreModalSelectedFile').text('Đã chọn: ' + fileValue).css('color', 'var(--text-primary)');
                    loadRestoreModalBackupSets(parseInt($('#restoreModalServer').val(), 10), fileValue);
                    closeRestoreFileExplorer();
                }
            });
            $('#restoreExplorerBreadcrumb .rex-bc').on('click', function() {
                restoreExplorerLoadFolder($(this).data('path') || '');
            });
        }

        function showRestoreModal(serverId, databaseName, displayLabel) {
            fillRestoreModalServerDropdown();
            $('#restoreModalServer').val(serverId ? String(serverId) : '');
            $('#restoreModalToDatabase').val(databaseName || '');
            $('#restoreModalFileValue').val('');
            $('#restoreModalSelectedFile').text('Chưa chọn file').css('color', 'var(--text-muted)');
            $('#restoreModalBackupSetsWrap').hide();
            $('#restoreModalProgressWrap').hide();
            $('#restoreModal').addClass('show');
        }

        function showRestoreModalStandalone() {
            fillRestoreModalServerDropdown();
            $('#restoreModalToDatabase').val('');
            $('#restoreModalFileValue').val('');
            $('#restoreModalSelectedFile').text('Chưa chọn file').css('color', 'var(--text-muted)');
            $('#restoreModalNoFiles').hide();
            $('#restoreModalBackupSetsWrap').hide();
            $('#restoreModalProgressWrap').hide();
            $('#restoreModal').addClass('show');
        }

        function hideRestoreModal() {
            $('#restoreModal').removeClass('show');
        }

        function doRestoreDatabase() {
            var serverId = parseInt($('#restoreModalServer').val(), 10);
            var databaseName = ($('#restoreModalToDatabase').val() || '').trim();
            var fileName = ($('#restoreModalFileValue').val() || '').trim();
            if (!serverId) {
                showToast('Chọn server restore.', 'error');
                return;
            }
            if (!databaseName) {
                showToast('Nhập tên database đích (mới hoặc có sẵn).', 'error');
                return;
            }
            if (!fileName) {
                showToast('Chọn file backup.', 'error');
                return;
            }
            var positions = [];
            $('#restoreModalBackupSets .restore-set-cb:checked').each(function() {
                positions.push(parseInt($(this).data('position'), 10));
            });
            if (positions.length === 0) positions = [1];
            positions.sort(function(a,b) { return a - b; });
            var recoveryState = ($('#restoreModalRecovery').val() || 'RECOVERY').toUpperCase();
            var withReplace = $('#restoreModalReplace').prop('checked');
            var withShrinkLog = $('#restoreModalShrinkLog').prop('checked');
            $('#restoreModalConfirm').prop('disabled', true);
            $('#restoreModalProgressWrap').show();
            $('#restoreModalProgressBar').css('width', '0%');
            $('#restoreModalProgressPct').text('0%');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/StartRestore") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({
                    serverId: serverId,
                    databaseName: databaseName,
                    backupFileName: fileName,
                    positionsJson: JSON.stringify(positions),
                    recoveryState: recoveryState,
                    withReplace: withReplace,
                    withShrinkLog: withShrinkLog
                }),
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success || !d.sessionId) {
                        $('#restoreModalConfirm').prop('disabled', false);
                        $('#restoreModalProgressWrap').hide();
                        showToast((d && d.message) ? d.message : 'Không thể bắt đầu restore.', 'error');
                        return;
                    }
                    hideRestoreModal();
                    showToast('Restore đang chạy trong nền. Xem tiến độ tại biểu tượng chuông.', 'info');
                    if (typeof loadRestoreJobsPanel === 'function') loadRestoreJobsPanel();
                    var sessionId = d.sessionId;
                    var poll = function() {
                        $.ajax({
                            url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreProgress") %>',
                            type: 'POST',
                            contentType: 'application/json; charset=utf-8',
                            dataType: 'json',
                            data: JSON.stringify({ serverId: serverId, sessionId: sessionId }),
                            success: function(pr) {
                                var p = pr.d || pr;
                                var percent = (p && p.percentComplete != null) ? p.percentComplete : 0;
                                $('#restoreModalProgressBar').css('width', percent + '%');
                                $('#restoreModalProgressPct').text(percent + '%');
                                if (percent >= 100 || (p && p.completed)) {
                                    $('#restoreModalConfirm').prop('disabled', false);
                                    $('#restoreModalProgressWrap').hide();
                                    if (p && p.success === false && p.message) {
                                        showToast(p.message, 'error');
                                    } else {
                                        showToast('Đã restore xong.', 'success');
                                        hideRestoreModal();
                                    }
                                    if (typeof loadRestoreJobsPanel === 'function') loadRestoreJobsPanel();
                                    return;
                                }
                                setTimeout(poll, 1500);
                            },
                            error: function() { setTimeout(poll, 2000); }
                        });
                    };
                    setTimeout(poll, 800);
                },
                error: function(xhr) {
                    $('#restoreModalConfirm').prop('disabled', false);
                    $('#restoreModalProgressWrap').hide();
                    showToast((xhr.responseJSON && xhr.responseJSON.d && xhr.responseJSON.d.message) ? xhr.responseJSON.d.message : 'Lỗi bắt đầu restore.', 'error');
                }
            });
        }

        function fillBackupModalServerDropdown() {
            var $sel = $('#backupModalServer');
            $sel.empty().append('<option value="">-- Chọn server --</option>');
            servers.forEach(function(s) {
                var label = (s.serverName || '') + (s.port != null ? ',' + s.port : '');
                if (!label) label = 'ID ' + s.id;
                $sel.append('<option value="' + s.id + '">' + (label || s.id) + '</option>');
            });
        }

        function fillBackupModalDatabaseDropdown(serverId) {
            var $sel = $('#backupModalDatabase');
            $sel.empty();
            if (!serverId) {
                $sel.append('<option value="">Chọn server trước</option>');
                $('#backupModalNoDb').show();
                return;
            }
            var dbs = results.filter(function(r) { return r.serverId === serverId; });
            if (dbs.length === 0) {
                $sel.append('<option value="">Không có database (quét server trước)</option>');
                $('#backupModalNoDb').show();
            } else {
                dbs.forEach(function(r) {
                    $sel.append('<option value="' + (r.database || '').replace(/"/g, '&quot;') + '">' + (r.database || '') + '</option>');
                });
                $('#backupModalNoDb').hide();
            }
        }

        function showBackupModal() {
            fillBackupModalServerDropdown();
            var firstId = servers.length ? servers[0].id : null;
            $('#backupModalServer').val(firstId ? String(firstId) : '');
            fillBackupModalDatabaseDropdown(firstId);
            $('#backupModal').addClass('show');
        }

        function hideBackupModal() {
            $('#backupModal').removeClass('show');
        }

        function doBackupFromModal() {
            var serverId = parseInt($('#backupModalServer').val(), 10);
            var databaseName = ($('#backupModalDatabase').val() || '').trim();
            if (!serverId) {
                showToast('Chọn server.', 'error');
                return;
            }
            if (!databaseName) {
                showToast('Chọn database.', 'error');
                return;
            }
            var $btn = $('#backupModalConfirm');
            $btn.prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/BackupDatabase") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, databaseName: databaseName }),
                timeout: 600000,
                success: function(res) {
                    $btn.prop('disabled', false);
                    var d = res.d || res;
                    if (d && d.success) {
                        showToast((d.message || 'Đã backup.') + (d.fileName ? ' File: ' + d.fileName : ''), 'success');
                        hideBackupModal();
                    } else {
                        showToast((d && d.message) ? d.message : 'Lỗi backup.', 'error');
                    }
                },
                error: function(xhr) {
                    $btn.prop('disabled', false);
                    var msg = 'Lỗi backup.';
                    try {
                        var j = JSON.parse(xhr.responseText);
                        if (j.d && j.d.message) msg = j.d.message;
                    } catch (e) {}
                    showToast(msg, 'error');
                }
            });
        }

        var shrinkLogServerId = null;
        var shrinkLogDatabaseName = null;

        function showShrinkLogModal(serverId, databaseName, displayLabel) {
            shrinkLogServerId = serverId;
            shrinkLogDatabaseName = databaseName;
            $('#shrinkLogDbInfo').text('Database: ' + (displayLabel || serverId + ' / ' + databaseName));
            $('#shrinkLogDetail').text('Đang tải thông tin log...');
            $('#shrinkLogTargetMb').val(200);
            $('#shrinkLogModal').addClass('show');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetDatabaseLogInfoApi") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, databaseName: databaseName }),
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success) {
                        var sz = d.logSizeMb != null ? (d.logSizeMb >= 1024 ? (Math.round(d.logSizeMb / 102.4) / 10) + ' GB' : d.logSizeMb + ' MB') : '?';
                        $('#shrinkLogDetail').text('Recovery: ' + (d.recoveryModel || '?') + ', File log: ' + (d.logFileName || '?') + ', Hiện tại: ' + sz);
                    } else {
                        $('#shrinkLogDetail').text((d && d.message) ? d.message : 'Không lấy được thông tin.');
                    }
                },
                error: function() {
                    $('#shrinkLogDetail').text('Lỗi tải thông tin.');
                }
            });
        }

        function hideShrinkLogModal() {
            $('#shrinkLogModal').removeClass('show');
            shrinkLogServerId = null;
            shrinkLogDatabaseName = null;
        }

        function doShrinkLog() {
            var serverId = shrinkLogServerId;
            var databaseName = shrinkLogDatabaseName;
            var targetMb = parseInt($('#shrinkLogTargetMb').val(), 10);
            if (isNaN(targetMb) || targetMb < 1) {
                showToast('Nhập target dung lượng (MB) hợp lệ (≥ 1).', 'error');
                return;
            }
            hideShrinkLogModal();
            $('#shrinkLogOverlay').addClass('show');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/ShrinkDatabaseLog") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, databaseName: databaseName, targetSizeMb: targetMb }),
                timeout: 35 * 60 * 1000,
                success: function(res) {
                    $('#shrinkLogOverlay').removeClass('show');
                    var d = res.d || res;
                    if (d && d.success) {
                        showToast(d.message || 'Đã shrink log.', 'success');
                        var r = results.filter(function(x) { return x.serverId === serverId && (x.database || '') === (databaseName || ''); })[0];
                        if (r) { r.logSizeMb = targetMb; r.recoveryModel = r.recoveryModel || ''; }
                        renderResults();
                    } else {
                        showToast((d && d.message) ? d.message : 'Lỗi shrink log.', 'error');
                    }
                },
                error: function(xhr) {
                    $('#shrinkLogOverlay').removeClass('show');
                    var msg = 'Lỗi shrink log.';
                    try {
                        var j = JSON.parse(xhr.responseText);
                        if (j.d && j.d.message) msg = j.d.message;
                    } catch (e) {}
                    if (xhr.status === 0 || (xhr.status === 200 && xhr.responseText && xhr.responseText.indexOf('Timeout') >= 0))
                        msg = 'Hết thời gian chờ (timeout). Với log rất lớn hãy thử tăng timeout hoặc shrink trực tiếp trên SQL Server.';
                    showToast(msg, 'error');
                }
            });
        }

        function loadLogInfoAll() {
            var items = [];
            for (var i = 0; i < results.length; i++) {
                var r = results[i];
                if (r.serverId && r.database)
                    items.push({ serverId: r.serverId, databaseName: r.database, index: i });
            }
            if (items.length === 0) {
                showToast('Không có database nào trong danh sách.', 'error');
                return;
            }
            var total = items.length;
            var done = 0;
            var $btn = $('#btnLoadLogAll');
            var $overlay = $('#loadLogOverlay');
            var $text = $('#loadLogOverlayText');
            var $bar = $('#loadLogOverlayBar');
            $btn.prop('disabled', true);
            $overlay.addClass('show');
            $text.text('Đang lấy log... (0/' + total + ') 0%');
            $bar.css('width', '0%');

            function updateProgress(currentDbName) {
                var pct = total ? Math.round((done / total) * 100) : 0;
                $text.text('Đang lấy log... (' + done + '/' + total + ') ' + pct + '%' + (currentDbName ? ' — ' + currentDbName : ''));
                $bar.css('width', pct + '%');
            }

            function runNext(idx) {
                if (idx >= items.length) {
                    $text.text('Hoàn thành (' + done + '/' + total + ') 100%');
                    $bar.css('width', '100%');
                    setTimeout(function() {
                        $btn.prop('disabled', false);
                        $overlay.removeClass('show');
                        showToast('Đã lấy thông tin log cho ' + done + '/' + total + ' database.', 'success');
                    }, 400);
                    return;
                }
                var it = items[idx];
                var dbName = it.databaseName || '';
                updateProgress(dbName);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetDatabaseLogInfoApi") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({ serverId: it.serverId, databaseName: it.databaseName }),
                    timeout: 30000,
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            var r = results[it.index];
                            if (r) {
                                r.logSizeMb = d.logSizeMb;
                                r.logFileName = d.logFileName;
                                r.recoveryModel = d.recoveryModel;
                            }
                            renderResults();
                        }
                        done++;
                        updateProgress(idx + 1 < items.length ? (items[idx + 1].databaseName || '') : '');
                        runNext(idx + 1);
                    },
                    error: function(xhr) {
                        done++;
                        updateProgress(idx + 1 < items.length ? (items[idx + 1].databaseName || '') : '');
                        runNext(idx + 1);
                    }
                });
            }
            runNext(0);
        }

        function loadLogInfoOne(serverId, databaseName, $btn) {
            if (!$btn) return;
            $btn.prop('disabled', true).text('...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetDatabaseLogInfoApi") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, databaseName: databaseName || '' }),
                timeout: 30000,
                success: function(res) {
                    $btn.prop('disabled', false).text('Lấy log');
                    var d = res.d || res;
                    if (d && d.success) {
                        var r = results.filter(function(row) { return row.serverId === serverId && (row.database || '') === (databaseName || ''); })[0];
                        if (r) {
                            r.logSizeMb = d.logSizeMb;
                            r.logFileName = d.logFileName;
                            r.recoveryModel = d.recoveryModel;
                            renderResults();
                            showToast('Đã lấy thông tin log.', 'success');
                        }
                    } else {
                        showToast((d && d.message) ? d.message : 'Không lấy được.', 'error');
                    }
                },
                error: function(xhr) {
                    $btn.prop('disabled', false).text('Lấy log');
                    var msg = 'Lỗi.';
                    try {
                        var j = JSON.parse(xhr.responseText);
                        if (j.d && j.d.message) msg = j.d.message;
                    } catch (e) {}
                    showToast(msg, 'error');
                }
            });
        }

        function deleteDatabase(serverId, databaseName, displayLabel) {
            showConfirmModal('Xóa database', 'Bạn có chắc muốn XÓA database:\n' + (displayLabel || serverId + ' / ' + databaseName) + '\n\nHành động không thể hoàn tác.', function() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DeleteDatabase") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({ serverId: serverId, databaseName: databaseName || '' }),
                    timeout: 120000,
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) {
                            showToast('Đã xóa database.', 'success');
                            results = results.filter(function(r) { return !(r.serverId === serverId && (r.database || '') === (databaseName || '')); });
                            renderResults();
                        } else {
                            showToast((d && d.message) ? d.message : 'Lỗi xóa database.', 'error');
                        }
                    },
                    error: function(xhr) {
                        var msg = 'Lỗi xóa database.';
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message;
                        } catch (e) {}
                        showToast(msg, 'error');
                    }
                });
            });
        }

        function connectToDatabaseByServerAndDb(serverId, databaseName) {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/PrepareConnectByServerAndDb") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, databaseName: databaseName || '' }),
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.token) {
                        window.location.href = '<%= ResolveUrl("~/Pages/HRHelper.aspx") %>?k=' + encodeURIComponent(d.token);
                    } else {
                        showToast((d && d.message) ? d.message : 'Không thể kết nối.', 'error');
                    }
                },
                error: function(xhr) {
                    var msg = 'Lỗi kết nối.';
                    try {
                        var j = JSON.parse(xhr.responseText);
                        if (j.d && j.d.message) msg = j.d.message;
                    } catch (e) {}
                    showToast(msg, 'error');
                }
            });
        }

        function connectToDatabase(connectionString, server, database) {
            if (!connectionString) {
                showToast('Không có connection string.', 'error');
                return;
            }
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/PrepareConnect") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ connectionString: connectionString, server: server || '', database: database || '' }),
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.token) {
                        window.location.href = '<%= ResolveUrl("~/Pages/HRHelper.aspx") %>?k=' + encodeURIComponent(d.token);
                    } else {
                        showToast(d && d.message ? d.message : 'Không thể chuẩn bị kết nối.', 'error');
                    }
                },
                error: function(xhr, status, err) {
                    showToast('Lỗi: ' + (xhr.responseJSON && xhr.responseJSON.Message ? xhr.responseJSON.Message : (err || status)), 'error');
                }
            });
        }

        function connectMultiDb(serverId) {
            $('#multiDbOverlay').addClass('show');
            $('.ba-multidb-btn').prop('disabled', true);
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/PrepareConnectForMultiDb") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId }),
                timeout: 60000,
                success: function(res) {
                    $('#multiDbOverlay').removeClass('show');
                    $('.ba-multidb-btn').prop('disabled', false);
                    var d = res.d || res;
                    if (d && d.success && d.token) {
                        window.location.href = '<%= ResolveUrl("~/Pages/HRHelper.aspx") %>?k=' + encodeURIComponent(d.token) + '&mode=multi';
                    } else {
                        showToast(d && d.message ? d.message : 'Không thể chuẩn bị Multi-DB.', 'error');
                    }
                },
                error: function(xhr, status, err) {
                    $('#multiDbOverlay').removeClass('show');
                    $('.ba-multidb-btn').prop('disabled', false);
                    var msg = 'Lỗi khi chuẩn bị Multi-DB.';
                    if (xhr && xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message;
                            else if (j.message) msg = j.message;
                        } catch(e) {}
                    }
                    showToast(msg, 'error');
                }
            });
        }

        function renderResults() {
            var $tb = $('#tblResults');
            var $pg = $('#pagerDatabases');
            var list = filteredResults();
            if (!list.length) {
                $tb.html('<tr><td colspan="6" class="ba-empty">Không có database nào. Kiểm tra server đã thêm và thử lại.</td></tr>');
                $pg.empty();
                return;
            }
            var total = list.length;
            var pages = Math.max(1, Math.ceil(total / dbPageSize));
            dbPage = Math.max(1, Math.min(dbPage, pages));
            var from = (dbPage - 1) * dbPageSize;
            var chunk = list.slice(from, from + dbPageSize);
            var html = '';
            chunk.forEach(function(r, idx) {
                var globalIdx = results.indexOf(r);
                if (globalIdx < 0) globalIdx = from + idx;
                var hasServerId = !!(r.serverId && r.database);
                var actions = '';
                if (hasServerId) {
                    actions += '<button type="button" class="ba-btn ba-btn-primary ba-btn-sm ba-connect-btn" data-idx="' + globalIdx + '" title="Connect">Connect</button> ';
                    actions += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-load-log-btn" data-idx="' + globalIdx + '" title="Lấy dung lượng log">Lấy log</button> ';
                    if (canBackup) actions += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-backup-btn" data-idx="' + globalIdx + '" title="Backup">Backup</button> ';
                    if (canRestore) actions += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-restore-btn" data-idx="' + globalIdx + '" title="Restore">Restore</button> ';
                    actions += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-shrink-log-btn" data-idx="' + globalIdx + '" title="Shrink log">Shrink log</button> ';
                    actions += '<button type="button" class="ba-btn ba-btn-danger ba-btn-sm ba-delete-db-btn" data-idx="' + globalIdx + '" title="Xóa database">Xóa</button>';
                } else {
                    actions = '<span class="ba-badge ba-badge-fail">—</span>';
                }
                var restoreText = '';
                if (r.lastRestoredBy || r.lastRestoredAt) {
                    var restoredDt = parseDateSafe(r.lastRestoredAt);
                    restoreText = 'Restore: ' + (r.lastRestoredBy || '?') + ' ' + (restoredDt ? restoredDt.toLocaleString() : (r.lastRestoredAt || ''));
                }
                if (r.lastResetBy || r.lastResetAt) {
                    if (restoreText) restoreText += '<br/>';
                    var resetDt = parseDateSafe(r.lastResetAt);
                    restoreText += 'Reset: ' + (r.lastResetBy || '?') + ' ' + (resetDt ? resetDt.toLocaleString() : (r.lastResetAt || ''));
                    if (r.lastResetDataTypes) restoreText += ' (' + (r.lastResetDataTypes.length > 60 ? r.lastResetDataTypes.substring(0, 60) + '…' : r.lastResetDataTypes) + ')';
                }
                if (!restoreText) restoreText = '—';
                var logSizeText = '—';
                if (r.logSizeMb != null && r.logSizeMb !== undefined) {
                    logSizeText = (r.logSizeMb >= 1024 ? (Math.round(r.logSizeMb / 102.4) / 10) + ' GB' : r.logSizeMb + ' MB') + (r.recoveryModel ? ' (' + r.recoveryModel + ')' : '');
                }
                html += '<tr>' +
                    '<td>' + (r.server || '-') + '</td>' +
                    '<td>' + (r.database || '-') + '</td>' +
                    '<td>' + (r.username || '-') + '</td>' +
                    '<td style="font-size:0.8rem;">' + logSizeText + '</td>' +
                    '<td style="font-size:0.8rem; max-width:220px;" title="' + (r.lastResetDataTypes || '') + '">' + restoreText + '</td>' +
                    '<td><div class="ba-actions">' + actions + '</div></td></tr>';
            });
            $tb.html(html);
            $tb.find('.ba-connect-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) { showToast('Không đủ thông tin để kết nối.', 'error'); return; }
                connectToDatabaseByServerAndDb(r.serverId, r.database);
            });
            $tb.find('.ba-backup-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                backupDatabase(r.serverId, r.database, $(this));
            });
            $tb.find('.ba-restore-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                showRestoreModal(r.serverId, r.database, (r.server || '') + ' / ' + (r.database || ''));
            });
            $tb.find('.ba-delete-db-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                deleteDatabase(r.serverId, r.database, (r.server || '') + ' / ' + (r.database || ''));
            });
            $tb.find('.ba-load-log-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                loadLogInfoOne(r.serverId, r.database, $(this));
            });
            $tb.find('.ba-shrink-log-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                showShrinkLogModal(r.serverId, r.database, (r.server || '') + ' / ' + (r.database || ''));
            });
            var selOpts = PAGE_SIZE_OPTS.map(function(n) { return '<option value="' + n + '"' + (n === dbPageSize ? ' selected' : '') + '>' + n + '</option>'; }).join('');
            var pagerHtml = '<span>Trang ' + dbPage + ' / ' + pages + ' (' + total + ' database)</span> ' +
                '<select class="ba-pager-size" id="selDbPageSize" style="width:auto;padding:0.25rem 0.5rem;margin:0 0.5rem;">' + selOpts + '</select> ' +
                '<button type="button" onclick="setDbPage(' + (dbPage - 1) + '); return false;" ' + (dbPage <= 1 ? 'disabled' : '') + '>Trước</button> ' +
                '<button type="button" onclick="setDbPage(' + (dbPage + 1) + '); return false;" ' + (dbPage >= pages ? 'disabled' : '') + '>Sau</button>';
            $pg.html(pagerHtml);
            $('#selDbPageSize').off('change').on('change', function() { dbPageSize = parseInt($(this).val(), 10); dbPage = 1; renderResults(); });
        }

        function fallbackCopy(text) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed'; ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                showToast('Đã copy connection string.', 'success');
            } catch (e) { showToast('Không copy được.', 'error'); }
            document.body.removeChild(ta);
        }

        function connectByConnStr() {
            var cs = ($('#txtConnStr').val() || '').trim();
            if (!cs) {
                showToast('Nhập connection string.', 'error');
                return;
            }
            var $btn = $('#btnConnStrConnect');
            var origText = $btn.text();
            $btn.prop('disabled', true).text('Đang kết nối...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/PrepareConnect") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ connectionString: cs, server: '', database: '' }),
                timeout: 15000,
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.token) {
                        window.location.href = '<%= ResolveUrl("~/Pages/HRHelper.aspx") %>?k=' + encodeURIComponent(d.token);
                    } else {
                        $btn.prop('disabled', false).text(origText);
                        showToast(d && d.message ? d.message : 'Không thể kết nối.', 'error');
                    }
                },
                error: function(xhr, status, err) {
                    $btn.prop('disabled', false).text(origText);
                    var msg = 'Lỗi kết nối.';
                    if (xhr.responseText) {
                        try {
                            var j = JSON.parse(xhr.responseText);
                            if (j.d && j.d.message) msg = j.d.message;
                            else if (j.message) msg = j.message;
                        } catch(e) {}
                    }
                    if (status === 'timeout') msg = 'Hết thời gian chờ kết nối (timeout).';
                    showToast(msg, 'error');
                }
            });
        }

        $(function() {
            if (isGuest) {
                $('#cardServers').hide();
                $('#cardDatabases').hide();
                $('#btnLoadDb').hide();
            } else if (!canUseServers) {
                $('#cardServers').hide();
                $('#cardDatabases').hide();
                $('#btnLoadDb').hide();
            }
            if (!canManageServers) $('#addServerWrap').hide();
            var msg = (function() {
                var s = (window.location.search || '').replace(/^\?/, '');
                if (!s) return null;
                var parts = s.split('&');
                for (var i = 0; i < parts.length; i++) {
                    var p = parts[i].split('=');
                    if (p[0] === 'msg' && p[1]) return p[1];
                }
                return null;
            })();
            if (msg) {
                try { msg = decodeURIComponent(msg); } catch(e) {}
                showToast(msg, 'error');
            }
            fetchServers();
            $('#searchServers').on('input', function() { serverPage = 1; renderServers(); });
            $('#searchDatabases').on('input', function() { dbPage = 1; renderResults(); });
            $('#toggleServers').on('click', function() {
                $('#cardServers').toggleClass('ba-section-collapsed');
                $(this).text($('#cardServers').hasClass('ba-section-collapsed') ? '▶' : '▼');
            });
            $('#toggleDatabases').on('click', function() {
                $('#cardDatabases').toggleClass('ba-section-collapsed');
                $(this).text($('#cardDatabases').hasClass('ba-section-collapsed') ? '▶' : '▼');
            });
            $('#serverModal').on('click', function(e) { if (e.target === this) hideServerModal(); });
            $('#scanLogModal').on('click', function(e) { if (e.target === this) closeScanLog(); });
            $('#errorDetailModal').on('click', function(e) { if (e.target === this) closeErrorDetail(); });
            $('#confirmModal').on('click', function(e) { if (e.target === this) hideConfirmModal(); });
            $('#restoreModal').on('click', function(e) { if (e.target === this) hideRestoreModal(); });
            $('#restoreFileExplorerModal').on('click', function(e) { if (e.target === this) closeRestoreFileExplorer(); });
            $('#notificationDetailModal').on('click', function(e) { if (e.target === this) $('#notificationDetailModal').removeClass('show'); });
            $('#notificationDetailClose').on('click', function(e) { e.preventDefault(); e.stopPropagation(); $('#notificationDetailModal').removeClass('show'); });
            $('#restoreExplorerUpBtn').on('click', function() {
                if (!restoreExplorerCurrentPath) return;
                var parts = restoreExplorerCurrentPath.split('\\');
                parts.pop();
                restoreExplorerLoadFolder(parts.join('\\'));
            });
            $('#restoreExplorerTable').on('click', 'th[data-sort]', function() {
                var k = $(this).data('sort');
                if (restoreExplorerSort.key === k) restoreExplorerSort.dir = -restoreExplorerSort.dir;
                else { restoreExplorerSort.key = k; restoreExplorerSort.dir = 1; }
                if (restoreExplorerRows.length) restoreExplorerRenderTable();
            });
            $('#backupModal').on('click', function(e) { if (e.target === this) hideBackupModal(); });
            $('#restoreNavGeneral, #restoreNavOptions').on('click', function() {
                var page = $(this).data('page');
                $('#restoreModalNav .restore-nav-item').removeClass('active');
                $(this).addClass('active');
                $('#restorePageGeneral, #restorePageOptions').hide();
                if (page === 'general') $('#restorePageGeneral').show();
                else $('#restorePageOptions').show();
            });
            $('#restoreModalServer').on('change', function() {
                var sid = parseInt($(this).val(), 10);
                $('#restoreModalFileValue').val('');
                $('#restoreModalSelectedFile').text('Chưa chọn file').css('color', 'var(--text-muted)');
                $('#restoreModalBackupSetsWrap').hide();
                loadRestoreModalFolder(sid || null, '');
            });
            $('#backupModalServer').on('change', function() {
                var sid = parseInt($(this).val(), 10);
                fillBackupModalDatabaseDropdown(sid || null);
            });
            $('#shrinkLogModal').on('click', function(e) { if (e.target === this) hideShrinkLogModal(); });
            $('#scanLogClose').on('click', closeScanLog);

            var restoreJobsPanelTimer = null;
            var restoreProgressTimer = null;
            var loadRestoreJobsRequestId = 0;
            var lastKnownRestorePct = {};
            var NOTIF_MSG_MAX_LEN = 120;
            var DISMISSED_JOBS_KEY = 'baDismissedRestoreJobIds';
            function getDismissedJobIds() {
                try {
                    var raw = localStorage.getItem(DISMISSED_JOBS_KEY);
                    return raw ? JSON.parse(raw) : [];
                } catch (e) { return []; }
            }
            function addDismissedJobId(id) {
                var arr = getDismissedJobIds();
                if (arr.indexOf(id) < 0) { arr.push(id); localStorage.setItem(DISMISSED_JOBS_KEY, JSON.stringify(arr)); }
            }
            if ($('#restoreJobsBellWrap').length) {
                $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreJobs") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.jobs && d.jobs.length) {
                            var dismissed = getDismissedJobIds();
                            var jobs = (d.jobs || []).filter(function(j) { return j.id != null && dismissed.indexOf(j.id) < 0; });
                            if (jobs.length) $('#restoreJobsBadge').text(jobs.length).addClass('visible');
                        }
                    }
                });
            }
            function pollRestoreProgressOnly() {
                var sessions = window.__runningRestoreSessions;
                if (!sessions || !sessions.length) return;
                var $list = $('#restoreJobsList');
                if (!$list.length || !$('#restoreJobsPanel').is(':visible')) return;
                var progressUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreProgress") %>';
                sessions.forEach(function(j) {
                    if (!j.sessionId || !j.serverId) return;
                    $.ajax({ url: progressUrl, type: 'POST', contentType: 'application/json', dataType: 'json',
                        data: JSON.stringify({ serverId: j.serverId, sessionId: j.sessionId }) })
                        .done(function(prog) {
                            var d = prog.d || prog;
                            if (!d) return;
                            var $row = $list.find('.ba-notif-item[data-server-id="' + j.serverId + '"][data-session-id="' + (j.sessionId || '') + '"]');
                            if (!$row.length) return;
                            if (d.completed) {
                                $row.find('.ba-notif-progress-wrap').replaceWith('<div style="margin-top:4px;color:var(--success);">Đã xong</div>');
                                window.__runningRestoreSessions = (window.__runningRestoreSessions || []).filter(function(s) { return !(s.serverId === j.serverId && s.sessionId === j.sessionId); });
                            } else if (d.percentComplete != null) {
                                var cur = parseInt($row.find('.ba-notif-progress-pct').text(), 10) || 0;
                                var pct = Math.max(cur, d.percentComplete);
                                lastKnownRestorePct[j.serverId + '_' + j.sessionId] = pct;
                                $row.find('.ba-notif-progress-bar').css('width', pct + '%');
                                $row.find('.ba-notif-progress-pct').text(pct + '%');
                            }
                        });
                });
            }
            function formatNotifTime(v) {
                var dt = parseDateSafe(v);
                return dt ? dt.toLocaleString() : '—';
            }
            function showNotificationDetail(job) {
                var typeLabel = (job.type === 'Restore' || !job.type) ? 'Restore database' : job.type;
                var startStr = formatNotifTime(job.startTime);
                var endStr = formatNotifTime(job.completedAt);
                var statusLabel = job.status === 'Running' ? 'Đang chạy' : (job.status === 'Completed' ? 'Thành công' : (job.status === 'Failed' ? 'Lỗi' : job.status));
                var html = '<table><tbody>';
                html += '<tr><th>Loại</th><td>' + (typeLabel.replace(/</g, '&lt;')) + '</td></tr>';
                html += '<tr><th>Server</th><td>' + (job.serverName || '—').replace(/</g, '&lt;') + '</td></tr>';
                html += '<tr><th>Database</th><td>' + (job.databaseName || '—').replace(/</g, '&lt;') + '</td></tr>';
                html += '<tr><th>Thực hiện bởi</th><td>' + (job.startedByUserName || '—').replace(/</g, '&lt;') + '</td></tr>';
                html += '<tr><th>Tiến trình</th><td>' + (job.percentComplete != null ? job.percentComplete + '%' : '—') + '</td></tr>';
                html += '<tr><th>Trạng thái</th><td>' + statusLabel + '</td></tr>';
                html += '<tr><th>Bắt đầu</th><td>' + startStr + '</td></tr>';
                html += '<tr><th>Kết thúc</th><td>' + endStr + '</td></tr>';
                if (job.backupFileName) html += '<tr><th>File backup</th><td>' + (job.backupFileName || '').replace(/</g, '&lt;') + '</td></tr>';
                html += '</tbody></table>';
                if (job.message) html += '<div class="ba-notif-full-msg">' + (job.message || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>') + '</div>';
                $('#notificationDetailBody').html(html);
                $('#notificationDetailModal').addClass('show');
            }
            function hideNotificationDetail() { $('#notificationDetailModal').removeClass('show'); }
            function loadRestoreJobsPanel() {
                var $list = $('#restoreJobsList');
                var $badge = $('#restoreJobsBadge');
                if (!$list.length) return;
                var requestId = ++loadRestoreJobsRequestId;
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreJobs") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: '{}',
                    success: function(res) {
                        if (requestId !== loadRestoreJobsRequestId) return;
                        var d = res.d || res;
                        if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                        var dismissed = getDismissedJobIds();
                        var jobs = (d.jobs || []).filter(function(j) { return j.id != null && dismissed.indexOf(j.id) < 0; });
                        var running = jobs.filter(function(j) { return j.status === 'Running'; });
                        if (jobs.length) { $badge.text(jobs.length).addClass('visible'); } else { $badge.removeClass('visible'); }
                        window.__runningRestoreSessions = running.slice();
                        if (running.length) {
                            var progressUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetRestoreProgress") %>';
                            running.forEach(function(j) {
                                if (j.sessionId && j.serverId) {
                                    $.ajax({ url: progressUrl, type: 'POST', contentType: 'application/json', dataType: 'json',
                                        data: JSON.stringify({ serverId: j.serverId, sessionId: j.sessionId }) })
                                        .done(function(prog) {
                                            var d = prog.d || prog;
                                            if (!d) return;
                                            var $row = $list.find('.ba-notif-item[data-server-id="' + j.serverId + '"][data-session-id="' + (j.sessionId || '') + '"]');
                                            if (d.completed) {
                                                $row.find('.ba-notif-progress-wrap').replaceWith('<div style="margin-top:4px;color:var(--success);">Đã xong</div>');
                                            } else if (d.percentComplete != null && $row.length) {
                                                var cur = parseInt($row.find('.ba-notif-progress-pct').text(), 10) || 0;
                                                var pct = Math.max(cur, d.percentComplete);
                                                lastKnownRestorePct[j.serverId + '_' + j.sessionId] = pct;
                                                $row.find('.ba-notif-progress-bar').css('width', pct + '%');
                                                $row.find('.ba-notif-progress-pct').text(pct + '%');
                                            }
                                        });
                                }
                            });
                            if (!document.hidden && $('#restoreJobsPanel').is(':visible') && !restoreProgressTimer) {
                                restoreProgressTimer = setInterval(pollRestoreProgressOnly, 2000);
                            }
                        } else {
                            if (restoreProgressTimer) { clearInterval(restoreProgressTimer); restoreProgressTimer = null; }
                        }
                        window.__notifJobsList = jobs;
                        var html = '';
                        jobs.forEach(function(j, idx) {
                            j.type = 'Restore';
                            var key = (j.serverId || '') + '_' + (j.sessionId || '');
                            var serverPct = j.percentComplete != null ? j.percentComplete : 0;
                            var pct = Math.max(serverPct, lastKnownRestorePct[key] || 0);
                            if (j.status === 'Running') lastKnownRestorePct[key] = pct;
                            var st = j.status || '';
                            var msg = (j.message || '').trim();
                            var msgShort = msg.length > NOTIF_MSG_MAX_LEN ? msg.substring(0, NOTIF_MSG_MAX_LEN) + '…' : msg;
                            var startTimeStr = formatNotifTime(j.startTime);
                            var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-server-id="' + (j.serverId || '') + '" data-session-id="' + (j.sessionId || '') + '">';
                            row += '<button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button>';
                            row += '<div style="font-weight:500;">' + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div>';
                            row += '<div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + startTimeStr + '</div>';
                            if (st === 'Running') {
                                row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt);height:6px;border-radius:3px;overflow:hidden;"><div class="ba-notif-progress-bar" style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span class="ba-notif-progress-pct">' + pct + '%</span></div>';
                                row += '<a class="ba-notif-detail-link" data-action="detail">Xem chi tiết</a>';
                            } else if (st === 'Failed') {
                                row += '<div class="ba-notif-msg">' + (msgShort.replace(/</g, '&lt;')) + '</div>';
                                row += '<a class="ba-notif-detail-link" data-action="detail">Xem chi tiết</a>';
                            } else if (st === 'Completed') {
                                row += '<div style="margin-top:4px;color:var(--success);">Đã xong</div>';
                                row += '<a class="ba-notif-detail-link" data-action="detail">Xem chi tiết</a>';
                            }
                            row += '</div>';
                            html += row;
                        });
                        $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                        $list.off('click.baNotif').on('click.baNotif', '.ba-notif-detail-link[data-action="detail"]', function(e) {
                            e.preventDefault();
                            var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10);
                            if (window.__notifJobsList && window.__notifJobsList[idx]) showNotificationDetail(window.__notifJobsList[idx]);
                        });
                        $list.off('click.baNotifDismiss').on('click.baNotifDismiss', '.ba-notif-dismiss', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            var $item = $(this).closest('.ba-notif-item');
                            var jobId = parseInt($item.data('job-id'), 10);
                            if (!jobId) return;
                            addDismissedJobId(jobId);
                            $.ajax({
                                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissRestoreJob") %>',
                                type: 'POST',
                                contentType: 'application/json; charset=utf-8',
                                dataType: 'json',
                                data: JSON.stringify({ jobId: jobId })
                            });
                            $item.slideUp(200, function() {
                                $(this).remove();
                                var left = $('#restoreJobsList .ba-notif-item').length;
                                if (left) $('#restoreJobsBadge').text(left).addClass('visible');
                                else { $('#restoreJobsBadge').removeClass('visible'); $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); }
                            });
                        });
                    }
                });
            }
            function stopNotificationPolling() {
                if (restoreJobsPanelTimer) { clearInterval(restoreJobsPanelTimer); restoreJobsPanelTimer = null; }
                if (restoreProgressTimer) { clearInterval(restoreProgressTimer); restoreProgressTimer = null; }
            }
            function startNotificationPollingIfNeeded() {
                if (document.hidden) return;
                var $p = $('#restoreJobsPanel');
                if (!$p.length || !$p.is(':visible')) return;
                if (!restoreJobsPanelTimer) restoreJobsPanelTimer = setInterval(loadRestoreJobsPanel, 6000);
                if (window.__runningRestoreSessions && window.__runningRestoreSessions.length && !restoreProgressTimer)
                    restoreProgressTimer = setInterval(pollRestoreProgressOnly, 2000);
            }
            $('#restoreJobsBellBtn').on('click', function(e) {
                e.stopPropagation();
                var $p = $('#restoreJobsPanel');
                if ($p.is(':visible')) {
                    $p.hide();
                    stopNotificationPolling();
                } else {
                    loadRestoreJobsPanel();
                    $p.show();
                    if (!document.hidden && !restoreJobsPanelTimer) restoreJobsPanelTimer = setInterval(loadRestoreJobsPanel, 6000);
                }
            });
            $(document).on('click', function() {
                $('#restoreJobsPanel').hide();
                stopNotificationPolling();
            });
            $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) stopNotificationPolling();
                else startNotificationPollingIfNeeded();
            });
            // SignalR dùng chung: đăng ký handler restore jobs, rồi start
            if (typeof BA_SignalR !== 'undefined') {
                BA_SignalR.onRestoreJobsUpdated(function() {
                    if ($('#restoreJobsList').length) loadRestoreJobsPanel();
                });
                BA_SignalR.start('<%= ResolveUrl("~/signalr") %>', '<%= ResolveUrl("~/signalr/hubs") %>');
            }
        });
    </script>
</body>
</html>
