<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="HomeRole.aspx.cs"
    Inherits="BADesign.Pages.HomeRole" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Home - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/jquery.signalR.min.js"></script>
    <script src="../Scripts/ba-signalr.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        .ba-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 1.5rem;
        }
        .ba-card-title { 
            font-size: 1.5rem; 
            font-weight: 600; 
            color: var(--text-primary); 
            margin-bottom: 1rem;
        }
        .ba-card-desc {
            color: var(--text-secondary);
            font-size: 0.9375rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .ba-feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
        }
        .ba-feature-card {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.2s;
            text-decoration: none;
            display: block;
            color: inherit;
        }
        .ba-feature-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
        }
        .ba-feature-card.disabled {
            opacity: 0.6;
            cursor: default;
            pointer-events: none;
        }
        .ba-feature-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        .ba-feature-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        .ba-feature-desc {
            color: var(--text-muted);
            font-size: 0.875rem;
            line-height: 1.5;
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
                <div class="ba-content">
                    <div class="ba-card">
                        <h2 class="ba-card-title">
                            <asp:Literal ID="litWelcomeTitle" runat="server" />
                        </h2>
                        <p class="ba-card-desc">
                            <asp:Literal ID="litWelcomeDesc" runat="server" />
                        </p>
                        <div class="ba-feature-grid">
                            <asp:HyperLink ID="lnkFeatureUIBuilder" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Home">
                                <div class="ba-feature-icon">🛠️</div>
                                <div class="ba-feature-title">UI Builder</div>
                                <div class="ba-feature-desc">Thiết kế và tạo giao diện người dùng. Tạo controls, forms, và các component UI.</div>
                            </asp:HyperLink>
                            <asp:HyperLink ID="lnkFeatureDbSearch" runat="server" CssClass="ba-feature-card" NavigateUrl="~/DatabaseSearch">
                                <div class="ba-feature-icon">🔍</div>
                                <div class="ba-feature-title">Database Search</div>
                                <div class="ba-feature-desc">Tìm kiếm và quản lý database connections. Quét server, xem danh sách database, copy connection string.</div>
                            </asp:HyperLink>
                            <asp:PlaceHolder ID="phFeatureEncryptDecrypt" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureEncryptDecrypt" runat="server" CssClass="ba-feature-card" NavigateUrl="~/EncryptDecrypt">
                                    <div class="ba-feature-icon">🔐</div>
                                    <div class="ba-feature-title">Encrypt/Decrypt Data</div>
                                    <div class="ba-feature-desc">Mã hóa / giải mã đơn, tạo script Demo Reset (phone, email, lương) theo nhân viên.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phFeatureAppSettings" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureAppSettings" runat="server" CssClass="ba-feature-card" NavigateUrl="~/AppSettings">
                                    <div class="ba-feature-icon">⚙️</div>
                                    <div class="ba-feature-title">App Settings</div>
                                    <div class="ba-feature-desc">Cấu hình hệ thống: Email Server, SFTP, Telegram, Public URL, ...</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phFeaturePgpTool" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeaturePgpTool" runat="server" CssClass="ba-feature-card" NavigateUrl="~/PgpTool">
                                    <div class="ba-feature-icon">🧰</div>
                                    <div class="ba-feature-title">PGP Tool</div>
                                    <div class="ba-feature-desc">Xuất key .asc, mã hóa và giải mã file PGP.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                            <asp:HyperLink ID="lnkFeatureFeedback" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Feedback">
                                <div class="ba-feature-icon">💬</div>
                                <div class="ba-feature-title">Feedback</div>
                                <div class="ba-feature-desc">Gửi ý kiến, báo lỗi hoặc đề xuất cải tiến cho HR Helper.</div>
                            </asp:HyperLink>
                            <asp:HyperLink ID="lnkFeatureCommunityShare" runat="server" CssClass="ba-feature-card" NavigateUrl="~/DevShare">
                                <div class="ba-feature-icon">📤</div>
                                <div class="ba-feature-title">Community Share</div>
                                <div class="ba-feature-desc">Chia sẻ bài hướng dẫn code, ví dụ C#, SQL, ASP.NET... Mọi người đều có thể viết và đọc.</div>
                            </asp:HyperLink>
                            <asp:PlaceHolder ID="phNoFeatures" runat="server" Visible="false">
                                <div class="ba-feature-card disabled" style="grid-column: 1 / -1; text-align: center; opacity: 1;">
                                    <div class="ba-feature-icon">📋</div>
                                    <div class="ba-feature-title">Chưa có quyền chức năng</div>
                                    <div class="ba-feature-desc">Bạn chưa được gán quyền nào. Liên hệ Super Admin để được cấp quyền sử dụng nhiều tính năng của HR Helper.</div>
                                </div>
                            </asp:PlaceHolder>
                            <asp:PlaceHolder ID="phSuperAdminCards" runat="server" Visible="false">
                                <asp:HyperLink ID="lnkFeatureUserManagement" runat="server" CssClass="ba-feature-card" NavigateUrl="~/Users">
                                    <div class="ba-feature-icon">👥</div>
                                    <div class="ba-feature-title">User Management</div>
                                    <div class="ba-feature-desc">Quản lý user: thêm, sửa, đổi mật khẩu, gán role và quyền riêng lẻ.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureRolePermission" runat="server" CssClass="ba-feature-card" NavigateUrl="~/RolePermission">
                                    <div class="ba-feature-icon">🛡</div>
                                    <div class="ba-feature-title">Role Permission</div>
                                    <div class="ba-feature-desc">Định nghĩa quyền theo Role (BA, CONS, DEV, QC) và cấu hình UIBuilder, Database Search, EncryptDecrypt, HR Helper.</div>
                                </asp:HyperLink>
                                <asp:HyperLink ID="lnkFeatureLeaveManager" runat="server" CssClass="ba-feature-card" NavigateUrl="~/LeaveManager">
                                    <div class="ba-feature-icon">📅</div>
                                    <div class="ba-feature-title">Leave Manager</div>
                                    <div class="ba-feature-desc">Quản lý lịch nghỉ phép team. Xem hôm nay bao nhiêu NV nghỉ, ai làm.</div>
                                </asp:HyperLink>
                            </asp:PlaceHolder>
                        </div>
                    </div>
                </div>
            </main>
        </div>

    </form>
    <script>
        (function() {
            var apiBase = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>';
            var DISMISSED_KEY = 'baDismissedJobIds';
            var MSG_MAX = 120;
            function getDismissed() { try { var r = localStorage.getItem(DISMISSED_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } }
            function addDismissed(id) { var a = getDismissed(); var key = 'j:' + id; if (a.indexOf(key) < 0) { a.push(key); localStorage.setItem(DISMISSED_KEY, JSON.stringify(a)); } }
            function isDismissed(job) { return getDismissed().indexOf('j:' + (job.id || '')) >= 0; }
            function fmtTime(v) {
                if (!v) return '—';
                var m = String(v).match(/^\/Date\((\d+)\)\/$/);
                var d = m ? new Date(parseInt(m[1], 10)) : new Date(v);
                return isNaN(d.getTime()) ? v : d.toLocaleString();
            }
            /* Chi tiết thông báo: dùng chung window.showNotificationDetail từ ba-notification-detail.js (có jobId + GetRestoreResetInfo). */
            function hideNotificationDetailModal() { $('#notificationDetailModal').removeClass('show').css('display', ''); }
            function loadPanel() {
                var $list = $('#restoreJobsList'), $badge = $('#restoreJobsBadge');
                if (!$list.length) return;
                $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (!d || !d.jobs) { $list.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); $badge.removeClass('visible'); return; }
                        var jobs = (d.jobs || []).map(function(j) { j.type = j.type || 'Restore'; return j; }).filter(function(j) { return j.id != null && !isDismissed(j); }).sort(function(a,b) { var ta = a.startTime ? new Date(a.startTime).getTime() : 0; var tb = b.startTime ? new Date(b.startTime).getTime() : 0; return tb - ta; });
                        var newBugs = d.newBugs || [];
                        var totalCount = jobs.length + newBugs.length;
                        if (totalCount) $badge.text(totalCount).addClass('visible'); else $badge.removeClass('visible');
                        window.__notifJobsList = jobs;
                        var feedbackManageUrl = '<%= ResolveUrl("~/FeedbackManage") %>';
                        var notifBugsCollapsed = sessionStorage.getItem('ba_notif_bugs_collapsed') === '1';
                        var notifJobsCollapsed = sessionStorage.getItem('ba_notif_jobs_collapsed') === '1';
                        var html = '';
                        if (newBugs.length > 0) {
                            html += '<div class="ba-notif-group" data-group="bugs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="bugs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifBugsCollapsed ? '▶' : '▼') + '</span> 🐛 Bugs mới (' + newBugs.length + ')</div><div class="ba-notif-group-body" data-group="bugs" style="' + (notifBugsCollapsed ? 'display:none;' : '') + '">';
                            newBugs.forEach(function(b) { var created = (function(v){ if (v == null || v === '') return '—'; var s = String(v); var m = s.match(/\/Date\((\d+)\)\//); if (m) return new Date(parseInt(m[1],10)).toLocaleString(); var d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleString(); })(b.createdAt); var url = feedbackManageUrl + (b.id ? '?id=' + encodeURIComponent(b.id) : ''); html += '<div class="ba-notif-item ba-notif-bug" data-bug-id="' + (b.id || '') + '"><div style="font-weight:500;"><span class="ba-notif-type-badge ba-notif-type-bug">Bug</span> ' + (b.title || '').replace(/</g, '&lt;') + '</div><div style="color:var(--text-muted);margin-top:4px;font-size:0.8125rem;">' + (b.userName || '—').replace(/</g, '&lt;') + ' · ' + created + '</div><a class="ba-notif-detail-link" href="' + url + '" data-action="bug">Xem / Xử lý</a></div>'; });
                            html += '</div></div><div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">';
                        }
                        jobs.forEach(function(j, idx) {
                            var st = j.status || '', msg = (j.message || '').trim(), msgShort = msg.length > MSG_MAX ? msg.substring(0, MSG_MAX) + '…' : msg;
                            var pct = j.percentComplete != null ? j.percentComplete : 0;
                            var jobType = j.type || 'Restore';
                            var typeLabel = j.typeLabel || (jobType === 'Backup' ? 'Backup' : 'Restore');
                            var badgeClass = (jobType === 'Backup') ? 'ba-notif-type-backup' : (jobType === 'Restore') ? 'ba-notif-type-restore' : (jobType === 'HRHelperUpdateUser') ? 'ba-notif-type-hr-user' : (jobType === 'HRHelperUpdateEmployee' || jobType === 'HRHelperDeleteEmployee') ? 'ba-notif-type-hr-employee' : (jobType === 'HRHelperUpdateOther' || jobType === 'HRHelperMultiDbAnalyze' || jobType === 'HRHelperMultiDbReset') ? 'ba-notif-type-hr-other' : '';
                            var dbName = (j.databaseName || j.DatabaseName || '').trim();
                            var hasReset = jobType === 'Restore' && (j.withAutoReset === true || (j.withAutoReset == null && dbName.indexOf('_RESET') >= 0 && dbName.indexOf('_NO_RESET') < 0));
                            var resetTag = (jobType === 'Restore') ? ('<span class="ba-notif-type-badge ' + (hasReset ? 'ba-notif-reset-tag" title="Restore có tích hợp Reset thông tin">Có Reset' : 'ba-notif-no-reset-tag" title="Restore không reset">Không Reset') + '</span> ') : '';
                            var row = '<div class="ba-notif-item" data-notif-index="' + idx + '" data-job-id="' + (j.id || '') + '">';
                            row += '<button type="button" class="ba-notif-dismiss" title="Đánh dấu đã đọc">×</button>';
                            row += '<div style="font-weight:500;"><span class="ba-notif-type-badge ' + badgeClass + '">' + (typeLabel.replace(/</g, '&lt;')) + '</span> ' + resetTag + (j.serverName || '').replace(/</g, '&lt;') + ' → ' + (j.databaseName || '').replace(/</g, '&lt;') + '</div>';
                            row += '<div style="color:var(--text-muted);margin-top:4px;">' + (j.startedByUserName || '').replace(/</g, '&lt;') + ' · ' + fmtTime(j.startTime) + '</div>';
                            if (st === 'Running') row += '<div style="margin-top:6px;"><div style="background:var(--bg-darker);height:6px;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:var(--primary);"></div></div><span>' + pct + '%</span></div>';
                            else if (st === 'Failed') { row += '<div class="ba-notif-msg ba-notif-msg-error">' + msgShort.replace(/</g, '&lt;') + '</div>'; }
                            else if (st === 'Completed') row += '<div style="margin-top:4px;color:#10b981;">Đã xong</div>';
                            row += '<a class="ba-notif-detail-link" href="#">Xem chi tiết</a></div>';
                            html += row;
                        });
                        if (newBugs.length > 0) html += '</div></div>';
                        else if (jobs.length > 0) html = '<div class="ba-notif-group" data-group="jobs"><div class="ba-notif-section-title ba-notif-group-toggle" data-group="jobs" style="padding:8px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px;"><span class="ba-notif-group-arrow" style="transition:transform 0.2s;">' + (notifJobsCollapsed ? '▶' : '▼') + '</span> Thông báo job (' + jobs.length + ')</div><div class="ba-notif-group-body" data-group="jobs" style="' + (notifJobsCollapsed ? 'display:none;' : '') + '">' + html + '</div></div>';
                        $list.html(html || '<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>');
                        $list.off('click.baNotifGroup').on('click.baNotifGroup', '.ba-notif-group-toggle', function(e) { var g = $(this).data('group'); var $body = $list.find('.ba-notif-group-body[data-group="' + g + '"]'); var $arrow = $(this).find('.ba-notif-group-arrow'); if ($body.is(':visible')) { $body.slideUp(200); $arrow.text('▶'); sessionStorage.setItem('ba_notif_' + g + '_collapsed', '1'); } else { $body.slideDown(200); $arrow.text('▼'); sessionStorage.removeItem('ba_notif_' + g + '_collapsed'); } });
                        $list.off('click.nb').on('click.nb', '.ba-notif-detail-link', function(e) { if ($(this).attr('data-action') === 'bug') return; e.preventDefault(); var i = parseInt($(this).closest('.ba-notif-item').data('notif-index'), 10); if (window.__notifJobsList && window.__notifJobsList[i] && typeof window.showNotificationDetail === 'function') window.showNotificationDetail(window.__notifJobsList[i]); });
                        $list.off('click.dismiss').on('click.dismiss', '.ba-notif-dismiss', function(e) {
                            e.preventDefault(); e.stopPropagation();
                            var $item = $(this).closest('.ba-notif-item'), id = parseInt($item.data('job-id'), 10);
                            if (!id) return;
                            addDismissed(id);
                            var $listEl = $('#restoreJobsList'), $badgeEl = $('#restoreJobsBadge'); var newCount = Math.max(0, $listEl.find('.ba-notif-item').length - 1); if (newCount > 0) { $badgeEl.text(newCount).addClass('visible'); } else { $badgeEl.removeClass('visible'); }
                            $.ajax({ url: apiBase + '/DismissJob', type: 'POST', contentType: 'application/json', dataType: 'json', data: JSON.stringify({ jobId: id }) });
                            $item.slideUp(200, function() { $(this).remove(); var $listEl = $('#restoreJobsList'); var n = $listEl.find('.ba-notif-item').length; var $badgeEl = $('#restoreJobsBadge'); if (n > 0) { $badgeEl.text(n).addClass('visible'); var bugsCount = $listEl.find('.ba-notif-group-body[data-group="bugs"] .ba-notif-item').length; var jobsCount = $listEl.find('.ba-notif-group-body[data-group="jobs"] .ba-notif-item').length; $listEl.find('.ba-notif-group-toggle[data-group="bugs"]').html(function(i, h) { return (h || '').replace(/(🐛 )?Bugs mới \(\d+\)/, '🐛 Bugs mới (' + bugsCount + ')'); }); $listEl.find('.ba-notif-group-toggle[data-group="jobs"]').html(function(i, h) { return (h || '').replace(/Thông báo job \(\d+\)/, 'Thông báo job (' + jobsCount + ')'); }); } else { $badgeEl.removeClass('visible'); $listEl.html('<div style="padding:12px;color:var(--text-muted);">Không có thông báo.</div>'); } });
                        });
                    }
                });
            }
            $(function() {
                if (!$('#restoreJobsBellWrap').length) return;
                $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                    success: function(res) {
                        var d = res.d || res;
                        if (d && (d.jobs || d.newBugs)) {
                            var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); });
                            var newBugs = d.newBugs || [];
                            var total = jobs.length + newBugs.length;
                            if (total) { $('#restoreJobsBadge').text(total).addClass('visible'); } else { $('#restoreJobsBadge').removeClass('visible'); }
                        }
                    }
                });
                $('#restoreJobsBellBtn').on('click', function(e) {
                    e.stopPropagation();
                    var $p = $('#restoreJobsPanel');
                    if ($p.is(':visible')) { $p.hide(); } else { loadPanel(); $p.show(); }
                });
                $(document).on('click', function() { $('#restoreJobsPanel').hide(); });
                $('#restoreJobsPanel').on('click', function(e) { e.stopPropagation(); });
                $('#notificationDetailClose').on('click', function(e) { e.preventDefault(); e.stopPropagation(); hideNotificationDetailModal(); });
                $('#notificationDetailModal').on('click', function(e) { if (e.target === this) hideNotificationDetailModal(); });
                if (typeof BA_SignalR !== 'undefined') {
                    BA_SignalR.onRestoreJobsUpdated(function() {
                        $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                            success: function(res) {
                                var d = res.d || res;
                                if (d && (d.jobs || d.newBugs)) {
                                    var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); });
                                    var newBugs = d.newBugs || [];
                                    var total = jobs.length + newBugs.length;
                                    if (total) { $('#restoreJobsBadge').text(total).addClass('visible'); } else { $('#restoreJobsBadge').removeClass('visible'); }
                                }
                            }
                        });
                        if ($('#restoreJobsPanel').is(':visible')) loadPanel();
                    });
                    BA_SignalR.onBackupJobsUpdated(function() {
                        $.ajax({ url: apiBase + '/GetJobs', type: 'POST', contentType: 'application/json', dataType: 'json', data: '{}',
                            success: function(res) {
                                var d = res.d || res;
                                if (d && (d.jobs || d.newBugs)) {
                                    var jobs = (d.jobs || []).filter(function(j) { return j.id != null && !isDismissed(j); });
                                    var newBugs = d.newBugs || [];
                                    var total = jobs.length + newBugs.length;
                                    if (total) { $('#restoreJobsBadge').text(total).addClass('visible'); } else { $('#restoreJobsBadge').removeClass('visible'); }
                                }
                            }
                        });
                        if ($('#restoreJobsPanel').is(':visible')) loadPanel();
                    });
                    BA_SignalR.start('<%= ResolveUrl("~/signalr") %>', '<%= ResolveUrl("~/signalr/hubs") %>');
                }
            });
        })();
    </script>
</body>
</html>
