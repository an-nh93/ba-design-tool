var builderServiceUrl = "/Pages/Builder.aspx";
var builderEditBaseUrl = "/Builder";

var builder = {
    controls: [],
    selectedControlId: null,
    selectedControlType: null,
    currentDesignInfo: null,
    savedSnapshot: "[]",
    savedAt: null,
    isSaving: false,
    clickAddCount: 0,
    fieldTypeChoices: {
        core: [
            { ftype: "text", text: "Text box" },
            { ftype: "number", text: "Numeric" },
            { ftype: "date", text: "Date" },
            { ftype: "combo", text: "Combobox" },
            { ftype: "multiselect", text: "Multi-select Dropdown" },
            { ftype: "memo", text: "Memo" },
            { ftype: "checkbox", text: "Checkbox" },
            { ftype: "radio", text: "Radio" },
            { ftype: "label", text: "Label" },
            { ftype: "button", text: "Button" }
        ],
        ess: [
            { ftype: "text", text: "ESS Text box" },
            { ftype: "numberic-test", text: "ESS Numeric" },
            { ftype: "date", text: "ESS Date" },
            { ftype: "combo", text: "ESS Combobox" },
            { ftype: "memo", text: "ESS Memo" },
            { ftype: "checkbox", text: "ESS Checkbox" },
            { ftype: "radio", text: "ESS Radio" },
            { ftype: "label", text: "ESS Label" },
            { ftype: "button", text: "ESS Button" },
            { ftype: "tag", text: "Tag" }
        ]
    },
    dragHintEl: null,
    smartGuideVEl: null,
    smartGuideHEl: null,
    smartGuideLabelEl: null,
    smartGuideThreshold: 5,   // sai số tối đa (px) để coi như “trùng”

    // ===== NEW: history + zoom/pan + snap + copyStyle + clipboard + marquee =====
    history: [],
    historyIndex: -1,
    _suppressHistory: false,
    _coalesceHistory: false,
    _coalescePushed: false,
    _dragGroupChildPins: null,

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

    // ✅ Convert clientX/clientY về tọa độ canvas
    clientToCanvasPoint: function (clientX, clientY) {
        var canvasEl = document.getElementById("canvas-zoom-inner");
        if (!canvasEl) return { x: clientX, y: clientY };

        var r = canvasEl.getBoundingClientRect();
        var scale = (this.viewScale && this.viewScale > 0) ? this.viewScale : 1;

        var x = Math.round((clientX - r.left) / scale);
        var y = Math.round((clientY - r.top) / scale);

        return { x: x, y: y };
    },

    placeAtDropPoint: function (cfg, dropPoint) {
        if (!cfg || !dropPoint || dropPoint.clientX == null || dropPoint.clientY == null) return;
        var pt = this.clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY);
        cfg.left = Math.max(20, pt.x);
        cfg.top = Math.max(20, pt.y);
    },

    shellView: function () {
        var shell = document.querySelector(".canvas-shell");
        if (!shell) return null;
        var r = shell.getBoundingClientRect();
        var bar = document.getElementById("canvasToolbar");
        var bottom = r.top + shell.clientHeight;
        var covered = bar && bar.offsetParent !== null ? Math.max(0, bottom - bar.getBoundingClientRect().top) : 0;
        return { el: shell, left: r.left, top: r.top, right: r.left + shell.clientWidth, bottom: bottom, covered: Math.min(covered, 140) };
    },

    toolboxDropPoint: function (clientX, clientY) {
        var view = this.shellView();
        if (!view) return { clientX: clientX, clientY: clientY };
        var under = document.elementFromPoint(clientX, clientY);
        if ((under && $(under).closest(".toolbox").length) || clientX < view.left - 8) return null;
        return {
            clientX: Math.min(Math.max(clientX, view.left + 28), Math.max(view.left + 28, view.right - 60)),
            clientY: Math.min(Math.max(clientY, view.top + 28), Math.max(view.top + 28, view.bottom - view.covered - 34))
        };
    },

    // Phần nhìn thấy được của một phần tử trên canvas: khung của nó cắt theo mọi khối chứa có overflow khác visible (vùng của Splitter, popup).
    visibleBox: function (el) {
        var r = el.getBoundingClientRect();
        var box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        var stop = document.getElementById("canvas-zoom-inner");
        for (var p = el.parentElement; p && p !== stop; p = p.parentElement) {
            var style = window.getComputedStyle(p);
            if (style.overflowX === "visible" && style.overflowY === "visible") continue;
            var clip = p.getBoundingClientRect();
            if (style.overflowX !== "visible") {
                box.left = Math.max(box.left, clip.left);
                box.right = Math.min(box.right, clip.right);
            }
            if (style.overflowY !== "visible") {
                box.top = Math.max(box.top, clip.top);
                box.bottom = Math.min(box.bottom, clip.bottom);
            }
        }
        return box;
    },

    revealControl: function (cfg) {
        var view = this.shellView(), $el = cfg ? this.controlElement(cfg) : null;
        if (!view || !$el || !$el.length) return;
        var r = this.visibleBox($el[0]);
        if (r.right <= r.left || r.bottom <= r.top) return;
        var overX = Math.min(r.right - (view.right - 16), r.left - (view.left + 16));
        var overY = Math.min(r.bottom - (view.bottom - view.covered - 12), r.top - (view.top + 16));
        if (overX > 0) view.el.scrollLeft += overX;
        if (overY > 0) view.el.scrollTop += overY;
    },

    beginGesture: function () {
        document.body.classList.add("ub-gesture");
        var selection = window.getSelection ? window.getSelection() : null;
        if (selection && !selection.isCollapsed) selection.removeAllRanges();
    },

    endGesture: function () {
        document.body.classList.remove("ub-gesture");
        this._gestureStart = null;
        this.stopDragScroll();
    },

    dragView: function () {
        if (!this._dragView) this._dragView = this.shellView();
        return this._dragView;
    },

    clampDragDelta: function (dx, dy) {
        var view = this.dragView(), cur = this._pointer;
        if (!view || !cur) return { dx: dx, dy: dy };
        function clamp(p) {
            return {
                x: Math.min(Math.max(p.x, view.left + 4), view.right - 4),
                y: Math.min(Math.max(p.y, view.top + 4), view.bottom - 4)
            };
        }
        var prev = this._dragClamp || clamp({ x: cur.x - dx, y: cur.y - dy });
        var now = clamp(cur);
        this._dragClamp = now;
        return { dx: now.x - prev.x, dy: now.y - prev.y };
    },

    dragStep: function (dx, dy, apply) {
        var step = this.clampDragDelta(dx, dy);
        this.startDragScroll(apply);
        return step;
    },

    startDragScroll: function (apply) {
        this._dragApply = apply;
        if (this._dragScrollFrame) return;
        var self = this, zone = 28, last = 0, restX = 0, restY = 0;
        function speed(depth) {
            return depth <= zone ? 180 + depth * 15 : Math.min(1300, 600 + (depth - zone) * 7);
        }
        function step(time) {
            if (!self._dragApply) { self._dragScrollFrame = null; return; }
            var view = self.dragView(), p = self._pointer, from = self._gestureStart;
            var elapsed = last ? Math.min(48, time - last) : 16;
            last = time;
            if (view && p) {
                var vx = p.x > view.right - zone ? speed(p.x - (view.right - zone)) : p.x < view.left + zone ? -speed(view.left + zone - p.x) : 0;
                var vy = p.y > view.bottom - zone ? speed(p.y - (view.bottom - zone)) : p.y < view.top + zone ? -speed(view.top + zone - p.y) : 0;
                if (from && ((vx > 0 && p.x < from.x + 3) || (vx < 0 && p.x > from.x - 3))) vx = 0;
                if (from && ((vy > 0 && p.y < from.y + 3) || (vy < 0 && p.y > from.y - 3))) vy = 0;
                restX = vx ? restX + vx * elapsed / 1000 : 0;
                restY = vy ? restY + vy * elapsed / 1000 : 0;
                var wantX = restX < 0 ? Math.ceil(restX) : Math.floor(restX), wantY = restY < 0 ? Math.ceil(restY) : Math.floor(restY);
                if (wantX > 0 && view.el.scrollLeft > 9000) wantX = 0;
                if (wantY > 0 && view.el.scrollTop > 9000) wantY = 0;
                if (wantX || wantY) {
                    restX -= wantX; restY -= wantY;
                    var beforeX = view.el.scrollLeft, beforeY = view.el.scrollTop;
                    if (wantX) view.el.scrollLeft = beforeX + wantX;
                    if (wantY) view.el.scrollTop = beforeY + wantY;
                    var movedX = view.el.scrollLeft - beforeX, movedY = view.el.scrollTop - beforeY;
                    if (movedX || movedY) self._dragApply(movedX, movedY);
                }
            }
            self._dragScrollFrame = window.requestAnimationFrame(step);
        }
        this._dragScrollFrame = window.requestAnimationFrame(step);
    },

    stopDragScroll: function () {
        this._dragApply = null;
        this._dragClamp = null;
        this._dragView = null;
        if (this._dragScrollFrame) {
            window.cancelAnimationFrame(this._dragScrollFrame);
            this._dragScrollFrame = null;
        }
    },

    // ========= Drag hint =========
    showDragHint: function (x, y, label) {
        if (!this.dragHintEl) {
            this.dragHintEl = $('<div class="drag-hint"></div>')
                .appendTo("body");
        }
        this.dragHintEl.text($.trim(label || "") || "Thả vào vùng canvas").show();
        this.moveDragHint(x, y);
    },

    moveDragHint: function (x, y) {
        if (this.dragHintEl) {
            var blocked = !this.toolboxDropPoint(x, y);
            this.dragHintEl.css({ left: x, top: y }).toggleClass("drag-hint-nodrop", blocked);
            document.body.classList.toggle("ui-drag-nodrop", blocked);
        }
    },

    hasAnySelection: function () {
        return !!(this.selectedControlId || this.getSelectedFieldIds().length);
    },

    hideDragHint: function () {
        if (this.dragHintEl) {
            this.dragHintEl.hide();
        }
        document.body.classList.remove("ui-drag-nodrop");
    },

    // ========= Init =========
    init: function () {
        var self = this;

        this.initToast();
        this.initContextMenu();
        this.initCanvasToolbar();

        interact('.tool-item').draggable({
            onstart: function (event) {
                document.body.classList.add("ui-dragging");
                builder.beginGesture();
                $(event.target).addClass("tool-dragging");
                builder.showDragHint(event.clientX, event.clientY, $(event.target).closest(".tool-item").text());
            },
            onmove: function (event) {
                builder.moveDragHint(event.clientX, event.clientY);
            },
            onend: function (event) {
                document.body.classList.remove("ui-dragging");
                builder.endGesture();

                var type = event.target.getAttribute("data-control");
                var uiMode = event.target.getAttribute("data-ui") || "core"; // default core

                var point = builder.toolboxDropPoint(event.clientX, event.clientY);
                if (point) builder.addControl(type, uiMode, point);

                event.target.style.transform = "";
                $(event.target).removeClass("tool-dragging");
                builder.hideDragHint();
            }
        }).on("tap", function (event) {
            builder.addControlFromToolbox(event.currentTarget || event.target);
        });

        document.addEventListener("pointermove", function (e) {
            builder._pointer = { x: e.clientX, y: e.clientY };
        }, true);
        document.addEventListener("mousedown", function (e) {
            if (e.button !== 0 && e.button !== 1) return;
            var $target = $(e.target);
            if (!$target.closest(".canvas-shell").length) return;
            if ($target.closest("input, textarea, select, [contenteditable=true]").length) return;
            builder._pointer = { x: e.clientX, y: e.clientY };
            builder._gestureStart = { x: e.clientX, y: e.clientY };
            builder.beginGesture();
        }, true);
        ["mouseup", "pointerup", "pointercancel"].forEach(function (name) {
            document.addEventListener(name, function () { builder.endGesture(); }, true);
        });
        document.addEventListener("mousedown", function (e) { builder.pressControl(e); }, true);
        document.addEventListener("mouseup", function (e) { builder.releaseControl(e); }, true);
        window.addEventListener("blur", function () { builder.endGesture(); });

        $(document).on("keydown.builderSave", function (e) {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || !e.key || e.key.toLowerCase() !== "s") return;
            e.preventDefault();
            if ($(".ub-modal-backdrop").length) return;
            if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
            builder.savePageToServer(e.shiftKey ? { saveAs: true } : null);
        });

        $(document).on("keydown.builderPanels", function (e) {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.code !== "Backslash") return;
            e.preventDefault();
            builder.togglePanels();
        });

        window.addEventListener("beforeunload", function (e) {
            if (!builder.isDirty()) return;
            e.preventDefault();
            e.returnValue = "";
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

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key && e.key.toLowerCase() === "a") {
                if ($(".ub-modal-backdrop").length) return;
                e.preventDefault();
                builder.selectAll();
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

                    builder._coalesceHistory = true;
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

        // Kéo/resize bằng chuột (mọi loại control): gộp cả lượt kéo thành 1 bước Undo — Ctrl+Z về đúng vị trí trước khi nắm chuột
        document.addEventListener("pointerdown", function (e) {
            if (e.button !== 0 && e.pointerType === "mouse") return;
            if ($(e.target).closest("#canvas-zoom-inner, .canvas-shell").length) {
                builder._coalesceHistory = true;
                builder._coalescePushed = false;
            }
        }, true);
        function endPointerCoalesce() {
            setTimeout(function () { builder._coalesceHistory = false; builder._coalescePushed = false; }, 0);
        }
        document.addEventListener("pointerup", endPointerCoalesce, true);
        document.addEventListener("pointercancel", endPointerCoalesce, true);

        $(document).on("keyup", function (e) {
            if (e.code === "Space") {
                builder.isSpaceDown = false;
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
                builder._coalesceHistory = false;
                builder._coalescePushed = false;
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

            // Cho phép quét khối khi click vào vùng trống trong phần nội dung của field là khối chứa (group box, section, vùng của Splitter)
            var inFieldContent = $t.closest(builder.containerContentSelector).closest(".page-field").length > 0 || builder.isTabBody(e.target);
            if (!inFieldContent && $t.closest(".page-field, .popup-field, .canvas-toolbar, .canvas-tabpage").length) {
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
            if ($t.closest(".prop-shell, .canvas-toolbar, #propSplitter, .prop-splitter, .builder-header, .toolbox").length) {
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

    contentBounds: function () {
        var inner = document.getElementById("canvas-zoom-inner");
        if (!inner) return null;
        var self = this;
        var base = inner.getBoundingClientRect();
        var scale = this.viewScale > 0 ? this.viewScale : 1;
        var bounds = null;
        $(inner).find(this.previewControlSelector).each(function () {
            var $el = $(this);
            if (self.isNestedControl($el) || !$el.is(":visible")) return;
            var r = this.getBoundingClientRect();
            if (!r.width || !r.height) return;
            var box = {
                left: (r.left - base.left) / scale, top: (r.top - base.top) / scale,
                right: (r.right - base.left) / scale, bottom: (r.bottom - base.top) / scale
            };
            if (!bounds) { bounds = box; return; }
            bounds.left = Math.min(bounds.left, box.left);
            bounds.top = Math.min(bounds.top, box.top);
            bounds.right = Math.max(bounds.right, box.right);
            bounds.bottom = Math.max(bounds.bottom, box.bottom);
        });
        return bounds;
    },

    fitZoom: function (widthOnly) {
        var shell = document.querySelector(".canvas-shell");
        var bounds = this.contentBounds();
        if (!shell || !bounds) {
            this.setZoom(1);
            return;
        }
        var margin = 24;
        var availableWidth = shell.clientWidth - 20 - 16;
        var availableHeight = shell.clientHeight - 20 - 16;
        var scale = availableWidth / (bounds.right + margin);
        if (!widthOnly) scale = Math.min(scale, availableHeight / (bounds.bottom + margin));
        this.setZoom(Math.min(scale, 1.5));
        $(shell).scrollLeft(0).scrollTop(0);
    },

    fitOnOpen: function () {
        var shell = document.querySelector(".canvas-shell");
        var bounds = this.contentBounds();
        if (!shell || !bounds || shell.clientWidth < 80) return;
        var scale = (shell.clientWidth - 36) / (bounds.right + 24);
        this.setZoom(Math.max(0.5, Math.min(1, scale)));
        $(shell).scrollLeft(0).scrollTop(0);
    },

    panelsHidden: function () {
        var $wrapper = $(".builder-wrapper");
        return $wrapper.hasClass("toolbox-collapsed") && $wrapper.hasClass("props-collapsed");
    },

    togglePanels: function () {
        var $wrapper = $(".builder-wrapper");
        var show = this.panelsHidden();
        if ($wrapper.hasClass("toolbox-collapsed") === show) $("#toolboxToggle").trigger("click");
        if ($wrapper.hasClass("props-collapsed") === show) $("#propToggle .pt-text").trigger("click");
    },

    addControlFromToolbox: function (el) {
        var $item = $(el).closest(".tool-item");
        var type = $item.attr("data-control");
        var shell = document.querySelector(".canvas-shell");
        if (!type || !shell) return;

        var area = shell.getBoundingClientRect();
        var nestable = type !== "popup" && type !== "tabpage" && type.indexOf("annot-") !== 0;
        var selected = this.selectedControlId ? this.getControlConfig(this.selectedControlId) : null;
        if (selected && !nestable && !(type === "tabpage" && this.hostsTabPages(selected))) selected = null;
        if (selected) {
            var $content = $("#canvas").find('[data-id="' + selected.id + '"]').find(this.containerContentSelector).first();
            if ($content.length && $content.is(":visible")) {
                var inner = $content[0].getBoundingClientRect();
                var visible = {
                    left: Math.max(inner.left, area.left), top: Math.max(inner.top, area.top),
                    right: Math.min(inner.right, area.right), bottom: Math.min(inner.bottom, area.bottom)
                };
                if (visible.right - visible.left > 60 && visible.bottom - visible.top > 40) {
                    area = { left: visible.left, top: visible.top, width: visible.right - visible.left, height: visible.bottom - visible.top };
                }
            }
        }

        var step = (this.clickAddCount++ % 6) * 22;
        this.addControl(type, $item.attr("data-ui") || "core", {
            clientX: Math.round(area.left + Math.min(area.width * 0.25, 220) + step),
            clientY: Math.round(area.top + Math.min(area.height * 0.25, 120) + step)
        });

        var added = this.selectedControlId ? this.getControlConfig(this.selectedControlId) : null;
        if (added) {
            var $added = $("#canvas").find('[data-id="' + added.id + '"]');
            $added.addClass("canvas-control-selected");
            if (added.type === "field") $added.addClass("page-field-selected");
        }
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
    packHistory: function (json) {
        var store = this._historyImages || (this._historyImages = { index: new Map(), list: [] });
        return json.replace(/"imageData":"(data:image\/[^"\\]+)"/g, function (all, data) {
            var id = store.index.get(data);
            if (id == null) {
                id = store.list.length;
                store.list.push(data);
                store.index.set(data, id);
            }
            return '"imageData":"@history-image:' + id + '"';
        });
    },

    unpackHistory: function (json) {
        var list = this._historyImages ? this._historyImages.list : [];
        return json.replace(/"imageData":"@history-image:(\d+)"/g, function (all, id) {
            return '"imageData":' + JSON.stringify(list[parseInt(id, 10)] || "");
        });
    },

    pushHistory: function () {
        if (this._suppressHistory) return;

        // Undo rồi sửa tiếp: bỏ nhánh redo, tránh Ctrl+Z nhảy về một trạng thái đã undo
        if (this.historyIndex < this.history.length - 1) {
            this.history.splice(this.historyIndex + 1);
        }

        var snapshot = this.packHistory(JSON.stringify(this.controls || []));
        var typing = false;
        var ae = document.activeElement;
        if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT")) {
            if ($(ae).closest("#propPanel, .prop-shell").length) typing = true;
        }
        var coalesce = this._coalesceHistory || typing;

        if (!coalesce) this._coalescePushed = false;

        // Gõ chữ / giữ phím mũi tên: một thao tác = một bước undo
        if (coalesce && this._coalescePushed && this.historyIndex >= 0) {
            if (this.historyIndex > 0 && this.history[this.historyIndex - 1] === snapshot) {
                this.history.splice(this.historyIndex, 1);
                this.historyIndex--;
                this._coalescePushed = false;
                return;
            }
            this.history[this.historyIndex] = snapshot;
            return;
        }

        if (this.history.length && this.history[this.history.length - 1] === snapshot) return;
        this.history.push(snapshot);
        if (this.history.length > 100) {
            this.history.shift();
        }
        this.historyIndex = this.history.length - 1;
        if (coalesce) this._coalescePushed = true;
    },

    _clearCanvasContent: function () {
        var $inner = $("#canvas-zoom-inner");
        if (!$inner.length) return;
        $inner.empty();
    },

    restoreFromJson: function (json) {
        var arr = [];
        try { arr = JSON.parse(json || "[]"); } catch (e) { console.error(e); }
        arr = this.sanitizeControls(arr);

        var $shell = $(".canvas-shell");
        var scrollLeft = $shell.length ? $shell.scrollLeft() : 0;
        var scrollTop = $shell.length ? $shell.scrollTop() : 0;
        var keepId = this.selectedControlId;

        this.controls = [];
        var $inner = $("#canvas-zoom-inner");
        $inner.empty();
        this.marqueeRectEl = null; // ✅ Sau Undo/Redo khung quét tạo mới, tránh quét khối không hoạt động
        builderProps.showEmpty();
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
        this._suppressHistory = true;
        try {
            ordered.forEach(function (cfg) {
                cfg._fromRestore = true; // Để render không convert lại tọa độ popup/groupbox (đã lưu relative)
                self.renderControlByConfig(cfg);
                delete cfg._fromRestore;
                self.controls.push(cfg);
            });

            this.refreshJson({ skipHistory: true });
        } finally {
            this._suppressHistory = false;
        }

        if ($shell.length) {
            $shell.scrollLeft(scrollLeft);
            $shell.scrollTop(scrollTop);
        }

        this.selectedControlId = null;
        this.selectedControlType = null;
        if (keepId && this.getControlConfig(keepId)) {
            this.selectedControlId = keepId;
            var kept = this.getControlConfig(keepId);
            this.selectedControlType = kept.type || null;
            var $kept = $("#canvas").find('[data-id="' + keepId + '"]');
            $kept.addClass("canvas-control-selected");
            if (kept.type === "field") $kept.addClass("page-field-selected");
            if (kept.type === "popup") $kept.addClass("popup-selected");
        }
    },

    undo: function () {
        if (this.historyIndex <= 0) return;
        this.historyIndex--;
        this.restoreFromJson(this.unpackHistory(this.history[this.historyIndex]));
    },

    redo: function () {
        if (this.historyIndex >= this.history.length - 1) return;
        this.historyIndex++;
        this.restoreFromJson(this.unpackHistory(this.history[this.historyIndex]));
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

        var $target = $(e.target);
        var $content = $target.closest(this.containerContentSelector);
        var $scope = $content.closest(".popup-design, .canvas-control");
        this._marqueeScope = $content.length ? ($scope.attr("data-id") || null) : null;
        this._marqueeOnScope = $content.length > 0 && $target.closest(".canvas-control")[0] === $scope[0];
        this._marqueeSkip = $target.closest(".canvas-tabpage").attr("data-id") || null;
        this._marqueeBase = (e.ctrlKey || e.metaKey || e.shiftKey) ? this.getAllSelectedControlIds() : null;

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

        var self = this;
        this.startDragScroll(function () {
            if (self.isMarquee && self._pointer) self.updateMarquee({ clientX: self._pointer.x, clientY: self._pointer.y });
        });
    },

    endMarquee: function (e) {
        if (!this.isMarquee) return;
        this.isMarquee = false;
        this.stopDragScroll();

        var rectEl = this.marqueeRectEl;
        if (!rectEl) return;

        var base = this._marqueeBase;
        var tiny = rectEl.width() < 3 && rectEl.height() < 3;
        var selRect = rectEl[0].getBoundingClientRect();
        rectEl.hide();

        // Quét rất nhỏ là một cú bấm: bấm vào chỗ trống của một vùng Splitter thì chọn Splitter đó, chỗ trống khác thì bỏ chọn.
        if (tiny) {
            if (base) return;
            var host = this._marqueeOnScope ? this.getControlConfig(this._marqueeScope) : null;
            if (controlSplitter.isSplitter(host)) this.selectControls([host.id]);
            else this.clearSelection();
            return;
        }

        var self = this;
        var scope = this._marqueeScope || null;
        var skip = this._marqueeSkip;
        var ids = base ? base.slice() : [];

        this.selectableElements().each(function () {
            var id = $(this).attr("data-id");
            var cfg = self.getControlConfig(id);
            if (id === skip || self.containerOf(cfg) !== scope || ids.indexOf(id) >= 0) return;
            var elRect = this.getBoundingClientRect();
            if (elRect.right < selRect.left || elRect.left > selRect.right ||
                elRect.bottom < selRect.top || elRect.top > selRect.bottom) return;
            ids.push(id);
        });

        this.selectControls(ids);
    },

    selectableElements: function () {
        var self = this;
        return $("#canvas").find(".canvas-control[data-id], .popup-design[data-id]").filter(function () {
            return !!self.getControlConfig($(this).attr("data-id")) && $(this).is(":visible");
        });
    },

    containerOf: function (cfg) {
        return cfg && cfg.parentId && this.getControlConfig(cfg.parentId) ? cfg.parentId : null;
    },

    selectControls: function (ids) {
        var self = this;
        var list = [];
        (ids || []).forEach(function (id) {
            if (list.indexOf(id) < 0 && self.getControlConfig(id)) list.push(id);
        });

        this.clearSelection();
        if (!list.length) return;

        if (list.length === 1) {
            this.selectOnly(list[0]);
            this.showPropertiesFor(this.getControlConfig(list[0]));
            return;
        }

        var allFields = true;
        list.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            var $el = self.controlElement(cfg).addClass("canvas-control-selected");
            if (cfg.type === "field") $el.addClass("page-field-selected");
            else allFields = false;
        });

        this.selectedControlId = list[0];
        this.selectedControlType = allFields ? "field" : "multi";
        builderProps.showMessage("Đang chọn " + list.length + " control. Kéo một control để dời cả nhóm, bấm phím mũi tên để dời từng bước, Delete để xóa. Bấm vào một control để chỉnh thuộc tính của riêng nó.");

        this.highlightOutlineSelection();
        this.updateSelectionSizeHint();
    },

    selectAll: function () {
        var self = this;
        var ids = [];
        this.selectableElements().each(function () {
            var cfg = self.getControlConfig($(this).attr("data-id"));
            if (!self.containerOf(cfg)) ids.push(cfg.id);
        });
        this.selectControls(ids);
    },

    pressedControl: function (target) {
        var $target = $(target);
        var $root = $target.closest(".canvas-control[data-id], .popup-design[data-id]");
        if (!$root.length || !$root.closest("#canvas").length) return null;
        var $content = $target.closest(this.containerContentSelector);
        if ($content.length && $root[0].contains($content[0])) return null;
        if (this.isTabBody(target) || $target.closest(this.pressPassSelector).length) return null;
        return this.getControlConfig($root.attr("data-id")) || null;
    },

    isTabBody: function (target) {
        var $target = $(target);
        return $target.closest(".canvas-tabpage").length > 0 && !$target.closest(".tabpage-tabs, .ub-resize").length;
    },

    pressPassSelector: ".dx-datagrid, .ess-grid-table-wrapper, .ess-grid-table, .ess-collapsible-icon, [contenteditable=true]",

    pressControl: function (e) {
        this._pressClick = null;
        if (e.button !== 0) return;
        var cfg = this.pressedControl(e.target);
        if (!cfg) return;

        var ids = this.getAllSelectedControlIds();
        var at = ids.indexOf(cfg.id);

        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            if (at >= 0) ids.splice(at, 1);
            else ids.push(cfg.id);
            e.stopPropagation();
            this.hideContextMenu();
            this.selectControls(ids);
            return;
        }

        if (ids.length > 1 && this.isInSelection(cfg.id, ids)) {
            e.stopPropagation();
            this.hideContextMenu();
            this._pressClick = { id: cfg.id, x: e.clientX, y: e.clientY };
            return;
        }

        if (ids.length > 1 || (ids.length === 1 && at < 0)) this.clearSelection();
    },

    isInSelection: function (id, ids) {
        var cfg = this.getControlConfig(id);
        while (cfg) {
            if (ids.indexOf(cfg.id) >= 0) return true;
            cfg = cfg.parentId ? this.getControlConfig(cfg.parentId) : null;
        }
        return false;
    },

    releaseControl: function (e) {
        var press = this._pressClick;
        this._pressClick = null;
        if (!press) return;
        if (Math.abs(e.clientX - press.x) > 3 || Math.abs(e.clientY - press.y) > 3) return;
        this.selectControls([press.id]);
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
        var ids = this.getAllSelectedControlIds();
        var self = this;

        ids.forEach(function (id) {
            $els = $els.add(self.controlElement(self.getControlConfig(id)));
        });
        $els = $els.filter(":visible");

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

        $hint.css({
            left: centerX + "px",
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
        var $host = this._dragGuideHost && this._dragGuideHost.length ? this._dragGuideHost : $("#canvas-zoom-inner");
        if (!$host.length) return;
        if (!this.smartGuideVEl) {
            this.smartGuideVEl = $('<div class="builder-guide-line builder-guide-v"></div>').hide();
            this.smartGuideHEl = $('<div class="builder-guide-line builder-guide-h"></div>').hide();
            this.smartGuideLabelEl = $('<div class="builder-guide-label"></div>').hide();
        }
        if (!this.smartGuideVEl.parent().is($host)) {
            $host.append(this.smartGuideVEl, this.smartGuideHEl, this.smartGuideLabelEl);
        }
    },

    collectGuideTargets: function (ids) {
        var self = this;
        var scale = this.cssScale();
        var parentId, pane = 0, mixed = false;
        ids.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            if (!cfg) return;
            var pid = cfg.parentId || null;
            if (parentId === undefined) {
                parentId = pid;
                pane = cfg.paneIndex || 0;
            } else if (parentId !== pid || pane !== (cfg.paneIndex || 0)) mixed = true;
        });
        this._dragGuideHost = (!mixed && parentId) ? this.containerContent(parentId, pane) : $("#canvas-zoom-inner");
        if (mixed || parentId === undefined) return [];

        var targets = [];
        (this.controls || []).forEach(function (c) {
            if (!c || ids.indexOf(c.id) >= 0 || (c.parentId || null) !== parentId || (c.paneIndex || 0) !== pane) return;
            if (c.type === "annotation" || typeof c.left !== "number" || typeof c.top !== "number") return;
            var $el = self.controlElement(c);
            if (!$el.length || !$el.is(":visible")) return;
            var r = $el[0].getBoundingClientRect();
            targets.push({
                left: c.left,
                top: c.top,
                right: c.left + (c.width || r.width / scale),
                bottom: c.top + (c.height || r.height / scale)
            });
        });
        return targets;
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

        (this._dragGuideTargets || []).forEach(function (c) {
            var left = c.left;
            var top = c.top;
            var right = c.right;
            var bottom = c.bottom;
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
    cssScale: function () {
        return (this.viewScale && this.viewScale > 0) ? this.viewScale : 1;
    },

    collectDescendantIds: function (rootId) {
        var ids = [];
        var self = this;
        function walk(pid) {
            (self.controls || []).forEach(function (c) {
                if (c && c.parentId === pid) {
                    ids.push(c.id);
                    walk(c.id);
                }
            });
        }
        walk(rootId);
        return ids;
    },

    escapeHtml: function (value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    safeToken: function (value, max) {
        return typeof value === "string" && value.length > 0 && value.length <= (max || 120) && /^[A-Za-z0-9_.:\-]+$/.test(value);
    },

    sanitizeControls: function (list) {
        var self = this;
        var kept = [], renamed = {}, seed = 0;
        function fresh(prefix) { return prefix + "_" + Date.now() + "_" + (seed++); }

        (Array.isArray(list) ? list : []).forEach(function (c) {
            if (!c || typeof c !== "object" || Array.isArray(c) || !self.safeToken(c.type, 40)) return;
            ["ftype", "uiMode", "dock"].forEach(function (key) {
                if (c[key] != null && !self.safeToken(String(c[key]), 40)) delete c[key];
            });
            if (!self.safeToken(c.id)) {
                var id = fresh("ctrl");
                if (typeof c.id === "string") renamed[c.id] = id;
                c.id = id;
            }
            kept.push(c);
        });
        kept.forEach(function (c) {
            ["parentId", "tabPageId", "groupId"].forEach(function (key) {
                if (c[key] == null) return;
                if (Object.prototype.hasOwnProperty.call(renamed, c[key])) c[key] = renamed[c[key]];
                else if (!self.safeToken(String(c[key]))) delete c[key];
            });
            [["columns", "col"], ["rowActions", "act"]].forEach(function (pair) {
                if (!Array.isArray(c[pair[0]])) return;
                c[pair[0]].forEach(function (item) {
                    if (item && item.id != null && !self.safeToken(String(item.id))) item.id = fresh(pair[1]);
                });
            });
        });
        return kept;
    },

    containerContentSelector: ".popup-body, .page-field-groupbox-content, .page-field-section-content, .ess-collapsible-content, .core-splitter-pane",

    controlElement: function (cfg) {
        if (!cfg) return $();
        var $el = $("#canvas").find('.canvas-control[data-id="' + cfg.id + '"], .popup-design[data-id="' + cfg.id + '"]');
        return (cfg.type === "popup" ? $el.filter(".popup-design") : $el.not(".popup-design")).first();
    },

    // Nút nắm ở góc trên trái của lưới: lưới chỉ kéo được ở các dải phía trên bảng, và có thể không còn dải nào (không tiêu đề, không thanh nút).
    ensureMoveHandle: function ($root) {
        if (!$root.children(".ub-move").length) $root.append($('<span class="ub-move"></span>').attr("title", "Kéo để dời lưới"));
    },

    isContainerConfig: function (cfg) {
        return !!cfg && (cfg.type === "popup" || cfg.type === "collapsible-section" || controlSplitter.isSplitter(cfg) ||
            (cfg.type === "field" && (cfg.ftype === "groupbox" || cfg.ftype === "section")));
    },

    hostsTabPages: function (cfg) {
        return !!cfg && (cfg.type === "popup" || controlSplitter.isSplitter(cfg));
    },

    containerContent: function (parentId, pane) {
        var cfg = parentId ? this.getControlConfig(parentId) : null;
        if (!this.isContainerConfig(cfg)) return $();
        var $el = this.controlElement(cfg);
        if (cfg.type === "popup") return $el.children(".popup-body").first();
        if (cfg.type === "collapsible-section") return $el.children(".ess-collapsible-content").first();
        if (controlSplitter.isSplitter(cfg)) return controlSplitter.paneElement($el, pane);
        return $el.children(cfg.ftype === "groupbox" ? ".page-field-groupbox-content" : ".page-field-section-content").first();
    },

    canNest: function (child, parent) {
        if (!child || !this.isContainerConfig(parent) || child.id === parent.id) return false;
        if (child.type === "popup" || child.type === "annotation") return false;
        if (child.type === "tabpage") return this.hostsTabPages(parent);
        return true;
    },

    stackingPath: function (el) {
        var inner = document.getElementById("canvas-zoom-inner");
        var path = [];
        for (var node = el; node && node !== inner; node = node.parentElement) path.unshift(node);
        return path;
    },

    isStackedAbove: function (a, b) {
        var pa = this.stackingPath(a), pb = this.stackingPath(b);
        var i = 0;
        while (i < pa.length && i < pb.length && pa[i] === pb[i]) i++;
        if (i >= pb.length) return true;
        if (i >= pa.length) return false;
        var za = parseInt(window.getComputedStyle(pa[i]).zIndex, 10) || 0;
        var zb = parseInt(window.getComputedStyle(pb[i]).zIndex, 10) || 0;
        if (za !== zb) return za > zb;
        return !!(pb[i].compareDocumentPosition(pa[i]) & Node.DOCUMENT_POSITION_FOLLOWING);
    },

    containerAt: function (el, cfg, point) {
        if (!el) return null;
        var self = this;
        var r = el.getBoundingClientRect();
        var cx = point ? point.x : (r.left + r.right) / 2;
        var cy = point ? point.y : (r.top + r.bottom) / 2;
        var best = null;
        $("#canvas").find(this.containerContentSelector).each(function () {
            if (el.contains(this) || !$(this).is(":visible")) return;
            var $owner = $(this).closest(".popup-design, .canvas-control");
            if (!$owner.length) return;
            var cr = (controlSplitter.paneIndexOf(this) == null ? $owner[0] : this).getBoundingClientRect();
            if (cx < cr.left || cx > cr.right || cy < cr.top || cy > cr.bottom) return;
            var owner = self.getControlConfig($owner.attr("data-id"));
            if (!self.canNest(cfg, owner)) return;
            if (!best || self.isStackedAbove(this, best.content)) best = { id: owner.id, content: this };
        });
        return best ? { id: best.id, pane: controlSplitter.paneIndexOf(best.content) } : null;
    },

    setControlParent: function (cfg, parentId, pane) {
        parentId = parentId || null;
        var $el = this.controlElement(cfg);
        if (!$el.length) return false;
        var parentCfg = parentId ? this.getControlConfig(parentId) : null;
        var docked = cfg.type === "toolbar" && !!parentCfg && parentCfg.type === "popup";
        var $host = docked ? this.controlElement(parentCfg) : (parentId ? this.containerContent(parentId, pane) : $("#canvas-zoom-inner"));
        if (!$host.length) return false;
        if ((cfg.parentId || null) === parentId && $el.parent().is($host)) return false;

        var scale = this.cssScale();
        var before = $el[0].getBoundingClientRect();
        $host.append($el);
        $el.css("position", "absolute");
        var after = $el[0].getBoundingClientRect();
        var left = Math.round((parseFloat($el.css("left")) || 0) + (before.left - after.left) / scale);
        var top = Math.round((parseFloat($el.css("top")) || 0) + (before.top - after.top) / scale);
        var minTop = 0;
        if (cfg.type === "toolbar" && parentCfg && parentCfg.type === "field" && parentCfg.ftype === "section") {
            minTop = Math.min(0, Math.round((this.controlElement(parentCfg)[0].getBoundingClientRect().top - $host[0].getBoundingClientRect().top) / scale));
        }
        cfg.parentId = parentId;
        if (controlSplitter.isSplitter(parentCfg)) cfg.paneIndex = pane === 1 ? 1 : 0;
        else delete cfg.paneIndex;
        cfg.left = Math.max(0, left);
        cfg.top = Math.max(minTop, top);
        $el.css({ left: cfg.left + "px", top: cfg.top + "px" });

        if (cfg.type === "toolbar") {
            cfg.dock = docked ? "popup" : null;
            $el.toggleClass("toolbar-docked-in-popup", docked);
        }

        if (this.derivesStacking(cfg)) {
            this.applyStacking(cfg, $el);
        } else if (cfg.type !== "field" && cfg.type !== "tabpage") {
            var z = cfg.zIndex != null ? cfg.zIndex : 1;
            if (parentCfg) z = this.stackingBase(parentCfg) + 1;
            $el.css("z-index", z);
        }
        return true;
    },

    // Lưới và toolbar không lưu z-index trong cấu hình: thứ tự chồng của chúng chỉ phụ thuộc cha.
    derivesStacking: function (cfg) {
        return cfg.type === "grid" || cfg.type === "ess-grid" || cfg.type === "toolbar";
    },

    stackingBase: function (parentCfg) {
        var base = parseInt(parentCfg.type === "popup" ? this.controlElement(parentCfg).css("z-index") : parentCfg.zIndex, 10);
        return isNaN(base) ? 0 : base;
    },

    // Lúc vẽ (mở thiết kế, Undo, dán, nhân bản) và lúc thả cùng gọi hàm này, nên hai control chồng nhau theo cùng một thứ tự
    // dù chúng tới chỗ đó bằng đường nào. Lưới nổi trên các control khác của popup và trên nền của ESS Section;
    // ở chỗ khác, và với toolbar, không có z-index: control vẽ sau nằm trên.
    applyStacking: function (cfg, $el) {
        var parentCfg = cfg.parentId ? this.getControlConfig(cfg.parentId) : null;
        var z = "";
        if (parentCfg && cfg.type !== "toolbar") {
            if (parentCfg.type === "popup") z = this.stackingBase(parentCfg) + 10;
            else if (parentCfg.type === "collapsible-section") z = this.stackingBase(parentCfg) + 1;
        }
        $el.css("z-index", z);
    },

    sameHost: function (a, b) {
        return this.containerOf(a) === this.containerOf(b) && (a.paneIndex || 0) === (b.paneIndex || 0);
    },

    inheritTabMembership: function (cfg, parentCfg) {
        cfg.tabPageId = parentCfg.tabPageId || null;
        cfg.tabIndex = typeof parentCfg.tabIndex === "number" ? parentCfg.tabIndex : null;
    },

    updateTabMembership: function (cfg, point) {
        var parentCfg = cfg.parentId ? this.getControlConfig(cfg.parentId) : null;
        if (parentCfg && !this.hostsTabPages(parentCfg)) {
            this.inheritTabMembership(cfg, parentCfg);
            return;
        }
        var $el = this.controlElement(cfg);
        if (!$el.length) return;
        var self = this;
        var r = $el[0].getBoundingClientRect();
        var cx = point ? point.x : (r.left + r.right) / 2;
        var cy = point ? point.y : (r.top + r.bottom) / 2;
        var tab = null;
        (this.controls || []).forEach(function (c) {
            if (!c || c.type !== "tabpage" || c.id === cfg.id || !self.sameHost(c, cfg)) return;
            var $tab = self.controlElement(c);
            if (!$tab.length || !$tab.is(":visible")) return;
            var tr = $tab[0].getBoundingClientRect();
            if (cx >= tr.left && cx <= tr.right && cy >= tr.top && cy <= tr.bottom) tab = c;
        });
        if (!tab && controlSplitter.isSplitter(parentCfg)) {
            this.inheritTabMembership(cfg, parentCfg);
            return;
        }
        cfg.tabPageId = tab ? tab.id : null;
        cfg.tabIndex = tab ? (tab.activeTabIndex || 0) : null;
    },

    claimTabMembers: function (tabCfg) {
        var self = this;
        var $tab = this.controlElement(tabCfg);
        if (!$tab.length) return;
        var tr = $tab[0].getBoundingClientRect();
        (this.controls || []).forEach(function (c) {
            if (!c || c.tabPageId || c.id === tabCfg.id || !self.sameHost(c, tabCfg)) return;
            if (c.type === "popup" || c.type === "tabpage" || c.type === "annotation") return;
            var $el = self.controlElement(c);
            if (!$el.length || !$el.is(":visible")) return;
            var r = $el[0].getBoundingClientRect();
            var cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
            if (cx < tr.left || cx > tr.right || cy < tr.top || cy > tr.bottom) return;
            c.tabPageId = tabCfg.id;
            c.tabIndex = tabCfg.activeTabIndex || 0;
        });
    },

    placeInContainer: function (cfg, point) {
        var $el = this.controlElement(cfg);
        if (!$el.length) return false;
        var target = this.containerAt($el[0], cfg, point);
        var changed = this.setControlParent(cfg, target ? target.id : null, target ? target.pane : null);
        if (changed && this.snapEnabled && !this._dropExact) {
            cfg.left = Math.round(cfg.left / this.snapStep) * this.snapStep;
            cfg.top = Math.round(cfg.top / this.snapStep) * this.snapStep;
            $el.css({ left: cfg.left + "px", top: cfg.top + "px" });
        }
        return changed;
    },

    dropControl: function (cfg, point) {
        if (!cfg || cfg.type === "popup" || cfg.type === "annotation" || cfg.type === "tabpage") return false;
        if (!this.controlElement(cfg).length) return false;
        var changed = this.placeInContainer(cfg, point);
        this.updateTabMembership(cfg, point);
        if (cfg.type === "toolbar" && window.controlToolbar && controlToolbar.alignToBand) controlToolbar.alignToBand(cfg);
        return changed;
    },

    mountInParent: function (cfg) {
        if (!cfg.parentId || cfg.type === "popup" || (cfg.type === "toolbar" && cfg.dock === "popup")) return;
        var $host = this.containerContent(cfg.parentId, cfg.paneIndex);
        var $el = this.controlElement(cfg);
        if (!$host.length || !$el.length || $el.parent().is($host)) return;
        $host.append($el);
        $el.css({ position: "absolute", left: (cfg.left || 0) + "px", top: (cfg.top || 0) + "px" });
    },

    // Control nằm đè lên group (cùng popup) nhưng chưa là con DOM sẽ bị group che khi kéo.
    // Kéo vào content trước khi drag để nó đi theo group và không biến mất.
    adoptControlsIntoGroup: function (groupId) {
        var groupCfg = this.getControlConfig(groupId);
        if (!groupCfg || (groupCfg.type !== "field" && groupCfg.type !== "collapsible-section")) return;
        if (groupCfg.type === "field" && groupCfg.ftype !== "groupbox" && groupCfg.ftype !== "section") return;

        var $content = this.containerContent(groupId);
        if (!$content.length || !$content.is(":visible")) return;
        var $group = this.controlElement(groupCfg);
        var contentRect = $group[0].getBoundingClientRect();
        if (contentRect.width < 4 || contentRect.height < 4) return;
        var self = this;

        (this.controls || []).slice().forEach(function (c) {
            if (!c || c.id === groupId || (c.parentId || null) !== (groupCfg.parentId || null)) return;
            if (!self.canNest(c, groupCfg)) return;
            var $el = self.controlElement(c);
            if (!$el.length || !$el.is(":visible") || $el[0].contains($content[0])) return;
            var rect = $el[0].getBoundingClientRect();
            if (rect.left < contentRect.left - 2 || rect.right > contentRect.right + 2 ||
                rect.top < contentRect.top - 2 || rect.bottom > contentRect.bottom + 2) return;
            if (!self.isStackedAbove($el[0], $group[0])) return;
            if (self.setControlParent(c, groupId)) self.updateTabMembership(c);
        });
    },

    reapplyGroupChildPins: function () {
        if (!this._dragGroupChildPins) return;
        var self = this;
        Object.keys(this._dragGroupChildPins).forEach(function (id) {
            var pin = self._dragGroupChildPins[id];
            var c = self.getControlConfig(id);
            if (!c || !pin) return;
            c.left = pin.left;
            c.top = pin.top;
            $('.canvas-control[data-id="' + id + '"]').css({
                left: pin.left + "px",
                top: pin.top + "px"
            });
        });
    },

    beginDragSelection: function (baseId) {
        this._pressClick = null;
        var ids = this.getAllSelectedControlIds();
        if (!ids.length || !this.isInSelection(baseId, ids)) {
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

        var pinSelf = this;
        var carried = {};
        ids.slice().forEach(function (id) {
            var tab = pinSelf.getControlConfig(id);
            if (!tab || tab.type !== "tabpage") return;
            pinSelf.claimTabMembers(tab);
            (pinSelf.controls || []).forEach(function (c) {
                if (!c || c.tabPageId !== tab.id || pinSelf.containerOf(c) !== pinSelf.containerOf(tab) || ids.indexOf(c.id) >= 0) return;
                ids.push(c.id);
                carried[c.id] = true;
            });
        });
        this._dragCarriedIds = carried;

        var pins = {};
        ids.slice().forEach(function (id) {
            var container = pinSelf.getControlConfig(id);
            if (!pinSelf.isContainerConfig(container)) return;
            pinSelf.adoptControlsIntoGroup(id);
            pinSelf.collectDescendantIds(id).forEach(function (childId) {
                var child = pinSelf.getControlConfig(childId);
                if (child) pins[childId] = { left: child.left || 0, top: child.top || 0 };
            });
        });
        var pinnedIds = Object.keys(pins);
        this._dragGroupChildPins = pinnedIds.length ? pins : null;
        ids = ids.filter(function (id) { return !pins[id]; });
        pinnedIds.forEach(function (id) {
            $('.canvas-control[data-id="' + id + '"]').css("pointer-events", "none");
        });

        this._dragSelectionIds = ids;
        this._dragSelectionBase = baseId;
        this._dragSelectionStart = {};
        this._dragSelectionDxTotal = 0;
        this._dragSelectionDyTotal = 0;
        this._dragSelectionRawDx = 0;
        this._dragSelectionRawDy = 0;
        this._dragGuideTargets = this.collectGuideTargets(ids);

        var self = this;
        ids.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            if (!cfg) return;
            var start = { left: cfg.left || 0, top: cfg.top || 0 };
            if (!carried[id] && cfg.type !== "popup" && cfg.type !== "tabpage") self.liftForDrag(cfg);
            start.canvasLeft = cfg.left || 0;
            start.canvasTop = cfg.top || 0;
            self._dragSelectionStart[id] = start;
        });
    },

    liftForDrag: function (cfg) {
        controlSplitter.lift(cfg);
        if (cfg.parentId) this.setControlParent(cfg, null);
        this.controlElement(cfg).addClass("ub-dragging");
    },

    dragSelectionMove: function (dx, dy) {
        if (!this._dragSelectionIds || !this._dragSelectionStart) return;
        var self = this, scale = this.cssScale();
        var step = this.clampDragDelta(dx * scale, dy * scale);
        this.startDragScroll(function (movedX, movedY) {
            var current = self.cssScale();
            self.shiftDragSelection(movedX / current, movedY / current);
        });
        this.shiftDragSelection(step.dx / scale, step.dy / scale);
        return { dx: step.dx / scale, dy: step.dy / scale };
    },

    shiftDragSelection: function (dx, dy) {
        if (!this._dragSelectionIds || !this._dragSelectionStart) return;

        // Tính tổng delta dự kiến sau bước drag này
        this._dragSelectionRawDx += dx;
        this._dragSelectionRawDy += dy;
        var proposedDx = this._dragSelectionRawDx;
        var proposedDy = this._dragSelectionRawDy;

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
        var anchor = this._dragSelectionStart[this._dragSelectionBase] || this._dragSelectionStart[this._dragSelectionIds[0]];
        if (this.snapEnabled && anchor) {
            totalDx = Math.round((anchor.left + totalDx) / this.snapStep) * this.snapStep - anchor.left;
            totalDy = Math.round((anchor.top + totalDy) / this.snapStep) * this.snapStep - anchor.top;
        }

        var minLeft = Infinity, minTop = Infinity;
        this._dragSelectionIds.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            var st = self._dragSelectionStart[id];
            if (!cfg || !st || cfg.parentId) return;
            minLeft = Math.min(minLeft, st.canvasLeft);
            minTop = Math.min(minTop, st.canvasTop);
        });
        if (isFinite(minLeft)) {
            totalDx = Math.max(totalDx, 20 - minLeft);
            totalDy = Math.max(totalDy, 20 - minTop);
        }

        this._dragSelectionIds.forEach(function (id) {
            var cfg = self.getControlConfig(id);
            var st = self._dragSelectionStart[id];
            if (!cfg || !st) return;

            var min = cfg.parentId ? 0 : 20;
            cfg.left = Math.max(min, st.canvasLeft + totalDx);
            cfg.top = Math.max(min, st.canvasTop + totalDy);

            // ✅ Cập nhật DOM cho tất cả loại controls
            var $el = self.controlElement(cfg);
            if ($el.length) {
                $el.css({
                    left: cfg.left + "px",
                    top: cfg.top + "px"
                });
            }
        });

        this.reapplyGroupChildPins();
        this.updateSelectionSizeHint();
    },


    dragSelectionBy: function (id, dx, dy) {
        if (!this._dragSelectionIds || this._dragSelectionBase !== id) {
            var ids = this.getAllSelectedControlIds();
            if (ids.length < 2 || !this.isInSelection(id, ids)) return false;
            this.beginDragSelection(id);
        }
        var scale = this.cssScale();
        this.dragSelectionMove(dx / scale, dy / scale);
        return true;
    },

    finishSelectionDrag: function (id, event) {
        if (!this._dragSelectionIds || this._dragSelectionBase !== id) return false;
        this.dropDraggedControls(id, event);
        this.endDragSelection();
        return true;
    },

    dragControlBy: function (cfg, $root, dx, dy) {
        if (this.dragSelectionBy(cfg.id, dx, dy)) return;
        var self = this;
        var step = this.clampDragDelta(dx, dy);
        this.startDragScroll(function (movedX, movedY) { self.shiftControl(cfg, $root, movedX, movedY); });
        this.shiftControl(cfg, $root, step.dx, step.dy);
    },

    shiftControl: function (cfg, $root, dx, dy) {
        var scale = this.cssScale();
        if (!$root.hasClass("ub-dragging")) this.liftForDrag(cfg);
        cfg.left = Math.max(20, (cfg.left || 0) + dx / scale);
        cfg.top = Math.max(20, (cfg.top || 0) + dy / scale);
        $root.css({ left: cfg.left + "px", top: cfg.top + "px" });
        this.updateSelectionSizeHint();
    },

    dropPoint: function (event) {
        return event && typeof event.clientX === "number" ? { x: event.clientX, y: event.clientY } : null;
    },

    finishControlDrag: function (cfg, $root, event) {
        if (this.finishSelectionDrag(cfg.id, event)) return;
        this.stopDragScroll();
        cfg.left = Math.round(cfg.left || 0);
        cfg.top = Math.round(cfg.top || 0);
        $root.css({ left: cfg.left + "px", top: cfg.top + "px" }).removeClass("ub-dragging");
        this.dropControl(cfg, this.dropPoint(event));
        controlSplitter.land(cfg);
        this.refreshJson();
    },

    dropDraggedControls: function (baseId, event) {
        var self = this;
        var ids = (this._dragSelectionIds || []).slice();
        if (ids.indexOf(baseId) < 0) ids.push(baseId);
        var list = ids.map(function (id) { return self.getControlConfig(id); }).filter(Boolean);
        list.sort(function (a, b) {
            var rankA = self.isContainerConfig(a) ? 0 : 1, rankB = self.isContainerConfig(b) ? 0 : 1;
            if (rankA !== rankB) return rankA - rankB;
            return ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0));
        });
        var point = this.dropPoint(event);
        var carried = this._dragCarriedIds || {};
        var pinned = this._dragGroupChildPins || {};
        list.forEach(function (c) {
            c.left = Math.round(c.left || 0);
            c.top = Math.round(c.top || 0);
            self.controlElement(c).css({ left: c.left + "px", top: c.top + "px" }).removeClass("ub-dragging");
        });
        function drop(c, at) {
            if (c.type === "field" && window.controlField && typeof controlField.updateParent === "function") controlField.updateParent(c, at);
            else self.dropControl(c, at);
        }

        var baseCfg = this.getControlConfig(baseId);
        var shiftX = 0, shiftY = 0;
        if (baseCfg && !carried[baseId] && !pinned[baseId]) {
            var $base = this.controlElement(baseCfg);
            var before = $base[0].getBoundingClientRect();
            drop(baseCfg, point);
            var after = $base[0].getBoundingClientRect();
            var scale = this.cssScale();
            shiftX = Math.round((after.left - before.left) / scale);
            shiftY = Math.round((after.top - before.top) / scale);
        }

        this._dropExact = true;
        try {
            list.forEach(function (c) {
                if (c.id === baseId || pinned[c.id]) return;
                if (shiftX || shiftY) {
                    c.left += shiftX;
                    c.top += shiftY;
                    self.controlElement(c).css({ left: c.left + "px", top: c.top + "px" });
                }
                if (!carried[c.id]) drop(c, null);
            });
        } finally {
            this._dropExact = false;
        }
        list.forEach(function (c) { controlSplitter.land(c); });
    },

    endDragSelection: function () {
        this.stopDragScroll();
        if (this._dragGroupChildPins) {
            Object.keys(this._dragGroupChildPins).forEach(function (id) {
                $('.canvas-control[data-id="' + id + '"]').css("pointer-events", "");
            });
            this.reapplyGroupChildPins();
            this._dragGroupChildPins = null;
        }
        if (this._dragSelectionIds) {
            this.refreshJson();
        }
        this._dragSelectionIds = null;
        this._dragSelectionBase = null;
        this._dragCarriedIds = null;
        this._dragSelectionStart = null;
        this._dragSelectionDxTotal = 0;
        this._dragSelectionDyTotal = 0;
        this.hideSmartGuides();
    },



    moveSelectionBy: function (dx, dy) {
        if (!dx && !dy) return;

        var self = this;
        var ids = this.getAllSelectedControlIds();
        var chosen = {};
        ids.forEach(function (id) { chosen[id] = true; });
        (this.controls || []).forEach(function (c) {
            if (!c || !c.tabPageId || !chosen[c.tabPageId] || ids.indexOf(c.id) >= 0) return;
            if (self.containerOf(c) === self.containerOf(self.getControlConfig(c.tabPageId))) ids.push(c.id);
        });

        var moving = ids.map(function (id) { return self.getControlConfig(id); }).filter(function (c) {
            if (!c) return false;
            var up = c.parentId ? self.getControlConfig(c.parentId) : null;
            while (up) {
                if (chosen[up.id]) return false;
                up = up.parentId ? self.getControlConfig(up.parentId) : null;
            }
            return true;
        });

        if (this.snapEnabled && moving.length) {
            var anchor = moving[0];
            if (dx) dx = Math.round(((anchor.left || 0) + dx) / this.snapStep) * this.snapStep - (anchor.left || 0);
            if (dy) dy = Math.round(((anchor.top || 0) + dy) / this.snapStep) * this.snapStep - (anchor.top || 0);
        }

        var minLeft = Infinity, minTop = Infinity;
        moving.forEach(function (c) {
            if (self.containerOf(c)) return;
            minLeft = Math.min(minLeft, c.left || 0);
            minTop = Math.min(minTop, c.top || 0);
        });
        if (isFinite(minLeft)) {
            if (dx < 0) dx = Math.min(0, Math.max(dx, 20 - minLeft));
            if (dy < 0) dy = Math.min(0, Math.max(dy, 20 - minTop));
        }

        moving.forEach(function (c) {
            controlSplitter.lift(c);
            c.left = (c.left || 0) + dx;
            c.top = (c.top || 0) + dy;
            if (c.type === "field" && self.isContainerConfig(self.getControlConfig(c.parentId))) {
                c.left = Math.max(0, c.left);
                c.top = Math.max(0, c.top);
            }
            self.controlElement(c).css({ left: c.left, top: c.top });
        });
        moving.forEach(function (c) { controlSplitter.land(c); });

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
    moveGroupControls: function (groupId, dx, dy, exceptId) {
        if (!groupId || !this.groups || !this.groups[groupId]) return;

        var group = this.groups[groupId];
        var self = this;

        group.controlIds.forEach(function(controlId) {
            var c = self.getControlConfig(controlId);
            if (!c || c.groupId !== groupId || controlId === exceptId) return;
            if (self._dragSelectionIds && self._dragSelectionIds.indexOf(controlId) >= 0) return;

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
            this.showToast("Sao chép kiểu hiện chỉ dùng cho field.", "info");
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
        this.showToast("Đã sao chép kiểu của '" + (cfg.caption || cfg.ftype || cfg.id) + "'.", "success");
    },

    pasteStyleToSelection: function () {
        if (!this.copiedStyle) {
            this.showToast("Chưa sao chép kiểu nào.", "warning");
            return;
        }

        var ids = this.getSelectedFieldIds();
        if (!ids.length) {
            this.showToast("Chọn ít nhất 1 field để dán kiểu.", "info");
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
            if (cfg.ftype === "label") {
                $dom.find(".page-field-editor > span").css({ "font-weight": cfg.captionBold ? "700" : "", "font-style": cfg.captionItalic ? "italic" : "" });
            }

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
            this.showToast("Chọn control để sao chép.", "info");
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
        this.showToast("Đã sao chép " + list.length + " control.", "success");
    },

    pasteSelectionControls: function () {
        if (!this.clipboardControls || !this.clipboardControls.length) {
            this.showToast("Chưa sao chép control nào. Hãy bấm Ctrl+C trước.", "info");
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

        var parentCfg = cfg.parentId ? this.getControlConfig(cfg.parentId) : null;
        if (parentCfg && parentCfg.type === "tabpage") {
            cfg.tabPageId = parentCfg.id;
            if (typeof cfg.tabIndex !== "number") cfg.tabIndex = parentCfg.activeTabIndex || 0;
            cfg.parentId = null;
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
        } else if (cfg.type === "annotation" && window.controlAnnotation) {
            controlAnnotation.renderExisting(cfg);
        }
        this.mountInParent(cfg);
        if (cfg.tabPageId && window.controlTabPage && controlTabPage.syncMember) controlTabPage.syncMember(cfg);
        if (cfg.type === "toolbar" && window.controlToolbar && controlToolbar.alignToBand) controlToolbar.alignToBand(cfg);
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
        if (c.type === "annotation" && window.controlAnnotation) return controlAnnotation.label(c);
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
            html += '<div class="outline-row">' + self.escapeHtml(self.getOutlineLabel(c)) + '</div>';
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
        var htmlHeader = '<div class="outline-header">Danh sách control</div>';

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
        this.showPropertiesFor(cfg);
    },

    showPropertiesFor: function (cfg) {
        if (!cfg) return;
        if (cfg.type === "field" && window.controlField) controlField.showProperties(cfg);
        else if (cfg.type === "grid" && window.controlGrid) controlGrid.showProperties(cfg.id);
        else if (cfg.type === "ess-grid" && window.controlGridEss) controlGridEss.showProperties(cfg);
        else if (cfg.type === "popup" && window.controlPopup) controlPopup.selectById(cfg.id);
        else if (cfg.type === "tabpage" && window.controlTabPage && controlTabPage.showProperties) controlTabPage.showProperties(cfg);
        else if (cfg.type === "toolbar" && window.controlToolbar && controlToolbar.showProperties) controlToolbar.showProperties(cfg);
        else if (cfg.type === "collapsible-section" && window.controlCollapsibleSection) controlCollapsibleSection.showProperties(cfg);
        else if (cfg.type === "annotation" && window.controlAnnotation) controlAnnotation.showProperties(cfg);
    },


    // ========= Context menu =========
    initContextMenu: function () {
        if ($("#builderContextMenu").length) return;

        $("body").append('<div id="builderContextMenu" class="builder-context-menu" style="display:none;"><ul></ul></div>');

        var self = this;
        var $menu = $("#builderContextMenu");
        $menu.on("click", "li[data-cmd]", function (e) {
            e.stopPropagation();
            if ($(this).hasClass("cm-disabled")) return;
            var cmd = $(this).attr("data-cmd");
            var arg = $(this).attr("data-arg") || null;
            self.hideContextMenu();
            self.handleContextCommand(cmd, arg);
        });
        $menu.on("mouseenter click", "li.cm-parent", function (e) {
            if (e.type === "click" && $(e.target).closest("li")[0] !== this) return;
            $(this).siblings(".cm-open").removeClass("cm-open");
            $(this).addClass("cm-open");
            self.placeContextSubmenu($(this));
        });
        $menu.on("mouseenter", "> ul > li:not(.cm-parent)", function () {
            $(this).siblings(".cm-open").removeClass("cm-open");
        });
    },

    contextMenuHtml: function (items) {
        var self = this;
        return items.map(function (item) {
            if (item.sep) return '<li class="cm-sep"></li>';
            var text = $("<span>").text(item.text).html();
            if (item.label) return '<li class="cm-label">' + text + '</li>';
            if (item.items) {
                return '<li class="cm-parent"><span class="cm-text">' + text + '</span><span class="cm-arrow">&#9656;</span>' +
                    '<ul class="cm-sub">' + self.contextMenuHtml(item.items) + '</ul></li>';
            }
            return '<li data-cmd="' + item.cmd + '"' + (item.arg ? ' data-arg="' + item.arg + '"' : '') +
                (item.disabled ? ' class="cm-disabled"' : '') + '><span class="cm-text">' + text + '</span>' +
                (item.key ? '<span class="cm-key">' + item.key + '</span>' : '') + '</li>';
        }).join("");
    },

    fieldTypeMenu: function (cfg) {
        var self = this;
        var isImage = cfg.ftype === "image";
        var modes = [cfg.uiMode === "ess" ? "ess" : "core"];
        if (isImage) {
            var used = {};
            (this.controls || []).forEach(function (c) {
                if (c.type === "field" && c.ftype !== "image" && c.ftype !== "groupbox" && c.ftype !== "section") {
                    used[c.uiMode === "ess" ? "ess" : "core"] = true;
                }
            });
            modes = ["core", "ess"].filter(function (mode) { return used[mode]; });
            if (!modes.length) modes = ["core", "ess"];
        }
        var items = [];
        modes.forEach(function (mode) {
            if (modes.length > 1) items.push({ label: true, text: mode === "ess" ? "Control ESS" : "Control Core" });
            self.fieldTypeChoices[mode].forEach(function (choice) {
                if (!isImage && choice.ftype === cfg.ftype) return;
                items.push({ cmd: "change-type", arg: mode + ":" + choice.ftype, text: choice.text });
            });
        });
        return items;
    },

    contextMenuItems: function (cfg) {
        var self = this;
        var ids = this.getAllSelectedControlIds();
        var isField = !!cfg && cfg.type === "field";
        var isContainerField = isField && (cfg.ftype === "groupbox" || cfg.ftype === "section");
        var isImage = isField && cfg.ftype === "image";
        var isContainer = isContainerField || (!!cfg && (cfg.type === "popup" || cfg.type === "collapsible-section"));
        var isGrid = !!cfg && (cfg.type === "grid" || cfg.type === "ess-grid");
        var grouped = ids.some(function (id) {
            var c = self.getControlConfig(id);
            return !!(c && c.groupId);
        });
        var items = [];

        if (cfg) {
            items.push({ cmd: "duplicate", text: "Nhân bản", key: "Ctrl+D" });
            items.push({ cmd: "copy-ctrl", text: "Sao chép", key: "Ctrl+C" });
        }
        items.push({ cmd: "paste-ctrl", text: "Dán", key: "Ctrl+V", disabled: !(this.clipboardControls && this.clipboardControls.length) });
        if (cfg) items.push({ cmd: "delete", text: "Xóa", key: "Del" });
        items.push({ sep: true });

        if (isImage) {
            items.push({ text: "Thay ảnh bằng control", items: this.fieldTypeMenu(cfg) });
            if (cfg.imageData) {
                items.push({
                    text: "Tách ảnh thành control", items: [
                        { cmd: "import-structure-core", text: "Nhận dạng thành control Core…" },
                        { cmd: "import-structure-ess", text: "Nhận dạng thành control ESS…" },
                        { cmd: "slice-image", text: "Cắt ảnh thành lát…" }
                    ]
                });
            }
        } else if (isField && !isContainerField && cfg.ftype !== "language" && cfg.ftype !== "progress" && cfg.ftype !== "splitter") {
            items.push({ text: "Đổi loại control", items: this.fieldTypeMenu(cfg) });
        }
        items.push({
            text: "Đánh dấu", items: [
                { cmd: "annot-box", text: "Khoanh đỏ" },
                { cmd: "annot-highlight", text: "Bôi vàng" },
                { cmd: "annot-note", text: "Thêm ghi chú" }
            ]
        });
        if (this.getSelectedFieldIds().length > 1) {
            items.push({
                text: "Căn chỉnh", items: [
                    { cmd: "align-left", text: "Căn trái", key: "Alt+←" },
                    { cmd: "align-right", text: "Căn phải", key: "Alt+→" },
                    { cmd: "align-top", text: "Căn trên", key: "Alt+↑" },
                    { cmd: "align-bottom", text: "Căn dưới", key: "Alt+↓" }
                ]
            });
        }
        if (isField && !isContainerField) {
            items.push({
                text: "Kiểu hiển thị", items: [
                    { cmd: "copy-style", text: "Sao chép kiểu", key: "Ctrl+Alt+C" },
                    { cmd: "paste-style", text: "Dán kiểu", disabled: !this.copiedStyle }
                ]
            });
        }
        if (isContainer) {
            items.push({
                text: "Tự xếp control bên trong", items: [
                    { cmd: "autolayout-flow", text: "Xếp ngang (thẻ, chip)" },
                    { cmd: "autolayout-stack", text: "Xếp dọc (form, section)" },
                    { cmd: "autolayout-rows", text: "Xếp theo hàng (ảnh chụp form)" },
                    { cmd: "autolayout-off", text: "Tắt tự xếp" }
                ]
            });
        }
        if (grouped) items.push({ cmd: "ungroup", text: "Hủy nhóm", key: "Ctrl+Shift+G" });
        else if (ids.length >= 2) items.push({ cmd: "group", text: "Nhóm", key: "Ctrl+G" });
        if (isGrid) items.push({ cmd: "move-grid-to-container", text: "Đưa vào Popup / ESS Section…" });
        if (cfg) {
            items.push({ sep: true });
            items.push({
                text: "Ảnh của vùng chọn", items: [
                    { cmd: "export-selection", text: "Tải ảnh PNG" },
                    { cmd: "copy-selection-image", text: "Chép ảnh vào clipboard" }
                ]
            });
            items.push({ cmd: "save-component", text: "Lưu thành component…" });
        }
        return items;
    },

    selectOnly: function (id) {
        var cfg = this.getControlConfig(id);
        if (!cfg) return;
        this.clearSelection();
        this.selectedControlId = id;
        this.selectedControlType = cfg.type;
        var $dom = $("#canvas").find('[data-id="' + id + '"]');
        $dom.addClass("canvas-control-selected");
        if (cfg.type === "field") $dom.addClass("page-field-selected");
        if (cfg.type === "popup") $dom.filter(".popup-design").addClass("popup-selected");
        this.highlightOutlineSelection();
        this.updateSelectionSizeHint();
    },

    showContextMenu: function (e, target) {
        var $menu = $("#builderContextMenu");
        if (!$menu.length) return;

        var contextStamp = (e.originalEvent || e).timeStamp;
        if (this._contextStamp === contextStamp) return;
        this._contextStamp = contextStamp;
        this._contextPoint = { clientX: e.clientX, clientY: e.clientY };

        var $t = $(target);
        var id = $t.attr("data-id");
        if (!id || !this.getControlConfig(id) || $t.closest(".dx-datagrid").length) {
            var $owner = $t.closest(".canvas-control[data-id], .ess-grid-control[data-id]");
            if (!$owner.length) $owner = $t.closest("[data-id]");
            id = $owner.length ? $owner.attr("data-id") : null;
        }

        var cfg = id ? this.getControlConfig(id) : null;
        this._contextControlId = cfg ? id : null;
        if (cfg) {
            if (this.getAllSelectedControlIds().indexOf(id) < 0) {
                this.selectOnly(id);
            } else {
                this.selectedControlId = id;
                this.selectedControlType = cfg.type;
            }
        }

        $menu.children("ul").html(this.contextMenuHtml(this.contextMenuItems(cfg)));
        $menu.css({ left: "0px", top: "0px", display: "block" });
        var left = Math.min(e.clientX, window.innerWidth - $menu.outerWidth() - 8);
        var top = Math.min(e.clientY, window.innerHeight - $menu.outerHeight() - 8);
        $menu.css({ left: Math.max(8, left) + "px", top: Math.max(8, top) + "px" });
    },

    placeContextSubmenu: function ($item) {
        var $sub = $item.children(".cm-sub");
        if (!$sub.length) return;
        $sub.css({ left: "100%", right: "auto", top: "-5px", maxHeight: (window.innerHeight - 16) + "px" });
        var itemRect = $item[0].getBoundingClientRect();
        var rect = $sub[0].getBoundingClientRect();
        if (rect.right > window.innerWidth - 8 && itemRect.left - rect.width > 8) $sub.css({ left: "auto", right: "100%" });
        var top = itemRect.top - 5;
        if (top + rect.height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - 8 - rect.height);
        $sub.css("top", (top - itemRect.top) + "px");
    },

    changeSelectionType: function (arg) {
        if (!arg || !window.controlField || typeof controlField.changeType !== "function") return;
        var parts = String(arg).split(":");
        var uiMode = parts[0] === "ess" ? "ess" : "core";
        var choice = (this.fieldTypeChoices[uiMode] || []).filter(function (c) { return c.ftype === parts[1]; })[0];
        if (!choice) return;

        var ids = this.getAllSelectedControlIds();
        if (this._contextControlId && ids.indexOf(this._contextControlId) < 0) ids = [this._contextControlId];
        var changed = [];
        ids.forEach(function (id) {
            var next = controlField.changeType(id, choice.ftype, uiMode);
            if (next) changed.push(next);
        });
        if (!changed.length) {
            this.showToast("Không có control nào đổi được sang " + choice.text + ".", "info");
            return;
        }

        this.clearSelection();
        changed.forEach(function (cfg) {
            $("#canvas").find('[data-id="' + cfg.id + '"]').addClass("canvas-control-selected page-field-selected");
        });
        this.selectedControlId = changed[0].id;
        this.selectedControlType = "field";
        if (changed.length === 1 && typeof controlField.showProperties === "function") controlField.showProperties(changed[0]);
        this.refreshJson();
        this.highlightOutlineSelection();
        this.updateSelectionSizeHint();
        this.showToast(changed.length === 1
            ? "Đã đổi thành " + choice.text + ". Bấm Ctrl+Z nếu muốn quay lại."
            : "Đã đổi " + changed.length + " control thành " + choice.text + ". Bấm Ctrl+Z nếu muốn quay lại.", "success");
    },

    hideContextMenu: function () {
        $("#builderContextMenu").hide();
    },

    handleContextCommand: function (cmd, arg) {
        switch (cmd) {
            case "change-type":
                this.changeSelectionType(arg);
                break;
            case "annot-box":
            case "annot-highlight":
            case "annot-note":
                if (window.controlAnnotation) {
                    var annotIds = this.getAllSelectedControlIds();
                    if (this._contextControlId && annotIds.indexOf(this._contextControlId) < 0) annotIds = [this._contextControlId];
                    if (!this._contextControlId && annotIds.length < 2) annotIds = [];
                    controlAnnotation.addForSelection(cmd.substring("annot-".length), this._contextPoint, annotIds);
                }
                break;
            case "duplicate":
                this.duplicateSelection();
                break;
            case "copy-ctrl":
                this.copySelectionControls();
                break;
            case "paste-ctrl":
                this.pasteSelectionControls();
                break;
            case "save-component":
                if (window.builderSnippet) builderSnippet.saveSelectionAsComponent();
                break;
            case "export-selection":
                this.exportImage({ selection: true });
                break;
            case "copy-selection-image":
                this.exportImage({ selection: true, copy: true });
                break;
            case "slice-image":
                if (window.builderSlice) builderSlice.openForSelection();
                break;
            case "autolayout-flow":
                if (window.builderAutoLayout) builderAutoLayout.setMode("flow");
                break;
            case "autolayout-stack":
                if (window.builderAutoLayout) builderAutoLayout.setMode("stack");
                break;
            case "autolayout-rows":
                if (window.builderAutoLayout) builderAutoLayout.setMode("rows");
                break;
            case "import-structure":
            case "import-structure-core":
                if (window.builderImport) builderImport.runForSelection("core");
                break;
            case "import-structure-ess":
                if (window.builderImport) builderImport.runForSelection("ess");
                break;
            case "autolayout-off":
                if (window.builderAutoLayout) builderAutoLayout.setMode("off");
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
            '    <div style="margin-bottom:8px; font-size:12px;">Chọn container muốn chứa GridView "' + this.escapeHtml(cfg.title || cfg.caption || cfg.id) + '"</div>' +
            '    <select class="ub-input-container" style="width:100%; padding:4px 6px; margin-bottom:8px; box-sizing:border-box;">' +
            '    </select>' +
            '  </div>' +
            '  <div class="ub-modal-footer">' +
            '    <button type="button" class="ub-btn ub-btn-secondary ub-btn-cancel">Hủy</button>' +
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
                $popupGroup.append($("<option></option>").val("popup:" + p.id).text(text));
            });
        }

        // Thêm option cho ESS Collapsible Section
        if (sections.length) {
            $select.append('<optgroup label="ESS Collapsible Section"></optgroup>');
            var $secGroup = $select.find('optgroup[label="ESS Collapsible Section"]');
            sections.forEach(function (s) {
                var text = s.caption || s.title || ("Section " + s.id);
                $secGroup.append($("<option></option>").val("section:" + s.id).text(text));
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

        var $content = this.containerContent(containerId);
        var $grid = this.controlElement(cfg);
        if (!$content.length || !$grid.length) {
            this.showToast("Container không hợp lệ.", "error");
            return;
        }

        this.setControlParent(cfg, containerId);
        var scale = this.cssScale();
        var area = this.controlElement(targetCfg)[0].getBoundingClientRect();
        cfg.left = Math.max(0, Math.min(cfg.left, Math.round(area.width / scale) - 100));
        cfg.top = Math.max(0, Math.min(cfg.top, Math.round(area.height / scale) - 100));
        $grid.css({ left: cfg.left + "px", top: cfg.top + "px" });
        this.updateTabMembership(cfg);

        this.selectedControlId = cfg.id;
        this.selectedControlType = cfg.type;
        this.refreshJson();
        this.showToast(targetCfg.type === "popup"
            ? "Đã di chuyển GridView vào popup: " + (targetCfg.headerText || targetCfg.titleText || "Popup")
            : "Đã đưa GridView vào ESS Collapsible Section: " + (targetCfg.caption || targetCfg.title || targetCfg.id), "success");
    },

    // ========= Bottom toolbar giống thanh Figma =========
    initCanvasToolbar: function () {
        var $bar = $("#canvasToolbar");
        if (!$bar.length) return;

        var self = this;

        var shell = document.querySelector(".canvas-shell");
        if (shell) {
            var placeBar = function () {
                var r = shell.getBoundingClientRect();
                if (r.width < 40) return;
                $bar.css({ left: Math.round(r.left + r.width / 2) + "px", "max-width": Math.max(180, Math.round(r.width - 12)) + "px" });
            };
            placeBar();
            if (window.ResizeObserver) new ResizeObserver(placeBar).observe(shell);
            $(window).on("resize.canvasToolbar", placeBar);
        }

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
                case "zoom-fit":
                    self.fitZoom(false);
                    break;
                case "toggle-panels":
                    self.togglePanels();
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
                if (v === "fit" || v === "fit-width") {
                    self.fitZoom(v === "fit-width");
                    return;
                }

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
        if (window.ResizeObserver) new ResizeObserver(updateRulersDebounced).observe($canvasShell[0]);
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

        var msgText = "Xóa " + allIds.length + " control đang chọn và mọi control nằm bên trong?";

        builder.showConfirm({
            title: "Xóa control",
            message: msgText,
            okText: "Xóa",
            cancelText: "Hủy",
            onOk: function () {
                self.asOneStep(function () {
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
                    self.clearSelection();
                    self.refreshJson();
                });
            }
        });
    },


    // ✅ Duplicate selected control
    duplicateSelection: function () {
        if (!this.selectedControlId) {
            this.showToast("Chưa chọn control nào để nhân bản.", "warning");
            return;
        }

        var cfg = this.getControlConfig(this.selectedControlId);
        if (!cfg) {
            this.showToast("Không tìm thấy control để nhân bản.", "error");
            return;
        }

        if (window.builderSnippet) {
            var ids = builderSnippet.getSelectionIds();
            if (ids.indexOf(cfg.id) < 0) ids = [cfg.id];
            var items = builderSnippet.collectSubtree(ids);
            builderSnippet.instantiate(items, { keepParent: true, dx: 20, dy: 20 });
            this.showToast(items.length > 1 ? "Đã nhân bản " + items.length + " control (gồm control con)." : "Đã nhân bản control.", "success");
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

        // Add to controls array
        this.controls.push(newCfg);

        // Render the duplicated control
        newCfg._fromRestore = true;
        this.renderControlByConfig(newCfg);
        delete newCfg._fromRestore;

        // Select the new control
        this.selectedControlId = newId;
        this.selectedControlType = newCfg.type;

        // Update UI
        this.refreshJson();
        this.showToast("Đã nhân bản control.", "success");
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
        builderProps.showEmpty();

        // Không còn selectedControlId nên highlightOutlineSelection sẽ không tô gì nữa
        this.highlightOutlineSelection();
        this.hideSizeHint();
    },

    // Class chỉ có lúc đang sửa trên canvas (control đang chọn, Splitter đang có con trỏ ở trên); bản sao dùng để xem trước, xuất ảnh
    // và lưu ảnh xem trước bỏ chúng đi.
    editingClasses: "canvas-control-selected page-field-selected popup-field-selected popup-selected core-splitter-hover",

    clearEditingState: function ($root) {
        $root.find("." + this.editingClasses.split(" ").join(", .")).removeClass(this.editingClasses);
    },



    // đồng bộ controls[] theo DOM (fix bug outline không cập nhật khi xoá field)
    syncControlsWithDom: function () {
        var self = this;
        this.controls = (this.controls || []).filter(function (c) {
            return self.controlElement(c).length > 0;
        });
    },

    // ========= Save dialog / Confirm / Toast (giữ nguyên logic cũ) =========

    showSaveDialog: function (options) {
        var title = options.title || "Lưu";
        var nameLabel = options.nameLabel || "Tên";
        var defaultName = options.defaultName || "";
        var defaultIsPublic = (options.defaultIsPublic !== false); // mặc định true
        var defaultProjectId = options.defaultProjectId || null;
        var onOk = options.onOk || function () { };
        var self = this;

        var $overlay = $('<div class="ub-modal-backdrop"></div>');
        var html =
            '<div class="ub-modal" style="min-width: 420px;">' +
            '  <div class="ub-modal-header"></div>' +
            '  <div class="ub-modal-body">' +
            '    <label class="ub-label-name"></label>' +
            '    <input type="text" class="ub-input-name" maxlength="200" />' +
            '    <label style="margin-top:8px;">Dự án:</label>' +
            '    <select class="ub-input-project" style="width:100%; padding:4px 6px; box-sizing:border-box;">' +
            '      <option value="">Đang tải...</option>' +
            '    </select>' +
            '    <div style="margin-top:8px;">' +
            '      <label><input type="checkbox" class="ub-input-public" /> Chia sẻ cho các BA khác cùng xem</label>' +
            '    </div>' +
            '    <div class="ub-modal-error" style="display:none;"></div>' +
            '  </div>' +
            '  <div class="ub-modal-footer">' +
            '    <button type="button" class="ub-btn ub-btn-secondary ub-btn-cancel">Hủy</button>' +
            '    <button type="button" class="ub-btn ub-btn-primary ub-btn-ok">Lưu</button>' +
            '  </div>' +
            '</div>';

        var $dlg = $(html);
        $dlg.find(".ub-modal-header").text(title);
        $dlg.find(".ub-label-name").text(nameLabel + ":");
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
                $projectSelect.append('<option value="">-- Chưa chọn dự án --</option>');
                projects.forEach(function (p) {
                    $("<option>").val(p.projectId).text(p.name)
                        .prop("selected", !!defaultProjectId && p.projectId === defaultProjectId)
                        .appendTo($projectSelect);
                });
            },
            error: function () {
                $projectSelect.html('<option value="">Không tải được danh sách dự án</option>');
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
                showError("Hãy nhập tên.");
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
        var title = options.title || "Xác nhận";
        var message = options.message || "Bạn có chắc không?";
        var okText = options.okText || "Đồng ý";
        var cancelText = options.cancelText || "Hủy";
        var onOk = options.onOk || function () { };
        var onCancel = options.onCancel || function () { };

        var $overlay = $('<div class="ub-modal-backdrop"></div>');
        var html =
            '<div class="ub-modal ub-modal-confirm">' +
            '  <div class="ub-modal-header"></div>' +
            '  <div class="ub-modal-body">' +
            '    <div class="ub-modal-message"></div>' +
            '  </div>' +
            '  <div class="ub-modal-footer">' +
            '    <button type="button" class="ub-btn ub-btn-secondary ub-btn-cancel"></button>' +
            '    <button type="button" class="ub-btn ub-btn-primary ub-btn-ok"></button>' +
            '  </div>' +
            '</div>';

        var $dlg = $(html);
        $dlg.find(".ub-modal-header").text(title);
        $dlg.find(".ub-modal-message").text(message);
        $dlg.find(".ub-btn-cancel").text(cancelText);
        $dlg.find(".ub-btn-ok").text(okText);
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
            title: "Lưu control",
            nameLabel: "Tên control",
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

                controlAnnotation.captureWithHighlights(canvasEl, {
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
                            var saved = res.d || {};
                            if (!saved.success) {
                                builder.showToast("Lỗi khi lưu control: " + saved.message, "error");
                                return;
                            }
                            cfg.controlDbId = saved.controlId;
                            builder.showToast("Đã lưu control (ID = " + saved.controlId + ")", "success");
                        },
                        error: function (xhr) {
                            builder.showToast("Lỗi khi lưu control: " + builder.ajaxErrorText(xhr), "error");
                        }
                    });
                });
            }
        });
    },

    canOverwriteDesign: function () {
        var info = this.currentDesignInfo;
        return !!(info && info.ControlType === "page" && info.IsOwner && !info.IsClone && parseInt(info.ControlId, 10) > 0);
    },

    isDirty: function () {
        return JSON.stringify(this.controls || []) !== this.savedSnapshot;
    },

    markSaved: function (snapshot, savedNow) {
        this.savedSnapshot = snapshot != null ? snapshot : JSON.stringify(this.controls || []);
        this.savedAt = savedNow ? new Date() : null;
        this.updateSaveState();
    },

    updateSaveState: function (snapshot) {
        var $state = $("#lblSaveState");
        if (!$state.length) return;
        var current = snapshot != null ? snapshot : JSON.stringify(this.controls || []);
        var dirty = current !== this.savedSnapshot;
        var text, cls;
        if (this.isSaving) {
            text = "Đang lưu...";
            cls = "is-saving";
        } else if (dirty) {
            text = "Chưa lưu";
            cls = "is-dirty";
        } else if (this.savedAt) {
            var hours = this.savedAt.getHours(), minutes = this.savedAt.getMinutes();
            text = "Đã lưu lúc " + (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
            cls = "is-saved";
        } else if (this.canOverwriteDesign()) {
            text = "Đã lưu";
            cls = "is-saved";
        } else {
            text = "";
            cls = "";
        }
        $state.text(text).attr("class", "bh-save-state" + (cls ? " " + cls : "")).toggle(!!text);
        $("#btnSaveDesign").prop("disabled", this.isSaving);
    },

    ajaxErrorText: function (xhr) {
        var message = "";
        try { message = (JSON.parse(xhr.responseText) || {}).Message || ""; } catch (e) { message = ""; }
        if (!message && xhr && xhr.status === 401) message = "Phiên đăng nhập đã hết. Hãy đăng nhập lại ở tab khác rồi bấm Lưu lần nữa.";
        return message || "Máy chủ không phản hồi (mã " + (xhr && xhr.status ? xhr.status : 0) + ").";
    },

    savePageToServer: function (options) {
        options = options || {};
        if (this.isSaving) return;

        var self = this;
        var info = this.currentDesignInfo || {};
        var own = this.canOverwriteDesign();
        var overwrite = own && !options.saveAs;

        if (overwrite && !options.editInfo) {
            this.persistPage({
                controlId: parseInt(info.ControlId, 10),
                name: info.Name,
                isPublic: info.IsPublic !== false,
                projectId: info.ProjectId || null
            });
            return;
        }

        var defaultName = info.ControlType === "page" && info.Name ? info.Name : "Thiết kế mới";
        if (own && options.saveAs) defaultName += " (bản sao)";
        else if (info.IsClone) defaultName += " Clone";

        this.showSaveDialog({
            title: overwrite ? "Tên, dự án và chia sẻ" : (own ? "Lưu thành bản mới" : "Lưu thiết kế"),
            nameLabel: "Tên thiết kế",
            defaultName: defaultName,
            defaultIsPublic: own ? info.IsPublic !== false : false,
            defaultProjectId: own ? (info.ProjectId || null) : null,
            onOk: function (result) {
                self.persistPage({
                    controlId: overwrite ? parseInt(info.ControlId, 10) : null,
                    name: result.name,
                    isPublic: result.isPublic,
                    projectId: result.projectId || null
                });
            }
        });
    },

    persistPage: function (design) {
        var self = this;
        var canvasEl = document.getElementById("canvas");
        if (!canvasEl) {
            this.showToast("Không tìm thấy vùng thiết kế để chụp hình.", "error");
            return;
        }

        var json = JSON.stringify(this.controls || []);
        var thumbnailArea = this.thumbnailArea(canvasEl);
        this.isSaving = true;
        this.updateSaveState(json);

        function failed(message) {
            self.isSaving = false;
            self.updateSaveState();
            self.showToast("Chưa lưu được thiết kế. " + message, "error");
        }

        controlAnnotation.captureWithHighlights(canvasEl, {
            scale: 2,
            backgroundColor: "#ffffff",
            onclone: function (doc) {
                self.clearEditingState($(doc));
                $(doc).find(".ub-diff-ghost").remove();
                $(doc).find(".ub-diff-added, .ub-diff-changed, .ub-diff-moved").removeClass("ub-diff-added ub-diff-changed ub-diff-moved");
            }
        }).then(function (canvas) {
            $.ajax({
                url: builderServiceUrl + "/SaveDesign",
                method: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({
                    controlId: design.controlId,
                    pageName: design.name,
                    controlName: design.name,
                    controlType: "page",
                    jsonConfig: json,
                    isPublic: design.isPublic,
                    thumbnailData: self.designThumbnail(canvas, thumbnailArea, 2),
                    projectId: design.projectId
                }),
                success: function (res) {
                    var saved = res.d || {};
                    if (!saved.success) {
                        failed(saved.message);
                        return;
                    }
                    var newId = saved.controlId;
                    self.isSaving = false;
                    $("#hiddenControlId").val(newId);
                    $("#hiddenIsClone").val("0");
                    self.setCurrentDesignInfo({
                        ControlId: newId,
                        Name: design.name,
                        ControlType: "page",
                        IsOwner: true,
                        IsPublic: design.isPublic,
                        ProjectId: design.projectId
                    }, false);
                    self.markSaved(json, true);
                    if (window.history && history.replaceState) {
                        history.replaceState(null, "", builderEditBaseUrl + "?controlId=" + newId);
                    }
                    self.showToast("Đã lưu thiết kế '" + design.name + "'.", "success");
                },
                error: function (xhr) {
                    failed(self.ajaxErrorText(xhr));
                }
            });
        }, function () {
            failed("Không chụp được hình thu nhỏ của thiết kế.");
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
                    return x.ControlType !== "page" && x.ControlType !== "component";
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
                                alert("Lỗi xoá template: " + builder.ajaxErrorText(xhr));
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

                // Component nhiều control (do builder-snippet.js lưu) → chèn cả cây
                if (cfg && cfg.kind === "component" && window.builderSnippet) {
                    builderSnippet.instantiate(cfg.items || [], {});
                    return;
                }

                cfg = builder.sanitizeControls([$.extend(true, {}, cfg)])[0];
                if (!cfg) { alert("Không đọc được control này"); return; }
                cfg.controlDbId = null;
                cfg.id = (cfg.type || "ctrl") + "_" + Date.now();

                builder.renderControlByConfig(cfg);
                builder.registerControl(cfg);
            },
            error: function (xhr) {
                alert("Lỗi load template: " + builder.ajaxErrorText(xhr));
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

                    var arr = builder.sanitizeControls(Array.isArray(cfg) ? cfg : []);
                    builder.controls = [];
                    $("#canvas-zoom-inner").empty();
                    builderProps.showEmpty();

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
                    cfg = builder.sanitizeControls([cfg])[0];
                    if (!cfg) { alert("Không đọc được control này"); return; }
                    builder.setCurrentDesignInfo(dto, false);

                    cfg.controlDbId = dto.ControlId;
                    cfg.controlName = dto.Name;

                    builder.renderControlByConfig(cfg);

                    builder.controls = [cfg];
                    builder.refreshJson();
                }
                builder.resetHistory();
                builder.markSaved();
                if (dto.ControlType === "page") builder.fitOnOpen();
            },
            error: function (xhr) {
                alert("Lỗi load control: " + builder.ajaxErrorText(xhr));
            }
        });
    },

    addControl: function (type, uiMode, dropPoint) {
        if (type && type.indexOf("screen:") === 0) {
            if (window.builderTemplates && typeof builderTemplates.insertAt === "function") builderTemplates.insertAt(type.substring(7), dropPoint);
            return;
        }
        uiMode = uiMode || "core";
        this.clearSelection();

        var self = this;
        var existing = {};
        (this.controls || []).forEach(function (c) { existing[c.id] = true; });
        this._coalesceHistory = true;
        this._coalescePushed = false;

        try {
            if (type === "grid") {
                controlGrid.addNew(dropPoint);

            } else if (type === "ess-grid") {
                if (window.controlGridEss && typeof controlGridEss.addNew === "function") {
                    controlGridEss.addNew(uiMode, dropPoint);
                }

            } else if (type === "popup") {
                controlPopup.addNew(dropPoint);

            } else if (type && type.indexOf("field-") === 0) {
                var ftype = type.substring("field-".length);
                if (window.controlField && typeof controlField.addNew === "function") {
                    controlField.addNew(ftype, uiMode, dropPoint);
                }

            } else if (type === "toolbar") {
                controlToolbar.addNew(dropPoint);
            } else if (type === "tabpage") {
                controlTabPage.addNew(dropPoint);
            } else if (type === "collapsible-section") {
                if (window.controlCollapsibleSection && typeof controlCollapsibleSection.addNew === "function") {
                    controlCollapsibleSection.addNew(dropPoint);
                }
            } else if (type && type.indexOf("annot-") === 0) {
                if (window.controlAnnotation) controlAnnotation.addNew(type.substring("annot-".length), dropPoint);
            }

            var point = dropPoint && dropPoint.clientX != null ? { x: dropPoint.clientX, y: dropPoint.clientY } : null;
            var fresh = (this.controls || []).filter(function (c) { return !existing[c.id]; });
            fresh.forEach(function (added) {
                if (added.type === "field" && window.controlField && typeof controlField.updateParent === "function") controlField.updateParent(added, point);
                else if (added.type === "tabpage") self.placeInContainer(added, point);
                else self.dropControl(added, point);
            });
            fresh.forEach(function (added) { controlSplitter.land(added, true); });

            this.refreshJson();
            if (point && fresh.length) {
                this.revealControl(fresh[0]);
                window.setTimeout(function () {
                    if (!document.body.classList.contains("ub-gesture") && self.getControlConfig(fresh[0].id)) self.revealControl(fresh[0]);
                }, 350);
            }
        } finally {
            this._coalesceHistory = false;
            this._coalescePushed = false;
        }
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
        this.updateSaveState();
        this.updateHistoryButtons();
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
                arr = self.sanitizeControls(arr);
                self.controls = [];
                $("#canvas-zoom-inner").empty();
                builderProps.showEmpty();

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
                self.resetHistory();
                self.markSaved();
            }
        });
    },

    downloadJson: function () {
        var json = JSON.stringify(this.controls || [], null, 4);
        var blob = new Blob([json], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "generated-config.json";
        a.click();
    },

    // ✅ Xuất hình ảnh (dùng html2canvas) - Clone canvas giống preview để capture đầy đủ
    // ✅ Xuất ảnh từ preview canvas đang hiển thị
    exportFileName: function (suffix, extension) {
        var name = $.trim((this.currentDesignInfo || {}).Name || "");
        name = name.replace(/[\\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").replace(/^[ .]+|[ .]+$/g, "").slice(0, 80);
        return (name || "ui-design") + (suffix ? " - " + suffix : "") + "." + (extension || "png");
    },

    cropCanvas: function (canvas, crop, scale) {
        var pad = 8;
        var x = Math.max(0, Math.floor((crop.left - pad) * scale));
        var y = Math.max(0, Math.floor((crop.top - pad) * scale));
        var w = Math.max(1, Math.min(canvas.width - x, Math.ceil((crop.right - crop.left + pad * 2) * scale)));
        var h = Math.max(1, Math.min(canvas.height - y, Math.ceil((crop.bottom - crop.top + pad * 2) * scale)));
        var out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        out.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
        return out;
    },

    thumbnailLimits: { width: 1600, height: 3200, ratio: 16 / 9 },

    thumbnailArea: function (canvasEl) {
        var inner = document.getElementById("canvas-zoom-inner");
        var bounds = this.contentBounds();
        if (!inner || !bounds) return null;
        var scale = this.viewScale > 0 ? this.viewScale : 1;
        var base = canvasEl.getBoundingClientRect();
        var origin = inner.getBoundingClientRect();
        var left = origin.left - base.left + bounds.left * scale;
        var top = origin.top - base.top + bounds.top * scale;
        return { left: left, top: top, right: left + (bounds.right - bounds.left) * scale, bottom: top + (bounds.bottom - bounds.top) * scale };
    },

    designThumbnail: function (capture, area, scale) {
        if (!area) return null;
        var limits = this.thumbnailLimits;
        var content = this.cropCanvas(capture, area, scale);
        var frameHeight = Math.max(content.height, Math.round(content.width / limits.ratio));
        var shrink = Math.min(1, limits.width / content.width, limits.height / frameHeight);
        var out = document.createElement("canvas");
        out.width = Math.max(1, Math.round(content.width * shrink));
        out.height = Math.max(1, Math.round(frameHeight * shrink));
        var context = out.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, out.width, out.height);
        context.imageSmoothingQuality = "high";
        context.drawImage(content, 0, 0, Math.round(content.width * shrink), Math.round(content.height * shrink));
        return out.toDataURL("image/png");
    },

    downloadBlob: function (blob, fileName) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    },

    beginImageCopy: function () {
        var copy = { resolve: null, reject: null, started: null };
        if (!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write)) return copy;
        try {
            var pending = new Promise(function (resolve, reject) { copy.resolve = resolve; copy.reject = reject; });
            copy.started = navigator.clipboard.write([new ClipboardItem({ "image/png": pending })]);
            copy.started.catch(function () { });
        } catch (e) {
            copy.started = null;
        }
        return copy;
    },

    finishImageCopy: function (copy, blob, fileName) {
        var self = this;
        function fallback() {
            self.downloadBlob(blob, fileName);
            self.showToast("Trình duyệt không cho chép ảnh vào clipboard ở địa chỉ này. Ảnh đã được tải về: " + fileName, "warning");
        }
        function copied() {
            self.showToast("Đã chép ảnh vào clipboard. Bấm Ctrl+V để dán vào Word, email hoặc khung chat.", "success");
        }
        if (copy && copy.started) {
            copy.started.then(copied, fallback);
            copy.resolve(blob);
            return;
        }
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(copied, fallback);
            return;
        }
        fallback();
    },

    exportImageFromPreview: function($previewCanvas, options) {
        var self = this;
        options = options || {};
        var finish = function () { if (typeof options.done === "function") options.done(); };

        if (!$previewCanvas || !$previewCanvas.length) {
            this.showToast("Không tìm thấy preview canvas để xuất hình ảnh", "error");
            if (options.copy && options.copy.reject) options.copy.reject(new Error("no preview"));
            finish();
            return;
        }

        this.showToast(options.copy ? "Đang tạo ảnh để chép..." : "Đang xuất hình ảnh...", "info");
        
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
                        previewTagEl.innerHTML = '<span class="ess-tag-icon" style="margin-right:4px; display:inline-block; vertical-align:middle;"><i class="bi bi-tag-fill"></i></span><span class="ess-tag-text" style="display:inline-block; vertical-align:middle;">' + self.escapeHtml(originalText) + '</span>';
                        
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
                controlAnnotation.captureWithHighlights($previewCanvas[0], {
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
                                var comboHeight = Math.max(26, parseInt(clonedCombo.style.height, 10) || 26);
                                var comboPad = Math.max(2, Math.round((comboHeight - 22) / 2));
                                clonedCombo.style.setProperty("padding-top", comboPad + "px", "important");
                                clonedCombo.style.setProperty("padding-bottom", comboPad + "px", "important");
                                clonedCombo.style.setProperty("line-height", "22px", "important");
                                clonedCombo.style.setProperty("height", comboHeight + "px", "important");
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
                    var output = options.crop ? self.cropCanvas(canvas, options.crop, 2) : canvas;
                    var fileName = self.exportFileName(options.crop ? "vùng chọn" : "");
                    output.toBlob(function (blob) {
                        if (options.copy) {
                            self.finishImageCopy(options.copy, blob, fileName);
                        } else {
                            self.downloadBlob(blob, fileName);
                            self.showToast("Đã tải ảnh '" + fileName + "'.", "success");
                        }
                        finish();
                    }, "image/png");
                }).catch(function (error) {
                    console.error("Export image error:", error);
                    if (options.copy && options.copy.reject) options.copy.reject(error);
                    self.showToast("Lỗi khi xuất hình ảnh: " + error.message, "error");
                    finish();
                });
            }, 100); // Đợi thêm 100ms để đảm bảo DOM đã render xong
        }, 300); // Đợi 300ms ban đầu
    },

    previewControlSelector: ".popup-design, .canvas-control, .page-field, .popup-field, .canvas-toolbar, .canvas-tabpage, .ess-grid-control",

    isNestedControl: function ($el) {
        return $el.parent().closest(this.previewControlSelector).length > 0;
    },

    shiftTopLevelControls: function ($root, dx, dy) {
        var self = this;
        if (!dx && !dy) return;
        $root.find(this.previewControlSelector).each(function () {
            var $el = $(this);
            if (self.isNestedControl($el)) return;
            var left = parseFloat($el.css("left"));
            var top = parseFloat($el.css("top"));
            $el.css({ left: ((isNaN(left) ? 0 : left) + dx) + "px", top: ((isNaN(top) ? 0 : top) + dy) + "px" });
        });
    },

    exportImage: function (options) {
        var self = this;
        var $canvas = $("#canvas");
        options = options || {};

        if (!$canvas.length) {
            this.showToast("Không tìm thấy canvas để xuất hình ảnh", "error");
            return;
        }

        var picked = [];
        if (options.selection) {
            this.getAllSelectedControlIds().forEach(function (id) {
                var $el = self.controlElement(self.getControlConfig(id));
                if ($el.length && $el.is(":visible")) picked.push($el[0]);
            });
            if (!picked.length) {
                this.showToast("Hãy chọn control hoặc quét một vùng trước, rồi mới xuất ảnh vùng đang chọn.", "warning");
                return;
            }
        }
        var copy = options.copy ? this.beginImageCopy() : null;

        // ✅ Xuất trực tiếp từ canvas mà không cần mở preview
        // Tạo preview canvas ẩn và xuất trực tiếp
        var minLeft = Infinity;
        var minTop = Infinity;
        var maxRight = -Infinity;
        var maxBottom = -Infinity;
        
        var allControls = $canvas.find(".popup-design, .canvas-control, .page-field, .popup-field, .canvas-toolbar, .canvas-tabpage, .ess-grid-control");
        
        allControls.each(function() {
            var $el = $(this);
            if (self.isNestedControl($el)) return;
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

        picked.forEach(function (el) { el.setAttribute("data-export-pick", "1"); });
        var $canvasClone = $canvas.clone(false);
        picked.forEach(function (el) { el.removeAttribute("data-export-pick"); });
        $canvasClone.find("#canvas-zoom-inner").css("zoom", 1);

        $canvasClone.css({
            position: "relative",
            left: "0",
            top: "0",
            margin: "0",
            padding: "0",
            overflow: "visible"
        });

        this.clearEditingState($canvasClone);
        $canvasClone.find("*").each(function() {
            var $el = $(this);
            $el.removeAttr("data-interact-id");
            $el.find(".group-badge").remove();
            if ($el.hasClass("canvas-control") || $el.hasClass("popup-design") || $el.hasClass("page-field") || $el.hasClass("popup-field")) {
                $el.css("pointer-events", "none");
            }
        });

        $canvasClone.off();
        $canvasClone.find("*").off();

        self.shiftTopLevelControls($canvasClone, offsetX, offsetY);

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
                var crop = null;
                if (options.selection) {
                    var base = $previewCanvas[0].getBoundingClientRect();
                    $previewCanvas.find("[data-export-pick]").each(function () {
                        var r = this.getBoundingClientRect();
                        if (!r.width || !r.height) return;
                        var box = { left: r.left - base.left, top: r.top - base.top, right: r.right - base.left, bottom: r.bottom - base.top };
                        if (!crop) { crop = box; return; }
                        crop.left = Math.min(crop.left, box.left);
                        crop.top = Math.min(crop.top, box.top);
                        crop.right = Math.max(crop.right, box.right);
                        crop.bottom = Math.max(crop.bottom, box.bottom);
                    });
                }
                self.exportImageFromPreview($previewCanvas, {
                    crop: crop,
                    copy: copy,
                    done: function () { $previewCanvas.remove(); }
                });
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
        $header.append('<h3 style="margin: 0; font-size: 18px; font-weight: 600;">👁️ Xem trước thiết kế</h3>');
        
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
            if (self.isNestedControl($el)) return;
            
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
        this.clearEditingState($canvasClone);
        $canvasClone.find("*").each(function() {
            var $el = $(this);
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
        
        self.shiftTopLevelControls($canvasClone, offsetX, offsetY);

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
            if (self.isNestedControl($el)) return;
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
            
            self.shiftTopLevelControls($canvasClone, extraPaddingLeft, extraPaddingTop);

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
            delete this.currentDesignInfo.JsonConfig;
        }

        var modeText, nameText;

        if (!dto) {
            modeText = "Thiết kế mới";
            nameText = "Chưa đặt tên";
        } else if (!(parseInt(dto.ControlId, 10) > 0)) {
            modeText = "Thiết kế mới";
            nameText = dto.Name || "Chưa đặt tên";
        } else {
            modeText = (isClone ? "Bản sao từ thiết kế được chia sẻ"
                : (dto.IsOwner ? (dto.ControlType === "page" ? "Thiết kế của tôi" : "Control mẫu của tôi") : "Thiết kế của người khác, lưu sẽ tạo bản của bạn"))
                + " · ID " + dto.ControlId;
            nameText = dto.Name;
        }

        $("#lblDesignMode").text(modeText);
        $("#lblDesignName").text(nameText).attr("title", nameText);
        document.title = (dto && dto.Name ? dto.Name + " - " : "") + "UI Builder";
        this.updateSaveState();
    },

    resetHistory: function () {
        this._historyImages = null;
        this.history = [this.packHistory(JSON.stringify(this.controls || []))];
        this.historyIndex = 0;
        this._coalescePushed = false;
        this.updateHistoryButtons();
    },

    updateHistoryButtons: function () {
        $("#btnUndo").prop("disabled", this.historyIndex <= 0);
        $("#btnRedo").prop("disabled", this.historyIndex >= this.history.length - 1);
    },

    asOneStep: function (work) {
        this._coalesceHistory = true;
        this._coalescePushed = false;
        try {
            work();
        } finally {
            this._coalesceHistory = false;
            this._coalescePushed = false;
        }
    },

    removeControl: function (controlId) {
        if (!controlId) return;

        var cfg = this.findControl(controlId);
        if (!cfg) return;

        var self = this;

        if (cfg.type === "annotation") {
            this.controls = (this.controls || []).filter(function (c) { return c.id !== controlId; });
            $("#canvas .ba-annot").filter(function () { return this.getAttribute("data-id") === controlId; }).remove();
            this.selectedControlId = null;
            this.selectedControlType = null;
            builderProps.showEmpty();
            this.hideSizeHint();
            this.refreshJson();
            return;
        }

        if (cfg.type === "field") {
            builder.showConfirm({
                title: "Xóa control",
                message: "Xóa control này và mọi control nằm bên trong (nếu có)?",
                okText: "Xóa",
                cancelText: "Hủy",
                onOk: function () {
                    self.asOneStep(function () {
                        if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                            controlField.deleteWithChildren(controlId);
                        }

                        self.syncControlsWithDom();
                        self.selectedControlId = null;
                        self.selectedControlType = null;
                        builderProps.showEmpty();
                        self.hideSizeHint();
                        self.refreshJson();
                    });
                }
            });
            return;
        }

        if (cfg.type === "tabpage") {
            builder.showConfirm({
                title: "Xóa tab",
                message: "Xóa tab page này và mọi control nằm bên trong?",
                okText: "Xóa",
                cancelText: "Hủy",
                onOk: function () {
                    self.asOneStep(function () {
                        if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                            controlField.deleteWithChildren(controlId);
                        }

                        self.controls = (self.controls || []).filter(function (c) { return c.id !== controlId; });
                        $('[data-id="' + controlId + '"], #' + controlId).remove();

                        self.syncControlsWithDom();

                        self.selectedControlId = null;
                        self.selectedControlType = null;
                        builderProps.showEmpty();
                        self.hideSizeHint();
                        self.refreshJson();
                    });
                }
            });
            return;
        }

        if (cfg.type === "popup") {
            builder.showConfirm({
                title: "Xóa popup",
                message: "Xóa popup này và mọi control nằm bên trong?",
                okText: "Xóa",
                cancelText: "Hủy",
                onOk: function () {
                    self.asOneStep(function () {
                        if (window.controlField && typeof controlField.deleteWithChildren === "function") {
                            controlField.deleteWithChildren(controlId);
                        }

                        self.controls = (self.controls || []).filter(function (c) { return c.id !== controlId; });
                        $('[data-id="' + controlId + '"], #' + controlId).remove();

                        self.syncControlsWithDom();

                        self.selectedControlId = null;
                        self.selectedControlType = null;
                        builderProps.showEmpty();
                        self.hideSizeHint();
                        self.refreshJson();
                    });
                }
            });
            return;
        }

        var msg = "Xóa " + this.getOutlineLabel(cfg) + "?";

        builder.showConfirm({
            title: "Xóa control",
            message: msg,
            okText: "Xóa",
            cancelText: "Hủy",
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
