(function (window, $) {
    "use strict";

    var seed = 0;

    function open(options) {
        options = options || {};
        var ns = ".ubDialog" + (++seed);
        var $overlay = $('<div class="ub-modal-backdrop"></div>');
        var $dialog = $('<div class="ub-modal" role="dialog" aria-modal="true"></div>').toggleClass("ub-modal-wide", !!options.wide);
        if (options.className) $dialog.addClass(options.className);
        var $header = $('<div class="ub-modal-header"></div>').text(options.title || "");
        var $body = $('<div class="ub-modal-body"></div>');
        var $footer = $('<div class="ub-modal-footer"></div>');
        var closed = false;

        function close() {
            if (closed) return;
            closed = true;
            $(document).off(ns);
            $overlay.remove();
            if (typeof options.onClose === "function") options.onClose();
        }

        var api = { $dialog: $dialog, $body: $body, $footer: $footer, close: close };

        if (options.body) $body.append(options.body);
        (options.buttons || []).forEach(function (spec) {
            var $button = $('<button type="button" class="ub-btn"></button>')
                .addClass(spec.primary ? "ub-btn-primary" : "ub-btn-secondary")
                .text(spec.text);
            if (spec.id) $button.attr("data-btn", spec.id);
            $button.on("click", function () {
                if (typeof spec.onClick === "function") { if (spec.onClick(api, $button) === false) return; }
                if (spec.close !== false) close();
            });
            $footer.append($button);
        });

        $dialog.append($header, $body, $footer);
        $overlay.append($dialog);
        $("body").append($overlay);

        $(document).on("keydown" + ns, function (e) {
            if (e.key === "Escape" && !options.keepOnEscape) { e.stopPropagation(); close(); }
        });
        return api;
    }

    window.builderDialog = { open: open };
})(window, jQuery);
