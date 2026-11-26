(function (root, factory) {
    var api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.builderCapture = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    var KIND = "ba-screen";
    var VERSION = 1;
    var LIMITS = {
        nodes: 2000, depth: 8, text: 200, columns: 80, tabs: 30, buttons: 40, size: 20000, json: 2 * 1024 * 1024, treeItems: 200, treeColumns: 12,
        gridRows: 10, cell: 60,
        image: 12 * 1024 * 1024, imageTotal: 48 * 1024 * 1024
    };
    var IMAGE_PATTERN = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+\/]+={0,2}$/;
    var CANVAS_MIN = 20;

    var FIELD_TYPES = { text: "text", number: "number", date: "date", combo: "combo", multiselect: "multiselect", memo: "memo" };
    var NODE_TYPES = {
        text: 1, number: 1, date: 1, combo: 1, multiselect: 1, memo: 1,
        checkbox: 1, radio: 1, button: 1, label: 1, tag: 1, image: 1,
        group: 1, section: 1, popup: 1, tabs: 1, grid: 1, toolbar: 1, tree: 1, splitter: 1
    };
    var CONTAINER_TYPES = { group: 1, section: 1, popup: 1, tabs: 1, splitter: 1 };

    var METRICS = {
        core: { labelGap: 8, widthPad: 10, editorTop: 3, rowHeight: 22, checkHeight: 22, checkGlyphX: 4, checkTextX: 25, labelHeight: 18, labelPadX: 0, labelPadY: 0, labelSlack: 0, splitter: 6 },
        ess: { labelGap: 13, widthPad: 20, editorTop: 5, heightPad: 10, checkHeight: 28, labelHeight: 20, checkExtraWidth: 40, labelPadX: 7, labelPadY: 5, labelSlack: 6, buttonPadX: 7, buttonPadY: 6 }
    };
    var GRID_HEIGHT = { frame: 22, header: 35, row: 35, panel: 52, dataHeader: 27, titleBar: 27, filter: 34, pager: 50 };
    var ESS_GRID_HEIGHT = { frame: 73, title: 19, row: 32 };
    var INSETS = {
        groupbox: { x: 5, y: 11 },
        section: { x: 5, y: 36 },
        popup: { x: 2, y: 59 },
        essSection: { x: 11, y: 52 }
    };
    // Thanh nút gắn vào popup nằm trên dải ngay dưới thanh tiêu đề của popup Builder, cách mép trên popup như thanh nút trên popup của HRM.
    var POPUP_BAR_TOP = 32;
    var SPLIT = {
        defaultRatio: 50,
        room: function (total) { return Math.max(0, total - METRICS.core.splitter); },
        first: function (room, ratio) { return Math.round(room * ratio / 100); },
        ratio: function (first, room) { return room > 0 ? Math.round(first / room * 1000000) / 10000 : SPLIT.defaultRatio; }
    };
    var ICONS = [
        { test: /^(add|new|create|insert|assign)\b/i, icon: "/Content/images/icon-menu/menu-add.png" },
        { test: /^(save|update|submit)\b/i, icon: "/Content/images/icon-menu/menu-save.png" },
        { test: /^(delete|remove|un-?assign)\b/i, icon: "/Content/images/icon-menu/menu-delete.png" },
        { test: /^(cancel|close|back)\b/i, icon: "/Content/images/icon-menu/menu-cancel.png" },
        { test: /^(open|view|preview) report\b/i, icon: "/Content/images/icon-menu/menu-open-report.png" },
        { test: /^download\b/i, icon: "/Content/images/icon-menu/menu-download.png" },
        { test: /^(export|print)\b/i, icon: "/Content/images/icon-menu/menu-export.png" },
        { test: /^(approve|confirm)\b/i, icon: "/Content/images/icon-menu/menu-approve.png" },
        { test: /^(ok|select)$/i, icon: "/Content/images/icon-menu/menu-ok.png" },
        { test: /^(import|browse|upload)\b/i, icon: "/Content/images/icon-menu/menu-browse.png" },
        { test: /^(deactive|deactivate|inactive)\b/i, icon: "/Content/images/icon-menu/menu-deactive.png" },
        { test: /^auto\b/i, icon: "/Content/images/icon-menu/menu-auto-assign.png" }
    ];
    var ICON_KEYS = {
        add: "menu-add", save: "menu-save", "save-and-close": "menu-save", "delete": "menu-delete", remove: "menu-delete",
        cancel: "menu-cancel", unapprove: "menu-cancel", inactive: "menu-cancel", approve: "menu-approve", active: "menu-approve",
        "auto-assign": "menu-auto-assign", download: "menu-download", "export": "menu-export", openreport: "menu-open-report",
        ok: "menu-ok", select: "menu-ok", rehire: "menu-ok"
    };
    var ROW_ACTIONS = {
        view: { key: "view", text: "View", icon: "/Content/images/grid-view.png" },
        edit: { key: "edit", text: "Edit", icon: "/Content/images/grid-edit.png" },
        "delete": { key: "delete", text: "Delete", icon: "/Content/images/grid-delete.png" }
    };

    function cleanText(value, max) {
        if (value == null) return "";
        var text = String(value).replace(/->/g, "\u2192").replace(/<-/g, "\u2190").replace(/>=/g, "\u2265").replace(/<=/g, "\u2264").replace(/<>/g, "\u2260")
            .replace(/</g, "\uFF1C").replace(/>/g, "\uFF1E")
            .replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
        var limit = max || LIMITS.text;
        return text.length > limit ? text.slice(0, limit) : text;
    }

    function cleanNumber(value, fallback) {
        var n = typeof value === "number" ? value : parseFloat(value);
        if (!isFinite(n)) return fallback;
        return Math.max(-LIMITS.size, Math.min(LIMITS.size, Math.round(n)));
    }

    function cleanColor(value) {
        return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
    }

    function cleanImage(value, state) {
        if (typeof value !== "string" || value.length > LIMITS.image || !IMAGE_PATTERN.test(value)) return null;
        if (state.imageSize + value.length > LIMITS.imageTotal) { state.truncated = true; return null; }
        state.imageSize += value.length;
        return value;
    }

    function fail(message) {
        return { ok: false, error: message, screen: null };
    }

    function cleanButton(raw) {
        var button = { text: cleanText(raw && raw.text) };
        if (raw && typeof raw.icon === "string" && Object.prototype.hasOwnProperty.call(ICON_KEYS, raw.icon)) button.icon = raw.icon;
        return button;
    }

    function normalizeNode(raw, depth, state) {
        if (!raw || typeof raw !== "object" || !NODE_TYPES[raw.t]) return null;
        if (depth > LIMITS.depth || state.count >= LIMITS.nodes) { state.truncated = true; return null; }
        var image = raw.t === "image" ? cleanImage(raw.src, state) : null;
        if (raw.t === "image" && !image) return null;
        state.count++;
        var node = {
            t: raw.t,
            x: cleanNumber(raw.x, 0),
            y: cleanNumber(raw.y, 0),
            w: Math.max(1, cleanNumber(raw.w, 1)),
            h: Math.max(1, cleanNumber(raw.h, 1))
        };
        if (raw.tab != null) node.tab = Math.max(0, Math.min(LIMITS.tabs - 1, cleanNumber(raw.tab, 0)));

        if (FIELD_TYPES[raw.t] || raw.t === "checkbox" || raw.t === "radio") {
            node.caption = cleanText(raw.caption);
            node.required = raw.required === true;
            node.disabled = raw.disabled === true;
            if (FIELD_TYPES[raw.t]) {
                if (raw.placeholder) node.placeholder = cleanText(raw.placeholder);
                if (raw.labelX != null) node.labelX = cleanNumber(raw.labelX, node.x);
                if (raw.captionAbove === true) {
                    node.captionAbove = true;
                    node.labelY = cleanNumber(raw.labelY, node.y - 20);
                    if (raw.labelW != null) node.labelW = Math.max(1, cleanNumber(raw.labelW, 1));
                    if (raw.labelH != null) node.labelH = Math.max(1, cleanNumber(raw.labelH, 1));
                }
            }
        } else if (raw.t === "button" || raw.t === "label" || raw.t === "tag") {
            node.text = cleanText(raw.text);
            if (raw.t === "button" || raw.t === "tag") {
                node.disabled = raw.disabled === true;
                var bg = cleanColor(raw.bg), fg = cleanColor(raw.fg), border = cleanColor(raw.border);
                if (bg) node.bg = bg;
                if (fg) node.fg = fg;
                if (border) node.border = border;
            } else if (raw.bold === true) {
                node.bold = true;
            }
        } else if (raw.t === "image") {
            node.src = image;
        } else if (raw.t === "grid") {
            node.title = cleanText(raw.title);
            node.filterRow = raw.filterRow === true;
            node.pager = raw.pager === true;
            node.checkbox = raw.checkbox === true;
            node.groupPanel = raw.groupPanel === true;
            node.viewData = raw.viewData === true;
            node.language = raw.language === true;
            node.rows = Math.max(1, Math.min(LIMITS.gridRows, cleanNumber(raw.rows, 3)));
            node.columns = (Array.isArray(raw.columns) ? raw.columns : []).slice(0, LIMITS.columns).map(function (c) {
                var column = { caption: cleanText(c && c.caption), w: Math.max(20, cleanNumber(c && c.w, 120)) };
                if (c && c.type === "checkbox") column.type = "checkbox";
                if (c && c.type === "tag") {
                    var tags = (Array.isArray(c.tags) && c.tags.length ? c.tags : [c]).slice(0, 6).map(function (t) {
                        var text = cleanText(t && t.text, 40), bg = cleanColor(t && t.bg);
                        return text && bg ? { text: text, backColor: bg, textColor: cleanColor(t && t.fg) || "#ffffff" } : null;
                    }).filter(Boolean);
                    if (tags.length) { column.type = "tag"; column.tags = tags; }
                }
                return column;
            });
            if (state.ui === "core" && Array.isArray(raw.data) && raw.data.length) {
                node.data = raw.data.slice(0, LIMITS.gridRows).map(function (row) {
                    return (Array.isArray(row) ? row : []).slice(0, node.columns.length).map(function (value) { return cleanText(value, LIMITS.cell); });
                });
                node.rows = node.data.length;
            }
            node.actions = (Array.isArray(raw.actions) ? raw.actions : []).filter(function (a) { return Object.prototype.hasOwnProperty.call(ROW_ACTIONS, a); });
            node.toolbar = (Array.isArray(raw.toolbar) ? raw.toolbar : []).slice(0, LIMITS.buttons).map(cleanButton).filter(function (b) { return b.text; });
        } else if (raw.t === "toolbar") {
            node.buttons = (Array.isArray(raw.buttons) ? raw.buttons : []).slice(0, LIMITS.buttons).map(cleanButton).filter(function (b) { return b.text; });
        } else if (raw.t === "tree") {
            node.check = raw.check === "mark" || raw.check === "none" ? raw.check : "box";
            node.rowHeight = Math.max(16, Math.min(60, cleanNumber(raw.rowHeight, 28)));
            node.indent = Math.max(12, Math.min(80, cleanNumber(raw.indent, 23)));
            node.header = raw.header === true;
            node.scroll = raw.scroll === true;
            node.caption = cleanText(raw.caption);
            node.columns = (Array.isArray(raw.columns) ? raw.columns : []).slice(0, LIMITS.treeColumns).map(function (c) {
                var column = { caption: cleanText(c && c.caption), w: Math.max(20, cleanNumber(c && c.w, 70)), type: c && c.type === "checkbox" ? "checkbox" : "text" };
                if (c && c.disabled === true) column.disabled = true;
                return column;
            });
            node.items = (Array.isArray(raw.items) ? raw.items : []).slice(0, LIMITS.treeItems).map(function (item) {
                var entry = { text: cleanText(item && item.text), level: Math.max(0, Math.min(20, cleanNumber(item && item.level, 0))) };
                if (item && item.open === false) entry.open = false;
                if (item && typeof item.checked === "boolean") entry.checked = item.checked;
                if (item && item.focused === true) entry.focused = true;
                if (item && Array.isArray(item.cells)) {
                    entry.cells = item.cells.slice(0, node.columns.length).map(function (value) {
                        return typeof value === "boolean" ? value : cleanText(value, LIMITS.cell);
                    });
                }
                return entry;
            });
        } else if (raw.t === "splitter") {
            node.vertical = raw.vertical === true;
            var span = node.vertical ? node.w : node.h;
            node.bar = Math.max(0, Math.min(METRICS.core.splitter, span, cleanNumber(raw.bar, 0)));
            node.split = Math.max(0, Math.min(span - node.bar, cleanNumber(raw.split, Math.round((span - node.bar) / 2))));
        } else if (raw.t === "group" || raw.t === "section") {
            node.caption = cleanText(raw.caption);
        } else if (raw.t === "popup") {
            node.title = cleanText(raw.title);
            if (raw.head != null) node.head = Math.max(0, Math.min(node.h, cleanNumber(raw.head, 0)));
        } else if (raw.t === "tabs") {
            node.tabs = (Array.isArray(raw.tabs) ? raw.tabs : []).slice(0, LIMITS.tabs).map(function (t) { return cleanText(t); });
            if (!node.tabs.length) node.tabs = ["Tab 1"];
            node.active = Math.max(0, Math.min(node.tabs.length - 1, cleanNumber(raw.active, 0)));
        }

        if (CONTAINER_TYPES[raw.t]) {
            node.children = [];
            (Array.isArray(raw.children) ? raw.children : []).forEach(function (child) {
                var clean = normalizeNode(child, depth + 1, state);
                if (!clean) return;
                if (raw.t === "splitter") clean.pane = child.pane === 1 ? 1 : 0;
                node.children.push(clean);
            });
        }
        return node;
    }

    function normalize(input) {
        var data = input;
        if (typeof input === "string") {
            if (input.length > LIMITS.json) return fail("Dữ liệu màn hình quá lớn.");
            try { data = JSON.parse(input); } catch (e) { return fail("Dữ liệu màn hình không phải JSON hợp lệ."); }
        }
        if (!data || typeof data !== "object" || data.kind !== KIND) return fail("Đây không phải dữ liệu màn hình của UI Builder.");
        if (data.v !== VERSION) return fail("Phiên bản dữ liệu màn hình không được hỗ trợ.");
        if (data.ui !== "core" && data.ui !== "ess") return fail("Thiếu kiểu giao diện (core hoặc ess).");
        var state = { count: 0, truncated: false, imageSize: 0, ui: data.ui };
        var screen = {
            kind: KIND,
            v: VERSION,
            ui: data.ui,
            title: cleanText(data.title),
            width: Math.max(1, cleanNumber(data.width, 1200)),
            height: Math.max(1, cleanNumber(data.height, 800)),
            nodes: []
        };
        (Array.isArray(data.nodes) ? data.nodes : []).forEach(function (raw) {
            var node = normalizeNode(raw, 1, state);
            if (node) screen.nodes.push(node);
        });
        if (!screen.nodes.length) return fail("Màn hình không có control nào.");
        return { ok: true, error: null, screen: screen, truncated: state.truncated, count: state.count };
    }

    function iconFor(text) {
        for (var i = 0; i < ICONS.length; i++) {
            if (ICONS[i].test.test(text)) return ICONS[i].icon;
        }
        return null;
    }

    function toolbarItem(button) {
        var item = { text: button.text };
        var icon = button.icon ? "/Content/images/icon-menu/" + ICON_KEYS[button.icon] + ".png" : iconFor(button.text);
        if (icon) item.icon = icon;
        return item;
    }

    function fieldBase(ctx, ftype, parentId, tab) {
        var cfg = {
            id: ctx.nextId("fld_" + ftype),
            type: "field",
            ftype: ftype,
            uiMode: ctx.ui,
            caption: "",
            required: false,
            disabled: false,
            defaultValue: "",
            items: ftype === "combo" ? ["Item 1", "Item 2"] : [],
            multiselectColumns: ftype === "multiselect" ? [{ name: "value", caption: "Value", width: 150 }, { name: "label", caption: "Label", width: 200 }] : [],
            multiselectItems: [],
            multiselectSelectedValues: [],
            labelWidth: 0,
            captionBold: false,
            captionItalic: false,
            captionPosition: "left",
            tabPageId: tab ? tab.id : null,
            tabIndex: tab ? tab.index : null,
            zIndex: 1,
            parentId: parentId || null,
            left: 0,
            top: 0,
            width: 1,
            height: 1
        };
        return cfg;
    }

    function place(cfg, origin, x, y) {
        cfg.left = Math.max(origin.min, x - origin.x);
        cfg.top = Math.max(origin.minTop != null ? origin.minTop : origin.min, y - origin.y);
        return cfg;
    }

    function labelControl(ctx, origin, parentId, tab, text, x, y, w, h, bold) {
        var m = METRICS[ctx.ui];
        var cfg = fieldBase(ctx, "label", parentId, tab);
        cfg.defaultValue = text;
        cfg.captionBold = bold === true;
        cfg.width = Math.max(20, w + 2 * m.labelPadX + m.labelSlack);
        cfg.height = Math.max(m.labelHeight, h + 2 * m.labelPadY);
        return place(cfg, origin, x - m.labelPadX, y - m.labelPadY);
    }

    function editorControl(ctx, origin, parentId, tab, node) {
        var m = METRICS[ctx.ui];
        var ftype = FIELD_TYPES[node.t];
        if (ctx.ui === "ess" && ftype === "number") ftype = "numberic-test";
        var cfg = fieldBase(ctx, ftype, parentId, tab);
        cfg.required = node.required;
        cfg.disabled = node.disabled;
        var hasLeftCaption = !!node.caption && !node.captionAbove && node.labelX != null && node.labelX < node.x;
        var left = node.x - m.labelGap;
        if (hasLeftCaption) {
            cfg.caption = node.caption;
            var gap = Math.max(0, node.x - node.labelX - m.labelGap);
            var needed = Math.ceil((node.caption.length + (node.required ? 2 : 0)) * 6.5) + 6;
            cfg.labelWidth = Math.max(gap, Math.min(gap + 60, needed));
            left = node.x - m.labelGap - cfg.labelWidth;
        }
        if (node.placeholder && !node.caption) cfg.defaultValue = node.placeholder;
        cfg.width = node.w + cfg.labelWidth + m.widthPad;
        if (ctx.ui === "ess") cfg.height = node.h + m.heightPad;
        else cfg.height = ftype === "memo" ? Math.max(m.rowHeight, node.h) : m.rowHeight;
        place(cfg, origin, left, node.y - m.editorTop);

        var out = [];
        if (node.caption && !hasLeftCaption) {
            var labelX = node.labelX != null ? node.labelX : node.x;
            var labelY = node.captionAbove ? node.labelY : node.y - m.labelHeight - 2;
            var text = node.caption + (node.required ? " *" : "");
            out.push(labelControl(ctx, origin, parentId, tab, text, labelX, labelY,
                node.labelW || Math.min(node.w, Math.max(40, text.length * 7)), node.labelH || m.labelHeight, false));
        }
        out.push(cfg);
        return out;
    }

    function checkControl(ctx, origin, parentId, tab, node) {
        var m = METRICS[ctx.ui];
        var cfg = fieldBase(ctx, node.t, parentId, tab);
        cfg.caption = node.caption;
        cfg.captionPosition = "right";
        cfg.required = node.required;
        cfg.disabled = node.disabled;
        cfg.width = node.w + (m.checkExtraWidth || 0);
        cfg.height = Math.max(m.checkHeight, node.h);
        return place(cfg, origin, node.x, node.y);
    }

    function buttonControl(ctx, origin, parentId, tab, node) {
        var cfg = fieldBase(ctx, "button", parentId, tab);
        cfg.defaultValue = node.text || "…";
        cfg.disabled = node.disabled;
        var padX = METRICS[ctx.ui].buttonPadX || 0, padY = METRICS[ctx.ui].buttonPadY || 0;
        cfg.width = Math.max(18, node.w) + 2 * padX;
        cfg.height = Math.max(18, node.h) + 2 * padY;
        if (node.bg) cfg.btnBackColor = node.bg;
        if (node.fg) cfg.btnTextColor = node.fg;
        if (node.border) cfg.btnBorderColor = node.border;
        return place(cfg, origin, node.x - padX, node.y - padY);
    }

    function tagControl(ctx, origin, parentId, tab, node) {
        var cfg = fieldBase(ctx, "tag", parentId, tab);
        cfg.uiMode = "ess";
        cfg.defaultValue = node.text || "Tag";
        cfg.tagBackColor = node.bg || "#0d9eff";
        cfg.tagTextColor = node.fg || "#ffffff";
        cfg.width = Math.max(40, node.w + 14);
        cfg.height = Math.max(24, node.h + 10);
        return place(cfg, origin, node.x - 7, node.y - 5);
    }

    function imageControl(ctx, origin, parentId, tab, node) {
        var cfg = fieldBase(ctx, "image", parentId, tab);
        cfg.uiMode = "ess";
        cfg.imageData = node.src;
        cfg.imageMode = "stretch";
        cfg.zIndex = 0;
        cfg.width = node.w;
        cfg.height = node.h;
        return place(cfg, origin, node.x, node.y);
    }

    function treeControl(ctx, origin, parentId, tab, node) {
        var cfg = fieldBase(ctx, "tree", parentId, tab);
        cfg.uiMode = "core";
        cfg.width = Math.max(60, node.w);
        cfg.height = Math.max(node.rowHeight, node.h);
        cfg.treeCheck = node.check;
        cfg.treeRowHeight = node.rowHeight;
        cfg.treeIndent = node.indent;
        cfg.treeLines = true;
        cfg.treeHeader = node.header;
        cfg.treeScroll = node.scroll;
        cfg.treeCaption = node.caption || "Name";
        cfg.treeColumns = node.columns.map(function (c) {
            return { caption: c.caption, width: c.w, type: c.type, disabled: c.disabled === true };
        });
        cfg.treeNodes = node.items.map(function (item) {
            var entry = { text: item.text, level: item.level };
            if (item.open === false) entry.open = false;
            if (typeof item.checked === "boolean") entry.checked = item.checked;
            if (item.focused) entry.focused = true;
            if (item.cells) entry.cells = item.cells.slice();
            return entry;
        });
        return place(cfg, origin, node.x, node.y);
    }

    function paneNodes(node, pane) {
        return node.children.filter(function (child) { return child.pane === pane; });
    }

    function sampleRows(columns, count, data) {
        if (data && data.length) {
            return data.map(function (cells) {
                var filled = {};
                columns.forEach(function (c, i) { filled[c.name] = c.type === "checkbox" ? /^(x|true|yes|1)$/i.test(cells[i] || "") : (cells[i] || ""); });
                return filled;
            });
        }
        var rows = [];
        for (var i = 1; i <= count; i++) {
            var row = {};
            columns.forEach(function (c) {
                var low = c.name.toLowerCase();
                if (c.type === "tag") row[c.name] = c.tags[(i - 1) % c.tags.length].text;
                else if (c.type === "checkbox") row[c.name] = i % 2 === 1;
                else row[c.name] = c.caption ? (low === "code" ? "Code " : low === "name" ? "Name " : c.name + " ") + i : "";
            });
            rows.push(row);
        }
        return rows;
    }

    function gridHeight(ui, node) {
        if (ui === "ess") return ESS_GRID_HEIGHT.frame + (node.title ? ESS_GRID_HEIGHT.title : 0) + node.rows * ESS_GRID_HEIGHT.row;
        var total = GRID_HEIGHT.frame + GRID_HEIGHT.header + node.rows * GRID_HEIGHT.row;
        if (node.groupPanel) total += GRID_HEIGHT.panel;
        if (node.viewData) total += GRID_HEIGHT.dataHeader;
        if (node.title || node.toolbar.length || node.language) total += GRID_HEIGHT.titleBar;
        if (node.filterRow) total += GRID_HEIGHT.filter;
        if (node.pager) total += GRID_HEIGHT.pager;
        return total;
    }

    var DOWN = { pos: "y", size: "h", label: "labelY" };
    var ACROSS = { pos: "x", size: "w", label: "labelX" };
    var EDGE_SLACK = 2;
    var HEADER_SLACK = 4;

    function shiftNode(node, axis, delta) {
        node[axis.pos] += delta;
        if (node[axis.label] != null) node[axis.label] += delta;
        (node.children || []).forEach(function (child) { shiftNode(child, axis, delta); });
    }

    function ownGrowth(ui, node, axis) {
        if (node.t === "grid") return axis === DOWN ? Math.max(0, gridHeight(ui, node) - node.h) : 0;
        return 0;
    }

    function spillOf(nodes, axis, limit) {
        var ends = nodes.map(function (child) { return child[axis.pos] + child[axis.size]; });
        return Math.max.apply(null, ends.concat(limit)) - limit;
    }

    // Hai vùng của Splitter dàn lại riêng. Theo chiều chia: thanh lấy bề dày của Builder, vùng 1 dài thêm bao nhiêu thì vùng 2 lùi bấy nhiêu.
    // Theo chiều còn lại: cả khối lớn theo vùng dài thêm nhiều hơn.
    // Vùng của Builder cắt nội dung tràn ra ngoài, nên node tràn khỏi vùng trên màn hình chụp làm vùng dài thêm đúng bằng phần tràn.
    function reflowSplitter(ui, node, axis) {
        var along = axis === (node.vertical ? ACROSS : DOWN);
        var end = node[axis.pos] + node[axis.size];
        var panes = [paneNodes(node, 0), paneNodes(node, 1)];
        var spill = [spillOf(panes[0], axis, along ? node[axis.pos] + node.split : end), spillOf(panes[1], axis, end)];
        var first = reflowList(ui, panes[0], axis) + spill[0];
        var second = reflowList(ui, panes[1], axis) + spill[1];
        if (!along) return Math.max(first, second);
        var push = first + METRICS.core.splitter - node.bar;
        if (push) panes[1].forEach(function (child) { shiftNode(child, axis, push); });
        node.split += first;
        node.bar = METRICS.core.splitter;
        return push + second;
    }

    // Control nằm trên phần đầu của khối chứa (thanh tiêu đề): tâm của nó ở trên mép vùng nội dung.
    function onHeader(node, child, inset) {
        return child.y + child.h / 2 < node.y + inset.y - HEADER_SLACK;
    }

    // Popup đọc từ một trang HTML bất kỳ có phần đầu riêng cao node.head (dải tiêu đề, dải nút), khác phần đầu của popup Builder.
    // Thanh nút nằm trên phần đầu đó về dải nút của popup Builder. Mọi thứ còn lại dời cùng một khoảng để giữ nguyên khoảng cách
    // tới mép dưới phần đầu, và popup cao thêm (hoặc thấp đi) đúng bằng khoảng đó. Phần đầu không xuống quá control nội dung đầu tiên.
    function rehead(node, inset) {
        var tops = node.children.filter(function (child) { return child.t !== "toolbar"; }).map(function (child) {
            return (child.labelY != null ? Math.min(child.y, child.labelY) : child.y) - node.y;
        });
        var head = Math.max(0, Math.min.apply(null, tops.concat(node.head)));
        var lack = inset.y - head;
        node.children.forEach(function (child) {
            if (child.t === "toolbar" && child.y + child.h <= node.y + head + EDGE_SLACK) child.y = node.y + POPUP_BAR_TOP;
            else shiftNode(child, DOWN, lack);
        });
        return lack;
    }

    // Phần đầu của popup (thanh tiêu đề, thanh nút) và của khối ESS trong Builder không đặt control lên được. Khối trên màn hình gốc
    // có control nằm ở đó (popup không có thanh tiêu đề, nút nằm ngay trên thanh tiêu đề của khối) thì đẩy cả phần nội dung xuống
    // cho control cao nhất chạm mép vùng nội dung, và trả về phần khối phải cao thêm. Kẹp riêng từng control ở mép trên vùng nội dung
    // sẽ dồn các control hàng đầu chồng lên nhau. Thanh nút gắn vào popup không tính là nội dung.
    function headroom(ui, node, axis) {
        var inset = node.t === "popup" ? INSETS.popup : (node.t === "section" && ui === "ess" ? INSETS.essSection : null);
        if (!inset || axis !== DOWN) return 0;
        if (node.t === "popup" && node.head != null) return rehead(node, inset);
        var content = node.children.filter(function (child) { return !(node.t === "popup" && child.t === "toolbar"); });
        if (!content.some(function (child) { return onHeader(node, child, inset); })) return 0;
        var top = Math.min.apply(null, content.map(function (child) { return child.labelY != null ? Math.min(child.y, child.labelY) : child.y; }));
        var lack = node.y + inset.y - top;
        content.forEach(function (child) { shiftNode(child, DOWN, lack); });
        return lack;
    }

    // Control dựng trong Builder lớn hơn chỗ của nó trên màn hình chụp (lưới cao theo số dòng mẫu, thanh chia bị ẩn trên HRM vẫn chiếm chỗ):
    // nới node đó theo chiều axis, đẩy mọi node cùng cấp nằm sau nó, và trả về phần cả danh sách dài thêm để khối chứa nới theo.
    function reflowList(ui, nodes, axis) {
        if (!nodes.length) return 0;
        var items = nodes.map(function (node) { return { node: node, start: node[axis.pos], end: node[axis.pos] + node[axis.size], growth: 0, shift: null }; });
        var oldEnd = Math.max.apply(null, items.map(function (item) { return item.end; }));
        function comesAfter(item, other) {
            return other.end <= item.start + EDGE_SLACK && item.end > other.start + EDGE_SLACK;
        }
        function shiftOf(item) {
            if (item.shift == null) {
                item.shift = 0;
                items.forEach(function (other) {
                    if (comesAfter(item, other)) item.shift = Math.max(item.shift, shiftOf(other) + other.growth);
                });
            }
            return item.shift;
        }
        items.forEach(function (item) {
            var node = item.node;
            if (node.t === "tabs") {
                var groups = {};
                node.children.forEach(function (child) {
                    var key = child.tab != null ? child.tab : node.active;
                    (groups[key] = groups[key] || []).push(child);
                });
                Object.keys(groups).forEach(function (key) { item.growth = Math.max(item.growth, reflowList(ui, groups[key], axis)); });
            } else if (node.t === "splitter") {
                item.growth = reflowSplitter(ui, node, axis);
            } else if (node.children) {
                item.growth = reflowList(ui, node.children, axis) + headroom(ui, node, axis);
            } else {
                item.growth = ownGrowth(ui, node, axis);
            }
            if (item.growth) node[axis.size] += item.growth;
        });
        items.forEach(function (item) {
            if (shiftOf(item)) shiftNode(item.node, axis, item.shift);
        });
        var newEnd = Math.max.apply(null, items.map(function (item) { return item.node[axis.pos] + item.node[axis.size]; }));
        return Math.max(0, newEnd - oldEnd);
    }

    function gridControl(ctx, origin, parentId, tab, node) {
        var used = {};
        var columns = node.columns.map(function (c, i) {
            var name = c.caption.replace(/[^A-Za-z0-9]+/g, "") || ("Col" + (i + 1));
            var unique = name, n = 2;
            while (used[unique]) unique = name + (n++);
            used[unique] = true;
            var column = { name: unique, caption: c.caption, width: c.w };
            if (c.type) column.type = c.type;
            if (c.tags) column.tags = c.tags;
            return column;
        });
        var has = {};
        node.actions.forEach(function (a) { has[a] = true; });
        var toolbar = node.toolbar.map(toolbarItem);
        var cfg;
        if (ctx.ui === "ess") {
            cfg = {
                id: ctx.nextId("essgrid"),
                type: "ess-grid",
                uiMode: "ess",
                parentId: parentId || null,
                tabPageId: tab ? tab.id : null,
                tabIndex: tab ? tab.index : null,
                zIndex: 1,
                width: node.w,
                height: gridHeight("ess", node),
                title: node.title,
                showTitle: !!node.title,
                titleBold: true,
                titleItalic: false,
                showCheckbox: node.checkbox,
                showActionColumn: node.actions.length > 0,
                allowAddRow: toolbar.some(function (t) { return /^add\b/i.test(t.text); }),
                sampleRowCount: node.rows,
                sampleDisplayMode: "view",
                columns: columns.map(function (c, i) {
                    var column = { id: ctx.nextId("col") + "_" + i, key: c.name, caption: c.caption, type: "text", align: "left", headerBold: false, headerItalic: false, width: c.width };
                    if (c.type === "tag") {
                        column.type = "tag";
                        column.tagText = c.tags[0].text;
                        column.tagBackColor = c.tags[0].backColor;
                        column.tagTextColor = c.tags[0].textColor;
                    }
                    return column;
                }),
                rowActions: node.actions.map(function (a, i) {
                    return { id: ctx.nextId("act") + "_" + i, key: ROW_ACTIONS[a].key, caption: ROW_ACTIONS[a].text, icon: ROW_ACTIONS[a].icon, modeSample: "normal" };
                })
            };
        } else {
            cfg = {
                id: ctx.nextId("grid"),
                type: "grid",
                parentId: parentId || null,
                tabPageId: tab ? tab.id : null,
                tabIndex: tab ? tab.index : null,
                zIndex: 1,
                columns: columns,
                sampleData: sampleRows(columns, node.rows, node.data),
                filterRow: node.filterRow,
                allowAdd: true,
                allowEdit: true,
                allowGrouping: node.groupPanel,
                showCheckbox: node.checkbox,
                showViewColumn: !!has.view,
                showEditColumn: !!has.edit,
                showDeleteColumn: !!has["delete"],
                showSearchBox: false,
                showTitle: !!node.title,
                titleText: node.title,
                titleBold: false,
                titleItalic: false,
                showToolbar: toolbar.length > 0,
                toolbarItems: toolbar,
                showLocalDataLanguage: node.language,
                showDataHeader: node.viewData,
                dataHeaderCaption: "View Data",
                dataHeaderValue: "Company Data",
                rowActionColumns: ["view", "edit", "delete"].map(function (a) {
                    return { key: ROW_ACTIONS[a].key, text: ROW_ACTIONS[a].text, icon: ROW_ACTIONS[a].icon, visible: !!has[a], width: 40 };
                }),
                rowPermissions: {},
                showPager: node.pager,
                width: node.w
            };
        }
        return place(cfg, origin, node.x, node.y);
    }

    function emitNodes(ctx, nodes, origin, parentId, tab) {
        nodes.forEach(function (node) {
            var childTab = tab;
            if (FIELD_TYPES[node.t]) {
                editorControl(ctx, origin, parentId, childTab, node).forEach(function (c) { ctx.out.push(c); });
            } else if (node.t === "checkbox" || node.t === "radio") {
                ctx.out.push(checkControl(ctx, origin, parentId, childTab, node));
            } else if (node.t === "button") {
                ctx.out.push(buttonControl(ctx, origin, parentId, childTab, node));
            } else if (node.t === "tag") {
                ctx.out.push(tagControl(ctx, origin, parentId, childTab, node));
            } else if (node.t === "label") {
                ctx.out.push(labelControl(ctx, origin, parentId, childTab, node.text, node.x, node.y, node.w, node.h, node.bold));
            } else if (node.t === "image") {
                ctx.out.push(imageControl(ctx, origin, parentId, childTab, node));
            } else if (node.t === "grid") {
                ctx.out.push(gridControl(ctx, origin, parentId, childTab, node));
            } else if (node.t === "tree") {
                ctx.out.push(treeControl(ctx, origin, parentId, childTab, node));
            } else if (node.t === "splitter") {
                emitSplitter(ctx, node, origin, parentId, childTab);
            } else if (node.t === "toolbar") {
                var docked = !!origin.popup && parentId === origin.popupId;
                ctx.out.push(place({
                    id: ctx.nextId("toolbar"),
                    type: "toolbar",
                    parentId: parentId || null,
                    dock: docked ? "popup" : null,
                    showBackground: !docked,
                    tabPageId: childTab ? childTab.id : null,
                    tabIndex: childTab ? childTab.index : null,
                    items: node.buttons.map(toolbarItem)
                }, docked ? origin.popup : origin, node.x, node.y));
            } else if (node.t === "group" || node.t === "section") {
                emitBox(ctx, node, origin, parentId, childTab);
            } else if (node.t === "popup") {
                var popup = place({
                    id: ctx.nextId("popup"),
                    type: "popup",
                    headerText: node.title || "Popup",
                    titleText: "",
                    parentId: null,
                    width: node.w,
                    height: node.h,
                    headerHeight: 30,
                    titleFontSize: 12,
                    titleLineHeight: 27
                }, origin, node.x, node.y);
                ctx.out.push(popup);
                emitNodes(ctx, node.children, {
                    x: node.x + INSETS.popup.x,
                    y: node.y + INSETS.popup.y,
                    min: 0,
                    popup: { x: node.x, y: node.y, min: 0 },
                    popupId: popup.id
                }, popup.id, null);
            } else if (node.t === "tabs") {
                var tabpage = place({
                    id: ctx.nextId("tabpage"),
                    type: "tabpage",
                    width: node.w,
                    height: node.h,
                    tabs: node.tabs.map(function (caption) { return { caption: caption }; }),
                    activeTabIndex: node.active,
                    zIndex: 0,
                    parentId: parentId || null
                }, origin, node.x, node.y);
                ctx.out.push(tabpage);
                node.children.forEach(function (child) {
                    var index = child.tab != null ? Math.min(child.tab, node.tabs.length - 1) : node.active;
                    emitNodes(ctx, [child], origin, parentId, { id: tabpage.id, index: index });
                });
            }
        });
    }

    function emitBox(ctx, node, origin, parentId, tab) {
        var cfg, inset, headerTop = 0;
        if (ctx.ui === "ess" && node.t === "section") {
            cfg = {
                id: ctx.nextId("collapsible-section"),
                type: "collapsible-section",
                uiMode: "ess",
                caption: node.caption || "Section",
                expanded: true,
                width: node.w,
                height: node.h,
                backgroundColor: "#f5f5f5",
                borderColor: "#e0e0e0",
                headerColor: "#0078d4",
                contentPadding: 12,
                tabPageId: tab ? tab.id : null,
                tabIndex: tab ? tab.index : null,
                zIndex: 0,
                parentId: parentId || null
            };
            inset = INSETS.essSection;
        } else {
            var ftype = node.t === "section" ? "section" : "groupbox";
            cfg = fieldBase(ctx, ftype, parentId, tab);
            cfg.uiMode = "core";
            cfg.caption = node.caption;
            cfg.labelWidth = 120;
            cfg.zIndex = 0;
            cfg.width = node.w;
            cfg.height = node.h;
            inset = INSETS[ftype];
            if (ftype === "section") {
                headerTop = -inset.y;
                var captionEnd = node.x + 14 + Math.ceil(node.caption.length * 7.2);
                node.children.forEach(function (child) {
                    if (CONTAINER_TYPES[child.t] || child.t === "grid") return;
                    if (!onHeader(node, child, inset) || child.x >= captionEnd) return;
                    var shift = captionEnd - child.x;
                    child.x += shift;
                    if (child.labelX != null) child.labelX += shift;
                });
            }
        }
        place(cfg, origin, node.x, node.y);
        ctx.out.push(cfg);
        emitNodes(ctx, node.children, {
            x: node.x + inset.x,
            y: node.y + inset.y,
            min: 0,
            minTop: headerTop,
            popup: origin.popup,
            popupId: origin.popupId
        }, cfg.id, tab);
    }

    function emitSplitter(ctx, node, origin, parentId, tab) {
        var cfg = fieldBase(ctx, "splitter", parentId, tab);
        cfg.uiMode = "core";
        cfg.zIndex = 0;
        cfg.splitOrientation = node.vertical ? "vertical" : "horizontal";
        cfg.splitRatio = SPLIT.ratio(node.split, SPLIT.room(node.vertical ? node.w : node.h));
        cfg.width = node.w;
        cfg.height = node.h;
        place(cfg, origin, node.x, node.y);
        ctx.out.push(cfg);
        [0, 1].forEach(function (pane) {
            var offset = pane === 1 ? node.split + METRICS.core.splitter : 0;
            var from = ctx.out.length;
            emitNodes(ctx, paneNodes(node, pane), {
                x: node.x + (node.vertical ? offset : 0),
                y: node.y + (node.vertical ? 0 : offset),
                min: 0,
                popup: origin.popup,
                popupId: origin.popupId
            }, cfg.id, tab);
            ctx.out.slice(from).forEach(function (child) {
                if (child.parentId === cfg.id) child.paneIndex = pane;
            });
        });
    }

    // Control gốc nào lấn ra ngoài lề (phần đệm của nó nằm trước mép màn hình chụp) thì dời cả màn hình một lần cho đủ lề CANVAS_MIN.
    // Kẹp riêng từng control sẽ làm lệch khoảng cách giữa các control ở hàng đầu và cột đầu.
    function keepMargin(controls) {
        var roots = controls.filter(function (c) { return !c.parentId; });
        var dx = CANVAS_MIN - Math.min.apply(null, roots.map(function (c) { return c.left; }));
        var dy = CANVAS_MIN - Math.min.apply(null, roots.map(function (c) { return c.top; }));
        roots.forEach(function (c) {
            if (dx > 0) c.left += dx;
            if (dy > 0) c.top += dy;
        });
    }

    function convert(input, options) {
        var result = normalize(input);
        if (!result.ok) throw new Error(result.error);
        var opts = options || {};
        var seq = 0;
        var stamp = opts.idSeed != null ? String(opts.idSeed) : String(Date.now());
        var ctx = {
            ui: result.screen.ui,
            out: [],
            nextId: function (prefix) { return prefix + "_cap" + stamp + "_" + (seq++); }
        };
        result.screen.width += reflowList(ctx.ui, result.screen.nodes, ACROSS);
        result.screen.height += reflowList(ctx.ui, result.screen.nodes, DOWN);
        emitNodes(ctx, result.screen.nodes, { x: -CANVAS_MIN, y: -CANVAS_MIN, min: -Infinity }, null, null);
        keepMargin(ctx.out);
        return { controls: ctx.out, screen: result.screen, truncated: result.truncated === true };
    }

    function summarize(input) {
        var result = normalize(input);
        if (!result.ok) return null;
        var counts = { total: 0, fields: 0, grids: 0, buttons: 0, containers: 0 };
        (function walk(nodes) {
            nodes.forEach(function (n) {
                counts.total++;
                if (FIELD_TYPES[n.t] || n.t === "checkbox" || n.t === "radio") counts.fields++;
                else if (n.t === "grid") counts.grids++;
                else if (n.t === "button" || n.t === "toolbar" || n.t === "tag") counts.buttons++;
                else if (CONTAINER_TYPES[n.t]) counts.containers++;
                if (n.children) walk(n.children);
            });
        })(result.screen.nodes);
        return { ui: result.screen.ui, title: result.screen.title, width: result.screen.width, height: result.screen.height, counts: counts };
    }

    function outline(input, maxShapes) {
        var result = normalize(input);
        if (!result.ok) return null;
        var limit = maxShapes || 400;
        var shapes = [];
        var right = 0, bottom = 0;
        function add(kind, x, y, w, h) {
            if (shapes.length >= limit || w <= 0 || h <= 0) return;
            var shape = [kind, Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
            shapes.push(shape);
            right = Math.max(right, shape[1] + shape[3]);
            bottom = Math.max(bottom, shape[2] + shape[4]);
        }
        function textWidth(text, max) {
            return Math.max(16, Math.min(max, text.length * 6));
        }
        (function walk(nodes) {
            nodes.forEach(function (n) {
                if (FIELD_TYPES[n.t]) {
                    if (n.caption) {
                        if (!n.captionAbove && n.labelX != null && n.labelX < n.x) add("l", n.labelX, n.y + Math.max(0, (n.h - 8) / 2), textWidth(n.caption, n.x - n.labelX - 6), 8);
                        else add("l", n.labelX != null ? n.labelX : n.x, n.captionAbove ? n.labelY : n.y - 14, textWidth(n.caption, n.w), 8);
                    }
                    add("f", n.x, n.y, n.w, n.h);
                } else if (n.t === "checkbox" || n.t === "radio") {
                    add("f", n.x, n.y + Math.max(0, (n.h - 12) / 2), 12, 12);
                    add("l", n.x + 18, n.y + Math.max(0, (n.h - 8) / 2), textWidth(n.caption, 200), 8);
                } else if (n.t === "button" || n.t === "tag") {
                    add("b", n.x, n.y, n.w, n.h);
                } else if (n.t === "label") {
                    add("l", n.x, n.y + Math.max(0, (n.h - 8) / 2), n.w, 8);
                } else if (n.t === "image") {
                    add("i", n.x, n.y, n.w, n.h);
                } else if (n.t === "grid") {
                    add("g", n.x, n.y, n.w, Math.max(60, n.h));
                } else if (n.t === "tree") {
                    add("g", n.x, n.y, n.w, n.h);
                } else if (n.t === "splitter") {
                    if (n.vertical) add("i", n.x + n.split, n.y, METRICS.core.splitter, n.h);
                    else add("i", n.x, n.y + n.split, n.w, METRICS.core.splitter);
                    walk(n.children);
                } else if (n.t === "toolbar") {
                    n.buttons.forEach(function (b, i) { add("b", n.x + i * 66, n.y + 2, 60, Math.max(16, n.h - 4)); });
                } else if (CONTAINER_TYPES[n.t]) {
                    add(n.t === "popup" ? "p" : n.t === "tabs" ? "t" : n.t === "section" ? "s" : "c", n.x, n.y, n.w, n.h);
                    walk(n.children);
                }
            });
        })(result.screen.nodes);
        return { width: Math.max(1, right), height: Math.max(1, bottom), shapes: shapes };
    }

    return {
        KIND: KIND,
        VERSION: VERSION,
        LIMITS: LIMITS,
        METRICS: METRICS,
        INSETS: INSETS,
        SPLIT: SPLIT,
        menuIcon: iconFor,
        normalize: normalize,
        convert: convert,
        gridHeight: gridHeight,
        summarize: summarize,
        outline: outline
    };
});
