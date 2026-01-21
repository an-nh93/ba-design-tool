<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DesignerHome.aspx.cs"
    Inherits="BADesign.Pages.DesignerHome" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>UI Builder – My Designs</title>

    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>

    <style>
        :root {
            /* Dark theme (default) */
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

        /* Light theme */
        body.light-theme {
            --bg-main: #ffffff;
            --bg-dark: #f3f4f6;
            --bg-darker: #f9fafb;
            --bg-card: #ffffff;
            --bg-hover: #f3f4f6;
            --text-primary: #111827;
            --text-secondary: #4b5563;
            --text-muted: #6b7280;
            --border: #e5e7eb;
            --border-light: #d1d5db;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Dark theme mặc định */
        body {
            background: var(--bg-main);
            color: var(--text-primary);
        }

        /* ===== Layout ===== */
        .app-container {
            display: flex;
            height: 100vh;
            overflow: hidden;
        }

        /* ===== Sidebar ===== */
        .sidebar {
            width: 240px;
            background: var(--bg-darker);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }

        .sidebar-header {
            padding: 1.5rem 1rem;
            border-bottom: 1px solid var(--border);
        }

        .sidebar-header h1 {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }

        .sidebar-search {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
        }

        .sidebar-search input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .sidebar-search input:focus {
            outline: none;
            border-color: var(--primary);
        }

        .sidebar-search input::placeholder {
            color: var(--text-muted);
        }

        .sidebar-nav {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem 0;
        }

        .nav-section {
            padding: 0.5rem 0;
        }

        .nav-section-title {
            padding: 0.5rem 1rem;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .nav-item {
            display: flex;
            align-items: center;
            padding: 0.5rem 1rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            cursor: pointer;
            user-select: none;
        }

        .nav-item[data-filter] {
            cursor: pointer;
        }

        .nav-item:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .nav-item.active {
            background: var(--primary-soft);
            color: var(--primary-light);
            border-left: 3px solid var(--primary);
        }

        .nav-item .icon {
            margin-right: 0.5rem;
            width: 16px;
            text-align: center;
        }

        /* ===== Main Content ===== */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--bg-main);
        }

        /* ===== Top Bar ===== */
        .top-bar {
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            padding: 0.75rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .top-bar-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .top-bar-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        /* Theme switcher */
        .theme-switcher {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 0.75rem;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }

        .theme-switcher:hover {
            background: var(--bg-hover);
        }

        .theme-switcher-icon {
            font-size: 1rem;
        }

        .user-menu {
            position: relative;
        }

        .user-menu-trigger {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 0.75rem;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            border: none;
        }

        .user-menu-trigger:hover {
            background: var(--bg-hover);
        }

        .user-menu-trigger:focus {
            outline: none;
        }

        .user-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-sizing: border-box;
            overflow: hidden;
        }
        
        .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        
        .user-avatar:has(img) {
            background: transparent !important;
        }

        .user-menu-dropdown {
            position: absolute;
            top: calc(100% + 0.5rem);
            right: 0;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            min-width: 200px;
            z-index: 1000;
            display: none;
            overflow: hidden;
        }

        .user-menu-dropdown.show {
            display: block;
        }

        .user-menu-dropdown .menu-item {
            display: block;
            padding: 0.75rem 1rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            border-bottom: 1px solid var(--border);
        }

        .user-menu-dropdown .menu-item:last-child {
            border-bottom: none;
        }

        .user-menu-dropdown .menu-item:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .btn {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .btn-sm {
            padding: 0.375rem 0.75rem;
            font-size: 0.8125rem;
        }

        /* ===== Content Area ===== */
        .content-area {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
        }

        .section {
            margin-bottom: 3rem;
        }

        .section-header {
            margin-bottom: 1.5rem;
        }

        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }

        .section-subtitle {
            font-size: 0.875rem;
            color: var(--text-muted);
        }

        /* ===== Toolbar (Filter, Sort, View Toggle) ===== */
        .section-toolbar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 1rem;
            padding: 0.75rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            flex-wrap: wrap;
        }

        .toolbar-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .toolbar-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            white-space: nowrap;
        }

        .toolbar-select {
            padding: 0.375rem 0.75rem;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            cursor: pointer;
            outline: none;
            transition: all 0.2s ease;
        }

        .toolbar-select:hover {
            border-color: var(--primary);
        }

        .toolbar-select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-soft);
        }

        .toolbar-search {
            padding: 0.375rem 0.75rem;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            outline: none;
            transition: all 0.2s ease;
            min-width: 200px;
        }

        .toolbar-search::placeholder {
            color: var(--text-muted);
        }

        .toolbar-search:hover {
            border-color: var(--primary);
        }

        .toolbar-search:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-soft);
        }

        .view-toggle {
            display: flex;
            gap: 0.25rem;
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            padding: 0.25rem;
        }

        .view-toggle-btn {
            padding: 0.375rem 0.5rem;
            background: transparent;
            border: none;
            border-radius: 0.25rem;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .view-toggle-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .view-toggle-btn.active {
            background: var(--primary);
            color: white;
        }

        /* ===== Card Grid ===== */
        .designs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 1.5rem;
        }

        .designs-grid.hidden {
            display: none;
        }

        /* ===== Table View ===== */
        .designs-table-container {
            display: none;
            overflow-x: auto;
        }

        .designs-table-container.show {
            display: block;
        }

        .designs-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg-card);
            border-radius: 0.5rem;
            overflow: hidden;
        }

        .designs-table thead {
            background: var(--bg-darker);
        }

        .designs-table th {
            padding: 0.75rem 1rem;
            text-align: left;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border);
        }

        .designs-table td {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            color: var(--text-primary);
        }

        .designs-table tbody tr:hover {
            background: var(--bg-hover);
        }

        .designs-table tbody tr:last-child td {
            border-bottom: none;
        }

        .table-thumb {
            width: 80px;
            height: 60px;
            object-fit: cover;
            border-radius: 0.375rem;
            cursor: pointer;
        }

        .table-name {
            font-weight: 600;
            color: var(--text-primary);
            text-decoration: none;
        }

        .table-name:hover {
            color: var(--primary-light);
        }

        .design-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            overflow: hidden;
            transition: all 0.2s ease;
            cursor: pointer;
            display: flex;
            flex-direction: column;
        }

        .design-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 120, 212, 0.2);
        }

        .design-card-thumb {
            width: 100%;
            height: 160px;
            object-fit: cover;
            background: var(--bg-darker);
        }

        .design-card-body {
            padding: 1rem;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .design-card-title {
            font-size: 0.9375rem;
        font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            text-decoration: none;
        }

        .design-card-title:hover {
            color: var(--primary-light);
        }

        .design-card-meta {
            font-size: 0.8125rem;
            color: var(--text-muted);
            margin-bottom: 0.75rem;
        }

        .design-card-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: auto;
        }

        .badge {
            display: inline-block;
            padding: 0.125rem 0.5rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .badge-public {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }

        .badge-private {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
        }

        .btn-icon {
            padding: 0.375rem;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .btn-icon:hover {
            background: var(--bg-hover);
            border-color: var(--border-light);
            color: var(--text-primary);
        }

        .btn-danger {
            background: transparent;
            border: 1px solid var(--danger);
            color: var(--danger);
        }

        .btn-danger:hover {
            background: var(--danger);
            color: white;
        }

        .btn-warning {
            background: transparent;
            border: 1px solid var(--warning);
            color: var(--warning);
        }

        .btn-warning:hover {
            background: var(--warning);
            color: white;
        }

        .btn-success {
            background: transparent;
            border: 1px solid var(--success);
            color: var(--success);
        }

        .btn-success:hover {
            background: var(--success);
            color: white;
        }

        /* ===== Modal ===== */
        .modal-content {
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-primary);
        }

        .modal-header {
            border-bottom: 1px solid var(--border);
        }

        .modal-body {
            background: var(--bg-dark);
        }

        /* ===== Account Settings Modal (Figma Style) ===== */
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
        }

        .account-modal.show {
            display: flex;
        }

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
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
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

        .account-modal-tab:hover {
            color: var(--text-primary);
        }

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

        .account-section:last-child {
            margin-bottom: 0;
        }

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

        .account-field:last-child {
            border-bottom: none;
        }

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

        .account-field-action {
            color: var(--primary);
            text-decoration: none;
            font-size: 0.875rem;
        cursor: pointer;
            transition: color 0.2s ease;
        }

        .account-field-action:hover {
            color: var(--primary-hover);
        }

        .account-avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--primary); /* Default: màu xanh khi không có avatar */
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
        
        /* Khi có avatar (background-image), làm nền trong suốt */
        .account-avatar[style*="background-image"] {
            background-color: transparent !important;
        }

        .account-profile-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .account-profile-info {
            flex: 1;
        }

        .account-profile-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }

        .account-form-group {
            margin-bottom: 1.5rem;
        }

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

        #imgDesignPreview {
            max-width: 100%;
            max-height: calc(100vh - 200px);
            border-radius: 0.5rem;
        }

        /* ===== Empty State ===== */
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--text-muted);
        }

        .empty-state-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }

        /* ===== Responsive ===== */
        @media (max-width: 768px) {
            .sidebar {
                width: 60px;
            }

            .sidebar-header h1,
            .sidebar-nav .nav-item span:not(.icon),
            .sidebar-search {
                display: none;
            }

            .designs-grid {
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 1rem;
            }

            .content-area {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="app-container">
            <!-- Sidebar -->
            <div class="sidebar">
                <div class="sidebar-header">
                    <h1>UI Builder</h1>
                </div>
                
                <div class="sidebar-search">
                    <input type="text" placeholder="Q Search..." />
            </div>

                <div class="sidebar-nav">
                    <div class="nav-section">
                        <div class="nav-item active" data-section="my-designs">
                            <span class="icon">📁</span>
                            <span>Recents</span>
                        </div>
                        <div class="nav-item" data-section="public-designs">
                            <span class="icon">🌐</span>
                            <span>Community</span>
                        </div>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Team</div>
                        <div class="nav-item" data-filter="drafts">
                            <span class="icon">📄</span>
                            <span>Drafts</span>
                        </div>
                        <div class="nav-item" data-filter="all">
                            <span class="icon">📂</span>
                            <span>All projects</span>
                        </div>
                        <div class="nav-item" data-filter="starred">
                            <span class="icon">⭐</span>
                            <span>Starred</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="main-content">
                <!-- Top Bar -->
                <div class="top-bar">
                    <div class="top-bar-title">Recents</div>
                    <div class="top-bar-actions">
                        <a href="~/Builder" class="btn btn-primary btn-sm" runat="server">
                            <span>+</span> New empty page
                </a>

                <asp:HyperLink ID="lnkUserManagement" runat="server"
                            CssClass="btn btn-sm" NavigateUrl="~/Users"
                            Visible="false"
                            Style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary);">
                    User management
                </asp:HyperLink>

                        <button class="theme-switcher" id="themeSwitcher" onclick="toggleTheme(event)">
                            <span class="theme-switcher-icon" id="themeIcon">🌙</span>
                            <span id="themeText">Dark</span>
                        </button>

                        <div class="user-menu">
                            <button class="user-menu-trigger" type="button" id="userMenuTrigger" onclick="toggleUserMenu(event); return false;">
                                <div class="user-avatar">
                                    <asp:Literal ID="litUserInitial" runat="server" />
                    </div>
                                <asp:Literal ID="litUserName" runat="server" />
                                <span>▼</span>
                            </button>
                            <div class="user-menu-dropdown" id="userMenuDropdown">
                                <a href="#" class="menu-item" onclick="closeUserMenu(); showAccountModal('security'); return false;">🔒 Change Password</a>
                                <a href="#" class="menu-item" onclick="closeUserMenu(); showAccountModal('account'); return false;">⚙️ Account Settings</a>
                                <div class="menu-item" style="border-top: 1px solid var(--border); margin-top: 0.25rem; padding-top: 0.75rem;">
                                    <a href="~/Login" runat="server" style="color: inherit; text-decoration: none;" onclick="closeUserMenu();">🚪 Logout</a>
                </div>
                            </div>
                        </div>
            </div>
        </div>

                <!-- Content Area -->
                <div class="content-area">
                    <!-- My Designs Section -->
                    <div class="section" id="my-designs-section">
                        <div class="section-header">
                    <div>
                                <div class="section-title">My designs</div>
                                <div class="section-subtitle">Double-click thumbnail to preview full size</div>
                    </div>
                            <!-- Toolbar: Filter, Sort, View Toggle -->
                            <div class="section-toolbar">
                                <div class="toolbar-group">
                                    <span class="toolbar-label">🔍 Search:</span>
                                    <input type="text" class="toolbar-search" id="searchMyDesigns" placeholder="Search by name..." />
                </div>
                                <div class="toolbar-group">
                                    <span class="toolbar-label">Filter:</span>
                                    <select class="toolbar-select" id="filterMyDesigns">
                                        <option value="all">All</option>
                                        <option value="public">Public</option>
                                        <option value="private">Private</option>
                                    </select>
                </div>
                                <div class="toolbar-group">
                                    <span class="toolbar-label">Sort by:</span>
                                    <select class="toolbar-select" id="sortMyDesigns">
                                        <option value="date-desc">Date (Newest)</option>
                                        <option value="date-asc">Date (Oldest)</option>
                                        <option value="name-asc">Name (A-Z)</option>
                                        <option value="name-desc">Name (Z-A)</option>
                                        <option value="type-asc">Type (A-Z)</option>
                                    </select>
                                </div>
                                <div class="toolbar-group">
                                    <div class="view-toggle">
                                        <button type="button" class="view-toggle-btn active" data-view="grid" data-section="my-designs" title="Grid view">
                                            <span>⊞</span>
                                        </button>
                                        <button type="button" class="view-toggle-btn" data-view="table" data-section="my-designs" title="Table view">
                                            <span>☰</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Grid View -->
                        <div class="designs-grid" id="my-designs-grid">
                            <asp:Repeater ID="rpMyDesigns" runat="server" OnItemCommand="rpMyDesigns_ItemCommand">
                                    <ItemTemplate>
                                    <div class="design-card" 
                                         data-id='<%# Eval("ControlId") %>'
                                         data-name='<%# Eval("Name") %>'
                                         data-type='<%# Eval("ControlType") %>'
                                         data-public='<%# (bool)Eval("IsPublic") ? "true" : "false" %>'
                                         data-date='<%# Eval("UpdatedAt", "{0:yyyy-MM-dd HH:mm:ss}") %>'
                                         data-timestamp='<%# ((DateTime)Eval("UpdatedAt")).Ticks %>'>
                                                <img src='<%# Eval("ThumbnailUrl") %>'
                                             class="design-card-thumb js-preview-thumb" 
                                             alt='<%# Eval("Name") %>'
                                                     data-full='<%# Eval("ThumbnailUrl") %>' />
                                        <div class="design-card-body">
                                            <a href='<%# Eval("EditUrl") %>' class="design-card-title">
                                                    <%# Eval("Name") %>
                                            </a>
                                            <div class="design-card-meta">
                                                    <%# Eval("ControlType") %> ·
                                                <span class='<%# (bool)Eval("IsPublic") ? "badge badge-public" : "badge badge-private" %>'>
                                                        <%# (bool)Eval("IsPublic") ? "Public" : "Private" %>
                                                    </span>
                                                <br />
                                                <small>Updated: <%# Eval("UpdatedAt", "{0:yyyy-MM-dd HH:mm}") %></small>
                                            </div>
                                            <div class="design-card-actions">
                                                <a href='<%# Eval("EditUrl") %>' class="btn btn-sm btn-primary" style="flex: 1;">
                                                        Edit
                                                    </a>
                                                    <asp:LinkButton ID="btnDelete" runat="server"
                                                    CssClass="btn btn-sm btn-danger"
                                                        CommandName="Delete"
                                                        CommandArgument='<%# Eval("ControlId") %>'
                                                        OnClientClick="return confirm('Delete this design?');">
                                                    🗑️
                                                    </asp:LinkButton>
                                                    <asp:PlaceHolder runat="server" Visible='<%# (bool)Eval("IsPublic") %>'>
                                                        <button type="button"
                                                            class="btn btn-sm btn-warning btn-toggle-public"
                                                                data-id='<%# Eval("ControlId") %>'
                                                            data-next="false"
                                                            title="Make private">
                                                        🔒
                                                        </button>
                                                    </asp:PlaceHolder>
                                                    <asp:PlaceHolder runat="server" Visible='<%# !(bool)Eval("IsPublic") %>'>
                                                        <button type="button"
                                                            class="btn btn-sm btn-success btn-toggle-public"
                                                                data-id='<%# Eval("ControlId") %>'
                                                            data-next="true"
                                                            title="Make public">
                                                        🌐
                                                        </button>
                                                    </asp:PlaceHolder>
                                                </div>
                                        </div>
                                    </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                        </div>
                        <!-- Table View -->
                        <div class="designs-table-container" id="my-designs-table">
                            <table class="designs-table">
                                <thead>
                                    <tr>
                                        <th style="width: 100px;">Preview</th>
                                        <th>Name</th>
                                        <th style="width: 120px;">Type</th>
                                        <th style="width: 100px;">Status</th>
                                        <th style="width: 150px;">Updated</th>
                                        <th style="width: 200px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="my-designs-table-body">
                                    <!-- Table rows will be generated by JavaScript -->
                            </tbody>
                        </table>
                </div>
            </div>

                    <!-- Public Designs Section -->
                    <div class="section" id="public-designs-section" style="display: none;">
                        <div class="section-header">
                    <div>
                                <div class="section-title">Public designs</div>
                                <div class="section-subtitle">(clone only)</div>
                    </div>
                            <!-- Toolbar: Filter, Sort, View Toggle -->
                            <div class="section-toolbar">
                                <div class="toolbar-group">
                                    <span class="toolbar-label">🔍 Search:</span>
                                    <input type="text" class="toolbar-search" id="searchPublicDesigns" placeholder="Search by name..." />
                </div>
                                <div class="toolbar-group">
                                    <span class="toolbar-label">Sort by:</span>
                                    <select class="toolbar-select" id="sortPublicDesigns">
                                        <option value="date-desc">Date (Newest)</option>
                                        <option value="date-asc">Date (Oldest)</option>
                                        <option value="name-asc">Name (A-Z)</option>
                                        <option value="name-desc">Name (Z-A)</option>
                                        <option value="type-asc">Type (A-Z)</option>
                                        <option value="owner-asc">Owner (A-Z)</option>
                                    </select>
                </div>
                                <div class="toolbar-group">
                                    <div class="view-toggle">
                                        <button type="button" class="view-toggle-btn active" data-view="grid" data-section="public-designs" title="Grid view">
                                            <span>⊞</span>
                                        </button>
                                        <button type="button" class="view-toggle-btn" data-view="table" data-section="public-designs" title="Table view">
                                            <span>☰</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Grid View -->
                        <div class="designs-grid" id="public-designs-grid">
                                <asp:Repeater ID="rpPublicDesigns" runat="server">
                                    <ItemTemplate>
                                    <div class="design-card"
                                         data-id='<%# Eval("ControlId") %>'
                                         data-name='<%# Eval("Name") %>'
                                         data-type='<%# Eval("ControlType") %>'
                                         data-owner='<%# Eval("OwnerName") %>'
                                         data-date='<%# Eval("UpdatedAt", "{0:yyyy-MM-dd HH:mm:ss}") %>'
                                         data-timestamp='<%# ((DateTime)Eval("UpdatedAt")).Ticks %>'>
                                        <img src='<%# Eval("ThumbnailUrl") %>' 
                                             class="design-card-thumb" 
                                             alt='<%# Eval("Name") %>' />
                                        <div class="design-card-body">
                                            <div class="design-card-title" style="cursor: default;">
                                                <%# Eval("Name") %>
                                            </div>
                                            <div class="design-card-meta">
                                                <%# Eval("ControlType") %> · Owner: <%# Eval("OwnerName") %>
                                                <br />
                                                <small>Updated: <%# Eval("UpdatedAt", "{0:yyyy-MM-dd HH:mm}") %></small>
                                            </div>
                                            <div class="design-card-actions">
                                                <a href='<%# Eval("CloneUrl") %>' class="btn btn-sm btn-primary" style="flex: 1;">
                                                    Clone
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                        </div>
                        <!-- Table View -->
                        <div class="designs-table-container" id="public-designs-table">
                            <table class="designs-table">
                                <thead>
                                    <tr>
                                        <th style="width: 100px;">Preview</th>
                                        <th>Name</th>
                                        <th style="width: 120px;">Type</th>
                                        <th style="width: 120px;">Owner</th>
                                        <th style="width: 150px;">Updated</th>
                                        <th style="width: 120px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="public-designs-table-body">
                                    <!-- Table rows will be generated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        </div>
        </div>

        <!-- Modal Preview -->
    <div class="modal fade" id="previewModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
                        <h5 class="modal-title">Design preview</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <img id="imgDesignPreview" src="" alt="preview" />
          </div>
        </div>
      </div>
    </div>

    <!-- Account Settings Modal (Figma Style) -->
    <div class="account-modal" id="accountModal">
        <div class="account-modal-content">
            <div class="account-modal-header">
                <h3 class="account-modal-title">Account Settings</h3>
                <button type="button" class="account-modal-close" onclick="hideAccountModal(); return false;">×</button>
            </div>
            <div class="account-modal-tabs">
                <button class="account-modal-tab active" data-tab="account" onclick="switchAccountTab(event, 'account')">Account</button>
                <button class="account-modal-tab" data-tab="security" onclick="switchAccountTab(event, 'security')">Security</button>
            </div>
            <div class="account-modal-body">
                <!-- Account Tab -->
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

                <!-- Security Tab -->
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
                                <button type="button" class="btn btn-primary" onclick="changePassword()">Change Password</button>
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
        // ===== Theme Switcher =====
        function initTheme() {
            var savedTheme = localStorage.getItem('theme') || 'light';
            applyTheme(savedTheme);
        }

        function applyTheme(theme) {
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
                document.getElementById('themeIcon').textContent = '☀️';
                document.getElementById('themeText').textContent = 'Light';
            } else {
                document.body.classList.remove('dark-theme');
                document.getElementById('themeIcon').textContent = '🌙';
                document.getElementById('themeText').textContent = 'Dark';
            }
            localStorage.setItem('theme', theme);
        }

        function toggleTheme(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var currentTheme = localStorage.getItem('theme') || 'light';
            var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            return false;
        }

        // ===== User Menu =====
        function toggleUserMenu(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var dropdown = document.getElementById('userMenuDropdown');
            dropdown.classList.toggle('show');
            return false;
        }

        function closeUserMenu() {
            var dropdown = document.getElementById('userMenuDropdown');
            dropdown.classList.remove('show');
        }

        // Close user menu when clicking outside
        document.addEventListener('click', function(e) {
            var dropdown = document.getElementById('userMenuDropdown');
            var trigger = document.getElementById('userMenuTrigger');
            if (trigger && dropdown && !trigger.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });

        // ===== Navigation =====
        document.addEventListener('DOMContentLoaded', function() {
            // Section navigation (Recents, Community)
            document.querySelectorAll('.nav-item[data-section]').forEach(function(item) {
                item.addEventListener('click', function() {
                    var section = this.getAttribute('data-section');
                    
                    // Update active state
                    document.querySelectorAll('.nav-item').forEach(function(nav) {
                        nav.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Show/hide sections
                    if (section === 'my-designs') {
                        document.getElementById('my-designs-section').style.display = 'block';
                        document.getElementById('public-designs-section').style.display = 'none';
                        document.querySelector('.top-bar-title').textContent = 'Recents';
                    } else if (section === 'public-designs') {
                        document.getElementById('my-designs-section').style.display = 'none';
                        document.getElementById('public-designs-section').style.display = 'block';
                        document.querySelector('.top-bar-title').textContent = 'Community';
                    }
            });
        });

            // Filter navigation (Drafts, All projects, Starred)
            document.querySelectorAll('.nav-item[data-filter]').forEach(function(item) {
                item.addEventListener('click', function() {
                    var filter = this.getAttribute('data-filter');
                    
                    // Update active state - remove from section navs first
                    document.querySelectorAll('.nav-item[data-section]').forEach(function(nav) {
                        nav.classList.remove('active');
                    });
                    
                    // Update active state for filter navs
                    document.querySelectorAll('.nav-item[data-filter]').forEach(function(nav) {
                        nav.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Update title
                    var titles = {
                        'drafts': 'Drafts',
                        'all': 'All Projects',
                        'starred': 'Starred'
                    };
                    document.querySelector('.top-bar-title').textContent = titles[filter] || 'My Designs';
                    
                    // For now, just show all designs (can be enhanced later with actual filtering)
                    document.getElementById('my-designs-section').style.display = 'block';
                    document.getElementById('public-designs-section').style.display = 'none';
                    
                    // TODO: Implement actual filtering logic
                    console.log('Filter selected:', filter);
                });
            });

            // ===== Filter, Sort, and View Toggle =====
            initDesignsView();
        });

        // Initialize designs view (filter, sort, toggle)
        function initDesignsView() {
            // Load saved view preference
            var savedView = localStorage.getItem('designs-view') || 'grid';
            setViewMode('my-designs', savedView);
            setViewMode('public-designs', savedView);

            // View toggle buttons
            document.querySelectorAll('.view-toggle-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var view = this.getAttribute('data-view');
                    var section = this.getAttribute('data-section');
                    setViewMode(section, view);
                    localStorage.setItem('designs-view', view);
                    return false;
                });
            });

            // Search for My Designs
            var searchMyDesigns = document.getElementById('searchMyDesigns');
            if (searchMyDesigns) {
                var searchTimeout;
                searchMyDesigns.addEventListener('input', function() {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(function() {
                        applyFilterAndSort('my-designs');
                    }, 300); // Debounce 300ms
                });
                // Prevent Enter key from triggering form submit or theme toggle
                searchMyDesigns.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        applyFilterAndSort('my-designs');
                        return false;
                    }
                });
            }

            // Filter for My Designs
            var filterMyDesigns = document.getElementById('filterMyDesigns');
            if (filterMyDesigns) {
                filterMyDesigns.addEventListener('change', function() {
                    applyFilterAndSort('my-designs');
                });
            }

            // Sort for My Designs
            var sortMyDesigns = document.getElementById('sortMyDesigns');
            if (sortMyDesigns) {
                sortMyDesigns.addEventListener('change', function() {
                    applyFilterAndSort('my-designs');
                });
            }

            // Search for Public Designs
            var searchPublicDesigns = document.getElementById('searchPublicDesigns');
            if (searchPublicDesigns) {
                var searchTimeoutPublic;
                searchPublicDesigns.addEventListener('input', function() {
                    clearTimeout(searchTimeoutPublic);
                    searchTimeoutPublic = setTimeout(function() {
                        applyFilterAndSort('public-designs');
                    }, 300); // Debounce 300ms
                });
                // Prevent Enter key from triggering form submit or theme toggle
                searchPublicDesigns.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        applyFilterAndSort('public-designs');
                        return false;
                    }
                });
            }

            // Sort for Public Designs
            var sortPublicDesigns = document.getElementById('sortPublicDesigns');
            if (sortPublicDesigns) {
                sortPublicDesigns.addEventListener('change', function() {
                    applyFilterAndSort('public-designs');
                });
            }

            // Initial render
            setTimeout(function() {
                applyFilterAndSort('my-designs');
                applyFilterAndSort('public-designs');
                
                // Generate table rows if table view is active
                var savedView = localStorage.getItem('designs-view') || 'grid';
                if (savedView === 'table') {
                    generateTableRows('my-designs');
                    generateTableRows('public-designs');
                }
            }, 100);
        }

        // Set view mode (grid or table)
        function setViewMode(section, view) {
            var grid = document.getElementById(section + '-grid');
            var table = document.getElementById(section + '-table');
            var toggleBtns = document.querySelectorAll('.view-toggle-btn[data-section="' + section + '"]');

            if (view === 'grid') {
                if (grid) grid.classList.remove('hidden');
                if (table) table.classList.remove('show');
                toggleBtns.forEach(function(btn) {
                    if (btn.getAttribute('data-view') === 'grid') {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            } else {
                if (grid) grid.classList.add('hidden');
                if (table) table.classList.add('show');
                toggleBtns.forEach(function(btn) {
                    if (btn.getAttribute('data-view') === 'table') {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                // Generate table rows when switching to table view
                setTimeout(function() {
                    generateTableRows(section);
                }, 100);
            }
        }

        // Apply filter and sort
        function applyFilterAndSort(section) {
            var grid = document.getElementById(section + '-grid');
            if (!grid) return;
            
            var cards = Array.from(grid.querySelectorAll('.design-card'));
            var filterValue = section === 'my-designs' ? 
                (document.getElementById('filterMyDesigns')?.value || 'all') : 'all';
            var sortValue = section === 'my-designs' ?
                (document.getElementById('sortMyDesigns')?.value || 'date-desc') :
                (document.getElementById('sortPublicDesigns')?.value || 'date-desc');
            var searchText = section === 'my-designs' ?
                (document.getElementById('searchMyDesigns')?.value || '').toLowerCase().trim() :
                (document.getElementById('searchPublicDesigns')?.value || '').toLowerCase().trim();
            
            // Filter
            var filteredCards = Array.from(cards).filter(function(card) {
                // Search filter
                if (searchText) {
                    var name = (card.getAttribute('data-name') || '').toLowerCase();
                    var type = (card.getAttribute('data-type') || '').toLowerCase();
                    
                    // Get all text content from the card (including meta info like "page · Public")
                    var cardText = (card.textContent || card.innerText || '').toLowerCase();
                    
                    // Normalize search text
                    var normalizedSearch = searchText.toLowerCase().trim();
                    
                    // Search in name, type, and all card text
                    var matchesSearch = name.includes(normalizedSearch) || 
                                      type.includes(normalizedSearch) || 
                                      cardText.includes(normalizedSearch);
                    
                    if (!matchesSearch) {
                        return false;
                    }
                }
                
                // Public/Private filter (only for My Designs)
                if (section === 'my-designs') {
                    if (filterValue === 'all') return true;
                    var isPublic = card.getAttribute('data-public') === 'true';
                    if (filterValue === 'public') return isPublic;
                    if (filterValue === 'private') return !isPublic;
                }
                
                return true;
            });

            // Sort
            filteredCards.sort(function(a, b) {
                if (sortValue.startsWith('date-')) {
                    var timestampA = parseInt(a.getAttribute('data-timestamp') || '0');
                    var timestampB = parseInt(b.getAttribute('data-timestamp') || '0');
                    return sortValue === 'date-desc' ? timestampB - timestampA : timestampA - timestampB;
                } else if (sortValue.startsWith('name-')) {
                    var nameA = (a.getAttribute('data-name') || '').toLowerCase();
                    var nameB = (b.getAttribute('data-name') || '').toLowerCase();
                    return sortValue === 'name-asc' ? 
                        (nameA < nameB ? -1 : nameA > nameB ? 1 : 0) :
                        (nameB < nameA ? -1 : nameB > nameA ? 1 : 0);
                } else if (sortValue.startsWith('type-')) {
                    var typeA = (a.getAttribute('data-type') || '').toLowerCase();
                    var typeB = (b.getAttribute('data-type') || '').toLowerCase();
                    return typeA < typeB ? -1 : typeA > typeB ? 1 : 0;
                } else if (sortValue.startsWith('owner-')) {
                    var ownerA = (a.getAttribute('data-owner') || '').toLowerCase();
                    var ownerB = (b.getAttribute('data-owner') || '').toLowerCase();
                    return ownerA < ownerB ? -1 : ownerA > ownerB ? 1 : 0;
                }
                return 0;
            });

            // Show/hide cards based on filter and reorder
            if (grid) {
                // First, reset all cards to visible
                cards.forEach(function(card) {
                    card.style.display = '';
                });
                
                // Hide cards that don't match filter
                cards.forEach(function(card) {
                    var isFiltered = filteredCards.indexOf(card) !== -1;
                    if (!isFiltered) {
                        card.style.display = 'none';
                    }
                });
                
                // Reorder visible cards (only move filtered cards)
                filteredCards.forEach(function(card) {
                    grid.appendChild(card);
                });
            }

            // Update table if visible
            var table = document.getElementById(section + '-table');
            if (table && table.classList.contains('show')) {
                generateTableRows(section, filteredCards);
            }
        }

        // Generate table rows from cards
        function generateTableRows(section, cards) {
            var tbody = document.getElementById(section + '-table-body');
            if (!tbody) return;

            if (!cards) {
                var grid = document.getElementById(section + '-grid');
                if (!grid) return;
                cards = Array.from(grid.querySelectorAll('.design-card'));
            }

            // Apply filter
            var filterValue = section === 'my-designs' ? 
                (document.getElementById('filterMyDesigns')?.value || 'all') : 'all';
            var searchText = section === 'my-designs' ?
                (document.getElementById('searchMyDesigns')?.value || '').toLowerCase().trim() :
                (document.getElementById('searchPublicDesigns')?.value || '').toLowerCase().trim();
            cards = cards.filter(function(card) {
                // Search filter
                if (searchText) {
                    var name = (card.getAttribute('data-name') || '').toLowerCase();
                    var type = (card.getAttribute('data-type') || '').toLowerCase();
                    
                    // Get all text content from the card (including meta info like "page · Public")
                    var cardText = (card.textContent || card.innerText || '').toLowerCase();
                    
                    // Normalize search text
                    var normalizedSearch = searchText.toLowerCase().trim();
                    
                    // Search in name, type, and all card text
                    var matchesSearch = name.includes(normalizedSearch) || 
                                      type.includes(normalizedSearch) || 
                                      cardText.includes(normalizedSearch);
                    
                    if (!matchesSearch) {
                        return false;
                    }
                }
                
                // Public/Private filter (only for My Designs)
                if (section === 'my-designs') {
                    if (filterValue === 'all') return true;
                    var isPublic = card.getAttribute('data-public') === 'true';
                    if (filterValue === 'public') return isPublic;
                    if (filterValue === 'private') return !isPublic;
                }
                
                return true;
            });

            // Apply sort
            var sortValue = section === 'my-designs' ?
                (document.getElementById('sortMyDesigns')?.value || 'date-desc') :
                (document.getElementById('sortPublicDesigns')?.value || 'date-desc');

            cards.sort(function(a, b) {
                if (sortValue.startsWith('date-')) {
                    var timestampA = parseInt(a.getAttribute('data-timestamp') || '0');
                    var timestampB = parseInt(b.getAttribute('data-timestamp') || '0');
                    return sortValue === 'date-desc' ? timestampB - timestampA : timestampA - timestampB;
                } else if (sortValue.startsWith('name-')) {
                    var nameA = (a.getAttribute('data-name') || '').toLowerCase();
                    var nameB = (b.getAttribute('data-name') || '').toLowerCase();
                    return sortValue === 'name-asc' ? 
                        (nameA < nameB ? -1 : nameA > nameB ? 1 : 0) :
                        (nameB < nameA ? -1 : nameB > nameA ? 1 : 0);
                } else if (sortValue.startsWith('type-')) {
                    var typeA = (a.getAttribute('data-type') || '').toLowerCase();
                    var typeB = (b.getAttribute('data-type') || '').toLowerCase();
                    return typeA < typeB ? -1 : typeA > typeB ? 1 : 0;
                } else if (sortValue.startsWith('owner-')) {
                    var ownerA = (a.getAttribute('data-owner') || '').toLowerCase();
                    var ownerB = (b.getAttribute('data-owner') || '').toLowerCase();
                    return ownerA < ownerB ? -1 : ownerA > ownerB ? 1 : 0;
                }
                return 0;
            });

            tbody.innerHTML = '';
            cards.forEach(function(card) {
                var row = createTableRow(card, section);
                tbody.appendChild(row);
            });

            // Re-attach preview event listeners for table thumbnails
            attachPreviewListeners();
        }

        // Create table row from card
        function createTableRow(card, section) {
            var row = document.createElement('tr');
            var id = card.getAttribute('data-id');
            var name = card.getAttribute('data-name') || '';
            var type = card.getAttribute('data-type') || '';
            var isPublic = card.getAttribute('data-public') === 'true';
            var date = card.getAttribute('data-date') || '';
            var thumbImg = card.querySelector('.design-card-thumb');
            var thumbSrc = thumbImg ? thumbImg.getAttribute('src') : '';
            var editLink = card.querySelector('.design-card-title');
            var editUrl = editLink ? editLink.getAttribute('href') : '';
            var cloneLink = card.querySelector('a[href*="clone"], a[href*="Clone"]');
            var cloneUrl = cloneLink ? cloneLink.getAttribute('href') : '';
            var owner = card.getAttribute('data-owner') || '';
            
            // Extract URLs from card actions if not found
            if (!editUrl && section === 'my-designs') {
                var editBtn = card.querySelector('.design-card-actions a.btn-primary');
                if (editBtn) editUrl = editBtn.getAttribute('href') || '';
            }
            if (!cloneUrl && section === 'public-designs') {
                var cloneBtn = card.querySelector('.design-card-actions a');
                if (cloneBtn) cloneUrl = cloneBtn.getAttribute('href') || '';
            }

            // Preview
            var previewCell = document.createElement('td');
            if (thumbSrc) {
                var img = document.createElement('img');
                img.src = thumbSrc;
                img.className = 'table-thumb js-preview-thumb';
                img.setAttribute('data-full', thumbSrc);
                previewCell.appendChild(img);
            }
            row.appendChild(previewCell);

            // Name
            var nameCell = document.createElement('td');
            var nameLink = document.createElement('a');
            nameLink.href = editUrl || cloneUrl;
            nameLink.className = 'table-name';
            nameLink.textContent = name;
            nameCell.appendChild(nameLink);
            row.appendChild(nameCell);

            // Type
            var typeCell = document.createElement('td');
            typeCell.textContent = type;
            row.appendChild(typeCell);

            // Status (for My Designs) or Owner (for Public Designs)
            var statusCell = document.createElement('td');
            if (section === 'my-designs') {
                var badge = document.createElement('span');
                badge.className = isPublic ? 'badge badge-public' : 'badge badge-private';
                badge.textContent = isPublic ? 'Public' : 'Private';
                statusCell.appendChild(badge);
            } else {
                statusCell.textContent = owner;
            }
            row.appendChild(statusCell);

            // Updated
            var dateCell = document.createElement('td');
            dateCell.textContent = date ? date.substring(0, 16) : '';
            row.appendChild(dateCell);

            // Actions
            var actionsCell = document.createElement('td');
            actionsCell.className = 'design-card-actions';
            if (section === 'my-designs') {
                var editBtn = document.createElement('a');
                editBtn.href = editUrl;
                editBtn.className = 'btn btn-sm btn-primary';
                editBtn.textContent = 'Edit';
                actionsCell.appendChild(editBtn);

                var deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'btn btn-sm btn-danger';
                deleteBtn.textContent = '🗑️';
                deleteBtn.title = 'Delete';
                deleteBtn.onclick = function() {
                    if (confirm('Delete this design?')) {
                        // Find the original delete LinkButton from grid
                        var grid = document.getElementById(section + '-grid');
                        var originalCard = grid ? grid.querySelector('.design-card[data-id="' + id + '"]') : null;
                        if (originalCard) {
                            var deleteLink = originalCard.querySelector('[id*="btnDelete"]');
                            if (deleteLink) {
                                deleteLink.click();
                            } else {
                                // Fallback: use form postback
                                var form = document.getElementById('form1');
                                if (form) {
                                    var hiddenInput = document.createElement('input');
                                    hiddenInput.type = 'hidden';
                                    hiddenInput.name = '__EVENTTARGET';
                                    hiddenInput.value = 'rpMyDesigns';
                                    form.appendChild(hiddenInput);
                                    form.submit();
                                }
                            }
                        }
                    }
                };
                actionsCell.appendChild(deleteBtn);

                var toggleBtn = document.createElement('button');
                toggleBtn.className = 'btn btn-sm ' + (isPublic ? 'btn-warning' : 'btn-success') + ' btn-toggle-public';
                toggleBtn.setAttribute('data-id', id);
                toggleBtn.setAttribute('data-next', isPublic ? 'false' : 'true');
                toggleBtn.textContent = isPublic ? '🔒' : '🌐';
                toggleBtn.title = isPublic ? 'Make private' : 'Make public';
                actionsCell.appendChild(toggleBtn);
            } else {
                var cloneBtn = document.createElement('a');
                cloneBtn.href = cloneUrl;
                cloneBtn.className = 'btn btn-sm btn-primary';
                cloneBtn.textContent = 'Clone';
                actionsCell.appendChild(cloneBtn);
            }
            row.appendChild(actionsCell);

            return row;
        }

        // Initialize theme on load - mặc định dark theme
        function initTheme() {
            var savedTheme = localStorage.getItem('theme') || 'dark';
            applyTheme(savedTheme);
        }

        function applyTheme(theme) {
            if (theme === 'dark') {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                if (document.getElementById('themeIcon')) {
                    document.getElementById('themeIcon').textContent = '☀️';
                    document.getElementById('themeText').textContent = 'Light';
                }
            } else {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                if (document.getElementById('themeIcon')) {
                    document.getElementById('themeIcon').textContent = '🌙';
                    document.getElementById('themeText').textContent = 'Dark';
                }
            }
            localStorage.setItem('theme', theme);
        }

        function toggleTheme(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var currentTheme = localStorage.getItem('theme') || 'dark';
            var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            return false;
        }

        // Initialize theme on load
        initTheme();

        // Modal preview
        var previewModal = null;
        function attachPreviewListeners() {
            if (!previewModal) {
            var previewModalEl = document.getElementById('previewModal');
                if (previewModalEl) {
                    previewModal = new bootstrap.Modal(previewModalEl);
                }
            }
            if (!previewModal) return;

            document.querySelectorAll('.js-preview-thumb').forEach(function(img) {
                // Remove existing listeners to avoid duplicates
                var newImg = img.cloneNode(true);
                img.parentNode.replaceChild(newImg, img);
                newImg.addEventListener('dblclick', function() {
                    var src = this.getAttribute('data-full') || this.src;
                    document.getElementById('imgDesignPreview').src = src;
                previewModal.show();
            });
        });
        }

        document.addEventListener('DOMContentLoaded', function() {
            attachPreviewListeners();
        });

        // Account Settings Modal
        function showAccountModal(tab) {
            var modal = document.getElementById('accountModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Set default tab if not provided
            if (!tab) {
                tab = 'account';
            }
            
            // Switch to the specified tab (this will also call loadAccountInfo if needed)
            switchAccountTab(null, tab);
        }

        function loadAccountInfo(retryCount) {
            // Check if modal is visible before loading
            var modal = document.getElementById('accountModal');
            if (!modal || !modal.classList.contains('show')) {
                console.log('Modal not visible, skipping loadAccountInfo');
                return;
            }
            
            retryCount = retryCount || 0;
            var maxRetries = 5;
            
            $.ajax({
                url: '/Pages/DesignerHome.aspx/GetAccountInfo',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: '{}',
                success: function(response) {
                    if (response.d && response.d.success) {
                        var data = response.d;
                        var userName = data.userName || '';
                        
                        // Set avatar
                        var avatarEl = document.getElementById('accountAvatar');
                        
                        // Check if element exists (modal might not be fully rendered yet)
                        if (!avatarEl) {
                            if (retryCount < maxRetries) {
                                console.warn('Avatar element not found, retrying... (' + (retryCount + 1) + '/' + maxRetries + ')');
                                setTimeout(function() {
                                    loadAccountInfo(retryCount + 1);
                                }, 100);
                            } else {
                                console.error('Avatar element not found after ' + maxRetries + ' retries');
                            }
                            return;
                        }
                        
                        if (data.avatarPath) {
                            // avatarPath đã là absolute path từ server (đã convert ~)
                            var avatarUrl = data.avatarPath + '?t=' + new Date().getTime();
                            // Set background-image cho div và làm nền trong suốt
                            avatarEl.style.backgroundImage = 'url(' + avatarUrl + ')';
                            avatarEl.style.backgroundSize = 'cover';
                            avatarEl.style.backgroundPosition = 'center';
                            avatarEl.style.backgroundRepeat = 'no-repeat';
                            avatarEl.style.backgroundColor = 'transparent'; // Nền trong suốt khi có avatar
                            avatarEl.textContent = '';
                            // Hide img tag if exists
                            var avatarImg = document.getElementById('accountAvatarImg');
                            if (avatarImg) {
                                avatarImg.style.display = 'none';
                            }
                        } else {
                            // Clear background image và set lại màu xanh
                            avatarEl.style.backgroundImage = '';
                            avatarEl.style.backgroundColor = 'var(--primary)'; // Nền màu xanh khi không có avatar
                            avatarEl.textContent = userName.length > 0 ? userName.substring(0, 1).toUpperCase() : '';
                            // Hide img tag if exists
                            var avatarImg = document.getElementById('accountAvatarImg');
                            if (avatarImg) {
                                avatarImg.style.display = 'none';
                            }
                        }
                        
                        // Set profile header
                        var accountFullName = document.getElementById('accountFullName');
                        var accountEmail = document.getElementById('accountEmail');
                        if (accountFullName) accountFullName.textContent = data.fullName || data.userName || '';
                        if (accountEmail) accountEmail.innerHTML = data.email || '<em>Not set</em>';
                        
                        // Set account fields
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
                            : '<span class="account-badge account-badge-default">User</span>';
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
            
            // Update tabs
            document.querySelectorAll('.account-modal-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            document.querySelector('.account-modal-tab[data-tab="' + tab + '"]').classList.add('active');

            // Update content
            document.getElementById('accountTabContent').style.display = tab === 'account' ? 'block' : 'none';
            document.getElementById('securityTabContent').style.display = tab === 'security' ? 'block' : 'none';
            
            if (tab === 'account') {
                loadAccountInfo();
            }
            
            return false;
        }

        // Close modal when clicking outside
        document.getElementById('accountModal').addEventListener('click', function(e) {
            if (e.target === this) {
                hideAccountModal();
            }
        });

        // Upload avatar
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
                        console.log('Upload success, avatarPath:', response.avatarPath);
                        
                        var avatarUrl = response.avatarPath + '?t=' + new Date().getTime();
                        
                        // Update avatar in modal if it's open
                        var modal = document.getElementById('accountModal');
                        if (modal && modal.classList.contains('show')) {
                            var avatarEl = document.getElementById('accountAvatar');
                            if (avatarEl) {
                                // Set background-image cho div và làm nền trong suốt
                                avatarEl.style.backgroundImage = 'url(' + avatarUrl + ')';
                                avatarEl.style.backgroundSize = 'cover';
                                avatarEl.style.backgroundPosition = 'center';
                                avatarEl.style.backgroundRepeat = 'no-repeat';
                                avatarEl.style.backgroundColor = 'transparent'; // Nền trong suốt khi có avatar
                                avatarEl.textContent = '';
                                // Hide img tag if exists
                                var avatarImg = document.getElementById('accountAvatarImg');
                                if (avatarImg) {
                                    avatarImg.style.display = 'none';
                                }
                            }
                            // Reload account info to ensure all data is fresh
                            loadAccountInfo();
                        }
                        
                        // Update avatar in top bar (user-avatar contains litUserInitial)
                        // Find all .user-avatar elements
                        var topBarAvatars = document.querySelectorAll('.user-avatar');
                        topBarAvatars.forEach(function(avatarEl) {
                            // Clear existing content and set new avatar
                            avatarEl.innerHTML = '<img src="' + avatarUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />';
                        });
                        
                        // Also check if litUserInitial exists (server control)
                        var litUserInitialEl = document.querySelector('#<%= litUserInitial.ClientID %>');
                        if (litUserInitialEl) {
                            var parentAvatar = litUserInitialEl.closest('.user-avatar');
                            if (parentAvatar) {
                                parentAvatar.innerHTML = '<img src="' + avatarUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />';
                            }
                        }
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

        // Change password
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

            // Call server method
            $.ajax({
                url: '/Pages/DesignerHome.aspx/ChangePassword',
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

        // Toggle Public/Private
        $(document).on('click', '.btn-toggle-public', function(e) {
            e.preventDefault();
            var $btn = $(this);
            var id = parseInt($btn.data('id'), 10);
            var next = $btn.data('next') === true || $btn.data('next') === "true";

            $.ajax({
                url: '/Pages/DesignerHome.aspx/SetDesignPublic',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({ controlId: id, isPublic: next }),
                success: function() {
                    window.location.reload();
                },
                error: function(xhr) {
                    alert('Lỗi cập nhật trạng thái Public: ' + xhr.responseText);
                }
            });
        });
    </script>
</body>
</html>
