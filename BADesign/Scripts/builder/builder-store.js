(function (window) {
    "use strict";

    var DB_NAME = "badesign-builder";
    var STORE = "kv";
    var opening = null;

    function open() {
        if (opening) return opening;
        opening = new Promise(function (resolve, reject) {
            if (!window.indexedDB) { reject(new Error("indexedDB is not available")); return; }
            var request;
            try { request = window.indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
            request.onupgradeneeded = function () {
                if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
            };
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error || new Error("indexedDB open failed")); };
            request.onblocked = function () { reject(new Error("indexedDB is blocked")); };
        });
        opening.catch(function () { opening = null; });
        return opening;
    }

    function run(mode, work) {
        return open().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx, request;
                try {
                    tx = db.transaction(STORE, mode);
                    request = work(tx.objectStore(STORE));
                } catch (e) { reject(e); return; }
                tx.oncomplete = function () { resolve(request ? request.result : undefined); };
                tx.onerror = function () { reject(tx.error || new Error("indexedDB transaction failed")); };
                tx.onabort = function () { reject(tx.error || new Error("indexedDB transaction aborted")); };
            });
        });
    }

    window.builderStore = {
        get: function (key) { return run("readonly", function (store) { return store.get(key); }); },
        set: function (key, value) { return run("readwrite", function (store) { return store.put(value, key); }); },
        remove: function (key) { return run("readwrite", function (store) { return store["delete"](key); }); },
        keys: function () { return run("readonly", function (store) { return store.getAllKeys(); }); }
    };
})(window);
