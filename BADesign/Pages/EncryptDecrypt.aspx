<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="EncryptDecrypt.aspx.cs"
    Inherits="BADesign.Pages.EncryptDecrypt" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Encrypt/Decrypt Data - HR Helper</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
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
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-main); color: var(--text-primary); line-height: 1.6; overflow-x: hidden; }
        .ba-container { display: flex; min-height: 100vh; overflow: hidden; }
        .ba-sidebar {
            width: 240px; background: var(--bg-darker); border-right: 1px solid var(--border);
            padding: 1.5rem 0; flex-shrink: 0; display: flex; flex-direction: column; overflow-y: auto;
            position: fixed; left: 0; top: 0; bottom: 0; z-index: 9999;
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
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-nav { padding: 1rem 0; }
        .ba-nav-item { display: block; padding: 0.75rem 1.5rem; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--bg-hover); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-left: 240px; transition: margin-left 0.25s ease; }
        .ba-sidebar.collapsed ~ .ba-main { margin-left: 64px; }
        .ba-top-bar {
            padding: 1rem 2rem; background: var(--bg-card); border-bottom: 1px solid var(--border);
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; flex-shrink: 0; position: sticky; top: 0; z-index: 100;
        }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
        .ba-conn-label { font-size: 0.875rem; color: var(--text-secondary); }
        .ba-conn-label strong { color: var(--primary-light); }
        .ba-content { flex: 1; padding: 1rem 1.5rem; overflow-y: auto; overflow-x: hidden; }
        .ba-tabs { display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border); margin-bottom: 1.5rem; flex-shrink: 0; }
        .ba-tab { padding: 0.75rem 1.5rem; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.9375rem; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .ba-tab:hover { color: var(--text-primary); }
        .ba-tab.active { color: var(--primary-light); border-bottom-color: var(--primary); }
        .ba-tab-content { display: none; }
        .ba-tab-content.active { display: block; }
        .ba-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .ba-form-group { margin-bottom: 1rem; }
        .ba-form-label { display: block; margin-bottom: 0.5rem; color: var(--text-primary); font-size: 0.875rem; font-weight: 500; }
        .ba-form-label-row { display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .ba-form-label-row .ba-form-label { margin-bottom: 0; flex: 0 0 auto; }
        .ba-input { width: 100%; padding: 0.5rem 0.75rem; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.875rem; }
        .ba-input:focus { outline: none; border-color: var(--primary); }
        .ba-input:disabled { opacity: 0.5; cursor: not-allowed; }
        textarea.ba-input { min-height: 80px; resize: vertical; }
        .ba-checkbox { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
        .ba-checkbox input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
        .ba-btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem; }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-secondary:hover { background: var(--bg-card); }
        .ba-btn:disabled, .ba-btn[disabled] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .ba-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.5rem; }
        .ba-result-wrap { display: flex; gap: 0.5rem; align-items: flex-start; margin-top: 0.5rem; }
        .ba-result-wrap textarea { flex: 1; min-height: 100px; }
        .ba-err { color: var(--danger); font-size: 0.875rem; margin-top: 0.5rem; }
        .ba-table-wrap { overflow: auto; margin: 1rem 0; max-height: 320px; border: 1px solid var(--border); border-radius: 6px; }
        .ba-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .ba-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: var(--text-primary); background: var(--bg-darker); border-bottom: 1px solid var(--border); }
        .ba-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-primary); }
        .ba-table tbody tr:hover { background: var(--bg-hover); }
        .ba-empty { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; }
        .ba-progress-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10001; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 1rem; color: var(--text-primary); }
        .ba-progress-overlay.show { display: flex; }
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 10002; display: flex; flex-direction: column; gap: 0.5rem; }
        .toast { position: relative; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 2.5rem 1rem 1.25rem; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none; align-items: flex-start; gap: 0.75rem; }
        .toast .toast-msg { flex: 1; }
        .toast .toast-close { position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0 4px; margin: 0; font-size: 1.25rem; line-height: 1; flex-shrink: 0; }
        .toast .toast-close:hover { color: var(--text-primary); }
        .toast.show { display: flex; }
        .toast.error { border-left: 4px solid var(--danger); }
        .toast.success { border-left: 4px solid var(--success); }
        .script-preview { font-family: Consolas, monospace; font-size: 0.8rem; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
        .ba-warn { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; }
        .ba-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 900px) { .ba-grid-2 { grid-template-columns: 1fr; } }
        .ba-encdec-cards { align-items: start; }
        .ba-encdec-cards .ba-card .ba-form-group { margin-bottom: 1.25rem; }
        .ba-encdec-cards .ba-card .ba-form-group:last-of-type { margin-bottom: 1rem; }
        .ba-tabs-inner { border-bottom: 1px solid var(--border); padding-bottom: 0; }
        .ba-tab-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }
        .ba-source-radio { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
        .ba-source-radio label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        /* Collapsible card */
        .ba-card-collapsible .ba-card-header-wrap { display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; padding: 0; margin-bottom: 1rem; }
        .ba-card-collapsible .ba-card-header-wrap .ba-card-title { margin-bottom: 0; }
        .ba-card-collapsible .ba-card-toggle { color: var(--text-muted); font-size: 0.875rem; transition: transform 0.2s; }
        .ba-card-collapsible.collapsed .ba-card-toggle { transform: rotate(-90deg); }
        .ba-card-collapsible .ba-card-body { transition: opacity 0.15s; }
        .ba-card-collapsible.collapsed .ba-card-body { display: none !important; }
        /* Result grid: search, sort, resize */
        .ba-table-search { margin-bottom: 0.5rem; }
        .ba-table-search input { max-width: 280px; padding: 0.4rem 0.75rem; font-size: 0.875rem; }
        .ba-table th.ba-sortable { cursor: pointer; user-select: none; white-space: nowrap; position: relative; padding-right: 1.5rem; }
        .ba-table th.ba-sortable:hover { background: var(--bg-hover); }
        .ba-table th .ba-sort-icon { margin-left: 4px; opacity: 0.7; font-size: 0.75rem; }
        .ba-table th .ba-col-resize { position: absolute; right: 0; top: 0; bottom: 0; width: 6px; cursor: col-resize; }
        .ba-table th .ba-col-resize:hover { background: var(--primary); opacity: 0.3; }
        .ba-table-wrap.decrypt-result { position: relative; }
        /* Dùng chung Key: căn trái, checkbox + label + icon cùng 1 dòng */
        #subEncdecSingle { text-align: left; }
        .ba-sharedkey-card { width: 100%; text-align: left; }
        .ba-sharedkey-card .ba-form-group { margin-bottom: 0; }
        .ba-sharedkey-row {
            display: flex !important; flex-direction: row !important; align-items: center; gap: 0.5rem;
            flex-wrap: nowrap !important; justify-content: flex-start; width: 100%;
        }
        .ba-sharedkey-row .ba-checkbox {
            margin-bottom: 0; flex: 0 0 auto; min-width: 0;
            display: inline-flex !important; align-items: center;
        }
        .ba-sharedkey-row .ba-checkbox label { white-space: nowrap; }
        .ba-sharedkey-row .ba-info-wrap {
            flex: 0 0 auto; min-width: 0;
            display: inline-flex !important; align-items: center;
        }
        /* Info icon (chữ i trong vòng tròn) + popover */
        .ba-info-icon {
            display: inline-flex; align-items: center; justify-content: center;
            width: 18px; height: 18px; border-radius: 50%;
            border: 1px solid var(--text-muted); color: var(--text-muted);
            font-size: 0.75rem; font-weight: 600; font-style: italic;
            cursor: pointer; flex-shrink: 0;
            transition: border-color 0.2s, color 0.2s;
        }
        .ba-info-icon:hover { border-color: var(--primary-light); color: var(--primary-light); }
        .ba-form-group .ba-info-icon { vertical-align: middle; margin-left: 2px; }
        .ba-info-popover {
            position: absolute; z-index: 1000;
            bottom: 100%; left: 0;
            margin-bottom: 6px; margin-top: 0;
            width: 360px; max-width: min(380px, calc(100vw - 2rem));
            padding: 0.75rem 1rem;
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: 8px; font-size: 0.8125rem; line-height: 1.5;
            color: var(--text-secondary); box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            box-sizing: border-box;
            white-space: normal;
            overflow-wrap: break-word;
            word-break: break-word;
        }
        .ba-info-popover.show { display: block !important; }
        .ba-info-wrap { position: relative; }
        .ba-key-password-wrap {
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .ba-key-password-wrap .ba-input { flex: 1; }
        .ba-eye-btn {
            width: 38px;
            height: 36px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--bg-hover);
            color: var(--text-primary);
            cursor: pointer;
            flex-shrink: 0;
        }
        .ba-eye-btn:hover { background: var(--bg-card); }
        #tabConnstr .ba-connstr-key-inp[readonly] {
            cursor: default;
            background: var(--bg-hover);
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <uc:BaSidebar ID="ucBaSidebar" runat="server" />
            <main class="ba-main">
                <uc:BaTopBar ID="ucBaTopBar" runat="server" />
                <div class="ba-conn-label" id="connLabel" style="display: none; padding: 0 2rem 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                    <span>HR DB: <strong><%= ConnectedServer %> / <%= ConnectedDatabase %></strong></span>
                </div>
                <div class="ba-content">
                    <div class="ba-tabs">
                        <button type="button" class="ba-tab active" data-tab="encdec">Encrypt / Decrypt</button>
                        <button type="button" class="ba-tab" data-tab="connstr">Connection String</button>
                        <button type="button" class="ba-tab" data-tab="demoreset">Generate Demo Reset Script</button>
                    </div>

                    <!-- Tab Encrypt / Decrypt: Đơn + Giải mã hàng loạt -->
                    <div id="tabEncdec" class="ba-tab-content active">
                        <div class="ba-tabs ba-tabs-inner" style="margin-bottom: 1rem;">
                            <button type="button" class="ba-tab ba-tab-sm active" data-subtab-encdec="single">Đơn</button>
                            <button type="button" class="ba-tab ba-tab-sm" data-subtab-encdec="batchdecrypt">Giải mã hàng loạt</button>
                        </div>
                        <!-- Sub: Đơn (mã hóa / giải mã từng giá trị) -->
                        <div id="subEncdecSingle" class="ba-subtab-encdec">
                        <div class="ba-card ba-sharedkey-card">
                            <div class="ba-form-group ba-sharedkey-row">
                                <div class="ba-checkbox" style="margin-bottom: 0;">
                                    <input type="checkbox" id="chkSharedKey" />
                                    <label for="chkSharedKey">Dùng chung Key cho Encrypt &amp; Decrypt</label>
                                </div>
                                <span class="ba-info-wrap">
                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                    <div id="popoverSharedKey" class="ba-info-popover" style="display: none;">
                                        Khi bật: Key chọn ở khung Encrypt sẽ tự áp dụng cho khung Decrypt (và ngược lại), không cần chọn Key hai lần. Tiện khi mã hóa rồi giải mã thử cùng một key.
                                    </div>
                                </span>
                            </div>
                        </div>
                        <div class="ba-grid-2 ba-encdec-cards">
                            <div class="ba-card">
                                <h2 class="ba-card-title">Encrypt</h2>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="txtPlain">Văn bản gốc (plain text)</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Giá trị cần mã hóa: số điện thoại, email, số CMND, v.v. Nhập trực tiếp văn bản chưa mã hóa trước khi bấm Encrypt.</div>
                                        </span>
                                    </div>
                                    <textarea id="txtPlain" class="ba-input" placeholder="Nhập giá trị cần mã hóa (vd. số điện thoại, email, số)." rows="4"></textarea>
                                </div>
                                <div class="ba-form-group enc-key">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label">Key (tùy chọn)</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Key dùng để mã hóa: None (global), Employee ID (số), hoặc chuỗi (vd. Local ID). Cùng key phải dùng khi giải mã. Nếu bật &quot;Dùng chung Key&quot; thì key này tự áp dụng cho khung Decrypt.</div>
                                        </span>
                                    </div>
                                    <select id="selKeyType" class="ba-input" style="margin-bottom: 0.5rem;">
                                        <option value="none">None (global)</option>
                                        <option value="employeeId">Employee ID</option>
                                        <option value="string">String (vd. Local ID)</option>
                                    </select>
                                    <input type="number" id="txtKeyEmployeeId" class="ba-input" placeholder="Employee ID" style="display: none;" />
                                    <input type="text" id="txtKeyString" class="ba-input" placeholder="Chuỗi key (vd. LocalEmployeeID)" style="display: none;" />
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnEncrypt">Encrypt</button>
                                <div id="encErr" class="ba-err" style="display: none;"></div>
                                <div class="ba-form-group" id="encResultWrap" style="display: none;">
                                    <label class="ba-form-label">Kết quả</label>
                                    <div class="ba-result-wrap">
                                        <textarea id="txtEncrypted" class="ba-input" readonly rows="4"></textarea>
                                        <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyEnc">Copy</button>
                                    </div>
                                </div>
                            </div>
                            <div class="ba-card">
                                <h2 class="ba-card-title">Decrypt</h2>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="txtEncryptedIn">Chuỗi đã mã hóa (encrypted text, base64)</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Dán chuỗi đã mã hóa (dạng base64) xuất ra từ hệ thống. Key giải mã phải trùng với key đã dùng khi mã hóa (None / Employee ID / chuỗi).</div>
                                        </span>
                                    </div>
                                    <textarea id="txtEncryptedIn" class="ba-input" placeholder="Dán chuỗi đã mã hóa (base64)." rows="4"></textarea>
                                </div>
                                <div class="ba-form-group dec-key">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label">Key (tùy chọn)</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Key dùng để giải mã: phải trùng với key đã dùng khi mã hóa (None, Employee ID, hoặc chuỗi). Nếu bật &quot;Dùng chung Key&quot; thì key chọn ở khung Encrypt sẽ tự điền vào đây.</div>
                                        </span>
                                    </div>
                                    <select id="selKeyTypeDec" class="ba-input" style="margin-bottom: 0.5rem;">
                                        <option value="none">None (global)</option>
                                        <option value="employeeId">Employee ID</option>
                                        <option value="string">String (vd. Local ID)</option>
                                    </select>
                                    <input type="number" id="txtKeyEmployeeIdDec" class="ba-input" placeholder="Employee ID" style="display: none;" />
                                    <input type="text" id="txtKeyStringDec" class="ba-input" placeholder="Chuỗi key (vd. LocalEmployeeID)" style="display: none;" />
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnDecrypt">Decrypt</button>
                                <div id="decErr" class="ba-err" style="display: none;"></div>
                                <div class="ba-form-group" id="decResultWrap" style="display: none;">
                                    <label class="ba-form-label">Kết quả</label>
                                    <div class="ba-result-wrap">
                                        <textarea id="txtDecrypted" class="ba-input" readonly rows="4"></textarea>
                                        <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyDec">Copy</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                        <!-- Sub: Giải mã hàng loạt -->
                        <div id="subEncdecBatch" class="ba-subtab-encdec" style="display: none;">
                            <div class="ba-card ba-card-collapsible" id="cardDecryptInput">
                                <div class="ba-card-header-wrap" data-toggle="card">
                                    <h2 class="ba-card-title">Giải mã để xem</h2>
                                    <span class="ba-card-toggle" title="Thu gọn / Mở rộng">▼</span>
                                </div>
                                <div class="ba-card-body">
                                    <p class="ba-warn">Dán dữ liệu từ SQL (CSV/TSV, có header). Cột Key (tùy chọn) dùng để giải mã theo từng dòng; nếu không chọn hoặc key null/trống thì dòng vẫn hiển thị (cột giải mã có thể để nguyên hoặc [key trống]). Chọn các cột cần giải mã.</p>
                                    <div class="ba-form-group">
                                        <div class="ba-form-label-row">
                                            <label class="ba-form-label" for="txtDecryptGridCsv">Dữ liệu (CSV/TSV)</label>
                                            <span class="ba-info-wrap">
                                                <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                <div class="ba-info-popover" style="display: none;">Dán kết quả copy từ SQL (CSV hoặc TSV), dòng đầu là header. Mỗi dòng có thể có cột chứa key (vd. EmployeeID) dùng để giải mã theo từng dòng.</div>
                                            </span>
                                        </div>
                                        <textarea id="txtDecryptGridCsv" class="ba-input" placeholder="EmployeeID,MobilePhone1,BusinessEmail&#10;26474,3OSo/+iDCY6...,abc123base64..." rows="6"></textarea>
                                    </div>
                                    <div class="ba-form-group">
                                        <div class="ba-form-label-row">
                                            <label class="ba-form-label">Cột Key (tùy chọn, dùng để giải mã theo dòng)</label>
                                            <span class="ba-info-wrap">
                                                <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                <div class="ba-info-popover" style="display: none;">Chọn cột chứa key (vd. EmployeeID). Mỗi dòng sẽ dùng key tương ứng để giải mã. Nếu không chọn hoặc key trống, dòng vẫn hiển thị (cột giải mã để nguyên hoặc [key trống]).</div>
                                            </span>
                                        </div>
                                        <select id="selDecryptKeyCol" class="ba-input" style="max-width: 200px;"><option value="">-- Chọn sau khi dán --</option></select>
                                    </div>
                                    <div class="ba-form-group">
                                        <div class="ba-form-label-row">
                                            <label class="ba-form-label">Các cột cần giải mã</label>
                                            <span class="ba-info-wrap">
                                                <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                <div class="ba-info-popover" style="display: none;">Bấm &quot;Phân tích cột&quot; sau khi dán data để hiện danh sách cột. Tick các cột chứa dữ liệu đã mã hóa cần giải mã để xem plain text.</div>
                                            </span>
                                        </div>
                                        <div id="chkDecryptCols" style="display: flex; flex-wrap: wrap; gap: 0.75rem;"></div>
                                    </div>
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnParseDecrypt">Phân tích cột</button>
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnDecryptGrid" style="margin-left: 0.5rem;">Giải mã</button>
                                    <div id="decryptGridErr" class="ba-err" style="display: none;"></div>
                                </div>
                            </div>
                            <div class="ba-card ba-card-collapsible" id="cardDecryptResult" style="display: none;">
                                <div class="ba-card-header-wrap" data-toggle="card">
                                    <h2 class="ba-card-title">Kết quả</h2>
                                    <span class="ba-card-toggle" title="Thu gọn / Mở rộng">▼</span>
                                </div>
                                <div class="ba-card-body">
                                    <div class="ba-table-search">
                                        <input type="text" id="decryptResultSearch" class="ba-input" placeholder="Tìm trong lưới kết quả..." />
                                    </div>
                                    <div class="ba-table-wrap decrypt-result" style="max-height: 400px;">
                                        <table class="ba-table" id="tblDecryptResult" style="table-layout: fixed;"></table>
                                    </div>
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnDownloadDecryptCsv" style="margin-top: 0.5rem;">Download file CSV</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Connection String -->
                    <div id="tabConnstr" class="ba-tab-content">
                        <div class="ba-card" style="margin-bottom: 1rem;">
                            <h2 class="ba-card-title" style="font-size: 1rem; margin-bottom: 0.5rem;">Lưu ý:</h2>
                            <p class="ba-warn" style="margin: 0 0 0.6rem 0;">
                                Để chạy ở chế độ mã hóa Connection String, cần chỉnh trong <code>AppSettings.config</code>:
                            </p>
                            <pre class="script-preview" style="margin: 0;"><code>&lt;!--EncryptConnectStringMode: Default, <span style="color:#f59e0b;font-weight:700;">Encrypted</span>--&gt;
&lt;add key="EncryptConnectStringMode" value="<span style="color:#f59e0b;font-weight:700;">Encrypted</span>" /&gt;</code></pre>
                        </div>
                        <div class="ba-grid-2 ba-encdec-cards">
                            <div class="ba-card">
                                <h2 class="ba-card-title">Mã hóa Connection String</h2>
                                <div class="ba-form-group">
                                    <label class="ba-form-label" for="txtConnStrPlain">Connection String gốc</label>
                                    <textarea id="txtConnStrPlain" class="ba-input" placeholder="Data Source=...;Initial Catalog=...;User ID=...;Password=...;" rows="5"></textarea>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="txtConnStrKeyEnc">Key</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Mặc định dùng Key chuẩn (STD). Nếu cần điều chỉnh Key theo dự án thì bỏ Check STD Key và nhập giá trị Key vào.</div>
                                        </span>
                                    </div>
                                    <div class="ba-checkbox" style="margin-bottom: 0.5rem;">
                                        <input type="checkbox" id="chkConnStrUseStdEnc" checked="checked" />
                                        <label for="chkConnStrUseStdEnc">Dùng STD Key</label>
                                    </div>
                                    <div class="ba-key-password-wrap">
                                        <input type="password" id="txtConnStrKeyEnc" class="ba-input ba-connstr-key-inp" autocomplete="off" />
                                        <button type="button" class="ba-eye-btn" data-eye-target="txtConnStrKeyEnc" title="Hiện/ẩn key">👁</button>
                                    </div>
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnEncryptConnStr">Mã hóa</button>
                                <div id="connEncErr" class="ba-err" style="display:none;"></div>
                                <div class="ba-form-group" id="connEncResultWrap" style="display:none;">
                                    <label class="ba-form-label">Kết quả mã hóa</label>
                                    <div class="ba-result-wrap">
                                        <textarea id="txtConnStrEncrypted" class="ba-input" readonly rows="4"></textarea>
                                        <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyConnEnc">Copy</button>
                                    </div>
                                </div>
                            </div>
                            <div class="ba-card">
                                <h2 class="ba-card-title">Giải mã Connection String</h2>
                                <div class="ba-form-group">
                                    <label class="ba-form-label" for="txtConnStrEncryptedIn">Chuỗi đã mã hóa</label>
                                    <textarea id="txtConnStrEncryptedIn" class="ba-input" placeholder="Dán chuỗi đã mã hóa (base64)." rows="5"></textarea>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="txtConnStrKeyDec">Key</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Mặc định dùng Key chuẩn (STD). Nếu cần điều chỉnh Key theo dự án thì bỏ Check STD Key và nhập giá trị Key vào.</div>
                                        </span>
                                    </div>
                                    <div class="ba-checkbox" style="margin-bottom: 0.5rem;">
                                        <input type="checkbox" id="chkConnStrUseStdDec" checked="checked" />
                                        <label for="chkConnStrUseStdDec">Dùng STD Key</label>
                                    </div>
                                    <div class="ba-key-password-wrap">
                                        <input type="password" id="txtConnStrKeyDec" class="ba-input ba-connstr-key-inp" autocomplete="off" />
                                        <button type="button" class="ba-eye-btn" data-eye-target="txtConnStrKeyDec" title="Hiện/ẩn key">👁</button>
                                    </div>
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnDecryptConnStr">Giải mã</button>
                                <div id="connDecErr" class="ba-err" style="display:none;"></div>
                                <div class="ba-form-group" id="connDecResultWrap" style="display:none;">
                                    <label class="ba-form-label">Kết quả giải mã</label>
                                    <div class="ba-result-wrap">
                                        <textarea id="txtConnStrDecrypted" class="ba-input" readonly rows="4"></textarea>
                                        <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyConnDec">Copy</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Generate Demo Reset Script -->
                    <div id="tabDemoreset" class="ba-tab-content">
                        <div class="ba-tabs ba-tabs-inner" style="margin-bottom: 1rem;">
                            <button type="button" class="ba-tab ba-tab-sm active" data-subtab="demoreset">Demo Reset</button>
                            <button type="button" class="ba-tab ba-tab-sm" data-subtab="encryptscript">Mã hóa + Script</button>
                        </div>
                        <!-- Sub-tab: Demo Reset -->
                        <div id="subDemoreset" class="ba-subtab">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Cách dùng</h2>
                            <ol class="ba-warn" style="margin-left: 1.25rem; padding-left: 0.5rem;">
                                <li><strong>Từ HR DB:</strong> Kết nối qua Database Tools → Connect → HR Helper → bấm &quot;Generate Demo Reset Script&quot; (hoặc mở trang với <code>?k=...</code>). Chọn Company (hoặc Tất cả) → <strong>Load danh sách</strong> → chọn nhân viên cần reset.</li>
                                <li><strong>Từ CSV:</strong> Dán nội dung CSV có header <code>EmployeeID,LocalEmployeeID</code> (LocalEmployeeID bắt buộc nếu reset Payslip theo Local ID).</li>
                                <li>Điền <strong>Cấu hình reset</strong> (demo phone, demo email, mask salary, payslip…) và chọn <strong>Fields to reset</strong>.</li>
                                <li>Bấm <strong>Tạo script</strong> → tải file .sql, chạy tại DB khách hàng (nhớ backup trước).</li>
                            </ol>
                        </div>
                        <div class="ba-card">
                            <h2 class="ba-card-title">Nguồn dữ liệu</h2>
                            <div class="ba-source-radio">
                                <label><input type="radio" name="src" value="hrdb" id="radioHrdb" /> Từ HR DB (cần kết nối)</label>
                                <label><input type="radio" name="src" value="csv" id="radioCsv" checked /> Từ CSV</label>
                            </div>
                            <div id="srcHrdb" style="display: none;">
                                <p class="ba-warn">Đã kết nối thì chọn Company (lọc) rồi bấm <strong>Load danh sách</strong>. Chưa kết nối: vào Database Tools → Connect → HR Helper → bấm &quot;Generate Demo Reset Script&quot; hoặc mở trang với <code>?k=...</code>.</p>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="selCompany">Company (lọc)</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Lọc nhân viên theo Company trước khi load danh sách. Chọn &quot;Tất cả&quot; để lấy mọi company.</div>
                                        </span>
                                    </div>
                                    <select id="selCompany" class="ba-input" style="max-width: 320px;"><option value="">-- Tất cả --</option></select>
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnLoadEmployees">Load danh sách</button>
                            </div>
                            <div id="srcCsv" class="ba-form-group">
                                <div class="ba-form-label-row">
                                    <label class="ba-form-label" for="txtCsv">CSV (EmployeeID, LocalEmployeeID)</label>
                                    <span class="ba-info-wrap">
                                        <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                        <div class="ba-info-popover" style="display: none;">Dán CSV có header EmployeeID, LocalEmployeeID. LocalEmployeeID bắt buộc nếu reset Payslip theo Local ID.</div>
                                    </span>
                                </div>
                                <textarea id="txtCsv" class="ba-input" placeholder="EmployeeID,LocalEmployeeID&#10;1001,E001&#10;1002,E002" rows="6"></textarea>
                            </div>
                        </div>
                        <div class="ba-card">
                            <h2 class="ba-card-title">Cấu hình reset</h2>
                            <div class="ba-grid-2">
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="cfgDemoPhone">Demo phone</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Số điện thoại mẫu sẽ gán cho các cột mobile đã chọn trong Fields to reset.</div>
                                        </span>
                                    </div>
                                    <input type="text" id="cfgDemoPhone" class="ba-input" placeholder="vd. 0900000000" />
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="cfgDemoEmail">Demo email</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Email mẫu sẽ gán cho các cột email đã chọn trong Fields to reset.</div>
                                        </span>
                                    </div>
                                    <input type="text" id="cfgDemoEmail" class="ba-input" placeholder="vd. demo@company.com" />
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="cfgMaskSalary">Mask salary (số)</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Giá trị thay thế cho Basic Salary khi chọn reset Basic Salary (vd. 0 để ẩn lương).</div>
                                        </span>
                                    </div>
                                    <input type="number" id="cfgMaskSalary" class="ba-input" value="0" />
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label">Payslip</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Reset mã payslip: theo Local ID từng nhân viên hoặc chuỗi chung. Local ID bắt buộc nếu chọn theo Local ID.</div>
                                        </span>
                                    </div>
                                    <div class="ba-checkbox"><input type="checkbox" id="cfgPayslip" /><label for="cfgPayslip">Reset payslip</label></div>
                                    <div class="ba-source-radio">
                                        <label><input type="radio" name="payslipMode" value="local" checked /> Theo Local ID</label>
                                        <label><input type="radio" name="payslipMode" value="custom" /> Chuỗi chung</label>
                                    </div>
                                    <input type="text" id="cfgPayslipCustom" class="ba-input" placeholder="Chuỗi payslip chung" style="margin-top: 0.5rem; display: none;" />
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <div class="ba-form-label-row">
                                    <label class="ba-form-label">Fields to reset</label>
                                    <span class="ba-info-wrap">
                                        <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                        <div class="ba-info-popover" style="display: none;">Chọn các trường sẽ bị ghi đè bởi giá trị demo (phone, email, payslip, basic salary) khi chạy script.</div>
                                    </span>
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
                                    <div class="ba-checkbox" style="margin-bottom: 0;"><input type="checkbox" id="cfgPersonalEmail" /><label for="cfgPersonalEmail">Personal Email</label></div>
                                    <div class="ba-checkbox" style="margin-bottom: 0;"><input type="checkbox" id="cfgBusinessEmail" /><label for="cfgBusinessEmail">Business Email</label></div>
                                    <div class="ba-checkbox" style="margin-bottom: 0;"><input type="checkbox" id="cfgMobile1" /><label for="cfgMobile1">Mobile 1</label></div>
                                    <div class="ba-checkbox" style="margin-bottom: 0;"><input type="checkbox" id="cfgMobile2" /><label for="cfgMobile2">Mobile 2</label></div>
                                    <div class="ba-checkbox" style="margin-bottom: 0;"><input type="checkbox" id="cfgPayslipF" /><label for="cfgPayslipF">Payslip</label></div>
                                    <div class="ba-checkbox" style="margin-bottom: 0;"><input type="checkbox" id="cfgBasicSalary" /><label for="cfgBasicSalary">Basic Salary</label></div>
                                </div>
                            </div>
                        </div>
                        <div class="ba-card" id="cardEmployees" style="display: none;">
                            <h2 class="ba-card-title">Danh sách employee</h2>
                            <div class="ba-table-wrap">
                                <table class="ba-table">
                                    <thead><tr><th><input type="checkbox" id="chkSelectAllEmp" /></th><th>Employee ID</th><th>Local ID</th><th>Company</th></tr></thead>
                                    <tbody id="tblEmployees"></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="ba-card">
                            <p class="ba-warn">Script chạy tại DB khách hàng. Cần backup DB trước khi chạy.</p>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnGenerate">Tạo script</button>
                            <div id="scriptResult" style="display: none; margin-top: 1rem;">
                                <label class="ba-form-label">Script (mẫu)</label>
                                <div class="script-preview ba-input" id="scriptPreview"></div>
                                <div class="ba-actions" style="margin-top: 0.5rem;">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnDownload">Download .sql</button>
                                </div>
                            </div>
                            <div id="scriptErr" class="ba-err" style="display: none;"></div>
                        </div>
                        </div>

                        <!-- Sub-tab: Mã hóa + Script (Phase 2b) -->
                        <div id="subEncryptscript" class="ba-subtab" style="display: none;">
                            <div class="ba-card">
                                <h2 class="ba-card-title">Mã hóa &amp; tạo script</h2>
                                <p class="ba-warn">Dán data plain (CSV có header). Chọn Key + cột mã hóa. Định nghĩa mapping để tạo script UPDATE.</p>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label" for="txtEncryptScriptCsv">Dữ liệu (CSV)</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">CSV plain text có header. Cột Key dùng để mã hóa theo dòng; chọn thêm các cột cần mã hóa để tạo script UPDATE.</div>
                                        </span>
                                    </div>
                                    <textarea id="txtEncryptScriptCsv" class="ba-input" placeholder="EmployeeID,Phone,Email,Amount&#10;26474,0900111222,a@x.com,5000" rows="5"></textarea>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label">Cột Key</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Cột chứa key (vd. EmployeeID) dùng để mã hóa từng dòng. Bấm Phân tích cột sau khi dán data.</div>
                                        </span>
                                    </div>
                                    <select id="selEncryptKeyCol" class="ba-input" style="max-width: 200px;"><option value="">-- Chọn sau khi dán --</option></select>
                                </div>
                                <div class="ba-form-group">
                                    <div class="ba-form-label-row">
                                        <label class="ba-form-label">Cột cần mã hóa</label>
                                        <span class="ba-info-wrap">
                                            <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                            <div class="ba-info-popover" style="display: none;">Tick các cột sẽ được mã hóa; mapping cột nguồn → cột DB sẽ dùng để tạo câu UPDATE.</div>
                                        </span>
                                    </div>
                                    <div id="chkEncryptCols" style="display: flex; flex-wrap: wrap; gap: 0.75rem;"></div>
                                </div>
                                <div class="ba-card" style="margin-top: 1rem; padding: 1rem;">
                                    <h3 class="ba-card-title" style="font-size: 1rem;">Cấu hình script</h3>
                                    <div class="ba-form-group">
                                        <div class="ba-form-label-row">
                                            <label class="ba-form-label" for="cfgEncTable">Bảng đích</label>
                                            <span class="ba-info-wrap">
                                                <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                <div class="ba-info-popover" style="display: none;">Tên bảng trong script UPDATE (vd. Staffing_Employees).</div>
                                            </span>
                                        </div>
                                        <input type="text" id="cfgEncTable" class="ba-input" placeholder="vd. Staffing_Employees" style="max-width: 300px;" />
                                    </div>
                                    <div class="ba-form-group">
                                        <div class="ba-form-label-row">
                                            <label class="ba-form-label" for="cfgEncWhereCol">Cột WHERE (vd. ID hoặc EmployeeID)</label>
                                            <span class="ba-info-wrap">
                                                <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                                <div class="ba-info-popover" style="display: none;">Cột dùng trong điều kiện WHERE của UPDATE (thường là ID hoặc EmployeeID).</div>
                                            </span>
                                        </div>
                                        <input type="text" id="cfgEncWhereCol" class="ba-input" value="ID" style="max-width: 200px;" />
                                    </div>
                                    <div class="ba-form-group">
                                        <label class="ba-form-label">Mapping (cột nguồn → cột DB)</label>
                                        <div id="encryptMappings"></div>
                                        <p class="ba-warn" style="font-size: 0.8rem;">Chọn cột mã hóa ở trên rồi bấm Phân tích. Mapping sẽ tự điền theo tên cột nguồn. Chỉnh cột DB nếu cần.</p>
                                    </div>
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnParseEncrypt">Phân tích cột</button>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnGenerateEncryptScript" style="margin-left: 0.5rem;">Tạo script</button>
                                <div id="encryptScriptErr" class="ba-err" style="display: none;"></div>
                            </div>
                            <div class="ba-card" id="cardEncryptScriptResult" style="display: none;">
                                <label class="ba-form-label">Script</label>
                                <div class="script-preview ba-input" id="encryptScriptPreview"></div>
                                <button type="button" class="ba-btn ba-btn-secondary" id="btnDownloadEncryptScript" style="margin-top: 0.5rem;">Download .sql</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <div class="ba-progress-overlay" id="progressOverlay">
            <div>Đang xử lý…</div>
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
            var k = '<%= TokenK %>';
            var encUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/EncryptValue") %>';
            var decUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/DecryptValue") %>';
            var decGridUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/DecryptGrid") %>';
            var encScriptUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/GenerateEncryptScript") %>';
            var empUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/GetEmployeesForScript") %>';
            var genUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/GenerateDemoResetScript") %>';
            var csvUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/GenerateDemoResetScriptFromCsv") %>';
            var companiesUrl = '<%= ResolveUrl("~/Pages/HRHelper.aspx/LoadCompanies") %>';
            var connStrStdKey = '<%= HttpUtility.JavaScriptStringEncode(StdConnectionStringEncryptKey) %>';

            function applyConnStrStdKeyRow(chkSel, inpSel) {
                var useStd = $(chkSel).is(':checked');
                var $inp = $(inpSel);
                if (useStd) {
                    $inp.val(connStrStdKey);
                    $inp.prop('readonly', true);
                } else {
                    $inp.prop('readonly', false);
                }
            }

            function getConnStrKey(isEncryptSide) {
                var chk = isEncryptSide ? '#chkConnStrUseStdEnc' : '#chkConnStrUseStdDec';
                var inp = isEncryptSide ? '#txtConnStrKeyEnc' : '#txtConnStrKeyDec';
                if ($(chk).is(':checked')) return connStrStdKey;
                return ($(inp).val() || '').trim();
            }

            function showToast(msg, type) {
                var t = $('#toast').removeClass('success error').addClass(type || 'info');
                t.find('.toast-msg').text(msg);
                t.show();
                var tmr = setTimeout(function () { t.hide(); }, 4000);
                t.off('click.toastclose').on('click.toastclose', '.toast-close', function () { clearTimeout(tmr); t.hide(); });
            }
            function showProgress() { $('#progressOverlay').addClass('show'); }
            function hideProgress() { $('#progressOverlay').removeClass('show'); }

            function keyTypeChange(sel, idNum, idStr) {
                var v = $(sel).val();
                $(idNum).hide(); $(idStr).hide();
                if (v === 'employeeId') $(idNum).show();
                else if (v === 'string') $(idStr).show();
            }
            $('#selKeyType').on('change', function () { keyTypeChange(this, '#txtKeyEmployeeId', '#txtKeyString'); });
            $('#selKeyTypeDec').on('change', function () { keyTypeChange(this, '#txtKeyEmployeeIdDec', '#txtKeyStringDec'); });
            keyTypeChange('#selKeyType', '#txtKeyEmployeeId', '#txtKeyString');
            keyTypeChange('#selKeyTypeDec', '#txtKeyEmployeeIdDec', '#txtKeyStringDec');

            function syncSharedKeyToDec() {
                if (!$('#chkSharedKey').is(':checked')) return;
                $('#selKeyTypeDec').val($('#selKeyType').val());
                $('#txtKeyEmployeeIdDec').val($('#txtKeyEmployeeId').val());
                $('#txtKeyStringDec').val($('#txtKeyString').val());
                keyTypeChange('#selKeyTypeDec', '#txtKeyEmployeeIdDec', '#txtKeyStringDec');
            }
            function syncSharedKeyToEnc() {
                if (!$('#chkSharedKey').is(':checked')) return;
                $('#selKeyType').val($('#selKeyTypeDec').val());
                $('#txtKeyEmployeeId').val($('#txtKeyEmployeeIdDec').val());
                $('#txtKeyString').val($('#txtKeyStringDec').val());
                keyTypeChange('#selKeyType', '#txtKeyEmployeeId', '#txtKeyString');
            }
            $('#chkSharedKey').on('change', function () {
                if ($(this).is(':checked')) syncSharedKeyToDec();
            });
            $('#selKeyType, #txtKeyEmployeeId, #txtKeyString').on('change input', function () { syncSharedKeyToDec(); });
            $('#selKeyTypeDec, #txtKeyEmployeeIdDec, #txtKeyStringDec').on('change input', function () { syncSharedKeyToEnc(); });
            /* Popover info icon: xử lý bởi ba-layout.js (tránh bind trùng khiến popover toggle 2 lần rồi đóng ngay) */

            function getKey(keyType, idNum, idStr) {
                var t = (keyType || 'none').toLowerCase();
                if (t === 'employeeid') return $(idNum).val();
                if (t === 'string') return $(idStr).val();
                return null;
            }

            $('#btnEncrypt').on('click', function () {
                var plain = $('#txtPlain').val() || '';
                var keyType = $('#selKeyType').val();
                var keyVal = getKey(keyType, '#txtKeyEmployeeId', '#txtKeyString');
                $('#encErr').hide();
                $('#encResultWrap').hide();
                $.ajax({
                    type: 'POST', url: encUrl,
                    data: JSON.stringify({ plainText: plain, keyType: keyType, keyValue: keyVal }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        if (d && d.success) {
                            $('#txtEncrypted').val(d.encrypted);
                            $('#encResultWrap').show();
                        } else {
                            $('#encErr').text((d && d.message) || 'Lỗi').show();
                        }
                    },
                    error: function (x, s, e) { $('#encErr').text(s || 'Lỗi kết nối').show(); }
                });
            });

            $('#btnDecrypt').on('click', function () {
                var enc = $('#txtEncryptedIn').val() || '';
                var keyType = $('#selKeyTypeDec').val();
                var keyVal = getKey(keyType, '#txtKeyEmployeeIdDec', '#txtKeyStringDec');
                $('#decErr').hide();
                $('#decResultWrap').hide();
                $.ajax({
                    type: 'POST', url: decUrl,
                    data: JSON.stringify({ encryptedText: enc, keyType: keyType, keyValue: keyVal }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        //Các ASP.NET PageMethods(WebMethod gọi từ JavaScript qua ScriptManager / jQuery) luôn bọc kết quả trong một object có thuộc tính d.
                        //Mục đích ban đầu là chống JSON hijacking: trả về { d: ... } thay vì trả về trực tiếp object / array để tránh bị khai thác qua các kỹ thuật như < script src = "..." >.
                        //Đây là hành vi mặc định của ScriptMethod / ASP.NET AJAX.
                        var d = r.d || r;
                        if (d && d.success) {
                            $('#txtDecrypted').val(d.decrypted);
                            $('#decResultWrap').show();
                        } else {
                            $('#decErr').text((d && d.message) || 'Lỗi').show();
                        }
                    },
                    error: function (x, s, e) { $('#decErr').text(s || 'Lỗi kết nối').show(); }
                });
            });

            $('#btnCopyEnc').on('click', function () {
                var t = $('#txtEncrypted');
                t.select();
                document.execCommand('copy');
                showToast('Đã copy.', 'success');
            });
            $('#btnCopyDec').on('click', function () {
                var t = $('#txtDecrypted');
                t.select();
                document.execCommand('copy');
                showToast('Đã copy.', 'success');
            });

            applyConnStrStdKeyRow('#chkConnStrUseStdEnc', '#txtConnStrKeyEnc');
            applyConnStrStdKeyRow('#chkConnStrUseStdDec', '#txtConnStrKeyDec');
            $('#chkConnStrUseStdEnc').on('change', function () { applyConnStrStdKeyRow('#chkConnStrUseStdEnc', '#txtConnStrKeyEnc'); });
            $('#chkConnStrUseStdDec').on('change', function () { applyConnStrStdKeyRow('#chkConnStrUseStdDec', '#txtConnStrKeyDec'); });

            $(document).on('click', '.ba-eye-btn[data-eye-target]', function () {
                var id = $(this).attr('data-eye-target');
                var $inp = $('#' + id);
                if (!$inp.length) return;
                var isPwd = ($inp.attr('type') || '').toLowerCase() === 'password';
                $inp.attr('type', isPwd ? 'text' : 'password');
                $(this).text(isPwd ? '🙈' : '👁');
            });
            $('#btnEncryptConnStr').on('click', function () {
                var plain = $('#txtConnStrPlain').val() || '';
                var keyVal = getConnStrKey(true);
                $('#connEncErr').hide();
                $('#connEncResultWrap').hide();
                $.ajax({
                    type: 'POST', url: encUrl,
                    data: JSON.stringify({ plainText: plain, keyType: 'string', keyValue: keyVal }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        if (d && d.success) {
                            $('#txtConnStrEncrypted').val(d.encrypted);
                            $('#connEncResultWrap').show();
                        } else {
                            $('#connEncErr').text((d && d.message) || 'Lỗi').show();
                        }
                    },
                    error: function (x, s, e) { $('#connEncErr').text(s || 'Lỗi kết nối').show(); }
                });
            });
            $('#btnDecryptConnStr').on('click', function () {
                var enc = $('#txtConnStrEncryptedIn').val() || '';
                var keyVal = getConnStrKey(false);
                $('#connDecErr').hide();
                $('#connDecResultWrap').hide();
                $.ajax({
                    type: 'POST', url: decUrl,
                    data: JSON.stringify({ encryptedText: enc, keyType: 'string', keyValue: keyVal }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        if (d && d.success) {
                            $('#txtConnStrDecrypted').val(d.decrypted);
                            $('#connDecResultWrap').show();
                        } else {
                            $('#connDecErr').text((d && d.message) || 'Lỗi').show();
                        }
                    },
                    error: function (x, s, e) { $('#connDecErr').text(s || 'Lỗi kết nối').show(); }
                });
            });
            $('#btnCopyConnEnc').on('click', function () {
                var t = $('#txtConnStrEncrypted');
                t.select();
                document.execCommand('copy');
                showToast('Đã copy.', 'success');
            });
            $('#btnCopyConnDec').on('click', function () {
                var t = $('#txtConnStrDecrypted');
                t.select();
                document.execCommand('copy');
                showToast('Đã copy.', 'success');
            });

            $('[data-tab]').on('click', function () {
                var tab = $(this).data('tab');
                $('.ba-tab').removeClass('active'); $('.ba-tab-content').removeClass('active');
                $('.ba-tab[data-tab="' + tab + '"]').addClass('active');
                var map = { encdec: 'tabEncdec', connstr: 'tabConnstr', demoreset: 'tabDemoreset' };
                $('#' + (map[tab] || 'tabEncdec')).addClass('active');
                if (tab === 'encdec') { applyEncdecSubTab('single'); }
                else if (tab === 'demoreset') { applySubTab('demoreset'); }
            });

            function applyEncdecSubTab(sub) {
                $('#tabEncdec .ba-tabs-inner .ba-tab-sm').removeClass('active');
                $('#tabEncdec .ba-tabs-inner .ba-tab-sm[data-subtab-encdec="' + sub + '"]').addClass('active');
                $('#tabEncdec .ba-subtab-encdec').hide();
                if (sub === 'single') $('#subEncdecSingle').show();
                else $('#subEncdecBatch').show();
            }
            $('#tabEncdec .ba-tabs-inner .ba-tab-sm[data-subtab-encdec]').on('click', function () {
                applyEncdecSubTab($(this).data('subtab-encdec'));
            });

            function applySubTab(sub) {
                $('#tabDemoreset .ba-tabs-inner .ba-tab-sm').removeClass('active');
                $('#tabDemoreset .ba-tabs-inner .ba-tab-sm[data-subtab="' + sub + '"]').addClass('active');
                $('#tabDemoreset .ba-subtab').hide();
                $('#sub' + (sub === 'demoreset' ? 'Demoreset' : 'Encryptscript')).show();
            }
            $('#tabDemoreset .ba-tabs-inner .ba-tab-sm[data-subtab]').on('click', function () {
                applySubTab($(this).data('subtab'));
            });

            function parseCsvHeaders(txt) {
                if (!txt || !txt.trim()) return [];
                var lines = txt.trim().split(/[\r\n]+/);
                if (!lines.length) return [];
                var delim = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
                return lines[0].split(delim).map(function (c) { return c.trim(); }).filter(Boolean);
            }

            var decryptGridHeaders = [], encryptScriptHeaders = [];
            $('#btnParseDecrypt').on('click', function () {
                var txt = $('#txtDecryptGridCsv').val() || '';
                decryptGridHeaders = parseCsvHeaders(txt);
                var sel = $('#selDecryptKeyCol'), chk = $('#chkDecryptCols');
                sel.empty().append($('<option value="">-- Chọn cột Key --</option>'));
                chk.empty();
                decryptGridHeaders.forEach(function (h) {
                    sel.append($('<option></option>').val(h).text(h));
                    chk.append($('<label class="ba-checkbox" style="margin:0;"><input type="checkbox" class="chk-dec-col" value="' + h + '" /> ' + h + '</label>'));
                });
                if (decryptGridHeaders.length) showToast('Đã phân tích ' + decryptGridHeaders.length + ' cột.', 'success');
            });

            // Expand/collapse card
            $(document).on('click', '.ba-card-header-wrap[data-toggle="card"]', function () {
                $(this).closest('.ba-card-collapsible').toggleClass('collapsed');
            });

            var decryptResultSortCol = -1, decryptResultSortDir = 1, decryptResultSearchQ = '';

            function renderDecryptResultBody(rows) {
                var tbl = $('#tblDecryptResult'), tbody = tbl.find('tbody');
                if (!tbody.length) tbody = $('<tbody></tbody>');
                tbody.empty();
                (rows || []).forEach(function (row) {
                    var tr = $('<tr></tr>');
                    (row || []).forEach(function (cell) { tr.append($('<td></td>').text(cell || '')); });
                    tbody.append(tr);
                });
                if (!tbody.parent().length) tbl.append(tbody);
            }

            function buildDecryptResultTable() {
                var r = window._decryptGridResult;
                if (!r || !r.headers || !r.rows) return;
                var headers = r.headers, rows = r.rows;
                var q = (decryptResultSearchQ || '').toLowerCase().trim();
                var filtered = q ? rows.filter(function (row) {
                    var line = (row || []).join(' ').toLowerCase();
                    return line.indexOf(q) >= 0;
                }) : rows.slice();
                if (decryptResultSortCol >= 0 && decryptResultSortCol < headers.length) {
                    filtered.sort(function (a, b) {
                        var va = (a && a[decryptResultSortCol]) ? String(a[decryptResultSortCol]).toLowerCase() : '';
                        var vb = (b && b[decryptResultSortCol]) ? String(b[decryptResultSortCol]).toLowerCase() : '';
                        return decryptResultSortDir * va.localeCompare(vb);
                    });
                }
                var tbl = $('#tblDecryptResult');
                window._decryptGridColWidths = window._decryptGridColWidths || [];
                tbl.empty();
                var colgroup = $('<colgroup></colgroup>');
                headers.forEach(function (_, i) {
                    var w = window._decryptGridColWidths[i];
                    colgroup.append($('<col>').css({ 'min-width': '80px', 'width': (w ? w + 'px' : '120px') }));
                });
                tbl.append(colgroup);
                var thead = $('<thead></thead>'), htr = $('<tr></tr>');
                headers.forEach(function (h, i) {
                    var th = $('<th class="ba-sortable" data-col="' + i + '"></th>');
                    th.append(document.createTextNode(h));
                    th.append('<span class="ba-sort-icon"></span>');
                    th.append('<span class="ba-col-resize" data-col="' + i + '" title="Kéo để đổi độ rộng"></span>');
                    htr.append(th);
                });
                thead.append(htr);
                tbl.append(thead);
                renderDecryptResultBody(filtered);
                tbl.find('th .ba-sort-icon').text('');
                if (decryptResultSortCol >= 0) tbl.find('th[data-col="' + decryptResultSortCol + '"] .ba-sort-icon').text(decryptResultSortDir === 1 ? ' ↑' : ' ↓');
            }

            $('#btnDecryptGrid').on('click', function () {
                var txt = $('#txtDecryptGridCsv').val() || '';
                var keyCol = $('#selDecryptKeyCol').val();
                var decCols = [];
                $('.chk-dec-col:checked').each(function () { decCols.push($(this).val()); });
                if (!txt) { $('#decryptGridErr').text('Dán dữ liệu.').show(); return; }
                if (!decCols.length) { $('#decryptGridErr').text('Chọn ít nhất 1 cột giải mã.').show(); return; }
                $('#decryptGridErr').hide();
                showProgress();
                $.ajax({
                    type: 'POST', url: decGridUrl,
                    data: JSON.stringify({ csvText: txt, keyColumnName: keyCol || null, decryptColumnNames: decCols }),
                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#decryptGridErr').text((d && d.message) || 'Lỗi').show(); return; }
                        window._decryptGridResult = { headers: d.headers, rows: d.rows };
                        decryptResultSortCol = -1;
                        decryptResultSortDir = 1;
                        decryptResultSearchQ = '';
                        $('#decryptResultSearch').val('');
                        buildDecryptResultTable();
                        $('#cardDecryptResult').show();
                    },
                    error: function () { hideProgress(); $('#decryptGridErr').text('Lỗi kết nối.').show(); }
                });
            });

            $('#decryptResultSearch').on('input', function () {
                decryptResultSearchQ = $(this).val() || '';
                buildDecryptResultTable();
            });

            $(document).on('click', '#tblDecryptResult th.ba-sortable', function (e) {
                if ($(e.target).hasClass('ba-col-resize')) return;
                var col = parseInt($(this).data('col'), 10);
                if (decryptResultSortCol === col) decryptResultSortDir = -decryptResultSortDir; else { decryptResultSortCol = col; decryptResultSortDir = 1; }
                buildDecryptResultTable();
            });

            (function () {
                var resizing = null, startX = 0, startW = 0;
                $(document).on('mousedown', '#tblDecryptResult .ba-col-resize', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var col = parseInt($(this).data('col'), 10);
                    var $col = $('#tblDecryptResult colgroup col').eq(col);
                    if (!$col.length) return;
                    resizing = { col: col, $col: $col };
                    startX = e.pageX;
                    startW = $col.width() || 80;
                });
                $(document).on('mousemove', function (e) {
                    if (!resizing) return;
                    var dw = e.pageX - startX;
                    var newW = Math.max(40, startW + dw);
                    resizing.$col.css('width', newW + 'px');
                    window._decryptGridColWidths = window._decryptGridColWidths || [];
                    window._decryptGridColWidths[resizing.col] = newW;
                });
                $(document).on('mouseup', function () { resizing = null; });
            })();

            $('#btnDownloadDecryptCsv').on('click', function () {
                var r = window._decryptGridResult;
                if (!r || !r.headers || !r.rows) return;
                var csv = r.headers.join(',') + '\n' + r.rows.map(function (row) { return (row || []).map(function (c) { return '"' + (c || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
                var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'DecryptResult_' + (new Date().toISOString().slice(0, 10)) + '.csv';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Đã tải file CSV.', 'success');
            });

            $('#btnParseEncrypt').on('click', function () {
                var txt = $('#txtEncryptScriptCsv').val() || '';
                encryptScriptHeaders = parseCsvHeaders(txt);
                var sel = $('#selEncryptKeyCol'), chk = $('#chkEncryptCols'), maps = $('#encryptMappings');
                sel.empty().append($('<option value="">-- Chọn cột Key --</option>'));
                chk.empty();
                maps.empty();
                encryptScriptHeaders.forEach(function (h) {
                    sel.append($('<option></option>').val(h).text(h));
                    chk.append($('<label class="ba-checkbox" style="margin:0;"><input type="checkbox" class="chk-enc-col" value="' + h + '" /> ' + h + '</label>'));
                    maps.append($('<div class="ba-form-group" style="margin-bottom:0.5rem;"><label class="ba-form-label" style="font-size:0.8rem;">' + h + ' →</label><input type="text" class="cfg-db-col" data-src="' + h + '" placeholder="Cột DB" value="' + h + '" style="max-width:220px;display:inline-block;" /></div>'));
                });
                if (encryptScriptHeaders.length) showToast('Đã phân tích ' + encryptScriptHeaders.length + ' cột.', 'success');
            });

            var lastEncryptScript = '', lastEncryptFileName = '';
            $('#btnGenerateEncryptScript').on('click', function () {
                var txt = $('#txtEncryptScriptCsv').val() || '';
                var keyCol = $('#selEncryptKeyCol').val();
                var encCols = [];
                $('.chk-enc-col:checked').each(function () { encCols.push($(this).val()); });
                var tableName = $('#cfgEncTable').val() || '';
                var whereCol = $('#cfgEncWhereCol').val() || 'ID';
                if (!txt) { $('#encryptScriptErr').text('Dán dữ liệu.').show(); return; }
                if (!keyCol) { $('#encryptScriptErr').text('Chọn cột Key.').show(); return; }
                if (!encCols.length) { $('#encryptScriptErr').text('Chọn ít nhất 1 cột mã hóa.').show(); return; }
                if (!tableName) { $('#encryptScriptErr').text('Nhập tên bảng đích.').show(); return; }
                var mappings = [];
                encCols.forEach(function (src) {
                    var dbCol = $('.cfg-db-col[data-src="' + src + '"]').val() || src;
                    mappings.push({ inputColumn: src, dbColumn: dbCol });
                });
                $('#encryptScriptErr').hide();
                showProgress();
                $.ajax({
                    type: 'POST', url: encScriptUrl,
                    data: JSON.stringify({ csvText: txt, keyColumnName: keyCol, encryptColumnNames: encCols, scriptConfigObj: { tableName: tableName, whereColumn: whereCol, mappings: mappings } }),
                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#encryptScriptErr').text((d && d.message) || 'Lỗi').show(); return; }
                        lastEncryptScript = d.script || '';
                        lastEncryptFileName = d.fileName || 'EncryptScript.sql';
                        $('#encryptScriptPreview').text(lastEncryptScript.substring(0, 6000) + (lastEncryptScript.length > 6000 ? '\n...' : ''));
                        $('#cardEncryptScriptResult').show();
                        showToast('Đã tạo script.', 'success');
                    },
                    error: function () { hideProgress(); $('#encryptScriptErr').text('Lỗi kết nối.').show(); }
                });
            });

            $('#btnDownloadEncryptScript').on('click', function () {
                if (!lastEncryptScript) return;
                var a = document.createElement('a');
                a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(lastEncryptScript);
                a.download = lastEncryptFileName;
                a.click();
            });

            function applySrcVisibility() {
                var v = $('input[name="src"]:checked').val();
                $('#srcHrdb').toggle(v === 'hrdb');
                $('#srcCsv').toggle(v === 'csv');
                $('#cardEmployees').toggle(v === 'hrdb' && $('#tblEmployees tr').length > 0);
            }
            $('input[name="src"]').on('change', applySrcVisibility);
            applySrcVisibility();

            $('input[name="payslipMode"]').on('change', function () {
                $('#cfgPayslipCustom').toggle($(this).val() === 'custom');
            });

            if (k && k.trim()) {
                $('#connLabel').show();
                $('#radioHrdb').prop('checked', true);
                applySrcVisibility();
                $.ajax({
                    type: 'POST', url: companiesUrl,
                    data: JSON.stringify({ k: k }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        if (d && d.success && d.list && d.list.length) {
                            var sel = $('#selCompany');
                            sel.find('option:not(:first)').remove();
                            d.list.forEach(function (c) {
                                sel.append($('<option></option>').val(c.id).text((c.code || '') + ' - ' + (c.name || '')));
                            });
                        }
                    }
                });
            }

            var employeesList = [];
            $('#btnLoadEmployees').on('click', function () {
                if (!k) { showToast('Chưa có kết nối HR DB. Mở trang từ HR Helper (Generate Demo Reset Script).', 'error'); return; }
                showProgress();
                var cid = $('#selCompany').val() ? parseInt($('#selCompany').val(), 10) : null;
                $.ajax({
                    type: 'POST', url: empUrl,
                    data: JSON.stringify({ k: k, companyID: cid }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { showToast((d && d.message) || 'Lỗi', 'error'); return; }
                        employeesList = d.list || [];
                        var tb = $('#tblEmployees');
                        tb.empty();
                        if (!employeesList.length) { tb.append('<tr><td colspan="4" class="ba-empty">Không có employee.</td></tr>'); }
                        else {
                            employeesList.forEach(function (e) {
                                var tr = $('<tr></tr>');
                                tr.append($('<td></td>').html('<input type="checkbox" class="emp-cb" data-id="' + e.employeeID + '" />'));
                                tr.append($('<td></td>').text(e.employeeID));
                                tr.append($('<td></td>').text(e.localEmployeeID || ''));
                                tr.append($('<td></td>').text(e.companyName || ''));
                                tb.append(tr);
                            });
                        }
                        $('#cardEmployees').show();
                    },
                    error: function () { hideProgress(); showToast('Lỗi kết nối.', 'error'); }
                });
            });

            $('#chkSelectAllEmp').on('change', function () {
                $('.emp-cb').prop('checked', $(this).is(':checked'));
            });

            function buildConfig() {
                var fc = {
                    personalEmail: $('#cfgPersonalEmail').is(':checked'),
                    businessEmail: $('#cfgBusinessEmail').is(':checked'),
                    mobile1: $('#cfgMobile1').is(':checked'),
                    mobile2: $('#cfgMobile2').is(':checked'),
                    payslip: $('#cfgPayslipF').is(':checked'),
                    basicSalary: $('#cfgBasicSalary').is(':checked')
                };
                return {
                    demoPhone: $('#cfgDemoPhone').val() || '',
                    demoEmail: $('#cfgDemoEmail').val() || '',
                    maskSalary: parseFloat($('#cfgMaskSalary').val()) || 0,
                    resetPayslipToLocalID: $('input[name="payslipMode"]:checked').val() === 'local',
                    payslipCustom: $('#cfgPayslipCustom').val() || null,
                    fieldsToReset: fc
                };
            }

            var lastScript = '', lastFileName = '';
            $('#btnGenerate').on('click', function () {
                var cfg = buildConfig();
                var src = $('input[name="src"]:checked').val();
                $('#scriptErr').hide();
                $('#scriptResult').hide();
                showProgress();
                var done = function (r) {
                    var d = r.d || r;
                    hideProgress();
                    if (!d || !d.success) { $('#scriptErr').text((d && d.message) || 'Lỗi').show(); return; }
                    lastScript = d.script || '';
                    lastFileName = d.fileName || 'DemoReset.sql';
                    $('#scriptPreview').text(lastScript.substring(0, 4000) + (lastScript.length > 4000 ? '\n...' : ''));
                    $('#scriptResult').show();
                    showToast('Đã tạo script.', 'success');
                };
                if (src === 'csv') {
                    $.ajax({
                        type: 'POST', url: csvUrl,
                        data: JSON.stringify({ csvText: $('#txtCsv').val() || '', config: cfg }),
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        success: done,
                        error: function () { hideProgress(); $('#scriptErr').text('Lỗi kết nối.').show(); }
                    });
                } else {
                    var ids = null;
                    var checked = $('.emp-cb:checked');
                    if (checked.length) {
                        ids = [];
                        checked.each(function () { ids.push(parseInt($(this).data('id'), 10)); });
                    }
                    var cid = $('#selCompany').val() ? parseInt($('#selCompany').val(), 10) : null;
                    if (!k) { hideProgress(); $('#scriptErr').text('Chưa có kết nối HR DB.').show(); return; }
                    $.ajax({
                        type: 'POST', url: genUrl,
                        data: JSON.stringify({ k: k, companyID: cid, employeeIds: ids, config: cfg }),
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        success: done,
                        error: function () { hideProgress(); $('#scriptErr').text('Lỗi kết nối.').show(); }
                    });
                }
            });

            $('#btnDownload').on('click', function () {
                if (!lastScript) return;
                var a = document.createElement('a');
                a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(lastScript);
                a.download = lastFileName;
                a.click();
            });
        })();
    </script>
    <script src="../Scripts/ba-layout.js"></script>
    <script>
        (function() {
            var getJobsUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobs") %>';
            var dismissJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/DismissJob") %>';
            var cancelJobUrl = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/CancelRestoreJob") %>';
            var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
            var functionQueueUrl = '<%= ResolveUrl("~/FunctionQueue") %>';
            function parseDateSafe(v) { if (v == null || v === '') return null; if (typeof v === 'number') return new Date(v); var s = (typeof v === 'string') ? v : String(v); var m = s.match(/\/Date\((\d+)\)\//); if (m) return new Date(parseInt(m[1], 10)); return isNaN(Date.parse(s)) ? null : new Date(s); }
            var DISMISSED_KEY = 'baDismissedJobIds';
            function getDismissed() { try { var r = localStorage.getItem(DISMISSED_KEY); return r ? (JSON.parse(r) || []) : []; } catch (e) { return []; } }
            function addDismissed(id, type) { var k = (type === 'Backup' ? 'b:' : 'r:') + id; var a = getDismissed(); if (a.indexOf(k) < 0) { a.push(k); localStorage.setItem(DISMISSED_KEY, JSON.stringify(a)); } }
            function isDismissed(j) { return getDismissed().indexOf((j.type === 'Backup' ? 'b:' : 'r:') + (j.id || '')) >= 0; }
            function fmtTime(v) { var d = parseDateSafe(v); return d ? d.toLocaleString() : '—'; }
            function loadPanel() {
                var $list = $('#restoreJobsList'), $badge = $('#restoreJobsBadge');
                if (!$list.length) return;
                $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                        var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isDismissed(j); }).sort(function(a,b) { var ta = parseDateSafe(a.startTime); var tb = parseDateSafe(b.startTime); return (tb && ta) ? (tb - ta) : 0; });
                        var newBugs = d.newBugs || [];
                        var total = jobs.length + newBugs.length;
                        if (!total) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                        var currentUserId = (d.currentUserId != null) ? parseInt(d.currentUserId, 10) : 0;
                        $badge.text(total).addClass('visible');
                        window.__notifJobsList = jobs;
                        var bugsCollapsed = sessionStorage.getItem('ba_notif_bugs_collapsed') === '1';
                        var jobsCollapsed = sessionStorage.getItem('ba_notif_jobs_collapsed') === '1';
                        var html = '';
                        if (newBugs.length > 0) {
                            html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow">' + (bugsCollapsed ? '▶' : '▼') + '</span> 🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs" style="' + (bugsCollapsed ? 'display:none;' : '') + '">';
                            newBugs.forEach(function(b) { var bugUrl = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + fmtTime(b.createdAt) + '</div><a class="ba-notif-detail-link" href="' + bugUrl + '" data-action="bug">Xem / Xử lý</a></div>'; });
                            html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow">' + (jobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (jobsCollapsed ? 'display:none;' : '') + '">';
                        }
                        jobs.forEach(function(j, idx) {
                            var st = j.status || '', type = j.type || 'Restore', typeLabel = j.typeLabel || (type === 'Backup' ? 'Backup' : type === 'HRHelperMultiDbAnalyze' ? 'Phân tích Multi-DB' : 'Restore');
                            var badge = (type === 'Backup') ? 'ba-notif-type-backup' : (type === 'Restore') ? 'ba-notif-type-restore' : (type === 'HRHelperMultiDbAnalyze') ? 'ba-notif-type-hr-analyze' : 'ba-notif-type-restore';
                            var dbName = (j.databaseName || j.DatabaseName || '').trim();
                            var hasReset = type === 'Restore' && (j.withAutoReset === true || (j.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
                            var resetTag = (type === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag" title="Restore có Reset">Có Reset' : 'ba-notif-no-reset-tag">Không Reset') + '</span> ') : '';
                            var pct = (j.percentComplete != null) ? Number(j.percentComplete) : 0;
                            var phase = (j.message || (type === 'Restore' ? 'Restore' : '')).toString().trim();
                            var startedByUid = (j.startedByUserId != null) ? parseInt(j.startedByUserId, 10) : 0;
                            var canCancel = (type === 'Restore' || type === 'Backup' || type === 'HRHelperMultiDbAnalyze' || type === 'HRHelperMultiDbReset') && currentUserId && startedByUid === currentUserId;
                            var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '" data-job-type="' + type + '"><button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button><div style="font-weight:500;"><span class="ba-notif-type-badge ' + badge + '">' + (typeLabel.replace(/</g, '&lt;')) + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div>' + BaNotif.wrapMetaWithBadge((j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + fmtTime(j.startTime), st);
                            if (st === 'Running' || st === 'Pending') {
                                var progressLabel = (type === 'Restore' && phase) ? (pct + '% - ' + BaNotif.restorePhaseDisplay(phase)) : (type === 'HRHelperMultiDbAnalyze' ? (pct + '% - Phân tích') : (pct + '%'));
                                row += '<div class="ba-notif-progress-wrap" style="margin-top:6px;"><div style="background:var(--surface-alt,var(--bg-darker));height:6px;border-radius:3px;overflow:hidden;"><div class="ba-notif-progress-bar" style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span class="ba-notif-progress-pct">' + progressLabel + '</span></div><a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                                if (canCancel) row += ' <button type="button" class="ba-notif-cancel-btn" data-job-id="' + (j.id || '') + '" title="Chỉ người thực hiện job mới có thể hủy">Hủy</button>';
                            } else if (st === 'Completed') row += BaNotif.completedBadgeRow() + '<a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                            else if (st === 'Failed') row += BaNotif.failedBadgeRow() + '<div class="ba-notif-msg ba-notif-msg-error">' + (j.message || '').replace(/</g, '&lt;') + '</div><a class="ba-notif-detail-link" href="#" data-action="detail">Xem chi tiết</a>';
                            row += '</div>';
                            html += row;
                        });
                        if (newBugs.length > 0) html += '</div></div>';
                        else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow">' + (jobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (jobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                        $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                        $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function() { var g = $(this).data('group'); var $b = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); var $ar = $(this).find('.ba-notif-group-arrow'); if ($b.is(':visible')) { $b.slideUp(200); $ar.text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $b.slideDown(200); $ar.text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                        $list.off('click.detail').on('click.detail', '.ba-notif-detail-link[data-action="detail"]', function(e) { e.preventDefault(); var idx = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || null; if (job && typeof window.showNotificationDetail === 'function') window.showNotificationDetail(job); });
                        $list.off('click.dismiss').on('click.dismiss', '.ba-notif-dismiss', function(e) { e.preventDefault(); e.stopPropagation(); var $i = $(this).closest('.ba-notif-item'); var id = parseInt($i.data('job-id'), 10); var typ = $i.data('job-type') || 'Restore'; if (id) { addDismissed(id, typ); var $listEl = $('#restoreJobsList'), $badgeEl = $('#restoreJobsBadge'); var newCount = Math.max(0, $listEl.find('.ba-notif-item').length - 1); if (newCount > 0) { $badgeEl.text(newCount).addClass('visible'); } else { $badgeEl.removeClass('visible'); } $.ajax({ url: dismissJobUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: id }) }); $i.slideUp(200, function() { $(this).remove(); var $listEl = $('#restoreJobsList'); var n = $listEl.find('.ba-notif-item').length; var $badgeEl = $('#restoreJobsBadge'); if (n) { $badgeEl.text(n).addClass('visible'); var bugsCount = $listEl.find('.ba-notif-group-body[data-group="bugs"] .ba-notif-item').length; var jobsCount = $listEl.find('.ba-notif-group-body[data-group="jobs"] .ba-notif-item').length; if ($listEl.find('.ba-notif-group-toggle[data-group="bugs"]').length) $listEl.find('.ba-notif-group-toggle[data-group="bugs"]').html(function(i, h) { return (h || '').replace(/(🐛 )?Bugs mới \(\d+\)/, '🐛 Bugs mới (' + bugsCount + ')'); }); if ($listEl.find('.ba-notif-group-toggle[data-group="jobs"]').length) $listEl.find('.ba-notif-group-toggle[data-group="jobs"]').html(function(i, h) { return (h || '').replace(/Thông báo job \(\d+\)/, 'Thông báo job (' + jobsCount + ')'); }); } else { $badgeEl.removeClass('visible'); $listEl.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } }); } });
                        $list.off('click.baNotifCancel').on('click.baNotifCancel', '.ba-notif-cancel-btn', function(e) { e.preventDefault(); var $item = $(this).closest('.ba-notif-item'); var jobId = parseInt($(this).data('job-id'), 10); if (!jobId) return; var idx = parseInt($item.data('notif-index'), 10); var job = (window.__notifJobsList && window.__notifJobsList[idx]) || {}; var serverName = (job.serverName || '').trim(); var dbName = (job.databaseName || '').trim(); var jobType = (job.type || job.typeLabel || 'Restore').toString(); var jobDesc = (serverName || dbName) ? (serverName + ' → ' + dbName) : ('Job #' + jobId); var msg = 'Bạn có chắc muốn hủy job:\n' + jobDesc + '\nLoại: ' + jobType + '\n\nHành động không thể hoàn tác.'; var $btn = $(this); if (typeof baConfirm === 'function') baConfirm(msg, function() { $btn.prop('disabled', true); $.ajax({ url: cancelJobUrl, type: 'POST', contentType: 'application/json; charset=utf-8', dataType: 'json', data: JSON.stringify({ jobId: jobId }), success: function(r) { var d = r.d || r; if (d && d.success) loadPanel(); else $btn.prop('disabled', false); }, error: function() { $btn.prop('disabled', false); } }); }, null, 'Đồng ý', 'Thoát'); });
                    }
                });
            }
            $(function() {
                if (!$('#restoreJobsBellWrap').length) return;
                $.ajax({ url: getJobsUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}', success: function(res) { var d = res.d || res; if (d && (d.jobs || d.newBugs)) { var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); }); var total = jobs.length + (d.newBugs || []).length; if (total) $('#restoreJobsBadge').text(total).addClass('visible'); } } });
                $('#restoreJobsBellBtn').on('click', function(e) { e.stopPropagation(); var $p = $('#restoreJobsPanel'); if ($p.is(':visible')) $p.hide(); else { loadPanel(); $p.show(); } });
                $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
                $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
            });
        })();
        </script>
</body>
</html>
