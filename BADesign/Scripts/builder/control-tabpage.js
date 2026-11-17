var controlTabPage = (function () {

    function newConfig() {
        return {
            id: "tab_" + Date.now(),
            type: "tabpage",
            left: 250,
            top: 180,
            width: 900,
            height: 220,
            tabs: [
                { caption: "General" },
                { caption: "Shift" },
                { caption: "Overtime" }
            ],
            activeTabIndex: 0,
            zIndex: 0
        };
    }

    function getDom(cfg) {
        return $('.canvas-control.canvas-tabpage[data-id="' + cfg.id + '"]');
    }

    function moveMembers(cfg, dx, dy) {
        if (!dx && !dy) return;
        var owner = builder.containerOf(cfg);
        (builder.controls || []).forEach(function (c) {
            if (!c || c.tabPageId !== cfg.id || builder.containerOf(c) !== owner) return;
            c.left = (c.left || 0) + dx;
            c.top = (c.top || 0) + dy;
            $('.canvas-control[data-id="' + c.id + '"]').css({ left: c.left + "px", top: c.top + "px" });
        });
    }

    function syncMember(cfg) {
        if (!cfg || !cfg.tabPageId) return;
        var tab = (builder.controls || []).find(function (c) { return c && c.id === cfg.tabPageId && c.type === "tabpage"; });
        if (!tab) return;
        var index = (typeof cfg.tabIndex === "number") ? cfg.tabIndex : 0;
        var $dom = $('.canvas-control[data-id="' + cfg.id + '"]');
        if (index === (tab.activeTabIndex || 0)) $dom.show();
        else $dom.hide();
    }

    function applyActiveTab(cfg) {
        var $dom = getDom(cfg);
        var $lis = $dom.find(".tabpage-tab");

        if (!cfg.tabs || !cfg.tabs.length) return;

        if (cfg.activeTabIndex == null ||
            cfg.activeTabIndex < 0 ||
            cfg.activeTabIndex >= cfg.tabs.length) {
            cfg.activeTabIndex = 0;
        }

        $lis.removeClass("active");
        $lis.eq(cfg.activeTabIndex).addClass("active");

        // Ẩn/hiện field trong tab
        if (window.controlField && typeof controlField.applyTabVisibilityFor === "function") {
            controlField.applyTabVisibilityFor(cfg);
        }
    }

    function renderTabsHeader($dom, cfg) {
        var $ul = $dom.find(".tabpage-tabs").empty();

        (cfg.tabs || []).forEach(function (t, idx) {
            var $li = $('<li class="tabpage-tab"></li>')
                .text(t.caption || ("Tab " + (idx + 1)))
                .attr("data-tab-index", idx);

            $li.on("click", function (e) {
                e.stopPropagation();
                if ($dom.data("tabDragged")) return;
                cfg.activeTabIndex = idx;
                applyActiveTab(cfg);

                // Sync dropdown trong properties nếu đang chọn tab này
                if (builder.selectedControlId === cfg.id && builder.selectedControlType === "tabpage") {
                    $("#tpActiveTab").val(String(idx));
                }
                builder.refreshJson();
            });

            $ul.append($li);
        });

        applyActiveTab(cfg);
    }

    function render(cfg) {
        var $canvas = $("#canvas");

        var $tab = $(`
<div class="canvas-control canvas-tabpage" data-id="${cfg.id}">
  <ul class="tabpage-tabs"></ul>
  <div class="tabpage-body"></div>
  <div class="ub-resize ub-resize-right"></div>
  <div class="ub-resize ub-resize-bottom"></div>
  <div class="ub-resize ub-resize-corner"></div>
</div>`);

        $tab.css({
            position: "absolute",
            left: cfg.left,
            top: cfg.top,
            width: cfg.width,
            height: cfg.height
        });
        if (cfg.zIndex != null) $tab.css("z-index", cfg.zIndex);

        $("#canvas-zoom-inner").append($tab);

        renderTabsHeader($tab, cfg);

        // Drag tab page + di chuyển luôn con/cháu field
        var tabInteract = interact($tab[0]);
        var dragLeft = 0;
        var dragTop = 0;

        tabInteract.draggable({
            allowFrom: ".tabpage-tabs",
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: document.getElementById("canvas"),
                    endOnly: true
                })
            ],
            listeners: {
                start: function () {
                    dragLeft = cfg.left || 0;
                    dragTop = cfg.top || 0;
                    builder.claimTabMembers(cfg);
                },
                move: function (ev) {
                    $tab.data("tabDragged", true);
                    if (builder.dragSelectionBy(cfg.id, ev.dx, ev.dy)) return;
                    var shift = function (stepX, stepY) {
                        var scale = builder.cssScale();
                        dragLeft += stepX / scale;
                        dragTop += stepY / scale;

                        // Không cho kéo ra ngoài top/left của canvas (ruler boundary: 20px)
                        var edge = builder.containerOf(cfg) ? 0 : 20;
                        var nl = Math.max(edge, Math.round(dragLeft));
                        var nt = Math.max(edge, Math.round(dragTop));
                        var dx = nl - (cfg.left || 0);
                        var dy = nt - (cfg.top || 0);

                        $tab.css({ left: nl, top: nt });
                        cfg.left = nl;
                        cfg.top = nt;

                        moveMembers(cfg, dx, dy);
                    };
                    var step = builder.dragStep(ev.dx, ev.dy, shift);
                    shift(step.dx, step.dy);
                },
                end: function (ev) {
                    setTimeout(function () { $tab.removeData("tabDragged"); }, 0);
                    if (builder.finishSelectionDrag(cfg.id, ev)) return;
                    builder.refreshJson();
                }
            }
        });

        // Resize tab page (phải + đáy)
        tabInteract.resizable({
            edges: { right: ".ub-resize-right, .ub-resize-corner", bottom: ".ub-resize-bottom, .ub-resize-corner" },
            listeners: {
                move: function (ev) {
                    var scale = builder.cssScale();
                    var newW = Math.max(300, Math.round(ev.rect.width / scale));
                    var newH = Math.max(150, Math.round(ev.rect.height / scale));

                    cfg.width = newW;
                    cfg.height = newH;

                    $tab.css({ width: newW, height: newH });
                },
                end: function () {
                    builder.refreshJson();
                }
            }
        });

        // Chọn tab page
        $tab.on("mousedown", function (e) {
            if (builder.isTabBody(e.target)) return;

            e.stopPropagation();
            $(".canvas-control").removeClass("canvas-control-selected");
            $(this).addClass("canvas-control-selected");

            builder.selectedControlId = cfg.id;
            builder.selectedControlType = "tabpage";
            showProperties(cfg);
        });
    }

    // ====== PROPERTIES PANEL ======
    function showProperties(cfg) {
        builder.selectedControlId = cfg.id;
        builder.selectedControlType = "tabpage";

        $(".canvas-control").removeClass("canvas-control-selected");
        getDom(cfg).addClass("canvas-control-selected");

        var P = builderProps;
        var tabCount = (cfg.tabs || []).length;
        var rows = (cfg.tabs || []).map(function (t, idx) {
            return P.row({
                attrs: { "class": "pp-cols-0", "data-tab-index": idx },
                head: P.rowNo(idx + 1) + P.text({ "class": "tpCaption", "data-idx": idx, value: t.caption || "", placeholder: "Tên tab" }),
                tools: P.iconButton({ "class": "pp-icon-btn--danger btnTpRemove", "data-idx": idx, title: "Xóa tab" }, "×")
            });
        }).join("");
        var activeOptions = (cfg.tabs || []).map(function (t, idx) {
            return [idx, (idx + 1) + " - " + (t.caption || ("Tab " + (idx + 1)))];
        });

        P.render(P.panel("Tab Page", "ID: " + cfg.id,
            P.section("Kích thước", P.grid(
                P.field("Rộng", P.number({ id: "tpWidth", value: cfg.width }), "pp-field--num", "tpWidth"),
                P.field("Cao", P.number({ id: "tpHeight", value: cfg.height }), "pp-field--num", "tpHeight"))) +
            P.section("Tab", P.rows({ id: "tpTabsPanel" }, rows), {
                count: tabCount,
                action: P.button({ id: "btnTpAddTab", "class": "pp-btn--primary pp-btn--small" }, "＋ Thêm tab")
            }) +
            P.section("Tab đang mở", P.line(P.field("Chọn tab", P.select({ id: "tpActiveTab" }, activeOptions, cfg.activeTabIndex), null, "tpActiveTab"))),
            P.saveButton(cfg.id)));

        // Width / height
        $("#tpWidth").off("change.tp").on("change.tp", function () {
            var v = parseInt($(this).val() || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.width = v;
                getDom(cfg).css("width", v);
                builder.refreshJson();
            }
        });
        $("#tpHeight").off("change.tp").on("change.tp", function () {
            var v = parseInt($(this).val() || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.height = v;
                getDom(cfg).css("height", v);
                builder.refreshJson();
            }
        });

        // Caption change
        $(".tpCaption").off("input.tp change.tp").on("input.tp change.tp", function () {
            var idx = parseInt($(this).closest('.pp-row').data('tab-index'), 10);
            var t = cfg.tabs[idx];
            if (!t) return;
            t.caption = $(this).val();
            renderTabsHeader(getDom(cfg), cfg);

            // Cập nhật lại dropdown Active tab
            $("#tpActiveTab option").eq(idx).text((idx + 1) + " - " + (t.caption || ("Tab " + (idx + 1))));
            builder.refreshJson();
        });

        // Remove tab
        $(".btnTpRemove").off("click.tp").on("click.tp", function () {
            var idx = parseInt($(this).closest('.pp-row').data('tab-index'), 10);
            if (!confirm("Xóa tab " + (idx + 1) + "?")) return;
            cfg.tabs.splice(idx, 1);
            if (cfg.activeTabIndex >= cfg.tabs.length) cfg.activeTabIndex = cfg.tabs.length - 1;
            renderTabsHeader(getDom(cfg), cfg);
            showProperties(cfg);
            builder.refreshJson();
        });

        // Add tab
        $("#btnTpAddTab").off("click.tp").on("click.tp", function () {
            cfg.tabs = cfg.tabs || [];
            cfg.tabs.push({ caption: "Tab " + (cfg.tabs.length + 1) });
            renderTabsHeader(getDom(cfg), cfg);
            showProperties(cfg);
            builder.refreshJson();
        });

        // Active tab dropdown
        $("#tpActiveTab").off("change.tp").on("change.tp", function () {
            var idx = parseInt($(this).val() || "0", 10);
            if (isNaN(idx)) idx = 0;
            cfg.activeTabIndex = idx;
            applyActiveTab(cfg);
            builder.refreshJson();
        });
    }

    // ====== PUBLIC API ======
    return {
        addNew: function (dropPoint) {
            var cfg = newConfig();
            builder.placeAtDropPoint(cfg, dropPoint);
            render(cfg);
            builder.registerControl(cfg);
            builder.refreshJson();
            showProperties(cfg);
        },
        renderExisting: function (cfg) {
            // phòng trường hợp mở lại từ JSON
            cfg.type = cfg.type || "tabpage";
            cfg.tabs = cfg.tabs || [{ caption: "General" }];
            cfg.activeTabIndex = cfg.activeTabIndex || 0;
            render(cfg);
        },
        syncMember: syncMember,
        showProperties: showProperties
    };
})();
