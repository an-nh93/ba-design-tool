<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="PgpTool.aspx.cs"
    Inherits="BADesign.Pages.PgpTool" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>PGP Tool - HR Helper</title>
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
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 99999; pointer-events: none; }
        .toast-container .toast { pointer-events: auto; }
        .toast { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.25rem; min-width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none; }
        .toast { position: relative; padding-right: 2rem; padding-top: 0.25rem; }
        .toast .toast-close { position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0 4px; margin: 0; font-size: 1.25rem; line-height: 1; }
        .toast .toast-close:hover { color: var(--text-primary); }
        .toast.show { display: block; opacity: 1; }
        .toast-container .toast.show { opacity: 1 !important; }
        .toast.error { border-left: 4px solid var(--danger); }
        .toast.success { border-left: 4px solid var(--success); }
        .pgp-file-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
        .pgp-file-row input[type="text"] { flex: 1; }
        .pgp-file-row input[type="file"] { display: none; }
        .ba-info-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--text-muted); color: var(--text-muted); font-size: 0.75rem; font-weight: 600; font-style: italic; cursor: pointer; margin-left: 4px; vertical-align: middle; }
        .ba-info-icon:hover { border-color: var(--primary-light); color: var(--primary-light); }
        .ba-info-wrap { position: relative; display: inline-block; }
        .ba-info-popover { display: none; position: absolute; z-index: 10003; bottom: 100%; left: 0; margin-bottom: 6px; min-width: 280px; width: 360px; max-width: min(380px, calc(100vw - 2rem)); padding: 0.75rem 1rem; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; font-size: 0.8125rem; line-height: 1.5; color: var(--text-secondary); box-shadow: 0 4px 12px rgba(0,0,0,0.4); white-space: normal; overflow-wrap: break-word; word-break: break-word; box-sizing: border-box; }
        .ba-info-popover.show { display: block; }
        .ba-password-wrap { position: relative; display: inline-block; }
        .ba-password-wrap .ba-input { padding-right: 36px; }
        .ba-password-toggle { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; font-size: 1.1rem; line-height: 1; }
        .ba-password-toggle:hover { color: var(--primary-light); }
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
                    <!-- Key từ cấu hình DB (cần token k từ Database Search; không có k vẫn dùng được Xuất/Mã hóa/Giải mã với file hoặc dán Base64) -->
                    <div class="ba-card" id="cardKeyFromDb" style="margin-bottom: 1rem;">
                        <h2 class="ba-card-title">Key từ cấu hình (Database)</h2>
                        <p class="ba-warn" id="keyFromDbHint">Chọn cấu hình Folder đã lưu key trong bảng Setting_FolderConfigurations (theo TenantID, Code). Cần chọn database trong Database Search rồi mở PGP Tool từ đó.</p>
                        <div id="keyFromDbNoConnWrap" style="display: none; padding: 0.75rem; background: var(--bg-darker); border-radius: 6px; margin-bottom: 1rem;">
                            <span style="color: var(--text-muted); font-size: 0.9rem;">Để dùng key từ database: Vào <a href="<%= ResolveUrl("~/DatabaseSearch") %>" style="color: var(--primary-light);">Database Search</a> → Chọn Server &amp; Database → bấm <strong>PGP Tool</strong> (hoặc HR Helper rồi sang PGP Tool). <br />Ngoài ra có thể thao tác từ chuỗi Private và Public Key Base64 nếu có.</span>
                        </div>
                        <div id="keyFromDbConnInfoWrap" style="display: none; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: var(--bg-darker); border-radius: 6px; border-left: 3px solid var(--primary);">
                            <span style="font-size: 0.9rem; color: var(--text-secondary);">Đang kết nối: </span><strong id="connServerName"></strong><span id="connServerSep" style="display: none;">, </span><strong id="connDbName"></strong>
                        </div>
                        <div id="keyFromDbControlsWrap" class="ba-form-group" style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
                            <select id="folderConfigSelect" class="ba-input" style="max-width: 320px;">
                                <option value="">-- Chọn cấu hình --</option>
                            </select>
                            <button type="button" class="ba-btn ba-btn-secondary" id="btnLoadConfigKeys">Nạp key</button>
                            <span id="configKeyStatus" class="ba-warn" style="margin-left: 0.5rem;"></span>
                        </div>
                    </div>

                    <div class="ba-tabs">
                        <button type="button" class="ba-tab active" data-tab="export">Xuất key (.asc)</button>
                        <button type="button" class="ba-tab" data-tab="decrypt">Giải mã file PGP</button>
                        <button type="button" class="ba-tab" data-tab="encrypt">Mã hóa file PGP</button>
                        <button type="button" class="ba-tab" data-tab="generate">Generate Key</button>
                    </div>

                    <!-- Tab 1: Xuất key -->
                    <div id="tabExport" class="ba-tab-content active">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Xuất key ra file .asc</h2>
                            <p class="ba-warn">Dùng key từ cấu hình đã chọn (phía trên) hoặc dán chuỗi Base64 vào ô dưới, chọn loại key rồi bấm Lưu.</p>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Nguồn key</label>
                                <div class="ba-source-radio">
                                    <label><input type="radio" name="exportSrc" value="paste" checked /> Dán chuỗi Base64</label>
                                    <label><input type="radio" name="exportSrc" value="config" /> Lấy từ cấu hình đã chọn (DB)</label>
                                </div>
                            </div>
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
                            <div class="ba-form-group" id="exportPasteWrap">
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
                                    <label><input type="radio" name="decKeySrc" value="config" /> Dùng key từ cấu hình đã chọn (DB)</label>
                                </div>
                                <div id="decKeyFileWrap" class="pgp-file-row">
                                    <input type="text" id="decKeyFilePath" class="ba-input" placeholder="Chọn file..." readonly />
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnDecKeyFile">Chọn file...</button>
                                    <input type="file" id="decKeyFileInput" accept=".asc,*" />
                                </div>
                                <div id="decKeyBase64Wrap" style="display: none;">
                                    <textarea id="decKeyBase64" class="ba-input" placeholder="Dán chuỗi Private Key Base64..."></textarea>
                                </div>
                                <div id="decKeyConfigWrap" class="ba-warn" style="display: none;">Sẽ dùng Private Key của cấu hình đã chọn phía trên.</div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Passphrase (mở khóa private key, để trống nếu không có)
                                    <span class="ba-info-wrap">
                                        <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                        <div class="ba-info-popover" style="display: none;">
                                            Passphrase là password để nhập khi giải mã file PGP. Passphrase sẽ đóng vai trò trong phần tạo Public Key và Private Key.<br/><br/>
                                            <strong>Các dự án mới</strong> hỗ trợ Config Passphrase trong App Setting: tìm "Passphrase" trong App Setting. <br />-> Nếu không có config thì Passphrase mặc định là <strong>P@pCdn-Cry5</strong>.<br/><br/>
                                            <strong>Các dự án cũ</strong> có thể Key fix trong Source code (ví dụ: REN-@1).<br />-> Nếu không đúng có thể nhờ Dev dự án search theo keyword: <strong>PASS_PHRASE</strong>.
                                        </div>
                                    </span>
                                </label>
                                <div class="ba-password-wrap">
                                    <input type="password" id="decPassphrase" class="ba-input" placeholder="Passphrase" style="max-width: 300px;" />
                                    <button type="button" class="ba-password-toggle" id="decPassphraseToggle" title="Hiện passphrase" aria-label="Hiện/ẩn">👁</button>
                                </div>
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
                                    <label><input type="radio" name="encKeySrc" value="config" /> Dùng key từ cấu hình đã chọn (DB)</label>
                                </div>
                                <div id="encKeyFileWrap" class="pgp-file-row">
                                    <input type="text" id="encKeyFilePath" class="ba-input" placeholder="Chọn file..." readonly />
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnEncKeyFile">Chọn file...</button>
                                    <input type="file" id="encKeyFileInput" accept=".asc,*" />
                                </div>
                                <div id="encKeyBase64Wrap" style="display: none;">
                                    <textarea id="encKeyBase64" class="ba-input" placeholder="Dán chuỗi Public Key Base64..."></textarea>
                                </div>
                                <div id="encKeyConfigWrap" class="ba-warn" style="display: none;">Sẽ dùng Public Key của cấu hình đã chọn phía trên.</div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Đuôi file xuất</label>
                                <div class="ba-source-radio">
                                    <label><input type="radio" name="encExt" value=".pgp" checked /> .pgp (binary)</label>
                                    <label><input type="radio" name="encExt" value=".asc" /> .asc (ASCII armored)</label>
                                </div>
                            </div>
                            <div class="ba-form-group" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                <label class="ba-checkbox" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0;">
                                    <input type="checkbox" id="encryptCompress" checked />
                                    <span>Nén trước khi mã hóa (ZIP – chuẩn PGP, tương thích code giải mã PgpCompressedData)</span>
                                </label>
                                <span class="ba-info-wrap">
                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                    <div class="ba-info-popover" style="display: none;">
                                        <strong>Nén trước khi mã hóa là gì?</strong><br/><br/>
                                        Khi bật, dữ liệu sẽ được <strong>nén (ZIP)</strong> trước khi mã hóa. Đây là cách làm chuẩn của PGP/OpenPGP và hầu hết công cụ (GnuPG, etc.):<br/><br/>
                                        • <strong>Lợi ích:</strong> Giảm kích thước file mã hóa, đặc biệt với file text hoặc dữ liệu lặp.<br/>
                                        • <strong>Luồng xử lý:</strong> File gốc → Nén (ZIP) → Mã hóa → File .pgp/.asc. Bên giải mã sẽ gặp PgpCompressedData, giải nén rồi lấy nội dung (PgpLiteralData).<br/><br/>
                                        Khi tắt, dữ liệu được mã hóa trực tiếp không nén (PgpLiteralData). File có thể lớn hơn nhưng quá trình mã hóa/giải mã nhanh hơn. Code giải mã Cadena hỗ trợ cả hai dạng.
                                    </div>
                                </span>
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnEncrypt">Mã hóa và tải file</button>
                            <div id="encryptErr" class="ba-err" style="display: none;"></div>
                        </div>
                    </div>

                    <!-- Tab 4: Generate Key -->
                    <div id="tabGenerate" class="ba-tab-content">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Generate Key (tạo cặp Public / Private)</h2>
                            <p class="ba-warn">Passphrase dùng để bảo vệ Private Key. Mặc định P@pCdn-Cry5 (trùng với Cadena khi không config).</p>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Passphrase (bảo vệ Private Key)</label>
                                <div class="ba-password-wrap">
                                    <input type="password" id="genPassphrase" class="ba-input" value="P@pCdn-Cry5" placeholder="P@pCdn-Cry5" style="max-width: 280px;" />
                                    <button type="button" class="ba-password-toggle" id="genPassphraseToggle" title="Hiện passphrase" aria-label="Hiện/ẩn">👁</button>
                                </div>
                            </div>
                            <div id="genSaveToDbWrap" class="ba-form-group" style="display: none;">
                                <label class="ba-form-label">
                                    <input type="checkbox" id="genSaveToDb" /> Lưu key xuống cấu hình đã chọn (DB)
                                </label>
                                <p class="ba-warn" style="margin-top: 0.25rem;">Khi chọn Lưu Key, Private và Public Key của Cấu hình đang chọn sẽ được lưu vào DB đang kết nối.</p>
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnGenerateKey">Generate Key</button>
                            <div id="genErr" class="ba-err" style="display: none;"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <!-- Generate Key: Captcha confirm (khi lưu DB) -->
        <div id="genCaptchaModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-backdrop"></div>
            <div class="ba-modal-content" style="max-width: 420px;">
                <div class="ba-modal-header"><h3>Xác thực (Captcha)</h3><button type="button" class="ba-modal-close" id="genCaptchaClose">&times;</button></div>
                <div class="ba-modal-body">
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);">Bạn sắp lưu Public/Private Key xuống database. Nhập kết quả phép tính để xác nhận.</p>
                    <div class="captcha-box" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-darker); border-radius: 4px; font-size: 14px; margin-bottom: 1rem;">
                        <span id="genCaptchaQuestion"></span>
                        <input type="number" id="genCaptchaInput" class="ba-input" placeholder="?" style="width: 80px; text-align: center;" />
                        <button type="button" id="btnRefreshGenCaptcha" class="ba-btn ba-btn-secondary" title="Làm mới">↻</button>
                    </div>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button type="button" class="ba-btn ba-btn-secondary" id="genCaptchaCancel">Hủy</button>
                        <button type="button" class="ba-btn ba-btn-primary" id="genCaptchaConfirm">Xác nhận và lưu</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Generate Key: Result popup (download + copy) -->
        <div id="genResultModal" class="ba-modal" style="display: none;">
            <div class="ba-modal-backdrop"></div>
            <div class="ba-modal-content ba-modal-result-keys">
                <div class="ba-modal-header"><h3>Key đã tạo</h3><button type="button" class="ba-modal-close" id="genResultClose">&times;</button></div>
                <div class="ba-modal-body">
                    <div class="ba-form-group">
                        <label class="ba-form-label">Public Key (Base64)</label>
                        <textarea id="genResultPublic" class="ba-input ba-key-preview" readonly></textarea>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" id="genDownloadPublic">Tải file .asc</button>
                            <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" id="genCopyPublic">Copy Key</button>
                        </div>
                    </div>
                    <div class="ba-form-group">
                        <label class="ba-form-label">Private Key (Base64)</label>
                        <textarea id="genResultPrivate" class="ba-input ba-key-preview" readonly></textarea>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" id="genDownloadPrivate">Tải file .asc</button>
                            <button type="button" class="ba-btn ba-btn-secondary ba-btn-sm" id="genCopyPrivate">Copy Key</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .ba-modal { position: fixed; inset: 0; z-index: 10003; display: flex; align-items: center; justify-content: center; padding: 1rem; }
            .ba-modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.7); }
            .ba-modal-content { position: relative; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 90vh; overflow: auto; }
            .ba-modal-result-keys { min-width: 520px; max-width: min(90vw, 720px); }
            .ba-modal-result-keys .ba-modal-body { padding: 1.25rem; min-width: 0; }
            .ba-key-preview { min-height: 100px; font-size: 0.8rem; font-family: Consolas, monospace; resize: vertical; }
            .ba-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
            .ba-modal-header h3 { margin: 0; font-size: 1.125rem; }
            .ba-modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0 4px; }
            .ba-modal-close:hover { color: var(--text-primary); }
            .ba-modal-body { padding: 1.25rem; }
        </style>
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
            var listConfigUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/GetFolderConfigList") %>';
            var getKeysUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/GetFolderConfigKeys") %>';
            var connectionInfoUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/GetConnectionInfo") %>';

            var pgpTokenK = (function () {
                var p = new URLSearchParams(window.location.search || '');
                return (p.get('k') || '').trim();
            })();
            var currentConfigKeys = null;

            if (!pgpTokenK) {
                $('#keyFromDbNoConnWrap').show();
                $('#keyFromDbControlsWrap').hide();
                $('#keyFromDbHint').hide();
                $('input[name="exportSrc"][value="config"]').closest('label').css('opacity', '0.5').find('input').prop('disabled', true);
                $('input[name="decKeySrc"][value="config"]').closest('label').css('opacity', '0.5').find('input').prop('disabled', true);
                $('input[name="encKeySrc"][value="config"]').closest('label').css('opacity', '0.5').find('input').prop('disabled', true);
            }

            (function ensureToastInBody() {
                var container = $('.toast-container');
                if (container.length && container.closest('form').length) container.appendTo(document.body);
            })();

            function showToast(msg, type) {
                var t = $('#toast').removeClass('success error').addClass(type || 'info').addClass('show');
                t.find('.toast-msg').text(msg);
                t.css('display', 'block').css('opacity', '1');
                var tmr = setTimeout(function () { t.removeClass('show').hide().css('display', 'none'); }, 4000);
                t.off('click.toastclose').on('click.toastclose', '.toast-close', function () { clearTimeout(tmr); t.removeClass('show').hide().css('display', 'none'); });
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
                var tabId = (t === 'export' ? 'Export' : t === 'decrypt' ? 'Decrypt' : t === 'encrypt' ? 'Encrypt' : t === 'generate' ? 'Generate' : 'Export');
                $('#tab' + tabId).addClass('active');
            });

            var configList = [];
            function loadFolderConfigList() {
                if (!pgpTokenK) return;
                $.ajax({
                    type: 'POST', url: listConfigUrl,
                    data: JSON.stringify({ tokenK: pgpTokenK }), contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        var $sel = $('#folderConfigSelect');
                        $sel.find('option:not(:first)').remove();
                        configList = (d && d.list) ? d.list : [];
                        for (var i = 0; i < configList.length; i++) {
                            var c = configList[i];
                            var label = c.code;
                            if (c.tenantName && c.tenantName !== '') label = c.tenantName + ' – ' + label;
                            else if (c.tenantId != null && c.tenantId !== '') label = 'Tenant ' + c.tenantId + ' – ' + label;
                            $sel.append($('<option></option>').attr('value', i).text(label));
                        }
                        if (!d || !d.success) { $('#configKeyStatus').text((d && d.message) || 'Không tải được danh sách.').css('color', 'var(--danger)'); return; }
                        if (configList.length > 0) {
                            $sel.val('0');
                            $('#btnLoadConfigKeys').trigger('click');
                        }
                    },
                    error: function () { $('#configKeyStatus').text('Lỗi kết nối khi tải danh sách.').css('color', 'var(--danger)'); }
                });
            }
            if (pgpTokenK) {
                $('#genSaveToDbWrap').show();
                $.ajax({
                    type: 'POST', url: connectionInfoUrl,
                    data: JSON.stringify({ tokenK: pgpTokenK }), contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        if (d && d.success && (d.server || d.database)) {
                            $('#connServerName').text(d.server || '');
                            $('#connDbName').text(d.database || '');
                            $('#connServerSep').toggle(!!(d.server && d.database));
                            $('#keyFromDbConnInfoWrap').show();
                        } else { $('#keyFromDbConnInfoWrap').hide(); }
                    }
                });
                loadFolderConfigList();
            } else { $('#genSaveToDbWrap').hide(); $('#keyFromDbConnInfoWrap').hide(); }

            $('#btnLoadConfigKeys').on('click', function () {
                if (!pgpTokenK) { $('#configKeyStatus').text('Chưa chọn database.').css('color', 'var(--danger)'); return; }
                var idx = $('#folderConfigSelect').val();
                $('#configKeyStatus').text('');
                if (idx === '' || idx === undefined) { $('#configKeyStatus').text('Chọn một cấu hình trước.').css('color', 'var(--text-muted)'); return; }
                var item = configList[parseInt(idx, 10)];
                if (!item) { $('#configKeyStatus').text('Cấu hình không hợp lệ.').css('color', 'var(--danger)'); return; }
                showProgress('Đang nạp key...', 'Vui lòng đợi');
                $.ajax({
                    type: 'POST', url: getKeysUrl,
                    data: JSON.stringify({ tokenK: pgpTokenK, tenantId: item.tenantId || '', code: item.code || '' }),
                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#configKeyStatus').text((d && d.message) || 'Lỗi').css('color', 'var(--danger)'); currentConfigKeys = null; return; }
                        currentConfigKeys = { encryptionPublicKey: d.encryptionPublicKey || '', encryptionPrimaryKey: d.encryptionPrimaryKey || '', code: d.code || item.code };
                        var statusText = 'Đã chọn: ' + (currentConfigKeys.code);
                        if (item.tenantName && item.tenantName !== '') statusText += ' (' + item.tenantName + ')';
                        else if (item.tenantId && item.tenantId !== '') statusText += ' (Tenant: ' + item.tenantId + ')';
                        $('#configKeyStatus').text(statusText + '.').css('color', 'var(--success)');
                    },
                    error: function () { hideProgress(); $('#configKeyStatus').text('Lỗi kết nối.').css('color', 'var(--danger)'); currentConfigKeys = null; }
                });
            });

            $('input[name="exportSrc"]').on('change', function () {
                var v = $(this).val();
                $('#exportPasteWrap').toggle(v === 'paste');
                if (v === 'config' && currentConfigKeys) {
                    var keyType = $('input[name="keyType"]:checked').val();
                    $('#exportKeyBase64').val(keyType === 'private' ? currentConfigKeys.encryptionPrimaryKey : currentConfigKeys.encryptionPublicKey);
                    $('#exportCode').val(currentConfigKeys.code || 'export');
                }
            });
            $('input[name="keyType"]').on('change', function () {
                if ($('input[name="exportSrc"]:checked').val() === 'config' && currentConfigKeys) {
                    var keyType = $(this).val();
                    $('#exportKeyBase64').val(keyType === 'private' ? currentConfigKeys.encryptionPrimaryKey : currentConfigKeys.encryptionPublicKey);
                }
            });

            $('input[name="decKeySrc"]').on('change', function () {
                var v = $(this).val();
                $('#decKeyFileWrap').toggle(v === 'file');
                $('#decKeyBase64Wrap').toggle(v === 'base64');
                $('#decKeyConfigWrap').toggle(v === 'config');
            });
            $('input[name="encKeySrc"]').on('change', function () {
                var v = $(this).val();
                $('#encKeyFileWrap').toggle(v === 'file');
                $('#encKeyBase64Wrap').toggle(v === 'base64');
                $('#encKeyConfigWrap').toggle(v === 'config');
            });

            var generateKeyUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/GeneratePgpKey") %>';
            var updateKeysUrl = '<%= ResolveUrl("~/Pages/PgpTool.aspx/UpdateFolderConfigKeys") %>';
            var genCaptchaA = 0, genCaptchaB = 0;
            var lastGeneratedPublic = '', lastGeneratedPrivate = '';
            function refreshGenCaptcha() {
                genCaptchaA = Math.floor(Math.random() * 9) + 1;
                genCaptchaB = Math.floor(Math.random() * 9) + 1;
                $('#genCaptchaQuestion').text(genCaptchaA + ' + ' + genCaptchaB + ' = ');
                $('#genCaptchaInput').val('');
            }
            function showGenResultModal(pubB64, privB64) {
                lastGeneratedPublic = pubB64; lastGeneratedPrivate = privB64;
                var truncate = function(s, len) { return s.length <= len ? s : s.substring(0, len) + '...'; };
                $('#genResultPublic').val(truncate(pubB64, 120)); $('#genResultPrivate').val(truncate(privB64, 120));
                $('#genResultModal').show();
            }
            function downloadFromBase64(b64, fileName) {
                var byteChars = atob(b64);
                var byteNumbers = new Array(byteChars.length);
                for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                var blob = new Blob([new Uint8Array(byteNumbers)]);
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(a.href);
            }
            $('#btnGenerateKey').on('click', function () {
                var pass = $('#genPassphrase').val() || '';
                var saveToDb = $('#genSaveToDb').is(':checked') && pgpTokenK;
                $('#genErr').hide();
                if (saveToDb) {
                    var idx = $('#folderConfigSelect').val();
                    if (idx === '' || idx === undefined) { $('#genErr').text('Chọn cấu hình (phía trên) trước khi bật "Lưu xuống DB".').show(); return; }
                    refreshGenCaptcha();
                    $('#genCaptchaModal').show();
                    $('#genCaptchaConfirm').off('click.genSave').on('click.genSave', function () {
                        var captchaVal = parseInt($('#genCaptchaInput').val(), 10);
                        if (captchaVal !== genCaptchaA + genCaptchaB) { showToast('Captcha không đúng. Vui lòng nhập lại.', 'error'); refreshGenCaptcha(); return; }
                        $('#genCaptchaModal').hide();
                        showProgress('Đang tạo key và lưu DB...', 'Vui lòng đợi');
                        $.ajax({
                            type: 'POST', url: generateKeyUrl,
                            data: JSON.stringify({ passphrase: pass }), contentType: 'application/json; charset=utf-8', dataType: 'json',
                            success: function (r1) {
                                var d1 = r1.d || r1;
                                if (!d1 || !d1.success) { hideProgress(); $('#genErr').text((d1 && d1.message) || 'Lỗi tạo key.').show(); return; }
                                var item = configList[parseInt($('#folderConfigSelect').val(), 10)];
                                $.ajax({
                                    type: 'POST', url: updateKeysUrl,
                                    data: JSON.stringify({ tokenK: pgpTokenK, tenantId: item.tenantId || '', code: item.code || '', publicKeyBase64: d1.publicKeyBase64, privateKeyBase64: d1.privateKeyBase64, captchaA: genCaptchaA, captchaB: genCaptchaB }),
                                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                                    success: function (r2) {
                                        hideProgress();
                                        var d2 = r2.d || r2;
                                        if (!d2 || !d2.success) { $('#genErr').text((d2 && d2.message) || 'Lỗi lưu DB.').show(); return; }
                                        showToast('Đã lưu key xuống database.', 'success');
                                        showGenResultModal(d1.publicKeyBase64, d1.privateKeyBase64);
                                    },
                                    error: function () { hideProgress(); $('#genErr').text('Lỗi kết nối khi lưu DB.').show(); }
                                });
                            },
                            error: function () { hideProgress(); $('#genErr').text('Lỗi kết nối khi tạo key.').show(); }
                        });
                    });
                    return;
                }
                showProgress('Đang tạo key...', 'Vui lòng đợi');
                $.ajax({
                    type: 'POST', url: generateKeyUrl,
                    data: JSON.stringify({ passphrase: pass }), contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#genErr').text((d && d.message) || 'Lỗi').show(); return; }
                        showGenResultModal(d.publicKeyBase64, d.privateKeyBase64);
                    },
                    error: function () { hideProgress(); $('#genErr').text('Lỗi kết nối.').show(); }
                });
            });
            function bindPasswordToggle(inputId, btnId) {
                var $input = $('#' + inputId);
                var $btn = $('#' + btnId);
                $btn.on('click', function () {
                    if ($input.attr('type') === 'password') {
                        $input.attr('type', 'text');
                        $btn.text('🙈').attr('title', 'Ẩn passphrase');
                    } else {
                        $input.attr('type', 'password');
                        $btn.text('👁').attr('title', 'Hiện passphrase');
                    }
                });
            }
            bindPasswordToggle('decPassphrase', 'decPassphraseToggle');
            bindPasswordToggle('genPassphrase', 'genPassphraseToggle');

            (function initInfoIcons() {
                $(document).off('click.baInfoClose').on('click.baInfoClose', function (e) {
                    if ($(e.target).closest('.ba-info-wrap').length) return;
                    $('.ba-info-popover.show').removeClass('show').hide();
                });
                $(document).on('click', '.ba-info-icon', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var $wrap = $(this).closest('.ba-info-wrap');
                    var pop = $wrap.find('.ba-info-popover');
                    if (!pop.length) return;
                    var isShow = pop.hasClass('show');
                    $('.ba-info-popover.show').not(pop).removeClass('show').hide();
                    if (isShow) { pop.removeClass('show').hide(); } else { pop.addClass('show').show(); }
                });
                $(document).on('click', '.ba-info-popover', function (e) { e.stopPropagation(); });
            })();

            $('#genCaptchaClose, #genCaptchaCancel').on('click', function () { $('#genCaptchaModal').hide(); });
            $('#genCaptchaModal .ba-modal-backdrop').on('click', function () { $('#genCaptchaModal').hide(); });
            $('#btnRefreshGenCaptcha').on('click', refreshGenCaptcha);
            $('#genResultClose').on('click', function () { $('#genResultModal').hide(); });
            $('#genResultModal .ba-modal-backdrop').on('click', function () { $('#genResultModal').hide(); });
            $('#genDownloadPublic').on('click', function () { if (lastGeneratedPublic) downloadFromBase64(lastGeneratedPublic, 'Public_Key_' + new Date().toISOString().slice(0,10) + '.asc'); });
            $('#genDownloadPrivate').on('click', function () { if (lastGeneratedPrivate) downloadFromBase64(lastGeneratedPrivate, 'Private_Key_' + new Date().toISOString().slice(0,10) + '.asc'); });
            function copyToClipboard(text, successMsg) {
                function showDone() { showToast(successMsg, 'success'); }
                function showFail() { showToast('Copy thất bại. Trình duyệt có thể chặn quyền copy.', 'error'); }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(showDone).catch(function () {
                        var ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed'; ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        try {
                            if (document.execCommand('copy')) showDone();
                            else showFail();
                        } catch (e) { showFail(); }
                        document.body.removeChild(ta);
                    });
                    return;
                }
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed'; ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                try {
                    var ok = document.execCommand('copy');
                    if (ok) showDone();
                    else showFail();
                } catch (e) { showFail(); }
                document.body.removeChild(ta);
            }
            $('#genCopyPublic').on('click', function () {
                if (lastGeneratedPublic) copyToClipboard(lastGeneratedPublic, 'Đã copy Public Key (Base64) vào clipboard.');
                else showToast('Không có nội dung để copy.', 'error');
            });
            $('#genCopyPrivate').on('click', function () {
                if (lastGeneratedPrivate) copyToClipboard(lastGeneratedPrivate, 'Đã copy Private Key (Base64) vào clipboard.');
                else showToast('Không có nội dung để copy.', 'error');
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
                var exportSrc = $('input[name="exportSrc"]:checked').val();
                var key = exportSrc === 'config' && currentConfigKeys
                    ? ($('input[name="keyType"]:checked').val() === 'private' ? currentConfigKeys.encryptionPrimaryKey : currentConfigKeys.encryptionPublicKey)
                    : $('#exportKeyBase64').val().trim();
                var keyType = $('input[name="keyType"]:checked').val();
                var code = (exportSrc === 'config' && currentConfigKeys && currentConfigKeys.code) ? currentConfigKeys.code : ($('#exportCode').val().trim() || 'export');
                $('#exportErr').hide();
                if (!key) { $('#exportErr').text(exportSrc === 'config' ? 'Chọn cấu hình và bấm Nạp key trước.' : 'Vui lòng dán chuỗi key (Base64).').show(); return; }
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
                if (keySrc === 'config' && (!currentConfigKeys || !currentConfigKeys.encryptionPrimaryKey)) { $('#decryptErr').text('Chọn cấu hình và bấm Nạp key trước.').show(); return; }
                showProgress('Đang giải mã file...', 'Đang đọc file và xử lý, vui lòng đợi');
                setTimeout(function () {
                    fileToBase64(encFile, function (encB64) {
                        var privB64 = (keySrc === 'config' && currentConfigKeys) ? currentConfigKeys.encryptionPrimaryKey : keyB64;
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
                if (keySrc === 'config' && (!currentConfigKeys || !currentConfigKeys.encryptionPublicKey)) { $('#encryptErr').text('Chọn cấu hình và bấm Nạp key trước.').show(); return; }
                showProgress('Đang mã hóa file...', 'Đang đọc file và xử lý, vui lòng đợi');
                setTimeout(function () {
                    fileToBase64(inpFile, function (inpB64) {
                        var pubB64 = (keySrc === 'config' && currentConfigKeys) ? currentConfigKeys.encryptionPublicKey : keyB64;
                        var compress = $('#encryptCompress').is(':checked');
                        if (keySrc === 'file') {
                            showProgress('Đang mã hóa file...', 'Đang đọc public key...');
                            fileToBase64(keyFile, function (k) {
                                doEncrypt(inpB64, inpFile.name, k, ext, compress);
                            });
                        } else {
                            doEncrypt(inpB64, inpFile.name, pubB64, ext, compress);
                        }
                    });
                }, 100);
            });
            function doEncrypt(inpB64, origName, pubB64, ext, compress) {
                if (typeof compress === 'undefined') compress = true;
                $.ajax({
                    type: 'POST', url: encryptUrl,
                    data: JSON.stringify({ inputFileBase64: inpB64, inputFileName: origName, publicKeyBase64: pubB64, armor: ext === '.asc', compress: compress }),
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
