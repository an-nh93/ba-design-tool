<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="AppSettings.aspx.cs"
    Inherits="BADesign.Pages.AppSettings" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>App Settings - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <style>
        :root {
            --primary: #0078d4;
            --primary-hover: #006bb3;
            --primary-light: #0D9EFF;
            --bg-main: #1e1e1e;
            --bg-darker: #161616;
            --bg-card: #2d2d30;
            --bg-hover: #3e3e42;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #969696;
            --border: #3e3e42;
            --success: #10b981;
            --danger: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }
        .ba-container { display: flex; min-height: 100vh; overflow: hidden; }
        .ba-sidebar {
            width: 240px; background: var(--bg-darker);
            border-right: 1px solid var(--border);
            padding: 1.5rem 0; flex-shrink: 0;
            display: flex; flex-direction: column;
            transition: width 0.25s ease;
        }
        .ba-sidebar.collapsed { width: 64px; padding: 1rem 0; }
        .ba-sidebar.collapsed .ba-sidebar-header { padding: 0 0.75rem 1rem; }
        .ba-sidebar.collapsed .ba-sidebar-title { display: none; }
        .ba-sidebar.collapsed .ba-nav-item { padding: 0.75rem; text-align: center; font-size: 0; }
        .ba-sidebar.collapsed .ba-nav-item::before { content: attr(data-icon); font-size: 1.25rem; }
        .ba-sidebar-toggle { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; font-size: 1rem; }
        .ba-sidebar-toggle:hover { color: var(--text-primary); }
        .ba-sidebar.collapsed .ba-sidebar-toggle { transform: rotate(180deg); }
        .ba-sidebar-header { padding: 0 1.5rem 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; }
        .ba-nav { padding: 1rem 0; }
        .ba-nav-item {
            display: block; padding: 0.75rem 1.5rem;
            color: var(--text-secondary); text-decoration: none;
            transition: all 0.2s;
        }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--bg-hover); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main { flex: 1; display: flex; flex-direction: column; overflow: auto; margin-left: 240px; transition: margin-left 0.25s ease; }
        .ba-sidebar.collapsed ~ .ba-main { margin-left: 64px; }
        .ba-top-bar {
            padding: 1rem 2rem; background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
        }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; }
        .ba-content { flex: 1; padding: 2rem; overflow: auto; }
        .ba-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            max-width: 700px;
        }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; }
        .ba-input {
            width: 100%; padding: 0.5rem 0.75rem;
            background: var(--bg-main); border: 1px solid var(--border);
            border-radius: 6px; color: var(--text-primary);
            font-family: inherit; font-size: 0.875rem;
        }
        .ba-input:focus { outline: none; border-color: var(--primary); }
        .ba-input[readonly] { opacity: 0.8; cursor: not-allowed; }
        .ba-btn {
            padding: 0.5rem 1rem; border: none; border-radius: 6px;
            cursor: pointer; font-size: 0.875rem;
            transition: all 0.2s;
        }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-secondary:hover { background: var(--bg-card); }
        .ba-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .ba-msg { padding: 0.5rem 0; font-size: 0.875rem; }
        .ba-msg.success { color: var(--success); }
        .ba-msg.error { color: var(--danger); }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <nav class="ba-sidebar" id="baSidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">UI Builder</div>
                    <button type="button" class="ba-sidebar-toggle" id="baSidebarToggle" title="Thu nhỏ menu">◀</button>
                </div>
                <div class="ba-nav">
                    <a href="<%= ResolveUrl(BADesign.UiAuthHelper.GetHomeUrlByRole() ?? "~/") %>" class="ba-nav-item" data-icon="🏠" title="Về trang chủ">Về trang chủ</a>
                    <a href="<%= ResolveUrl("~/DatabaseSearch") %>" class="ba-nav-item" data-icon="🔍" title="Database Search">Database Search</a>
                    <a href="<%= ResolveUrl("~/HRHelper") %>" class="ba-nav-item" data-icon="👥" title="HR Helper">HR Helper</a>
                    <a href="<%= ResolveUrl("~/AppSettings") %>" class="ba-nav-item active" data-icon="⚙" title="App Settings">App Settings</a>
                </div>
            </nav>
            <div class="ba-main">
                <div class="ba-top-bar">
                    <h1 class="ba-top-bar-title">App Settings</h1>
                </div>
                <div class="ba-content">
                    <div class="ba-card">
                        <h2 class="ba-card-title">Email Ignore (HR Multi-DB)</h2>
                        <p style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 0.75rem;">
                            Các email/pattern trong danh sách được coi là nội bộ (đã reset). HR Helper Multi-DB sẽ load config từ đây. Mỗi dòng 1 giá trị. Dùng *@domain.com cho suffix.
                        </p>
                        <textarea id="txtEmailIgnore" class="ba-input" rows="6" placeholder="*@cadena.com.sg&#10;test@internal.com" <%= !CanEditSettings ? "readonly" : "" %>></textarea>
                        <div id="msgEmailIgnore" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions" style="margin-top: 0.75rem;">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSave" onclick="saveEmailIgnore(); return false;">Lưu</button>
                            <% } else { %>
                            <span style="color: var(--text-muted); font-size: 0.875rem;">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                    </div>
                    <div class="ba-card">
                        <h2 class="ba-card-title">SFTP Connection</h2>
                        <p style="color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 0.75rem;">
                            Thông tin kết nối SFTP dùng khi tự động restore + reset database. Sẽ ghi vào bảng Setting_FolderConfigurations của database được restore (nếu có) để tránh nhầm SFTP production.
                        </p>
                        <div class="ba-form-group" style="margin-bottom: 0.75rem;">
                            <label class="ba-form-label">Host</label>
                            <input type="text" id="txtSftpHost" class="ba-input" placeholder="sftp.example.com" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div class="ba-form-group" style="margin-bottom: 0.75rem;">
                            <label class="ba-form-label">Port</label>
                            <input type="text" id="txtSftpPort" class="ba-input" placeholder="22" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div class="ba-form-group" style="margin-bottom: 0.75rem;">
                            <label class="ba-form-label">User</label>
                            <input type="text" id="txtSftpUser" class="ba-input" placeholder="username" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div class="ba-form-group" style="margin-bottom: 0.75rem;">
                            <label class="ba-form-label">Password</label>
                            <input type="password" id="txtSftpPassword" class="ba-input" placeholder="••••••••" <%= !CanEditSettings ? "readonly" : "" %> />
                        </div>
                        <div id="msgSftp" class="ba-msg" style="display:none;"></div>
                        <div class="ba-actions" style="margin-top: 0.75rem;">
                            <% if (CanEditSettings) { %>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnSaveSftp" onclick="saveSftpConfig(); return false;">Lưu</button>
                            <% } else { %>
                            <span style="color: var(--text-muted); font-size: 0.875rem;">Chỉ user có quyền Settings mới có thể chỉnh sửa.</span>
                            <% } %>
                        </div>
                    </div>
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
        (function () {
            function loadEmailIgnore() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadEmailIgnoreConfigPublic") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success && d.list && d.list.length) {
                        $('#txtEmailIgnore').val(d.list.join('\n'));
                    }
                }).fail(function () {
                    $('#msgEmailIgnore').removeClass('success').addClass('error').text('Không load được config.').show();
                });
            }
            window.saveEmailIgnore = function () {
                var lines = $('#txtEmailIgnore').val().split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
                $('#msgEmailIgnore').hide();
                $('#btnSave').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/HRHelper.aspx/SaveEmailIgnoreToSettings") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ patterns: lines }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgEmailIgnore').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgEmailIgnore').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgEmailIgnore').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSave').prop('disabled', false);
                });
            };
            loadEmailIgnore();
            (function loadSftpConfig() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/LoadSftpConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#txtSftpHost').val(d.host || '');
                        $('#txtSftpPort').val(d.port || '');
                        $('#txtSftpUser').val(d.user || '');
                        $('#txtSftpPassword').val(d.password || '');
                    }
                });
            })();
            window.saveSftpConfig = function () {
                $('#msgSftp').hide();
                $('#btnSaveSftp').prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/AppSettings.aspx/SaveSftpConfig") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        host: $('#txtSftpHost').val() || '',
                        port: $('#txtSftpPort').val() || '',
                        user: $('#txtSftpUser').val() || '',
                        password: $('#txtSftpPassword').val() || ''
                    }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#msgSftp').removeClass('error').addClass('success').text('Đã lưu.').show();
                    } else {
                        $('#msgSftp').removeClass('success').addClass('error').text(d && d.message ? d.message : 'Lỗi.').show();
                    }
                }).fail(function () {
                    $('#msgSftp').removeClass('success').addClass('error').text('Lỗi khi lưu.').show();
                }).always(function () {
                    $('#btnSaveSftp').prop('disabled', false);
                });
            };
        })();
    </script>
</body>
</html>
