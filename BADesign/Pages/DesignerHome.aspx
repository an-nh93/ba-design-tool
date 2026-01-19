<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="DesignerHome.aspx.cs"
    Inherits="BADesign.Pages.DesignerHome" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>UI Builder – My Designs</title>

    <link href="../Content/bootstrap.min.css" rel="stylesheet" />
    <link href="../Content/datatables.min.css" rel="stylesheet" />

    <script src="../Scripts/jquery-1.10.2.min.js"></script>
    <script src="../Scripts/bootstrap.min.js"></script>
    <script src="../Scripts/datatables.min.js"></script>

    <style>
        :root {
            --ba-primary: #2563eb;
            --ba-primary-soft: #e0edff;
            --ba-border: #e5e7eb;
            --ba-muted: #6b7280;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f3f4f6;
            color: #111827;
        }

        /* ===== Top bar ===== */
        .top-bar {
            background: linear-gradient(90deg, #111827, #1f2937);
            color: #f9fafb;
            padding: .75rem 1.5rem;
            box-shadow: 0 .25rem .75rem rgba(0, 0, 0, .25);
        }

        .top-bar h3 {
            font-weight: 600;
            font-size: 1.35rem;
            margin: 0;
        }

        .top-bar small {
            color: #9ca3af;
        }

        .top-bar .btn {
            font-weight: 500;
        }

        /* ===== Layout ===== */
        .page-wrapper {
            padding: 1.5rem 1.25rem 2rem;
        }

        .page-title {
            font-weight: 600;
            font-size: 1.05rem;
        }

        .page-subtitle {
            font-size: .85rem;
            color: var(--ba-muted);
        }

        /* ===== Card ===== */
        .ba-card {
            border-radius: .75rem;
            border: 1px solid #e5e7eb;
            box-shadow: 0 .5rem 1.5rem rgba(15, 23, 42, .05);
            background-color: #ffffff;
            margin-bottom: 1.5rem;
        }

        .ba-card-header {
            padding: .75rem 1rem;
            border-bottom: 1px solid var(--ba-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f9fafb;
        }

        .ba-card-body {
            padding: .75rem 1rem 1rem;
        }

        .badge-public {
            background-color: rgba(22, 163, 74, .1);
            color: #15803d;
            border-radius: 999px;
            padding: .1rem .55rem;
            font-size: .7rem;
            font-weight: 600;
        }

        .badge-private {
            background-color: rgba(234, 179, 8, .12);
            color: #92400e;
            border-radius: 999px;
            padding: .1rem .55rem;
            font-size: .7rem;
            font-weight: 600;
        }

        .design-thumb {
            width: 120px;
            height: 80px;
            object-fit: cover;
            border-radius: .45rem;
            border: 1px solid #d1d5db;
            background-color: #f9fafb;
            cursor: zoom-in;
        }

        .table {
            margin-bottom: 0;
        }

        .table thead th {
            background-color: #f9fafb;
            border-bottom: 1px solid var(--ba-border);
            white-space: nowrap;
            font-size: .8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .03em;
            text-align: center;
        }

        .table tbody td {
            font-size: .85rem;
            vertical-align: middle;
        }

        .table tbody tr:hover {
            background-color: #f3f4ff;
        }

        td.col-actions {
            white-space: nowrap;
        }

        /* ===== DataTables tinh chỉnh ===== */
        .dataTables_wrapper {
            padding: .3rem .25rem .5rem;
        }

        .dataTables_wrapper .dataTables_filter {
            text-align: right;
        }

        .dataTables_wrapper .dataTables_filter label {
            font-size: .8rem;
            color: var(--ba-muted);
        }

        .dataTables_wrapper .dataTables_filter input {
            margin-left: .35rem;
            border-radius: 999px;
            border: 1px solid #d1d5db;
            padding: .15rem .6rem;
            font-size: .8rem;
        }

        .dataTables_wrapper .dataTables_info {
            font-size: .75rem;
            color: var(--ba-muted);
        }

        .dataTables_wrapper .dataTables_paginate {
            font-size: .8rem;
        }

        .dataTables_wrapper .dataTables_paginate .paginate_button {
            border-radius: 999px !important;
            border: 0 !important;
            padding: .15rem .5rem !important;
            margin: 0 .05rem !important;
            color: #4b5563 !important;
        }

        .dataTables_wrapper .dataTables_paginate .paginate_button.current {
            background: var(--ba-primary-soft) !important;
            color: #1d4ed8 !important;
            font-weight: 600;
        }

        .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
            background: #e5e7eb !important;
            color: #111827 !important;
        }

        /* Modal preview */
        #previewModal .modal-header {
            border-bottom: 1px solid #e5e7eb;
        }

        #previewModal .modal-title {
            font-size: 1rem;
            font-weight: 600;
        }

        #previewModal #imgDesignPreview {
            max-width: 100%;
            max-height: calc(100vh - 170px);
            object-fit: contain;
            border-radius: .5rem;
            box-shadow: 0 .5rem 1.5rem rgba(15, 23, 42, .35);
        }

        .table thead th {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6 !important;   /* thêm full viền */
            border-bottom-width: 2px;               /* cho cảm giác header tách rõ body */
            white-space: nowrap;
            text-align: center;                     /* canh giữa chữ trong header */
        }

        /* Body vẫn canh trái như cũ */
        .table tbody td {
            text-align: left;
        }
        /* ====== TABLE STYLE CHO 2 LƯỚI DESIGNER ====== */

    /* Bản thân table phải collapse để border liền mạch */
    #tblMyDesigns,
    #tblPublicDesigns {
        border-collapse: collapse !important;
    }

    /* Header: nền xám nhạt, border đủ 4 cạnh, text canh giữa */
    #tblMyDesigns thead th,
    #tblPublicDesigns thead th {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6 !important;
        white-space: nowrap;
        text-align: center;
        vertical-align: middle;
        font-weight: 600;
    }

    /* Body: mỗi ô đều có border */
    #tblMyDesigns tbody td,
    #tblPublicDesigns tbody td {
        border: 1px solid #dee2e6 !important;
        vertical-align: middle;
    }

    /* Đè lại style của DataTables để khỏi phá border */
    table.dataTable.no-footer {
        border-bottom: none !important;
    }

    table.dataTable thead > tr > th,
    table.dataTable thead > tr > td {
        border-bottom: 1px solid #dee2e6 !important;
    }

    .canvas-context-menu {
        position: absolute;
        z-index: 9999;
        background: #ffffff;
        border: 1px solid #ccc;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        font-size: 12px;
        min-width: 160px;
    }
    .canvas-context-menu div {
        padding: 4px 10px;
        cursor: pointer;
    }
    .canvas-context-menu div:hover {
        background: #0078d7;
        color: #fff;
    }
    .canvas-context-menu hr {
        margin: 4px 0;
        border: 0;
        border-top: 1px solid #e0e0e0;
    }


    </style>
</head>
<body>
    <form id="form1" runat="server">

        <!-- ===== Top bar ===== -->
        <div class="top-bar d-flex justify-content-between align-items-center">
            <div>
                <h3>UI Builder</h3>
                <small>Welcome, <asp:Literal ID="litUserName" runat="server" /></small>
            </div>
            <div class="d-flex gap-2">
                <a runat="server"
                   id="lnkNewPage2"
                   class="btn btn-success btn-sm"
                   href="~/Builder">
                    + New empty page
                </a>

                <asp:HyperLink ID="lnkUserManagement" runat="server"
                    CssClass="btn btn-outline-light btn-sm" NavigateUrl="~/Users"
                    Visible="false">
                    User management
                </asp:HyperLink>
            </div>
        </div>

        <div class="page-wrapper container-fluid">

            <!-- My designs -->
            <div class="ba-card">
                <div class="ba-card-header">
                    <div>
                        <div class="page-title">My designs</div>
                        <div class="page-subtitle">Double-click thumbnail to preview full size</div>
                    </div>
                </div>
                <div class="ba-card-body">
                    <div class="table-responsive">
                        <table id="tblMyDesigns"
                               class="table table-striped table-hover table-sm align-middle">
                            <thead>
                                <tr>
                                    <th style="width:140px">Preview</th>
                                    <th>Name</th>
                                    <th style="width:110px">Type</th>
                                    <th style="width:150px">Updated</th>
                                    <th style="width:220px">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <asp:Repeater ID="rpMyDesigns" runat="server"
                                    OnItemCommand="rpMyDesigns_ItemCommand">
                                    <ItemTemplate>
                                        <tr>
                                            <td class="text-center">
                                                <img src='<%# Eval("ThumbnailUrl") %>'
                                                     class="design-thumb js-preview-thumb"
                                                     alt="preview"
                                                     data-full='<%# Eval("ThumbnailUrl") %>' />
                                            </td>
                                            <td>
                                                <a href='<%# Eval("EditUrl") %>' class="fw-semibold text-decoration-none">
                                                    <%# Eval("Name") %>
                                                </a><br />
                                                <small class="text-muted">
                                                    <%# Eval("ControlType") %> ·
                                                    <span class='<%# (bool)Eval("IsPublic") ? "badge-public" : "badge-private" %>'>
                                                        <%# (bool)Eval("IsPublic") ? "Public" : "Private" %>
                                                    </span>
                                                </small>
                                            </td>
                                            <td><%# Eval("ControlType") %></td>
                                            <td><%# Eval("UpdatedAt", "{0:yyyy-MM-dd HH:mm}") %></td>
                                            <td class="col-actions">
                                                <div class="d-flex flex-wrap gap-1">
                                                    <a href='<%# Eval("EditUrl") %>'
                                                       class="btn btn-primary btn-sm">
                                                        Edit
                                                    </a>

                                                    <asp:LinkButton ID="btnDelete" runat="server"
                                                        CssClass="btn btn-outline-danger btn-sm"
                                                        CommandName="Delete"
                                                        CommandArgument='<%# Eval("ControlId") %>'
                                                        OnClientClick="return confirm('Delete this design?');">
                                                        Delete
                                                    </asp:LinkButton>

                                                    <asp:PlaceHolder runat="server" Visible='<%# (bool)Eval("IsPublic") %>'>
                                                        <button type="button"
                                                                class="btn btn-outline-warning btn-sm btn-toggle-public"
                                                                data-id='<%# Eval("ControlId") %>'
                                                                data-next="false">
                                                            Make private
                                                        </button>
                                                    </asp:PlaceHolder>

                                                    <asp:PlaceHolder runat="server" Visible='<%# !(bool)Eval("IsPublic") %>'>
                                                        <button type="button"
                                                                class="btn btn-outline-success btn-sm btn-toggle-public"
                                                                data-id='<%# Eval("ControlId") %>'
                                                                data-next="true">
                                                            Make public
                                                        </button>
                                                    </asp:PlaceHolder>
                                                </div>
                                            </td>
                                        </tr>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Public designs -->
            <div class="ba-card">
                <div class="ba-card-header">
                    <div>
                        <div class="page-title">Public designs</div>
                        <div class="page-subtitle">(clone only)</div>
                    </div>
                </div>
                <div class="ba-card-body">
                    <div class="table-responsive">
                        <table id="tblPublicDesigns"
                               class="table table-striped table-hover table-sm align-middle">
                            <thead>
                                <tr>
                                    <th style="width:140px">Preview</th>
                                    <th>Name</th>
                                    <th style="width:110px">Type</th>
                                    <th style="width:140px">Owner</th>
                                    <th style="width:150px">Updated</th>
                                    <th style="width:120px">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <asp:Repeater ID="rpPublicDesigns" runat="server">
                                    <ItemTemplate>
                                        <tr>
                                            <td class="text-center">
                                                <img src='<%# Eval("ThumbnailUrl") %>' alt="preview"
                                                     class="design-thumb" />
                                            </td>
                                            <td><%# Eval("Name") %></td>
                                            <td><%# Eval("ControlType") %></td>
                                            <td><%# Eval("OwnerName") %></td>
                                            <td><%# Eval("UpdatedAt", "{0:yyyy-MM-dd HH:mm}") %></td>
                                            <td class="text-center col-actions">
                                                <a href='<%# Eval("CloneUrl") %>'
                                                   class="btn btn-outline-secondary btn-sm">
                                                    Clone
                                                </a>
                                            </td>
                                        </tr>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </form>

    <!-- Modal xem ảnh preview lớn -->
    <div class="modal fade" id="previewModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title mb-0">Design preview</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <img id="imgDesignPreview" src="" alt="preview" />
          </div>
        </div>
      </div>
    </div>

    <script>
        // DataTables
        $(function () {
            $('#tblMyDesigns').DataTable({
                pageLength: 10,
                lengthChange: false,
                searching: true,
                ordering: false
            });

            $('#tblPublicDesigns').DataTable({
                pageLength: 10,
                lengthChange: false,
                searching: true,
                ordering: false
            });
        });

        // Modal preview (Bootstrap 5)
        document.addEventListener('DOMContentLoaded', function () {
            var previewModalEl = document.getElementById('previewModal');
            var previewModal = new bootstrap.Modal(previewModalEl);

            $('#tblMyDesigns').on('dblclick', 'img.design-thumb', function () {
                document.getElementById('imgDesignPreview').src = this.src;
                previewModal.show();
            });
        });

        // Toggle Public / Private
        $(document).on('click', '.btn-toggle-public', function (e) {
            e.preventDefault();
            var $btn = $(this);
            var id = parseInt($btn.data('id'), 10);
            var next = $btn.data('next') === true || $btn.data('next') === "true";

            $.ajax({
                url: '/Pages/DesignerHome.aspx/SetDesignPublic',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({ controlId: id, isPublic: next }),
                success: function () {
                    window.location.reload();
                },
                error: function (xhr) {
                    alert('Lỗi cập nhật trạng thái Public: ' + xhr.responseText);
                }
            });
        });
    </script>
</body>
</html>
