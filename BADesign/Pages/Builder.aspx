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
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr) 320px;
    gap: 0;
    /* trừ header (~50px) + footer (~50px) */
    height: calc(100vh - 100px);
}

/* Khi gập Properties: cột phải còn ~26px (thanh dọc) */
.builder-wrapper.props-collapsed {
    grid-template-columns: 220px minmax(0, 1fr) 26px;
}

/* Toolbox */
.toolbox {
    border-right: 1px solid #ddd;
    padding: 10px;
    background: #fafafa;

    /* NEW: scroll dọc */
    overflow-y: auto;
    height: 100%;
    box-sizing: border-box;
}

/* Group trong toolbox */
.tool-group {
    margin-bottom: 8px;
}

/* Header của group (Controls, Core controls, ESS controls...) */
.tool-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    padding: 4px 2px;
    cursor: pointer;
    user-select: none;
    background: linear-gradient(34deg, rgba(10, 117, 186, 1) 0%, rgba(18, 140, 223, 1) 100%);
    color: white;
    padding-left: 5px;
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
    background: #f0f0f0;
    cursor: pointer;
    font-size: 12px;
    user-select: none;
}
.prop-toggle:hover { background: #e0e0e0; }

.prop-main {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 10px;
    overflow: hidden;
    background: #fcfcfc;
}
.prop-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
}
.prop-tab {
    flex: 1 1 0;
    padding: 4px 6px;
    font-size: 12px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    cursor: pointer;
    border-radius: 4px;
}
.prop-tab-active {
    background: #ffffff;
    border-bottom-color: #ffffff;
    font-weight: 600;
}
.prop-tab-body {
    flex: 1 1 auto;
    overflow: auto;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 6px 8px;
    background: #fcfcfc;
}
.prop-tab-body:not(.prop-body-active) { display: none; }

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

.page-field-resizer {
    position: absolute;
    width: 10px;
    height: 10px;
    right: 2px;
    bottom: 2px;
    cursor: se-resize;
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
    padding: 6px 16px;
    background: #f5f5f5;
    border-top: 1px solid #ddd;
    z-index: 4000;
    display: flex;
    align-items: center;
    gap: 6px;
}
.footer-buttons button { margin-right: 4px; }
.footer-buttons .fb-info {
    font-size: 12px;
    color: #555;
    margin-right: auto;
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
            <button type="button" data-cmd="zoom-out">–</button>

            <select id="zoomSelect" class="zoom-select">
                <!-- Dòng đầu là “current” – JS sẽ update % tự động -->
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

            <button type="button" data-cmd="zoom-in">+</button>
            <button type="button" data-cmd="zoom-reset">100%</button>

            <span class="tb-sep"></span>

            <!-- Align -->
            <button type="button" title="Align left" data-cmd="align-left">⭰</button>
            <button type="button" title="Align right" data-cmd="align-right">⭲</button>
            <button type="button" title="Align top" data-cmd="align-top">⭱</button>
            <button type="button" title="Align bottom" data-cmd="align-bottom">⭳</button>

            <span class="tb-sep"></span>

            <!-- Distribute -->
            <button type="button" title="Distribute H" data-cmd="dist-h">H</button>
            <button type="button" title="Distribute V" data-cmd="dist-v">V</button>

            <span class="tb-sep"></span>

            <!-- Duplicate / Delete -->
            <button type="button" title="Duplicate" data-cmd="duplicate">⧉</button>
            <button type="button" title="Delete" data-cmd="delete">⌫</button>

            <span class="tb-sep"></span>

            <!-- Snap -->
            <div class="tb-snap">
                <label>
                    <input type="checkbox" id="chkSnapToolbar" checked />
                    Snap
                </label>
            </div>
        </div>

        <!-- Footer buttons -->


        <!-- Footer buttons -->
        <div class="footer-buttons">
            <span class="fb-info" id="lblFooterInfo"></span>

            <button type="button" onclick="builder.saveConfig()">💾 Lưu cấu hình JSON</button>
            <button type="button" onclick="builder.showPreview()">👁 Xem preview</button>
            <button type="button" onclick="builder.downloadJson()">⬇ Tải file JSON</button>
            <button type="button" onclick="builder.exportWord()">📄 Xuất Word (HTML)</button>
            <button type="button" onclick="builder.savePageToServer()">💾 Lưu design vào DB</button>
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

        // Toggle PROPERTIES
        $("#propToggle").on("click", function () {
            $wrapper.toggleClass("props-collapsed");
        });

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


        // Tabs: Properties / Layers
        $(".prop-tabs").on("click", ".prop-tab", function () {
            var tab = $(this).data("tab");

            $(".prop-tab").removeClass("prop-tab-active");
            $(this).addClass("prop-tab-active");

            $(".prop-tab-body").removeClass("prop-body-active");
            if (tab === "props") {
                $("#propPanel").addClass("prop-body-active");
            } else {
                $("#outlinePanel").addClass("prop-body-active");
            }
        });
    </script>

</body>

</html>
