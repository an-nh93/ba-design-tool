(function (window, $) {
    "use strict";

    var REQUESTS_URL = "/TemplateRequests";
    var STATUS_TEXT = { Pending: "Chờ duyệt", Approved: "Đã duyệt", Rejected: "Bị từ chối", Cancelled: "Đã hủy" };
    var STEP_TEXT = {
        approved: "Đã duyệt", rejected: "Từ chối", auto: "Tự động duyệt vì người gửi là người duyệt của bước này",
        autochain: "Tự động duyệt vì người duyệt bước trước cũng là người duyệt của bước này",
        pending: "Đang chờ duyệt", waiting: "Chưa tới"
    };
    var review = { requestId: 0, info: null, rendered: false };

    function post(method, data) {
        return $.ajax({
            url: builderServiceUrl + "/" + method,
            method: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(data || {})
        }).then(function (res) { return res && res.d !== undefined ? res.d : res; });
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function field(labelText, control) {
        var wrap = el("div", "ub-form-row");
        wrap.appendChild(el("label", null, labelText));
        wrap.appendChild(control);
        return wrap;
    }

    review.timeline = function (info) {
        var list = el("ol", "ub-tl");
        (info.Timeline || []).forEach(function (entry) {
            var li = el("li", "ub-tl-" + entry.Status);
            li.appendChild(el("div", "ub-tl-title", entry.Title));
            if (entry.Kind === "step") {
                li.appendChild(el("div", "ub-tl-line", STEP_TEXT[entry.Status] || ""));
                if (entry.Status === "pending" || entry.Status === "waiting") {
                    li.appendChild(el("div", "ub-tl-line", "Người duyệt: " + (entry.Waiting || []).join(", ")));
                }
            }
            var by = [entry.By, entry.At].filter(Boolean).join(" · ");
            if (by) li.appendChild(el("div", "ub-tl-line", by));
            if (entry.Note) li.appendChild(el("div", "ub-tl-note", entry.Note));
            list.appendChild(li);
        });
        return list;
    };

    function guessUiKind() {
        var ess = (builder.controls || []).some(function (c) {
            return c && (c.type === "ess-grid" || c.type === "collapsible-section" || (c.type === "field" && c.uiMode === "ess"));
        });
        return ess ? "ess" : "core";
    }

    review.openSubmit = function () {
        if (!builder.canOverwriteDesign()) {
            builder.showToast("Hãy lưu thiết kế trước khi gửi làm mẫu chung.", "info");
            return;
        }
        if (builder.isDirty()) {
            builder.showToast("Thiết kế có thay đổi chưa lưu. Bấm Lưu rồi gửi lại để mẫu có đúng nội dung mới nhất.", "warning");
            return;
        }
        var controlId = parseInt(builder.currentDesignInfo.ControlId, 10);
        post("GetTemplateSubmitInfo", {}).done(function (info) {
            if (!info || !info.success) {
                builder.showToast(info && info.message ? info.message : "Chưa gửi được mẫu.", "warning");
                return;
            }
            builderTemplates.loadModules(function (modules) { submitDialog(controlId, info, modules); });
        }).fail(function (xhr) {
            builder.showToast("Chưa gửi được mẫu. " + builder.ajaxErrorText(xhr), "error");
        });
    };

    function submitDialog(controlId, info, modules) {
        var body = el("div", "ub-form");
        var name = el("input");
        name.type = "text";
        name.maxLength = 200;
        name.value = builder.currentDesignInfo.Name || "";
        var kind = el("select");
        [["core", "Core"], ["ess", "ESS"]].forEach(function (pair) {
            var option = el("option", null, pair[1]);
            option.value = pair[0];
            kind.appendChild(option);
        });
        kind.value = guessUiKind();
        var module = el("select");
        var noModule = el("option", null, "Chưa chọn");
        noModule.value = "0";
        module.appendChild(noModule);
        modules.forEach(function (item) {
            var option = el("option", null, item.Name);
            option.value = String(item.ModuleId);
            option.setAttribute("translate", "no");
            module.appendChild(option);
        });
        var description = el("textarea");
        description.rows = 3;
        description.maxLength = 1000;
        description.placeholder = "Mẫu dùng cho chức năng nào, có gì đáng chú ý";
        var note = el("textarea");
        note.rows = 2;
        note.maxLength = 1000;
        note.placeholder = "Không bắt buộc";

        body.appendChild(field("Tên mẫu", name));
        var pair = el("div", "ub-form-pair");
        pair.appendChild(field("Loại giao diện", kind));
        pair.appendChild(field("Phân hệ", module));
        body.appendChild(pair);
        body.appendChild(field("Mô tả mẫu", description));
        body.appendChild(field("Ghi chú cho người duyệt", note));

        var flow = el("div", "ub-form-flow");
        flow.appendChild(el("div", "ub-form-flow-title", "Quy trình duyệt: " + (info.workflowName || "")));
        var steps = el("ol");
        (info.steps || []).forEach(function (step) {
            steps.appendChild(el("li", null, (step.stepName || "") + ": " + (step.approvers || []).join(", ")));
        });
        flow.appendChild(steps);
        body.appendChild(flow);
        body.appendChild(el("p", "ub-form-hint", "Hệ thống chụp lại nội dung thiết kế lúc gửi; bạn sửa tiếp thiết kế không làm đổi bản đang duyệt. Trước khi gửi, hãy kiểm tra mẫu không chứa tên, mã nhân viên hay dữ liệu thật."));
        var error = el("div", "ub-modal-error");
        error.style.display = "none";
        body.appendChild(error);

        builderDialog.open({
            title: "Gửi làm mẫu chung",
            className: "ub-modal-form",
            body: body,
            buttons: [
                { text: "Hủy" },
                {
                    text: "Gửi duyệt", primary: true, close: false,
                    onClick: function (dialog, $button) {
                        var text = $.trim(name.value);
                        if (!text) { error.textContent = "Hãy nhập tên mẫu."; error.style.display = ""; name.focus(); return; }
                        $button.prop("disabled", true);
                        post("SubmitTemplate", {
                            controlId: controlId, name: text, category: "", uiKind: kind.value,
                            description: $.trim(description.value), note: $.trim(note.value), moduleId: parseInt(module.value, 10) || 0
                        }).done(function (result) {
                            if (!result || !result.Success) {
                                error.textContent = result && result.Message ? result.Message : "Chưa gửi được mẫu.";
                                error.style.display = "";
                                $button.prop("disabled", false);
                                return;
                            }
                            dialog.close();
                            if (window.builderTemplates && builderTemplates.reload) builderTemplates.reload();
                            builder.showToast((result.Message || "Đã gửi mẫu.") + " Theo dõi ở trang Mẫu UI dùng chung.", "success");
                        }).fail(function (xhr) {
                            error.textContent = "Chưa gửi được mẫu. " + builder.ajaxErrorText(xhr);
                            error.style.display = "";
                            $button.prop("disabled", false);
                        });
                    }
                }
            ]
        });
        name.focus();
        name.select();
    }

    function line(labelText, value) {
        var row = el("div", "ub-review-line");
        row.appendChild(el("span", "ub-review-label", labelText));
        row.appendChild(el("span", null, value));
        return row;
    }

    function drawPanel(info, message) {
        var $body = $("#ubReviewBody");
        $body.empty();
        if (!info) {
            $body.append(el("p", "ub-review-message", message));
            $body.append(link());
            return;
        }
        $body.append(el("div", "ub-review-name", info.Name));
        var tags = [info.UiKind === "ess" ? "ESS" : (info.UiKind === "core" ? "Core" : ""), info.ModuleName || info.Category, info.ControlCount + " control"].filter(Boolean);
        $body.append(el("div", "ub-review-tags", tags.join(" · ")));
        $body.append(el("span", "ub-review-status ub-review-status-" + String(info.Status || "").toLowerCase(), STATUS_TEXT[info.Status] || info.Status));
        $body.append(line("Người gửi", info.SubmitterName + (info.SubmitterRole ? " (" + info.SubmitterRole + ")" : "")));
        $body.append(line("Gửi lúc", info.SubmittedAt || ""));
        if (info.Description) $body.append(line("Mô tả", info.Description));
        if (info.SubmitNote) $body.append(line("Ghi chú", info.SubmitNote));

        $body.append(el("h4", null, "Tiến trình duyệt"));
        $body.append(review.timeline(info));

        if (info.CanAct) {
            var comment = el("textarea", "ub-review-comment");
            comment.rows = 3;
            comment.maxLength = 1000;
            comment.placeholder = "Ý kiến của bạn. Bắt buộc khi từ chối.";
            var actions = el("div", "ub-review-actions");
            var approve = el("button", "ub-btn ub-btn-primary", "Duyệt");
            approve.type = "button";
            var reject = el("button", "ub-btn ub-btn-secondary ub-review-reject", "Từ chối");
            reject.type = "button";
            var act = function (ok) {
                var text = $.trim(comment.value);
                if (!ok && text.length < 3) {
                    builder.showToast("Hãy ghi lý do từ chối để người gửi biết cần sửa gì.", "warning");
                    comment.focus();
                    return;
                }
                $(approve).add(reject).prop("disabled", true);
                post("ReviewTemplateRequest", { requestId: review.requestId, approve: ok, comment: text }).done(function (result) {
                    builder.showToast(result && result.Message ? result.Message : "Không thực hiện được.", result && result.Success ? "success" : "error");
                    load();
                }).fail(function (xhr) {
                    builder.showToast("Không thực hiện được. " + builder.ajaxErrorText(xhr), "error");
                    $(approve).add(reject).prop("disabled", false);
                });
            };
            approve.addEventListener("click", function () { act(true); });
            reject.addEventListener("click", function () { act(false); });
            actions.appendChild(approve);
            actions.appendChild(reject);
            $body.append(comment, actions);
        } else if (info.Status === "Pending") {
            $body.append(el("p", "ub-review-message", info.IsMine ? "Mẫu của bạn đang chờ duyệt." : "Bạn không phải người duyệt của bước hiện tại."));
        }
        $body.append(link());
    }

    function link() {
        var a = el("a", "ub-review-link", "Về danh sách mẫu");
        a.href = REQUESTS_URL;
        return a;
    }

    function showDesign(info) {
        var controls = null;
        try { controls = JSON.parse(info.JsonConfig || "null"); } catch (e) { controls = null; }
        if (!Array.isArray(controls)) { builder.showToast("Không đọc được nội dung mẫu.", "error"); return; }
        builder.restoreFromJson(JSON.stringify(controls));
        builder.resetHistory();
        builder.setCurrentDesignInfo({ Name: info.Name, ControlType: "page" }, false);
        $("#lblDesignMode").text("Mẫu gửi duyệt · chỉ xem");
        builder.markSaved();
        var $borders = $("#chkShowBorders");
        if ($borders.prop("checked")) $borders.prop("checked", false).trigger("change");
        builder.clearSelection();
        builder.fitOnOpen();
        review.rendered = true;
    }

    function load() {
        post("LoadTemplateRequest", { requestId: review.requestId }).done(function (info) {
            if (!info) { drawPanel(null, "Không tìm thấy yêu cầu, hoặc bạn không được xem yêu cầu này."); return; }
            review.info = info;
            if (!review.rendered) showDesign(info);
            drawPanel(info);
        }).fail(function (xhr) {
            drawPanel(null, "Không tải được yêu cầu. " + builder.ajaxErrorText(xhr));
        });
    }

    function buildPanel() {
        var panel = el("aside", "ub-review-panel");
        var head = el("div", "ub-review-head");
        head.appendChild(el("strong", null, "Duyệt mẫu UI"));
        var toggle = el("button", "ub-review-toggle", "⟩");
        toggle.type = "button";
        toggle.title = "Thu gọn hoặc mở khung duyệt";
        toggle.addEventListener("click", function () {
            var collapsed = document.body.classList.toggle("ub-review-collapsed");
            toggle.textContent = collapsed ? "⟨" : "⟩";
        });
        head.appendChild(toggle);
        var body = el("div", "ub-review-body", "Đang tải...");
        body.id = "ubReviewBody";
        panel.appendChild(head);
        panel.appendChild(body);
        document.body.appendChild(panel);
    }

    function buildShield() {
        var shell = document.querySelector(".canvas-shell");
        if (!shell) return;
        var shield = el("div", "ub-review-shield");
        document.body.appendChild(shield);
        var drag = null;

        function place() {
            var r = shell.getBoundingClientRect();
            shield.style.left = (r.left + shell.clientLeft) + "px";
            shield.style.top = (r.top + shell.clientTop) + "px";
            shield.style.width = shell.clientWidth + "px";
            shield.style.height = shell.clientHeight + "px";
        }
        place();
        if (window.ResizeObserver) new ResizeObserver(place).observe(shell);
        window.addEventListener("resize", place);

        shield.addEventListener("wheel", function (e) {
            if (e.ctrlKey) return;
            e.preventDefault();
            shell.scrollTop += e.deltaY;
            shell.scrollLeft += e.deltaX;
        }, { passive: false });
        shield.addEventListener("mousedown", function (e) {
            if (e.button !== 0) return;
            drag = { x: e.clientX, y: e.clientY, left: shell.scrollLeft, top: shell.scrollTop, moved: false };
            e.preventDefault();
        });
        window.addEventListener("mousemove", function (e) {
            if (!drag) return;
            var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
            if (!drag.moved) return;
            shell.scrollLeft = drag.left - dx;
            shell.scrollTop = drag.top - dy;
            shield.classList.add("is-panning");
        });
        window.addEventListener("mouseup", function (e) {
            if (!drag) return;
            var moved = drag.moved;
            drag = null;
            shield.classList.remove("is-panning");
            if (moved || e.button !== 0) return;
            var stack = document.elementsFromPoint(e.clientX, e.clientY);
            for (var i = 0; i < stack.length; i++) {
                if (stack[i] === shield) continue;
                var $hit = $(stack[i]).closest(".tabpage-tab, .ess-collapsible-icon");
                if ($hit.length && $hit.closest("#canvas-zoom-inner").length) $hit.trigger("click");
                break;
            }
        });
        shield.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }

    function guardKeys() {
        document.addEventListener("keydown", function (e) {
            if ($(e.target).closest(".ub-review-panel, .ub-modal-backdrop").length) return;
            if (e.key === "Escape") return;
            var meta = e.ctrlKey || e.metaKey;
            if (meta && !e.shiftKey && !e.altKey && (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "0")) return;
            if (meta && e.key && e.key.toLowerCase() === "s") e.preventDefault();
            e.stopPropagation();
        }, true);
        ["paste", "drop", "dragover"].forEach(function (name) {
            document.addEventListener(name, function (e) {
                if ($(e.target).closest(".ub-review-panel, .ub-modal-backdrop").length) return;
                if (name !== "paste") e.preventDefault();
                e.stopPropagation();
            }, true);
        });
    }

    review.start = function (requestId) {
        review.requestId = requestId;
        builder.readOnly = true;
        builder.isDirty = function () { return false; };
        document.body.classList.add("ub-review");
        $("#btnPreview, #btnExportImage").addClass("ub-review-keep");
        $("#btnExportImage").closest(".bh-split").addClass("ub-review-keep");
        buildPanel();
        buildShield();
        guardKeys();

        var started = false;
        function begin() {
            if (started) return;
            started = true;
            $(document).off("ajaxComplete.ubReview");
            load();
        }
        $(document).on("ajaxComplete.ubReview", function (e, xhr, settings) {
            if (settings && /\/LoadConfig$/.test(settings.url || "")) begin();
        });
        setTimeout(begin, 4000);
    };

    review.requestIdFromUrl = function () {
        var match = /[?&]reviewId=(\d{1,9})(?:&|$)/.exec(window.location.search || "");
        return match ? parseInt(match[1], 10) : 0;
    };

    $(function () {
        if (!window.builder) return;
        var id = review.requestIdFromUrl();
        if (id > 0) review.start(id);
    });

    window.builderReview = review;
})(window, jQuery);
