<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="NotificationBell.ascx.cs" Inherits="BADesign.NotificationBell" %>
<div id="restoreJobsBellWrap">
    <button type="button" id="restoreJobsBellBtn" class="ba-notif-bell-btn" title="Thông báo">🔔</button>
    <span id="restoreJobsBadge" class="ba-notif-badge">0</span>
    <div id="restoreJobsPanel" class="ba-notif-panel">
        <div class="ba-notif-panel-title">Thông báo</div>
        <div id="restoreJobsList" class="ba-notif-list"></div>
        <div class="ba-notif-panel-footer">
            <a href="<%= ResolveUrl("~/FunctionQueue") %>" class="ba-notif-queue-link" title="Xem tất cả job đang chạy và lịch sử">📋 Xem hàng đợi</a>
        </div>
    </div>
</div>
<div id="notificationDetailModal" class="ba-notif-detail-modal">
    <div class="ba-notif-detail-modal-content">
        <div class="ba-notif-detail-header">
            <span class="ba-notif-detail-title">Chi tiết thông báo</span>
            <button type="button" id="notificationDetailClose" class="ba-modal-close" title="Đóng">×</button>
        </div>
        <div id="notificationDetailBody" class="ba-notif-detail-body"></div>
    </div>
</div>
<div id="baRestoreDiagLargeModal" class="ba-notif-detail-modal ba-restore-diag-large-modal" aria-hidden="true">
    <div class="ba-notif-detail-modal-content ba-restore-diag-large-content">
        <div class="ba-notif-detail-header ba-restore-diag-large-header">
            <span class="ba-notif-detail-title">Giám sát SQL Server — cửa sổ lớn</span>
            <div class="ba-restore-diag-large-actions">
                <button type="button" class="ba-restore-diag-refresh-large" data-job-id="0" title="Tải lại từ SQL Server">Làm mới</button>
                <button type="button" id="baRestoreDiagLargeClose" class="ba-modal-close" title="Đóng">×</button>
            </div>
        </div>
        <div id="ba-restore-diag-large-body" class="ba-notif-detail-body ba-restore-diag-large-body"></div>
    </div>
</div>
<script type="text/javascript">window.BA_API_BASE = '<%= ResolveUrl("~/Pages/DatabaseSearch.aspx") %>'; window.BA_CAN_VIEW_RESTORE_DIAGNOSTICS = <%= CanViewRestoreDiagnostics ? "true" : "false" %>;</script>
<script src="<%= ResolveUrl("~/Scripts/ba-notification-detail.js") %>"></script>
<script src="<%= ResolveUrl("~/Scripts/ba-notification-jobs.js") %>"></script>
