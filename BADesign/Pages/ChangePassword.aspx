<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="ChangePassword.aspx.cs"
    Inherits="BADesign.Pages.ChangePassword" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>Change Password - HR Helper</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <style>
        :root {
            --primary: #0078d4;
            --primary-hover: #006bb3;
            --bg-main: #1e1e1e;
            --bg-card: #2d2d30;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #969696;
            --border: #3e3e42;
            --success: #10b981;
            --danger: #ef4444;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .password-container {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 2.5rem;
        }

        .password-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .password-header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }

        .password-header p {
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
        }

        .form-control {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            font-size: 0.875rem;
            background: var(--bg-main);
            color: var(--text-primary);
            transition: all 0.2s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            font-size: 0.875rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
        }

        .alert {
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1.5rem;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid var(--success);
        }

        .alert-danger {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid var(--danger);
        }

        .text-danger {
            color: var(--danger);
            font-size: 0.8125rem;
            margin-top: 0.25rem;
            display: block;
        }

        .back-link {
            text-align: center;
            margin-top: 1.5rem;
        }

        .back-link a {
            color: var(--primary);
            text-decoration: none;
            font-size: 0.875rem;
        }

        .back-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="password-container">
            <div class="password-header">
                <h1>🔒 <asp:Literal ID="litTitle" runat="server" Text="Change Password" /></h1>
                <p><asp:Literal ID="litSubtitle" runat="server" Text="Update your account password" /></p>
            </div>

            <asp:PlaceHolder ID="phSuccess" runat="server" Visible="false">
                <div class="alert alert-success">
                    <strong><asp:Literal ID="litSuccessTitle" runat="server" Text="Success!" /></strong>
                    <asp:Literal ID="litSuccessMsg" runat="server" Text="Your password has been changed successfully." />
                </div>
            </asp:PlaceHolder>

            <asp:PlaceHolder ID="phError" runat="server" Visible="false">
                <div class="alert alert-danger">
                    <asp:Literal ID="litError" runat="server" />
                </div>
            </asp:PlaceHolder>

            <asp:PlaceHolder ID="phCurrentPassword" runat="server">
            <div class="form-group">
                <label for="txtCurrentPassword">Current Password</label>
                <asp:TextBox ID="txtCurrentPassword" runat="server" TextMode="Password" CssClass="form-control" />
                <asp:RequiredFieldValidator ID="rfvCurrentPassword" runat="server"
                    ControlToValidate="txtCurrentPassword"
                    ErrorMessage="Current password is required."
                    CssClass="text-danger"
                    Display="Dynamic" />
            </div>
            </asp:PlaceHolder>

            <div class="form-group">
                <label for="txtNewPassword">New Password</label>
                <asp:TextBox ID="txtNewPassword" runat="server" TextMode="Password" CssClass="form-control" />
                <asp:RequiredFieldValidator ID="rfvNewPassword" runat="server"
                    ControlToValidate="txtNewPassword"
                    ErrorMessage="New password is required."
                    CssClass="text-danger"
                    Display="Dynamic" />
                <asp:RegularExpressionValidator ID="revNewPassword" runat="server"
                    ControlToValidate="txtNewPassword"
                    ValidationExpression=".{6,}"
                    ErrorMessage="Password must be at least 6 characters."
                    CssClass="text-danger"
                    Display="Dynamic" />
            </div>

            <div class="form-group">
                <label for="txtConfirmPassword">Confirm New Password</label>
                <asp:TextBox ID="txtConfirmPassword" runat="server" TextMode="Password" CssClass="form-control" />
                <asp:RequiredFieldValidator ID="rfvConfirmPassword" runat="server"
                    ControlToValidate="txtConfirmPassword"
                    ErrorMessage="Please confirm your new password."
                    CssClass="text-danger"
                    Display="Dynamic" />
                <asp:CompareValidator ID="cvConfirmPassword" runat="server"
                    ControlToCompare="txtNewPassword"
                    ControlToValidate="txtConfirmPassword"
                    ErrorMessage="Passwords do not match."
                    CssClass="text-danger"
                    Display="Dynamic" />
            </div>

            <div class="form-group">
                <asp:Button ID="btnChangePassword" runat="server" Text="Change Password" 
                    CssClass="btn btn-primary" OnClick="btnChangePassword_Click" />
            </div>

            <div class="back-link">
                <asp:HyperLink ID="lnkBack" runat="server" NavigateUrl="~/Home">← Back to Home</asp:HyperLink>
            </div>
        </div>
    </form>
</body>
</html>
