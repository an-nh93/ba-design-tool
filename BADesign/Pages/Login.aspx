<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Login.aspx.cs" Inherits="UiBuilderFull.Login" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>UI Builder - Login</title>
    <%-- dùng ResolveUrl để chạy đúng cả khi host ảo --%>
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/login.css?v=1.0.0.1") %>" />
</head>
<body class="login-body">
    <form id="form1" runat="server">
        <asp:ScriptManager ID="sm1" runat="server" EnablePageMethods="true" />
        <div class="login-wrapper">
            <!-- Cột trái: form -->
            <div class="login-left">
                <div class="login-content">
                    <!-- Panel đăng nhập thường -->
                    <asp:Panel runat="server" ID="phLoginPanel">
                        <h1 class="login-title">Login to UI Builder</h1>
                        <p class="login-subtitle">
                            Nhập thông tin tài khoản để tiếp tục sử dụng UI Builder.
                        </p>

                        <asp:PlaceHolder runat="server" ID="phSuccess" Visible="false">
                            <div class="login-error" style="color:#10b981; margin-bottom:12px;">Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.</div>
                        </asp:PlaceHolder>
                        <asp:Label runat="server" ID="lblError"
                                   CssClass="login-error"
                                   EnableViewState="false" />

                        <div class="form-group">
                            <label for="<%= txtUser.ClientID %>">Email hoặc Username</label>
                            <asp:TextBox runat="server"
                                         ID="txtUser"
                                         CssClass="login-input"
                                         placeholder="email@cadena.com.sg" />
                        </div>

                        <div class="form-group">
                            <label for="<%= txtPass.ClientID %>">Password</label>
                            <asp:TextBox runat="server"
                                         ID="txtPass"
                                         CssClass="login-input"
                                         TextMode="Password"
                                         placeholder="Your password" />
                        </div>

                        <div class="login-extra">
                            <label class="remember-me">
                                <asp:CheckBox runat="server" ID="chkRemember" />
                                <span>Remember me (30 day)</span>
                            </label>
                            <a href="<%= ResolveUrl("~/ForgotPassword") %>" class="forgot-link">Forgot password</a>
                        </div>

                        <div class="form-actions">
                            <asp:Button runat="server"
                                        ID="btnLogin"
                                        Text="Log in"
                                        CssClass="btn-login"
                                        OnClick="btnLogin_Click" />
                            <div class="register-link" style="margin-top: 12px;">
                                Chưa có tài khoản? <a href="<%= ResolveUrl("~/Register") %>">Đăng ký</a>
                            </div>
                        </div>
                    </asp:Panel>

                    <!-- Panel nhập OTP xác thực email (lần đầu đăng nhập sau khi đăng ký) -->
                    <asp:Panel runat="server" ID="phOtpPanel" Visible="false">
                        <h1 class="login-title">Xác thực email</h1>
                        <p class="login-subtitle">
                            Tài khoản chưa xác thực email. Vui lòng nhập mã OTP 6 số đã gửi vào email của bạn (có hiệu lực 60 phút).
                        </p>
                        <div id="otpError" class="login-error" style="display:none;"></div>
                        <div class="form-group">
                            <label for="txtOtp">Mã OTP (6 số)</label>
                            <input type="text" id="txtOtp" class="login-input" placeholder="000000" maxlength="6" pattern="[0-9]*" inputmode="numeric" autocomplete="one-time-code" />
                        </div>
                        <div class="form-group">
                            <label>Xác thực (Captcha)</label>
                            <div class="captcha-box" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f0f2f5;border-radius:4px;">
                                <span id="otpCaptchaQuestion"></span>
                                <input type="number" id="txtOtpCaptcha" class="login-input" placeholder="?" style="width:80px;text-align:center;" />
                                <button type="button" id="btnOtpRefreshCaptcha" title="Làm mới">↻</button>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="btnVerifyOtp" class="btn-login" style="width:100%;">Xác thực</button>
                            <a href="<%= ResolveUrl("~/Login?clearOtp=1") %>" class="btn-guest" style="margin-top:10px;text-align:center;display:block;text-decoration:none;">← Quay lại đăng nhập</a>
                        </div>
                    </asp:Panel>
                </div>
            </div>

            <!-- Cột phải: hình ảnh -->
            <div class="login-right">
                <div class="login-image-overlay"></div>
            </div>
        </div>
    </form>
    <script src="<%= ResolveUrl("~/Scripts/jquery-1.10.2.min.js") %>"></script>
    <script>
        (function () {
            var otpCaptchaA = 0, otpCaptchaB = 0;
            function refreshOtpCaptcha() {
                otpCaptchaA = Math.floor(Math.random() * 9) + 1;
                otpCaptchaB = Math.floor(Math.random() * 9) + 1;
                $('#otpCaptchaQuestion').text(otpCaptchaA + ' + ' + otpCaptchaB + ' = ');
                $('#txtOtpCaptcha').val('');
            }
            $('#btnOtpRefreshCaptcha').on('click', refreshOtpCaptcha);
            if ($('#txtOtp').length) refreshOtpCaptcha();

            $('#btnVerifyOtp').on('click', function () {
                var otp = ($('#txtOtp').val() || '').trim();
                var captchaVal = parseInt($('#txtOtpCaptcha').val(), 10);
                if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
                    $('#otpError').text('Vui lòng nhập đúng mã OTP 6 số.').show();
                    return;
                }
                if (isNaN(captchaVal) || captchaVal !== otpCaptchaA + otpCaptchaB) {
                    $('#otpError').text('Sai kết quả xác thực (Captcha). Vui lòng thử lại.').show();
                    refreshOtpCaptcha();
                    return;
                }
                $('#otpError').hide();
                var $btn = $('#btnVerifyOtp');
                $btn.prop('disabled', true);
                $.ajax({
                    url: '<%= ResolveUrl("~/Pages/Login.aspx/VerifyOtp") %>',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({ otp: otp, captchaA: otpCaptchaA, captchaB: otpCaptchaB }),
                    dataType: 'json'
                }).done(function (r) {
                    var d = (typeof r.d !== 'undefined') ? r.d : r;
                    if (d && d.success) {
                        window.location.href = (d.returnUrl && d.returnUrl.length) ? d.returnUrl : d.homeUrl;
                    } else {
                        $('#otpError').text(d && d.message ? d.message : 'Xác thực thất bại.').show();
                        refreshOtpCaptcha();
                        $btn.prop('disabled', false);
                    }
                }).fail(function (xhr) {
                    var msg = 'Lỗi khi xác thực.';
                    try {
                        var j = xhr.responseJSON && (xhr.responseJSON.d || xhr.responseJSON);
                        if (j && j.message) msg = j.message;
                    } catch (e) {}
                    $('#otpError').text(msg).show();
                    refreshOtpCaptcha();
                    $btn.prop('disabled', false);
                });
            });
        })();
    </script>
</body>
</html>
