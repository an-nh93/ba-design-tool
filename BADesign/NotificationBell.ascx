<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="NotificationBell.ascx.cs" Inherits="BADesign.NotificationBell" %>
<div id="restoreJobsBellWrap">
    <button type="button" id="restoreJobsBellBtn" class="ba-notif-bell-btn" title="Thông báo">🔔</button>
    <span id="restoreJobsBadge" class="ba-notif-badge">0</span>
    <div id="restoreJobsPanel" class="ba-notif-panel">
        <div class="ba-notif-panel-title">Thông báo</div>
        <div id="restoreJobsList" class="ba-notif-list"></div>
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
