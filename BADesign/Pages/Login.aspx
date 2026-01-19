<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Login.aspx.cs" Inherits="UiBuilderFull.Login" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>UI Builder - Login</title>
    <%-- dùng ResolveUrl để chạy đúng cả khi host ảo --%>
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/login.css") %>" />
</head>
<body class="login-body">
    <form id="form1" runat="server">
        <div class="login-wrapper">
            <!-- Cột trái: form -->
            <div class="login-left">
                <div class="login-content">
                    <h1 class="login-title">Login to UI Builder</h1>
                    <p class="login-subtitle">
                        Nhập thông tin tài khoản để tiếp tục sử dụng UI Builder.
                    </p>

                    <asp:Label runat="server" ID="lblError"
                               CssClass="login-error"
                               EnableViewState="false" />

                    <div class="form-group">
                        <label for="<%= txtUser.ClientID %>">Username</label>
                        <asp:TextBox runat="server"
                                     ID="txtUser"
                                     CssClass="login-input"
                                     placeholder="your-email@company.com" />
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
                            <input type="checkbox" />
                            <span>Remember me</span>
                        </label>
                        <a href="#" class="forgot-link">Forgot password</a>
                    </div>

                    <div class="form-actions">
                        <asp:Button runat="server"
                                    ID="btnLogin"
                                    Text="Log in"
                                    CssClass="btn-login"
                                    OnClick="btnLogin_Click" />
                    </div>
                </div>
            </div>

            <!-- Cột phải: hình ảnh -->
            <div class="login-right">
                <div class="login-image-overlay"></div>
            </div>
        </div>
    </form>
</body>
</html>
