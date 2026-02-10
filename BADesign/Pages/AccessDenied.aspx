<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="AccessDenied.aspx.cs"
    Inherits="UiBuilderFull.Admin.AccessDenied" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Không có quyền truy cập - UI Builder</title>
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/bootstrap.min.css") %>" />
    <style>
        :root {
            --primary: #0078d4;
            --primary-hover: #006bb3;
            --primary-light: #0D9EFF;
            --primary-soft: rgba(0, 120, 212, 0.15);
            --bg-main: #1e1e1e;
            --bg-card: #2d2d30;
            --bg-darker: #161616;
            --bg-hover: #3e3e42;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #969696;
            --border: #3e3e42;
            --warning: #f59e0b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        .ad-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 3rem;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .ad-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: var(--primary-soft);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
        }
        .ad-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            color: var(--text-primary);
        }
        .ad-desc {
            font-size: 0.9375rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .ad-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            align-items: center;
        }
        .ad-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.625rem 1.5rem;
            background: var(--primary);
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-size: 0.9375rem;
            font-weight: 500;
            transition: all 0.2s;
            min-width: 160px;
        }
        .ad-btn:hover {
            background: var(--primary-hover);
            color: white !important;
            transform: translateY(-1px);
        }
        .ad-btn-secondary {
            background: var(--bg-hover);
            color: var(--text-primary) !important;
            border: 1px solid var(--border);
        }
        .ad-btn-secondary:hover {
            background: var(--bg-card);
            color: var(--text-primary) !important;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="ad-card">
            <div class="ad-icon" aria-hidden="true">🔒</div>
            <h1 class="ad-title">Không có quyền truy cập</h1>
            <p class="ad-desc">
                Bạn không có quyền xem trang này. Vui lòng liên hệ Super Admin nếu cần được cấp quyền.
            </p>
            <div class="ad-actions">
                <asp:HyperLink ID="lnkHome" runat="server" CssClass="ad-btn" Text="← Về trang chủ" />
            </div>
        </div>
    </form>
</body>
</html>
