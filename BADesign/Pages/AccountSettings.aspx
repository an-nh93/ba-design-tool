<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="AccountSettings.aspx.cs"
    Inherits="BADesign.Pages.AccountSettings" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>Account Settings - UI Builder</title>
    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .settings-container {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 2.5rem;
        }

        .settings-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .settings-header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.5rem;
        }

        .settings-header p {
            color: #6b7280;
            font-size: 0.875rem;
        }

        .settings-section {
            margin-bottom: 2rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .settings-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .settings-section h2 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #f3f4f6;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            font-weight: 600;
            color: #374151;
            font-size: 0.875rem;
        }

        .info-value {
            color: #6b7280;
            font-size: 0.875rem;
        }

        .btn {
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-weight: 600;
            font-size: 0.875rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-primary {
            background: #0078d4;
            color: white;
        }

        .btn-primary:hover {
            background: #006bb3;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .badge-success {
            background: #d1fae5;
            color: #065f46;
        }

        .badge-danger {
            background: #fee2e2;
            color: #991b1b;
        }

        .badge-default {
            background: #e5e7eb;
            color: #374151;
        }

        .back-link {
            text-align: center;
            margin-top: 2rem;
        }

        .back-link a {
            color: #0078d4;
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
        <div class="settings-container">
            <div class="settings-header">
                <h1>⚙️ Account Settings</h1>
                <p>Manage your account information</p>
            </div>

            <div class="settings-section">
                <h2>👤 Account Information</h2>
                <div class="info-row">
                    <span class="info-label">User ID:</span>
                    <span class="info-value"><asp:Literal ID="litUserId" runat="server" /></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Username:</span>
                    <span class="info-value"><asp:Literal ID="litUserName" runat="server" /></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Full Name:</span>
                    <span class="info-value"><asp:Literal ID="litFullName" runat="server" /></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value"><asp:Literal ID="litEmail" runat="server" /></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Role:</span>
                    <span class="info-value">
                        <asp:Literal ID="litRole" runat="server" />
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">
                        <asp:Literal ID="litStatus" runat="server" />
                    </span>
                </div>
            </div>

            <div class="settings-section">
                <h2>🔒 Security</h2>
                <div class="info-row">
                    <span class="info-label">Password:</span>
                    <span class="info-value">
                        <a href="~/ChangePassword" runat="server" class="btn btn-primary">
                            Change Password
                        </a>
                    </span>
                </div>
            </div>

            <div class="back-link">
                <a href="~/Home" runat="server">← Back to Home</a>
            </div>
        </div>
    </form>
</body>
</html>
