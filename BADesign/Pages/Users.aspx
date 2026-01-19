<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Users.aspx.cs"
    Inherits="UiBuilderFull.Admin.Users" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>User Management</title>
</head>
<body>
    <form id="form1" runat="server">
        <h2>User Management</h2>
        <asp:Label ID="lblMsg" runat="server" ForeColor="Red" />

        <asp:GridView ID="gvUsers" runat="server" AutoGenerateColumns="False"
            DataKeyNames="UserId"
            OnRowCommand="gvUsers_RowCommand">
            <Columns>
                <asp:BoundField DataField="UserId" HeaderText="ID" />
                <asp:BoundField DataField="UserName" HeaderText="UserName" />
                <asp:BoundField DataField="FullName" HeaderText="Full name" />
                <asp:BoundField DataField="Email" HeaderText="Email" />
                <asp:CheckBoxField DataField="IsSuperAdmin" HeaderText="SuperAdmin" />
                <asp:CheckBoxField DataField="IsActive" HeaderText="Active" />

                <asp:TemplateField HeaderText="New password">
                    <ItemTemplate>
                        <asp:TextBox ID="txtRowNewPass" runat="server"
                            TextMode="Password" Width="140" />
                    </ItemTemplate>
                </asp:TemplateField>

                <asp:ButtonField Text="Change password" CommandName="ChangePwd" />
                <asp:ButtonField Text="Reset password" CommandName="ResetPwd" />
                <asp:ButtonField Text="Toggle Active" CommandName="ToggleActive" />
            </Columns>
        </asp:GridView>



        <h3>Add new user</h3>
        <div>
            UserName: <asp:TextBox runat="server" ID="txtNewUser" />
            Password: <asp:TextBox runat="server" ID="txtNewPass" TextMode="Password" />
            Full name: <asp:TextBox runat="server" ID="txtNewFullName" />
            Email: <asp:TextBox runat="server" ID="txtNewEmail" />
            SuperAdmin: <asp:CheckBox runat="server" ID="chkNewSuper" />
            <asp:Button runat="server" ID="btnAddUser" Text="Add"
                        OnClick="btnAddUser_Click" />
        </div>
    </form>
</body>
</html>
