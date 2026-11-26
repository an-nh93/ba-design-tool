(function (window, $) {
    "use strict";

    var SERVICE_URL = "/Pages/Builder.aspx";
    var BUILDER_URL = "/Builder";
    var THUMB_BASE = "/Content/builder-templates/";
    var UI_LABEL = { core: "Core", ess: "ESS" };
    var CAPTURE_SCRIPT_URL = "/Scripts/builder/builder-capture-page.js";
    var CONVERTER_SCRIPT_URL = "/Scripts/builder/builder-capture.js";
    var DRAWIO_SCRIPT_URL = "/Scripts/builder/builder-drawio.js";
    var DRAWIO_FILE = /\.(drawio|dio)(\.(xml|svg|png))?$/i;
    var DRAWIO_PARAM = /[?&]drawio=1(?=&|$)/;
    var HTML_SCRIPT_URL = "/Scripts/builder/builder-html.js";
    var HTML_FILE = /\.html?$/i;
    var HTML_PARAM = /[?&]htmlfile=1(?=&|$)/;
    var ALL_SCREENS = "all";
    var MAX_CANVAS_SIDE = 4096;
    var PASTED_KEY = "badesign.builder.capturedScreen";
    var CLIPBOARD_TEMPLATE = "clipboard";
    var TEAM_PREFIX = "team-";
    var RUNNER_TEXT = {
        done: "Đã chụp xong màn hình",
        untitled: "Màn hình chưa có tên",
        privacy: "Chỉ lấy bố cục và tên các ô, không lấy dữ liệu trong lưới.",
        dataNote: "Dữ liệu đang hiện trong lưới sẽ nằm trong thiết kế. Chỉ nên dùng với dữ liệu mẫu.",
        next: "Bấm Sao chép, rồi mở UI Builder và bấm Ctrl+V.",
        copy: "Sao chép",
        copied: "Đã sao chép. Mở UI Builder và bấm Ctrl+V.",
        manual: "Trình duyệt không cho tự sao chép. Bấm Ctrl+C để sao chép nội dung trong ô bên dưới.",
        close: "Đóng",
        failed: "Không chụp được màn hình này",
        working: "Đang chụp lần lượt từng tab, vui lòng chờ...",
        tabs: "Màn hình này có nhiều tab",
        tabsHint: "Khi chụp tất cả tab, các tab sẽ tự chuyển lần lượt. Không có gì được lưu trên HRM.",
        allTabs: "Chụp tất cả tab",
        oneTab: "Chỉ tab đang mở",
        which: "Chụp phần nào?",
        whole: "Cả màn hình",
        some: "Chỉ các phần được chọn",
        hover: "Rê chuột vào một dòng để khoanh vùng đó trên màn hình.",
        none: "Chưa chọn phần nào.",
        options: "Tùy chọn",
        gridData: "Lấy cả dữ liệu đang hiện trong lưới (tối đa 10 dòng mỗi lưới)",
        splitters: "Giữ khối chia vùng (Splitter)",
        kinds: { grid: "Lưới", tree: "Cây", tab: "Tab", box: "Khối", rest: "Các ô và nút còn lại" },
        within: { tab: "trong tab", box: "trong khối" },
        amounts: {
            controls: { one: "1 control", many: "{0} control" },
            columns: { one: "1 cột", many: "{0} cột" },
            grids: { one: "1 lưới", many: "{0} lưới" },
            fields: { one: "1 ô nhập", many: "{0} ô nhập" },
            buttons: { one: "1 nút", many: "{0} nút" }
        }
    };

    var templates = {};
    var cache = null;
    var loading = null;
    var gallery = null;
    var capture = null;
    var captureSource = null;
    var drawio = null;
    var drawioPages = [];
    var html = null;
    var htmlFile = null;
    var patchCache = {};
    var modules = null;
    var NO_MODULE = "none";
    var state = { query: "", ui: "", module: "", onPick: null };

    function toast(message, type) {
        if (window.builder && builder.showToast) builder.showToast(message, type || "info");
        else if (window.BaToast && BaToast.show) BaToast.show(message, type || "info");
        else window.alert(message);
    }

    function shownText(text) {
        return window.BaI18n ? window.BaI18n.translate(text) : text;
    }

    function shownTexts(texts) {
        var out = {};
        Object.keys(texts).forEach(function (key) {
            out[key] = typeof texts[key] === "string" ? shownText(texts[key]) : shownTexts(texts[key]);
        });
        return out;
    }

    function post(method, data, done, fail) {
        $.ajax({
            url: SERVICE_URL + "/" + method,
            type: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(data || {}),
            success: function (res) { done(res && res.d !== undefined ? res.d : res); },
            error: function (xhr) { fail(xhr); }
        });
    }

    function inBuilder() {
        return !!(window.builder && window.builderSnippet && window.builderCapture && document.getElementById("canvas-zoom-inner"));
    }

    function teamItem(info) {
        var thumb = typeof info.Thumb === "string" && /^\/[\w\-.\/]+\.png$/.test(info.Thumb) ? info.Thumb : "";
        return {
            Key: TEAM_PREFIX + info.RequestId,
            Name: info.Name || "",
            Ui: info.UiKind === "ess" ? "ess" : "core",
            Group: "Mẫu của team",
            Category: info.Category || "",
            Description: info.Description || "",
            ThumbUrl: thumb,
            Controls: info.ControlCount || 0,
            ModuleId: info.ModuleId || null,
            Module: info.ModuleName || "",
            Team: {
                submitter: info.SubmitterName || "",
                approvers: (info.ApprovedBy || []).join(", ") || info.CompletedBy || "",
                approvedAt: info.CompletedAt || ""
            }
        };
    }

    templates.list = function (done) {
        if (cache) { done(cache); return; }
        if (loading) { loading.push(done); return; }
        loading = [done];
        function finish(list) {
            templates.loadModules(function () {
                cache = list;
                var waiting = loading; loading = null;
                waiting.forEach(function (fn) { fn(cache); });
            });
        }
        post("GetStandardScreens", {}, function (list) {
            var standard = Array.isArray(list) ? list : [];
            post("GetTeamTemplates", {}, function (team) {
                finish(standard.concat((Array.isArray(team) ? team : []).map(teamItem)));
            }, function () { finish(standard); });
        }, function () {
            var waiting = loading; loading = null;
            waiting.forEach(function (fn) { fn(null); });
        });
    };

    templates.reload = function () { cache = null; modules = null; };

    templates.loadModules = function (done) {
        if (modules) { done(modules); return; }
        post("GetHrModules", {}, function (list) {
            modules = Array.isArray(list) ? list : [];
            done(modules);
        }, function () { done([]); });
    };

    templates.applyScreen = function (screenJson, mode, name) {
        if (!inBuilder()) return false;
        var converted;
        try {
            converted = builderCapture.convert(screenJson);
        } catch (err) {
            toast(err && err.message ? err.message : "Không đọc được dữ liệu màn hình.", "error");
            return false;
        }
        return templates.applyControls(converted.controls, mode, name || converted.screen.title || shownText("Màn hình chuẩn"), converted.truncated);
    };

    templates.applyControls = function (controls, mode, title, truncated) {
        if (!inBuilder()) return false;
        var converted = { controls: Array.isArray(controls) ? controls : [], truncated: !!truncated };
        if (!converted.controls.length) { toast("Màn hình không có control nào.", "warning"); return false; }

        if (mode === "new") {
            if ((builder.controls || []).length &&
                !window.confirm("Thiết kế đang mở sẽ được thay bằng màn hình '" + title + "'. Phần chưa lưu sẽ mất. Tiếp tục?")) return false;
            builder.controls = [];
            builder._clearCanvasContent();
            $("#hiddenControlId").val("0");
            $("#hiddenIsClone").val("0");
            builder.setCurrentDesignInfo({ Name: title, ControlType: "page", IsOwner: true }, false);
            builder.markSaved("[]");
            if (window.history && history.replaceState && /[?&]controlId=/.test(window.location.search || "")) {
                history.replaceState(null, "", BUILDER_URL);
            }
            builderProps.showEmpty();
            builderSnippet.instantiate(converted.controls, { left: 20, top: 20 });
            var $shell = $(".canvas-shell");
            if ($shell.length) $shell.scrollLeft(0).scrollTop(0);
            if (builder.fitOnOpen) builder.fitOnOpen();
            if (window.builderVersions) builderVersions.setBaseline();
        } else {
            builderSnippet.instantiate(converted.controls, { placement: "below" });
        }
        var $borders = $("#chkShowBorders");
        if ($borders.length && $borders.prop("checked")) $borders.prop("checked", false).trigger("change");
        templates.clearSelection();
        var count = converted.controls.length;
        var message = mode === "new"
            ? "Đã mở màn hình '" + title + "' (" + count + " control)."
            : "Đã chèn màn hình '" + title + "' (" + count + " control).";
        toast(message + (converted.truncated ? " Màn hình quá lớn nên một phần bị lược bỏ." : ""), "success");
        return true;
    };

    templates.clearSelection = function () {
        $(".canvas-control-selected, .page-field-selected, .popup-field-selected, .popup-selected").removeClass("canvas-control-selected page-field-selected popup-field-selected popup-selected");
        builder.selectedControlId = null;
        builder.selectedControlType = null;
        if (builder.highlightOutlineSelection) builder.highlightOutlineSelection();
        if (builder.updateSelectionSizeHint) builder.updateSelectionSizeHint();
    };

    templates.open = function (key, mode, name) {
        var team = /^team-(\d+)$/.exec(key || "");
        if (team) {
            post("LoadTeamTemplate", { requestId: parseInt(team[1], 10) }, function (json) {
                var controls = null;
                try { controls = JSON.parse(json || "null"); } catch (err) { controls = null; }
                if (!Array.isArray(controls)) { toast("Không tìm thấy mẫu này trong thư viện chung.", "error"); return; }
                templates.applyControls(controls, mode === "insert" ? "insert" : "new", name || shownText("Mẫu của team"));
            }, function () {
                toast("Không tải được mẫu. Kiểm tra đăng nhập rồi thử lại.", "error");
            });
            return;
        }
        post("LoadStandardScreen", { key: key }, function (json) {
            if (!json) { toast("Không tìm thấy màn hình chuẩn này.", "error"); return; }
            templates.applyScreen(json, mode === "insert" ? "insert" : "new", name);
        }, function () {
            toast("Không tải được màn hình chuẩn. Kiểm tra đăng nhập rồi thử lại.", "error");
        });
    };

    templates.insertAt = function (key, dropPoint) {
        post("LoadStandardScreen", { key: key }, function (json) {
            if (!json || !inBuilder()) { toast("Không tìm thấy màn hình chuẩn này.", "error"); return; }
            var converted;
            try {
                converted = builderCapture.convert(json);
            } catch (err) {
                toast(err && err.message ? err.message : "Không đọc được dữ liệu màn hình.", "error");
                return;
            }
            if (!converted.controls.length) { toast("Màn hình không có control nào.", "warning"); return; }
            var at = dropPoint && dropPoint.clientX != null ? builder.clientToCanvasPoint(dropPoint.clientX, dropPoint.clientY) : null;
            builderSnippet.instantiate(converted.controls, at ? { left: Math.max(20, at.x), top: Math.max(20, at.y) } : {});
            templates.clearSelection();
            toast("Đã thêm '" + (converted.screen.title || key) + "' (" + converted.controls.length + " control).", "success");
        }, function () {
            toast("Không tải được màn hình chuẩn. Kiểm tra đăng nhập rồi thử lại.", "error");
        });
    };

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function dataEl(tag, className, text) {
        var node = el(tag, className, text);
        node.setAttribute("translate", "no");
        return node;
    }

    function labelled(label, value) {
        var part = el("span", null, label + " ");
        part.appendChild(dataEl("span", null, value));
        return part;
    }

    function metaLine(parts) {
        var line = el("div", "bst-meta");
        parts.forEach(function (part, index) {
            if (index) line.appendChild(document.createTextNode(" · "));
            line.appendChild(part);
        });
        return line;
    }

    function buildGallery() {
        var overlay = el("div", "bst-overlay");
        overlay.id = "bstGallery";
        var dialog = el("div", "bst-dialog");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "bstTitle");

        var head = el("div", "bst-head");
        var title = el("span", "bst-title", "Màn hình chuẩn");
        title.id = "bstTitle";
        var search = el("input", "bst-search");
        search.type = "text";
        search.placeholder = "Tìm theo tên màn hình...";
        search.setAttribute("autocomplete", "off");
        var moduleSelect = el("select", "bst-select");
        moduleSelect.title = "Lọc theo phân hệ HR";
        var filter = el("div", "bst-filter");
        [["", "Tất cả"], ["core", "Core"], ["ess", "ESS"], ["team", "Mẫu của team"]].forEach(function (pair) {
            var button = el("button", "bst-filter-btn" + (pair[0] === "" ? " is-active" : ""), pair[1]);
            button.type = "button";
            button.setAttribute("data-ui", pair[0]);
            filter.appendChild(button);
        });
        var fromHrm = el("button", "bst-btn bst-head-btn", "Chụp từ HRM");
        fromHrm.type = "button";
        fromHrm.title = "Chụp một màn hình bất kỳ của HRM rồi dán vào UI Builder";
        fromHrm.addEventListener("click", function () { templates.openCapture(); });
        var fromDrawio = el("button", "bst-btn bst-head-btn", "Mở file draw.io");
        fromDrawio.type = "button";
        fromDrawio.title = "Mở file vẽ bằng draw.io và chuyển các hình thành control";
        fromDrawio.addEventListener("click", function () { templates.openDrawio(); });
        var fromHtml = el("button", "bst-btn bst-head-btn", "Mở file HTML");
        fromHtml.type = "button";
        fromHtml.title = "Mở file HTML (ví dụ mockup do AI vẽ) và chuyển trang cùng các popup của nó thành control";
        fromHtml.addEventListener("click", function () { templates.openHtml(); });
        var close = el("button", "bst-close", "×");
        close.type = "button";
        close.title = "Đóng";
        head.appendChild(title);
        head.appendChild(search);
        head.appendChild(moduleSelect);
        head.appendChild(filter);
        head.appendChild(fromHrm);
        head.appendChild(fromDrawio);
        head.appendChild(fromHtml);
        head.appendChild(close);

        var hint = el("div", "bst-hint", "Chọn một màn hình của HRM để bắt đầu. Control trong thiết kế là control thật, kéo thả và sửa được ngay.");
        var body = el("div", "bst-body");
        var grid = el("div", "bst-grid");
        var empty = el("div", "bst-empty");
        body.appendChild(grid);
        body.appendChild(empty);

        dialog.appendChild(head);
        dialog.appendChild(hint);
        dialog.appendChild(body);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) templates.closeGallery(); });
        close.addEventListener("click", function () { templates.closeGallery(); });
        search.addEventListener("input", function () { state.query = search.value; renderCards(); });
        moduleSelect.addEventListener("change", function () { state.module = moduleSelect.value; renderCards(); });
        filter.addEventListener("click", function (e) {
            var button = e.target && e.target.closest ? e.target.closest(".bst-filter-btn") : null;
            if (!button) return;
            state.ui = button.getAttribute("data-ui") || "";
            Array.prototype.forEach.call(filter.children, function (b) { b.classList.toggle("is-active", b === button); });
            renderCards();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key !== "Escape" || !overlay.classList.contains("is-open")) return;
            if (capture && capture.overlay.classList.contains("is-open")) return;
            if (drawio && drawio.overlay.classList.contains("is-open")) return;
            if (html && html.overlay.classList.contains("is-open")) return;
            e.stopPropagation();
            templates.closeGallery();
        }, true);

        return { overlay: overlay, grid: grid, empty: empty, search: search, moduleSelect: moduleSelect };
    }

    function moduleOption(value, text, isData) {
        var option = el("option", null, text);
        option.value = value;
        if (isData) option.setAttribute("translate", "no");
        return option;
    }

    function fillModuleSelect() {
        var select = gallery.moduleSelect;
        var list = modules || [];
        select.textContent = "";
        select.appendChild(moduleOption("", "Tất cả phân hệ", false));
        list.forEach(function (item) { select.appendChild(moduleOption(String(item.ModuleId), item.Name, true)); });
        select.appendChild(moduleOption(NO_MODULE, "Chưa gán phân hệ", false));
        if (state.module && state.module !== NO_MODULE && !list.some(function (item) { return String(item.ModuleId) === state.module; })) state.module = "";
        select.value = state.module;
        select.style.display = list.length ? "" : "none";
    }

    function matches(item) {
        if (state.ui === "team" ? !item.Team : (state.ui && item.Ui !== state.ui)) return false;
        if (state.module && (state.module === NO_MODULE ? !!item.ModuleId : String(item.ModuleId) !== state.module)) return false;
        var q = state.query.toLowerCase().trim();
        if (!q) return true;
        var texts = [item.Name, item.Group, shownText(item.Group), item.Category, item.Module, item.Description];
        if (item.Team) texts.push(item.Team.submitter, item.Team.approvers);
        else texts.push(shownText(item.Name), shownText(item.Description));
        return texts.join(" ").toLowerCase().indexOf(q) >= 0;
    }

    var SVG_NS = "http://www.w3.org/2000/svg";
    var SHAPE_KINDS = { f: 1, l: 1, b: 1, g: 1, c: 1, s: 1, p: 1, t: 1, i: 1 };

    function svgRect(svg, x, y, w, h, fill, stroke, radius) {
        var rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", Math.max(1, w));
        rect.setAttribute("height", Math.max(1, h));
        rect.setAttribute("fill", fill || "none");
        if (stroke) {
            rect.setAttribute("stroke", stroke);
            rect.setAttribute("stroke-width", "1");
            rect.setAttribute("vector-effect", "non-scaling-stroke");
        }
        if (radius) rect.setAttribute("rx", radius);
        svg.appendChild(rect);
    }

    function drawOutline(item) {
        if (!item.Outline || !(item.Width > 0) || !(item.Height > 0)) return null;
        var shapes;
        try { shapes = JSON.parse(item.Outline); } catch (e) { return null; }
        if (!Array.isArray(shapes) || !shapes.length) return null;
        var svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "-10 -10 " + (item.Width + 20) + " " + (item.Height + 20));
        svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
        svg.setAttribute("aria-hidden", "true");
        shapes.slice(0, 400).forEach(function (s) {
            if (!Array.isArray(s) || s.length !== 5 || !SHAPE_KINDS[s[0]]) return;
            var x = Number(s[1]), y = Number(s[2]), w = Number(s[3]), h = Number(s[4]);
            if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return;
            if (s[0] === "c") {
                svgRect(svg, x, y, w, h, "#ffffff", "#b9c3ce");
            } else if (s[0] === "s") {
                svgRect(svg, x, y, w, h, "#ffffff", "#b9c3ce");
                svgRect(svg, x, y, w, Math.min(26, h), "#dfe7ef");
            } else if (s[0] === "p") {
                svgRect(svg, x, y, w, h, "#ffffff", "#7f8c99");
                svgRect(svg, x, y, w, Math.min(30, h), "#0f75bd");
                if (h > 60) svgRect(svg, x, y + 30, w, 26, "#e9edf1");
            } else if (s[0] === "t") {
                svgRect(svg, x, y + Math.min(24, h), w, Math.max(1, h - 24), "#ffffff", "#b9c3ce");
                for (var i = 0; i < 3 && (i + 1) * 84 < w; i++) svgRect(svg, x + i * 84, y, 80, Math.min(24, h), i === 0 ? "#0f75bd" : "#dfe7ef");
            } else if (s[0] === "g") {
                svgRect(svg, x, y, w, h, "#f6f8fa", "#b9c3ce");
                svgRect(svg, x, y, w, Math.min(28, h), "#d5dee8");
                for (var line = y + 56; line < y + h - 4; line += 28) svgRect(svg, x + 1, line, w - 2, 1.5, "#dde4eb");
            } else if (s[0] === "f") {
                svgRect(svg, x, y, w, h, "#ffffff", "#8f9ba8");
            } else if (s[0] === "i") {
                svgRect(svg, x, y, w, h, "#e6edf5", "#b9c3ce");
            } else if (s[0] === "l") {
                svgRect(svg, x, y, w, h, "#aab4bf", null, 2);
            } else {
                svgRect(svg, x, y, w, h, "#0f75bd", null, 3);
            }
        });
        return svg;
    }

    function card(item) {
        var node = el("div", "bst-card");
        var thumb = el("div", "bst-thumb bst-thumb-" + item.Ui);
        if (item.Thumb || item.ThumbUrl) {
            var img = el("img");
            img.alt = "";
            img.loading = "lazy";
            img.src = item.ThumbUrl || (THUMB_BASE + encodeURIComponent(item.Thumb));
            img.addEventListener("error", function () { if (img.parentNode) img.parentNode.removeChild(img); });
            thumb.appendChild(img);
        } else {
            var drawing = drawOutline(item);
            if (drawing) thumb.appendChild(drawing);
        }
        thumb.appendChild(el("span", "bst-badge bst-badge-" + item.Ui, UI_LABEL[item.Ui] || item.Ui));
        node.appendChild(thumb);

        var info = el("div", "bst-info");
        var itemText = item.Team ? dataEl : el;
        info.appendChild(itemText("div", "bst-name", item.Name));
        var meta = [];
        if (item.Group) meta.push(el("span", null, item.Group));
        if (item.Category) meta.push(dataEl("span", null, item.Category));
        if (item.Module) meta.push(dataEl("span", null, item.Module));
        if (item.Controls) meta.push(el("span", null, item.Controls + " control"));
        if (meta.length) info.appendChild(metaLine(meta));
        if (item.Description) info.appendChild(itemText("div", "bst-desc", item.Description));
        if (item.Team) {
            var people = [labelled("Người gửi:", item.Team.submitter), labelled("Người duyệt:", item.Team.approvers)];
            if (item.Team.approvedAt) people.push(dataEl("span", null, item.Team.approvedAt));
            info.appendChild(metaLine(people));
        }
        node.appendChild(info);

        var actions = el("div", "bst-actions");
        if (state.onPick) {
            var pick = el("button", "bst-btn bst-btn-primary", "Dùng màn hình này");
            pick.type = "button";
            pick.addEventListener("click", function () { state.onPick(item); });
            actions.appendChild(pick);
        } else {
            var open = el("button", "bst-btn bst-btn-primary", "Mở thành thiết kế mới");
            open.type = "button";
            open.addEventListener("click", function () { templates.closeGallery(); templates.open(item.Key, "new", item.Name); });
            var insert = el("button", "bst-btn", "Chèn vào thiết kế này");
            insert.type = "button";
            insert.addEventListener("click", function () { templates.closeGallery(); templates.open(item.Key, "insert", item.Name); });
            actions.appendChild(open);
            actions.appendChild(insert);
        }
        node.appendChild(actions);
        return node;
    }

    function renderCards() {
        if (!gallery) return;
        gallery.grid.textContent = "";
        if (cache === null) {
            gallery.empty.textContent = "Không tải được danh sách màn hình chuẩn. Kiểm tra đăng nhập rồi thử lại.";
            gallery.empty.style.display = "block";
            return;
        }
        var items = cache.filter(matches);
        items.forEach(function (item) { gallery.grid.appendChild(card(item)); });
        gallery.empty.textContent = cache.length ? "Không có màn hình nào khớp." : "Chưa có màn hình chuẩn nào.";
        gallery.empty.style.display = items.length ? "none" : "block";
    }

    templates.openGallery = function (options) {
        options = options || {};
        if (!gallery) gallery = buildGallery();
        state.onPick = typeof options.onPick === "function" ? options.onPick : (inBuilder() ? null : function (item) {
            window.location.href = BUILDER_URL + "?template=" + encodeURIComponent(item.Key);
        });
        gallery.overlay.classList.add("is-open");
        gallery.empty.textContent = "Đang tải...";
        gallery.empty.style.display = "block";
        gallery.grid.textContent = "";
        templates.list(function () {
            fillModuleSelect();
            renderCards();
            try { gallery.search.focus(); } catch (e) { }
        });
    };

    templates.closeGallery = function () {
        if (gallery) gallery.overlay.classList.remove("is-open");
    };

    function pageRunner(text) {
        var doc = document;
        var PANEL_ID = "ba-capture-panel";
        function close() {
            window.__baHighlight(null);
            var old = doc.getElementById(PANEL_ID);
            if (old && old.parentNode) old.parentNode.removeChild(old);
        }
        function panel() {
            close();
            var box = doc.createElement("div");
            box.id = PANEL_ID;
            box.setAttribute("data-ba-capture-ignore", "1");
            box.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;width:330px;max-width:calc(100% - 32px);max-height:calc(100% - 32px);overflow:auto;box-sizing:border-box;padding:14px 16px;border:1px solid #0f75bd;border-radius:8px;background:#ffffff;color:#1f2937;font:13px/1.5 'Segoe UI',Arial,sans-serif;text-align:left;box-shadow:0 12px 32px rgba(0,0,0,0.3)";
            doc.body.appendChild(box);
            return box;
        }
        function line(box, value, strong) {
            var row = doc.createElement("div");
            row.textContent = value;
            row.style.cssText = "margin:0 0 6px;" + (strong ? "font-weight:600;font-size:14px;" : "");
            box.appendChild(row);
            return row;
        }
        function button(box, label, primary, onClick) {
            var node = doc.createElement("button");
            node.type = "button";
            node.textContent = label;
            node.style.cssText = "height:30px;margin:6px 8px 0 0;padding:0 14px;border:1px solid #0f75bd;border-radius:4px;cursor:pointer;font:13px 'Segoe UI',Arial,sans-serif;" + (primary ? "background:#0f75bd;color:#ffffff;" : "background:#ffffff;color:#0f75bd;");
            node.addEventListener("click", onClick);
            box.appendChild(node);
            return node;
        }
        function heading(box, value) {
            var row = line(box, value);
            row.style.cssText += "margin-top:9px;font-weight:600;";
            return row;
        }
        function choice(box, type, group, label, checked, onChange) {
            var row = doc.createElement("label");
            row.style.cssText = "display:flex;gap:7px;align-items:flex-start;margin:3px 0 0;padding:0;font-weight:normal;color:inherit;cursor:pointer";
            var input = doc.createElement("input");
            input.type = type;
            input.name = group;
            input.checked = checked;
            input.style.cssText = "all:revert;flex:none;margin:3px 0 0";
            input.addEventListener("change", function () { onChange(input); });
            var caption = doc.createElement("span");
            caption.textContent = label;
            row.appendChild(input);
            row.appendChild(caption);
            box.appendChild(row);
            return input;
        }
        function count(nodes) {
            var total = 0;
            (nodes || []).forEach(function (node) { total += 1 + count(node.children); });
            return total;
        }
        function has(nodes, test) {
            return (nodes || []).some(function (node) { return test(node) || has(node.children, test); });
        }
        function amount(key, value) {
            var forms = text.amounts[key];
            return value === 1 ? forms.one : forms.many.replace("{0}", value);
        }
        function partLabel(part) {
            var name = text.kinds[part.kind] + (part.title ? " “" + part.title + "”" : "");
            if (part.within && text.within[part.within.kind]) name += " " + text.within[part.within.kind] + " “" + part.within.title + "”";
            var detail = [];
            if (part.kind === "grid") {
                detail.push(amount("columns", part.columns) + (part.names.length ? ": " + part.names.join(", ") + (part.columns > part.names.length ? "…" : "") : ""));
            } else if (part.kind !== "tree") {
                ["grids", "fields", "buttons"].forEach(function (key) { if (part.counts[key]) detail.push(amount(key, part.counts[key])); });
            }
            return name + (detail.length ? " · " + detail.join(", ") : "");
        }
        function copy(value, done) {
            function legacy() {
                var area = doc.createElement("textarea");
                area.value = value;
                area.setAttribute("data-ba-capture-ignore", "1");
                area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
                doc.body.appendChild(area);
                area.focus();
                area.select();
                var ok = false;
                try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
                doc.body.removeChild(area);
                done(ok);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(function () { done(true); }, legacy);
            else legacy();
        }
        function showResult(screen) {
            var parts = window.__baParts(screen);
            var state = { some: false, chosen: {}, gridData: false, splitters: true };
            var box = panel();
            var note, status;
            function chosenIds() {
                return parts.filter(function (part) { return state.chosen[part.id]; }).map(function (part) { return part.id; });
            }
            function selection() {
                return window.__baSelect(screen, { parts: state.some ? chosenIds() : null, gridData: state.gridData, splitters: state.splitters });
            }
            function refresh() {
                summary.textContent = (screen.title || text.untitled) + " · " + amount("controls", count(selection().nodes));
                note.textContent = state.gridData ? text.dataNote : text.privacy;
                note.style.color = state.gridData ? "#b45309" : "";
                status.textContent = text.next;
                status.style.color = "";
                var manual = box.querySelector("textarea");
                if (manual) box.removeChild(manual);
            }
            line(box, text.done, true);
            var summary = line(box, "");
            if (parts.length > 1) {
                var group = PANEL_ID + "-mode";
                heading(box, text.which);
                choice(box, "radio", group, text.whole, true, function () { state.some = false; refresh(); });
                var someRadio = choice(box, "radio", group, text.some, false, function () { state.some = true; refresh(); });
                var list = doc.createElement("div");
                list.style.cssText = "max-height:190px;overflow:auto;margin:4px 0 4px 20px;padding:2px 8px 5px;border:1px solid #e2e6ec;border-radius:4px";
                box.appendChild(list);
                parts.forEach(function (part) {
                    var input = choice(list, "checkbox", "", partLabel(part), false, function () {
                        state.chosen[part.id] = input.checked;
                        if (input.checked) { state.some = true; someRadio.checked = true; }
                        refresh();
                    });
                    input.parentNode.addEventListener("mouseenter", function () { window.__baHighlight(part.box); });
                    input.parentNode.addEventListener("mouseleave", function () { window.__baHighlight(null); });
                });
                line(box, text.hover).style.color = "#6b7280";
            }
            var hasData = has(screen.nodes, function (node) { return node.t === "grid" && !!node.data; });
            var hasSplitters = has(screen.nodes, function (node) { return node.t === "splitter"; });
            if (hasData || hasSplitters) heading(box, text.options);
            if (hasData) choice(box, "checkbox", "", text.gridData, false, function (input) { state.gridData = input.checked; refresh(); });
            if (hasSplitters) choice(box, "checkbox", "", text.splitters, true, function (input) { state.splitters = input.checked; refresh(); });
            note = line(box, "");
            note.style.marginTop = "9px";
            status = line(box, "");
            refresh();
            button(box, text.copy, true, function () {
                if (state.some && !chosenIds().length) {
                    status.textContent = text.none;
                    status.style.color = "#b91c1c";
                    return;
                }
                var json = JSON.stringify(selection());
                copy(json, function (ok) {
                    if (ok) { status.textContent = text.copied; status.style.color = "#0e7a4f"; return; }
                    status.textContent = text.manual;
                    if (box.querySelector("textarea")) return;
                    var area = doc.createElement("textarea");
                    area.readOnly = true;
                    area.value = json;
                    area.style.cssText = "display:block;width:100%;height:70px;margin-top:8px;box-sizing:border-box;font:11px Consolas,monospace";
                    box.appendChild(area);
                    area.focus();
                    area.select();
                });
            });
            button(box, text.close, false, close);
        }
        function showError(error) {
            var box = panel();
            line(box, text.failed, true);
            line(box, String(error && error.message ? error.message : error));
            button(box, text.close, false, close);
        }
        function run(allTabs) {
            close();
            try {
                if (!allTabs) { showResult(window.__baCapture({ gridData: true })); return; }
                line(panel(), text.working, true);
                window.__baCaptureAllTabs({ gridData: true }).then(function (screens) { showResult(window.__baMergeTabs(screens)); }, showError);
            } catch (error) { showError(error); }
        }
        var tabs = 0;
        try { tabs = window.__baTabCount({}); } catch (error) { tabs = 0; }
        if (tabs < 2) { run(false); return; }
        var chooser = panel();
        line(chooser, text.tabs, true);
        line(chooser, text.tabsHint);
        button(chooser, text.allTabs, true, function () { run(true); });
        button(chooser, text.oneTab, false, function () { run(false); });
        button(chooser, text.close, false, close);
    }

    templates.bookmarkCode = function (source) {
        var compact = String(source).split(/\r?\n/).map(function (row) { return row.replace(/^\s+/, ""); }).filter(Boolean).join("\n");
        return "(function(){" + compact + "\n(" + pageRunner.toString() + ")(" + JSON.stringify(shownTexts(RUNNER_TEXT)) + ");})();void 0;";
    };

    templates.bookmarkHref = function (source) {
        return "javascript:" + encodeURIComponent(templates.bookmarkCode(source)).replace(/%(20|3D|3B|2C|3A|7B|7D|5B|5D|2B|2F|26|7C)/g, function (match, hex) {
            return String.fromCharCode(parseInt(hex, 16));
        });
    };

    function loadText(url, done) {
        $.ajax({ url: url, dataType: "text", cache: false, success: function (text) { done(text); }, error: function () { done(null); } });
    }

    function ensureScript(url, ready, done) {
        if (ready()) { done(true); return; }
        $.ajax({ url: url, dataType: "script", cache: false, success: function () { done(ready()); }, error: function () { done(false); } });
    }

    function ensureConverter(done) {
        ensureScript(CONVERTER_SCRIPT_URL, function () { return !!window.builderCapture; }, done);
    }

    function ensureCaptureSource(done) {
        if (captureSource) { done(captureSource); return; }
        loadText(CAPTURE_SCRIPT_URL, function (source) {
            if (source) captureSource = source;
            done(source);
        });
    }

    function buildCapture() {
        var overlay = el("div", "bst-overlay");
        overlay.id = "bstCapture";
        var dialog = el("div", "bst-dialog bst-dialog-narrow");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "bstCaptureTitle");

        var head = el("div", "bst-head");
        var title = el("span", "bst-title", "Chụp màn hình từ HRM");
        title.id = "bstCaptureTitle";
        var close = el("button", "bst-close", "×");
        close.type = "button";
        close.title = "Đóng";
        head.appendChild(title);
        head.appendChild(close);

        var body = el("div", "bst-body");
        var steps = el("ol", "bst-steps");
        var first = el("li", null, "Kéo nút này lên thanh dấu trang của trình duyệt (chỉ cần làm một lần): ");
        var link = el("a", "bst-bookmark is-disabled", "Đang chuẩn bị...");
        link.addEventListener("click", function (e) {
            e.preventDefault();
            toast("Hãy kéo nút này lên thanh dấu trang, rồi bấm nó khi đang mở màn hình HRM.", "info");
        });
        first.appendChild(link);
        first.appendChild(el("div", "bst-step-note", "Không thấy thanh dấu trang thì bấm Ctrl+Shift+B."));
        steps.appendChild(first);
        steps.appendChild(el("li", null, "Mở màn hình cần chụp trong HRM, bấm dấu trang vừa tạo, chọn phần cần chụp nếu không lấy cả màn hình, rồi bấm Sao chép."));
        steps.appendChild(el("li", null, "Quay lại đây, bấm vào ô bên dưới rồi bấm Ctrl+V."));
        var paste = el("textarea", "bst-paste");
        paste.placeholder = "Dán dữ liệu màn hình vào đây (Ctrl+V)";
        paste.setAttribute("spellcheck", "false");
        var preview = el("div", "bst-preview");
        var actions = el("div", "bst-actions bst-capture-actions");
        body.appendChild(steps);
        body.appendChild(paste);
        body.appendChild(preview);
        body.appendChild(actions);

        dialog.appendChild(head);
        dialog.appendChild(body);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) templates.closeCapture(); });
        close.addEventListener("click", function () { templates.closeCapture(); });
        paste.addEventListener("input", function () { renderPasted(); });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && overlay.classList.contains("is-open")) { e.stopPropagation(); templates.closeCapture(); }
        }, true);

        return { overlay: overlay, link: link, paste: paste, preview: preview, actions: actions };
    }

    function actionButton(label, primary, onClick) {
        var button = el("button", "bst-btn" + (primary ? " bst-btn-primary" : ""), label);
        button.type = "button";
        button.addEventListener("click", onClick);
        return button;
    }

    function showScreen(host, source, fallbackName) {
        host.textContent = "";
        if (!window.builderCapture) {
            host.appendChild(el("div", "bst-paste-error", "Chưa tải được bộ chuyển đổi màn hình. Tải lại trang rồi thử lại."));
            return null;
        }
        var result = builderCapture.normalize(source);
        if (!result.ok) {
            host.appendChild(el("div", "bst-paste-error", result.error));
            return null;
        }
        var info = builderCapture.summarize(result.screen);
        var drawing = builderCapture.outline(result.screen, 300);
        var name = info.title || fallbackName;
        var thumb = el("div", "bst-thumb bst-thumb-" + info.ui);
        var svg = drawOutline({ Outline: JSON.stringify(drawing.shapes), Width: drawing.width, Height: drawing.height });
        if (svg) thumb.appendChild(svg);
        thumb.appendChild(el("span", "bst-badge bst-badge-" + info.ui, UI_LABEL[info.ui] || info.ui));
        host.appendChild(thumb);
        host.appendChild(dataEl("div", "bst-name", name));
        var meta = [el("span", null, info.counts.total + " control"), el("span", null, info.counts.fields + " ô nhập"), el("span", null, info.counts.grids + " lưới")];
        if (result.truncated) meta.push(el("span", null, "màn hình quá lớn nên một phần bị lược bỏ"));
        host.appendChild(metaLine(meta));
        return name;
    }

    function fillApplyActions(host, apply) {
        host.textContent = "";
        host.appendChild(actionButton("Mở thành thiết kế mới", true, function () { apply("new"); }));
        host.appendChild(actionButton("Chèn vào thiết kế này", false, function () { apply("insert"); }));
    }

    function renderPasted() {
        if (!capture) return;
        var text = capture.paste.value.trim();
        capture.preview.textContent = "";
        capture.actions.textContent = "";
        if (!text) return;
        var name = showScreen(capture.preview, text, shownText("Màn hình chụp từ HRM"));
        if (name == null) return;

        if (inBuilder()) {
            fillApplyActions(capture.actions, function (mode) {
                if (templates.applyScreen(text, mode, name)) { templates.closeCapture(); templates.closeGallery(); }
            });
        } else {
            capture.actions.appendChild(actionButton("Dùng màn hình này", true, function () {
                try {
                    window.sessionStorage.setItem(PASTED_KEY, text);
                } catch (err) {
                    toast("Trình duyệt không cho lưu tạm dữ liệu. Hãy mở UI Builder rồi bấm Ctrl+V ở đó.", "error");
                    return;
                }
                window.location.href = BUILDER_URL + "?template=" + CLIPBOARD_TEMPLATE;
            }));
        }
    }

    templates.openCapture = function (options) {
        options = options || {};
        if (!capture) capture = buildCapture();
        capture.overlay.classList.add("is-open");
        capture.paste.value = options.text || "";
        ensureConverter(function () { renderPasted(); });
        ensureCaptureSource(function (source) {
            if (!source) { capture.link.textContent = "Không tải được công cụ chụp"; return; }
            capture.link.href = templates.bookmarkHref(source);
            capture.link.textContent = "Chụp màn hình HRM";
            capture.link.classList.remove("is-disabled");
        });
        if (!options.text) {
            try { capture.paste.focus(); } catch (e) { }
        }
    };

    templates.closeCapture = function () {
        if (capture) capture.overlay.classList.remove("is-open");
    };

    function inflateRaw(bytes) {
        var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Response(stream).arrayBuffer().then(function (buffer) { return new Uint8Array(buffer); });
    }

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.onload = function () { resolve(image); };
            image.onerror = function () { reject(new Error("image")); };
            image.src = src;
        });
    }

    function drawLayerRect(context, x, y, w, h, layer, scale) {
        var line = layer.stroke ? Math.max(1, layer.strokeWidth * scale) : 0;
        context.beginPath();
        if (layer.rounded && context.roundRect) context.roundRect(x + line / 2, y + line / 2, w - line, h - line, Math.min(8 * scale, h / 2));
        else context.rect(x + line / 2, y + line / 2, w - line, h - line);
        if (layer.fill) { context.fillStyle = layer.fill; context.fill(); }
        if (layer.stroke) { context.strokeStyle = layer.stroke; context.lineWidth = line; context.stroke(); }
    }

    function paintPatch(layer) {
        var key = [layer.w, layer.h, layer.fill, layer.stroke, layer.strokeWidth, layer.rounded].join("|");
        if (!patchCache[key]) {
            var canvas = document.createElement("canvas");
            canvas.width = Math.min(MAX_CANVAS_SIDE, layer.w);
            canvas.height = Math.min(MAX_CANVAS_SIDE, layer.h);
            drawLayerRect(canvas.getContext("2d"), 0, 0, canvas.width, canvas.height, layer, 1);
            patchCache[key] = canvas.toDataURL("image/png");
        }
        return patchCache[key];
    }

    function composeImage(node) {
        var layers = node.layers || [];
        if (!layers.length) return Promise.resolve();
        return loadImage(node.src).then(function (base) {
            var shrink = Math.min(1, MAX_CANVAS_SIDE / Math.max(base.naturalWidth, base.naturalHeight));
            var canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(base.naturalWidth * shrink));
            canvas.height = Math.max(1, Math.round(base.naturalHeight * shrink));
            var context = canvas.getContext("2d");
            var scaleX = canvas.width / node.w, scaleY = canvas.height / node.h;
            context.drawImage(base, 0, 0, canvas.width, canvas.height);
            var chain = Promise.resolve();
            layers.forEach(function (layer) {
                chain = chain.then(function () {
                    var x = layer.x * scaleX, y = layer.y * scaleY, w = layer.w * scaleX, h = layer.h * scaleY;
                    if (layer.kind !== "image") { drawLayerRect(context, x, y, w, h, layer, Math.min(scaleX, scaleY)); return null; }
                    return loadImage(layer.src).then(function (picture) { context.drawImage(picture, x, y, w, h); });
                });
            });
            return chain.then(function () {
                node.src = canvas.toDataURL("image/png");
                delete node.layers;
            });
        });
    }

    function composeImages(nodes) {
        var chain = Promise.resolve();
        (function walk(list) {
            list.forEach(function (node) {
                if (node.t === "image") chain = chain.then(function () { return composeImage(node); });
                if (node.children) walk(node.children);
            });
        })(nodes);
        return chain;
    }

    function drawioNotes(stats) {
        var notes = [];
        if (stats.flow) notes.push("Trang này là sơ đồ quy trình: UI Builder không vẽ đường nối, các ô sẽ thành nút rời nhau.");
        if (stats.baked) notes.push("Đã gộp " + stats.baked + " ô che và biểu tượng vào ảnh nền.");
        if (stats.skipped.edge) notes.push(stats.skipped.edge + " đường nối không được chuyển.");
        if (stats.skipped.image) notes.push(stats.skipped.image + " ảnh liên kết ngoài hoặc ảnh vẽ sẵn của draw.io không được chuyển.");
        if (stats.skipped.note) notes.push(stats.skipped.note + " ghi chú dạng hình không được chuyển.");
        if (stats.skipped.shape) notes.push(stats.skipped.shape + " hình sơ đồ không được chuyển.");
        if (stats.trimmedTables) notes.push(stats.trimmedTables + " bảng chỉ giữ số dòng vừa với chiều cao đã vẽ.");
        if (stats.longTexts) notes.push(stats.longTexts + " đoạn chữ dài bị cắt còn 200 ký tự.");
        if (stats.truncated) notes.push("Trang có quá nhiều hình nên một phần bị lược bỏ.");
        return notes;
    }

    function drawioResult(page, ui) {
        page.results = page.results || {};
        if (!page.results[ui]) {
            try {
                page.results[ui] = builderDrawio.toScreen(page, { ui: ui, title: page.name, gridHeight: builderCapture.gridHeight, paint: paintPatch });
            } catch (error) {
                page.results[ui] = { error: error && error.drawio ? error.message : "Không chuyển được trang này." };
            }
        }
        return page.results[ui];
    }

    function showFileMessage(box, message, isError) {
        box.preview.textContent = "";
        box.notes.textContent = "";
        box.actions.textContent = "";
        if (message) box.preview.appendChild(el("div", isError ? "bst-paste-error" : "bst-meta", message));
    }

    function renderDrawio() {
        var page = drawioPages[parseInt(drawio.page.value, 10)];
        if (!page) return;
        var result = drawioResult(page, drawio.ui.value);
        if (result.error) { showFileMessage(drawio, result.error, true); return; }
        drawio.notes.textContent = "";
        drawio.actions.textContent = "";
        var name = showScreen(drawio.preview, result.screen, page.name);
        if (name == null) return;
        drawioNotes(result.stats).forEach(function (note) { drawio.notes.appendChild(el("li", null, note)); });
        fillApplyActions(drawio.actions, function (mode) {
            drawio.dialog.classList.add("bst-busy");
            composeImages(result.screen.nodes).then(function () { return true; }, function () { return false; }).then(function (merged) {
                drawio.dialog.classList.remove("bst-busy");
                if (!merged) { toast("Không ghép được ô che và biểu tượng vào ảnh nền nên chưa mở trang này. Hãy thử lại.", "error"); return; }
                if (templates.applyScreen(result.screen, mode, name)) { templates.closeDrawio(); templates.closeGallery(); }
            });
        });
    }

    function readDrawioFile(file) {
        if (!file) return;
        drawio.options.classList.remove("is-ready");
        drawio.file.textContent = file.name || "";
        if (file.size > builderDrawio.LIMITS.file) { showFileMessage(drawio, "File quá lớn (tối đa 40 MB).", true); return; }
        showFileMessage(drawio, "Đang đọc file...", false);
        file.arrayBuffer().then(function (buffer) {
            var bytes = new Uint8Array(buffer);
            var text = bytes[0] === 137 && bytes[1] === 80 ? builderDrawio.textFromPng(bytes) : new TextDecoder("utf-8").decode(bytes);
            return builderDrawio.read(text, typeof DecompressionStream === "function" ? inflateRaw : null);
        }).then(function (pages) {
            drawioPages = pages;
            drawio.page.textContent = "";
            var first = -1;
            pages.forEach(function (page, index) {
                var option = el("option", null, page.name);
                var result = drawioResult(page, drawio.ui.value);
                option.value = String(index);
                option.setAttribute("translate", "no");
                option.disabled = !!result.error;
                if (!result.error && (first < 0 || (drawioResult(pages[first], drawio.ui.value).stats.flow && !result.stats.flow))) first = index;
                drawio.page.appendChild(option);
            });
            if (first < 0) { showFileMessage(drawio, "File này không có trang nào chuyển được thành control.", true); return; }
            drawio.page.value = String(first);
            drawio.options.classList.add("is-ready");
            renderDrawio();
        }, function (error) {
            showFileMessage(drawio, error && error.drawio ? error.message : "Không đọc được file này.", true);
        });
    }

    function choiceSelect(choices) {
        var select = el("select", "bst-select");
        choices.forEach(function (pair) {
            var option = el("option", null, pair[1]);
            option.value = pair[0];
            select.appendChild(option);
        });
        return select;
    }

    function fileOption(labelText, select) {
        var label = el("label", "bst-option");
        label.appendChild(el("span", null, labelText));
        label.appendChild(select);
        return label;
    }

    // Hộp "mở file" dùng chung cho file draw.io và file HTML: vùng thả file, các ô chọn, phần xem trước, ghi chú và nút áp dụng.
    // spec: { id, title, accept, dropText, note, pickLabel, extra: [nhãn, [[giá trị, chữ]]] (không bắt buộc),
    //         read(file), onPick() khi đổi ô chọn đầu, onOption() khi đổi kiểu control hoặc ô extra, close() }
    function buildFileDialog(spec) {
        var overlay = el("div", "bst-overlay");
        overlay.id = spec.id;
        var dialog = el("div", "bst-dialog bst-dialog-narrow");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", spec.id + "Title");

        var head = el("div", "bst-head");
        var title = el("span", "bst-title", spec.title);
        title.id = spec.id + "Title";
        var close = el("button", "bst-close", "×");
        close.type = "button";
        close.title = "Đóng";
        head.appendChild(title);
        head.appendChild(close);

        var body = el("div", "bst-body");
        var drop = el("div", "bst-drop");
        var input = el("input", "bst-file");
        input.type = "file";
        input.accept = spec.accept;
        drop.appendChild(el("span", null, spec.dropText));
        drop.appendChild(actionButton("Chọn file", true, function () { input.click(); }));
        drop.appendChild(input);
        var file = el("div", "bst-meta");
        file.setAttribute("translate", "no");
        var page = el("select", "bst-select");
        var ui = choiceSelect([["core", "Core"], ["ess", "ESS"]]);
        var extra = spec.extra ? choiceSelect(spec.extra[1]) : null;
        var options = el("div", "bst-drawio-options");
        options.appendChild(fileOption(spec.pickLabel, page));
        options.appendChild(fileOption("Kiểu control", ui));
        if (extra) options.appendChild(fileOption(spec.extra[0], extra));
        var preview = el("div", "bst-preview");
        var notes = el("ul", "bst-notes");
        var actions = el("div", "bst-actions bst-capture-actions");
        body.appendChild(el("div", "bst-step-note", spec.note));
        body.appendChild(drop);
        body.appendChild(file);
        body.appendChild(options);
        body.appendChild(preview);
        body.appendChild(notes);
        body.appendChild(actions);

        dialog.appendChild(head);
        dialog.appendChild(body);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) spec.close(); });
        close.addEventListener("click", function () { spec.close(); });
        input.addEventListener("change", function () {
            spec.read(input.files && input.files[0]);
            input.value = "";
        });
        page.addEventListener("change", spec.onPick);
        ui.addEventListener("change", spec.onOption);
        if (extra) extra.addEventListener("change", spec.onOption);
        dialog.addEventListener("dragover", function (e) {
            e.preventDefault();
            drop.classList.add("is-over");
        });
        dialog.addEventListener("dragleave", function () { drop.classList.remove("is-over"); });
        dialog.addEventListener("drop", function (e) {
            e.preventDefault();
            e.stopPropagation();
            drop.classList.remove("is-over");
            spec.read(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && overlay.classList.contains("is-open")) { e.stopPropagation(); spec.close(); }
        }, true);

        return { overlay: overlay, dialog: dialog, file: file, page: page, ui: ui, extra: extra, options: options, preview: preview, notes: notes, actions: actions };
    }

    function buildDrawio() {
        return buildFileDialog({
            id: "bstDrawio",
            title: "Mở file draw.io",
            accept: ".drawio,.dio,.xml,.svg,.png",
            dropText: "Kéo thả file .drawio vào đây, hoặc",
            note: "File được đọc ngay trên máy của bạn, không gửi lên máy chủ. Ảnh chụp dán trong file được giữ làm ảnh nền; nhãn, ô nhập, nút và bảng vẽ thêm thành control.",
            pickLabel: "Trang",
            read: readDrawioFile,
            onPick: renderDrawio,
            onOption: renderDrawio,
            close: function () { templates.closeDrawio(); }
        });
    }

    templates.openDrawio = function (options) {
        if (!inBuilder()) {
            window.location.href = BUILDER_URL + "?drawio=1";
            return;
        }
        if (!drawio) drawio = buildDrawio();
        drawio.overlay.classList.add("is-open");
        ensureScript(DRAWIO_SCRIPT_URL, function () { return !!window.builderDrawio; }, function (ready) {
            if (!ready) { showFileMessage(drawio, "Chưa tải được bộ đọc file draw.io. Tải lại trang rồi thử lại.", true); return; }
            if (options && options.file) readDrawioFile(options.file);
        });
    };

    templates.closeDrawio = function () {
        if (drawio) drawio.overlay.classList.remove("is-open");
    };

    function htmlNotes(result, network) {
        var notes = [];
        if (result.external && !network) {
            notes.push("File dùng " + result.external + " tài nguyên bên ngoài (CSS, script, ảnh). Chúng không được tải nên kết quả có thể thiếu hoặc khác bản gốc; chọn \"Cho phép tải\" ở ô Tài nguyên ngoài để đọc lại.");
        }
        if (result.skipped.length) {
            var names = result.skipped.filter(Boolean);
            notes.push(result.skipped.length + " popup không mở ra được nên chưa được đọc" + (names.length ? ": " + names.join(", ") : "") + ".");
        }
        return notes;
    }

    function htmlScreen() {
        var result = htmlFile ? htmlFile.result : null;
        if (!result) return null;
        if (html.page.value === ALL_SCREENS) return result.all;
        var item = result.screens[parseInt(html.page.value, 10)];
        return item ? item.screen : null;
    }

    function showHtmlNotes() {
        htmlNotes(htmlFile.result, !!html.extra.value).forEach(function (note) { html.notes.appendChild(el("li", null, note)); });
    }

    function renderHtml() {
        var screen = htmlScreen();
        if (!screen) return;
        html.notes.textContent = "";
        html.actions.textContent = "";
        var name = showScreen(html.preview, screen, htmlFile.name);
        if (name == null) return;
        showHtmlNotes();
        fillApplyActions(html.actions, function (mode) {
            if (templates.applyScreen(screen, mode, name)) { templates.closeHtml(); templates.closeGallery(); }
        });
    }

    function fillHtmlScreens(result) {
        var popups = result.screens.filter(function (item) { return item.kind === "popup"; }).length;
        html.page.textContent = "";
        function add(value, text, isData) {
            var option = el("option", null, text);
            option.value = value;
            if (isData) option.setAttribute("translate", "no");
            html.page.appendChild(option);
        }
        if (result.all) {
            add(ALL_SCREENS, popups < result.screens.length ? "Tất cả (trang chính + " + popups + " popup)" : "Tất cả (" + popups + " popup)", false);
        }
        result.screens.forEach(function (item, index) {
            if (item.kind === "page") add(String(index), "Trang chính", false);
            else if (item.title) add(String(index), "Popup: " + item.title, true);
            else add(String(index), "Popup: không có tiêu đề", false);
        });
        html.page.value = result.all ? ALL_SCREENS : "0";
    }

    // Mỗi cặp (kiểu control, có tải tài nguyên ngoài hay không) dựng lại file một lần trong khung cách ly; kết quả được giữ theo file.
    function loadHtml() {
        var file = htmlFile;
        if (!file) return;
        var network = !!html.extra.value;
        var key = html.ui.value + (network ? "+network" : "");
        file.key = key;
        file.result = null;
        html.page.textContent = "";
        showFileMessage(html, "Đang dựng và đọc file...", false);
        html.dialog.classList.add("bst-busy");
        if (!file.reads[key]) file.reads[key] = builderHtml.read(file.text, { source: captureSource, ui: html.ui.value, network: network });
        file.reads[key].then(function (result) {
            if (file !== htmlFile || file.key !== key) return;
            html.dialog.classList.remove("bst-busy");
            file.result = result;
            if (!result.screens.length) {
                showFileMessage(html, "Không tìm thấy control nào trong file này.", true);
                showHtmlNotes();
                return;
            }
            fillHtmlScreens(result);
            renderHtml();
        }, function (error) {
            if (file !== htmlFile || file.key !== key) return;
            html.dialog.classList.remove("bst-busy");
            showFileMessage(html, error && error.html ? error.message : "Không đọc được file này.", true);
        });
    }

    function readHtmlFile(file) {
        if (!file) return;
        htmlFile = null;
        html.dialog.classList.remove("bst-busy");
        html.options.classList.remove("is-ready");
        html.extra.value = "";
        html.file.textContent = file.name || "";
        if (file.size > builderHtml.LIMITS.file) { showFileMessage(html, "File quá lớn (tối đa 5 MB).", true); return; }
        showFileMessage(html, "Đang đọc file...", false);
        file.text().then(function (text) {
            htmlFile = { name: (file.name || "").replace(HTML_FILE, "") || shownText("Màn hình từ file HTML"), text: text, reads: {}, result: null, key: "" };
            html.options.classList.add("is-ready");
            loadHtml();
        }, function () {
            showFileMessage(html, "Không đọc được file này.", true);
        });
    }

    function buildHtml() {
        return buildFileDialog({
            id: "bstHtml",
            title: "Mở file HTML",
            accept: ".html,.htm",
            dropText: "Kéo thả file .html vào đây, hoặc",
            note: "File được dựng trong một khung cách ly ngay trên máy của bạn, không gửi lên máy chủ. Trang chính và từng popup của file thành control: lưới, ô nhập, ô chọn, nút, tab, khối. Giá trị mẫu trong ô nhập không được đưa vào thiết kế.",
            pickLabel: "Màn hình",
            extra: ["Tài nguyên ngoài", [["", "Không tải"], ["1", "Cho phép tải"]]],
            read: readHtmlFile,
            onPick: renderHtml,
            onOption: loadHtml,
            close: function () { templates.closeHtml(); }
        });
    }

    function ensureHtmlReader(done) {
        ensureScript(HTML_SCRIPT_URL, function () { return !!window.builderHtml; }, function (ready) {
            if (!ready) { done(false); return; }
            ensureConverter(function (converter) {
                if (!converter) { done(false); return; }
                ensureCaptureSource(function (source) { done(!!source); });
            });
        });
    }

    templates.openHtml = function (options) {
        if (!inBuilder()) {
            window.location.href = BUILDER_URL + "?htmlfile=1";
            return;
        }
        if (!html) html = buildHtml();
        html.overlay.classList.add("is-open");
        ensureHtmlReader(function (ready) {
            if (!ready) { showFileMessage(html, "Chưa tải được bộ đọc file HTML. Tải lại trang rồi thử lại.", true); return; }
            if (options && options.file) readHtmlFile(options.file);
        });
    };

    templates.closeHtml = function () {
        if (html) html.overlay.classList.remove("is-open");
    };

    function openerFor(file) {
        var name = file ? file.name || "" : "";
        if (DRAWIO_FILE.test(name)) return templates.openDrawio;
        if (HTML_FILE.test(name)) return templates.openHtml;
        return null;
    }

    document.addEventListener("dragover", function (e) {
        if (!inBuilder() || !e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return;
        if (e.target && e.target.closest && e.target.closest(".ess-image-drop")) return;
        e.preventDefault();
    });

    document.addEventListener("drop", function (e) {
        var file = inBuilder() && e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
        var open = openerFor(file);
        if (!open) return;
        e.preventDefault();
        e.stopPropagation();
        open({ file: file });
    }, true);

    document.addEventListener("paste", function (e) {
        if (!inBuilder()) return;
        var target = e.target || {};
        var tag = (target.tagName || "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
        if (builder.shouldPreferAppPaste()) return;
        var data = e.clipboardData || window.clipboardData;
        var text = data && data.getData ? data.getData("text") : "";
        if (!text || text.length > builderCapture.LIMITS.json || text.indexOf('"' + builderCapture.KIND + '"') < 0) return;
        if (!builderCapture.normalize(text).ok) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        templates.openCapture({ text: text });
    }, true);

    function templateKeyFromUrl() {
        var match = /[?&]template=([a-z0-9-]{1,64})(?:&|$)/.exec(window.location.search || "");
        return match ? match[1] : null;
    }

    $(function () {
        if (!inBuilder()) return;
        var search = window.location.search || "";
        var openFile = DRAWIO_PARAM.test(search) ? templates.openDrawio : null;
        if (!openFile && HTML_PARAM.test(search)) openFile = templates.openHtml;
        if (openFile) {
            if (window.history && history.replaceState) history.replaceState(null, "", BUILDER_URL);
            openFile();
            return;
        }
        var key = templateKeyFromUrl();
        if (!key || parseInt($("#hiddenControlId").val() || "0", 10) > 0) return;
        var started = false;
        function start() {
            if (started) return;
            started = true;
            $(document).off("ajaxComplete.bst");
            if (key === CLIPBOARD_TEMPLATE) {
                var stored = null;
                try {
                    stored = window.sessionStorage.getItem(PASTED_KEY);
                    window.sessionStorage.removeItem(PASTED_KEY);
                } catch (err) {
                    stored = null;
                }
                if (!stored) { toast("Không còn dữ liệu màn hình chụp. Hãy chụp và dán lại.", "warning"); return; }
                templates.applyScreen(stored, "new");
                return;
            }
            templates.list(function (list) {
                var item = (list || []).filter(function (x) { return x.Key === key; })[0];
                if (!item) { toast("Không tìm thấy màn hình chuẩn này.", "error"); return; }
                templates.open(item.Key, "new", item.Name);
            });
        }
        $(document).on("ajaxComplete.bst", function (e, xhr, settings) {
            if (settings && /\/LoadConfig$/.test(settings.url || "")) start();
        });
        setTimeout(start, 4000);
    });

    window.builderTemplates = templates;
})(window, jQuery);
