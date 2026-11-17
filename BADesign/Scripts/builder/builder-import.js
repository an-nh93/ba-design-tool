/* ============================================================================
 * builder-import.js
 * Nhận dạng CẤU TRÚC từ ảnh chụp màn hình (chạy hoàn toàn trên trình duyệt, không
 * cần mạng / AI ngoài):
 *
 *   ảnh  ──►  các "section" (mỗi thanh màu đậm ngang khổ mở một section)
 *              └─ các "hàng" (thanh phụ màu nhạt, dòng label + ô nhập, dãy chip…)
 *                   └─ các "ô" (label, ô nhập, chip…)  → mỗi ô là 1 lát ảnh
 *
 * Kết quả là: mỗi section = 1 group box bật tự xếp "theo hàng" (rows), bên trong
 * là các lát ảnh (ESS Image). BA cắt một lát → hàng dồn lên; thả control mới vào
 * giữa hai lát → nằm đúng chỗ, các lát sau dồn theo; thêm dòng → các dòng dưới
 * (và section bên dưới) tự dịch xuống.
 *
 * Không đọc chữ (OCR): lát ảnh giữ nguyên hình gốc. BA thay dần bằng control thật
 * khi cần sửa nội dung.
 * ==========================================================================*/
(function (window, $) {
    "use strict";

    var imp = {};

    function toast(msg, kind) { if (window.builder && builder.showToast) builder.showToast(msg, kind || "info"); }
    function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }

    // ------------------------------------------------------------- phân tích
    // data: Uint8ClampedArray RGBA, W×H.
    // Trả về { bg, W, H, sections:[{ y0, y1, children:[node] }] }
    // node = { t:"leaf", x0,y0,x1,y1, bar? } | { t:"rows"|"cols", x0,y0,x1,y1, children:[node] }
    imp.analyze = function (data, W, H) {
        var idx = function (x, y) { return (y * W + x) * 4; };
        var INK = 24;        // lệch so với nền để coi là nét chữ / viền
        var BLANK = 2;       // số dòng trống liên tiếp để tách hàng
        var BARDIFF = 8;     // lệch tối thiểu để coi là "dải màu" (nền xám đậm hơn nền một chút cũng tính)

        // 1) màu nền = màu xuất hiện nhiều nhất
        var hist = {}, bestK = null, bestN = 0;
        for (var y = 0; y < H; y += 2) {
            for (var x = 0; x < W; x += 2) {
                var i = idx(x, y);
                var k = (data[i] >> 2) + "," + (data[i + 1] >> 2) + "," + (data[i + 2] >> 2);
                var n = (hist[k] = (hist[k] || 0) + 1);
                if (n > bestN) { bestN = n; bestK = k; }
            }
        }
        var bp = bestK.split(",").map(Number);
        var bg = [bp[0] * 4 + 2, bp[1] * 4 + 2, bp[2] * 4 + 2];

        function diffAt(i) {
            return Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]));
        }
        // Mặt nạ ink; đường kẻ dài mảnh (viền panel, vạch ngăn) bị loại để không cản việc cắt
        var inkMask = new Uint8Array(W * H);
        for (var py = 0; py < H; py++) for (var px = 0; px < W; px++) inkMask[py * W + px] = diffAt(idx(px, py)) > INK ? 1 : 0;
        (function removeLines() {
            var LH = Math.max(100, Math.round(W * 0.2)), LV = 40, T = 3;
            var kill = [];
            function vThick(x, y) { var n = 0, a = y; while (a >= 0 && inkMask[a * W + x]) { n++; a--; } a = y + 1; while (a < H && inkMask[a * W + x]) { n++; a++; } return n; }
            function hThick(x, y) { var n = 0, a = x; while (a >= 0 && inkMask[y * W + a]) { n++; a--; } a = x + 1; while (a < W && inkMask[y * W + a]) { n++; a++; } return n; }
            for (var y = 0; y < H; y++) {
                var x = 0;
                while (x < W) {
                    if (!inkMask[y * W + x]) { x++; continue; }
                    var s0 = x; while (x < W && inkMask[y * W + x]) x++;
                    if (x - s0 >= LH && vThick(s0 + ((x - s0) >> 1), y) <= T) kill.push([s0, y, x - 1, y]);
                }
            }
            for (var x2 = 0; x2 < W; x2++) {
                var y2 = 0;
                while (y2 < H) {
                    if (!inkMask[y2 * W + x2]) { y2++; continue; }
                    var s1 = y2; while (y2 < H && inkMask[y2 * W + x2]) y2++;
                    if (y2 - s1 >= LV && hThick(x2, s1 + ((y2 - s1) >> 1)) <= T) kill.push([x2, s1, x2, y2 - 1]);
                }
            }
            kill.forEach(function (k) { for (var yy = k[1]; yy <= k[3]; yy++) for (var xx = k[0]; xx <= k[2]; xx++) inkMask[yy * W + xx] = 0; });
        })();
        function isInk(x, y) { return inkMask[y * W + x] === 1; }

        // 2) dải màu ngang khổ: một màu (lượng tử bước 6) khác nền, chiếm ≥45% bề rộng dòng
        var rowBar = new Array(H);
        for (var yy = 0; yy < H; yy++) {
            var h2 = {}, best = null, bn = 0;
            for (var xx = 0; xx < W; xx++) {
                var j = idx(xx, yy);
                if (diffAt(j) < BARDIFF) continue;
                if (data[j] > 250 && data[j + 1] > 250 && data[j + 2] > 250) continue;   // trắng (ô nhập) không tính là dải
                var q = Math.round(data[j] / 6) + "," + Math.round(data[j + 1] / 6) + "," + Math.round(data[j + 2] / 6);
                var c = (h2[q] = (h2[q] || 0) + 1);
                if (c > bn) { bn = c; best = q; }
            }
            if (best && bn >= 0.45 * W) {
                var x0 = -1, x1 = -1, sr = 0, sg = 0, sb = 0, cnt = 0;
                for (var x3 = 0; x3 < W; x3++) {
                    var j2 = idx(x3, yy);
                    var q2 = Math.round(data[j2] / 6) + "," + Math.round(data[j2 + 1] / 6) + "," + Math.round(data[j2 + 2] / 6);
                    if (q2 === best) { if (x0 < 0) x0 = x3; x1 = x3; sr += data[j2]; sg += data[j2 + 1]; sb += data[j2 + 2]; cnt++; }
                }
                rowBar[yy] = { q: best, color: [sr / cnt, sg / cnt, sb / cnt], x0: x0, x1: x1 };
            } else rowBar[yy] = null;
        }
        var bars = [];
        for (var y2 = 0; y2 < H; y2++) {
            var rb = rowBar[y2];
            if (!rb) continue;
            var last = bars[bars.length - 1];
            if (last && last.q === rb.q && y2 - last.y1 <= 2) {
                last.y1 = y2; last.x0 = Math.min(last.x0, rb.x0); last.x1 = Math.max(last.x1, rb.x1);
            } else {
                bars.push({ q: rb.q, color: rb.color, y0: y2, y1: y2, x0: rb.x0, x1: rb.x1 });
            }
        }
        bars = bars.filter(function (b) { return b.y1 - b.y0 + 1 >= 8 && (b.x1 - b.x0 + 1) >= 0.8 * W; });   // thanh phải gần ngang khổ (bảng, tiêu đề cột không tính)
        bars.forEach(function (b) { b.level = lum(b.color[0], b.color[1], b.color[2]) < 130 ? 1 : 2; });
        // Không có thanh đậm nào → mọi thanh đều mở section
        if (!bars.some(function (b) { return b.level === 1; })) bars.forEach(function (b) { b.level = 1; });

        function barAt(y) {
            for (var b = 0; b < bars.length; b++) if (y >= bars[b].y0 && y <= bars[b].y1) return bars[b];
            return null;
        }

        // 3) khung nội dung
        function rowInk(y, xa, xb) { for (var x = xa; x <= xb; x++) if (isInk(x, y)) return true; return false; }
        function colInk(x, ya, yb) { for (var y = ya; y <= yb; y++) if (isInk(x, y) && !barAt(y)) return true; return false; }
        var top = 0, bottom = H - 1;
        while (top < H && !rowInk(top, 0, W - 1) && !barAt(top)) top++;
        while (bottom > top && !rowInk(bottom, 0, W - 1) && !barAt(bottom)) bottom--;
        if (top >= bottom) return { bg: bg, sections: [], W: W, H: H };

        // 4) section: bắt đầu tại mỗi thanh cấp 1
        var starts = [];
        var lvl1 = bars.filter(function (b) { return b.level === 1; });
        if (!lvl1.length || lvl1[0].y0 > top + 4) starts.push(top);
        lvl1.forEach(function (b) { starts.push(b.y0); });
        var sections = [];
        starts.forEach(function (sy, si) {
            var ey = (si + 1 < starts.length ? starts[si + 1] - 1 : bottom);
            var kids = sectionChildren(sy, ey);
            if (kids.length) {
                var y0 = Infinity, y1 = -Infinity;
                kids.forEach(function (k) { y0 = Math.min(y0, k.y0); y1 = Math.max(y1, k.y1); });
                sections.push({ y0: y0, y1: y1, children: kids });
            }
        });

        // Trong section: thanh màu là lá riêng; phần giữa các thanh cắt kiểu XY
        function sectionChildren(sy, ey) {
            var out = [], y = sy;
            while (y <= ey) {
                var bar = barAt(y);
                if (bar) {
                    var by1 = Math.min(bar.y1, ey);
                    out.push({ t: "leaf", x0: bar.x0, y0: bar.y0, x1: bar.x1, y1: by1, bar: true });
                    y = bar.y1 + 1;
                    continue;
                }
                var ys = y;
                while (y <= ey && !barAt(y)) y++;
                var node = xycut(0, ys, W - 1, y - 1, 0);
                if (node) out.push(node);
            }
            return out;
        }

        // 5) cắt kiểu XY-cut đệ quy: cắt ngang theo dòng trống, không được thì cắt dọc theo cột trống
        function trim(x0, y0, x1, y1) {
            var a = y0, b = y1, c = x1, d = x0;
            while (a <= b && !rowInk(a, x0, x1)) a++;
            while (b >= a && !rowInk(b, x0, x1)) b--;
            if (a > b) return null;
            var l = x0, r = x1;
            while (l <= r && !colInk(l, a, b)) l++;
            while (r >= l && !colInk(r, a, b)) r--;
            if (l > r) return null;
            return { x0: l, y0: a, x1: r, y1: b };
        }

        function xycut(x0, y0, x1, y1, depth) {
            var bb = trim(x0, y0, x1, y1);
            if (!bb) return null;
            x0 = bb.x0; y0 = bb.y0; x1 = bb.x1; y1 = bb.y1;
            if (depth > 12) return leafOf(bb);

            // cắt ngang: các dải dòng có ink, cách nhau ≥3 dòng trống
            var bands = rowBands(x0, y0, x1, y1);
            if (bands.length > 1) {
                var kids = [];
                bands.forEach(function (bd) { var n = xycut(x0, bd[0], x1, bd[1], depth + 1); if (n) kids.push(n); });
                if (kids.length > 1) return { t: "rows", x0: x0, y0: y0, x1: x1, y1: y1, children: kids };
                if (kids.length === 1) return kids[0];
            }

            // cắt dọc
            var segs = colSegments(x0, y0, x1, y1);
            if (segs.length > 1) {
                var multi = segs.filter(function (sg) { return rowBands(sg.x0, y0, sg.x1, y1).length >= 2; });
                var kids2 = [], done = false;
                if (multi.length >= 2) {
                    var block = alignedRows(multi, y0, y1, depth);
                    segs.forEach(function (sg) {
                        if (multi.indexOf(sg) >= 0) {
                            if (!done && block) { kids2.push(block); }
                            done = true;
                        } else {
                            var n1 = xycut(sg.x0, y0, sg.x1, y1, depth + 1); if (n1) kids2.push(n1);
                        }
                    });
                } else {
                    segs.forEach(function (sg) { var n = xycut(sg.x0, y0, sg.x1, y1, depth + 1); if (n) kids2.push(n); });
                }
                if (kids2.length > 1) return { t: "cols", x0: x0, y0: y0, x1: x1, y1: y1, children: kids2 };
                if (kids2.length === 1) return kids2[0];
            }
            return leafOf(bb);
        }

        function rowBands(x0, y0, x1, y1) {
            var bands = [], y = y0;
            while (y <= y1) {
                if (!rowInk(y, x0, x1)) { y++; continue; }
                var s = y, e = y, blank = 0;
                while (y <= y1) {
                    if (rowInk(y, x0, x1)) { e = y; blank = 0; } else { blank++; if (blank >= BLANK) break; }
                    y++;
                }
                bands.push([s, e]);
            }
            return bands;
        }

        function bbOf(nodes) {
            var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            nodes.forEach(function (c) { x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1); });
            return { x0: x0, y0: y0, x1: x1, y1: y1 };
        }

        // Các cột nhiều dòng (nhãn | ô nhập | nhãn | ô nhập …) → gom thành HÀNG để mỗi nhãn đi cùng ô nhập của nó
        function alignedRows(segs, y0, y1, depth) {
            var cells = [];
            segs.forEach(function (sg) {
                rowBands(sg.x0, y0, sg.x1, y1).forEach(function (bd) { cells.push({ sg: sg, s: bd[0], e: bd[1] }); });
            });
            cells.sort(function (a, b) { return a.s - b.s || a.sg.x0 - b.sg.x0; });
            var rows = [];
            cells.forEach(function (c) {
                var h = c.e - c.s + 1, row = null;
                for (var i = rows.length - 1; i >= 0; i--) {
                    var r = rows[i];
                    var ov = Math.min(c.e, r.e) - Math.max(c.s, r.s) + 1;
                    if (ov >= 0.5 * Math.min(h, r.e - r.s + 1)) { row = r; break; }
                }
                if (!row) { row = { s: c.s, e: c.e, items: [] }; rows.push(row); }
                row.items.push(c); row.s = Math.min(row.s, c.s); row.e = Math.max(row.e, c.e);
            });
            var nodes = [];
            rows.forEach(function (r) {
                r.items.sort(function (a, b) { return a.sg.x0 - b.sg.x0; });
                var kids = [];
                r.items.forEach(function (c) { var n = xycut(c.sg.x0, c.s, c.sg.x1, c.e, depth + 1); if (n) kids.push(n); });
                if (kids.length > 1) { var bb = bbOf(kids); nodes.push({ t: "cols", x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1, children: kids }); }
                else if (kids.length === 1) nodes.push(kids[0]);
            });
            if (nodes.length < 2) return nodes.length ? nodes[0] : null;
            var b2 = bbOf(nodes);
            return { t: "rows", x0: b2.x0, y0: b2.y0, x1: b2.x1, y1: b2.y1, children: nodes };
        }

        function leafOf(bb) { return { t: "leaf", x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1 }; }

        // đoạn cột có ink; chữ / ô nhập gần nhau (<10px) gộp; khối đặc (chip) chỉ gộp khi sát (<3px)
        function colSegments(x0, y0, x1, y1) {
            var segs = [], x = x0;
            while (x <= x1) {
                if (!colInk(x, y0, y1)) { x++; continue; }
                var s = x;
                while (x <= x1 && colInk(x, y0, y1)) x++;
                segs.push({ x0: s, x1: x - 1 });
            }
            segs.forEach(function (sg) { measure(sg, y0, y1); });
            var out = [];
            segs.forEach(function (sg) {
                var prev = out[out.length - 1];
                if (prev) {
                    var gap = sg.x0 - prev.x1 - 1;
                    var lim = (prev.solid && sg.solid) ? 3 : 10;
                    if (gap < lim) { prev.x1 = sg.x1; measure(prev, y0, y1); return; }
                }
                out.push(sg);
            });
            return out;
        }

        function measure(sg, ys, ye) {
            var y0 = ye, y1 = ys, ink = 0;
            for (var y = ys; y <= ye; y++) {
                for (var x = sg.x0; x <= sg.x1; x++) {
                    if (isInk(x, y)) { ink++; if (y < y0) y0 = y; if (y > y1) y1 = y; }
                }
            }
            var area = (sg.x1 - sg.x0 + 1) * (Math.max(y0, y1) - y0 + 1);
            sg.solid = area > 0 && ink / area > 0.6 && (y1 - y0 + 1) >= 18 && (sg.x1 - sg.x0 + 1) >= 20;
        }

        return { bg: bg, sections: sections, W: W, H: H };
    };

    // ---------------------------------------------------------------- dựng
    function loadImage(src, cb) {
        var img = new Image();
        img.onload = function () { cb(null, img); };
        img.onerror = function () { cb(new Error("Không đọc được ảnh")); };
        img.src = src;
    }

    function median(arr, dflt) {
        if (!arr.length) return dflt;
        var a = arr.slice().sort(function (x, y) { return x - y; });
        return a[Math.floor(a.length / 2)];
    }

    imp.mode = "auto";   // "core" | "ess" | "auto" (menu chuột phải chọn Core / ESS)

    imp.runForSelection = function (mode) {
        imp.mode = mode || "auto";
        var ids = (window.builderSnippet ? builderSnippet.getSelectionIds() : [builder.selectedControlId]).filter(Boolean);
        var cfg = ids.length === 1 ? builder.getControlConfig(ids[0]) : null;
        if (!cfg || cfg.type !== "field" || cfg.ftype !== "image" || !cfg.imageData) {
            toast("Hãy chọn 1 ảnh (ESS Image) đã có ảnh. Dán ảnh chụp bằng Ctrl+V rồi chọn nó.", "info");
            return;
        }
        imp.build(cfg);
    };

    imp.build = function (src, opts) {
        opts = opts || {};
        loadImage(src.imageData, function (err, img) {
            if (err) { toast(err.message, "error"); return; }
            var W = img.naturalWidth, H = img.naturalHeight;
            var cv = document.createElement("canvas");
            cv.width = W; cv.height = H;
            var ctx = cv.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            var data;
            try { data = ctx.getImageData(0, 0, W, H).data; }
            catch (ex) { toast("Không đọc được điểm ảnh: " + ex.message, "error"); return; }

            if (opts.dryRun) { var r0 = imp.analyze(data, W, H); if (!r0.sections.length) { toast("Không nhận ra cấu trúc nào trong ảnh.", "warning"); return; } opts.dryRun(r0); return; }
            var scale = opts.scale || 1;   // dựng đúng kích thước ảnh gốc (1:1) để chữ không bị thu nhỏ thành nét gạch
            toast("Đang đọc chữ trong ảnh (offline) – bản có nhận dạng lưới/popup/section…", "info");
            imp.makeAll(cv, scale, function (i, n) { if (i % 10 === 0) toast("Đọc chữ " + i + "/" + n + "…", "info"); }, src).then(function (made) {
                if (!made.length) { toast("Không nhận ra cấu trúc nào trong ảnh.", "warning"); return; }
                imp.commit(src, made, opts);
            });
        });
    };

    // Pipeline thường: analyze → refine → hộp → OCR → compose. Trả về Promise<made[]> (rỗng nếu không thấy gì)
    imp.runPipeline = function (cv, scale, progress, src, opts) {
        var W = cv.width, H = cv.height, ctx = cv.getContext("2d", { willReadFrequently: true });
        var data = ctx.getImageData(0, 0, W, H).data;
        var res;
        try { res = imp.analyze(data, W, H); } catch (ex) { return Promise.resolve([]); }
        if (!res || !res.sections.length) return Promise.resolve([]);
        imp.refine(res, cv);
        try { imp.applyBoxes(res, imp.allBoxes(data, W, H, res.bg)); } catch (ex) { if (window.console) console.warn("findBoxes", ex); }
        return imp.annotate(res, cv, progress).then(function () {
            return imp.alignFields(imp.compose(res, cv, src || { id: "src", type: "field", ftype: "image", imageData: "", left: 0, top: 0, width: W, height: H }, scale, opts));
        });
    };

    // Sinh danh sách cfg (group box "trần" lồng nhau + lát ảnh) từ cây phân tích
    // ---------------------------------------------------------------- đoán loại control từ pixel
    // Chỉ đoán những ô "rỗng" (khung nhập trống, ô chọn trống, radio/checkbox) — ô có chữ bên trong vẫn giữ là ảnh để không mất nội dung.
    // Trả về "text" | "combo" | "radio" | "checkbox" | null
    imp.classify = function (ctx, node, bg, edgesOnly) {
        var w = node.x1 - node.x0 + 1, h = node.y1 - node.y0 + 1;
        if (node.bar || w < 8 || h < 8) return null;
        // đọc rộng thêm 1px mỗi phía (P): viền ô nhập rất nhạt nên bbox theo "nét mực" hay lệch 1px so với viền thật
        var P = 1, ex = Math.max(0, node.x0 - P), ey = Math.max(0, node.y0 - P);
        var ox = node.x0 - ex, oy = node.y0 - ey, W2 = w + 2 * P, H2 = h + 2 * P, d;
        try { d = ctx.getImageData(ex, ey, W2, H2).data; } catch (e) { return null; }
        function df(x, y) { var i = ((y + oy) * W2 + (x + ox)) * 4; return Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])); }
        function lm(x, y) { var i = ((y + oy) * W2 + (x + ox)) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; }
        // radio / checkbox: ô vuông nhỏ
        if (!edgesOnly && w >= 8 && w <= 22 && h >= 8 && h <= 22 && Math.abs(w - h) <= 3) {
            var mid = [df(w >> 1, 0), df(w >> 1, h - 1), df(0, h >> 1), df(w - 1, h >> 1)];
            if (mid.filter(function (v) { return v >= 20; }).length < 3) return null;
            var corners = [df(0, 0), df(w - 1, 0), df(0, h - 1), df(w - 1, h - 1)];
            return corners.filter(function (v) { return v < 14; }).length >= 3 ? "radio" : "checkbox";
        }
        // ô nhập: hình chữ nhật có viền (cho phép lệch 1px)
        if (w >= 40 && w <= 800 && h >= 11 && h <= 40) {
            function side(get, n) {
                var best = 0;
                for (var k = -1; k <= 1; k++) { var c = 0; for (var i = 0; i < n; i++) if (get(i, k) >= 12) c++; best = Math.max(best, c / n); }
                return best;
            }
            var e = [side(function (i, k) { return df(i, k); }, w), side(function (i, k) { return df(i, h - 1 + k); }, w),
                     side(function (i, k) { return df(k, i); }, h), side(function (i, k) { return df(w - 1 + k, i); }, h)];
            if (Math.min.apply(null, e) < 0.8) return null;
            if (edgesOnly) return "boxed";
            var arrowW = Math.min(22, w >> 2), ink = 0, arrow = 0, cnt = 0;
            for (var y = 2; y < h - 2; y++) for (var x = 2; x < w - 2; x++) {
                var L = lm(x, y);
                if (x >= w - 2 - arrowW) { if (L < 175) arrow++; } else if (L < 130) ink++;
                cnt++;
            }
            if (cnt === 0 || ink / cnt > 0.01) return null;      // có chữ bên trong → giữ ảnh
            // ruột phải đồng màu (trắng / xám vô hiệu) — loại hình vẽ như avatar, biểu tượng
            var cx = w >> 1, cy = h >> 1, ci = ((cy + oy) * W2 + (cx + ox)) * 4, far = 0, tot = 0;
            for (var yy = 2; yy < h - 2; yy++) for (var xx = 2; xx < w - 2 - arrowW; xx++) {
                var ii = ((yy + oy) * W2 + (xx + ox)) * 4;
                if (Math.max(Math.abs(d[ii] - d[ci]), Math.abs(d[ii + 1] - d[ci + 1]), Math.abs(d[ii + 2] - d[ci + 2])) > 12) far++;
                tot++;
            }
            if (tot && far / tot > 0.05) return null;
            return arrow >= 3 ? "combo" : (arrow === 0 ? "text" : null);
        }
        return null;
    };

    // ---------------------------------------------------------------- OCR offline (Tesseract.js đặt trong Scripts/vendor/tesseract)
    var OCR_BASE = "/Scripts/vendor/tesseract/";
    var ocrPromise = null;
    function getOcr() {
        if (ocrPromise) return ocrPromise;
        ocrPromise = new Promise(function (resolve, reject) {
            function make() {
                window.Tesseract.createWorker("eng", 1, {
                    workerPath: OCR_BASE + "worker.min.js",
                    corePath: OCR_BASE + "tesseract-core-simd-lstm.wasm.js",
                    langPath: OCR_BASE.replace(/\/$/, ""),
                    gzip: true
                }).then(resolve, reject);
            }
            if (window.Tesseract) { make(); return; }
            var sc = document.createElement("script");
            sc.src = OCR_BASE + "tesseract.min.js";
            sc.onload = make; sc.onerror = function () { reject(new Error("Không tải được Tesseract")); };
            document.head.appendChild(sc);
        });
        ocrPromise.catch(function () { ocrPromise = null; });
        return ocrPromise;
    }

    function allLeaves(res) {
        var out = [];
        (function walk(n) { if (n.t === "leaf") out.push(n); else n.children.forEach(walk); })(
            { t: "rows", children: [].concat.apply([], res.sections.map(function (s) { return s.children; })) });
        return out;
    }

    function cleanText(t) {
        t = (t || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").replace(/[|_]+/g, "").trim();
        t = t.replace(/\(\s*[*"'\u2018\u2019\u201c\u201d\u00b0\u2022\u00b7.,:]\s*\)/g, "(*)");   // dấu (*) hay bị đọc thành (") ('*')…
        t = t.replace(/^[^A-Za-z0-9(]+/, "");                                       // rác đầu dòng (nét ô radio, dấu nháy)
        t = t.replace(/^[(\[]\S{0,2}\s+(?=[A-Za-z])/, "");                          // "(2 Select" / "@ By" → bỏ ký hiệu radio
        t = t.replace(/\bBY\b/g, "By");
        return t.trim();
    }

    // Gắn node.kind (loại control đoán từ pixel) và node.text (chữ đọc bằng OCR) cho từng lát; ghép "nhãn + ô nhập" liền kề thành 1 field.
    imp.annotate = function (res, cv, progress) {
        var ctx = cv.getContext("2d", { willReadFrequently: true });
        var leaves = allLeaves(res);
        leaves.forEach(function (n) {
            if (n.bar || n.keep) return;
            if (n.boxed) {
                var bw = n.x1 - n.x0 + 1, bh = n.y1 - n.y0 + 1;
                if (bw >= 9 && bw <= 22 && bh >= 9 && bh <= 22 && Math.abs(bw - bh) <= 3) {   // ô vuông nhỏ viền xám = checkbox/radio, không phải nút "…"
                    var ck = imp.classify(ctx, n, res.bg);
                    if (ck === "radio" || ck === "checkbox") { n.boxed = false; n.kind = ck; return; }
                }
                n.kind = boxKind(n); if (!n.kind) { n.boxed = false; if (n.hdr || n.tile) n.keep = true; } return;
            }
            n.kind = imp.classify(ctx, n, res.bg);
            if (imp.mode === "ess" && !n.kind && !n.bar && !n.keep) {   // nút tròn "…" (tra cứu) của ESS: vòng viền tròn, ruột gần như trống
                var rw = n.x1 - n.x0 + 1, rh = n.y1 - n.y0 + 1;
                if (rw >= 26 && rw <= 44 && rh >= 26 && rh <= 44 && Math.abs(rw - rh) <= 3) {
                    var rcx = (n.x0 + n.x1) / 2, rcy = (n.y0 + n.y1) / 2, rr = Math.min(rw, rh) / 2 - 1.5, ring = 0, bgc = res.bg;
                    for (var ra = 0; ra < 16; ra++) {
                        var rp = ctx.getImageData(Math.round(rcx + rr * Math.cos(ra * Math.PI / 8)), Math.round(rcy + rr * Math.sin(ra * Math.PI / 8)), 1, 1).data;
                        if (Math.max(Math.abs(rp[0] - bgc[0]), Math.abs(rp[1] - bgc[1]), Math.abs(rp[2] - bgc[2])) >= 18) ring++;
                    }
                    var rd = ctx.getImageData(n.x0 + 6, n.y0 + 6, rw - 12, rh - 12).data, rfar = 0;
                    for (var rq = 0; rq < rd.length; rq += 4) if (Math.max(Math.abs(rd[rq] - bgc[0]), Math.abs(rd[rq + 1] - bgc[1]), Math.abs(rd[rq + 2] - bgc[2])) >= 60) rfar++;
                    if (ring >= 13 && rfar / (rd.length / 4) < 0.15) { n.kind = "button"; n.value = "..."; n.ui = "ess"; n.fill = bgc.slice(); n.borderColor = [206, 212, 218]; }
                }
            }
        });
        // ô có viền do findBoxes tìm ra: có mũi tên bên phải → combo, còn lại → text
        function px(x, y) { var q = ctx.getImageData(Math.max(0, Math.min(res.W - 1, x)), Math.max(0, Math.min(res.H - 1, y)), 1, 1).data; return [q[0], q[1], q[2]]; }
        function hex(c) { return "#" + c.map(function (v) { var t = v.toString(16); return t.length < 2 ? "0" + t : t; }).join(""); }
        function lumC(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
        function cdiff(a, b) { return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])); }
        function inkProfile(n, inner) {
            var iw = n.x1 - n.x0 - 5, ih = n.y1 - n.y0 - 7, data, x, y;
            if (iw < 8 || ih < 4) return null;
            try { data = ctx.getImageData(n.x0 + 3, n.y0 + 4, iw, ih).data; } catch (e) { return null; }
            var cols = [];
            for (x = 0; x < iw; x++) {
                var hit = false;
                for (y = 0; y < ih && !hit; y++) { var o = (y * iw + x) * 4; hit = Math.max(Math.abs(data[o] - inner[0]), Math.abs(data[o + 1] - inner[1]), Math.abs(data[o + 2] - inner[2])) >= 40; }
                cols.push(hit);
            }
            var clusters = [], cur = null, gap = 0;
            for (x = 0; x < iw; x++) {
                if (cols[x]) { if (!cur) cur = { x0: x, x1: x }; else cur.x1 = x; gap = 0; }
                else if (cur && ++gap >= 12) { clusters.push(cur); cur = null; }
            }
            if (cur) clusters.push(cur);
            if (!clusters.length) return { count: 0 };
            var last = clusters[clusters.length - 1], prev = clusters[clusters.length - 2];
            return { count: clusters.length, left: clusters[0].x0, right: iw - 1 - last.x1, lastW: last.x1 - last.x0 + 1, lastGap: prev ? last.x0 - prev.x1 - 1 : 0 };
        }
        function boxKind(n) {
            var w = n.x1 - n.x0 + 1, h = n.y1 - n.y0 + 1, aw = Math.min(22, w >> 2);
            var mx = n.x0 + (w >> 1), my = n.y0 + (h >> 1), outer = px(mx, n.y0 - 3), edge = px(mx, n.y0);
            [px(mx, n.y0 + 1), px(mx, n.y0 - 1), px(n.x0, my), px(n.x0 + 1, my), px(mx, n.y1), px(mx, n.y1 - 1)].forEach(function (c) {
                if (cdiff(c, outer) > cdiff(edge, outer)) edge = c;
            });
            var inL = px(n.x0 + 8, my), inner = inL;
            // màu ruột: lấy điểm phổ biến nhất trên 2 hàng sát mép trong (tránh trúng nét chữ)
            var cs = [], sx, sy;
            for (sx = 0; sx < 6; sx++) { var xx = n.x0 + 4 + Math.round((w - 8 - aw) * sx / 5); cs.push(px(xx, n.y0 + 3)); cs.push(px(xx, n.y1 - 3)); }
            var bestC = null, bestN = -1;
            cs.forEach(function (c) { var k = 0; cs.forEach(function (o) { if (cdiff(c, o) < 6) k++; }); if (k > bestN) { bestN = k; bestC = c; } });
            if (bestC) inner = bestC;
            n.fill = inner; n.borderColor = edge;
            n.disabled = lumC(inner) > 170 && lumC(inner) <= lumC(res.bg) - 8 && lumC(inner) >= lumC(res.bg) - 60;   // ruột xám hơn nền trang: control bị khoá (disabled)
            n.ui = imp.mode === "ess" ? "ess" : imp.mode === "core" ? "core" : (h >= 34 ? "ess" : "core");
            // nút đặc màu: cả mép trên/dưới bên trong (tránh chữ và mũi tên ở giữa) đều cùng một màu tối; ô combo trắng có chữ/mũi tên tối KHÔNG phải nút
            var fp = [px(n.x0 + (w >> 2), n.y0 + 3), px(n.x0 + (w >> 1), n.y0 + 3), px(n.x0 + 3 * (w >> 2), n.y0 + 3), px(n.x0 + (w >> 2), n.y1 - 3), px(n.x0 + 3 * (w >> 2), n.y1 - 3)];
            var uni = fp.every(function (c) { return cdiff(c, fp[0]) < 14; });
            var filled = uni && cdiff(fp[0], outer) >= 40 && lumC(fp[0]) < 170;
            if (imp.mode === "ess" && uni && cdiff(fp[0], outer) >= 40 && Math.max.apply(null, fp[0]) - Math.min.apply(null, fp[0]) >= 60 && h <= 28 && w >= 30 && w <= 170) { n.fill = fp[0]; n.disabled = false; return "tag"; }
            if (filled) inner = n.fill = fp[0];
            if (filled && w >= 30) return "button";           // nút đặc màu (Login…)
            // ô nhiều dòng (textarea / Remark): rộng, cao hơn ô nhập thường, ruột trắng hoặc đồng màu nền
            var memoMin = imp.mode === "core" ? 28 : 56;
            if (!filled && w >= 150 && h >= memoMin && h <= 160 && lumC(inner) >= lumC(res.bg) - 2) { n.disabled = false; return "memo"; }
            // hàng tiêu đề bảng: có vạch ngăn cột dọc ở giữa hộp → không phải ô nhập, giữ nguyên là ảnh
            if (imp.mode === "ess" && (n.filledBox || n.disabled) && w >= 50 && w <= 260 && h >= 24 && h <= 56) {   // nút ESS bị khoá: nền xám phẳng, chữ + biểu tượng CĂN GIỮA, không mũi tên
                var idd;
                try { idd = ctx.getImageData(n.x0 + 3, n.y0 + 4, w - 6, h - 8).data; } catch (e2) { idd = null; }
                if (idd) {
                    var iw = w - 6, ih = h - 8, mnx = 1e9, mxx = -1, ink = 0;
                    for (var ix = 0; ix < iw; ix++) for (var iy = 0; iy < ih; iy++) { var io = (iy * iw + ix) * 4; if (Math.max(Math.abs(idd[io] - inner[0]), Math.abs(idd[io + 1] - inner[1]), Math.abs(idd[io + 2] - inner[2])) >= 30) { ink++; if (ix < mnx) mnx = ix; if (ix > mxx) mxx = ix; break; } }
                    var midOff = ((mnx + mxx) / 2) - (iw - 1) / 2;
                    if (ink >= 6 && Math.abs(midOff) <= 0.1 * w && mxx < iw - 16) { n.disabled = true; return "button"; }
                }
            }
            if (imp.mode !== "core" && w >= 100 && w <= 260 && h >= 24 && h <= 44) {   // ô ngày ESS: ô nhập + vạch ngăn + biểu tượng lịch ở mép phải
                for (var dx2 = n.x1 - 48; dx2 <= n.x1 - 20; dx2++) {
                    var dh = 0, dt = 0;
                    for (var dy2 = n.y0 + 4; dy2 <= n.y1 - 4; dy2 += 2) { dt++; if (cdiff(px(dx2, dy2), inner) >= 8) dh++; }
                    if (dt >= 4 && dh >= 0.9 * dt) { n.disabled = false; return "date"; }
                }
            }
            if (w >= 250) {
                for (var vx = n.x0 + 12; vx <= n.x1 - 12; vx++) {
                    var vh = 0, vt = 0;
                    for (var vy = n.y0 + 3; vy <= n.y1 - 3; vy += 2) { vt++; if (cdiff(px(vx, vy), inner) >= 12) vh++; }
                    if (vt >= 4 && vh >= 0.85 * vt) { n.hdr = true; return null; }
                }
            }
            if (w > 520) return null;                         // hộp rất rộng mà không phải ô nhiều dòng: là bảng / panel
            if (h > 44) { if (h <= 80 && w >= 150 && w <= 520) n.tile = true; return null; }   // hộp cao mà không đặc: không phải control → giữ ảnh (ô thẻ số liệu giữ nguyên)
            if (w <= 34) {                                    // nút nhỏ kiểu "…": ruột phải gần đồng màu (loại hình vẽ như avatar)
                var dd;
                try { dd = ctx.getImageData(n.x0 + 3, n.y0 + 3, Math.max(1, w - 6), Math.max(1, h - 6)).data; } catch (e0) { return null; }
                var far = 0, tot = dd.length / 4;
                for (var q = 0; q < dd.length; q += 4) if (Math.max(Math.abs(dd[q] - inL[0]), Math.abs(dd[q + 1] - inL[1]), Math.abs(dd[q + 2] - inL[2])) > 20) far++;
                return far / tot < 0.15 ? "button" : null;
            }
            if (w < 50) return null;                          // hộp nhỏ hơn 50px mà không phải nút: không phải ô nhập
            var d;
            try { d = h >= 24 ? ctx.getImageData(n.x1 - aw, n.y0 + 5, aw - 4, Math.max(1, h - 10)).data : ctx.getImageData(n.x1 - aw, n.y0 + 2, aw - 1, Math.max(1, h - 4)).data; } catch (e) { return "text"; }
            var dark = 0;   // mũi tên combo: điểm khác rõ màu ruột (kể cả mũi tên xám nhạt của ô bị khoá)
            for (var i = 0; i < d.length; i += 4) if (Math.max(Math.abs(d[i] - inner[0]), Math.abs(d[i + 1] - inner[1]), Math.abs(d[i + 2] - inner[2])) >= 28) dark++;
            if (imp.mode === "ess" && Math.max.apply(null, edge) - Math.min.apply(null, edge) >= 60 && lumC(edge) < 200) { n.disabled = false; return "button"; }   // nút ESS viền màu, nền trắng
            if (imp.mode === "ess" && h >= 22 && h <= 52) {
                var pf = inkProfile(n, inner);
                if (pf && pf.count) {
                    var arrowLike = pf.count >= 2 && pf.lastW <= 18 && pf.lastGap >= Math.max(14, 0.1 * w) && pf.right <= 18;
                    var centred = pf.left >= 6 && Math.abs(pf.left - pf.right) <= Math.max(8, 0.15 * w);
                    if (!arrowLike && centred && (n.filledBox || w <= 170)) {
                        n.pill = !!n.filledBox && lumC(inner) >= 200 && Math.max.apply(null, inner) - Math.min.apply(null, inner) >= 12;
                        return "button";
                    }
                    if (!arrowLike && dark >= 3) return "text";
                }
            }
            if (imp.mode !== "ess" && h >= 22 && h <= 34 && w <= 260) {
                var cp = inkProfile(n, inner);
                if (cp && cp.count === 1 && cp.left >= 8 && cp.lastW >= 20 && Math.abs(cp.left - cp.right) <= Math.max(6, 0.12 * w)) return "button";
            }
            if (window.__T2) console.log('T2 boxKind', n.x0, n.y0, w, h, 'dark', dark, 'edge', edge.join(','), 'inner', inner.join(','));
            if (imp.mode !== "ess" && dark >= 6 && h <= 30) {
                var zoneW = h >= 24 ? aw - 4 : aw - 1, zoneH = Math.max(1, h >= 24 ? h - 10 : h - 4), runs = 0, inRun = false;
                for (var zy = 0; zy < zoneH; zy++) {
                    var rowInk = false;
                    for (var zx = 0; zx < zoneW && !rowInk; zx++) {
                        var zi = (zy * zoneW + zx) * 4;
                        rowInk = Math.max(Math.abs(d[zi] - inner[0]), Math.abs(d[zi + 1] - inner[1]), Math.abs(d[zi + 2] - inner[2])) >= 28;
                    }
                    if (rowInk && !inRun) runs++;
                    inRun = rowInk;
                }
                if (runs === 2) return "number";
            }
            return dark >= 3 ? "combo" : "text";
        }
        // thanh (bar) bị các hàng tiêu đề bảng phủ gần hết → bỏ thanh (tránh chồng ảnh mờ)
        var hdrs = leaves.filter(function (n) { return n.hdr; });
        if (hdrs.length) leaves.forEach(function (b) {
            if (!b.bar) return;
            var bh = b.y1 - b.y0 + 1, cov = 0;
            hdrs.forEach(function (h) { if (Math.min(b.y1, h.y1) - Math.max(b.y0, h.y0) + 1 >= 0.5 * bh) cov += Math.max(0, Math.min(b.x1, h.x1) - Math.max(b.x0, h.x0) + 1); });
            if (cov >= 0.6 * (b.x1 - b.x0 + 1)) b.drop = true;
        });
        var boxLeaves = leaves.filter(function (n) { return n.boxed; });
        var cands = leaves.filter(function (n) {
            var w = n.x1 - n.x0 + 1, h = n.y1 - n.y0 + 1;
            return !n.bar && !n.keep && !n.kind && h >= 7 && h <= 44 && w >= 10 && w <= 520 && imp.classify(ctx, n, res.bg, true) !== "boxed";   // ô nhập có chữ bên trong: giữ ảnh
        }).slice(0, 250);
        cands = cands.concat(boxLeaves);
        if (imp.ocr === false || !cands.length) return Promise.resolve(res);

        // Chữ nằm trong ô nhập/combo (có viền dọc sát bên trái) là NỘI DUNG của ô, không phải nhãn → giữ ảnh
        function insideBox(n) {
            var x0 = Math.max(0, n.x0 - 8), y0 = Math.max(0, n.y0 - 2), w = n.x0 - x0 + 4, h = Math.min(res.H - y0, n.y1 - n.y0 + 5);
            if (w < 2 || h < 4) return false;
            var d;
            try { d = ctx.getImageData(x0, y0, w, h).data; } catch (e) { return false; }
            for (var x = 0; x < w; x++) {
                var hit = 0;
                for (var y = 0; y < h; y++) {
                    var i = (y * w + x) * 4;
                    if (Math.max(Math.abs(d[i] - res.bg[0]), Math.abs(d[i + 1] - res.bg[1]), Math.abs(d[i + 2] - res.bg[2])) >= 14) hit++;
                }
                if (hit >= 0.85 * h) return true;
            }
            return false;
        }

        return getOcr().then(function (worker) {
            var i = 0;
            function next() {
                if (i >= cands.length) return Promise.resolve();
                var n = cands[i++];
                if (progress) progress(i, cands.length);
                var rx = n.x0, ry = n.y0, w = n.x1 - n.x0 + 1, h = n.y1 - n.y0 + 1, P = 3, S = 3, fill = res.bg;
                if (n.boxed) {   // đọc phần ruột ô (bỏ viền, bỏ mũi tên bên phải nếu là combo)
                    var aw = n.kind === "combo" || n.kind === "number" ? Math.min(22, w >> 2) : n.kind === "date" ? 44 : 0;
                    if (n.kind === "button" && w <= 34) { n.value = "..."; return next(); }   // nút nhỏ: khỏi đọc chữ
                    rx = n.x0 + 3; ry = n.y0 + 2; w = Math.max(1, w - 6 - aw); h = Math.max(1, h - 4);
                    var px = ctx.getImageData(Math.min(cv.width - 1, n.x0 + 2), Math.min(cv.height - 1, n.y0 + 2), 1, 1).data;
                    fill = n.fill ? n.fill : [px[0], px[1], px[2]];
                }
                var c = document.createElement("canvas");
                c.width = (w + 2 * P) * S; c.height = (h + 2 * P) * S;
                var g = c.getContext("2d");
                g.fillStyle = "rgb(" + fill.join(",") + ")"; g.fillRect(0, 0, c.width, c.height);
                g.imageSmoothingEnabled = true;
                g.drawImage(cv, rx, ry, w, h, P * S, P * S, w * S, h * S);
                if (n.boxed && n.fill && n.kind === "tag") {
                    try {
                        var td = g.getImageData(0, 0, c.width, c.height), tp = td.data;
                        for (var t0 = 0; t0 < tp.length; t0 += 4) {
                            var tv = 255 - Math.min(255, 4 * Math.max(Math.abs(tp[t0] - n.fill[0]), Math.abs(tp[t0 + 1] - n.fill[1]), Math.abs(tp[t0 + 2] - n.fill[2])));
                            tp[t0] = tp[t0 + 1] = tp[t0 + 2] = tv;
                        }
                        g.putImageData(td, 0, 0);
                    } catch (e3) { }
                } else
                if (n.boxed && n.fill && (0.299 * n.fill[0] + 0.587 * n.fill[1] + 0.114 * n.fill[2]) >= 128) {   // chữ xám nhạt (ô bị khoá): kéo giãn tương phản cho OCR đọc được
                    try {
                        var gd = g.getImageData(0, 0, c.width, c.height), gp = gd.data, mn = 255, mxv = 0, q0;
                        for (q0 = 0; q0 < gp.length; q0 += 4) { var lv = 0.299 * gp[q0] + 0.587 * gp[q0 + 1] + 0.114 * gp[q0 + 2]; if (lv < mn) mn = lv; if (lv > mxv) mxv = lv; }
                        if (mxv - mn >= 25 && mn > 40) {
                            for (q0 = 0; q0 < gp.length; q0 += 4) { var l2 = 0.299 * gp[q0] + 0.587 * gp[q0 + 1] + 0.114 * gp[q0 + 2], v2 = Math.max(0, Math.min(255, Math.round((l2 - mn) * 255 / (mxv - mn)))); gp[q0] = gp[q0 + 1] = gp[q0 + 2] = v2; }
                            g.putImageData(gd, 0, 0);
                        }
                    } catch (e1) { }
                }
                if (n.boxed && n.fill && n.kind !== "tag" && (0.299 * n.fill[0] + 0.587 * n.fill[1] + 0.114 * n.fill[2]) < 128) {   // chữ sáng trên nền tối → đảo màu cho OCR
                    g.globalCompositeOperation = "difference"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "source-over";
                }
                return worker.setParameters({ tessedit_pageseg_mode: h > 20 ? "6" : "7" })
                    .then(function () { return worker.recognize(c); })
                    .then(function (r) {
                        var t = cleanText(r.data.text);
                        if (n.boxed && (n.kind === "button" || n.kind === "tag")) t = t.replace(/^\S{1,2}\s+(?=[A-Za-z]{3,})/, "");   // biểu tượng đầu nút bị đọc thành ký tự lẻ ("x Delete", "+ Create")
                        if (n.boxed && n.kind === "text") t = t.replace(/^[QO0@]\s+(?=[A-Za-z]{3,})/, "");
                        if (window.__T2 && n.boxed) console.log('T2 ocrbox', n.x0, n.y0, n.kind, JSON.stringify(t), r.data.confidence);
                        var okT = r.data.confidence >= (n.boxed ? (n.kind === "button" || n.kind === "tag" ? 40 : 75) : 60) && (t.length >= 2 || (n.boxed && /^[0-9]$/.test(t) && r.data.confidence >= 85)) && /[A-Za-z0-9]/.test(t);
                        if (n.boxed) { if (okT) n.value = t; }
                        else if (okT && !insideBox(n)) n.text = t;
                    }, function () { }).then(next);
            }
            return next();
        }).then(function () {
            mergePairs(res);
            return res;
        }, function (err) {
            toast("Không đọc được chữ (OCR): " + err.message + ". Vẫn dựng cấu trúc.", "warning");
            return res;
        });
    };

    function vOverlap(a, b) { return Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + 1; }

    var DATE_CAPTION = /(^|\s)(date|ngày)$|^date of\s|^(từ |đến )?ngày\s/i;

    function mergePairs(res) {
        // gom mọi lát kèm danh sách cha để có thể ghép cả khi nhãn và ô nhập nằm ở 2 nhóm anh em khác nhau
        var flat = [];
        (function walk(list) {
            list.forEach(function (n) { if (n.t === "leaf") flat.push({ n: n, list: list }); else walk(n.children); });
        })([].concat.apply([], res.sections.map(function (sc) { return sc.children; })));
        // walk trên bản sao phẳng của cấp 1 sẽ mất "list" thật của cấp 1 → duyệt lại chính xác:
        flat = [];
        res.sections.forEach(function (sc) {
            (function walk(list) {
                list.forEach(function (n) { if (n.t === "leaf") flat.push({ n: n, list: list }); else walk(n.children); });
            })(sc.children);
        });
        if (imp.mode === "ess") {   // ô ngày ESS: ô nhập + ô biểu tượng lịch dính ngay bên phải → 1 control date
            flat.forEach(function (ie) {
                var a = ie.n;
                if (!(a.boxed && (a.kind === "text" || a.kind === "combo"))) return;
                for (var qi = 0; qi < flat.length; qi++) {
                    var b = flat[qi].n;
                    if (b === a || b.bar || b.field || b.text || b.value || b.kind === "combo" || b.kind === "radio" || b.kind === "checkbox") continue;
                    var bw = b.x1 - b.x0 + 1;
                    if (bw < 20 || bw > 48 || b.x0 - a.x1 < -1 || b.x0 - a.x1 > 4 || Math.abs(b.y0 - a.y0) > 3 || Math.abs(b.y1 - a.y1) > 3) continue;
                    a.kind = "date"; a.x1 = b.x1; a.disabled = false;
                    var li = flat[qi].list.indexOf(b); if (li >= 0) flat[qi].list.splice(li, 1);
                    flat.splice(qi, 1);
                    break;
                }
            });
        }
        flat.forEach(function (ie) { var a = ie.n; if (a.boxed && (a.kind === "combo" || a.kind === "text") && /^\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}$/.test((a.value || "").trim())) a.kind = "date"; });
        var used = {};
        function txt(e) { return e.n.text && !e.n.kind && !e.n.bar && !e.n.field; }
        var pass = flat.filter(function (e) { return e.n.kind === "radio" || e.n.kind === "checkbox"; }).concat(flat.filter(function (e) { return !(e.n.kind === "radio" || e.n.kind === "checkbox"); }));   // ô chọn ghép nhãn trước, ô nhập ghép sau
        pass.forEach(function (ie) {
            var inp = ie.n;
            if (used[flat.indexOf(ie)] || !(inp.kind === "text" || inp.kind === "combo" || inp.kind === "date" || inp.kind === "number" || inp.kind === "memo" || inp.kind === "radio" || inp.kind === "checkbox")) return;
            var radio = inp.kind === "radio" || inp.kind === "checkbox";
            var best = null, bestGap = Infinity;
            flat.forEach(function (le, li) {
                if (le === ie || used[li] || !txt(le)) return;
                var lab = le.n, ov = vOverlap(lab, inp), minH = Math.min(lab.y1 - lab.y0, inp.y1 - inp.y0) + 1;
                if (ov < 0.3 * minH) return;
                var gap = radio ? lab.x0 - inp.x1 : inp.x0 - lab.x1;
                if (radio && gap < 0 && lab.x0 >= inp.x0 - 3 && lab.x0 <= inp.x1 && lab.x1 > inp.x1 + 3) gap = 0;   // nhãn dính cả ô chọn (viền ô lẫn vào lát chữ)
                if (gap < 0 || gap > (radio ? 24 : 300)) return;
                if (gap < bestGap) { best = { e: le, i: li }; bestGap = gap; }
            });
            if (!best) return;
            var lab = best.e.n;
            var req = /\(\*\)/.test(lab.text);
            var cap = lab.text.replace(/\s*\(\*\)\s*/g, "").replace(/[:：]\s*$/, "").trim();
            if (inp.kind === "combo" && imp.mode !== "ess" && !inp.value && DATE_CAPTION.test(cap)) inp.kind = "date";
            var m = {
                t: "leaf", field: { ftype: inp.kind, ui: inp.ui, disabled: !!inp.disabled, value: inp.value, caption: cap, required: req, right: radio, labelWidth: radio ? 0 : inp.x0 - lab.x0, labelTextW: lab.x1 - lab.x0 + 1 },
                x0: Math.min(lab.x0, inp.x0), x1: Math.max(lab.x1, inp.x1), y0: inp.y0, y1: inp.y1
            };
            var ix = ie.list.indexOf(inp);
            if (ix >= 0) ie.list.splice(ix, 1, m);
            var lx = best.e.list.indexOf(lab);
            if (lx >= 0) best.e.list.splice(lx, 1);
            used[best.i] = true; used[flat.indexOf(ie)] = true;
        });
    }

    // ---------------------------------------------------------------- tìm ô nhập có viền (hình chữ nhật) ngay từ pixel gốc
    // Viền 1px của ô nhập bị bộ lọc "nét mảnh" loại bỏ nên không thành lát; ở đây dò lại: 2 đường ngang song song + 2 đường dọc nối chúng.
    imp.findBoxes = function (d, W, H) {
        function dif(i, j) { return Math.max(Math.abs(d[i] - d[j]), Math.abs(d[i + 1] - d[j + 1]), Math.abs(d[i + 2] - d[j + 2])); }
        // Cạnh trên/dưới/trái/phải: pixel khác rõ với phía NGOÀI 2px (phía trong có thể là chữ nên không so sánh)
        function edgeH(x, y, dir) {   // dir=-1: cạnh trên (ngoài ở phía trên), +1: cạnh dưới
            var y1 = y + dir, y2 = y + 2 * dir;
            if (y2 < 0 || y2 >= H) return false;
            var i = (y * W + x) * 4, o1 = (y1 * W + x) * 4, o2 = (y2 * W + x) * 4;
            return dif(i, o1) >= 10 && (dif(o1, o2) <= 14 || dif(i, o2) >= 10);
        }
        function edgeV(x, y, dir) {
            var x1 = x + dir, x2 = x + 2 * dir;
            if (x2 < 0 || x2 >= W) return false;
            var i = (y * W + x) * 4, o1 = (y * W + x1) * 4, o2 = (y * W + x2) * 4;
            return dif(i, o1) >= 10 && (dif(o1, o2) <= 14 || dif(i, o2) >= 10);
        }
        function scanRuns(dir) {
            var out = [];
            for (var y = 2; y < H - 2; y++) {
                var x = 0;
                while (x < W) {
                    if (!edgeH(x, y, dir)) { x++; continue; }
                    var xa = x, gap = 0, xb = x;
                    while (x < W && gap <= 1) { if (edgeH(x, y, dir)) { xb = x; gap = 0; } else gap++; x++; }
                    if (xb - xa + 1 >= 14) out.push({ y: y, xa: xa, xb: xb });
                }
            }
            return out;
        }
        var tops = scanRuns(-1), bots = scanRuns(1);
        var boxes = [], byY = {};
        bots.forEach(function (r) { (byY[r.y] = byY[r.y] || []).push(r); });
        function vFrac(x, ya, yb, dir, R) {
            var best = 0, bk = 0;
            for (var k = -(R || 1); k <= (R || 1); k++) { var c = 0; for (var y = ya; y <= yb; y++) if (edgeV(Math.min(W - 1, Math.max(0, x + k)), y, dir)) c++; var fr = c / (yb - ya + 1); if (fr > best + 0.001) { best = fr; bk = k; } }
            vFrac.k = bk;
            return best;
        }
        tops.forEach(function (r) {
            var found = false;
            for (var y2 = r.y + 9; y2 <= r.y + 64 && y2 < H && !found; y2++) {
                (byY[y2] || []).forEach(function (q) {
                    if (found) return;
                    if (Math.abs(q.xa - r.xa) > 3 || Math.abs(q.xb - r.xb) > 3) return;
                    if (r.xb - r.xa > 520 && (r.xb - r.xa > 1000 || y2 - r.y > 64)) return;   // quá rộng: là bảng/panel, không phải ô nhập (ô nhiều dòng rộng ≤1000px vẫn nhận)
                    var xa = Math.min(r.xa, q.xa), xb = Math.max(r.xb, q.xb);
                    var fl = vFrac(xa, r.y + 2, y2 - 2, -1, 1), kl = vFrac.k, fr2 = vFrac(xb, r.y + 2, y2 - 2, 1, 1), kr = vFrac.k;
                    if ((fl < 0.8 || fr2 < 0.8) && y2 - r.y >= 20 && xb - xa >= 40) {   // nút bo góc: cạnh trên/dưới bắt đầu sau đoạn cong → cạnh dọc nằm lệch vài px
                        var fl2 = vFrac(xa, r.y + 6, y2 - 6, -1, 6), kl2 = vFrac.k, fr3 = vFrac(xb, r.y + 6, y2 - 6, 1, 6), kr2 = vFrac.k;
                        if (fl2 >= 0.85 && fr3 >= 0.85) { fl = fl2; fr2 = fr3; kl = kl2; kr = kr2; }
                    }
                    if (fl < 0.8 || fr2 < 0.8) return;
                    boxes.push({ x0: xa + Math.min(0, kl), y0: r.y, x1: xb + Math.max(0, kr), y1: y2 });
                    found = true;      // chỉ nhận đáy GẦN NHẤT (tránh ghép đỉnh ô này với đáy ô kế tiếp)
                });
            }
        });
        // bỏ hộp trùng: ưu tiên hộp NHỎ (sát ô thật); hộp nào chứa 1 hộp khác cùng bề ngang là hộp giả (do ghép đỉnh ô này với đáy ô kế)
        boxes.sort(function (a, b) { return (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0); });
        var out = [];
        boxes.forEach(function (b) {
            for (var i = 0; i < out.length; i++) {
                var o = out[i];
                var sameX = Math.abs(b.x0 - o.x0) <= 4 && Math.abs(b.x1 - o.x1) <= 4;
                if (sameX && b.y0 <= o.y0 + 3 && b.y1 >= o.y1 - 3) return;                 // b chứa o cùng bề ngang
                if (sameX && Math.abs(b.y0 - o.y0) <= 3 && Math.abs(b.y1 - o.y1) <= 3) return;   // trùng
            }
            out.push(b);
        });
        return out;
    };

    // Vùng đặc màu (nút xanh, ô "thẻ" bán trong suốt trên nền xanh…): tô loang vùng cùng màu, lấy hình chữ nhật bao.
    imp.findFilled = function (d, W, H, bg) {
        var seen = new Uint8Array(W * H), out = [];
        function col(i) { return [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]; }
        function near(i, c, t) { return Math.abs(d[i * 4] - c[0]) <= t && Math.abs(d[i * 4 + 1] - c[1]) <= t && Math.abs(d[i * 4 + 2] - c[2]) <= t; }
        for (var y0 = 0; y0 < H; y0 += 2) {
            for (var x0 = 0; x0 < W; x0 += 2) {
                var si = y0 * W + x0;
                if (seen[si]) continue;
                var c = col(si);
                if (Math.max(Math.abs(c[0] - bg[0]), Math.abs(c[1] - bg[1]), Math.abs(c[2] - bg[2])) < 8) { seen[si] = 1; continue; }
                // flood (4-láng giềng) bằng ngăn xếp, dung sai 5
                var stack = [si], minx = x0, maxx = x0, miny = y0, maxy = y0, cnt = 0, over = false;
                seen[si] = 1;
                while (stack.length) {
                    var i = stack.pop(), x = i % W, y = (i - x) / W;
                    cnt++;
                    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
                    if (cnt > 400000) { over = true; break; }
                    var nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
                    for (var k = 0; k < 4; k++) { var j = nb[k]; if (j >= 0 && !seen[j] && near(j, c, 5)) { seen[j] = 1; stack.push(j); } }
                }
                if (over) continue;
                var w = maxx - minx + 1, h = maxy - miny + 1;
                if (w >= 40 && w <= 520 && h >= 24 && h <= 130 && cnt >= 0.55 * w * h) out.push({ x0: minx, y0: miny, x1: maxx, y1: maxy, filled: true, fill: c });
                else if (imp.mode === "ess" && w >= 26 && w < 40 && h >= 26 && h <= 40 && Math.abs(w - h) <= 3 && cnt >= 0.6 * w * h) out.push({ x0: minx, y0: miny, x1: maxx, y1: maxy, filled: true, fill: c });
            }
        }
        return out;
    };

    // Radio / checkbox: vòng tròn hoặc ô vuông nhỏ (11–18px), lẻ loi (cách nét khác ≥ 3px hai bên) — bộ dò hộp 1px không thấy vì cạnh quá ngắn.
    imp.findChecks = function (d, W, H, bg) {
        var mask = new Uint8Array(W * H), i, x, y;
        for (i = 0; i < W * H; i++) { var o = i * 4; if (Math.max(Math.abs(d[o] - bg[0]), Math.abs(d[o + 1] - bg[1]), Math.abs(d[o + 2] - bg[2])) >= 14) mask[i] = 1; }
        var seen = new Uint8Array(W * H), out = [];
        function m(px2, py2) { return px2 >= 0 && py2 >= 0 && px2 < W && py2 < H && mask[py2 * W + px2] === 1; }
        for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
            var s0 = y * W + x;
            if (!mask[s0] || seen[s0]) continue;
            var stack = [s0], x0 = x, x1 = x, y0 = y, y1 = y, cnt = 0, big = false; seen[s0] = 1;
            while (stack.length) {
                var p = stack.pop(), px = p % W, py = (p - px) / W; cnt++;
                if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
                if (x1 - x0 > 24 || y1 - y0 > 24) big = true;
                for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
                    var nx = px + dx, ny = py + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                    var q = ny * W + nx; if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
                }
            }
            if (big) continue;
            var w = x1 - x0 + 1, h = y1 - y0 + 1;
            if (w < 11 || w > 18 || Math.abs(w - h) > 1) continue;
            var cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
            if (!(m(cx, y0) && m(cx, y1) && m(x0, cy) && m(x1, cy))) continue;                 // 4 điểm giữa cạnh phải có nét
            var cornersSet = [m(x0, y0), m(x1, y0), m(x0, y1), m(x1, y1)].filter(Boolean).length;
            if (cornersSet === 1 || cornersSet === 3) {
                var inside = 0;
                for (var iy = y0 + 3; iy <= y1 - 3; iy++) for (var ix = x0 + 3; ix <= x1 - 3; ix++) if (m(ix, iy)) inside++;
                if (inside > 0.5 * (w - 6) * (h - 6)) continue;
            }
            var lone = true;                                                                     // hai bên trái/phải trống ≥ 3px (chữ 'O' trong từ thì có nét kề sát)
            for (var yy = y0; yy <= y1 && lone; yy++) for (var k = 1; k <= 3; k++) if (m(x0 - k, yy) || m(x1 + k, yy)) { lone = false; break; }
            if (!lone) continue;
            out.push({ x0: x0, y0: y0, x1: x1, y1: y1, check: true });
        }
        return out;
    };

    // Hộp có viền + vùng đặc màu, bỏ trùng nhau; vùng đặc cao ≥ 60px là "thẻ" (giữ ảnh), thấp hơn là nút.
    imp.allBoxes = function (d, W, H, bg) {
        var bx = imp.findBoxes(d, W, H), fl = imp.findFilled(d, W, H, bg);
        function iou(a, b) {
            var iw = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1, ih = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + 1;
            if (iw <= 0 || ih <= 0) return 0;
            var inter = iw * ih, ua = (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1) + (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) - inter;
            return inter / ua;
        }
        bx = bx.filter(function (a) {
            for (var i = 0; i < bx.length; i++) {
                var b = bx[i];
                if (b === a) continue;
                var area = (b.x1 - b.x0) * (b.y1 - b.y0), aa = (a.x1 - a.x0) * (a.y1 - a.y0);
                if (area > aa * 1.8 && a.x0 >= b.x0 - 2 && a.x1 <= b.x1 + 2 && a.y0 >= b.y0 - 2 && a.y1 <= b.y1 + 2) return false;   // icon/nút con nằm trong ô lớn
            }
            return true;
        });
        var out = bx.slice();
        var ck = [];
        try { ck = imp.findChecks(d, W, H, bg); } catch (e) { ck = []; }
        ck.forEach(function (c) {
            for (var i = 0; i < out.length; i++) if (iou(out[i], c) > 0.3 || (c.x0 >= out[i].x0 - 1 && c.x1 <= out[i].x1 + 1 && c.y0 >= out[i].y0 - 1 && c.y1 <= out[i].y1 + 1)) return;
            out.push(c);
        });
        fl.forEach(function (f) {
            f.tile = (f.y1 - f.y0 + 1) >= 60;
            for (var i = 0; i < out.length; i++) if (iou(out[i], f) > 0.5) { if (f.tile) out[i].tile = true; return; }
            out.push(f);
        });
        return out;
    };

    // Chèn các hộp vào cây: gom mọi lát nằm trọn trong hộp thành 1 lát "boxed"; hộp rỗng chèn vào nhóm nhỏ nhất chứa nó.
    imp.applyBoxes = function (res, boxes) {
        var top = { t: "rows", x0: 0, y0: 0, x1: res.W, y1: res.H, children: [].concat.apply([], res.sections.map(function (sc) { return sc.children; })), _top: true };
        boxes.forEach(function (B) {
            var cx = function (n) { return (n.x0 + n.x1) / 2; }, cy = function (n) { return (n.y0 + n.y1) / 2; };
            var inside = function (n) { return cx(n) >= B.x0 - 2 && cx(n) <= B.x1 + 2 && cy(n) >= B.y0 - 2 && cy(n) <= B.y1 + 2 && n.x0 >= B.x0 - 6 && n.x1 <= B.x1 + 6 && n.y0 >= B.y0 - 6 && n.y1 <= B.y1 + 6; };
            var firstList = null, firstIdx = -1, removed = 0;
            (function walk(node) {
                for (var i = 0; i < node.children.length; i++) {
                    var c = node.children[i];
                    if (c.t === "leaf") {
                        if (B.check && !c.bar && !c.boxed && !c.keep && !inside(c) && Math.min(c.y1, B.y1) - Math.max(c.y0, B.y0) + 1 >= 0.5 * (B.y1 - B.y0 + 1)) {
                            // nét radio/checkbox dính vào đầu (hoặc cuối) lát chữ kề bên → cắt lát chữ lại, chừa ô chọn
                            if (c.x0 >= B.x0 - 2 && c.x0 <= B.x0 + 2 && c.x1 > B.x1 + 3) c.x0 = B.x1 + 2;
                            else if (c.x1 >= B.x1 - 2 && c.x1 <= B.x1 + 2 && c.x0 < B.x0 - 3) c.x1 = B.x0 - 2;
                        }
                        if (!B.check && !B.tile && !c.bar && !c.boxed && !c.keep && !inside(c) && Math.min(c.y1, B.y1) - Math.max(c.y0, B.y0) + 1 >= 0.5 * Math.min(c.y1 - c.y0 + 1, B.y1 - B.y0 + 1) && c.x0 < B.x0 - 3 && c.x1 > B.x0 + 1 && c.x1 <= B.x1 + 6) {
                            c.x1 = B.x0 - 2;   // lát chữ (nhãn) dính vào ô nhập kề bên phải → cắt lát lại ở mép trái ô
                        }
                        if (!c.bar && !c.boxed && !c.keep && inside(c)) {
                            if (!firstList) { firstList = node.children; firstIdx = i; }
                            node.children.splice(i, 1); i--; removed++;
                        }
                    } else walk(c);
                }
            })(top);
            var leaf = { t: "leaf", x0: B.x0, y0: B.y0, x1: B.x1, y1: B.y1 };
            if (B.filled) leaf.filledBox = true;   // vùng đặc màu không viền (nút ESS bị khoá nền xám)
            if (B.tile) leaf.keep = true; else leaf.boxed = true;   // tile: giữ nguyên là 1 lát ảnh (icon + chữ bên trong)
            if (firstList) { firstList.splice(Math.min(firstIdx, firstList.length), 0, leaf); return; }
            // hộp rỗng: tìm nhóm nhỏ nhất chứa hộp
            var host = top;
            (function dive(node) {
                node.children.forEach(function (c) {
                    if (c.t !== "leaf" && c.x0 <= B.x0 + 2 && c.x1 >= B.x1 - 2 && c.y0 <= B.y0 + 2 && c.y1 >= B.y1 - 2) { host = c; dive(c); }
                });
            })(top);
            var at = host.children.length;
            for (var k = 0; k < host.children.length; k++) if (host.children[k].y0 > B.y0 + 3 || (Math.abs(host.children[k].y0 - B.y0) <= 3 && host.children[k].x0 > B.x0)) { at = k; break; }
            host.children.splice(at, 0, leaf);
            if (host === top) { /* hộp nằm ngoài mọi nhóm: thêm thành mục riêng của phần đầu tiên chứa nó theo y */ }
        });
        // ghi lại vào sections (giữ ranh giới phần: phân theo y của lát)
        var kids = top.children;
        res.sections.forEach(function (sc) { sc.children = []; });
        kids.forEach(function (k) {
            var sec = res.sections.filter(function (sc) { return k.y0 >= sc.y0 - 2 && k.y0 <= sc.y1 + 2; })[0] || res.sections[res.sections.length - 1];
            sec.children.push(k);
        });
        res.sections.forEach(function (sc) { sc.children.sort(function (a, b) { return a.y0 - b.y0 || a.x0 - b.x0; }); });
        return res;
    };

    // Lát ảnh lớn có nền riêng (thẻ đăng nhập trắng trên nền xanh, panel xám nhạt chứa nhãn + nút + bảng…) thường bị dính thành 1 khối.
    // Phân tích lại RIÊNG phần ruột lát đó với màu nền của chính nó; nếu tách được ≥2 phần thì thay lát bằng nhóm con.
    imp.refine = function (res, cv, depth) {
        depth = depth || 0;
        if (depth > 2) return res;
        var ctx = cv.getContext("2d", { willReadFrequently: true });
        function shift(n, dx, dy) {
            n.x0 += dx; n.x1 += dx; n.y0 += dy; n.y1 += dy;
            if (n.children) n.children.forEach(function (c) { shift(c, dx, dy); });
        }
        function countLeaves(list) { var k = 0; (function w(n) { if (n.t === "leaf") k++; else n.children.forEach(w); })({ t: "rows", children: list }); return k; }
        function bbox(list) {
            var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            list.forEach(function (c) { x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1); });
            return { x0: x0, y0: y0, x1: x1, y1: y1 };
        }
        function walk(list) {
            for (var i = 0; i < list.length; i++) {
                var n = list[i];
                if (n.t !== "leaf") { walk(n.children); continue; }
                var w = n.x1 - n.x0 + 1, h = n.y1 - n.y0 + 1;
                if (n.bar || w < 100 || h < 12) continue;
                var d;
                try { d = ctx.getImageData(n.x0, n.y0, w, h).data; } catch (e) { continue; }
                // cắt bỏ các dòng đầu/cuối là đường kẻ chạy suốt chiều ngang (viền bảng dính vào lát) rồi mới phân tích lại
                var trimTop = 0, trimBot = 0;
                function lineRow(yy) {
                    var k = 0;
                    for (var xx = 0; xx < w; xx++) {
                        var ii = (yy * w + xx) * 4;
                        if (Math.max(Math.abs(d[ii] - res.bg[0]), Math.abs(d[ii + 1] - res.bg[1]), Math.abs(d[ii + 2] - res.bg[2])) >= 24) k++;
                    }
                    return k >= 0.8 * w;
                }
                while (trimTop < 2 && lineRow(trimTop)) trimTop++;
                while (trimBot < 2 && lineRow(h - 1 - trimBot)) trimBot++;
                var oy = n.y0, hh = h;
                if (trimTop || trimBot) {
                    oy = n.y0 + trimTop; hh = h - trimTop - trimBot;
                    try { d = ctx.getImageData(n.x0, oy, w, hh).data; } catch (e2) { continue; }
                }
                var sub = imp.analyze(d, w, hh);
                // lát thấp (vài dòng chữ) chỉ tách lại khi nền của nó khác nền ảnh — tránh chẻ 1 dòng chữ thành từng từ
                if (h < 30 && !(trimTop || trimBot) && Math.max(Math.abs(sub.bg[0] - res.bg[0]), Math.abs(sub.bg[1] - res.bg[1]), Math.abs(sub.bg[2] - res.bg[2])) < 3) continue;
                var kids = [].concat.apply([], sub.sections.map(function (sc) { return sc.children; }));
                if (countLeaves(kids) < 2) continue;
                kids.forEach(function (k) { shift(k, n.x0, oy); });
                var bb = bbox(kids);
                list[i] = { t: "rows", x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1, children: kids };
                walk(list[i].children);   // đệ quy (giới hạn theo depth qua đếm mức bên dưới)
            }
        }
        var guard = 0;
        (function loop() {
            var before = JSON.stringify(res.sections.map(function (sc) { return countLeaves(sc.children); }));
            res.sections.forEach(function (sc) { walk(sc.children); });
            var after = JSON.stringify(res.sections.map(function (sc) { return countLeaves(sc.children); }));
            if (before !== after && ++guard < 3) loop();
        })();
        return res;
    };

    imp.compose = function (res, cv, src, scale, opts) {
        var made = [], seq = 0, stamp = Date.now();
        function tmpId(p) { return p + "_imp" + stamp + "_" + (seq++); }
        function S(v) { return Math.round(v * scale); }

        function box(node, parentId, ox, oy, gap) {
            return {
                id: tmpId("fld_groupbox"), type: "field", ftype: "groupbox", uiMode: "core", caption: "", required: false,
                disabled: false, defaultValue: "", items: [], multiselectColumns: [], multiselectItems: [],
                multiselectSelectedValues: [], labelWidth: 120, captionBold: false, captionItalic: false,
                captionPosition: "left", tabPageId: null, tabIndex: null, zIndex: 0,
                parentId: parentId, bare: true,
                left: S(node.x0 - ox), top: S(node.y0 - oy),
                width: Math.max(1, S(node.x1 - node.x0 + 1)), height: Math.max(1, S(node.y1 - node.y0 + 1)),
                autoLayout: { mode: "rows", gap: gap, pad: 0, autoHeight: true }
            };
        }

        var cctx = cv.getContext("2d", { willReadFrequently: true });
        function realControl(node, parentId, ox, oy, ftype, extra) {
            var w = node.x1 - node.x0 + 1, h = node.y1 - node.y0 + 1;
            extra = extra || {};
            var cfg = {
                id: tmpId("fld_" + ftype), type: "field", ftype: ftype, uiMode: extra.ui || (imp.mode === "ess" ? "ess" : "core"), caption: extra.caption || "", required: !!extra.required,
                disabled: !!extra.disabled, defaultValue: extra.defaultValue || ((ftype === "text" || ftype === "memo" || ftype === "date" || (ftype === "number" && /^-?[\d.,]+$/.test(extra.value || ""))) && extra.value ? extra.value : ""), items: (ftype === "combo" ? (extra.value ? [extra.value] : ["Item 1", "Item 2"]) : []),
                multiselectColumns: [], multiselectItems: [], multiselectSelectedValues: [],
                labelWidth: extra.labelWidth || 0, captionBold: false, captionItalic: false,
                captionPosition: (ftype === "radio" || ftype === "checkbox") ? "right" : "left",
                tabPageId: null, tabIndex: null, zIndex: 1, parentId: parentId,
                left: S(node.x0 - ox), top: S(node.y0 - oy), width: S(w), height: S(h), _ltw: extra.ltw || 0
            };
            if ((ftype === "radio" || ftype === "checkbox") && cfg.uiMode === "ess") cfg.width += 40;   // ô chọn ESS to hơn và chữ rộng hơn → chừa chỗ để chữ không bị xuống dòng
            var hx = function (c) { return "#" + c.map(function (v) { var t = v.toString(16); return t.length < 2 ? "0" + t : t; }).join(""); };
            if (ftype === "tag") {
                cfg.uiMode = "ess";
                cfg.defaultValue = extra.value || "Tag";
                cfg.caption = ""; cfg.labelWidth = 0;
                if (extra.fill) { cfg.tagBackColor = hx(extra.fill); cfg.tagTextColor = "#ffffff"; }
                cfg.width += 14; cfg.height = Math.max(24, cfg.height + 8);
                cfg.left -= 7; cfg.top -= 4;
            }
            if (ftype === "button") {
                cfg.defaultValue = extra.value || "";
                cfg.caption = ""; cfg.labelWidth = 0;
                if (extra.pill) cfg._pill = true;
                if (extra.fill) {
                    var lum = 0.299 * extra.fill[0] + 0.587 * extra.fill[1] + 0.114 * extra.fill[2];
                    cfg.btnBackColor = hx(extra.fill);
                    cfg.btnTextColor = lum < 140 ? "#ffffff" : (extra.border && Math.max.apply(null, extra.border) - Math.min.apply(null, extra.border) >= 60 ? hx(extra.border) : "#333333");
                    if (extra.border) cfg.btnBorderColor = hx(extra.border);
                }
            }
            made.push(cfg);
        }

        function slice(node, parentId, ox, oy) {
            if (node.field) {
                var f = node.field;
                if (f.right) realControl(node, parentId, ox, oy, f.ftype, { caption: f.caption, required: f.required, disabled: f.disabled });   // radio/checkbox: chữ nằm bên phải ô chọn
                else realControl(node, parentId, ox, oy, f.ftype, { ui: f.ui, disabled: f.disabled, value: f.value, caption: f.caption, required: f.required, labelWidth: S(Math.max(f.labelWidth - 7, f.labelTextW + 2)), ltw: f.labelTextW });   // editor của field lệch ~7px so với labelWidth
                return;
            }
            if (imp.guessTypes !== false) {
                var kind = node.kind !== undefined ? node.kind : imp.classify(cctx, node, res.bg);
                if (kind) { realControl(node, parentId, ox, oy, kind, { value: node.value, ui: node.ui, disabled: node.disabled, fill: node.fill, border: node.borderColor, pill: node.pill }); return; }
            }
            if (node.text && imp.ocr !== false) {   // nhãn đơn lẻ (không có ô nhập kề bên) → control Label
                realControl(node, parentId, ox, oy, "label", { defaultValue: node.text.replace(/\s*\(\*\)\s*$/, "") + (/\(\*\)/.test(node.text) ? " (*)" : "") });
                return;
            }
            var m = 1;   // lề 1px để không cắt sát nét chữ
            var sx = Math.max(0, node.x0 - m), sy = Math.max(0, node.y0 - m);
            var sw = Math.min(res.W - sx, node.x1 - node.x0 + 1 + 2 * m), sh = Math.min(res.H - sy, node.y1 - node.y0 + 1 + 2 * m);
            var cnv = document.createElement("canvas");
            cnv.width = sw; cnv.height = sh;
            cnv.getContext("2d").drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
            var nc = JSON.parse(JSON.stringify(src));
            Object.keys(nc).forEach(function (k) { if (k.charAt(0) === "_") delete nc[k]; });
            delete nc.controlDbId; delete nc.groupId; delete nc.groupOffsetX; delete nc.groupOffsetY; delete nc.autoLayout;
            nc.id = tmpId("fld_image");
            nc.parentId = parentId;
            nc.imageData = cnv.toDataURL("image/png");
            nc.imageMode = "stretch";
            nc.caption = "";
            nc.zIndex = 1;
            nc.left = S(sx - ox);
            nc.top = S(sy - oy);
            nc.width = Math.max(1, S(sw));
            nc.height = Math.max(1, S(sh));
            made.push(nc);
        }

        function bbOf(nodes) {
            var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            nodes.forEach(function (c) { x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1); });
            return { x0: x0, y0: y0, x1: x1, y1: y1 };
        }

        function vgap(children) {
            var g = [];
            for (var i = 1; i < children.length; i++) g.push(S(children[i].y0 - children[i - 1].y1 - 1));
            return Math.max(1, median(g.filter(function (v) { return v >= 0; }), 4) - 2);   // trừ 2px lề (1px mỗi phía) của lát ảnh
        }

        function emit(node, parentId, ox, oy) {
            if (node.t === "leaf") { slice(node, parentId, ox, oy); return; }
            var b = box(node, parentId, ox, oy, node.t === "rows" ? vgap(node.children) : 2);
            made.push(b);
            node.children.forEach(function (c) { emit(c, b.id, node.x0, node.y0); });
        }

        // Bỏ các nét vụn: đường kẻ mảnh chạy ngang khổ (viền panel) và chấm 1-2px
        function prune(node) {
            if (node.t === "leaf") {
                var w = node.x1 - node.x0 + 1, h = node.y1 - node.y0 + 1;
                if (node.drop) return null;
                if (!node.bar && ((h <= 3 && w >= res.W * 0.4) || (w <= 2 && h <= 2) || Math.min(w, h) <= 1)) return null;
                if (!node.bar && !node.kind && !node.field && !node.boxed && w <= 10 && (node.x0 <= 14 || node.x1 >= res.W - 15)) return null;   // vệt viền khung trang sát mép ảnh
                return node;
            }
            node.children = node.children.map(prune).filter(Boolean);
            if (!node.children.length) return null;
            if (node.children.length === 1) return node.children[0];
            // co bbox theo con còn lại
            var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            node.children.forEach(function (c) { x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1); });
            node.x0 = x0; node.y0 = y0; node.x1 = x1; node.y1 = y1;
            return node;
        }
        // Các nhóm anh em có bbox chồng lên nhau (XY-cut ghép vắt) làm auto-layout xếp lại sai → làm phẳng: bỏ lớp nhóm, giữ các lát theo đúng vị trí thật.
        function leavesOf(n, out) { if (n.t === "leaf") out.push(n); else n.children.forEach(function (c) { leavesOf(c, out); }); return out; }
        function overlapArea(a, b) {
            var w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1, h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + 1;
            return (w > 2 && h > 2) ? w * h : 0;
        }
        function bboxOfList(list) {
            var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            list.forEach(function (c) { x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1); });
            return { x0: x0, y0: y0, x1: x1, y1: y1 };
        }
        function flatten2(n) {
            if (n.t === "leaf") return;
            n.children.forEach(flatten2);
            var overl = false;
            for (var i = 0; i < n.children.length && !overl; i++)
                for (var j = i + 1; j < n.children.length; j++)
                    if (overlapArea(n.children[i], n.children[j])) { overl = true; break; }
            if (overl) {
                var lv = leavesOf(n, []);
                n.children = lv;
                n.t = "rows";
            }
        }
        res.sections.forEach(function (sec) {
            var top = { t: "rows", children: sec.children };
            flatten2(top);
            sec.children = top.children;
        });
        res.sections.forEach(function (sec) {
            sec.children = sec.children.map(prune).filter(Boolean);
            if (sec.children.length) {
                var y0 = Infinity, y1 = -Infinity;
                sec.children.forEach(function (c) { y0 = Math.min(y0, c.y0); y1 = Math.max(y1, c.y1); });
                sec.y0 = y0; sec.y1 = y1;
            }
        });
        res.sections = res.sections.filter(function (sec) { return sec.children.length; });
        if (!res.sections.length) return made;

        // Thanh tiêu đề ngang khổ màn hình thường dài hơn nội dung rất nhiều (màn rộng, phần phải để trống):
        // cắt thanh về mép phải của nội dung để panel không dài lê thê.
        var maxX = 0;
        (function scan(n) {
            if (n.t === "leaf") { if (!n.bar) maxX = Math.max(maxX, n.x1); return; }
            n.children.forEach(scan);
        })({ t: "rows", children: [].concat.apply([], res.sections.map(function (sc) { return sc.children; })) });
        if (maxX > 0) {
            var limit = Math.min(res.W - 1, maxX + 16);
            (function clip(n) {
                if (n.t === "leaf") { if (n.bar && n.x1 > limit) n.x1 = limit; return; }
                n.children.forEach(clip);
                var bb = bbOf(n.children); n.x0 = bb.x0; n.x1 = bb.x1;
            })({ t: "rows", children: [].concat.apply([], res.sections.map(function (sc) { return sc.children; })) });
        }

        var firstY = opts && opts.absTop ? 0 : res.sections[0].y0;   // absTop: toạ độ tuyệt đối trong ảnh (vùng "còn lại" và ruột fieldset)
        res.sections.forEach(function (sec) {
            var root = { t: "rows", x0: 0, y0: sec.y0, x1: Math.max(0, bbOf(sec.children).x1), y1: sec.y1, children: sec.children };
            var b = box(root, null, 0, firstY, vgap(sec.children));
            made.push(b);
            sec.children.forEach(function (c) { emit(c, b.id, root.x0, root.y0); });
        });
        return made;
    };

    imp.commit = function (src, made, opts) {
        opts = opts || {};
        var idx = builder.controls.findIndex(function (c) { return c.id === src.id; });
        var kept = !opts.keep && !!window.builderReference && builderReference.keep(src);
        if (!opts.keep) {
            if (idx >= 0) builder.controls.splice(idx, 1);
            $('[data-id="' + src.id + '"]').remove();
        }
        

        // instantiate: cấp id mới, dựng cha trước con, một lần refreshJson (→ chạy auto-layout) = một bước Undo
        var res = window.builderSnippet
            ? builderSnippet.instantiate(made, { keepParent: false, left: src.left || 0, top: src.top || 0 })
            : [];
        // Tắt viền field để các lát ảnh nhìn liền như màn gốc (BA bật lại bằng ô "Show field borders")
        var $chk = $("#chkShowBorders");
        if ($chk.length && $chk.prop("checked")) $chk.prop("checked", false).trigger("change");
        if (builder.clearSelection) builder.clearSelection();   // không chọn hàng loạt: nhìn sạch, tránh hàng chục tay nắm
        var boxes = made.filter(function (c) { return c.ftype === "groupbox"; }).length;
        toast("Đã nhận dạng " + (made.length - boxes) + " ô trong " + boxes + " khối" +
            (opts.keep ? "." : (kept ? ". Ảnh gốc được giữ để so: bấm nút Ảnh gốc ở thanh dưới." : " (đã bỏ ảnh gốc, Ctrl+Z để hoàn tác).")), "success");
        return res;
    };


    // ================================================================ LƯỚI (grid) + POPUP
    function pxAt(d, W, x, y) { var i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; }
    function cdf(a, b) { return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])); }
    function mainColor(d, W, H) {
        var cnt = {}, best = null, bn = 0, sx = Math.max(1, W >> 6), sy = Math.max(1, H >> 6);
        for (var y = 0; y < H; y += sy) for (var x = 0; x < W; x += sx) {
            var i = (y * W + x) * 4, k = (d[i] >> 3) + "," + (d[i + 1] >> 3) + "," + (d[i + 2] >> 3);
            var n = (cnt[k] = (cnt[k] || 0) + 1); if (n > bn) { bn = n; best = [d[i], d[i + 1], d[i + 2]]; }
        }
        return best || [255, 255, 255];
    }

    // OCR một vùng ảnh: trả về {text, conf, words:[{t,x0,y0,x1,y1}]} (toạ độ theo ảnh gốc)
    function ocrCrop(cv, x, y, w, h, o) {
        o = o || {};
        x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
        w = Math.max(1, Math.min(cv.width - x, Math.round(w))); h = Math.max(1, Math.min(cv.height - y, Math.round(h)));
        var P = 3, S = o.S || 3, c = document.createElement("canvas");
        c.width = (w + 2 * P) * S; c.height = (h + 2 * P) * S;
        var g = c.getContext("2d"), fill = o.fill || [255, 255, 255];
        g.fillStyle = "rgb(" + fill.join(",") + ")"; g.fillRect(0, 0, c.width, c.height);
        g.imageSmoothingEnabled = true; g.drawImage(cv, x, y, w, h, P * S, P * S, w * S, h * S);
        if (o.invert) { g.globalCompositeOperation = "difference"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "source-over"; }
        return getOcr().then(function (worker) {
            return worker.setParameters({ tessedit_pageseg_mode: o.psm || "7" }).then(function () { return worker.recognize(c, {}, { blocks: true }); }).then(function (r) {
                var ws = r.data.words;
                if (!ws && r.data.blocks) { ws = []; r.data.blocks.forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) { (l.words || []).forEach(function (wd) { ws.push(wd); }); }); }); }); }
                var out = (ws || []).filter(function (wd) { return wd.text && /\S/.test(wd.text); }).map(function (wd) {
                    var b = wd.bbox; return { t: wd.text.trim(), conf: wd.confidence, x0: x + b.x0 / S - P, y0: y + b.y0 / S - P, x1: x + b.x1 / S - P, y1: y + b.y1 / S - P };
                });
                return { text: cleanText(r.data.text), conf: r.data.confidence, words: out };
            });
        }).catch(function () { return { text: "", conf: 0, words: [] }; });
    }
    function seq(list, fn) { var out = []; return list.reduce(function (p, it, i) { return p.then(function () { return fn(it, i).then(function (v) { out.push(v); }); }); }, Promise.resolve()).then(function () { return out; }); }

    // Tìm các bảng: nhiều đường ngang dài cách đều nhau (hàng dữ liệu) → {x0,x1,hy0,hy1,lines:[y],cols:[x],title:[y0,y1]}
    imp.findGrids = function (d, W, H, bg) {
        var lines = [];
        for (var y = 2; y < H - 2; y++) {
            var run = 0, rs = 0, best = 0, bs = 0, gap = 0;
            for (var x = 0; x < W; x++) {
                var i = (y * W + x) * 4, i1 = ((y - 2) * W + x) * 4, i2 = ((y + 2) * W + x) * 4;
                var difBg = Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2]));
                var difNb = Math.min(Math.max(Math.abs(d[i] - d[i1]), Math.abs(d[i + 1] - d[i1 + 1]), Math.abs(d[i + 2] - d[i1 + 2])),
                                     Math.max(Math.abs(d[i] - d[i2]), Math.abs(d[i + 1] - d[i2 + 1]), Math.abs(d[i + 2] - d[i2 + 2])));
                // đường mảnh: khác nền và khác ít nhất một phía 2px (mép của dải màu cũng tính)
                var on = difBg >= 6 && (difNb >= 6 || Math.max(Math.abs(d[i] - d[i1]), Math.abs(d[i + 1] - d[i1 + 1]), Math.abs(d[i + 2] - d[i1 + 2])) >= 6);
                if (on) { if (!run) rs = x; run++; gap = 0; if (run > best) { best = run; bs = rs; } }
                else if (run && ++gap <= 2) { run++; }
                else { run = 0; gap = 0; }
            }
            if (best >= 220) lines.push({ y: y, x0: bs, x1: bs + best - 1 });
        }
        // gộp các dòng liền nhau (dày 1–3px)
        var ml = [];
        lines.forEach(function (l) {
            var p = ml[ml.length - 1];
            if (p && l.y - p.y1 <= 2 && Math.abs(l.x0 - p.x0) < 8) { p.y1 = l.y; p.x1 = Math.max(p.x1, l.x1); }
            else ml.push({ y: l.y, y1: l.y, x0: l.x0, x1: l.x1 });
        });
        // tìm dải header: 2 đường ngang liền kề (cao 18–40px) và có ≥3 đường phân cột dọc
        function headerSeps(l0, l1) {
            var gx0 = Math.max(l0.x0, l1.x0), gx1 = Math.min(l0.x1, l1.x1);
            if (gx1 - gx0 < 300) return null;
            var by0 = l0.y1 + 3, by1 = l1.y - 3, hh = by1 - by0 + 1;
            if (hh < 8) return null;
            var cc = {}, hc = null, bn = 0;
            for (var x = gx0 + 2; x < gx1 - 1; x += 3) { var pc = pxAt(d, W, x, by0); var k = pc.join(","); cc[k] = (cc[k] || 0) + 1; if (cc[k] > bn) { bn = cc[k]; hc = pc; } }
            if (!hc) return null;
            var seps = [], prev = -10;
            for (var xx = gx0 + 1; xx < gx1; xx++) {
                var hit = 0; for (var yy = by0; yy <= by1; yy++) if (cdf(pxAt(d, W, xx, yy), hc) >= 6) hit++;
                if (hit >= 0.8 * hh) { if (xx - prev > 3) seps.push(xx); prev = xx; }
            }
            var e = seps.filter(function (x) { return x > gx0 + 8 && x < gx1 - 8; });
            return e.length >= 3 ? { x0: gx0, x1: gx1, seps: e, fill: hc, plain: cdf(hc, bg) < 5 } : null;
        }
        function tableLike(hs, bottomIndex) {
            var top = ml[bottomIndex], bottom = ml[bottomIndex + 1];
            if (!bottom) return false;
            var ry0 = top.y1 + 3, ry1 = bottom.y - 3, rh = ry1 - ry0 + 1;
            if (rh < 8 || rh > 50) return false;
            var cc = {}, fill = null, bn = 0;
            for (var x = hs.x0 + 2; x < hs.x1 - 1; x += 3) { var pc = pxAt(d, W, x, ry0); var k = pc.join(","); cc[k] = (cc[k] || 0) + 1; if (cc[k] > bn) { bn = cc[k]; fill = pc; } }
            if (!fill) return false;
            var same = 0;
            hs.seps.forEach(function (sx) {
                for (var dx = -2; dx <= 2; dx++) {
                    var hit = 0;
                    for (var yy = ry0; yy <= ry1; yy++) if (cdf(pxAt(d, W, sx + dx, yy), fill) >= 6) hit++;
                    if (hit >= 0.8 * rh) { same++; return; }
                }
            });
            return same >= Math.max(3, Math.ceil(0.6 * hs.seps.length));
        }
        function bandHeader(index) {
            if (index + 1 >= ml.length) return null;
            var gap = ml[index + 1].y - ml[index].y1;
            return (gap >= 18 && gap <= 60) ? headerSeps(ml[index], ml[index + 1]) : null;
        }
        function titleBandAbove(hs, index) {
            var top = ml[index].y;
            return [top - 7, top - 13].every(function (y) {
                if (y < 2) return false;
                var cc = {}, fill = null, bn = 0, total = 0;
                for (var x = hs.x0 + 4; x < hs.x1 - 3; x += 4) { var pc = pxAt(d, W, x, y); var k = pc.join(","); cc[k] = (cc[k] || 0) + 1; total++; if (cc[k] > bn) { bn = cc[k]; fill = pc; } }
                return !!fill && cdf(fill, bg) >= 5 && bn >= 0.6 * total;
            });
        }
        var out = [], hi = 0;
        while (hi + 1 < ml.length) {
            var hs = bandHeader(hi), titled = !!hs && titleBandAbove(hs, hi);
            if (hs && !tableLike(hs, hi + 1)) {
                var below = bandHeader(hi + 1);
                if ((hs.plain && !titled) || (below && tableLike(below, hi + 2))) hs = null;
            }
            if (!hs) { hi++; continue; }
            var l0 = ml[hi], l1 = ml[hi + 1], last = l1.y1, n = 0, fy1 = l1.y1, j = hi + 2;
            for (; j < ml.length; j++) {
                if (ml[j].y - last > 50) break;
                last = ml[j].y1; n++; if (n === 1) fy1 = ml[j].y;
            }
            if (n >= 2 || (titled && n >= 1)) out.push({ x0: hs.x0, x1: hs.x1, hy0: l0.y, hy1: l1.y, fy1: fy1, lastY: last, edges: [hs.x0].concat(hs.seps).concat([hs.x1]), lineCount: n, idx: out.length });
            hi = Math.max(j, hi + 1);
        }
        function rowFill(x0, x1, y) {
            var cc = {}, fill = null, bn = 0;
            for (var x = x0 + 4; x < x1 - 3; x += 4) { var pc = pxAt(d, W, x, y); var k = pc.join(","); cc[k] = (cc[k] || 0) + 1; if (cc[k] > bn) { bn = cc[k]; fill = pc; } }
            return fill;
        }
        function inGrid(y) { return out.some(function (g) { return y >= g.hy0 - 4 && y <= g.lastY + 4; }); }
        function captionBand(x0, x1, y0, y1, fill) {
            var groups = 0, gap = 99, ink = 0, sum = [0, 0, 0];
            for (var x = x0 + 3; x < x1 - 2; x++) {
                var hit = false;
                for (var y = y0 + 2; y <= y1 - 2; y++) {
                    var p = pxAt(d, W, x, y);
                    if (cdf(p, fill) < 60) continue;
                    hit = true; ink++;
                    sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2];
                }
                if (hit) { if (gap >= 20) groups++; gap = 0; } else gap++;
            }
            return { groups: groups, neutral: Math.max(sum[0], sum[1], sum[2]) - Math.min(sum[0], sum[1], sum[2]) < 45 * ink };
        }
        function nextOver(from, a) {
            for (var k = from; k < ml.length; k++) {
                if (ml[k].x1 >= a.x0 && ml[k].x0 <= a.x1) return k;
            }
            return -1;
        }
        var pi = 0;
        while (pi + 1 < ml.length) {
            var pa = ml[pi], pj = nextOver(pi + 1, pa), pb = pj >= 0 ? ml[pj] : null;
            if (!pb) { pi++; continue; }
            var pgap = pb.y - pa.y1, px0 = Math.max(pa.x0, pb.x0), px1 = Math.min(pa.x1, pb.x1);
            if (inGrid(pa.y) || pgap < 22 || pgap > 64 || px1 - px0 < 300 || Math.abs(pa.x0 - pb.x0) > 12 || Math.abs(pa.x1 - pb.x1) > 12) { pi++; continue; }
            var rowYs = [], lastP = pb.y1, pq = pj + 1;
            for (; pq < ml.length; pq++) {
                var pc2 = ml[pq];
                if (pc2.x1 < px0 || pc2.x0 > px1) continue;
                if (pc2.y - lastP > 64 || pc2.y - lastP < 18 || Math.abs(pc2.x0 - px0) > 12 || Math.abs(pc2.x1 - px1) > 12) break;
                lastP = pc2.y1; rowYs.push(pc2.y);
            }
            var rowsN = rowYs.length;
            var headFill = rowFill(px0, px1, pa.y1 + 4), bodyFill = rowFill(px0, px1, pb.y1 + 4);
            var tinted = !!headFill && !!bodyFill && cdf(headFill, bodyFill) >= 3;
            if (rowsN >= 3) {
                var secondFill = rowFill(px0, px1, rowYs[0] + 4), thirdFill = rowFill(px0, px1, rowYs[1] + 4);
                if (bodyFill && secondFill && thirdFill && cdf(bodyFill, secondFill) >= 3 && cdf(secondFill, thirdFill) < 3) { pi = pj; continue; }
            }
            if (out.some(function (g) { return !g.plain && lastP >= g.hy0 - 4 && pa.y <= g.lastY + 4; })) { pi++; continue; }
            var caps = headFill ? captionBand(px0, px1, pa.y1 + 1, pb.y - 1, headFill) : { groups: 0, neutral: false };
            var headOnly = !rowsN && imp.mode === "ess" && tinted && cdf(headFill, bg) >= 3 && caps.groups >= 3 && caps.neutral;
            var table = imp.mode === "core" ? rowsN >= 3 && caps.groups >= 3 && caps.neutral : rowsN >= 1 && (tinted || rowsN >= 4) && (rowsN >= 3 || (caps.groups >= 2 && caps.neutral));
            if (table || headOnly) {
                out.push({ x0: px0, x1: px1, hy0: pa.y, hy1: pb.y, fy1: rowsN ? rowYs[0] : pb.y1, lastY: lastP, edges: [px0, px1], lineCount: rowsN, idx: out.length, plain: true });
                pi = pq;
            } else pi++;
        }
        out.sort(function (m, n2) { return m.hy0 - n2.hy0; });
        out.forEach(function (g, gi) { g.idx = gi; });
        return out;
    };

    function plainColumns(cv, d, gr, hFill) {
        return ocrCrop(cv, gr.x0 + 2, gr.hy0 + 2, gr.x1 - gr.x0 - 3, gr.hy1 - gr.hy0 - 3, { fill: hFill, psm: "6" }).then(function (hr) {
            var groups = [];
            hr.words.filter(function (w) { return /[A-Za-z0-9]/.test(w.t) && w.conf >= 30; }).sort(function (a, b) { return a.x0 - b.x0; }).forEach(function (w) {
                var last = groups[groups.length - 1];
                if (last && w.x0 - last.x1 <= 16) { last.x1 = Math.max(last.x1, w.x1); last.words.push(w); }
                else groups.push({ x0: w.x0, x1: w.x1, words: [w] });
            });
            groups.forEach(function (g) {
                g.words.sort(function (a, b) { return Math.round(a.y0 / 10) - Math.round(b.y0 / 10) || a.x0 - b.x0; });
                var parts = g.words.map(function (w) { return w.t.replace(/^[^A-Za-z0-9(]+|[^A-Za-z0-9)%.]+$/g, ""); }).filter(Boolean);
                while (parts.length > 1 && /^[A-Za-z0-9@]$/.test(parts[parts.length - 1])) parts.pop();
                g.text = parts.join(" ");
            });
            groups = groups.filter(function (g) { return g.text.length >= 2; });
            if (groups.length < 2) return null;
            var cells = [], start = gr.x0;
            if (groups[0].x0 - gr.x0 > 60) {
                var lead = { x0: gr.x0 + 2, x1: Math.round(groups[0].x0) - 14, text: "", lead: "check" };
                lead.w = lead.x1 - lead.x0;
                var sat = 0, ink = 0, body = pxAt(d, cv.width, Math.min(cv.width - 1, gr.x0 + 3), Math.min(cv.height - 1, gr.hy1 + 4));
                for (var y = gr.hy1 + 3; y < Math.min(cv.height, gr.fy1 - 2); y++) {
                    for (var x = lead.x0; x < lead.x1; x++) {
                        var p = pxAt(d, cv.width, x, y);
                        if (cdf(p, body) < 30) continue;
                        ink++;
                        if (Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) >= 60) sat++;
                    }
                }
                if (!ink) {
                    var head = 0;
                    for (var hy = gr.hy0 + 3; hy < gr.hy1 - 2; hy++) for (var hx = lead.x0; hx < lead.x1; hx++) if (cdf(pxAt(d, cv.width, hx, hy), hFill) >= 40) head++;
                    lead.lead = head >= 12 ? "check" : "none";
                } else if (sat >= 0.4 * ink) lead.lead = "view";
                cells.push(lead);
                start = lead.x1 + 1;
            }
            groups.forEach(function (g, i) {
                var end = i + 1 < groups.length ? Math.round((g.x1 + groups[i + 1].x0) / 2) : gr.x1;
                cells.push({ x0: start, x1: end, w: end - start, text: g.text });
                start = end;
            });
            return cells;
        });
    }

    // OCR các ô header → cấu hình grid
    imp.gridConfig = function (cv, gr, top, bottom, bg, filterRow) {
        var d = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
        var hFill = pxAt(d, cv.width, Math.min(cv.width - 1, gr.x0 + 3), gr.hy0 + 4);
        var cells = [];
        for (var i = 0; i + 1 < gr.edges.length; i++) cells.push({ x0: gr.edges[i] + 2, x1: gr.edges[i + 1] - 1, w: gr.edges[i + 1] - gr.edges[i] });
        var ready = gr.plain ? plainColumns(cv, d, gr, hFill) : Promise.resolve(null);
        return ready.then(function (plain) {
            if (plain) cells = plain;
            return seq(cells, function (c) {
                if (c.text != null) return Promise.resolve(c.text);
                if (c.w < 12) return Promise.resolve("");
                return ocrCrop(cv, c.x0 + 1, gr.hy0 + 3, c.x1 - c.x0 - 2, gr.hy1 - gr.hy0 - 5, { fill: hFill }).then(function (r) { return (r.conf >= 50 && /[A-Za-z0-9]/.test(r.text)) ? r.text : ""; });
            });
        }).then(function (caps) {
            // dải tiêu đề phía trên header: tên lưới + Add/Delete + Local Data Language
            var ty0 = Math.max(top, gr.hy0 - 28), bandFill = pxAt(d, cv.width, Math.min(cv.width - 1, gr.x1 - 12), Math.max(0, gr.hy0 - 8));
            var titleRead = gr.hy0 - ty0 - 2 >= 8 ? ocrCrop(cv, gr.x0, ty0, cv.width - gr.x0, gr.hy0 - ty0 - 2, { fill: bandFill }) : Promise.resolve({ text: "", conf: 0, words: [] });
            return titleRead.then(function (tr) {
                var title = [], toolbar = [], lang = false, hitTool = false, lim = gr.x0 + (gr.x1 - gr.x0) * 0.6, addEnd = null, addStart = null;
                tr.words.forEach(function (w) {
                    if (/language/i.test(w.t)) lang = true;
                    if (w.x0 > lim) return;
                    if (/^\+?add$/i.test(w.t)) { if (addStart == null) addStart = w.x0; toolbar.push({ text: "Add", icon: "/Content/images/icon-menu/menu-add.png" }); hitTool = true; addEnd = w.x1; }
                    else if (/^\S?delete$/i.test(w.t)) { if (!toolbar.some(function (t) { return t.text === "Delete"; })) toolbar.push({ text: "Delete", icon: "/Content/images/icon-menu/menu-delete.png" }); hitTool = true; }
                    else if (!hitTool && /[A-Za-z]{2}/.test(w.t) && w.conf >= 40) title.push(w.t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9)]+$/g, ""));
                });
                // nút Delete mờ (chữ xám nhạt, OCR không đọc được): có dấu X đỏ nhạt ngay sau Add → thêm Delete
                if (addEnd != null && !toolbar.some(function (t) { return t.text === "Delete"; })) {
                    var red = false;
                    for (var yy = ty0; yy < gr.hy0 - 2 && !red; yy++) for (var xx = Math.round(addEnd) + 2; xx < addEnd + 90 && xx < cv.width; xx++) { var q = pxAt(d, cv.width, xx, yy); if (q[0] > 190 && q[0] - q[1] >= 25 && q[0] - q[2] >= 25) { red = true; break; } }
                    if (red) toolbar.push({ text: "Delete", icon: "/Content/images/icon-menu/menu-delete.png" });
                }
                var tp = Promise.resolve();
                if (addStart != null && addStart - gr.x0 > 30) {   // đọc lại riêng phần tên lưới (đứng trước nút Add) cho đủ chữ
                    var iy0 = 1e9, iy1 = -1;   // khung chữ chặt theo mực (OCR chữ nhỏ trong dải cao đọc sai/dính chữ)
                    for (var yy2 = ty0; yy2 < gr.hy0 - 2; yy2++) for (var xx2 = gr.x0 + 1; xx2 < addStart - 10; xx2++) if (cdf(pxAt(d, cv.width, xx2, yy2), bandFill) >= 70) { if (yy2 < iy0) iy0 = yy2; if (yy2 > iy1) iy1 = yy2; break; }
                    if (iy1 < 0) { iy0 = ty0; iy1 = gr.hy0 - 3; }
                    // tách từ theo khoảng trống dọc giữa các chữ (OCR cả dòng hay dính chữ "ListofBanks"), đọc từng từ rồi ghép lại có khoảng trắng
                    var segs = [], cur2 = null, gapN = 0, xEnd = Math.round(addStart) - 8;
                    for (var xx3 = gr.x0 + 1; xx3 <= xEnd; xx3++) {
                        var ink = false; for (var yy3 = iy0; yy3 <= iy1; yy3++) if (cdf(pxAt(d, cv.width, xx3, yy3), bandFill) >= 60) { ink = true; break; }
                        if (ink) { if (!cur2) cur2 = { x0: xx3, x1: xx3 }; else cur2.x1 = xx3; gapN = 0; }
                        else if (cur2 && ++gapN >= 3) { segs.push(cur2); cur2 = null; }
                    }
                    if (cur2) segs.push(cur2);
                    tp = seq(segs, function (sg) {
                        return ocrCrop(cv, sg.x0 - 1, iy0 - 2, sg.x1 - sg.x0 + 3, iy1 - iy0 + 5, { fill: bandFill, S: 4, psm: "8" }).then(function (r2) { return r2.text.replace(/[^A-Za-z0-9()\/&-]/g, ""); });
                    }).then(function (ws) {
                        var t2 = ws.filter(function (w) { return /[A-Za-z]/.test(w); }).join(" ").trim();
                        if (t2.length >= 3) title = [t2];
                    });
                }
                return tp.then(function () {
                    if (bottom - gr.lastY < 14) return null;   // thanh phân trang ngay dưới hàng cuối: đọc chữ "Page 1 of …"
                    if (gr.plain) return ocrCrop(cv, Math.max(gr.x0, gr.x1 - 320), gr.lastY + 3, Math.min(320, gr.x1 - gr.x0), bottom - gr.lastY - 4, { fill: bg }).then(function (pr) { return /previous|next|showing|page\s*\d|\d\s*(of|\/)\s*\d/i.test(pr.text); });
                    return ocrCrop(cv, gr.x0, gr.lastY + 3, Math.min(320, gr.x1 - gr.x0), bottom - gr.lastY - 4, { fill: bg }).then(function (pr) { return /page|\bof\b|items/i.test(pr.text); });
                }).then(function (hasPager) {
                var cfg = {
                    type: "grid", filterRow: !!filterRow, allowAdd: true, allowEdit: true, allowGrouping: !gr.plain, _plain: !!gr.plain, _rows: gr.lineCount,
                    showCheckbox: false, showViewColumn: false, showEditColumn: false, showDeleteColumn: false, showSearchBox: false,
                    showTitle: true, titleText: title.join(" ") || "Gridview", titleBold: false, titleItalic: false,
                    showToolbar: toolbar.length > 0, toolbarItems: toolbar, showLocalDataLanguage: lang,
                    showDataHeader: false, dataHeaderCaption: "View Data", dataHeaderValue: "Company Data",
                    columns: [], rowActionColumns: [], rowPermissions: {},
                    showPager: !!hasPager, left: gr.x0, top: ty0, width: gr.x1 - gr.x0 + 1
                };
                var acts = { view: { key: "view", text: "View", icon: "/Content/images/grid-view.png", visible: false, width: 40 },
                             edit: { key: "edit", text: "Edit", icon: "/Content/images/grid-edit.png", visible: false, width: 40 },
                             delete: { key: "delete", text: "Delete", icon: "/Content/images/grid-delete.png", visible: false, width: 40 } };
                var leading = true, n = 0;
                function squareOnly(c) {
                    var x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
                    for (var yy = gr.hy0 + 3; yy < gr.hy1 - 2; yy++) for (var xx = c.x0 + 2; xx < c.x1 - 2; xx++) {
                        if (cdf(pxAt(d, cv.width, xx, yy), hFill) < 40) continue;
                        if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
                    }
                    var w = x1 - x0 + 1, h = y1 - y0 + 1;
                    return x1 >= 0 && w >= 9 && w <= 20 && h >= 9 && h <= 20 && Math.abs(w - h) <= 3;
                }
                cells.forEach(function (c, i) {
                    if (c.lead === "view") { acts.view.visible = true; acts.view.width = Math.max(30, Math.min(60, c.w)); return; }
                    if (c.lead === "check") { cfg.showCheckbox = true; return; }
                    if (c.lead === "none") return;
                    var cap = caps[i], lead = leading && c.w <= 70, lw = (cap || "").toLowerCase().replace(/[^a-z]/g, "");
                    // OCR ô header hẹp hay đọc thiếu chữ ("E", "Edi", "Dele") hoặc đọc rác ("O") ở ô chứa ô chọn hàng → nhận theo tiền tố
                    var isView = lw.length >= 2 && "view".indexOf(lw) === 0, isEdit = lw.length >= 1 && ("edit".indexOf(lw) === 0 || lw === "edt" || lw === "eit"), isDel = lw.length >= 1 && ("delete".indexOf(lw) === 0 || /^del/.test(lw));
                    if (lead && i === 0 && c.w <= 50 && !isView && !isEdit && !isDel && lw.length <= 2) { cfg.showCheckbox = true; return; }   // ô đầu hẹp, không chữ/rác: cột chọn hàng (ô vuông)
                    if (leading && i === 0 && c.w <= 130 && lw.length <= 2 && squareOnly(c)) { cfg.showCheckbox = true; return; }
                    if (lead && isView) { acts.view.visible = true; acts.view.width = c.w; return; }
                    if (lead && isEdit) { acts.edit.visible = true; acts.edit.width = c.w; cfg.showEditColumn = true; return; }
                    if (lead && isDel) { acts["delete"].visible = true; acts["delete"].width = c.w; cfg.showDeleteColumn = true; return; }
                    if (lead && !cap && i === 0) { cfg.showCheckbox = true; return; }
                    if (lead && !cap) {   // cột icon không có chữ ở header: lần lượt là Edit rồi Delete
                        if (!acts.edit.visible) { acts.edit.visible = true; acts.edit.width = c.w; cfg.showEditColumn = true; }
                        else if (!acts["delete"].visible) { acts["delete"].visible = true; acts["delete"].width = c.w; cfg.showDeleteColumn = true; }
                        return;
                    }
                    leading = false; n++;
                    cfg.columns.push({ name: (cap.replace(/[^A-Za-z0-9]+/g, "") || ("Col" + n)), caption: cap, width: c.w });
                });
                // tổng cột phải vừa bề ngang lưới (ô chọn ~66px + các cột icon), nếu không lưới sẽ có thanh cuộn ngang và cắt cột cuối
                var fixedW = (cfg.showCheckbox ? 66 : 0) + (acts.view.visible ? acts.view.width : 0) + (acts.edit.visible ? acts.edit.width : 0) + (acts["delete"].visible ? acts["delete"].width : 0);
                var dsum = cfg.columns.reduce(function (a, c) { return a + c.width; }, 0), room = cfg.width - fixedW - 24;
                if (dsum > room && room > 100) cfg.columns.forEach(function (c) { c.width = Math.floor(c.width * room / dsum); });
                cfg.rowActionColumns = [acts.view, acts.edit, acts["delete"]];
                cfg.showViewColumn = acts.view.visible;
                var shownRows = Math.max(1, gr.lineCount - (filterRow ? 1 : 0));
                if (shownRows < 5) {
                    cfg.sampleData = [];
                    for (var ri = 1; ri <= shownRows; ri++) {
                        var row = {};
                        cfg.columns.forEach(function (c) { row[c.name] = c.name + " " + ri; });
                        cfg.sampleData.push(row);
                    }
                }
                // đủ cột để lưới rộng đúng như ảnh: cột cuối co giãn nên không cần bù
                return cfg;
                });
            });
        });
    };


    // Canh đều: các field (nhãn + ô) có mép trái / vị trí ô nhập / mép phải chỉ lệch vài px do đo pixel → gom về cùng một mốc
    imp.alignFields = function (made) {
        var by = {}; made.forEach(function (m) { by[m.id] = m; });
        function absLeft(m) { var x = m.left || 0, p = by[m.parentId]; while (p) { x += p.left || 0; p = by[p.parentId]; } return x; }
        var F = made.filter(function (m) { return m.type === "field" && (m.ftype === "text" || m.ftype === "combo" || m.ftype === "date" || m.ftype === "number" || m.ftype === "memo") && m.labelWidth > 0; });
        if (F.length < 2) return made;
        function snap(get, set) {
            var arr = F.map(function (m) { return { m: m, v: get(m) }; }).sort(function (a, b) { return a.v - b.v; });
            var i = 0;
            while (i < arr.length) {
                var j = i; while (j + 1 < arr.length && arr[j + 1].v - arr[j].v <= 6) j++;
                if (j > i) {
                    var vals = arr.slice(i, j + 1).map(function (a) { return a.v; }), cnt = {}, best = vals[0], bn = 0;
                    vals.forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] > bn) { bn = cnt[v]; best = v; } });
                    if (bn < 2) best = vals[vals.length >> 1];
                    for (var k = i; k <= j; k++) set(arr[k].m, best - arr[k].v);
                }
                i = j + 1;
            }
        }
        // 1) mép trái nhãn (giữ nguyên vị trí ô nhập: bù lại labelWidth)
        snap(function (m) { return absLeft(m); }, function (m, d) { m.left += d; m.labelWidth -= d; m.width -= d; });
        // 2) vị trí ô nhập
        snap(function (m) { return absLeft(m) + m.labelWidth; }, function (m, d) { m.labelWidth += d; });
        // 3) mép phải
        snap(function (m) { return absLeft(m) + m.width; }, function (m, d) { m.width += d; });
        // 4) chữ nhãn trên trình duyệt rộng hơn trong ảnh (~25%): nhãn dài đẩy ô nhập lệch → nới labelWidth của cả cột cho vừa nhãn dài nhất
        var srt = F.slice().sort(function (a, b) { return (absLeft(a) + a.labelWidth) - (absLeft(b) + b.labelWidth); }), gi = 0;
        while (gi < srt.length) {
            var gj = gi; while (gj + 1 < srt.length && (absLeft(srt[gj + 1]) + srt[gj + 1].labelWidth) - (absLeft(srt[gj]) + srt[gj].labelWidth) <= 10) gj++;
            var grp = srt.slice(gi, gj + 1), target = 0;
            grp.forEach(function (m) { target = Math.max(target, absLeft(m) + m.labelWidth, absLeft(m) + Math.ceil((m._ltw || 0) * 1.25) + 8); });
            grp.forEach(function (m) { var nw = target - absLeft(m); if (nw !== m.labelWidth && m.width - (nw - m.labelWidth) >= 40) m.labelWidth = nw; });
            gi = gj + 1;
        }
        // 5) hàng "trần" (groupbox bare): dồn lệch trái của con đầu tiên vào groupbox để mọi hàng bắt đầu ở 0 (auto-layout không giữ lề âm)
        for (var pass = 0; pass < 3; pass++) {
            made.filter(function (g) { return g.type === "field" && g.ftype === "groupbox" && g.bare; }).forEach(function (g) {
                var kids = made.filter(function (c) { return c.parentId === g.id; });
                if (!kids.length) return;
                var mn = Math.min.apply(null, kids.map(function (c) { return c.left; }));
                if (mn !== 0) { g.left += mn; g.width -= mn; kids.forEach(function (c) { c.left -= mn; }); }
            });
        }
        // 6) chiều cao ô nhập gần nhau (±4px) → cùng một chiều cao (phổ biến nhất); 7) trong cùng một hàng, đỉnh các ô lệch ≤5px → cùng đỉnh
        (function () {
            var hs = F.filter(function (m) { return m.ftype !== "memo"; }).sort(function (a, b) { return a.height - b.height; }), i = 0;
            while (i < hs.length) {
                var j = i; while (j + 1 < hs.length && hs[j + 1].height - hs[j].height <= 4) j++;
                var cnt = {}, best = hs[i].height, bn = 0;
                for (var k = i; k <= j; k++) { var v = hs[k].height; cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] > bn) { bn = cnt[v]; best = v; } }
                for (var k2 = i; k2 <= j; k2++) hs[k2].height = best;
                i = j + 1;
            }
            var byP = {}; F.forEach(function (m) { (byP[m.parentId || ""] = byP[m.parentId || ""] || []).push(m); });
            Object.keys(byP).forEach(function (pk) {
                var arr = byP[pk].slice().sort(function (a, b) { return a.top - b.top; }), i2 = 0;
                while (i2 < arr.length) {
                    var j2 = i2; while (j2 + 1 < arr.length && arr[j2 + 1].top - arr[j2].top <= 5) j2++;
                    var mn = arr[i2].top; for (var q = i2; q <= j2; q++) arr[q].top = mn;
                    i2 = j2 + 1;
                }
            });
        })();
        made.forEach(function (m) { delete m._ltw; });
        if (imp.mode === "ess") {   // control ESS: khung ngoài có viền 1px + padding 4/6px + khe 6px giữa nhãn và ô → dịch hình học cho ô nhập rơi đúng chỗ trong ảnh
            made.forEach(function (m) {
                if (m.type !== "field" || m.uiMode !== "ess" || ["text", "combo", "date", "memo"].indexOf(m.ftype) < 0) return;
                var hasCap = m.labelWidth > 0;
                m.left -= 7; m.top -= 4; m.height += 8;
                m.width += hasCap ? 15 : 14;
                if (hasCap) m.labelWidth = Math.max(30, m.labelWidth - 6);
            });
        }
        return made;
    };


    // ================================================================ SECTION PANEL
    // Dải tiêu đề xám ngang gần hết bề rộng + khung viền quanh nội dung = Section panel của Builder
    imp.findSections = function (d, W, H, bg, fss) {
        fss = fss || [];
        function lumc(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
        var rows = [];
        for (var y = 0; y < H; y++) {
            var cnt = {}, best = null, bn = 0, tot = 0;
            for (var x = Math.round(W * 0.04); x < W * 0.96; x += 3) {
                var c = pxAt(d, W, x, y), k = (c[0] >> 2) + "," + (c[1] >> 2) + "," + (c[2] >> 2); tot++;
                var n = (cnt[k] = (cnt[k] || 0) + 1); if (n > bn) { bn = n; best = c; }
            }
            rows.push(bn >= 0.7 * tot && cdf(best, bg) >= 6 && lumc(best) > 190 && lumc(best) < 246 ? best : null);
        }
        var bands = [], y0 = -1;
        for (var yy = 0; yy <= H; yy++) {
            var cur = yy < H ? rows[yy] : null;
            if (cur && y0 >= 0 && cdf(cur, rows[y0]) <= 4) continue;
            if (y0 >= 0) { var h = yy - y0; if (h >= 18 && h <= 44) bands.push({ y0: y0, y1: yy - 1, color: rows[y0] }); }
            y0 = cur ? yy : -1;
        }
        if (!bands.length) return [];
        bands.forEach(function (b) {
            var my = Math.min(H - 1, b.y0 + 2), xa = W >> 1, xb = W >> 1;
            while (xa > 0 && cdf(pxAt(d, W, xa - 1, my), b.color) <= 6) xa--;
            while (xb < W - 1 && cdf(pxAt(d, W, xb + 1, my), b.color) <= 6) xb++;
            b.xa = xa; b.xb = xb;
        });
        // giữ các dải cùng bề rộng (±6px)
        var w0 = bands[0].xb - bands[0].xa;
        bands = bands.filter(function (b) { return Math.abs((b.xb - b.xa) - w0) <= 8 && Math.abs(b.xa - bands[0].xa) <= 6; });
        // cạnh trên/dưới của fieldset nằm LỌT trong Section (thụt vào so với khung Section) không phải đáy Section
        function inFs(q, b) { return fss.some(function (f) { return f.x0 >= b.xa + 8 && (Math.abs(f.y0 - q) <= 2 || Math.abs(f.y1 - q) <= 2); }); }
        function longLine(y, xa, xb) {
            var run = 0, best = 0;
            for (var x = xa; x <= xb; x++) { var c = pxAt(d, W, x, y); if (cdf(c, bg) >= 6 && lumc(c) < 240) { run++; if (run > best) best = run; } else run = 0; }
            return best >= 0.85 * (xb - xa);
        }
        var xas = bands.map(function (b) { return b.xa; }).sort(function (a, b) { return a - b; }), xbs = bands.map(function (b) { return b.xb; }).sort(function (a, b) { return a - b; });
        var mxa = xas[xas.length >> 1], mxb = xbs[xbs.length >> 1];
        bands.forEach(function (b) { b.xa = mxa; b.xb = mxb; });   // mọi Section cùng bề rộng
        return bands.map(function (b, i) {
            var nx = bands[i + 1], top = Math.max(0, b.y0 - 1), bottom = -1;
            if (nx) {
                for (var q = nx.y0 - 1; q > b.y1 + 8; q--) if (longLine(q, b.xa, b.xb) && !inFs(q, b)) { bottom = q; break; }
                if (bottom < 0) bottom = nx.y0 - 3;
            } else {
                for (var q2 = b.y1 + 8; q2 < H; q2++) if (longLine(q2, b.xa, b.xb) && !inFs(q2, b)) { bottom = q2; break; }
                if (bottom < 0) bottom = H - 1;
            }
            return { hy0: b.y0, hy1: b.y1, color: b.color, x0: Math.max(0, b.xa - 1), x1: Math.min(W - 1, b.xb + 1), top: top, bottom: bottom };
        }).filter(Boolean);
    };

    // Fieldset: khung viền mảnh (1px xám, góc bo) có chữ tiêu đề (legend) đè lên cạnh trên → Group box của Builder
    imp.findFieldsets = function (d, W, H, bg) {
        function on(x, y) { var c = pxAt(d, W, x, y), k = cdf(c, bg); return k >= 18 && k <= 150; }
        function thin(x, y) { return cdf(pxAt(d, W, x, Math.max(0, y - 2)), bg) < 8 || cdf(pxAt(d, W, x, Math.min(H - 1, y + 2)), bg) < 8; }
        var runs = [], y, x;
        for (y = 3; y < H - 3; y++) {
            x = 0;
            while (x < W) {
                if (!(on(x, y) && thin(x, y))) { x++; continue; }
                var xa = x, gap = 0, xb = x;
                while (x < W && gap <= 1) { if (on(x, y) && thin(x, y)) { xb = x; gap = 0; } else gap++; x++; }
                if (xb - xa + 1 >= 60) runs.push({ y: y, xa: xa, xb: xb });
            }
        }
        function upFrom(xc, y0) {   // đi lên theo cột xc, trả về y cao nhất còn nét (cho phép hở 1px)
            var yy = y0, last = y0, gp = 0;
            for (; yy > 1; yy--) { var hit = false; for (var k = -1; k <= 1; k++) if (on(Math.max(0, Math.min(W - 1, xc + k)), yy)) { hit = true; break; } if (hit) { last = yy; gp = 0; } else if (++gp > 1) break; }
            return last;
        }
        var out = [];
        runs.filter(function (r) { return r.xb - r.xa + 1 >= 100; }).forEach(function (r) {
            var best = null;
            for (var dl = -4; dl <= 1; dl++) for (var dr = -1; dr <= 4; dr++) {
                var xl = r.xa + dl, xr = r.xb + dr, tl = upFrom(xl, r.y - 3), tr = upFrom(xr, r.y - 3);
                if (Math.abs(tl - tr) <= 2 && r.y - Math.min(tl, tr) >= 30 && (!best || (r.y - Math.min(tl, tr)) > best.h)) best = { xl: xl, xr: xr, yt: Math.min(tl, tr), h: r.y - Math.min(tl, tr) };
            }
            if (!best) return;
            var yt = best.yt;
            // cạnh trên: phải có đường ngang nối gần hết bề ngang (chừa chỗ cho legend)
            var cover = 0;
            for (var xx = best.xl + 4; xx <= best.xr - 4; xx++) { var hit = false; for (var q = -1; q <= 1; q++) if (on(xx, yt + q)) { hit = true; break; } if (hit) cover++; }
            if (cover < 0.6 * (best.xr - best.xl - 8)) return;
            if (best.xr - best.xl + 1 < 120 || r.y - yt < 50) return;
            // ruột phải có nội dung (ô nhiều dòng / hộp trống không phải fieldset)
            var ink = 0;
            for (var iy = yt + 4; iy < r.y - 3 && ink < 40; iy += 2) for (var ix = best.xl + 4; ix < best.xr - 3 && ink < 40; ix += 3) if (cdf(pxAt(d, W, ix, iy), bg) >= 40) ink++;
            if (ink < 12) return;
            out.push({ x0: best.xl, x1: best.xr, y0: yt, y1: r.y });
        });
        // bỏ trùng
        var res2 = [];
        out.sort(function (a, b) { return (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0); });
        out.forEach(function (o) { if (!res2.some(function (q) { return Math.abs(q.x0 - o.x0) <= 3 && Math.abs(q.x1 - o.x1) <= 3 && Math.abs(q.y0 - o.y0) <= 3 && Math.abs(q.y1 - o.y1) <= 3; })) res2.push(o); });
        // legend: khoảng hở trên cạnh trên
        res2.forEach(function (f) {
            var xx = f.x0 + 4, gs = -1, ge = -1, run = 0, runStart = -1;
            while (xx < f.x1 - 4) {
                var hit2 = false; for (var q2 = -1; q2 <= 1; q2++) if (on(xx, f.y0 + q2) && thin(xx, f.y0 + q2)) { hit2 = true; break; }
                if (hit2) { if (run === 0) runStart = xx; run++; if (gs >= 0 && run >= 10) { ge = runStart - 1; break; } }
                else { if (gs < 0 && run >= 3) gs = xx; run = 0; }
                xx++;
            }
            if (gs >= 0 && ge - gs >= 12 && ge - gs <= 420) { f.lx0 = gs - 2; f.lx1 = ge + 12; }
        });
        res2 = res2.filter(function (f) { return f.lx0 != null || f.y1 - f.y0 > 80; });   // khung thấp không có legend là thẻ số liệu / ô nội dung, không phải fieldset
        res2.sort(function (a, b) { return a.y0 - b.y0 || a.x0 - b.x0; });
        return res2;
    };

    imp.runFieldsets = function (cv, fss, scale, progress, src) {
        var W = cv.width, H = cv.height, ctx = cv.getContext("2d", { willReadFrequently: true });
        var bg = mainColor(ctx.getImageData(0, 0, W, H).data, W, H);
        // chỉ giữ fieldset ngoài cùng (fieldset lồng bên trong sẽ được nhận dạng đệ quy trong ruột)
        var outer = fss.filter(function (f) { return !fss.some(function (o) { return o !== f && f.x0 >= o.x0 && f.x1 <= o.x1 && f.y0 >= o.y0 && f.y1 <= o.y1 && (o.x1 - o.x0) * (o.y1 - o.y0) > (f.x1 - f.x0) * (f.y1 - f.y0); }); });
        var work = document.createElement("canvas"); work.width = W; work.height = H;
        var wg = work.getContext("2d", { willReadFrequently: true }); wg.drawImage(cv, 0, 0);
        wg.fillStyle = "rgb(" + bg.join(",") + ")";
        outer.forEach(function (f) { wg.fillRect(f.x0 - 2, Math.max(0, f.y0 - 10), f.x1 - f.x0 + 5, f.y1 - Math.max(0, f.y0 - 10) + 3); });
        var TOP = 9;   // ruột group box trong Builder: viền 1 + lề trên 8 → gốc toạ độ của control con
        var fdata = ctx.getImageData(0, 0, W, H).data;   // (work chưa xoá gì tại thời điểm này ngoài các fieldset — dùng để đo dải tiêu đề)
        function cdD(x, y, c) { var i = (y * W + x) * 4; return Math.max(Math.abs(fdata[i] - c[0]), Math.abs(fdata[i + 1] - c[1]), Math.abs(fdata[i + 2] - c[2])); }
        return seq(outer, function (f) {
            if (imp.mode === "ess" && f.lx0 == null && f.y1 - f.y0 >= 90) {   // ESS: khung không legend có dải tiêu đề màu nhạt ở trên = ESS Section (collapsible)
                var hx = f.x0 + 40, hc = [fdata[((f.y0 + 4) * W + hx) * 4], fdata[((f.y0 + 4) * W + hx) * 4 + 1], fdata[((f.y0 + 4) * W + hx) * 4 + 2]], by = f.y0 + 4;
                while (by + 1 < f.y1 && cdD(hx, by + 1, hc) <= 5 && cdD(f.x1 - 60, by + 1, hc) <= 5) by++;
                var bandH = by - f.y0 + 1;
                if (bandH >= 24 && bandH <= 64 && cdD(hx, by + 3, hc) >= 3 || (bandH >= 24 && bandH <= 64 && Math.max(hc[0], hc[1], hc[2]) < 252)) {
                    var ccw = f.x1 - f.x0 - 1, cch = f.y1 - (f.y0 + bandH + 1) - 1;
                    var sub2 = document.createElement("canvas"); sub2.width = ccw; sub2.height = Math.max(10, cch);
                    sub2.getContext("2d").drawImage(cv, f.x0 + 1, f.y0 + bandH + 1, ccw, Math.max(10, cch), 0, 0, ccw, Math.max(10, cch));
                    return ocrCrop(cv, f.x0 + 6, f.y0 + 3, Math.min(600, (f.x1 - f.x0) * 0.5), bandH - 4, { fill: hc }).then(function (t) {
                        return imp.runInterior(sub2, scale, progress, src).then(function (kids) { return { f: f, title: t.text, kids: kids, ess: true, bandH: bandH }; });
                    });
                }
            }
            var cw = f.x1 - f.x0 - 1, ch = f.y1 - (f.y0 + TOP) - 1;
            var legend = f.lx0 != null ? ocrCrop(cv, f.lx0, f.y0 - 9, f.lx1 - f.lx0 + 1, 19, { fill: bg }) : Promise.resolve({ text: "" });
            if (cw < 10 || ch < 10) return legend.then(function (t) { return { f: f, title: t.text, kids: [] }; });
            var sub = document.createElement("canvas"); sub.width = cw; sub.height = ch;
            sub.getContext("2d").drawImage(cv, f.x0 + 1, f.y0 + TOP, cw, ch, 0, 0, cw, ch);
            return legend.then(function (t) {
                if (window.__T2) console.log('T2 legend', f.lx0, f.lx1, JSON.stringify(t.text), t.conf);
                return imp.runInterior(sub, scale, progress, src).then(function (kids) { return { f: f, title: t.text, kids: kids }; });
            });
        }).then(function (parts) {
            var out = [];
            parts.forEach(function (pt) {
                var f = pt.f, id = tmpIdX("fld_groupbox"), ids = {};
                pt.kids.forEach(function (k) { ids[k.id] = 1; });
                if (pt.ess) {   // ESS Section (collapsible-section): gốc con = (trái+11, trên+48) trong DOM
                    var cid = tmpIdX("collapsible");
                    out.push({ id: cid, type: "collapsible-section", uiMode: "ess", caption: (pt.title || "").replace(/[^A-Za-z0-9 ()\/&-]+/g, "").trim() || "Section", expanded: true, left: f.x0, top: f.y0, width: f.x1 - f.x0 + 1, height: Math.max(60, f.y1 - f.y0 + 1 - 9), backgroundColor: "#f5f5f5", borderColor: "#e0e0e0", headerColor: "#0078d4", contentPadding: 12, zIndex: 0, parentId: null });
                    pt.kids.forEach(function (k) { if (!k.parentId || !ids[k.parentId]) { k.parentId = cid; k.left = (k.left || 0) - 10; k.top = (k.top || 0) + pt.bandH - 47; } out.push(k); });
                    return;
                }
                var cap = pt.title && /[A-Za-z0-9]/.test(pt.title) ? pt.title.replace(/[\s\-–—_:.~=|]+$/, "") : "";
                out.push({ id: id, type: "field", ftype: "groupbox", uiMode: "core", caption: cap, required: false, disabled: false, defaultValue: "", items: [], multiselectColumns: [], multiselectItems: [], multiselectSelectedValues: [], labelWidth: 120, captionBold: false, captionItalic: false, captionPosition: "left", tabPageId: null, tabIndex: null, zIndex: 0, parentId: null, left: f.x0, top: f.y0, width: f.x1 - f.x0 + 1, height: f.y1 - f.y0 + 1 });
                pt.kids.forEach(function (k) { if (!k.parentId || !ids[k.parentId]) k.parentId = id; out.push(k); });
            });
            return imp.runPipeline(work, scale, progress, src, { absTop: true }).then(function (rest) {
                return out.concat(rest);
            });
        });
    };

    // Ruột của Section / fieldset: có fieldset lồng bên trong thì tách nó ra, không thì pipeline thường; toạ độ tuyệt đối trong ruột
    imp.runInterior = function (cv, scale, progress, src) {
        var W = cv.width, H = cv.height, fss = [];
        if (imp.regions !== false && W >= 140 && H >= 40) {
            try { var dd = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data; fss = imp.findFieldsets(dd, W, H, mainColor(dd, W, H)); } catch (e) { fss = []; }
        }
        if (fss.length) return imp.runFieldsets(cv, fss, scale, progress, src);
        return imp.runPipeline(cv, scale, progress, src, { absTop: true });
    };

    imp.runSections = function (cv, scale, progress, src, opts) {
        var W = cv.width, H = cv.height, ctx = cv.getContext("2d", { willReadFrequently: true });
        var data = ctx.getImageData(0, 0, W, H).data, secs = [];
        var fss = [];
        if (imp.regions !== false) { try { fss = imp.findFieldsets(data, W, H, mainColor(data, W, H)); } catch (e2) { fss = []; } }
        if (imp.regions !== false) { try { secs = imp.findSections(data, W, H, mainColor(data, W, H), fss); } catch (e) { secs = []; } }
        if (!secs.length && fss.length) return imp.runFieldsets(cv, fss, scale, progress, src);
        if (!secs.length) return imp.runPipeline(cv, scale, progress, src, opts);
        var bg = mainColor(data, W, H);
        var work = document.createElement("canvas"); work.width = W; work.height = H;
        var wg = work.getContext("2d", { willReadFrequently: true }); wg.drawImage(cv, 0, 0);
        wg.fillStyle = "rgb(" + bg.join(",") + ")";
        secs.forEach(function (sc) { wg.fillRect(sc.x0 - 1, sc.top - 1, sc.x1 - sc.x0 + 3, sc.bottom - sc.top + 3); });
        var DOM_HDR = 35;   // tiêu đề Section trong Builder cao ~26 + lề nội dung 8 + viền 1 → gốc toạ độ của control con
        return seq(secs, function (sc) {
            var cw = sc.x1 - sc.x0 - 1, ch = Math.max(10, sc.bottom - sc.hy1 - 1);
            var sub = document.createElement("canvas"); sub.width = cw; sub.height = ch;
            sub.getContext("2d").drawImage(cv, sc.x0 + 1, sc.hy1 + 1, cw, ch, 0, 0, cw, ch);
            return ocrCrop(cv, sc.x0 + 6, sc.hy0 + 2, Math.min(600, (sc.x1 - sc.x0) * 0.7), sc.hy1 - sc.hy0 - 3, { fill: sc.color }).then(function (t) {
                // tiêu đề = các từ liền nhau từ đầu dải; phần sau khoảng hở > 14px (biểu tượng, link, combo bên phải…) là control nằm trên dải
                var ws = (t.words || []).filter(function (w) { return w.t && /[A-Za-z0-9]/.test(w.t); }).sort(function (a, b) { return a.x0 - b.x0; }), tt = [], tx1 = sc.x0 + 6;
                for (var wi = 0; wi < ws.length; wi++) { if (wi && ws[wi].x0 - ws[wi - 1].x1 > 14) break; tt.push(ws[wi].t); tx1 = ws[wi].x1; }
                var title = tt.length ? cleanText(tt.join(" ")) : t.text;
                var hx0 = Math.round(tx1 + 8), hw = sc.x1 - 2 - hx0, hh = sc.hy1 - sc.hy0 - 1, hdrP = Promise.resolve([]);
                if (ws.length && hw >= 30 && hh >= 10 && ws.length > tt.length - 0 || (ws.length && hw >= 30 && hh >= 10)) {
                    var hsub = document.createElement("canvas"); hsub.width = hw; hsub.height = hh;
                    hsub.getContext("2d").drawImage(cv, hx0, sc.hy0 + 1, hw, hh, 0, 0, hw, hh);
                    hdrP = imp.runPipeline(hsub, scale, progress, src, { absTop: true });
                }
                return imp.runInterior(sub, scale, progress, src).then(function (kids) {
                    return hdrP.then(function (hk) { return { sc: sc, title: title, kids: kids, hk: hk, hx0: hx0 }; });
                });
            });
        }).then(function (parts) {
            var out = [];
            parts.forEach(function (pt) {
                var sc = pt.sc, id = tmpIdX("fld_section"), ids = {};
                pt.kids.forEach(function (k) { ids[k.id] = 1; });
                out.push({ id: id, type: "field", ftype: "section", uiMode: "core", caption: pt.title && /[A-Za-z0-9]/.test(pt.title) ? pt.title : "Section", required: false, disabled: false, defaultValue: "", items: [], multiselectColumns: [], multiselectItems: [], multiselectSelectedValues: [], labelWidth: 120, captionBold: false, captionItalic: false, captionPosition: "left", tabPageId: null, tabIndex: null, zIndex: 0, parentId: null, left: sc.x0, top: sc.top, width: sc.x1 - sc.x0 + 1, height: sc.bottom - sc.top + 1 });
                var off = (sc.hy1 - sc.top + 1) - DOM_HDR;
                pt.kids.forEach(function (k) { if (!k.parentId || !ids[k.parentId]) { k.parentId = id; k.top = (k.top || 0) + off; } out.push(k); });
                // control nằm trên dải tiêu đề (vd. combo Company bên phải): con của Section với top âm (đè lên vùng tiêu đề)
                var hids = {}; (pt.hk || []).forEach(function (k) { hids[k.id] = 1; });
                (pt.hk || []).forEach(function (k) {
                    if (!k.parentId || !hids[k.parentId]) { k.parentId = id; k.top = (k.top || 0) + (sc.hy0 + 1 - sc.top) - DOM_HDR; k.left = (k.left || 0) + (pt.hx0 - (sc.x0 + 1)); }
                    out.push(k);
                });
            });
            return imp.runPipeline(work, scale, progress, src, { absTop: true }).then(function (rest) {
                // vệt ngang mỏng còn sót giữa các Section (viền/đổ bóng) không phải control
                rest = rest.filter(function (r) { return !(r.ftype === "image" && r.height <= 16 && r.width >= 0.5 * W); });
                return out.concat(rest);
            });
        });
    };

    // Popup: dải màu đặc (xanh) nằm sát đỉnh ảnh, cao 20–70px, rộng ≥ 50% ảnh
    imp.findPopup = function (d, W, H) {
        var y0 = -1, y1 = -1, col = null, bx0 = 0, bx1 = 0;
        for (var y = 0; y < Math.min(H, 120); y++) {
            var c = pxAt(d, W, W >> 1, y), l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], sat = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
            var ok = l < 170 && sat >= 40;
            if (ok) {
                var xa = W >> 1, xb = W >> 1;
                while (xa > 0 && cdf(pxAt(d, W, xa - 1, y), c) <= 14) xa--;
                while (xb < W - 1 && cdf(pxAt(d, W, xb + 1, y), c) <= 14) xb++;
                ok = (xb - xa + 1) >= 0.5 * W;
                if (ok) { if (y0 < 0) { y0 = y; col = c; bx0 = xa; bx1 = xb; } y1 = y; continue; }
            }
            if (y0 >= 0) break;
        }
        if (y0 < 0 || y1 - y0 + 1 < 20 || y1 - y0 + 1 > 70) return null;
        // đáy popup: cột ngay trong mép trái còn khác cột ngoài mép
        var bottom = H - 1, ox = Math.max(0, Math.min(bx0 - 3, 1));
        if (bx0 > 8 || bx1 < W - 9) {
            for (var yy = y1 + 6; yy < H; yy++) { if (cdf(pxAt(d, W, Math.min(W - 1, bx0 + 3), yy), pxAt(d, W, ox, yy)) < 8) { bottom = yy - 1; break; } }
        }
        // dải công cụ xám (nền khác nền thân) ngay dưới tiêu đề
        var mid = (bx0 + bx1) >> 1, bodyBg = pxAt(d, W, mid, Math.max(y1 + 1, bottom - 8)), tb = 0, ty = -1, tc = null;
        for (var q = y1 + 1; q <= Math.min(bottom, y1 + 12) && !tb; q++) {
            var pc = pxAt(d, W, mid, q);
            if (cdf(pc, bodyBg) < 5 || cdf(pc, bodyBg) >= 60) continue;
            var fc = pxAt(d, W, mid, Math.min(H - 1, q + 3)), yb = q + 3;   // q có thể là viền 1px của dải → lấy màu ruột ở q+3
            while (yb < bottom && cdf(pxAt(d, W, mid, yb + 1), fc) <= 4) yb++;
            yb = Math.min(bottom, yb + 1);                                    // tính cả viền dưới
            var band = yb - q + 1 >= 18 && yb - q + 1 <= 48 && cdf(fc, bodyBg) >= 5;
            if (ty < 0 || band) { ty = q; tc = fc; }
            if (band) tb = yb - (y1 + 1) + 2;
        }
        return { x0: bx0, x1: bx1, hy0: y0, hy1: y1, color: col, bottom: bottom, toolbarTop: ty >= 0 ? ty : y1 + 1, toolbarH: tb, bodyBg: bodyBg, toolbarColor: tc };
    };

    function tmpIdX(p) { return p + "_imp" + Date.now() + "_" + Math.floor(Math.random() * 1e6); }

    imp.makeAll = function (cv, scale, progress, src) {
        var W = cv.width, H = cv.height, ctx = cv.getContext("2d", { willReadFrequently: true });
        var data = ctx.getImageData(0, 0, W, H).data, pop = null;
        if (imp.regions !== false) { try { pop = imp.findPopup(data, W, H); } catch (e) { pop = null; } }
        if (pop) return imp.popupFlow(cv, pop, scale, progress, src).then(dropMarks);
        return imp.makePage(cv, scale, progress, src).then(function (made) { return imp.mode === "ess" ? pillTabs(made) : made; }).then(dropMarks);
    };

    function dropMarks(made) {
        made.forEach(function (m) { delete m._pill; });
        return made;
    }

    function pillTabs(made) {
        var by = {};
        made.forEach(function (m) { by[m.id] = m; });
        function abs(m) {
            var x = m.left || 0, y = m.top || 0, p = by[m.parentId];
            while (p) { x += p.left || 0; y += p.top || 0; p = by[p.parentId]; }
            return { x: x, y: y };
        }
        var pill = made.filter(function (m) { return m._pill && abs(m).y < 90; })[0];
        if (!pill) return made;
        var at = abs(pill), rowTop = at.y, rowBottom = at.y + (pill.height || 0);
        var items = [{ x: at.x, text: pill.defaultValue || "Tab 1", m: pill, active: true }], other = false;
        made.forEach(function (m) {
            if (m === pill || m.type !== "field" || m.ftype === "groupbox") return;
            var a = abs(m), mid = a.y + (m.height || 0) / 2;
            if (mid < rowTop || mid > rowBottom) return;
            if ((m.ftype === "label" || m._pill) && m.defaultValue) items.push({ x: a.x, text: m.defaultValue, m: m });
            else if (m.ftype !== "image") other = true;
        });
        if (other) return made;
        items.sort(function (a, b) { return a.x - b.x; });
        var drop = {};
        items.forEach(function (it) { drop[it.m.id] = true; });
        var rest = made.filter(function (m) { return !drop[m.id]; });
        var right = 0, bottom = 0;
        rest.forEach(function (m) {
            if (m.parentId && by[m.parentId]) return;
            right = Math.max(right, (m.left || 0) + (m.width || 0));
            bottom = Math.max(bottom, (m.top || 0) + (m.type === "grid" || m.type === "ess-grid" ? gridRenderHeight(m) : (m.height || 0)));
        });
        var top = Math.max(0, Math.round(rowTop) - 2), left = Math.max(0, Math.round(items[0].x) - 4);
        var tab = {
            id: tmpIdX("tabpage"), type: "tabpage", left: left, top: top,
            width: Math.max(300, Math.round(right - left) + 10), height: Math.max(150, Math.round(bottom - top) + 16),
            tabs: items.map(function (it) { return { caption: it.text }; }),
            activeTabIndex: Math.max(0, items.findIndex(function (it) { return it.active; })), zIndex: 0, parentId: null
        };
        rest.forEach(function (m) {
            if (m.parentId && by[m.parentId]) return;
            m.tabPageId = tab.id;
            m.tabIndex = tab.activeTabIndex;
            if ((m.top || 0) < top + 36) m.top = top + 36;
        });
        return [tab].concat(rest);
    }

    function looseField(ftype, x, y, w, h, text) {
        return {
            id: tmpIdX("fld_" + ftype), type: "field", ftype: ftype, uiMode: imp.mode === "ess" ? "ess" : "core", caption: "", required: false,
            disabled: false, defaultValue: text || "", items: [], multiselectColumns: [], multiselectItems: [], multiselectSelectedValues: [],
            labelWidth: 0, captionBold: false, captionItalic: false, captionPosition: "left", tabPageId: null, tabIndex: null, zIndex: 1, parentId: null,
            left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h)
        };
    }

    var MENU_ICONS = [
        [/^(add|new|create|insert|assign)/i, "menu-add"], [/^(save|update|submit)/i, "menu-save"], [/^(delete|remove|un-?assign)/i, "menu-delete"],
        [/^(cancel|close|back)/i, "menu-cancel"], [/^(open|view|preview) report/i, "menu-open-report"], [/^download/i, "menu-download"], [/^(export|print)/i, "menu-export"], [/^(approve|confirm)/i, "menu-approve"], [/^(ok|select)$/i, "menu-ok"], [/^(import|browse|upload)/i, "menu-browse"]
    ];
    function menuIcon(text) {
        for (var i = 0; i < MENU_ICONS.length; i++) if (MENU_ICONS[i][0].test(text)) return "/Content/images/icon-menu/" + MENU_ICONS[i][1] + ".png";
        return null;
    }

    function tableBand(d, W, gr, bg) {
        var counts = {}, fill = null, best = 0, sampled = 0, probe = Math.max(0, gr.hy0 - 8);
        for (var sx = gr.x0 + 4; sx < gr.x1 - 3; sx += 4) {
            var pc = pxAt(d, W, sx, probe), key = pc.join(",");
            sampled++;
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] > best) { best = counts[key]; fill = pc; }
        }
        if (!fill || best < 0.5 * sampled || cdf(fill, bg) < 5) return null;
        function rowIs(y) {
            var same = 0, total = 0;
            for (var x = gr.x0 + 4; x < gr.x1 - 3; x += 4) { total++; if (cdf(pxAt(d, W, x, y), fill) <= 5) same++; }
            return same >= 0.6 * total;
        }
        var bottom = gr.hy0 - 1;
        while (bottom > gr.hy0 - 6 && !rowIs(bottom)) bottom--;
        if (!rowIs(bottom)) return null;
        var top = bottom;
        while (top > 0 && bottom - top < 70 && rowIs(top - 1)) top--;
        var h = bottom - top + 1;
        return h >= 20 && h <= 64 ? { y0: top, y1: bottom, fill: fill } : null;
    }

    function bandParts(cv, d, gr, band) {
        var W = cv.width, y0 = band.y0 + 1, y1 = band.y1 - 1, h = y1 - y0 + 1, alt = [], ink = [], x, y;
        for (x = gr.x0; x <= gr.x1; x++) {
            var a = 0, k = 0;
            for (y = y0; y <= y1; y++) { var c = cdf(pxAt(d, W, x, y), band.fill); if (c >= 8) a++; if (c >= 40) k++; }
            alt.push(a); ink.push(k);
        }
        var boxes = [], run = null;
        for (x = 0; x <= alt.length; x++) {
            if (x < alt.length && alt[x] >= 0.55 * h) { if (!run) run = { x0: x, x1: x }; else run.x1 = x; }
            else if (run) { if (run.x1 - run.x0 >= 28) boxes.push(run); run = null; }
        }
        function inBox(i) { return boxes.some(function (b) { return i >= b.x0 - 2 && i <= b.x1 + 2; }); }
        var segs = [], cur = null, gap = 0;
        for (x = 0; x <= ink.length; x++) {
            var on = x < ink.length && ink[x] > 0 && !inBox(x);
            if (on) { if (!cur) cur = { x0: x, x1: x }; else cur.x1 = x; gap = 0; }
            else if (cur && (++gap >= 14 || x >= ink.length || inBox(x))) { segs.push(cur); cur = null; gap = 0; }
        }
        segs = segs.filter(function (s) { return s.x1 - s.x0 >= 6; });
        function rowsOf(x0, x1, limit) {
            var top = 1e9, bottom = -1;
            for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) if (cdf(pxAt(d, W, gr.x0 + xx, yy), band.fill) >= limit) { if (yy < top) top = yy; if (yy > bottom) bottom = yy; break; }
            return bottom < 0 ? null : { y0: top, y1: bottom };
        }
        function iconOf(s) {
            var end = -1, limit = Math.min(s.x1 - 8, s.x0 + 28);
            for (var i = s.x0 + 6; i <= limit; i++) {
                if (!ink[i] && !ink[i + 1] && !ink[i + 2]) { end = i - 1; break; }
            }
            if (end < 0) return null;
            var count = 0, sum = [0, 0, 0];
            for (var xx = s.x0; xx <= end; xx++) for (var yy = y0; yy <= y1; yy++) {
                var p = pxAt(d, W, gr.x0 + xx, yy);
                if (cdf(p, band.fill) < 40) continue;
                count++; sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2];
            }
            if (!count || Math.max(sum[0], sum[1], sum[2]) - Math.min(sum[0], sum[1], sum[2]) < 50 * count) return null;
            return { x1: end };
        }
        var parts = { fill: band.fill, y0: band.y0, y1: band.y1, x0: gr.x0, labels: [], items: [], buttons: [] };
        return seq(segs, function (s) {
            var icon = iconOf(s), tx0 = icon ? icon.x1 + 2 : s.x0, rows = rowsOf(tx0, s.x1, 40);
            if (!rows || s.x1 - tx0 < 6) return Promise.resolve();
            return ocrCrop(cv, gr.x0 + tx0 - 2, rows.y0 - 3, s.x1 - tx0 + 5, rows.y1 - rows.y0 + 7, { fill: band.fill }).then(function (r) {
                var text = r.text.replace(/^[^A-Za-z0-9(]+/, "").trim();
                if (text.length < 2 || !/[A-Za-z]/.test(text)) return;
                if (icon) parts.items.push({ x0: gr.x0 + s.x0, x1: gr.x0 + s.x1, text: text });
                else parts.labels.push({ x0: gr.x0 + tx0, x1: gr.x0 + s.x1, y0: rows.y0, y1: rows.y1, text: text });
            });
        }).then(function () {
            return seq(boxes, function (b) {
                var rows = rowsOf(b.x0 + 2, b.x1 - 2, 8);
                if (!rows || rows.y1 - rows.y0 < 14) return Promise.resolve();
                var inner = pxAt(d, W, gr.x0 + b.x0 + 4, rows.y0 + 3);
                return ocrCrop(cv, gr.x0 + b.x0 + 3, rows.y0 + 3, b.x1 - b.x0 - 5, rows.y1 - rows.y0 - 5, { fill: inner }).then(function (r) {
                    var text = r.text.replace(/^\S{1,2}\s+(?=[A-Za-z]{3,})/, "").replace(/^[^A-Za-z0-9]+/, "").replace(/^[VY7](?=[A-Z][a-z]{2,})/, "").trim();
                    parts.buttons.push({ x0: gr.x0 + b.x0, x1: gr.x0 + b.x1, y0: rows.y0, y1: rows.y1, text: /[A-Za-z0-9]/.test(text) ? text : "...", fill: inner });
                });
            });
        }).then(function () {
            var custom = parts.buttons.length > 0 || parts.items.some(function (it) { return !/^(add|delete)$/i.test(it.text); });
            return custom ? parts : null;
        });
    }

    function bandControls(parts) {
        var out = [], hex = function (c) { return "#" + c.map(function (v) { var t = v.toString(16); return t.length < 2 ? "0" + t : t; }).join(""); };
        parts.labels.forEach(function (l) { out.push(looseField("label", l.x0 - 2, l.y0 - 3, l.x1 - l.x0 + 8, l.y1 - l.y0 + 7, l.text)); });
        if (parts.items.length) {
            var first = parts.items[0];
            out.push({
                id: tmpIdX("toolbar"), type: "toolbar", left: Math.max(0, first.x0 - 6), top: Math.round((parts.y0 + parts.y1) / 2 - 14), parentId: null, dock: null, showBackground: true,
                tabPageId: null, tabIndex: null, zIndex: 1,
                items: parts.items.map(function (it) { var item = { text: it.text }, icon = menuIcon(it.text); if (icon) item.icon = icon; return item; })
            });
        }
        parts.buttons.forEach(function (b) {
            var btn = looseField("button", b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, b.text);
            btn.btnBackColor = hex(b.fill); btn.btnTextColor = "#333333";
            out.push(btn);
        });
        return out;
    }

    function gridRenderHeight(c) {
        if (c.type === "ess-grid") return c.height || 260;
        var rows = c.sampleData ? c.sampleData.length : 5;
        return 22 + 35 + rows * 35 + (c.allowGrouping ? 52 : 0) + (c.showTitle || c.showToolbar || c.showLocalDataLanguage ? 27 : 0) +
            (c.filterRow ? 34 : 0) + (c.showPager ? 50 : 0);
    }

    function pushBelowGrids(grids, regions, rest) {
        var ids = {};
        rest.forEach(function (m) { ids[m.id] = true; });
        var growths = grids.map(function (c, i) { return Math.max(0, gridRenderHeight(c) - (regions[i].bottom - c.top + 1)); });
        function shiftFor(top) {
            var total = 0;
            regions.forEach(function (r, i) { if (r.bottom <= top + 2) total += growths[i]; });
            return total;
        }
        rest.forEach(function (m) {
            if (m.parentId && ids[m.parentId]) return;
            m.top = (m.top || 0) + shiftFor(m.top || 0);
        });
        grids.forEach(function (c, i) {
            var total = 0;
            for (var k = 0; k < i; k++) total += growths[k];
            c.top += total;
        });
    }

    imp.findTrees = function (d, W, H, bg) {
        function at(x, y) { return (y * W + x) * 4; }
        function hi(i) { return Math.max(d[i], d[i + 1], d[i + 2]); }
        function lo(i) { return Math.min(d[i], d[i + 1], d[i + 2]); }
        function isBg(x, y) { var i = at(x, y); return Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) <= 10; }
        function lineish(x, y) { var i = at(x, y), h = hi(i); return h - lo(i) <= 6 && h >= 178 && h <= 240 && !isBg(x, y); }
        function darkish(x, y) { var i = at(x, y), h = hi(i); return h - lo(i) <= 14 && h >= 90 && h <= 190; }
        function vline(x, y) {
            for (var c = x - 1; c <= x + 1; c++) {
                var up = 0, down = 0;
                for (var q = 2; q <= 9; q++) {
                    if (y - q >= 0 && lineish(c, y - q)) up++;
                    if (y + q < H && lineish(c, y + q)) down++;
                }
                if (up >= 6 || down >= 6) return true;
            }
            return false;
        }
        function buttonAt(x, y) {
            var n = 0;
            for (var c = x - 3; c <= x - 1; c++) for (var q = -4; q <= 5; q++) if (darkish(c, y + q)) n++;
            return n >= 5;
        }
        function leg(x, y) {
            for (var c = x - 1; c <= x + 1; c++) {
                var up = 0, down = 0;
                for (var q = 2; q <= 11; q++) {
                    if (y - q >= 0 && (lineish(c, y - q) || darkish(c, y - q))) up++;
                    if (y + q < H && (lineish(c, y + q) || darkish(c, y + q))) down++;
                }
                if (up >= 8 || down >= 8) return true;
            }
            return false;
        }

        var stubs = [];
        for (var y = 12; y < H - 12; y++) {
            var x = 12;
            while (x < W - 2) {
                if (!lineish(x, y)) { x++; continue; }
                var x0 = x;
                while (x < W - 2 && lineish(x, y)) x++;
                var x1 = x - 1, len = x1 - x0 + 1;
                if (len < 6 || len > 36) continue;
                var clear = 0;
                for (var k = x0 + 2; k <= x1; k++) if (isBg(k, y - 3) && isBg(k, y + 3)) clear++;
                if (clear < 0.8 * (len - 2)) continue;
                var twin = null;
                for (var s = stubs.length - 1; s >= 0 && stubs[s].y1 >= y - 1; s--) {
                    if (Math.abs(stubs[s].x1 - x1) <= 2 && Math.abs(stubs[s].x0 - x0) <= 3) { twin = stubs[s]; break; }
                }
                if (twin) { twin.y1 = y; continue; }
                stubs.push({ x0: x0, x1: x1, y: y, y1: y });
            }
        }
        stubs.forEach(function (st, index) {
            for (var o = index + 1; o < stubs.length && stubs[o].y - st.y <= 18; o++) {
                var other = stubs[o];
                if (other.y - st.y >= 10 && Math.abs(other.x0 - st.x0) <= 2 && Math.abs(other.x1 - st.x1) <= 2) { st.edge = true; other.edge = true; }
            }
        });
        stubs = stubs.filter(function (st) {
            if (st.edge || leg(st.x1, st.y)) return false;
            st.button = buttonAt(st.x0, st.y);
            return st.button || vline(st.x0, st.y);
        });
        stubs.sort(function (a, b) { return a.y - b.y || a.x0 - b.x0; });

        var used = [], trees = [];
        stubs.forEach(function (first, index) {
            if (used[index]) return;
            var chain = [first], last = first;
            used[index] = true;
            for (var j = index + 1; j < stubs.length; j++) {
                if (used[j]) continue;
                var next = stubs[j], dy = next.y - last.y;
                if (dy > 36) break;
                if (dy < 16 || Math.abs(next.x1 - last.x1) > 240) continue;
                chain.push(next); used[j] = true; last = next;
            }
            if (chain.length < 4) return;
            var steps = [];
            for (var q = 1; q < chain.length; q++) steps.push(chain[q].y - chain[q - 1].y);
            var pitch = steps.slice().sort(function (a, b) { return a - b; })[steps.length >> 1];
            if (pitch < 18 || pitch > 34) return;
            if (steps.filter(function (v) { return Math.abs(v - pitch) <= 2; }).length < 0.75 * steps.length) return;

            var centres = [];
            chain.map(function (c) { return c.x1; }).sort(function (a, b) { return a - b; }).forEach(function (v) {
                if (centres.length && v - centres[centres.length - 1] <= 3) return;
                centres.push(v);
            });
            var indent = 0;
            for (var c = 1; c < centres.length; c++) {
                var gap = centres[c] - centres[c - 1];
                if (gap >= 14 && (!indent || gap < indent)) indent = gap;
            }
            if (!indent && !chain.some(function (c2) { return c2.button; })) return;
            if (!indent) indent = 23;
            var lead = Math.round(pitch / 2 - 4.5);
            chain = chain.filter(function (c4) { return c4.y - lead + pitch <= H - 3; });
            if (chain.length < 3) return;
            trees.push({
                pitch: pitch, indent: indent, top: chain[0].y - lead, left: Math.max(0, Math.round(centres[0] - indent / 2 - 10)),
                rows: chain.map(function (c3) {
                    return { top: c3.y - lead, xr: c3.x1, level: Math.max(0, Math.round((c3.x1 - centres[0]) / indent)), button: c3.button };
                })
            });
        });
        return trees;
    };

    function treeControls(cv, d, W, H, bg, trees) {
        function at(x, y) { return (y * W + x) * 4; }
        function hi(i) { return Math.max(d[i], d[i + 1], d[i + 2]); }
        function lo(i) { return Math.min(d[i], d[i + 1], d[i + 2]); }
        function far(i, c, limit) { return Math.max(Math.abs(d[i] - c[0]), Math.abs(d[i + 1] - c[1]), Math.abs(d[i + 2] - c[2])) > limit; }
        function boxAt(x, top, bottom, back) {
            function edge(cx) {
                var run = 0, best = 0, end = 0;
                for (var y = top; y <= bottom; y++) {
                    var i = at(cx, y);
                    if (far(i, back, 24) && hi(i) - lo(i) <= 16) { run++; if (run > best) { best = run; end = y; } } else run = 0;
                }
                return best >= 10 && best <= 18 ? { y0: end - best + 1, y1: end } : null;
            }
            if (x < 0 || x + 17 >= W) return null;
            var left = edge(x);
            if (!left) return null;
            for (var w = 11; w <= 16; w++) if (edge(x + w)) return { x0: x, x1: x + w, y0: left.y0, y1: left.y1 };
            return null;
        }
        function ticked(box) {
            var n = 0;
            for (var x = box.x0 + 3; x <= box.x1 - 3; x++) for (var y = box.y0 + 3; y <= box.y1 - 3; y++) { var i = at(x, y); if (hi(i) <= 140) n++; }
            return n >= 5;
        }

        return seq(trees, function (tree) {
            var pitch = tree.pitch;
            var rows = tree.rows.map(function (r) {
                var top = Math.max(0, r.top), bottom = Math.min(H - 1, top + pitch - 1);
                var band = null, start = r.xr + 3, x, y, i;
                for (x = r.xr + 2; x <= Math.min(W - 2, r.xr + 40) && !band; x++) {
                    i = at(x, top + 2);
                    if (far(i, bg, 40) && hi(i) - lo(i) >= 60) { band = [d[i], d[i + 1], d[i + 2]]; start = x + 1; }
                }
                var back = band || bg, gx = -1;
                for (x = start; x <= Math.min(W - 2, r.xr + 70) && gx < 0; x++) {
                    for (y = top + 3; y <= bottom - 3; y++) if (far(at(x, y), back, 14)) { gx = x; break; }
                }
                var info = { top: top, bottom: bottom, band: band, level: r.level, button: r.button, kind: "none", checked: false, textX: gx < 0 ? start : gx };
                if (gx < 0) return info;
                var green = 0;
                for (x = gx; x <= Math.min(W - 1, gx + 17); x++) for (y = top + 2; y <= bottom - 2; y++) { i = at(x, y); if (d[i + 1] - d[i] >= 30 && d[i + 1] - d[i + 2] >= 30) green++; }
                var box = green >= 10 ? null : (boxAt(gx, top + 1, bottom - 1, back) || boxAt(gx + 1, top + 1, bottom - 1, back));
                if (green >= 10) { info.kind = "mark"; info.checked = true; info.textX = gx + 19; }
                else if (box) { info.kind = "box"; info.checked = ticked(box); info.textX = box.x1 + 4; }
                return info;
            });

            var tail = rows[rows.length - 1], cut = false;
            for (var ty = tail.top + 6; ty <= tail.bottom && !cut; ty++) {
                var ink = 0;
                for (var tx = tail.textX; tx <= Math.min(W - 1, tail.textX + 220); tx++) if (far(at(tx, ty), tail.band || bg, 24)) ink++;
                cut = ink >= 150;
            }
            if (cut && rows.length > 3) rows.pop();

            var right = W - 1, side = [];
            rows.forEach(function (r) {
                var found = null;
                for (var x = W - 20; x >= r.textX + 40 && !found; x--) found = boxAt(x, r.top + 1, r.bottom - 1, r.band || bg);
                side.push(found);
            });
            var hits = side.filter(Boolean), column = null;
            if (hits.length >= 0.6 * rows.length) {
                var colX = hits.map(function (b) { return b.x0; }).sort(function (a, b) { return a - b; })[hits.length >> 1];
                if (hits.filter(function (b) { return Math.abs(b.x0 - colX) <= 4; }).length >= 0.6 * rows.length) {
                    var sample = hits[0], edge = at(sample.x0, rows[side.indexOf(sample)].top + Math.round(pitch / 2));
                    column = { x: colX, caption: "", width: Math.max(40, Math.min(120, (W - 1 - colX - 8) * 2)), type: "checkbox", disabled: hi(edge) >= 190 };
                }
            }
            var limit = column ? column.x - 8 : right;

            return seq(rows, function (r) {
                var width = Math.max(10, limit - r.textX), source = cv, ox = r.textX - 1, oy = r.top + 1;
                if (r.band) {
                    source = document.createElement("canvas"); source.width = width; source.height = pitch - 2;
                    var sg = source.getContext("2d"), cell = sg.createImageData(width, pitch - 2);
                    for (var py = 0; py < pitch - 2; py++) for (var px = 0; px < width; px++) {
                        var si = at(Math.min(W - 1, ox + px), Math.min(H - 1, oy + py)), light = 0.299 * d[si] + 0.587 * d[si + 1] + 0.114 * d[si + 2] >= 175 && Math.max(d[si], d[si + 1], d[si + 2]) - Math.min(d[si], d[si + 1], d[si + 2]) <= 70;
                        var ci = (py * width + px) * 4, v = light ? 0 : 255;
                        cell.data[ci] = v; cell.data[ci + 1] = v; cell.data[ci + 2] = v; cell.data[ci + 3] = 255;
                    }
                    sg.putImageData(cell, 0, 0);
                }
                return ocrCrop(source, r.band ? 0 : ox, r.band ? 0 : oy, width, pitch - 2, {}).then(function (res) {
                    if (r.band) (res.words || []).forEach(function (w) { w.x0 += ox; w.x1 += ox; });
                    var words = (res.words || []).filter(function (w) { return w.t; }).sort(function (a, b) { return a.x0 - b.x0; }), kept = [], end = r.textX;
                    while (words.length && !/[A-Za-z0-9]/.test(words[0].t)) words.shift();
                    for (var w = 0; w < words.length; w++) {
                        if (w && words[w].x0 - words[w - 1].x1 > 28) break;
                        kept.push(words[w].t);
                        if (/[A-Za-z0-9]/.test(words[w].t)) end = words[w].x1;
                    }
                    while (kept.length && !/[A-Za-z0-9]/.test(kept[kept.length - 1])) kept.pop();
                    r.text = cleanText(kept.join(" "));
                    r.textEnd = end;
                    return r;
                });
            }).then(function () {
                var mode = rows.some(function (r) { return r.kind === "box"; }) ? "box" : rows.some(function (r) { return r.kind === "mark"; }) ? "mark" : "none";
                var bandRow = rows.filter(function (r) { return r.band; })[0], x1 = 0;
                if (bandRow) {
                    var bx = bandRow.textX;
                    while (bx < W - 1 && !(Math.max(Math.abs(d[at(bx, bandRow.top + 2)] - bandRow.band[0]), Math.abs(d[at(bx, bandRow.top + 2) + 1] - bandRow.band[1]), Math.abs(d[at(bx, bandRow.top + 2) + 2] - bandRow.band[2])) > 30)) bx++;
                    x1 = bx - 1;
                } else {
                    rows.forEach(function (r) { x1 = Math.max(x1, r.textEnd + 12); });
                    if (column) x1 = Math.max(x1, column.x + 16 + Math.round(column.width / 2) - 8);
                }
                x1 = Math.min(W - 1, x1);
                var thumb = 0;
                if (W - 1 - x1 <= 30) {
                    for (var sx = x1 + 2; sx < W - 1; sx++) for (var sy = Math.max(0, tree.top); sy < Math.min(H, tree.top + rows.length * pitch); sy++) {
                        var si = at(sx, sy);
                        if (hi(si) - lo(si) <= 8 && hi(si) >= 170 && hi(si) <= 215) thumb++;
                    }
                }
                var cfg = looseField("tree", tree.left, tree.top, Math.max(80, x1 - tree.left + 1), rows.length * pitch + 2);
                cfg.uiMode = "core";
                cfg.treeCheck = mode;
                cfg.treeRowHeight = pitch;
                cfg.treeIndent = tree.indent;
                cfg.treeLines = true;
                cfg.treeHeader = false;
                cfg.treeScroll = thumb >= 150;
                if (cfg.treeScroll) cfg.width = Math.min(W - cfg.left, cfg.width + 12);
                cfg.treeCaption = "Name";
                cfg.treeColumns = column ? [{ caption: column.caption, width: column.width, type: "checkbox", disabled: column.disabled }] : [];
                cfg.treeNodes = rows.map(function (r, index) {
                    var node = { text: r.text || "", level: r.level };
                    if (r.button && !(rows[index + 1] && rows[index + 1].level > r.level)) node.open = false;
                    if (mode === "box" && r.checked) node.checked = true;
                    if (mode === "mark" && r.kind === "mark") node.checked = true;
                    if (r.band) node.focused = true;
                    if (column) node.cells = [!!(side[index] && ticked(side[index]))];
                    return node;
                });
                return cfg;
            });
        });
    }

    imp.makePage = function (cv, scale, progress, src, opts) {
        var W = cv.width, H = cv.height, ctx = cv.getContext("2d", { willReadFrequently: true });
        var data = ctx.getImageData(0, 0, W, H).data;
        if (imp.mode !== "ess" && imp.regions !== false && !(opts && opts.noTrees)) {
            var treeBg = mainColor(data, W, H), trees = [];
            try { trees = imp.findTrees(data, W, H, treeBg); } catch (e0) { trees = []; }
            if (trees.length) {
                return treeControls(cv, data, W, H, treeBg, trees).then(function (found) {
                    var clean = document.createElement("canvas"); clean.width = W; clean.height = H;
                    var cg = clean.getContext("2d", { willReadFrequently: true }); cg.drawImage(cv, 0, 0);
                    cg.fillStyle = "rgb(" + treeBg.join(",") + ")";
                    found.forEach(function (m) {
                        var from = m.left <= 30 ? 0 : m.left - 2, to = W - (m.left + m.width) <= 30 ? W : m.left + m.width + 2;
                        cg.fillRect(from, Math.max(0, m.top - 2), to - from, m.height + 4);
                    });
                    var next = { noTrees: true };
                    Object.keys(opts || {}).forEach(function (key) { next[key] = opts[key]; });
                    return imp.makePage(clean, scale, progress, src, next).then(function (rest) { return found.concat(rest); });
                });
            }
        }
        var grids = [];
        if (imp.regions !== false) { try { grids = imp.findGrids(data, W, H, mainColor(data, W, H)); } catch (e) { grids = []; } }
        if (!grids.length) return imp.runSections(cv, scale, progress, src);
        var bg = mainColor(data, W, H), boxes = [];
        try { boxes = imp.findBoxes(data, W, H); } catch (e) { }
        var allB = [];
        try { allB = imp.allBoxes(data, W, H, bg); } catch (e) { }
        var work = document.createElement("canvas"); work.width = W; work.height = H;
        var wg = work.getContext("2d", { willReadFrequently: true }); wg.drawImage(cv, 0, 0);
        return seq(grids, function (gr) {
            var band = imp.mode === "ess" && !gr.plain ? tableBand(data, W, gr, bg) : null;
            return band ? bandParts(cv, data, gr, band) : Promise.resolve(null);
        }).then(function (bands) {
            var regions = [];
            grids.forEach(function (gr, i) {
                var floor = i ? regions[i - 1].bottom + 1 : 0, next = grids[i + 1], top, bottom, gridTop;
                if (gr.plain) {
                    top = gridTop = Math.max(floor, gr.hy0 - 2);
                    bottom = Math.min(H - 1, gr.lastY + 64, next ? Math.max(gr.lastY + 2, next.hy0 - 3) : H - 1);
                } else {
                    if (bands[i]) { top = Math.max(floor, bands[i].y0 - 1); gridTop = gr.hy0 - 1; }
                    else {
                        top = Math.max(floor, gr.hy0 - 30); if (!i && top < 45) top = 0;
                        allB.forEach(function (b) { if (!b.check && b.y1 >= top && b.y1 < gr.hy0 - 2 && b.y0 < gr.hy0 - 2 && b.y1 - b.y0 >= 18 && b.x1 >= gr.x0 && b.x0 <= gr.x1) top = Math.max(top, b.y1 + 1); });   // nút / ô nằm sát trên bảng không thuộc bảng → không xoá
                        gridTop = top;
                    }
                    bottom = next ? Math.max(gr.lastY + 4, next.hy0 - 32) : Math.min(H - 1, gr.lastY + 64);
                }
                regions.push({ top: top, bottom: bottom, gridTop: gridTop, x0: gr.plain ? Math.max(0, gr.x0 - 2) : 0, x1: gr.plain ? Math.min(W - 1, gr.x1 + 2) : W - 1 });
            });
            return seq(grids, function (gr, i) {
                var fr = boxes.filter(function (b) { return b.y0 >= gr.hy1 - 2 && b.y1 <= gr.fy1 + 2 && b.x0 >= gr.x0 && b.x1 <= gr.x1 && b.x1 - b.x0 >= 30 && b.y1 - b.y0 >= 12; }).length >= 2;
                return imp.gridConfig(cv, gr, regions[i].gridTop, regions[i].bottom, bg, fr);
            }).then(function (cfgs) {
                var extra = [];
                wg.fillStyle = "rgb(" + bg.join(",") + ")";
                var made = cfgs.map(function (c, i) {
                    var region = regions[i];
                    if (grids[i].plain && !c.showPager) region.bottom = Math.min(region.bottom, grids[i].lastY + 2);
                    wg.fillRect(region.x0, region.top, region.x1 - region.x0 + 1, region.bottom - region.top + 1);
                    if (bands[i]) extra = extra.concat(bandControls(bands[i]));
                    c.id = tmpIdX("grid"); c.parentId = null; c.zIndex = 1;
                    if (opts && opts.inPopup) c.allowGrouping = false;
                    return imp.mode === "ess" ? imp.toEssGrid(c) : c;
                });
                return imp.runSections(work, scale, progress, src).then(function (rest) {
                    rest = extra.concat(rest);
                    pushBelowGrids(made, regions, rest);
                    return made.concat(rest);
                });
            });
        });
    };

    // Cấu hình lưới Core → ESS GridView (control "ess-grid")
    imp.toEssGrid = function (c) {
        var hasTitle = c.titleText && c.titleText !== "Gridview";
        var acts = (c.rowActionColumns || []).filter(function (a) { return a.visible; });
        var cols = (c.columns || []).map(function (k, i) {
            return { id: "col_imp" + Date.now() + "_" + i, key: k.name || ("Col" + (i + 1)), caption: k.caption || "", type: "text", align: "left", headerBold: false, headerItalic: false, width: k.width || 120 };
        });
        return {
            id: c.id, type: "ess-grid", uiMode: "ess", parentId: null, zIndex: 1,
            left: c.left, top: c.top, width: c.width, height: 260,
            title: hasTitle ? c.titleText : "", showTitle: !!hasTitle, titleBold: true, titleItalic: false,
            showCheckbox: !!c.showCheckbox, showActionColumn: acts.length > 0, allowAddRow: !!(c.toolbarItems || []).some(function (t) { return t.text === "Add"; }),
            sampleRowCount: Math.max(1, Math.min(5, c._rows || 3)), sampleDisplayMode: c._plain || !c.filterRow ? "view" : "edit", columns: cols,
            rowActions: acts.map(function (a, i) { return { id: "act_imp" + Date.now() + "_" + i, key: a.key, caption: a.text, icon: a.icon, modeSample: "normal" }; })
        };
    };

    imp.popupFlow = function (cv, pop, scale, progress, src) {
        var popW = pop.x1 - pop.x0 + 1, hdrH = pop.hy1 - pop.hy0 + 1, barH = pop.toolbarH || 0;
        var bodyTop = pop.hy1 + 1 + barH, bodyH = Math.max(20, pop.bottom - bodyTop + 1);
        var body = document.createElement("canvas"); body.width = popW; body.height = bodyH;
        body.getContext("2d").drawImage(cv, pop.x0, bodyTop, popW, bodyH, 0, 0, popW, bodyH);
        // thanh xám dưới tiêu đề của Popup control chính là chỗ đặt Toolbar menu → giữ nó và cho cao bằng dải công cụ trong ảnh
        var popup = {
            id: tmpIdX("popup"), type: "popup", headerText: "Popup", titleText: "", parentId: null,
            left: 0, top: 0, width: popW, height: hdrH + Math.max(20, barH) + bodyH + 10, headerHeight: hdrH,
            titleFontSize: 14, titleLineHeight: Math.max(20, barH || 30)
        };
        if (!barH) popup.hideTitleBar = true, popup.height = hdrH + bodyH + 10;
        var extra = [];
        return ocrCrop(cv, pop.x0 + 2, pop.hy0 + 2, popW - 50, hdrH - 3, { fill: pop.color, invert: true }).then(function (r) {
            if (r.text && /[A-Za-z0-9]/.test(r.text)) popup.headerText = r.text;
            if (!barH) return null;
            var g = cv.getContext("2d").getImageData(pop.x0 + 4, pop.toolbarTop + 3, 1, 1).data;
            return ocrCrop(cv, pop.x0 + 4, pop.toolbarTop + 2, popW - 8, barH - (pop.toolbarTop - pop.hy1 - 1) - 4, { fill: [g[0], g[1], g[2]] });
        }).then(function (tr) {
            if (tr) {
                var items = [], firstX = null, langX = null, langStart = null, iconPath = { save: "menu-save.png", cancel: "menu-cancel.png", close: "menu-cancel.png", delete: "menu-delete.png", add: "menu-add.png", approve: "menu-approve.png", export: "menu-export.png", browse: "menu-browse.png" };
                tr.words.forEach(function (w) {
                    var key = w.t.toLowerCase().replace(/[^a-z]/g, ""), lx = w.x0 - pop.x0;
                    if (iconPath[key] && (langX == null || lx < langX)) {
                        if (firstX == null) firstX = lx;
                        items.push({ text: w.t.charAt(0).toUpperCase() + w.t.slice(1).toLowerCase(), icon: "/Content/images/icon-menu/" + iconPath[key] });
                    }
                    if (/language/i.test(w.t) && langX == null) langX = lx;
                    if (/^local$/i.test(w.t.replace(/[^A-Za-z]/g, "")) && langStart == null) langStart = lx;
                });
                var top0 = (pop.toolbarTop - pop.hy0) + 1;
                if (items.length) extra.push({ id: tmpIdX("toolbar"), type: "toolbar", left: Math.max(2, Math.round(firstX - 26)), top: top0, parentId: popup.id, dock: "popup", showBackground: false, items: items });
                if (langX != null) {   // "Language combo" chuẩn của Builder, đặt ngang hàng toolbar (top âm = vào vùng thanh xám phía trên thân popup)
                    extra.push({ id: tmpIdX("fld_language"), type: "field", ftype: "language", uiMode: "core", caption: "Local Data Language", required: false, disabled: false, defaultValue: "", items: [], multiselectColumns: [], multiselectItems: [], multiselectSelectedValues: [], labelWidth: 130, captionBold: false, captionItalic: false, captionPosition: "left", tabPageId: null, tabIndex: null, zIndex: 1, parentId: popup.id, left: Math.max(2, Math.min(langStart != null ? Math.round(langStart - 5) : 1e9, Math.round(popW - 221))), top: -(popup.titleLineHeight) + 3, width: 215, height: 24 });
                }
            }
            return imp.makePage(body, scale, progress, src, { inPopup: true });
        }).then(function (made) {
            var ids = {}; made.forEach(function (m) { ids[m.id] = 1; });
            var contentBottom = 0;
            made.forEach(function (m) {
                if (m.parentId && ids[m.parentId]) return;
                contentBottom = Math.max(contentBottom, (m.top || 0) + (m.type === "grid" || m.type === "ess-grid" ? gridRenderHeight(m) : (m.height || 0)));
            });
            if (contentBottom > bodyH) popup.height += Math.round(contentBottom - bodyH);
            // thanh cuộn ngang / vệt đáy popup (dải mảnh rộng nằm dưới mọi control) không phải control → bỏ
            var byId = {}; made.forEach(function (m) { byId[m.id] = m; });
            function absTop(m) { var y = m.top || 0, q = byId[m.parentId]; while (q) { y += q.top || 0; q = byId[q.parentId]; } return y; }
            var lastReal = 0;
            made.forEach(function (m) { if (m.type === "field" && m.ftype !== "image" && m.ftype !== "groupbox") lastReal = Math.max(lastReal, absTop(m) + (m.height || 0)); });
            var dropIds = {};
            made.forEach(function (m) { if (m.type === "field" && m.ftype === "image" && (m.height || 0) <= 16 && (m.width || 0) >= 0.4 * popW && absTop(m) >= lastReal - 2) dropIds[m.id] = 1; });
            made = made.filter(function (m) { return !dropIds[m.id]; });
            var again = true;   // nhóm rỗng còn sót sau khi bỏ ảnh → bỏ luôn
            while (again) {
                again = false;
                var used = {}; made.forEach(function (m) { if (m.parentId) used[m.parentId] = 1; });
                var before = made.length;
                made = made.filter(function (m) { return !(m.type === "field" && m.ftype === "groupbox" && !m.caption && !used[m.id]); });
                if (made.length !== before) again = true;
            }
            var ids2 = {}; made.forEach(function (m) { ids2[m.id] = 1; });
            made.forEach(function (m) { if (!m.parentId || !ids2[m.parentId]) m.parentId = popup.id; });
            return [popup].concat(extra, made);
        });
    };

    window.builderImport = imp;
})(window, jQuery);
