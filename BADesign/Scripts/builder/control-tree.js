var controlTree = (function () {

    var CHECK_ICON = "/Content/images/tree-checked.png";
    var UNCHECK_ICON = "/Content/images/tree-unchecked.png";
    var CHECK_MODES = ["box", "mark", "none"];
    var ROW_HEIGHTS = { box: 28, mark: 25, none: 21 };

    function sampleNodes() {
        return [
            { text: "Company", level: 0, focused: true },
            { text: "Accounting", level: 1 },
            { text: "Accounts Payable", level: 2 },
            { text: "Accounts Receivable", level: 2 },
            { text: "Human Resources", level: 1 },
            { text: "Recruitment", level: 2 },
            { text: "Payroll", level: 2 },
            { text: "Sales", level: 1 }
        ];
    }

    function toInt(value, min, max, fallback) {
        var n = parseInt(value, 10);
        if (isNaN(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function isOn(value) {
        return value === true || /^(x|true|1|yes|y)$/i.test(String(value == null ? "" : value).trim());
    }

    function ensure(cfg) {
        if (CHECK_MODES.indexOf(cfg.treeCheck) < 0) cfg.treeCheck = "box";
        cfg.treeRowHeight = toInt(cfg.treeRowHeight, 16, 60, ROW_HEIGHTS[cfg.treeCheck]);
        cfg.treeIndent = toInt(cfg.treeIndent, 12, 80, 23);
        cfg.treeLines = cfg.treeLines !== false;
        cfg.treeHeader = !!cfg.treeHeader;
        cfg.treeScroll = !!cfg.treeScroll;
        if (typeof cfg.treeCaption !== "string") cfg.treeCaption = "Name";
        if (!Array.isArray(cfg.treeColumns)) cfg.treeColumns = [];
        if (!Array.isArray(cfg.treeNodes)) cfg.treeNodes = sampleNodes();
        var previous = -1;
        cfg.treeNodes.forEach(function (node) {
            node.level = Math.min(previous + 1, toInt(node.level, 0, 20, 0));
            previous = node.level;
        });
        return cfg;
    }

    function shape(nodes) {
        var info = [], stack = [], i, j;
        for (i = 0; i < nodes.length; i++) {
            var level = nodes[i].level, next = -1;
            for (j = i + 1; j < nodes.length; j++) {
                if (nodes[j].level <= level) { next = j; break; }
            }
            info.push({
                hasChildren: i + 1 < nodes.length && nodes[i + 1].level > level,
                hasNext: next >= 0 && nodes[next].level === level
            });
        }
        for (i = 0; i < nodes.length; i++) {
            stack.length = nodes[i].level;
            info[i].guides = stack.map(function (a) { return info[a].hasNext; });
            info[i].hidden = stack.some(function (a) { return nodes[a].open === false; });
            stack[nodes[i].level] = i;
        }
        return info;
    }

    function indentCell(cfg, kind) {
        var $cell = $('<span class="core-tree-indent"></span>').css("width", cfg.treeIndent + "px");
        if (!kind || !cfg.treeLines) return $cell;
        $cell.addClass("core-tree-line-" + kind).append('<i class="core-tree-v"></i>');
        if (kind !== "through") $cell.append('<i class="core-tree-h"></i>');
        return $cell;
    }

    function checkBox(on, disabled) {
        return '<span class="grid-cell-check' + (on ? " checked" : "") + (disabled ? " core-tree-check-off" : "") + '"></span>';
    }

    function draw($tree, cfg) {
        ensure(cfg);
        var nodes = cfg.treeNodes, info = shape(nodes), columns = cfg.treeColumns;
        $tree.attr("class", "core-tree core-tree-mode-" + cfg.treeCheck + (cfg.treeScroll ? " core-tree-scroll" : "")).empty();

        if (cfg.treeHeader) {
            var $head = $('<div class="core-tree-head"></div>');
            $('<span class="core-tree-head-name"></span>').text(cfg.treeCaption || "").appendTo($head);
            columns.forEach(function (col) {
                $('<span class="core-tree-col"></span>').css("width", (col.width || 70) + "px").text(col.caption || "").appendTo($head);
            });
            $tree.append($head);
        }

        var $body = $('<div class="core-tree-body"></div>').appendTo($tree);
        nodes.forEach(function (node, index) {
            if (info[index].hidden) return;
            var $row = $('<div class="core-tree-row"></div>').attr("data-index", index).css("height", cfg.treeRowHeight + "px");
            for (var depth = 0; depth < node.level; depth++) {
                $row.append(indentCell(cfg, info[index].guides[depth] ? "through" : ""));
            }
            var $joint = indentCell(cfg, index === 0 && info[index].hasNext ? "first" : (info[index].hasNext ? "mid" : "last"));
            if (info[index].hasChildren || node.open === false) {
                $joint.append('<span class="core-tree-toggle' + (node.open === false ? " closed" : "") + '"><i></i><i></i></span>');
            }
            $row.append($joint);

            var $cell = $('<span class="core-tree-cell"></span>');
            if (cfg.treeCheck === "box") {
                $cell.append('<span class="core-tree-check">' + checkBox(node.checked === true, false) + '</span>');
            } else if (cfg.treeCheck === "mark" && typeof node.checked === "boolean") {
                $('<img class="core-tree-mark" alt="" />').attr("src", node.checked ? CHECK_ICON : UNCHECK_ICON).appendTo($cell);
            }
            $('<span class="core-tree-text"></span>').text(node.text || "").appendTo($cell);
            columns.forEach(function (col, c) {
                var value = (node.cells || [])[c];
                var $col = $('<span class="core-tree-col"></span>').attr("data-col", c).css("width", (col.width || 70) + "px");
                if (col.type === "checkbox") $col.append(checkBox(isOn(value), !!col.disabled));
                else $col.text(value == null ? "" : String(value));
                $cell.append($col);
            });
            if (node.focused) $row.addClass("core-tree-focused");
            if (cfg.treeCheck === "box" && node.checked === true) $row.addClass("core-tree-checked");
            $row.append($cell);
            $body.append($row);
        });

        if (cfg.treeScroll) $tree.append('<span class="core-tree-bar"><i></i></span>');
    }

    function redraw(cfg) {
        var $tree = $('.canvas-control.page-field[data-id="' + cfg.id + '"] .core-tree');
        if ($tree.length) draw($tree, cfg);
    }

    function syncEditor(cfg) {
        var $nodes = $("#pfTreeNodes");
        if ($nodes.length && $nodes.attr("data-id") === cfg.id) $nodes.val(nodesToText(cfg));
    }

    function bindCanvas($tree, cfg) {
        var down = null;
        $tree.on("mousedown.coreTree", function (e) {
            down = { x: e.clientX, y: e.clientY };
        });
        $tree.on("click.coreTree", ".core-tree-toggle, .core-tree-check, .core-tree-col .grid-cell-check", function (e) {
            if (down && (Math.abs(e.clientX - down.x) > 3 || Math.abs(e.clientY - down.y) > 3)) return;
            var live = builder.getControlConfig(cfg.id) || cfg;
            var $target = $(this);
            var node = (live.treeNodes || [])[parseInt($target.closest(".core-tree-row").attr("data-index"), 10)];
            if (!node) return;
            if ($target.hasClass("core-tree-toggle")) {
                if (node.open === false) delete node.open;
                else node.open = false;
            } else if ($target.hasClass("core-tree-check")) {
                if (node.checked === true) delete node.checked;
                else node.checked = true;
            } else {
                var c = parseInt($target.closest(".core-tree-col").attr("data-col"), 10);
                node.cells = node.cells || [];
                node.cells[c] = !isOn(node.cells[c]);
            }
            draw($tree, live);
            syncEditor(live);
            builder.refreshJson();
        });
    }

    function build(cfg) {
        var $tree = $('<div class="core-tree"></div>');
        draw($tree, cfg);
        bindCanvas($tree, cfg);
        return $tree;
    }

    function nodesToText(cfg) {
        return (cfg.treeNodes || []).map(function (node) {
            var line = new Array(node.level + 1).join("  ");
            if (node.focused) line += "> ";
            if (node.open === false) line += "+ ";
            if (node.checked === true) line += "[x] ";
            else if (node.checked === false && cfg.treeCheck === "mark") line += "[ ] ";
            line += node.text || "";
            var cells = (node.cells || []).slice(0, (cfg.treeColumns || []).length);
            while (cells.length && (cells[cells.length - 1] == null || cells[cells.length - 1] === "" || cells[cells.length - 1] === false)) cells.pop();
            cells.forEach(function (value) {
                line += " | " + (value === true ? "x" : (value == null || value === false ? "" : value));
            });
            return line;
        }).join("\n");
    }

    function textToNodes(text, columns) {
        var nodes = [];
        String(text || "").split(/\r?\n/).forEach(function (raw) {
            if (!raw.trim()) return;
            var lead = /^[ \t]*/.exec(raw)[0].replace(/\t/g, "  ");
            var rest = raw.replace(/^[ \t]+/, "");
            var node = { text: "", level: Math.floor(lead.length / 2) };
            var marker;
            while ((marker = /^(>|\+|-|\[[xX ]?\])\s+/.exec(rest))) {
                if (marker[1] === ">") node.focused = true;
                else if (marker[1] === "+") node.open = false;
                else if (marker[1].charAt(0) === "[") node.checked = /x/i.test(marker[1]);
                rest = rest.substring(marker[0].length);
            }
            var parts = rest.split("|").map(function (part) { return part.trim(); });
            node.text = parts[0];
            if (parts.length > 1) {
                node.cells = parts.slice(1).map(function (value, c) {
                    return columns[c] && columns[c].type === "checkbox" ? isOn(value) : value;
                });
            }
            nodes.push(node);
        });
        return nodes;
    }

    function columnsToText(cfg) {
        return (cfg.treeColumns || []).map(function (col) {
            return (col.caption || "") + "|" + (col.width || 70) + "|" + (col.type === "checkbox" ? (col.disabled ? "checkbox-disabled" : "checkbox") : "text");
        }).join("\n");
    }

    function textToColumns(text) {
        var columns = [];
        String(text || "").split(/\r?\n/).forEach(function (raw) {
            if (!raw.trim()) return;
            var parts = raw.split("|").map(function (part) { return part.trim(); });
            var kind = (parts[2] || "text").toLowerCase();
            columns.push({
                caption: parts[0],
                width: toInt(parts[1], 20, 600, 70),
                type: kind.indexOf("check") === 0 ? "checkbox" : "text",
                disabled: kind === "checkbox-disabled"
            });
        });
        return columns;
    }

    function esc(text) {
        return $("<div>").text(text == null ? "" : String(text)).html().replace(/"/g, "&quot;");
    }

    function propertiesHtml(cfg) {
        ensure(cfg);
        var P = builderProps;
        return P.section("Tree",
            P.line(P.field("Kiểu ô chọn", P.select({ id: "pfTreeCheck" }, [["box", "Checkbox (chế độ chọn)"], ["mark", "Dấu tick xanh (chế độ xem)"], ["none", "Không có"]], cfg.treeCheck), null, "pfTreeCheck")) +
            P.grid(
                P.field("Cao dòng", P.number({ id: "pfTreeRowHeight", value: cfg.treeRowHeight }), "pp-field--num", "pfTreeRowHeight"),
                P.field("Thụt lề", P.number({ id: "pfTreeIndent", value: cfg.treeIndent }), "pp-field--num", "pfTreeIndent")) +
            P.checks([P.check({ id: "pfTreeLines" }, "Đường kẻ", cfg.treeLines), P.check({ id: "pfTreeScroll" }, "Thanh cuộn", cfg.treeScroll)], "pp-checks--cols2") +
            P.line(P.field("Các nút của cây", P.textarea({ id: "pfTreeNodes", "data-id": cfg.id, "class": "pp-input--mono pp-input--tall", spellcheck: "false", wrap: "off" }, nodesToText(cfg)) +
                P.hint({ html: "Mỗi dòng một nút. Thụt 2 dấu cách cho mỗi cấp. Ký hiệu tùy chọn đặt trước chữ: <b>&gt;</b> dòng đang chọn, <b>+</b> nhánh đang đóng, <b>[x]</b> đã tick, <b>[ ]</b> tick xám (chế độ xem). Giá trị cột phụ đặt sau <b>|</b> (x = đã tick)." }), "pp-field--stack", "pfTreeNodes")) +
            P.line(P.field("Cột phụ, mỗi dòng một cột: Tiêu đề|Rộng|checkbox, checkbox-disabled hoặc text", P.textarea({ id: "pfTreeColumns", "class": "pp-input--mono", rows: 2, spellcheck: "false" }, columnsToText(cfg)), "pp-field--stack", "pfTreeColumns")) +
            P.line(
                P.check({ id: "pfTreeHeader" }, "Dòng tiêu đề", cfg.treeHeader),
                P.field(null, P.text({ id: "pfTreeCaption", placeholder: "Tiêu đề cột tên", value: cfg.treeCaption }))));
    }

    function bindProperties(cfg) {
        function commit() {
            redraw(cfg);
            builder.refreshJson();
        }
        $("#pfTreeCheck").on("change", function () {
            var usedDefault = cfg.treeRowHeight === ROW_HEIGHTS[cfg.treeCheck];
            cfg.treeCheck = this.value;
            if (usedDefault) {
                cfg.treeRowHeight = ROW_HEIGHTS[cfg.treeCheck];
                $("#pfTreeRowHeight").val(cfg.treeRowHeight);
            }
            $("#pfTreeNodes").val(nodesToText(cfg));
            commit();
        });
        $("#pfTreeRowHeight").on("change", function () {
            cfg.treeRowHeight = toInt(this.value, 16, 60, cfg.treeRowHeight);
            this.value = cfg.treeRowHeight;
            commit();
        });
        $("#pfTreeIndent").on("change", function () {
            cfg.treeIndent = toInt(this.value, 12, 80, cfg.treeIndent);
            this.value = cfg.treeIndent;
            commit();
        });
        $("#pfTreeLines").on("change", function () { cfg.treeLines = this.checked; commit(); });
        $("#pfTreeScroll").on("change", function () { cfg.treeScroll = this.checked; commit(); });
        $("#pfTreeHeader").on("change", function () { cfg.treeHeader = this.checked; commit(); });
        $("#pfTreeCaption").on("change", function () { cfg.treeCaption = this.value; commit(); });
        $("#pfTreeNodes").on("change", function () {
            cfg.treeNodes = textToNodes(this.value, cfg.treeColumns || []);
            ensure(cfg);
            this.value = nodesToText(cfg);
            commit();
        });
        $("#pfTreeColumns").on("change", function () {
            cfg.treeColumns = textToColumns(this.value);
            this.value = columnsToText(cfg);
            commit();
        });
    }

    return {
        ensure: ensure,
        build: build,
        redraw: redraw,
        propertiesHtml: propertiesHtml,
        bindProperties: bindProperties,
        nodesToText: nodesToText,
        textToNodes: textToNodes
    };
})();

if (typeof window !== "undefined") {
    window.controlTree = controlTree;
}
