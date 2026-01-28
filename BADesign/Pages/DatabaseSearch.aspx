<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DatabaseSearch.aspx.cs"
    Inherits="BADesign.Pages.DatabaseSearch" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Database Search - UI Builder</title>
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
        }
        .ba-sidebar-header {
            padding: 0 1.5rem 1.5rem;
            border-bottom: 1px solid var(--border);
            margin-bottom: 1rem;
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
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .ba-top-bar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
        .ba-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0.5rem; }
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
                <asp:HyperLink ID="lnkHome" runat="server" CssClass="ba-nav-item" NavigateUrl="~/DesignerHome">
                    <span>← Về trang chủ</span>
                </asp:HyperLink>
                <div class="ba-nav-item active"><span>🔍 Database Search</span></div>
            </aside>
            <main class="ba-main">
                <div class="ba-top-bar">
                    <h1 class="ba-top-bar-title">Database Search</h1>
                    <div class="ba-actions">
                        <button type="button" class="ba-btn ba-btn-primary" id="btnLoadDb" onclick="loadDatabases(); return false;">
                            <span class="btn-text">Quét & load danh sách Database</span>
                        </button>
                    </div>
                </div>
                <div class="ba-content">
                    <!-- Server config -->
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
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Thêm server để quét. Có thể quét tất cả hoặc chọn 1 server rồi bấm &quot;Quét&quot; để load database.</p>
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
                            <p id="dbListDesc" style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Kết quả sau khi quét. Bấm icon copy để sao connection string.</p>
                            <div class="ba-table-wrap">
                                <table class="ba-table">
                                    <thead>
                                        <tr>
                                            <th>Server</th>
                                            <th>Database</th>
                                            <th>User</th>
                                            <th>Copy</th>
                                            <th>Connect</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tblResults">
                                        <tr><td colspan="5" class="ba-empty">Chưa quét. Bấm &quot;Quét & load danh sách Database&quot; hoặc &quot;Quét&quot; trên từng server.</td></tr>
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
        var canManageServers = <%= CanManageServers ? "true" : "false" %>;
        var servers = [];
        var results = [];
        var serverStatuses = {};
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
                ? { id: parseInt(id, 10), serverName: serverName, port: port, username: username, password: password || '' }
                : { serverName: serverName, port: port, username: username, password: password };

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
                if ($d.length) $d.text('Kết quả quét tất cả server. Bấm icon copy để sao connection string.');
            } else if (mode === 'single' && serverName) {
                $t.text('Danh sách database của ' + serverName);
                if ($d.length) $d.text('Kết quả quét ' + serverName + '. Bấm icon copy để sao connection string.');
            } else {
                $t.text('Danh sách Database');
                if ($d.length) $d.text('Kết quả sau khi quét. Bấm icon copy để sao connection string.');
            }
        }

        function runScan(serverId) {
            showScanLog();
            var $btn = $('#btnLoadDb');
            var $text = $btn.find('.btn-text');
            $btn.prop('disabled', true);

            if (serverId != null) {
                var s = servers.filter(function(x) { return x.id === serverId; })[0];
                var serverDisplay = (s && s.serverName) ? s.serverName + (s.port != null && String(s.port) !== '' ? ',' + s.port : '') : ('ID ' + serverId);
                $text.html('<span class="spinner"></span> Đang quét...');
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/LoadDatabases") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({ serverId: serverId }),
                    timeout: 120000,
                    success: function(res) {
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
                $btn.prop('disabled', false);
                $('#scanLogPre').text('Chưa có server. Thêm server rồi thử lại.');
                $('#scanLogClose, #scanLogDone').show();
                showToast('Chưa có server để quét.', 'error');
                return;
            }

            $text.html('<span class="spinner"></span> Đang quét...');
            var poolSize = Math.min(SCAN_POOL_SIZE, list.length);
            $('#scanLogPre').text('Đang quét ' + list.length + ' server.\n\n');
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

        function renderResults() {
            var $tb = $('#tblResults');
            var $pg = $('#pagerDatabases');
            var list = filteredResults();
            if (!list.length) {
                $tb.html('<tr><td colspan="5" class="ba-empty">Không có database nào. Kiểm tra server đã thêm và thử lại.</td></tr>');
                $pg.empty();
                return;
            }
            var total = list.length;
            var pages = Math.max(1, Math.ceil(total / dbPageSize));
            dbPage = Math.max(1, Math.min(dbPage, pages));
            var from = (dbPage - 1) * dbPageSize;
            var chunk = list.slice(from, from + dbPageSize);
            var copySvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            var html = '';
            chunk.forEach(function(r, idx) {
                var globalIdx = results.indexOf(r);
                if (globalIdx < 0) globalIdx = from + idx;
                var hasCs = !!(r.connectionString && r.connectionString.length);
                var copyCell = hasCs
                    ? '<button type="button" class="ba-copy-btn" data-idx="' + globalIdx + '" title="Copy connection string">' + copySvg + '</button>'
                    : '<span class="ba-badge ba-badge-fail">—</span>';
                var connectBtn = hasCs
                    ? '<button type="button" class="ba-btn ba-btn-primary ba-btn-sm ba-connect-btn" data-idx="' + globalIdx + '" title="Connect">Connect</button>'
                    : '<span class="ba-badge ba-badge-fail">—</span>';
                html += '<tr>' +
                    '<td>' + (r.server || '-') + '</td>' +
                    '<td>' + (r.database || '-') + '</td>' +
                    '<td>' + (r.username || '-') + '</td>' +
                    '<td>' + copyCell + '</td>' +
                    '<td>' + connectBtn + '</td></tr>';
            });
            $tb.html(html);
            $tb.find('.ba-copy-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                var cs = (r && (r.connectionStringForCopy || r.connectionString)) || '';
                if (!cs) { showToast('Không có connection string.', 'error'); return; }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(cs).then(function() { showToast('Đã copy connection string.', 'success'); }).catch(function() { fallbackCopy(cs); });
                } else { fallbackCopy(cs); }
            });
            $tb.find('.ba-connect-btn').on('click', function() {
                var idx = parseInt($(this).data('idx'), 10);
                var r = results[idx];
                connectToDatabase((r && r.connectionString) || '', (r && r.server) || '', (r && r.database) || '');
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

        $(function() {
            if (!canManageServers) $('#addServerWrap').hide();
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
            $('#scanLogClose').on('click', closeScanLog);
        });
    </script>
</body>
</html>
