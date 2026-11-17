<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="EncryptDecrypt.aspx.cs"
    Inherits="BADesign.Pages.EncryptDecrypt" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Mã hóa / Giải mã - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
.ba-conn-label { font-size: 0.875rem; color: var(--text-secondary); }
        .ba-conn-label strong { color: var(--primary-light); }.ba-tab-content { display: none; }
        .ba-tab-content.active { display: block; }.ba-result-wrap { display: flex; gap: 0.5rem; align-items: flex-start; margin-top: 0.5rem; }
        .ba-result-wrap textarea { flex: 1; min-height: 100px; }.ba-progress-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10001; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 1rem; color: var(--text-primary); }
        .ba-progress-overlay.show { display: flex; }        .script-preview { font-family: Consolas, monospace; font-size: 0.8rem; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }.ba-encdec-cards { align-items: start; }.ba-tabs-inner { border-bottom: 1px solid var(--border); padding-bottom: 0; }        .ba-source-radio label { display: flex; }
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
        }.ba-form-group .ba-info-icon { vertical-align: middle; margin-left: 2px; }.ba-key-password-wrap {
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
                        <button type="button" class="ba-tab active" data-tab="encdec">Mã hóa / Giải mã</button>
                        <button type="button" class="ba-tab" data-tab="sha256">SHA256 Hash</button>
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

                    <!-- Tab SHA256 Hash (giống Password) -->
                    <div id="tabSha256" class="ba-tab-content">
                        <div class="ba-card">
                            <h2 class="ba-card-title">Mã hóa SHA256 (giống Password)</h2>
                            <div class="ba-form-group">
                                <div class="ba-form-label-row">
                                    <label class="ba-form-label" for="selHashMode">Kiểu hash</label>
                                    <span class="ba-info-wrap">
                                        <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                        <div class="ba-info-popover" style="display: none;">
                                            <b>Password Cadena</b>: giống cột Security_Users.Password khi Trợ lý HR update password — SHA256 + salt ngẫu nhiên, lưu Base64(hash + salt). Mỗi lần mã hóa ra chuỗi khác nhau nhưng đều login được.<br />
                                            <b>Không salt (Base64)</b>: giống script Update Password của Trợ lý HR — cùng input luôn ra cùng kết quả.<br />
                                            <b>Hex</b>: SHA256 dạng hex thường, giống password login HR Helper (= HASHBYTES('SHA2_256') với chuỗi VARCHAR ASCII).
                                        </div>
                                    </span>
                                </div>
                                <select id="selHashMode" class="ba-input" style="max-width: 560px;">
                                    <option value="password">Password Cadena – SHA256 + salt ngẫu nhiên (Base64)</option>
                                    <option value="nosalt">SHA256 không salt (Base64) – giống script Update Password</option>
                                    <option value="hex">SHA256 Hex – giống password login HR Helper</option>
                                </select>
                            </div>
                            <div class="ba-form-group ba-sharedkey-row" style="margin-bottom: 0.5rem;">
                                <div class="ba-checkbox" style="margin-bottom: 0;">
                                    <input type="checkbox" id="chkHashWithUser" />
                                    <label for="chkHashWithUser">Mỗi dòng dạng UserName + Password (hash = lower(UserName) + Password)</label>
                                </div>
                                <span class="ba-info-wrap">
                                    <span class="ba-info-icon" title="Bấm để xem giải thích">i</span>
                                    <div class="ba-info-popover" style="display: none;">Cadena hash password theo lower(UserName) + Password. Bật tùy chọn này khi cần ra đúng giá trị cột Security_Users.Password. Mỗi dòng: UserName và Password cách nhau bằng TAB (copy 2 cột từ Excel/SQL) hoặc dấu phẩy, vd. <code>admin,123456</code>.</div>
                                </span>
                            </div>
                            <div class="ba-checkbox" style="margin-bottom: 0;">
                                <input type="checkbox" id="chkHashTrim" checked="checked" />
                                <label for="chkHashTrim">Bỏ khoảng trắng đầu/cuối mỗi dòng</label>
                            </div>
                        </div>
                        <div class="ba-grid-2 ba-encdec-cards">
                            <div class="ba-card">
                                <h2 class="ba-card-title">Chuỗi gốc</h2>
                                <div class="ba-form-group">
                                    <label class="ba-form-label" for="txtHashInput">Mỗi dòng 1 giá trị <span id="hashInputCount" style="color: var(--text-muted); font-weight: 400;"></span></label>
                                    <textarea id="txtHashInput" class="ba-input" rows="14" spellcheck="false" style="font-family: Consolas, monospace; white-space: pre; overflow-x: auto;" placeholder="123456&#10;Abc@123&#10;P@ssw0rd"></textarea>
                                </div>
                                <div class="ba-actions">
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnHashSha256">Mã hóa SHA256</button>
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnHashClear">Xóa</button>
                                </div>
                                <div id="hashErr" class="ba-err" style="display: none; white-space: pre-line;"></div>
                            </div>
                            <div class="ba-card">
                                <h2 class="ba-card-title">Kết quả</h2>
                                <div class="ba-form-group">
                                    <label class="ba-form-label" for="txtHashResult">Mỗi dòng tương ứng 1 dòng gốc <span id="hashResultCount" style="color: var(--text-muted); font-weight: 400;"></span></label>
                                    <textarea id="txtHashResult" class="ba-input" rows="14" readonly="readonly" spellcheck="false" style="font-family: Consolas, monospace; white-space: pre; overflow-x: auto;"></textarea>
                                </div>
                                <div class="ba-actions">
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnCopyHash" disabled="disabled">Copy</button>
                                    <button type="button" class="ba-btn ba-btn-secondary" id="btnDownloadHashCsv" disabled="disabled">Download CSV</button>
                                </div>
                            </div>
                        </div>
                        <div class="ba-card">
                            <h2 class="ba-card-title">Kiểm tra chuỗi với hash</h2>
                            <p class="ba-warn" style="margin: 0 0 1rem 0;">Tự nhận dạng hash Hex, Base64 không salt hoặc Base64 + salt (password Cadena). Nhập UserName nếu hash được tạo theo lower(UserName) + Password.</p>
                            <div class="ba-grid-2" style="gap: 1rem;">
                                <div class="ba-form-group">
                                    <label class="ba-form-label" for="txtVerifyUser">UserName (tùy chọn)</label>
                                    <input type="text" id="txtVerifyUser" class="ba-input" autocomplete="off" placeholder="vd. admin" />
                                </div>
                                <div class="ba-form-group">
                                    <label class="ba-form-label" for="txtVerifyPlain">Chuỗi gốc / Password</label>
                                    <div class="ba-key-password-wrap">
                                        <input type="password" id="txtVerifyPlain" class="ba-input" autocomplete="off" />
                                        <button type="button" class="ba-eye-btn" data-eye-target="txtVerifyPlain" title="Hiện/ẩn">👁</button>
                                    </div>
                                </div>
                            </div>
                            <div class="ba-form-group">
                                <label class="ba-form-label" for="txtVerifyHash">Hash (vd. giá trị cột Security_Users.Password)</label>
                                <input type="text" id="txtVerifyHash" class="ba-input" autocomplete="off" spellcheck="false" style="font-family: Consolas, monospace;" />
                            </div>
                            <button type="button" class="ba-btn ba-btn-primary" id="btnVerifyHash">Kiểm tra</button>
                            <div id="verifyHashResult" style="display: none; margin-top: 0.75rem; font-size: 0.9rem;"></div>
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
                                <li><strong>Từ HR DB:</strong> Kết nối qua Công cụ Database → Connect → Trợ lý HR → bấm &quot;Generate Demo Reset Script&quot; (hoặc mở trang với <code>?k=...</code>). Chọn Company (hoặc Tất cả) → <strong>Load danh sách</strong> → chọn nhân viên cần reset.</li>
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
                                <p class="ba-warn">Đã kết nối thì chọn Company (lọc) rồi bấm <strong>Load danh sách</strong>. Chưa kết nối: vào Công cụ Database → Connect → Trợ lý HR → bấm &quot;Generate Demo Reset Script&quot; hoặc mở trang với <code>?k=...</code>.</p>
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
            var hashUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/HashSha256Lines") %>';
            var verifyHashUrl = '<%= ResolveUrl("~/Pages/EncryptDecrypt.aspx/VerifySha256Hash") %>';
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

            function showToast(msg, type) { BaToast.show(msg, type); }
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

            // ---- Tab SHA256 Hash (giống Password) ----
            // Tách dòng giống server: CRLF/LF/CR, bỏ dòng trống ở cuối
            function splitHashLines(txt) {
                var t = (txt || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
                return t.length ? t.split('\n') : [];
            }
            function updateHashInputCount() {
                var n = splitHashLines($('#txtHashInput').val()).length;
                $('#hashInputCount').text(n ? '(' + n + ' dòng)' : '');
            }
            function resetHashResult() {
                window._hashResult = null;
                $('#txtHashResult').val('');
                $('#hashResultCount').text('');
                $('#btnCopyHash, #btnDownloadHashCsv').prop('disabled', true);
            }
            function updateHashPlaceholder() {
                $('#txtHashInput').attr('placeholder', $('#chkHashWithUser').is(':checked')
                    ? 'admin\t123456\nuser01,Abc@123'
                    : '123456\nAbc@123\nP@ssw0rd');
            }
            $('#txtHashInput').on('input', function () { updateHashInputCount(); });
            $('#chkHashWithUser').on('change', function () { updateHashPlaceholder(); resetHashResult(); });
            $('#selHashMode, #chkHashTrim').on('change', function () { resetHashResult(); });

            $('#btnHashSha256').on('click', function () {
                var txt = $('#txtHashInput').val() || '';
                var withUser = $('#chkHashWithUser').is(':checked');
                var trimLines = $('#chkHashTrim').is(':checked');
                var mode = $('#selHashMode').val();
                $('#hashErr').hide();
                resetHashResult();
                if (!txt.trim()) { $('#hashErr').text('Chưa nhập chuỗi cần mã hóa.').show(); return; }
                var $btn = $(this).prop('disabled', true);
                showProgress();
                $.ajax({
                    type: 'POST', url: hashUrl,
                    data: JSON.stringify({ text: txt, mode: mode, withUserName: withUser, trimLines: trimLines }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        hideProgress(); $btn.prop('disabled', false);
                        var d = r.d || r;
                        if (!d || !d.success) { $('#hashErr').text((d && d.message) || 'Lỗi').show(); return; }
                        var results = d.results || [];
                        window._hashResult = { lines: splitHashLines(txt), results: results, withUser: withUser, trimLines: trimLines, mode: mode };
                        $('#txtHashResult').val(results.join('\n'));
                        $('#hashResultCount').text('(' + (d.hashed || 0) + ' giá trị)');
                        $('#btnCopyHash, #btnDownloadHashCsv').prop('disabled', false);
                        var errs = d.errors || [];
                        if (errs.length) {
                            var shown = errs.slice(0, 10).join('\n') + (errs.length > 10 ? '\n... và ' + (errs.length - 10) + ' dòng lỗi khác' : '');
                            $('#hashErr').text(shown).show();
                            showToast('Đã mã hóa ' + (d.hashed || 0) + ' dòng, bỏ qua ' + errs.length + ' dòng lỗi.', 'error');
                        } else {
                            showToast('Đã mã hóa ' + (d.hashed || 0) + ' dòng.', 'success');
                        }
                    },
                    error: function (x, s) { hideProgress(); $btn.prop('disabled', false); $('#hashErr').text(s || 'Lỗi kết nối').show(); }
                });
            });

            $('#btnHashClear').on('click', function () {
                $('#txtHashInput').val('');
                $('#hashErr').hide();
                updateHashInputCount();
                resetHashResult();
            });

            $('#btnCopyHash').on('click', function () {
                var t = $('#txtHashResult');
                t.select();
                document.execCommand('copy');
                showToast('Đã copy.', 'success');
            });

            $('#btnDownloadHashCsv').on('click', function () {
                var r = window._hashResult;
                if (!r || !r.results) return;
                function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
                var rows = [];
                rows.push(r.withUser ? 'UserName,Password,SHA256' : 'Value,SHA256');
                r.lines.forEach(function (raw, i) {
                    var line = r.trimLines ? raw.trim() : raw;
                    var hash = r.results[i] || '';
                    if (r.withUser) {
                        var idx = line.indexOf('\t');
                        if (idx < 0) idx = line.indexOf(',');
                        var user = idx > 0 ? line.substring(0, idx).trim() : line;
                        var pwd = idx > 0 ? line.substring(idx + 1) : '';
                        if (r.trimLines) pwd = pwd.trim();
                        rows.push(q(user) + ',' + q(pwd) + ',' + q(hash));
                    } else {
                        rows.push(q(line) + ',' + q(hash));
                    }
                });
                var blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'SHA256_' + r.mode + '_' + (new Date().toISOString().slice(0, 10)) + '.csv';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Đã tải file CSV.', 'success');
            });

            $('#btnVerifyHash').on('click', function () {
                var $res = $('#verifyHashResult').hide().removeClass('ba-err');
                var plain = $('#txtVerifyPlain').val() || '';
                var user = ($('#txtVerifyUser').val() || '').trim();
                var hash = ($('#txtVerifyHash').val() || '').trim();
                if (!plain || !hash) { $res.addClass('ba-err').text('Nhập chuỗi gốc và hash.').show(); return; }
                $.ajax({
                    type: 'POST', url: verifyHashUrl,
                    data: JSON.stringify({ plainText: plain, userName: user, hashValue: hash }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        if (!d || !d.success) { $res.addClass('ba-err').text((d && d.message) || 'Lỗi').show(); return; }
                        $res.empty()
                            .append($('<strong></strong>').css('color', d.match ? 'var(--success)' : 'var(--danger)').text(d.match ? '✓ Khớp' : '✗ Không khớp'))
                            .append($('<span></span>').css('color', 'var(--text-muted)').text(' — định dạng: ' + (d.format || '') + (user ? ' · có ghép UserName' : '')))
                            .show();
                    },
                    error: function (x, s) { $res.addClass('ba-err').text(s || 'Lỗi kết nối').show(); }
                });
            });
            updateHashPlaceholder();

            $('[data-tab]').on('click', function () {
                var tab = $(this).data('tab');
                $('.ba-tab').removeClass('active'); $('.ba-tab-content').removeClass('active');
                $('.ba-tab[data-tab="' + tab + '"]').addClass('active');
                var map = { encdec: 'tabEncdec', sha256: 'tabSha256', connstr: 'tabConnstr', demoreset: 'tabDemoreset' };
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
                if (!k) { showToast('Chưa có kết nối HR DB. Mở trang từ Trợ lý HR (Generate Demo Reset Script).', 'error'); return; }
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
