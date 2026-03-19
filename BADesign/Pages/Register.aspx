<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Register.aspx.cs" Inherits="BADesign.Pages.Register" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>Đăng ký - HR Helper</title>
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/login.css?v=1.0.0.1") %>" />
    <style>
        .register-link { margin-top: 16px; text-align: center; font-size: 13px; color: #7a7c88; }
        .register-link a { color: rgba(10, 117, 186, 1); text-decoration: none; }
        .register-link a:hover { text-decoration: underline; }
        .btn-register { background: rgba(10, 117, 186, 1) !important; color: #fff; width: 100%; padding: 11px 16px; border-radius: 3px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s; }
        .btn-register:hover:not(:disabled) { opacity: 0.95; }
        .btn-register:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-register .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        #lblRegisterError { display: none; margin-bottom: 12px; color: #d93025; font-size: 13px; }
        #lblRegisterSuccess { display: none; margin-bottom: 12px; color: #10b981; font-size: 13px; }
        .captcha-box { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #f0f2f5; border-radius: 4px; font-size: 14px; }
        .captcha-box input { width: 80px; text-align: center; }
        .field-status.ok { color: #10b981; }
        .field-status.err { color: #d93025; }
        .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.85); z-index: 9999; display: none; align-items: center; justify-content: center; }
        .loading-overlay.active { display: flex; }
        .loading-overlay .spinner-full { width: 48px; height: 48px; border: 4px solid rgba(10, 117, 186, 0.2); border-top-color: rgba(10, 117, 186, 1); border-radius: 50%; animation: spin 0.8s linear infinite; }
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
                    <h1 class="login-title">Đăng ký tài khoản</h1>
                    <p class="login-subtitle">
                        Tạo tài khoản mới để sử dụng Cadena Helper. Thông tin đăng nhập sẽ được gửi vào email của bạn.
                    </p>

                    <div id="lblRegisterError" class="login-error"></div>
                    <div id="lblRegisterSuccess" class="login-error" style="color:#10b981;"></div>

                    <div class="form-group">
                        <label for="txtUserName">Username (*)</label>
                        <input type="text" id="txtUserName" class="login-input" placeholder="username" maxlength="128" autocomplete="username" />
                        <span id="userNameStatus" class="field-status" style="display:none; font-size:12px; margin-top:4px;"></span>
                    </div>
                    <div class="form-group">
                        <label for="txtEmail">Email (*)</label>
                        <input type="email" id="txtEmail" class="login-input" placeholder="email@cadena.com.sg" maxlength="256" autocomplete="email" />
                        <span id="emailStatus" class="field-status" style="display:none; font-size:12px; margin-top:4px;"></span>
                    </div>
                    <div class="form-group">
                        <label for="ddlRole">Phòng ban (*)</label>
                        <select id="ddlRole" class="login-input">
                            <option value="">-- Chọn phòng ban --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="txtPassword">Password (*)</label>
                        <input type="password" id="txtPassword" class="login-input" placeholder="Mật khẩu (tối thiểu 6 ký tự)" maxlength="128" autocomplete="new-password" />
                    </div>
                    <div class="form-group">
                        <label for="txtConfirmPassword">Xác nhận password (*)</label>
                        <input type="password" id="txtConfirmPassword" class="login-input" placeholder="Nhập lại mật khẩu" maxlength="128" autocomplete="new-password" />
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
                        <button type="button" id="btnRegister" class="btn-register">
                            <span class="btn-text">Đăng ký</span>
                            <span class="spinner" style="display:none;"></span>
                        </button>
                        <a href="<%= ResolveUrl("~/Login") %>" class="btn-guest" style="margin-top: 10px; text-align: center; display: block; text-decoration: none;">Đã có tài khoản? Đăng nhập</a>
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

            (function loadRoles() {
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/Register.aspx/LoadRoles") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: '{}',
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success && d.roles) {
                        var $sel = $('#ddlRole');
                        $sel.find('option:not(:first)').remove();
                        $.each(d.roles, function (i, item) {
                            $sel.append($('<option></option>').val(item.id).text(item.name));
                        });
                    }
                });
            })();

            var checkTimeout = null;
            function checkAvailability() {
                var u = ($('#txtUserName').val() || '').trim();
                var e = ($('#txtEmail').val() || '').trim().toLowerCase();
                if (!u && !e) {
                    $('#userNameStatus, #emailStatus').hide();
                    return;
                }
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/Register.aspx/CheckAvailability") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ userName: u, email: e }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        if (u) {
                            var $us = $('#userNameStatus');
                            $us.removeClass('ok err').addClass(d.userNameAvailable ? 'ok' : 'err');
                            $us.text(d.userNameAvailable ? '✓ Username có thể sử dụng' : '✗ Username đã tồn tại').show();
                        }
                        if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
                            var $es = $('#emailStatus');
                            $es.removeClass('ok err').addClass(d.emailAvailable ? 'ok' : 'err');
                            $es.text(d.emailAvailable ? '✓ Email có thể sử dụng' : '✗ Email đã được sử dụng').show();
                        }
                    }
                });
            }
            $('#txtUserName, #txtEmail').on('blur', function () {
                clearTimeout(checkTimeout);
                checkTimeout = setTimeout(checkAvailability, 400);
            });

            function showError(msg) {
                $('#lblRegisterError').text(msg || '').show();
                $('#lblRegisterSuccess').hide();
            }
            function showSuccess(msg) {
                $('#lblRegisterSuccess').text(msg || '').show();
                $('#lblRegisterError').hide();
            }
            function hideMessages() {
                $('#lblRegisterError, #lblRegisterSuccess').hide();
            }
            function setLoading(on) {
                var $overlay = $('#loadingOverlay');
                var $btn = $('#btnRegister');
                $btn.prop('disabled', on);
                if (on) {
                    $overlay.addClass('active');
                } else {
                    $overlay.removeClass('active');
                }
            }

            $('#btnRegister').on('click', function () {
                var userName = ($('#txtUserName').val() || '').trim();
                var email = ($('#txtEmail').val() || '').trim().toLowerCase();
                var password = $('#txtPassword').val();
                var confirmPassword = $('#txtConfirmPassword').val();
                var captchaVal = parseInt($('#txtCaptcha').val(), 10);

                hideMessages();
                if (!userName) {
                    showError('Vui lòng nhập Username.');
                    return;
                }
                if (!email) {
                    showError('Vui lòng nhập Email.');
                    return;
                }
                var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRe.test(email)) {
                    showError('Email không đúng định dạng.');
                    return;
                }
                if (!password) {
                    showError('Vui lòng nhập Password.');
                    return;
                }
                if (password.length < 6) {
                    showError('Password tối thiểu 6 ký tự.');
                    return;
                }
                if (password !== confirmPassword) {
                    showError('Xác nhận password không khớp.');
                    return;
                }
                var roleId = $('#ddlRole').val();
                if (!roleId) {
                    showError('Vui lòng chọn Phòng ban.');
                    return;
                }
                if (captchaVal !== captchaA + captchaB) {
                    showError('Sai kết quả xác thực. Vui lòng thử lại.');
                    refreshCaptcha();
                    return;
                }

                setLoading(true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/Register.aspx/SubmitRegister") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ userName: userName, email: email, password: password, roleId: parseInt(roleId, 10), captchaA: captchaA, captchaB: captchaB }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        setLoading(false);
                        $('#txtUserName, #txtEmail, #txtPassword, #txtConfirmPassword, #txtCaptcha').val('');
                        $('#ddlRole').val($('#ddlRole option:first').val());
                        $('#userNameStatus, #emailStatus').hide();
                        refreshCaptcha();
                        showSuccess('Đăng ký thành công! Vui lòng kiểm tra email để lấy thông tin đăng nhập và đăng nhập vào hệ thống.');
                    } else {
                        showError(d && d.message ? d.message : 'Đăng ký thất bại.');
                        setLoading(false);
                        refreshCaptcha();
                    }
                }).fail(function (xhr) {
                    var msg = 'Lỗi khi đăng ký.';
                    try {
                        var j = xhr.responseJSON && (xhr.responseJSON.d || xhr.responseJSON);
                        if (j && j.message) msg = j.message;
                    } catch (e) {}
                    showError(msg);
                    setLoading(false);
                    refreshCaptcha();
                });
            });
        })();
    </script>
</body>
</html>
