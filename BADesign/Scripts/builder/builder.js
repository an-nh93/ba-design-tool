var builderServiceUrl = "/Pages/Builder.aspx";
var builderEditBaseUrl = "/Builder";

var builder = {
    controls: [],
    selectedControlId: null,
    selectedControlType: null,
    currentDesignInfo: null,
    dragHintEl: null,
    smartGuideVEl: null,
    smartGuideHEl: null,
    smartGuideLabelEl: null,
    smartGuideThreshold: 5,   // sai số tối đa (px) để coi như “trùng”

    // ===== NEW: history + zoom/pan + snap + copyStyle + clipboard + marquee =====
    history: [],
    historyIndex: -1,
    _suppressHistory: false,

    viewScale: 1,
    canvasTranslateX: 0,
    canvasTranslateY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panStartTranslateX: 0,
    panStartTranslateY: 0,
    isSpaceDown: false,

    snapEnabled: true,
    snapStep: 5,

    copiedStyle: null,
    clipboardControls: null,  // copy/paste control
    groups: {},  // ✅ Groups: lưu thông tin các groups {groupId: {id, left, top, width, height, controlIds}}
    // marquee
    isMarquee: false,
    marqueeStartX: 0,
    marqueeStartY: 0,
    marqueeRectEl: null,
    sizeHintEl: null,
    _dragSelectionIds: null,
    _dragSelectionStart: null,
    _dragSelectionDxTotal: 0,
    _dragSelectionDyTotal: 0,

    isGridColumnResizing: false,

    // Canvas logical size (px) - dùng cho control dưới toolbar
    canvasWidth: null, // Sẽ được tính toán dựa trên viewport khi khởi tạo
    canvasHeight: null, // Sẽ được tính toán dựa trên viewport khi khởi tạo

    // Ưu tiên dán control nếu vừa copy control trong app (TTL = 20s)
    lastCopyKind: null,         // 'control' | null
    lastCopyAt: 0,
    lastCopyTTL: 20000,         // 20s (đúng 20 giây)
    singleUseControlPaste: true, // Dán xong thì tự clear app clipboard (tuỳ chọn)

    markCopied: function (kind) {
        this.lastCopyKind = kind;
        this.lastCopyAt = Date.now();
    },
    shouldPreferAppPaste: function () {
        console.log("shouldPreferAppPaste", this.lastCopyKind, this.clipboardControls && this.clipboardControls.length, (Date.now() - this.lastCopyAt), this.lastCopyAt, this.lastCopyTTL);
        return this.lastCopyKind === 'control'
            && this.clipboardControls && this.clipboardControls.length
            && (Date.now() - this.lastCopyAt) <= this.lastCopyTTL;
    },
    clearAppClipboard: function () {
        this.clipboardControls = null;
        this.lastCopyKind = null;
        this.lastCopyAt = 0;
    }, 

    // Thử ghi đè clipboard hệ điều hành (nếu browser cho phép)
    clearSystemClipboard: function () {
        try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('').catch(function (ex) {
                    console.warn('Cannot clear system clipboard:', ex);
                });
            }
        } catch (ex) {
            console.warn('Clipboard API not available:', ex);
        }
    },

    hitTestPopupPoint: function (clientX, clientY) {
        // ✅ CÁCH 1: Dùng elementFromPoint để tìm element tại vị trí drop
        var el = document.elementFromPoint(clientX, clientY);
        console.log("hitTestPopupPoint: elementFromPoint returned:", el ? (el.tagName + "." + el.className) : "null", "at", clientX, clientY);
        
        if (el) {
            // Check xem element có phải popup không
            if ($(el).hasClass('popup-design')) {
                var popupId = $(el).attr("data-id");
                console.log("hitTestPopupPoint: ✅ Found popup directly:", popupId);
                return popupId;
            }
            
            // Check xem element có nằm trong popup không (popup-body, popup-header, etc.)
            var $popup = $(el).closest('.popup-design');
            if ($popup.length) {
                var popupId = $popup.attr("data-id");
                console.log("hitTestPopupPoint: ✅ Found popup via closest:", popupId, "element:", el.tagName);
                return popupId;
            }
        }
        
        // ✅ CÁCH 2: Check tất cả popups xem có popup nào chứa drop point không
        // Đây là cách chính xác nhất vì không phụ thuộc vào elementFromPoint
        var hit = null;
        var allPopups = $(".popup-design");
        var closestPopup = null;
        var closestDistance = Infinity;

        console.log("hitTestPopupPoint: Checking", allPopups.length, "popups at", clientX, clientY);

        allPopups.each(function () {
            var $p = $(this);
            var pid = $p.attr("data-id");
            var r = this.getBoundingClientRect();

            // Kiểm tra xem popup có visible không
            var isVisible = $p.is(":visible") && $p.css("display") !== "none";
            if (!isVisible) return; // Skip invisible popups
            
            // ✅ Tính toán với tolerance lớn hơn để bù cho các edge cases
            // Tolerance 50px để đảm bảo detect được ngay cả khi drop gần border
            var tolerance = 50;
            var inside = (clientX >= (r.left - tolerance) && 
                         clientX <= (r.right + tolerance) && 
                         clientY >= (r.top - tolerance) && 
                         clientY <= (r.bottom + tolerance));
            
            if (inside) { 
                // Tính khoảng cách từ drop point đến center của popup
                var centerX = r.left + r.width / 2;
                var centerY = r.top + r.height / 2;
                var distance = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPopup = pid;
                }
            }
        });

        if (closestPopup) {
            hit = closestPopup;
            console.log("hitTestPopupPoint: ✅ Found popup", hit, "at", clientX, clientY, "distance:", closestDistance.toFixed(2));
        } else {
            console.log("hitTestPopupPoint: ❌ No popup found at", clientX, clientY, "Total popups:", allPopups.length);
            // ✅ Debug: In ra tất cả popup rects để so sánh
            allPopups.each(function() {
                var r = this.getBoundingClientRect();
                var $p = $(this);
                var isVisible = $p.is(":visible") && $p.css("display") !== "none";
                console.log("  - Popup", $p.attr("data-id"), "visible:", isVisible, "rect:", r.left, r.top, r.right, r.bottom, "size:", r.width, "x", r.height);
            });
        }
        return hit;
    },

    hitTestPopup: function (rect) {
        if (!rect) return null;
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        return this.hitTestPopupPoint(cx, cy);
    },

    // ✅ Convert clientX/clientY về tọa độ canvas
    clientToCanvasPoint: function (clientX, clientY) {
        var canvasEl = document.getElementById("canvas");
        if (!canvasEl) return { x: clientX, y: clientY };
        
        var r = canvasEl.getBoundingClientRect();
        var scale = (this.viewScale && this.viewScale > 0) ? this.viewScale : 1;
        
        var x = (clientX - r.left + canvasEl.scrollLeft) / scale;
        var y = (clientY - r.top + canvasEl.scrollTop) / scale;
        
        return { x: x, y: y };
    },

    // ✅ Tìm popup chứa drop point (dùng tọa độ canvas)
    // Nếu không tìm thấy popup chứa drop point, tìm popup gần nhất (trong khoảng cách cho phép)
    findPopupAtCanvasPoint: function (canvasX, canvasY) {
        var best = null;
        var bestDistance = Infinity;
        var self = this;
        var maxDistance = 200; // Khoảng cách tối đa để coi như "drop vào popup"

        // Duyệt qua tất cả popup DOM elements thay vì config
        $(".popup-design").each(function() {
            var $popup = $(this);
            var popupId = $popup.attr("data-id");
            if (!popupId) return;
            
            // Lấy tọa độ viewport của popup
            var popupRect = this.getBoundingClientRect();
            
            // Convert popup's viewport rect về canvas coordinates
            var canvasEl = document.getElementById("canvas");
            if (!canvasEl) return;
            
            var canvasRect = canvasEl.getBoundingClientRect();
            var scale = (self.viewScale && self.viewScale > 0) ? self.viewScale : 1;
            
            // Convert popup's viewport position về canvas position
            var popupCanvasLeft = (popupRect.left - canvasRect.left + canvasEl.scrollLeft) / scale;
            var popupCanvasTop = (popupRect.top - canvasRect.top + canvasEl.scrollTop) / scale;
            var popupCanvasRight = popupCanvasLeft + (popupRect.width / scale);
            var popupCanvasBottom = popupCanvasTop + (popupRect.height / scale);
            var popupCenterX = popupCanvasLeft + (popupRect.width / scale) / 2;
            var popupCenterY = popupCanvasTop + (popupRect.height / scale) / 2;

            // Tính khoảng cách từ drop point đến center của popup
            var distance = Math.sqrt(Math.pow(canvasX - popupCenterX, 2) + Math.pow(canvasY - popupCenterY, 2));
            
            // Check xem drop point có nằm trong popup không (với tolerance lớn)
            var tolerance = 100; // Tăng tolerance lên 100px
            var inside = (canvasX >= (popupCanvasLeft - tolerance) && 
                         canvasX <= (popupCanvasRight + tolerance) && 
                         canvasY >= (popupCanvasTop - tolerance) && 
                         canvasY <= (popupCanvasBottom + tolerance));
            
            // Nếu nằm trong popup hoặc gần popup (trong khoảng cách cho phép)
            if (inside || distance < maxDistance) {
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = popupId;
                }
            }
        });

        if (best) {
            console.log("findPopupAtCanvasPoint: ✅ Found popup", best, "at canvas", canvasX, canvasY, "distance:", bestDistance.toFixed(2));
        } else {
            console.log("findPopupAtCanvasPoint: ❌ No popup found at canvas", canvasX, canvasY);
        }
        
        return best;
    },

    // ✅ Tìm popup chứa control bằng cách check bounds (giống findParentContainerFor của field controls)
    // Dùng DOM element thực tế thay vì config để có tọa độ chính xác
    findParentPopupForControl: function (controlCfg) {
        if (!controlCfg) return null;
        
        var left = controlCfg.left || 0;
        var top = controlCfg.top || 0;
        var right = left + (controlCfg.width || 900);
        var bottom = top + (controlCfg.height || 400); // Giả sử height mặc định

        var best = null;
        var bestArea = 0;
        var self = this;

        // Duyệt qua tất cả popup DOM elements thay vì config
        $(".popup-design").each(function() {
            var $popup = $(this);
            var popupId = $popup.attr("data-id");
            if (!popupId) return;
            
            // Lấy tọa độ viewport của popup
            var popupRect = this.getBoundingClientRect();
            
            // Convert popup's viewport rect về canvas coordinates
            var canvasEl = document.getElementById("canvas");
            if (!canvasEl) return;
            
            var canvasRect = canvasEl.getBoundingClientRect();
            var scale = (self.viewScale && self.viewScale > 0) ? self.viewScale : 1;
            
            // Convert popup's viewport position về canvas position
            var popupCanvasLeft = (popupRect.left - canvasRect.left + canvasEl.scrollLeft) / scale;
            var popupCanvasTop = (popupRect.top - canvasRect.top + canvasEl.scrollTop) / scale;
            var popupCanvasRight = popupCanvasLeft + (popupRect.width / scale);
            var popupCanvasBottom = popupCanvasTop + (popupRect.height / scale);

            // Check xem control có nằm trong popup không
            // Dùng tolerance để tránh miss do border
            var tolerance = 50; // Tăng tolerance để dễ detect hơn
            if (left >= (popupCanvasLeft - tolerance) && 
                top >= (popupCanvasTop - tolerance) && 
                right <= (popupCanvasRight + tolerance) && 
                bottom <= (popupCanvasBottom + tolerance)) {
                
                // Chọn popup nhỏ nhất chứa control (giống findParentContainerFor)
                var area = (popupCanvasRight - popupCanvasLeft) * (popupCanvasBottom - popupCanvasTop);
                if (!best || area < bestArea) {
                    bestArea = area;
                    best = popupId;
                }
            }
        });

        if (best) {
            console.log("findParentPopupForControl: ✅ Found popup", best, "for control at", left, top);
        } else {
            console.log("findParentPopupForControl: ❌ No popup found for control at", left, top, "size:", right - left, "x", bottom - top);
        }

        return best;
    },


    // ========= Drag hint =========
    showDragHint: function (x, y) {
        if (!this.dragHintEl) {
            this.dragHintEl = $('<div class="drag-hint">Thả vào vùng canvas</div>')
                .appendTo("body");
        }
        this.dragHintEl.show().css({ left: x, top: y });
    },

    moveDragHint: function (x, y) {
        if (this.dragHintEl) {
            this.dragHintEl.css({ left: x, top: y });
        }
    },

    hasAnySelection: function () {
        return !!(this.selectedControlId || this.getSelectedFieldIds().length);
    },

    hideDragHint: function () {
        if (this.dragHintEl) {
            this.dragHintEl.hide();
        }
    },

    // ========= Init =========
    init: function () {
        var self = this;

        this.initToast();
        this.initContextMenu();
        this.initCanvasToolbar();

        interact('.tool-item').draggable({
            inertia: true,
            autoScroll: true,
            onstart: function (event) {
                document.body.classList.add("ui-dragging");
                $(event.target).addClass("tool-dragging");
                builder.showDragHint(event.clientX, event.clientY);
                // Reset last detected popup
                builder._lastDetectedPopupId = null;
            },
            onmove: function (event) {
                builder.moveDragHint(event.clientX, event.clientY);
                // ✅ Detect popup trong khi drag để lưu lại
                var popupId = builder.hitTestPopupPoint(event.clientX, event.clientY);
                if (popupId) {
                    builder._lastDetectedPopupId = popupId;
                }
            },
            onend: function (event) {
                document.body.classList.remove("ui-dragging");

                var type = event.target.getAttribute("data-control");
                var uiMode = event.target.getAttribute("data-ui") || "core"; // default core

                // ✅ Ưu tiên dùng popup đã detect trong onmove
                var popupId = builder._lastDetectedPopupId;
                
                // ✅ Nếu chưa có, detect lại tại vị trí drop
                if (!popupId) {
                    popupId = builder.hitTestPopupPoint(event.clientX, event.clientY);
                }
                
                // ✅ Nếu vẫn không có, thử detect với một số điểm xung quanh để tránh miss do timing
                if (!popupId) {
                    var offsets = [[0,0], [-5,-5], [5,5], [-10,-10], [10,10]];
                    for (var i = 0; i < offsets.length && !popupId; i++) {
                        popupId = builder.hitTestPopupPoint(
                            event.clientX + offsets[i][0], 
                            event.clientY + offsets[i][1]
                        );
                    }
                }
                
                var dropPoint = { 
                    clientX: event.clientX, 
                    clientY: event.clientY,
                    popupId: popupId // Thêm popupId vào dropPoint để dễ debug
                };
                
                console.log("Builder.onend: type=" + type + ", dropPoint=", dropPoint, ", detectedPopupId=", popupId);

                builder.addControl(type, uiMode, dropPoint);

                event.target.style.transform = "";
                $(event.target).removeClass("tool-dragging");
                builder.hideDragHint();
                builder._lastDetectedPopupId = null; // Reset
            }
        });

        var cid = parseInt($("#hiddenControlId").val() || "0", 10);
        var isClone = ($("#hiddenIsClone").val() === "1");

        if (cid > 0) {
            self.controls = [];
            self._clearCanvasContent();
            $("#propPanel").html(
                "<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>"
            );

            self.loadControlFromServer(cid, isClone);
        } else {
            this.setCurrentDesignInfo(null, false);
            self.loadConfig();   // trang mới dùng JSON cũ (nếu có)
        }
        this.loadTemplateControls();

        // ========= Keyboard shortcuts =========
        $(document).on("keydown", function (e) {
            var tag = (e.target.tagName || "").toUpperCase();
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

            if (e.code === "Space") {
                builder.isSpaceDown = true;
            }

            if (e.key === "Escape") {
                builder.hideContextMenu();
                builder.clearSelection();
                return;
            }

            // --- Zoom: Ctrl+ + / - / 0 ---
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (e.key === "+" || e.key === "=") {
                    e.preventDefault();
                    builder.setZoom(builder.viewScale * 1.1);
                    return;
                }
                if (e.key === "-") {
                    e.preventDefault();
                    builder.setZoom(builder.viewScale * 0.9);
                    return;
                }
                if (e.key === "0") {
                    e.preventDefault();
                    builder.setZoom(1);
                    return;
                }
            }

            // Delete
            if (e.key === "Delete") {
                if ($(".popup-design.popup-selected").length ||
                    $(".popup-field.popup-field-selected").length) {
                    return;
                }

                if (builder.selectedControlId &&
                    builder.selectedControlType &&
                    builder.selectedControlType !== "popup") {
                    builder.deleteSelectedControl();
                    e.preventDefault();
                }
                return;
            }

            // Undo / Redo
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z") {
                builder.undo();
                e.preventDefault();
                return;
            }
            if ((e.ctrlKey && e.key.toLowerCase() === "y") ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z")) {
                builder.redo();
                e.preventDefault();
                return;
            }

            // Duplicate Ctrl+D
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "d") {
                builder.duplicateSelection();
                e.preventDefault();
                return;
            }

            // Group Ctrl+G
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "g") {
                builder.groupSelection();
                e.preventDefault();
                return;
            }

            // Ungroup Ctrl+Shift+G
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
                builder.ungroupSelection();
                e.preventDefault();
                return;
            }

            // Copy control: Ctrl+C
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "c") {
                builder.copySelectionControls();
                e.preventDefault();
                return;
            }

            // Copy style: Ctrl+Alt+C
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "c") {
                builder.copyStyleFromSelection();
                e.preventDefault();
                return;
            }

            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
                e.preventDefault();
                builder.pasteSelectionControls();
                return;
            }

            // Nudge bằng mũi tên: mỗi lần keydown move 1 bước
            // Giữ phím -> browser tự repeat keydown => control di chuyển liên tục
            if (!e.ctrlKey && !e.altKey) {
                if (e.key === "ArrowLeft" ||
                    e.key === "ArrowRight" ||
                    e.key === "ArrowUp" ||
                    e.key === "ArrowDown") {

                    e.preventDefault();

                    // Nếu đang bật snap thì bước phải là bội số của snapStep
                    var baseStep = builder.snapEnabled ? builder.snapStep : 1;
                    // Shift để đi bước to hơn
                    var step = e.shiftKey ? baseStep * 5 : baseStep;

                    var dx = 0, dy = 0;
                    switch (e.key) {
                        case "ArrowLeft": dx = -step; break;
                        case "ArrowRight": dx = step; break;
                        case "ArrowUp": dy = -step; break;
                        case "ArrowDown": dy = step; break;
                    }

                    builder.moveSelectionBy(dx, dy);
                    return;
                }
            }



            // Align: Alt + Arrow
            if (!e.ctrlKey && e.altKey && !e.shiftKey) {
                if (e.key === "ArrowLeft") { builder.alignSelection("left"); e.preventDefault(); return; }
                if (e.key === "ArrowRight") { builder.alignSelection("right"); e.preventDefault(); return; }
                if (e.key === "ArrowUp") { builder.alignSelection("top"); e.preventDefault(); return; }
                if (e.key === "ArrowDown") { builder.alignSelection("bottom"); e.preventDefault(); return; }
            }

            // Distribute: Alt + Shift + H/V
            if (e.altKey && e.shiftKey && !e.ctrlKey) {
                if (e.key.toLowerCase() === "h") { builder.distributeSelection("h"); e.preventDefault(); return; }
                if (e.key.toLowerCase() === "v") { builder.distributeSelection("v"); e.preventDefault(); return; }
            }
        });

        $(document).on("keyup", function (e) {
            if (e.code === "Space") {
                builder.isSpaceDown = false;
            }
        });


        $("#canvas").on("mousedown", function (e) {
            var $t = $(e.target);

            // Right click để context menu xử lý
            if (e.button === 2) return;

            if (builder.isGridColumnResizing) {
                // để DevExtreme tự xử lý resize, không bật marquee
                return;
            }

            // Pan: Space + drag hoặc middle button
            if (builder.isSpaceDown || e.button === 1) {
                e.preventDefault();
                builder.beginPan(e.clientX, e.clientY);
                return;
            }

            // Cho phép quét khối khi click vào vùng trống trong groupbox/section (để chọn nhiều control bên trong)
            var inGroupboxSectionContent = $t.closest(".page-field-groupbox-content, .page-field-section-content").length;
            if (!inGroupboxSectionContent && $t.closest(".page-field, .popup-field, .canvas-toolbar, .canvas-tabpage").length) {
                return;
            }
            // Click vào popup nhưng không phải vùng trống body (vd: header/titlebar) → không marquee
            // Click vào vùng trống .popup-body → CHO PHÉP quét khối chọn control bên trong popup
            if ($t.closest(".popup-design").length && !$t.closest(".popup-body").length) {
                return;
            }

            // ======== ĐẶC BIỆT CHO DevExtreme GRID ========
            // 👉 SỬA Ở ĐÂY: nếu click trong bất kỳ vùng nào của DevExtreme Grid
            // thì cho DevExtreme tự xử lý, KHÔNG vẽ marquee, KHÔNG preventDefault
            if ($t.closest(".dx-datagrid").length) {
                return;
            }

            // Chỉ còn lại: click vùng trống canvas → bật marquee
            if (e.button === 0) {
                e.preventDefault();
                builder.beginMarquee(e);
            }
        });





        // mousemove/mouseup cho pan + marquee
        $(document).on("mousemove", function (e) {
            if (builder.isPanning) {
                builder.updatePan(e.clientX, e.clientY);
            }
            if (builder.isMarquee) {
                builder.updateMarquee(e);
            }
        });

        $(document).on("mouseup", function (e) {
            if (builder.isPanning) {
                builder.endPan();
            }
            if (builder.isMarquee) {
                builder.endMarquee(e);
            }
        });

        // Zoom (Ctrl + wheel)
        $(document).on("wheel", function (e) {
            if (!e.ctrlKey) return;
            e.preventDefault();
            var delta = e.originalEvent.deltaY;
            var factor = delta < 0 ? 1.1 : 0.9;
            var newScale = builder.viewScale * factor;
            builder.setZoom(newScale);
        });

        // Chuột phải trên control/canvas
        $(document).on("contextmenu", ".page-field, .popup-field, .popup-design, .canvas-toolbar, .canvas-tabpage, .canvas-control, #canvas", function (e) {
            e.preventDefault();
            builder.showContextMenu(e, this);
        });


        // click ngoài context menu để ẩn + clear selection khi click vùng trống
        $(document).on("mousedown.builderClearSelection", function (e) {
            var $menu = $("#builderContextMenu");
            if ($menu.length && $menu.is(":visible")) {
                // ✅ Ẩn context menu nếu click vào bất kỳ đâu ngoài menu
                // Bao gồm cả click vào popup-body, canvas, hoặc bất kỳ đâu
                if ($(e.target).closest("#builderContextMenu").length === 0) {
                    builder.hideContextMenu();
                }
            }

            // CHỈ XỬ LÝ CLICK TRÁI
            if (e.button !== 0) return;

            var $t = $(e.target);

            // Nếu click trong context menu / dialog / toast -> bỏ qua
            if ($t.closest("#builderContextMenu, .ub-modal, .ui-toast-container").length) {
                return;
            }

            // ✅ Nếu click vào popup-body (vùng trống trong popup) -> ẩn context menu và clear selection
            if ($t.closest(".popup-body").length) {
                // Kiểm tra xem có click vào control nào không
                if ($t.closest(".canvas-control, .popup-field").length === 0) {
                    // Click vào vùng trống trong popup -> clear selection
                    builder.clearSelection();
                }
                return; // Không xử lý thêm
            }

            // Nếu click trong canvas thì để handler #canvas lo (marquee / pan / v.v.)
            if ($t.closest("#canvas").length) {
                return;
            }

            // Nếu click trong panel Layers:
            if ($t.closest("#outlinePanel").length) {
                // click vào khoảng trắng (không trúng row) => clear
                if ($t.closest(".outline-row").length === 0) {
                    builder.clearSelection();
                }
                return;
            }

            // Nếu click trong panel thuộc tính, toolbar, hoặc splitter thì giữ selection
            if ($t.closest("#propPanel, .canvas-toolbar, #propSplitter, .prop-splitter").length) {
                return;
            }

            // Còn lại (JSON, header, footer, vùng trắng ngoài) → clear selection
            builder.clearSelection();
        });
        $(document).off('paste.builderRouter').on('paste.builderRouter', function (e) {
            var t = e.target || {};
            var tag = (t.tagName || "").toUpperCase();
            var isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || $(t).is("[contenteditable=true]");
            if (isEditable) return;

            // (A) ƯU TIÊN dán control từ app clipboard
            var preferApp = builder.shouldPreferAppPaste() ||
                (builder.clipboardControls && builder.clipboardControls.length && builder.hasAnySelection());

            if (preferApp) {
                e.preventDefault();
                e.stopImmediatePropagation();   // CHẶN các handler paste khác (image, v.v.)

                builder.pasteSelectionControls();

                if (builder.singleUseControlPaste) {
                    builder.clearAppClipboard(); // dán 1 lần rồi clear app-clipboard
                } else {
                    builder.markCopied('control');
                }

                if (builder.clearSystemClipboard) {
                    builder.clearSystemClipboard(); // cố gắng xóa clipboard hệ điều hành
                }
                return;
            }

            // (B) Không ưu tiên app → kiểm tra ảnh trong OS clipboard
            var ev = e.originalEvent || e;
            var cd = ev && (ev.clipboardData || window.clipboardData);
            var hasImage = false;

            if (cd) {
                if (cd.items && cd.items.length) {
                    for (var i = 0; i < cd.items.length; i++) {
                        var it = cd.items[i];
                        if (it && it.kind === 'file' && it.type && it.type.indexOf('image/') === 0) {
                            hasImage = true; break;
                        }
                    }
                }
                if (!hasImage && cd.files && cd.files.length) {
                    for (var j = 0; j < cd.files.length; j++) {
                        var f = cd.files[j];
                        if (f && f.type && f.type.indexOf('image/') === 0) {
                            hasImage = true; break;
                        }
                    }
                }
            }

            if (hasImage) {
                // để control-field.js xử lý paste ảnh
                return;
            }

            // (C) Không có ảnh → nếu còn app clipboard thì dán control
            if (builder.clipboardControls && builder.clipboardControls.length) {
                e.preventDefault();
                e.stopImmediatePropagation();   // chặn handler khác

                builder.pasteSelectionControls();
                if (builder.singleUseControlPaste) builder.clearAppClipboard();

                if (builder.clearSystemClipboard) {
                    builder.clearSystemClipboard();
                }
            }
        });

        this.updateZoomLabel();
    },

    // ========= Zoom / Pan =========
    // Zoom: CHỈ zoom nội dung (#canvas-zoom-inner), KHÔNG zoom vùng chứa (#canvas, rulers).
    // Pan: Space + drag sẽ kéo scrollbar của canvas-shell.
    applyCanvasTransform: function () {
        var $inner = $("#canvas-zoom-inner");
        if (!$inner.length) return;

        // Chỉ scale nội dung (controls), không scale container
        $inner.css("zoom", this.viewScale);
        $inner.css("transform-origin", "0 0");
        $inner.css("transform", "");
    },

    setZoom: function (scale) {
        // Giới hạn min/max
        scale = Math.max(0.3, Math.min(scale, 4));

        this.viewScale = scale;
        this.applyCanvasTransform();
        this.updateZoomLabel();
        // Cập nhật ruler khi zoom thay đổi - delay nhỏ để layout ổn định sau khi zoom
        var self = this;
        this.updateRulers();
        setTimeout(function() {
            self.updateRulers();
        }, 50);
    },

    beginPan: function (x, y) {
        this.isPanning = true;
        this.panStartX = x;
        this.panStartY = y;

        var $shell = $(".canvas-shell");
        this.panStartScrollLeft = $shell.scrollLeft();
        this.panStartScrollTop = $shell.scrollTop();

        document.body.classList.add("ub-pan-active");
    },

    updatePan: function (x, y) {
        if (!this.isPanning) return;

        var dx = x - this.panStartX;
        var dy = y - this.panStartY;

        var $shell = $(".canvas-shell");
        $shell.scrollLeft(this.panStartScrollLeft - dx);
        $shell.scrollTop(this.panStartScrollTop - dy);
    },

    endPan: function () {
        this.isPanning = false;
        document.body.classList.remove("ub-pan-active");
    },


    updateZoomLabel: function () {
        var pct = Math.round(this.viewScale * 100);

        // Nếu còn dùng #zoomLabel đâu đó thì vẫn cập nhật
        var $lbl = $("#zoomLabel");
        if ($lbl.length) {
            $lbl.text(pct + "%");
        }

        // --- đồng bộ combo zoom ---
        var $zoomSelect = $("#zoomSelect");
        if (!$zoomSelect.length) return;

        var matchedValue = null;
        $zoomSelect.find("option").each(function () {
            var v = parseFloat(this.value);
            if (isNaN(v)) return;
            if (Math.round(v * 100) === pct) {
                matchedValue = this.value;
                return false; // break
            }
        });

        if (matchedValue) {
            // % đúng với 1 option chuẩn (50, 75, 100, …)
            $zoomSelect.val(matchedValue);
        } else {
            // Giá trị lẻ: dùng option “current”
            var $cur = $zoomSelect.find("option[data-role='current']");
            if (!$cur.length) {
                $cur = $('<option data-role="current"></option>');
                $zoomSelect.prepend($cur);
            }

            $cur.text(pct + "%");
            // value là scale thực để lần sau chọn lại vẫn chuẩn
            $cur.val(this.viewScale.toFixed(3));

            $zoomSelect.val($cur.val());
        }
    },

    // ========= History =========
    pushHistory: function () {
        if (this._suppressHistory) return;
        var snapshot = JSON.stringify(this.controls || []);
        if (this.history.length && this.history[this.history.length - 1] === snapshot) return;
        this.history.push(snapshot);
        if (this.history.length > 100) {
            this.history.shift();
        }
        this.historyIndex = this.history.length - 1;
    },

    _clearCanvasContent: function () {
        var $inner = $("#canvas-zoom-inner");
        if (!$inner.length) return;
        $inner.empty();
    },

    restoreFromJson: function (json) {
        var arr = [];
        try { arr = JSON.parse(json || "[]"); } catch (e) { console.error(e); }

        this.controls = [];
        var $inner = $("#canvas-zoom-inner");
        $inner.empty();
        this.marqueeRectEl = null; // ✅ Sau Undo/Redo khung quét tạo mới, tránh quét khối không hoạt động
        $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");
        this.hideSizeHint();

        // Sắp xếp theo thứ tự phụ thuộc: parent render trước child (tránh control trong popup/groupbox bị sai vị trí khi Undo)
        var ordered = [];
        var remaining = arr.slice();
        var maxIter = 500;
        while (remaining.length && maxIter-- > 0) {
            var pick = remaining.filter(function (c) {
                if (!c.parentId) return true;
                return ordered.some(function (x) { return x.id === c.parentId; });
            });
            if (!pick.length) break;
            ordered = ordered.concat(pick);
            remaining = remaining.filter(function (c) { return pick.indexOf(c) === -1; });
        }
        if (remaining.length) ordered = ordered.concat(remaining);

        var self = this;
        ordered.forEach(function (cfg) {
            if (cfg.type === "field" && !cfg.uiMode) cfg.uiMode = "core";
            cfg._fromRestore = true; // Để render không convert lại tọa độ popup/groupbox (đã lưu relative)
            if (cfg.type === "grid") {
                controlGrid.renderExisting(cfg);
            } else if (cfg.type === "popup") {
                controlPopup.renderExisting(cfg);
            } else if (cfg.type === "field" && window.controlField && typeof controlField.renderExisting === "function") {
                controlField.renderExisting(cfg);
            } else if (cfg.type === "tabpage" && window.controlTabPage && typeof controlTabPage.renderExisting === "function") {
                controlTabPage.renderExisting(cfg);
            } else if (cfg.type === "toolbar" && window.controlToolbar && typeof controlToolbar.renderExisting === "function") {
                controlToolbar.renderExisting(cfg);
            } else if (cfg.type === "collapsible-section" && window.controlCollapsibleSection && typeof controlCollapsibleSection.renderExisting === "function") {
                controlCollapsibleSection.renderExisting(cfg);
            }
            delete cfg._fromRestore;
            self.controls.push(cfg);
        });

        this._suppressHistory = true;
        this.refreshJson({ skipHistory: true });
        this._suppressHistory = false;
    },

    undo: function () {
        if (this.historyIndex <= 0) return;
        this.historyIndex--;
        var json = this.history[this.historyIndex];
        this.restoreFromJson(json);
    },

    redo: function () {
        if (this.historyIndex >= this.history.length - 1) return;
        this.historyIndex++;
        var json = this.history[this.historyIndex];
        this.restoreFromJson(json);
    },

    // ========= Marquee selection =========
    // Chuyển client (clientX, clientY) sang tọa độ trong #canvas-zoom-inner (có zoom) để khung quét không nhảy khi scroll/zoom
    clientToMarqueeCoords: function (clientX, clientY) {
        var $inner = $("#canvas-zoom-inner");
        if (!$inner.length) return { x: 0, y: 0 };
        var r = $inner[0].getBoundingClientRect();
        var scale = (this.viewScale && this.viewScale > 0) ? this.viewScale : 1;
        return {
            x: (clientX - r.left) / scale,
            y: (clientY - r.top) / scale
        };
    },

    beginMarquee: function (e) {
        this.isMarquee = true;

        var co = this.clientToMarqueeCoords(e.clientX, e.clientY);
        this.marqueeStartX = co.x;
        this.marqueeStartY = co.y;

        var $inner = $("#canvas-zoom-inner");
        if (!this.marqueeRectEl || !$inner.length || !$.contains($inner[0], this.marqueeRectEl[0])) {
            this.marqueeRectEl = $('<div class="builder-selection-rect"></div>').appendTo("#canvas-zoom-inner");
        }
        this.marqueeRectEl
            .show()
            .css({ left: co.x, top: co.y, width: 0, height: 0 });
    },

    updateMarquee: function (e) {
        if (!this.isMarquee || !this.marqueeRectEl) return;

        var co = this.clientToMarqueeCoords(e.clientX, e.clientY);
        var x = co.x;
        var y = co.y;

        var left = Math.min(this.marqueeStartX, x);
        var top = Math.min(this.marqueeStartY, y);
        var width = Math.abs(x - this.marqueeStartX);
        var height = Math.abs(y - this.marqueeStartY);

        this.marqueeRectEl.css({
            left: left,
            top: top,
            width: width,
            height: height
        });
    },

    endMarquee: function (e) {
        if (!this.isMarquee) return;
        this.isMarquee = false;

        var rectEl = this.marqueeRectEl;
        if (!rectEl) return;

        var width = rectEl.width();
        var height = rectEl.height();

        // Nếu quét rất nhỏ coi như click trống → clear selection
        if (width < 3 && height < 3) {
            rectEl.hide();
            this.clearSelection();
            return;
        }

        var selRect = rectEl[0].getBoundingClientRect();
        var ids = [];
        var self = this;

        $("#canvas .page-field, #canvas .popup-field, #canvas .canvas-control").each(function () {
            var elRect = this.getBoundingClientRect();
            var inter = !(
                elRect.right < selRect.left ||
                elRect.left > selRect.right ||
                elRect.bottom < selRect.top ||
                elRect.top > selRect.bottom
            );
            if (inter) {
                var id = $(this).attr("data-id");
                if (id && ids.indexOf(id) < 0) ids.push(id);
            }
        });

        rectEl.hide();

        if (!ids.length) {
            this.clearSelection();
            return;
        }

        // Clear class selected
        $("#canvas .page-field, #canvas .popup-field, #canvas .canvas-control")
            .removeClass("page-field-selected popup-field-selected canvas-control-selected");

        // Gán lại class selected theo từng control
        ids.forEach(function (id) {
            var $el = $('#canvas').find('[data-id="' + id + '"], #' + id);
            if (!$el.length) return;

            var cfg = self.getControlConfig(id);

            // Tất cả control được chọn đều có canvas-control-selected
            $el.addClass("canvas-control-selected");

            // Chỉ field mới gán page/popup-field-selected
            if (cfg && cfg.type === "field") {
                if ($el.hasClass("popup-field")) {
                    $el.addClass("popup-field-selected");
                } else {
                    $el.addClass("page-field-selected");
                }
            }
        });

        // Nếu TẤT CẢ là field thì mới coi selection type = 'field'
        var allFields = ids.every(function (id) {
            var cfg = self.getControlConfig(id);
            return cfg && cfg.type === "field";
        });

        this.selectedControlId = ids[0];
        this.selectedControlType = allFields ? "field" : "multi";

        this.highlightOutlineSelection();
        this.updateSelectionSizeHint();
    },


    // ========= Selection size hint (giống Figma) =========
    ensureSizeHint: function () {
        if (!this.sizeHintEl) {
            this.sizeHintEl = $('<div class="builder-size-hint"></div>')
                .appendTo("body");
        }
        return this.sizeHintEl;
    },


    updateSelectionSizeHint: function () {
        var $els = $();
        var ids = this.getSelectedFieldIds();
        var self = this;

        if (ids.length) {
            ids.forEach(function (id) {
                $els = $els.add($('[data-id="' + id + '"]'));
            });
        } else if (this.selectedControlId) {
            $els = $els.add($('[data-id="' + this.selectedControlId + '"], #' + this.selectedControlId));
        }

        if (!$els.length) {
            this.hideSizeHint();
            return;
        }

        // Tính bounding box theo rect màn hình
        var rect = null;
        $els.each(function () {
            var r = this.getBoundingClientRect();
            if (!rect) {
                rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
            } else {
                rect.left = Math.min(rect.left, r.left);
                rect.top = Math.min(rect.top, r.top);
                rect.right = Math.max(rect.right, r.right);
                rect.bottom = Math.max(rect.bottom, r.bottom);
            }
        });

        if (!rect) {
            this.hideSizeHint();
            return;
        }

        var scale = this.viewScale || 1;

        var width = (rect.right - rect.left) / scale;
        var height = (rect.bottom - rect.top) / scale;

        // Nếu chỉ chọn 1 control → ưu tiên size trong config
        if (ids.length === 1) {
            var cfg = this.getControlConfig(ids[0]);
            if (cfg) {
                if (typeof cfg.width === "number") width = cfg.width;
                if (typeof cfg.height === "number") height = cfg.height;
            }
        }

        // LUÔN làm tròn số để không có số lẻ
        width = Math.round(width);
        height = Math.round(height);

        var $hint = this.ensureSizeHint();
        $hint.text(width + " × " + height);

        // Tâm X ở giữa, Y nằm dưới bottom vài px
        var centerX = rect.left + (rect.right - rect.left) / 2;
        var bottomY = rect.bottom + 6;

        // Lấy kích thước hint để canh giữa thật
        var hintW = $hint.outerWidth() || 0;
        var hintH = $hint.outerHeight() || 0;

        $hint.css({
            left: (centerX - hintW / 2) + "px",
            top: bottomY + "px"
        });

        $hint.show();
    },


    hideSizeHint: function () {
        if (this.sizeHintEl) {
            this.sizeHintEl.hide();
        }
    },

    // ======== SMART GUIDES (giống Figma) ========
    ensureSmartGuideEls: function () {
        if (this.smartGuideVEl) return;
        var $inner = $("#canvas-zoom-inner");
        if (!$inner.length) return;
        this.smartGuideVEl = $('<div class="builder-guide-line builder-guide-v"></div>').appendTo($inner).hide();
        this.smartGuideHEl = $('<div class="builder-guide-line builder-guide-h"></div>').appendTo($inner).hide();
        this.smartGuideLabelEl = $('<div class="builder-guide-label"></div>').appendTo($inner).hide();
    },

    hideSmartGuides: function () {
        if (this.smartGuideVEl) this.smartGuideVEl.hide();
        if (this.smartGuideHEl) this.smartGuideHEl.hide();
        if (this.smartGuideLabelEl) this.smartGuideLabelEl.hide();
    },

    showSmartGuides: function (info) {
        this.ensureSmartGuideEls();

        var v = info.vLine || null;
        var h = info.hLine || null;
        var vs = info.vSpacing || null;
        var hs = info.hSpacing || null;

        // Đường dọc
        if (v) {
            this.smartGuideVEl.show().css({
                left: v.x + "px",
                top: v.y1 + "px",
                height: (v.y2 - v.y1) + "px"
            });
        } else {
            this.smartGuideVEl.hide();
        }

        // Đường ngang
        if (h) {
            this.smartGuideHEl.show().css({
                top: h.y + "px",
                left: h.x1 + "px",
                width: (h.x2 - h.x1) + "px"
            });
        } else {
            this.smartGuideHEl.hide();
        }

        // Label: ưu tiên spacing (khoảng cách). Nếu không có thì ẩn.
        var lbl = null;
        if (vs) {
            lbl = {
                text: Math.round(vs.space) + "",
                x: vs.x,
                y: (vs.y1 + vs.y2) / 2
            };
        } else if (hs) {
            lbl = {
                text: Math.round(hs.space) + "",
                x: (hs.x1 + hs.x2) / 2,
                y: hs.y
            };
        }

        if (lbl) {
            var $lbl = this.smartGuideLabelEl;
            $lbl.text(lbl.text).show();

            var w = $lbl.outerWidth() || 0;
            var hgt = $lbl.outerHeight() || 0;

            $lbl.css({
                left: (lbl.x - w / 2) + "px",
                top: (lbl.y - hgt / 2) + "px"
            });
        } else {
            this.smartGuideLabelEl.hide();
        }
    },

    /**
     * Tính snap + guide cho nhóm field đang kéo.
     * proposedDx/Dy = tổng delta dự kiến sau bước drag này
     * Trả về {dx, dy} để cộng thêm (snap) hoặc null nếu không snap.
     */
    computeSmartGuides: function (proposedDx, proposedDy) {
        var ids = this._dragSelectionIds;
        var startMap = this._dragSelectionStart;
        if (!ids || !ids.length || !startMap) {
            this.hideSmartGuides();
            return null;
        }

        var rect = {
            left: Infinity, top: Infinity,
            right: -Infinity, bottom: -Infinity
        };
        var self = this;

        // Tính bounding box của cả nhóm theo toạ độ config (không lấy DOM)
        ids.forEach(function (id) {
            var st = startMap[id];
            var cfg = self.getControlConfig(id);
            if (!st || !cfg) return;

            var l = (st.left || 0) + proposedDx;
            var t = (st.top || 0) + proposedDy;
            var r = l + (cfg.width || 0);
            var b = t + (cfg.height || 0);

            rect.left = Math.min(rect.left, l);
            rect.top = Math.min(rect.top, t);
            rect.right = Math.max(rect.right, r);
            rect.bottom = Math.max(rect.bottom, b);
        });

        if (!isFinite(rect.left) || !isFinite(rect.top)) {
            this.hideSmartGuides();
            return null;
        }

        rect.cx = (rect.left + rect.right) / 2;
        rect.cy = (rect.top + rect.bottom) / 2;

        var threshold = this.smartGuideThreshold || 5;
        var bestV = null;        // align vertical (x)
        var bestH = null;        // align horizontal (y)
        var bestVSpacing = null; // khoảng cách dọc
        var bestHSpacing = null; // khoảng cách ngang

        (this.controls || []).forEach(function (c) {
            if (!c || ids.indexOf(c.id) >= 0) return;
            if (typeof c.left !== "number" || typeof c.top !== "number") return;

            var left = c.left;
            var top = c.top;
            var right = left + (c.width || 0);
            var bottom = top + (c.height || 0);
            var cx = (left + right) / 2;
            var cy = (top + bottom) / 2;

            // ---- ALIGN THEO TRỤC X (left/center/right) ----
            [
                { value: left, moving: rect.left },
                { value: cx, moving: rect.cx },
                { value: right, moving: rect.right }
            ].forEach(function (cd) {
                var diff = cd.value - cd.moving;
                var ad = Math.abs(diff);
                if (ad <= threshold && (!bestV || ad < bestV.ad)) {
                    bestV = {
                        diff: diff,
                        ad: ad,
                        x: cd.value,
                        y1: Math.min(rect.top, top),
                        y2: Math.max(rect.bottom, bottom)
                    };
                }
            });

            // ---- ALIGN THEO TRỤC Y (top/middle/bottom) ----
            [
                { value: top, moving: rect.top },
                { value: cy, moving: rect.cy },
                { value: bottom, moving: rect.bottom }
            ].forEach(function (cd) {
                var diff = cd.value - cd.moving;
                var ad = Math.abs(diff);
                if (ad <= threshold && (!bestH || ad < bestH.ad)) {
                    bestH = {
                        diff: diff,
                        ad: ad,
                        y: cd.value,
                        x1: Math.min(rect.left, left),
                        x2: Math.max(rect.right, right)
                    };
                }
            });

            // ---- SPACING DỌC (cùng cột, nằm trên hoặc dưới) ----
            var overlapW = Math.min(rect.right, right) - Math.max(rect.left, left);
            if (overlapW > 0) {
                // c nằm phía trên group
                if (bottom <= rect.top) {
                    var space = rect.top - bottom;
                    if (!bestVSpacing || space < bestVSpacing.space) {
                        bestVSpacing = {
                            space: space,
                            x: (Math.max(rect.left, left) + Math.min(rect.right, right)) / 2,
                            y1: bottom,
                            y2: rect.top
                        };
                    }
                }
                // c nằm phía dưới group
                else if (top >= rect.bottom) {
                    var space2 = top - rect.bottom;
                    if (!bestVSpacing || space2 < bestVSpacing.space) {
                        bestVSpacing = {
                            space: space2,
                            x: (Math.max(rect.left, left) + Math.min(rect.right, right)) / 2,
                            y1: rect.bottom,
                            y2: top
                        };
                    }
                }
            }

            // ---- SPACING NGANG (cùng hàng, nằm trái/phải) ----
            var overlapH = Math.min(rect.bottom, bottom) - Math.max(rect.top, top);
            if (overlapH > 0) {
                // c nằm bên trái
                if (right <= rect.left) {
                    var spaceH = rect.left - right;
                    if (!bestHSpacing || spaceH < bestHSpacing.space) {
                        bestHSpacing = {
                            space: spaceH,
                            y: (Math.max(rect.top, top) + Math.min(rect.bottom, bottom)) / 2,
                            x1: right,
                            x2: rect.left
                        };
                    }
                }
                // c nằm bên phải
                else if (left >= rect.right) {
                    var spaceH2 = left - rect.right;
                    if (!bestHSpacing || spaceH2 < bestHSpacing.space) {
                        bestHSpacing = {
                            space: spaceH2,
                            y: (Math.max(rect.top, top) + Math.min(rect.bottom, bottom)) / 2,
                            x1: rect.right,
                            x2: left
                        };
                    }
                }
            }
        });

        // Tính delta snap
        var dxSnap = bestV ? bestV.diff : 0;
        var dySnap = bestH ? bestH.diff : 0;

        if (!bestV && !bestH && !bestVSpacing && !bestHSpacing) {
            this.hideSmartGuides();
        } else {
            this.showSmartGuides({
                vLine: bestV ? { x: bestV.x, y1: bestV.y1, y2: bestV.y2 } : null,
                hLine: bestH ? { y: bestH.y, x1: bestH.x1, x2: bestH.x2 } : null,
                vSpacing: bestVSpacing,
                hSpacing: bestHSpacing
            });
        }

        if (!bestV && !bestH) {
            // không snap, chỉ hiển thị khoảng cách
            return null;
        }

        return { dx: dxSnap, dy: dySnap };
    },



    // ========= Align / Distribute / Move / Duplicate / Copy style =========
    getSelectedFieldIds: function () {
        var self = this;

        // Lấy id từ DOM (chỉ các field đã được đánh dấu selected)
        var domIds = [];
        $("#canvas .page-field-selected, #canvas .popup-field-selected").each(function () {
            var id = $(this).attr("data-id");
            if (id) domIds.push(id);
        });

        // Giữ lại những id thật sự là type = 'field'
        domIds = domIds.filter(function (id) {
            var cfg = self.getControlConfig(id);
            return cfg && cfg.type === "field";
        });
        if (domIds.length) return domIds;

        // Fallback: đọc từ controlField (nếu có)
        if (window.controlField && typeof controlField.getSelectedIds === "function") {
            var ids = controlField.getSelectedIds() || [];
            ids = ids.filter(function (id) {
                var cfg = self.getControlConfig(id);
                return cfg && cfg.type === "field";
            });
            if (ids.length) return ids;
        }

        // Cuối cùng: nếu đang chọn 1 control và nó là field
        if (this.selectedControlId) {
            var cfg = this.getControlConfig(this.selectedControlId);
            if (cfg && cfg.type === "field") {
                return [this.selectedControlId];
            }
        }

        return [];
    },


    // ========= Mouse drag cho multi-selection (gọi từ control-field.js) =========
    beginDragSelection: function (baseId) {
        var ids = this.getSelectedFieldIds();
        if (!ids.length || ids.indexOf(baseId) === -1) {
            ids = [baseId];
        }
        
        // ✅ Nếu control đang drag thuộc group, thêm tất cả controls trong group vào selection
        // Ngoại lệ: groupbox/section không mở rộng theo groupId — chỉ kéo chính nó (con trong DOM đã đi theo), tránh data cũ khiến control bên ngoài bị kéo theo
        var baseCfg = this.getControlConfig(baseId);
        var isGroupboxOrSection = baseCfg && baseCfg.type === "field" && (baseCfg.ftype === "groupbox" || baseCfg.ftype === "section");
        if (baseCfg && baseCfg.groupId && !isGroupboxOrSection) {
            var self = this;
            this.controls.forEach(function(c) {
                if (c.groupId === baseCfg.groupId && ids.indexOf(c.id) === -1) {
                    ids.push(c.id);
                }
            });
        }
        
        this._dragSelectionIds = ids;
        this._dragSelectionStart = {};
        this._dragSelectionDxTotal = 0;
        this._dragSelectionDyTotal = 0;

        var self = this;
        ids.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            if (!cfg) return;
            self._dragSelectionStart[id] = {
                left: cfg.left || 0,
                top: cfg.top || 0
            };
        });
    },

    dragSelectionMove: function (dx, dy) {
        if (!this._dragSelectionIds || !this._dragSelectionStart) return;

        // Tính tổng delta dự kiến sau bước drag này
        var proposedDx = this._dragSelectionDxTotal + dx;
        var proposedDy = this._dragSelectionDyTotal + dy;

        // Tính snap + hiển thị guide (giống Figma)
        var snap = this.computeSmartGuides(proposedDx, proposedDy);
        if (snap) {
            this._dragSelectionDxTotal = proposedDx + (snap.dx || 0);
            this._dragSelectionDyTotal = proposedDy + (snap.dy || 0);
        } else {
            this._dragSelectionDxTotal = proposedDx;
            this._dragSelectionDyTotal = proposedDy;
        }

        var totalDx = this._dragSelectionDxTotal;
        var totalDy = this._dragSelectionDyTotal;

        var self = this;

        this._dragSelectionIds.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            var st = self._dragSelectionStart[id];
            if (!cfg || !st) return;

            // ✅ FIX: Nếu field nằm trong container (popup, groupbox, section, collapsible-section), position là relative — chỉ clamp >= 0, không áp ruler canvas (tránh "bị cản" khi kéo lên)
            var isInContainer = false;
            var parentCfg = null;
            if (cfg.parentId) {
                parentCfg = self.getControlConfig(cfg.parentId);
                if (parentCfg && (
                    parentCfg.type === "collapsible-section" ||
                    parentCfg.type === "popup" ||
                    (parentCfg.type === "field" && (parentCfg.ftype === "groupbox" || parentCfg.ftype === "section"))
                )) {
                    isInContainer = true;
                }
            }

            if (isInContainer && parentCfg) {
                // Position relative với content/popup-body
                cfg.left = st.left + totalDx;
                cfg.top = st.top + totalDy;
                cfg.left = Math.max(0, cfg.left);
                cfg.top = Math.max(0, cfg.top);
                if (self.snapEnabled) {
                    cfg.left = Math.round(cfg.left / self.snapStep) * self.snapStep;
                    cfg.top = Math.round(cfg.top / self.snapStep) * self.snapStep;
                }
            } else {
                // Position absolute với canvas (logic cũ)
                cfg.left = st.left + totalDx;
                cfg.top = st.top + totalDy;
                var rulerLeft = 20;
                var rulerTop = 20;
                if (cfg.left < rulerLeft) cfg.left = rulerLeft;
                if (cfg.top < rulerTop) cfg.top = rulerTop;
                if (self.snapEnabled) {
                    cfg.left = Math.round(cfg.left / self.snapStep) * self.snapStep;
                    cfg.top = Math.round(cfg.top / self.snapStep) * self.snapStep;
                }
            }

            // ✅ Cập nhật DOM cho tất cả loại controls
            var $el = $('[data-id="' + id + '"], #' + id);
            if ($el.length) {
                $el.css({
                    left: cfg.left + "px",
                    top: cfg.top + "px"
                });
            }

            // ✅ Di chuyển descendants cho collapsible-section (children có position absolute relative với content)
            // groupbox/section: children đã là DOM con nên di chuyển tự động khi kéo parent
            if (cfg.type === "collapsible-section") {
                if (window.controlField && typeof controlField.moveDescendants === "function") {
                    controlField.moveDescendants(cfg.id, dx, dy, false);
                }
            }
        });

        this.updateSelectionSizeHint();
    },


    endDragSelection: function () {
        if (this._dragSelectionIds) {
            this.refreshJson();
        }
        this._dragSelectionIds = null;
        this._dragSelectionStart = null;
        this._dragSelectionDxTotal = 0;
        this._dragSelectionDyTotal = 0;
        this.hideSmartGuides();
    },



    moveSelectionBy: function (dx, dy) {
        if (!dx && !dy) return;

        var self = this;

        if (this.selectedControlType === "field") {
            var ids = this.getSelectedFieldIds();
            ids.forEach(function (id) {
                var c = self.getControlConfig(id);
                if (!c) return;
                c.left = (c.left || 0) + dx;
                c.top = (c.top || 0) + dy;
                var parentCfg = c.parentId ? self.getControlConfig(c.parentId) : null;
                if (parentCfg && (parentCfg.type === "popup" || parentCfg.type === "collapsible-section" || (parentCfg.type === "field" && (parentCfg.ftype === "groupbox" || parentCfg.ftype === "section")))) {
                    c.left = Math.max(0, c.left);
                    c.top = Math.max(0, c.top);
                } else {
                    var rulerLeft = 20, rulerTop = 20;
                    if (c.left < rulerLeft) c.left = rulerLeft;
                    if (c.top < rulerTop) c.top = rulerTop;
                }
                if (self.snapEnabled) {
                    c.left = Math.round(c.left / self.snapStep) * self.snapStep;
                    c.top = Math.round(c.top / self.snapStep) * self.snapStep;
                }
                $('[data-id="' + id + '"]').css({ left: c.left, top: c.top });
            });
        } else if (this.selectedControlId) {
            var cfg = this.getControlConfig(this.selectedControlId);
            if (cfg) {
                cfg.left = (cfg.left || 0) + dx;
                cfg.top = (cfg.top || 0) + dy;

                if (this.snapEnabled) {
                    cfg.left = Math.round(cfg.left / this.snapStep) * this.snapStep;
                    cfg.top = Math.round(cfg.top / this.snapStep) * this.snapStep;
                }

                $('[data-id="' + cfg.id + '"], #' + cfg.id).css({
                    left: cfg.left,
                    top: cfg.top
                });
            }
        }

        this.refreshJson();
        this.updateSelectionSizeHint();
    },

    // ✅ Lấy tất cả các control đã chọn (bao gồm cả fields, grids, popups, v.v.)
    getAllSelectedControlIds: function () {
        var ids = [];
        
        // Lấy từ DOM: các control có class selected
        $("#canvas .canvas-control-selected, #canvas .page-field-selected, #canvas .popup-field-selected, #canvas .popup-selected")
            .each(function () {
                var id = $(this).attr("data-id") || this.id;
                if (id && ids.indexOf(id) < 0) ids.push(id);
            });
        
        // Nếu không có multi-select, dùng selectedControlId
        if (!ids.length && this.selectedControlId) {
            ids = [this.selectedControlId];
        }
        
        return ids;
    },

    alignSelection: function (type) {
        // ✅ Lấy tất cả các control đã chọn (không chỉ fields)
        var ids = this.getAllSelectedControlIds();
        if (ids.length < 2) {
            this.showToast("Cần chọn ít nhất 2 control để căn chỉnh", "warning");
            return;
        }

        var self = this;
        var cfgs = ids.map(function (id) { return self.getControlConfig(id); }).filter(Boolean);
        if (!cfgs.length) return;

        // ✅ Tính toán bounds của tất cả controls để lấy anchor
        var minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
        cfgs.forEach(function (c) {
            if (!c) return;
            var left = c.left || 0;
            var top = c.top || 0;
            var width = c.width || 0;
            var height = c.height || 0;
            
            minLeft = Math.min(minLeft, left);
            minTop = Math.min(minTop, top);
            maxRight = Math.max(maxRight, left + width);
            maxBottom = Math.max(maxBottom, top + height);
        });

        // Anchor là control đầu tiên
        var anchor = cfgs[0];

        cfgs.forEach(function (c) {
            if (!c) return;

            // ✅ Tính toán vị trí mới dựa trên anchor và bounds
            switch (type) {
                case "left":
                    c.left = minLeft;
                    break;
                case "right":
                    var cWidth = c.width || 0;
                    c.left = maxRight - cWidth;
                    break;
                case "top":
                    c.top = minTop;
                    break;
                case "bottom":
                    var cHeight = c.height || 0;
                    c.top = maxBottom - cHeight;
                    break;
            }
            
            // ✅ Cập nhật DOM
            var $el = $('[data-id="' + c.id + '"], #' + c.id);
            if ($el.length) {
                $el.css({
                    left: c.left,
                    top: c.top
                });
            }
            
            // ✅ Nếu là popup, cần re-render để cập nhật
            if (c.type === "popup" && window.controlPopup && typeof controlPopup.renderExisting === "function") {
                // Không cần re-render, chỉ cần update CSS
            }
            
            // ✅ Nếu là field trong popup, cần update parent
            if (c.parentId) {
                // Vị trí đã được tính relative với parent, không cần làm gì thêm
            }

            if (self.snapEnabled) {
                c.left = Math.round((c.left || 0) / self.snapStep) * self.snapStep;
                c.top = Math.round((c.top || 0) / self.snapStep) * self.snapStep;
            }

            $('[data-id="' + c.id + '"]').css({
                left: c.left,
                top: c.top
            });
        });

        this.updateSelectionSizeHint();
        this.refreshJson();
    },

    // ✅ Distribute spacing - Phân bố khoảng cách đều giữa các controls
    // Ý nghĩa: Giữ nguyên vị trí control đầu và cuối, phân bố các controls ở giữa sao cho khoảng cách giữa chúng đều nhau
    // Ví dụ: 4 controls ở vị trí top = 0, 50, 150, 200 → sau khi Distribute V sẽ thành 0, 66.67, 133.33, 200 (khoảng cách đều)
    distributeSelection: function (orientation) {
        // ✅ Lấy tất cả các control đã chọn (không chỉ fields)
        var ids = this.getAllSelectedControlIds();
        if (ids.length <= 2) {
            this.showToast("Cần chọn ít nhất 3 control để phân bố khoảng cách", "warning");
            return;
        }

        var self = this;
        var cfgs = ids.map(function (id) { 
            var cfg = self.getControlConfig(id);
            if (!cfg) return null;
            
            // ✅ Lấy width/height từ DOM nếu không có trong config
            var $el = $('[data-id="' + id + '"], #' + id);
            if ($el.length) {
                if (!cfg.width || cfg.width === 0) {
                    cfg.width = $el.outerWidth() || $el.width() || 100;
                }
                if (!cfg.height || cfg.height === 0) {
                    cfg.height = $el.outerHeight() || $el.height() || 30;
                }
            }
            
            return cfg;
        }).filter(Boolean);
        
        if (!cfgs.length) return;

        // ✅ Sắp xếp controls theo vị trí
        if (orientation === "h") {
            // Phân bố ngang: sắp xếp theo left (từ trái sang phải)
            cfgs.sort(function (a, b) {
                return (a.left || 0) - (b.left || 0);
            });
        } else if (orientation === "v") {
            // Phân bố dọc: sắp xếp theo top (từ trên xuống dưới)
            cfgs.sort(function (a, b) {
                return (a.top || 0) - (b.top || 0);
            });
        } else {
            return;
        }

        if (orientation === "h") {
            // ✅ Phân bố ngang: tính khoảng cách đều giữa các controls
            var firstLeft = cfgs[0].left || 0;
            var firstWidth = cfgs[0].width || 100;
            var lastLeft = cfgs[cfgs.length - 1].left || 0;
            var lastWidth = cfgs[cfgs.length - 1].width || 100;
            var lastRight = lastLeft + lastWidth;
            
            // Tính tổng width của tất cả controls ở giữa
            var totalMiddleWidth = 0;
            for (var i = 1; i < cfgs.length - 1; i++) {
                totalMiddleWidth += (cfgs[i].width || 100);
            }
            
            // Tính khoảng cách đều giữa các controls
            // availableSpace = khoảng trống giữa control đầu và cuối (không tính width của controls)
            // gap = availableSpace / số khoảng cách
            var firstRight = firstLeft + firstWidth;
            var availableSpace = lastRight - firstRight - totalMiddleWidth;
            var gap = availableSpace / (cfgs.length - 1);

            // Đặt vị trí cho các controls ở giữa (giữ nguyên control đầu và cuối)
            var currentX = firstRight + gap;
            for (var i = 1; i < cfgs.length - 1; i++) {
                cfgs[i].left = currentX;
                if (self.snapEnabled) {
                    cfgs[i].left = Math.round(cfgs[i].left / self.snapStep) * self.snapStep;
                }
                
                // ✅ Cập nhật DOM
                var $el = $('[data-id="' + cfgs[i].id + '"], #' + cfgs[i].id);
                if ($el.length) {
                    $el.css({ left: cfgs[i].left });
                }
                
                currentX += (cfgs[i].width || 100) + gap;
            }
        } else if (orientation === "v") {
            // ✅ Phân bố dọc: tính khoảng cách đều giữa các controls
            var firstTop = cfgs[0].top || 0;
            var firstHeight = cfgs[0].height || 30;
            var lastTop = cfgs[cfgs.length - 1].top || 0;
            var lastHeight = cfgs[cfgs.length - 1].height || 30;
            var lastBottom = lastTop + lastHeight;
            
            // Tính tổng height của tất cả controls ở giữa
            var totalMiddleHeight = 0;
            for (var i = 1; i < cfgs.length - 1; i++) {
                totalMiddleHeight += (cfgs[i].height || 30);
            }
            
            // Tính khoảng cách đều giữa các controls
            var firstBottom = firstTop + firstHeight;
            var availableSpace = lastBottom - firstBottom - totalMiddleHeight;
            var gap = availableSpace / (cfgs.length - 1);

            // Đặt vị trí cho các controls ở giữa (giữ nguyên control đầu và cuối)
            var currentY = firstBottom + gap;
            for (var i = 1; i < cfgs.length - 1; i++) {
                cfgs[i].top = currentY;
                if (self.snapEnabled) {
                    cfgs[i].top = Math.round(cfgs[i].top / self.snapStep) * self.snapStep;
                }
                
                // ✅ Cập nhật DOM
                var $el = $('[data-id="' + cfgs[i].id + '"], #' + cfgs[i].id);
                if ($el.length) {
                    $el.css({ top: cfgs[i].top });
                }
                
                currentY += (cfgs[i].height || 30) + gap;
            }
        }

        this.updateSelectionSizeHint();
        this.refreshJson();
        this.showToast("Đã phân bố khoảng cách đều cho " + ids.length + " controls", "success");
    },

    // ✅ Helper: Di chuyển tất cả controls trong group cùng lúc
    moveGroupControls: function (groupId, dx, dy) {
        if (!groupId || !this.groups || !this.groups[groupId]) return;
        
        var group = this.groups[groupId];
        var self = this;
        
        group.controlIds.forEach(function(controlId) {
            var c = self.getControlConfig(controlId);
            if (!c || c.groupId !== groupId) return;
            
            // Cập nhật vị trí
            c.left = (c.left || 0) + dx;
            c.top = (c.top || 0) + dy;
            
            // Cập nhật DOM
            var $el = $('[data-id="' + c.id + '"], #' + c.id);
            if ($el.length) {
                $el.css({ left: c.left, top: c.top });
            }
        });
    },

    // ✅ Group/Ungroup controls
    groupSelection: function () {
        var ids = this.getAllSelectedControlIds();
        if (ids.length < 2) {
            this.showToast("Cần chọn ít nhất 2 control để nhóm", "warning");
            return;
        }

        var self = this;
        var cfgs = ids.map(function (id) { return self.getControlConfig(id); }).filter(Boolean);
        if (!cfgs.length) return;

        // ✅ Tính bounds của group (min left/top, max right/bottom)
        var minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
        cfgs.forEach(function (c) {
            var left = c.left || 0;
            var top = c.top || 0;
            var width = c.width || 0;
            var height = c.height || 0;
            
            minLeft = Math.min(minLeft, left);
            minTop = Math.min(minTop, top);
            maxRight = Math.max(maxRight, left + width);
            maxBottom = Math.max(maxBottom, top + height);
        });

        // ✅ Tạo group ID
        var groupId = "group_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

        // ✅ Set groupId cho tất cả controls trong group
        // Tính offset relative với top-left của group
        // QUAN TRỌNG: KHÔNG thay đổi left/top của controls, chỉ lưu offset
        cfgs.forEach(function (c) {
            c.groupId = groupId;
            c.groupOffsetX = (c.left || 0) - minLeft;
            c.groupOffsetY = (c.top || 0) - minTop;
            // ✅ Đảm bảo không thay đổi vị trí của controls
            // Giữ nguyên left và top như ban đầu
        });

        // ✅ Lưu group info vào builder (để có thể ungroup sau)
        if (!this.groups) this.groups = {};
        this.groups[groupId] = {
            id: groupId,
            left: minLeft,
            top: minTop,
            width: maxRight - minLeft,
            height: maxBottom - minTop,
            controlIds: ids
        };

        // ✅ Cập nhật visual indicator sau khi group (KHÔNG thay đổi vị trí)
        this.updateGroupVisuals();
        this.refreshJson();
        this.showToast("Đã nhóm " + ids.length + " controls (Ctrl+Shift+G để hủy nhóm)", "success");
    },

    ungroupSelection: function () {
        var ids = this.getAllSelectedControlIds();
        if (!ids.length) {
            this.showToast("Chưa chọn control nào để hủy nhóm", "warning");
            return;
        }

        var self = this;
        var ungroupedCount = 0;
        var groupIds = {};

        // ✅ Tìm tất cả groups chứa các controls đã chọn
        ids.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            if (cfg && cfg.groupId) {
                groupIds[cfg.groupId] = true;
            }
        });

        // ✅ Ungroup tất cả controls trong các groups này
        Object.keys(groupIds).forEach(function (groupId) {
            if (!self.groups || !self.groups[groupId]) return;
            
            var group = self.groups[groupId];
            group.controlIds.forEach(function (controlId) {
                var cfg = self.getControlConfig(controlId);
                if (cfg && cfg.groupId === groupId) {
                    delete cfg.groupId;
                    delete cfg.groupOffsetX;
                    delete cfg.groupOffsetY;
                    ungroupedCount++;
                }
            });

            delete self.groups[groupId];
        });

        if (ungroupedCount > 0) {
            // ✅ Cập nhật visual indicator sau khi ungroup
            this.updateGroupVisuals();
            this.refreshJson();
            this.showToast("Đã hủy nhóm " + ungroupedCount + " controls", "success");
            
            // Xóa highlight sau khi ungroup
            $(".group-highlight").removeClass("group-highlight");
        } else {
            this.showToast("Không có control nào được nhóm", "warning");
        }
    },

    // ✅ Cập nhật visual indicator cho tất cả grouped controls
    // QUAN TRỌNG: Hàm này CHỈ thêm/xóa visual indicators, KHÔNG thay đổi vị trí của controls
    updateGroupVisuals: function () {
        var self = this;
        
        // ✅ Xóa TẤT CẢ group indicators và badges hiện tại
        $(".group-badge").remove(); // Fix: Xóa badge cũ
        $(".group-indicator").remove();
        $(".canvas-control-grouped").removeClass("canvas-control-grouped");
        $(".page-field-grouped").removeClass("page-field-grouped");
        $(".popup-field-grouped").removeClass("popup-field-grouped");
        $(".popup-design-grouped").removeClass("popup-design-grouped");
        $(".ess-grid-control-grouped").removeClass("ess-grid-control-grouped");
        
        // Rebuild groups từ controls (chỉ tính lại bounds, KHÔNG thay đổi vị trí)
        this.rebuildGroups();
        
        // Thêm visual indicator cho mỗi group
        if (this.groups) {
            Object.keys(this.groups).forEach(function (groupId) {
                var group = self.groups[groupId];
                if (!group || !group.controlIds || group.controlIds.length < 2) return;
                
                // Thêm class cho tất cả controls trong group
                group.controlIds.forEach(function (controlId) {
                    var $el = $('[data-id="' + controlId + '"], #' + controlId);
                    if ($el.length) {
                        // ✅ KHÔNG thay đổi position của control để tránh làm nhảy vị trí
                        // Controls đã có position: absolute hoặc relative từ trước
                        // Chỉ thêm class grouped, không thay đổi CSS position
                        
                        // Thêm class grouped
                        if ($el.hasClass("canvas-control") || $el.hasClass("ess-grid-control")) {
                            $el.addClass("canvas-control-grouped");
                        } else if ($el.hasClass("page-field")) {
                            $el.addClass("page-field-grouped");
                        } else if ($el.hasClass("popup-field")) {
                            $el.addClass("popup-field-grouped");
                        } else if ($el.hasClass("popup-design")) {
                            $el.addClass("popup-design-grouped");
                        }
                        
                        // ✅ Thêm badge ở vị trí absolute bên ngoài control (không đè lên control)
                        // Badge sẽ được đặt ở góc trên phải, cách control một khoảng nhỏ
                        // Badge sẽ được đặt relative với control (control cần có position: relative hoặc absolute)
                        var $badge = $('<span class="group-badge" title="Nhóm ' + group.controlIds.length + ' controls">' + group.controlIds.length + '</span>');
                        $badge.css({
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            zIndex: 10000,
                            pointerEvents: 'none' // Không chặn click vào control
                        });
                        $el.append($badge);
                    }
                });
            });
        }
    },

    // ✅ Rebuild groups từ controls (khi load lại từ JSON)
    rebuildGroups: function () {
        if (!this.groups) this.groups = {};
        
        var self = this;
        var groupMap = {}; // Map groupId -> array of controlIds
        
        // Thu thập tất cả controls có groupId
        this.controls.forEach(function (cfg) {
            if (cfg && cfg.groupId) {
                if (!groupMap[cfg.groupId]) {
                    groupMap[cfg.groupId] = [];
                }
                groupMap[cfg.groupId].push(cfg.id);
            }
        });
        
        // Rebuild groups object
        Object.keys(groupMap).forEach(function (groupId) {
            var controlIds = groupMap[groupId];
            if (controlIds.length < 2) {
                // Nếu group chỉ có 1 control, xóa groupId
                controlIds.forEach(function (controlId) {
                    var cfg = self.getControlConfig(controlId);
                    if (cfg) {
                        delete cfg.groupId;
                        delete cfg.groupOffsetX;
                        delete cfg.groupOffsetY;
                    }
                });
                return;
            }
            
            // Tính bounds của group
            var minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
            controlIds.forEach(function (controlId) {
                var cfg = self.getControlConfig(controlId);
                if (!cfg) return;
                
                var left = cfg.left || 0;
                var top = cfg.top || 0;
                var width = cfg.width || 0;
                var height = cfg.height || 0;
                
                minLeft = Math.min(minLeft, left);
                minTop = Math.min(minTop, top);
                maxRight = Math.max(maxRight, left + width);
                maxBottom = Math.max(maxBottom, top + height);
            });
            
            // Lưu group info
            self.groups[groupId] = {
                id: groupId,
                left: minLeft,
                top: minTop,
                width: maxRight - minLeft,
                height: maxBottom - minTop,
                controlIds: controlIds
            };
        });
    },

    // ✅ Highlight tất cả controls trong cùng group khi chọn một control
    highlightGroupControls: function (controlId) {
        // Xóa highlight cũ
        $(".group-highlight").removeClass("group-highlight");
        
        var cfg = this.getControlConfig(controlId);
        if (!cfg || !cfg.groupId) return;
        
        // Rebuild groups nếu chưa có
        if (!this.groups || !this.groups[cfg.groupId]) {
            this.rebuildGroups();
        }
        
        var group = this.groups && this.groups[cfg.groupId];
        if (!group || !group.controlIds) return;
        
        // Highlight tất cả controls trong group
        var self = this;
        group.controlIds.forEach(function (id) {
            var $el = $('[data-id="' + id + '"], #' + id);
            if ($el.length) {
                $el.addClass("group-highlight");
            }
        });
    },

    // ✅ Lấy tất cả các control đã chọn (bao gồm cả fields, grids, popups, v.v.)
    getAllSelectedControlIds: function () {
        var ids = [];
        
        // Lấy từ DOM: các control có class selected
        $("#canvas .canvas-control-selected, #canvas .page-field-selected, #canvas .popup-field-selected, #canvas .popup-selected")
            .each(function () {
                var id = $(this).attr("data-id") || this.id;
                if (id && ids.indexOf(id) < 0) ids.push(id);
            });
        
        // Nếu không có multi-select, dùng selectedControlId
        if (!ids.length && this.selectedControlId) {
            ids = [this.selectedControlId];
        }
        
        return ids;
    },

    // ✅ Distribute spacing - Phân bố khoảng cách đều giữa các controls
    distributeSelection: function (orientation) {
        // ✅ Lấy tất cả các control đã chọn (không chỉ fields)
        var ids = this.getAllSelectedControlIds();
        if (ids.length <= 2) {
            this.showToast("Cần chọn ít nhất 3 control để phân bố khoảng cách", "warning");
            return;
        }

        var self = this;
        var cfgs = ids.map(function (id) { return self.getControlConfig(id); }).filter(Boolean);
        if (!cfgs.length) return;

        // ✅ Sắp xếp controls theo vị trí
        if (orientation === "h") {
            // Phân bố ngang: sắp xếp theo left
            cfgs.sort(function (a, b) {
                return (a.left || 0) - (b.left || 0);
            });
        } else if (orientation === "v") {
            // Phân bố dọc: sắp xếp theo top
            cfgs.sort(function (a, b) {
                return (a.top || 0) - (b.top || 0);
            });
        } else {
            return;
        }

        if (orientation === "h") {
            // Phân bố ngang: tính khoảng cách đều giữa các controls
            var firstLeft = cfgs[0].left || 0;
            var lastRight = (cfgs[cfgs.length - 1].left || 0) + (cfgs[cfgs.length - 1].width || 0);
            var totalWidth = cfgs.reduce(function (s, c) { return s + (c.width || 0); }, 0);
            var gap = (lastRight - firstLeft - totalWidth) / (cfgs.length - 1);

            var pos = firstLeft;
            cfgs.forEach(function (c, i) {
                if (i === 0 || i === cfgs.length - 1) {
                    pos += (c.width || 0) + gap;
                    return; // giữ nguyên first & last
                }
                c.left = pos;
                if (self.snapEnabled) {
                    c.left = Math.round(c.left / self.snapStep) * self.snapStep;
                }
                // ✅ Cập nhật DOM
                var $el = $('[data-id="' + c.id + '"], #' + c.id);
                if ($el.length) {
                    $el.css({ left: c.left });
                }
                pos = c.left + (c.width || 0) + gap;
            });
        } else if (orientation === "v") {
            // Phân bố dọc: tính khoảng cách đều giữa các controls
            var firstTop = cfgs[0].top || 0;
            var lastBottom = (cfgs[cfgs.length - 1].top || 0) + (cfgs[cfgs.length - 1].height || 0);
            var totalHeight = cfgs.reduce(function (s, c) { return s + (c.height || 0); }, 0);
            var gapV = (lastBottom - firstTop - totalHeight) / (cfgs.length - 1);

            var posV = firstTop;
            cfgs.forEach(function (c, i) {
                if (i === 0 || i === cfgs.length - 1) {
                    posV += (c.height || 0) + gapV;
                    return; // giữ nguyên first & last
                }
                c.top = posV;
                if (self.snapEnabled) {
                    c.top = Math.round(c.top / self.snapStep) * self.snapStep;
                }
                // ✅ Cập nhật DOM
                var $el = $('[data-id="' + c.id + '"], #' + c.id);
                if ($el.length) {
                    $el.css({ top: c.top });
                }
                posV = c.top + (c.height || 0) + gapV;
            });
        }

        this.updateSelectionSizeHint();
        this.refreshJson();
    },

    duplicateSelection: function () {
        if (!this.selectedControlId) return;
        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg) return;

        var clone = $.extend(true, {}, cfg);

        if (clone.type === "field") {
            clone.id = "fld_" + (clone.ftype || "field") + "_" + Date.now();
        } else {
            clone.id = (clone.type || "ctrl") + "_" + Date.now();
        }

        clone.left = (clone.left || 0) + 10;
        clone.top = (clone.top || 0) + 10;

        this.renderControlByConfig(clone);
        this.registerControl(clone);

        this.selectedControlId = clone.id;
        this.selectedControlType = clone.type;
        this.highlightOutlineSelection();
    },

    copyStyleFromSelection: function () {
        if (this.selectedControlType !== "field") {
            this.showToast("Copy style hiện chỉ hỗ trợ Field.", "info");
            return;
        }
        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg) return;

        var keys = ["labelWidth", "captionBold", "captionItalic", "width", "height",
            "captionPosition", "required", "disabled", "buttonBgColor"];
        var style = {};
        keys.forEach(function (k) {
            if (cfg.hasOwnProperty(k)) style[k] = cfg[k];
        });

        this.copiedStyle = { ftype: cfg.ftype, style: style };
        this.showToast("Copied style từ '" + (cfg.caption || cfg.ftype || cfg.id) + "'", "success");
    },

    pasteStyleToSelection: function () {
        if (!this.copiedStyle) {
            this.showToast("Chưa có style nào được copy.", "warning");
            return;
        }

        var ids = this.getSelectedFieldIds();
        if (!ids.length) {
            this.showToast("Chọn ít nhất 1 field để paste style.", "info");
            return;
        }

        var self = this;
        ids.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            if (!cfg) return;

            var style = $.extend({}, self.copiedStyle.style);

            // captionPosition chỉ áp cho checkbox/radio
            if (style.captionPosition &&
                !(cfg.ftype === "checkbox" || cfg.ftype === "radio")) {
                delete style.captionPosition;
            }

            $.extend(cfg, style);

            var $dom = $('[data-id="' + id + '"]');
            var $cap = $dom.find(".page-field-caption, .popup-field-caption");

            // width/height
            if (cfg.width) $dom.css("width", cfg.width);
            if (cfg.height) $dom.css("height", cfg.height);

            // Bold / Italic
            $cap.css("font-weight", cfg.captionBold ? "700" : "normal");
            $cap.css("font-style", cfg.captionItalic ? "italic" : "normal");

            // Required
            if (cfg.required) {
                $cap.addClass("page-field-caption-required");
            } else {
                $cap.removeClass("page-field-caption-required");
            }

            // Disabled
            if (cfg.ftype === "button") {
                $dom.find(".page-field-editor button")
                    .prop("disabled", !!cfg.disabled);
            } else if (cfg.ftype !== "label") {
                $dom.find(".page-field-editor")
                    .find("input,select,textarea,button")
                    .prop("disabled", !!cfg.disabled);
            }

            // ESS button background
            if (cfg.ftype === "button" && cfg.uiMode === "ess" && cfg.buttonBgColor) {
                $dom.find(".page-field-editor button").css("background-color", cfg.buttonBgColor);
            }

            // Re-layout caption/editor: labelWidth + captionPosition (checkbox)
            if (window.controlField &&
                typeof controlField.reapplyLayout === "function") {
                controlField.reapplyLayout(id);
            }
        });

        this.refreshJson();
    },


    // ========= Copy / Paste control =========
    copySelectionControls: function () {
        var ids = [];

        if (this.selectedControlType === "field") {
            ids = this.getSelectedFieldIds();
        } else if (this.selectedControlId) {
            ids = [this.selectedControlId];
        }

        if (!ids.length) {
            this.showToast("Chọn control để copy.", "info");
            return;
        }

        var self = this;
        var list = ids.map(function (id) {
            var cfg = self.getControlConfig(id);
            return cfg ? $.extend(true, {}, cfg) : null;
        }).filter(Boolean);

        if (!list.length) return;

        this.clipboardControls = list;
        this.markCopied('control');
        this.showToast("Đã copy " + list.length + " control.", "success");
    },

    pasteSelectionControls: function () {
        if (!this.clipboardControls || !this.clipboardControls.length) {
            this.showToast("Clipboard trống. Hãy Ctrl+C trước.", "info");
            return;
        }

        var self = this;
        var base = Date.now();

        var minLeft = Math.min.apply(null, this.clipboardControls.map(function (c) { return c.left || 0; }));
        var minTop = Math.min.apply(null, this.clipboardControls.map(function (c) { return c.top || 0; }));

        var dx = 20;
        var dy = 20;
        var newIds = [];

        this.clipboardControls.forEach(function (src, idx) {
            var clone = $.extend(true, {}, src);
            var suffix = base + "_" + idx;

            if (clone.type === "field") {
                clone.id = "fld_" + (clone.ftype || "field") + "_" + suffix;
            } else {
                clone.id = (clone.type || "ctrl") + "_" + suffix;
            }

            clone.left = (clone.left || 0) + dx;
            clone.top = (clone.top || 0) + dy;

            self.renderControlByConfig(clone);
            self.registerControl(clone);
            newIds.push(clone.id);
        });

        if (newIds.length) {
            this.selectedControlId = newIds[0];
            this.selectedControlType = this.getControlConfig(newIds[0]).type;
        }

        // đánh dấu selected trên DOM
        $(".canvas-control, .page-field, .popup-field").removeClass("canvas-control-selected page-field-selected popup-field-selected");
        newIds.forEach(function (id) {
            $('[data-id="' + id + '"]').addClass("canvas-control-selected page-field-selected popup-field-selected");
        });

        this.highlightOutlineSelection();
        this.updateSelectionSizeHint();
    },

    renderControlByConfig: function (cfg) {
        if (cfg.type === "field" && !cfg.uiMode) {
            cfg.uiMode = "core";
        }

        if (cfg.type === "grid") {
            controlGrid.renderExisting(cfg);

        } else if (cfg.type === "ess-grid" &&
            window.controlGridEss &&
            typeof controlGridEss.renderExisting === "function") {

            // NEW: render ESS Grid
            controlGridEss.renderExisting(cfg);

        } else if (cfg.type === "popup") {
            controlPopup.renderExisting(cfg);

        } else if (cfg.type === "toolbar" && window.controlToolbar && typeof controlToolbar.renderExisting === "function") {
            controlToolbar.renderExisting(cfg);

        } else if (cfg.type === "tabpage" && window.controlTabPage && typeof controlTabPage.renderExisting === "function") {
            controlTabPage.renderExisting(cfg);

        } else if (cfg.type === "field" && window.controlField && typeof controlField.renderExisting === "function") {
            controlField.renderExisting(cfg);
        } else if (cfg.type === "collapsible-section" && window.controlCollapsibleSection && typeof controlCollapsibleSection.renderExisting === "function") {
            controlCollapsibleSection.renderExisting(cfg);
        }
    },


    // ========= Outline / Layers panel =========
    buildOutlineTree: function () {
        var ctrls = this.controls || [];
        var map = {};
        var roots = [];

        ctrls.forEach(function (c) {
            map[c.id] = { cfg: c, children: [] };
        });

        ctrls.forEach(function (c) {
            if (c.parentId && map[c.parentId]) {
                map[c.parentId].children.push(map[c.id]);
            } else {
                roots.push(map[c.id]);
            }
        });

        return roots;
    },

    getOutlineLabel: function (c) {
        if (!c) return "";
        if (c.type === "grid") return "Grid: " + (c.titleText || c.controlName || c.id);
        if (c.type === "ess-grid") return "ESS Grid: " + (c.title || c.titleText || c.controlName || c.id); // NEW
        if (c.type === "popup") return "Popup: " + (c.titleText || c.controlName || c.id);
        if (c.type === "tabpage") return "Tab: " + (c.titleText || c.controlName || c.id);
        if (c.type === "toolbar") return "Toolbar";
        if (c.type === "field") {
            var name = c.caption || c.ftype || c.id;
            return "Field: " + name;
        }
        return (c.type || "ctrl") + ": " + (c.controlName || c.id);
    },

    buildOutlineHtml: function (nodes) {
        var self = this;
        var html = '<ul class="outline-tree-root">';
        nodes.forEach(function (node) {
            var c = node.cfg;
            html += '<li class="outline-node" data-id="' + c.id + '">';
            html += '<div class="outline-row">' + self.getOutlineLabel(c) + '</div>';
            if (node.children && node.children.length) {
                html += self.buildOutlineHtml(node.children);
            }
            html += '</li>';
        });
        html += '</ul>';
        return html;
    },

    updateOutline: function () {
        var $panel = $("#outlinePanel");
        if (!$panel.length) return;

        var roots = this.buildOutlineTree();
        var htmlHeader = '<div class="outline-header">Layers</div>';

        if (!roots.length) {
            $panel.html(htmlHeader + '<div class="outline-empty">Không có control nào.</div>');
            return;
        }

        var htmlTree = this.buildOutlineHtml(roots);
        $panel.html(htmlHeader + htmlTree);

        var self = this;
        $panel.off("click.outline").on("click.outline", ".outline-row", function (e) {
            e.preventDefault();
            var id = $(this).closest(".outline-node").data("id");
            self.selectControlFromOutline(id);
        });

        this.highlightOutlineSelection();
    },

    highlightOutlineSelection: function () {
        var $panel = $("#outlinePanel");
        if (!$panel.length) return;
        var id = this.selectedControlId;
        $panel.find(".outline-row").removeClass("outline-row-selected");
        if (!id) return;
        $panel.find('.outline-node[data-id="' + id + '"] > .outline-row')
            .addClass("outline-row-selected");
    },

    selectControlFromOutline: function (id) {
        var cfg = this.getControlConfig(id);
        if (!cfg) return;

        // Clear mọi selection cũ (trên canvas + multiSelectedIds)
        this.clearSelection();

        this.selectedControlId = id;
        this.selectedControlType = cfg.type;

        // CHỈ tìm element trên canvas, không đụng vào outline-node
        var $dom = $("#canvas").find('[data-id="' + id + '"], #' + id);

        $dom.addClass("canvas-control-selected page-field-selected popup-field-selected");

        if ($dom.length) {
            $dom[0].scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }

        // ✅ Highlight tất cả controls trong cùng group
        this.highlightGroupControls(id);

        this.highlightOutlineSelection();   // dùng outline-row-selected để highlight layer
        this.updateSelectionSizeHint();
    },


    // ========= Context menu =========
    initContextMenu: function () {
        if ($("#builderContextMenu").length) return;

        var html =
            '<div id="builderContextMenu" class="builder-context-menu" style="display:none;">' +
            '  <ul>' +
            '    <li data-cmd="duplicate">Duplicate (Ctrl+D)</li>' +
            '    <li data-cmd="copy-ctrl">Copy control (Ctrl+C)</li>' +
            '    <li data-cmd="paste-ctrl">Paste control (Ctrl+V)</li>' +
            '    <li class="cm-sep"></li>' +
            '    <li data-cmd="copy-style">Copy style (Ctrl+Alt+C)</li>' +
            '    <li data-cmd="paste-style">Paste style (Ctrl+Alt+V)</li>' +
            '    <li class="cm-sep"></li>' +
            '    <li data-cmd="align-left">Align left</li>' +
            '    <li data-cmd="align-right">Align right</li>' +
            '    <li data-cmd="align-top">Align top</li>' +
            '    <li data-cmd="align-bottom">Align bottom</li>' +
            '    <li class="cm-sep"></li>' +
            '    <li data-cmd="delete">Delete (Del)</li>' +
            '  </ul>' +
            '</div>';

        $("body").append(html);

        var self = this;
        $("#builderContextMenu").on("click", "li[data-cmd]", function () {
            if ($(this).hasClass("cm-disabled")) return;

            var cmd = $(this).data("cmd");
            self.handleContextCommand(cmd);
            self.hideContextMenu();
        });
    },

    showContextMenu: function (e, target) {
        var $menu = $("#builderContextMenu");
        if (!$menu.length) return;

        var $t = $(target);
        var id = $t.attr("data-id") || $t.attr("id");

        // ✅ Tìm id từ các phần tử cha nếu không tìm thấy trực tiếp (cho gridview trong popup)
        // Gridview có thể có nhiều phần tử con, cần tìm phần tử cha có data-id
        if (!id) {
            // Tìm canvas-control cha (cho Core GridView)
            var $parentControl = $t.closest('.canvas-control[data-id]');
            if ($parentControl.length) {
                id = $parentControl.attr("data-id");
                $t = $parentControl;
            } else {
                // Tìm ess-grid-control (cho ESS GridView)
                var $essGrid = $t.closest('.ess-grid-control[data-id]');
                if ($essGrid.length) {
                    id = $essGrid.attr("data-id");
                    $t = $essGrid;
                } else {
                    // Fallback: tìm bất kỳ phần tử cha nào có data-id
                    var $parent = $t.closest('[data-id]');
                    if ($parent.length) {
                        id = $parent.attr("data-id");
                        $t = $parent;
                    }
                }
            }
        } else {
            // Nếu đã có id, nhưng có thể là phần tử con của gridview
            // Kiểm tra xem có phải DevExtreme grid không
            if ($t.hasClass("dx-datagrid") || $t.closest(".dx-datagrid").length) {
                var $parentControl = $t.closest('.canvas-control[data-id]');
                if ($parentControl.length) {
                    id = $parentControl.attr("data-id");
                    $t = $parentControl;
                }
            }
        }

        // Comment debug logs
        // console.log("showContextMenu: target=", target, "id=", id, "element=", $t[0]);

        // ✅ Lấy config và set selection
        var cfg = null;
        if (id) {
            cfg = this.getControlConfig(id);
            if (cfg) {
                this.selectedControlId = id;
                this.selectedControlType = cfg.type;
                // console.log("showContextMenu: cfg=", cfg, "type=", cfg.type, "parentId=", cfg.parentId);
            }
        }

        // enable/disable theo ngữ cảnh
        var isField = (this.selectedControlType === "field");
        var multiFields = this.getSelectedFieldIds().length > 1;
        var isGrid = (this.selectedControlType === "grid" || this.selectedControlType === "ess-grid");
        
        // ✅ Kiểm tra xem control có trong popup không
        var isInPopup = false;
        if (cfg && cfg.parentId) {
            var $parentPopup = $('.popup-design[data-id="' + cfg.parentId + '"]');
            isInPopup = $parentPopup.length > 0;
            // console.log("showContextMenu: isInPopup=", isInPopup, "parentId=", cfg.parentId, "popup found=", $parentPopup.length);
        }

        $menu.find("[data-cmd^='align-']").toggleClass("cm-disabled", !multiFields);
        $menu.find("[data-cmd='copy-style'],[data-cmd='paste-style']").toggleClass("cm-disabled", !isField);
        $menu.find("[data-cmd='paste-ctrl']").toggleClass("cm-disabled", !this.clipboardControls || !this.clipboardControls.length);
        
        // ✅ Xóa các menu items group/ungroup cũ trước khi thêm mới
        $menu.find("li[data-cmd='group'], li[data-cmd='ungroup']").remove();
        // Xóa separator trước group menu nếu không còn item nào sau nó
        var $groupSeps = $menu.find("li.cm-sep");
        $groupSeps.each(function() {
            var $sep = $(this);
            var hasGroupAfter = false;
            $sep.nextAll().each(function() {
                if ($(this).attr("data-cmd") === "group" || $(this).attr("data-cmd") === "ungroup") {
                    hasGroupAfter = true;
                    return false;
                }
            });
            if (!hasGroupAfter && ($sep.next().length === 0 || $sep.next().hasClass("cm-sep"))) {
                $sep.remove();
            }
        });
        
        // ✅ Group/Ungroup menu
        var allSelectedIds = this.getAllSelectedControlIds();
        var hasGroupedControls = false;
        var self = this; // ✅ Fix: Khai báo self để dùng trong forEach
        if (allSelectedIds.length > 0) {
            allSelectedIds.forEach(function(id) {
                var c = self.getControlConfig(id);
                if (c && c.groupId) {
                    hasGroupedControls = true;
                    return false; // break
                }
            });
        }
        
        // Thêm Group/Ungroup vào menu (sau duplicate, trước separator)
        if (hasGroupedControls || allSelectedIds.length >= 2) {
            var $groupSep = $('<li class="cm-sep"></li>');
            $menu.find("ul").append($groupSep);
            
            if (hasGroupedControls) {
                var $ungroupItem = $('<li data-cmd="ungroup">🔓 Hủy nhóm (Ctrl+Shift+G)</li>');
                $menu.find("ul").append($ungroupItem);
            } else if (allSelectedIds.length >= 2) {
                var $groupItem = $('<li data-cmd="group">🔒 Nhóm (Ctrl+G)</li>');
                $menu.find("ul").append($groupItem);
            }
        }
        
        // ✅ GridView menu: Xóa tất cả menu items cũ liên quan đến di chuyển Grid
        // (các item có data-cmd bắt đầu bằng move-grid-)
        $menu.find("li").each(function () {
            var $item = $(this);
            var cmd = $item.attr("data-cmd") || "";
            if (cmd.indexOf("move-grid-") === 0) {
                $item.remove();
            }
            if ($item.hasClass("cm-label-grid")) {
                $item.remove();
            }
        });

        if (isGrid) {
            // Thêm separator riêng cho menu Grid
            var $sep = $('<li class="cm-sep" data-cmd="move-grid-sep"></li>');
            $menu.find("ul").append($sep);

            // Menu chung: mở dialog chọn Popup / ESS Collapsible Section
            var $moveItem = $('<li data-cmd="move-grid-to-container">📥 Đưa vào Popup / ESS Section...</li>');
            $menu.find("ul").append($moveItem);
        }

        $menu.css({
            left: e.pageX + "px",
            top: e.pageY + "px",
            display: "block"
        });
    },

    hideContextMenu: function () {
        $("#builderContextMenu").hide();
    },

    handleContextCommand: function (cmd) {
        switch (cmd) {
            case "duplicate":
                this.duplicateSelection();
                break;
            case "copy-ctrl":
                this.copySelectionControls();
                break;
            case "paste-ctrl":
                this.pasteSelectionControls();
                break;
            case "copy-style":
                this.copyStyleFromSelection();
                break;
            case "paste-style":
                this.pasteStyleToSelection();
                break;
            case "align-left":
                this.alignSelection("left");
                break;
            case "align-right":
                this.alignSelection("right");
                break;
            case "align-top":
                this.alignSelection("top");
                break;
            case "align-bottom":
                this.alignSelection("bottom");
                break;
            case "delete":
                this.deleteSelectedControl();
                break;
            case "group":
                this.groupSelection();
                break;
            case "ungroup":
                this.ungroupSelection();
                break;
            default:
                // ✅ Xử lý menu GridView: mở dialog chọn container
                if (cmd === "move-grid-to-container") {
                    this.showMoveGridToContainerDialog();
                }
                break;
        }
    },

    // ✅ Mở dialog chọn Popup / ESS Collapsible Section để chứa Grid
    showMoveGridToContainerDialog: function () {
        if (!this.selectedControlId) return;

        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg || (cfg.type !== "grid" && cfg.type !== "ess-grid")) {
            this.showToast("Chỉ áp dụng cho GridView", "warning");
            return;
        }

        var popups = (this.controls || []).filter(function (c) { return c && c.type === "popup"; });
        var sections = (this.controls || []).filter(function (c) { return c && c.type === "collapsible-section"; });

        if (!popups.length && !sections.length) {
            this.showToast("Không tìm thấy Popup hoặc ESS Collapsible Section nào.", "warning");
            return;
        }

        var $overlay = $('<div class="ub-modal-backdrop"></div>');
        var html =
            '<div class="ub-modal" style="min-width: 360px;">' +
            '  <div class="ub-modal-header">Đưa GridView vào Popup / ESS Section</div>' +
            '  <div class="ub-modal-body">' +
            '    <div style="margin-bottom:8px; font-size:12px;">Chọn container muốn chứa GridView "' + (cfg.title || cfg.caption || cfg.id) + '"</div>' +
            '    <select class="ub-input-container" style="width:100%; padding:4px 6px; margin-bottom:8px; box-sizing:border-box;">' +
            '    </select>' +
            '  </div>' +
            '  <div class="ub-modal-footer">' +
            '    <button type="button" class="ub-btn ub-btn-secondary ub-btn-cancel">Cancel</button>' +
            '    <button type="button" class="ub-btn ub-btn-primary ub-btn-ok">OK</button>' +
            '  </div>' +
            '</div>';

        var $dlg = $(html);
        $overlay.append($dlg);
        $("body").append($overlay);

        var $select = $dlg.find(".ub-input-container");

        // Thêm option cho Popup
        if (popups.length) {
            $select.append('<optgroup label="Popup"></optgroup>');
            var $popupGroup = $select.find('optgroup[label="Popup"]');
            popups.forEach(function (p) {
                var text = p.headerText || p.titleText || ("Popup " + p.id);
                $popupGroup.append('<option value="popup:' + p.id + '">' + text + '</option>');
            });
        }

        // Thêm option cho ESS Collapsible Section
        if (sections.length) {
            $select.append('<optgroup label="ESS Collapsible Section"></optgroup>');
            var $secGroup = $select.find('optgroup[label="ESS Collapsible Section"]');
            sections.forEach(function (s) {
                var text = s.caption || s.title || ("Section " + s.id);
                $secGroup.append('<option value="section:' + s.id + '">' + text + '</option>');
            });
        }

        if ($select.find("option").length) {
            $select.prop("selectedIndex", 0);
        }

        var self = this;

        function closeDialog() {
            $(document).off("keydown.ubMoveGridDlg");
            $overlay.remove();
        }

        function handleOk() {
            var val = $select.val() || "";
            if (!val) {
                self.showToast("Vui lòng chọn container.", "warning");
                return;
            }

            closeDialog();

            var parts = val.split(":");
            var kind = parts[0];
            var id = parts[1];
            self.moveGridToContainer(id, kind);
        }

        $dlg.find(".ub-btn-ok").on("click", handleOk);
        $dlg.find(".ub-btn-cancel").on("click", function () {
            closeDialog();
        });

        $(document).on("keydown.ubMoveGridDlg", function (e) {
            if (e.key === "Escape") closeDialog();
            else if (e.key === "Enter") handleOk();
        });
    },

    // ✅ Di chuyển GridView vào container (Popup hoặc ESS Collapsible Section)
    moveGridToContainer: function (containerId, kind) {
        if (!this.selectedControlId) return;

        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg || (cfg.type !== "grid" && cfg.type !== "ess-grid")) {
            this.showToast("Chỉ áp dụng cho GridView", "warning");
            return;
        }

        var targetCfg = this.getControlConfig(containerId);
        if (!targetCfg || (targetCfg.type !== "popup" && targetCfg.type !== "collapsible-section")) {
            this.showToast("Container không hợp lệ.", "error");
            return;
        }

        // Nếu là popup → dùng logic cũ
        if (targetCfg.type === "popup") {
            this.moveGridToPopup(containerId);
            return;
        }

        // Từ đây là ESS Collapsible Section
        var $oldGrid = $('.canvas-control[data-id="' + cfg.id + '"]');
        if ($oldGrid.length) {
            $oldGrid.remove();
        }

        var oldParentId = cfg.parentId || null;
        var absLeft = cfg.left || 0;
        var absTop = cfg.top || 0;

        // Nếu đang ở trong popup khác hoặc section khác → convert về absolute canvas
        if (oldParentId) {
            var oldParentCfg = this.getControlConfig(oldParentId);
            if (oldParentCfg) {
                if (oldParentCfg.type === "popup") {
                    absLeft = (cfg.left || 0) + (oldParentCfg.left || 0);
                    absTop = (cfg.top || 0) + (oldParentCfg.top || 0);
                } else if (oldParentCfg.type === "collapsible-section") {
                    var headerH = 50;
                    var pad = oldParentCfg.contentPadding || 12;
                    absLeft = (cfg.left || 0) + (oldParentCfg.left || 0) + pad;
                    absTop = (cfg.top || 0) + (oldParentCfg.top || 0) + headerH + pad;
                }
            }
        }

        // Tính vị trí relative với ESS Collapsible Section mới
        var headerHeight = 50;
        var padding = targetCfg.contentPadding || 12;

        cfg.parentId = containerId;
        cfg.left = Math.max(0, absLeft - (targetCfg.left || 0) - padding);
        cfg.top = Math.max(0, absTop - (targetCfg.top || 0) - headerHeight - padding);

        // Render lại grid trong section
        if (cfg.type === "grid" && window.controlGrid && typeof controlGrid.renderExisting === "function") {
            controlGrid.renderExisting(cfg);
        } else if (cfg.type === "ess-grid" && window.controlGridEss && typeof controlGridEss.renderExisting === "function") {
            controlGridEss.renderExisting(cfg);
        }

        this.selectedControlId = cfg.id;
        this.selectedControlType = cfg.type;
        this.refreshJson();
        this.showToast("Đã đưa GridView vào ESS Collapsible Section: " + (targetCfg.caption || targetCfg.title || targetCfg.id), "success");
    },

    // ✅ Di chuyển GridView vào popup
    moveGridToPopup: function (popupId) {
        if (!this.selectedControlId) return;
        
        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg || (cfg.type !== "grid" && cfg.type !== "ess-grid")) {
            this.showToast("Chỉ có thể di chuyển GridView vào popup", "warning");
            return;
        }
        
        var popupCfg = this.getControlConfig(popupId);
        if (!popupCfg || popupCfg.type !== "popup") {
            this.showToast("Popup không tồn tại", "error");
            return;
        }
        
        // ✅ XÓA DOM element cũ trước khi render mới
        var $oldGrid = $('.canvas-control[data-id="' + cfg.id + '"]');
        if ($oldGrid.length) {
            $oldGrid.remove();
        }
        
        // Set parentId và tính lại vị trí relative với popup
        var oldParentId = cfg.parentId;
        cfg.parentId = popupId;
        
        // Convert current position về relative với popup
        var currentLeft = cfg.left || 0;
        var currentTop = cfg.top || 0;
        var popupLeft = popupCfg.left || 0;
        var popupTop = popupCfg.top || 0;
        
        // Tính relative position
        // Nếu grid đang trong popup khác, cần convert từ popup cũ sang popup mới
        if (oldParentId && oldParentId !== popupId) {
            var oldPopupCfg = this.getControlConfig(oldParentId);
            if (oldPopupCfg) {
                // Convert từ relative của popup cũ sang absolute, rồi sang relative của popup mới
                currentLeft = (cfg.left || 0) + (oldPopupCfg.left || 0);
                currentTop = (cfg.top || 0) + (oldPopupCfg.top || 0);
            }
        }
        
        // Convert absolute position về relative với popup mới
        cfg.left = Math.max(10, currentLeft - popupLeft);
        cfg.top = Math.max(50, currentTop - popupTop); // Tránh header
        
        // Đảm bảo nằm trong popup
        var popupWidth = popupCfg.width || 800;
        var popupHeight = popupCfg.height || 600;
        if (cfg.left > (popupWidth - 100)) cfg.left = popupWidth - 100;
        if (cfg.top > (popupHeight - 100)) cfg.top = popupHeight - 100;
        
        // Re-render grid
        if (cfg.type === "grid" && window.controlGrid && typeof controlGrid.renderExisting === "function") {
            controlGrid.renderExisting(cfg);
        } else if (cfg.type === "ess-grid" && window.controlGridEss && typeof controlGridEss.renderExisting === "function") {
            controlGridEss.renderExisting(cfg);
        }
        
        // Update selection
        this.selectedControlId = cfg.id;
        this.selectedControlType = cfg.type;
        
        this.refreshJson();
        this.showToast("Đã di chuyển GridView vào popup: " + (popupCfg.headerText || popupCfg.titleText || "Popup"), "success");
    },

    // ✅ Di chuyển GridView ra khỏi popup
    moveGridOutOfPopup: function () {
        if (!this.selectedControlId) return;
        
        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg || (cfg.type !== "grid" && cfg.type !== "ess-grid")) {
            this.showToast("Chỉ có thể di chuyển GridView ra khỏi popup", "warning");
            return;
        }
        
        if (!cfg.parentId) {
            this.showToast("GridView không nằm trong popup", "info");
            return;
        }
        
        // ✅ XÓA DOM element cũ trước khi render mới
        var $oldGrid = $('.canvas-control[data-id="' + cfg.id + '"]');
        if ($oldGrid.length) {
            $oldGrid.remove();
        }
        
        var popupCfg = this.getControlConfig(cfg.parentId);
        if (popupCfg) {
            // Convert relative position về absolute position trên canvas
            cfg.left = (cfg.left || 0) + (popupCfg.left || 0);
            cfg.top = (cfg.top || 0) + (popupCfg.top || 0);
        }
        
        // Remove parentId
        cfg.parentId = null;
        
        // Re-render grid
        if (cfg.type === "grid" && window.controlGrid && typeof controlGrid.renderExisting === "function") {
            controlGrid.renderExisting(cfg);
        } else if (cfg.type === "ess-grid" && window.controlGridEss && typeof controlGridEss.renderExisting === "function") {
            controlGridEss.renderExisting(cfg);
        }
        
        // Update selection
        this.selectedControlId = cfg.id;
        this.selectedControlType = cfg.type;
        
        this.refreshJson();
        this.showToast("Đã di chuyển GridView ra khỏi popup", "success");
    },

    // ========= Bottom toolbar giống thanh Figma =========
    initCanvasToolbar: function () {
        var $bar = $("#canvasToolbar");
        if (!$bar.length) return;

        var self = this;

        // ✅ Ngăn mất focus khi click vào toolbar
        $bar.on("mousedown", function(e) {
            e.stopPropagation(); // Ngăn event bubble lên document để không clear selection
        });

        // ✅ Event handler cho toolbar buttons
        $bar.on("click", "[data-cmd]", function (e) {
            e.stopPropagation(); // Ngăn event bubble để không clear selection
            var cmd = $(this).data("cmd");
            switch (cmd) {
                case "zoom-out":
                    self.setZoom(self.viewScale * 0.9);
                    break;
                case "zoom-in":
                    self.setZoom(self.viewScale * 1.1);
                    break;
                case "zoom-reset":
                    self.setZoom(1);
                    self.canvasTranslateX = 0;
                    self.canvasTranslateY = 0;
                    self.applyCanvasTransform();
                    break;
                case "align-left":
                    self.alignSelection("left");
                    break;
                case "align-right":
                    self.alignSelection("right");
                    break;
                case "align-top":
                    self.alignSelection("top");
                    break;
                case "align-bottom":
                    self.alignSelection("bottom");
                    break;
                case "distribute-h":
                    self.distributeSelection("h");
                    break;
                case "distribute-v":
                    self.distributeSelection("v");
                    break;
                case "duplicate":
                    self.duplicateSelection();
                    break;
                case "delete":
                    if (self.selectedControlId) {
                        self.deleteSelectedControl();
                    } else {
                        self.showToast("Chưa chọn control nào để xóa", "warning");
                    }
                    break;
            }
        });

        // ✅ Event handler cho zoom select dropdown
        var $zoomSelect = $("#zoomSelect");
        if ($zoomSelect.length) {
            $zoomSelect.off("change").on("change", function (e) {
                e.stopPropagation(); // Ngăn event bubble để không clear selection
                var v = $(this).val();
                if (!v) return;

                // option "current" chỉ để hiển thị, không set zoom
                if (v === "custom") return;

                var scale = parseFloat(v);
                if (!isNaN(scale) && scale > 0) {
                    self.setZoom(scale);
                }
            });
        }

        // ✅ Khởi tạo control chỉnh kích thước canvas (luôn hiển thị dưới toolbar)
        self.initCanvasSizeControls();

        // ✅ Khởi tạo và cập nhật ruler
        self.initRulers();

        // ✅ Snap checkbox đã được loại bỏ khỏi toolbar (không cần thiết cho design tool)
    },

    // Tự động cập nhật canvasWidth / canvasHeight & ô W/H dưới toolbar
    // dựa trên nội dung thực tế (scrollWidth / scrollHeight) của #canvas.
    // Chỉ cập nhật giá trị HIỂN THỊ, KHÔNG động vào CSS min-width/min-height
    // để tránh sinh thêm scrollbar thứ 2.
    updateCanvasSizeFromContent: function () {
        var $canvas = $("#canvas");
        if (!$canvas.length) return;

        // Tính toán kích thước thực tế dựa trên tất cả controls trên canvas
        var maxRight = 0;
        var maxBottom = 0;
        var padding = 50; // Padding để không bị sát mép

        // Tìm tất cả controls trên canvas (bao gồm cả controls trong popup)
        var allControls = $canvas.find(".canvas-control, .page-field, .popup-field, .popup-design, .canvas-toolbar, .canvas-tabpage, .ess-grid-control");
        
        var canvasOffset = $canvas.offset();
        
        allControls.each(function() {
            var $el = $(this);
            var elOffset = $el.offset();
            
            // Tính vị trí absolute trên canvas (không phải relative)
            var left = (elOffset.left - canvasOffset.left) || 0;
            var top = (elOffset.top - canvasOffset.top) || 0;
            var width = $el.outerWidth() || 0;
            var height = $el.outerHeight() || 0;
            
            var right = left + width;
            var bottom = top + height;
            
            if (right > maxRight) maxRight = right;
            if (bottom > maxBottom) maxBottom = bottom;
        });

        // Đảm bảo không nhỏ hơn giá trị mặc định
        var minW = Math.max(maxRight + padding, 1600);
        var minH = Math.max(maxBottom + padding, 900);

        // Cập nhật min-width và min-height của canvas và inner (zoom container)
        $canvas.css({ "min-width": minW + "px", "min-height": minH + "px" });
        $("#canvas-zoom-inner").css({ "min-width": minW + "px", "min-height": minH + "px" });

        // Cập nhật giá trị hiển thị trong input (nếu có)
        var $wInput = $("#canvasWidthInput");
        var $hInput = $("#canvasHeightInput");
        if ($wInput.length) {
            this.canvasWidth = minW;
            $wInput.val(minW);
        }
        if ($hInput.length) {
            this.canvasHeight = minH;
            $hInput.val(minH);
        }

        // Cập nhật ruler khi canvas size thay đổi
        this.updateRulers();

        return true;
    },

    // Khởi tạo và bind sự kiện cho input canvasWidthInput / canvasHeightInput
    initCanvasSizeControls: function () {
        var self = this;
        var $w = $("#canvasWidthInput");
        var $h = $("#canvasHeightInput");
        if (!$w.length || !$h.length) return;

        var $canvas = $("#canvas");
        if (!$canvas.length) return;

        // Tính toán kích thước mặc định dựa trên viewport size
        var getDefaultCanvasSize = function() {
            var viewportW = window.innerWidth || 1920;
            var viewportH = window.innerHeight || 1080;
            
            // Trừ đi các phần UI: toolbox (220px) + properties (320px - đã được user sửa) + margins (40px)
            var availableW = viewportW - 220 - 320 - 40;
            // Trừ đi: header (50px) + footer (56px) + margins (40px)
            var availableH = viewportH - 50 - 56 - 40;
            
            // Đảm bảo không nhỏ hơn giá trị tối thiểu
            var defaultW = Math.max(availableW, 1600);
            var defaultH = Math.max(availableH, 900);
            
            // Làm tròn đến 100px gần nhất
            defaultW = Math.ceil(defaultW / 100) * 100;
            defaultH = Math.ceil(defaultH / 100) * 100;
            
            return { width: defaultW, height: defaultH };
        };

        // Tính toán kích thước mặc định dựa trên viewport (luôn tính lại khi khởi tạo)
        var defaultSize = getDefaultCanvasSize();
        
        // Nếu đã từng lưu trong builder.canvasWidth/Height thì ưu tiên dùng
        // Nhưng nếu là lần đầu (null hoặc undefined) thì dùng kích thước mặc định theo viewport
        var currentW, currentH;
        
        // Kiểm tra xem có giá trị đã lưu trong input không (từ lần load trước)
        var savedW = parseInt($w.val(), 10);
        var savedH = parseInt($h.val(), 10);
        
        if (self.canvasWidth && self.canvasWidth > 0) {
            currentW = self.canvasWidth;
        } else if (savedW && savedW >= 800 && savedW <= 10000) {
            // Nếu input đã có giá trị hợp lệ từ trước, dùng giá trị đó
            currentW = savedW;
        } else {
            // Lần đầu hoặc chưa có → dùng kích thước mặc định theo viewport
            currentW = defaultSize.width;
        }

        if (self.canvasHeight && self.canvasHeight > 0) {
            currentH = self.canvasHeight;
        } else if (savedH && savedH >= 600 && savedH <= 10000) {
            // Nếu input đã có giá trị hợp lệ từ trước, dùng giá trị đó
            currentH = savedH;
        } else {
            // Lần đầu hoặc chưa có → dùng kích thước mặc định theo viewport
            currentH = defaultSize.height;
        }

        self.canvasWidth = currentW;
        self.canvasHeight = currentH;

        $w.val(currentW);
        $h.val(currentH);

        // Áp dụng cho cả canvas và inner (zoom container)
        $canvas.css({ "min-width": currentW + "px", "min-height": currentH + "px" });
        $("#canvas-zoom-inner").css({ "min-width": currentW + "px", "min-height": currentH + "px" });

        // Áp dụng zoom cho nội dung (inner) ngay khi init
        if (typeof self.applyCanvasTransform === "function") {
            self.applyCanvasTransform();
        }
        setTimeout(function() {
            if (self.updateRulers && typeof self.updateRulers === "function") {
                self.updateRulers();
            }
        }, 50);

        // Bind event cho width input - cho phép select all và replace
        $w.off("change.canvasSize blur.canvasSize input.canvasSize keydown.canvasSize").on("change.canvasSize blur.canvasSize", function () {
            var v = parseInt(this.value || "0", 10);
            if (isNaN(v) || v < 800) v = 800;
            if (v > 10000) v = 10000;
            self.canvasWidth = v;
            $(this).val(v);
            $canvas.css("min-width", v + "px");
            $("#canvas-zoom-inner").css("min-width", v + "px");
            setTimeout(function() { self.updateRulers(); }, 10);
        }).on("input.canvasSize", function() {
            var val = this.value;
            var v = parseInt(val, 10);
            if (!isNaN(v) && v >= 800 && v <= 10000) {
                $canvas.css("min-width", v + "px");
                $("#canvas-zoom-inner").css("min-width", v + "px");
            }
        }).on("keydown.canvasSize", function(e) {
            // Cho phép các phím điều hướng, delete, backspace, v.v.
            // Không chặn gì cả, để user có thể select all và nhập lại
            if (e.key === "Enter") {
                $(this).blur(); // Trigger change event
            }
        });

        // Bind event cho height input - cho phép select all và replace
        $h.off("change.canvasSize blur.canvasSize input.canvasSize keydown.canvasSize").on("change.canvasSize blur.canvasSize", function () {
            var v = parseInt(this.value || "0", 10);
            if (isNaN(v) || v < 600) v = 600;
            if (v > 10000) v = 10000;
            self.canvasHeight = v;
            $(this).val(v);
            $canvas.css("min-height", v + "px");
            $("#canvas-zoom-inner").css("min-height", v + "px");
            setTimeout(function() { self.updateRulers(); }, 10);
        }).on("input.canvasSize", function() {
            var val = this.value;
            var v = parseInt(val, 10);
            if (!isNaN(v) && v >= 600 && v <= 10000) {
                $canvas.css("min-height", v + "px");
                $("#canvas-zoom-inner").css("min-height", v + "px");
            }
        }).on("keydown.canvasSize", function(e) {
            // Cho phép các phím điều hướng, delete, backspace, v.v.
            // Không chặn gì cả, để user có thể select all và nhập lại
            if (e.key === "Enter") {
                $(this).blur(); // Trigger change event
            }
        });
    },

    // Khởi tạo ruler
    initRulers: function () {
        var self = this;
        var $canvas = $("#canvas");
        var $canvasShell = $(".canvas-shell");
        if (!$canvas.length || !$canvasShell.length) return;

        // Debounce function để tránh vẽ lại quá thường xuyên
        var updateRulersTimeout = null;
        var updateRulersDebounced = function() {
            if (updateRulersTimeout) clearTimeout(updateRulersTimeout);
            updateRulersTimeout = setTimeout(function() {
                self.updateRulers();
            }, 10); // 10ms debounce
        };

        // Đồng bộ scroll position của canvas với ruler
        $canvasShell.on("scroll", function () {
            // Vẽ lại tick marks khi scroll để hiển thị đúng vị trí (với debounce)
            updateRulersDebounced();
        });

        // Cập nhật ruler ngay để tránh lệch/hở khi mới vào trang
        self.updateRulers();
        // Gọi lại sau khi layout ổn định (DOM, canvas size, v.v.)
        setTimeout(function() {
            self.updateRulers();
            setTimeout(function() { self.updateRulers(); }, 200);
        }, 150);

        // Cập nhật ruler khi window resize
        $(window).on("resize", function () {
            updateRulersDebounced();
        });
    },

    // Cập nhật kích thước và vẽ tick marks cho ruler
    updateRulers: function () {
        var self = this;
        var $canvas = $("#canvas");
        var $canvasShell = $(".canvas-shell");
        var $rulerH = $(".canvas-ruler-h");
        var $rulerV = $(".canvas-ruler-v");

        if (!$canvas.length || !$rulerH.length || !$rulerV.length) return;

        // Lấy kích thước canvas - ưu tiên min-width/min-height của canvas
        var canvasMinW = parseFloat($canvas.css("min-width")) || 0;
        var canvasMinH = parseFloat($canvas.css("min-height")) || 0;
        
        // Nếu min-width/min-height chưa có, lấy từ input hoặc scrollWidth/scrollHeight
        var $wInput = $("#canvasWidthInput");
        var $hInput = $("#canvasHeightInput");
        var inputW = $wInput.length ? parseInt($wInput.val(), 10) : null;
        var inputH = $hInput.length ? parseInt($hInput.val(), 10) : null;
        
        // Ưu tiên: min-width/min-height > input > scrollWidth/scrollHeight > default
        var canvasW = canvasMinW || inputW || self.canvasWidth || $canvas[0].scrollWidth || 1600;
        var canvasH = canvasMinH || inputH || self.canvasHeight || $canvas[0].scrollHeight || 900;

        // Lấy vị trí và kích thước thực tế của canvas-shell (viewport của canvas)
        var shellRect = $canvasShell[0].getBoundingClientRect();
        var shellEl = $canvasShell[0];
        var rulerHHeight = 24;
        var rulerVWidth = 24;

        // Tính toán scrollbar width chính xác (clientWidth/Height vs offsetWidth/Height)
        var scrollbarWidth = shellEl.offsetWidth - shellEl.clientWidth;
        var scrollbarHeight = shellEl.offsetHeight - shellEl.clientHeight;
        // Fallback nếu không tính được (thường là 17px trên Windows, có thể khác trên Mac/Linux)
        if (scrollbarWidth <= 0) scrollbarWidth = 17;
        if (scrollbarHeight <= 0) scrollbarHeight = 17;

        // Kiểm tra scrollbar của canvas-shell
        var hasVerticalScrollbar = shellEl.scrollHeight > shellEl.clientHeight;
        var hasHorizontalScrollbar = shellEl.scrollWidth > shellEl.clientWidth;

        // Ruler ngang: căn đúng theo shell, fill hết bề ngang viewport (trừ ruler dọc + scrollbar dọc nếu có)
        // Dùng clientWidth để lấy kích thước viewport (không tính scrollbar)
        var rulerHWidth = shellEl.clientWidth - rulerVWidth;
        if (hasVerticalScrollbar) {
            rulerHWidth -= scrollbarWidth;
        }
        // Đảm bảo không âm và làm tròn lên để tránh gap 1px
        rulerHWidth = Math.max(0, Math.ceil(rulerHWidth));

        var rulerHLeft = Math.round(shellRect.left + rulerVWidth);
        var rulerHTop = Math.round(shellRect.top);

        $rulerH.css({
            "width": rulerHWidth + "px",
            "left": rulerHLeft + "px",
            "top": rulerHTop + "px",
            "transform": "none"
        });

        // Ruler dọc: căn sát trái shell (không hở), fill hết chiều cao viewport (trừ ruler ngang + scrollbar ngang nếu có)
        // Dùng clientHeight để lấy kích thước viewport (không tính scrollbar)
        var rulerVHeight = shellEl.clientHeight - rulerHHeight;
        if (hasHorizontalScrollbar) {
            rulerVHeight -= scrollbarHeight;
        }
        // Đảm bảo không âm và làm tròn lên để tránh gap 1px
        rulerVHeight = Math.max(0, Math.ceil(rulerVHeight));

        var rulerVLeft = Math.round(shellRect.left);
        var rulerVTop = Math.round(shellRect.top + rulerHHeight);

        $rulerV.css({
            "height": rulerVHeight + "px",
            "left": rulerVLeft + "px",
            "top": rulerVTop + "px"
        });

        // Vẽ tick marks cho ruler ngang (truyền scrollLeft để vẽ đúng vị trí)
        var scrollLeft = $canvasShell.scrollLeft();
        self.drawRulerH($rulerH, canvasW, scrollLeft);

        // Vẽ tick marks cho ruler dọc (truyền scrollTop để vẽ đúng vị trí)
        var scrollTop = $canvasShell.scrollTop();
        self.drawRulerV($rulerV, canvasH, scrollTop);

        // Đồng bộ scroll position (chỉ cần cho ruler dọc)
        self.syncRulersWithScroll();
    },

    // Vẽ tick marks cho ruler ngang
    drawRulerH: function ($ruler, width, scrollLeft) {
        $ruler.empty();
        scrollLeft = scrollLeft || 0;
        width = width || 1600; // Đảm bảo có giá trị mặc định

        var step = 10; // Mỗi 10px một tick nhỏ
        var majorStep = 50; // Mỗi 50px một tick lớn
        var labelStep = 100; // Mỗi 100px một số
        var canvasMarginLeft = 20; // Canvas có margin-left: 20px

        // Tính toán vùng hiển thị: vẽ TẤT CẢ từ 0 đến width của canvas
        var rulerWidth = $ruler.width() || 1000;
        
        // Vẽ từ 0 đến width của canvas (không giới hạn bởi viewport)
        // Nhưng chỉ hiển thị những tick nằm trong viewport của ruler
        var startX = 0;
        var endX = width;

        for (var x = startX; x <= endX; x += step) {
            var isMajor = (x % majorStep === 0);
            var showLabel = (x % labelStep === 0 && x >= 0);

            // Vị trí tick trên ruler = x - scrollLeft + canvasMarginLeft
            // Canvas bắt đầu ở vị trí 20px từ biên trái của ruler, nên tick 0 phải ở vị trí 20px
            var tickPos = x - scrollLeft + canvasMarginLeft;
            
            // Đảm bảo số cuối cùng (endX) luôn được hiển thị, ngay cả khi hơi ngoài viewport
            var isLastNumber = (x === endX && showLabel);
            // Cho số cuối cùng, cho phép margin rất lớn để luôn hiển thị (ít nhất = canvas width)
            var margin = isLastNumber ? Math.max(width, rulerWidth * 2, 1000) : step;
            
            // Chỉ vẽ tick nếu nằm trong viewport của ruler (cho phép margin để vẽ đủ)
            if (tickPos < -step || tickPos > rulerWidth + margin) continue;

            var $tick = $("<div>").addClass("ruler-tick");
            if (isMajor) {
                $tick.addClass("major");
            } else {
                $tick.addClass("minor");
            }
            $tick.css("left", tickPos + "px");

            $ruler.append($tick);

            // Thêm số cho tick lớn
            if (showLabel) {
                var $label = $("<div>").addClass("ruler-label").text(x);
                $label.css("left", (tickPos + 2) + "px");
                $ruler.append($label);
            }
        }
        
        // ✅ Đảm bảo số cuối cùng (endX) LUÔN được hiển thị, bất kể vị trí scroll
        // Kiểm tra xem số cuối cùng đã được vẽ chưa
        var hasLastLabel = false;
        $ruler.find(".ruler-label").each(function() {
            var labelText = parseInt($(this).text(), 10);
            if (!isNaN(labelText) && labelText === endX) {
                hasLastLabel = true;
                return false; // break
            }
        });
        
        // ✅ LUÔN vẽ số cuối cùng (endX) bất kể vị trí scroll
        // Đảm bảo số cuối cùng LUÔN được hiển thị khi scroll đến vị trí đó
        if (!hasLastLabel && endX > 0) {
            // Tính vị trí của số cuối cùng trên ruler
            var finalTickPos = endX - scrollLeft + canvasMarginLeft;
            
            // LUÔN vẽ số cuối cùng, ngay cả khi nằm ngoài viewport hiện tại
            // (sẽ hiển thị khi scroll đến vị trí đó, ruler có overflow: hidden nên chỉ hiển thị phần trong viewport)
            // Cho phép margin rất lớn để đảm bảo luôn vẽ được (ít nhất = canvas width để cover mọi trường hợp)
            var maxMargin = Math.max(width, rulerWidth * 3, 2000); // Đảm bảo margin đủ lớn
            // Chỉ skip nếu quá xa (tránh vẽ element quá xa, nhưng cho phép margin rất lớn)
            if (finalTickPos > -maxMargin && finalTickPos < rulerWidth + maxMargin) {
                var $finalLabel = $("<div>").addClass("ruler-label").text(endX);
                $finalLabel.css("left", (finalTickPos + 2) + "px");
                $ruler.append($finalLabel);
                
                // Thêm tick major cho số cuối
                var $finalTick = $("<div>").addClass("ruler-tick major");
                $finalTick.css("left", finalTickPos + "px");
                $ruler.append($finalTick);
            }
        }
    },

    // Vẽ tick marks cho ruler dọc
    drawRulerV: function ($ruler, height, scrollTop) {
        $ruler.empty();
        scrollTop = scrollTop || 0;
        height = height || 900; // Đảm bảo có giá trị mặc định

        var step = 10; // Mỗi 10px một tick nhỏ
        var majorStep = 50; // Mỗi 50px một tick lớn
        var labelStep = 100; // Mỗi 100px một số
        var canvasMarginTop = 20; // Canvas có margin-top: 20px

        // Tính toán vùng hiển thị: vẽ TẤT CẢ từ 0 đến height của canvas
        var rulerHeight = $ruler.height() || 800;
        
        // Vẽ từ 0 đến height của canvas (không giới hạn bởi viewport)
        // Nhưng chỉ hiển thị những tick nằm trong viewport của ruler
        var startY = 0;
        var endY = height;

        for (var y = startY; y <= endY; y += step) {
            var isMajor = (y % majorStep === 0);
            var showLabel = (y % labelStep === 0 && y >= 0);

            // Vị trí tick trên ruler = y - scrollTop + canvasMarginTop
            // Canvas bắt đầu ở vị trí 20px từ biên trên của ruler, nên tick 0 phải ở vị trí 20px
            var tickPos = y - scrollTop + canvasMarginTop;
            
            // Đảm bảo số cuối cùng (endY) luôn được hiển thị, ngay cả khi hơi ngoài viewport
            var isLastNumber = (y === endY && showLabel);
            // Cho số cuối cùng, cho phép margin rất lớn để luôn hiển thị (ít nhất = canvas height)
            var margin = isLastNumber ? Math.max(height, rulerHeight * 2, 1000) : step;
            
            // Chỉ vẽ tick nếu nằm trong viewport của ruler (cho phép margin để vẽ đủ)
            if (tickPos < -step || tickPos > rulerHeight + margin) continue;

            var $tick = $("<div>").addClass("ruler-tick");
            if (isMajor) {
                $tick.addClass("major");
            } else {
                $tick.addClass("minor");
            }
            $tick.css("top", tickPos + "px");

            $ruler.append($tick);

            // Thêm số cho tick lớn
            if (showLabel) {
                var $label = $("<div>").addClass("ruler-label").text(y);
                $label.css("top", tickPos + "px");
                $ruler.append($label);
            }
        }
        
        // ✅ Đảm bảo số cuối cùng (endY) LUÔN được hiển thị, bất kể vị trí scroll
        var hasLastLabel = false;
        $ruler.find(".ruler-label").each(function() {
            var labelText = parseInt($(this).text(), 10);
            if (!isNaN(labelText) && labelText === endY) {
                hasLastLabel = true;
                return false; // break
            }
        });
        
        // ✅ LUÔN vẽ số cuối cùng (endY) bất kể vị trí scroll
        // Đảm bảo số cuối cùng LUÔN được hiển thị khi scroll đến vị trí đó
        if (!hasLastLabel && endY > 0) {
            // Tính vị trí của số cuối cùng trên ruler
            var finalTickPos = endY - scrollTop + canvasMarginTop;
            
            // LUÔN vẽ số cuối cùng, ngay cả khi nằm ngoài viewport hiện tại
            // (sẽ hiển thị khi scroll đến vị trí đó, ruler có overflow: hidden nên chỉ hiển thị phần trong viewport)
            // Cho phép margin rất lớn để đảm bảo luôn vẽ được (ít nhất = canvas height để cover mọi trường hợp)
            var maxMargin = Math.max(height, rulerHeight * 3, 2000); // Đảm bảo margin đủ lớn
            // Chỉ skip nếu quá xa (tránh vẽ element quá xa, nhưng cho phép margin rất lớn)
            if (finalTickPos > -maxMargin && finalTickPos < rulerHeight + maxMargin) {
                var $finalLabel = $("<div>").addClass("ruler-label").text(endY);
                $finalLabel.css("top", finalTickPos + "px");
                $ruler.append($finalLabel);
                
                // Thêm tick major cho số cuối
                var $finalTick = $("<div>").addClass("ruler-tick major");
                $finalTick.css("top", finalTickPos + "px");
                $ruler.append($finalTick);
            }
        }
    },

    // Đồng bộ scroll position của canvas với ruler (không còn cần thiết vì đã vẽ lại tick marks)
    syncRulersWithScroll: function () {
        // Không cần translate nữa vì tick marks đã được vẽ với offset đúng
        // Giữ hàm này để tương thích với code cũ
    },

    // ========= Common helpers =========
    getControlConfig: function (controlId) {
        return (this.controls || []).find(function (c) { return c.id === controlId; });
    },

    deleteSelectedControl: function () {
        var self = this;

        // Lấy tất cả control đang được chọn trên canvas
        var allIds = [];
        $("#canvas .canvas-control-selected, #canvas .page-field-selected, #canvas .popup-field-selected")
            .each(function () {
                var id = $(this).attr("data-id") || this.id;
                if (id && allIds.indexOf(id) < 0) allIds.push(id);
            });

        // Nếu chưa gom được từ DOM thì dùng selectedControlId hiện tại
        if (!allIds.length && this.selectedControlId) {
            allIds = [this.selectedControlId];
        }

        if (!allIds.length) return;

        // Nếu chỉ có 1 control → xóa trực tiếp (không cần confirm cho control thường)
        if (allIds.length === 1) {
            this.selectedControlId = allIds[0];
            var cfg = this.getControlConfig(allIds[0]);
            
            // Popup cần confirm vì có thể có nhiều controls bên trong
            if (cfg && cfg.type === "popup") {
                // Xử lý popup ở phần dưới (multi-control confirm)
            } else {
            this.removeControl(allIds[0]);
            return;
            }
        }

        // Nhiều control → xoá hàng loạt
        var fieldIds = [];
        var nonFieldIds = [];

        allIds.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            if (!cfg) return;
            if (cfg.type === "field") fieldIds.push(id);
            else nonFieldIds.push(id);
        });

        if (!fieldIds.length && !nonFieldIds.length) return;

        var msgParts = [];
        if (fieldIds.length) msgParts.push(fieldIds.length + " field(s)");
        if (nonFieldIds.length) msgParts.push(nonFieldIds.length + " control(s)");
        var msgText = "Delete " + allIds.length + " selected " +
            (msgParts.length ? "(" + msgParts.join(" + ") + ") " : "") +
            "and their children?";

        builder.showConfirm({
            title: "Delete controls",
            message: msgText,
            okText: "Delete",
            cancelText: "Cancel",
            onOk: function () {
                // 1. Xoá các field bằng controlField.deleteWithChildren
                if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                    fieldIds.forEach(function (fid) {
                        controlField.deleteWithChildren(fid);
                    });
                }

                // 2. Xoá các control khác (ess-grid, grid, popup, tabpage, toolbar,…)
                nonFieldIds.forEach(function (id) {
                    var cfg = self.getControlConfig(id);
                    if (!cfg) return;

                    // popup / tabpage: xoá cả con bằng deleteWithChildren
                    if (cfg.type === "tabpage" || cfg.type === "popup") {
                        if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                            controlField.deleteWithChildren(id);
                        }
                    }

                    self.controls = (self.controls || []).filter(function (c) { return c.id !== id; });
                    $('[data-id="' + id + '"], #' + id).remove();
                });

                self.syncControlsWithDom();

                self.selectedControlId = null;
                self.selectedControlType = null;

                if (window.controlField && typeof controlField.clearSelection === "function") {
                    controlField.clearSelection();
                }

                $('#propPanel').html('<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>');
                self.hideSizeHint();
                self.refreshJson();
            }
        });
    },


    // ✅ Duplicate selected control
    duplicateSelection: function () {
        if (!this.selectedControlId) {
            this.showToast("Chưa chọn control nào để duplicate", "warning");
            return;
        }

        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg) {
            this.showToast("Không tìm thấy control để duplicate", "error");
            return;
        }

        // Deep clone config
        var newCfg = JSON.parse(JSON.stringify(cfg));
        
        // Generate new ID
        var newId = "ctrl_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        newCfg.id = newId;
        
        // Offset position (di chuyển sang phải và xuống dưới 20px)
        newCfg.left = (newCfg.left || 0) + 20;
        newCfg.top = (newCfg.top || 0) + 20;
        
        // Clear parentId nếu đang trong popup (duplicate sẽ ra ngoài canvas)
        // Hoặc giữ nguyên parentId nếu muốn duplicate trong cùng popup
        // newCfg.parentId = null; // Uncomment nếu muốn duplicate ra ngoài popup
        
        // Add to controls array
        this.controls.push(newCfg);
        
        // Render the duplicated control
        this.renderControlByConfig(newCfg);
        
        // Select the new control
        this.selectedControlId = newId;
        this.selectedControlType = newCfg.type;
        
        // Update UI
        this.refreshJson();
        this.showToast("Đã duplicate control", "success");
    },

    // ✅ Remove control helper
    removeControl: function (controlId) {
        var cfg = this.getControlConfig(controlId);
        if (!cfg) return;

        // Remove from controls array
        this.controls = (this.controls || []).filter(function (c) { return c.id !== controlId; });

        // Remove from DOM
        $('[data-id="' + controlId + '"], #' + controlId).remove();

        // If it's a field, use controlField.deleteWithChildren
        if (cfg.type === "field" && window.controlField && typeof controlField.deleteWithChildren === "function") {
            controlField.deleteWithChildren(controlId);
        }

        // Clear selection if this was selected
        if (this.selectedControlId === controlId) {
            this.clearSelection();
        }

        this.syncControlsWithDom();
        this.refreshJson();
    },

    clearSelection: function () {
        this.selectedControlId = null;
        this.selectedControlType = null;

        // XÓA mọi class selected, bất kể đang nằm trên canvas hay outline
        $(".canvas-control-selected").removeClass("canvas-control-selected");
        $(".popup-selected").removeClass("popup-selected");
        $(".popup-field-selected").removeClass("popup-field-selected");
        $(".page-field-selected").removeClass("page-field-selected");
        $(".outline-row-selected").removeClass("outline-row-selected");

        if (window.controlField && typeof controlField.clearSelection === "function") {
            controlField.clearSelection();
        }

        if (window.controlPopup && typeof controlPopup.clearSelection === "function") {
            controlPopup.clearSelection();
        }

        // Reset panel về thông báo mặc định
        $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");

        // Không còn selectedControlId nên highlightOutlineSelection sẽ không tô gì nữa
        this.highlightOutlineSelection();
        this.hideSizeHint();
    },



    // đồng bộ controls[] theo DOM (fix bug outline không cập nhật khi xoá field)
    syncControlsWithDom: function () {
        var self = this;
        this.controls = (this.controls || []).filter(function (c) {
            return $('[data-id="' + c.id + '"], #' + c.id).length > 0;
        });
    },

    // ========= Save dialog / Confirm / Toast (giữ nguyên logic cũ) =========

    showSaveDialog: function (options) {
        var title = options.title || "Save";
        var nameLabel = options.nameLabel || "Name";
        var defaultName = options.defaultName || "";
        var defaultIsPublic = (options.defaultIsPublic !== false); // mặc định true
        var defaultProjectId = options.defaultProjectId || null;
        var onOk = options.onOk || function () { };
        var self = this;

        var $overlay = $('<div class="ub-modal-backdrop"></div>');
        var html =
            '<div class="ub-modal" style="min-width: 420px;">' +
            '  <div class="ub-modal-header">' + title + '</div>' +
            '  <div class="ub-modal-body">' +
            '    <label>Project:</label>' +
            '    <select class="ub-input-project" style="width:100%; padding:4px 6px; margin-bottom:8px; box-sizing:border-box;">' +
            '      <option value="">Loading...</option>' +
            '    </select>' +
            '    <label>' + nameLabel + ':</label>' +
            '    <input type="text" class="ub-input-name" />' +
            '    <div style="margin-top:6px;">' +
            '      <label><input type="checkbox" class="ub-input-public" /> Public (share for other BA)</label>' +
            '    </div>' +
            '    <div class="ub-modal-error" style="display:none;"></div>' +
            '  </div>' +
            '  <div class="ub-modal-footer">' +
            '    <button type="button" class="ub-btn ub-btn-secondary ub-btn-cancel">Cancel</button>' +
            '    <button type="button" class="ub-btn ub-btn-primary ub-btn-ok">OK</button>' +
            '  </div>' +
            '</div>';

        var $dlg = $(html);
        $overlay.append($dlg);
        $("body").append($overlay);

        var $projectSelect = $dlg.find(".ub-input-project");
        var $nameInput = $dlg.find(".ub-input-name");
        var $publicCheckbox = $dlg.find(".ub-input-public");

        // Load projects
        $.ajax({
            url: builderServiceUrl + "/GetProjects",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: "{}",
            success: function (res) {
                var projects = res.d || [];
                $projectSelect.empty();
                $projectSelect.append('<option value="">-- Select Project --</option>');
                projects.forEach(function (p) {
                    var selected = (defaultProjectId && p.projectId === defaultProjectId) ? ' selected' : '';
                    $projectSelect.append('<option value="' + p.projectId + '"' + selected + '>' + p.name + '</option>');
                });
            },
            error: function () {
                $projectSelect.html('<option value="">Error loading projects</option>');
            }
        });

        $nameInput.val(defaultName).focus().select();
        $publicCheckbox.prop("checked", !!defaultIsPublic);

        function closeDialog() {
            $(document).off("keydown.ubSaveDlg");
            $overlay.remove();
        }

        function showError(msg) {
            var $err = $dlg.find(".ub-modal-error");
            $err.text(msg).show();
        }

        function handleOk() {
            var name = $.trim($nameInput.val() || "");
            var isPublic = $publicCheckbox.is(":checked");
            var projectId = $projectSelect.val() || null;
            if (projectId) projectId = parseInt(projectId, 10);

            if (!name) {
                showError("Name is required.");
                $nameInput.focus();
                return;
            }

            closeDialog();
            onOk({ name: name, isPublic: isPublic, projectId: projectId });
        }

        $dlg.find(".ub-btn-ok").on("click", handleOk);
        $dlg.find(".ub-btn-cancel").on("click", function () {
            closeDialog();
        });

        $(document).on("keydown.ubSaveDlg", function (e) {
            if (e.key === "Escape") {
                closeDialog();
            } else if (e.key === "Enter") {
                if (!$(e.target).hasClass("ub-btn-secondary")) {
                    handleOk();
                }
            }
        });
    },

    showConfirm: function (options) {
        var title = options.title || "Confirm";
        var message = options.message || "Are you sure?";
        var okText = options.okText || "OK";
        var cancelText = options.cancelText || "Cancel";
        var onOk = options.onOk || function () { };
        var onCancel = options.onCancel || function () { };

        var $overlay = $('<div class="ub-modal-backdrop"></div>');
        var html =
            '<div class="ub-modal ub-modal-confirm">' +
            '  <div class="ub-modal-header">' + title + '</div>' +
            '  <div class="ub-modal-body">' +
            '    <div class="ub-modal-message">' + message + '</div>' +
            '  </div>' +
            '  <div class="ub-modal-footer">' +
            '    <button type="button" class="ub-btn ub-btn-secondary ub-btn-cancel">' + cancelText + '</button>' +
            '    <button type="button" class="ub-btn ub-btn-primary ub-btn-ok">' + okText + '</button>' +
            '  </div>' +
            '</div>';

        var $dlg = $(html);
        $overlay.append($dlg);
        $("body").append($overlay);

        function closeDialog() {
            $(document).off("keydown.ubConfirmDlg");
            $overlay.remove();
        }

        function handleOk() {
            closeDialog();
            onOk();
        }

        function handleCancel() {
            closeDialog();
            onCancel();
        }

        $dlg.find(".ub-btn-ok").on("click", handleOk);
        $dlg.find(".ub-btn-cancel").on("click", handleCancel);

        $(document).on("keydown.ubConfirmDlg", function (e) {
            if (e.key === "Escape") {
                handleCancel();
            } else if (e.key === "Enter") {
                handleOk();
            }
        });
    },

    // ====== TOAST ======
    initToast: function () {
        if ($(".ui-toast-container").length === 0) {
            $("body").append('<div class="ui-toast-container"></div>');
        }
    },

    showToast: function (msgOrOpt, type) {
        var opt = (typeof msgOrOpt === "string")
            ? { text: msgOrOpt, type: type || "info" }
            : (msgOrOpt || {});

        var text = opt.text || "";
        var t = opt.type || "info";
        var timeout = opt.timeout || 5000;

        var $container = $(".ui-toast-container");
        if (!$container.length) {
            this.initToast();
            $container = $(".ui-toast-container");
        }

        var cls = "ui-toast-info";
        if (t === "success") cls = "ui-toast-success";
        else if (t === "error") cls = "ui-toast-error";
        else if (t === "warning") cls = "ui-toast-warning";

        var secsTotal = Math.round(timeout / 1000);
        var secsLeft = secsTotal;

        var $toast = $('<div class="ui-toast ' + cls + '"></div>');
        var $header = $('<div class="ui-toast-header"></div>');
        var $text = $('<span class="ui-toast-text"></span>').text(text);
        var $count = $('<span class="ui-toast-countdown"></span>').text(secsTotal + "s");
        var $close = $('<span class="ui-toast-close">&times;</span>');

        $header.append($text, $count, $close);
        $toast.append($header);

        var $prog = $('<div class="ui-toast-progress"><div class="ui-toast-progress-bar"></div></div>');
        var $bar = $prog.find(".ui-toast-progress-bar");

        $toast.append($prog);
        $container.append($toast);

        setTimeout(function () {
            $toast.addClass("show");
            $bar.css("transition-duration", timeout + "ms");
            $bar.css("transform", "scaleX(0)");
        }, 10);

        var removed = false;
        function removeToast() {
            if (removed) return;
            removed = true;
            clearInterval(timer);
            clearTimeout(autoHide);

            $toast.removeClass("show");
            setTimeout(function () { $toast.remove(); }, 200);
        }

        $close.on("click", removeToast);

        var timer = setInterval(function () {
            secsLeft--;
            if (secsLeft <= 0) {
                secsLeft = 0;
                clearInterval(timer);
            }
            $count.text(secsLeft + "s");
        }, 1000);

        var autoHide = setTimeout(removeToast, timeout);
    },

    // ========= Save control / page (giữ nguyên) =========
    saveControlToServer: function (controlId) {
        var cfg = this.getControlConfig(controlId);
        if (!cfg) {
            builder.showToast("Không tìm thấy control " + controlId, "error");
            return;
        }

        var defaultName = cfg.controlName || cfg.titleText || cfg.id;
        var self = this;

        this.showSaveDialog({
            title: "Save control",
            nameLabel: "Control name",
            defaultName: defaultName,
            defaultIsPublic: true,
            onOk: function (result) {
                var name = result.name;
                var isPublic = result.isPublic;

                cfg.controlName = name;

                var canvasEl = document.getElementById("canvas");
                if (!canvasEl) {
                    builder.showToast("Không tìm thấy vùng canvas để chụp hình.", "error");
                    return;
                }

                html2canvas(canvasEl, {
                    scale: 2,
                    backgroundColor: "#ffffff"
                }).then(function (canvas) {
                    var thumbDataUrl = canvas.toDataURL("image/png");

                    var payload = {
                        controlId: cfg.controlDbId || null,
                        name: name,
                        controlType: cfg.type || "grid",
                        jsonConfig: JSON.stringify(cfg),
                        isPublic: isPublic,
                        thumbnailData: thumbDataUrl
                    };

                    $.ajax({
                        url: builderServiceUrl + "/SaveControl",
                        method: "POST",
                        contentType: "application/json; charset=utf-8",
                        data: JSON.stringify(payload),
                        success: function (res) {
                            var newId = res.d;
                            cfg.controlDbId = newId;
                            builder.showToast("Đã lưu control (ID = " + newId + ")", "success");
                        },
                        error: function (xhr) {
                            builder.showToast("Lỗi khi lưu control: " + xhr.responseText, "error");
                        }
                    });
                });
            }
        });
    },

    savePageToServer: function () {
        var self = this;
        var json = JSON.stringify(this.controls || []);

        var defaultName = "New Page";
        if (this.currentDesignInfo &&
            this.currentDesignInfo.ControlType === "page" &&
            this.currentDesignInfo.Name) {

            if (this.currentDesignInfo.IsClone) {
                defaultName = this.currentDesignInfo.Name + " Clone";
            } else {
                defaultName = this.currentDesignInfo.Name;
            }
        }

        this.showSaveDialog({
            title: "Save page design",
            nameLabel: "Page name",
            defaultName: defaultName,
            defaultIsPublic: true,
            onOk: function (result) {
                var pageName = result.name;
                var isPublic = result.isPublic;

                var controlName = pageName;

                var controlId = parseInt($("#hiddenControlId").val() || "0", 10);
                var isCloneMode = self.currentDesignInfo && self.currentDesignInfo.IsClone;
                var controlIdToSave = (controlId > 0 && !isCloneMode) ? controlId : null;

                var canvasEl = document.getElementById("canvas");
                if (!canvasEl) {
                    alert("Không tìm thấy vùng canvas để chụp hình.");
                    return;
                }

                html2canvas(canvasEl, {
                    scale: 2,
                    backgroundColor: "#ffffff"
                }).then(function (canvas) {
                    var thumbDataUrl = canvas.toDataURL("image/png");

                    $.ajax({
                        url: builderServiceUrl + "/SaveDesign",
                        method: "POST",
                        contentType: "application/json; charset=utf-8",
                        data: JSON.stringify({
                            controlId: controlIdToSave,
                            pageName: pageName,
                            controlName: controlName,
                            controlType: "page",
                            jsonConfig: json,
                            isPublic: isPublic,
                            thumbnailData: thumbDataUrl,
                            projectId: result.projectId || null
                        }),
                        success: function (res) {
                            var newId = res.d;
                            $("#hiddenControlId").val(newId);

                            self.setCurrentDesignInfo({
                                ControlId: newId,
                                Name: pageName,
                                ControlType: "page",
                                IsOwner: true
                            }, false);

                            builder.showToast("Đã lưu design (ID = " + newId + ")", "success");
                        },
                        error: function (xhr) {
                            builder.showToast("Lỗi khi lưu design: " + xhr.responseText, "error");
                        }
                    });
                });
            }
        });
    },

    // ========= Template controls / Load config (giữ nguyên logic, chỉ dùng renderControlByConfig) =========
    loadTemplateControls: function () {
        var self = this;

        $.ajax({
            url: builderServiceUrl + "/GetControlList",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: "{}",
            success: function (res) {
                var list = res.d || [];
                var $box = $("#tplControls").empty();

                var templates = list.filter(function (x) {
                    return x.ControlType !== "page";
                });

                if (!templates.length) {
                    $box.append('<div style="font-size:12px;color:#999;">Chưa có template nào.</div>');
                    return;
                }

                templates.forEach(function (t) {
                    var $item = $('<div class="tool-item tpl-item"></div>')
                        .attr("data-template-id", t.ControlId);

                    var $main = $('<div class="tpl-main"></div>')
                        .text("📦 " + t.Name + " (" + t.ControlType + ")");

                    var $actions = $('<div class="tpl-actions" style="margin-top:4px;font-size:11px;"></div>');
                    var $btnUse = $('<a href="javascript:void(0)">Dùng</a>');
                    var $btnEdit = $('<a href="javascript:void(0)" style="margin-left:8px;">Sửa</a>');
                    var $btnDel = $('<a href="javascript:void(0)" style="margin-left:8px;color:red;">Xoá</a>');

                    $actions.append($btnUse, $btnEdit, $btnDel);
                    $item.append($main, $actions);
                    $box.append($item);

                    var id = t.ControlId;

                    $btnUse.on("click", function () {
                        self.addTemplateToCanvas(id);
                    });
                    $btnEdit.on("click", function () {
                        window.open(builderEditBaseUrl + "?controlId=" + id, "_blank");
                    });
                    $btnDel.on("click", function () {
                        if (!confirm("Xoá template '" + t.Name + "' ?")) return;

                        $.ajax({
                            url: builderServiceUrl + "/DeleteControl",
                            method: "POST",
                            contentType: "application/json; charset=utf-8",
                            data: JSON.stringify({ controlId: id }),
                            success: function () {
                                self.loadTemplateControls();
                            },
                            error: function (xhr) {
                                alert("Lỗi xoá template: " + xhr.responseText);
                            }
                        });
                    });
                });
            },
            error: function () {
                $("#tplControls").html(
                    '<span style="font-size:12px;color:red;">Lỗi load template</span>'
                );
            }
        });
    },

    addTemplateToCanvas: function (templateId) {
        $.ajax({
            url: builderServiceUrl + "/LoadControl",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ controlId: templateId }),
            success: function (res) {
                var dto = res.d;
                if (!dto) { alert("Không tìm thấy template"); return; }

                var cfg = JSON.parse(dto.JsonConfig);

                cfg = $.extend(true, {}, cfg);
                cfg.controlDbId = null;
                cfg.id = (cfg.type || "ctrl") + "_" + Date.now();

                builder.renderControlByConfig(cfg);
                builder.registerControl(cfg);
            },
            error: function (xhr) {
                alert("Lỗi load template: " + xhr.responseText);
            }
        });
    },

    loadControlFromServer: function (controlId, isClone) {
        $.ajax({
            url: builderServiceUrl + "/LoadControl",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ controlId: controlId }),
            success: function (res) {
                var dto = res.d;
                if (!dto) { alert("Không tìm thấy control"); return; }

                var cfg = JSON.parse(dto.JsonConfig);

                if (dto.ControlType === "page") {
                    builder.setCurrentDesignInfo(dto, !!isClone);

                    var arr = Array.isArray(cfg) ? cfg : [];
                    builder.controls = [];
                    $("#canvas-zoom-inner").empty();
                    $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");

                    // ✅ Cùng logic loadConfig/restoreFromJson: sắp thứ tự phụ thuộc (parent trước child) + _fromRestore
                    // để control trong popup/groupbox không bị vẽ sai (đẩy lên đầu popup hoặc ra ngoài)
                    var ordered = [];
                    var remaining = arr.slice();
                    var maxIter = 500;
                    while (remaining.length && maxIter-- > 0) {
                        var pick = remaining.filter(function (c) {
                            if (!c.parentId) return true;
                            return ordered.some(function (x) { return x.id === c.parentId; });
                        });
                        if (!pick.length) break;
                        ordered = ordered.concat(pick);
                        remaining = remaining.filter(function (c) { return pick.indexOf(c) === -1; });
                    }
                    if (remaining.length) ordered = ordered.concat(remaining);

                    ordered.forEach(function (c) {
                        if (c.type === "field" && !c.uiMode) c.uiMode = "core";
                        c._fromRestore = true;
                        builder.renderControlByConfig(c);
                        delete c._fromRestore;
                        builder.controls.push(c);
                    });

                    builder.refreshJson();
                } else {
                    builder.setCurrentDesignInfo(dto, false);

                    cfg.controlDbId = dto.ControlId;
                    cfg.controlName = dto.Name;

                    builder.renderControlByConfig(cfg);

                    builder.controls = [cfg];
                    builder.refreshJson();
                }
            },
            error: function (xhr) {
                alert("Lỗi load control: " + xhr.responseText);
            }
        });
    },

    addControl: function (type, uiMode, dropPoint) {
        uiMode = uiMode || "core";

        // ✅ Detect popup: Check xem drop point có nằm trong viewport của popup không
        var popupId = null;
        var $popups = $(".popup-design");
        
        if ($popups.length > 0 && dropPoint && dropPoint.clientX != null && dropPoint.clientY != null) {
            var self = this;
            var foundPopup = null;
            
            // Check từng popup xem drop point có nằm trong viewport của nó không
            $popups.each(function() {
                var $popup = $(this);
                var pid = $popup.attr("data-id");
                if (!pid) return;
                
                var popupRect = this.getBoundingClientRect();
                
                // Check xem drop point có nằm trong popup viewport không (với tolerance lớn)
                // Dùng viewport coordinates vì đơn giản và chính xác hơn
                var tolerance = 150; // Tolerance lớn để bù cho drag hint và các edge cases
                var inside = (dropPoint.clientX >= (popupRect.left - tolerance) && 
                             dropPoint.clientX <= (popupRect.right + tolerance) && 
                             dropPoint.clientY >= (popupRect.top - tolerance) && 
                             dropPoint.clientY <= (popupRect.bottom + tolerance));
                
                if (inside) {
                    foundPopup = pid;
                    console.log("Builder.addControl: ✅ Drop point inside popup viewport:", pid, "at", dropPoint.clientX, dropPoint.clientY);
                    return false; // Break loop
                }
            });
            
            if (foundPopup) {
                popupId = foundPopup;
            } else {
                // Nếu không tìm thấy, log để debug
                console.log("Builder.addControl: Drop point not inside any popup viewport:", dropPoint.clientX, dropPoint.clientY);
                $popups.each(function() {
                    var r = this.getBoundingClientRect();
                    console.log("  - Popup", $(this).attr("data-id"), "viewport rect:", r.left, r.top, r.right, r.bottom);
                });
            }
        } else if ($popups.length === 0) {
            console.log("Builder.addControl: No popup found in DOM");
        } else {
            console.log("Builder.addControl: No dropPoint or missing coordinates");
        }

        // ✅ Detect drop vào collapsible-section (giống groupbox/section)
        var collapsibleSectionId = null;
        if (type !== "collapsible-section" && dropPoint && dropPoint.clientX != null && dropPoint.clientY != null) {
            var $sections = $(".ess-collapsible-section");
            $sections.each(function() {
                var $section = $(this);
                var sid = $section.attr("data-id");
                if (!sid) return;
                var $content = $section.find(".ess-collapsible-content");
                if (!$content.length || !$content.is(":visible")) return;
                var contentRect = $content[0].getBoundingClientRect();
                var inside = (dropPoint.clientX >= contentRect.left &&
                             dropPoint.clientX <= contentRect.right &&
                             dropPoint.clientY >= contentRect.top &&
                             dropPoint.clientY <= contentRect.bottom);
                if (inside) {
                    collapsibleSectionId = sid;
                    return false;
                }
            });
        }

        // ✅ Detect drop vào groupbox/section - ưu tiên để control không bị nằm dưới groupbox
        // 1) Thử content area trước; 2) Nếu không trúng thì thử toàn bộ bounds của groupbox (title + border) để tránh miss khi thả lên đầu/viền
        var groupboxOrSectionId = null;
        if (type && type.indexOf("field-") === 0 && dropPoint && dropPoint.clientX != null && dropPoint.clientY != null) {
            var px = dropPoint.clientX, py = dropPoint.clientY;
            var $contents = $(".page-field-groupbox-content, .page-field-section-content");
            $contents.each(function() {
                var r = this.getBoundingClientRect();
                if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
                    var $gb = $(this).closest(".page-field-groupbox, .page-field-section, .popup-groupbox, .popup-section");
                    if ($gb.length) { var gid = $gb.attr("data-id"); if (gid) groupboxOrSectionId = gid; }
                    return false;
                }
            });
            // Nếu chưa trúng content, kiểm tra toàn bộ groupbox/section (kể cả vùng title) → control không bị rơi ra ngoài nằm dưới
            if (!groupboxOrSectionId) {
                var $groups = $(".page-field-groupbox, .page-field-section, .popup-groupbox, .popup-section");
                var best = null, bestArea = Infinity;
                $groups.each(function() {
                    var r = this.getBoundingClientRect();
                    if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
                        var area = r.width * r.height;
                        if (area < bestArea) { bestArea = area; best = $(this).attr("data-id"); }
                    }
                });
                if (best) groupboxOrSectionId = best;
            }
        }

        if (type === "grid") {
            controlGrid.addNew(collapsibleSectionId || popupId, dropPoint);

        } else if (type === "ess-grid") {
            if (window.controlGridEss && typeof controlGridEss.addNew === "function") {
                controlGridEss.addNew(uiMode, collapsibleSectionId || popupId, dropPoint);
            }

        } else if (type === "popup") {
            controlPopup.addNew();

        } else if (type && type.indexOf("field-") === 0) {
            var ftype = type.substring("field-".length);
            if (window.controlField && typeof controlField.addNew === "function") {
                // Ưu tiên: groupbox/section > collapsible-section > popup (để control luôn vào đúng container, không bị đè)
                controlField.addNew(ftype, uiMode, groupboxOrSectionId || collapsibleSectionId || popupId, dropPoint);
            }

        } else if (type === "toolbar") {
            // Toolbar có thể drop vào collapsible section, nhưng cần xử lý riêng
            controlToolbar.addNew(dropPoint);
        } else if (type === "tabpage") {
            controlTabPage.addNew();
        } else if (type === "collapsible-section") {
            if (window.controlCollapsibleSection && typeof controlCollapsibleSection.addNew === "function") {
                controlCollapsibleSection.addNew(dropPoint);
            }
        }

        this.refreshJson();
    },

    registerControl: function (cfg) {
        this.controls.push(cfg);
        this.refreshJson();
    },

    findControl: function (id) {
        return this.getControlConfig(id);
    },

    refreshJson: function (opt) {
        var json = JSON.stringify(this.controls, null, 4);
        $("#txtJson").val(json);

        // Sau khi có thay đổi layout, cập nhật lại Canvas W/H theo nội dung thực tế
        this.updateCanvasSizeFromContent();

        if (!opt || !opt.skipHistory) {
            this.pushHistory();
        }
        this.updateOutline();
    },

    saveConfig: function () {
        var json = JSON.stringify(this.controls || []);
        $.ajax({
            url: builderServiceUrl + "/SaveConfig",
            type: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({ json: json }),
            success: function () {
                alert("Đã lưu JSON vào server (Output/generated-config.json)");
            },
            error: function (xhr) {
                alert("Lỗi khi lưu JSON: " + xhr.responseText);
            }
        });
    },

    loadConfig: function () {
        var self = this;
        $.ajax({
            url: builderServiceUrl + "/LoadConfig",
            type: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: "{}",
            success: function (res) {
                var json = res.d || "[]";
                var arr = [];
                try { arr = JSON.parse(json); } catch (e) { console.warn(e); }
                self.controls = [];
                $("#canvas-zoom-inner").empty();
                $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");

                // Cùng logic restoreFromJson: sắp thứ tự phụ thuộc + fromRestore để control trong popup/groupbox không bị vẽ ra ngoài
                var ordered = [];
                var remaining = arr.slice();
                var maxIter = 500;
                while (remaining.length && maxIter-- > 0) {
                    var pick = remaining.filter(function (c) {
                        if (!c.parentId) return true;
                        return ordered.some(function (x) { return x.id === c.parentId; });
                    });
                    if (!pick.length) break;
                    ordered = ordered.concat(pick);
                    remaining = remaining.filter(function (c) { return pick.indexOf(c) === -1; });
                }
                if (remaining.length) ordered = ordered.concat(remaining);

                ordered.forEach(function (cfg) {
                    if (cfg.type === "field" && !cfg.uiMode) cfg.uiMode = "core";
                    cfg._fromRestore = true;
                    self.renderControlByConfig(cfg);
                    delete cfg._fromRestore;
                    self.controls.push(cfg);
                });

                self.refreshJson();
            }
        });
    },

    showPreview: function () {
        window.location.href = "Preview.aspx";
    },

    downloadJson: function () {
        var json = JSON.stringify(this.controls || [], null, 4);
        var blob = new Blob([json], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "generated-config.json";
        a.click();
    },

    exportWord: function () {
        window.location.href = "WordExport.aspx";
    },

    // ✅ Xuất hình ảnh (dùng html2canvas) - Clone canvas giống preview để capture đầy đủ
    // ✅ Xuất ảnh từ preview canvas đang hiển thị
    exportImageFromPreview: function($previewCanvas) {
        var self = this;
        
        if (!$previewCanvas || !$previewCanvas.length) {
            this.showToast("Không tìm thấy preview canvas để xuất hình ảnh", "error");
            return;
        }

        this.showToast("Đang xuất hình ảnh từ preview...", "info");
        
        // Lấy kích thước từ preview canvas
        var finalWidth = parseInt($previewCanvas.css("width")) || $previewCanvas.width();
        var finalHeight = parseInt($previewCanvas.css("height")) || $previewCanvas.height();
        
        // Đợi một chút để đảm bảo DOM đã render xong
        setTimeout(function() {
            // Force reflow để đảm bảo DOM được render đầy đủ
            $previewCanvas[0].offsetHeight;
            
            // ✅ Đảm bảo text trong tag được render TRƯỚC KHI html2canvas capture
            // Sync text từ canvas gốc vào preview canvas
            var originalTags = $("#canvas").find(".ess-tag, .ess-grid-tag");
            var previewTags = $previewCanvas.find(".ess-tag, .ess-grid-tag");
            
            originalTags.each(function(index) {
                if (previewTags.length > index) {
                    var $originalTag = $(this);
                    var $originalText = $originalTag.find(".ess-tag-text");
                    var originalText = $originalText.text() || $originalText.html() || "";
                    
                    if (originalText.trim() !== "") {
                        var previewTagEl = previewTags[index];
                        var originalBg = $originalTag.css("background-color") || "#0D9EFF";
                        var originalColor = $originalText.css("color") || $originalTag.css("color") || "#ffffff";
                        
                        // ✅ Render lại toàn bộ innerHTML với text được đặt trực tiếp trong HTML string
                        // ✅ Thử đổi display từ inline-flex sang inline-block để html2canvas render được text
                        previewTagEl.innerHTML = '<span class="ess-tag-icon" style="margin-right:4px; display:inline-block; vertical-align:middle;"><i class="bi bi-tag-fill"></i></span><span class="ess-tag-text" style="display:inline-block; vertical-align:middle;">' + originalText + '</span>';
                        
                        // Set style cho parent tag - ✅ Đổi từ inline-flex sang inline-block
                        previewTagEl.style.backgroundColor = originalBg;
                        previewTagEl.style.color = originalColor;
                        previewTagEl.style.display = "inline-block"; // ✅ Đổi từ inline-flex sang inline-block
                        previewTagEl.style.verticalAlign = "middle";
                        previewTagEl.style.padding = "2px 8px";
                        previewTagEl.style.borderRadius = "999px";
                        previewTagEl.style.fontSize = "11px";
                        previewTagEl.style.fontWeight = "500";
                        previewTagEl.style.whiteSpace = "nowrap";
                        previewTagEl.style.lineHeight = "18px"; // ✅ Thêm line-height để căn giữa
                        
                        // Set style cho text element
                        var previewTextEl = previewTagEl.querySelector(".ess-tag-text");
                        if (previewTextEl) {
                            previewTextEl.style.display = "inline-block";
                            previewTextEl.style.visibility = "visible";
                            previewTextEl.style.opacity = "1";
                            previewTextEl.style.fontSize = "11px";
                            previewTextEl.style.lineHeight = "18px";
                            previewTextEl.style.whiteSpace = "nowrap";
                            previewTextEl.style.color = originalColor;
                            previewTextEl.style.verticalAlign = "middle";
                            previewTextEl.textContent = originalText;
                            previewTextEl.innerText = originalText;
                        }
                    }
                }
            });
            
            // Đợi thêm một chút để đảm bảo DOM đã render xong
            setTimeout(function() {
                // ✅ Sử dụng html2canvas để chụp preview canvas
                html2canvas($previewCanvas[0], {
                    backgroundColor: "#ffffff",
                    scale: 2, // Tăng độ phân giải
                    useCORS: true,
                    logging: false,
                    width: finalWidth,
                    height: finalHeight,
                    allowTaint: true,
                    foreignObjectRendering: false,
                    onclone: function(clonedDoc) {
                        // ✅ Đảm bảo text trong tag được render trong cloned document
                        var clonedTagElements = clonedDoc.querySelectorAll(".ess-tag, .ess-grid-tag");
                        var originalTags = $("#canvas").find(".ess-tag, .ess-grid-tag");
                        
                        console.log("🎨 exportImageFromPreview onclone: Found", clonedTagElements.length, "tags");
                        
                        clonedTagElements.forEach(function(clonedTagEl, index) {
                            if (originalTags.length > index) {
                                var $originalTag = originalTags.eq(index);
                                var $originalText = $originalTag.find(".ess-tag-text");
                                var originalText = $originalText.text() || $originalText.html() || "";
                                
                                console.log("🎨 exportImageFromPreview onclone Tag " + index + " original text:", originalText);
                                
                                if (originalText.trim() !== "") {
                                    var originalBg = $originalTag.css("background-color") || "#0D9EFF";
                                    var originalColor = $originalText.css("color") || $originalTag.css("color") || "#ffffff";
                                    
                                    // ✅ Thử cách khác: Render text TRỰC TIẾP vào parent tag (không dùng nested span)
                                    // Xóa tất cả children cũ
                                    clonedTagEl.innerHTML = "";
                                    
                                    // Tạo icon
                                    var iconSpan = clonedDoc.createElement("span");
                                    iconSpan.className = "ess-tag-icon";
                                    iconSpan.style.marginRight = "4px";
                                    iconSpan.style.display = "inline-block";
                                    var iconI = clonedDoc.createElement("i");
                                    iconI.className = "bi bi-tag-fill";
                                    iconSpan.appendChild(iconI);
                                    
                                    // ✅ Tạo text node TRỰC TIẾP và append vào parent tag (không dùng nested span)
                                    var textNode = clonedDoc.createTextNode(originalText);
                                    
                                    // Append icon và text vào parent tag
                                    clonedTagEl.appendChild(iconSpan);
                                    clonedTagEl.appendChild(textNode);
                                    
                                    // Set style cho parent tag - ✅ Đổi từ inline-flex sang inline-block
                                    clonedTagEl.style.backgroundColor = originalBg;
                                    clonedTagEl.style.color = originalColor;
                                    clonedTagEl.style.display = "inline-block"; // ✅ Đổi từ inline-flex sang inline-block
                                    clonedTagEl.style.verticalAlign = "middle";
                                    clonedTagEl.style.padding = "2px 8px";
                                    clonedTagEl.style.borderRadius = "999px";
                                    clonedTagEl.style.fontSize = "11px";
                                    clonedTagEl.style.fontWeight = "500";
                                    clonedTagEl.style.whiteSpace = "nowrap";
                                    clonedTagEl.style.lineHeight = "18px"; // ✅ Thêm line-height để căn giữa
                                    
                                    // Set style cho icon
                                    if (iconSpan) {
                                        iconSpan.style.verticalAlign = "middle";
                                    }
                                    
                                    console.log("🎨 exportImageFromPreview onclone Tag " + index + " re-rendered with text node:", originalText, "textContent:", clonedTagEl.textContent, "childNodes:", clonedTagEl.childNodes.length);
                                    
                                    console.log("🎨 exportImageFromPreview onclone Tag " + index + " re-rendered with text:", originalText);
                                }
                            }
                        });
                        
                        // ✅ Chỉnh CSS cho combobox để text căn giữa đúng và đảm bảo mũi tên được render
                        // Tìm TẤT CẢ select elements (không phân biệt class)
                        var allSelects = clonedDoc.querySelectorAll("select");
                        
                        console.log("🔧 Found all select elements:", allSelects.length);
                        
                        allSelects.forEach(function(clonedCombo, index) {
                            // ✅ Kiểm tra parent bằng cách traverse DOM thay vì dùng closest()
                            var parent = clonedCombo.parentElement;
                            var isGridCombo = false;
                            var isPageFieldCombo = false;
                            
                            // ✅ Check class của chính select element trước
                            var selectClass = clonedCombo.className || "";
                            if (typeof selectClass === "string") {
                                if (selectClass.indexOf("ess-grid-editor-combo") !== -1 || selectClass.indexOf("ess-grid-input") !== -1) {
                                    isGridCombo = true;
                                }
                                // ✅ Bỏ qua zoom-select và các select không phải combobox
                                if (selectClass.indexOf("zoom-select") !== -1) {
                                    console.log("🔧 Skipping zoom-select:", index);
                                    return;
                                }
                            }
                            
                            // ✅ Check parent class trực tiếp trước khi traverse
                            var parentClass = parent ? (parent.className || "") : "";
                            if (typeof parentClass === "string") {
                                // ✅ Check page-field-editor trực tiếp
                                if (parentClass.indexOf("page-field-editor") !== -1) {
                                    isPageFieldCombo = true;
                                }
                                // ✅ Check ess-grid-control trực tiếp
                                if (parentClass.indexOf("ess-grid-control") !== -1) {
                                    isGridCombo = true;
                                }
                            }
                            
                            // Traverse lên để tìm parent có class nếu chưa tìm thấy
                            var currentParent = parent;
                            while (currentParent && currentParent !== clonedDoc.body && !isGridCombo && !isPageFieldCombo) {
                                var currentClass = currentParent.className || "";
                                if (typeof currentClass === "string") {
                                    if (currentClass.indexOf("ess-grid-control") !== -1) {
                                        isGridCombo = true;
                                        break;
                                    }
                                    if (currentClass.indexOf("page-field") !== -1 && currentClass.indexOf("ess-field") !== -1) {
                                        isPageFieldCombo = true;
                                        break;
                                    }
                                    if (currentClass.indexOf("page-field-editor") !== -1) {
                                        isPageFieldCombo = true;
                                        break;
                                    }
                                }
                                currentParent = currentParent.parentElement;
                            }
                            
                            console.log("🔧 Select " + index + ":", {
                                classes: clonedCombo.className,
                                isGridCombo: isGridCombo,
                                isPageFieldCombo: isPageFieldCombo,
                                parentClasses: clonedCombo.parentElement ? clonedCombo.parentElement.className : "none"
                            });
                            
                            if (isGridCombo) {
                                // Combobox lớn (grid) - height 35px
                                clonedCombo.style.setProperty("padding-top", "3px", "important");
                                clonedCombo.style.setProperty("padding-bottom", "3px", "important");
                                clonedCombo.style.setProperty("line-height", "29px", "important");
                                clonedCombo.style.setProperty("height", "35px", "important");
                                // ✅ Đảm bảo background image (mũi tên) được render với !important
                                clonedCombo.style.setProperty("background-image", "linear-gradient(45deg, transparent 50%, #4b5563 50%), linear-gradient(135deg, #4b5563 50%, transparent 50%)", "important");
                                clonedCombo.style.setProperty("background-position", "calc(100% - 10px) center, calc(100% - 6px) center", "important");
                                clonedCombo.style.setProperty("background-size", "4px 4px, 4px 4px", "important");
                                clonedCombo.style.setProperty("background-repeat", "no-repeat", "important");
                                clonedCombo.style.setProperty("padding-right", "20px", "important");
                                clonedCombo.style.setProperty("appearance", "none", "important");
                            } else if (isPageFieldCombo) {
                                // Combobox nhỏ (page-field) - height 26px
                                clonedCombo.style.setProperty("padding-top", "2px", "important");
                                clonedCombo.style.setProperty("padding-bottom", "2px", "important");
                                clonedCombo.style.setProperty("line-height", "22px", "important");
                                clonedCombo.style.setProperty("height", "26px", "important");
                                clonedCombo.style.setProperty("padding-right", "18px", "important");
                                clonedCombo.style.setProperty("appearance", "none", "important");
                            }
                            
                            clonedCombo.style.setProperty("vertical-align", "middle", "important");
                            clonedCombo.style.setProperty("box-sizing", "border-box", "important");
                            clonedCombo.style.setProperty("display", "inline-block", "important");
                            
                            // ✅ Debug: Check computed style sau khi set
                            var computedStyle = clonedDoc.defaultView ? clonedDoc.defaultView.getComputedStyle(clonedCombo) : null;
                            console.log("🔧 Combobox " + index + " AFTER fix:", {
                                paddingTop: clonedCombo.style.paddingTop || (computedStyle ? computedStyle.paddingTop : "N/A"),
                                paddingBottom: clonedCombo.style.paddingBottom || (computedStyle ? computedStyle.paddingBottom : "N/A"),
                                lineHeight: clonedCombo.style.lineHeight || (computedStyle ? computedStyle.lineHeight : "N/A"),
                                height: clonedCombo.style.height || (computedStyle ? computedStyle.height : "N/A"),
                                backgroundImage: clonedCombo.style.backgroundImage || (computedStyle ? computedStyle.backgroundImage : "N/A")
                            });
                        });
                        
                        // ✅ Đảm bảo icon của date picker được render
                        // Tìm tất cả các date editor containers
                        var clonedDateEditors = clonedDoc.querySelectorAll(".ess-grid-editor-date, .ess-date");
                        
                        console.log("🔧 Found date editors:", clonedDateEditors.length);
                        
                        clonedDateEditors.forEach(function(dateEditor, idx) {
                            console.log("🔧 Date editor " + idx + ":", {
                                classes: dateEditor.className,
                                innerHTML: dateEditor.innerHTML.substring(0, 100)
                            });
                            
                            // Tìm tất cả span bên trong date editor
                            var iconSpans = dateEditor.querySelectorAll("span");
                            console.log("🔧 Found spans in date editor " + idx + ":", iconSpans.length);
                            
                            iconSpans.forEach(function(iconSpan, spanIdx) {
                                var iconClass = iconSpan.className || "";
                                var hasIcon = iconSpan.querySelector("i");
                                
                                console.log("🔧 Span " + spanIdx + ":", {
                                    classes: iconClass,
                                    hasIcon: !!hasIcon,
                                    innerHTML: iconSpan.innerHTML.substring(0, 50)
                                });
                                
                                // ✅ Xử lý nếu có class date-icon/date-addon hoặc có icon bên trong
                                if (iconClass.indexOf("date-icon") !== -1 || 
                                    iconClass.indexOf("date-addon") !== -1 ||
                                    hasIcon) {
                                    
                                    console.log("🔧 Processing date icon span:", iconClass);
                                    
                                    // Đảm bảo icon được hiển thị
                                    iconSpan.style.setProperty("display", "flex", "important");
                                    iconSpan.style.setProperty("visibility", "visible", "important");
                                    iconSpan.style.setProperty("opacity", "1", "important");
                                    iconSpan.style.setProperty("align-items", "center", "important");
                                    iconSpan.style.setProperty("justify-content", "center", "important");
                                    
                                    // Đảm bảo icon bên trong được render
                                    var iconElement = iconSpan.querySelector("i");
                                    if (iconElement) {
                                        iconElement.style.setProperty("display", "inline-block", "important");
                                        iconElement.style.setProperty("visibility", "visible", "important");
                                        iconElement.style.setProperty("opacity", "1", "important");
                                        iconElement.style.setProperty("font-size", "14px", "important");
                                        iconElement.style.setProperty("line-height", "1", "important");
                                    }
                                }
                            });
                        });
                    }
                }).then(function (canvas) {
                    // Chuyển canvas thành blob và download
                    canvas.toBlob(function (blob) {
                        var a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "ui-design-" + new Date().getTime() + ".png";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                        
                        self.showToast("Đã xuất hình ảnh thành công từ preview!", "success");
                    }, "image/png");
                }).catch(function (error) {
                    console.error("Export image error:", error);
                    self.showToast("Lỗi khi xuất hình ảnh: " + error.message, "error");
                });
            }, 100); // Đợi thêm 100ms để đảm bảo DOM đã render xong
        }, 300); // Đợi 300ms ban đầu
    },

    exportImage: function () {
        var self = this;
        var $canvas = $("#canvas");
        
        if (!$canvas.length) {
            this.showToast("Không tìm thấy canvas để xuất hình ảnh", "error");
            return;
        }

        // ✅ Xuất trực tiếp từ canvas mà không cần mở preview
        // Tạo preview canvas ẩn và xuất trực tiếp
        var minLeft = Infinity;
        var minTop = Infinity;
        var maxRight = -Infinity;
        var maxBottom = -Infinity;
        
        var allControls = $canvas.find(".popup-design, .canvas-control, .page-field, .popup-field, .canvas-toolbar, .canvas-tabpage, .ess-grid-control");
        
        allControls.each(function() {
            var $el = $(this);
            var leftStr = $el.css("left");
            var topStr = $el.css("top");
            var left = (leftStr && leftStr !== "auto" && leftStr !== "none") ? parseFloat(leftStr) : 0;
            var top = (topStr && topStr !== "auto" && topStr !== "none") ? parseFloat(topStr) : 0;
            if (isNaN(left)) left = 0;
            if (isNaN(top)) top = 0;
            
            var width = $el.outerWidth() || 0;
            var height = $el.outerHeight() || 0;
            
            var $parentPopup = $el.closest(".popup-design");
            if ($parentPopup.length) {
                var popupLeftStr = $parentPopup.css("left");
                var popupTopStr = $parentPopup.css("top");
                var popupLeft = (popupLeftStr && popupLeftStr !== "auto" && popupLeftStr !== "none") ? parseFloat(popupLeftStr) : 0;
                var popupTop = (popupTopStr && popupTopStr !== "auto" && popupTopStr !== "none") ? parseFloat(popupTopStr) : 0;
                if (isNaN(popupLeft)) popupLeft = 0;
                if (isNaN(popupTop)) popupTop = 0;
                left += popupLeft;
                top += popupTop;
            }
            
            minLeft = Math.min(minLeft, left);
            minTop = Math.min(minTop, top);
            maxRight = Math.max(maxRight, left + width);
            maxBottom = Math.max(maxBottom, top + height);
        });
        
        if (minLeft === Infinity) {
            minLeft = 0;
            minTop = 0;
            maxRight = 800;
            maxBottom = 600;
        }
        
        if (minLeft < 0) {
            var adjustNegative = -minLeft;
            minLeft = 0;
            maxRight += adjustNegative;
        }
        if (minTop < 0) {
            var adjustNegative = -minTop;
            minTop = 0;
            maxBottom += adjustNegative;
        }
        
        var paddingLeft = 80;
        var paddingRight = 80;
        var paddingTop = 40;
        var paddingBottom = 40;
        
        var contentWidth = maxRight - minLeft;
        var contentHeight = maxBottom - minTop;
        var finalWidth = contentWidth + paddingLeft + paddingRight;
        var finalHeight = contentHeight + paddingTop + paddingBottom;
        
        var offsetX = paddingLeft - minLeft;
        var offsetY = paddingTop - minTop;
        
        if (minTop > paddingTop) {
            var extraTopPadding = minTop - paddingTop;
            paddingTop = minTop;
            finalHeight += extraTopPadding;
            offsetY = 0;
        }

        var $previewCanvas = $('<div id="previewCanvas" style="position: absolute; left: -9999px; top: 0;"></div>');
        $previewCanvas.css({
            position: "absolute",
            left: "-9999px",
            top: "0",
            background: "#ffffff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "0",
            margin: "0",
            overflow: "visible",
            width: finalWidth + "px",
            minHeight: finalHeight + "px"
        });
        
        $("body").append($previewCanvas);

        var $canvasClone = $canvas.clone(false);
        
        $canvasClone.css({
            position: "relative",
            left: "0",
            top: "0",
            margin: "0",
            padding: "0",
            overflow: "visible"
        });
        
        $canvasClone.find("*").each(function() {
            var $el = $(this);
            $el.removeClass("canvas-control-selected popup-selected popup-field-selected page-field-selected");
            $el.removeAttr("data-interact-id");
            $el.find(".group-badge").remove();
            if ($el.hasClass("canvas-control") || $el.hasClass("popup-design") || $el.hasClass("page-field") || $el.hasClass("popup-field")) {
                $el.css("pointer-events", "none");
            }
        });
        
        $canvasClone.off();
        $canvasClone.find("*").off();
        
        var adjustPosition = function($el, offsetX, offsetY) {
            var leftStr = $el.css("left");
            var topStr = $el.css("top");
            var currentLeft = (leftStr && leftStr !== "auto" && leftStr !== "none") ? parseFloat(leftStr) : 0;
            var currentTop = (topStr && topStr !== "auto" && topStr !== "none") ? parseFloat(topStr) : 0;
            if (isNaN(currentLeft)) currentLeft = 0;
            if (isNaN(currentTop)) currentTop = 0;
            
            $el.css({
                "left": (currentLeft + offsetX) + "px",
                "top": (currentTop + offsetY) + "px"
            });
        };
        
        $canvasClone.find(".popup-design").each(function() {
            adjustPosition($(this), offsetX, offsetY);
        });
        
        $canvasClone.find(".canvas-control").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) return;
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".page-field").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) return;
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".canvas-toolbar").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) return;
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".canvas-tabpage").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) return;
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".ess-grid-control").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) return;
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".popup-field").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) return;
            adjustPosition($el, offsetX, offsetY);
        });
        
        $previewCanvas.css({
            width: finalWidth + "px",
            height: finalHeight + "px",
            minWidth: finalWidth + "px",
            minHeight: finalHeight + "px"
        });
        
        $previewCanvas.append($canvasClone);

        setTimeout(function() {
            $previewCanvas[0].offsetHeight;
            
            setTimeout(function() {
                self.exportImageFromPreview($previewCanvas);
            }, 100);
        }, 100);
    },

    // ✅ Hiển thị Preview fullscreen
    showPreview: function () {
        var self = this;
        var $canvas = $("#canvas");
        if (!$canvas.length) {
            this.showToast("Không tìm thấy canvas để preview", "error");
            return;
        }

        // Tạo modal fullscreen
        var $modal = $('<div class="preview-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #ffffff; z-index: 100000; overflow: auto; display: flex; flex-direction: column;">');
        
        // Header với nút đóng và nút xuất ảnh
        var $header = $('<div style="position: sticky; top: 0; background: #0078d4; color: #fff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 100001; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0;">');
        $header.append('<h3 style="margin: 0; font-size: 18px; font-weight: 600;">👁️ Preview Design</h3>');
        
        // Nút xuất ảnh
        var $exportBtn = $('<button style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; margin-right: 10px;" type="button"><i class="bi bi-download"></i> Xuất ảnh</button>');
        $exportBtn.on("mouseenter", function() {
            $(this).css("background", "rgba(255,255,255,0.3)");
        }).on("mouseleave", function() {
            $(this).css("background", "rgba(255,255,255,0.2)");
        });
        $exportBtn.on("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            // ✅ Tìm preview canvas từ modal khi click (vì $previewCanvas chưa được khai báo ở đây)
            var $previewCanvas = $modal.find("#previewCanvas");
            if ($previewCanvas.length) {
                self.exportImageFromPreview($previewCanvas);
            } else {
                self.showToast("Không tìm thấy preview canvas!", "error");
            }
        });
        
        // Nút đóng
        var $closeBtn = $('<button style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;" type="button"><i class="bi bi-x-lg"></i> Đóng (ESC)</button>');
        $closeBtn.on("mouseenter", function() {
            $(this).css("background", "rgba(255,255,255,0.3)");
        }).on("mouseleave", function() {
            $(this).css("background", "rgba(255,255,255,0.2)");
        });
        
        var $headerButtons = $('<div style="display: flex; align-items: center;"></div>');
        $headerButtons.append($exportBtn);
        $headerButtons.append($closeBtn);
        $header.append($headerButtons);
        $modal.append($header);

        // Content: Clone canvas content
        var $content = $('<div style="flex: 1; padding: 40px; background: #e8e8e8; overflow: auto; display: flex; justify-content: center; align-items: flex-start;"></div>');
        
        // ✅ Tính toán kích thước thực tế của nội dung từ DOM
        // QUAN TRỌNG: Tính từ DOM để đảm bảo chính xác, bao gồm cả controls ngoài viewport
        // Sử dụng getBoundingClientRect() để lấy vị trí chính xác, không phụ thuộc vào scroll
        var minLeft = Infinity;
        var minTop = Infinity;
        var maxRight = -Infinity;
        var maxBottom = -Infinity;
        
        // ✅ Tính từ DOM: tìm tất cả controls và tính bounds
        var allControls = $canvas.find(".popup-design, .canvas-control, .page-field, .popup-field, .canvas-toolbar, .canvas-tabpage, .ess-grid-control");
        
        // Debug: Log số lượng controls tìm được
        console.log("Found controls for bounds calculation:", allControls.length);
        
        // Lấy canvas rect để tính offset
        var canvasRect = $canvas[0].getBoundingClientRect();
        var canvasScrollLeft = $canvas.scrollLeft() || 0;
        var canvasScrollTop = $canvas.scrollTop() || 0;
        
        allControls.each(function() {
            var $el = $(this);
            var el = this;
            
            // ✅ QUAN TRỌNG: Lấy vị trí từ CSS (đã là absolute position trên canvas)
            // CSS left/top đã là relative với canvas, không cần tính scroll
            var leftStr = $el.css("left");
            var topStr = $el.css("top");
            var left = (leftStr && leftStr !== "auto" && leftStr !== "none") ? parseFloat(leftStr) : 0;
            var top = (topStr && topStr !== "auto" && topStr !== "none") ? parseFloat(topStr) : 0;
            if (isNaN(left)) left = 0;
            if (isNaN(top)) top = 0;
            
            var width = $el.outerWidth() || 0;
            var height = $el.outerHeight() || 0;
            
            // ✅ Nếu control nằm trong popup, cần cộng thêm vị trí của popup
            var $parentPopup = $el.closest(".popup-design");
            if ($parentPopup.length) {
                var popupLeftStr = $parentPopup.css("left");
                var popupTopStr = $parentPopup.css("top");
                var popupLeft = (popupLeftStr && popupLeftStr !== "auto" && popupLeftStr !== "none") ? parseFloat(popupLeftStr) : 0;
                var popupTop = (popupTopStr && popupTopStr !== "auto" && popupTopStr !== "none") ? parseFloat(popupTopStr) : 0;
                if (isNaN(popupLeft)) popupLeft = 0;
                if (isNaN(popupTop)) popupTop = 0;
                left += popupLeft;
                top += popupTop;
            }
            
            // Debug: Log từng control để kiểm tra
            if (left < 20 || top < 20) {
                console.log("Control at edge:", {
                    class: $el.attr("class"),
                    id: $el.attr("data-id"),
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    cssLeft: leftStr,
                    cssTop: topStr
                });
            }
            
            // Cập nhật bounds
            minLeft = Math.min(minLeft, left);
            minTop = Math.min(minTop, top);
            maxRight = Math.max(maxRight, left + width);
            maxBottom = Math.max(maxBottom, top + height);
        });
        
        // Nếu không tìm thấy controls nào, dùng giá trị mặc định
        if (minLeft === Infinity) {
            minLeft = 0;
            minTop = 0;
            maxRight = 800;
            maxBottom = 600;
        }
        
        // ✅ QUAN TRỌNG: Đảm bảo minLeft >= 0 để tránh mất phần bên trái
        // Nếu minLeft < 0, điều chỉnh để đảm bảo tất cả controls đều được tính
        if (minLeft < 0) {
            var adjustNegative = -minLeft;
            minLeft = 0;
            // Điều chỉnh maxRight để giữ nguyên contentWidth
            maxRight += adjustNegative;
        }
        if (minTop < 0) {
            var adjustNegative = -minTop;
            minTop = 0;
            maxBottom += adjustNegative;
        }
        
        // Tính kích thước cuối cùng với padding
        // ✅ QUAN TRỌNG: Tăng padding bên trái và phải để đảm bảo không mất phần bên trái/phải
        var padding = 40;
        var paddingLeft = 80; // ✅ Padding bên trái lớn hơn để đảm bảo không mất phần bên trái
        var paddingRight = 80; // ✅ Padding bên phải lớn hơn để đảm bảo không mất phần bên phải
        var paddingTop = 40;
        var paddingBottom = 40;
        
        var contentWidth = maxRight - minLeft;
        var contentHeight = maxBottom - minTop;
        var finalWidth = contentWidth + paddingLeft + paddingRight;
        var finalHeight = contentHeight + paddingTop + paddingBottom;
        
        // ✅ QUAN TRỌNG: Tính offset để dịch controls về vị trí bắt đầu từ paddingLeft và paddingTop
        // offsetX = paddingLeft - minLeft: dịch để control đầu tiên (ở minLeft) đến vị trí paddingLeft
        // offsetY = paddingTop - minTop: dịch để control đầu tiên (ở minTop) đến vị trí paddingTop
        // Nếu minLeft = 0, offsetX = 60 (dịch sang phải 60px để có padding)
        // Nếu minLeft = 20, offsetX = 40 (dịch sang phải 40px để có padding)
        // ✅ QUAN TRỌNG: Nếu minTop > paddingTop, không dịch lên trên, chỉ dịch xuống dưới nếu cần
        // Ví dụ: minTop = 90, paddingTop = 40 -> offsetY = -50 (dịch lên trên) -> KHÔNG ĐÚNG!
        // Giải pháp: Nếu minTop > paddingTop, điều chỉnh paddingTop = minTop để không dịch lên trên
        var offsetX = paddingLeft - minLeft;
        var offsetY = paddingTop - minTop;
        
        // ✅ Nếu minTop > paddingTop, điều chỉnh paddingTop để không dịch lên trên
        if (minTop > paddingTop) {
            var extraTopPadding = minTop - paddingTop;
            paddingTop = minTop; // Điều chỉnh paddingTop = minTop
            finalHeight += extraTopPadding; // Tăng chiều cao để bù phần padding thêm
            offsetY = 0; // Không dịch lên trên
        }
        
        // Tạo preview canvas với kích thước chính xác
        // ✅ QUAN TRỌNG: Không có margin, padding để đảm bảo controls được đặt đúng vị trí
        var $previewCanvas = $('<div id="previewCanvas"></div>');
        $previewCanvas.css({
            position: "relative",
            background: "#ffffff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "0",
            margin: "0",
            overflow: "visible",
            width: finalWidth + "px",
            minHeight: finalHeight + "px"
        });
        
        // Clone toàn bộ canvas (bao gồm cả popup và controls)
        var $canvasClone = $canvas.clone(false); // Clone false để không clone event handlers
        
        // ✅ QUAN TRỌNG: Reset CSS của canvas clone để không bị ảnh hưởng bởi CSS gốc
        $canvasClone.css({
            position: "relative",
            left: "0",
            top: "0",
            margin: "0",
            padding: "0",
            overflow: "visible"
        });
        
        // Loại bỏ các class/attribute tương tác và event handlers
        $canvasClone.find("*").each(function() {
            var $el = $(this);
            // Xóa các class tương tác
            $el.removeClass("canvas-control-selected popup-selected popup-field-selected page-field-selected");
            // Xóa các attribute tương tác
            $el.removeAttr("data-interact-id");
            // ✅ Xóa badge group để không xuất hiện trong preview
            $el.find(".group-badge").remove();
            // Loại bỏ pointer events cho các control (chỉ xem, không tương tác)
            if ($el.hasClass("canvas-control") || $el.hasClass("popup-design") || $el.hasClass("page-field") || $el.hasClass("popup-field")) {
                $el.css("pointer-events", "none");
            }
        });
        
        // Loại bỏ event handlers
        $canvasClone.off();
        $canvasClone.find("*").off();
        
        // Set style cho canvas clone - giữ nguyên kích thước và vị trí
        // ✅ offsetX và offsetY đã được tính ở trên
        
        // Debug: Log để kiểm tra (có thể xóa sau khi test xong)
        console.log("Preview bounds BEFORE adjustment:", { 
            minLeft: minLeft, 
            minTop: minTop, 
            maxRight: maxRight, 
            maxBottom: maxBottom, 
            offsetX: offsetX, 
            offsetY: offsetY, 
            finalWidth: finalWidth, 
            finalHeight: finalHeight,
            contentWidth: contentWidth,
            contentHeight: contentHeight
        });
        
        // ✅ Kiểm tra: Nếu minLeft > 0, có nghĩa là có controls ở vị trí dương
        // Điều này có nghĩa là không có controls ở vị trí 0 hoặc âm
        // Nhưng vẫn cần dịch chuyển để có padding bên trái
        
        // ✅ Điều chỉnh vị trí của tất cả controls trong clone
        // QUAN TRỌNG: Điều chỉnh TẤT CẢ controls một cách đơn giản và rõ ràng
        
        // Helper function để điều chỉnh vị trí một element
        var adjustPosition = function($el, offsetX, offsetY) {
            var leftStr = $el.css("left");
            var topStr = $el.css("top");
            var currentLeft = (leftStr && leftStr !== "auto" && leftStr !== "none") ? parseFloat(leftStr) : 0;
            var currentTop = (topStr && topStr !== "auto" && topStr !== "none") ? parseFloat(topStr) : 0;
            if (isNaN(currentLeft)) currentLeft = 0;
            if (isNaN(currentTop)) currentTop = 0;
            
            $el.css({
                "left": (currentLeft + offsetX) + "px",
                "top": (currentTop + offsetY) + "px"
            });
        };
        
        // ✅ Điều chỉnh TẤT CẢ controls một cách rõ ràng
        // QUAN TRỌNG: Điều chỉnh từng loại control để đảm bảo không bỏ sót
        
        // Bước 1: Điều chỉnh popup trước
        $canvasClone.find(".popup-design").each(function() {
            adjustPosition($(this), offsetX, offsetY);
        });
        
        // Bước 2: Điều chỉnh tất cả controls trực tiếp trên canvas (không trong popup)
        // ✅ QUAN TRỌNG: Sử dụng selector cụ thể để đảm bảo không bỏ sót
        // Điều chỉnh từng loại control một cách rõ ràng
        $canvasClone.find(".canvas-control").each(function() {
            var $el = $(this);
            // Bỏ qua controls bên trong popup-body
            if ($el.closest(".popup-body").length > 0) {
                return;
            }
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".page-field").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) {
                return;
            }
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".canvas-toolbar").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) {
                return;
            }
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".canvas-tabpage").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) {
                return;
            }
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".ess-grid-control").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) {
                return;
            }
            adjustPosition($el, offsetX, offsetY);
        });
        
        $canvasClone.find(".popup-field").each(function() {
            var $el = $(this);
            if ($el.closest(".popup-body").length > 0) {
                return;
            }
            adjustPosition($el, offsetX, offsetY);
        });
        
        // Điều chỉnh lại bounds sau khi dịch chuyển
        var adjustedMinLeft = minLeft + offsetX; // Sẽ = padding
        var adjustedMinTop = minTop + offsetY;    // Sẽ = padding
        var adjustedMaxRight = maxRight + offsetX;
        var adjustedMaxBottom = maxBottom + offsetY;
        
        // Tính lại kích thước sau khi điều chỉnh
        // adjustedMinLeft sẽ = paddingLeft, adjustedMinTop sẽ = paddingTop sau khi dịch chuyển
        // adjustedContentWidth = adjustedMaxRight - adjustedMinLeft = (maxRight + offsetX) - (minLeft + offsetX) = maxRight - minLeft = contentWidth
        var adjustedContentWidth = adjustedMaxRight - adjustedMinLeft;
        var adjustedContentHeight = adjustedMaxBottom - adjustedMinTop;
        finalWidth = adjustedContentWidth + paddingLeft + paddingRight; // ✅ Padding cả hai bên (trái + phải)
        finalHeight = adjustedContentHeight + paddingTop + paddingBottom; // ✅ Padding cả hai bên (trên + dưới)
        
        // ✅ Tính lại bounds thực tế sau khi điều chỉnh để đảm bảo chính xác
        var actualMinLeft = Infinity;
        var actualMinTop = Infinity;
        var actualMaxRight = -Infinity;
        var actualMaxBottom = -Infinity;
        
        var allControlsAfter = $canvasClone.find(".popup-design, .canvas-control, .page-field, .popup-field, .canvas-toolbar, .canvas-tabpage, .ess-grid-control");
        console.log("Found controls AFTER adjustment:", allControlsAfter.length);
        
        allControlsAfter.each(function() {
            var $el = $(this);
            var leftStr = $el.css("left");
            var topStr = $el.css("top");
            var left = (leftStr && leftStr !== "auto" && leftStr !== "none") ? parseFloat(leftStr) : 0;
            var top = (topStr && topStr !== "auto" && topStr !== "none") ? parseFloat(topStr) : 0;
            if (isNaN(left)) left = 0;
            if (isNaN(top)) top = 0;
            
            var width = $el.outerWidth() || 0;
            var height = $el.outerHeight() || 0;
            
            // Nếu trong popup, cộng thêm vị trí popup
            var $parentPopup = $el.closest(".popup-design");
            if ($parentPopup.length) {
                var popupLeftStr = $parentPopup.css("left");
                var popupTopStr = $parentPopup.css("top");
                var popupLeft = (popupLeftStr && popupLeftStr !== "auto" && popupLeftStr !== "none") ? parseFloat(popupLeftStr) : 0;
                var popupTop = (popupTopStr && popupTopStr !== "auto" && popupTopStr !== "none") ? parseFloat(popupTopStr) : 0;
                if (isNaN(popupLeft)) popupLeft = 0;
                if (isNaN(popupTop)) popupTop = 0;
                left += popupLeft;
                top += popupTop;
            }
            
            // Debug: Log controls ở vị trí < paddingLeft hoặc < paddingTop
            if (left < paddingLeft || top < paddingTop) {
                console.log("Control still at edge AFTER adjustment:", {
                    class: $el.attr("class"),
                    id: $el.attr("data-id"),
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    paddingLeft: paddingLeft,
                    paddingTop: paddingTop
                });
            }
            
            actualMinLeft = Math.min(actualMinLeft, left);
            actualMinTop = Math.min(actualMinTop, top);
            actualMaxRight = Math.max(actualMaxRight, left + width);
            actualMaxBottom = Math.max(actualMaxBottom, top + height);
        });
        
        // ✅ QUAN TRỌNG: Đảm bảo actualMinLeft >= paddingLeft và actualMinTop >= paddingTop
        // Nếu actualMinLeft < paddingLeft hoặc actualMinTop < paddingTop, điều chỉnh lại tất cả controls
        var extraPaddingLeft = 0;
        var extraPaddingTop = 0;
        
        if (actualMinLeft !== Infinity && actualMinLeft < paddingLeft) {
            extraPaddingLeft = paddingLeft - actualMinLeft;
            finalWidth += extraPaddingLeft;
            console.log("Need extra padding LEFT:", extraPaddingLeft, "actualMinLeft:", actualMinLeft, "paddingLeft:", paddingLeft);
        }
        
        if (actualMinTop !== Infinity && actualMinTop < paddingTop) {
            extraPaddingTop = paddingTop - actualMinTop;
            finalHeight += extraPaddingTop;
            console.log("Need extra padding TOP:", extraPaddingTop, "actualMinTop:", actualMinTop, "paddingTop:", paddingTop);
        }
        
        if (extraPaddingLeft > 0 || extraPaddingTop > 0) {
            console.log("Adjusting extra padding:", { extraPaddingLeft, extraPaddingTop, actualMinLeft, actualMinTop, paddingLeft, paddingTop });
            
            // Dịch thêm TẤT CẢ elements có position absolute/relative
            $canvasClone.find("*").each(function() {
                var $el = $(this);
                var position = $el.css("position");
                
                if (position !== "absolute" && position !== "relative") {
                    return;
                }
                
                // Bỏ qua controls bên trong popup-body
                if ($el.closest(".popup-body").length > 0 && !$el.hasClass("popup-design")) {
                    return;
                }
                
                // Dịch left
                if (extraPaddingLeft > 0) {
                    var leftStr = $el.css("left");
                    var left = (leftStr && leftStr !== "auto" && leftStr !== "none") ? parseFloat(leftStr) : 0;
                    if (isNaN(left)) left = 0;
                    $el.css("left", (left + extraPaddingLeft) + "px");
                }
                
                // Dịch top
                if (extraPaddingTop > 0) {
                    var topStr = $el.css("top");
                    var top = (topStr && topStr !== "auto" && topStr !== "none") ? parseFloat(topStr) : 0;
                    if (isNaN(top)) top = 0;
                    $el.css("top", (top + extraPaddingTop) + "px");
                }
            });
            
            // Cập nhật lại actualMinLeft và actualMinTop sau khi dịch
            if (extraPaddingLeft > 0) actualMinLeft += extraPaddingLeft;
            if (extraPaddingTop > 0) actualMinTop += extraPaddingTop;
        }
        
        // ✅ Cập nhật lại finalWidth và finalHeight dựa trên actual bounds
        if (actualMinLeft !== Infinity) {
            var actualContentWidth = actualMaxRight - actualMinLeft;
            var actualContentHeight = actualMaxBottom - actualMinTop;
            finalWidth = Math.max(finalWidth, actualContentWidth + paddingLeft + paddingRight);
            finalHeight = Math.max(finalHeight, actualContentHeight + paddingTop + paddingBottom);
        }
        
        console.log("Preview bounds AFTER adjustment:", {
            actualMinLeft: actualMinLeft,
            actualMinTop: actualMinTop,
            actualMaxRight: actualMaxRight,
            actualMaxBottom: actualMaxBottom,
            finalWidth: finalWidth,
            finalHeight: finalHeight
        });
        
        // ✅ QUAN TRỌNG: Đảm bảo canvas clone có kích thước đúng
        // Canvas clone phải có width/height đủ để chứa tất cả controls
        $canvasClone.css({
            "overflow": "visible",
            "position": "relative",
            "width": finalWidth + "px",
            "height": finalHeight + "px", // ✅ Dùng height thay vì minHeight để đảm bảo kích thước chính xác
            "margin": "0",
            "padding": "0",
            "transform": "none",
            "background": "transparent" // Transparent để không che controls
        });
        
        // ✅ QUAN TRỌNG: Đảm bảo preview canvas có kích thước đúng
        $previewCanvas.css({
            width: finalWidth + "px",
            height: finalHeight + "px", // ✅ Dùng height thay vì minHeight
            minWidth: finalWidth + "px",
            minHeight: finalHeight + "px"
        });
        
        $previewCanvas.append($canvasClone);
        $content.append($previewCanvas);
        $modal.append($content);

        // Thêm vào body
        $("body").append($modal);

        // Event đóng modal
        var closeModal = function() {
            $(document).off("keydown.previewModal");
            $modal.remove();
        };
        
        $closeBtn.on("click", closeModal);
        
        // Đóng bằng ESC
        $(document).on("keydown.previewModal", function(e) {
            if (e.key === "Escape" || e.keyCode === 27) {
                closeModal();
            }
        });

        // Click vào overlay (phần ngoài preview canvas) cũng đóng
        $content.on("click", function(e) {
            if ($(e.target).is($content)) {
                closeModal();
            }
        });
    },

    setCurrentDesignInfo: function (dto, isClone) {
        this.currentDesignInfo = dto ? $.extend({}, dto) : null;
        if (this.currentDesignInfo) {
            this.currentDesignInfo.IsClone = !!isClone;
        }

        var modeText, nameText, footerText;

        if (!dto) {
            modeText = "New design";
            nameText = "";
            footerText = "New design (chưa lưu)";
        } else {
            var mode = isClone ? "Clone from public"
                : (dto.IsOwner ? "Edit my design" : "View");

            modeText = mode + " – " + dto.ControlType;
            nameText = dto.Name + " (ID: " + dto.ControlId + ")";
            footerText = mode + ": " + dto.Name + " (ID: " + dto.ControlId + ")";
        }

        $("#lblDesignMode").text(modeText);
        $("#lblDesignName").text(nameText);
        $("#lblFooterInfo").text(footerText);
    },

    removeControl: function (controlId) {
        if (!controlId) return;

        var cfg = this.findControl(controlId);
        if (!cfg) return;

        var self = this;

        if (cfg.type === "field") {
            builder.showConfirm({
                title: "Delete field",
                message: "Delete this field (and its children)?",
                okText: "Delete",
                cancelText: "Cancel",
                onOk: function () {
                    if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                        controlField.deleteWithChildren(controlId);
                    }

                    self.syncControlsWithDom();
                    self.selectedControlId = null;
                    self.selectedControlType = null;
                    $('#propPanel').html('<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>');
                    self.hideSizeHint();
                    self.refreshJson();
                }
            });
            return;
        }

        if (cfg.type === "tabpage") {
            builder.showConfirm({
                title: "Delete tab",
                message: "Delete this tab page and all controls inside?",
                okText: "Delete",
                cancelText: "Cancel",
                onOk: function () {
                    if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                        controlField.deleteWithChildren(controlId);
                    }

                    self.controls = (self.controls || []).filter(function (c) { return c.id !== controlId; });
                    $('[data-id="' + controlId + '"], #' + controlId).remove();

                    self.syncControlsWithDom();

                    self.selectedControlId = null;
                    self.selectedControlType = null;
                    $('#propPanel').html('<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>');
                    self.hideSizeHint();
                    self.refreshJson();
                }
            });
            return;
        }

        if (cfg.type === "popup") {
            builder.showConfirm({
                title: "Delete popup",
                message: "Delete this popup and all its fields?",
                okText: "Delete",
                cancelText: "Cancel",
                onOk: function () {
                    if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                        controlField.deleteWithChildren(controlId);
                    }

                    self.controls = (self.controls || []).filter(function (c) { return c.id !== controlId; });
                    $('[data-id="' + controlId + '"], #' + controlId).remove();

                    self.syncControlsWithDom();

                    self.selectedControlId = null;
                    self.selectedControlType = null;
                    $('#propPanel').html('<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>');
                    self.hideSizeHint();
                    self.refreshJson();
                }
            });
            return;
        }

        var label = cfg.titleText || cfg.controlName || cfg.id || cfg.type;
        var msg = "Delete this " + (cfg.type || "control") + " '" + label + "' ?";

        builder.showConfirm({
            title: "Delete control",
            message: msg,
            okText: "Delete",
            cancelText: "Cancel",
            onOk: function () {
                self.controls = (self.controls || []).filter(function (c) {
                    return c.id !== controlId;
                });

                $('[data-id="' + controlId + '"], #' + controlId).remove();

                self.syncControlsWithDom();

                self.selectedControlId = null;
                self.selectedControlType = null;

                $('#propPanel').html(
                    '<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>'
                );
                self.hideSizeHint();
                self.refreshJson();
            }
        });
    }

};

$(document).ready(function () {
    builder.init();
});
