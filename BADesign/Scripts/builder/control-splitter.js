var controlSplitter = (function () {

    var HORIZONTAL = "horizontal";
    var VERTICAL = "vertical";
    var DEFAULT_SIZE = { width: 600, height: 300 };
    var MIN_PANE = 20;
    var MIN_CHILD = 20;
    var EDGE_SLACK = 2;
    var TALL_FIELDS = { tree: true, memo: true, image: true };
    var gesture = null;
    var lifted = {};

    function isSplitter(cfg) {
        return !!cfg && cfg.type === "field" && cfg.ftype === "splitter";
    }

    function isVertical(cfg) {
        return cfg.splitOrientation === VERTICAL;
    }

    function ensure(cfg) {
        cfg.splitOrientation = isVertical(cfg) ? VERTICAL : HORIZONTAL;
        cfg.splitGrip = cfg.splitGrip !== false;
        var ratio = parseFloat(cfg.splitRatio);
        cfg.splitRatio = ratio > 0 && ratio < 100 ? ratio : builderCapture.SPLIT.defaultRatio;
        return cfg;
    }

    function defaultSize() {
        return { width: DEFAULT_SIZE.width, height: DEFAULT_SIZE.height };
    }

    function room(cfg) {
        return builderCapture.SPLIT.room(isVertical(cfg) ? cfg.width : cfg.height);
    }

    function clampFirst(first, space) {
        if (space < MIN_PANE * 2) return Math.round(space / 2);
        return Math.min(space - MIN_PANE, Math.max(MIN_PANE, first));
    }

    function firstSize(cfg) {
        var space = room(cfg);
        return clampFirst(builderCapture.SPLIT.first(space, cfg.splitRatio), space);
    }

    function boxes(cfg) {
        var first = firstSize(cfg), second = room(cfg) - first;
        return isVertical(cfg)
            ? [{ width: first, height: cfg.height }, { width: second, height: cfg.height }]
            : [{ width: cfg.width, height: first }, { width: cfg.width, height: second }];
    }

    function paneOf(cfg) {
        return cfg.paneIndex === 1 ? 1 : 0;
    }

    function rootIn($field) {
        return $field.children(".page-field-editor").children(".core-splitter");
    }

    function paneElement($field, index) {
        return rootIn($field).children('.core-splitter-pane[data-pane="' + (index === 1 ? 1 : 0) + '"]');
    }

    function paneIndexOf(content) {
        var value = content ? content.getAttribute("data-pane") : null;
        if (value == null) return null;
        return value === "1" ? 1 : 0;
    }

    function draw($root, cfg) {
        ensure(cfg);
        var vertical = isVertical(cfg);
        $root.toggleClass("core-splitter-v", vertical).toggleClass("core-splitter-h", !vertical);
        $root.children('.core-splitter-pane[data-pane="0"]').css("flex-basis", firstSize(cfg) + "px");
        var $bar = $root.children(".core-splitter-bar").css("flex-basis", builderCapture.METRICS.core.splitter + "px");
        $bar.children(".core-splitter-grip").remove();
        if (cfg.splitGrip) $bar.append('<i class="core-splitter-grip"></i>');
    }

    function redraw(cfg) {
        var $root = rootIn(builder.controlElement(cfg));
        if ($root.length) draw($root, cfg);
    }

    function stretchesHeight(child) {
        return child.type === "tabpage" || builder.isContainerConfig(child) ||
            (child.type === "field" && TALL_FIELDS[child.ftype] === true);
    }

    function reachesEdge(offset, size, room) {
        return (offset || 0) + size >= room - EDGE_SLACK;
    }

    function sameTab(a, b) {
        var tab = a.tabPageId || null;
        return tab === (b.tabPageId || null) && (!tab || a.tabIndex === b.tabIndex);
    }

    function isLowest(child, siblings) {
        var left = child.left || 0, right = left + child.width, top = child.top || 0;
        return !siblings.some(function (other) {
            if (other === child || paneOf(other) !== paneOf(child) || !sameTab(other, child)) return false;
            var otherLeft = other.left || 0;
            return (other.top || 0) > top && otherLeft < right && otherLeft + (other.width || 1) > left;
        });
    }

    function tabPageOf(child, siblings) {
        if (!child.tabPageId) return null;
        return siblings.filter(function (c) { return c.id === child.tabPageId && paneOf(c) === paneOf(child); })[0] || null;
    }

    // Lưới kéo dài tới mép dưới của vùng. Lưới có chiều cao riêng: khi đang chạm mép dưới.
    // Lưới cao theo số dòng (lưới Core; lưới ESS chỉ khi vừa bám mép dưới ở chỗ cũ, wasDocked): khi không control nào cùng vùng, cùng tab
    // bắt đầu thấp hơn nó; lưới nằm trong tab page thì tab page cũng phải chạm mép dưới.
    function docksHeight(child, pane, siblings, wasDocked) {
        var grid = gridModule(child);
        if (!grid) return false;
        if (grid.hasOwnHeight(child)) return reachesEdge(child.top, child.height, pane.height);
        if (child.type !== "grid" && !wasDocked) return false;
        var tab = tabPageOf(child, siblings);
        return isLowest(child, siblings) && (!tab || reachesEdge(tab.top, tab.height, pane.height));
    }

    // Chiều cao đang vẽ của lưới ESS (chiều cao riêng, hoặc đo trên canvas khi cao theo số dòng); lưới khác, lưới chưa vẽ hoặc đang ẩn: null.
    function drawnHeight(child) {
        if (child.type !== "ess-grid") return null;
        return controlGridEss.hasOwnHeight(child) ? child.height : controlGridEss.naturalHeight(child);
    }

    // Lưới ESS có mép dưới lọt khỏi vùng.
    function overflowsPane(child, pane) {
        var height = drawnHeight(child);
        return height !== null && (child.top || 0) + height > pane.height;
    }

    // Vùng đang chứa control (kích thước vùng và các control cùng Splitter), tính từ cấu hình trong danh sách controls.
    function hostOf(child, controls) {
        if (!child.parentId) return null;
        var parent = controls.filter(function (c) { return c && c.id === child.parentId; })[0];
        if (!isSplitter(parent)) return null;
        return {
            pane: boxes(ensure(parent))[paneOf(child)],
            siblings: controls.filter(function (c) { return c && c.parentId === parent.id; })
        };
    }

    // Module của loại lưới (Core hoặc ESS), nơi có bề rộng nhỏ nhất (MIN_WIDTH), chiều cao riêng (hasOwnHeight, setOwnHeight)
    // và cách vẽ lại kích thước (applyHeight, applySize); control khác: null.
    function gridModule(cfg) {
        if (cfg.type === "grid") return controlGrid;
        if (cfg.type === "ess-grid") return controlGridEss;
        return null;
    }

    // Lưới vừa tới một vùng (thả, dán, dời). Sửa cấu hình; chiều cao của lưới ESS đọc trên canvas (lưới chưa vẽ thì bỏ qua).
    // was (từ lift, không có khi dán): right — lưới mới, hoặc đang chạm mép phải ở chỗ cũ; bottom — lưới đang bám mép dưới ở chỗ cũ.
    // Bề rộng (lưới Core và lưới ESS): lưới rộng quá mép phải, hoặc was.right, thì rộng tới mép phải của vùng.
    // Chiều cao: lưới đủ điều kiện bám mép dưới (docksHeight), hoặc lưới ESS có mép dưới lọt khỏi vùng, thì cao khít mép dưới của vùng.
    function fit(child, controls, was) {
        var grid = gridModule(child);
        if (!grid) return;
        var host = hostOf(child, controls);
        if (!host) return;
        var moved = was || {}, left = child.left || 0;
        if (moved.right || left + child.width > host.pane.width) child.width = Math.max(grid.MIN_WIDTH, host.pane.width - left);
        if (docksHeight(child, host.pane, host.siblings, moved.bottom) || overflowsPane(child, host.pane)) {
            grid.setOwnHeight(child, Math.max(MIN_CHILD, host.pane.height - (child.top || 0)));
        }
    }

    // Trước khi control rời chỗ cũ: nhớ lưới đang chạm mép phải của vùng hay không, đang bám mép dưới (chiều cao riêng chạm mép dưới) hay không.
    function lift(child) {
        delete lifted[child.id];
        var grid = gridModule(child);
        var host = grid ? hostOf(child, builder.controls || []) : null;
        if (!host) return;
        lifted[child.id] = {
            right: reachesEdge(child.left, child.width, host.pane.width),
            bottom: grid.hasOwnHeight(child) && reachesEdge(child.top, child.height, host.pane.height)
        };
    }

    // Sau khi control đã ở chỗ mới. isNew: lưới vừa thêm từ Toolbox, bề rộng còn là mặc định nên rộng theo vùng.
    // Chiều cao lúc bám mép là của vùng cũ nên bỏ đi rồi tính lại theo chỗ mới
    // (ngoài Splitter hoặc không còn là control dưới cùng: lưới về chiều cao theo số dòng).
    function land(child, isNew) {
        var was = lifted[child.id] || { right: isNew === true, bottom: false };
        delete lifted[child.id];
        var grid = gridModule(child);
        if (!grid) return;
        var width = child.width, height = child.height, own = grid.hasOwnHeight(child);
        if (was.bottom) grid.setOwnHeight(child, undefined);
        fit(child, builder.controls || [], was);
        if (child.width !== width || child.height !== height || grid.hasOwnHeight(child) !== own) grid.applySize(child);
    }

    // Ghi lại trước khi các vùng đổi kích thước: control nào đang chạm mép xa của vùng thì sẽ giãn theo vùng.
    // Chỉ xét control nằm trực tiếp trong vùng; Splitter lồng bên trong được ghi tiếp theo cùng cách.
    function snapshot(cfg) {
        var panes = boxes(cfg);
        var children = (builder.controls || []).filter(function (c) { return c && c.parentId === cfg.id; });
        return {
            id: cfg.id,
            panes: panes,
            children: children.map(function (c) {
                var pane = panes[paneOf(c)];
                var hasWidth = typeof c.width === "number", hasHeight = typeof c.height === "number";
                var grid = gridModule(c), docks = docksHeight(c, pane, children);
                return {
                    id: c.id,
                    pane: paneOf(c),
                    width: c.width,
                    height: c.height,
                    ownHeight: !!grid && grid.hasOwnHeight(c),
                    fillsWidth: hasWidth && reachesEdge(c.left, c.width, pane.width),
                    fillsHeight: hasHeight && stretchesHeight(c) && reachesEdge(c.top, c.height, pane.height),
                    docksHeight: docks,
                    drawnHeight: docks ? null : drawnHeight(c),
                    inner: isSplitter(c) ? snapshot(c) : null
                };
            })
        };
    }

    function follow(size, delta) {
        return Math.max(MIN_CHILD, size + delta);
    }

    // Chiều cao riêng mới của lưới khi vùng đổi từ from sang to; undefined: như lúc bắt đầu thao tác.
    // Lưới bám mép dưới (docksHeight) cao khít mép dưới của vùng; lưới ESS khác (drawnHeight) chỉ thu lại khi mép dưới lọt khỏi vùng.
    function gridHeightIn(child, item, from, to) {
        var room = Math.max(MIN_CHILD, to.height - (child.top || 0));
        if (item.docksHeight) return to.height === from.height ? undefined : room;
        return (child.top || 0) + item.drawnHeight > to.height ? room : undefined;
    }

    function setSize(child, item, side, size) {
        if (size !== child[side]) {
            child[side] = size;
            builder.controlElement(child).css(side, size + "px");
        }
        return size !== item[side];
    }

    // height là undefined: trở lại như lúc bắt đầu thao tác (chiều cao riêng, hoặc cao theo số dòng; lưới ESS lấy lại cả chiều cao ước tính).
    function setGridHeight(child, item, height) {
        var grid = gridModule(child);
        var before = child.height, beforeOwn = grid.hasOwnHeight(child);
        if (height !== undefined) grid.setOwnHeight(child, height);
        else if (before !== item.height || beforeOwn !== item.ownHeight) {
            grid.setOwnHeight(child, item.ownHeight ? item.height : undefined, item.height);
        }
        var own = grid.hasOwnHeight(child);
        if (child.height !== before || own !== beforeOwn) grid.applyHeight(child, builder.controlElement(child));
        return child.height !== item.height || own !== item.ownHeight;
    }

    function applySnapshot(cfg, shot) {
        var panes = boxes(cfg);
        var changed = false;
        shot.children.forEach(function (item) {
            var child = builder.getControlConfig(item.id);
            if (!child) return;
            var from = shot.panes[item.pane], to = panes[item.pane];
            if (item.fillsWidth && setSize(child, item, "width", follow(item.width, to.width - from.width))) changed = true;
            if (item.fillsHeight && setSize(child, item, "height", follow(item.height, to.height - from.height))) changed = true;
            var heightByPane = item.docksHeight || item.drawnHeight !== null;
            if (heightByPane && setGridHeight(child, item, gridHeightIn(child, item, from, to))) changed = true;
            if (item.inner) {
                redraw(child);
                if (applySnapshot(child, item.inner)) changed = true;
            }
        });
        return changed;
    }

    function beginResize(cfg) {
        ensure(cfg);
        gesture = snapshot(cfg);
    }

    function resizing(cfg) {
        redraw(cfg);
        if (gesture && gesture.id === cfg.id) gesture.changed = applySnapshot(cfg, gesture);
    }

    // Control con đã đổi kích thước thì dựng lại cả thiết kế theo cấu hình mới (cùng đường với Undo), để mỗi loại control tự vẽ lại theo cỡ mới.
    function endResize(cfg) {
        var done = gesture && gesture.id === cfg.id ? gesture : null;
        gesture = null;
        if (!done) return;
        resizing(cfg);
        if (!applySnapshot(cfg, done)) return;
        var selected = builder.selectedControlId === cfg.id;
        builder.restoreFromJson(JSON.stringify(builder.controls));
        if (selected) controlField.showProperties(builder.getControlConfig(cfg.id));
    }

    function bindBar($bar, id) {
        var start = null;
        interact($bar[0]).styleCursor(false).draggable({
            listeners: {
                start: function () {
                    var cfg = builder.getControlConfig(id);
                    if (!cfg) return;
                    beginResize(cfg);
                    start = { first: firstSize(cfg), travel: 0 };
                },
                move: function (ev) {
                    var cfg = builder.getControlConfig(id);
                    if (!cfg || !start) return;
                    start.travel += (isVertical(cfg) ? ev.dx : ev.dy) / builder.cssScale();
                    var step = builder.snapEnabled ? builder.snapStep : 1;
                    var space = room(cfg);
                    var first = clampFirst(Math.round((start.first + start.travel) / step) * step, space);
                    cfg.splitRatio = builderCapture.SPLIT.ratio(first, space);
                    resizing(cfg);
                },
                end: function () {
                    var cfg = builder.getControlConfig(id);
                    start = null;
                    if (!cfg) return;
                    endResize(cfg);
                    builder.refreshJson();
                    refreshShares(builder.getControlConfig(id));
                }
            }
        });
    }

    // Giới hạn khi kéo giãn một control bằng tay nắm (danh sách modifier của interact.js): không nhỏ hơn minWidth x minHeight
    // (đơn vị thiết kế), và nếu control nằm trong vùng của Splitter thì mép phải, mép dưới dừng ở mép của vùng gần nhất chứa nó,
    // nên tay nắm không bị vùng che mất. Modifier áp theo thứ tự nên mép vùng thắng: vùng còn ít chỗ hơn mức nhỏ nhất
    // thì control chỉ tới mép vùng.
    function resizeLimits(minWidth, minHeight) {
        return [
            interact.modifiers.restrictSize({
                min: function () {
                    var scale = builder.cssScale();
                    return { width: minWidth * scale, height: minHeight * scale };
                }
            }),
            interact.modifiers.restrictEdges({ outer: ".core-splitter-pane" })
        ];
    }

    var hovered = null;

    // Nút dời hiện khi con trỏ ở trên phần của chính một Splitter (thanh chia, chỗ trống của vùng, nút dời), không hiện khi ở trên control con.
    function trackHover(e) {
        var control = e.target.closest ? e.target.closest("#canvas .canvas-control") : null;
        var own = control && control.classList.contains("page-field-splitter") ? control : null;
        if (own === hovered) return;
        if (hovered) hovered.classList.remove("core-splitter-hover");
        hovered = own;
        if (own) own.classList.add("core-splitter-hover");
    }

    $(document).on("mouseover", trackHover);

    function build(cfg) {
        var $root = $('<div class="core-splitter">' +
            '<div class="core-splitter-pane" data-pane="0"></div>' +
            '<div class="core-splitter-bar"></div>' +
            '<div class="core-splitter-pane" data-pane="1"></div>' +
            '<span class="core-splitter-move" title="Kéo để dời Splitter"></span>' +
            '</div>');
        draw($root, cfg);
        bindBar($root.children(".core-splitter-bar"), cfg.id);
        return $root;
    }

    function share(cfg) {
        return Math.round(cfg.splitRatio * 100) / 100;
    }

    function refreshShares(cfg) {
        if (!cfg || $("#pfSplitFirst").attr("data-id") !== cfg.id) return;
        $("#pfSplitFirst").val(share(cfg));
        $("#pfSplitSecond").val(Math.round((100 - share(cfg)) * 100) / 100);
    }

    function propertiesHtml(cfg) {
        ensure(cfg);
        var P = builderProps;
        return P.section("Splitter",
            P.line(P.field("Hướng thanh chia", P.select({ id: "pfSplitOrientation" },
                [[HORIZONTAL, "Ngang (hai vùng trên / dưới)"], [VERTICAL, "Dọc (hai vùng trái / phải)"]], cfg.splitOrientation), null, "pfSplitOrientation")) +
            P.grid(
                P.field("Vùng 1 (%)", P.number({ id: "pfSplitFirst", "data-id": cfg.id, min: 1, max: 99, step: "any", value: share(cfg) }), "pp-field--num", "pfSplitFirst"),
                P.field("Vùng 2 (%)", P.number({ id: "pfSplitSecond", "data-id": cfg.id, min: 1, max: 99, step: "any", value: Math.round((100 - share(cfg)) * 100) / 100 }), "pp-field--num", "pfSplitSecond")) +
            P.checks([P.check({ id: "pfSplitGrip" }, "Nút nắm", cfg.splitGrip)]));
    }

    function bindProperties(cfg) {
        function resize(change) {
            beginResize(cfg);
            change();
            ensure(cfg);
            endResize(cfg);
            builder.refreshJson();
            var fresh = builder.getControlConfig(cfg.id);
            if (fresh !== cfg) return;
            refreshShares(cfg);
        }
        function setShare(input, ofFirst) {
            var value = parseFloat(input.value);
            if (!(value > 0 && value < 100)) {
                refreshShares(cfg);
                return;
            }
            resize(function () {
                var space = room(cfg);
                var ratio = ofFirst ? value : 100 - value;
                var wanted = builderCapture.SPLIT.first(space, ratio);
                var first = clampFirst(wanted, space);
                cfg.splitRatio = first === wanted ? ratio : builderCapture.SPLIT.ratio(first, space);
            });
        }
        $("#pfSplitOrientation").on("change", function () {
            var value = this.value;
            if (value === cfg.splitOrientation) return;
            resize(function () { cfg.splitOrientation = value; });
        });
        $("#pfSplitFirst").on("change", function () { setShare(this, true); });
        $("#pfSplitSecond").on("change", function () { setShare(this, false); });
        $("#pfSplitGrip").on("change", function () {
            cfg.splitGrip = this.checked;
            redraw(cfg);
            builder.refreshJson();
        });
    }

    return {
        dragIgnore: ".core-splitter-pane, .core-splitter-bar",
        isSplitter: isSplitter,
        ensure: ensure,
        defaultSize: defaultSize,
        boxes: boxes,
        build: build,
        redraw: redraw,
        paneElement: paneElement,
        paneIndexOf: paneIndexOf,
        beginResize: beginResize,
        resizing: resizing,
        endResize: endResize,
        fit: fit,
        lift: lift,
        land: land,
        resizeLimits: resizeLimits,
        propertiesHtml: propertiesHtml,
        bindProperties: bindProperties
    };
})();

if (typeof window !== "undefined") {
    window.controlSplitter = controlSplitter;
}
