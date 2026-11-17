(function (window, $) {
    "use strict";

    var SAVE_DELAY = 1500;
    var PING_EVERY = 5 * 60 * 1000;
    var draft = { timer: null, shown: null, lastActivity: Date.now(), lastPing: Date.now(), pingOff: false };

    function noop() { }

    function designKey() {
        var info = builder.currentDesignInfo || {};
        var id = parseInt(info.ControlId, 10);
        return id > 0 && info.IsOwner && !info.IsClone ? "draft:" + id : "draft:new";
    }

    function hash(text) {
        var h = 5381;
        for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
        return text.length + ":" + h;
    }

    function two(n) { return (n < 10 ? "0" : "") + n; }

    function timeText(ms) {
        var d = new Date(ms);
        return two(d.getHours()) + ":" + two(d.getMinutes()) + " ngày " + two(d.getDate()) + "/" + two(d.getMonth() + 1);
    }

    function notice(id) {
        var $host = $("#ubNotices");
        if (!$host.length) $host = $('<div id="ubNotices" class="ub-notices"></div>').appendTo("body");
        $host.children('[data-notice="' + id + '"]').remove();
        return $('<div class="ub-notice"></div>').attr("data-notice", id).appendTo($host);
    }

    function closeNotice(id) {
        $("#ubNotices").children('[data-notice="' + id + '"]').remove();
    }

    function button(text, primary, onClick) {
        return $('<button type="button" class="ub-notice-btn"></button>').toggleClass("is-primary", !!primary).text(text).on("click", onClick);
    }

    draft.write = function () {
        if (draft.timer) { clearTimeout(draft.timer); draft.timer = null; }
        if (!window.builderStore || builder.readOnly) return;
        var key = designKey();
        var json = JSON.stringify(builder.controls || []);
        if (json === builder.savedSnapshot || json === "[]") {
            builderStore.remove(key).catch(noop);
            return;
        }
        builderStore.set(key, {
            json: json,
            name: (builder.currentDesignInfo || {}).Name || "",
            count: (builder.controls || []).length,
            base: hash(builder.savedSnapshot || "[]"),
            savedAt: Date.now()
        }).catch(noop);
    };

    draft.schedule = function () {
        if (draft.timer) clearTimeout(draft.timer);
        draft.timer = setTimeout(draft.write, SAVE_DELAY);
    };

    draft.restore = function (saved) {
        closeNotice("draft");
        draft.shown = null;
        builder.restoreFromJson(saved.json);
        builder.refreshJson();
        if (builder.fitOnOpen) builder.fitOnOpen();
        builder.showToast("Đã khôi phục bản nháp. Bấm Lưu để ghi lên máy chủ.", "success");
    };

    draft.discard = function (key) {
        closeNotice("draft");
        draft.shown = null;
        if (window.builderStore) builderStore.remove(key).catch(noop);
    };

    draft.offer = function () {
        if (!window.builderStore || builder.readOnly) return;
        var key = designKey();
        builderStore.get(key).then(function (saved) {
            if (!saved || typeof saved.json !== "string" || designKey() !== key) return;
            if (saved.json === "[]" || saved.json === JSON.stringify(builder.controls || [])) return;
            if (draft.shown && draft.shown.key === key && draft.shown.savedAt === saved.savedAt) return;
            draft.shown = { key: key, savedAt: saved.savedAt };

            var text = "Có bản nháp chưa lưu" + (saved.name ? " của '" + saved.name + "'" : "") +
                ", ghi lúc " + timeText(saved.savedAt) + " (" + (saved.count || 0) + " control).";
            if (key !== "draft:new" && saved.base !== hash(builder.savedSnapshot || "[]")) {
                text += " Lưu ý: thiết kế trên máy chủ đã đổi sau bản nháp này.";
            }
            var $bar = notice("draft");
            $("<span class=\"ub-notice-text\"></span>").text(text).appendTo($bar);
            $bar.append(button("Khôi phục bản nháp", true, function () { draft.restore(saved); }));
            $bar.append(button("Bỏ bản nháp", false, function () { draft.discard(key); }));
        }).catch(noop);
    };

    function sessionLost() {
        var $bar = notice("session").addClass("is-warning");
        $("<span class=\"ub-notice-text\"></span>")
            .text("Phiên đăng nhập đã hết nên chưa lưu được lên máy chủ. Thay đổi của bạn vẫn được giữ trong bản nháp trên máy này. Hãy đăng nhập lại ở tab mới rồi quay lại bấm Lưu.")
            .appendTo($bar);
        $bar.append(button("Mở trang đăng nhập", true, function () { window.open("/Login", "_blank"); }));
        $bar.append(button("Kiểm tra lại", false, function () { draft.ping(true); }));
    }

    draft.ping = function (force) {
        if (draft.pingOff || builder.readOnly) return;
        if (!force && Date.now() - draft.lastActivity > PING_EVERY * 2) return;
        draft.lastPing = Date.now();
        $.ajax({
            url: builderServiceUrl + "/KeepAlive",
            method: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: "{}"
        }).done(function (res) {
            if (res && res.d === false) sessionLost();
            else closeNotice("session");
        }).fail(function (xhr) {
            var message = "";
            try { message = (JSON.parse(xhr.responseText) || {}).Message || ""; } catch (e) { message = ""; }
            if (/Unknown web method/i.test(message) || xhr.status === 404) draft.pingOff = true;
            else if (xhr.status === 401 || /Authentication failed/i.test(message)) sessionLost();
        });
    };

    $(function () {
        if (!window.builder) return;

        var refresh = builder.refreshJson;
        builder.refreshJson = function () {
            var result = refresh.apply(this, arguments);
            draft.schedule();
            return result;
        };

        var markSaved = builder.markSaved;
        builder.markSaved = function (snapshot, savedNow) {
            var result = markSaved.apply(this, arguments);
            if (savedNow) {
                if (draft.timer) { clearTimeout(draft.timer); draft.timer = null; }
                closeNotice("draft");
                closeNotice("session");
                draft.shown = null;
                if (window.builderStore) {
                    builderStore.remove(designKey()).catch(noop);
                    builderStore.remove("draft:new").catch(noop);
                }
            } else {
                draft.offer();
            }
            return result;
        };

        ["pointerdown", "keydown"].forEach(function (name) {
            document.addEventListener(name, function () { draft.lastActivity = Date.now(); }, true);
        });
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden") { if (draft.timer) draft.write(); return; }
            if (Date.now() - draft.lastPing > PING_EVERY) draft.ping(true);
        });
        window.addEventListener("pagehide", function () { if (draft.timer) draft.write(); });
        window.setInterval(function () { draft.ping(false); }, PING_EVERY);
    });

    window.builderDraft = draft;
})(window, jQuery);
