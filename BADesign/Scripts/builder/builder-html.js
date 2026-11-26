// Đọc một file HTML bất kỳ (ví dụ mockup do AI vẽ) thành dữ liệu màn hình của UI Builder.
// File được dựng trong một iframe cách ly: sandbox chỉ cho chạy script, không cùng nguồn với trang này, nên script của file
// không đọc được trang, cookie hay dữ liệu của HR Helper. Bộ chụp trang (builder-capture-page.js) chạy trong chính khung đó,
// đọc trang chính và từng popup rồi gửi kết quả ra bằng postMessage. Kết quả là dữ liệu không tin cậy: nơi dùng phải đưa
// từng màn hình qua builderCapture.normalize như dữ liệu dán từ clipboard.
(function (window) {
    "use strict";

    var LIMITS = { file: 5 * 1024 * 1024, screens: 40, label: 200 };
    var TIMEOUT = 20000;
    var LATE_START = 4000;
    var VIEW = { width: 1600, height: 900 };

    function fail(message) {
        var error = new Error(message);
        error.html = true;
        return error;
    }

    // Mặc định khung không tải gì từ bên ngoài. network = true cho tải CSS, script, ảnh và font qua http(s) (file dùng CDN);
    // fetch / XHR, form và khung con vẫn bị chặn.
    function policy(network) {
        var remote = network ? " http: https:" : "";
        return [
            "default-src 'none'",
            "script-src 'unsafe-inline' 'unsafe-eval'" + remote,
            "style-src 'unsafe-inline'" + remote,
            "img-src data: blob:" + remote,
            "font-src data:" + remote,
            "media-src data: blob:",
            "form-action 'none'",
            "base-uri 'none'"
        ].join("; ");
    }

    function inline(source) {
        return String(source).replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
    }

    // Chạy trong khung cách ly. Bắt đầu đọc khi trang tải xong; tài nguyên ngoài tải mãi không xong thì bắt đầu sau lateStart.
    // Khung là một tiến trình riêng: trình duyệt báo kích thước cho nó sau khi trang ngoài dựng xong, có lúc sau cả sự kiện load.
    // Trước lúc đó vùng nhìn của khung là 0x0 và mọi tọa độ đọc được đều bằng 0, nên phải chờ khung có kích thước rồi mới đọc.
    function runner(token, ui, lateStart) {
        var started = false;
        function send(payload) {
            payload.baHtml = token;
            window.parent.postMessage(payload, "*");
        }
        function sized() {
            return window.innerWidth > 0 && window.innerHeight > 0;
        }
        function read() {
            Promise.resolve().then(function () {
                return window.__baCaptureScreens({ ui: ui });
            }).then(function (result) {
                send({ result: result });
            }, function (error) {
                send({ error: String(error && error.message ? error.message : error) });
            });
        }
        function start() {
            if (started) return;
            started = true;
            if (sized()) { read(); return; }
            window.addEventListener("resize", function onResize() {
                if (!sized()) return;
                window.removeEventListener("resize", onResize);
                read();
            });
        }
        window.addEventListener("load", start);
        document.addEventListener("DOMContentLoaded", function () { setTimeout(start, lateStart); });
    }

    // Script của công cụ đứng trước nội dung file: thẻ chưa đóng trong file không nuốt mất chúng,
    // và chính sách bảo mật của khung có hiệu lực trước mọi thẻ của file.
    function frameDocument(markup, options, token) {
        return "<!doctype html><meta charset=\"utf-8\">"
            + "<meta http-equiv=\"Content-Security-Policy\" content=\"" + policy(options.network === true) + "\">"
            + "<script>" + inline(options.source) + "</" + "script>"
            + "<script>(" + inline(runner.toString()) + ")(" + JSON.stringify(token) + ", " + JSON.stringify(options.ui === "ess" ? "ess" : "core") + ", " + LATE_START + ");</" + "script>"
            + markup;
    }

    function createFrame(content) {
        var frame = document.createElement("iframe");
        frame.className = "bst-html-frame";
        frame.setAttribute("sandbox", "allow-scripts");
        frame.setAttribute("referrerpolicy", "no-referrer");
        frame.setAttribute("aria-hidden", "true");
        frame.setAttribute("tabindex", "-1");
        frame.width = VIEW.width;
        frame.height = VIEW.height;
        frame.srcdoc = content;
        return frame;
    }

    function newToken() {
        var bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        return Array.prototype.map.call(bytes, function (value) { return ("0" + value.toString(16)).slice(-2); }).join("");
    }

    function label(value) {
        return String(value == null ? "" : value).slice(0, LIMITS.label);
    }

    function isScreen(value) {
        return !!value && typeof value === "object" && Array.isArray(value.nodes);
    }

    function tidy(result) {
        var screens = (Array.isArray(result.screens) ? result.screens : []).filter(function (item) {
            return !!item && isScreen(item.screen);
        }).slice(0, LIMITS.screens).map(function (item) {
            return { kind: item.kind === "popup" ? "popup" : "page", title: label(item.title), screen: item.screen };
        });
        return {
            screens: screens,
            all: screens.length > 1 && isScreen(result.all) ? result.all : null,
            skipped: (Array.isArray(result.skipped) ? result.skipped : []).slice(0, LIMITS.screens).map(label),
            external: Math.max(0, parseInt(result.external, 10) || 0)
        };
    }

    // options: { source: mã của builder-capture-page.js, ui: "core" | "ess", network: true để cho tải tài nguyên ngoài,
    //            timeout: số mili giây chờ file dựng xong (mặc định 20 giây) }.
    // Trả về Promise của { screens: [{ kind, title, screen }], all, skipped, external }; screens rỗng khi file không có control nào đọc được.
    // Lỗi có cờ html thì message hiển thị được cho người dùng.
    function read(markup, options) {
        options = options || {};
        return new Promise(function (resolve, reject) {
            if (!options.source) { reject(fail("Chưa tải được công cụ đọc trang. Tải lại trang rồi thử lại.")); return; }
            var token = newToken();
            var frame = createFrame(frameDocument(String(markup), options, token));
            var limit = options.timeout > 0 ? options.timeout : TIMEOUT;
            var timer = null;
            function finish(error, result) {
                window.removeEventListener("message", onMessage);
                window.clearTimeout(timer);
                if (frame.parentNode) frame.parentNode.removeChild(frame);
                if (error) reject(error); else resolve(result);
            }
            function onMessage(event) {
                var data = event.data;
                if (event.source !== frame.contentWindow || !data || data.baHtml !== token) return;
                if (data.error || !data.result || typeof data.result !== "object") { finish(fail("Không đọc được nội dung của file này.")); return; }
                finish(null, tidy(data.result));
            }
            window.addEventListener("message", onMessage);
            timer = window.setTimeout(function () {
                finish(fail("File không dựng xong sau " + (limit / 1000) + " giây nên chưa đọc được."));
            }, limit);
            document.body.appendChild(frame);
        });
    }

    window.builderHtml = { read: read, LIMITS: LIMITS };
})(window);
