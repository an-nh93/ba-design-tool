<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="AuditLog.aspx.cs"
    Inherits="BADesign.Pages.AuditLog" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<%@ Register Src="~/BaHead.ascx" TagName="BaHead" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Nhật ký thao tác - HR Helper</title>
    <uc:BaHead runat="server" />
    <style>
.ba-table-wrap { overflow-x: auto; overflow-y: auto; max-height: min(65vh, 600px); }
        .ba-table { table-layout: fixed; min-width: 900px; }        .ba-table thead th {
            background: var(--bg-darker);
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
            box-sizing: border-box;
        }
        .ba-table tbody td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.875rem;
            color: var(--text-primary);
            vertical-align: top;
            box-sizing: border-box;
        }        .ba-table .col-time { width: 11%; min-width: 100px; }
        .ba-table .col-user { width: 8%; min-width: 80px; }
        .ba-table .col-action { width: 12%; min-width: 120px; }
        .ba-table .col-detail { width: 32%; min-width: 200px; word-break: break-word; }
        .ba-table .col-ip { width: 7%; min-width: 90px; }
        .ba-table .col-device { width: 30%; min-width: 200px; font-size: 0.8125rem; color: var(--text-muted); word-break: break-word; }
        /* Ghi đè ba-layout.css: không ép cột cuối 1%, giữ đúng % và màu header */
        .ba-table-wrap .ba-table thead th:last-child { width: 30% !important; min-width: 200px !important; white-space: nowrap; background: var(--bg-darker) !important; }
        .ba-table-wrap .ba-table td:last-child { width: 30% !important; min-width: 200px !important; white-space: normal; word-break: break-word; }        .ba-pager { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .ba-pager-info { font-size: 0.8125rem; color: var(--text-secondary); }
        .ba-badge-action { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; background: var(--bg-hover); color: var(--text-primary); }
        .ba-detail-cell { display: flex; align-items: center; gap: 0.5rem; }
        .ba-detail-text { flex: 1; min-width: 0; word-break: break-word; }
        .ba-detail-view-btn { flex-shrink: 0; padding: 0.25rem 0.5rem; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 4px; color: var(--text-secondary); cursor: pointer; font-size: 0.8125rem; }
        .ba-detail-view-btn:hover { color: var(--primary); border-color: var(--primary); }
        .ba-audit-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1050; align-items: center; justify-content: center; padding: 1rem; box-sizing: border-box; }
        .ba-audit-modal.show { display: flex; }
        .ba-audit-modal-content { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; max-width: 760px; width: 95%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
        .ba-audit-modal-header { padding: 0.5rem 0.75rem 0.5rem 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .ba-audit-modal-title { margin: 0; font-size: 1rem; line-height: 1.3; font-weight: 600; color: var(--text-primary); }
        /* Nút × đóng dùng chung từ ba-layout.css (class ba-modal-close) */
        .ba-audit-modal-body { padding: 1.25rem; overflow-y: auto; flex: 1; font-size: 0.875rem; color: var(--text-primary); }
        .ba-audit-detail-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .ba-audit-detail-table th { text-align: left; padding: 0.5rem 1rem 0.5rem 0; font-weight: 600; color: var(--text-secondary); width: 140px; vertical-align: top; white-space: nowrap; }
        .ba-audit-detail-table td { padding: 0.5rem 0; word-break: break-word; }
        .ba-audit-detail-table tr { border-bottom: 1px solid var(--border); }
        .ba-audit-detail-table tr:last-child { border-bottom: none; }
        .ba-audit-detail-plain { white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
    </style>
</head>
<body class="ba-body">
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <div class="ba-card">
                    <h1 class="ba-card-title">Nhật ký thao tác</h1>
                    <p class="ba-card-desc" style="margin-bottom:1rem;">Xem lịch sử hành động: Restore/Backup/Delete database, Update User/Employee/Other. Thông tin client: IP, thiết bị (User-Agent), user, thời gian.</p>
                    <div class="ba-form-grid">
                        <div class="ba-form-group">
                            <label class="ba-form-label">Từ ngày</label>
                            <input type="datetime-local" id="dateFrom" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Đến ngày</label>
                            <input type="datetime-local" id="dateTo" class="ba-input" />
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">Hành động</label>
                            <select id="actionCode" class="ba-input">
                                <option value="">-- Tất cả --</option>
                            </select>
                        </div>
                        <div class="ba-form-group">
                            <label class="ba-form-label">User / IP</label>
                            <input type="text" id="filterUserOrIp" class="ba-input" placeholder="Username hoặc IP" />
                        </div>
                        <div class="ba-form-group">
                            <button type="button" id="btnSearch" class="ba-btn ba-btn-primary">Tìm kiếm</button>
                        </div>
                    </div>
                    <div class="ba-table-wrap">
                        <table class="ba-table">
                            <thead>
                                <tr>
                                    <th class="col-time">Thời gian</th>
                                    <th class="col-user">User</th>
                                    <th class="col-action">Hành động</th>
                                    <th class="col-detail">Chi tiết</th>
                                    <th class="col-ip">IP</th>
                                    <th class="col-device">Thiết bị (User-Agent)</th>
                                </tr>
                            </thead>
                            <tbody id="auditBody"></tbody>
                        </table>
                    </div>
                    <div id="auditEmpty" class="ba-empty" style="display:none;">Chưa có bản ghi hoặc không tìm thấy.</div>
                    <div class="ba-pager">
                        <span class="ba-pager-info" id="pagerInfo"></span>
                        <button type="button" id="btnPrev" class="ba-btn ba-btn-secondary" style="display:none;">Trước</button>
                        <button type="button" id="btnNext" class="ba-btn ba-btn-secondary" style="display:none;">Sau</button>
                    </div>
                </div>
            </div>
        </main>
    </form>
    <div id="auditDetailModal" class="ba-audit-modal">
        <div class="ba-audit-modal-content">
            <div class="ba-audit-modal-header">
                <span class="ba-audit-modal-title">Chi tiết</span>
                <button type="button" class="ba-btn ba-btn-secondary ba-modal-close" id="auditDetailModalClose" aria-label="Đóng">×</button>
            </div>
            <div class="ba-audit-modal-body" id="auditDetailModalBody"></div>
        </div>
    </div>
    <script>
        (function () {
            var pageSize = 50;
            var pageIndex = 0;
            var totalCount = 0;
            var getActionCodesUrl = '<%= ResolveUrl("~/Pages/AuditLog.aspx/GetActionCodes") %>';
            var getAuditLogsUrl = '<%= ResolveUrl("~/Pages/AuditLog.aspx/GetAuditLogs") %>';

            function setDefaultDates() {
                var now = new Date();
                var gmt7Ms = now.getTime() + (7 * 60 * 60 * 1000);
                var gmt7 = new Date(gmt7Ms);
                var pad = function (n) { return n < 10 ? '0' + n : n; };
                var dayOfWeek = gmt7.getUTCDay();
                var offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                var startOfWeek = new Date(Date.UTC(gmt7.getUTCFullYear(), gmt7.getUTCMonth(), gmt7.getUTCDate() - offsetToMonday, 0, 0, 0, 0));
                var endOfWeek = new Date(Date.UTC(startOfWeek.getUTCFullYear(), startOfWeek.getUTCMonth(), startOfWeek.getUTCDate() + 6, 23, 59, 59, 999));
                var fmt = function (dt) {
                    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
                };
                document.getElementById('dateFrom').value = fmt(startOfWeek) + 'T00:00';
                document.getElementById('dateTo').value = fmt(endOfWeek) + 'T23:59';
            }

            function loadActionCodes() {
                $.ajax({ url: getActionCodesUrl, type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function (r) {
                        var d = r.d || r;
                        if (!d || !d.success || !d.codes) return;
                        var sel = document.getElementById('actionCode');
                        sel.innerHTML = '<option value="">-- Tất cả --</option>';
                        d.codes.forEach(function (c) { var opt = document.createElement('option'); opt.value = c.code; opt.textContent = c.label || c.code; sel.appendChild(opt); });
                    }
                });
            }

            function loadPage() {
                var dateFrom = document.getElementById('dateFrom').value;
                var dateTo = document.getElementById('dateTo').value;
                var actionCode = document.getElementById('actionCode').value;
                var userOrIp = document.getElementById('filterUserOrIp').value.trim();

                $.ajax({ url: getAuditLogsUrl, type: 'POST', contentType: 'application/json', dataType: 'json',
                    data: JSON.stringify({ pageIndex: pageIndex, pageSize: pageSize, dateFrom: dateFrom || null, dateTo: dateTo || null, actionCode: actionCode || null, userOrIp: userOrIp || null }),
                    success: function (r) {
                    var d = r.d || r;
                    if (!d || !d.success) {
                        document.getElementById('auditBody').innerHTML = '<tr><td colspan="6">Lỗi: ' + (d && d.message ? d.message : 'Không tải được') + '</td></tr>';
                        document.getElementById('auditEmpty').style.display = 'none';
                        return;
                    }
                    totalCount = d.total || 0;
                    var rows = d.rows || [];
                    var tbody = document.getElementById('auditBody');
                    if (rows.length === 0) {
                        tbody.innerHTML = '';
                        document.getElementById('auditEmpty').style.display = 'block';
                    } else {
                        document.getElementById('auditEmpty').style.display = 'none';
                        window._auditLogRows = rows;
                        tbody.innerHTML = rows.map(function (x, idx) {
                                var shortDetail = (x.detail || '').length > 80 ? (x.detail || '').substring(0, 80) + '…' : (x.detail || '');
                                shortDetail = shortDetail.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                return '<tr>' +
                                    '<td class="col-time">' + (x.at || '') + '</td>' +
                                    '<td class="col-user">' + (x.userName || ('#' + (x.userId || ''))) + '</td>' +
                                    '<td class="col-action"><span class="ba-badge-action">' + (x.actionLabel || x.actionCode || '') + '</span></td>' +
                                    '<td class="col-detail"><div class="ba-detail-cell"><span class="ba-detail-text">' + shortDetail + '</span><button type="button" class="ba-detail-view-btn" data-idx="' + idx + '" title="Xem đầy đủ">&#128269; Xem</button></div></td>' +
                                    '<td class="col-ip">' + (x.ipAddress || '') + '</td>' +
                                    '<td class="col-device" title="' + (x.userAgent || '').replace(/"/g, '&quot;') + '">' + (x.userAgentShort || x.userAgent || '') + '</td>' +
                                    '</tr>';
                            }).join('');
                            tbody.querySelectorAll('.ba-detail-view-btn').forEach(function(btn) {
                                btn.onclick = function() {
                                    var idx = parseInt(this.getAttribute('data-idx'), 10);
                                    var r = (window._auditLogRows || [])[idx];
                                    if (!r) return;
                                    var detail = r.detail || '';
                                    var userAgent = r.userAgent || '';
                                    var parts = [];
                                    var s = detail.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                                    var chunks = s.split(/\s+->\s+|\n+/);
                                    chunks.forEach(function(chunk) {
                                        chunk = chunk.trim();
                                        if (!chunk) return;
                                        var sub = chunk.split(/\s+(?=[a-zA-Z_][a-zA-Z0-9_]*[=:])/);
                                        sub.forEach(function(seg) {
                                            seg = seg.trim();
                                            if (!seg) return;
                                            var eq = seg.indexOf('=');
                                            var col = seg.indexOf(':');
                                            if (eq > 0 && (col < 0 || eq < col)) {
                                                parts.push({ label: seg.substring(0, eq).trim(), value: seg.substring(eq + 1).trim() });
                                            } else if (col > 0) {
                                                parts.push({ label: seg.substring(0, col).trim(), value: seg.substring(col + 1).trim() });
                                            } else {
                                                parts.push({ label: '', value: seg });
                                            }
                                        });
                                    });
                                    if (userAgent) parts.push({ label: 'User-Agent', value: userAgent });
                                    var jobIdPart = parts.find(function(p) { return (p.label || '').toLowerCase() === 'jobid'; });
                                    var jobIdVal = jobIdPart ? parseInt(jobIdPart.value, 10) : 0;
                                    var actionCode = (r.actionCode || '').toString();
                                    var isMultiDbReset = (actionCode === 'HRHelper.MultiDbReset') && jobIdVal > 0;
                                    var needJobResult = jobIdVal > 0 && ['HRHelper.UpdateEmployee','HRHelper.UpdateUser','HRHelper.UpdateUserSignature','HRHelper.UpdateOther','HRHelper.MultiDbReset'].indexOf(actionCode) >= 0;
                                    var extraRows = '';
                                    if (isMultiDbReset) extraRows += '<tr id="auditDbListRow"><th>Danh sách database</th><td id="auditDbListCell">Đang tải...</td></tr>';
                                    if (needJobResult) extraRows += '<tr id="auditJobResultRow"><th>Kết quả job</th><td id="auditJobResultCell">Đang tải...</td></tr>';
                                    var html = parts.length > 0
                                        ? '<table class="ba-audit-detail-table"><tbody>' + parts.map(function(p) {
                                            var lbl = (p.label || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                            var val = (p.value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                            return '<tr><th>' + (lbl || '—') + '</th><td>' + val + '</td></tr>';
                                        }).join('') + extraRows + '</tbody></table>'
                                        : '<div class="ba-audit-detail-plain">' + (detail || '—').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') + '</div>';
                                    document.getElementById('auditDetailModalBody').innerHTML = html;
                                    document.getElementById('auditDetailModal').classList.add('show');
                                    if (needJobResult) {
                                        $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobResult") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobIdVal }),
                                            success: function(res) {
                                                var d = res.d || res;
                                                var $cell = $('#auditJobResultCell');
                                                if (!$cell.length) return;
                                                if (!d || !d.success) { $cell.text('—'); return; }
                                                var st = (d.status || '').toString();
                                                var msg = (d.message || '').toString().trim();
                                                var statusLabel = st === 'Completed' ? 'Thành công' : (st === 'Failed' ? 'Lỗi' : (st === 'Running' ? 'Đang chạy' : st));
                                                var text = statusLabel + (msg ? '\n' + msg : '');
                                                $cell.html(text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>'));
                                            },
                                            error: function() { var $c = $('#auditJobResultCell'); if ($c.length) $c.text('—'); }
                                        });
                                    }
                                    if (isMultiDbReset) {
                                        $.ajax({ url: '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx/GetJobPayload") %>', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: jobIdVal }),
                                            success: function(res) {
                                                var d = res.d || res;
                                                var payload = (d && d.success && d.payload) ? d.payload : null;
                                                var $cell = $('#auditDbListCell');
                                                if (!$cell.length) return;
                                                try {
                                                    var pl = payload ? (typeof payload === 'string' ? JSON.parse(payload) : payload) : null;
                                                    var dbArr = (pl && pl.databaseNames) ? pl.databaseNames : [];
                                                    var nDb = dbArr.length || (pl && pl.databaseCount) || 0;
                                                    var cell = nDb + ' Database';
                                                    if (dbArr.length > 0) {
                                                        var esc = function(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
                                                        cell = nDb + ' Database <button type="button" class="ba-db-list-toggle" data-dbs="' + esc(JSON.stringify(dbArr)) + '" title="Bấm xem danh sách">▼ Xem danh sách</button><div class="ba-db-list-popover"></div>';
                                                        $cell.html(cell);
                                                        $('#auditDetailModalBody').off('click.baDbList').on('click.baDbList', '.ba-db-list-toggle', function() {
                                                        var $btn = $(this), $pop = $btn.siblings('.ba-db-list-popover').first();
                                                        var raw = $btn.attr('data-dbs');
                                                        if ($pop.hasClass('show')) { $pop.removeClass('show').empty(); return; }
                                                        try {
                                                            var arr = typeof raw === 'string' ? JSON.parse(raw.replace(/&quot;/g, '"')) : (raw || []);
                                                            var grid = '<div class="ba-db-list-grid">' + (arr.map(function(name) { return '<span>' + (name || '').replace(/</g, '&lt;') + '</span>'; }).join('')) + '</div>';
                                                            $pop.html(grid).addClass('show');
                                                        } catch (e) { $pop.html('Không parse được danh sách.').addClass('show'); }
                                                    });
                                                    } else { $cell.text('—'); }
                                                } catch (e) { $cell.text('—'); }
                                            },
                                            error: function() { $('#auditDbListCell').text('—'); }
                                        });
                                    }
                                };
                            });
                    }
                    var start = pageIndex * pageSize + 1;
                    var end = Math.min((pageIndex + 1) * pageSize, totalCount);
                    document.getElementById('pagerInfo').textContent = totalCount === 0 ? '0 bản ghi' : 'Hiển thị ' + start + '–' + end + ' / ' + totalCount;
                    document.getElementById('btnPrev').style.display = pageIndex > 0 ? 'inline-flex' : 'none';
                    document.getElementById('btnNext').style.display = (pageIndex + 1) * pageSize < totalCount ? 'inline-flex' : 'none';
                    },
                    error: function (xhr, status, err) {
                        var msg = status ? ('Lỗi: Không tải được (' + status + ').') : 'Lỗi: Không tải được.';
                        document.getElementById('auditBody').innerHTML = '<tr><td colspan="6">' + msg + ' Thử lại hoặc kiểm tra console.</td></tr>';
                        document.getElementById('auditEmpty').style.display = 'none';
                    }
                });
            }

            setDefaultDates();
            loadActionCodes();

            document.getElementById('btnSearch').onclick = function () { pageIndex = 0; loadPage(); };
            function onFilterKeydown(e) {
                if (e.keyCode === 13) { e.preventDefault(); pageIndex = 0; loadPage(); }
            }
            ['dateFrom', 'dateTo', 'actionCode', 'filterUserOrIp'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('keydown', onFilterKeydown);
            });
            document.getElementById('btnPrev').onclick = function () { if (pageIndex > 0) { pageIndex--; loadPage(); } };
            document.getElementById('btnNext').onclick = function () { if ((pageIndex + 1) * pageSize < totalCount) { pageIndex++; loadPage(); } };

            var auditDetailModal = document.getElementById('auditDetailModal');
            var auditDetailModalClose = document.getElementById('auditDetailModalClose');
            if (auditDetailModalClose) auditDetailModalClose.onclick = function () { auditDetailModal.classList.remove('show'); };
            if (auditDetailModal) auditDetailModal.onclick = function (e) { if (e.target === auditDetailModal) auditDetailModal.classList.remove('show'); };


            loadPage();
        })();
    </script>
</body>
</html>
