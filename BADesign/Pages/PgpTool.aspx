<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="PgpTool.aspx.cs"
    Inherits="BADesign.Pages.PgpTool" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>PGP Tool - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <style>
        :root { --primary: #0078d4; --primary-hover: #006bb3; --primary-light: #0D9EFF; --bg-main: #1e1e1e; --bg-darker: #161616; --bg-card: #2d2d30; --bg-hover: #3e3e42; --text-primary: #ffffff; --text-secondary: #cccccc; --text-muted: #969696; --border: #3e3e42; --success: #10b981; --danger: #ef4444; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-main); color: var(--text-primary); line-height: 1.6; overflow-x: hidden; }
        .ba-container { display: flex; min-height: 100vh; overflow: hidden; }
        .ba-sidebar { width: 240px; background: var(--bg-darker); border-right: 1px solid var(--border); padding: 1.5rem 0; flex-shrink: 0; position: fixed; left: 0; top: 0; bottom: 0; z-index: 1000; overflow-y: auto; transition: width 0.25s ease; }
        .ba-sidebar.collapsed { width: 64px; padding: 1rem 0; }
        .ba-sidebar.collapsed .ba-sidebar-header { padding: 0 0.75rem 1rem; }
        .ba-sidebar.collapsed .ba-sidebar-title { display: none; }
        .ba-sidebar.collapsed .ba-nav-item { padding: 0.75rem; text-align: center; font-size: 0; }
        .ba-sidebar.collapsed .ba-nav-item::before { content: attr(data-icon); font-size: 1.25rem; }
        .ba-sidebar-toggle { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; font-size: 1rem; }
        .ba-sidebar-toggle:hover { color: var(--text-primary); }
        .ba-sidebar.collapsed .ba-sidebar-toggle { transform: rotate(180deg); }
        .ba-sidebar-header { padding: 0 1.5rem 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-nav-item { display: block; padding: 0.75rem 1.5rem; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--bg-hover); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main { flex: 1; margin-left: 240px; display: flex; flex-direction: column; overflow: hidden; transition: margin-left 0.25s ease; }
        .ba-sidebar.collapsed ~ .ba-main { margin-left: 64px; }
        .ba-top-bar { padding: 1rem 2rem; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; flex-shrink: 0; position: sticky; top: 0; z-index: 100; }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
        .ba-content { flex: 1; padding: 1.5rem 2rem; overflow-y: auto; }
        .ba-tabs { display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border); margin-bottom: 1.5rem; }
        .ba-tab { padding: 0.75rem 1.5rem; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.9375rem; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .ba-tab:hover { color: var(--text-primary); }
        .ba-tab.active { color: var(--primary-light); border-bottom-color: var(--primary); }
        .ba-tab-content { display: none; }
        .ba-tab-content.active { display: block; }
        .ba-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .ba-form-group { margin-bottom: 1rem; }
        .ba-form-label { display: block; margin-bottom: 0.5rem; color: var(--text-primary); font-size: 0.875rem; font-weight: 500; }
        .ba-input { width: 100%; padding: 0.5rem 0.75rem; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.875rem; }
        .ba-input:focus { outline: none; border-color: var(--primary); }
        textarea.ba-input { min-height: 120px; resize: vertical; font-family: Consolas, monospace; font-size: 0.8rem; }
        .ba-btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem; }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-secondary:hover { background: var(--bg-card); }
        .ba-err { color: var(--danger); font-size: 0.875rem; margin-top: 0.5rem; }
        .ba-warn { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; }
        .ba-source-radio { display: flex; gap: 1.5rem; margin-bottom: 0.75rem; }
        .ba-source-radio label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .ba-progress-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10001; display: none; align-items: center; justify-content: center; flex-direction: column; }
        .ba-progress-overlay.show { display: flex; }
        .ba-progress-content { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; min-width: 360px; text-align: center; }
        .ba-progress-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .ba-progress-bar-wrap { width: 100%; height: 8px; background: var(--bg-darker); border-radius: 4px; overflow: hidden; margin: 1rem 0; }
        .ba-progress-bar-indeterminate { height: 100%; background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 50%, var(--primary) 100%); background-size: 200% 100%; animation: pgpProgressAnim 1.5s ease-in-out infinite; }
        @keyframes pgpProgressAnim { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .ba-progress-text { color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.5rem; }
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 10002; }
        .toast { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.25rem; min-width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none; }
        .toast { position: relative; padding-right: 2rem; padding-top: 0.25rem; }
        .toast .toast-close { position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0 4px; margin: 0; font-size: 1.25rem; line-height: 1; }
        .toast .toast-close:hover { color: var(--text-primary); }
        .toast.show { display: block; }
        .toast.error { border-left: 4px solid var(--danger); }
        .toast.success { border-left: 4px solid var(--success); }
        .pgp-file-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
        .pgp-file-row input[type="text"] { flex: 1; }
        .pgp-file-row input[type="file"] { display: none; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <aside class="ba-sidebar" id="baSidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">🧰 PGP Tool</div>
                    <button type="button" class="ba-sidebar-toggle" id="baSidebarToggle" title="Thu nhỏ menu">◀</button>
                </div>
                <nav class="ba-nav">
                    <a href="<%= ResolveUrl(BADesign.UiAuthHelper.GetHomeUrlByRole() ?? "~/") %>" class="ba-nav-item" data-icon="🏠" title="Về trang chủ">← Về trang chủ</a>
                    <a href="#" class="ba-nav-item active" data-icon="🧰" title="PGP Tool">PGP Tool</a>
                </nav>
            </aside>
            <main class="ba-main">
                <div class="ba-top-bar">
                    <h1 class="ba-top-bar-title">PGP Tool – Xuất key / Mã hóa / Giải mã file</h1>
                </div>
                <div class="ba-content">
                    <div class="ba-tabs">
                        <button type="button" class="ba-tab active" data-tab="export">Xuất key (.asc)</button>
                        <button type="button" class="ba-tab" data-tab="decrypt">Giải mã file PGP</button>
                        <button type="button" class="ba-tab" data-tab="encrypt">Mã hóa file PGP</button>
                    </div>

                    <!-- Tab 1: Xuất key -->
                    <div id="tabExport" class="ba-tab-content active">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Xuất key ra file .asc</h2>
                            <p class="ba-warn">Chuỗi key trong hệ thống ở dạng Base64. Dán vào ô dưới, chọn loại key rồi bấm Lưu.</p>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Loại key</label>
                                <div class="ba-source-radio">
                                    <label><input type="radio" name="keyType" value="public" checked /> Public Key</label>
                                    <label><input type="radio" name="keyType" value="private" /> Private Key</label>
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Mã tên file (prefix)</label>
                                <input type="text" id="exportCode" class="ba-input" value="export" style="max-width: 200px;" />
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Dán chuỗi Public Key hoặc Private Key (Base64)</label>
                                <textarea id="exportKeyBase64" class="ba-input" placeholder="Dán chuỗi key Base64..."></textarea>
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnExport">Lưu key ra file .asc</button>
                            <div id="exportErr" class="ba-err" style="display: none;"></div>
                        </div>
                    </div>

                    <!-- Tab 2: Giải mã -->
                    <div id="tabDecrypt" class="ba-tab-content">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Giải mã file PGP</h2>
                            <div class="ba-form-group">
                                <label class="ba-form-label">File đã mã hóa PGP</label>
                                <div class="pgp-file-row">
                                    <input type="text" id="decryptFilePath" class="ba-input" placeholder="Chọn file..." readonly />
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnDecryptFile">Chọn file...</button>
                                    <input type="file" id="decryptFileInput" accept=".pgp,.gpg,.asc,*" />
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Private key (để giải mã)</label>
                                <div class="ba-source-radio">
                                    <label><input type="radio" name="decKeySrc" value="file" checked /> Chọn file .asc</label>
                                    <label><input type="radio" name="decKeySrc" value="base64" /> Dán chuỗi Private Key (Base64)</label>
                                </div>
                                <div id="decKeyFileWrap" class="pgp-file-row">
                                    <input type="text" id="decKeyFilePath" class="ba-input" placeholder="Chọn file..." readonly />
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnDecKeyFile">Chọn file...</button>
                                    <input type="file" id="decKeyFileInput" accept=".asc,*" />
                                </div>
                                <div id="decKeyBase64Wrap" style="display: none;">
                                    <textarea id="decKeyBase64" class="ba-input" placeholder="Dán chuỗi Private Key Base64..."></textarea>
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Passphrase (mở khóa private key, để trống nếu không có)</label>
                                <input type="password" id="decPassphrase" class="ba-input" placeholder="Passphrase" style="max-width: 300px;" />
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnDecrypt">Giải mã và tải file</button>
                            <div id="decryptErr" class="ba-err" style="display: none;"></div>
                        </div>
                    </div>

                    <!-- Tab 3: Mã hóa -->
                    <div id="tabEncrypt" class="ba-tab-content">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Mã hóa file PGP</h2>
                            <div class="ba-form-group">
                                <label class="ba-form-label">File cần mã hóa</label>
                                <div class="pgp-file-row">
                                    <input type="text" id="encryptFilePath" class="ba-input" placeholder="Chọn file..." readonly />
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnEncryptFile">Chọn file...</button>
                                    <input type="file" id="encryptFileInput" />
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Public key (để mã hóa)</label>
                                <div class="ba-source-radio">
                                    <label><input type="radio" name="encKeySrc" value="file" checked /> Chọn file .asc</label>
                                    <label><input type="radio" name="encKeySrc" value="base64" /> Dán chuỗi Public Key (Base64)</label>
                                </div>
                                <div id="encKeyFileWrap" class="pgp-file-row">
                                    <input type="text" id="encKeyFilePath" class="ba-input" placeholder="Chọn file..." readonly />
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnEncKeyFile">Chọn file...</button>
                                    <input type="file" id="encKeyFileInput" accept=".asc,*" />
                                </div>
                                <div id="encKeyBase64Wrap" style="display: none;">
                                    <textarea id="encKeyBase64" class="ba-input" placeholder="Dán chuỗi Public Key Base64..."></textarea>
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Đuôi file xuất</label>
                                <div class="ba-source-radio">
                                    <label><input type="radio" name="encExt" value=".pgp" checked /> .pgp (binary)</label>
                                    <label><input type="radio" name="encExt" value=".asc" /> .asc (ASCII armored)</label>
                                </div>
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnEncrypt">Mã hóa và tải file</button>
                            <div id="encryptErr" class="ba-err" style="display: none;"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <div class="ba-progress-overlay" id="progressOverlay">
            <div class="ba-progress-content">
                <div class="ba-progress-title" id="progressTitle">Đang xử lý...</div>
                <div class="ba-progress-bar-wrap">
                    <div class="ba-progress-bar-indeterminate"></div>
                </div>
                <div class="ba-progress-text" id="progressText">Vui lòng đợi trong giây lát</div>
            </div>
        </div>
        <div class="toast-container"><div id="toast" class="toast" style="display:none;"><button type="button" class="toast-close" title="Đóng">&times;</button><span class="toast-msg"></span></div></div>
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
            var exportUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/ExportKey") %>';
            var decryptUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/DecryptPgp") %>';
            var encryptUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/EncryptPgp") %>';

            function showToast(msg, type) {
                var t = $('#toast').removeClass('success error').addClass(type || 'info');
                t.find('.toast-msg').text(msg);
                t.show();
                var tmr = setTimeout(function () { t.hide(); }, 4000);
                t.off('click.toastclose').on('click.toastclose', '.toast-close', function () { clearTimeout(tmr); t.hide(); });
            }
            function showProgress(title, text) {
                $('#progressTitle').text(title || 'Đang xử lý...');
                $('#progressText').text(text || 'Vui lòng đợi trong giây lát');
                $('#progressOverlay').addClass('show');
            }
            function hideProgress() { $('#progressOverlay').removeClass('show'); }
            function downloadBase64(base64, fileName) {
                var byteChars = atob(base64);
                var byteNumbers = new Array(byteChars.length);
                for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                var blob = new Blob([new Uint8Array(byteNumbers)]);
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(a.href);
            }
            function fileToBase64(file, cb) {
                var r = new FileReader();
                r.onload = function () {
                    var s = r.result;
                    if (s.indexOf('base64,') >= 0) s = s.split('base64,')[1];
                    cb(s);
                };
                r.readAsDataURL(file);
            }

            $('[data-tab]').on('click', function () {
                var t = $(this).data('tab');
                $('.ba-tab').removeClass('active'); $('.ba-tab-content').removeClass('active');
                $('.ba-tab[data-tab="' + t + '"]').addClass('active');
                $('#tab' + (t === 'export' ? 'Export' : t === 'decrypt' ? 'Decrypt' : 'Encrypt')).addClass('active');
            });

            $('input[name="decKeySrc"]').on('change', function () {
                var v = $(this).val();
                $('#decKeyFileWrap').toggle(v === 'file');
                $('#decKeyBase64Wrap').toggle(v === 'base64');
            });
            $('input[name="encKeySrc"]').on('change', function () {
                var v = $(this).val();
                $('#encKeyFileWrap').toggle(v === 'file');
                $('#encKeyBase64Wrap').toggle(v === 'base64');
            });

            $('#btnDecryptFile').on('click', function () { $('#decryptFileInput').click(); });
            $('#decryptFileInput').on('change', function () {
                var f = this.files[0];
                if (f) $('#decryptFilePath').val(f.name);
            });
            $('#btnDecKeyFile').on('click', function () { $('#decKeyFileInput').click(); });
            $('#decKeyFileInput').on('change', function () {
                var f = this.files[0];
                if (f) $('#decKeyFilePath').val(f.name);
            });
            $('#btnEncryptFile').on('click', function () { $('#encryptFileInput').click(); });
            $('#encryptFileInput').on('change', function () {
                var f = this.files[0];
                if (f) $('#encryptFilePath').val(f.name);
            });
            $('#btnEncKeyFile').on('click', function () { $('#encKeyFileInput').click(); });
            $('#encKeyFileInput').on('change', function () {
                var f = this.files[0];
                if (f) $('#encKeyFilePath').val(f.name);
            });

            $('#btnExport').on('click', function () {
                var key = $('#exportKeyBase64').val().trim();
                var keyType = $('input[name="keyType"]:checked').val();
                var code = $('#exportCode').val().trim() || 'export';
                $('#exportErr').hide();
                if (!key) { $('#exportErr').text('Vui lòng dán chuỗi key (Base64).').show(); return; }
                showProgress('Đang xuất key...', 'Vui lòng đợi');
                $.ajax({
                    type: 'POST', url: exportUrl,
                    data: JSON.stringify({ keyBase64: key, keyType: keyType, code: code }),
                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#exportErr').text((d && d.message) || 'Lỗi').show(); return; }
                        downloadBase64(d.fileBase64, d.fileName);
                        showToast('Đã tải file ' + d.fileName, 'success');
                    },
                    error: function () { hideProgress(); $('#exportErr').text('Lỗi kết nối.').show(); }
                });
            });

            $('#btnDecrypt').on('click', function () {
                var encFile = document.getElementById('decryptFileInput').files[0];
                var keySrc = $('input[name="decKeySrc"]:checked').val();
                var keyFile = document.getElementById('decKeyFileInput').files[0];
                var keyB64 = $('#decKeyBase64').val().trim();
                var pass = $('#decPassphrase').val();
                $('#decryptErr').hide();
                if (!encFile) { $('#decryptErr').text('Vui lòng chọn file đã mã hóa PGP.').show(); return; }
                if (keySrc === 'file' && !keyFile) { $('#decryptErr').text('Vui lòng chọn file Private Key (.asc).').show(); return; }
                if (keySrc === 'base64' && !keyB64) { $('#decryptErr').text('Vui lòng dán chuỗi Private Key (Base64).').show(); return; }
                showProgress('Đang giải mã file...', 'Đang đọc file và xử lý, vui lòng đợi');
                setTimeout(function () {
                    fileToBase64(encFile, function (encB64) {
                        var privB64 = keyB64;
                        if (keySrc === 'file') {
                            showProgress('Đang giải mã file...', 'Đang đọc private key...');
                            fileToBase64(keyFile, function (k) {
                                doDecrypt(encB64, k, pass);
                            });
                        } else {
                            doDecrypt(encB64, privB64, pass);
                        }
                    });
                }, 100);
            });
            function doDecrypt(encB64, privB64, pass) {
                $.ajax({
                    type: 'POST', url: decryptUrl,
                    data: JSON.stringify({ encryptedFileBase64: encB64, privateKeyBase64: privB64, passphrase: pass || '' }),
                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                    timeout: 120000,
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#decryptErr').text((d && d.message) || 'Lỗi').show(); return; }
                        downloadBase64(d.fileBase64, d.fileName);
                        showToast('Đã giải mã và tải file.', 'success');
                    },
                    error: function () { hideProgress(); $('#decryptErr').text('Lỗi kết nối.').show(); }
                });
            }

            $('#btnEncrypt').on('click', function () {
                var inpFile = document.getElementById('encryptFileInput').files[0];
                var keySrc = $('input[name="encKeySrc"]:checked').val();
                var keyFile = document.getElementById('encKeyFileInput').files[0];
                var keyB64 = $('#encKeyBase64').val().trim();
                var ext = $('input[name="encExt"]:checked').val() || '.pgp';
                $('#encryptErr').hide();
                if (!inpFile) { $('#encryptErr').text('Vui lòng chọn file cần mã hóa.').show(); return; }
                if (keySrc === 'file' && !keyFile) { $('#encryptErr').text('Vui lòng chọn file Public Key (.asc).').show(); return; }
                if (keySrc === 'base64' && !keyB64) { $('#encryptErr').text('Vui lòng dán chuỗi Public Key (Base64).').show(); return; }
                showProgress('Đang mã hóa file...', 'Đang đọc file và xử lý, vui lòng đợi');
                setTimeout(function () {
                    fileToBase64(inpFile, function (inpB64) {
                        var pubB64 = keyB64;
                        if (keySrc === 'file') {
                            showProgress('Đang mã hóa file...', 'Đang đọc public key...');
                            fileToBase64(keyFile, function (k) {
                                doEncrypt(inpB64, inpFile.name, k, ext);
                            });
                        } else {
                            doEncrypt(inpB64, inpFile.name, pubB64, ext);
                        }
                    });
                }, 100);
            });
            function doEncrypt(inpB64, origName, pubB64, ext) {
                $.ajax({
                    type: 'POST', url: encryptUrl,
                    data: JSON.stringify({ inputFileBase64: inpB64, inputFileName: origName, publicKeyBase64: pubB64, armor: ext === '.asc' }),
                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                    timeout: 120000,
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#encryptErr').text((d && d.message) || 'Lỗi').show(); return; }
                        downloadBase64(d.fileBase64, d.fileName);
                        showToast('Đã mã hóa và tải file.', 'success');
                    },
                    error: function () { hideProgress(); $('#encryptErr').text('Lỗi kết nối.').show(); }
                });
            }
        })();
    </script>
</body>
</html>
