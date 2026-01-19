using System;
using System.Collections.Generic;

namespace BADesign.App_Code
{
	public class ControlConfig
	{
		public string id { get; set; }
		public string type { get; set; }

		// Grid-specific
		public List<GridColumnConfig> columns { get; set; }
		public bool filterRow { get; set; }
		public bool allowAdd { get; set; }
		public bool allowEdit { get; set; }

		// 🔥 mới thêm
		public bool showCheckbox { get; set; }     // có cột chọn dòng hay không
		public bool showRowButtons { get; set; }   // có cột Edit/Delete hay không
		public string width { get; set; }          // ví dụ "100%" hoặc "800px"

		// Popup-specific
		public List<PopupFieldConfig> fields { get; set; }
	}


	public class GridColumnConfig
    {
        public string name { get; set; }
        public string caption { get; set; }
    }

    public class PopupFieldConfig
    {
        public string label { get; set; }
        public string editor { get; set; }
        public bool required { get; set; }
    }
}
