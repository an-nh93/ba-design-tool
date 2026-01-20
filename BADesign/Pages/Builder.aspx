<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Builder.aspx.cs" Inherits="BADesign.Builder" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>UI Builder Demo - For BA</title>

    <script src="../Scripts/html2canvas.min.js"></script>

    <!-- DevExtreme CDN -->
    <link rel="stylesheet" href="https://cdn3.devexpress.com/jslib/23.2.5/css/dx.light.css" />

    <!-- Custom builder CSS -->
    <link rel="stylesheet" href="../Content/builder.css" />
    <link rel="stylesheet" href="../Content/builder-ess.css" />
    <link rel="stylesheet" href="../Content/builder-core.css" />
    <link rel="stylesheet" href="../Content/style.css" />

    <link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">

    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

    <!-- DevExtreme -->
    <script src="https://cdn3.devexpress.com/jslib/23.2.5/js/dx.all.js"></script>


    <!-- Drag-drop library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/interact.js/1.10.11/interact.min.js"></script>

    <!-- Builder scripts -->
    <script src="../Scripts/builder/builder.js"></script>
    <script src="../Scripts/builder/common.js"></script>
    <script src="../Scripts/builder/control-grid.js"></script>
    <script src="../Scripts/builder/control-popup.js"></script>
    <script src="../Scripts/builder/control-field.js"></script>
    <script src="../Scripts/builder/control-toolbar.js"></script>
    <script src="../Scripts/builder/control-tabpage.js"></script>
    <script src="../Scripts/builder/control-grid-ess.js"></script>
    <style>
/* ========== GLOBAL ========== */
body {
    margin: 0;
    padding-bottom: 56px; /* tránh footer che nội dung */
    font-family: Segoe UI, Tahoma, Arial, sans-serif;
}

/* ========== HEADER ========== */
.builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
}
.bh-title { font-size: 20px; margin: 0; }
.bh-sub   { font-size: 13px; color: #666; }
.bh-name  { margin-left: 8px; font-weight: 600; }
.bh-user  { font-size: 13px; }

/* ========== MAIN LAYOUT ========== */
/* 3 cột: Toolbox – Center – Properties */
.builder-wrapper {
    display: flex;
    gap: 0;
    /* trừ header (~50px) + footer (~50px) */
    height: calc(100vh - 100px);
}

/* Toolbox - fixed width với toggle */
.builder-wrapper > .toolbox {
    width: 220px;
    flex-shrink: 0;
    position: relative;
    transition: width 0.3s;
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;
}
.builder-wrapper.toolbox-collapsed > .toolbox {
    width: 26px;
    overflow: hidden;
}
.builder-wrapper.toolbox-collapsed > .toolbox > *:not(.toolbox-toggle) {
    display: none;
}

/* Toolbox toggle button - Sticky để scroll theo */
.toolbox-toggle {
    position: absolute; /* Đổi sang absolute để không chiếm không gian trong flow */
    top: calc(50vh - 40px); /* Giữ ở giữa viewport */
    right: -13px;
    width: 26px;
    height: 80px;
    background: linear-gradient(180deg, #f8f8f8 0%, #f0f0f0 100%);
    border: 1px solid #ddd;
    border-left: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border-radius: 0 6px 6px 0;
    transition: all 0.2s;
    box-shadow: 2px 0 4px rgba(0,0,0,0.05);
    /* Bỏ float và margin để không tạo khoảng trống */
}
.toolbox-toggle:hover {
    background: linear-gradient(180deg, #0078d4 0%, #005a9e 100%);
    border-color: #0078d4;
    box-shadow: 2px 0 6px rgba(0,120,212,0.3);
}
.toolbox-toggle:hover::before {
    color: #fff;
}
.toolbox-toggle::before {
    content: '◀';
    font-size: 14px;
    color: #666;
    transition: all 0.2s;
    font-weight: bold;
}
.builder-wrapper.toolbox-collapsed .toolbox-toggle {
    right: 0;
    border-radius: 0;
    border-left: 1px solid #ddd;
}
.builder-wrapper.toolbox-collapsed .toolbox-toggle::before {
    content: '▶';
    color: #0078d4;
}
.builder-wrapper.toolbox-collapsed .toolbox-toggle:hover::before {
    color: #fff;
}

/* Center pane - flexible */
.builder-wrapper > .center-pane {
    flex: 1 1 auto;
    min-width: 0;
    position: relative;
}

/* Properties panel - resizable width */
.builder-wrapper > .prop-shell {
    width: 320px;
    flex-shrink: 0;
    position: relative;
}

/* Khi gập Properties: cột phải còn ~26px (thanh dọc) */
.builder-wrapper.props-collapsed > .prop-shell {
    width: 26px;
}
.builder-wrapper.props-collapsed > .prop-shell > .prop-main {
    display: none;
}
.builder-wrapper.props-collapsed > .prop-splitter {
    display: none;
}
.builder-wrapper.resizing-props {
    user-select: none;
}
.builder-wrapper.resizing-props * {
    cursor: col-resize !important;
}

/* Splitter giữa center và properties */
.prop-splitter {
    width: 4px;
    background: #ddd;
    cursor: col-resize;
    flex-shrink: 0;
    position: relative;
    z-index: 100;
    transition: background 0.2s;
    user-select: none;
}
.prop-splitter:hover {
    background: #0078d4;
}
.prop-splitter::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 0;
    bottom: 0;
    width: 8px;
    background: transparent;
    cursor: col-resize;
}
.prop-splitter.resizing {
    background: #0078d4;
}
.prop-splitter.resizing::before {
    background: rgba(0, 120, 212, 0.1);
}

/* Toolbox */
.toolbox {
    border-right: 1px solid #ddd;
    padding: 10px;
    padding-top: 10px; /* Đảm bảo padding-top nhất quán */
    background: #fafafa;

    /* NEW: scroll dọc */
    overflow-y: auto;
    height: 100%;
    box-sizing: border-box;
    position: relative; /* Để toolbox-toggle có thể position absolute */
}

/* Group trong toolbox */
.tool-group {
    margin-bottom: 8px;
    margin-left: 0 !important; /* Đảm bảo tất cả groups không bị thụt vào */
    padding-left: 0 !important;
    clear: both; /* Clear float từ toolbox-toggle */
    width: 100%; /* Đảm bảo chiếm full width */
    box-sizing: border-box;
}
/* Đảm bảo group đầu tiên không bị ảnh hưởng bởi float */
.tool-group:first-of-type {
    margin-left: 0 !important;
    padding-left: 0 !important;
    margin-top: 0 !important; /* Loại bỏ khoảng trống ở trên */
    clear: both;
}

/* Header của group (Controls, Core controls, ESS controls...) */
.tool-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    padding: 4px 2px 4px 5px !important; /* Đảm bảo padding-left nhất quán cho tất cả groups */
    cursor: pointer;
    user-select: none;
    background: linear-gradient(34deg, rgba(10, 117, 186, 1) 0%, rgba(18, 140, 223, 1) 100%);
    color: white;
    margin-left: 0 !important; /* Đảm bảo không có margin trái */
    position: relative; /* Đảm bảo không bị ảnh hưởng bởi float */
}

/* Nút chevron bên phải */
.tool-group-header .tgh-btn {
    border: none;
    background: transparent;
    padding: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
}

.tool-group-header .tgh-btn i {
    font-size: 14px;
    transition: transform .15s;
    color:white;
}

/* Body chứa các .tool-item */
.tool-group-body {
    margin-top: 4px;
}

/* Khi group bị thu gọn */
.tool-group-collapsed .tool-group-body {
    display: none;
}

/* Xoay icon khi thu gọn */
.tool-group-collapsed .tool-group-header .tgh-btn i {
    transform: rotate(180deg);
}

.tool-item {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 6px;
    cursor: grab;
    background: #fff;
    transition: background .15s, border-color .15s, box-shadow .15s, transform .1s;
}
.tool-item:hover {
    border-color: #0078d7;
    box-shadow: 0 0 0 1px rgba(0,120,215,.4);
}
.tool-item.tool-dragging {
    border-color: #0078d7;
    box-shadow: 0 0 4px rgba(0,120,215,.7);
    background: #e6f3ff;
    opacity: 0.9;
    cursor: grabbing;
}

/* Center pane (canvas + JSON) */
.center-pane {
    display: flex;
    flex-direction: column;
    border-right: 1px solid #ddd;
}

/* Canvas shell chiếm phần trên */
.canvas-shell {
    position: relative;
    flex: 1 1 auto;
    background: #ffffff;
    overflow: hidden;
}

/* Canvas thật (id="canvas") */
.canvas-area {
    position: absolute;
    left: 20px;
    top: 20px;
    right: 0;
    bottom: 0;
    padding: 8px;
    overflow: auto;
    background: #ffffff;
}

/* Rulers */
.canvas-ruler-h,
.canvas-ruler-v {
    position: absolute;
    background: #f3f3f3;
    border-color: #d4d4d4;
    z-index: 200;
    font-size: 10px;
    color: #666;
    font-family: Consolas, monospace;
    pointer-events: none;
}
.canvas-ruler-h {
    left: 20px;
    right: 0;
    top: 0;
    height: 20px;
    border-bottom: 1px solid #d4d4d4;
    background-image: linear-gradient(to right, #d4d4d4 1px, transparent 1px);
    background-size: 10px 100%;
}
.canvas-ruler-v {
    left: 0;
    top: 20px;
    bottom: 0;
    width: 20px;
    border-right: 1px solid #d4d4d4;
    background-image: linear-gradient(to bottom, #d4d4d4 1px, transparent 1px);
    background-size: 100% 10px;
}

/* Không cho select text trên canvas */
#canvas,
#canvas * {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
}

/* JSON panel dưới */
.json-preview {
    flex: 0 0 220px;
    border-top: 1px solid #ddd;
    background: #fafafa;
    display: flex;
    flex-direction: column;
}
.json-toggle {
    height: 22px;
    display: flex;
    align-items: center;
    padding: 0 6px;
    font-size: 12px;
    background: #eaeaea;
    border-bottom: 1px solid #ddd;
    cursor: pointer;
    user-select: none;
}
.json-toggle:hover { background: #ddd; }
.json-toggle .jt-label { margin-right: 4px; }
.json-body { padding: 6px 8px; }
.json-body h3 {
    font-size: 13px;
    margin: 0 0 4px 0;
}
.json-body textarea {
    width: 100%;
    height: 180px;
    resize: vertical;
    font-family: Consolas, monospace;
    font-size: 11px;
}
.center-pane.json-collapsed .json-preview { flex: 0 0 22px; }
.center-pane.json-collapsed .json-body { display: none; }
.center-pane.json-collapsed .json-toggle .jt-icon { transform: rotate(-90deg); }

/* ========== RIGHT PANEL (Properties + Layers) ========== */
.prop-shell {
    display: flex;
    height: 100%;
}

/* cũ, không dùng nữa – ẩn luôn */
.properties-panel { display: none; }

/* Panel mới */
.prop-toggle {
    width: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    background: linear-gradient(180deg, #f8f8f8 0%, #f0f0f0 100%);
    cursor: pointer;
    font-size: 12px;
    user-select: none;
    transition: all 0.2s;
    position: relative;
}
.prop-toggle:hover { 
    background: linear-gradient(180deg, #0078d4 0%, #005a9e 100%);
    color: #fff;
}
.prop-toggle .pt-text {
    transition: color 0.2s;
}
.prop-toggle:hover .pt-text {
    color: #fff;
}

.prop-main {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    background: #fcfcfc;
    min-height: 0; /* Cho phép flex child shrink */
}
.prop-tabs {
    display: flex;
    gap: 4px;
    margin: 10px 10px 6px 10px;
    flex-shrink: 0;
}
.prop-tab {
    flex: 1 1 0;
    padding: 6px 8px;
    font-size: 12px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}
.prop-tab:hover {
    background: #e8e8e8;
}
.prop-tab-active {
    background: #ffffff;
    border-bottom-color: #ffffff;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.prop-tab-body {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden; /* Chỉ scroll dọc, scroll ngang ở wrapper level */
    border: 1px solid #ccc;
    border-radius: 4px;
    margin: 0 10px 10px 10px;
    padding: 10px;
    background: #fcfcfc;
    min-height: 0; /* Quan trọng: cho phép scroll */
    max-height: calc(100vh - 200px);
    min-width: 0;
    width: calc(100% - 20px);
    box-sizing: border-box;
    color: #000; /* Text màu đen */
    position: relative; /* Cho loading overlay */
}
.prop-tab-body:not(.prop-body-active) { display: none; }
/* ========== POPUP BODY - Position relative để grid absolute bên trong ========== */
.popup-body {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible; /* Cho phép grid overflow nếu cần */
}

.prop-tab-body label,
.prop-tab-body span,
.prop-tab-body input,
.prop-tab-body select,
.prop-tab-body textarea {
    color: #000;
}

/* Scrollbar styling cho Properties panel */
.prop-tab-body::-webkit-scrollbar {
    width: 8px;
}
.prop-tab-body::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}
.prop-tab-body::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
}
.prop-tab-body::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* Collapsible sections cho Properties panel */
.prop-section {
    margin-bottom: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #ffffff;
    overflow: hidden;
}
.prop-section-header {
    padding: 8px 10px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    font-size: 13px;
    color: #333;
    transition: background 0.2s;
}
.prop-section-header:hover {
    background: #ebebeb;
}
.prop-section-header .prop-section-toggle {
    font-size: 10px;
    color: #666;
    transition: transform 0.2s;
}
.prop-section.collapsed .prop-section-toggle {
    transform: rotate(-90deg);
}
.prop-section-content {
    padding: 10px;
    display: block;
}
.prop-section.collapsed .prop-section-content {
    display: none;
}
.prop-section label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: #000;
    font-weight: normal;
}
.prop-section input[type="text"],
.prop-section input[type="number"],
.prop-section select,
.prop-section textarea {
    width: 100%;
    padding: 4px 6px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 12px;
    box-sizing: border-box;
    margin-bottom: 8px;
}
.prop-section .mt-1 {
    margin-top: 8px;
}
.prop-section .mt-1 label {
    display: inline;
    margin-right: 12px;
    font-weight: normal;
}
/* General tab styling */
.ess-prop-tab-content[data-tab-content="general"] {
    padding: 12px;
}
.ess-prop-tab-content[data-tab-content="general"] .mt-1 {
    margin-top: 12px; /* Tăng spacing giữa các dòng */
    margin-bottom: 4px;
    padding: 8px;
    background: #fafafa;
    border-radius: 4px;
    border: 1px solid #f0f0f0;
    transition: all 0.2s;
}
.ess-prop-tab-content[data-tab-content="general"] .mt-1:hover {
    background: #f5f5f5;
    border-color: #e0e0e0;
}
.ess-prop-tab-content[data-tab-content="general"] label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #333;
    font-weight: normal;
    cursor: pointer;
}
.ess-prop-tab-content[data-tab-content="general"] input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    margin: 0;
}
.ess-prop-tab-content[data-tab-content="general"] input[type="text"],
.ess-prop-tab-content[data-tab-content="general"] input[type="number"] {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 4px;
    box-sizing: border-box;
    transition: all 0.2s;
}
.ess-prop-tab-content[data-tab-content="general"] input[type="text"]:focus,
.ess-prop-tab-content[data-tab-content="general"] input[type="number"]:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0,120,212,0.1);
}
.ess-prop-tab-content[data-tab-content="general"] h4 {
    margin: 16px 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: #0078d4;
    padding-bottom: 6px;
    border-bottom: 2px solid #e0e0e0;
}
.ess-prop-tab-content[data-tab-content="general"] hr {
    margin: 16px 0;
    border: none;
    border-top: 2px solid #e0e0e0;
}
/* Styling cho bảng trong Properties panel */
.prop-section table {
    width: 100%;
    font-size: 12px;
    margin-top: 8px;
    border-collapse: collapse;
    table-layout: auto;
}
.prop-section table th,
.prop-section table td {
    padding: 6px 4px;
    border: 1px solid #ddd;
    vertical-align: middle;
    white-space: nowrap;
}
.prop-section table th {
    background: #f0f4f8;
    font-weight: 600;
    color: #333;
    font-size: 11px;
    text-align: left;
    position: sticky;
    top: 0;
    z-index: 10;
}
.prop-section table tbody tr:hover {
    background: #f8f9fa;
}
.prop-section table input[type="text"],
.prop-section table input[type="number"],
.prop-section table select {
    width: 100%;
    min-width: 60px;
    padding: 4px 6px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 11px;
    box-sizing: border-box;
    background-color: #fff;
}
.prop-section table input[type="text"]:focus,
.prop-section table input[type="number"]:focus,
.prop-section table select:focus {
    outline: 2px solid #0078d4;
    outline-offset: -1px;
    border-color: #0078d4;
}
.prop-section table select {
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 6px center;
    padding-right: 24px;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
}

/* Type dropdown với icon và màu sắc */
.prop-section table select[data-col-prop="type"] {
    font-weight: 500;
}
.prop-section table select[data-col-prop="type"] option[value="text"] {
    background: #e3f2fd;
}
.prop-section table select[data-col-prop="type"] option[value="textarea"] {
    background: #fff3e0;
}
.prop-section table select[data-col-prop="type"] option[value="number"] {
    background: #f3e5f5;
}
.prop-section table select[data-col-prop="type"] option[value="date"] {
    background: #e8f5e9;
}
.prop-section table select[data-col-prop="type"] option[value="combo"] {
    background: #fff9c4;
}
.prop-section table select[data-col-prop="type"] option[value="tag"] {
    background: #fce4ec;
}
.prop-section table select[data-col-prop="type"] option[value="progress"] {
    background: #e0f2f1;
}

/* Icon buttons cho edit/delete */
.prop-section table .btn-link {
    padding: 2px 6px;
    font-size: 14px;
    line-height: 1;
    border: none;
    background: transparent;
    cursor: pointer;
    text-decoration: none;
    border-radius: 3px;
    transition: all 0.2s;
}
.prop-section table .btn-link:hover {
    background: #f0f0f0;
    transform: scale(1.1);
}
.prop-section table .btn-link.text-danger {
    color: #dc3545 !important;
}
.prop-section table .btn-link.text-danger:hover {
    background: #fee;
    color: #c82333 !important;
}

/* ESS Grid specific table styling */
.ess-grid-actions-table,
.ess-grid-cols-table {
    width: 100%;
    border-collapse: collapse;
}
.ess-grid-actions-table {
    min-width: 510px;
}
.ess-grid-cols-table {
    min-width: 750px;
}

/* Wrapper cho table scroll */
.prop-section-content > div[style*="overflow-x"] {
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    background: #fafafa;
    padding: 2px;
}

/* ========== ESS Grid Properties - Tabbed Interface ========== */
/* Loading overlay khi change type */
.ess-props-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
}
.ess-props-loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #0078d4;
    border-radius: 50%;
    animation: ess-props-spin 0.6s linear infinite;
}
@keyframes ess-props-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.ess-grid-props-header {
    margin-bottom: 12px;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 8px;
}
.ess-grid-props-tabs {
    display: flex;
    gap: 4px;
    margin-top: 8px;
}
.ess-prop-tab {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #ddd;
    background: #f5f5f5;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    font-size: 11px;
    text-align: center;
    transition: all 0.2s;
    border-bottom: none;
}
.ess-prop-tab:hover {
    background: #ebebeb;
}
.ess-prop-tab-active {
    background: #fff;
    border-color: #0078d4;
    border-bottom-color: #fff;
    color: #0078d4;
    font-weight: 600;
    position: relative;
    margin-bottom: -2px;
}
.ess-prop-tab-content {
    display: none;
    width: 100%;
    overflow-x: hidden; /* Không scroll ngang ở level này */
    overflow-y: visible; /* Để các list con tự scroll */
    min-width: 0;
    color: #000; /* Text màu đen cho General tab */
    position: relative; /* Cho loading overlay */
}
.ess-prop-tab-content.ess-prop-tab-active {
    display: block;
}
/* Bỏ font-weight bold cho General tab */
.ess-prop-tab-content[data-tab-content="general"] label,
.ess-prop-tab-content[data-tab-content="general"] span:not(.ess-col-number):not(.ess-action-number) {
    font-weight: normal !important;
}
.ess-prop-tab-content label,
.ess-prop-tab-content span,
.ess-prop-tab-content input[type="text"],
.ess-prop-tab-content input[type="number"],
.ess-prop-tab-content textarea,
.ess-prop-tab-content select {
    color: #000;
}
/* Option text trong select phải màu đen, không phải xanh */
.ess-prop-tab-content select option,
.ess-col-input option,
.ess-action-input option {
    color: #000 !important;
    background: #fff;
}
.ess-prop-tab-content .mt-1 {
    color: #000;
}
.ess-prop-tab-content .mt-1 label {
    color: #000;
}

/* ========== Columns Card View ========== */
/* Wrapper cho scroll ngang */
.ess-columns-list-wrapper,
.ess-actions-list-wrapper {
    overflow-x: auto !important;
    overflow-y: hidden;
    width: 100%;
    padding-bottom: 4px;
    margin-bottom: 8px;
    min-width: 0; /* Cho phép shrink */
    max-width: 100%;
}
.ess-columns-list-wrapper::-webkit-scrollbar,
.ess-actions-list-wrapper::-webkit-scrollbar {
    height: 6px;
}
.ess-columns-list-wrapper::-webkit-scrollbar-track,
.ess-actions-list-wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}
.ess-columns-list-wrapper::-webkit-scrollbar-thumb,
.ess-actions-list-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}
.ess-columns-list-wrapper::-webkit-scrollbar-thumb:hover,
.ess-actions-list-wrapper::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

.ess-columns-list,
.ess-actions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: calc(100vh - 350px);
    overflow-y: auto;
    overflow-x: visible; /* Cho phép wrapper scroll ngang */
    padding-right: 4px;
    min-width: fit-content; /* Cho phép list rộng hơn wrapper */
    width: auto; /* Tự điều chỉnh theo content */
    box-sizing: border-box;
}
.ess-columns-list::-webkit-scrollbar,
.ess-actions-list::-webkit-scrollbar {
    width: 8px;
}
.ess-columns-list::-webkit-scrollbar-track,
.ess-actions-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}
.ess-columns-list::-webkit-scrollbar-thumb,
.ess-actions-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
}
.ess-columns-list::-webkit-scrollbar-thumb:hover,
.ess-actions-list::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}
.ess-col-card,
.ess-action-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    padding: 12px;
    transition: all 0.2s;
    min-width: 420px; /* Giảm min-width xuống để card nhỏ gọn hơn */
    flex-shrink: 0;
    width: auto; /* Cho phép card tự điều chỉnh width */
    max-width: none;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.ess-col-card:hover,
.ess-action-card:hover {
    border-color: #0078d4;
    box-shadow: 0 4px 8px rgba(0,120,212,0.15);
    transform: translateY(-1px);
}
.ess-col-card-header,
.ess-action-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 2px solid #f0f0f0;
    background: linear-gradient(to bottom, #fafbfc, transparent);
    padding: 8px 10px;
    margin: -12px -12px 12px -12px;
    border-radius: 8px 8px 0 0;
}
.ess-col-number,
.ess-action-number {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0078d4;
    color: #ffffff !important; /* Đảm bảo text màu trắng */
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
}
.ess-col-caption,
.ess-action-caption {
    flex: 1;
    min-width: 0; /* Cho phép shrink */
    max-width: 200px; /* Tăng để có thể hiển thị đủ text */
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: #fff;
    transition: all 0.2s;
    color: #333;
}
.ess-col-caption:focus,
.ess-action-caption:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0,120,212,0.1);
}
.ess-col-caption:hover,
.ess-action-caption:hover {
    border-color: #bbb;
}
.ess-col-expand,
.ess-action-expand {
    padding: 2px 6px;
    border: 1px solid #ddd;
    background: #f5f5f5;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    color: #666;
    transition: all 0.2s;
    flex-shrink: 0;
}
.ess-col-expand:hover,
.ess-action-expand:hover {
    background: #e0e0e0;
    border-color: #0078d4;
}
.ess-col-card-collapsed .ess-col-card-body,
.ess-action-card-collapsed .ess-action-card-body {
    display: none;
}
.ess-col-delete,
.ess-action-delete {
    padding: 4px 8px;
    border: none;
    background: transparent;
    color: #dc3545;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    transition: all 0.2s;
}
.ess-col-delete:hover,
.ess-action-delete:hover {
    background: #fee;
}
.ess-col-card-body,
.ess-action-card-body {
    display: flex;
    flex-direction: column;
    gap: 12px; /* Tăng từ 8px lên 12px để có khoảng cách rõ ràng hơn */
    padding-left: 0; /* Canh đều với header */
    margin-left: 0;
}
.ess-col-row,
.ess-action-row {
    display: flex;
    gap: 12px; /* Tăng từ 8px lên 12px để có khoảng cách rõ ràng hơn */
}
.ess-col-field,
.ess-action-field {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    min-width: 0; /* Cho phép shrink */
}
.ess-col-field label,
.ess-action-field label {
    flex-shrink: 0;
    white-space: nowrap;
    min-width: fit-content;
    margin-bottom: 0;
}
.ess-col-field .ess-col-input,
.ess-col-field select,
.ess-action-field .ess-action-input,
.ess-action-field select {
    flex: 1;
    min-width: 0;
}
/* Field Type và Align - tăng width một chút */
.ess-col-field-type,
.ess-col-field-align {
    flex: 0 0 150px; /* Tăng từ 130px lên 150px */
    max-width: 150px;
}
/* Field Width - tăng width để có thể nhập được */
.ess-col-field-width {
    flex: 0 0 130px; /* Tăng từ 90px lên 130px */
    max-width: 130px;
    min-width: 130px; /* Đảm bảo không bị shrink */
}
/* Field full width (Sample Text, Tag Text, etc.) - giới hạn width */
.ess-col-field-full {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 280px; /* Giới hạn width để không quá rộng */
}
/* Row chứa Sample Text - canh đều với header (column name và button xóa) */
.ess-col-row-sample {
    margin-left: 0; /* Canh đều với header */
    padding-left: 0;
}
/* Action fields - tương tự column fields */
.ess-action-field-key {
    flex: 0 0 180px; /* Tăng từ 140px lên 180px */
    max-width: 180px;
    min-width: 180px;
}
.ess-action-field-width {
    flex: 0 0 150px; /* Tăng từ 130px lên 150px */
    max-width: 150px;
    min-width: 150px;
}
.ess-action-field-icon {
    flex: 0 0 150px;
    max-width: 150px;
    min-width: 150px;
}
.ess-col-field label,
.ess-action-field label {
    font-size: 11px;
    color: #333;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
}
.ess-col-field label strong,
.ess-action-field label strong {
    color: #0078d4;
    font-weight: 600;
}
.ess-col-input,
.ess-action-input {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    min-width: 0; /* Cho phép shrink */
    background: #fff;
    transition: all 0.2s;
    color: #333;
}
.ess-col-input:focus,
.ess-action-input:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0,120,212,0.1);
}
.ess-col-input:hover,
.ess-action-input:hover {
    border-color: #bbb;
}
.ess-col-checkboxes {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-top: 4px;
}
.ess-col-checkboxes label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 11px;
}
.ess-search-input {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
}
.ess-btn-primary {
    padding: 8px 12px;
    background: #0078d4;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
}
.ess-btn-primary:hover {
    background: #005a9e;
}
.ess-col-header {
    margin-bottom: 12px;
}
.prop-section hr {
    margin: 12px 0;
    border: none;
    border-top: 1px solid #e0e0e0;
}
.prop-section h4 {
    margin: 0 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: #333;
}

/* ========== POPUP DESIGN ========== */
.popup-design{
  --pp-header-h: 34px;
  --pp-title-h: 34px;
  --pp-title-font: 14px;
}


/* header xanh */
.popup-header{
  height: var(--pp-header-h);
  padding: 0 6px;                 /* bỏ padding-top/bottom để height đúng */
  display: flex;
  align-items: center;
  background: #0d74ba;
  color: #fff;
  font-weight: 600;
  position: relative;
}

.popup-header-text{
  line-height: var(--pp-header-h);
}

.popup-header-close{
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
}


.popup-header-close:hover {
    background: rgba(255,255,255,.2);
}

/* title bar xám */
.popup-titlebar{
  height: var(--pp-title-h);
  padding: 0 4px;                 /* bỏ padding-top/bottom để height đúng */
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #E7E7E5;
  border-bottom: 1px solid #c0c0c0;
}

.popup-title-text{
  font-weight: 600;
  font-size: var(--pp-title-font);
  line-height: var(--pp-title-h);
}

.popup-title-left  { display: flex; align-items: center; gap: 6px; }
.popup-title-text  { font-weight: 600; }
.popup-title-menus { display: flex; gap: 4px; }
.popup-menu-btn {
    border: 1px solid #b0b0b0;
    background: #f4f4f4;
    padding: 1px 4px;
    cursor: default;
}
.popup-title-right { display: flex; align-items: center; gap: 4px; }
.popup-lang-label img.popup-lang-flag {
    height: 14px;
    margin-right: 2px;
}

/* Popup container */
.popup-design {
    position: absolute;
    z-index: 3000;
    border: 2px solid #ffb74d;
    background: #ffffff;
    box-shadow: 0 0 4px rgba(0,0,0,.2);
    font-size: 12px;
    overflow: hidden;
}
.popup-design.popup-selected { border-color: #0078d7; }

/* body: TOP phải = header + title (không hard-code 48px nữa) */
.popup-body{
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--pp-header-h) + var(--pp-title-h));
  bottom: 0;
  padding: 4px;
  background: #fff;
  overflow: auto;
}

/* field trong popup */
.popup-field {
    position: absolute;
    border: 1px dashed #b0b0b0;
    background: #fcfcfc;
    padding: 2px 4px;
    box-sizing: border-box;
    z-index: 3100;
    cursor: move;
    white-space: nowrap;
    color: #111827;
}
.popup-field-no-border { border: none !important; }
.popup-field-selected  { outline: 2px solid #0078d7; }

.popup-field,
.popup-field * {
    cursor: move;
}

.popup-field-caption {
    display: inline-block;
    margin-right: 4px;
    vertical-align: middle;
    font-weight: 500;
}
.popup-req-star { color: red; margin-left: 2px; }

.popup-field-editor {
    display: inline-block;
    vertical-align: middle;
}
.popup-field-editor input,
.popup-field-editor select,
.popup-field-editor textarea {
    width: 100%;
    box-sizing: border-box;
    font-size: 12px;
}

.popup-field-disabled .popup-field-editor,
.popup-field-disabled .popup-check-wrapper,
.popup-field-disabled .popup-radio-wrapper,
.popup-field-disabled .popup-input-label {
    opacity: 0.5;
}
.popup-field-disabled input,
.popup-field-disabled select,
.popup-field-disabled textarea {
    pointer-events: none;
}

/* groupbox / section trong popup */
.popup-groupbox {
    border: 1px solid #c0c0c0;
    background: #ffffff;
    position: absolute;
}
.popup-groupbox-title {
    position: absolute;
    top: -9px;
    left: 10px;
    padding: 0 4px;
    background: #ffffff;
    font-weight: 600;
}
.popup-section {
    border: 1px solid #c0c0c0;
    background: #ffffff;
    position: absolute;
}
.popup-section-header {
    background-color: #E7E7E5;
    padding: 4px 6px;
    font-weight: 600;
}
.popup-check-wrapper,
.popup-radio-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.popup-field-resizer {
    position: absolute;
    width: 10px;
    height: 10px;
    right: 2px;
    bottom: 2px;
    cursor: se-resize;
}

/* Combobox ngôn ngữ */
.popup-lang-select-en,
.page-lang-select-en {
    padding-left: 24px;
    background-image: url('/Content/images/flag-en.png');
    background-repeat: no-repeat;
    background-position: 4px center;
    background-size: 16px 11px;
}

/* ========== PAGE FIELD (trên canvas chính) ========== */
.page-field {
    position: absolute;
    border: 1px dashed #b0b0b0;
    background: #fcfcfc;
    padding: 2px 4px;
    box-sizing: border-box;
    cursor: move;
    font-size: 12px;
    color: #111827;
}
.page-field-selected { outline: 2px solid #0078d7; }

.page-field,
.page-field * {
    cursor: move;
    white-space: nowrap;
}

.page-field-caption {
    display: inline-block;
    margin-right: 4px;
    vertical-align: middle;
    font-weight: 500;
}
.page-field-editor {
    display: inline-block;
    vertical-align: middle;
}
.page-field-editor input,
.page-field-editor select,
.page-field-editor textarea {
    width: 100%;
    box-sizing: border-box;
    font-size: 12px;
}

/* Group / section */
.page-field-groupbox {
    border: 1px solid #c0c0c0;
    background: #ffffff;
}
.page-field-groupbox-title {
    position: absolute;
    top: -9px;
    left: 10px;
    padding: 0 4px;
    background: #ffffff;
    font-weight: 600;
}
.page-field-section {
    border: 1px solid #c0c0c0;
    background: #ffffff;
}
.page-field-section-header {
    background-color: #E7E7E5;
    padding: 4px 6px;
    font-weight: 600;
}

.page-field-disabled .page-field-editor { opacity: 0.5; }
.page-field-disabled input,
.page-field-disabled select,
.page-field-disabled textarea {
    pointer-events: none;
}

/* Resize handles - cải thiện để tránh conflict với drag */
.page-field-resizer,
.popup-field-resizer {
    position: absolute;
    width: 12px;
    height: 12px;
    right: -1px;
    bottom: -1px;
    cursor: se-resize;
    background: #0078d4;
    border: 1px solid #ffffff;
    border-radius: 2px 0 0 0;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.2s;
}
.page-field-selected .page-field-resizer,
.popup-field-selected .popup-field-resizer,
.canvas-control-selected .page-field-resizer {
    opacity: 1;
}
.page-field-resizer:hover,
.popup-field-resizer:hover {
    background: #005a9e;
    opacity: 1 !important;
}

/* Resize handles cho các cạnh */
.page-field-resize-handle-right,
.popup-field-resize-handle-right {
    position: absolute;
    width: 6px;
    top: 0;
    right: -3px;
    bottom: 0;
    cursor: ew-resize;
    z-index: 999;
}
.page-field-resize-handle-bottom,
.popup-field-resize-handle-bottom {
    position: absolute;
    height: 6px;
    left: 0;
    right: 0;
    bottom: -3px;
    cursor: ns-resize;
    z-index: 999;
}
.page-field-selected .page-field-resize-handle-right,
.page-field-selected .page-field-resize-handle-bottom,
.popup-field-selected .popup-field-resize-handle-right,
.popup-field-selected .popup-field-resize-handle-bottom,
.canvas-control-selected .page-field-resize-handle-right,
.canvas-control-selected .page-field-resize-handle-bottom {
    background: rgba(0, 120, 212, 0.1);
}

/* Field đang được kéo */
.page-field-dragging {
    z-index: 9999 !important;
}

/* Ẩn border của field thường khi tắt “Show field borders” */
.hide-field-borders .page-field:not(.page-field-groupbox):not(.page-field-section),
.hide-field-borders .popup-field:not(.popup-groupbox):not(.popup-section) {
    border-color: transparent !important;
    border-style: none !important;
    background: transparent !important;
}
.hide-field-borders .page-field-selected,
.hide-field-borders .popup-field-selected {
    outline: 2px solid #0078d7;
}

/* Caption có * required */
.page-field-caption-required::after {
    content: " (*)";
    color: #ed120b;
    margin-left: 2px;
}

/* ========== TOOLBAR CONTROL ========== */
.canvas-toolbar {
    position: absolute;
    background: #f4f4f4;
    border: 1px solid #c0c0c0;
    padding: 3px 4px;
}
.canvas-toolbar-btn {
    border: 1px solid #b0b0b0;
    background: #ffffff;
    padding: 1px 4px;
    margin-right: 3px;
    cursor: default;
    font-size: 12px;
}
.canvas-toolbar-btn img {
    height: 14px;
    vertical-align: middle;
    margin-right: 3px;
}

/* ========== TAB PAGE CONTROL ========== */
.canvas-tabpage {
    position: absolute;
    border: 1px solid #c0c0c0;
    background: #ffffff;
    box-sizing: border-box;
    font-size: 12px;
}
.tabpage-tabs {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    border-bottom: 1px solid #c0c0c0;
}
.tabpage-tab {
    padding: 4px 10px;
    cursor: default;
    background: #E7E7E5;
    border-right: 1px solid #c0c0c0;
}
.tabpage-tab.active {
    background-color: #0072c6;
    color: #fff;
    font-weight: 600;
}
.tabpage-body {
    padding: 6px;
    min-height: 120px;
}

/* ========== TEMPLATE / MISC ========== */
.canvas-control-selected { outline: 2px solid #0078d7; }

.tpl-main   { font-size: 12px; font-weight: 600; }
.tpl-actions a { cursor: pointer; }

/* Khi đang drag control từ toolbox */
.ui-dragging .toolbox,
.ui-dragging .toolbox *,
.ui-dragging .canvas-area,
.ui-dragging .canvas-area * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

/* Drag hint */
.drag-hint {
    position: fixed;
    padding: 2px 6px;
    background: rgba(0,0,0,0.75);
    color: #fff;
    border-radius: 3px;
    font-size: 11px;
    pointer-events: none;
    z-index: 5000;
    transform: translate(8px, -18px);
    white-space: nowrap;
}

/* ========== OUTLINE / LAYERS PANEL ========== */
.outline-panel {
    font-size: 12px;
}
.outline-header {
    font-weight: 600;
    margin-bottom: 4px;
}
.outline-tree-root {
    list-style: none;
    margin: 0;
    padding-left: 0;
}
.outline-node {
    margin: 2px 0;
}

/* Row hiển thị 1 control trong Layers */
.outline-row {
    padding: 2px 4px;
    border-radius: 3px;
    cursor: pointer;
}

/* HOVER: tô nền xanh nhạt + viền nhẹ để dễ thấy */
.outline-row:hover {
    background: #e3edff;
    box-shadow: inset 0 0 0 1px #a5bdf5;
}

/* SELECTED: xanh đậm, chữ trắng */
.outline-row-selected {
    background: #295cd6;
    color: #fff;
}

/* Khi selected + hover vẫn giữ màu selected */
.outline-row-selected:hover {
    background: #2049a8;
    box-shadow: inset 0 0 0 1px #102b66;
}

.outline-empty {
    font-size: 11px;
    color: #777;
}

/* ========== MARQUEE + BOTTOM TOOLBAR + CONTEXT MENU + SIZE HINT ========== */
.builder-selection-rect {
    position: absolute;
    border: 1px dashed #3b82f6;
    background: rgba(59,130,246,.08);
    pointer-events: none;
    z-index: 4200;
}

/* Bottom toolbar kiểu Figma */
.canvas-bottom-toolbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 56px;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(32,32,32,0.96);
    color: #fff;
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 4400;
    font-size: 12px;
}
.canvas-bottom-toolbar button {
    min-width: 26px;
    height: 24px;
    border-radius: 999px;
    border: none;
    background: rgba(255,255,255,0.08);
    color: inherit;
    cursor: pointer;
    padding: 0 6px;
}
.canvas-bottom-toolbar button:hover {
    background: rgba(255,255,255,0.20);
}
.canvas-bottom-toolbar .tb-sep {
    width: 1px;
    height: 18px;
    background: rgba(255,255,255,0.25);
    margin: 0 4px;
}
.canvas-bottom-toolbar .tb-snap {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
}
.canvas-bottom-toolbar .zoom-select {
    font-size: 11px;
    padding: 2px 6px;
    min-width: 90px;
    border-radius: 999px;
    border: none;
    outline: none;
    background: rgba(255,255,255,0.12);
    color: #fff;
}
.canvas-bottom-toolbar .zoom-select option { color: #000; }

/* Context menu chuột phải */
.builder-context-menu {
    position: absolute;
    min-width: 180px;
    background: #fff;
    border: 1px solid #d0d0d0;
    box-shadow: 0 6px 18px rgba(0,0,0,0.18);
    border-radius: 4px;
    z-index: 4600;
    font-size: 12px;
}
.builder-context-menu ul {
    list-style: none;
    margin: 0;
    padding: 4px 0;
}
.builder-context-menu li {
    padding: 3px 10px;
    cursor: pointer;
    white-space: nowrap;
}
.builder-context-menu li:hover {
    background: #eef3ff;
}
.builder-context-menu .cm-sep {
    margin: 4px 0;
    border-top: 1px solid #e0e0e0;
    padding: 0;
    cursor: default;
}
.builder-context-menu .cm-disabled {
    color: #aaa;
    cursor: default;
}
.builder-context-menu .cm-disabled:hover {
    background: transparent;
}

/* Pan cursor khi Space + drag */
body.ub-pan-active {
    cursor: grab !important;
}

/* Hint kích thước giống Figma */
.builder-size-hint {
    position: fixed;
    z-index: 9999;
    padding: 2px 6px;
    font-size: 11px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #1f8fff;
    color: #fff;
    border-radius: 3px;
    white-space: nowrap;
    line-height: 1.4;
    pointer-events: none;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
    transform: translate(-50%, 4px);
    display: none;
}

/* ========== FOOTER BUTTONS ========== */
.footer-buttons {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 24px;
    background: linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%);
    border-top: 2px solid #e0e0e0;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
    z-index: 4000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}
.footer-buttons .fb-info {
    font-size: 13px;
    color: #666;
    font-weight: 500;
    padding: 6px 12px;
    background: #f0f0f0;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
}
.footer-buttons .fb-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
.footer-buttons button {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    background: #ffffff;
    color: #333;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    margin: 0;
}
.footer-buttons button:hover {
    background: #f8f8f8;
    border-color: #0078d4;
    color: #0078d4;
    box-shadow: 0 2px 4px rgba(0,120,212,0.15);
    transform: translateY(-1px);
}
.footer-buttons button:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
/* Primary action button (Save to DB) */
.footer-buttons button.fb-primary {
    background: linear-gradient(180deg, #0078d4 0%, #005a9e 100%);
    color: #ffffff;
    border-color: #005a9e;
    font-weight: 600;
}
.footer-buttons button.fb-primary:hover {
    background: linear-gradient(180deg, #005a9e 0%, #004578 100%);
    border-color: #004578;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(0,120,212,0.3);
}


/* ==== Smart guides giống Figma ==== */
.builder-guide-line {
    position: absolute;
    background: #ff3366;
    pointer-events: none;
    z-index: 9999;
}

.builder-guide-v {
    width: 1px;
}

.builder-guide-h {
    height: 1px;
}

.builder-guide-label {
    position: absolute;
    padding: 1px 4px;
    font-size: 10px;
    background: #ff3366;
    color: #fff;
    border-radius: 2px;
    pointer-events: none;
    z-index: 10000;
    white-space: nowrap;
}


</style>

</head>

<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />

        <!-- Header: hiển thị trạng thái đang chỉnh sửa -->
        <header class="builder-header">
            <div class="bh-left">
                <h1 class="bh-title">UI Builder</h1>
                <div class="bh-sub">
                    <span id="lblDesignMode">New design</span>
                    <span id="lblDesignName" class="bh-name"></span>
                </div>
            </div>
            <div class="bh-right">
                <label style="font-size:12px;margin-right:16px;">
                    <input type="checkbox" id="chkShowBorders" checked />
                    Show field borders
                </label>
                <span class="bh-user">
                    User: <strong><%= (string)Session["UiUserName"] ?? "" %></strong>
                </span>
            </div>
        </header>

        <div class="builder-wrapper">

            <!-- Toolbox -->
            <aside class="toolbox">
                <div class="toolbox-toggle" id="toolboxToggle"></div>
                <!-- GROUP: Controls -->
                <div class="tool-group" data-group="controls">
                    <div class="tool-group-header">
                        <span class="tgh-title">Controls</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="tool-item" data-control="grid">🟦 Core - GridView </div>
                        <div class="tool-item tool-ess" data-control="ess-grid" data-ui="ess">🟦 ESS - GridView </div>
                        <div class="tool-item" data-control="popup">🟪 Popup Form</div>
                    </div>
                </div>

                <!-- GROUP: Core controls -->
                <div class="tool-group" data-group="core">
                    <div class="tool-group-header">
                        <span class="tgh-title">Core controls</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="tool-item" data-control="field-button"  data-ui="core">Button</div>
                        <div class="tool-item" data-control="field-checkbox" data-ui="core">Checkbox</div>
                        <div class="tool-item" data-control="field-combo"   data-ui="core">Combobox</div>
                        <div class="tool-item" data-control="field-date"    data-ui="core">Date</div>
                        <div class="tool-item" data-control="field-groupbox"data-ui="core">Group box</div>
                        <div class="tool-item" data-control="field-label"   data-ui="core">Label</div>
                        <div class="tool-item" data-control="field-number"  data-ui="core">Numeric</div>
                        <div class="tool-item" data-control="field-radio"   data-ui="core">Radio</div>
                        <div class="tool-item" data-control="field-text"    data-ui="core">Text box</div>
                        <div class="tool-item" data-control="field-section" data-ui="core">Section panel</div>
                        <div class="tool-item" data-control="field-memo"    data-ui="core">Memo</div>
                    </div>
                </div>

                <!-- GROUP: ESS controls -->
                <div class="tool-group" data-group="ess">
                    <div class="tool-group-header">
                        <span class="tgh-title">ESS controls</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <!-- dùng cùng ftype nhưng thêm data-ui="ess" để phân biệt style -->
                        <div class="tool-item tool-ess" data-control="field-text"    data-ui="ess">ESS Text box</div>
                        <div class="tool-item tool-ess" data-control="field-numberic-test" data-ui="ess">ESS Numeric</div>
                        <div class="tool-item tool-ess" data-control="field-combo"   data-ui="ess">ESS Combobox</div>
                        <div class="tool-item tool-ess" data-control="field-date"    data-ui="ess">ESS Date</div>
                        <div class="tool-item tool-ess" data-control="field-memo"    data-ui="ess">ESS Memo</div>
                        <div class="tool-item tool-ess" data-control="field-button"  data-ui="ess">ESS Button</div>

                        <div class="tool-item" data-control="field-tag"      data-ui="ess">Tag</div>
                        <div class="tool-item" data-control="field-progress" data-ui="ess">Progress</div>
                        <div class="tool-item" data-control="field-image"    data-ui="ess">Image</div>
                    </div>
                </div>

                <!-- GROUP: Special controls -->
                <div class="tool-group" data-group="special">
                    <div class="tool-group-header">
                        <span class="tgh-title">Special controls</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="tool-item" data-control="field-language" data-ui="core">🌐 Language combo</div>
                        <div class="tool-item" data-control="toolbar">☰ Toolbar menu</div>
                        <div class="tool-item" data-control="tabpage">📑 Tab page</div>
                    </div>
                </div>

                <!-- GROUP: Template controls -->
                <div class="tool-group" data-group="template">
                    <div class="tool-group-header">
                        <span class="tgh-title">Template controls</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div id="tplControls">
                            <span style="font-size:12px;color:#999;">Đang tải template...</span>
                        </div>
                    </div>
                </div>
            </aside>



            <!-- Khu vực giữa: Canvas + JSON -->
            <main class="center-pane">
                <!-- Canvas Editable -->
                <section class="canvas-shell">
                    <div class="canvas-ruler-h"></div>
                    <div class="canvas-ruler-v"></div>

                    <div id="canvas" class="canvas-area">
                        <p class="placeholder">Kéo control vào đây để bắt đầu thiết kế…</p>
                    </div>
                </section>

                <!-- JSON preview có thanh gập/mở -->
                <section class="json-preview" id="jsonPanel">
                    <div class="json-toggle" id="jsonToggle">
                        <span class="jt-label">JSON</span>
                        <span class="jt-icon">▼</span>
                    </div>
                    <div class="json-body">
                        <h3>JSON hiện tại</h3>
                        <textarea id="txtJson" readonly></textarea>
                    </div>
                </section>
            </main>

        <!-- Splitter để resize Properties panel -->
        <div class="prop-splitter" id="propSplitter"></div>

        <aside class="prop-shell">
            <div class="prop-toggle" id="propToggle">
                <span class="pt-text">Properties</span>
            </div>

            <div class="prop-main">
                <div class="prop-tabs">
                    <button type="button" class="prop-tab prop-tab-active" data-tab="props">Properties</button>
                    <button type="button" class="prop-tab" data-tab="layers">Layers</button>
                </div>

                <div id="propPanel" class="prop-tab-body prop-body-active">
                    <h3>Thuộc tính</h3>
                    <p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>
                </div>

                <div id="outlinePanel" class="prop-tab-body">
                    <!-- builder.updateOutline sẽ đổ nội dung "Layers" vào đây -->
                </div>
            </div>
        </aside>

        </div>

                <!-- Bottom canvas toolbar -->
        <div id="canvasToolbar" class="canvas-bottom-toolbar">
            <!-- Zoom -->
            <button type="button" data-cmd="zoom-out" title="Zoom out (Ctrl+-)">–</button>

            <select id="zoomSelect" class="zoom-select" title="Zoom level">
                <!-- Dòng đầu là "current" – JS sẽ update % tự động -->
                <option value="custom" data-role="current">100%</option>
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1">100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
                <option value="3">300%</option>
                <option value="4">400%</option>
            </select>

            <button type="button" data-cmd="zoom-in" title="Zoom in (Ctrl++)">+</button>
            <button type="button" data-cmd="zoom-reset" title="Reset zoom to 100% (Ctrl+0)">100%</button>

            <span class="tb-sep"></span>

            <!-- Align -->
            <button type="button" title="Align left (căn trái)" data-cmd="align-left">⭰</button>
            <button type="button" title="Align right (căn phải)" data-cmd="align-right">⭲</button>
            <button type="button" title="Align top (căn trên)" data-cmd="align-top">⭱</button>
            <button type="button" title="Align bottom (căn dưới)" data-cmd="align-bottom">⭳</button>

            <span class="tb-sep"></span>

            <!-- Duplicate / Delete -->
            <button type="button" title="Duplicate (Ctrl+D)" data-cmd="duplicate">⧉</button>
            <button type="button" title="Delete (Del)" data-cmd="delete">⌫</button>
        </div>

        <!-- Footer buttons -->


        <!-- Footer buttons -->
        <div class="footer-buttons">
            <span class="fb-info" id="lblFooterInfo"></span>
            <div class="fb-actions">
                <!-- Ẩn nút Lưu JSON và Tải JSON vì đã có lưu vào DB -->
                <!-- <button type="button" onclick="builder.saveConfig()" title="Lưu cấu hình JSON">
                    <i class="bi bi-save"></i> Lưu JSON
                </button> -->
                <button type="button" onclick="builder.showPreview()" title="Xem preview">
                    <i class="bi bi-eye"></i> Preview
                </button>
                <!-- <button type="button" onclick="builder.downloadJson()" title="Tải file JSON">
                    <i class="bi bi-download"></i> Tải JSON
                </button> -->
                <button type="button" onclick="builder.exportImage()" title="Xuất hình ảnh">
                    <i class="bi bi-image"></i> Xuất hình ảnh
                </button>
                <button type="button" onclick="builder.savePageToServer()" class="fb-primary" title="Lưu design vào DB">
                    <i class="bi bi-cloud-upload"></i> Lưu vào DB
                </button>
            </div>
        </div>

        <asp:HiddenField runat="server" ID="hiddenInitialJson" ClientIDMode="Static" />
        <asp:HiddenField runat="server" ID="hiddenControlId" ClientIDMode="Static" />
        <asp:HiddenField ID="hiddenIsClone" runat="server" />
    </form>
    <script type="text/javascript">
    // Khởi tạo toggle panel sau khi DOM sẵn sàng
    $(function () {
        initPanelToggles();
        initBorderToggle();
        initToolboxGroups();   // NEW
    });

    function initPanelToggles() {
        var $wrapper = $(".builder-wrapper");
        var $center = $(".center-pane");
        var $propShell = $(".prop-shell");
        var $splitter = $("#propSplitter");

        // Load saved width từ localStorage
        var savedWidth = localStorage.getItem('propPanelWidth');
        if (savedWidth) {
            $propShell.css('width', savedWidth + 'px');
        }

        // Toggle TOOLBOX (Controls panel bên trái)
        $("#toolboxToggle").on("click", function () {
            $wrapper.toggleClass("toolbox-collapsed");
        });

        // Toggle PROPERTIES - Click vào text "Properties" để toggle panel
        $("#propToggle").on("click", function (e) {
            // Chỉ toggle khi click vào text "Properties", không toggle khi click vào tab hoặc ESS Grid tabs
            var $target = $(e.target);
            // Nếu click vào tab thì không toggle
            if ($target.closest('.prop-tabs').length > 0 || 
                $target.closest('.prop-tab').length > 0 ||
                $target.closest('.ess-grid-props-tabs').length > 0 ||
                $target.closest('.ess-prop-tab').length > 0) {
                return;
            }
            // Chỉ toggle khi click vào text "Properties"
            if ($target.hasClass('pt-text') || $target.closest('.pt-text').length > 0 || $target.is('#propToggle')) {
                var isCollapsed = $wrapper.hasClass("props-collapsed");
                $wrapper.toggleClass("props-collapsed");
                
                if ($wrapper.hasClass("props-collapsed")) {
                    // Đang collapse - lưu width hiện tại trước khi collapse và force về 26px
                    var currentWidth = $propShell.width();
                    if (currentWidth > 26) {
                        localStorage.setItem('propPanelWidth', currentWidth);
                    }
                    // Force reset width về 26px để collapse hoàn toàn
                    $propShell.css('width', '26px');
                } else {
                    // Đang expand - restore width từ localStorage nếu có
                    var savedWidth = localStorage.getItem('propPanelWidth');
                    if (savedWidth && parseInt(savedWidth) > 26) {
                        $propShell.css('width', savedWidth + 'px');
                    } else {
                        // Nếu không có saved width, dùng default
                        $propShell.css('width', '320px');
                    }
                }
            }
        });

        // Resize Properties panel với splitter
        if (typeof interact !== 'undefined' && $splitter.length) {
            var isResizing = false;
            var startWidth = 0;
            var startX = 0;

            // Ngăn click event từ splitter bubble lên canvas
            $splitter.on("mousedown", function(e) {
                e.stopPropagation();
            });
            
            interact($splitter[0])
                .draggable({
                    listeners: {
                        start: function (event) {
                            isResizing = true;
                            startWidth = $propShell.width();
                            startX = event.clientX;
                            $splitter.addClass('resizing');
                            $wrapper.addClass('resizing-props');
                            event.preventDefault();
                            event.stopPropagation();
                            // Ngăn clear selection khi click vào splitter
                            if (window.builder && typeof builder.clearSelection === "function") {
                                // Không clear selection khi resize
                            }
                        },
                        move: function (event) {
                            if (!isResizing) return;
                            
                            var deltaX = event.clientX - startX;
                            var newWidth = startWidth - deltaX; // Kéo sang trái = giảm width
                            
                            // Giới hạn min/max width
                            var minWidth = 200;
                            var maxWidth = Math.min(window.innerWidth * 0.6, 800);
                            
                            if (newWidth < minWidth) newWidth = minWidth;
                            if (newWidth > maxWidth) newWidth = maxWidth;
                            
                            $propShell.css('width', newWidth + 'px');
                            event.stopPropagation();
                        },
                        end: function (event) {
                            isResizing = false;
                            $splitter.removeClass('resizing');
                            $wrapper.removeClass('resizing-props');
                            
                            // Lưu width vào localStorage
                            var width = $propShell.width();
                            if (width > 26 && !$wrapper.hasClass("props-collapsed")) {
                                localStorage.setItem('propPanelWidth', width);
                            }
                            event.stopPropagation();
                        }
                    }
                });
        }

        // Toggle JSON
        $("#jsonToggle").on("click", function () {
            $center.toggleClass("json-collapsed");

            var $icon = $(this).find(".jt-icon");
            if ($center.hasClass("json-collapsed")) {
                $icon.text("◀");    // đang gập
            } else {
                $icon.text("▼");    // đang mở
            }
        });

        // Initialize collapsible sections cho Properties panel
        $(document).on("click", "[data-toggle-section]", function() {
            var $section = $(this).closest(".prop-section");
            $section.toggleClass("collapsed");
        });
        
        // Tab switching - không toggle panel khi click vào tab
        $(".prop-tabs").on("click", ".prop-tab", function (e) {
            e.stopPropagation(); // Ngăn event bubble lên prop-toggle
            var tab = $(this).data("tab");
            $(".prop-tab").removeClass("prop-tab-active");
            $(".prop-tab-body").removeClass("prop-body-active");
            $(this).addClass("prop-tab-active");
            if (tab === "props") {
                $("#propPanel").addClass("prop-body-active");
            } else {
                $("#outlinePanel").addClass("prop-body-active");
            }
        });
    }

        function initBorderToggle() {
            var $body = $("body");
            $("#chkShowBorders").on("change", function () {
                var show = $(this).is(":checked");
                // nếu không show thì thêm class ẩn border
                $body.toggleClass("hide-field-borders", !show);
            });
        }

        function initToolboxGroups() {
            // Click vào header là toggle gập/mở
            $(".toolbox").on("click", ".tool-group-header", function () {
                var $group = $(this).closest(".tool-group");
                $group.toggleClass("tool-group-collapsed");
            });
        }


        // Tabs: Properties / Layers - đã được handle ở trên, xóa duplicate
    </script>

    <style>
    /* Context Menu Styles */
    .builder-context-menu {
        position: absolute;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 180px;
        font-size: 12px;
    }
    .builder-context-menu ul {
        list-style: none;
        margin: 0;
        padding: 4px 0;
    }
    .builder-context-menu li {
        padding: 6px 12px;
        cursor: pointer;
        white-space: nowrap;
    }
    .builder-context-menu li:hover:not(.cm-disabled):not(.cm-label):not(.cm-sep) {
        background: #e8f4fd;
    }
    .builder-context-menu li.cm-disabled {
        color: #999;
        cursor: default;
    }
    .builder-context-menu li.cm-sep {
        height: 1px;
        padding: 0;
        margin: 4px 0;
        background: #e0e0e0;
        cursor: default;
    }
    .builder-context-menu li.cm-label {
        padding: 4px 12px;
        font-weight: 600;
        color: #0078d4;
        font-size: 11px;
        cursor: default;
        background: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
    }
    </style>

</body>

</html>
