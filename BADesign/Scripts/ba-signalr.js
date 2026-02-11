/**
 * SignalR client dùng chung cho nhiều trang, nhiều chức năng.
 * Yêu cầu: jQuery, jquery.signalR.min.js load trước script này. Hubs có thể load sau (qua tham số hubsUrl).
 *
 * Cách dùng:
 *   1. Page: load jQuery → jquery.signalR.min.js → ba-signalr.js (không load /signalr/hubs trong HTML).
 *   2. Gọi BA_SignalR.start(signalrUrl, hubsUrl) một lần (vd trong $(function(){ ... })).
 *      hubsUrl bắt buộc để tránh lỗi "SignalR is not loaded" (hubs load sau khi SignalR đã sẵn sàng).
 *   3. Đăng ký handler: BA_SignalR.onRestoreJobsUpdated(function() { ... }).
 */
(function(global) {
    'use strict';

    var restoreJobsUpdatedHandlers = [];

    function doConnect() {
        if (typeof global.$ === 'undefined' || !global.$.connection || !global.$.connection.hub) return false;
        var hub = global.$.connection.restoreNotificationHub;
        if (!hub) return false;
        hub.client.restoreJobsUpdated = function() {
            restoreJobsUpdatedHandlers.forEach(function(fn) {
                try { fn(); } catch (e) {
                    if (global.console && global.console.error) global.console.error('BA_SignalR restoreJobsUpdated handler:', e);
                }
            });
        };
        return true;
    }

    var api = {
        onRestoreJobsUpdated: function(callback) {
            if (typeof callback === 'function') restoreJobsUpdatedHandlers.push(callback);
        },
        /**
         * @param {string} baseUrl - ResolveUrl("~/signalr")
         * @param {string} [hubsUrl] - ResolveUrl("~/signalr/hubs"). Nên truyền để load hubs sau SignalR.
         */
        start: function(baseUrl, hubsUrl) {
            if (api._started) return;
            if (typeof baseUrl !== 'string' || !baseUrl) return;
            if (typeof global.$ === 'undefined') {
                if (global.console && global.console.warn) global.console.warn('BA_SignalR: cần jQuery load trước.');
                return;
            }
            var maxWait = 50;
            var attempt = 0;
            function tryStart() {
                if (api._started) return;
                attempt++;
                if (!global.$.connection || !global.$.connection.hub) {
                    if (attempt < maxWait) {
                        setTimeout(tryStart, 100);
                    } else if (global.console && global.console.warn) {
                        global.console.warn('BA_SignalR: jquery.signalR.min.js chưa load sau ' + (maxWait * 0.1) + 's. Kiểm tra thứ tự script: jQuery → SignalR → ba-signalr.js.');
                    }
                    return;
                }
                function connect() {
                    if (!doConnect()) {
                        if (global.console && global.console.warn) global.console.warn('BA_SignalR: không tìm thấy hub restoreNotificationHub. Đảm bảo load /signalr/hubs (qua hubsUrl).');
                        return;
                    }
                    global.$.connection.hub.url = baseUrl;
                    global.$.connection.hub.start().fail(function(err) {
                        if (global.console && global.console.warn) global.console.warn('BA_SignalR start:', err);
                    });
                    api._started = true;
                }
                if (typeof hubsUrl === 'string' && hubsUrl.length > 0) {
                    global.$.getScript(hubsUrl).done(connect).fail(function() {
                        if (global.console && global.console.warn) global.console.warn('BA_SignalR: không load được hubs:', hubsUrl);
                    });
                } else {
                    connect();
                }
            }
            tryStart();
        }
    };

    api._started = false;
    global.BA_SignalR = api;
})(typeof window !== 'undefined' ? window : this);
