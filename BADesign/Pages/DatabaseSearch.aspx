<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DatabaseSearch.aspx.cs"
    Inherits="BADesign.Pages.DatabaseSearch" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Công cụ Database - HR Helper</title>
    <uc:BaHead runat="server" />
    <link href="../Content/ba-db-tools.css?v=20261123" rel="stylesheet" />
    <style>
.ba-connect-mode {
            margin-top: 0.75rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
        }
        .ba-connect-mode-label {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-right: 0.15rem;
        }
        .ba-connect-mode-btn {
            border: 1px solid var(--border);
            background: var(--bg-card);
            color: var(--text-primary);
            border-radius: 999px;
            padding: 0.35rem 0.7rem;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
        }
        .ba-connect-mode-btn:hover {
            border-color: var(--primary);
            background: var(--bg-hover);
        }
        .ba-connect-mode-btn.active {
            background: var(--primary-soft);
            border-color: var(--primary);
            color: var(--primary-light);
        }
        .ba-form-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .server-modal-row-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .server-modal-full {
            margin-bottom: 1rem;
        }
        @media (max-width: 600px) {
            .server-modal-row-2 { grid-template-columns: 1fr; }
        }
        .server-path-info-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 20px; height: 20px; border-radius: 50%;
            background: var(--primary); color: white; font-size: 0.75rem; font-weight: bold;
            cursor: pointer; margin-left: 6px; flex-shrink: 0;
            border: none; padding: 0; vertical-align: middle;
        }
        .server-path-info-btn:hover { opacity: 0.9; background: var(--primary-hover); }
        .server-path-label-wrap { display: flex; align-items: center; }.ba-input:focus { box-shadow: 0 0 0 2px var(--primary-soft); }
        .ba-input::placeholder { color: var(--text-muted); }
        /* Nút + modal dùng chung từ ba-layout.css */
        .ba-btn-disabled {
            opacity: 0.45;
            cursor: not-allowed;
            pointer-events: none;
            filter: grayscale(0.3);
        }
        /* Lưới, bảng, menu Action, badge, pagination: dùng chung từ ba-layout.css */        .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ba-btn-log { margin-left: 4px; }
        .ba-section-collapsed .ba-card-body { display: none; }
        /* Modal + nút × dùng chung từ ba-layout.css */
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
        #restoreExplorerTable .rex-row.rex-selected { background: rgba(var(--primary-rgb, 59, 130, 246), 0.2); }
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
        #restoreModalBackupSets table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        #restoreModalBackupSets th, #restoreModalBackupSets td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border-color); }
        #restoreModalBackupSets th { color: var(--text-muted); font-weight: 500; }
        /* Sort header cho bảng Database Tools */
        .ba-db-sort-th { cursor: pointer; user-select: none; }
        .ba-db-sort-th:hover { color: var(--primary-light, #0D9EFF); }
        .ba-db-sort-th .ba-sort-icon { font-size: 0.75rem; opacity: 0.8; margin-left: 4px; }
        .ba-db-sort-th.active { color: var(--primary-light, #0D9EFF); }
        .ba-form-label-row { flex-wrap: nowrap !important; display: flex !important; }        .ba-form-label-row .ba-info-wrap { flex-shrink: 0; }
        .ba-form-label-row .ba-form-label { display: inline-flex; align-items: center; }
        .ba-info-icon { vertical-align: middle; }
        .ba-info-icon { display: inline-flex !important; width: 18px !important; height: 18px !important; }        .ba-info-wrap { position: relative !important; }
        .ba-info-popover { position: absolute !important; z-index: 10003 !important; }        /* Restore/Backup modal: giới hạn chiều cao trên laptop, cho phép scroll để thấy hết Email/Password/Phone */
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
                    <div class="ba-db-tabs" id="dbConnectTabs">
                        <button type="button" class="ba-db-tab" id="btnUseServerMethod">Server và Database</button>
                        <button type="button" class="ba-db-tab" id="btnUseConnStrMethod">Connection String</button>
                        <span class="ba-db-tabs-hint">Chọn server rồi tải danh sách database, hoặc dán connection string để kết nối thẳng.</span>
                    </div>
                    <div class="ba-connect-mode" style="display:none">
                        <button type="button" class="ba-connect-mode-btn active" id="btnModeBoth" data-mode="both">Hiện cả 2 cách</button>
                        <button type="button" class="ba-connect-mode-btn" id="btnModeConnStr" data-mode="connstr">Chỉ Cách 1</button>
                        <button type="button" class="ba-connect-mode-btn" id="btnModeServers" data-mode="servers">Chỉ Cách 2</button>
                    </div>
                    <!-- Connection String - thu gọn mặc định -->
                    <div class="ba-card" id="cardConnStr">
                        <div class="ba-card-header">
                            <div class="ba-card-title-wrap">
                                <button type="button" class="ba-toggle-btn" id="toggleConnStr" title="Thu gọn / Mở rộng">▼</button>
                                <h2 class="ba-card-title">Kết nối bằng Connection String</h2>
                            </div>
                        </div>
                        <div class="ba-card-body">
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Dán connection string vào ô bên dưới rồi bấm Connect (Trợ lý HR) hoặc Công cụ PGP. <strong>Không cần thao tác ở phần Danh sách Server.</strong></p>
                            <div class="ba-form-group" style="margin-bottom: 1rem;">
                                <div class="ba-form-label-row">
                                    <label class="ba-form-label" for="txtConnStr">Connection String</label>
                                    <span class="ba-info-wrap">
                                        <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                        <div class="ba-info-popover" style="display: none;">Chuỗi kết nối SQL (Data Source, Initial Catalog, User ID, Password…). Dùng để kết nối trực tiếp tới HR DB mà không cần lưu server trong Cấu hình Server.</div>
                                    </span>
                                </div>
                                <input type="text" id="txtConnStr" class="ba-input" placeholder="Data Source=...;Initial Catalog=...;User ID=...;Password=..." style="width:100%; font-family: Consolas, monospace; font-size: 0.8125rem;" />
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnConnStrConnect" onclick="connectByConnStr(); return false;">Connect (Trợ lý HR)</button>
                            <button type="button" class="ba-btn ba-btn-secondary" id="btnConnStrPgpTool" onclick="connectToPgpToolByConnStr(); return false;" style="margin-left: 0.5rem;">Công cụ PGP</button>
                            <% if (BADesign.LicenseKeyAccess.IsAllowed()) { %>
                            <button type="button" class="ba-btn ba-btn-secondary" id="btnConnStrLicenseKey" onclick="connectToLicenseKeyByConnStr(); return false;" style="margin-left: 0.5rem;">Khóa bản quyền</button>
                            <% } %>
                        </div>
                    </div>
                    <!-- Server config (chỉ khi đăng nhập + có quyền DatabaseSearch) -->
                    <div class="ba-card" id="cardServers">
                        <div class="ba-card-header">
                            <div class="ba-card-title-wrap">
                                <button type="button" class="ba-toggle-btn" id="toggleServers" title="Thu gọn / Mở rộng">▼</button>
                                <h2 class="ba-card-title">Danh sách Server</h2>
                            </div>
                            <div class="ba-card-tools">
                                <div class="ba-search-wrap">
                                    <input type="text" id="searchServers" class="ba-input ba-search-inp" placeholder="Tìm server..." />
                                </div>
                                <span id="addServerWrap"><button type="button" class="ba-btn ba-btn-primary" onclick="showAddServerModal(); return false;">+ Thêm server</button></span>
                            </div>
                        </div>
                        <div class="ba-card-body">
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Danh sách các Server mà bạn có quyền truy cập. Có thể connect tất cả hoặc chọn 1 server rồi bấm &quot;Connect&quot; để load database. <strong>Không cần nhập Connection String.</strong></p>
                            <p style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 0.75rem;">Load danh sách Database: dùng để connect và load danh sách database từ <code translate="yes">tất cả server</code> mà bạn có quyền.</p>
                            <div style="margin-bottom: 1rem;">
                                <button type="button" class="ba-btn ba-btn-primary" id="btnLoadDb" onclick="loadDatabases(); return false;">
                                    <span class="btn-text">Load danh sách Database</span>
                                </button>
                            </div>
                            <div class="ba-table-wrap">
                                <table class="ba-table">
                                    <thead>
                                        <tr>
                                            <th class="ba-db-sort-th" data-server-sort="serverName">Server <span class="ba-sort-icon">↕</span></th>
                                            <th class="ba-db-sort-th" data-server-sort="port">Port <span class="ba-sort-icon">↕</span></th>
                                            <th class="ba-db-sort-th" data-server-sort="username">User <span class="ba-sort-icon">↕</span></th>
                                            <th class="ba-db-sort-th" data-server-sort="status">Status <span class="ba-sort-icon">↕</span></th>
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
                            <p id="dbListDesc" style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.4rem;">Danh sách các Database của Server. Bấm Connect Database để mở Trợ lý HR.</p>
                            <div style="margin-bottom: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                                <button type="button" class="ba-btn ba-btn-primary ba-btn-sm <%= !CanBackup ? "ba-btn-disabled" : "" %>" id="btnBackupDb" onclick="if (typeof canBackup !== 'undefined' && !canBackup) return; showBackupModal(); return false;" title="<%= CanBackup ? "Backup database (chọn server + database)" : "Cần quyền Backup database" %>">Backup database</button>
                                <button type="button" class="ba-btn ba-btn-primary ba-btn-sm <%= !CanRestore ? "ba-btn-disabled" : "" %>" id="btnRestoreDb" onclick="if (typeof canRestore !== 'undefined' && !canRestore) return; showRestoreModalStandalone(); return false;" title="<%= CanRestore ? "Restore từ file backup lên server" : "Cần quyền Restore database" %>">Restore database</button>
                                <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm <%= !CanShrinkLog ? "ba-btn-disabled" : "" %>" id="btnLoadLogAll" onclick="if (typeof canShrinkLog !== 'undefined' && !canShrinkLog) return; loadLogInfoAll(); return false;" title="<%= CanShrinkLog ? "Lấy dung lượng log cho tất cả database" : "Cần quyền Shrink log" %>">Lấy thông tin log (tất cả)</button>
                            </div>
                            <div class="ba-table-wrap">
                                <table class="ba-table">
                                    <thead>
                                        <tr>
                                            <th class="ba-db-sort-th" data-db-sort="server">Server <span class="ba-sort-icon">↕</span></th>
                                            <th class="ba-db-sort-th" data-db-sort="database">Database <span class="ba-sort-icon">↕</span></th>
                                            <th class="ba-db-sort-th" data-db-sort="username">User <span class="ba-sort-icon">↕</span></th>
                                            <th class="ba-db-sort-th" data-db-sort="logSize">Dung lượng log <span class="ba-sort-icon">↕</span></th>
                                            <th class="ba-db-sort-th" data-db-sort="restoreReset">Restore / Làm sạch <span class="ba-sort-icon">↕</span></th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblResults">
                                        <tr><td colspan="6" class="ba-empty"><div class="ba-empty-state" id="dbEmptyState"><span class="ba-empty-state-icon" aria-hidden="true">🔍</span><span>Chưa load. Bấm <a href="#" class="ba-empty-state-link" id="dbEmptyStateLink">Load danh sách Database</a> ở trên.</span></div></td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="ba-pagination" id="pagerDatabases"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <!-- Add/Edit Server Modal -->
        <div id="serverModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 680px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="serverModalTitle">Thêm server</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideServerModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body">
                    <input type="hidden" id="serverModalId" />
                    <div class="server-modal-row-2">
                        <div class="ba-form-group">
                            <div class="ba-form-label-row">
                                <label class="ba-form-label" for="serverModalServerName">Server *</label>
                                <span class="ba-info-wrap">
                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                    <div class="ba-info-popover" style="display: none;">Tên hoặc địa chỉ SQL Server (vd. localhost, 192.168.1.10, hoặc tên instance HRS05\SQL2022).</div>
                                </span>
                            </div>
                            <input type="text" id="serverModalServerName" class="ba-input" placeholder="vd: localhost hoặc 192.168.1.10" />
                        </div>
                        <div class="ba-form-group">
                            <div class="ba-form-label-row">
                                <label class="ba-form-label" for="serverModalPort">Port</label>
                                <span class="ba-info-wrap">
                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                    <div class="ba-info-popover" style="display: none;">Cổng kết nối SQL (mặc định 1433). Để trống nếu dùng port mặc định.</div>
                                </span>
                            </div>
                            <input type="number" id="serverModalPort" class="ba-input" placeholder="1433 (để trống = mặc định)" min="1" max="65535" />
                        </div>
                    </div>
                    <div class="server-modal-row-2">
                        <div class="ba-form-group">
                            <div class="ba-form-label-row">
                                <label class="ba-form-label" for="serverModalUsername">Username *</label>
                                <span class="ba-info-wrap">
                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                    <div class="ba-info-popover" style="display: none;">Tài khoản đăng nhập SQL Server (vd. sa hoặc user có quyền đọc DB).</div>
                                </span>
                            </div>
                            <input type="text" id="serverModalUsername" class="ba-input" placeholder="vd: sa" />
                        </div>
                        <div class="ba-form-group">
                            <div class="ba-form-label-row">
                                <label class="ba-form-label" for="serverModalPassword">Password *</label>
                                <span class="ba-info-wrap">
                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                    <div class="ba-info-popover" style="display: none;">Mật khẩu đăng nhập. Khi sửa server, để trống nếu không đổi mật khẩu.</div>
                                </span>
                            </div>
                            <input type="password" id="serverModalPassword" class="ba-input" placeholder="Mật khẩu (để trống nếu sửa và không đổi)" />
                        </div>
                    </div>
                    <div class="server-modal-full">
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="serverModalDisplayName">Tên hiển thị (tùy chọn)</label>
                            <input type="text" id="serverModalDisplayName" class="ba-input" maxlength="200" placeholder="vd: SQL 2022 – restore database khách hàng" />
                        </div>
                    </div>
                    <div class="server-modal-full">
                        <div class="ba-form-group">
                            <label class="ba-form-label server-path-label-wrap" for="serverModalBackupPath">
                                Thư mục backup
                                <button type="button" class="server-path-info-btn" title="Xem hướng dẫn" data-path="backup">i</button>
                            </label>
                            <div class="sv-path-row">
                                <input type="text" id="serverModalBackupPath" class="ba-input" placeholder="vd: D:\SQLBAK\BACKUP" spellcheck="false" />
                                <button type="button" class="ba-btn ba-btn-secondary" id="serverModalDetectBtn" title="Lấy thư mục backup mặc định của SQL Server">Tự dò</button>
                            </div>
                            <span class="rw-field-note">Nơi SQL Server ghi file .bak: đường dẫn trên máy SQL Server hoặc UNC. Để trống thì server này không backup được từ web.</span>
                        </div>
                    </div>
                    <div class="server-modal-full">
                        <div class="ba-form-group">
                            <label class="ba-form-label server-path-label-wrap" for="serverModalRestorePath">
                                Thư mục restore
                                <button type="button" class="server-path-info-btn" title="Xem hướng dẫn" data-path="restore">i</button>
                            </label>
                            <input type="text" id="serverModalRestorePath" class="ba-input" placeholder="vd: \\Hrs05\sqlbak — nơi mọi người chép file .bak vào" spellcheck="false" />
                            <span class="rw-field-note">Nơi đặt file .bak để chọn khi restore. Để trống = dùng thư mục backup.</span>
                        </div>
                    </div>
                    <div class="server-modal-full" id="serverModalRolesWrap" style="display:none;">
                        <div class="ba-form-group">
                            <label class="ba-form-label">Role được dùng server này</label>
                            <div class="sv-role-list" id="serverModalRoles"></div>
                            <span class="rw-field-note">User thuộc role được chọn sẽ thấy server này trong Công cụ Database.</span>
                        </div>
                    </div>
                    <div class="sv-actions">
                        <button type="button" class="ba-btn ba-btn-secondary" id="serverModalProbeBtn">Kiểm tra cấu hình</button>
                        <button type="button" class="ba-btn ba-btn-secondary" id="serverModalWriteTestBtn" title="SQL Server ghi thử một file backup nhỏ vào thư mục backup rồi xóa">Thử ghi file</button>
                    </div>
                    <div class="rw-checks sv-check-list" id="serverModalChecks" style="display:none;"></div>
                </div>
                <div class="ba-modal-footer rw-footer">
                    <span class="rw-footer-hint" id="serverModalHint"></span>
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideServerModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="serverModalSaveBtn" onclick="saveServer(); return false;">Lưu</button>
                </div>
            </div>
        </div>

        <!-- Path Info Modal (tooltip định nghĩa đường dẫn backup/restore) -->
        <div id="pathInfoModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 520px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="pathInfoModalTitle">Đường dẫn backup</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hidePathInfoModal(); return false;">×</button>
                </div>
                <div class="ba-modal-body" id="pathInfoModalBody" style="font-size: 0.875rem; line-height: 1.6; color: var(--text-secondary); white-space: pre-line;"></div>
                <div class="ba-modal-footer">
                    <button type="button" class="ba-btn ba-btn-primary" onclick="hidePathInfoModal(); return false;">Đóng</button>
                </div>
            </div>
        </div>

        <!-- Scan Log Modal -->
        <div id="scanLogModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 560px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Log load database</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" id="scanLogClose" style="display:none;">×</button>
                </div>
                <div class="ba-modal-body">
                    <pre id="scanLogPre" class="ba-log-pre">Đang Load Database...</pre>
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
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="closeErrorDetail(); return false;">×</button>
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
                <div class="ba-multidb-overlay-title">Đang load database trên server</div>
                <div class="ba-multidb-overlay-text">Đang lấy danh sách database có ST_ProjectInfo...<br />Vui lòng chờ, không click nhiều lần.</div>
            </div>
        </div>

        <!-- Restore loading overlay (che trang khi bấm Restore, ẩn khi có kết quả) -->
        <div id="restoreOverlay" class="ba-multidb-overlay">
            <div class="ba-multidb-overlay-content">
                <div class="ba-multidb-spinner"></div>
                <div class="ba-multidb-overlay-title">Đang bắt đầu Restore</div>
                <div class="ba-multidb-overlay-text">Vui lòng chờ, không bấm nhiều lần.<br />Restore chạy nền — xem tiến độ tại biểu tượng chuông.</div>
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

        <!-- Delete database loading overlay -->
        <div id="deleteDbOverlay" class="ba-multidb-overlay">
            <div class="ba-multidb-overlay-content">
                <div class="ba-multidb-spinner"></div>
                <div class="ba-multidb-overlay-title">Đang xóa database</div>
                <div class="ba-multidb-overlay-text">Vui lòng chờ, không bấm nhiều lần.</div>
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
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideShrinkLogModal(); return false;">×</button>
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

        <!-- Backup database modal (giống MS SQL Server Studio: General + Options) -->
        <div id="backupModal" class="ba-modal">
            <div class="ba-modal-content rw-modal" style="max-width: 640px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="backupModalTitle">Backup database</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideBackupModal(); return false;">×</button>
                </div>
                <div class="rw-body">
                    <div class="ba-form-group">
                        <label class="ba-form-label" for="backupModalServer">Server</label>
                        <select id="backupModalServer" class="ba-input" style="min-height: 36px;"></select>
                        <div class="rw-field-note" id="backupModalDestPath"></div>
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label" for="backupModalDbFilter">Database cần backup</label>
                        <input type="text" id="backupModalDbFilter" class="ba-input" placeholder="Lọc theo tên database..." autocomplete="off" spellcheck="false" />
                        <div id="backupModalDatabaseList" class="ba-db-list-box"></div>
                        <div class="rw-field-note"><a href="#" id="backupModalSelectAllDb">Chọn tất cả</a> · <a href="#" id="backupModalDeselectAllDb">Bỏ chọn</a> · <span id="backupModalSelectedCount">Chưa chọn database nào</span></div>
                        <div class="rw-field-note">Mỗi database backup ra một file <code translate="yes">{tên_db}_{ngày_giờ}.bak</code> trong thư mục backup của server.</div>
                    </div>
                    <details class="rw-advanced">
                        <summary>Tùy chọn nâng cao</summary>
                        <div class="rw-advanced-body">
                            <div class="ba-form-group">
                                <label class="ba-form-label" for="backupModalStripeCount">Số file (chia nhỏ backup)</label>
                                <input type="number" id="backupModalStripeCount" class="ba-input" value="1" min="1" max="64" style="width: 90px;" />
                                <div class="rw-field-note">1 = một file .bak. Từ 2 trở lên: chia thành nhiều file, khi restore phải chọn đủ các file đó.</div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Hết hạn backup set</label>
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.8125rem; color: var(--text-secondary);">
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0;font-weight:400;"><input type="radio" name="backupExpire" id="backupExpireAfter" checked /> Sau</label>
                                    <input type="number" id="backupExpireDays" class="ba-input" value="0" min="0" style="width: 80px;" />
                                    <span>ngày (0 = không hết hạn)</span>
                                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0;font-weight:400;"><input type="radio" name="backupExpire" id="backupExpireOn" /> Vào ngày</label>
                                    <input type="date" id="backupExpireDate" class="ba-input" style="width: 160px;" />
                                </div>
                            </div>
                            <label class="rw-confirm"><input type="checkbox" id="backupModalCompress" checked /><span>Nén backup<small>File nhỏ hơn và thường nhanh hơn. Nên bật.</small></span></label>
                            <label class="rw-confirm"><input type="checkbox" id="backupModalCopyOnly" /><span>Copy-only<small>Backup độc lập, không ảnh hưởng chuỗi backup log của database.</small></span></label>
                            <label class="rw-confirm"><input type="checkbox" id="backupModalVerify" /><span>Kiểm tra file sau khi backup<small>Chạy RESTORE VERIFYONLY trên file vừa tạo.</small></span></label>
                            <label class="rw-confirm"><input type="checkbox" id="backupModalChecksum" /><span>Tính checksum khi ghi</span></label>
                            <label class="rw-confirm"><input type="checkbox" id="backupModalContinueOnError" /><span>Tiếp tục khi gặp lỗi<small>Dùng kèm checksum.</small></span></label>
                            <label class="rw-confirm" style="margin-bottom:0;"><input type="checkbox" id="backupModalShrinkLog" /><span>Shrink log sau khi backup<small>Thu nhỏ file log của database nguồn.</small></span></label>
                        </div>
                    </details>
                </div>
                <div class="ba-modal-footer rw-footer">
                    <span class="rw-footer-hint" id="backupModalHint"></span>
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideBackupModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="backupModalConfirm" onclick="doBackupFromModal(); return false;">Backup</button>
                </div>
            </div>
        </div>

        <div id="restoreModal" class="ba-modal">
            <div class="ba-modal-content rw-modal">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Restore database</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideRestoreModal(); return false;">×</button>
                </div>
                <ol class="rw-steps" id="restoreWizardSteps">
                    <li class="rw-step is-active" data-step="1"><span class="rw-step-no">1</span><span class="rw-step-text">Chọn file backup</span></li>
                    <li class="rw-step" data-step="2"><span class="rw-step-no">2</span><span class="rw-step-text">Database đích</span></li>
                    <li class="rw-step" data-step="3"><span class="rw-step-no">3</span><span class="rw-step-text">Làm sạch dữ liệu</span></li>
                </ol>
                <div class="rw-body">
                    <div class="rw-page" id="restoreWizardPage1">
                        <h4 class="rw-page-title">Restore từ file nào, lên server nào?</h4>
                        <p class="rw-page-sub">File .bak phải nằm trong thư mục restore của server đích.</p>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="restoreModalServer">Server đích</label>
                            <select id="restoreModalServer" class="ba-input" style="min-height: 36px;"></select>
                            <div class="rw-field-note" id="restoreWizardServerNote"></div>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">File backup (.bak)</label>
                            <div class="rw-file-row">
                                <div class="rw-file-box" id="restoreModalSelectedFile">Chưa chọn file</div>
                                <button type="button" class="ba-btn ba-btn-primary" id="restoreModalBrowseBtn" onclick="openRestoreFileExplorer(); return false;">Chọn file backup...</button>
                            </div>
                            <div id="restoreModalSelectedFilePathWrap" class="rw-field-note" style="display:none;">Đường dẫn: <span id="restoreModalSelectedFilePath"></span></div>
                            <input type="hidden" id="restoreModalFileValue" value="" />
                            <input type="hidden" id="restoreModalFileListJson" value="" />
                            <span id="restoreModalNoFiles" style="display:none; color: var(--text-muted); font-size: 0.8125rem; margin-top: 4px;" class="ba-block">Chọn server trước.</span>
                        </div>
                        <div class="rw-checks" id="restoreWizardPrecheck" style="display:none;"></div>
                        <div class="ba-form-group" id="restoreModalBackupSetsWrap" style="display: none;">
                            <label class="ba-form-label">File chứa nhiều backup set — chọn set cần restore</label>
                            <div id="restoreModalBackupSets" style="border: 1px solid var(--border); border-radius: 6px; background: var(--bg-darker); max-height: 160px; overflow: auto;"></div>
                        </div>
                    </div>
                    <div class="rw-page" id="restoreWizardPage2" style="display:none;">
                        <h4 class="rw-page-title">Database đích tên gì?</h4>
                        <p class="rw-page-sub">Đặt tên mới để tạo database mới, hoặc nhập tên database bạn đã restore trước đó để ghi đè.</p>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="restoreModalToDatabase">Tên database đích</label>
                            <input type="text" id="restoreModalToDatabase" class="ba-input" maxlength="120" autocomplete="off" spellcheck="false" placeholder="vd: ECA-02_PRO_20260325" />
                        </div>
                        <div class="rw-checks" id="restoreWizardTargetStatus" style="display:none;"></div>
                        <label class="rw-confirm is-danger" id="restoreWizardOverwriteWrap" style="display:none;">
                            <input type="checkbox" id="restoreModalReplace" />
                            <span>Tôi hiểu database <strong id="restoreWizardOverwriteName"></strong> sẽ bị ghi đè toàn bộ.<small>Dữ liệu hiện có của database này sẽ mất, không khôi phục được.</small></span>
                        </label>
                        <details class="rw-advanced">
                            <summary>Tùy chọn nâng cao</summary>
                            <div class="rw-advanced-body">
                                <div class="ba-form-group">
                                    <label class="ba-form-label" for="restoreModalRecovery">Recovery state</label>
                                    <select id="restoreModalRecovery" class="ba-input" style="min-height: 36px;">
                                        <option value="RECOVERY">RECOVERY — Database sẵn sàng dùng (mặc định)</option>
                                        <option value="NORECOVERY">NORECOVERY — Còn restore thêm log/diff sau</option>
                                        <option value="STANDBY">STANDBY — Chỉ đọc tạm</option>
                                    </select>
                                </div>
                                <label class="rw-confirm" style="margin-bottom:0;">
                                    <input type="checkbox" id="restoreModalShrinkLog" checked />
                                    <span>Shrink log sau khi restore<small>Thu nhỏ file log để tiết kiệm dung lượng đĩa trên server.</small></span>
                                </label>
                            </div>
                        </details>
                    </div>
                    <div class="rw-page" id="restoreWizardPage3" style="display:none;">
                        <h4 class="rw-page-title">Làm sạch dữ liệu khách hàng</h4>
                        <p class="rw-page-sub">Chạy ngay sau khi restore xong, trước khi database được dùng.</p>
                        <div class="rw-alert is-danger" id="restoreWizardSkipWarning" style="display:none;">Bạn đang bỏ qua bước làm sạch. Database sẽ chứa nguyên email, số điện thoại, mật khẩu, lương và cấu hình gửi mail của khách hàng.</div>
                        <ul class="rw-checklist" id="restoreWizardChecklist">
                            <li data-item="outbound">Email server và SFTP trỏ về cấu hình thử nghiệm; <strong>xóa hàng đợi mail</strong>, token, lịch sử mật khẩu và khóa tích hợp.</li>
                            <li data-item="accounts"><strong>Mật khẩu</strong> của mọi user đặt về mật khẩu chung bên dưới, mở khóa tài khoản.</li>
                            <li data-item="contact"><strong>Email, số điện thoại</strong> (kể cả cột mã hóa) thay bằng giá trị bên dưới.</li>
                            <li data-item="salary"><strong>Lương cơ bản</strong> thay bằng giá trị giả ngẫu nhiên; số liệu lương, thuế, bảo hiểm đã tính đưa về 0.</li>
                        </ul>
                        <div class="rw-grid-2" id="restoreWizardSanitizeFields">
                            <div class="ba-form-group rw-span-2">
                                <label class="ba-form-label" for="restoreModalResetEmail">Email thay thế <span style="color: var(--danger);">*</span></label>
                                <input type="text" id="restoreModalResetEmail" class="ba-input" autocomplete="off" spellcheck="false" placeholder="vd: an.nh@cadena.com.sg" />
                                <div class="rw-field-note" id="restoreWizardEmailNote"></div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label" for="restoreModalResetPassword">Mật khẩu đăng nhập chung</label>
                                <input type="text" id="restoreModalResetPassword" class="ba-input" autocomplete="off" spellcheck="false" />
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label" for="restoreModalResetPhone">Số điện thoại thay thế</label>
                                <input type="text" id="restoreModalResetPhone" class="ba-input" autocomplete="off" spellcheck="false" />
                            </div>
                            <div class="ba-form-group rw-span-2" id="restoreWizardSalaryRange">
                                <label class="ba-form-label" for="restoreModalSalaryMin">Khoảng lương giả</label>
                                <div class="rw-range">
                                    <input type="number" id="restoreModalSalaryMin" class="ba-input" min="0" step="1" />
                                    <span>đến</span>
                                    <input type="number" id="restoreModalSalaryMax" class="ba-input" min="0" step="1" />
                                </div>
                                <div class="rw-field-note">Mỗi nhân viên nhận một mức lương ngẫu nhiên trong khoảng này. Giá trị mặc định lấy từ Cài đặt ứng dụng.</div>
                            </div>
                        </div>
                        <div id="restoreWizardPrivileged" style="display:none;">
                            <label class="rw-confirm is-warn">
                                <input type="checkbox" id="restoreModalKeepSalary" />
                                <span>Giữ lương và số liệu lương thật<small>Chỉ dùng khi cần tái hiện lỗi tính lương. Email, điện thoại, mật khẩu vẫn được làm sạch.</small></span>
                            </label>
                            <label class="rw-confirm is-danger">
                                <input type="checkbox" id="restoreModalSkipSanitize" />
                                <span>Bỏ qua làm sạch dữ liệu<small>Không khuyến nghị. Chỉ người quản lý server mới thấy tùy chọn này.</small></span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="rw-summary" id="restoreWizardSummary" style="display:none;"></div>
                <div class="ba-modal-footer rw-footer">
                    <span class="rw-footer-hint" id="restoreWizardHint"></span>
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideRestoreModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-secondary" id="restoreWizardBack">Quay lại</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="restoreWizardNext">Tiếp tục</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="restoreModalConfirm">Restore</button>
                </div>
            </div>
        </div>

        <!-- Popup Explorer: trái = cây thư mục, phải = breadcrumb + nút Back + danh sách file -->
        <div id="restoreFileExplorerModal" class="ba-modal">
            <div class="ba-modal-content" style="max-width: 1180px; width: 96%; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="ba-modal-header" style="flex-shrink:0;">
                    <h3 class="ba-modal-title">Chọn file backup (.bak)</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="closeRestoreFileExplorer(); return false;">×</button>
                </div>
                <div style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                    <input type="text" id="restoreExplorerSearch" class="ba-input" placeholder="Tìm theo tên (vd: EMI01)" style="width: 200px;" />
                    <button type="button" class="ba-btn ba-btn-primary ba-btn-sm" onclick="restoreExplorerSearchRun(); return false;">Tìm</button>
                    <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" onclick="restoreExplorerBrowseRoot(); return false;">Về thư mục gốc</button>
                </div>
                <div style="flex: 1; display: flex; overflow: hidden; min-height: 300px;">
                    <div id="restoreExplorerTreeWrap" style="width: 240px; border-right: 1px solid var(--border); overflow-y: auto; padding: 8px; flex-shrink: 0; background: var(--bg-darker);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">Thư mục</div>
                        <div id="restoreExplorerTree"></div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;">
                        <div style="padding: 6px 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                            <button type="button" id="restoreExplorerUpBtn" class="ba-btn ba-btn-secondary" style="padding: 4px 10px; min-width: 36px;" title="Lên folder cha">↑</button>
                            <div id="restoreExplorerBreadcrumb" style="font-size: 0.8125rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
                        </div>
                        <div style="flex: 1; overflow: auto;">
                            <table class="ba-table" id="restoreExplorerTable" style="margin: 0;">
                                <thead>
                                    <tr>
                                        <th style="cursor:pointer;" data-sort="name">Tên</th>
                                        <th style="cursor:pointer;white-space:nowrap;min-width:130px;" data-sort="date">Ngày sửa đổi</th>
                                        <th style="cursor:pointer;white-space:nowrap;min-width:100px;" data-sort="type">Loại</th>
                                        <th style="cursor:pointer;text-align:right;white-space:nowrap;min-width:90px;" data-sort="size">Kích thước</th>
                                    </tr>
                                </thead>
                                <tbody id="restoreExplorerTbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div style="padding: 6px 12px; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <span>Click file .bak để chọn 1 file · <strong>Ctrl+Click</strong> nhiều file .bak để restore từ backup đã chia (cùng backup set)</span>
                    <span id="restoreExplorerSelectedCount" style="display:none; color: var(--primary); font-weight: 500;">Đã chọn <span id="restoreExplorerSelectedN">0</span> file</span>
                    <button type="button" id="restoreExplorerApplyBtn" class="ba-btn ba-btn-primary ba-btn-sm" style="display:none;">Áp dụng</button>
                </div>
            </div>
        </div>

        <div id="sanitizeModal" class="ba-modal">
            <div class="ba-modal-content rw-modal" style="max-width: 640px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title">Làm sạch dữ liệu</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideSanitizeModal(); return false;">×</button>
                </div>
                <div class="rw-body">
                    <p class="rw-page-sub">Database: <strong id="sanitizeModalTarget" style="color: var(--text-primary);"></strong></p>
                    <div class="rw-alert is-warn">Thao tác này ghi đè dữ liệu trong database và không hoàn tác được. Chỉ dùng cho bản sao database khách hàng trên server nội bộ.</div>
                    <ul class="rw-checklist" id="sanitizeModalChecklist">
                        <li data-item="outbound">Email server và SFTP trỏ về cấu hình thử nghiệm; <strong>xóa hàng đợi mail</strong>, token, lịch sử mật khẩu và khóa tích hợp.</li>
                        <li data-item="accounts"><strong>Mật khẩu</strong> của mọi user đặt về mật khẩu chung bên dưới, mở khóa tài khoản.</li>
                        <li data-item="contact"><strong>Email, số điện thoại</strong> (kể cả cột mã hóa) thay bằng giá trị bên dưới.</li>
                        <li data-item="salary"><strong>Lương cơ bản</strong> thay bằng giá trị giả ngẫu nhiên; số liệu lương, thuế, bảo hiểm đã tính đưa về 0.</li>
                    </ul>
                    <div class="rw-grid-2">
                        <div class="ba-form-group rw-span-2">
                            <label class="ba-form-label" for="sanitizeModalEmail">Email thay thế <span style="color: var(--danger);">*</span></label>
                            <input type="text" id="sanitizeModalEmail" class="ba-input" autocomplete="off" spellcheck="false" />
                            <div class="rw-field-note" id="sanitizeModalEmailNote"></div>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="sanitizeModalPassword">Mật khẩu đăng nhập chung</label>
                            <input type="text" id="sanitizeModalPassword" class="ba-input" autocomplete="off" spellcheck="false" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label" for="sanitizeModalPhone">Số điện thoại thay thế</label>
                            <input type="text" id="sanitizeModalPhone" class="ba-input" autocomplete="off" spellcheck="false" />
                        </div>
                        <div class="ba-form-group rw-span-2" id="sanitizeModalSalaryRange">
                            <label class="ba-form-label" for="sanitizeModalSalaryMin">Khoảng lương giả</label>
                            <div class="rw-range">
                                <input type="number" id="sanitizeModalSalaryMin" class="ba-input" min="0" step="1" />
                                <span>đến</span>
                                <input type="number" id="sanitizeModalSalaryMax" class="ba-input" min="0" step="1" />
                            </div>
                        </div>
                    </div>
                    <div id="sanitizeModalPrivileged" style="display:none;">
                        <label class="rw-confirm is-warn" style="margin-bottom:0;">
                            <input type="checkbox" id="sanitizeModalKeepSalary" />
                            <span>Giữ lương và số liệu lương thật<small>Chỉ dùng khi cần tái hiện lỗi tính lương. Email, điện thoại, mật khẩu vẫn được làm sạch.</small></span>
                        </label>
                    </div>
                </div>
                <div class="ba-modal-footer rw-footer">
                    <span class="rw-footer-hint" id="sanitizeModalHint"></span>
                    <button type="button" class="ba-btn ba-btn-secondary" onclick="hideSanitizeModal(); return false;">Hủy</button>
                    <button type="button" class="ba-btn ba-btn-primary" id="sanitizeModalConfirm">Làm sạch</button>
                </div>
            </div>
        </div>

        <!-- Confirm modal (giống Designer Home) -->
        <div id="confirmModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-content" style="max-width: 440px;">
                <div class="ba-modal-header">
                    <h3 class="ba-modal-title" id="confirmModalTitle">Xác nhận</h3>
                    <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" onclick="hideConfirmModal(); return false;">×</button>
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
        var canUseServers = <%= CanUseServers ? "true" : "false" %>;
        var canManageServers = <%= CanManageServers ? "true" : "false" %>;
        var canBulkReset = <%= CanBulkReset ? "true" : "false" %>;
        var servers = [];
        var results = [];
        var databasesScannedOnce = false;
        var serverStatuses = {};
        var canBackup = <%= (CanBackup ? "true" : "false") %>;
        var canRestore = <%= (CanRestore ? "true" : "false") %>;
        var canDelete = <%= (CanDelete ? "true" : "false") %>;
        var canShrinkLog = <%= (CanShrinkLog ? "true" : "false") %>;
        var currentUserName = '<%= System.Web.HttpUtility.JavaScriptStringEncode(CurrentUserName ?? "") %>';
        var PAGE_SIZE_OPTS = [50, 100, 500, 1000, 5000, 10000];
        var serverPageSize = 100;
        var dbPageSize = 100;
        var serverPage = 1;
        var dbPage = 1;
        var dbSort = { key: 'server', dir: 1 }; // dir: 1 asc, -1 desc
        var serverSort = { key: 'serverName', dir: 1 };

        function showToast(msg, type) { BaToast.show(msg, type); }

        function filteredServers() {
            var q = ($('#searchServers').val() || '').toLowerCase().trim();
            if (!q) return servers;
            return servers.filter(function(s) {
                var sn = (s.serverName || '').toLowerCase();
                var dn = (s.displayName || '').toLowerCase();
                var un = (s.username || '').toLowerCase();
                var pt = (s.port != null ? String(s.port) : '');
                return sn.indexOf(q) >= 0 || dn.indexOf(q) >= 0 || un.indexOf(q) >= 0 || pt.indexOf(q) >= 0;
            });
        }

        function serverSortText(v) {
            return String(v == null ? '' : v).toLowerCase();
        }

        function sortServers(list) {
            var key = serverSort.key || 'serverName';
            var dir = serverSort.dir === -1 ? -1 : 1;
            return list.slice().sort(function(a, b) {
                var av, bv;
                if (key === 'port') {
                    av = (a.port == null || a.port === '' ? -1 : Number(a.port));
                    bv = (b.port == null || b.port === '' ? -1 : Number(b.port));
                } else if (key === 'username') {
                    av = serverSortText(a.username);
                    bv = serverSortText(b.username);
                } else if (key === 'status') {
                    av = serverSortText(serverStatuses[a.id] === true ? 'connected' : 'disconnected');
                    bv = serverSortText(serverStatuses[b.id] === true ? 'connected' : 'disconnected');
                } else {
                    av = serverSortText(a.serverName);
                    bv = serverSortText(b.serverName);
                }
                if (av < bv) return -1 * dir;
                if (av > bv) return 1 * dir;
                var as = serverSortText(a.serverName), bs = serverSortText(b.serverName);
                if (as < bs) return -1;
                if (as > bs) return 1;
                return 0;
            });
        }

        function updateServerSortHeaders() {
            var $ths = $('#cardServers thead th[data-server-sort]');
            $ths.removeClass('active');
            $ths.find('.ba-sort-icon').text('↕');
            var $active = $ths.filter('[data-server-sort="' + serverSort.key + '"]');
            if ($active.length) {
                $active.addClass('active');
                $active.find('.ba-sort-icon').text(serverSort.dir === 1 ? '↑' : '↓');
            }
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

        function dbSortText(v) {
            return String(v == null ? '' : v).toLowerCase();
        }

        function dbSortRestoreKey(r) {
            var tRestore = parseDateSafe(r.lastRestoredAt);
            var tReset = parseDateSafe(r.lastResetAt);
            var tr = tRestore ? tRestore.getTime() : 0;
            var ts = tReset ? tReset.getTime() : 0;
            return Math.max(tr, ts);
        }

        function sortDbResults(list) {
            var key = dbSort.key || 'server';
            var dir = dbSort.dir === -1 ? -1 : 1;
            return list.slice().sort(function(a, b) {
                var av, bv;
                if (key === 'logSize') {
                    av = (a.logSizeMb == null ? -1 : Number(a.logSizeMb));
                    bv = (b.logSizeMb == null ? -1 : Number(b.logSizeMb));
                } else if (key === 'restoreReset') {
                    av = dbSortRestoreKey(a);
                    bv = dbSortRestoreKey(b);
                } else if (key === 'database') {
                    av = dbSortText(a.database);
                    bv = dbSortText(b.database);
                } else if (key === 'username') {
                    av = dbSortText(a.username);
                    bv = dbSortText(b.username);
                } else {
                    av = dbSortText(a.server);
                    bv = dbSortText(b.server);
                }
                if (av < bv) return -1 * dir;
                if (av > bv) return 1 * dir;
                // Tie-break để thứ tự ổn định
                var as = dbSortText(a.server), bs = dbSortText(b.server);
                if (as < bs) return -1;
                if (as > bs) return 1;
                var ad = dbSortText(a.database), bd = dbSortText(b.database);
                if (ad < bd) return -1;
                if (ad > bd) return 1;
                return 0;
            });
        }

        function updateDbSortHeaders() {
            var $ths = $('#cardDatabases thead th[data-db-sort]');
            $ths.removeClass('active');
            $ths.find('.ba-sort-icon').text('↕');
            var $active = $ths.filter('[data-db-sort="' + dbSort.key + '"]');
            if ($active.length) {
                $active.addClass('active');
                $active.find('.ba-sort-icon').text(dbSort.dir === 1 ? '↑' : '↓');
            }
        }

        function renderServers() {
            var $tb = $('#tblServers');
            var $pg = $('#pagerServers');
            var list = sortServers(filteredServers());
            updateServerSortHeaders();
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
                    statusCell = '<span class="ba-status-none" title="Chưa load">—</span>';
                } else if (st.ok) {
                    statusCell = '<span class="ba-status-ok" title="OK: ' + baEscapeHtml(st.dbCount) + ' database">✓</span>';
                } else if (st.pending) {
                    statusCell = '<span class="ba-status-none" title="Đang chờ load">...</span>';
                } else {
                    statusCell = '<span class="ba-status-fail" title="Lỗi">✕</span> ' +
                        '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-btn-log" data-id="' + s.id + '" title="Xem log lỗi">Log</button>';
                }
                var address = baEscapeHtml(s.serverName || '-');
                var displayName = baEscapeHtml((s.displayName || '').trim());
                var nameCell = displayName
                    ? '<div style="font-weight:600;">' + displayName + '</div><div style="font-size:0.78rem;color:var(--text-muted);">' + address + '</div>'
                    : address;
                var backupReady = !!(s.backupPath || '').trim();
                var restoreReady = backupReady || !!(s.restorePath || '').trim();
                var pills = '<span class="ba-pill ' + (backupReady ? 'is-ok' : 'is-warn') + '" title="' + (backupReady ? baEscapeHtml(s.backupPath) : 'Chưa có thư mục backup: không backup được từ web') + '">' + (backupReady ? 'Backup ✓' : 'Chưa cấu hình backup') + '</span> ' +
                    '<span class="ba-pill ' + (restoreReady ? 'is-ok' : 'is-warn') + '" title="' + (restoreReady ? baEscapeHtml(s.restorePath || s.backupPath) : 'Chưa có thư mục restore: không restore được từ web') + '">' + (restoreReady ? 'Restore ✓' : 'Chưa cấu hình restore') + '</span>';
                var menuHeader = '<div class="ba-actions-menu-header" title="' + address + '"><strong>' + (displayName || address) + '</strong></div>';
                var menuBtns = '<button type="button" class="ba-btn ba-btn-primary ba-btn-sm ba-sv-scan" data-id="' + s.id + '"><span class="ba-action-icon">🔍</span> Connect</button>';
                if (canBulkReset) menuBtns += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-multidb-btn ba-sv-multidb" data-id="' + s.id + '" title="Connect Multi-DB Reset"><span class="ba-action-icon">🗃️</span> Multi-DB</button>';
                if (canManageServers) {
                    menuBtns = '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-sv-edit" data-id="' + s.id + '"><span class="ba-action-icon">✏️</span> Sửa</button>' + menuBtns +
                        '<button type="button" class="ba-btn ba-btn-danger ba-btn-sm ba-sv-delete" data-id="' + s.id + '"><span class="ba-action-icon">🗑️</span> Xóa</button>';
                }
                var actions = '<div class="ba-actions-dropdown-wrap"><button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-actions-trigger" aria-haspopup="true" aria-expanded="false" title="Thao tác">Action</button><div class="ba-actions-menu">' + menuHeader + '<div class="ba-actions-menu-body">' + menuBtns + '</div></div></div>';
                html += '<tr data-id="' + s.id + '">' +
                    '<td>' + nameCell + '<div style="margin-top:4px;">' + pills + '</div></td>' +
                    '<td>' + (s.port != null ? baEscapeHtml(s.port) : '-') + '</td>' +
                    '<td>' + baEscapeHtml(s.username || '-') + '</td>' +
                    '<td>' + statusCell + '</td>' +
                    '<td><div class="ba-actions">' + actions + '</div></td></tr>';
            });
            $tb.html(html);
            $tb.find('.ba-sv-scan').on('click', function() { scanServer(parseInt($(this).data('id'), 10)); });
            $tb.find('.ba-sv-multidb').on('click', function() { connectMultiDb(parseInt($(this).data('id'), 10)); });
            $tb.find('.ba-sv-edit').on('click', function() { editServer(parseInt($(this).data('id'), 10)); });
            $tb.find('.ba-sv-delete').on('click', function() {
                var id = parseInt($(this).data('id'), 10);
                var target = servers.filter(function(x) { return x.id === id; })[0];
                deleteServer(id, target ? target.serverName : '');
            });
            $tb.find('.ba-actions-trigger').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openActionsMenu($(this));
            });
            $tb.find('.ba-actions-menu .ba-btn').on('click', function() { closeActionsMenus(); });
            $(document).off('click.baActionsClose').on('click.baActionsClose', function(e) {
                if (!$(e.target).closest('.ba-actions-dropdown-wrap').length && !$(e.target).closest('.ba-actions-menu').length) closeActionsMenus();
            });
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

        function closeActionsMenus() {
            $('.ba-actions-dropdown-wrap').removeClass('ba-actions-open');
            $('.ba-actions-trigger').attr('aria-expanded', 'false');
            $('.ba-actions-menu').css({ position: '', top: '', left: '', right: '', zIndex: '' });
        }

        function openActionsMenu($trigger) {
            if (!$trigger || !$trigger.length) return;
            var $wrap = $trigger.closest('.ba-actions-dropdown-wrap');
            if (!$wrap.length) return;
            var alreadyOpen = $wrap.hasClass('ba-actions-open');
            closeActionsMenus();
            if (alreadyOpen) return;
            $wrap.addClass('ba-actions-open');
            $trigger.attr('aria-expanded', 'true');
            var $menu = $wrap.find('.ba-actions-menu').first();
            if (!$menu.length) return;
            var rect = $trigger[0].getBoundingClientRect();
            var menuWidth = Math.max($menu.outerWidth() || 220, 220);
            var left = rect.right - menuWidth;
            if (left < 8) left = 8;
            var top = rect.bottom + 4;
            var viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
            var menuHeight = $menu.outerHeight() || 260;
            if (top + menuHeight > viewportH - 8) top = Math.max(8, rect.top - menuHeight - 4);
            $menu.css({ position: 'fixed', top: top + 'px', left: left + 'px', right: 'auto', zIndex: 13050 });
        }

        var pathInfoContent = {
            backup: 'Định nghĩa: Là thư mục mà SQL Server ghi file .bak khi chạy BACKUP.\n\nCách hoạt động:\n• Lệnh BACKUP chạy trên máy SQL Server\n• SQL Server ghi file vào path đó\n• SQL Server service account cần quyền Ghi (Write)\n\nVí dụ:\n• Local trên máy SQL: E:\\SQLDATA2\\SQL2022\\MSSQL16.SQL2022\\MSSQL\\Backup\n• UNC share: \\\\HRS05\\BackupShare (share mà SQL Server có quyền ghi)\n\nLấy path: Trong SSMS, khi Backup chọn thư mục đích (vd: E:\\...\\Backup) rồi copy nguyên path đó vào cấu hình.',
            restore: 'Định nghĩa: Là thư mục chứa file .bak để liệt kê và chọn khi restore.\n\nCách hoạt động:\n1. Ưu tiên: Liệt kê qua SQL Server (xp_cmdshell) → path trên máy SQL (hoặc UNC mà SQL Server truy cập được). SQL Server cần quyền Đọc (Read).\n2. Fallback: Máy web đọc trực tiếp → path phải là UNC hoặc drive mà máy web truy cập được (vd: \\\\HRS05\\sqlbak).\n\nNếu để trống: Dùng Đường dẫn backup.\n\nVí dụ:\n• Cùng thư mục backup: E:\\SQLDATA2\\...\\Backup\n• UNC share: \\\\HRS05\\sqlbak (share chứa file .bak)'
        };
        function showPathInfoModal(path) {
            var title = path === 'backup' ? 'Đường dẫn backup (tùy chọn)' : 'Đường dẫn restore (tùy chọn)';
            var body = pathInfoContent[path] || '';
            $('#pathInfoModalTitle').text(title);
            $('#pathInfoModalBody').text(body);
            $('#pathInfoModal').addClass('show');
        }
        function hidePathInfoModal() {
            $('#pathInfoModal').removeClass('show');
        }

        function deleteServer(id, serverName) {
            var msg = (serverName && String(serverName).trim()) ? 'Xóa server "' + String(serverName) + '"? Hành động không thể hoàn tác.' : 'Xóa server này? Hành động không thể hoàn tác.';
            showConfirmModal('Xác nhận', msg, function() {
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

        var scanLogPreEl = null;

        function scanAjaxErrorMessage(xhr) {
            var msg = 'Lỗi kết nối hoặc timeout.';
            if (!xhr || !xhr.responseText) return msg;
            try {
                var json = JSON.parse(xhr.responseText);
                if (json.d && json.d.message) msg = json.d.message;
                else if (json.message) msg = json.message;
            } catch (e) {
                if (xhr.responseText.indexOf('Authentication') >= 0 || xhr.responseText.indexOf('Session') >= 0) {
                    msg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                    setTimeout(function() { window.location.href = '<%= ResolveUrl("~/Login") %>'; }, 2000);
                }
            }
            return msg;
        }

        function showScanLog(initialText) {
            var txt = initialText != null ? initialText : 'Đang Load Database...';
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

        function showConfirmModal(title, message, onConfirm, onCancel, okText, useHtml, cancelText) {
            $('#confirmModalTitle').text(title || 'Xác nhận');
            if (useHtml) {
                $('#confirmModalMessage').html(message);
            } else {
                $('#confirmModalMessage').text(message);
            }
            $('#confirmModal').addClass('show').css('display', 'flex');
            $('#confirmModalCancel').show().text(cancelText || 'Hủy');
            $('#confirmModalOk').text(okText || 'OK');
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
                if ($d.length) $d.text('Kết quả Load Database tất cả server. Bấm Connect để mở Trợ lý HR.');
            } else if (mode === 'single' && serverName) {
                $t.text('Danh sách database của ' + serverName);
                if ($d.length) $d.text('Kết quả Load Database ' + serverName + '. Bấm Connect để mở Trợ lý HR.');
            } else {
                $t.text('Danh sách Database');
                if ($d.length) $d.text('Kết quả sau khi Load Database. Bấm Connect để mở Trợ lý HR.');
            }
        }

        function runScan(serverId) {
            var $btn = $('#btnLoadDb');
            var $text = $btn.find('.btn-text');
            $btn.prop('disabled', true);

            if (serverId != null) {
                var s = servers.filter(function(x) { return x.id === serverId; })[0];
                var serverDisplay = (s && s.serverName) ? s.serverName + (s.port != null && String(s.port) !== '' ? ',' + s.port : '') : ('ID ' + serverId);
                var initialMsg = 'Đang Load Database server: ' + serverDisplay + '\n\n' +
                    'Đang kết nối và liệt kê database, kiểm tra ST_ProjectInfo.\n' +
                    'Lần đầu có thể mất vài chục giây nếu server có nhiều database; các lần sau nhanh hơn.';
                showScanLog(initialMsg);
                $text.html('<span class="spinner"></span> Đang Load Database...');
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
                        $text.text('Load danh sách Database');
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
                            showToast(d && d.message ? d.message : 'Lỗi khi Load Database.', 'error');
                        }
                    },
                    error: function(xhr, status, err) {
                        clearInterval(heartbeatInterval);
                        $btn.prop('disabled', false);
                        $text.text('Load danh sách Database');
                        var msg = scanAjaxErrorMessage(xhr);
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
                showToast('Chưa có server để Load Database.', 'error');
                return;
            }

            $text.html('<span class="spinner"></span> Đang Load Database...');
            showScanLog('Đang Load Database ' + list.length + ' server cùng lúc.\n\nĐang kết nối và liệt kê database, kiểm tra ST_ProjectInfo.\n');

            results = [];
            list.forEach(function(s) {
                serverStatuses[s.id] = { ok: false, message: 'Đang tải...', dbCount: 0, pending: true };
            });
            renderServers();

            var allHeartbeat = setInterval(function() {
                if (scanLogPreEl) scanLogPreEl.textContent = (scanLogPreEl.textContent || '') + '.';
            }, 2000);

            function finishAllScan(failMessage) {
                clearInterval(allHeartbeat);
                list.forEach(function(s) {
                    var st = serverStatuses[s.id];
                    if (st && st.pending) serverStatuses[s.id] = { ok: false, message: failMessage || 'Không nhận được kết quả.', dbCount: 0 };
                });
                $btn.prop('disabled', false);
                $text.text('Load danh sách Database');
                $('#scanLogClose, #scanLogDone').show();
                renderServers();
                renderResults();
                if (scanLogPreEl) scanLogPreEl.scrollTop = scanLogPreEl.scrollHeight;
            }

            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/LoadDatabases") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: null }),
                timeout: 300000,
                success: function(res) {
                    var d = (res && res.d) ? res.d : res;
                    if (!d || !d.success) {
                        var failMessage = (d && d.message) ? d.message : 'Lỗi khi Load Database.';
                        appendScanLog(['', 'Lỗi: ' + failMessage]);
                        finishAllScan(failMessage);
                        showToast(failMessage, 'error');
                        return;
                    }
                    results = d.list || [];
                    (d.serverStatuses || []).forEach(function(st) {
                        serverStatuses[st.id] = { ok: st.ok, message: st.message || '', dbCount: st.dbCount || 0 };
                    });
                    databasesScannedOnce = true;
                    appendScanLog([''].concat(d.log || [], ['Hoàn thành.']));
                    updateDbListLabel('all');
                    finishAllScan('');
                    saveScanState('all', null, null, results, serverStatuses);
                    showToast('Đã load ' + results.length + ' database.', 'success');
                },
                error: function(xhr) {
                    var msg = scanAjaxErrorMessage(xhr);
                    appendScanLog(['', 'Lỗi: ' + msg]);
                    finishAllScan(msg);
                    showToast(msg, 'error');
                }
            });
        }

        function loadDatabases() { runScan(null); }
        function scanServer(id) { runScan(id); }

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
                        var fileValue = (path && (path === name || path.endsWith('\\' + name))) ? path : (path ? path + '\\' + name : name);
                        $val.val(fileValue);
                        $sel.text('Đã chọn: ' + name).css('color', 'var(--text-primary)');
                        $('#restoreModalSelectedFilePath').text(fileValue);
                        $('#restoreModalSelectedFilePathWrap').show();
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
                    $wrap.toggle(sets.length > 1);
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
            var dt = parseDateSafe(d);
            if (!dt || isNaN(dt.getTime())) return '—';
            var pad = function(n) { return n < 10 ? '0' + n : String(n); };
            return pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '/' + dt.getFullYear() + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
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
            window.restoreExplorerSelectedFiles = [];
            $('#restoreExplorerApplyBtn').hide();
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
        function applyRestoreExplorerFileList(list) {
            if (!list || list.length === 0) return;
            $('#restoreModalFileValue').val(list[0]);
            $('#restoreModalFileListJson').val(list.length > 1 ? JSON.stringify(list) : '');
            var displayText = list.length > 1 ? ('Đã chọn ' + list.length + ' file') : ('Đã chọn: ' + (list[0].split('\\').pop() || list[0]));
            $('#restoreModalSelectedFile').text(displayText).css('color', 'var(--text-primary)');
            $('#restoreModalSelectedFilePath').text(list.length === 1 ? list[0] : (list.slice(0, 3).join('; ') + (list.length > 3 ? '; ...' : '')));
            $('#restoreModalSelectedFilePathWrap').show();
            loadRestoreModalBackupSets(parseInt($('#restoreModalServer').val(), 10), list[0]);
            window.restoreExplorerSelectedFiles = [];
            $('#restoreExplorerApplyBtn').hide();
            $('#restoreExplorerSelectedCount').hide();
            closeRestoreFileExplorer();
            if (window.baRestoreWizard) window.baRestoreWizard.onFilesChosen();
        }
        function restoreExplorerBrowseRoot() {
            restoreExplorerCurrentPath = '';
            restoreExplorerLoadFolder('');
        }
        function restoreExplorerRootPath() {
            var serverId = parseInt($('#restoreModalServer').val(), 10);
            var server = servers.filter(function(s) { return s.id === serverId; })[0];
            if (!server) return '';
            return (server.restorePath || '').trim() || (server.backupPath || '').trim();
        }
        function restoreExplorerRootLabel() {
            return restoreExplorerRootPath() || 'Thư mục restore';
        }
        function restoreExplorerRootName() {
            var parts = restoreExplorerRootPath().split('\\').filter(function(p) { return p; });
            return parts.length ? parts[parts.length - 1] : 'Thư mục restore';
        }

        function renderRestoreExplorerTree() {
            var serverId = parseInt($('#restoreModalServer').val(), 10);
            if (!serverId) return;
            var rootPath = '';
            var html = buildRestoreExplorerTreeNode(serverId, rootPath, restoreExplorerRootName(), 0, true);
            $('#restoreExplorerTree').html(html || '<div style="padding:4px;color:var(--text-muted);font-size:0.8125rem;">Đang tải...</div>');
            $('#restoreExplorerTree .rex-tree-expand').on('click', function(e) {
                e.stopPropagation();
                var path = $(this).closest('.rex-tree-item').attr('data-path') || '';
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
                var path = $(this).closest('.rex-tree-item').attr('data-path') || '';
                restoreExplorerLoadFolder(path);
            });
            $('#restoreExplorerTree .rex-tree-item').each(function() {
                var path = $(this).attr('data-path') || '';
                if (path === restoreExplorerCurrentPath) $(this).addClass('rex-tree-selected');
            });
        }
        function buildRestoreExplorerTreeNode(serverId, path, label, level, isRoot) {
            var expanded = !!restoreExplorerTreeExpanded[path];
            var children = restoreExplorerTreeCache[path];
            var hasChildren = children && children.length > 0;
            var indent = (level || 0) * 14;
            var pathAttr = baEscapeHtml(path);
            var labelEsc = baEscapeHtml(label);
            var titleEsc = baEscapeHtml(isRoot ? restoreExplorerRootLabel() : label);
            var caret = hasChildren || isRoot
                ? ('<span class="rex-tree-expand" title="' + (expanded ? 'Thu gọn' : 'Mở rộng') + '">' + (expanded ? '▼' : '▶') + '</span>')
                : '<span class="rex-tree-expand" style="visibility:hidden;">▶</span>';
            var row = '<div class="rex-tree-item" data-path="' + pathAttr + '" style="padding-left:' + indent + 'px;">' + caret + '<span class="rex-tree-label" title="' + titleEsc + '">' + labelEsc + '</span></div>';
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
                        $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;color:var(--danger);">' + baEscapeHtml(d && d.message ? d.message : 'Lỗi') + '</td></tr>');
                        return;
                    }
                    restoreExplorerCurrentPath = (d.currentPath || '').trim();
                    restoreExplorerTreeCache[restoreExplorerCurrentPath] = (d.folders || []).map(function(item) {
                        return { name: (item && item.name !== undefined) ? item.name : item };
                    });
                    restoreExplorerTreeExpanded[restoreExplorerCurrentPath] = true;
                    var parts = restoreExplorerCurrentPath ? restoreExplorerCurrentPath.split('\\') : [];
                    var bcHtml = '<span class="rex-bc" data-path="">' + baEscapeHtml(restoreExplorerRootLabel()) + '</span>';
                    for (var i = 0; i < parts.length; i++) {
                        var p = parts.slice(0, i + 1).join('\\');
                        bcHtml += ' <span style="color:var(--text-muted);">›</span> <span class="rex-bc" data-path="' + baEscapeHtml(p) + '">' + baEscapeHtml(parts[i]) + '</span>';
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
            $('#restoreExplorerBreadcrumb').text(q ? 'Kết quả tìm: "' + q + '"' : restoreExplorerRootLabel());
            $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;color:var(--text-muted);">Đang tìm...</td></tr>');
            if (!q) { restoreExplorerBrowseRoot(); return; }
            $('#restoreExplorerUpBtn').hide();
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/SearchBackupFiles") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, searchText: q }),
                success: function(res) {
                    var d = res.d || res;
                    if (!d || !d.success) {
                        $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;">' + baEscapeHtml(d && d.message ? d.message : 'Lỗi') + '</td></tr>');
                        return;
                    }
                    restoreExplorerRows = (d.items || []).map(function(x) {
                        return { type: 'file', name: x.name, relativePath: x.relativePath || '', lastWriteTime: x.lastWriteTime, size: x.size, showFolder: true };
                    });
                    restoreExplorerRenderTable();
                },
                error: function() {
                    $('#restoreExplorerTbody').html('<tr><td colspan="4" style="padding:16px;">Lỗi tìm kiếm.</td></tr>');
                }
            });
        }
        function restoreExplorerRowTime(row) {
            var dt = parseDateSafe(row.lastWriteTime);
            return dt && !isNaN(dt.getTime()) ? dt.getTime() : 0;
        }
        function restoreExplorerRowFileValue($row) {
            var name = $row.attr('data-name') || '';
            var rel = $row.attr('data-relpath') || '';
            if (!rel) return name;
            return (rel === name || rel.slice(-(name.length + 1)) === '\\' + name) ? rel : rel + '\\' + name;
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
                    return dir * (restoreExplorerRowTime(a) - restoreExplorerRowTime(b));
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
                var typeStr = row.type === 'folder' ? 'Thư mục' : (row.type === 'parent' ? '' : 'File .bak');
                var icon = row.type === 'parent' ? '↑ ' : (row.type === 'folder' ? '📁 ' : '📄 ');
                var nameHtml = icon + baEscapeHtml(row.name);
                if (row.showFolder) {
                    var folder = String(row.relativePath || '').split('\\').slice(0, -1).join('\\');
                    nameHtml += '<div class="rex-file-folder">' + baEscapeHtml(folder || restoreExplorerRootLabel()) + '</div>';
                }
                html += '<tr class="rex-row" data-type="' + row.type + '" data-name="' + baEscapeHtml(row.name) + '" data-relpath="' + baEscapeHtml(row.relativePath || '') + '" style="cursor:pointer;">';
                html += '<td>' + nameHtml + '</td>';
                html += '<td style="white-space:nowrap;">' + formatDate(row.lastWriteTime) + '</td>';
                html += '<td>' + typeStr + '</td>';
                html += '<td style="text-align:right;">' + (row.type === 'file' ? formatSize(row.size) : '—') + '</td></tr>';
            });
            if (!html) html = '<tr><td colspan="4" style="padding:16px;color:var(--text-muted);">Không có mục nào.</td></tr>';
            $('#restoreExplorerTbody').html(html);
            $('#restoreExplorerTbody .rex-row').on('click', function(e) {
                var $row = $(this);
                var typ = $row.attr('data-type');
                if (typ === 'parent') {
                    var parts = restoreExplorerCurrentPath.split('\\');
                    parts.pop();
                    restoreExplorerLoadFolder(parts.join('\\'));
                    return;
                }
                if (typ === 'folder') {
                    var folderName = $row.attr('data-name') || '';
                    restoreExplorerLoadFolder(restoreExplorerCurrentPath ? restoreExplorerCurrentPath + '\\' + folderName : folderName);
                    return;
                }
                if (typ === 'file') {
                    var fileValue = restoreExplorerRowFileValue($row);
                    if (e.ctrlKey || e.metaKey) {
                        window.restoreExplorerSelectedFiles = window.restoreExplorerSelectedFiles || [];
                        var idx = window.restoreExplorerSelectedFiles.indexOf(fileValue);
                        if (idx >= 0) window.restoreExplorerSelectedFiles.splice(idx, 1);
                        else window.restoreExplorerSelectedFiles.push(fileValue);
                        window.restoreExplorerSelectedFiles.sort();
                        if (window.restoreExplorerSelectedFiles.length === 0) {
                            $('#restoreExplorerApplyBtn').hide();
                            $('#restoreExplorerSelectedCount').hide();
                        } else {
                            $('#restoreExplorerSelectedN').text(window.restoreExplorerSelectedFiles.length);
                            $('#restoreExplorerSelectedCount').show();
                            $('#restoreExplorerApplyBtn').show().off('click').on('click', function() {
                                var list = window.restoreExplorerSelectedFiles;
                                if (list.length > 1) {
                                    var msg = 'Bạn đang chọn <strong>nhiều file .bak</strong>. Chỉ đúng khi đây là các file được tạo trong <strong>cùng một lần bấm Backup</strong> (khi backup bạn đã chọn "Số file" = 2, 3, … 9 nên ra nhiều file như db_20250317_1.bak, db_20250317_2.bak, …).<br><br><strong>Không đúng</strong> nếu bạn chọn nhiều file từ nhiều lần backup khác nhau (ví dụ: một file backup tháng 3 + một file backup tháng 2). Chọn nhầm như vậy khi Restore sẽ <strong>bị lỗi</strong>.';
                                    showConfirmModal('Xác nhận nhiều file', msg, function() {
                                        applyRestoreExplorerFileList(list);
                                    }, null, 'Đúng, cùng một backup set', true);
                                    return;
                                }
                                applyRestoreExplorerFileList(list);
                            });
                        }
                        $('#restoreExplorerTbody .rex-row[data-type="file"]').each(function() {
                            $(this).toggleClass('rex-selected', window.restoreExplorerSelectedFiles.indexOf(restoreExplorerRowFileValue($(this))) >= 0);
                        });
                        return;
                    }
                    applyRestoreExplorerFileList([fileValue]);
                }
            });
            $('#restoreExplorerBreadcrumb .rex-bc').on('click', function() {
                restoreExplorerLoadFolder($(this).attr('data-path') || '');
            });
        }

        function baEscapeHtml(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function baServerLabel(s) {
            var address = (s.serverName || ('ID ' + s.id)) + (s.port != null ? ',' + s.port : '');
            var name = (s.displayName || '').trim();
            return name ? name + ' (' + address + ')' : address;
        }

        var backupModalDbRequest = 0;

        function fillBackupModalServerDropdown() {
            var $sel = $('#backupModalServer').empty();
            $sel.append($('<option/>').val('').text('-- Chọn server --'));
            servers.forEach(function(s) {
                var ready = !!(s.backupPath || '').trim();
                var $option = $('<option/>').val(String(s.id)).text(baServerLabel(s) + (ready ? '' : ' — chưa cấu hình thư mục backup'));
                if (!ready) $option.prop('disabled', true);
                $sel.append($option);
            });
        }

        function setBackupModalDatabaseMessage(message) {
            $('#backupModalDatabaseList').empty().append($('<div class="ba-db-list-empty"/>').text(message));
            updateBackupModalSelection();
        }

        function renderBackupModalDatabases(names, preselect) {
            if (!names.length) {
                setBackupModalDatabaseMessage('Server này không có database HRM nào.');
                return;
            }
            var $list = $('#backupModalDatabaseList').empty();
            names.forEach(function(name) {
                var $checkbox = $('<input type="checkbox" name="backupModalDb" />').val(name).prop('checked', !!preselect && name === preselect);
                $list.append($('<label/>').attr('data-name', name.toLowerCase()).append($checkbox).append($('<span/>').text(name)));
            });
            applyBackupModalDbFilter();
            updateBackupModalSelection();
        }

        function fillBackupModalDatabaseDropdown(serverId, preselect) {
            var requestId = ++backupModalDbRequest;
            $('#backupModalDbFilter').val('');
            if (!serverId) {
                setBackupModalDatabaseMessage('Chọn server để xem danh sách database.');
                return;
            }
            var known = results.filter(function(r) { return r.serverId === serverId && r.database; }).map(function(r) { return r.database; });
            if (known.length) {
                renderBackupModalDatabases(known, preselect);
                return;
            }
            setBackupModalDatabaseMessage('Đang tải danh sách database...');
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetServerDatabases") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId })
            }).done(function(res) {
                if (requestId !== backupModalDbRequest) return;
                var d = res.d || res;
                if (!d || !d.success) {
                    setBackupModalDatabaseMessage((d && d.message) ? d.message : 'Không tải được danh sách database.');
                    return;
                }
                renderBackupModalDatabases((d.databases || []).map(function(x) { return x.name; }), preselect);
            }).fail(function() {
                if (requestId !== backupModalDbRequest) return;
                setBackupModalDatabaseMessage('Lỗi kết nối khi tải danh sách database.');
            });
        }

        function applyBackupModalDbFilter() {
            var keyword = ($('#backupModalDbFilter').val() || '').trim().toLowerCase();
            $('#backupModalDatabaseList label').each(function() {
                $(this).toggle(!keyword || String($(this).attr('data-name') || '').indexOf(keyword) >= 0);
            });
        }

        function updateBackupModalSelection() {
            var n = $('#backupModalDatabaseList input[name=backupModalDb]:checked').length;
            var serverId = parseInt($('#backupModalServer').val(), 10);
            var hint = !serverId ? 'Chọn server.' : (n ? '' : 'Chọn ít nhất một database.');
            $('#backupModalSelectedCount').text(n ? ('Đã chọn ' + n + ' database') : 'Chưa chọn database nào');
            $('#backupModalHint').text(hint);
            $('#backupModalConfirm').prop('disabled', !!hint);
        }

        function showBackupModal(serverId, databaseName) {
            fillBackupModalServerDropdown();
            var preferred = serverId != null ? servers.filter(function(x) { return x.id === serverId; })[0] : null;
            var sid = preferred && (preferred.backupPath || '').trim() ? preferred.id : null;
            $('#backupModalServer').val(sid ? String(sid) : '');
            $('#backupModal details.rw-advanced').prop('open', false);
            fillBackupModalDatabaseDropdown(sid, databaseName || '');
            updateBackupModalDestPath();
            $('#backupModal').addClass('show');
        }

        function hideBackupModal() {
            $('#backupModal').removeClass('show');
        }

        function updateBackupModalDestPath() {
            var serverId = parseInt($('#backupModalServer').val(), 10);
            var s = servers.filter(function(x) { return x.id === serverId; })[0];
            var $note = $('#backupModalDestPath');
            if (!s) {
                var anyReady = servers.some(function(x) { return !!(x.backupPath || '').trim(); });
                $note.text(anyReady ? '' : 'Chưa có server nào được cấu hình thư mục backup. Nhờ người quản lý server thiết lập ở mục Sửa server.');
                return;
            }
            $note.html('File backup sẽ ghi vào: <span class="rw-path">' + baEscapeHtml((s.backupPath || '').trim()) + '</span>');
        }

        function doBackupFromModal() {
            var serverId = parseInt($('#backupModalServer').val(), 10);
            var selected = $('#backupModalDatabaseList input[name=backupModalDb]:checked').map(function() { return $(this).val().trim(); }).get().filter(Boolean);
            var withShrinkLog = $('#backupModalShrinkLog').is(':checked');
            var expireDays = parseInt($('#backupExpireDays').val(), 10);
            var expireDate = $('#backupExpireOn').is(':checked') ? ($('#backupExpireDate').val() || '') : '';
            if (!$('#backupExpireOn').is(':checked')) expireDate = '';
            var copyOnly = $('#backupModalCopyOnly').is(':checked');
            var compression = $('#backupModalCompress').is(':checked');
            var checksum = $('#backupModalChecksum').is(':checked');
            var verifyBackup = $('#backupModalVerify').is(':checked');
            var continueOnError = $('#backupModalContinueOnError').is(':checked');
            if (!serverId) {
                showToast('Chọn server.', 'error');
                return;
            }
            if (selected.length === 0) {
                showToast('Chọn ít nhất một database.', 'error');
                return;
            }
            if ($('#backupExpireOn').is(':checked') && !expireDate) {
                showToast('Chọn ngày hết hạn của backup set.', 'error');
                return;
            }
            var $btn = $('#backupModalConfirm');
            $btn.prop('disabled', true);
            var done = 0, failed = 0, total = selected.length;
            var firstErrorMsg = '';
            function runNext(idx) {
                if (idx >= total) {
                    $btn.prop('disabled', false);
                    if (failed === 0)
                        showToast('Đã đưa ' + total + ' database vào hàng đợi backup. Xem chuông thông báo.', 'success');
                    else {
                        var msg = 'Đã đưa ' + (total - failed) + '/' + total + ' vào hàng đợi. ' + failed + ' lỗi.';
                        if (firstErrorMsg) msg += ' ' + firstErrorMsg;
                        showToast(msg, failed === total ? 'error' : 'warning');
                    }
                    hideBackupModal();
                    if (typeof loadRestoreJobsPanel === 'function') loadRestoreJobsPanel();
                    return;
                }
                var databaseName = selected[idx];
                var stripeCount = parseInt($('#backupModalStripeCount').val(), 10);
                if (isNaN(stripeCount) || stripeCount < 1) stripeCount = 1;
                if (stripeCount > 64) stripeCount = 64;
                var payload = {
                    serverId: serverId,
                    databaseName: databaseName,
                    withShrinkLog: withShrinkLog,
                    expireDays: isNaN(expireDays) ? 0 : Math.max(0, expireDays),
                    expireDate: expireDate || null,
                    copyOnly: copyOnly,
                    compression: compression,
                    checksum: checksum,
                    verifyBackup: verifyBackup,
                    continueOnError: continueOnError,
                    stripeCount: stripeCount
                };
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/StartBackup") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({ requestJson: JSON.stringify(payload) }),
                    timeout: 30000,
                    success: function(res) {
                        var d = res.d || res;
                        if (d && d.success) { done++; }
                        else {
                            failed++;
                            if (!firstErrorMsg && d && d.message) firstErrorMsg = d.message;
                        }
                        runNext(idx + 1);
                    },
                    error: function(xhr, status, err) {
                        failed++;
                        var errText = '';
                        if (xhr.responseJSON) {
                            errText = xhr.responseJSON.Message || xhr.responseJSON.message || xhr.responseJSON.ExceptionMessage || '';
                        }
                        if (!errText && xhr.responseText) {
                            var t = xhr.responseText.substring(0, 300);
                            if (t.indexOf('"Message"') >= 0) {
                                var m = t.match(/"Message"\s*:\s*"([^"]*)"/);
                                if (m) errText = m[1];
                            }
                            if (!errText) errText = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 120);
                        }
                        if (!firstErrorMsg && errText) firstErrorMsg = errText;
                        runNext(idx + 1);
                    }
                });
            }
            runNext(0);
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
                var $overlay = $('#deleteDbOverlay');
                $overlay.addClass('show');
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
                    },
                    complete: function() {
                        $overlay.removeClass('show');
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

        function connectToPgpTool(serverId, databaseName) {
            $.ajax({
                url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/PrepareConnectByServerAndDb") %>',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({ serverId: serverId, databaseName: databaseName || '' }),
                success: function(res) {
                    var d = res.d || res;
                    if (d && d.success && d.token) {
                        window.location.href = '<%= ResolveUrl("~/PgpTool") %>?k=' + encodeURIComponent(d.token);
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
            var list = sortDbResults(filteredResults());
            updateDbSortHeaders();
            if (!list.length) {
                var emptyHtml;
                if (!databasesScannedOnce) {
                    emptyHtml = '<tr><td colspan="6" class="ba-empty"><div class="ba-empty-state"><span class="ba-empty-state-icon" aria-hidden="true">🔍</span><span>Chưa load. Bấm <a href="#" class="ba-empty-state-link" id="dbEmptyStateLink">Load danh sách Database</a> ở trên.</span></div></td></tr>';
                } else {
                    emptyHtml = '<tr><td colspan="6" class="ba-empty"><div class="ba-empty-state"><span class="ba-empty-state-icon" aria-hidden="true">📭</span><span>Không có database nào. Kiểm tra server đã thêm và thử lại. </span><a href="#" class="ba-empty-state-link" id="dbEmptyStateLink">Load lại</a></div></td></tr>';
                }
                $tb.html(emptyHtml);
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
                    var dbLabel = baEscapeHtml(r.database);
                    var serverLabel = baEscapeHtml(r.server);
                    var menuHeader = '<div class="ba-actions-menu-header" title="' + serverLabel + ' \\ ' + dbLabel + '"><strong>' + dbLabel + '</strong></div>';
                    var menuBtns = '';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-primary ba-btn-sm ba-connect-btn" data-idx="' + globalIdx + '" title="Connect Trợ lý HR"><span class="ba-action-icon">🔗</span> Connect</button>';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-pgptool-btn" data-idx="' + globalIdx + '" title="Mở Công cụ PGP với database này"><span class="ba-action-icon">🔒</span> Công cụ PGP</button>';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-load-log-btn ' + (canShrinkLog ? '' : 'ba-btn-disabled') + '" data-idx="' + globalIdx + '" title="' + (canShrinkLog ? 'Lấy dung lượng log' : 'Cần quyền Shrink log') + '"><span class="ba-action-icon">📄</span> Lấy log</button>';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-backup-btn ' + (canBackup ? '' : 'ba-btn-disabled') + '" data-idx="' + globalIdx + '" title="' + (canBackup ? 'Backup' : 'Cần quyền Backup') + '"><span class="ba-action-icon">☁️</span> Backup</button>';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-restore-btn ' + (canRestore ? '' : 'ba-btn-disabled') + '" data-idx="' + globalIdx + '" title="' + (canRestore ? 'Restore' : 'Cần quyền Restore') + '"><span class="ba-action-icon">🗄️</span> Restore</button>';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-sanitize-btn ' + ((canRestore || canBulkReset) ? '' : 'ba-btn-disabled') + '" data-idx="' + globalIdx + '" title="' + ((canRestore || canBulkReset) ? 'Làm sạch email, điện thoại, mật khẩu, lương' : 'Cần quyền Restore hoặc Bulk Reset') + '"><span class="ba-action-icon">🧹</span> Làm sạch</button>';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-shrink-log-btn ' + (canShrinkLog ? '' : 'ba-btn-disabled') + '" data-idx="' + globalIdx + '" title="' + (canShrinkLog ? 'Shrink log' : 'Cần quyền Shrink log') + '"><span class="ba-action-icon">📉</span> Shrink log</button>';
                    menuBtns += '<button type="button" class="ba-btn ba-btn-danger ba-btn-sm ba-delete-db-btn ' + (canDelete ? '' : 'ba-btn-disabled') + '" data-idx="' + globalIdx + '" title="' + (canDelete ? 'Xóa database' : 'Cần quyền Xóa database') + '"><span class="ba-action-icon">🗑️</span> Xóa</button>';
                    actions = '<div class="ba-actions-dropdown-wrap"><button type="button" class="ba-btn ba-btn-secondary ba-btn-sm ba-actions-trigger" aria-haspopup="true" aria-expanded="false" title="Thao tác">Action</button><div class="ba-actions-menu">' + menuHeader + '<div class="ba-actions-menu-body">' + menuBtns + '</div></div></div>';
                } else {
                    actions = '<span class="ba-badge ba-badge-fail">—</span>';
                }
                var restoreText = '';
                var restoredDt = parseDateSafe(r.lastRestoredAt);
                var resetDt = parseDateSafe(r.lastResetAt);
                if (r.lastRestoredBy || r.lastRestoredAt) {
                    restoreText = 'Restore: ' + baEscapeHtml(r.lastRestoredBy || '?') + ' ' + baEscapeHtml(restoredDt ? formatDate(restoredDt) : (r.lastRestoredAt || ''));
                }
                if (r.lastResetBy || r.lastResetAt) {
                    if (restoreText) restoreText += '<br/>';
                    restoreText += 'Làm sạch: ' + baEscapeHtml(r.lastResetBy || '?') + ' ' + baEscapeHtml(resetDt ? formatDate(resetDt) : (r.lastResetAt || ''));
                }
                if (resetDt && (!restoredDt || resetDt >= restoredDt)) {
                    restoreText = (r.lastResetClean
                        ? '<span class="ba-pill is-ok">Đã làm sạch</span>'
                        : '<span class="ba-pill is-warn" title="Lần làm sạch gần nhất có lỗi hoặc cảnh báo">Làm sạch chưa trọn</span>') + '<br/>' + restoreText;
                } else if (restoredDt) {
                    restoreText = '<span class="ba-pill is-warn" title="Chưa có lần làm sạch nào sau lần restore gần nhất">Chưa làm sạch</span><br/>' + restoreText;
                }
                if (!restoreText) restoreText = '—';
                var logSizeText = '—';
                if (r.logSizeMb != null && r.logSizeMb !== undefined) {
                    logSizeText = baEscapeHtml((r.logSizeMb >= 1024 ? (Math.round(r.logSizeMb / 102.4) / 10) + ' GB' : r.logSizeMb + ' MB') + (r.recoveryModel ? ' (' + r.recoveryModel + ')' : ''));
                }
                html += '<tr>' +
                    '<td>' + baEscapeHtml(r.server || '-') + '</td>' +
                    '<td>' + baEscapeHtml(r.database || '-') + '</td>' +
                    '<td>' + baEscapeHtml(r.username || '-') + '</td>' +
                    '<td style="font-size:0.8rem;">' + logSizeText + '</td>' +
                    '<td style="font-size:0.8rem; max-width:240px;" title="' + baEscapeHtml(r.lastResetDataTypes || '') + '">' + restoreText + '</td>' +
                    '<td><div class="ba-actions">' + actions + '</div></td></tr>';
            });
            $tb.html(html);
            $tb.find('.ba-connect-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) { showToast('Không đủ thông tin để kết nối.', 'error'); return; }
                connectToDatabaseByServerAndDb(r.serverId, r.database);
            });
            $tb.find('.ba-pgptool-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) { showToast('Không đủ thông tin để kết nối.', 'error'); return; }
                connectToPgpTool(r.serverId, r.database);
            });
            $tb.find('.ba-backup-btn').on('click', function() {
                if ($(this).hasClass('ba-btn-disabled')) return;
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                showBackupModal(r.serverId, r.database);
            });
            $tb.find('.ba-restore-btn').on('click', function() {
                if ($(this).hasClass('ba-btn-disabled')) return;
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                showRestoreModal(r.serverId, r.database, (r.server || '') + ' / ' + (r.database || ''));
            });
            $tb.find('.ba-sanitize-btn').on('click', function() {
                if ($(this).hasClass('ba-btn-disabled')) return;
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                showSanitizeModal(r.serverId, r.database);
            });
            $tb.find('.ba-delete-db-btn').on('click', function() {
                if ($(this).hasClass('ba-btn-disabled')) return;
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                deleteDatabase(r.serverId, r.database, (r.server || '') + ' / ' + (r.database || ''));
            });
            $tb.find('.ba-load-log-btn').on('click', function() {
                if ($(this).hasClass('ba-btn-disabled')) return;
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                loadLogInfoOne(r.serverId, r.database, $(this));
            });
            $tb.find('.ba-shrink-log-btn').on('click', function() {
                if ($(this).hasClass('ba-btn-disabled')) return;
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                if (!r || !r.serverId || !r.database) return;
                showShrinkLogModal(r.serverId, r.database, (r.server || '') + ' / ' + (r.database || ''));
            });
            $tb.find('.ba-actions-trigger').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openActionsMenu($(this));
            });
            $tb.find('.ba-actions-menu .ba-btn').on('click', function() { closeActionsMenus(); });
            $(document).off('click.baActionsClose').on('click.baActionsClose', function(e) {
                if (!$(e.target).closest('.ba-actions-dropdown-wrap').length && !$(e.target).closest('.ba-actions-menu').length) closeActionsMenus();
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

        function connectByConnStr() { connectByConnStrCore('<%= ResolveUrl("~/Pages/HRHelper.aspx") %>'); }
        function connectToPgpToolByConnStr() { connectByConnStrCore('<%= ResolveUrl("~/PgpTool") %>'); }
        function connectToLicenseKeyByConnStr() { connectByConnStrCore('<%= ResolveUrl("~/LicenseKey") %>'); }
        function connectByConnStrCore(redirectUrl) {
            var cs = ($('#txtConnStr').val() || '').trim();
            if (!cs) {
                showToast('Nhập connection string.', 'error');
                return;
            }
            var $btn = $('#btnConnStrConnect');
            var $btnPgp = $('#btnConnStrPgpTool');
            var origText = $btn.text();
            var origPgp = $btnPgp.text();
            $btn.prop('disabled', true).text('Đang kết nối...');
            $btnPgp.prop('disabled', true).text('Đang kết nối...');
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
                        window.location.href = redirectUrl + '?k=' + encodeURIComponent(d.token);
                    } else {
                        $btn.prop('disabled', false).text(origText);
                        $btnPgp.prop('disabled', false).text(origPgp);
                        showToast(d && d.message ? d.message : 'Không thể kết nối.', 'error');
                    }
                },
                error: function(xhr, status, err) {
                    $btn.prop('disabled', false).text(origText);
                    $btnPgp.prop('disabled', false).text(origPgp);
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
            function setSectionExpanded($card, $toggle, expanded) {
                if (!$card.length || !$toggle.length) return;
                $card.toggleClass('ba-section-collapsed', !expanded);
                $toggle.text(expanded ? '▼' : '▶');
            }
            function applyConnectMode(mode) {
                var hasServerFlow = canUseServers;
                var m = mode || 'both';
                if (!hasServerFlow && m === 'servers') m = 'connstr';
                if (!hasServerFlow) {
                    $('#btnModeServers').prop('disabled', true).addClass('ba-btn-disabled');
                }
                $('.ba-connect-mode-btn').removeClass('active');
                if (m === 'connstr') $('#btnModeConnStr').addClass('active');
                else if (m === 'servers') $('#btnModeServers').addClass('active');
                else $('#btnModeBoth').addClass('active');
                $('#btnUseConnStrMethod').toggleClass('is-selected', m === 'connstr');
                $('#btnUseServerMethod').toggleClass('is-selected', m !== 'connstr');
                if (m === 'connstr') {
                    $('#cardConnStr').show();
                    $('#cardServers').hide();
                    $('#cardDatabases').hide();
                } else if (m === 'servers') {
                    $('#cardConnStr').hide();
                    if (hasServerFlow) {
                        $('#cardServers').show();
                        $('#cardDatabases').show();
                    }
                } else {
                    $('#cardConnStr').show();
                    if (hasServerFlow) {
                        $('#cardServers').show();
                        $('#cardDatabases').show();
                    }
                }
            }
            if (!canUseServers) {
                $('#cardServers').hide();
                $('#cardDatabases').hide();
                $('#btnLoadDb').hide();
                $('#btnUseServerMethod').hide();
            }
            if (!canManageServers) $('#addServerWrap').hide();
            applyConnectMode(canUseServers ? 'servers' : 'connstr');
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
            $(window).on('scroll resize', function() { closeActionsMenus(); });
            $('#cardServers .ba-table-wrap, #cardDatabases .ba-table-wrap').on('scroll', function() { closeActionsMenus(); });
            $('#cardDatabases').on('click', 'th[data-db-sort]', function() {
                var k = $(this).data('db-sort');
                if (!k) return;
                if (dbSort.key === k) dbSort.dir = -dbSort.dir;
                else { dbSort.key = k; dbSort.dir = (k === 'logSize' || k === 'restoreReset') ? -1 : 1; }
                dbPage = 1;
                renderResults();
            });
            $('#cardServers').on('click', 'th[data-server-sort]', function() {
                var k = $(this).data('server-sort');
                if (!k) return;
                if (serverSort.key === k) serverSort.dir = -serverSort.dir;
                else serverSort.key = k;
                serverPage = 1;
                renderServers();
            });
            $('#toggleConnStr').on('click', function() {
                $('#cardConnStr').toggleClass('ba-section-collapsed');
                $(this).text($('#cardConnStr').hasClass('ba-section-collapsed') ? '▶' : '▼');
            });
            $('#toggleServers').on('click', function() {
                $('#cardServers').toggleClass('ba-section-collapsed');
                $(this).text($('#cardServers').hasClass('ba-section-collapsed') ? '▶' : '▼');
            });
            $('#toggleDatabases').on('click', function() {
                $('#cardDatabases').toggleClass('ba-section-collapsed');
                $(this).text($('#cardDatabases').hasClass('ba-section-collapsed') ? '▶' : '▼');
            });
            $(document).on('click', '#dbEmptyStateLink', function(e) {
                e.preventDefault();
                var $target = $('#btnLoadDb').length ? $('#btnLoadDb') : $('#cardServers');
                if ($target.length) $target[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            $('#btnUseConnStrMethod').on('click', function() {
                applyConnectMode('connstr');
                setSectionExpanded($('#cardConnStr'), $('#toggleConnStr'), true);
                var $target = $('#txtConnStr');
                if ($target.length) window.setTimeout(function() { try { $target.focus(); } catch (e) {} }, 100);
            });
            $('#btnUseServerMethod').on('click', function() {
                if (!canUseServers) return;
                applyConnectMode('servers');
                setSectionExpanded($('#cardServers'), $('#toggleServers'), true);
            });
            $('#btnModeBoth').on('click', function() { applyConnectMode('both'); });
            $('#btnModeConnStr').on('click', function() { applyConnectMode('connstr'); });
            $('#btnModeServers').on('click', function() { applyConnectMode('servers'); });
            /* Modal: không đóng khi click ra ngoài (đồng bộ với Feedback/FeedbackManage) */
            $('#notificationDetailClose').on('click', function(e) { e.preventDefault(); e.stopPropagation(); $('#notificationDetailModal').removeClass('show'); });
            $('#restoreExplorerUpBtn').on('click', function() {
                if (!restoreExplorerCurrentPath) return;
                var parts = restoreExplorerCurrentPath.split('\\');
                parts.pop();
                restoreExplorerLoadFolder(parts.join('\\'));
            });
            $('#restoreExplorerSearch').on('keydown', function(e) {
                if (e.which !== 13) return;
                e.preventDefault();
                restoreExplorerSearchRun();
            });
            $('#restoreExplorerTable').on('click', 'th[data-sort]', function() {
                var k = $(this).data('sort');
                if (restoreExplorerSort.key === k) restoreExplorerSort.dir = -restoreExplorerSort.dir;
                else { restoreExplorerSort.key = k; restoreExplorerSort.dir = 1; }
                if (restoreExplorerRows.length) restoreExplorerRenderTable();
            });
            $(document).on('click', '.server-path-info-btn', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var path = $(this).data('path');
                if (path) showPathInfoModal(path);
            });
            $('#pathInfoModal').on('click', function(e) {
                if (e.target === this) hidePathInfoModal();
            });
            $('#backupModalServer').on('change', function() {
                var sid = parseInt($(this).val(), 10);
                fillBackupModalDatabaseDropdown(sid || null, '');
                updateBackupModalDestPath();
            });
            $('#backupModalDatabaseList').on('change', 'input[name=backupModalDb]', updateBackupModalSelection);
            $('#backupModalDbFilter').on('input', applyBackupModalDbFilter);
            $('#backupModalSelectAllDb').on('click', function(e) {
                e.preventDefault();
                $('#backupModalDatabaseList label:visible input[name=backupModalDb]').prop('checked', true);
                updateBackupModalSelection();
            });
            $('#backupModalDeselectAllDb').on('click', function(e) {
                e.preventDefault();
                $('#backupModalDatabaseList input[name=backupModalDb]').prop('checked', false);
                updateBackupModalSelection();
            });
            $('#scanLogClose').on('click', closeScanLog);
        });
    </script>
    <script src="../Scripts/ba-db-restore.js?v=20261113"></script>
    <script src="../Scripts/ba-db-servers.js?v=20261113"></script>
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
