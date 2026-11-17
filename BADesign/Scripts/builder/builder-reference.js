(function (window, $) {
    "use strict";

    var MODES = ["off", "blend", "only"];
    var LABELS = { off: "Ảnh gốc", blend: "Ảnh gốc: chồng mờ", only: "Ảnh gốc: chỉ ảnh" };
    var MAX_ITEMS = 3;
    var reference = { items: [], mode: "off" };
    var lastKey = null;

    function designKey() {
        var info = builder.currentDesignInfo || {};
        var id = parseInt(info.ControlId, 10);
        return id > 0 && info.IsOwner && !info.IsClone ? "ref:" + id : "ref:new";
    }

    function persist() {
        var key = designKey();
        if (!window.builderStore || key === "ref:new") return;
        var work = reference.items.length
            ? builderStore.set(key, { items: reference.items, savedAt: Date.now() })
            : builderStore.remove(key);
        work.catch(function () { });
    }

    reference.visibleItems = function () {
        return reference.items.filter(function (item) { return !builder.getControlConfig(item.sourceId); });
    };

    function updateButton() {
        var count = reference.visibleItems().length;
        $("#refImageTools").toggle(count > 0);
        $("#btnRefImage").text(LABELS[reference.mode]).toggleClass("is-on", reference.mode !== "off");
    }

    reference.render = function () {
        var inner = document.getElementById("canvas-zoom-inner");
        if (!inner) return;
        $(inner).children(".ub-ref-image").remove();
        updateButton();
        if (reference.mode === "off") return;
        reference.visibleItems().forEach(function (item) {
            var img = document.createElement("img");
            img.className = "ub-ref-image" + (reference.mode === "only" ? " ub-ref-only" : "");
            img.alt = "";
            img.setAttribute("data-html2canvas-ignore", "true");
            img.style.left = (item.left || 0) + "px";
            img.style.top = (item.top || 0) + "px";
            img.src = item.imageData;
            inner.appendChild(img);
        });
    };

    function sync() {
        var want = reference.mode === "off" ? 0 : reference.visibleItems().length;
        if ($("#canvas-zoom-inner").children(".ub-ref-image").length !== want) reference.render();
        else updateButton();
    }

    reference.keep = function (src) {
        if (!src || typeof src.imageData !== "string" || src.imageData.indexOf("data:image/") !== 0) return false;
        reference.items = reference.items.filter(function (item) { return item.sourceId !== src.id; });
        reference.items.push({ sourceId: src.id, imageData: src.imageData, left: src.left || 0, top: src.top || 0 });
        while (reference.items.length > MAX_ITEMS) reference.items.shift();
        persist();
        return true;
    };

    reference.setMode = function (mode) {
        reference.mode = MODES.indexOf(mode) >= 0 ? mode : "off";
        reference.render();
    };

    reference.cycle = function () {
        reference.setMode(MODES[(MODES.indexOf(reference.mode) + 1) % MODES.length]);
    };

    reference.drop = function () {
        reference.items = [];
        reference.mode = "off";
        persist();
        reference.render();
    };

    function designChanged() {
        var key = designKey();
        var fresh = !(builder.controls || []).length;
        if (key === lastKey) {
            if (key === "ref:new" && fresh && reference.items.length) { reference.items = []; reference.mode = "off"; reference.render(); }
            return;
        }
        var carried = lastKey === "ref:new" && key !== "ref:new" && !fresh && reference.items.length > 0;
        lastKey = key;
        if (carried) { persist(); return; }
        reference.items = [];
        reference.mode = "off";
        reference.render();
        if (key === "ref:new" || !window.builderStore) return;
        builderStore.get(key).then(function (saved) {
            if (designKey() !== key || !saved || !Array.isArray(saved.items)) return;
            reference.items = saved.items.filter(function (item) {
                return item && typeof item.imageData === "string" && item.imageData.indexOf("data:image/") === 0;
            }).slice(-MAX_ITEMS);
            reference.render();
        }).catch(function () { });
    }

    $(function () {
        if (!window.builder) return;

        var setInfo = builder.setCurrentDesignInfo;
        builder.setCurrentDesignInfo = function () {
            var result = setInfo.apply(this, arguments);
            designChanged();
            return result;
        };

        var refresh = builder.refreshJson;
        builder.refreshJson = function () {
            var result = refresh.apply(this, arguments);
            sync();
            return result;
        };

        $("#canvasToolbar").on("click", "#btnRefImage", function () { reference.cycle(); });
        $("#canvasToolbar").on("click", "#btnRefImageDrop", function () {
            builder.showConfirm({
                title: "Bỏ ảnh gốc",
                message: "Bỏ ảnh gốc đang giữ để so sánh? Thiết kế không bị ảnh hưởng.",
                okText: "Bỏ ảnh gốc",
                onOk: function () { reference.drop(); }
            });
        });
        designChanged();
    });

    window.builderReference = reference;
})(window, jQuery);
