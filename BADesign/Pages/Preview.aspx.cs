using System;
using System.Collections.Generic;
using System.IO;
using System.Web;
using DevExpress.Web;
using Newtonsoft.Json;
using BADesign.App_Code;

namespace BADesign.Pages
{
    public partial class Preview : System.Web.UI.Page
    {
        private static string ConfigPath
        {
            get
            {
                var ctx = HttpContext.Current;
                return ctx.Server.MapPath("~/Output/generated-config.json");
            }
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            if (!IsPostBack)
            {
                var json = "[]";
                if (File.Exists(ConfigPath))
                {
                    json = File.ReadAllText(ConfigPath);
                }
                hdnJson.Value = json;

                List<ControlConfig> configs;
                try
                {
                    configs = JsonConvert.DeserializeObject<List<ControlConfig>>(json);
                }
                catch
                {
                    configs = new List<ControlConfig>();
                }

                foreach (var cfg in configs)
                {
                    if (cfg.type == "grid")
                    {
                        var grid = BuildGrid(cfg);
                        phDevExpress.Controls.Add(grid);
                    }
                    // Popup có thể map sang ASPxPopupControl, demo đơn giản nên bỏ qua
                }
            }
        }

        private ASPxGridView BuildGrid(ControlConfig cfg)
        {
            var grid = new ASPxGridView();
            grid.ID = (cfg.id ?? "Grid").Replace("-", "_") + "_asp";
            grid.KeyFieldName = "ID"; // demo
            grid.Width = System.Web.UI.WebControls.Unit.Percentage(100);
            grid.Settings.ShowFilterRow = cfg.filterRow;
            grid.SettingsEditing.Mode = GridViewEditingMode.Batch;

            if (cfg.columns != null)
            {
                foreach (var col in cfg.columns)
                {
                    var c = new GridViewDataTextColumn();
                    c.FieldName = col.name;
                    c.Caption = col.caption;
                    grid.Columns.Add(c);
                }
            }

            // Tạo dummy data 3 dòng cho dev dễ nhìn
            var table = new System.Data.DataTable();
            table.Columns.Add("ID", typeof(int));
            if (cfg.columns != null)
            {
                foreach (var col in cfg.columns)
                {
                    if (!table.Columns.Contains(col.name))
                        table.Columns.Add(col.name, typeof(string));
                }
            }

            for (int i = 1; i <= 3; i++)
            {
                var row = table.NewRow();
                row["ID"] = i;
                if (cfg.columns != null)
                {
                    foreach (var col in cfg.columns)
                    {
                        row[col.name] = col.caption + " " + i;
                    }
                }
                table.Rows.Add(row);
            }

            grid.DataSource = table;
            grid.DataBind();

            return grid;
        }
    }
}
