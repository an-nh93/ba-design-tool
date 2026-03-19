<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="ForgotPassword.aspx.cs" Inherits="BADesign.Pages.ForgotPassword" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>Quên mật khẩu - HR Helper</title>
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/login.css?v=1.0.0.1") %>" />
    <style>
        .btn-submit { background: rgba(10, 117, 186, 1) !important; color: #fff; width: 100%; padding: 11px 16px; border-radius: 3px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s; }
        .btn-submit:hover:not(:disabled) { opacity: 0.95; }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-submit .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        #lblForgotError { display: none; margin-bottom: 12px; color: #d93025; font-size: 13px; }
        #lblForgotSuccess { display: none; margin-bottom: 12px; color: #10b981; font-size: 13px; }
        .captcha-box { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #f0f2f5; border-radius: 4px; font-size: 14px; }
        .captcha-box input { width: 80px; text-align: center; }
        .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.85); z-index: 9999; display: none; align-items: center; justify-content: center; }
        .loading-overlay.active { display: flex; }
        .loading-overlay .spinner-full { width: 48px; height: 48px; border: 4px solid rgba(10, 117, 186, 0.2); border-top-color: rgba(10, 117, 186, 1); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body class="login-body">
    <form id="form1" runat="server">
        <div id="loadingOverlay" class="loading-overlay">
            <div class="spinner-full"></div>
        </div>
        <div class="login-wrapper">
            <div class="login-left">
                <div class="login-content">
                    <h1 class="login-title">Quên mật khẩu</h1>
                    <p class="login-subtitle">
                        Nhập Username hoặc Email đã đăng ký. Hệ thống sẽ gửi link đặt lại mật khẩu tới email của tài khoản. Link có hiệu lực <strong>1 giờ</strong> – vui lòng sử dụng ngay hoặc yêu cầu link mới nếu đã hết hạn. Chỉ được yêu cầu gửi lại sau <strong>10 phút</strong>.
                    </p>

                    <div id="lblForgotError" class="login-error"></div>
                    <div id="lblForgotSuccess" class="login-error" style="color:#10b981;"></div>

                    <div class="form-group">
                        <label for="txtUserOrEmail">Username hoặc Email (*)</label>
                        <input type="text" id="txtUserOrEmail" class="login-input" placeholder="username hoặc email@cadena.com.sg" maxlength="256" autocomplete="username" />
                    </div>

                    <div class="form-group">
                        <label>Xác thực (Captcha)</label>
                        <div class="captcha-box">
                            <span id="captchaQuestion"></span>
                            <input type="number" id="txtCaptcha" class="login-input" placeholder="?" />
                            <button type="button" id="btnRefreshCaptcha" title="Làm mới">↻</button>
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 8px;">
                        <button type="button" id="btnSubmit" class="btn-submit">
                            <span class="btn-text">Gửi email đặt lại mật khẩu</span>
                            <span class="spinner" style="display:none;"></span>
                        </button>
                        <a href="<%= ResolveUrl("~/Login") %>" class="btn-guest" style="margin-top: 10px; text-align: center; display: block; text-decoration: none;">← Quay lại đăng nhập</a>
                    </div>
                </div>
            </div>
            <div class="login-right">
                <div class="login-image-overlay"></div>
            </div>
        </div>
    </form>
    <script src="<%= ResolveUrl("~/Scripts/jquery-1.10.2.min.js") %>"></script>
    <script>
        (function () {
            var captchaA = 0, captchaB = 0;
            function refreshCaptcha() {
                captchaA = Math.floor(Math.random() * 9) + 1;
                captchaB = Math.floor(Math.random() * 9) + 1;
                $('#captchaQuestion').text(captchaA + ' + ' + captchaB + ' = ');
                $('#txtCaptcha').val('');
            }
            refreshCaptcha();
            $('#btnRefreshCaptcha').on('click', refreshCaptcha);

            function showError(msg) {
                $('#lblForgotError').text(msg || '').show();
                $('#lblForgotSuccess').hide();
            }
            function showSuccess(msg) {
                $('#lblForgotSuccess').text(msg || '').show();
                $('#lblForgotError').hide();
            }
            function setLoading(on) {
                var $overlay = $('#loadingOverlay');
                var $btn = $('#btnSubmit');
                $btn.prop('disabled', on);
                if (on) {
                    $overlay.addClass('active');
                } else {
                    $overlay.removeClass('active');
                }
            }

            var COOLDOWN_KEY = 'forgotPwdCooldownEnd';
            var COOLDOWN_MIN = 10;
            var cooldownTimer = null;

            function startCooldown() {
                var endAt = Date.now() + COOLDOWN_MIN * 60 * 1000;
                try { sessionStorage.setItem(COOLDOWN_KEY, endAt); } catch (e) {}
                updateCooldownUi();
            }
            function updateCooldownUi() {
                var endAt;
                try { endAt = parseInt(sessionStorage.getItem(COOLDOWN_KEY), 10); } catch (e) { endAt = 0; }
                var $btn = $('#btnSubmit');
                var now = Date.now();
                if (endAt && now < endAt) {
                    var secLeft = Math.ceil((endAt - now) / 1000);
                    var min = Math.floor(secLeft / 60);
                    var sec = secLeft % 60;
                    $btn.prop('disabled', true);
                    $btn.find('.btn-text').text('Đợi ' + min + ':' + (sec < 10 ? '0' : '') + sec + ' trước khi yêu cầu lại');
                    cooldownTimer = setTimeout(updateCooldownUi, 1000);
                } else {
                    try { sessionStorage.removeItem(COOLDOWN_KEY); } catch (e) {}
                    $btn.prop('disabled', false);
                    $btn.find('.btn-text').text('Gửi email đặt lại mật khẩu');
                    if (cooldownTimer) clearTimeout(cooldownTimer);
                }
            }
            updateCooldownUi();

            $('#btnSubmit').on('click', function () {
                var $btn = $('#btnSubmit');
                if ($btn.prop('disabled')) return;
                var input = ($('#txtUserOrEmail').val() || '').trim();
                var captchaVal = parseInt($('#txtCaptcha').val(), 10);

                if (!input) {
                    showError('Vui lòng nhập Username hoặc Email.');
                    return;
                }
                if (captchaVal !== captchaA + captchaB) {
                    showError('Sai kết quả xác thực. Vui lòng thử lại.');
                    refreshCaptcha();
                    return;
                }

                setLoading(true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/ForgotPassword.aspx/RequestReset") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ userOrEmail: input, captchaA: captchaA, captchaB: captchaB }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        $('#txtUserOrEmail').val('');
                        refreshCaptcha();
                        startCooldown();
                        showSuccess('Đã gửi email hướng dẫn đặt lại mật khẩu. Link có hiệu lực 1 giờ – vui lòng kiểm tra hộp thư (và thư mục Spam) và sử dụng ngay. Có thể yêu cầu lại sau 10 phút.');
                        setLoading(false);
                    } else {
                        refreshCaptcha();
                        showError(d && d.message ? d.message : 'Yêu cầu thất bại.');
                        setLoading(false);
                    }
                }).fail(function (xhr) {
                    var msg = 'Lỗi khi gửi yêu cầu.';
                    try {
                        var j = xhr.responseJSON && (xhr.responseJSON.d || xhr.responseJSON);
                        if (j && j.message) msg = j.message;
                    } catch (e) {}
                    refreshCaptcha();
                    showError(msg);
                    setLoading(false);
                });
            });
        })();
    </script>
</body>
</html>
