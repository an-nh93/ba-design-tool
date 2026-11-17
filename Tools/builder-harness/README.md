# Builder harness

Chạy trang UI Builder mà không cần đăng nhập, không cần IIS và không cần cơ sở dữ liệu, để kiểm thử phần chạy trên trình duyệt: kéo thả, đổi kích thước, lồng control, Undo / Redo, mở màn hình chuẩn, lọc theo phân hệ HR, chụp từ HRM, mở file draw.io, nhận dạng từ ảnh, sửa chữ tại chỗ, bản nháp, xuất ảnh, bảng mô tả field, lịch sử phiên bản, gửi và duyệt mẫu chung.

Phần máy chủ (lưu thiết kế, phân quyền, danh sách màn hình chuẩn, quy trình duyệt, email) không được kiểm thử ở đây: các page method chỉ là bản giả, giữ dữ liệu trong bộ nhớ của `server.js`.

## Thành phần

| Tệp | Vai trò |
|---|---|
| `server.js` | Máy chủ Node nhỏ. Trả `Pages/Builder.aspx` đã bỏ phần chạy trên máy chủ (`<%@ %>`, `runat="server"`, `asp:ScriptManager`, `asp:HiddenField` thành ô ẩn), trả `/Scripts` và `/Content` của project với `Cache-Control: no-store`, và trả lời giả cho các page method. |
| `page-helpers.js` | Hàm chạy trong trang: `__state`, `__check`, `__find`, `__rect`, `__grab`, `__inside`, `__desc`, `__center` (tâm một phần tử con của control), `__text` (chữ của một phần tử con), `__propApply` (đổi một ô của phần thuộc tính rồi trả về các khóa cấu hình đã đổi), `__iconPick` (chọn biểu tượng qua hộp Chọn Icon)… |
| `runner.js` | Hàm chạy kịch bản bằng Playwright: `async (page, names, options)`. |
| `golden.json` | Giá trị đã ghi của các bước `golden` (hành vi của từng ô trong phần thuộc tính). |
| `scenarios.json` | 65 kịch bản: kéo thả, lồng khối, zoom, kéo sát mép và tự cuộn, không bôi đen chữ, dán ảnh, popup Organization Structure, cây, toolbar trên dải tiêu đề, thước và phần thuộc tính ở cỡ màn hình laptop, cột lệnh của lưới Core, chuyển tab Thuộc tính / Danh sách control, Ctrl+A (`selectall`), quét khối theo phạm vi và chọn nhiều loại control (`marquee`, `selectedge`), quét khối tự cuộn ở mép (`marqueescroll`), xóa popup cùng control bên trong (`popupdelete`), tab page trong popup tự dựng và chụp từ HRM (`tabinpopup`, `tabinpopupcaptured`), dời cả nhóm trên màn hình có tọa độ lẻ (`rigidmove`), xóa tab page / section có control bên trong (`deletecontainers`), bấm đúp sửa chữ (`inlineedit`), đổi thứ tự và chèn cột lưới (`gridcolumns`), xuất ảnh vùng chọn và chép vào clipboard (`exportimage`), bản nháp và báo hết phiên (`draft`), giữ ảnh gốc sau nhận dạng (`refimage`), bảng mô tả field (`spec`), lịch sử phiên bản và so sánh (`versions`, `baseline`), gửi mẫu, màn duyệt chỉ xem, duyệt hai bước, từ chối, mở mẫu của team (`teamflow`), tự duyệt bước sau khi cùng một người duyệt hai bước liền nhau (`teamchain`), ô lọc phân hệ HR của hộp Màn hình chuẩn và phân hệ của mẫu gửi đi (`modules`), mở file draw.io: file nhiều trang, trang nén, gộp ô che vào ảnh nền, gộp lỗi rồi thử lại, lịch sử Undo giữ mỗi ảnh một lần, thả file vào trang (`drawio`), nhãn nằm giữa control ở mọi loại field Core, ô chọn checkbox / radio của Core và ESS giữ đúng cỡ và nằm giữa field (`fieldalign`), sửa chữ trong ô của lưới Core đang ở chế độ sửa dòng: bấm đặt con trỏ, phím mũi tên, bấm đúp chọn từ, kéo chuột bôi đen, Delete, Enter lưu, ô tìm của lưới (`gridcelledit`), kéo giãn popup bằng góc, mép phải và mép dưới khi ESS Section bên trong phủ kín các mép đó (`popupresizecovered`), ô ngày Core hiện đúng chuỗi giá trị mặc định đã gõ và ô lịch của ô ngày ESS dính liền ô nhập (`datefields`), chữ trên nút Multi-select theo các mục đang chọn (`multiselecttext`), Bôi vàng không làm mờ chữ trên vùng thiết kế, trong hộp Xem trước, ảnh xuất ra và ảnh xem trước của thiết kế (`highlightblend`), ảnh xem trước lúc lưu chỉ gồm vùng có control, có tỷ lệ và cỡ tối đa (`savethumb`), thiết kế chứa mã HTML trong chữ và id (`unsafe`), phần thuộc tính dạng gọn ở cỡ laptop và độ rộng mặc định 370px: 12 cột trong một màn hình, mỗi danh sách mở một dòng và nhớ dòng đang mở, tìm cột, bảng Quyền, gõ tên tab, mũi tên chuyển tab khi dải tab dài hơn panel, panel ở bề ngang 200 đến 431px, nhãn chuyển lên trên ô nhập khi panel hẹp, tab Danh sách control, nút Bỏ biểu tượng (`proppanel`, `proptyping`), hành vi của từng ô thuộc tính ở mọi loại control (`propsfields`, `propsess`, `propscontainers`, `propsgrids`), chọn, đổi màu và bỏ biểu tượng (`propsicons`). |

## Chạy

```
node Tools/builder-harness/server.js          # cổng 3988
node Tools/builder-harness/server.js 4010     # cổng khác (hoặc biến môi trường BUILDER_HARNESS_PORT)
```

Mở `http://localhost:3988/Builder`. Sửa script hay CSS của Builder rồi tải lại trang là thấy ngay, không cần build.

Địa chỉ riêng của harness:

| Địa chỉ | Nội dung |
|---|---|
| `/__runner` | `runner.js` (dạng chữ, để nạp vào Playwright) |
| `/__helpers.js` | `page-helpers.js` |
| `/__scenarios` | `scenarios.json` |
| `/__golden` | `golden.json`; `POST` ghi giá trị của một kịch bản (runner gọi khi có tùy chọn `record`) |

Page method giả: `LoadConfig` trả thiết kế rỗng; `LoadStandardScreen` đọc đúng tệp trong `App_Data/BuilderTemplates`; `SaveDesign` trả id `9001` (hoặc id được gửi lên) và giữ nội dung trong bộ nhớ để dựng lịch sử phiên bản (`GetDesignVersions`, `LoadDesignVersion`, `SaveDesignBaseline`); `KeepAlive` trả `true`; nhóm mẫu chung (`GetTemplateSubmitInfo`, `SubmitTemplate`, `LoadTemplateRequest`, `ReviewTemplateRequest`, `GetTeamTemplates`, `LoadTeamTemplate`) chạy một quy trình hai bước cố định, người đang thử luôn được duyệt, yêu cầu giữ phân hệ được chọn; `GetHrModules` trả hai phân hệ cố định (Staffing, Time-Attendance); `GetStandardScreens` trả ba màn hình của thư viện (`core-employee-profile`, `core-overtime`, `core-report-filter`) kèm phân hệ; các method khác trả danh sách rỗng. `POST /__reset` xóa bộ nhớ này; runner gọi nó ở đầu mỗi kịch bản. Hộp Màn hình chuẩn vì vậy chỉ có ba màn hình; mở một màn hình khác trong thư viện bằng `builderTemplates.open("<key>", "new", "<tên>")`.

## Chạy kịch bản

Trong một phiên Playwright đang mở sẵn một trang:

```js
async (page) => {
  const base = 'http://localhost:3988';
  const code = await (await fetch(base + '/__runner')).text();
  return await (0, eval)('(' + code + ')')(page, ['nest', 'deep', 'tab'], { base, failuresOnly: true });
}
```

`names` là tên kịch bản trong `scenarios.json`. Dòng cuối của kết quả:

```
=== 65 scenarios, 970 checks passed, 0 failed, undo/redo states identical 276/276
```

Tùy chọn: `base` (địa chỉ harness), `target` (trang Builder cần thử, ví dụ `http://localhost:3393/Builder` để chạy cùng kịch bản trên trang thật sau khi đăng nhập), `failuresOnly`, `shotDir` (thư mục lưu ảnh của bước `shot`), `width`, `height`, `record` (ghi lại giá trị của các bước `golden` thay vì so sánh).

## Kịch bản

Mỗi kịch bản là một mảng bước. Tọa độ và phần tử viết bằng biểu thức JavaScript chạy trong trang.

| `op` | Ý nghĩa |
|---|---|
| `add` | Thêm control bằng lệnh của Builder |
| `tool` | Kéo thật một mục từ Toolbox tới `x`, `y` |
| `tap`, `click` | Bấm chuột; `click` nhận `mods` (ví dụ `["Control"]`, `["Shift"]`) để giữ phím khi bấm |
| `dblclick`, `type` | Bấm đúp tại `at`; gõ `text` vào ô đang focus (`clear: true` chọn hết trước khi gõ) |
| `reload` | Tải lại trang mà giữ bản nháp trong trình duyệt và bộ nhớ của server giả |
| `goto` | Mở trang Builder với `query` (ví dụ `?reviewId=1`), giữ bộ nhớ của server giả |
| `esc`, `key` | Phím |
| `drag` | Kéo từ `from` tới `to` hoặc theo `by`; `steps`, `fast`, `mark`; `mods` giữ phím trong lúc kéo; `hold` (ms) giữ chuột thêm trước khi nhả, dùng để thử tự cuộn ở mép |
| `carry` | Kéo một khối chứa: control con phải dời đúng bằng khối chứa, control khác phải đứng yên |
| `expect` | `js` phải cho kết quả bằng `want` |
| `golden` | `js` phải cho đúng giá trị đã ghi trong `golden.json` theo `title`; chạy với `record: true` thì ghi giá trị mới |
| `snap`, `mark` | Ghi lại trạng thái để so sau khi Undo |
| `undoAll` | Undo về từng mốc đã ghi rồi Redo lại, so từng trạng thái |
| `eval`, `wait`, `allowHidden`, `shot` | Chạy mã, chờ, cho phép control ẩn, chụp ảnh |
| `viewport` | Đổi cỡ cửa sổ (`width`, `height`), ví dụ 1366×650 hoặc 1280×620 để thử như màn hình laptop |

Sau các bước làm đổi thiết kế, `__check()` tìm control không có phần tử trên trang, nằm sai khối chứa so với `parentId`, có `left` / `top` trên trang lệch cấu hình quá 1px, hoặc bị ẩn. Control bị control khác che (`covered`) chỉ được ghi nhận, không tính là lỗi.

## Lưu ý

- Trước khi tải lại trang phải đặt `builder.savedSnapshot = JSON.stringify(builder.controls)` (runner tự làm), nếu không trình duyệt hỏi “rời trang?” và Playwright bị treo ở hộp thoại.
- Control ở tab không mở bị `__check` báo `hidden`: đó là đúng thiết kế, dùng `allowHidden` cho kịch bản có tab.
- Góc popup nằm ngoài vùng nhìn khi zoom 150% thì không kéo được bằng chuột thật; đặt vị trí popup trước khi zoom.
- Một mốc Undo ghi ở mức zoom nào thì phải so ở đúng mức zoom đó.
- Đầu mỗi kịch bản runner đặt lại cửa sổ về 2200×1300 (hoặc `width` / `height` trong tùy chọn); kịch bản cần cỡ nhỏ thì tự gọi `viewport` ở bước đầu.
- Gọi `page.bringToFront()` trước khi chạy: cửa sổ trình duyệt bị che chỉ vẽ khoảng 1 khung hình mỗi giây, làm các bước kéo chậm hẳn và kiểm tra tự cuộn cho kết quả sai.
- Màn hình thư viện không có mục trong Toolbox thì chèn bằng `builderTemplates.insertAt(key, { clientX, clientY })` trong bước `eval`.
- Tab page chỉ kéo được bằng dải tab: `__grab(id)` của tab page trả điểm ở cuối dải tab; `__inside(id, dx, dy)` của tab page trả điểm trong thân (dùng để quét khối).
- Ghi chú (`annot-note`) được đặt sao cho tâm nằm ở điểm thả; thả gần mép trái thì nó nằm sát thước (left = 20) và cả vùng chọn chứa nó không dời sang trái được nữa.
- Đổi kích thước một control bằng mã trong bước `eval` thì gọi `builder.refreshJson()` ngay sau đó, nếu không lần thêm control kế tiếp có thể làm canvas co lại, cuộn nhảy và control bị gắn nhầm cha.
- Bấm vào tên một tab chưa mở là một bước Undo riêng; kịch bản có `undoAll` nên bấm đúp vào tab đang mở, hoặc ghi thêm một mốc sau khi chuyển tab.
- `undoAll` coi mốc cuối cùng là trạng thái hiện tại: sau bước cuối làm đổi thiết kế phải có một `mark` (ở mức zoom 100%).
- Các bước thêm control có thể làm canvas cuộn ngang, đẩy control sát mép trái ra sau Toolbox; trước khi bấm vào control ở mép trái hãy đặt `scrollLeft(0)`.
- Cuộn canvas trong lúc ô sửa chữ tại chỗ đang mở sẽ ghi nội dung và đóng ô; cuộn trước rồi mới bấm đúp.
- Giá trị trả về của bước `expect` có thể là Promise (dùng để đọc bản nháp trong IndexedDB hoặc gọi page method giả).
- Đầu mỗi kịch bản runner xóa bản nháp trong trình duyệt và bộ nhớ của server giả; bước `reload` và `goto` thì giữ lại.
- Độ rộng phần thuộc tính được trình duyệt nhớ trong `localStorage.propPanelWidth`; kịch bản đo bố cục của phần thuộc tính phải tự đặt `$('.prop-shell').css('width','370px')` (độ rộng mặc định) để kết quả không phụ thuộc lần kéo trước.
- Thẻ Mô tả cho SRS được chèn vào panel bằng `MutationObserver`, tức là sau lệnh hiện thuộc tính một nhịp; kiểm tra nào cần có thẻ này thì thêm bước `wait` trước.
- Gõ vào ô của phần thuộc tính tạo một bước Undo cho mỗi phím; kịch bản như vậy không dùng `mark` / `undoAll` (xem `proptyping`).
- Bước `golden` dùng để giữ nguyên hành vi khi viết lại mã: ghi giá trị trên mã cũ, sửa mã, rồi chạy lại để so. Chỉ ghi lại (`record: true`) khi thay đổi là có chủ đích, và phải so từng giá trị khác với bản cũ trước khi ghi đè; tên bước (`title`) trong một kịch bản không được trùng nhau.
- `__propApply` phát đủ `input`, `change`, `blur`, `focusout` trên ô được đổi; giá trị trả về đã thay id và hậu tố sinh tự động bằng `#` để chạy lần nào cũng giống nhau.
- Phần thuộc tính chỉ dùng class `pp-*` (xem `Docs/Project/01-UI-Builder.md`, mục 15.11): tab là `.pp-tab[data-tab]`, dòng đang mở là `.pp-row.is-open`, vùng cuộn của danh sách là `.pp-list-wrap`.
- Không dùng harness để kết luận về lưu thiết kế, phân quyền, quy trình duyệt thật hay email; các phần đó phải thử trên trang thật.
