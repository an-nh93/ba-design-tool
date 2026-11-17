(function (window, $) {
    "use strict";

    var props = {};
    var openRows = {};
    var DEFAULT_COLOR = "#333333";

    function esc(value) {
        return builder.escapeHtml(value === null || value === undefined ? "" : String(value));
    }

    function attrs(map) {
        var out = "";
        Object.keys(map || {}).forEach(function (name) {
            var value = map[name];
            if (value === null || value === undefined || value === false) return;
            out += value === true ? " " + name : " " + name + '="' + esc(value) + '"';
        });
        return out;
    }

    function withClass(base, map) {
        var out = $.extend({}, map);
        out["class"] = base + (map && map["class"] ? " " + map["class"] : "");
        return out;
    }

    function content(value) {
        return value && typeof value === "object" ? value.html : esc(value);
    }

    function join(list) {
        return Array.prototype.slice.call(list).filter(function (part) { return part !== null && part !== undefined && part !== false; }).join("");
    }

    function block(cls) {
        return function () { return '<div class="' + cls + '">' + join(arguments) + "</div>"; };
    }

    props.esc = esc;

    function shell(title, meta, body, cls) {
        return '<div class="pp-panel' + (cls ? " " + cls : "") + '">' +
            '<header class="pp-head"><h3 class="pp-title">' + esc(title) + "</h3>" +
            (meta ? '<span class="pp-id" title="' + esc(meta) + '">' + esc(meta) + "</span>" : "") + "</header>" +
            body + "</div>";
    }

    function tabStrip(tabs, active) {
        return '<div class="pp-tabs">' +
            '<button type="button" class="pp-tabs-arrow" data-dir="-1" title="Xem các tab phía trước" hidden></button>' +
            '<div class="pp-tabs-strip">' + tabs.map(function (tab) {
                return '<button type="button" class="pp-tab' + (tab.key === active ? " is-active" : "") + '" data-tab="' + esc(tab.key) + '"' + (tab.title ? ' title="' + esc(tab.title) + '"' : "") + ">" +
                    esc(tab.text) + (tab.count === undefined ? "" : '<span class="pp-count">' + esc(tab.count) + "</span>") + "</button>";
            }).join("") + "</div>" +
            '<button type="button" class="pp-tabs-arrow" data-dir="1" title="Xem các tab phía sau" hidden></button>' +
            "</div>";
    }

    props.panel = function (title, meta, body, footer) {
        return shell(title, meta, '<div class="pp-body">' + body + "</div>" + (footer ? '<footer class="pp-foot">' + footer + "</footer>" : ""));
    };

    props.tabbedPanel = function (title, meta, tabs, active, panels) {
        return shell(title, meta, tabStrip(tabs, active) + panels, "pp-panel--tabs");
    };

    props.tabPanel = function (key, active, body, cls) {
        return '<div class="pp-tab-panel' + (cls ? " " + cls : "") + (key === active ? " is-active" : "") + '" data-tab="' + esc(key) + '">' + body + "</div>";
    };

    props.section = function (title, body, options) {
        var o = options || {};
        return '<section class="pp-section' + (o.cls ? " " + o.cls : "") + '">' +
            (title ? '<header class="pp-section-head"><span class="pp-section-title">' + esc(title) + "</span>" +
                (o.count === undefined ? "" : '<span class="pp-count">' + esc(o.count) + "</span>") + (o.action || "") + "</header>" : "") +
            '<div class="pp-section-body">' + body + "</div></section>";
    };

    props.line = block("pp-line");
    props.grid = block("pp-grid");
    props.bar = block("pp-bar");
    props.toggles = block("pp-toggles");

    props.field = function (label, control, cls, forId) {
        return '<div class="pp-field' + (cls ? " " + cls : "") + '">' +
            (label ? '<label class="pp-label"' + (forId ? ' for="' + esc(forId) + '"' : "") + ">" + content(label) + "</label>" : "") +
            control + "</div>";
    };

    props.text = function (map) {
        return "<input" + attrs(withClass("pp-input", $.extend({ type: "text" }, map))) + " />";
    };

    props.number = function (map) {
        return "<input" + attrs(withClass("pp-input", $.extend({ type: "number" }, map))) + " />";
    };

    props.select = function (map, options, value) {
        var current = value === null || value === undefined ? "" : String(value);
        return "<select" + attrs(withClass("pp-input", map)) + ">" + options.map(function (option) {
            return '<option value="' + esc(option[0]) + '"' + (String(option[0]) === current ? " selected" : "") + ">" + esc(option[1]) + "</option>";
        }).join("") + "</select>";
    };

    props.textarea = function (map, value) {
        return "<textarea" + attrs(withClass("pp-input", map)) + ">" + esc(value) + "</textarea>";
    };

    function tick(cls, type, map, label, checked) {
        var input = $.extend({ type: type, checked: !!checked }, map);
        delete input.title;
        return "<label" + attrs({ "class": cls, title: map && map.title }) + "><input" + attrs(input) + " /><span>" + content(label) + "</span></label>";
    }

    props.check = function (map, label, checked) { return tick("pp-check", "checkbox", map, label, checked); };
    props.radio = function (map, label, checked) { return tick("pp-check", "radio", map, label, checked); };
    props.toggle = function (map, label, checked) { return tick("pp-toggle", "checkbox", map, label, checked); };

    props.checks = function (items, cls) {
        return '<div class="pp-checks' + (cls ? " " + cls : "") + '">' + join(items) + "</div>";
    };

    props.normalizeColor = function (value) {
        var text = $.trim(value || "");
        var bare = text.charAt(0) === "#" ? text.slice(1) : text;
        if (/^[0-9a-f]{3}$/i.test(bare)) return ("#" + bare.charAt(0) + bare.charAt(0) + bare.charAt(1) + bare.charAt(1) + bare.charAt(2) + bare.charAt(2)).toUpperCase();
        if (/^[0-9a-f]{6}$/i.test(bare)) return ("#" + bare).toUpperCase();
        return text;
    };

    props.hexColor = function (value, fallback) {
        var color = value ? String(value) : "";
        return /^#[0-9a-fA-F]{6}$/.test(color) ? color : (fallback || DEFAULT_COLOR);
    };

    props.colorPick = function (map) {
        return "<input" + attrs(withClass("pp-color-pick", $.extend({ type: "color" }, map))) + " />";
    };

    props.color = function (pickMap, textMap, value, fallback, pairMap) {
        return "<span" + attrs(withClass("pp-color", $.extend({ "data-fallback": fallback }, pairMap))) + ">" +
            props.colorPick($.extend({ value: props.hexColor(value, fallback) }, pickMap)) +
            props.text(withClass("pp-color-text", $.extend({ value: value || fallback || "" }, textMap))) + "</span>";
    };

    props.swatches = function (colors, pickMap) {
        return '<div class="pp-swatches">' + colors.map(function (color) {
            return '<button type="button" class="pp-swatch" data-color="' + esc(color) + '" style="background:' + esc(color) + ';" title="' + esc(color) + '"></button>';
        }).join("") + props.colorPick(pickMap) + "</div>";
    };

    props.onColor = function (input, handler) {
        $(input).closest(".pp-color").on("pp:color", function (event, value) { handler(value); });
    };

    props.button = function (map, text) {
        return "<button" + attrs(withClass("pp-btn", $.extend({ type: "button" }, map))) + ">" + content(text) + "</button>";
    };

    props.saveButton = function (controlId) {
        return props.button({ "class": "pp-save", "data-control-id": controlId }, "Lưu control này vào DB");
    };

    props.hint = function (text) { return '<div class="pp-hint">' + content(text) + "</div>"; };
    props.empty = function (text) { return '<div class="pp-empty">' + content(text) + "</div>"; };
    props.barHint = function (text) { return '<span class="pp-bar-hint">' + esc(text) + "</span>"; };

    props.rows = function (map, rows) {
        return "<div" + attrs(withClass("pp-list", map)) + ">" + rows + "</div>";
    };

    props.scroll = function (map, body) {
        return "<div" + attrs(withClass("pp-list-wrap", map)) + ">" + body + "</div>";
    };

    props.list = function (map, rows) {
        return props.scroll(null, props.rows(map, rows));
    };

    props.matrix = function (columns, rowTitles, cell) {
        return '<table class="pp-matrix"><thead><tr><th></th>' + columns.map(function (column) {
            return '<th title="' + esc(column) + '">' + esc(column) + "</th>";
        }).join("") + "</tr></thead><tbody>" + rowTitles.map(function (title, rowIndex) {
            return "<tr><th>" + esc(title) + "</th>" + columns.map(function (column, columnIndex) {
                return "<td>" + cell(rowIndex, columnIndex) + "</td>";
            }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
    };

    props.listHead = function (cls, labels) {
        return '<div class="pp-list-head ' + esc(cls) + '">' + labels.map(function (label) { return "<span>" + esc(label) + "</span>"; }).join("") + "</div>";
    };

    props.row = function (options) {
        var o = options || {};
        return "<div" + attrs(withClass("pp-row" + (o.open ? " is-open" : ""), o.attrs)) + ">" +
            '<div class="pp-row-head">' + (o.head || "") + '<span class="pp-row-tools">' + (o.tools || "") + "</span></div>" +
            (o.body ? '<div class="pp-row-body">' + o.body + "</div>" : "") + "</div>";
    };

    props.rowNo = function (number) { return '<span class="pp-row-no">' + esc(number) + "</span>"; };

    props.iconButton = function (map, glyph) {
        return "<button" + attrs(withClass("pp-icon-btn", $.extend({ type: "button" }, map))) + ">" + esc(glyph || "") + "</button>";
    };

    props.rowToggle = function (title) {
        return props.iconButton({ "class": "pp-row-toggle", title: title });
    };

    function iconColorText(item) {
        var color = item && item.iconColor ? String(item.iconColor) : "";
        return /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30})$/.test(color) ? color : DEFAULT_COLOR;
    }

    function iconPreview(item) {
        var icon = item && item.icon ? String(item.icon) : "";
        if (!icon) return { html: "", name: "" };
        if (item.iconType === "glyphicon") {
            var glyph = (window.BOOTSTRAP_GLYPHICON_LIST || []).find(function (x) { return x["class"] === icon; });
            return {
                html: '<span class="' + esc(icon) + '" style="color:' + iconColorText(item) + ';"></span>',
                name: glyph ? (glyph.description || glyph["class"]) : icon
            };
        }
        var menu = (window.MENU_ICON_LIST || []).find(function (x) { return x.value === icon; });
        return { html: '<img src="' + esc(icon) + '" alt="" />', name: menu ? menu.text : (icon.split("/").pop() || icon) };
    }

    function iconNameHtml(item) {
        var info = iconPreview(item);
        return info.html ? info.html + "<span>" + esc(info.name) + "</span>" : '<span class="pp-icon-none">Chưa chọn biểu tượng</span>';
    }

    function iconCellHtml(item) {
        return iconPreview(item).html || '<span class="pp-icon-empty">＋</span>';
    }

    props.iconCell = function (item, key) {
        return '<button type="button" class="pp-icon-cell" title="Chọn biểu tượng" data-pp-icon="' + esc(key) + '" data-pp-icon-cmd="browse">' + iconCellHtml(item) + "</button>";
    };

    props.iconEditor = function (item, key, options) {
        var o = options || {};
        var html = props.line(props.field("Biểu tượng",
            '<div class="pp-icon-picker" data-pp-icon="' + esc(key) + '"><div class="pp-icon-name">' + iconNameHtml(item) + "</div>" +
            props.button({ "class": "pp-btn--primary", "data-pp-icon-cmd": "browse" }, "Chọn...") +
            (item.icon ? props.button({ "class": "pp-btn--danger", "data-pp-icon-cmd": "remove" }, "Bỏ") : "") + "</div>"));
        if (o.color !== false && item.iconType === "glyphicon" && item.icon) {
            html += props.line(props.field("Màu", props.color({}, {}, iconColorText(item), DEFAULT_COLOR, { "data-pp-icon": key })));
        }
        return html;
    };

    props.bindIcons = function (scope, handlers) {
        $(scope).attr("data-pp-icons", "").data("ppIcons", handlers);
    };

    function iconContext($el) {
        var $scope = $el.closest("[data-pp-icons]");
        var handlers = $scope.data("ppIcons");
        var key = $el.closest("[data-pp-icon]").attr("data-pp-icon");
        var item = handlers ? handlers.item(key) : null;
        return item ? { $scope: $scope, handlers: handlers, key: key, item: item } : null;
    }

    function setIcon(ctx, icon, iconType) {
        ctx.item.icon = icon || "";
        ctx.item.iconType = icon ? iconType : "";
        if (ctx.item.iconType === "glyphicon" && ctx.handlers.defaultColor && !ctx.item.iconColor) ctx.item.iconColor = DEFAULT_COLOR;
        ctx.handlers.changed(true);
    }

    function setIconColor(ctx, value) {
        if (ctx.item.iconType !== "glyphicon") return;
        ctx.item.iconColor = value;
        ctx.$scope.find("[data-pp-icon]").filter(function () { return this.getAttribute("data-pp-icon") === ctx.key; }).each(function () {
            var $el = $(this);
            if ($el.hasClass("pp-icon-cell")) $el.html(iconCellHtml(ctx.item));
            else $el.children(".pp-icon-name").html(iconNameHtml(ctx.item));
        });
        ctx.handlers.changed(false);
    }

    function colorEdited($input) {
        var $pair = $input.closest(".pp-color");
        if (!$pair.length) return;
        var value = props.normalizeColor($input.val()) || $pair.attr("data-fallback") || "";
        if (value) {
            if (/^#[0-9a-f]{6}$/i.test(value)) $pair.children(".pp-color-pick").val(value);
            $pair.children(".pp-color-text").val(value);
        }
        $pair.trigger("pp:color", [value]);
    }

    props.isRowOpen = function (ownerId, kind, index) {
        return openRows[ownerId + "|" + kind] === index;
    };

    props.setRowOpen = function (ownerId, kind, index) {
        var slot = ownerId + "|" + kind;
        if (index === null || index === undefined || index < 0) delete openRows[slot];
        else openRows[slot] = index;
    };

    function remapRowOpen(ownerId, kind, map) {
        var slot = ownerId + "|" + kind;
        if (slot in openRows) props.setRowOpen(ownerId, kind, map(openRows[slot]));
    }

    props.rowRemoved = function (ownerId, kind, index) {
        remapRowOpen(ownerId, kind, function (open) { return open === index ? -1 : (open > index ? open - 1 : open); });
    };

    props.rowInserted = function (ownerId, kind, index) {
        remapRowOpen(ownerId, kind, function (open) { return open >= index ? open + 1 : open; });
    };

    props.rowMoved = function (ownerId, kind, from, to) {
        remapRowOpen(ownerId, kind, function (open) { return open === from ? to : (open === to ? from : open); });
    };

    props.keepListScroll = function (shift, work) {
        var top = $("#propPanel .pp-tab-panel.is-active .pp-list-wrap").scrollTop() || 0;
        work();
        $("#propPanel .pp-tab-panel.is-active .pp-list-wrap").scrollTop(Math.max(0, top + (shift || 0)));
    };

    props.flashRow = function ($row, focusSelector) {
        $row.addClass("is-flash");
        if (focusSelector) $row.find(focusSelector).not(":disabled").trigger("focus");
        setTimeout(function () { $row.removeClass("is-flash"); }, 900);
    };

    props.activeTab = function () {
        return $("#propPanel .pp-tab.is-active").attr("data-tab") || null;
    };

    props.validTab = function (keys, wanted) {
        var key = wanted || props.activeTab();
        return keys.indexOf(key) >= 0 ? key : keys[0];
    };

    props.host = function () {
        var $panel = $("#propPanel");
        var $general = $panel.find('.pp-tab-panel[data-tab="general"]').first();
        return $general.length ? $general : $panel.find(".pp-body").first();
    };

    function updateArrows($strip) {
        var strip = $strip[0];
        if (!strip) return;
        var $arrows = $strip.siblings(".pp-tabs-arrow");
        $arrows.prop("hidden", strip.scrollWidth <= strip.clientWidth + 1);
        $arrows.filter('[data-dir="-1"]').prop("disabled", strip.scrollLeft <= 0);
        $arrows.filter('[data-dir="1"]').prop("disabled", strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1);
    }

    function revealTab($tab) {
        var strip = $tab.closest(".pp-tabs-strip")[0];
        var tab = $tab[0];
        if (!strip || !tab) return;
        var left = tab.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
        if (left < strip.scrollLeft) strip.scrollLeft = left;
        else if (left + tab.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = left + tab.offsetWidth - strip.clientWidth;
        updateArrows($(strip));
    }

    function showTab($tab) {
        var $panel = $tab.closest(".pp-panel");
        $panel.find(".pp-tab").removeClass("is-active");
        $panel.find(".pp-tab-panel").removeClass("is-active");
        $tab.addClass("is-active");
        $panel.find(".pp-tab-panel").filter(function () { return this.getAttribute("data-tab") === $tab.attr("data-tab"); }).addClass("is-active");
        revealTab($tab);
    }

    function refreshTabs() {
        $("#propPanel .pp-tabs-strip").each(function () {
            var $strip = $(this);
            $strip.off("scroll.pp").on("scroll.pp", function () { updateArrows($strip); });
            updateArrows($strip);
            revealTab($strip.find(".pp-tab.is-active"));
        });
    }

    props.render = function (html) {
        $("#propPanel").html(html);
        refreshTabs();
    };

    props.showMessage = function (text) {
        props.render(props.panel("Thuộc tính", null, '<p class="pp-message">' + esc(text) + "</p>"));
    };

    props.showEmpty = function () {
        props.showMessage("Chọn 1 control trên canvas để chỉnh thuộc tính.");
    };

    $(function () {
        var $panel = $("#propPanel");
        if (!$panel.length) return;

        $panel.on("click.pp", ".pp-tab", function () { showTab($(this)); });

        $panel.on("click.pp", ".pp-tabs-arrow", function () {
            var strip = $(this).siblings(".pp-tabs-strip")[0];
            strip.scrollLeft += parseInt($(this).attr("data-dir"), 10) * Math.max(80, Math.round(strip.clientWidth * 0.6));
        });

        $panel.on("click.pp", ".pp-row-toggle", function () {
            var $row = $(this).closest(".pp-row");
            var $list = $row.parent();
            var open = !$row.hasClass("is-open");
            props.setRowOpen($list.attr("data-pp-owner"), $list.attr("data-pp-kind"), open ? $list.children(".pp-row").index($row) : -1);
            if (open) $row.siblings(".is-open").removeClass("is-open");
            $row.toggleClass("is-open", open);
        });

        $panel.on("click.pp", ".pp-save", function () {
            builder.saveControlToServer($(this).attr("data-control-id"));
        });

        $panel.on("change.pp focusout.pp", ".pp-color-text", function () { colorEdited($(this)); });
        $panel.on("input.pp change.pp", ".pp-color-pick", function () { colorEdited($(this)); });

        $panel.on("pp:color.pp", ".pp-color[data-pp-icon]", function (event, value) {
            var ctx = iconContext($(this));
            if (ctx) setIconColor(ctx, value);
        });

        $panel.on("click.pp", "[data-pp-icon-cmd]", function () {
            var ctx = iconContext($(this));
            if (!ctx) return;
            if ($(this).attr("data-pp-icon-cmd") === "remove") {
                setIcon(ctx, "", "");
                return;
            }
            controlField.showIconPicker(ctx.item.iconType || "menu", function (icon, iconType) {
                if (iconType) setIcon(ctx, icon, iconType);
            });
        });

        if (window.ResizeObserver) new ResizeObserver(refreshTabs).observe($panel[0]);
        if (!$panel.children().length) props.showEmpty();
    });

    window.builderProps = props;
})(window, jQuery);
