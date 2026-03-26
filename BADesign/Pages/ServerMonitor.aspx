<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="ServerMonitor.aspx.cs"
    Inherits="BADesign.Pages.ServerMonitor" %>
<%@ Register Src="~/BaSidebar.ascx" TagName="BaSidebar" TagPrefix="uc" %>
<%@ Register Src="~/BaTopBar.ascx" TagName="BaTopBar" TagPrefix="uc" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>Server monitor - HR Helper</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/ba-layout.css" rel="stylesheet" />
    <link href="../Content/ba-notification-bell.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/jquery.signalR.min.js"></script>
    <script src="../Scripts/ba-signalr.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/ba-layout.js"></script>
    <style>
        .ba-content { padding: 0.75rem 1rem 2rem; max-width: 1200px; }
        .ba-monitor-intro {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 1rem;
            line-height: 1.5;
        }
        .ba-metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 1rem;
            margin-bottom: 1.25rem;
        }
        .ba-metric-group {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 0.85rem 0.95rem 0.25rem;
            margin-bottom: 1rem;
        }
        .ba-metric-group-title {
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--text-secondary);
            margin-bottom: 0.8rem;
        }
        .ba-metric-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1rem 1.1rem;
            position: relative;
        }
        .ba-metric-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.35rem; }
        .ba-metric-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); word-break: break-word; }
        .ba-metric-sub { font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.35rem; }
        .ba-metric-info-btn {
            position: absolute;
            top: 0.6rem;
            right: 0.6rem;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid var(--border);
            background: var(--bg-hover);
            color: var(--text-secondary);
            font-size: 0.75rem;
            cursor: pointer;
            line-height: 18px;
            text-align: center;
            padding: 0;
        }
        .ba-metric-info-btn:hover { border-color: var(--primary); color: var(--primary); }
        .ba-metric-info-pop {
            position: absolute;
            left: 0.6rem;
            right: 0.6rem;
            top: 2.25rem;
            width: auto;
            max-height: 220px;
            overflow-y: auto;
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.65rem 0.75rem;
            font-size: 0.78rem;
            color: var(--text-primary);
            line-height: 1.45;
            display: none;
            z-index: 50;
            box-shadow: 0 8px 22px rgba(0,0,0,0.3);
            text-transform: none;
            letter-spacing: normal;
        }
        .ba-metric-info-pop.show { display: block; }
        .ba-metrics-grid, .ba-metric-card { overflow: visible; }
        .ba-card-block {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1rem 1.25rem;
            margin-bottom: 1rem;
        }
        .ba-card-block h2 { font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem; color: var(--text-primary); }
        .ba-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .ba-btn {
            padding: 0.45rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
        }
        .ba-btn-primary { background: var(--primary); color: #fff; }
        .ba-btn-primary:hover { filter: brightness(1.05); }
        .ba-checkbox { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.875rem; color: var(--text-secondary); }
        .ba-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; }
        .ba-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .ba-table th, .ba-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
        .ba-table thead th { background: var(--bg-darker); color: var(--text-secondary); font-weight: 600; }
        .ba-err-box { color: #b91c1c; font-size: 0.875rem; }
        .ba-muted { color: var(--text-muted); font-size: 0.8rem; }
    </style>
</head>
<body class="ba-body">
    <form id="form1" runat="server">
        <uc:BaSidebar ID="ucBaSidebar" runat="server" />
        <main class="ba-main">
            <uc:BaTopBar ID="ucBaTopBar" runat="server" />
            <div class="ba-content">
                <h1 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Giám sát tài nguyên máy chủ</h1>
                <p class="ba-monitor-intro">
                    Số liệu phản ánh <strong>máy đang chạy ứng dụng web</strong> (IIS / App Pool).
                    CPU/RAM process = tiến trình hiện tại (thường là w3wp/iisexpress) và <strong>BADesign.Worker</strong>.
                    Mạng: tốc độ ước lượng giữa hai lần làm mới.
                </p>
                <div class="ba-toolbar">
                    <button type="button" class="ba-btn ba-btn-primary" id="btnRefresh">Làm mới ngay</button>
                    <label class="ba-checkbox"><input type="checkbox" id="chkAuto" checked="checked" /> Tự làm mới mỗi 5 giây</label>
                    <span class="ba-muted" id="lastUpdate">—</span>
                </div>
                <div id="loadErr" class="ba-err-box" style="display:none;"></div>
                <div class="ba-metric-group">
                    <div class="ba-metric-group-title">máy hosting</div>
                    <div class="ba-metrics-grid" id="metricHost"></div>
                </div>
                <div class="ba-metric-group">
                    <div class="ba-metric-group-title">IIS / App Pool</div>
                    <div class="ba-metrics-grid" id="metricIis"></div>
                </div>
                <div class="ba-metric-group">
                    <div class="ba-metric-group-title">BADesign.Worker.exe</div>
                    <div class="ba-metrics-grid" id="metricWorker"></div>
                </div>
                <div class="ba-card-block">
                    <h2>Network interfaces (tích lũy từ khi boot)</h2>
                    <div class="ba-table-wrap">
                        <table class="ba-table" id="tblNet">
                            <thead>
                                <tr><th>Tên</th><th>Trạng thái</th><th>Gửi (MB)</th><th>Nhận (MB)</th><th>Speed</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </form>
    <script>
        (function () {
            var metricsUrl = '<%= ResolveUrl("~/Pages/ServerMonitor.aspx/GetMetrics") %>';
            var pollTimer = null;

            function fmtNum(v, d) {
                if (v == null || v === '') return '—';
                if (typeof v === 'number' && !isNaN(v)) return d != null ? v.toFixed(d) : String(v);
                return String(v);
            }

            function fmtBytesPerSec(n) {
                if (n == null || n === '' || isNaN(n)) return '—';
                n = Number(n);
                if (n < 1024) return n.toFixed(0) + ' B/s';
                if (n < 1048576) return (n / 1024).toFixed(1) + ' KB/s';
                return (n / 1048576).toFixed(2) + ' MB/s';
            }

            function render(d) {
                $('#loadErr').hide();
                if (!d || d.success === false) {
                    $('#loadErr').text((d && d.message) || 'Lỗi tải dữ liệu.').show();
                    return;
                }
                var hostCards = [
                    {
                        label: 'CPU (máy)',
                        value: d.cpuMachinePercent != null ? (fmtNum(d.cpuMachinePercent, 1) + ' %') : '—',
                        sub: d.cpuMachineNote || '',
                        help: 'Phần trăm CPU tổng của toàn máy host web (mọi process), không chỉ IIS.'
                    },
                    {
                        label: 'RAM máy đã dùng',
                        value: d.ramUsedPercent != null ? (fmtNum(d.ramUsedPercent, 1) + ' %') : '—',
                        sub: 'Còn trống ~' + fmtNum(d.ramAvailableMb, 0) + ' MB / ' + fmtNum(d.ramTotalMb, 0) + ' MB',
                        help: 'Tỷ lệ RAM đã dùng của toàn bộ máy host. Cao liên tục có thể gây swap/chậm hệ thống.'
                    },
                    {
                        label: 'Mạng (ước lượng)',
                        value: fmtBytesPerSec(d.networkBytesPerSec),
                        sub: 'Lần đầu có thể 0; các lần sau: tốc độ tổng qua các NIC',
                        help: 'Thông lượng mạng ước lượng theo chênh lệch bytes giữa hai lần refresh. Không phải giá trị realtime tức thời tuyệt đối.'
                    }
                ];

                var iisCards = [
                    {
                        label: 'CPU (process app)',
                        value: fmtNum(d.cpuProcessPercent, 1) + ' %',
                        sub: (d.processName || '') + ' (PID ' + (d.processId || '—') + ')',
                        help: 'CPU của process web hiện tại (thường w3wp hoặc iisexpress). Khi user truy cập/tác vụ nặng, chỉ số này sẽ tăng.'
                    },
                    {
                        label: 'RAM process (WS)',
                        value: fmtNum(d.processWorkingSetMb, 1) + ' MB',
                        sub: 'Private ~' + fmtNum(d.processPrivateMb, 1) + ' MB',
                        help: 'Working Set của process web: bộ nhớ vật lý đang giữ. Private là vùng nhớ riêng của process.'
                    }
                ];

                var workerCards = [
                    {
                        label: 'CPU (BADesign.Worker)',
                        value: (d.worker && d.worker.isRunning) ? (fmtNum(d.worker.cpuPercent, 1) + ' %') : '—',
                        sub: (d.worker && d.worker.isRunning)
                            ? ((d.worker.processName || 'BADesign.Worker') + ' (PID ' + (d.worker.processId || '—') + ')'
                                + (d.worker.cpuSource ? (' · CPU source: ' + d.worker.cpuSource) : '')
                                + (d.worker.permissionHint ? (' · ' + d.worker.permissionHint) : '')
                                + (d.worker.cpuWmiError ? (' · cpuWmiError: ' + d.worker.cpuWmiError) : '')
                                + (d.worker.cpuError ? (' · cpuError: ' + d.worker.cpuError) : ''))
                            : ((d.worker && d.worker.message) ? d.worker.message : 'Worker chưa chạy'),
                        help: 'CPU của tiến trình BADesign.Worker (Windows Service). Đây là chỉ số bạn cần để biết worker chạy nặng hay nhẹ.'
                    },
                    {
                        label: 'RAM (BADesign.Worker)',
                        value: (d.worker && d.worker.isRunning) ? (fmtNum(d.worker.workingSetMb, 1) + ' MB') : '—',
                        sub: (d.worker && d.worker.isRunning)
                            ? ('Private ~' + fmtNum(d.worker.privateMb, 1) + ' MB')
                            : 'Worker chưa chạy / chưa nhận diện được process',
                        help: 'RAM của tiến trình BADesign.Worker. Theo dõi chỉ số này để biết worker có leak bộ nhớ hay không.'
                    },
                    {
                        label: 'Đường dẫn tiến trình',
                        value: (d.worker && (d.worker.exePath || d.worker.configuredExePath)) ? (d.worker.exePath || d.worker.configuredExePath) : '—',
                        sub: (d.worker && d.worker.pathWarning) ? d.worker.pathWarning : '',
                        help: 'Đường dẫn exe thực tế mà monitor đang bắt được. Nếu khác WorkerExePath thì config có thể đang cũ/sai path.'
                    }
                ];

                function renderCards(cards) {
                    var h = '';
                    cards.forEach(function (c) {
                        h += '<div class="ba-metric-card">';
                        h += '<button type="button" class="ba-metric-info-btn" title="Xem ý nghĩa chỉ số">i</button>';
                        h += '<div class="ba-metric-info-pop">' + $('<div/>').text(c.help || '').html() + '</div>';
                        h += '<div class="ba-metric-label">' + $('<div/>').text(c.label).html() + '</div>';
                        h += '<div class="ba-metric-value">' + $('<div/>').text(c.value).html() + '</div>';
                        if (c.sub) h += '<div class="ba-metric-sub">' + $('<div/>').text(c.sub).html() + '</div>';
                        h += '</div>';
                    });
                    return h;
                }

                $('#metricHost').html(renderCards(hostCards));
                $('#metricIis').html(renderCards(iisCards));
                $('#metricWorker').html(renderCards(workerCards));

                var tbody = $('#tblNet tbody').empty();
                var nics = d.networkInterfaces || [];
                if (!nics.length) {
                    tbody.append('<tr><td colspan="5">Không đọc được danh sách NIC.</td></tr>');
                } else {
                    nics.forEach(function (n) {
                        var tr = $('<tr/>');
                        tr.append($('<td/>').text(n.name || ''));
                        tr.append($('<td/>').text(n.operationalStatus || ''));
                        tr.append($('<td/>').text(fmtNum(n.bytesSentMb, 2)));
                        tr.append($('<td/>').text(fmtNum(n.bytesReceivedMb, 2)));
                        var sp = n.speedMbps != null ? (fmtNum(n.speedMbps, 0) + ' Mbps') : '—';
                        tr.append($('<td/>').text(sp));
                        tbody.append(tr);
                    });
                }

                $('#lastUpdate').text('Cập nhật: ' + (d.collectTimeUtc || '') + ' UTC · ' + (d.machineName || '') + ' · ' + (d.processorCount || '') + ' CPU');
            }

            function loadMetrics() {
                $.ajax({
                    type: 'POST',
                    url: metricsUrl,
                    data: JSON.stringify({}),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: function (r) {
                        var d = r.d || r;
                        render(d);
                    },
                    error: function (x, st) {
                        $('#loadErr').text(st || 'Lỗi kết nối').show();
                    }
                });
            }

            $('#btnRefresh').on('click', loadMetrics);
            $(document).on('click', '.ba-metric-info-btn', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $pop = $(this).siblings('.ba-metric-info-pop');
                var isOpen = $pop.hasClass('show');
                $('.ba-metric-info-pop').removeClass('show');
                if (!isOpen) $pop.addClass('show');
            });
            $(document).on('click', function () {
                $('.ba-metric-info-pop').removeClass('show');
            });
            $(document).on('click', '.ba-metric-info-pop', function (e) {
                e.stopPropagation();
            });
            $('#chkAuto').on('change', function () {
                if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
                if ($(this).is(':checked')) pollTimer = setInterval(loadMetrics, 5000);
            });

            loadMetrics();
            pollTimer = setInterval(loadMetrics, 5000);
        })();
    </script>
</body>
</html>
