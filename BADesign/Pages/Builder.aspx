<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Builder.aspx.cs" Inherits="BADesign.Builder" ResponseEncoding="utf-8" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>UI Builder Demo - For BA</title>

    <script src="../Scripts/html2canvas.min.js" charset="utf-8"></script>

    <!-- DevExtreme CDN -->
    <link rel="stylesheet" href="https://cdn3.devexpress.com/jslib/23.2.5/css/dx.light.css" />

    <!-- Custom builder CSS -->
    <link rel="stylesheet" href="../Content/builder.css?v=20261156" />
    <link rel="stylesheet" href="../Content/builder-ess.css?v=20261152" />
    <link rel="stylesheet" href="../Content/builder-core.css?v=20261154" />
    <link rel="stylesheet" href="../Content/style.css" />

    <link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
    <!-- Bootstrap CSS for Glyphicon -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">

    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

    <!-- DevExtreme -->
    <script src="https://cdn3.devexpress.com/jslib/23.2.5/js/dx.all.js"></script>


    <!-- Drag-drop library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/interact.js/1.10.11/interact.min.js"></script>

    <!-- Builder scripts (charset=utf-8 để hiển thị đúng tiếng Việt có dấu) -->
    <script src="../Scripts/builder/builder.js?v=20261157" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-props.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/common.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/control-grid.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/control-popup.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/control-tree.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/control-field.js?v=20261155" charset="utf-8"></script>
    <script src="../Scripts/builder/control-toolbar.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/control-tabpage.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/control-grid-ess.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/control-collapsible-section.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/control-annotation.js?v=20261156" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-snippet.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-slice.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-autolayout.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-import.js?v=20261140" charset="utf-8"></script>
    <link href="../Content/builder-templates.css?v=20261150" rel="stylesheet" />
    <link href="../Content/builder-features.css?v=20261146" rel="stylesheet" />
    <script src="../Scripts/builder/builder-capture.js?v=20261150" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-drawio.js?v=20261150" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-templates.js?v=20261151" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-inline-edit.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-store.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-reference.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-draft.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-dialog.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-spec.js?v=20261146" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-versions.js?v=20261140" charset="utf-8"></script>
    <script src="../Scripts/builder/builder-review.js?v=20261150" charset="utf-8"></script>
    <style>
/* ========== GLOBAL ========== */
html {
    height: 100%;
    overflow-x: hidden !important; /* Ngăn scrollbar ngang ở page level */
    overflow-y: hidden;
    width: 100%;
    max-width: 100vw;
}
body {
    margin: 0;
    padding: 0; /* tránh làm tăng chiều cao trang gây scrollbar ngoài */
    font-family: Segoe UI, Tahoma, Arial, sans-serif;
    overflow: hidden !important; /* Chỉ cho phép khu vực builder scroll, không scroll cả page */
    width: 100%;
    max-width: 100vw; /* Đảm bảo không vượt quá viewport width */
    position: relative;
}
form {
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden !important; /* Ngăn scrollbar ngang */
    position: relative;
}
/* Đảm bảo tất cả container không gây overflow ngang */
* {
    box-sizing: border-box;
}

/* ========== HEADER ========== */
.builder-header {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 48px;
    padding: 0 12px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    position: relative;
    z-index: 4500;
}
.bh-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 240px; }
.bh-home { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; color: #0f75bd; font-size: 18px; text-decoration: none; flex: 0 0 auto; }
.bh-home:hover, .bh-home:focus { background: #e3eef7; color: #0b5c94; text-decoration: none; }
.bh-doc { min-width: 0; line-height: 1.25; }
.bh-doc-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bh-name { font-size: 15px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bh-sub { font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bh-save-state { flex: 0 0 auto; font-size: 11px; padding: 1px 8px; border-radius: 10px; background: #e5e7eb; color: #4b5563; white-space: nowrap; }
.bh-save-state.is-dirty { background: #fdecc8; color: #8a4b00; }
.bh-save-state.is-saved { background: #dcf3e4; color: #17603a; }
.bh-save-state.is-saving { background: #dbeafe; color: #1e4fa3; }
.bh-actions { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.bh-right { display: flex; align-items: center; justify-content: flex-end; gap: 14px; flex: 0 1 auto; min-width: 0; font-size: 12px; color: #374151; }
.bh-check { display: inline-flex; align-items: center; gap: 5px; margin: 0; font-weight: normal; white-space: nowrap; cursor: pointer; }
.bh-check input { margin: 0; }
.bh-user { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bh-sep { width: 1px; height: 22px; background: #d1d5db; margin: 0 4px; }
.bh-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid #cfd4da; border-radius: 6px; background: #fff; color: #1f2937; font-size: 13px; cursor: pointer; white-space: nowrap; }
.bh-btn:hover:not(:disabled) { border-color: #0f75bd; color: #0f75bd; background: #f3f8fc; }
.bh-btn:focus-visible { outline: 2px solid #0f75bd; outline-offset: 1px; }
.bh-btn:disabled { opacity: 0.45; cursor: default; }
.bh-btn-icon { width: 32px; padding: 0; justify-content: center; }
.bh-btn-primary { background: #0f75bd; border-color: #0b5c94; color: #fff; font-weight: 600; }
.bh-btn-primary:hover:not(:disabled) { background: #0b5c94; border-color: #084a78; color: #fff; }
.bh-split { position: relative; display: inline-flex; }
.bh-split .bh-btn:first-child { border-radius: 6px 0 0 6px; }
.bh-split .bh-btn-caret { width: 28px; padding: 0; justify-content: center; border-radius: 0 6px 6px 0; border-left-color: rgba(255,255,255,0.45); margin-left: -1px; font-size: 11px; }
.bh-menu { display: none; position: absolute; top: 36px; left: 0; min-width: 260px; margin: 0; padding: 4px 0; list-style: none; background: #fff; border: 1px solid #cfd4da; border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,0.18); font-size: 13px; z-index: 4600; }
.bh-menu.is-open { display: block; }
.bh-menu li { display: flex; justify-content: space-between; gap: 16px; padding: 7px 12px; cursor: pointer; white-space: nowrap; }
.bh-menu li:hover { background: #e8f4fd; }
.bh-menu-key { color: #6b7280; font-size: 11px; }
@media (max-width: 1240px) {
    .bh-actions .bh-btn:not(.bh-btn-primary) .bh-text { display: none; }
    .bh-actions .bh-btn:not(.bh-btn-primary):not(.bh-btn-icon) { width: 34px; padding: 0; justify-content: center; }
}
@media (max-width: 900px) {
    .bh-user, .bh-sub { display: none; }
}

/* ========== MAIN LAYOUT ========== */
/* 3 cột: Toolbox – Center – Properties */
.builder-wrapper {
    display: flex;
    gap: 0;
    height: calc(100vh - 48px);
    margin: 0;
    border: 0;
    width: 100%;
    max-width: 100vw; /* Đảm bảo không vượt quá viewport width */
    overflow-x: hidden; /* Ngăn scrollbar ngang */
    overflow-y: hidden;
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
    position: fixed;
    top: calc(50vh - 16px);
    left: 207px;
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
    left: 0;
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
    max-width: 100%; /* Đảm bảo không vượt quá container */
    position: relative;
    overflow-x: hidden !important; /* Ngăn scrollbar ngang ở page level - QUAN TRỌNG */
    overflow-y: hidden; /* Ngăn scrollbar dọc ở page level */
    box-sizing: border-box;
}

/* Properties panel - resizable width */
.builder-wrapper > .prop-shell {
    width: 370px;
    flex-shrink: 0;
    position: relative;
    overflow-x: hidden; /* Ngăn scrollbar ngang */
    max-width: 100%; /* Đảm bảo không vượt quá container */
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
.tool-search { margin-bottom: 8px; }
.tool-search input { width: 100%; height: 28px; padding: 3px 8px; font-size: 12px; border: 1px solid #c9ced4; border-radius: 4px; box-sizing: border-box; }
.tool-search input:focus { outline: none; border-color: #0f75bd; box-shadow: 0 0 0 2px rgba(15,117,189,0.18); }
.tool-hint { margin-top: 4px; font-size: 11px; line-height: 1.3; color: #6b7280; }
.tool-empty { margin-top: 6px; font-size: 12px; color: #6b7280; }
.tool-group.tool-group-searching .tool-group-body { display: block; }

/* Center pane (canvas + JSON) */
.center-pane {
    display: flex;
    flex-direction: column;
    border-right: 1px solid #ddd;
    min-width: 0; /* Quan trọng: cho phép flex shrink */
    overflow-x: hidden !important; /* Ngăn scrollbar ngang ở page level - QUAN TRỌNG */
    overflow-y: hidden; /* Ngăn scrollbar dọc ở page level */
    box-sizing: border-box;
}

/* Canvas shell chiếm phần trên */
.canvas-shell {
    position: relative;
    flex: 1 1 auto;
    background: #ffffff;
    /* QUAN TRỌNG: Cho phép scroll khi canvas lớn hơn vùng nhìn thấy */
    overflow: auto;
    /* Đảm bảo scroll chỉ nội bộ, không gây overflow ở page level */
    max-width: 100%;
    width: 100%;
    /* Đảm bảo không vượt quá container và không gây overflow ngang ở page level */
    min-width: 0; /* Quan trọng: cho phép flex shrink */
    box-sizing: border-box;
    /* QUAN TRỌNG: Đảm bảo scroll chỉ nội bộ, không gây overflow ở page level */
    overflow-x: auto; /* Cho phép scroll ngang nội bộ */
    overflow-y: auto; /* Cho phép scroll dọc nội bộ */
}

/* Canvas container (id="canvas") - vùng chứa, KHÔNG zoom. Luôn giữ kích thước cố định. */
.canvas-area {
    position: relative;
    margin: 20px 0 0 20px; /* chừa chỗ cho thước đo */
    padding: 8px;
    background: #ffffff;
    display: block;
    min-width: 1600px; /* Giá trị mặc định, sẽ được JS cập nhật */
    min-height: 900px; /* Giá trị mặc định, sẽ được JS cập nhật */
    box-sizing: border-box;
    /* Đảm bảo canvas không gây overflow ngang ở page level - scroll chỉ trong canvas-shell */
    max-width: none; /* Cho phép canvas lớn hơn viewport, scroll trong shell */
    /* QUAN TRỌNG: Tắt scrollbar của canvas vì đã có scrollbar ở canvas-shell */
    overflow: visible; /* Không có scrollbar riêng, scroll chỉ ở canvas-shell */
}

/* Nội dung zoom được (controls) - CHỈ phần này zoom, không zoom container */
.canvas-zoom-inner {
    position: relative;
    display: inline-block;
    min-width: 1600px;
    min-height: 900px;
    box-sizing: border-box;
    transform-origin: 0 0;
    /* QUAN TRỌNG: Tắt scrollbar của zoom-inner vì đã có scrollbar ở canvas-shell */
    overflow: visible; /* Không có scrollbar riêng, scroll chỉ ở canvas-shell */
}

/* Rulers - Fixed position, không bị scroll mất. left/top/width/height được JS set theo canvas-shell */
.canvas-ruler-h,
.canvas-ruler-v {
    position: fixed;
    box-sizing: border-box;
    background: #f8f8f8;
    border-color: #d4d4d4;
    z-index: 300;
    font-size: 10px;
    color: #333;
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    pointer-events: none;
    user-select: none;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.canvas-ruler-h {
    left: 0;
    top: 0;
    height: 24px;
    border-bottom: 2px solid #d4d4d4;
    overflow: hidden;
}
.canvas-ruler-v {
    left: 0;
    top: 24px;
    width: 24px;
    border-right: 2px solid #d4d4d4;
    overflow: hidden;
}
/* Ruler tick marks và số */
.canvas-ruler-h .ruler-tick {
    position: absolute;
    bottom: 0;
    width: 1px;
    height: 100%;
    background: #999;
}
.canvas-ruler-h .ruler-tick.major {
    height: 60%;
    background: #666;
}
.canvas-ruler-h .ruler-tick.minor {
    height: 40%;
    background: #bbb;
}
.canvas-ruler-h .ruler-label {
    position: absolute;
    bottom: 2px;
    left: 2px;
    font-size: 9px;
    color: #333;
    font-weight: 500;
    white-space: nowrap;
}
.canvas-ruler-v .ruler-tick {
    position: absolute;
    right: 0;
    width: 100%;
    height: 1px;
    background: #999;
}
.canvas-ruler-v .ruler-tick.major {
    width: 60%;
    background: #666;
}
.canvas-ruler-v .ruler-tick.minor {
    width: 40%;
    background: #bbb;
}
.canvas-ruler-v .ruler-label {
    position: absolute;
    right: 2px;
    top: 0;
    font-size: 9px;
    color: #333;
    font-weight: 500;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    white-space: nowrap;
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

/* ========== POPUP BODY - Position relative để grid absolute bên trong ========== */
.popup-body {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible; /* Cho phép grid overflow nếu cần */
}

.ess-col-input {
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
.ess-col-input:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0,120,212,0.1);
}
.ess-col-input:hover {
    border-color: #bbb;
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
  overflow: visible;   /* cho control (Language combo) nằm đè lên thanh xám tiêu đề; popup-design đã overflow:hidden */
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
.page-field-editor input:where(:not([type="checkbox"]):not([type="radio"])),
.page-field-editor select,
.page-field-editor textarea {
    width: 100%;
    box-sizing: border-box;
    font-size: 12px;
}
.page-field-editor:has(> label) { height: 100%; }
.page-field-editor > label {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
    margin: 0;
}
.page-field-editor > label > input {
    flex: 0 0 auto;
    margin: 0;
}

/* Group / section */
.page-field-groupbox {
    border: 1px solid #c0c0c0;
    background: #ffffff;
    overflow: visible;
}
.page-field-groupbox-title {
    position: absolute;
    top: -9px;
    left: 10px;
    padding: 0 4px;
    background: #ffffff;
    font-weight: 600;
    z-index: 3;
}
.page-field-groupbox-content,
.page-field-section-content {
    position: relative;
    min-height: 60px;
    padding: 8px;
    margin-top: 8px;
    overflow: visible;
    z-index: 1;
}
/* Group box "trần": khối chỉ để tự xếp (do tính năng nhận dạng ảnh tạo), không khung, không tiêu đề */
.page-field-groupbox.page-field-groupbox-bare { border: none; background: transparent; padding: 0; }
.page-field-groupbox.page-field-groupbox-bare > .page-field-groupbox-title { display: none; }
.page-field-groupbox.page-field-groupbox-bare > .page-field-groupbox-content { min-height: 0; height: 100%; padding: 0; margin-top: 0; }
/* Ô nhập nhỏ do nhận dạng ảnh: ép input/select vừa đúng khung (mặc định input cao ~23px sẽ tràn) */
.page-field-groupbox-bare .page-field-editor textarea { height: 100%; box-sizing: border-box; resize: none; min-height: 0; }
.page-field-groupbox-bare .page-field-editor:has(> textarea) { height: calc(100% + 4px); margin: -2px 0; display: block; }
.page-field-groupbox-bare .page-field-editor input[type=text], .page-field-groupbox-bare .page-field-editor select { height: 100%; box-sizing: border-box; padding-top: 0; padding-bottom: 0; min-height: 0; }
.page-field-section {
    border: 1px solid #c0c0c0;
    background: #ffffff;
    overflow: visible;
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
#canvas .page-field-editor input:not([type="file"]):not([type="checkbox"]):not([type="radio"]),
#canvas .page-field-editor select,
#canvas .page-field-editor textarea {
    pointer-events: none;
}
#canvas .page-field-editor .core-multiselect-dropdown input {
    pointer-events: auto;
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
.page-field-selected > .page-field-resizer,
.popup-field-selected > .popup-field-resizer,
.canvas-control-selected > .page-field-resizer {
    opacity: 1;
}
.page-field-resizer,
.page-field-resize-handle-right,
.page-field-resize-handle-bottom {
    pointer-events: none;
}
.page-field-selected > .page-field-resizer,
.page-field-selected > .page-field-resize-handle-right,
.page-field-selected > .page-field-resize-handle-bottom,
.canvas-control-selected > .page-field-resizer {
    pointer-events: auto;
}
.page-field-selected > .page-field-resize-handle-right::after,
.page-field-selected > .page-field-resize-handle-bottom::after {
    content: "";
    position: absolute;
    background: #0078d4;
    border-radius: 2px;
}
.page-field-selected > .page-field-resize-handle-right::after {
    top: 50%;
    left: 1px;
    width: 4px;
    height: 12px;
    margin-top: -6px;
}
.page-field-selected > .page-field-resize-handle-bottom::after {
    left: 50%;
    top: 1px;
    width: 12px;
    height: 4px;
    margin-left: -6px;
}
.ub-resize {
    position: absolute;
    z-index: 1001;
}
.popup-design > .ub-resize {
    z-index: 2147483647;
}
.ub-resize-right {
    top: 0;
    right: 0;
    bottom: 12px;
    width: 7px;
    cursor: ew-resize;
}
.ub-resize-bottom {
    left: 0;
    right: 12px;
    bottom: 0;
    height: 7px;
    cursor: ns-resize;
}
.ub-resize-corner {
    right: 0;
    bottom: 0;
    width: 12px;
    height: 12px;
    cursor: se-resize;
}
.ub-resize:hover {
    background: rgba(0, 120, 212, 0.25);
}
.popup-selected > .ub-resize-corner,
.canvas-control-selected > .ub-resize-corner {
    background: #0078d4;
    border: 1px solid #ffffff;
    border-radius: 2px 0 0 0;
}
.popup-selected > .ub-resize-right::after,
.popup-selected > .ub-resize-bottom::after,
.canvas-control-selected > .ub-resize-right::after,
.canvas-control-selected > .ub-resize-bottom::after {
    content: "";
    position: absolute;
    background: #0078d4;
    border-radius: 2px;
}
.popup-selected > .ub-resize-right::after,
.canvas-control-selected > .ub-resize-right::after {
    top: 50%;
    right: 1px;
    width: 4px;
    height: 18px;
    margin-top: -9px;
}
.popup-selected > .ub-resize-bottom::after,
.canvas-control-selected > .ub-resize-bottom::after {
    left: 50%;
    bottom: 1px;
    width: 18px;
    height: 4px;
    margin-left: -9px;
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
.page-field-selected > .page-field-resize-handle-right,
.page-field-selected > .page-field-resize-handle-bottom,
.popup-field-selected > .popup-field-resize-handle-right,
.popup-field-selected > .popup-field-resize-handle-bottom {
    background: rgba(0, 120, 212, 0.1);
}

/* Field đang được kéo */
.page-field-dragging {
    z-index: 9999 !important;
    overflow: visible !important;
}
.ub-dragging {
    z-index: 9999 !important;
}
.page-field-groupbox.page-field-dragging .page-field-groupbox-content,
.page-field-section.page-field-dragging .page-field-section-content,
.page-field-groupbox.page-field-dragging .page-field,
.page-field-section.page-field-dragging .page-field {
    visibility: visible !important;
    opacity: 1 !important;
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
    background: #e7e7e5;
    border: 1px solid #e0e0de;
    padding: 1px 2px;
    white-space: nowrap;
}
.canvas-toolbar-btn {
    border: none;
    border-right: 1px solid #f6f6f5;
    background: transparent;
    padding: 2px 8px 2px 6px;
    margin: 0;
    cursor: default;
    font-size: 12px;
    line-height: 18px;
    color: #1f1f1f;
}
.canvas-toolbar-btn:last-child {
    border-right: none;
}
.canvas-toolbar-btn:hover {
    background: #cfe5f6;
}
.canvas-toolbar-btn img {
    height: 16px;
    vertical-align: middle;
    margin-right: 4px;
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
    cursor: move;
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

.ui-dragging,
.ui-dragging * {
    cursor: copy !important;
}

.ui-dragging.ui-drag-nodrop,
.ui-dragging.ui-drag-nodrop * {
    cursor: no-drop !important;
}

/* Drag hint */
.drag-hint {
    position: fixed;
    padding: 5px 10px;
    background: #ffffff;
    color: #1f2937;
    border: 1px solid #0078d7;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.22);
    font-size: 12px;
    pointer-events: none;
    z-index: 20000;
    transform: translate(16px, 18px);
    white-space: nowrap;
    opacity: 0.95;
}

.drag-hint::before {
    content: "";
    position: absolute;
    left: -17px;
    top: -19px;
    width: 10px;
    height: 10px;
    border-left: 2px solid #0078d7;
    border-top: 2px solid #0078d7;
}

.drag-hint.drag-hint-nodrop::before {
    border-color: #c0392b;
}

.drag-hint.drag-hint-nodrop {
    border-color: #c0392b;
    color: #9ca3af;
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
    bottom: 34px;
    padding: 4px 8px;
    border-radius: 18px;
    background: rgba(32,32,32,0.96);
    color: #fff;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    row-gap: 4px;
    align-items: center;
    max-width: calc(100vw - 40px); /* Đảm bảo không vượt quá viewport */
    overflow-x: hidden; /* Ngăn scrollbar ngang */
    box-sizing: border-box;
    gap: 4px;
    z-index: 4400;
    font-size: 12px;
    max-width: calc(100vw - 40px); /* Đảm bảo không vượt quá viewport */
    overflow-x: hidden; /* Ngăn scrollbar ngang */
    box-sizing: border-box;
}
.canvas-bottom-toolbar button {
    min-width: 26px;
    white-space: nowrap;
    flex: 0 0 auto;
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

/* Canvas size controls in bottom toolbar */
.canvas-bottom-toolbar .canvas-size-group {
    display: flex;
    align-items: center;
    white-space: nowrap;
    flex: 0 0 auto;
    gap: 4px;
    font-size: 11px;
    margin-left: 4px;
}
.canvas-bottom-toolbar .canvas-size-group label {
    display: inline-flex;
    align-items: center;
    gap: 2px;
}
.canvas-bottom-toolbar .canvas-size-input {
    width: 70px;
    padding: 2px 4px;
    border-radius: 6px;
    border: none;
    outline: none;
    font-size: 11px;
    background: rgba(255,255,255,0.12);
    color: #fff;
}
.canvas-bottom-toolbar .canvas-size-input:focus {
    outline: 1px solid rgba(255,255,255,0.6);
}

/* Context menu chuột phải */
.builder-context-menu {
    position: fixed;
    min-width: 210px;
    background: #fff;
    border: 1px solid #cfd4da;
    box-shadow: 0 6px 18px rgba(0,0,0,0.18);
    border-radius: 6px;
    z-index: 10000;
    font-size: 12.5px;
    color: #1f2937;
}
.builder-context-menu ul {
    list-style: none;
    margin: 0;
    padding: 4px 0;
}
.builder-context-menu li {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 5px 12px;
    line-height: 18px;
    cursor: pointer;
    white-space: nowrap;
}
.builder-context-menu li:hover:not(.cm-disabled):not(.cm-label):not(.cm-sep),
.builder-context-menu li.cm-open {
    background: #e8f4fd;
}
.builder-context-menu .cm-key,
.builder-context-menu .cm-arrow {
    color: #6b7280;
    font-size: 11px;
}
.builder-context-menu li.cm-sep {
    height: 1px;
    padding: 0;
    margin: 4px 0;
    background: #e0e0e0;
    cursor: default;
}
.builder-context-menu li.cm-disabled {
    color: #9ca3af;
    cursor: default;
}
.builder-context-menu li.cm-label {
    padding: 4px 12px;
    font-weight: 600;
    font-size: 11px;
    color: #0f75bd;
    background: #f5f7f9;
    cursor: default;
}
.builder-context-menu .cm-sub {
    display: none;
    position: absolute;
    left: 100%;
    top: -5px;
    min-width: 190px;
    max-height: calc(100vh - 16px);
    overflow-y: auto;
    background: #fff;
    border: 1px solid #cfd4da;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.18);
}
.builder-context-menu li.cm-open > .cm-sub {
    display: block;
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
    <link href="../Content/builder-props.css?v=20261146" rel="stylesheet" />

</head>

<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />

        <!-- Header: hiển thị trạng thái đang chỉnh sửa -->
        <header class="builder-header">
            <div class="bh-left">
                <a class="bh-home" href="/Home" title="Về trang chủ"><i class="bi bi-house-door"></i></a>
                <div class="bh-doc">
                    <div class="bh-doc-line">
                        <span id="lblDesignName" class="bh-name">Chưa đặt tên</span>
                        <span id="lblSaveState" class="bh-save-state" style="display:none;"></span>
                    </div>
                    <div class="bh-sub"><span id="lblDesignMode">Thiết kế mới</span></div>
                </div>
            </div>
            <div class="bh-actions">
                <div class="bh-split">
                    <button type="button" class="bh-btn bh-btn-primary" id="btnSaveDesign" title="Lưu thiết kế (Ctrl+S)">
                        <i class="bi bi-cloud-upload"></i><span class="bh-text">Lưu</span>
                    </button>
                    <button type="button" class="bh-btn bh-btn-primary bh-btn-caret" id="btnSaveMore" title="Lựa chọn lưu khác" aria-haspopup="true" aria-expanded="false">
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <ul class="bh-menu" id="saveMenu">
                        <li data-cmd="save-as">Lưu thành bản mới…<span class="bh-menu-key">Ctrl+Shift+S</span></li>
                        <li data-cmd="save-info">Đổi tên, dự án, chia sẻ…</li>
                        <li class="bh-menu-sep"></li>
                        <li data-cmd="versions">Lịch sử phiên bản…</li>
                        <li data-cmd="compare-baseline">So với bản gốc</li>
                        <li class="bh-menu-sep"></li>
                        <li data-cmd="submit-template">Gửi làm mẫu chung…</li>
                        <li data-cmd="template-requests">Mẫu đã gửi và thư viện chung</li>
                    </ul>
                </div>
                <button type="button" class="bh-btn bh-btn-icon" id="btnUndo" title="Hoàn tác (Ctrl+Z)" disabled><i class="bi bi-arrow-counterclockwise"></i></button>
                <button type="button" class="bh-btn bh-btn-icon" id="btnRedo" title="Làm lại (Ctrl+Y)" disabled><i class="bi bi-arrow-clockwise"></i></button>
                <span class="bh-sep"></span>
                <button type="button" class="bh-btn" id="btnStandardScreens" title="Bắt đầu từ một màn hình chuẩn của HRM">
                    <i class="bi bi-collection"></i><span class="bh-text">Màn hình chuẩn</span>
                </button>
                <button type="button" class="bh-btn" id="btnCaptureHrm" title="Chụp một màn hình bất kỳ đang mở trong HRM thành control">
                    <i class="bi bi-camera"></i><span class="bh-text">Chụp từ HRM</span>
                </button>
                <span class="bh-sep"></span>
                <button type="button" class="bh-btn" id="btnPreview" title="Xem trước thiết kế">
                    <i class="bi bi-eye"></i><span class="bh-text">Xem trước</span>
                </button>
                <div class="bh-split">
                    <button type="button" class="bh-btn" id="btnExportImage" title="Tải cả thiết kế thành tệp ảnh PNG">
                        <i class="bi bi-image"></i><span class="bh-text">Xuất ảnh</span>
                    </button>
                    <button type="button" class="bh-btn bh-btn-caret" id="btnExportMore" title="Lựa chọn xuất khác" aria-haspopup="true" aria-expanded="false">
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <ul class="bh-menu bh-menu-right" id="exportMenu">
                        <li data-cmd="export-selection">Tải ảnh vùng đang chọn</li>
                        <li data-cmd="copy-all">Chép ảnh cả trang vào clipboard</li>
                        <li data-cmd="copy-selection">Chép ảnh vùng đang chọn vào clipboard</li>
                        <li data-cmd="spec-table">Bảng mô tả field cho SRS…</li>
                    </ul>
                </div>
            </div>
            <div class="bh-right">
                <label class="bh-check" title="Hiện khung nét đứt quanh từng field để dễ kéo thả">
                    <input type="checkbox" id="chkShowBorders" checked />
                    Hiện khung field
                </label>
                <span class="bh-user" title="Tài khoản đang đăng nhập">
                    <i class="bi bi-person-circle"></i> <strong><%: (string)Session["UiUserName"] ?? "" %></strong>
                </span>
            </div>
        </header>

        <div class="builder-wrapper">

            <!-- Toolbox -->
            <aside class="toolbox">
                <div class="toolbox-toggle" id="toolboxToggle"></div>
                <div class="tool-search">
                    <input type="text" id="toolSearch" placeholder="Tìm control..." autocomplete="off" />
                    <div class="tool-hint">Kéo vào vùng thiết kế, hoặc bấm để thêm nhanh. Bấm đúp vào chữ trên control để sửa tại chỗ.</div>
                    <div class="tool-empty" id="toolSearchEmpty" style="display:none;">Không có control nào khớp.</div>
                </div>
                <!-- GROUP: Controls -->
                <div class="tool-group" data-group="controls">
                    <div class="tool-group-header">
                        <span class="tgh-title">Lưới và popup</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="tool-item" data-control="grid">🟦 Core - GridView </div>
                        <div class="tool-item tool-ess" data-control="ess-grid" data-ui="ess">🟦 ESS - GridView </div>
                        <div class="tool-item" data-control="popup">🟪 Popup Form</div>
                        <div class="tool-item" data-control="screen:core-popup-select-organization-single" title="Popup Select Organization Structure chọn một đơn vị (Add New Employee, Transactions).">🟪 Popup Select Organization (chọn một)</div>
                        <div class="tool-item" data-control="screen:core-popup-select-organization-multi" title="Popup Select Organization Structure chọn nhiều đơn vị, có ô Include Sub-Unit (ô lọc của báo cáo).">🟪 Popup Select Organization (chọn nhiều)</div>
                        <div class="tool-item" data-control="screen:core-popup-organization-structure" title="Popup Organization Structure có Save, Cancel và cột Auto Apply (Shift, Map to Unit).">🟪 Popup Organization Structure (Map to Unit)</div>
                    </div>
                </div>

                <div class="tool-group" data-group="annot">
                    <div class="tool-group-header">
                        <span class="tgh-title">Đánh dấu</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="tool-item" data-control="annot-box" title="Kéo vào vùng thiết kế để khoanh một vùng. Hoặc bấm chuột phải lên control rồi chọn Khoanh đỏ.">⭕ Khoanh đỏ</div>
                        <div class="tool-item" data-control="annot-highlight" title="Kéo vào vùng thiết kế để tô vàng một vùng. Hoặc bấm chuột phải lên control rồi chọn Bôi vàng.">🟨 Bôi vàng</div>
                        <div class="tool-item" data-control="annot-note" title="Kéo vào vùng thiết kế để thêm ghi chú. Bấm đúp vào ghi chú để gõ chữ.">📝 Ghi chú</div>
                    </div>
                </div>

                <!-- GROUP: Core controls -->
                <div class="tool-group" data-group="core">
                    <div class="tool-group-header">
                        <span class="tgh-title">Control Core</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="tool-item" data-control="field-button"  data-ui="core">Button</div>
                        <div class="tool-item" data-control="field-checkbox" data-ui="core">Checkbox</div>
                        <div class="tool-item" data-control="field-combo"   data-ui="core">Combobox</div>
                        <div class="tool-item" data-control="field-multiselect" data-ui="core">Multi-select Dropdown</div>
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
                        <span class="tgh-title">Control ESS</span>
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
                        <div class="tool-item tool-ess" data-control="collapsible-section" data-ui="ess">ESS Section</div>
                    </div>
                </div>

                <!-- GROUP: Special controls -->
                <div class="tool-group" data-group="special">
                    <div class="tool-group-header">
                        <span class="tgh-title">Control đặc biệt</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="tool-item" data-control="field-language" data-ui="core">🌐 Language combo</div>
                        <div class="tool-item" data-control="toolbar">☰ Toolbar menu</div>
                        <div class="tool-item" data-control="tabpage">📑 Tab page</div>
                        <div class="tool-item" data-control="field-tree" data-ui="core" title="Cây cha - con kiểu Organization Structure của Core. Bấm nút + / - trên cây để đóng hoặc mở một nhánh.">🌳 Tree (cây cha - con)</div>
                    </div>
                </div>

                <!-- GROUP: Template controls -->
                <div class="tool-group" data-group="template">
                    <div class="tool-group-header">
                        <span class="tgh-title">Control mẫu đã lưu</span>
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

                <!-- GROUP: Thư viện component / trang (dùng lại thiết kế của BA khác) -->
                <div class="tool-group" data-group="library">
                    <div class="tool-group-header">
                        <span class="tgh-title">Thư viện (component / trang)</span>
                        <button type="button" class="tgh-btn" aria-label="Toggle">
                            <i class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                    <div class="tool-group-body">
                        <div class="lib-search">
                            <input type="text" id="libSearch" placeholder="Tìm theo tên..." autocomplete="off" />
                            <a href="javascript:void(0)" id="libRefresh" title="Tải lại">↻</a>
                        </div>
                        <div id="libList">
                            <span style="font-size:12px;color:#999;">Đang tải thư viện...</span>
                        </div>
                    </div>
                </div>
            </aside>



            <!-- Khu vực giữa: Canvas + JSON -->
            <main class="center-pane json-collapsed">
                <!-- Canvas Editable -->
                <section class="canvas-shell">
                    <div class="canvas-ruler-h"></div>
                    <div class="canvas-ruler-v"></div>

                    <div id="canvas" class="canvas-area">
                        <div id="canvas-zoom-inner" class="canvas-zoom-inner">
                        </div>
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
                <span class="pt-text">Thuộc tính</span>
            </div>

            <div class="prop-main">
                <div class="prop-tabs">
                    <button type="button" class="prop-tab prop-tab-active" data-tab="props">Thuộc tính</button>
                    <button type="button" class="prop-tab" data-tab="layers">Danh sách control</button>
                </div>

                <div id="propPanel" class="prop-tab-body prop-body-active"></div>

                <div id="outlinePanel" class="prop-tab-body">
                    <!-- builder.updateOutline sẽ đổ nội dung "Layers" vào đây -->
                </div>
            </div>
        </aside>

        </div>

                <!-- Bottom canvas toolbar -->
        <div id="canvasToolbar" class="canvas-bottom-toolbar">
            <!-- Zoom -->
            <button type="button" data-cmd="zoom-out" title="Thu nhỏ (Ctrl+-)">–</button>

            <select id="zoomSelect" class="zoom-select" title="Mức phóng to">
                <!-- Dòng đầu là "current" – JS sẽ update % tự động -->
                <option value="custom" data-role="current">100%</option>
                <option value="fit">Vừa màn hình</option>
                <option value="fit-width">Vừa chiều rộng</option>
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1">100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
                <option value="3">300%</option>
                <option value="4">400%</option>
            </select>

            <button type="button" data-cmd="zoom-in" title="Phóng to (Ctrl++)">+</button>
            <button type="button" data-cmd="zoom-reset" title="Về 100% (Ctrl+0)">100%</button>
            <button type="button" data-cmd="zoom-fit" title="Thu phóng để thấy toàn bộ thiết kế">Vừa màn hình</button>
            <button type="button" data-cmd="toggle-panels" title="Ẩn hoặc hiện Toolbox và phần thuộc tính (Ctrl+\)">◧</button>
            <span class="tb-ref" id="refImageTools" style="display:none;">
                <button type="button" id="btnRefImage" title="Ảnh gốc đã nhận dạng. Bấm để đổi: tắt, chồng mờ lên thiết kế, chỉ hiện ảnh gốc.">Ảnh gốc</button>
                <button type="button" id="btnRefImageDrop" title="Bỏ ảnh gốc đang giữ">×</button>
            </span>

            <span class="tb-sep"></span>

            <!-- Align -->
            <button type="button" title="Căn trái (Alt+←)" data-cmd="align-left">⭰</button>
            <button type="button" title="Căn phải (Alt+→)" data-cmd="align-right">⭲</button>
            <button type="button" title="Căn trên (Alt+↑)" data-cmd="align-top">⭱</button>
            <button type="button" title="Căn dưới (Alt+↓)" data-cmd="align-bottom">⭳</button>

            <span class="tb-sep"></span>

            <!-- Distribute -->
            <button type="button" title="Giãn đều theo chiều ngang (Alt+Shift+H)" data-cmd="distribute-h">⇄</button>
            <button type="button" title="Giãn đều theo chiều dọc (Alt+Shift+V)" data-cmd="distribute-v">⇅</button>

            <span class="tb-sep"></span>

            <!-- Duplicate / Delete -->
            <button type="button" title="Nhân bản (Ctrl+D)" data-cmd="duplicate">⧉</button>
            <button type="button" title="Xóa (Del)" data-cmd="delete">⌫</button>

            <span class="tb-sep"></span>

            <!-- Canvas size -->
            <div class="canvas-size-group" title="Kích thước vùng thiết kế (px)">
                <span>Vùng vẽ</span>
                <label>W
                    <input type="number" id="canvasWidthInput" class="canvas-size-input" min="800" max="10000" />
                </label>
                <label>H
                    <input type="number" id="canvasHeightInput" class="canvas-size-input" min="600" max="10000" />
                </label>
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
        initTopBar();
        initToolboxSearch();
    });

    function initTopBar() {
        function closeMenus() {
            $(".builder-header .bh-menu").removeClass("is-open");
            $(".builder-header .bh-btn-caret").attr("aria-expanded", "false");
        }

        function bindMenu($more, $menu, run) {
            $more.on("click", function () {
                var open = !$menu.hasClass("is-open");
                closeMenus();
                $menu.toggleClass("is-open", open);
                $more.attr("aria-expanded", open ? "true" : "false");
            });
            $menu.on("click", "li[data-cmd]", function () {
                closeMenus();
                run($(this).attr("data-cmd"));
            });
        }

        $("#btnSaveDesign").on("click", function () { builder.savePageToServer(); });
        bindMenu($("#btnSaveMore"), $("#saveMenu"), function (cmd) {
            if (cmd === "versions") builderVersions.open();
            else if (cmd === "compare-baseline") builderVersions.compareBaseline();
            else if (cmd === "submit-template") builderReview.openSubmit();
            else if (cmd === "template-requests") window.open("/TemplateRequests", "_blank");
            else builder.savePageToServer(cmd === "save-as" ? { saveAs: true } : { editInfo: true });
        });
        bindMenu($("#btnExportMore"), $("#exportMenu"), function (cmd) {
            if (cmd === "export-selection") builder.exportImage({ selection: true });
            else if (cmd === "copy-all") builder.exportImage({ copy: true });
            else if (cmd === "copy-selection") builder.exportImage({ selection: true, copy: true });
            else if (cmd === "spec-table") builderSpec.open();
        });
        $(document).on("mousedown", function (e) {
            if (!$(e.target).closest(".bh-split").length) closeMenus();
        });
        $(document).on("keydown", function (e) {
            if (e.key === "Escape") closeMenus();
        });

        $("#btnUndo").on("click", function () { builder.undo(); });
        $("#btnRedo").on("click", function () { builder.redo(); });
        $("#btnStandardScreens").on("click", function () { builderTemplates.openGallery(); });
        $("#btnCaptureHrm").on("click", function () { builderTemplates.openCapture(); });
        $("#btnPreview").on("click", function () { builder.showPreview(); });
        $("#btnExportImage").on("click", function () { builder.exportImage(); });
    }

    function initToolboxSearch() {
        var $search = $("#toolSearch");

        $search.on("input", function () {
            var query = $.trim($search.val()).toLowerCase();
            var found = false;
            $(".toolbox .tool-group").each(function () {
                var $group = $(this);
                var shown = 0;
                $group.find(".tool-item").each(function () {
                    var match = !query || $(this).text().toLowerCase().indexOf(query) >= 0;
                    $(this).toggle(match);
                    if (match) shown++;
                });
                $group.toggle(!query || shown > 0).toggleClass("tool-group-searching", !!query);
                if (shown) found = true;
            });
            $("#toolSearchEmpty").toggle(!!query && !found);
        });
        $search.on("keydown", function (e) {
            if (e.key === "Escape") $search.val("").trigger("input");
            if (e.key === "Enter") e.preventDefault();
        });
    }

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
                $target.closest('.prop-tab').length > 0) {
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

        // Toggle JSON - mặc định đóng (json-collapsed)
        $("#jsonToggle").on("click", function () {
            $center.toggleClass("json-collapsed");
            // Cập nhật ruler sau khi layout thay đổi
            if (window.builder && typeof window.builder.updateRulers === "function") {
                setTimeout(function() {
                    window.builder.updateRulers();
                }, 100);
            }

            var $icon = $(this).find(".jt-icon");
            if ($center.hasClass("json-collapsed")) {
                $icon.text("▼");    // đang gập (mũi tên xuống để mở)
            } else {
                $icon.text("▲");    // đang mở (mũi tên lên để đóng)
            }
        });
        
        // ✅ Đảm bảo icon ban đầu đúng với trạng thái collapsed
        if ($center.hasClass("json-collapsed")) {
            $("#jsonToggle .jt-icon").text("▼");
        }

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
            var $check = $("#chkShowBorders");
            var storageKey = "builderShowFieldBorders";
            var stored = null;
            try { stored = window.localStorage.getItem(storageKey); } catch (e) { stored = null; }
            if (stored === "0") {
                $check.prop("checked", false);
                $body.addClass("hide-field-borders");
            }
            $check.on("change", function () {
                var show = $(this).is(":checked");
                // nếu không show thì thêm class ẩn border
                $body.toggleClass("hide-field-borders", !show);
                try { window.localStorage.setItem(storageKey, show ? "1" : "0"); } catch (e) { }
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
    /* Thư viện component / trang */
    .lib-search { display:flex; gap:6px; align-items:center; margin-bottom:6px; }
    .lib-search input { flex:1; padding:3px 6px; font-size:12px; border:1px solid #ccc; border-radius:3px; box-sizing:border-box; }
    .lib-search a { font-size:14px; text-decoration:none; color:#0F75BD; cursor:pointer; }
    #libList .lib-title { font-size:11px; font-weight:600; color:#555; margin:8px 0 4px; text-transform:uppercase; }
    #libList .lib-empty { font-size:12px; color:#999; }
    #libList .lib-item { border:1px solid #ddd; border-radius:3px; padding:4px 6px; margin-bottom:4px; background:#fff; font-size:12px; }
    #libList .lib-name { word-break:break-word; }
    #libList .lib-badge { margin-left:6px; font-size:10px; color:#0F75BD; border:1px solid #0F75BD; border-radius:8px; padding:0 5px; }
    #libList .lib-actions { margin-top:3px; font-size:11px; }
    #libList .lib-actions a { margin-right:10px; color:#0F75BD; cursor:pointer; }
    #libList .lib-actions a.lib-del { color:#c00; }

    /* ========== GROUP VISUAL INDICATORS ========== */
    /* Border màu xanh cho grouped controls */
    /* QUAN TRỌNG: KHÔNG thay đổi position để tránh làm nhảy vị trí controls */
    /* box-shadow không làm thay đổi kích thước của element, chỉ là visual effect */
    .canvas-control-grouped,
    .page-field-grouped,
    .popup-field-grouped,
    .popup-design-grouped,
    .ess-grid-control-grouped {
        /* CHỈ thêm box-shadow, KHÔNG thay đổi position */
        box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.4) !important;
    }

    /* Badge hiển thị số lượng controls trong group */
    .group-badge {
        position: absolute;
        top: -10px;
        right: -10px;
        min-width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
        color: #fff;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 10000;
        pointer-events: none; /* Không chặn click vào control */
        border: 2px solid #fff;
        line-height: 1;
    }
    
    /* ✅ Ẩn badge khi preview hoặc export */
    .preview-mode .group-badge,
    .export-mode .group-badge {
        display: none !important;
    }

    /* Highlight khi chọn một control trong group */
    .group-highlight {
        box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.6) !important;
        animation: groupPulse 1.5s ease-in-out infinite;
    }

    @keyframes groupPulse {
        0%, 100% {
            box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.6);
        }
        50% {
            box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.3);
        }
    }

    /* Tooltip khi hover vào badge */
    .group-badge:hover::after {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        background: #333;
        color: #fff;
        font-size: 11px;
        white-space: nowrap;
        border-radius: 4px;
        margin-bottom: 4px;
        pointer-events: none;
    }
    </style>

</body>

</html>
