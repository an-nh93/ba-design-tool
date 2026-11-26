/* ============================================================================
 * builder-snippet.js
 * Tái sử dụng thiết kế trong UI Builder (chạy hoàn toàn offline, không cần API ngoài):
 *   1. Component nhiều control: lưu cây control (cha + con) và chèn lại với id mới.
 *   2. Chèn nguyên trang đã lưu vào canvas hiện tại, hoặc Fork (mở bản sao).
 *   3. Copy / Paste có kèm control con, dán được giữa các tab / design (localStorage).
 *
 * Nạp SAU builder.js và các control-*.js. Ghi đè copySelectionControls,
 * pasteSelectionControls, clearAppClipboard của builder.
 *
 * Quy ước dữ liệu: left/top của control luôn relative với cha trực tiếp
 * (xem Docs/Project/01-UI-Builder.md). Vì vậy khi chèn cả cây, chỉ cần dời
 * tọa độ của control GỐC, control con giữ nguyên.
 * ==========================================================================*/
(function (window, $) {
    "use strict";

    var CLIPBOARD_KEY = "badesign.builder.clipboard.v1";
    var CLIPBOARD_MAX_AGE_MS = 5 * 60 * 1000;
    var REF_KEYS_ID = ["parentId", "tabPageId"];   // trỏ tới id control
    var CANVAS_MIN = 20;                           // mép thước

    var snippet = {};

    // ---------------------------------------------------------------- helpers
    function ctrls() { return window.builder.controls || []; }

    function toast(msg, type) {
        if (window.builder && builder.showToast) builder.showToast(msg, type || "info");
    }

    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    function stripTransient(cfg) {
        Object.keys(cfg).forEach(function (k) {
            if (k.charAt(0) === "_") delete cfg[k];   // _fromRestore, _parentRelative...
        });
        delete cfg.controlDbId;
        return cfg;
    }

    function existingIdSet() {
        var s = {};
        ctrls().forEach(function (c) { s[c.id] = true; });
        return s;
    }

    function makeId(cfg, used) {
        var prefix = cfg.type === "field" ? "fld_" + (cfg.ftype || "field") : (cfg.type || "ctrl");
        var id;
        do {
            id = prefix + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
        } while (used[id]);
        used[id] = true;
        return id;
    }

    // Sắp xếp cha trước con (cùng logic loadControlFromServer / restore)
    function orderParentFirst(items) {
        var ordered = [], remaining = items.slice(), guard = 1000;
        var placed = {};
        while (remaining.length && guard-- > 0) {
            var pick = remaining.filter(function (c) { return !c.parentId || placed[c.parentId]; });
            if (!pick.length) break;
            pick.forEach(function (c) { placed[c.id] = true; });
            ordered = ordered.concat(pick);
            remaining = remaining.filter(function (c) { return pick.indexOf(c) === -1; });
        }
        return ordered.concat(remaining);
    }

    // ------------------------------------------------------------ selection
    snippet.getSelectionIds = function () {
        var ids = [];
        function add(id) { if (id && ids.indexOf(id) < 0 && builder.getControlConfig(id)) ids.push(id); }
        $("#canvas .canvas-control-selected, #canvas .page-field-selected, #canvas .popup-field-selected, #canvas .popup-selected")
            .each(function () { add($(this).attr("data-id") || this.id); });
        if (!ids.length) add(builder.selectedControlId);
        return ids;
    };

    // Lấy các id được chọn + toàn bộ hậu duệ (theo parentId). Trả về bản sao config.
    snippet.collectSubtree = function (ids) {
        var all = ctrls();
        var set = {};
        ids.forEach(function (id) { set[id] = true; });
        var changed = true;
        while (changed) {
            changed = false;
            all.forEach(function (c) {
                if (!set[c.id] && ((c.parentId && set[c.parentId]) || (c.tabPageId && set[c.tabPageId]))) { set[c.id] = true; changed = true; }
            });
        }
        return all.filter(function (c) { return set[c.id]; }).map(function (c) { return stripTransient(clone(c)); });
    };

    // ---------------------------------------------------------- instantiate
    /**
     * Dựng lại một cây control lên canvas với id mới.
     * opts:
     *   keepParent  true: gốc nào có cha còn tồn tại trên canvas thì giữ cha, dời (dx, dy)
     *   dx, dy      độ lệch khi keepParent (mặc định 20)
     *   left, top   vị trí đặt cho cụm gốc trên canvas (mặc định: góc nhìn hiện tại)
     *   placement   "below": đặt dưới nội dung hiện có (dùng khi chèn cả trang)
     * Trả về mảng id gốc mới.
     */
    snippet.instantiate = function (items, opts) {
        opts = opts || {};
        if (!items || !items.length) return [];

        items = builder.sanitizeControls(items.map(function (c) { return stripTransient(clone(c)); }));
        if (!items.length) return [];
        var inSet = {};
        items.forEach(function (c) { inSet[c.id] = true; });

        var used = existingIdSet();
        var idMap = {}, groupMap = {};
        items.forEach(function (c) { idMap[c.id] = makeId(c, used); });

        var dx = opts.dx != null ? opts.dx : 20;
        var dy = opts.dy != null ? opts.dy : 20;

        // Gốc = control có cha không nằm trong cụm
        var roots = items.filter(function (c) { return !c.parentId || !inSet[c.parentId]; });

        // Gốc "tự do" (sẽ nằm trực tiếp trên canvas): cần rebase tọa độ
        var free = roots.filter(function (c) {
            return !(opts.keepParent && c.parentId && builder.getControlConfig(c.parentId));
        });
        var minLeft = Infinity, minTop = Infinity;
        free.forEach(function (c) {
            minLeft = Math.min(minLeft, c.left || 0);
            minTop = Math.min(minTop, c.top || 0);
        });
        if (!isFinite(minLeft)) { minLeft = 0; minTop = 0; }

        var baseLeft, baseTop;
        if (opts.keepParent && opts.left == null && opts.placement !== "below") {
            baseLeft = Math.max(CANVAS_MIN, minLeft + dx);
            baseTop = Math.max(CANVAS_MIN, minTop + dy);
        } else if (opts.placement === "below") {
            baseLeft = CANVAS_MIN;
            baseTop = snippet.contentBottom() + 40;
        } else if (opts.left != null) {
            baseLeft = opts.left;
            baseTop = opts.top;
        } else {
            var v = snippet.viewOrigin();
            baseLeft = v.left; baseTop = v.top;
        }

        items.forEach(function (c) {
            var oldId = c.id;
            var isRoot = roots.indexOf(c) >= 0;
            var keptParent = isRoot && opts.keepParent && c.parentId && builder.getControlConfig(c.parentId);

            c.id = idMap[oldId];

            if (isRoot) {
                if (keptParent) {
                    c.left = (c.left || 0) + dx;
                    c.top = (c.top || 0) + dy;
                } else {
                    c.parentId = null;
                    delete c.paneIndex;
                    c.left = baseLeft + ((c.left || 0) - minLeft);
                    c.top = baseTop + ((c.top || 0) - minTop);
                }
            } else {
                c.parentId = idMap[c.parentId];
            }
            REF_KEYS_ID.forEach(function (k) {
                if (k === "parentId") return;
                if (c[k]) c[k] = inSet[c[k]] ? idMap[c[k]] : null;
                if (c[k] == null) delete c[k];
            });
            if (c.groupId) {
                if (!groupMap[c.groupId]) groupMap[c.groupId] = "group_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
                c.groupId = groupMap[c.groupId];
            }
        });

        var all = (builder.controls || []).concat(items);
        items.forEach(function (c) { controlSplitter.fit(c, all); });

        var ordered = orderParentFirst(items);
        ordered.forEach(function (c) {
            if (c.type === "field" && !c.uiMode) c.uiMode = "core";
            c._fromRestore = true;              // tọa độ đã relative, đừng quy đổi lại
            builder.renderControlByConfig(c);
            delete c._fromRestore;
            builder.controls.push(c);
        });
        // Chiều cao của lưới ESS chỉ đo được sau khi vẽ: lưới có mép dưới lọt khỏi vùng của Splitter thì thu lại lúc này.
        items.forEach(function (c) { controlSplitter.land(c); });

        if (builder.rebuildGroups) builder.rebuildGroups();
        builder.refreshJson();                   // một lần = một bước Undo

        var newRoots = roots.map(function (c) { return c.id; });
        snippet.selectIds(newRoots);
        return newRoots;
    };

    snippet.selectIds = function (ids) {
        if (!ids.length) return;
        var first = builder.getControlConfig(ids[0]);
        builder.selectedControlId = ids[0];
        builder.selectedControlType = first ? first.type : null;
        $(".canvas-control, .page-field, .popup-field").removeClass("canvas-control-selected page-field-selected popup-field-selected");
        ids.forEach(function (id) {
            $('[data-id="' + id + '"]').addClass("canvas-control-selected page-field-selected popup-field-selected");
        });
        if (builder.highlightOutlineSelection) builder.highlightOutlineSelection();
        if (builder.updateSelectionSizeHint) builder.updateSelectionSizeHint();
    };

    snippet.contentBottom = function () {
        var bottom = CANVAS_MIN;
        ctrls().forEach(function (c) {
            if (c.parentId) return;
            bottom = Math.max(bottom, (c.top || 0) + (c.height || 0));
        });
        return bottom;
    };

    snippet.viewOrigin = function () {
        var $shell = $(".canvas-shell");
        var scale = (builder.viewScale && builder.viewScale > 0) ? builder.viewScale : 1;
        var l = $shell.length ? $shell.scrollLeft() / scale : 0;
        var t = $shell.length ? $shell.scrollTop() / scale : 0;
        return { left: Math.max(CANVAS_MIN, Math.round(l) + 40), top: Math.max(CANVAS_MIN, Math.round(t) + 40) };
    };

    // -------------------------------------------------------------- component
    snippet.saveSelectionAsComponent = function () {
        var ids = snippet.getSelectionIds();
        if (!ids.length) { toast("Chọn control (popup, group, grid...) để lưu thành component.", "info"); return; }

        var items = snippet.collectSubtree(ids);
        var first = builder.getControlConfig(ids[0]) || {};
        var defaultName = first.controlName || first.titleText || first.caption || first.id || "Component";

        builder.showSaveDialog({
            title: "Lưu thành component (" + items.length + " control)",
            nameLabel: "Tên component",
            defaultName: defaultName,
            defaultIsPublic: true,
            onOk: function (result) {
                var payload = {
                    controlId: null,
                    name: result.name,
                    controlType: "component",
                    jsonConfig: JSON.stringify({ kind: "component", version: 1, items: items }),
                    isPublic: result.isPublic,
                    thumbnailData: "",
                    projectId: result.projectId || null
                };
                $.ajax({
                    url: builderServiceUrl + "/SaveControl",
                    method: "POST",
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify(payload),
                    success: function (res) {
                        var saved = res.d || {};
                        if (!saved.success) {
                            toast("Lỗi lưu component: " + saved.message, "error");
                            return;
                        }
                        toast("Đã lưu component '" + result.name + "' (" + items.length + " control).", "success");
                        snippet.loadLibrary();
                    },
                    error: function (xhr) { toast("Lỗi lưu component: " + builder.ajaxErrorText(xhr), "error"); }
                });
            }
        });
    };

    snippet.insertComponent = function (controlId) {
        $.ajax({
            url: builderServiceUrl + "/LoadControl",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ controlId: controlId }),
            success: function (res) {
                var dto = res.d;
                if (!dto) { toast("Không tìm thấy component.", "error"); return; }
                var data;
                try { data = JSON.parse(dto.JsonConfig); } catch (e) { toast("Dữ liệu component hỏng.", "error"); return; }
                var items = Array.isArray(data) ? data : (data && data.items);
                if (!items || !items.length) { toast("Component rỗng.", "warning"); return; }
                snippet.instantiate(items, {});
                toast("Đã chèn '" + dto.Name + "'.", "success");
            },
            error: function (xhr) { toast("Lỗi tải component: " + builder.ajaxErrorText(xhr), "error"); }
        });
    };

    // ------------------------------------------------------------------ page
    snippet.insertPage = function (controlId) {
        $.ajax({
            url: builderServiceUrl + "/LoadControl",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ controlId: controlId }),
            success: function (res) {
                var dto = res.d;
                if (!dto) { toast("Không tìm thấy trang.", "error"); return; }
                var arr;
                try { arr = JSON.parse(dto.JsonConfig); } catch (e) { toast("Dữ liệu trang hỏng.", "error"); return; }
                if (!Array.isArray(arr) || !arr.length) { toast("Trang rỗng.", "warning"); return; }
                snippet.instantiate(arr, { placement: "below" });
                toast("Đã chèn trang '" + dto.Name + "' xuống dưới canvas.", "success");
            },
            error: function (xhr) { toast("Lỗi tải trang: " + builder.ajaxErrorText(xhr), "error"); }
        });
    };

    snippet.forkPage = function (controlId, name) {
        if (ctrls().length && !window.confirm("Fork '" + name + "' sẽ thay thế nội dung canvas hiện tại (chưa lưu sẽ mất). Tiếp tục?")) return;
        builder.loadControlFromServer(controlId, true);   // isClone = true → lưu ra bản mới
    };

    // --------------------------------------------------------------- library
    snippet._lib = { components: [], pages: [] };

    snippet.loadLibrary = function () {
        var $box = $("#libList");
        if (!$box.length) return;
        $.ajax({
            url: builderServiceUrl + "/GetControlList",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            data: "{}",
            success: function (res) {
                var list = res.d || [];
                snippet._lib.components = list.filter(function (x) { return x.ControlType === "component"; });
                snippet._lib.pages = list.filter(function (x) { return x.ControlType === "page"; });
                snippet.renderLibrary();
            },
            error: function () { $box.html('<span style="font-size:12px;color:red;">Lỗi tải thư viện</span>'); }
        });
    };

    snippet.renderLibrary = function () {
        var $box = $("#libList").empty();
        var q = ($("#libSearch").val() || "").toLowerCase().trim();

        function match(x) { return !q || (x.Name || "").toLowerCase().indexOf(q) >= 0; }

        function section(title, rows, kind) {
            $box.append($('<div class="lib-title"></div>').text(title + " (" + rows.length + ")"));
            if (!rows.length) {
                $box.append('<div class="lib-empty">Không có</div>');
                return;
            }
            rows.forEach(function (x) {
                var $item = $('<div class="lib-item"></div>');
                var badge = x.IsOwner ? "của tôi" : (x.IsPublic ? "public" : "");
                $item.append($('<div class="lib-name"></div>').text((kind === "component" ? "🧩 " : "📄 ") + x.Name)
                    .append(badge ? $('<span class="lib-badge"></span>').text(badge) : ""));
                var $act = $('<div class="lib-actions"></div>');
                $('<a href="javascript:void(0)">Chèn</a>').on("click", function () {
                    if (kind === "component") snippet.insertComponent(x.ControlId);
                    else snippet.insertPage(x.ControlId);
                }).appendTo($act);
                if (kind === "page") {
                    $('<a href="javascript:void(0)">Fork</a>').on("click", function () {
                        snippet.forkPage(x.ControlId, x.Name);
                    }).appendTo($act);
                }
                if (kind === "component" && x.IsOwner) {
                    $('<a href="javascript:void(0)" class="lib-del">Xoá</a>').on("click", function () {
                        if (!window.confirm("Xoá component '" + x.Name + "'?")) return;
                        $.ajax({
                            url: builderServiceUrl + "/DeleteControl",
                            method: "POST",
                            contentType: "application/json; charset=utf-8",
                            data: JSON.stringify({ controlId: x.ControlId }),
                            success: function () { snippet.loadLibrary(); },
                            error: function (xhr) { toast("Lỗi xoá: " + builder.ajaxErrorText(xhr), "error"); }
                        });
                    }).appendTo($act);
                }
                $item.append($act);
                $box.append($item);
            });
        }

        section("Component", snippet._lib.components.filter(match), "component");
        section("Trang", snippet._lib.pages.filter(match), "page");
    };

    // ------------------------------------------------------------- clipboard
    snippet.persistClipboard = function (items) {
        try { localStorage.setItem(CLIPBOARD_KEY, JSON.stringify({ t: Date.now(), items: items })); } catch (e) { /* quota / private mode */ }
    };

    snippet.hydrateClipboard = function (force) {
        if (force !== true && builder.clipboardControls && builder.clipboardControls.length) return;
        try {
            var raw = localStorage.getItem(CLIPBOARD_KEY);
            if (!raw) return;
            var d = JSON.parse(raw);
            if (!d || !d.items || !d.items.length || (Date.now() - d.t) > CLIPBOARD_MAX_AGE_MS) return;
            builder.clipboardControls = d.items;
            builder.lastCopyKind = "control";
            builder.lastCopyAt = Date.now();     // TTL 20s tính lại từ lúc quay lại tab này
        } catch (e) { /* ignore */ }
    };

    function installClipboardOverrides() {
        builder.copySelectionControls = function () {
            var ids = snippet.getSelectionIds();
            if (!ids.length) { toast("Chọn control để sao chép.", "info"); return; }
            var items = snippet.collectSubtree(ids);
            if (!items.length) return;
            this.clipboardControls = items;
            this.markCopied("control");
            snippet.persistClipboard(items);
            toast("Đã sao chép " + items.length + " control (gồm control con).", "success");
        };

        builder.pasteSelectionControls = function () {
            if (!this.clipboardControls || !this.clipboardControls.length) {
                toast("Chưa sao chép control nào. Hãy bấm Ctrl+C trước.", "info");
                return;
            }
            snippet.instantiate(this.clipboardControls, { keepParent: true, dx: 20, dy: 20 });
        };

        var origClear = builder.clearAppClipboard;
        builder.clearAppClipboard = function () {
            origClear.call(this);
            try { localStorage.removeItem(CLIPBOARD_KEY); } catch (e) { /* ignore */ }
        };
    }

    // ------------------------------------------------------------------ init
    $(function () {
        if (!window.builder) return;

        installClipboardOverrides();

        $(window).on("focus", function () { snippet.hydrateClipboard(); });
        $(window).on("storage", function (e) {
            if (e.originalEvent && e.originalEvent.key === CLIPBOARD_KEY) snippet.hydrateClipboard(true);
        });

        $(document).on("input", "#libSearch", function () { snippet.renderLibrary(); });
        $(document).on("click", "#libRefresh", function () { snippet.loadLibrary(); });

        snippet.loadLibrary();
    });

    window.builderSnippet = snippet;
})(window, jQuery);
