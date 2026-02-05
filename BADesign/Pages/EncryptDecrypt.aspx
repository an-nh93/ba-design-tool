<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="EncryptDecrypt.aspx.cs"
    Inherits="BADesign.Pages.EncryptDecrypt" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Encrypt/Decrypt Data - UI Builder</title>
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
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-main); color: var(--text-primary); line-height: 1.6; overflow-x: hidden; }
        .ba-container { display: flex; min-height: 100vh; overflow: hidden; }
        .ba-sidebar {
            width: 240px; background: var(--bg-darker); border-right: 1px solid var(--border);
            padding: 1.5rem 0; flex-shrink: 0; display: flex; flex-direction: column; overflow-y: auto;
            position: fixed; left: 0; top: 0; bottom: 0; z-index: 1000;
        }
        .ba-sidebar-header { padding: 0 1.5rem 1rem; border-bottom: 1px solid var(--border); }
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-nav { padding: 1rem 0; }
        .ba-nav-item { display: block; padding: 0.75rem 1.5rem; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--bg-hover); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-left: 240px; }
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
        .toast { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.25rem; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none; align-items: center; gap: 0.75rem; }
        .toast.show { display: flex; }
        .toast.error { border-left: 4px solid var(--danger); }
        .toast.success { border-left: 4px solid var(--success); }
        .script-preview { font-family: Consolas, monospace; font-size: 0.8rem; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
        .ba-warn { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; }
        .ba-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 900px) { .ba-grid-2 { grid-template-columns: 1fr; } }
        .ba-tabs-inner { border-bottom: 1px solid var(--border); padding-bottom: 0; }
        .ba-tab-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }
        .ba-source-radio { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
        .ba-source-radio label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="ba-container">
            <aside class="ba-sidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">Encrypt/Decrypt Data</div>
                </div>
                <nav class="ba-nav">
                    <a href="<%= ResolveUrl("~/HomeRole") %>" class="ba-nav-item">← Về trang chủ</a>
                    <a href="<%= ResolveUrl("~/DatabaseSearch") %>" class="ba-nav-item">Database Search</a>
                    <a href="#" class="ba-nav-item active">Encrypt/Decrypt</a>
                </nav>
            </aside>
            <main class="ba-main">
                <div class="ba-top-bar">
                    <h1 class="ba-top-bar-title">Encrypt/Decrypt Data</h1>
                    <div class="ba-conn-label" id="connLabel" style="display: none;">
                        <span>HR DB: <strong><%= ConnectedServer %> / <%= ConnectedDatabase %></strong></span>
                    </div>
                </div>
                <div class="ba-content">
                    <div class="ba-tabs">
                        <button type="button" class="ba-tab active" data-tab="encdec">Encrypt / Decrypt</button>
                        <button type="button" class="ba-tab" data-tab="demoreset">Generate Demo Reset Script</button>
                    </div>

                    <!-- Tab Encrypt / Decrypt -->
                    <div id="tabEncdec" class="ba-tab-content active">
                        <div class="ba-card">
                            <div class="ba-checkbox">
                                <input type="checkbox" id="chkSharedKey" />
                                <label for="chkSharedKey">Dùng chung Key cho Encrypt &amp; Decrypt</label>
                            </div>
                        </div>
                        <div class="ba-grid-2">
                            <div class="ba-card">
                                <h2 class="ba-card-title">Encrypt</h2>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Plain text</label>
                                    <textarea id="txtPlain" class="ba-input" placeholder="Nhập giá trị cần mã hóa (vd. số điện thoại, email, số)." rows="3"></textarea>
                                </div>
                                <div class="ba-form-group enc-key">
                                    <label class="ba-form-label">Key</label>
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
                                    <label class="ba-form-label">Encrypted text</label>
                                    <textarea id="txtEncryptedIn" class="ba-input" placeholder="Dán chuỗi đã mã hóa (base64)." rows="3"></textarea>
                                </div>
                                <div class="ba-form-group dec-key">
                                    <label class="ba-form-label">Key</label>
                                    <select id="selKeyTypeDec" class="ba-input" style="margin-bottom: 0.5rem;">
                                        <option value="none">None (global)</option>
                                        <option value="employeeId">Employee ID</option>
                                        <option value="string">String (vd. Local ID)</option>
                                    </select>
                                    <input type="number" id="txtKeyEmployeeIdDec" class="ba-input" placeholder="Employee ID" style="display: none;" />
                                    <input type="text" id="txtKeyStringDec" class="ba-input" placeholder="Chuỗi key" style="display: none;" />
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

                    <!-- Tab Generate Demo Reset Script -->
                    <div id="tabDemoreset" class="ba-tab-content">
                        <div class="ba-tabs ba-tabs-inner" style="margin-bottom: 1rem;">
                            <button type="button" class="ba-tab ba-tab-sm" data-subtab="decryptgrid">Giải mã hàng loạt</button>
                            <button type="button" class="ba-tab ba-tab-sm" data-subtab="demoreset">Demo Reset</button>
                            <button type="button" class="ba-tab ba-tab-sm" data-subtab="encryptscript">Mã hóa + Script</button>
                        </div>

                        <!-- Sub-tab: Giải mã hàng loạt (Phase 2a) -->
                        <div id="subDecryptgrid" class="ba-subtab">
                            <div class="ba-card">
                                <h2 class="ba-card-title">Giải mã để xem</h2>
                                <p class="ba-warn">Dán dữ liệu từ SQL (CSV/TSV, có header). Chọn cột Key và các cột cần giải mã.</p>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Dữ liệu (CSV/TSV)</label>
                                    <textarea id="txtDecryptGridCsv" class="ba-input" placeholder="EmployeeID,MobilePhone1,BusinessEmail&#10;26474,3OSo/+iDCY6...,abc123base64..." rows="6"></textarea>
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Cột Key (dùng để giải mã)</label>
                                    <select id="selDecryptKeyCol" class="ba-input" style="max-width: 200px;"><option value="">-- Chọn sau khi dán --</option></select>
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Các cột cần giải mã</label>
                                    <div id="chkDecryptCols" style="display: flex; flex-wrap: wrap; gap: 0.75rem;"></div>
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnParseDecrypt">Phân tích cột</button>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnDecryptGrid" style="margin-left: 0.5rem;">Giải mã</button>
                                <div id="decryptGridErr" class="ba-err" style="display: none;"></div>
                            </div>
                            <div class="ba-card" id="cardDecryptResult" style="display: none;">
                                <h2 class="ba-card-title">Kết quả</h2>
                                <div class="ba-table-wrap" style="max-height: 400px;">
                                    <table class="ba-table" id="tblDecryptResult"></table>
                                </div>
                                <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyDecryptCsv" style="margin-top: 0.5rem;">Copy CSV</button>
                            </div>
                        </div>

                        <!-- Sub-tab: Demo Reset (hiện tại) -->
                        <div id="subDemoreset" class="ba-subtab" style="display: none;">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Cách dùng</h2>
                            <ol class="ba-warn" style="margin-left: 1.25rem; padding-left: 0.5rem;">
                                <li><strong>Từ HR DB:</strong> Kết nối qua Database Search → Connect → HR Helper → bấm &quot;Generate Demo Reset Script&quot; (hoặc mở trang với <code>?k=...</code>). Chọn Company (hoặc Tất cả) → <strong>Load danh sách</strong> → chọn nhân viên cần reset.</li>
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
                                <p class="ba-warn">Đã kết nối thì chọn Company (lọc) rồi bấm <strong>Load danh sách</strong>. Chưa kết nối: vào Database Search → Connect → HR Helper → bấm &quot;Generate Demo Reset Script&quot; hoặc mở trang với <code>?k=...</code>.</p>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Company (lọc)</label>
                                    <select id="selCompany" class="ba-input" style="max-width: 320px;"><option value="">-- Tất cả --</option></select>
                                </div>
                                <button type="button" class="ba-btn ba-btn-primary" id="btnLoadEmployees">Load danh sách</button>
                            </div>
                            <div id="srcCsv" class="ba-form-group">
                                <label class="ba-form-label">CSV (EmployeeID, LocalEmployeeID)</label>
                                <textarea id="txtCsv" class="ba-input" placeholder="EmployeeID,LocalEmployeeID&#10;1001,E001&#10;1002,E002" rows="6"></textarea>
                            </div>
                        </div>
                        <div class="ba-card">
                            <h2 class="ba-card-title">Cấu hình reset</h2>
                            <div class="ba-grid-2">
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Demo phone</label>
                                    <input type="text" id="cfgDemoPhone" class="ba-input" placeholder="vd. 0900000000" />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Demo email</label>
                                    <input type="text" id="cfgDemoEmail" class="ba-input" placeholder="vd. demo@company.com" />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Mask salary (số)</label>
                                    <input type="number" id="cfgMaskSalary" class="ba-input" value="0" />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Payslip</label>
                                    <div class="ba-checkbox"><input type="checkbox" id="cfgPayslip" /><label for="cfgPayslip">Reset payslip</label></div>
                                    <div class="ba-source-radio">
                                        <label><input type="radio" name="payslipMode" value="local" checked /> Theo Local ID</label>
                                        <label><input type="radio" name="payslipMode" value="custom" /> Chuỗi chung</label>
                                    </div>
                                    <input type="text" id="cfgPayslipCustom" class="ba-input" placeholder="Chuỗi payslip chung" style="margin-top: 0.5rem; display: none;" />
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label">Fields to reset</label>
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
                                    <label class="ba-form-label">Dữ liệu (CSV)</label>
                                    <textarea id="txtEncryptScriptCsv" class="ba-input" placeholder="EmployeeID,Phone,Email,Amount&#10;26474,0900111222,a@x.com,5000" rows="5"></textarea>
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Cột Key</label>
                                    <select id="selEncryptKeyCol" class="ba-input" style="max-width: 200px;"><option value="">-- Chọn sau khi dán --</option></select>
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label">Cột cần mã hóa</label>
                                    <div id="chkEncryptCols" style="display: flex; flex-wrap: wrap; gap: 0.75rem;"></div>
                                </div>
                                <div class="ba-card" style="margin-top: 1rem; padding: 1rem;">
                                    <h3 class="ba-card-title" style="font-size: 1rem;">Cấu hình script</h3>
                                    <div class="ba-form-group">
                                        <label class="ba-form-label">Bảng đích</label>
                                        <input type="text" id="cfgEncTable" class="ba-input" placeholder="vd. Staffing_Employees" style="max-width: 300px;" />
                                    </div>
                                    <div class="ba-form-group">
                                        <label class="ba-form-label">Cột WHERE (vd. ID hoặc EmployeeID)</label>
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
        <div class="toast-container"><div id="toast" class="toast"></div></div>
    </form>
    <script>
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

            function showToast(msg, type) {
                var t = $('#toast').removeClass('success error').addClass(type || 'info').text(msg);
                t.show();
                setTimeout(function () { t.hide(); }, 4000);
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

            $('#chkSharedKey').on('change', function () {
                var on = $(this).is(':checked');
                if (on) {
                    $('#selKeyTypeDec').val($('#selKeyType').val());
                    $('#txtKeyEmployeeIdDec').val($('#txtKeyEmployeeId').val());
                    $('#txtKeyStringDec').val($('#txtKeyString').val());
                    keyTypeChange('#selKeyTypeDec', '#txtKeyEmployeeIdDec', '#txtKeyStringDec');
                }
            });

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

            $('[data-tab]').on('click', function () {
                var tab = $(this).data('tab');
                $('.ba-tab').removeClass('active'); $('.ba-tab-content').removeClass('active');
                $('.ba-tab[data-tab="' + tab + '"]').addClass('active');
                $('#tab' + (tab === 'encdec' ? 'Encdec' : 'Demoreset')).addClass('active');
                if (tab === 'demoreset') { applySubTab('decryptgrid'); }
            });

            function applySubTab(sub) {
                $('.ba-tabs-inner .ba-tab-sm').removeClass('active');
                $('.ba-tabs-inner .ba-tab-sm[data-subtab="' + sub + '"]').addClass('active');
                $('.ba-subtab').hide();
                $('#sub' + (sub === 'decryptgrid' ? 'Decryptgrid' : sub === 'demoreset' ? 'Demoreset' : 'Encryptscript')).show();
            }
            $('.ba-tabs-inner .ba-tab-sm[data-subtab]').on('click', function () {
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

            $('#btnDecryptGrid').on('click', function () {
                var txt = $('#txtDecryptGridCsv').val() || '';
                var keyCol = $('#selDecryptKeyCol').val();
                var decCols = [];
                $('.chk-dec-col:checked').each(function () { decCols.push($(this).val()); });
                if (!txt) { $('#decryptGridErr').text('Dán dữ liệu.').show(); return; }
                if (!keyCol) { $('#decryptGridErr').text('Chọn cột Key.').show(); return; }
                if (!decCols.length) { $('#decryptGridErr').text('Chọn ít nhất 1 cột giải mã.').show(); return; }
                $('#decryptGridErr').hide();
                showProgress();
                $.ajax({
                    type: 'POST', url: decGridUrl,
                    data: JSON.stringify({ csvText: txt, keyColumnName: keyCol, decryptColumnNames: decCols }),
                    contentType: 'application/json; charset=utf-8', dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        hideProgress();
                        if (!d || !d.success) { $('#decryptGridErr').text((d && d.message) || 'Lỗi').show(); return; }
                        var tbl = $('#tblDecryptResult'), thead = $('<thead></thead>'), tbody = $('<tbody></tbody>');
                        tbl.empty();
                        var htr = $('<tr></tr>');
                        (d.headers || []).forEach(function (h) { htr.append($('<th></th>').text(h)); });
                        thead.append(htr);
                        (d.rows || []).forEach(function (row) {
                            var tr = $('<tr></tr>');
                            (row || []).forEach(function (cell) { tr.append($('<td></td>').text(cell || '')); });
                            tbody.append(tr);
                        });
                        tbl.append(thead).append(tbody);
                        $('#cardDecryptResult').show();
                        window._decryptGridResult = { headers: d.headers, rows: d.rows };
                    },
                    error: function () { hideProgress(); $('#decryptGridErr').text('Lỗi kết nối.').show(); }
                });
            });

            $('#btnCopyDecryptCsv').on('click', function () {
                var r = window._decryptGridResult;
                if (!r || !r.headers || !r.rows) return;
                var csv = r.headers.join(',') + '\n' + r.rows.map(function (row) { return (row || []).map(function (c) { return '"' + (c || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
                var ta = document.createElement('textarea');
                ta.value = csv;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast('Đã copy CSV.', 'success');
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
</body>
</html>
