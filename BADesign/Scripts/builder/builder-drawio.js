(function (root, factory) {
    var api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.builderDrawio = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    var LIMITS = { file: 40 * 1024 * 1024, xmlNodes: 60000, depth: 64, cells: 4000, pages: 60, nesting: 6, text: 200 };
    var NOT_DRAWIO = "Đây không phải file draw.io. Hãy chọn file .drawio hoặc file XML xuất từ draw.io.";
    var ENTITIES = { lt: "<", gt: ">", amp: "&", quot: "\"", apos: "'", nbsp: " " };
    var FIELD_KINDS = { text: 1, number: 1, date: 1, combo: 1, memo: 1 };
    var CONTAINER_KINDS = { group: 1, section: 1, popup: 1 };
    var HIDDEN_KINDS = { skip: 1, line: 1, tablePart: 1, caret: 1, baked: 1, flat: 1 };
    var DATE_TEXT = /^(dd|mm|yyyy|\d{1,4})[\/\-.](dd|mm|\d{1,2})[\/\-.](dd|yyyy|\d{2,4})$|(^|\s)(date|ngày)(\s|$)/i;
    var REQUIRED_MARK = /\s*\(?\*\)?\s*:?\s*$/;
    var IMAGE_DATA = /^data:image\/(png|jpe?g|gif|webp)(?:;base64)?,([A-Za-z0-9+\/=]+)$/;

    var SHAPE_RULES = [
        { test: /^mxgraph\.mockup\.buttons\.(button|multiButton)$/, kind: "button" },
        { test: /^mxgraph\.mockup\.forms\.comboBox$|^mxgraph\.bootstrap\.(combo|comboBox)$/, kind: "combo" },
        { test: /^mxgraph\.mockup\.forms\.spinner$/, kind: "number" },
        { test: /^mxgraph\.mockup\.forms\.(pwField|searchBox)$|^mxgraph\.mockup\.text\.textBox$/, kind: "text" },
        { test: /^mxgraph\.mockup\.containers\.(window|browserWindow|alertBox)$|^mxgraph\.bootstrap\.window$/, kind: "popup" },
        { test: /^mxgraph\.mockup\.containers\.(group|marginRect|marginRect2|rrect)$/, kind: "group" },
        { test: /^mxgraph\.bootstrap\.checkbox2?$/, kind: "checkbox" },
        { test: /^mxgraph\.bootstrap\.radioButton2?$/, kind: "radio" },
        { test: /^mxgraph\.(mockup\.containers|bootstrap)\.anchor$/, kind: "label" },
        { test: /^mxgraph\.ios7\.misc\.(down|up)$|^mxgraph\.arrows2\.arrow$/, kind: "triangle" },
        { test: /^(line|mxgraph\.mockup\.markup\.line|mxgraph\.mockup\.forms\.splitter)$/, kind: "line" },
        { test: /^(note|note2|callout|mxgraph\.mockup\.text\.(callout|stickyNote2?)|mxgraph\.mockup\.markup\..+)$/, kind: "unsupported:note" },
        { test: /^mxgraph\.mockup\.(graphics|misc|navigation)\..+$/, kind: "unsupported:image" }
    ];
    var NAME_RULES = {
        text: "label", swimlane: "section", group: "flat", line: "line", edgeLabel: "skip",
        ellipse: "ellipse", triangle: "triangle", rhombus: "unsupported:shape", hexagon: "unsupported:shape", cloud: "unsupported:shape"
    };

    function fail(message) {
        var error = new Error(message);
        error.drawio = true;
        return error;
    }

    function decodeEntities(text) {
        if (text.indexOf("&") < 0) return text;
        return text.replace(/&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z]{2,8});/g, function (all, name) {
            if (name.charAt(0) === "#") {
                var hex = name.charAt(1) === "x" || name.charAt(1) === "X";
                var code = hex ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
                if (!(code > 0) || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return " ";
                return String.fromCodePoint(code);
            }
            return Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : all;
        });
    }

    function isSpace(ch) {
        return ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
    }

    function parseXml(text) {
        var length = text.length, pos = 0, count = 0;
        var top = { name: "#document", attrs: {}, children: [], text: "" };
        var stack = [top];
        while (pos < length) {
            var current = stack[stack.length - 1];
            var lt = text.indexOf("<", pos);
            if (lt < 0) { current.text += decodeEntities(text.slice(pos)); break; }
            if (lt > pos) current.text += decodeEntities(text.slice(pos, lt));
            var end;
            if (text.substr(lt, 4) === "<!--") {
                end = text.indexOf("-->", lt + 4);
                if (end < 0) throw fail("File XML bị hỏng: chú thích không có phần kết.");
                pos = end + 3;
                continue;
            }
            if (text.substr(lt, 9) === "<![CDATA[") {
                end = text.indexOf("]]>", lt + 9);
                if (end < 0) throw fail("File XML bị hỏng: khối CDATA không có phần kết.");
                current.text += text.slice(lt + 9, end);
                pos = end + 3;
                continue;
            }
            if (text.substr(lt, 2) === "<?") {
                end = text.indexOf("?>", lt + 2);
                if (end < 0) throw fail("File XML bị hỏng.");
                pos = end + 2;
                continue;
            }
            if (text.charAt(lt + 1) === "!") throw fail("File có khai báo DOCTYPE nên không được đọc.");
            if (text.charAt(lt + 1) === "/") {
                end = text.indexOf(">", lt);
                if (end < 0 || stack.length < 2 || current.name !== text.slice(lt + 2, end).trim()) throw fail("File XML bị hỏng: thẻ đóng không khớp.");
                stack.pop();
                pos = end + 1;
                continue;
            }

            var i = lt + 1;
            while (i < length && !isSpace(text.charAt(i)) && text.charAt(i) !== ">" && text.charAt(i) !== "/") i++;
            var node = { name: text.slice(lt + 1, i), attrs: {}, children: [], text: "" };
            if (!node.name) throw fail("File XML bị hỏng.");
            var closed = false, opened = false;
            while (i < length && !opened) {
                var ch = text.charAt(i);
                if (isSpace(ch)) { i++; continue; }
                if (ch === ">") { opened = true; i++; break; }
                if (ch === "/" && text.charAt(i + 1) === ">") { closed = true; opened = true; i += 2; break; }
                var nameStart = i;
                while (i < length && text.charAt(i) !== "=" && !isSpace(text.charAt(i)) && text.charAt(i) !== ">" && text.charAt(i) !== "/") i++;
                var attr = text.slice(nameStart, i);
                while (i < length && isSpace(text.charAt(i))) i++;
                if (!attr || text.charAt(i) !== "=") throw fail("File XML bị hỏng: thuộc tính không có giá trị.");
                i++;
                while (i < length && isSpace(text.charAt(i))) i++;
                var quote = text.charAt(i);
                if (quote !== "\"" && quote !== "'") throw fail("File XML bị hỏng: giá trị thuộc tính thiếu dấu nháy.");
                var valueEnd = text.indexOf(quote, i + 1);
                if (valueEnd < 0) throw fail("File XML bị hỏng: giá trị thuộc tính thiếu dấu nháy đóng.");
                if (attr !== "__proto__") node.attrs[attr] = decodeEntities(text.slice(i + 1, valueEnd));
                i = valueEnd + 1;
            }
            if (!opened) throw fail("File XML bị hỏng: thẻ không có phần kết.");
            if (++count > LIMITS.xmlNodes) throw fail("File có quá nhiều phần tử.");
            current.children.push(node);
            if (!closed) {
                stack.push(node);
                if (stack.length > LIMITS.depth) throw fail("File XML lồng quá sâu.");
            }
            pos = i;
        }
        if (stack.length !== 1) throw fail("File XML bị hỏng: thiếu thẻ đóng.");
        return top;
    }

    function child(node, name) {
        for (var i = 0; i < node.children.length; i++) if (node.children[i].name === name) return node.children[i];
        return null;
    }

    function base64Bytes(text) {
        var clean = String(text).replace(/[^A-Za-z0-9+\/]/g, "");
        var bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
        var table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var out = 0, buffer = 0, bits = 0;
        for (var i = 0; i < clean.length; i++) {
            buffer = ((buffer << 6) | table.indexOf(clean.charAt(i))) & 0xFFFFFF;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                bytes[out++] = (buffer >> bits) & 0xFF;
            }
        }
        return bytes.subarray(0, out);
    }

    function latin1(bytes) {
        var parts = [];
        for (var i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)));
        return parts.join("");
    }

    function pageName(node, index) {
        return String(node.attrs.name || "").trim() || "Trang " + (index + 1);
    }

    function openText(text) {
        var source = String(text == null ? "" : text).replace(/^﻿/, "").trim();
        if (!source) throw fail("File trống.");
        if (source.length > LIMITS.file) throw fail("File quá lớn (tối đa 40 MB).");
        if (/^%3C(mxGraphModel|mxfile)/i.test(source)) {
            try { source = decodeURIComponent(source); } catch (e) { throw fail(NOT_DRAWIO); }
        }
        if (source.charAt(0) !== "<") throw fail(NOT_DRAWIO);
        var first = parseXml(source).children[0];
        if (!first) throw fail(NOT_DRAWIO);
        if (first.name === "svg" && first.attrs.content) return openText(first.attrs.content);
        if (first.name === "mxGraphModel") return [{ name: "Trang 1", model: first }];
        if (first.name !== "mxfile") throw fail(NOT_DRAWIO);
        var pages = [];
        first.children.forEach(function (node) {
            if (node.name !== "diagram" || pages.length >= LIMITS.pages) return;
            var model = child(node, "mxGraphModel");
            pages.push(model ? { name: pageName(node, pages.length), model: model } : { name: pageName(node, pages.length), data: node.text.trim() });
        });
        if (!pages.length) throw fail("File draw.io không có trang nào.");
        return pages;
    }

    function inflatePage(page, inflate) {
        if (page.model) return Promise.resolve(page);
        if (!page.data) return Promise.reject(fail("Trang '" + page.name + "' không có nội dung."));
        if (typeof inflate !== "function") return Promise.reject(fail("Trình duyệt này không giải nén được file draw.io. Hãy dùng Chrome hoặc Edge bản mới."));
        return new Promise(function (resolve) { resolve(inflate(base64Bytes(page.data))); }).then(function (bytes) {
            var xml;
            try { xml = decodeURIComponent(latin1(bytes)); } catch (e) { throw fail("Không đọc được nội dung trang '" + page.name + "'."); }
            var model = parseXml(xml).children[0];
            if (!model || model.name !== "mxGraphModel") throw fail("Không đọc được nội dung trang '" + page.name + "'.");
            return { name: page.name, model: model };
        }, function () {
            throw fail("Không giải nén được trang '" + page.name + "'. File có thể bị hỏng.");
        });
    }

    function read(text, inflate) {
        var pages;
        try { pages = openText(text); } catch (error) { return Promise.reject(error); }
        return Promise.all(pages.map(function (page) { return inflatePage(page, inflate); }));
    }

    function textFromPng(bytes) {
        var signature = [137, 80, 78, 71, 13, 10, 26, 10];
        for (var s = 0; s < signature.length; s++) if (bytes[s] !== signature[s]) throw fail(NOT_DRAWIO);
        var pos = 8;
        while (pos + 12 <= bytes.length) {
            var size = ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
            var type = latin1(bytes.subarray(pos + 4, pos + 8));
            var start = pos + 8;
            if (start + size > bytes.length) break;
            if (type === "tEXt") {
                var body = bytes.subarray(start, start + size);
                var zero = Array.prototype.indexOf.call(body, 0);
                if (zero > 0 && latin1(body.subarray(0, zero)) === "mxfile") {
                    try { return decodeURIComponent(latin1(body.subarray(zero + 1))); } catch (e) { throw fail(NOT_DRAWIO); }
                }
            }
            if (type === "IEND") break;
            pos = start + size + 4;
        }
        throw fail("Ảnh PNG này không kèm sơ đồ draw.io. Trong draw.io hãy lưu file dạng .drawio, hoặc xuất PNG có chọn Include a copy of my diagram.");
    }

    function parseStyle(text) {
        var style = { names: [], props: Object.create(null) };
        String(text || "").split(";").forEach(function (part) {
            var item = part.trim();
            if (!item) return;
            var eq = item.indexOf("=");
            if (eq < 0) style.names.push(item);
            else style.props[item.slice(0, eq)] = item.slice(eq + 1);
        });
        return style;
    }

    function number(value) {
        var n = parseFloat(value);
        return isFinite(n) ? n : 0;
    }

    function readCells(model) {
        var rootNode = child(model, "root");
        if (!rootNode) throw fail("Trang không có hình nào.");
        var cells = [], byId = Object.create(null), truncated = false;
        rootNode.children.forEach(function (node) {
            var cellNode = node.name === "mxCell" ? node : child(node, "mxCell");
            if (!cellNode) return;
            if (cells.length >= LIMITS.cells) { truncated = true; return; }
            var wrapper = node === cellNode ? null : node;
            var geo = child(cellNode, "mxGeometry");
            var cell = {
                id: String((wrapper || cellNode).attrs.id || ""),
                parent: String(cellNode.attrs.parent || ""),
                value: String(wrapper ? (wrapper.attrs.label || "") : (cellNode.attrs.value || "")),
                style: parseStyle(cellNode.attrs.style),
                vertex: cellNode.attrs.vertex === "1",
                edge: cellNode.attrs.edge === "1",
                visible: cellNode.attrs.visible !== "0",
                relative: !!geo && geo.attrs.relative === "1",
                x: geo ? number(geo.attrs.x) : 0,
                y: geo ? number(geo.attrs.y) : 0,
                w: geo ? number(geo.attrs.width) : 0,
                h: geo ? number(geo.attrs.height) : 0,
                order: cells.length,
                kids: []
            };
            cells.push(cell);
            if (cell.id) byId[cell.id] = cell;
        });
        cells.forEach(function (cell) {
            var parent = byId[cell.parent];
            if (parent && parent !== cell) { cell.up = parent; parent.kids.push(cell); }
        });
        cells.forEach(function (cell) {
            var ax = cell.x, ay = cell.y, hidden = !cell.visible, steps = 0;
            for (var p = cell.up; p; p = p.up) {
                if (++steps > LIMITS.depth) { hidden = true; break; }
                if (p.vertex) { ax += p.x; ay += p.y; }
                if (!p.visible) hidden = true;
            }
            cell.ax = ax;
            cell.ay = ay;
            cell.hidden = hidden;
        });
        return { cells: cells, truncated: truncated };
    }

    function prop(cell, key) {
        var value = cell.style.props[key];
        return value == null ? "" : value;
    }

    function labelText(cell) {
        var text = cell.value;
        if (!text) {
            var main = prop(cell, "mainText") || prop(cell, "buttonText") || prop(cell, "linkText");
            return main ? main.split(",").map(function (part) { return part.replace(/^[+\-_]/, "").trim(); }).filter(Boolean).join(" ") : "";
        }
        if (prop(cell, "html") === "1" && text.indexOf("<") >= 0) {
            text = text.replace(/<(br|\/div|\/p|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, "");
        }
        return decodeEntities(text).replace(/ /g, " ").replace(/[ \t\r\f\v]+/g, " ").replace(/ *\n+ */g, "\n").trim();
    }

    function color(value) {
        var text = String(value || "").trim();
        if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();
        if (/^#[0-9a-fA-F]{3}$/.test(text)) return ("#" + text.charAt(1) + text.charAt(1) + text.charAt(2) + text.charAt(2) + text.charAt(3) + text.charAt(3)).toLowerCase();
        return null;
    }

    function imageSource(cell) {
        var value = prop(cell, "image");
        if (!value) return null;
        var match = IMAGE_DATA.exec(value);
        if (!match) {
            var head = /^data:image\/(png|jpe?g|gif|webp)$/.exec(value);
            var tail = cell.style.names.filter(function (name) { return /^base64,[A-Za-z0-9+\/=]+$/.test(name); })[0];
            if (!head || !tail) return null;
            match = [null, head[1], tail.slice(7)];
        }
        return "data:image/" + (match[1] === "jpg" ? "jpeg" : match[1]) + ";base64," + match[2];
    }

    function classify(cell) {
        var shape = prop(cell, "shape");
        if (shape === "image" || prop(cell, "image") || cell.style.names.indexOf("image") >= 0) return imageSource(cell) ? "image" : "unsupported:image";
        for (var i = 0; i < SHAPE_RULES.length; i++) {
            if (shape && SHAPE_RULES[i].test.test(shape)) return SHAPE_RULES[i].kind;
        }
        if (shape === "table") return "table";
        if (shape === "tableRow" || shape === "partialRectangle") return "tablePart";
        for (var n = 0; n < cell.style.names.length; n++) {
            var rule = NAME_RULES[cell.style.names[n]];
            if (rule) return rule;
        }
        if (shape && !/^mxgraph\.(mockup|bootstrap)\.|^(rect|rectangle|label|ext|process|mxgraph\.basic\.rect)$/.test(shape)) return "unsupported:shape";
        return "box";
    }

    function makeBox(cell) {
        var fill = prop(cell, "fillColor"), stroke = prop(cell, "strokeColor");
        var kind = classify(cell);
        return {
            cell: cell, kind: kind, order: cell.order, text: labelText(cell),
            x: cell.ax, y: cell.ay, w: cell.w, h: cell.h,
            align: prop(cell, "align") || "center",
            valign: prop(cell, "verticalAlign") || "middle",
            bold: (parseInt(prop(cell, "fontStyle"), 10) & 1) === 1,
            fontSize: number(prop(cell, "fontSize")) || 12,
            fontColor: color(prop(cell, "fontColor")),
            fill: fill !== "none", stroke: stroke !== "none",
            fillColor: color(fill), strokeColor: color(stroke),
            strokeWidth: Math.max(1, Math.min(8, number(prop(cell, "strokeWidth")) || 1)),
            rounded: prop(cell, "rounded") === "1",
            src: kind === "image" ? imageSource(cell) : null,
            layers: [], kids: [], up: null, base: null
        };
    }

    function inside(outer, inner) {
        return inner.x >= outer.x - 2 && inner.y >= outer.y - 2 && inner.x + inner.w <= outer.x + outer.w + 2 && inner.y + inner.h <= outer.y + outer.h + 2;
    }

    function contains(outer, inner) {
        return inside(outer, inner) && inner.w * inner.h < outer.w * outer.h * 0.9;
    }

    function resolveGeneric(box) {
        if (box.kind === "ellipse") box.kind = box.w <= 24 && box.h <= 24 ? "radio" : "unsupported:shape";
        if (box.kind === "triangle") box.kind = box.w <= 24 && box.h <= 24 ? "caret" : "unsupported:shape";
        if (box.kind !== "box") return;
        if (!box.fill && !box.stroke) { box.kind = box.text ? "label" : "skip"; return; }
        if (box.w <= 24 && box.h <= 24 && box.stroke) { box.kind = "checkbox"; return; }
        var white = !box.fillColor || box.fillColor === "#ffffff";
        if (box.base) {
            if (!box.text) box.kind = box.stroke && box.fill && white && box.h >= 16 && box.h <= 44 && box.w <= 500 ? "text" : "patch";
            else box.kind = box.align === "center" && box.h <= 44 ? "button" : "patchLabel";
            return;
        }
        if (!box.stroke && !box.text) { box.kind = white ? "skip" : "patch"; return; }
        if (box.h <= 44) {
            box.kind = box.text && box.align === "center" ? "button" : "text";
            return;
        }
        if (box.text && box.align === "center" && box.h <= 60 && box.w <= 320) { box.kind = "button"; return; }
        if (box.text && box.align !== "center" && box.valign === "top" && box.h <= 200) { box.kind = "memo"; return; }
        box.kind = "group";
    }

    function layerOf(box, origin) {
        var layer = { x: Math.round(box.x - origin.x), y: Math.round(box.y - origin.y), w: Math.max(1, Math.round(box.w)), h: Math.max(1, Math.round(box.h)) };
        if (box.kind === "image") { layer.kind = "image"; layer.src = box.src; return layer; }
        layer.kind = "rect";
        layer.fill = box.fill ? (box.fillColor || "#ffffff") : null;
        layer.stroke = box.stroke ? (box.strokeColor || "#000000") : null;
        layer.strokeWidth = box.strokeWidth;
        layer.rounded = box.rounded;
        return layer;
    }

    function tableGrid(box, opts) {
        var rows = box.cell.kids.filter(function (kid) { return !kid.hidden && prop(kid, "shape") === "tableRow"; })
            .sort(function (a, b) { return a.ay - b.ay; });
        if (!rows.length) return null;
        function cellsOf(row) {
            return row.kids.filter(function (kid) { return !kid.hidden; }).sort(function (a, b) { return a.ax - b.ax; });
        }
        var header = cellsOf(rows[0]);
        if (!header.length) return null;
        var data = rows.slice(1, 11).map(function (row) { return cellsOf(row).slice(0, header.length).map(labelText); });
        var node = {
            t: "grid", x: Math.round(box.x), y: Math.round(box.y), w: Math.max(1, Math.round(box.w)), h: Math.max(1, Math.round(box.h)),
            title: "", rows: Math.max(1, data.length), data: data,
            columns: header.map(function (cell) { return { caption: labelText(cell), w: Math.max(20, Math.round(cell.w)) }; })
        };
        (box.checkColumns || []).forEach(function (index) { if (node.columns[index]) node.columns[index].type = "checkbox"; });
        if (box.base && typeof opts.gridHeight === "function") {
            var probe = { rows: node.rows, title: "", toolbar: [], language: false, groupPanel: false, viewData: false, filterRow: false, pager: false };
            while (probe.rows > 1 && opts.gridHeight(opts.ui, probe) > node.h) probe.rows--;
            if (probe.rows < node.rows) opts.stats.trimmedTables++;
            node.rows = probe.rows;
            node.data = data.slice(0, probe.rows);
        }
        if (!node.data.length) delete node.data;
        return node;
    }

    function textWidth(box) {
        return Math.min(box.w, Math.ceil(box.text.length * box.fontSize * 0.58) + 4);
    }

    function labelRect(box) {
        var width = Math.max(10, textWidth(box));
        var height = Math.min(box.h, Math.ceil(box.fontSize * 1.4));
        var x = box.x, y = box.y;
        if (box.align === "center") x += (box.w - width) / 2;
        else if (box.align === "right") x += box.w - width;
        else x += Math.min(4, Math.max(0, box.w - width));
        if (box.valign === "middle") y += (box.h - height) / 2;
        else if (box.valign === "bottom") y += box.h - height;
        return { x: x, y: y, w: width, h: Math.max(8, height) };
    }

    function mergeInnerLabels(siblings) {
        siblings.forEach(function (box) {
            if (box.kind !== "group" || box.cell.kids.length || box.h > 60) return;
            var inner = box.kids;
            if (!inner.length || inner.length > 2 || inner.some(function (kid) { return kid.kind !== "label"; })) return;
            var label = inner[0];
            var centered = Math.abs((label.x + label.w / 2) - (box.x + box.w / 2)) <= Math.max(6, box.w * 0.1) && label.align !== "left";
            box.text = inner.map(function (kid) { return kid.text; }).join(" ");
            box.kind = centered ? "button" : (box.h <= 44 ? "text" : "memo");
            box.align = centered ? "center" : "left";
            box.kids = [];
        });
    }

    function attachCarets(siblings) {
        siblings.forEach(function (caret) {
            if (caret.kind !== "caret") return;
            var cx = caret.x + caret.w / 2, cy = caret.y + caret.h / 2;
            var host = siblings.filter(function (box) {
                return (box.kind === "text" || box.kind === "button") && cx > box.x + box.w - 36 && cx < box.x + box.w + 2 && cy > box.y && cy < box.y + box.h;
            })[0];
            if (host) host.kind = "combo";
        });
    }

    function attachCaptions(siblings) {
        var labels = siblings.filter(function (box) { return box.kind === "label" && box.text; });
        siblings.forEach(function (field) {
            var check = field.kind === "checkbox" || field.kind === "radio";
            if (!FIELD_KINDS[field.kind] && !check) return;
            if (check) {
                if (field.text) return;
                var right = labels.filter(function (label) {
                    var area = labelRect(label);
                    return !label.used && area.x >= field.x + field.w - 2 && area.x - (field.x + field.w) <= 14
                        && Math.abs((area.y + area.h / 2) - (field.y + field.h / 2)) <= Math.max(area.h, field.h) / 2;
                })[0];
                if (right) { field.text = right.text; field.captionWidth = labelRect(right).w; right.used = true; }
                return;
            }
            var best = null, bestGap = Infinity, above = null;
            labels.forEach(function (label) {
                if (label.used) return;
                var area = labelRect(label);
                var gap = field.x - (area.x + area.w);
                var sameRow = Math.abs((area.y + area.h / 2) - (field.y + field.h / 2)) <= Math.max(area.h, field.h) / 2;
                if (sameRow && gap >= -4 && gap <= 260 && gap < bestGap) {
                    var blocked = siblings.some(function (other) {
                        return other !== field && other !== label && !HIDDEN_KINDS[other.kind] && other.kind !== "label" && other.kind !== "image"
                            && other.x < field.x && other.x + other.w > area.x + area.w && other.y < field.y + field.h && other.y + other.h > field.y;
                    });
                    if (!blocked) { best = label; bestGap = gap; }
                }
                var over = field.y - (area.y + area.h);
                if (!above && over >= -2 && over <= 26 && area.x >= field.x - 6 && area.x < field.x + field.w * 0.6) above = label;
            });
            var chosen = best || above;
            if (!chosen) return;
            var rect = labelRect(chosen);
            chosen.used = true;
            field.caption = chosen.text.replace(REQUIRED_MARK, "");
            field.required = /\*/.test(chosen.text.slice(field.caption.length));
            if (best) field.labelX = Math.round(rect.x);
            else { field.captionAbove = true; field.labelY = Math.round(rect.y); field.labelW = Math.round(rect.w); field.labelH = Math.round(rect.h); }
        });
    }

    function toNode(box, depth, ctx) {
        var rect = { x: Math.round(box.x), y: Math.round(box.y), w: Math.max(1, Math.round(box.w)), h: Math.max(1, Math.round(box.h)) };
        var stats = ctx.stats;
        var node;
        if (FIELD_KINDS[box.kind]) {
            var kind = box.kind;
            if (kind === "text" && (DATE_TEXT.test(box.text) || DATE_TEXT.test(box.caption || ""))) kind = "date";
            node = { t: kind, x: rect.x, y: rect.y, w: rect.w, h: rect.h, caption: box.caption || "", required: box.required === true, disabled: false };
            if (box.text) node.placeholder = box.text;
            if (box.labelX != null) node.labelX = box.labelX;
            if (box.captionAbove) { node.captionAbove = true; node.labelY = box.labelY; node.labelW = box.labelW; node.labelH = box.labelH; }
        } else if (box.kind === "checkbox" || box.kind === "radio") {
            var captionWidth = box.captionWidth || Math.ceil(box.text.length * box.fontSize * 0.58);
            node = { t: box.kind, x: rect.x, y: rect.y, w: rect.w + (box.text ? 6 + captionWidth : 0), h: Math.max(rect.h, 18), caption: box.text, disabled: false };
        } else if (box.kind === "button") {
            node = { t: "button", x: rect.x, y: rect.y, w: rect.w, h: rect.h, text: box.text, disabled: false };
            if (box.fillColor) node.bg = box.fillColor;
            if (box.fontColor) node.fg = box.fontColor;
            if (box.strokeColor) node.border = box.strokeColor;
        } else if (box.kind === "label") {
            if (!box.text) return null;
            var area = labelRect(box);
            if (box.text.length > LIMITS.text) stats.longTexts++;
            node = { t: "label", x: Math.round(area.x), y: Math.round(area.y), w: Math.round(area.w), h: Math.round(area.h), text: box.text, bold: box.bold };
        } else if (box.kind === "image") {
            node = { t: "image", x: rect.x, y: rect.y, w: rect.w, h: rect.h, src: box.src };
            if (box.layers.length) node.layers = box.layers;
        } else if (box.kind === "patch") {
            var painted = typeof ctx.paint === "function" ? ctx.paint(layerOf(box, box)) : null;
            if (!painted) return null;
            node = { t: "image", x: rect.x, y: rect.y, w: rect.w, h: rect.h, src: painted };
        } else if (box.kind === "table") {
            node = tableGrid(box, ctx);
            if (!node) { stats.skipped.shape++; return null; }
        } else if (CONTAINER_KINDS[box.kind]) {
            node = { t: box.kind, x: rect.x, y: rect.y, w: rect.w, h: rect.h, children: [] };
            if (box.kind === "popup") node.title = box.text;
            else node.caption = box.text;
        } else {
            return null;
        }
        stats.converted++;
        stats.kinds[node.t] = (stats.kinds[node.t] || 0) + 1;
        if (node.children) node.children = emit(box.kids, depth + 1, ctx);
        return node;
    }

    function emit(boxes, depth, ctx) {
        mergeInnerLabels(boxes);
        attachCarets(boxes);
        attachCaptions(boxes);
        var nodes = [];
        var ordered = boxes.slice().sort(function (a, b) {
            var imageA = a.kind === "image" || a.kind === "patch", imageB = b.kind === "image" || b.kind === "patch";
            if (imageA !== imageB) return imageA ? -1 : 1;
            return imageA ? a.order - b.order : (a.y - b.y || a.x - b.x);
        });
        ordered.forEach(function (box) {
            if (box.used || HIDDEN_KINDS[box.kind]) return;
            if (box.kind.indexOf("unsupported:") === 0) { ctx.stats.skipped[box.kind.slice(12)]++; return; }
            if (CONTAINER_KINDS[box.kind] && depth >= LIMITS.nesting) {
                emit(box.kids, depth, ctx).forEach(function (node) { nodes.push(node); });
                return;
            }
            var node = toNode(box, depth, ctx);
            if (node) nodes.push(node);
        });
        return nodes;
    }

    function owner(box) {
        var up = box.cell.up;
        while (up && up.box && up.box.kind === "flat") up = up.up;
        return up && up.box ? up.box : null;
    }

    function toScreen(page, options) {
        var opts = options || {};
        var data = readCells(page.model);
        var stats = { shapes: 0, converted: 0, kinds: {}, baked: 0, longTexts: 0, trimmedTables: 0, skipped: { edge: 0, image: 0, note: 0, shape: 0 }, truncated: data.truncated };
        var ctx = { stats: stats, ui: opts.ui === "ess" ? "ess" : "core", paint: opts.paint, gridHeight: opts.gridHeight };
        var boxes = [];
        data.cells.forEach(function (cell) {
            if (cell.hidden) return;
            if (cell.edge) { stats.shapes++; stats.skipped.edge++; return; }
            if (!cell.vertex || cell.relative || !(cell.w > 0) || !(cell.h > 0)) return;
            stats.shapes++;
            cell.box = makeBox(cell);
            boxes.push(cell.box);
        });
        stats.flow = stats.skipped.edge >= 5 && stats.skipped.edge * 4 >= stats.shapes;

        var images = boxes.filter(function (box) { return box.kind === "image"; });
        boxes.forEach(function (box) {
            var up = owner(box);
            if (up && (up.kind === "table" || up.kind === "tablePart")) { box.kind = "tablePart"; return; }
            if (box.kind === "tablePart") return;
            images.forEach(function (image) {
                if (image === box || image.order > box.order || !inside(image, box)) return;
                if (!box.base || image.w * image.h < box.base.w * box.base.h) box.base = image;
            });
        });
        boxes.forEach(resolveGeneric);
        boxes.forEach(function (table) {
            if (table.kind !== "table") return;
            var header = table.cell.kids.filter(function (kid) { return !kid.hidden && prop(kid, "shape") === "tableRow"; }).sort(function (a, b) { return a.ay - b.ay; })[0];
            var columns = header ? header.kids.filter(function (kid) { return !kid.hidden; }).sort(function (a, b) { return a.ax - b.ax; }) : [];
            table.checkColumns = [];
            boxes.forEach(function (box) {
                if (box === table || box.order < table.order || box.kind === "tablePart" || box.kind === "table" || box.kind === "image" && !box.base) return;
                var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
                if (cx < table.x || cx > table.x + table.w || cy < table.y || cy > table.y + table.h) return;
                if (box.kind === "checkbox") {
                    columns.forEach(function (cell, index) { if (cx >= cell.ax && cx < cell.ax + cell.w && table.checkColumns.indexOf(index) < 0) table.checkColumns.push(index); });
                }
                box.kind = "tablePart";
            });
        });
        boxes.forEach(function (box) {
            var bake = box.kind === "patch" || box.kind === "patchLabel" || (box.kind === "image" && box.base);
            if (!bake || !box.base) return;
            var target = box.base, guard = 0;
            while (target.base && guard++ < 32) target = target.base;
            box.target = target;
        });
        boxes.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (box) {
            if (!box.target) return;
            box.target.layers.push(layerOf(box, box.target));
            stats.baked++;
            box.kind = box.kind === "patchLabel" ? "label" : "baked";
        });

        var flat = boxes.filter(function (box) { return !HIDDEN_KINDS[box.kind] || box.kind === "caret"; });
        flat.forEach(function (box) {
            var up = owner(box);
            if (!up || up === box || HIDDEN_KINDS[up.kind] || up.kind === "image" || up.kind.indexOf("unsupported:") === 0) return;
            if (!CONTAINER_KINDS[up.kind] && up.kind !== "table") up.kind = "group";
            if (up.kind !== "table") box.up = up;
        });
        var candidates = flat.filter(function (box) { return CONTAINER_KINDS[box.kind] && box.w >= 40 && box.h >= 30; })
            .sort(function (a, b) { return a.w * a.h - b.w * b.h; });
        flat.forEach(function (box) {
            if (box.up) return;
            for (var i = 0; i < candidates.length; i++) {
                if (candidates[i] !== box && contains(candidates[i], box)) { box.up = candidates[i]; break; }
            }
        });
        var roots = [];
        flat.forEach(function (box) {
            if (box.up) box.up.kids.push(box);
            else roots.push(box);
        });

        var nodes = emit(roots, 1, ctx);
        if (!nodes.length) throw fail("Trang '" + page.name + "' không có hình nào chuyển được thành control.");
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        (function measure(list) {
            list.forEach(function (node) {
                minX = Math.min(minX, node.labelX != null ? node.labelX : node.x);
                minY = Math.min(minY, node.captionAbove ? node.labelY : node.y);
                maxX = Math.max(maxX, node.x + node.w);
                maxY = Math.max(maxY, node.y + node.h);
                if (node.children) measure(node.children);
            });
        })(nodes);
        (function shift(list) {
            list.forEach(function (node) {
                node.x -= minX;
                node.y -= minY;
                if (node.labelX != null) node.labelX -= minX;
                if (node.labelY != null) node.labelY -= minY;
                if (node.children) shift(node.children);
            });
        })(nodes);

        return {
            screen: {
                kind: "ba-screen", v: 1, ui: ctx.ui,
                title: String(opts.title || page.name || "").slice(0, LIMITS.text),
                width: Math.max(1, Math.round(maxX - minX)), height: Math.max(1, Math.round(maxY - minY)), nodes: nodes
            },
            stats: stats
        };
    }

    return {
        LIMITS: LIMITS,
        parseXml: parseXml,
        read: read,
        textFromPng: textFromPng,
        toScreen: toScreen
    };
});
