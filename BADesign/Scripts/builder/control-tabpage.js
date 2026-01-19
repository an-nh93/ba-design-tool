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
  <div class="page-field-resizer"></div>
</div>`);

        $tab.css({
            position: "absolute",
            left: cfg.left,
            top: cfg.top,
            width: cfg.width,
            height: cfg.height
        });
        if (cfg.zIndex != null) $tab.css("z-index", cfg.zIndex);

        $canvas.append($tab);

        renderTabsHeader($tab, cfg);

        // Drag tab page + di chuyển luôn con/cháu field
        var tabInteract = interact($tab[0]);

        tabInteract.draggable({
            ignoreFrom: ".tabpage-tabs, .page-field-resizer",
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: document.getElementById("canvas"),
                    endOnly: true
                })
            ],
            listeners: {
                move: function (ev) {
                    var dx = ev.dx;
                    var dy = ev.dy;

                    var curL = parseFloat($tab.css("left")) || cfg.left || 0;
                    var curT = parseFloat($tab.css("top")) || cfg.top || 0;
                    var nl = curL + dx;
                    var nt = curT + dy;

                    $tab.css({ left: nl, top: nt });
                    cfg.left = nl;
                    cfg.top = nt;

                    // Move toàn bộ field con/cháu của tab
                    if (window.controlField && typeof controlField.moveDescendants === "function") {
                        controlField.moveDescendants(cfg.id, dx, dy, false);
                    }

                    builder.refreshJson();
                }
            }
        });

        // Resize tab page (phải + đáy)
        tabInteract.resizable({
            edges: { right: true, bottom: true },
            allowFrom: ".page-field-resizer, .canvas-tabpage",
            modifiers: [
                interact.modifiers.restrictEdges({
                    outer: document.getElementById("canvas")
                }),
                interact.modifiers.restrictSize({
                    min: { width: 300, height: 150 }
                })
            ],
            listeners: {
                move: function (ev) {
                    var newW = ev.rect.width;
                    var newH = ev.rect.height;

                    cfg.width = newW;
                    cfg.height = newH;

                    $tab.css({ width: newW, height: newH });
                    builder.refreshJson();
                }
            }
        });

        // Chọn tab page
        $tab.on("mousedown", function (e) {
            // nếu click tab header thì đã xử lý ở trên rồi
            if ($(e.target).closest(".tabpage-tab").length) return;

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

        var htmlTabs = (cfg.tabs || []).map(function (t, idx) {
            return `
<div>
  Caption: <input type="text" class="tpCaption" data-idx="${idx}" value="${t.caption || ""}" />
  <button type="button" class="btnTpRemove" data-idx="${idx}">x</button>
</div>`;
        }).join("");

        var activeOptions = (cfg.tabs || []).map(function (t, idx) {
            var text = (idx + 1) + " - " + (t.caption || ("Tab " + (idx + 1)));
            var sel = (cfg.activeTabIndex === idx) ? "selected" : "";
            return `<option value="${idx}" ${sel}>${text}</option>`;
        }).join("");

        var html = `
<h3>Tab page</h3>
<div class="prop-section">
  <div><b>ID:</b> ${cfg.id}</div>
</div>
<div class="prop-section">
  Width: <input id="tpWidth" type="number" class="prop-input-small" value="${cfg.width}" />
  Height: <input id="tpHeight" type="number" class="prop-input-small" value="${cfg.height}" />
</div>
<div class="prop-section">
  ${htmlTabs}
  <button type="button" id="btnTpAddTab">+ Add tab</button>
</div>
<div class="prop-section">
  Active tab:
  <select id="tpActiveTab">${activeOptions}</select>
</div>
<div class="prop-section">
  <button type="button" onclick="builder.saveControlToServer('${cfg.id}')">💾 Lưu control này vào DB</button>
</div>`;

        $("#propPanel").html(html);

        // Width / height
        $("#tpWidth").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.width = v;
                getDom(cfg).css("width", v);
                builder.refreshJson();
            }
        });
        $("#tpHeight").on("change", function () {
            var v = parseInt(this.value || "0", 10);
            if (!isNaN(v) && v > 0) {
                cfg.height = v;
                getDom(cfg).css("height", v);
                builder.refreshJson();
            }
        });

        // Caption change
        $(".tpCaption").on("input", function () {
            var idx = parseInt($(this).data("idx"), 10);
            var t = cfg.tabs[idx];
            if (!t) return;
            t.caption = this.value;
            renderTabsHeader(getDom(cfg), cfg);

            // Cập nhật lại dropdown Active tab
            showProperties(cfg);
            builder.refreshJson();
        });

        // Remove tab
        $(".btnTpRemove").on("click", function () {
            var idx = parseInt($(this).data("idx"), 10);
            if (!confirm("Remove tab " + (idx + 1) + " ?")) return;
            cfg.tabs.splice(idx, 1);
            if (cfg.activeTabIndex >= cfg.tabs.length) cfg.activeTabIndex = cfg.tabs.length - 1;
            renderTabsHeader(getDom(cfg), cfg);
            showProperties(cfg);
            builder.refreshJson();
        });

        // Add tab
        $("#btnTpAddTab").on("click", function () {
            cfg.tabs.push({ caption: "New tab" });
            renderTabsHeader(getDom(cfg), cfg);
            showProperties(cfg);
            builder.refreshJson();
        });

        // Active tab dropdown
        $("#tpActiveTab").on("change", function () {
            var idx = parseInt(this.value || "0", 10);
            if (isNaN(idx)) idx = 0;
            cfg.activeTabIndex = idx;
            applyActiveTab(cfg);
            builder.refreshJson();
        });
    }

    // ====== PUBLIC API ======
    return {
        addNew: function () {
            var cfg = newConfig();
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
        }
    };
})();
