(function (window, $) {
    "use strict";

    var POSITION_KEYS = { left: 1, top: 1, width: 1, height: 1 };
    var IGNORED_KEYS = { activeTabIndex: 1, controlDbId: 1, zIndex: 1 };
    var versions = { baseline: null, baselineSavedFor: 0, compare: null, timer: null };

    function post(method, data) {
        return $.ajax({
            url: builderServiceUrl + "/" + method,
            method: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(data || {})
        }).then(function (res) { return res && res.d !== undefined ? res.d : res; });
    }

    function designId() {
        return builder.canOverwriteDesign() ? parseInt(builder.currentDesignInfo.ControlId, 10) : 0;
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function label(cfg) {
        return builder.getOutlineLabel(cfg) || cfg.id;
    }

    versions.setBaseline = function () {
        versions.baseline = JSON.stringify(builder.controls || []);
    };

    versions.diff = function (baseControls) {
        var base = {}, current = {};
        (baseControls || []).forEach(function (c) { if (c && c.id) base[c.id] = c; });
        (builder.controls || []).forEach(function (c) { if (c && c.id) current[c.id] = c; });
        var result = { added: [], changed: [], moved: [], removed: [] };

        Object.keys(current).forEach(function (id) {
            var now = current[id], before = base[id];
            if (!before) { result.added.push({ id: id, label: label(now) }); return; }
            var keys = {}, moved = false, other = [];
            Object.keys(now).concat(Object.keys(before)).forEach(function (key) { keys[key] = true; });
            Object.keys(keys).forEach(function (key) {
                if (key.charAt(0) === "_" || IGNORED_KEYS[key]) return;
                if (JSON.stringify(now[key]) === JSON.stringify(before[key])) return;
                if (POSITION_KEYS[key]) moved = true;
                else other.push(key);
            });
            if (other.length) result.changed.push({ id: id, label: label(now), keys: other });
            else if (moved) result.moved.push({ id: id, label: label(now) });
        });
        Object.keys(base).forEach(function (id) {
            if (!current[id]) result.removed.push({ id: id, label: label(base[id]), cfg: base[id] });
        });
        return result;
    };

    function clearMarks() {
        $("#canvas .ub-diff-added, #canvas .ub-diff-changed, #canvas .ub-diff-moved").removeClass("ub-diff-added ub-diff-changed ub-diff-moved");
        $("#canvas .ub-diff-ghost").remove();
    }

    function mark(list, className) {
        list.forEach(function (item) {
            builder.controlElement(builder.getControlConfig(item.id)).addClass(className);
        });
    }

    function ghosts(removed) {
        var gone = {};
        removed.forEach(function (item) { gone[item.id] = true; });
        removed.forEach(function (item) {
            var cfg = item.cfg;
            if (cfg.parentId && gone[cfg.parentId]) return;
            var $host = cfg.parentId ? builder.containerContent(cfg.parentId, cfg.paneIndex) : $("#canvas-zoom-inner");
            if (!$host.length) return;
            var ghost = el("div", "ub-diff-ghost", item.label);
            ghost.style.left = (cfg.left || 0) + "px";
            ghost.style.top = (cfg.top || 0) + "px";
            ghost.style.width = Math.max(24, cfg.width || 120) + "px";
            ghost.style.height = Math.max(18, cfg.height || 24) + "px";
            $host.append(ghost);
        });
    }

    function summaryText(result) {
        var parts = [];
        if (result.added.length) parts.push(result.added.length + " control mới");
        if (result.changed.length) parts.push(result.changed.length + " control đổi nội dung");
        if (result.moved.length) parts.push(result.moved.length + " control chỉ dời hoặc đổi cỡ");
        if (result.removed.length) parts.push(result.removed.length + " control đã xóa");
        return parts.length ? parts.join(", ") + "." : "Không có khác biệt.";
    }

    function drawBar(result) {
        var $host = $("#ubNotices");
        if (!$host.length) $host = $('<div id="ubNotices" class="ub-notices"></div>').appendTo("body");
        var $bar = $("#ubCompareBar");
        if (!$bar.length) $bar = $('<div id="ubCompareBar" class="ub-notice ub-compare-bar"></div>').appendTo($host);
        $bar.empty();
        var text = el("div", "ub-compare-text");
        text.appendChild(el("strong", null, "So với " + versions.compare.label + ": "));
        text.appendChild(document.createTextNode(summaryText(result)));
        $bar.append(text);

        var legend = el("div", "ub-compare-legend");
        [["added", "mới"], ["changed", "đổi nội dung"], ["moved", "dời, đổi cỡ"], ["removed", "đã xóa"]].forEach(function (pair) {
            var chip = el("span", "ub-compare-chip ub-compare-" + pair[0], pair[1]);
            legend.appendChild(chip);
        });
        $bar.append(legend);

        var list = el("button", "ub-notice-btn", "Danh sách");
        list.type = "button";
        list.addEventListener("click", function () { versions.showList(result); });
        var off = el("button", "ub-notice-btn is-primary", "Tắt so sánh");
        off.type = "button";
        off.addEventListener("click", function () { versions.stopCompare(); });
        $bar.append(list, off);
    }

    versions.refreshCompare = function () {
        if (!versions.compare) return;
        clearMarks();
        var result = versions.diff(versions.compare.controls);
        versions.compare.result = result;
        mark(result.added, "ub-diff-added");
        mark(result.changed, "ub-diff-changed");
        mark(result.moved, "ub-diff-moved");
        ghosts(result.removed);
        drawBar(result);
    };

    versions.startCompare = function (json, labelText) {
        var controls;
        try { controls = JSON.parse(json || "[]"); } catch (e) { controls = null; }
        if (!Array.isArray(controls)) { builder.showToast("Không đọc được nội dung để so sánh.", "error"); return; }
        versions.compare = { controls: controls, label: labelText };
        versions.refreshCompare();
    };

    versions.stopCompare = function () {
        versions.compare = null;
        clearMarks();
        $("#ubCompareBar").remove();
    };

    versions.showList = function (result) {
        var body = el("div", "ub-compare-list");
        function section(title, items, describe) {
            if (!items.length) return;
            body.appendChild(el("h4", null, title + " (" + items.length + ")"));
            var ul = el("ul");
            items.forEach(function (item) {
                var li = el("li");
                var name = el("a", null, item.label);
                name.href = "javascript:void(0)";
                if (builder.getControlConfig(item.id)) {
                    name.addEventListener("click", function () {
                        var cfg = builder.getControlConfig(item.id);
                        if (!cfg) return;
                        dialog.close();
                        builder.selectOnly(cfg.id);
                        builder.showPropertiesFor(cfg);
                        builder.revealControl(cfg);
                    });
                    li.appendChild(name);
                } else {
                    li.appendChild(el("span", null, item.label));
                }
                var extra = describe ? describe(item) : "";
                if (extra) li.appendChild(el("span", "ub-compare-keys", " (" + extra + ")"));
                ul.appendChild(li);
            });
            body.appendChild(ul);
        }
        section("Control mới", result.added);
        section("Control đổi nội dung", result.changed, function (item) { return item.keys.slice(0, 6).join(", ") + (item.keys.length > 6 ? ", ..." : ""); });
        section("Control chỉ dời hoặc đổi cỡ", result.moved);
        section("Control đã xóa", result.removed);
        if (!body.childNodes.length) body.appendChild(el("p", null, "Không có khác biệt."));
        var dialog = builderDialog.open({
            title: "Khác biệt so với " + versions.compare.label,
            wide: true,
            className: "ub-modal-medium",
            body: body,
            buttons: [{ text: "Đóng", primary: true }]
        });
    };

    versions.compareBaseline = function () {
        if (versions.baseline) { versions.startCompare(versions.baseline, "bản gốc"); return; }
        var id = designId();
        if (!id) { builder.showToast("Thiết kế này chưa có bản gốc để so. Bản gốc được ghi khi tạo thiết kế từ Màn hình chuẩn hoặc Mẫu của team.", "info"); return; }
        post("GetDesignVersions", { controlId: id }).done(function (list) {
            var base = (list || []).filter(function (v) { return v.Kind === "baseline"; })[0];
            if (!base) {
                builder.showToast("Thiết kế này không có bản gốc. Mở Lịch sử phiên bản để so với một lần lưu trước.", "info");
                return;
            }
            post("LoadDesignVersion", { versionId: base.VersionId }).done(function (json) {
                if (!json) { builder.showToast("Không tải được bản gốc.", "error"); return; }
                versions.startCompare(json, "bản gốc");
            }).fail(function (xhr) { builder.showToast("Không tải được bản gốc. " + builder.ajaxErrorText(xhr), "error"); });
        }).fail(function (xhr) { builder.showToast("Không tải được lịch sử. " + builder.ajaxErrorText(xhr), "error"); });
    };

    versions.open = function () {
        var id = designId();
        if (!id) { builder.showToast("Hãy lưu thiết kế trước. Lịch sử phiên bản có từ lần lưu đầu tiên.", "info"); return; }
        var body = el("div", "ub-versions");
        body.appendChild(el("p", "ub-spec-hint", "Mỗi lần lưu có nội dung khác trước tạo một phiên bản. Giữ 30 phiên bản gần nhất."));
        var host = el("div", null, "Đang tải...");
        body.appendChild(host);
        var dialog = builderDialog.open({
            title: "Lịch sử phiên bản",
            wide: true,
            className: "ub-modal-medium",
            body: body,
            buttons: [{ text: "Đóng", primary: true }]
        });

        function load(version, done) {
            post("LoadDesignVersion", { versionId: version.VersionId }).done(function (json) {
                if (!json) { builder.showToast("Không tải được phiên bản này.", "error"); return; }
                done(json);
            }).fail(function (xhr) { builder.showToast("Không tải được phiên bản. " + builder.ajaxErrorText(xhr), "error"); });
        }

        post("GetDesignVersions", { controlId: id }).done(function (list) {
            host.textContent = "";
            list = list || [];
            if (!list.length) { host.textContent = "Chưa có phiên bản nào. Phiên bản đầu tiên được ghi ở lần lưu kế tiếp."; return; }
            var table = el("table", "ub-spec-table");
            var head = el("tr");
            ["Phiên bản", "Thời điểm", "Người lưu", "Số control", ""].forEach(function (text) { head.appendChild(el("th", null, text)); });
            table.appendChild(head);
            var latest = list.filter(function (v) { return v.Kind !== "baseline"; })[0];
            list.forEach(function (version) {
                var isBase = version.Kind === "baseline";
                var name = isBase ? "Bản gốc" : "Phiên bản " + version.VersionNo + (version === latest ? " (mới nhất)" : "");
                var tr = el("tr");
                tr.appendChild(el("td", "ub-spec-name", name));
                tr.appendChild(el("td", null, version.CreatedAt));
                tr.appendChild(el("td", null, version.CreatedBy));
                tr.appendChild(el("td", "ub-spec-no", String(version.ControlCount)));
                var actions = el("td", "ub-versions-actions");
                var compare = el("button", "ub-btn ub-btn-secondary", "So với bản đang mở");
                compare.type = "button";
                compare.addEventListener("click", function () {
                    load(version, function (json) {
                        dialog.close();
                        versions.startCompare(json, isBase ? "bản gốc" : "phiên bản " + version.VersionNo + " (" + version.CreatedAt + ")");
                    });
                });
                actions.appendChild(compare);
                if (version !== latest || builder.isDirty()) {
                    var restore = el("button", "ub-btn ub-btn-secondary", "Khôi phục");
                    restore.type = "button";
                    restore.addEventListener("click", function () {
                        load(version, function (json) {
                            dialog.close();
                            versions.stopCompare();
                            builder.restoreFromJson(json);
                            builder.refreshJson();
                            builder.showToast("Đã đưa nội dung " + name.toLowerCase() + " vào vùng thiết kế. Bấm Lưu để ghi lại, hoặc Ctrl+Z để quay về.", "success");
                        });
                    });
                    actions.appendChild(restore);
                }
                tr.appendChild(actions);
                table.appendChild(tr);
            });
            host.appendChild(table);
        }).fail(function (xhr) {
            host.textContent = "Không tải được lịch sử. " + builder.ajaxErrorText(xhr);
        });
    };

    $(function () {
        if (!window.builder) return;

        var refresh = builder.refreshJson;
        builder.refreshJson = function () {
            var result = refresh.apply(this, arguments);
            if (versions.compare) {
                if (versions.timer) clearTimeout(versions.timer);
                versions.timer = setTimeout(function () { versions.timer = null; versions.refreshCompare(); }, 150);
            }
            return result;
        };

        var markSaved = builder.markSaved;
        builder.markSaved = function (snapshot, savedNow) {
            var result = markSaved.apply(this, arguments);
            var id = designId();
            if (!savedNow) {
                versions.baseline = null;
                versions.baselineSavedFor = 0;
                versions.stopCompare();
            } else if (versions.baseline && id && versions.baselineSavedFor !== id) {
                versions.baselineSavedFor = id;
                post("SaveDesignBaseline", { controlId: id, baselineJson: versions.baseline }).fail(function () { versions.baselineSavedFor = 0; });
            }
            return result;
        };
    });

    window.builderVersions = versions;
})(window, jQuery);
