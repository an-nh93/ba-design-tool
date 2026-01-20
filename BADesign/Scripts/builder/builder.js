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
            $("#canvas").empty();
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

            // Nếu click trúng control field / popup / toolbar / tabpage
            // thì để module tương ứng xử lý, không bật marquee
            if ($t.closest(".page-field, .popup-field, .popup-design, .canvas-toolbar, .canvas-tabpage").length) {
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
    // Zoom: dùng CSS zoom để cả khung + scrollbar cùng thay đổi
    // Pan: Space + drag sẽ kéo scrollbar thay vì dịch transform
    applyCanvasTransform: function () {
        var $canvas = $("#canvas");

        // scale toàn bộ vùng canvas (frame, lưới, control, scrollbar,…)
        $canvas.css("zoom", this.viewScale);

        // không dùng scale trong transform nữa, chỉ để trống
        $canvas.css("transform-origin", "0 0");
        $canvas.css("transform", "");
    },

    setZoom: function (scale) {
        // Giới hạn min/max
        scale = Math.max(0.3, Math.min(scale, 4));

        this.viewScale = scale;
        this.applyCanvasTransform();
        this.updateZoomLabel();
    },

    beginPan: function (x, y) {
        this.isPanning = true;
        this.panStartX = x;
        this.panStartY = y;

        var $c = $("#canvas");
        // lưu lại vị trí scroll hiện tại để cộng trừ
        this.panStartScrollLeft = $c.scrollLeft();
        this.panStartScrollTop = $c.scrollTop();

        document.body.classList.add("ub-pan-active");
    },

    updatePan: function (x, y) {
        if (!this.isPanning) return;

        var dx = x - this.panStartX;
        var dy = y - this.panStartY;

        var $c = $("#canvas");
        // kéo chuột sang phải → muốn nhìn phần bên phải → scrollLeft tăng
        // nên dùng dấu trừ cho cảm giác giống Figma
        $c.scrollLeft(this.panStartScrollLeft - dx);
        $c.scrollTop(this.panStartScrollTop - dy);
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

    restoreFromJson: function (json) {
        var arr = [];
        try { arr = JSON.parse(json || "[]"); } catch (e) { console.error(e); }

        this.controls = [];
        $("#canvas").empty();
        $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");
        this.hideSizeHint();

        var self = this;
        arr.forEach(function (cfg) {
            if (cfg.type === "field" && !cfg.uiMode) {
                cfg.uiMode = "core";
            }
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
            }
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
    beginMarquee: function (e) {
        this.isMarquee = true;

        var canvasRect = $("#canvas")[0].getBoundingClientRect();
        var x = e.clientX - canvasRect.left;
        var y = e.clientY - canvasRect.top;

        this.marqueeStartX = x;
        this.marqueeStartY = y;

        if (!this.marqueeRectEl) {
            this.marqueeRectEl = $('<div class="builder-selection-rect"></div>').appendTo("#canvas");
        }
        this.marqueeRectEl
            .show()
            .css({ left: x, top: y, width: 0, height: 0 });
    },

    updateMarquee: function (e) {
        if (!this.isMarquee || !this.marqueeRectEl) return;
        var canvasRect = $("#canvas")[0].getBoundingClientRect();
        var x = e.clientX - canvasRect.left;
        var y = e.clientY - canvasRect.top;

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
        var $c = $("#canvas");
        this.smartGuideVEl = $('<div class="builder-guide-line builder-guide-v"></div>').appendTo($c).hide();
        this.smartGuideHEl = $('<div class="builder-guide-line builder-guide-h"></div>').appendTo($c).hide();
        this.smartGuideLabelEl = $('<div class="builder-guide-label"></div>').appendTo($c).hide();
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

            cfg.left = st.left + totalDx;
            cfg.top = st.top + totalDy;

            if (self.snapEnabled) {
                cfg.left = Math.round(cfg.left / self.snapStep) * self.snapStep;
                cfg.top = Math.round(cfg.top / self.snapStep) * self.snapStep;
            }

            $('[data-id="' + id + '"]').css({
                left: cfg.left,
                top: cfg.top
            });

            if (cfg.type === "field" &&
                (cfg.ftype === "groupbox" || cfg.ftype === "section") &&
                window.controlField &&
                typeof controlField.moveDescendants === "function") {
                controlField.moveDescendants(cfg.id, dx, dy, false);
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

                if (self.snapEnabled) {
                    c.left = Math.round(c.left / self.snapStep) * self.snapStep;
                    c.top = Math.round(c.top / self.snapStep) * self.snapStep;
                }

                $('[data-id="' + id + '"]').css({
                    left: c.left,
                    top: c.top
                });
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

    alignSelection: function (type) {
        var ids = this.getSelectedFieldIds();
        if (ids.length < 2) return;

        var self = this;
        var cfgs = ids.map(function (id) { return self.getControlConfig(id); }).filter(Boolean);
        if (!cfgs.length) return;

        var anchor = cfgs[0];

        cfgs.forEach(function (c) {
            if (!c) return;

            switch (type) {
                case "left":
                    c.left = anchor.left;
                    break;
                case "right":
                    c.left = anchor.left + (anchor.width || 0) - (c.width || 0);
                    break;
                case "top":
                    c.top = anchor.top;
                    break;
                case "bottom":
                    c.top = anchor.top + (anchor.height || 0) - (c.height || 0);
                    break;
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

    distributeSelection: function (orientation) {
        var ids = this.getSelectedFieldIds();
        if (ids.length <= 2) return;

        var self = this;
        var cfgs = ids.map(function (id) { return self.getControlConfig(id); }).filter(Boolean);

        if (orientation === "h") {
            cfgs.sort(function (a, b) { return (a.left || 0) - (b.left || 0); });
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
                $('[data-id="' + c.id + '"]').css({ left: c.left });
                pos = c.left + (c.width || 0) + gap;
            });
        } else {
            cfgs.sort(function (a, b) { return (a.top || 0) - (b.top || 0); });
            var firstTop = cfgs[0].top || 0;
            var lastBottom = (cfgs[cfgs.length - 1].top || 0) + (cfgs[cfgs.length - 1].height || 0);
            var totalHeight = cfgs.reduce(function (s, c) { return s + (c.height || 0); }, 0);
            var gapV = (lastBottom - firstTop - totalHeight) / (cfgs.length - 1);

            var posV = firstTop;
            cfgs.forEach(function (c, i) {
                if (i === 0 || i === cfgs.length - 1) {
                    posV += (c.height || 0) + gapV;
                    return;
                }
                c.top = posV;
                if (self.snapEnabled) {
                    c.top = Math.round(c.top / self.snapStep) * self.snapStep;
                }
                $('[data-id="' + c.id + '"]').css({ top: c.top });
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
        
        // ✅ GridView menu: Xóa tất cả menu items cũ liên quan đến popup
        // Xóa từ cuối lên để tránh ảnh hưởng đến index
        var $allItems = $menu.find("ul li");
        $allItems.each(function() {
            var $item = $(this);
            if ($item.attr("data-cmd") && ($item.attr("data-cmd").indexOf("move-to-popup-") === 0 || $item.attr("data-cmd") === "move-out-popup")) {
                $item.remove();
            }
            if ($item.hasClass("cm-label")) {
                $item.remove();
            }
        });
        // Xóa separator cuối cùng nếu không có item nào sau nó
        var $lastSep = $menu.find("ul li.cm-sep").last();
        if ($lastSep.length) {
            var hasItemsAfter = false;
            $lastSep.nextAll().each(function() {
                if (!$(this).hasClass("cm-sep")) {
                    hasItemsAfter = true;
                    return false;
                }
            });
            if (!hasItemsAfter) {
                $lastSep.remove();
            }
        }
        
        if (isGrid) {
            var $moveToPopupLi = $('<li class="cm-sep"></li>');
            $menu.find("ul").append($moveToPopupLi);
            
            if (isInPopup) {
                // Đang trong popup → hiện menu "Di chuyển khỏi popup"
                var $moveOut = $('<li data-cmd="move-out-popup">📤 Di chuyển khỏi popup</li>');
                $menu.find("ul").append($moveOut);
            } else {
                // Không trong popup → hiện danh sách popup để chọn
                var $moveToLabel = $('<li class="cm-label" style="padding: 4px 12px; font-weight: 600; color: #0078d4; font-size: 11px; cursor: default;">📥 Di chuyển vào popup:</li>');
                $menu.find("ul").append($moveToLabel);
                
                var $popups = $(".popup-design");
                if ($popups.length > 0) {
                    $popups.each(function() {
                        var $popup = $(this);
                        var popupId = $popup.attr("data-id");
                        var popupCfg = builder.getControlConfig(popupId);
                        var popupTitle = (popupCfg && popupCfg.headerText) ? popupCfg.headerText : (popupCfg && popupCfg.titleText) ? popupCfg.titleText : "Popup " + popupId;
                        
                        var $popupItem = $('<li data-cmd="move-to-popup-' + popupId + '" style="padding-left: 24px;">  ' + popupTitle + '</li>');
                        $menu.find("ul").append($popupItem);
                    });
                } else {
                    var $noPopup = $('<li class="cm-disabled" style="padding-left: 24px;">(Không có popup)</li>');
                    $menu.find("ul").append($noPopup);
                }
            }
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
            default:
                // ✅ Xử lý menu GridView: move-to-popup-{popupId} hoặc move-out-popup
                if (cmd && cmd.indexOf("move-to-popup-") === 0) {
                    var popupId = cmd.substring("move-to-popup-".length);
                    this.moveGridToPopup(popupId);
                } else if (cmd === "move-out-popup") {
                    this.moveGridOutOfPopup();
                }
                break;
        }
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

        // --- NEW: combo zoom ---
        var $zoomSelect = $("#zoomSelect");
        if ($zoomSelect.length) {
            $zoomSelect.on("change", function () {
                var v = $(this).val();
                if (!v) return;

                // option “current” chỉ để hiển thị, không set zoom
                if (v === "custom") return;

                var scale = parseFloat(v);
                if (!isNaN(scale) && scale > 0) {
                    self.setZoom(scale);
                }
            });
        }

        $bar.on("click", "[data-cmd]", function () {
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
                    self.alignSelection("left"); break;
                case "align-right":
                    self.alignSelection("right"); break;
                case "align-top":
                    self.alignSelection("top"); break;
                case "align-bottom":
                    self.alignSelection("bottom"); break;
                case "dist-h":
                    self.distributeSelection("h"); break;
                case "dist-v":
                    self.distributeSelection("v"); break;
                case "duplicate":
                    self.duplicateSelection(); break;
                case "delete":
                    self.deleteSelectedControl(); break;
            }
        });


        $("#chkSnapToolbar").on("change", function () {
            self.snapEnabled = $(this).is(":checked");
        });
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

        // Nếu chỉ có 1 control → dùng logic cũ
        if (allIds.length === 1) {
            this.selectedControlId = allIds[0];
            this.removeControl(allIds[0]);
            return;
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
        var onOk = options.onOk || function () { };

        var $overlay = $('<div class="ub-modal-backdrop"></div>');
        var html =
            '<div class="ub-modal">' +
            '  <div class="ub-modal-header">' + title + '</div>' +
            '  <div class="ub-modal-body">' +
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

        $dlg.find(".ub-input-name").val(defaultName).focus().select();
        $dlg.find(".ub-input-public").prop("checked", !!defaultIsPublic);

        function closeDialog() {
            $(document).off("keydown.ubSaveDlg");
            $overlay.remove();
        }

        function showError(msg) {
            var $err = $dlg.find(".ub-modal-error");
            $err.text(msg).show();
        }

        function handleOk() {
            var name = $.trim($dlg.find(".ub-input-name").val() || "");
            var isPublic = $dlg.find(".ub-input-public").is(":checked");

            if (!name) {
                showError("Name is required.");
                $dlg.find(".ub-input-name").focus();
                return;
            }

            closeDialog();
            onOk({ name: name, isPublic: isPublic });
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
                            thumbnailData: thumbDataUrl
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
                    $("#canvas").empty();
                    $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");

                    arr.forEach(function (c) {
                        builder.renderControlByConfig(c);
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

        if (type === "grid") {
            controlGrid.addNew(popupId, dropPoint);

        } else if (type === "ess-grid") {
            // NEW: ESS HTML grid
            if (window.controlGridEss && typeof controlGridEss.addNew === "function") {
                controlGridEss.addNew(uiMode, popupId, dropPoint);
            }

        } else if (type === "popup") {
            controlPopup.addNew();

        } else if (type && type.indexOf("field-") === 0) {
            var ftype = type.substring("field-".length);

            if (window.controlField && typeof controlField.addNew === "function") {
                controlField.addNew(ftype, uiMode, popupId, dropPoint);
            }

        } else if (type === "toolbar") {
            controlToolbar.addNew(dropPoint);
        } else if (type === "tabpage") {
            controlTabPage.addNew();
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
                $("#canvas").empty();
                $("#propPanel").html("<h3>Thuộc tính</h3><p>Chọn 1 control trên canvas để chỉnh thuộc tính.</p>");

                arr.forEach(function (cfg) {
                    self.renderControlByConfig(cfg);
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
    exportImage: function () {
        var self = this;
        var $canvas = $("#canvas");
        
        if (!$canvas.length) {
            this.showToast("Không tìm thấy canvas để xuất hình ảnh", "error");
            return;
        }

        this.showToast("Đang xuất hình ảnh...", "info");

        // Tính toán kích thước thực tế của nội dung (giống preview)
        var canvasElement = $canvas[0];
        var scrollWidth = Math.max(canvasElement.scrollWidth, canvasElement.offsetWidth);
        var scrollHeight = Math.max(canvasElement.scrollHeight, canvasElement.offsetHeight);
        
        // Tìm tất cả các element con để tính kích thước thực tế
        var maxRight = 0;
        var maxBottom = 0;
        $canvas.find("*").each(function() {
            var $el = $(this);
            var rect = this.getBoundingClientRect();
            var canvasRect = canvasElement.getBoundingClientRect();
            
            // Tính vị trí relative với canvas (bao gồm scroll)
            var relativeLeft = rect.left - canvasRect.left + $canvas.scrollLeft();
            var relativeTop = rect.top - canvasRect.top + $canvas.scrollTop();
            var relativeRight = relativeLeft + rect.width;
            var relativeBottom = relativeTop + rect.height;
            
            maxRight = Math.max(maxRight, relativeRight);
            maxBottom = Math.max(maxBottom, relativeBottom);
        });
        
        var finalWidth = Math.max(scrollWidth, maxRight + 40);
        var finalHeight = Math.max(scrollHeight, maxBottom + 40);

        // Tạo container tạm thời để clone canvas (giống preview)
        var $tempContainer = $('<div id="tempExportContainer" style="position: absolute; left: -9999px; top: 0; width: ' + finalWidth + 'px; min-height: ' + finalHeight + 'px; background: #ffffff; overflow: visible;"></div>');
        $("body").append($tempContainer);

        // Clone toàn bộ canvas (giống preview)
        var $canvasClone = $canvas.clone(false);
        
        // Loại bỏ các class/attribute tương tác
        $canvasClone.find("*").each(function() {
            var $el = $(this);
            $el.removeClass("canvas-control-selected popup-selected popup-field-selected page-field-selected");
            $el.removeAttr("data-interact-id");
        });
        
        // Set style cho canvas clone
        $canvasClone.css({
            "overflow": "visible",
            "position": "relative",
            "width": finalWidth + "px",
            "minHeight": finalHeight + "px",
            "margin": "0",
            "padding": "0",
            "transform": "none",
            "background": "#ffffff"
        });
        
        $tempContainer.append($canvasClone);

        // Đợi một chút để DOM render
        setTimeout(function() {
            // Sử dụng html2canvas để chụp container clone
            html2canvas($tempContainer[0], {
                backgroundColor: "#ffffff",
                scale: 2, // Tăng độ phân giải
                useCORS: true,
                logging: false,
                width: finalWidth,
                height: finalHeight,
                allowTaint: true,
                foreignObjectRendering: false
            }).then(function (canvas) {
                // Xóa container tạm thời
                $tempContainer.remove();

                // Chuyển canvas thành blob và download
                canvas.toBlob(function (blob) {
                    var a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "ui-design-" + new Date().getTime() + ".png";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                    
                    self.showToast("Đã xuất hình ảnh thành công!", "success");
                }, "image/png");
            }).catch(function (error) {
                // Xóa container tạm thời nếu lỗi
                $tempContainer.remove();
                
                console.error("Export image error:", error);
                self.showToast("Lỗi khi xuất hình ảnh: " + error.message, "error");
            });
        }, 200); // Đợi 200ms để DOM render đầy đủ
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
        
        // Header với nút đóng
        var $header = $('<div style="position: sticky; top: 0; background: #0078d4; color: #fff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 100001; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0;">');
        $header.append('<h3 style="margin: 0; font-size: 18px; font-weight: 600;">👁️ Preview Design</h3>');
        var $closeBtn = $('<button style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;" type="button"><i class="bi bi-x-lg"></i> Đóng (ESC)</button>');
        $closeBtn.on("mouseenter", function() {
            $(this).css("background", "rgba(255,255,255,0.3)");
        }).on("mouseleave", function() {
            $(this).css("background", "rgba(255,255,255,0.2)");
        });
        $header.append($closeBtn);
        $modal.append($header);

        // Content: Clone canvas content
        var $content = $('<div style="flex: 1; padding: 40px; background: #e8e8e8; overflow: auto; display: flex; justify-content: center; align-items: flex-start;"></div>');
        
        // Tính toán kích thước thực tế của nội dung
        var canvasElement = $canvas[0];
        var scrollWidth = Math.max(canvasElement.scrollWidth, canvasElement.offsetWidth);
        var scrollHeight = Math.max(canvasElement.scrollHeight, canvasElement.offsetHeight);
        
        // Tìm tất cả các element con để tính kích thước thực tế
        var maxRight = 0;
        var maxBottom = 0;
        $canvas.find("*").each(function() {
            var $el = $(this);
            var rect = this.getBoundingClientRect();
            var canvasRect = canvasElement.getBoundingClientRect();
            
            // Tính vị trí relative với canvas (bao gồm scroll)
            var relativeLeft = rect.left - canvasRect.left + $canvas.scrollLeft();
            var relativeTop = rect.top - canvasRect.top + $canvas.scrollTop();
            var relativeRight = relativeLeft + rect.width;
            var relativeBottom = relativeTop + rect.height;
            
            maxRight = Math.max(maxRight, relativeRight);
            maxBottom = Math.max(maxBottom, relativeBottom);
        });
        
        var finalWidth = Math.max(scrollWidth, maxRight + 40);
        var finalHeight = Math.max(scrollHeight, maxBottom + 40);
        
        // Tạo preview canvas với kích thước chính xác
        var $previewCanvas = $('<div id="previewCanvas" style="position: relative; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 0; overflow: visible;"></div>');
        $previewCanvas.css({
            width: finalWidth + "px",
            minHeight: finalHeight + "px"
        });
        
        // Clone toàn bộ canvas (bao gồm cả popup và controls)
        var $canvasClone = $canvas.clone(false); // Clone false để không clone event handlers
        
        // Loại bỏ các class/attribute tương tác và event handlers
        $canvasClone.find("*").each(function() {
            var $el = $(this);
            // Xóa các class tương tác
            $el.removeClass("canvas-control-selected popup-selected popup-field-selected page-field-selected");
            // Xóa các attribute tương tác
            $el.removeAttr("data-interact-id");
            // Loại bỏ pointer events cho các control (chỉ xem, không tương tác)
            if ($el.hasClass("canvas-control") || $el.hasClass("popup-design") || $el.hasClass("page-field") || $el.hasClass("popup-field")) {
                $el.css("pointer-events", "none");
            }
        });
        
        // Loại bỏ event handlers
        $canvasClone.off();
        $canvasClone.find("*").off();
        
        // Set style cho canvas clone - giữ nguyên kích thước và vị trí
        $canvasClone.css({
            "overflow": "visible",
            "position": "relative",
            "width": finalWidth + "px",
            "minHeight": finalHeight + "px",
            "margin": "0",
            "padding": "0",
            "transform": "none",
            "background": "#ffffff"
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
