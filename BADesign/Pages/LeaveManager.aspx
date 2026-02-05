<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="LeaveManager.aspx.cs"
    Inherits="BADesign.Pages.LeaveManager" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Quản lý nghỉ phép - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="https://unpkg.com/lunar-javascript@1.7.7/lunar.js"></script>
    <style>
        :root {
            --primary: #0078d4;
            --primary-hover: #006bb3;
            --primary-light: #0D9EFF;
            --primary-soft: rgba(0, 120, 212, 0.15);
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
            --warning: #f59e0b;
        }
        body.light-theme {
            --bg-main: #ffffff;
            --bg-darker: #f3f4f6;
            --bg-card: #ffffff;
            --bg-hover: #f3f4f6;
            --text-primary: #111827;
            --text-secondary: #4b5563;
            --text-muted: #6b7280;
            --border: #e5e7eb;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-main); color: var(--text-primary); line-height: 1.6; overflow-x: hidden; transition: background 0.3s, color 0.3s; }
        .ba-container { display: flex; min-height: 100vh; overflow: hidden; }
        .ba-sidebar {
            width: 240px; background: var(--bg-darker); border-right: 1px solid var(--border);
            padding: 1.5rem 0; flex-shrink: 0; position: fixed; left: 0; top: 0; bottom: 0; z-index: 1000; overflow-y: auto;
        }
        .ba-sidebar-header { padding: 0 1.5rem 1rem; border-bottom: 1px solid var(--border); }
        .ba-sidebar-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
        .ba-nav-item { display: block; padding: 0.75rem 1.5rem; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; }
        .ba-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ba-nav-item.active { background: var(--bg-hover); color: var(--primary-light); border-left: 3px solid var(--primary); }
        .ba-main { flex: 1; margin-left: 240px; display: flex; flex-direction: column; overflow: hidden; }
        .ba-top-bar {
            padding: 1rem 2rem; background: var(--bg-card); border-bottom: 1px solid var(--border);
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; flex-shrink: 0; position: sticky; top: 0; z-index: 100;
        }
        .ba-top-bar-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
        .ba-content { flex: 1; padding: 1.5rem 2rem; overflow-y: auto; overflow-x: hidden; }
        .ba-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .ba-card-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .ba-btn { padding: 0.5rem 1rem; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
        .ba-btn-primary { background: var(--primary); color: white; }
        .ba-btn-primary:hover { background: var(--primary-hover); }
        .ba-btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border); }
        .ba-btn-secondary:hover { background: var(--bg-card); }
        .ba-btn-danger { background: var(--danger); color: white; }
        .ba-btn-danger:hover { opacity: 0.9; }
        .ba-input { width: 100%; padding: 0.5rem 0.75rem; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 0.875rem; }
        .ba-input:focus { outline: none; border-color: var(--primary); }
        /* Today summary card - nổi bật */
        .lm-today-card {
            background: linear-gradient(135deg, var(--primary-soft) 0%, rgba(16, 185, 129, 0.1) 100%);
            border: 2px solid var(--primary);
            border-radius: 12px;
            padding: 1.5rem 2rem;
            margin-bottom: 2rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: start;
        }
        @media (max-width: 768px) { .lm-today-card { grid-template-columns: 1fr; } }
        .lm-today-title { font-size: 1.25rem; font-weight: 700; color: var(--primary-light); margin-bottom: 1rem; }
        .lm-today-nghỉ { }
        .lm-today-trực { }
        .lm-badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; margin-right: 0.35rem; margin-bottom: 0.35rem; }
        .lm-badge-nghỉ { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .lm-badge-trực { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .lm-empty { color: var(--text-muted); font-size: 0.9rem; }
        /* Calendar - style reference */
        .lm-cal-header {
            background: #16a34a; color: white; padding: 1rem 1.5rem; border-radius: 10px 10px 0 0;
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
        }
        .lm-cal-header-left { display: flex; align-items: center; gap: 0.75rem; }
        .lm-cal-header-title { font-size: 1.25rem; font-weight: 700; letter-spacing: 0.5px; }
        .lm-cal-nav-btn {
            width: 36px; height: 36px; border-radius: 50%; background: white; color: #16a34a; border: none;
            cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold;
            transition: background 0.2s, color 0.2s;
        }
        .lm-cal-nav-btn:hover { background: rgba(255,255,255,0.9); }
        .lm-cal-header-right { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .lm-cal-header-right select {
            padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.5);
            background: rgba(255,255,255,0.2); color: white; font-size: 0.875rem; cursor: pointer;
        }
        .lm-cal-header-right select option { background: #2d2d30; color: #fff; }
        body.light-theme .lm-cal-header-right select option { background: #fff; color: #111; }
        .lm-cal-btn-view {
            padding: 0.4rem 1rem; border-radius: 6px; background: white; color: #16a34a; border: none;
            font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s;
        }
        .lm-cal-btn-view:hover { background: rgba(255,255,255,0.95); }
        .lm-calendar-wrap { margin: 0; border: 1px solid var(--border); border-top: none; border-radius: 0 0 10px 10px; overflow: hidden; }
        .lm-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
        .lm-cal-day-name {
            padding: 0.75rem 0.5rem; text-align: center; font-size: 0.8rem; font-weight: 600;
            background: var(--bg-darker); color: var(--text-secondary); border-bottom: 1px solid var(--border);
        }
        .lm-cal-cell {
            min-height: 110px; padding: 0.5rem; background: var(--bg-card); border-right: 1px solid var(--border);
            border-bottom: 1px solid var(--border); font-size: 0.75rem; overflow: hidden;
        }
        .lm-cal-cell:nth-child(7n) { border-right: none; }
        .lm-cal-cell.other-month { background: var(--bg-darker); opacity: 0.6; }
        .lm-cal-cell.today { background: #fef3c7; }
        body .lm-cal-cell.today { color: #92400e; }
        body.light-theme .lm-cal-cell.today { background: #fef9c3; color: #854d0e; }
        .lm-cal-cell.sunday .lm-cal-date { color: #dc2626; }
        body.light-theme .lm-cal-cell.sunday .lm-cal-date { color: #b91c1c; }
        .lm-cal-date { font-weight: 700; font-size: 1.1rem; margin-bottom: 0.15rem; color: var(--text-primary); }
        .lm-cal-lunar { font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.25rem; }
        .lm-cal-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 0.25rem; vertical-align: middle; }
        .lm-cal-dot-nghỉ { background: #dc2626; }
        .lm-cal-dot-trực { background: #16a34a; }
        .lm-cal-nghỉ-count { background: #dc2626; color: white; border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.65rem; font-weight: 700; margin-bottom: 0.2rem; display: inline-block; }
        .lm-cal-nghỉ-names { font-size: 0.7rem; line-height: 1.35; }
        .lm-cal-nghỉ-names .lm-leave-chip { display: inline-block; margin-right: 0.25rem; margin-bottom: 0.15rem; padding: 0.05rem 0.35rem; border-radius: 3px; font-size: 0.65rem; }
        .lm-cal-nghỉ-names .lm-leave-chip.lm-type-al { background: #3b82f6; color: white; }
        .lm-cal-nghỉ-names .lm-leave-chip.lm-type-wfh { background: #8b5cf6; color: white; }
        .lm-cal-nghỉ-names .lm-leave-chip.lm-type-up { background: #64748b; color: white; }
        .lm-cal-trực-names { color: #16a34a; font-size: 0.7rem; line-height: 1.25; margin-top: 0.2rem; }
        .lm-cal-legend { margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .lm-cal-legend span { display: flex; align-items: center; gap: 0.35rem; }
        /* Members list */
        .lm-members-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .lm-member-row { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 1rem; background: var(--bg-darker); border-radius: 8px; border: 1px solid var(--border); }
        .lm-member-name { font-weight: 500; color: var(--text-primary); }
        .lm-member-actions { display: flex; gap: 0.35rem; }
        /* Add leave form */
        .lm-form-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1rem; }
        .lm-form-group { flex: 1; min-width: 140px; }
        .lm-form-group label { display: block; margin-bottom: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); }
        /* Theme toggle */
        .theme-switcher { padding: 0.375rem 0.75rem; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 0.875rem; }
        .theme-switcher:hover { background: var(--bg-hover); }
        .ba-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 900px) { .ba-grid-2 { grid-template-columns: 1fr; } }
        .lm-screenshot-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; }
        /* Collapse */
        .lm-collapse-card .lm-collapse-header {
            display: flex; align-items: center; justify-content: space-between; cursor: pointer;
            padding: 0.5rem 0; user-select: none;
        }
        .lm-collapse-card .lm-collapse-header:hover { opacity: 0.9; }
        .lm-collapse-card .lm-collapse-header .lm-collapse-icon { transition: transform 0.2s; font-size: 0.9rem; }
        .lm-collapse-card.collapsed .lm-collapse-icon { transform: rotate(-90deg); }
        .lm-collapse-card .lm-collapse-body { overflow: hidden; }
        .lm-collapse-card.collapsed .lm-collapse-body { display: none; }
        .lm-type-badge { font-size: 0.65rem; padding: 0.1rem 0.35rem; border-radius: 3px; margin-left: 0.2rem; }
        .lm-type-al { background: #3b82f6 !important; color: white !important; }
        .lm-type-wfh { background: #8b5cf6 !important; color: white !important; }
        .lm-type-up { background: #64748b !important; color: white !important; }
        /* Leaves list - compact table */
        .lm-leaves-table-wrap { max-height: 380px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; }
        .lm-leaves-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .lm-leaves-table th { padding: 0.5rem 0.75rem; text-align: left; background: var(--bg-darker); color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
        .lm-leaves-table td { padding: 0.4rem 0.75rem; border-bottom: 1px solid var(--border); color: var(--text-primary); }
        .lm-leaves-table tr:last-child td { border-bottom: none; }
        .lm-leaves-table tbody tr:hover { background: var(--bg-hover); }
        .lm-leaves-table .col-date { width: 85px; white-space: nowrap; }
        .lm-leaves-table .col-member { min-width: 100px; }
        .lm-leaves-table .col-type { width: 50px; }
        .lm-leaves-table .col-dur { width: 45px; text-align: center; }
        .lm-leaves-table .col-action { width: 50px; text-align: right; }
        .lm-leaves-group { }
        .lm-leaves-group-date { padding: 0.35rem 0.75rem; background: var(--bg-darker); font-weight: 600; font-size: 0.75rem; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
        .lm-leaves-group:first-child .lm-leaves-group-date { border-radius: 8px 8px 0 0; }
        .lm-leaves-empty { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ba-container">
            <aside class="ba-sidebar">
                <div class="ba-sidebar-header">
                    <div class="ba-sidebar-title">📅 Leave Manager</div>
                </div>
                <nav class="ba-nav">
                    <a href="<%= ResolveUrl("~/HomeRole") %>" class="ba-nav-item">← Về trang chủ</a>
                    <a href="#" class="ba-nav-item active">Quản lý nghỉ phép</a>
                </nav>
            </aside>
            <main class="ba-main">
                <div class="ba-top-bar">
                    <h1 class="ba-top-bar-title">Quản lý nghỉ phép</h1>
                    <button class="theme-switcher" id="themeSwitcher" type="button">🌙 Dark</button>
                </div>
                <div class="ba-content">
                    <!-- Today Summary -->
                    <div class="ba-card lm-today-card" id="todayCard">
                        <div>
                            <div class="lm-today-title">📆 Hôm nay (<span id="todayDateStr"></span>)</div>
                            <div><strong style="color: var(--text-secondary);">Nghỉ:</strong> <span id="todayNghỉCount" class="lm-badge lm-badge-nghỉ">0</span></div>
                            <div id="todayNghỉNames" class="lm-cal-nghỉ-names" style="margin-top: 0.5rem;"></div>
                            <p class="lm-empty" id="todayNghỉEmpty" style="display: none;">Không ai nghỉ</p>
                        </div>
                        <div>
                            <div><strong style="color: var(--text-secondary);">Trực (có mặt):</strong></div>
                            <div id="todayTrựcNames" class="lm-cal-trực-names" style="margin-top: 0.5rem;"></div>
                            <p class="lm-empty" id="todayTrựcEmpty" style="display: none;">—</p>
                            <p class="lm-screenshot-hint">💡 Chụp màn hình card này để gửi sếp</p>
                        </div>
                    </div>

                    <!-- Filter by member -->
                    <div class="ba-card" style="padding: 1rem 1.5rem; margin-bottom: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            <label style="font-size: 0.875rem; font-weight: 500;">Lọc theo thành viên:</label>
                            <select id="selFilterMember" class="ba-input" style="max-width: 220px;">
                                <option value="">Tất cả</option>
                            </select>
                            <span class="lm-filter-hint" id="filterHint" style="font-size: 0.8rem; color: var(--text-muted);"></span>
                        </div>
                    </div>

                    <!-- Members + Add Leave -->
                    <div class="ba-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div class="ba-card lm-collapse-card" id="cardMembers">
                            <div class="lm-collapse-header" data-target="cardMembers">
                                <h2 class="ba-card-title" style="margin: 0;">Thành viên team</h2>
                                <span class="lm-collapse-icon">▼</span>
                            </div>
                            <div class="lm-collapse-body">
                                <div class="lm-form-row" style="margin-top: 1rem;">
                                    <div class="lm-form-group" style="flex: 2;">
                                        <label>Tên</label>
                                        <input type="text" id="txtMemberName" class="ba-input" placeholder="Nhập tên thành viên" />
                                    </div>
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnAddMember">Thêm</button>
                                </div>
                                <div class="lm-members-list" id="membersList"></div>
                            </div>
                        </div>
                        <div class="ba-card lm-collapse-card" id="cardLeave">
                            <div class="lm-collapse-header" data-target="cardLeave">
                                <h2 class="ba-card-title" style="margin: 0;">Đăng ký nghỉ</h2>
                                <span class="lm-collapse-icon">▼</span>
                            </div>
                            <div class="lm-collapse-body">
                                <div class="lm-form-row" style="margin-top: 1rem;">
                                    <div class="lm-form-group">
                                        <label>Thành viên</label>
                                        <select id="selLeaveMember" class="ba-input"></select>
                                    </div>
                                    <div class="lm-form-group">
                                        <label>Ngày</label>
                                        <input type="date" id="txtLeaveDate" class="ba-input" />
                                    </div>
                                    <div class="lm-form-group">
                                        <label>Loại phép</label>
                                        <select id="selLeaveType" class="ba-input">
                                            <option value="AL">AL</option>
                                            <option value="WFH">WFH</option>
                                            <option value="UP">UP</option>
                                        </select>
                                    </div>
                                    <div class="lm-form-group">
                                        <label>Thời lượng</label>
                                        <select id="selLeaveDuration" class="ba-input">
                                            <option value="0.5">Nửa ngày</option>
                                            <option value="1" selected>Cả ngày</option>
                                        </select>
                                    </div>
                                    <button type="button" class="ba-btn ba-btn-primary" id="btnAddLeave">Thêm</button>
                                </div>
                                <div class="lm-leaves-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <label class="ba-checkbox" style="margin: 0; font-size: 0.8rem;"><input type="checkbox" id="chkLeavesSyncMonth" /> Chỉ tháng đang xem</label>
                                    <span id="leavesCount" class="lm-leaves-count" style="font-size: 0.75rem; color: var(--text-muted);"></span>
                                </div>
                                <div class="lm-leaves-table-wrap" id="leavesListWrap">
                                    <div id="leavesList"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Calendar -->
                    <div class="ba-card" style="padding: 0; overflow: hidden;">
                        <div class="lm-cal-header">
                            <div class="lm-cal-header-left">
                                <button type="button" class="lm-cal-nav-btn" id="btnPrevMonth" title="Tháng trước">‹</button>
                                <span class="lm-cal-header-title" id="calMonthTitle">THÁNG 02 - 2026</span>
                                <button type="button" class="lm-cal-nav-btn" id="btnNextMonth" title="Tháng sau">›</button>
                            </div>
                            <div class="lm-cal-header-right">
                                <select id="selMonth"></select>
                                <select id="selYear"></select>
                                <button type="button" class="lm-cal-btn-view" id="btnViewMonth">XEM</button>
                            </div>
                        </div>
                        <div class="lm-calendar-wrap">
                            <div class="lm-cal-grid" id="calGrid">
                                <div class="lm-cal-day-name">Thứ hai</div>
                                <div class="lm-cal-day-name">Thứ ba</div>
                                <div class="lm-cal-day-name">Thứ tư</div>
                                <div class="lm-cal-day-name">Thứ năm</div>
                                <div class="lm-cal-day-name">Thứ sáu</div>
                                <div class="lm-cal-day-name">Thứ bảy</div>
                                <div class="lm-cal-day-name">Chủ nhật</div>
                            </div>
                        </div>
                        <div style="padding: 1rem 1.5rem;">
                            <div class="lm-cal-legend">
                                <span><span class="lm-cal-dot lm-cal-dot-nghỉ"></span> Có người nghỉ</span>
                                <span><span class="lm-cal-dot lm-cal-dot-trực"></span> Trực (có mặt)</span>
                                <span><span class="lm-type-badge lm-type-al">AL</span> Nghỉ phép</span>
                                <span><span class="lm-type-badge lm-type-wfh">WFH</span> Làm từ xa</span>
                                <span><span class="lm-type-badge lm-type-up">UP</span> Nghỉ không lương</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </form>
    <script>
        (function () {
            var KEY_MEMBERS = 'LeaveManager_members';
            var KEY_LEAVES = 'LeaveManager_leaves';

            var members = [];
            var leaves = []; // [{ memberId, date, leaveType, duration }]
            var viewDate = new Date();
            var filterMemberId = '';
            var LEAVE_TYPES = { AL: 'AL', WFH: 'WFH', UP: 'UP' };
            var LEAVE_LABELS = { '0.5': '½', '1': '1' };

            function load() {
                try {
                    var m = localStorage.getItem(KEY_MEMBERS);
                    var l = localStorage.getItem(KEY_LEAVES);
                    members = m ? JSON.parse(m) : [];
                    leaves = l ? JSON.parse(l) : [];
                    leaves.forEach(function (x) {
                        if (!x.leaveType) x.leaveType = 'AL';
                        if (x.duration === undefined) x.duration = 1;
                    });
                } catch (e) { members = []; leaves = []; }
            }

            function save() {
                localStorage.setItem(KEY_MEMBERS, JSON.stringify(members));
                localStorage.setItem(KEY_LEAVES, JSON.stringify(leaves));
                render();
            }

            function render() {
                renderMembers();
                renderLeaveSelect();
                renderFilterSelect();
                renderLeavesList();
                renderMonthYearSelects();
                renderCalendar();
                renderToday();
            }

            function renderFilterSelect() {
                var sel = $('#selFilterMember');
                sel.empty().append($('<option value="">Tất cả</option>'));
                members.forEach(function (m) {
                    sel.append($('<option></option>').val(m.id).text(m.name));
                });
                if (filterMemberId && !members.some(function (m) { return m.id === filterMemberId; })) filterMemberId = '';
                sel.val(filterMemberId);
                if (filterMemberId) {
                    var n = (members.filter(function (m) { return m.id === filterMemberId; })[0] || {}).name || '?';
                    $('#filterHint').text('Đang xem lịch nghỉ của ' + n);
                } else {
                    $('#filterHint').text('');
                }
            }

            function renderMembers() {
                var ul = $('#membersList');
                ul.empty();
                if (!members.length) {
                    ul.html('<p class="lm-empty">Chưa có thành viên. Thêm ở trên.</p>');
                    return;
                }
                members.forEach(function (m) {
                    var tr = $('<div class="lm-member-row"></div>');
                    tr.append($('<span class="lm-member-name"></span>').text(m.name));
                    var actions = $('<div class="lm-member-actions"></div>');
                    actions.append($('<button class="ba-btn ba-btn-secondary" type="button">Sửa</button>').on('click', function () {
                        var n = prompt('Sửa tên:', m.name);
                        if (n != null && n.trim()) { m.name = n.trim(); save(); }
                    }));
                    actions.append($('<button class="ba-btn ba-btn-danger" type="button">Xóa</button>').on('click', function () {
                        if (confirm('Xóa ' + m.name + '? Lịch nghỉ sẽ bị xóa.')) {
                            members = members.filter(function (x) { return x.id !== m.id; });
                            leaves = leaves.filter(function (x) { return x.memberId !== m.id; });
                            save();
                        }
                    }));
                    tr.append(actions);
                    ul.append(tr);
                });
            }

            function renderLeaveSelect() {
                var sel = $('#selLeaveMember');
                sel.empty().append($('<option value="">-- Chọn --</option>'));
                members.forEach(function (m) {
                    sel.append($('<option></option>').val(m.id).text(m.name));
                });
            }

            function formatLeaveDisplay(l) {
                var name = (members.filter(function (m) { return m.id === l.memberId; })[0] || {}).name || '?';
                var typeCls = 'lm-type-' + (l.leaveType || 'AL').toLowerCase();
                var dur = l.duration === 0.5 ? '½' : '1';
                return { name: name, typeCls: typeCls, type: l.leaveType || 'AL', duration: dur };
            }
            function renderLeavesList() {
                var syncMonth = $('#chkLeavesSyncMonth').is(':checked');
                var m = viewDate.getMonth() + 1;
                var viewYm = viewDate.getFullYear() + '-' + (m < 10 ? '0' : '') + m;
                var items = leaves.map(function (l) {
                    var d = formatLeaveDisplay(l);
                    return { memberId: l.memberId, date: l.date, leaveType: l.leaveType, duration: l.duration, name: d.name, typeCls: d.typeCls, type: d.type, durationStr: d.duration };
                }).filter(function (it) {
                    if (filterMemberId && it.memberId !== filterMemberId) return false;
                    if (syncMonth && it.date.indexOf(viewYm) !== 0) return false;
                    return true;
                }).sort(function (a, b) { return a.date.localeCompare(b.date) || a.name.localeCompare(b.name); });

                $('#leavesCount').text(items.length + ' đăng ký');

                if (!items.length) {
                    $('#leavesList').html('<div class="lm-leaves-empty">' + (filterMemberId ? 'Thành viên này chưa có lịch nghỉ.' : 'Chưa có lịch nghỉ.') + (syncMonth ? ' (tháng ' + viewYm + ')' : '') + '</div>');
                    return;
                }

                var byDate = {};
                items.forEach(function (it) {
                    if (!byDate[it.date]) byDate[it.date] = [];
                    byDate[it.date].push(it);
                });
                var dates = Object.keys(byDate).sort();

                var html = '';
                var flatItems = [];
                dates.forEach(function (d) {
                    var rows = byDate[d];
                    var dFmt = d.split('-').reverse().join('/');
                    html += '<div class="lm-leaves-group"><div class="lm-leaves-group-date">' + dFmt + ' (' + rows.length + ')</div><table class="lm-leaves-table"><tbody>';
                    rows.forEach(function (it) {
                        flatItems.push(it);
                        html += '<tr data-idx="' + (flatItems.length - 1) + '"><td class="col-member">' + it.name + '</td><td class="col-type"><span class="lm-type-badge ' + it.typeCls + '">' + it.type + '</span></td><td class="col-dur">' + it.durationStr + 'd</td><td class="col-action"><button type="button" class="ba-btn ba-btn-danger lm-btn-del" style="padding:0.15rem 0.4rem;font-size:0.7rem;">Xóa</button></td></tr>';
                    });
                    html += '</tbody></table></div>';
                });

                var $list = $('#leavesList').html(html);
                $list.find('.lm-btn-del').on('click', function () {
                    var idx = parseInt($(this).closest('tr').data('idx'), 10);
                    var it = flatItems[idx];
                    if (!it) return;
                    leaves = leaves.filter(function (l) { return !(l.memberId === it.memberId && l.date === it.date); });
                    save();
                });
            }

            function getLeavesByDate(dateStr) {
                return leaves.filter(function (l) { return l.date === dateStr; });
            }

            function getOnDuty(dateStr) {
                var offIds = getLeavesByDate(dateStr).map(function (l) { return l.memberId; });
                return members.filter(function (m) { return offIds.indexOf(m.id) < 0; });
            }

            function formatDate(d) {
                var y = d.getFullYear(), m = (d.getMonth() + 1), day = d.getDate();
                return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
            }

            function getLunarDateStr(d) {
                try {
                    if (typeof Solar === 'undefined') return '';
                    var solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
                    var lunar = solar.getLunar();
                    var ld = lunar.getDay(), lm = lunar.getMonth();
                    if (ld === 1) return '1/' + lm;
                    return '' + ld;
                } catch (e) { return ''; }
            }

            function renderToday() {
                var today = formatDate(new Date());
                $('#todayDateStr').text(today);
                var off = getLeavesByDate(today);
                var onDuty = getOnDuty(today);
                if (filterMemberId) {
                    off = off.filter(function (l) { return l.memberId === filterMemberId; });
                    onDuty = onDuty.filter(function (m) { return m.id === filterMemberId; });
                }
                $('#todayNghỉCount').text(off.length);
                if (off.length) {
                    $('#todayNghỉEmpty').hide();
                    $('#todayNghỉNames').html(off.map(function (l) {
                        var d = formatLeaveDisplay(l);
                        return '<span class="lm-badge lm-type-badge ' + d.typeCls + '" style="margin-right:0.35rem;margin-bottom:0.35rem;">' + d.name + ' ' + d.type + ' ' + d.duration + 'd</span>';
                    }).join(''));
                } else {
                    $('#todayNghỉNames').empty();
                    $('#todayNghỉEmpty').show();
                }
                if (onDuty.length) {
                    $('#todayTrựcEmpty').hide();
                    $('#todayTrựcNames').html(onDuty.map(function (m) {
                        return '<span class="lm-badge lm-badge-trực">' + m.name + '</span>';
                    }).join(''));
                } else {
                    $('#todayTrựcNames').empty();
                    $('#todayTrựcEmpty').show();
                }
            }

            function renderCalendar() {
                var y = viewDate.getFullYear(), m = viewDate.getMonth();
                var monthNames = ['Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04', 'Tháng 05', 'Tháng 06', 'Tháng 07', 'Tháng 08', 'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
                $('#calMonthTitle').text(monthNames[m] + ' - ' + y);

                var first = new Date(y, m, 1);
                var last = new Date(y, m + 1, 0);
                var start = new Date(first);
                var dayOfWeek = start.getDay();
                var offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                start.setDate(start.getDate() + offset);
                var end = new Date(last);
                var endDow = end.getDay();
                var endOffset = endDow === 0 ? 0 : 7 - endDow;
                end.setDate(end.getDate() + endOffset);

                var cells = [];
                var d = new Date(start);
                var today = formatDate(new Date());
                while (d <= end) {
                    var ds = formatDate(d);
                    var isOther = d.getMonth() !== m;
                    var isToday = ds === today;
                    var isSunday = d.getDay() === 0;
                    var offList = getLeavesByDate(ds);
                    var onDuty = getOnDuty(ds);
                    if (filterMemberId) {
                        offList = offList.filter(function (l) { return l.memberId === filterMemberId; });
                        onDuty = onDuty.filter(function (m) { return m.id === filterMemberId; });
                    }
                    var namesOffHtml = offList.map(function (l) {
                        var d = formatLeaveDisplay(l);
                        return '<span class="lm-leave-chip ' + d.typeCls + '">' + d.name + ' [' + d.type + d.duration + 'd]</span>';
                    }).join('');
                    var namesOn = onDuty.map(function (x) { return x.name; }).join(', ');
                    var cls = 'lm-cal-cell' + (isOther ? ' other-month' : '') + (isToday ? ' today' : '') + (isSunday ? ' sunday' : '');
                    var dayNum = (d.getDate() < 10 ? '0' : '') + d.getDate();
                    var lunarStr = getLunarDateStr(d);
                    var html = '<div class="' + cls + '">';
                    html += '<div class="lm-cal-date">' + dayNum + '</div>';
                    if (lunarStr) html += '<div class="lm-cal-lunar">' + lunarStr + '</div>';
                    if (offList.length) html += '<div class="lm-cal-nghỉ-count">' + offList.length + ' nghỉ</div><div class="lm-cal-nghỉ-names">' + namesOffHtml + '</div>';
                    if (namesOn) html += '<div class="lm-cal-trực-names">' + namesOn + '</div>';
                    html += '</div>';
                    cells.push(html);
                    d.setDate(d.getDate() + 1);
                }
                var $grid = $('#calGrid');
                $grid.children().slice(7).remove();
                $grid.append(cells.join(''));
            }

            function renderMonthYearSelects() {
                var m = viewDate.getMonth(), y = viewDate.getFullYear();
                var selM = $('#selMonth'), selY = $('#selYear');
                selM.empty();
                for (var i = 0; i < 12; i++) {
                    var opt = $('<option></option>').val(i).text('Tháng ' + (i + 1));
                    if (i === m) opt.prop('selected', true);
                    selM.append(opt);
                }
                selY.empty();
                for (var i = y - 2; i <= y + 2; i++) {
                    var opt = $('<option></option>').val(i).text(i);
                    if (i === y) opt.prop('selected', true);
                    selY.append(opt);
                }
            }

            $('#chkLeavesSyncMonth').on('change', function () { renderLeavesList(); });

            $('#selFilterMember').on('change', function () {
                filterMemberId = $(this).val() || '';
                render();
            });

            $('.lm-collapse-header').on('click', function () {
                var id = $(this).data('target');
                $('#' + id).toggleClass('collapsed');
            });

            $('#btnAddMember').on('click', function () {
                var n = $('#txtMemberName').val().trim();
                if (!n) return;
                var id = 'm' + Date.now();
                members.push({ id: id, name: n });
                $('#txtMemberName').val('');
                save();
            });

            $('#btnAddLeave').on('click', function () {
                var mid = $('#selLeaveMember').val();
                var date = $('#txtLeaveDate').val();
                var leaveType = $('#selLeaveType').val() || 'AL';
                var duration = parseFloat($('#selLeaveDuration').val()) || 1;
                if (!mid || !date) return;
                leaves = leaves.filter(function (l) { return !(l.memberId === mid && l.date === date); });
                leaves.push({ memberId: mid, date: date, leaveType: leaveType, duration: duration });
                save();
            });

            $('#btnPrevMonth').on('click', function () {
                viewDate.setMonth(viewDate.getMonth() - 1);
                render();
            });
            $('#btnNextMonth').on('click', function () {
                viewDate.setMonth(viewDate.getMonth() + 1);
                render();
            });
            $('#btnViewMonth').on('click', function () {
                var m = parseInt($('#selMonth').val(), 10);
                var y = parseInt($('#selYear').val(), 10);
                viewDate.setFullYear(y);
                viewDate.setMonth(m);
                render();
            });

            $('#themeSwitcher').on('click', function () {
                document.body.classList.toggle('light-theme');
                var isLight = document.body.classList.contains('light-theme');
                $(this).html(isLight ? '☀️ Light' : '🌙 Dark');
            });

            load();
            render();
            var t = $('#txtLeaveDate');
            if (!t.val()) t.val(formatDate(new Date()));
        })();
    </script>
</body>
</html>
