using System;
using System.Collections.Generic;
using System.IO;
using System.Web;
using BADesign.App_Code;
using Newtonsoft.Json;

namespace UiBuilderFull.Pages
{
    public partial class WordExport : System.Web.UI.Page
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
            var json = "[]";
            if (File.Exists(ConfigPath))
            {
                json = File.ReadAllText(ConfigPath);
            }

            List<ControlConfig> configs;
            try
            {
                configs = JsonConvert.DeserializeObject<List<ControlConfig>>(json);
            }
            catch
            {
                configs = new List<ControlConfig>();
            }

            Response.Clear();
            Response.ContentType = "application/msword";
            Response.AddHeader("Content-Disposition", "attachment; filename=ScreenSpec.doc");

            using (var writer = new StringWriter())
            {
                writer.WriteLine("<html><body>");
                writer.WriteLine("<h1>Screen Specification</h1>");

                foreach (var cfg in configs)
                {
                    if (cfg.type == "grid")
                    {
                        writer.WriteLine("<h2>Grid: " + HttpUtility.HtmlEncode(cfg.id) + "</h2>");
                        writer.WriteLine("<table border='1' cellpadding='4' cellspacing='0'>");
                        writer.WriteLine("<tr><th>Field Name</th><th>Caption</th></tr>");
                        if (cfg.columns != null)
                        {
                            foreach (var col in cfg.columns)
                            {
                                writer.WriteLine("<tr><td>" + HttpUtility.HtmlEncode(col.name) + "</td><td>" + HttpUtility.HtmlEncode(col.caption) + "</td></tr>");
                            }
                        }
                        writer.WriteLine("</table>");
                    }
                    else if (cfg.type == "popup")
                    {
                        writer.WriteLine("<h2>Popup: " + HttpUtility.HtmlEncode(cfg.id) + "</h2>");
                        writer.WriteLine("<table border='1' cellpadding='4' cellspacing='0'>");
                        writer.WriteLine("<tr><th>Label</th><th>Editor</th><th>Required</th></tr>");
                        if (cfg.fields != null)
                        {
                            foreach (var f in cfg.fields)
                            {
                                writer.WriteLine("<tr><td>" + HttpUtility.HtmlEncode(f.label) +
                                                 "</td><td>" + HttpUtility.HtmlEncode(f.editor) +
                                                 "</td><td>" + (f.required ? "Yes" : "No") + "</td></tr>");
                            }
                        }
                        writer.WriteLine("</table>");
                    }
                }

                writer.WriteLine("<hr/><p>JSON raw:</p><pre>" + HttpUtility.HtmlEncode(json) + "</pre>");
                writer.WriteLine("</body></html>");

                Response.Write(writer.ToString());
            }

            Response.End();
        }
    }
}
