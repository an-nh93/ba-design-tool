<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="LicenseKey.aspx.cs"
    Inherits="BADesign.Pages.LicenseKey" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Khóa bản quyền (Dev) - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
        .ba-content { max-width: 1100px; }
        .ba-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.5rem 1rem; }
        .ba-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
        .ba-field .ba-form-label { margin: 0; }
        .ba-mid-row { display: flex; gap: 0.5rem; align-items: flex-end; margin-top: 0.5rem; }
        .ba-mid-row .ba-field { flex: 1; }
        .ba-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 0.625rem; }
        .ba-err-box { color: var(--danger); font-size: 0.8125rem; margin-top: 0.5rem; display: none; }
        .ba-key-out { margin-top: 0.75rem; }
        .ba-key-out textarea {
            width: 100%; min-height: 64px; resize: vertical;
            padding: 0.375rem 0.5rem; border-radius: 6px;
            border: 1px solid var(--border); background: var(--bg-darker);
            color: var(--text-primary); font-family: Consolas, "Courier New", monospace;
            font-size: 0.875rem; letter-spacing: 0.02em; word-break: break-all;
        }
        .ba-kv-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; margin-top: 0.5rem; }
        .ba-kv-table th, .ba-kv-table td { padding: 0.375rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
        .ba-kv-table th { width: 220px; color: var(--text-secondary); font-weight: 600; }
        .ba-muted { color: var(--text-muted); font-size: 0.75rem; }
        .ba-ok { color: var(--success); }
        #tenantWrap { margin-top: 0.5rem; }
        #txtConnStr { font-family: Consolas, "Courier New", monospace; }
    </style>
</head>
<body class="ba-body">
    <form id="form1" runat="server">
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <h1 class="ba-card-title">License Key — Dev / Debug</h1>
                <p class="ba-section-hint" data-i18n-html>
                    Sinh license key cho HRM khi dev/test (Trial, Limited theo tháng, hoặc Permanent).
                    Key <strong>Limited/Permanent</strong> gắn với <strong>Machine ID của máy chạy HRM</strong> — nhập đúng Machine ID server đó
                    (bấm "Lấy Machine ID" nếu HR Helper chạy cùng máy). Key <strong>Trial</strong> không gắn máy.
                </p>

                <div class="ba-card">
                    <h2 class="ba-card-title">Kết nối Database &amp; chọn Tenant</h2>
                    <p class="ba-section-hint">
                        Chọn <strong>Server → Database → Kết nối</strong>, rồi chọn <strong>Tenant</strong> để tự điền Tenant Code
                        (và số company / employee hiện tại để tham khảo). Dành cho dev không nhớ tenant code.
                    </p>
                    <div class="ba-form-grid">
                        <div class="ba-field">
                            <label class="ba-form-label">Server</label>
                            <select id="selServer" class="ba-input"></select>
                        </div>
                        <div class="ba-field">
                            <label class="ba-form-label">Database</label>
                            <select id="selDb" class="ba-input"></select>
                        </div>
                    </div>
                    <div class="ba-toolbar">
                        <button type="button" class="ba-btn ba-btn-secondary" id="btnLoadDb">Tải DB</button>
                        <button type="button" class="ba-btn ba-btn-primary" id="btnConnect">Kết nối</button>
                        <span class="ba-muted" id="connStatus">Chưa kết nối.</span>
                    </div>
                    <div class="ba-err-box" id="dbErr"></div>
                    <div class="ba-form-divider">
                        <div class="ba-field">
                            <label class="ba-form-label">Hoặc — kết nối bằng Connection String</label>
                            <input type="text" class="ba-input" id="txtConnStr" placeholder="Data Source=...;Initial Catalog=...;User ID=...;Password=..." />
                        </div>
                        <div class="ba-toolbar">
                            <button type="button" class="ba-btn ba-btn-primary" id="btnConnectCs">Kết nối bằng Connection String</button>
                        </div>
                    </div>
                    <div id="tenantWrap" style="display:none;">
                        <div class="ba-form-grid">
                            <div class="ba-field">
                                <label class="ba-form-label">Tenant</label>
                                <select id="selTenant" class="ba-input"></select>
                            </div>
                        </div>
                        <div class="ba-toolbar">
                            <button type="button" class="ba-btn ba-btn-secondary" id="btnReloadTenant">Tải lại tenant</button>
                            <span class="ba-muted" id="tenantStat"></span>
                        </div>
                    </div>
                </div>

                <div class="ba-card">
                    <h2 class="ba-card-title">Tạo License Key</h2>

                    <div class="ba-form-group">
                        <label class="ba-form-label">Loại license</label>
                        <div class="ba-choice-row">
                            <label class="ba-checkbox"><input type="radio" name="licType" value="limited" checked="checked" /> Limited (theo tháng)</label>
                            <label class="ba-checkbox"><input type="radio" name="licType" value="permanent" /> Permanent (vĩnh viễn)</label>
                            <label class="ba-checkbox"><input type="radio" name="licType" value="trial" /> Trial</label>
                        </div>
                    </div>

                    <div class="ba-form-group">
                        <label class="ba-form-label">Product</label>
                        <div class="ba-choice-row">
                            <label class="ba-checkbox"><input type="radio" name="prodType" value="1" checked="checked" /> HRMS5</label>
                            <label class="ba-checkbox"><input type="radio" name="prodType" value="2" /> Paytime</label>
                            <label class="ba-checkbox"><input type="radio" name="prodType" value="3" /> Paytime Cloud</label>
                        </div>
                    </div>

                    <div class="ba-form-grid">
                        <div class="ba-field">
                            <label class="ba-form-label">Tenant Code</label>
                            <input type="text" class="ba-input" id="txtTenant" maxlength="11" placeholder="VD: VTI, MJK..." />
                        </div>
                        <div class="ba-field">
                            <label class="ba-form-label">Effective Date</label>
                            <input type="date" class="ba-input" id="txtEffective" />
                        </div>
                        <div class="ba-field">
                            <label class="ba-form-label">License Month</label>
                            <input type="number" class="ba-input" id="txtMonth" min="0" max="999" value="12" />
                        </div>
                        <div class="ba-field">
                            <label class="ba-form-label">Số Company</label>
                            <input type="number" class="ba-input" id="txtCompany" min="1" value="1" />
                        </div>
                        <div class="ba-field">
                            <label class="ba-form-label">Số Employee</label>
                            <input type="number" class="ba-input" id="txtEmployee" min="1" max="99999" value="100" />
                        </div>
                    </div>

                    <div class="ba-mid-row">
                        <div class="ba-field">
                            <label class="ba-form-label">Machine ID (server chạy HRM)</label>
                            <input type="text" class="ba-input" id="txtMachine" placeholder="Dán Machine ID của server HRM" />
                        </div>
                        <button type="button" class="ba-btn ba-btn-secondary" id="btnGetMachine">Lấy Machine ID (máy này)</button>
                    </div>

                    <div class="ba-toolbar">
                        <button type="button" class="ba-btn ba-btn-primary" id="btnGenerate">Tạo Key</button>
                        <button type="button" class="ba-btn ba-btn-secondary" id="btnClear">Xóa form</button>
                        <span class="ba-muted">Key Limited/Permanent bắt buộc Machine ID. Trial thì bỏ qua Tenant/Machine.</span>
                    </div>

                    <div class="ba-err-box" id="genErr"></div>

                    <div class="ba-key-out" id="keyOutWrap" style="display:none;">
                        <label class="ba-muted">License Key</label>
                        <textarea id="txtKeyOut" readonly="readonly"></textarea>
                        <div class="ba-toolbar">
                            <button type="button" class="ba-btn ba-btn-secondary" id="btnCopy">Copy</button>
                            <button type="button" class="ba-btn ba-btn-secondary" id="btnDecodeThis">Decode key này</button>
                            <span class="ba-ok" id="copyMsg" style="display:none;">Đã copy!</span>
                        </div>
                    </div>
                </div>

                <div class="ba-card">
                    <h2 class="ba-card-title">Giải mã (Decode) License Key</h2>
                    <div class="ba-field">
                        <label class="ba-form-label">License Key cần kiểm tra</label>
                        <input type="text" class="ba-input" id="txtDecodeIn" placeholder="Dán license key..." />
                    </div>
                    <div class="ba-toolbar">
                        <button type="button" class="ba-btn ba-btn-primary" id="btnDecode">Decode</button>
                    </div>
                    <div class="ba-err-box" id="decErr"></div>
                    <table class="ba-kv-table" id="decResult" style="display:none;">
                        <tbody>
                            <tr><th>Hợp lệ</th><td id="dValid"></td></tr>
                            <tr><th>Loại</th><td id="dType"></td></tr>
                            <tr><th>Product</th><td id="dProduct"></td></tr>
                            <tr><th>Tenant Code</th><td id="dTenant"></td></tr>
                            <tr><th>Machine ID</th><td id="dMachine"></td></tr>
                            <tr><th>Số Company</th><td id="dCompany"></td></tr>
                            <tr><th>Số Employee</th><td id="dEmployee"></td></tr>
                            <tr><th>License Month</th><td id="dMonth"></td></tr>
                            <tr><th>Effective Date</th><td id="dEffective"></td></tr>
                            <tr><th>Expired Date</th><td id="dExpired"></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </form>

    <script>
        (function () {
            var urlGen = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/GenerateKey") %>';
            var urlDecode = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/DecodeKey") %>';
            var urlMachine = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/GetServerMachineId") %>';
            var urlServers = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/LkGetServers") %>';
            var urlDbs = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/LkGetDatabases") %>';
            var urlConnect = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/LkConnect") %>';
            var urlTenants = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/LkGetTenants") %>';
            var urlStats = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/LkGetTenantStats") %>';
            var urlConnectCs = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/LkConnectByConnString") %>';
            var urlStatus = '<%= ResolveUrl("~/Pages/LicenseKey.aspx/LkGetConnStatus") %>';

            function licType() { return $('input[name="licType"]:checked').val(); }
            function prodType() { return parseInt($('input[name="prodType"]:checked').val(), 10) || 1; }
            function prodName(t) { return t === 2 ? 'Paytime' : (t === 3 ? 'Paytime Cloud' : 'HRMS5'); }

            function todayIso() {
                var d = new Date();
                var m = ('0' + (d.getMonth() + 1)).slice(-2);
                var day = ('0' + d.getDate()).slice(-2);
                return d.getFullYear() + '-' + m + '-' + day;
            }

            function applyType() {
                var t = licType();
                var isTrial = t === 'trial';
                var isPerm = t === 'permanent';
                $('#txtTenant').prop('disabled', isTrial);
                $('#txtMachine').prop('disabled', isTrial);
                $('#btnGetMachine').prop('disabled', isTrial);
                $('#txtMonth').prop('disabled', isPerm);
                if (isPerm) $('#txtMonth').val(0);
                else if (parseInt($('#txtMonth').val(), 10) <= 0) $('#txtMonth').val(isTrial ? 1 : 12);
            }

            function post(url, data, ok) {
                $.ajax({
                    type: 'POST', url: url,
                    data: JSON.stringify(data),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) { ok((r && r.d) ? r.d : r); },
                    error: function (x, st) { ok({ success: false, message: st || 'Lỗi kết nối.' }); }
                });
            }

            $('input[name="licType"]').on('change', applyType);

            $('#btnGetMachine').on('click', function () {
                var $b = $(this).prop('disabled', true).text('Đang lấy...');
                post(urlMachine, {}, function (d) {
                    $b.prop('disabled', false).text('Lấy Machine ID (máy này)');
                    if (!d.success) { $('#genErr').text(d.message || 'Không lấy được Machine ID.').show(); return; }
                    $('#txtMachine').val(d.machineId);
                });
            });

            $('#btnGenerate').on('click', function () {
                $('#genErr').hide().text('');
                var payload = {
                    licenseType: licType(),
                    productType: prodType(),
                    tenantCode: $('#txtTenant').val(),
                    machineId: $('#txtMachine').val(),
                    numCompany: parseInt($('#txtCompany').val(), 10) || 0,
                    numEmployee: parseInt($('#txtEmployee').val(), 10) || 0,
                    licenseMonth: parseInt($('#txtMonth').val(), 10) || 0,
                    effectiveDate: $('#txtEffective').val() || todayIso()
                };
                var $b = $(this).prop('disabled', true).text('Đang tạo...');
                post(urlGen, payload, function (d) {
                    $b.prop('disabled', false).text('Tạo Key');
                    if (!d.success) { $('#genErr').text(d.message || 'Lỗi tạo key.').show(); $('#keyOutWrap').hide(); return; }
                    $('#txtKeyOut').val(d.key);
                    $('#keyOutWrap').show();
                });
            });

            $('#btnClear').on('click', function () {
                $('#txtTenant,#txtMachine').val('');
                $('#txtCompany').val(1); $('#txtEmployee').val(100); $('#txtMonth').val(12);
                $('#txtEffective').val(todayIso());
                $('#keyOutWrap').hide(); $('#genErr').hide();
            });

            $('#btnCopy').on('click', function () {
                var el = document.getElementById('txtKeyOut');
                el.select(); el.setSelectionRange(0, 99999);
                try { document.execCommand('copy'); $('#copyMsg').show().delay(1500).fadeOut(); } catch (e) { }
            });

            $('#btnDecodeThis').on('click', function () {
                $('#txtDecodeIn').val($('#txtKeyOut').val());
                $('#btnDecode').click();
                $('html,body').animate({ scrollTop: $('#decResult').offset().top - 80 }, 250);
            });

            $('#btnDecode').on('click', function () {
                $('#decErr').hide().text('');
                var key = $('#txtDecodeIn').val();
                if (!key) { $('#decErr').text('Vui lòng nhập key.').show(); return; }
                var $b = $(this).prop('disabled', true).text('Đang giải mã...');
                post(urlDecode, { key: key }, function (d) {
                    $b.prop('disabled', false).text('Decode');
                    if (!d.success) { $('#decResult').hide(); $('#decErr').text(d.message || 'Key không hợp lệ.').show(); return; }
                    var type = d.isTrial ? 'Trial' : (d.isNonExpired ? 'Permanent' : 'Limited');
                    $('#dValid').html('<span class="ba-ok">Hợp lệ</span>');
                    $('#dType').text(type);
                    $('#dProduct').text(prodName(d.productType));
                    $('#dTenant').text(d.tenantCode || '(trống)');
                    $('#dMachine').text(d.machineId || '(không gắn máy)');
                    $('#dCompany').text(d.numCompany);
                    $('#dEmployee').text(d.numEmployee);
                    $('#dMonth').text(d.isNonExpired ? '— (vĩnh viễn)' : d.licenseMonth);
                    $('#dEffective').text(d.effectiveDate);
                    $('#dExpired').text(d.isNonExpired ? '— (vĩnh viễn)' : d.expiredDate);
                    $('#decResult').show();
                });
            });

            // ===== Database connect & tenant picker =====
            function fillSelect($sel, items, valKey, textFn, placeholder) {
                $sel.empty();
                if (placeholder) $sel.append($('<option/>').val('').text(placeholder));
                items.forEach(function (it) {
                    $sel.append($('<option/>').val(it[valKey]).text(textFn(it)));
                });
            }

            function loadServers() {
                post(urlServers, {}, function (d) {
                    if (!d.success) { $('#dbErr').text(d.message || 'Không tải được danh sách server.').show(); return; }
                    fillSelect($('#selServer'), d.list, 'id', function (it) { return it.name; }, '-- Chọn server --');
                });
            }

            $('#btnLoadDb').on('click', function () {
                $('#dbErr').hide();
                var sid = parseInt($('#selServer').val(), 10);
                if (!sid) { $('#dbErr').text('Chọn server trước.').show(); return; }
                var $b = $(this).prop('disabled', true).text('Đang tải...');
                post(urlDbs, { serverId: sid }, function (d) {
                    $b.prop('disabled', false).text('Tải DB');
                    if (!d.success) { $('#dbErr').text(d.message || 'Không tải được database.').show(); return; }
                    fillSelect($('#selDb'), d.list.map(function (n) { return { name: n }; }), 'name', function (it) { return it.name; }, '-- Chọn database --');
                });
            });

            $('#btnConnect').on('click', function () {
                $('#dbErr').hide();
                var sid = parseInt($('#selServer').val(), 10);
                var db = $('#selDb').val();
                if (!sid || !db) { $('#dbErr').text('Chọn server và database.').show(); return; }
                var $b = $(this).prop('disabled', true).text('Đang kết nối...');
                post(urlConnect, { serverId: sid, databaseName: db }, function (d) {
                    $b.prop('disabled', false).text('Kết nối');
                    if (!d.success) { $('#connStatus').text('Chưa kết nối.'); $('#tenantWrap').hide(); $('#dbErr').text(d.message || 'Kết nối thất bại.').show(); return; }
                    $('#connStatus').html('<span class="ba-ok">Đã kết nối:</span> ' + d.label);
                    loadTenants();
                });
            });

            $('#btnConnectCs').on('click', function () {
                $('#dbErr').hide();
                var cs = ($('#txtConnStr').val() || '').trim();
                if (!cs) { $('#dbErr').text('Nhập connection string.').show(); return; }
                var $b = $(this).prop('disabled', true).text('Đang kết nối...');
                post(urlConnectCs, { connectionString: cs }, function (d) {
                    $b.prop('disabled', false).text('Kết nối bằng Connection String');
                    if (!d.success) { $('#connStatus').text('Chưa kết nối.'); $('#tenantWrap').hide(); $('#dbErr').text(d.message || 'Kết nối thất bại.').show(); return; }
                    $('#connStatus').html('<span class="ba-ok">Đã kết nối:</span> ' + d.label);
                    loadTenants();
                });
            });

            $('#btnReloadTenant').on('click', loadTenants);

            function loadTenants() {
                post(urlTenants, {}, function (d) {
                    if (!d.success) { $('#dbErr').text(d.message || 'Không tải được tenant.').show(); return; }
                    var $sel = $('#selTenant');
                    $sel.empty().append($('<option/>').val('').text('-- Chọn tenant --'));
                    d.list.forEach(function (it) {
                        $('<option/>').val(it.id).attr('data-code', it.code).text(it.code + '  (ID ' + it.id + ')').appendTo($sel);
                    });
                    $('#tenantWrap').show();
                    $('#tenantStat').text('');
                });
            }

            $('#selTenant').on('change', function () {
                var tid = parseInt($(this).val(), 10);
                var code = $(this).find('option:selected').attr('data-code') || '';
                if (code) $('#txtTenant').val(code);
                if (!tid) { $('#tenantStat').text(''); return; }
                $('#tenantStat').text('Đang lấy số liệu...');
                post(urlStats, { tenantId: tid }, function (d) {
                    if (!d.success) { $('#tenantStat').text(d.message || ''); return; }
                    if (d.company != null && d.company > 0) $('#txtCompany').val(d.company);
                    if (d.employee != null && d.employee > 0) $('#txtEmployee').val(d.employee);
                    var comp = (d.company != null) ? d.company : '?';
                    var emp = (d.employee != null) ? d.employee : 'n/a';
                    $('#tenantStat').text('Hiện tại: ' + comp + ' company · ' + emp + ' employee active — số tham khảo, chỉnh cap theo nhu cầu.');
                });
            });

            // init
            $('#txtEffective').val(todayIso());
            applyType();
            loadServers();
            // Nếu mở từ Database Tools/HR Helper (?k=) hoặc đã kết nối trước đó → tự hiện tenant
            post(urlStatus, {}, function (d) {
                if (d.success && d.connected) {
                    $('#connStatus').html('<span class="ba-ok">Đã kết nối:</span> ' + (d.label || ''));
                    loadTenants();
                }
            });
        })();
    </script>
</body>
</html>
