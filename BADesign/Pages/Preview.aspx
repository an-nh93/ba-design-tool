<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Preview.aspx.cs" Inherits="BADesign.Pages.Preview" %>
<%@ Register Assembly="DevExpress.Web.v19.1, Version=19.1.6.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web" TagPrefix="dx" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>UI Preview - DevExtreme & DevExpress</title>
    <link rel="stylesheet" href="https://cdn3.devexpress.com/jslib/23.2.5/css/dx.light.css" />
    <link rel="stylesheet" href="../Content/builder.css" />
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn3.devexpress.com/jslib/23.2.5/js/dx.all.js"></script>
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="ScriptManager1" runat="server" />

        <h2>Preview bằng DevExtreme (cho BA xem)</h2>
        <div id="dxPreviewArea"></div>

        <hr />

        <h2>Preview mẫu DevExpress ASPxGridView (cho Dev tham khảo)</h2>
        <asp:PlaceHolder ID="phDevExpress" runat="server" />

        <asp:HiddenField ID="hdnJson" runat="server" />

        <script type="text/javascript">
            $(function () {
                var json = $('#<%= hdnJson.ClientID %>').val();
                if (!json) return;
                var controls = [];
                try { controls = JSON.parse(json); } catch (e) { console.error(e); }

                var container = $("#dxPreviewArea");
                controls.forEach(function (cfg) {
                    if (cfg.type === "grid") {
                        var div = $("<div>").css({ marginBottom: "20px" }).appendTo(container);
                        $("<h4>").text("Grid: " + cfg.id).appendTo(div);
                        $("<div>").attr("id", cfg.id + "_preview").appendTo(div);
                        $("#" + cfg.id + "_preview").dxDataGrid({
                            dataSource: [],
                            columns: cfg.columns || [],
                            filterRow: { visible: cfg.filterRow === true },
                            editing: {
                                mode: "row",
                                allowAdding: cfg.allowAdd === true,
                                allowUpdating: cfg.allowEdit === true
                            },
                            showBorders: true
                        });
                    } else if (cfg.type === "popup") {
                        var div = $("<div>").css({ marginBottom: "20px" }).appendTo(container);
                        $("<h4>").text("Popup: " + cfg.id).appendTo(div);
                        $("<div>").attr("id", cfg.id + "_popupPrev").appendTo(div);
                        $("#" + cfg.id + "_popupPrev").dxForm({
                            formData: {},
                            items: (cfg.fields || []).map(function (f) {
                                return { label: { text: f.label }, editorType: "dxTextBox", isRequired: f.required === true };
                            })
                        });
                    }
                });
            });
        </script>
    </form>
</body>
</html>
