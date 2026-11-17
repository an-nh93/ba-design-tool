# UI Builder

Màn `Pages/Builder.aspx`, script `Scripts/builder/`. BA kéo control lên canvas để vẽ form Core hoặc ESS. Kết quả là mảng `builder.controls`, lưu DB khi bấm **Lưu** (mục 11).

Code chính: `builder.js` (canvas, history, chọn, kéo, align, lưu), `control-field.js`, `control-popup.js`, `control-grid.js`, `control-grid-ess.js`, `control-tabpage.js`, `control-toolbar.js`, `control-collapsible-section.js`, `control-annotation.js` (đánh dấu, mục 14). Thư viện màn hình chuẩn và chụp màn hình từ HRM: mục 13.

## 1. Mô hình tọa độ

Mỗi control là một object trong `builder.controls`.

- `id`, `type` (`field`, `popup`, `grid`, `ess-grid`, `toolbar`, `tabpage`, `collapsible-section`, `annotation`)
- `left`, `top`, `width`, `height` — pixel CSS, chưa nhân zoom
- `parentId` — cha, hoặc `null` nếu nằm thẳng trên canvas
- `zIndex`
- Field thêm `ftype` và `uiMode` (`core` | `ess`)

`left` / `top` luôn relative với **cha trực tiếp**.

| Cha | Gốc tọa độ của con |
|---|---|
| Không có | Canvas `#canvas-zoom-inner`, cách mép thước khoảng 20px |
| Popup | `.popup-body`. Riêng toolbar gắn vào popup (`dock = "popup"`) thì gốc là khung `.popup-design`, để đặt được lên vùng tiêu đề |
| Group box / Section | Vùng content (`.page-field-groupbox-content`, `.page-field-section-content`) |
| ESS collapsible section | Vùng content `.ess-collapsible-content` |

Ví dụ multiselect trong group, group trong popup: popup dùng tọa độ canvas, group dùng tọa độ popup, multiselect dùng tọa độ content của group.

**Khối chứa** là popup, group box, section và ESS section (`builder.isContainerConfig`). Mọi loại control đều làm con của khối chứa được — field, grid, ESS grid, toolbar, ESS section, và cả group box / section lồng nhau — trừ popup và đánh dấu (`builder.canNest`). Tab page chỉ làm con của **popup** (popup có tab là mẫu rất hay gặp ở Core); thả lên group box / section thì nó vẫn nằm trên canvas. Tab page không phải khối chứa trong DOM (mục 10).

Việc gán cha chỉ nằm ở một chỗ, dùng chung cho thả từ toolbox, bấm để thêm, kéo, kéo nhiều control:

1. **Chọn cha theo hình học** — `builder.containerAt(el, cfg, point)`: lấy khối chứa nằm **trên cùng** (so thứ tự xếp lớp bằng `builder.isStackedAbove`) mà khung của nó chứa điểm xét. Điểm xét là **vị trí con trỏ** với control đang nắm hoặc vừa thả từ toolbox, là **tâm** control với các control đi kèm trong vùng chọn nhiều. Không có vùng “hút” quanh khối chứa và không đòi control nằm lọt trong khối chứa. Phép thử dùng khung của control chứa, không dùng phần tử content (content của group box / section chỉ cao khoảng 60px). Khối chứa không nhận chính nó hoặc con cháu của nó làm cha.
2. **Đổi cha không đổi vị trí trên màn hình** — `builder.setControlParent(cfg, parentId)`: đo `getBoundingClientRect`, chuyển phần tử sang content của cha mới, đo lại rồi bù chênh lệch (chia `builder.cssScale()`) vào `left` / `top`. Không cộng trừ `cfg.left` của cha và không dùng số ước lượng chiều cao header. Hàm này cũng đặt `dock` cho toolbar và z-index cho control không phải field.
3. `builder.dropControl(cfg, point)` gộp bước 1 và 2, làm tròn theo lưới khi đổi cha, rồi cập nhật tab (`builder.updateTabMembership`).
4. Khi vẽ lại từ JSON (undo, mở thiết kế, dán, nhân bản): `builder.renderControlByConfig` vẽ control rồi `builder.mountInParent` đưa phần tử vào content của cha. `left` / `top` trong JSON luôn là tọa độ theo cha và được dùng nguyên; hàm vẽ của từng loại control không quy đổi tọa độ. Cờ `_fromRestore` còn được gắn ở vài nơi gọi nhưng không còn tác dụng.
5. So `cfg.left` của hai control khác cha là sai. Cần so vị trí thì đo `getBoundingClientRect`.

Khi undo hoặc load: render cha trước con. Zoom là thuộc tính CSS `zoom` trên `#canvas-zoom-inner`. Mọi chuyển từ chuột sang pixel config phải chia `builder.viewScale` (`builder.clientToCanvasPoint` đo từ `#canvas-zoom-inner`).

## 2. Canvas, zoom, pan

`.canvas-shell` cuộn. `#canvas` không tự cuộn, margin 20px cho thước. Thước fixed theo viewport. Cỡ tối thiểu khoảng 1600×900, nới theo control xa nhất.

Zoom: nút và combo 50%–400%, phím Ctrl + `+` `−` `0`. Pan: giữ Space rồi kéo, hoặc nút giữa. Undo không được kéo scroll về 0.

**Vừa màn hình** (nút trên thanh dưới, và hai mục đầu của combo zoom): `builder.fitZoom(false)` thu phóng để thấy toàn bộ thiết kế, `builder.fitZoom(true)` chỉ vừa chiều rộng. Vùng bao lấy từ `builder.contentBounds()` (đo các control cấp trên cùng đang hiển thị). Không phóng quá 150%, giới hạn dưới theo `setZoom` (30%).

Thanh trên cùng (`.builder-header`, cao 48px) chứa: về trang chủ, tên thiết kế, trạng thái lưu, **Lưu** (kèm menu Lưu thành bản mới / Đổi tên, dự án, chia sẻ), Hoàn tác, Làm lại, Màn hình chuẩn, Chụp từ HRM, Xem trước, Xuất ảnh, ô **Hiện khung field**. Dưới 1240px các nút chỉ còn biểu tượng. Sự kiện gắn ở `initTopBar` trong `Builder.aspx`. Trang không còn thanh nút ở đáy. Lựa chọn Hiện khung field được nhớ trong `localStorage` (`builderShowFieldBorders`), kể cả khi Builder tự tắt lúc mở màn hình chuẩn hoặc nhận dạng ảnh.

Thước (`.canvas-ruler-h`, `.canvas-ruler-v`) và thanh zoom (`#canvasToolbar`) là phần tử `position: fixed` đặt theo khung `.canvas-shell`. Cả hai được tính lại bằng `ResizeObserver` trên `.canvas-shell` (`initRulers`, `initCanvasToolbar`), nên khi đóng / mở thanh control bên trái, đóng / mở hoặc kéo rộng phần thuộc tính, chúng chạy theo vùng vẽ và không đè lên panel hay nội dung. Trước đây thước chỉ cập nhật khi cuộn hoặc đổi cỡ cửa sổ.

## 3. Toolbox

Cột trái. Kéo `.tool-item` thả lên canvas, hoặc **bấm** vào nó để thêm nhanh (`builder.addControlFromToolbox`): control mới nằm trong vùng đang nhìn thấy, mỗi lần bấm lệch thêm 22px; nếu đang chọn popup, group box, section hoặc ESS section thì control mới nằm trong khối đó. Ô **Tìm control** lọc theo tên, Escape để xóa ô tìm.

- Lưới và popup: Core Grid, ESS Grid, Popup, ba popup Organization Structure dựng sẵn (xem dưới)
- Đánh dấu: khoanh đỏ, bôi vàng, ghi chú (mục 14)
- Control Core: button, checkbox, combo, multiselect, date, group box, label, numeric, radio, text, section, memo
- Control ESS: text, numeric, combo, date, memo, button, tag, progress, image, ESS section
- Control đặc biệt: language combo, toolbar, tab page, tree (cây cha - con)
- Control mẫu đã lưu: control đã lưu, tải lúc mở trang

`data-control` là loại, `data-ui` là core hoặc ess. `builder.addControl(type, uiMode, dropPoint)` luôn tạo control trên canvas với góc trên trái đúng tại điểm thả (kể cả popup, tab page, ESS section, toolbar – `builder.placeAtDropPoint`), rồi gọi `builder.dropControl` để gán cha theo mục 1: thả lên khối chứa nào thì vào khối đó, thả ra ngoài mép (dù chỉ vài pixel) thì nằm trên canvas. Các hàm `addNew` của từng loại control không tự dò cha. Kéo từ toolbox không dùng quán tính: control rơi đúng chỗ nhả chuột kể cả khi nhả lúc đang rê nhanh. Cả lần thêm là một bước Undo. `builder.addControl` bỏ chọn mọi control trước khi thêm, vì bấm trong toolbox và trên thanh trên cùng không còn bỏ chọn như bấm ra vùng trống. Bấm để thêm popup hoặc đánh dấu thì luôn đặt trên canvas, không theo khối đang chọn; bấm để thêm tab page khi đang chọn một popup thì tab page nằm trong popup đó. Tab page vừa thêm (kéo hoặc bấm) được gán cha theo điểm thả bằng `builder.placeInContainer` (chỉ nhận popup): trước đây tab page thả lên popup vẫn nằm trên canvas và bị popup che mất.

Mục toolbox có `data-control="screen:<key>"` chèn cả một màn hình của thư viện tại điểm thả (`builderTemplates.insertAt(key, dropPoint)`). Đang có ba mục: Popup Select Organization (chọn một), Popup Select Organization (chọn nhiều), Popup Organization Structure (Map to Unit).

Khi kéo từ toolbox, nhãn tên control đi theo con trỏ (`builder.showDragHint` / `moveDragHint`), con trỏ là `copy`, và là `no-drop` khi đang ở trên toolbox. `builder.toolboxDropPoint` quyết định điểm thả: nhả trên toolbox thì không thêm gì; nhả ngoài vùng vẽ đang nhìn thấy (trên phần thuộc tính, thanh trên cùng, thanh zoom) thì control được đặt vào mép gần nhất của vùng nhìn thấy. Sau khi thêm, `builder.revealControl` cuộn vùng vẽ để control mới nằm trọn trong tầm nhìn.

Nút đóng / mở toolbox (`#toolboxToggle`) là `position: fixed` ở giữa mép phải của toolbox, nên vẫn nhìn thấy và bấm được khi danh sách control cuộn xuống.

## 4. Chọn

Click chọn một control và mở thuộc tính của nó; control khác bị bỏ chọn. Ctrl+click hoặc Shift+click thêm / bớt một control thuộc bất kỳ loại nào (field, grid, toolbar, popup, tab page, đánh dấu). Click nhỏ trên vùng trống hoặc Escape thì bỏ chọn. Click content của group không chọn group — để quét hoặc chọn con.

**Ctrl+A** chọn mọi control đang hiển thị nằm thẳng trên trang (`builder.selectAll`). Control nằm trong popup, group box, section, ESS section được chọn theo khối chứa của nó; control ở tab không mở đi theo tab page. Trình duyệt không còn bôi đen chữ của cả trang. Khi con trỏ đang ở ô nhập thì Ctrl+A vẫn là chọn chữ trong ô; khi đang mở hộp thoại thì Builder không can thiệp.

**Quét khối** (kéo trên vùng trống) chọn các control chạm khung quét và **cùng cấp với nơi bắt đầu quét** (`builder.beginMarquee` ghi phạm vi, `builder.endMarquee` chọn):

| Bắt đầu quét ở | Được chọn |
|---|---|
| Vùng trống của canvas | Control nằm thẳng trên canvas, kể cả popup, tab page và thành viên của tab đang mở. Không chọn con của khối chứa. |
| Thân popup, content của group box / section / ESS section | Chỉ con trực tiếp của khối đó, không chọn chính khối. |
| Thân tab page | Control trên canvas (thành viên của tab), không chọn chính tab page. |

Giữ Ctrl hoặc Shift khi quét thì cộng thêm vào vùng đang chọn. Con trỏ vào dải 28px sát mép vùng vẽ thì canvas tự cuộn và khung quét dài theo (`builder.startDragScroll`, cùng cơ chế với kéo control). Control có `parentId` trỏ tới control không còn tồn tại (thiết kế cũ) được coi là nằm trên canvas (`builder.containerOf`).

Vùng chọn nhiều control:

- Panel thuộc tính ghi số control đang chọn; nhãn `rộng × cao` đo đúng khung bao của vùng chọn và nằm giữa bên dưới.
- Nhấn lên một control thuộc vùng chọn, hoặc lên control nằm trong khối chứa thuộc vùng chọn, rồi kéo: cả vùng chọn đi cùng, dù nắm vào field, tiêu đề grid, tiêu đề popup, dải tab hay toolbar (mục 5). Nhấn rồi nhả mà không kéo: chỉ còn control vừa bấm được chọn.
- Phím mũi tên dời cả vùng chọn như một khối; con của khối chứa đang được chọn không bị dời thêm lần nữa; thành viên của tab page đi theo tab page.
- Delete xóa cả vùng chọn sau một lần hỏi; Ctrl+Z một lần lấy lại tất cả.

Mọi thay đổi vùng chọn nhiều control đi qua `builder.selectControls(ids)`: class `canvas-control-selected` trên từng control (popup cũng dùng class này khi nằm trong vùng chọn nhiều), thêm `page-field-selected` cho field. `builder.pressControl` bắt `mousedown` ở capture phase trước handler riêng của từng control: Ctrl / Shift thì thêm bớt; nhấn lên thành viên của vùng chọn nhiều thì giữ vùng chọn (handler riêng không chạy); nhấn lên control khác thì xóa vùng chọn cũ rồi để handler riêng chọn control đó. Phần control không dùng để chọn (bên trong lưới, nút đóng mở ESS section, ghi chú đang gõ chữ, thân khối chứa) được bỏ qua (`builder.pressedControl`).

DOM class selected là nguồn sự thật lúc kéo. `beginDragSelection` đọc các id đang selected.

## 5. Kéo và resize

**Phân biệt di chuyển và đổi kích thước.** Di chuyển: nắm vào bất kỳ đâu trên control, kể cả ô nhập, ô chọn và sát mép (ô nhập trên canvas có `pointer-events: none`, chỉ là hình vẽ). Popup kéo bằng vùng tiêu đề, grid kéo bằng thanh tiêu đề / header, ESS section kéo bằng header, tab page kéo bằng dải tab (cả phần trống lẫn tên tab; thân tab page để quét khối), toolbar kéo ở bất kỳ đâu kể cả trên nút (toolbar nằm trên dải tiêu đề không có nền riêng nên không còn phần "không phải nút" để nắm). Đổi kích thước: chỉ bằng **tay nắm nhìn thấy được** ở mép phải, mép dưới và góc, và tay nắm chỉ hoạt động khi control đang được chọn (field: `.page-field-resizer`, `.page-field-resize-handle-right/bottom`; popup, tab page, ESS section, grid: `.ub-resize-right/bottom/corner`). Không còn vùng resize vô hình: mép trái popup, mép control chưa chọn và vùng tiêu đề sát mép đều là di chuyển. Với interact.js phải khai báo `edges` bằng selector của tay nắm; dùng `edges: true` kèm `allowFrom` và `margin` thì bấm gần mép không ra thao tác nào.

**Cộng dồn từ lúc bắt đầu.** Kéo và resize đều cộng tổng quãng chuột (đã chia `builder.viewScale`) vào giá trị lúc bắt đầu rồi mới làm tròn theo lưới. Không cộng delta từng nhịp lên giá trị đã làm tròn — kéo chậm 1px mỗi nhịp sẽ đứng yên. Resize chỉ làm tròn chiều đang đổi. Nhiều control chọn cùng đi **đúng một delta**: quãng dời được làm tròn theo lưới một lần, lấy control đang nắm làm mốc (`shiftDragSelection`), không làm tròn riêng từng control. Phím mũi tên cũng vậy (`moveSelectionBy`, mốc là control đầu của vùng chọn, chỉ làm tròn chiều đang dời). Lúc thả nhiều control (`dropDraggedControls`): control đang nắm được thả trước và hút lưới như kéo đơn; nếu nó bị hút lệch đi thì các control còn lại dời theo đúng quãng đó rồi được gán cha mà không hút lưới riêng (`_dropExact`). Trước đây mỗi control tự hút lưới 5px, nên màn hình chụp từ HRM (tọa độ lẻ) bị xô lệch 1–4px giữa các control mỗi lần dời cả nhóm.

**Nhấc lên canvas khi kéo.** Lúc bắt đầu kéo, control (và mọi control trong vùng chọn) được chuyển tạm ra lớp canvas bằng `builder.liftForDrag` (class `ub-dragging`, luôn nổi trên cùng), nên kéo ra khỏi khối chứa theo mọi hướng đều được và không bị che. Khi thả, `builder.dropDraggedControls` (field, nhiều control) hoặc `builder.finishControlDrag` (grid, ESS grid, ESS section, toolbar) gán lại cha bằng `builder.dropControl`. Khối chứa được xử lý trước control thường, khối lớn trước khối nhỏ. Control trên canvas bị chặn mép thước (left/top ≥ 20); trong khối chứa thì ≥ 0. History chỉ ghi khi thả chuột.

Nếu đang kéo **khối chứa**:

- Con cháu nằm trong DOM của nó nên tự đi theo; không cộng delta cho con, vị trí theo cha của con được ghim lại mỗi nhịp kéo.
- Control cùng cha nằm **lọt hẳn** trong khung của group box / section / ESS section và xếp lớp phía trên nó được nhận làm con ngay khi bắt đầu kéo (`builder.adoptControlsIntoGroup`). Control chỉ đè một phần, hoặc nằm dưới, thì không bị nhận.
- Popup đi cùng toàn bộ cây con; kéo popup là cộng dồn đồng bộ, không dời vị trí sang khung hình sau.

Resize tối thiểu: field khoảng 40×20, popup 350×180, tab page 300×150, ESS section 200×80. Group/section không chạy layout caption khi resize.

Checkbox **Hiện khung field** tắt viền field thường. Group và section vẫn hiện khung. Viền và tay nắm là chrome designer, không mang sang preview.

**Không bôi đen chữ khi kéo.** Từ lúc nhấn chuột trong `.canvas-shell` (trừ ô nhập thật) đến lúc nhả, `body` mang class `ub-gesture` (`builder.beginGesture` / `endGesture`): mọi phần tử bị tắt chọn chữ, kể cả ô của grid. Trước đây kéo control qua grid hoặc ra sát mép làm cả trang bị bôi xanh như Ctrl+A và trình duyệt tự cuộn theo vùng bôi.

**Giữ control trong vùng nhìn và tự cuộn ở mép.** Quãng kéo được tính theo con trỏ đã bị chặn trong khung nhìn thấy của vùng vẽ (`builder.clampDragDelta`), nên control không chạy theo con trỏ ra dưới phần thuộc tính hay toolbox. Khi con trỏ vào dải 28px sát mép hoặc vượt ra ngoài, `builder.startDragScroll` cuộn `.canvas-shell` theo thời gian (180–600 px/giây trong dải, tới 1300 px/giây khi ra ngoài) và dời control đúng bằng quãng đã cuộn. Field dùng `dragSelectionMove`; grid, ESS grid, toolbar, ESS section dùng `dragControlBy`; popup, tab page, đánh dấu dùng `builder.dragStep`.

**Kéo vùng chọn nhiều control.** Khi control đang kéo thuộc vùng chọn từ 2 control trở lên, mọi loại control đều chuyển sang cùng một đường kéo của field: `builder.dragSelectionBy(id, dx, dy)` gọi `beginDragSelection` ở nhịp đầu rồi `dragSelectionMove`; lúc thả `builder.finishSelectionDrag` gọi `dropDraggedControls` và `endDragSelection` (`dragControlBy` / `finishControlDrag` tự gọi hai hàm này; popup, tab page, đánh dấu gọi trong listener của mình). Cả vùng chọn đi cùng một quãng, dừng cùng nhau ở mép thước, và là một bước Undo. Trong lúc kéo: popup và tab page không bị nhấc lớp (giữ thứ tự che); thành viên của tab page đang được kéo đi theo kể cả ở tab không mở và không bị xét lại cha lúc thả (`_dragCarriedIds`); con của khối chứa đang được kéo giữ nguyên vị trí trong khối và cũng không bị xét lại cha, kể cả khi chính nó là control được nắm để kéo.

## 6. Group box và Section — khác nhóm Ctrl+G

Group box (`ftype: groupbox`) và Section (`ftype: section`) là control khung, mặc định 600×120. Tiêu đề group đè cạnh trên. Con append vào content, `parentId` = id khung, tọa độ relative. Con có thể là field, grid, ESS grid, toolbar, ESS section hoặc group box / section khác; lồng nhiều tầng được (ví dụ popup → group box → section → field). Xóa khung thì xóa con. Nhân bản (Ctrl+D) và sao chép / dán lấy cả cây con (`builderSnippet.collectSubtree`, gồm cả thành viên của tab page). z-index khung mặc định 0, field thường là 1.

Ctrl+G là **nhóm logic**, không vẽ khung. Mỗi control nhận `groupId` và offset. Kéo một thành viên thì cả nhóm đi. Group box không được mở rộng selection theo `groupId` — data cũ sẽ kéo nhầm control ngoài khung.

| | Group box | Ctrl+G |
|---|---|---|
| Là control | Có | Không |
| Con trong DOM | Có | Không |
| Đổi hệ tọa độ | Relative với content | Giữ nguyên tọa độ từng control |

## 7. Undo / Redo

Ctrl+Z lùi một thao tác. Ctrl+Y hoặc Ctrl+Shift+Z làm lại. History là JSON của `builder.controls`, tối đa khoảng 100 bước.

Một thao tác một bước: kéo/resize ghi lúc thả; gõ thuộc tính gộp đến khi rời ô; giữ mũi tên gộp đến lúc thả phím. Undo rồi sửa tiếp thì cắt nhánh redo. Nếu không cắt, Ctrl+Z nhảy vào layout đã undo.

Restore: vẽ lại cha trước con bằng `builder.renderControlByConfig`, giữ scroll của `.canvas-shell`, chọn lại id cũ, không cuộn viewport. Suốt lúc restore `builder._suppressHistory = true`, nên không hàm vẽ nào ghi thêm history (trước đây ESS section gọi `refreshJson` khi vẽ làm Ctrl+Z kẹt giữa hai trạng thái). Hàm vẽ của control không được gọi `refreshJson` ở lần vẽ đầu.

Một lần thả từ toolbox, một lần kéo (kể cả kéo nhiều control và đổi cha), một lần nhân bản hoặc dán, một lần xóa nhiều control, một lần xóa popup cùng mọi control bên trong đều là đúng một bước. Đổi tab đang mở của tab page cũng là một bước, vì `activeTabIndex` nằm trong dữ liệu thiết kế.

Ảnh trong thiết kế (`imageData` của field Image, ví dụ ảnh nền của trang mở từ draw.io) chỉ được giữ một lần cho cả lịch sử: `builder.packHistory` thay chuỗi ảnh trong từng bước bằng tham chiếu `@history-image:<n>` tới `builder._historyImages`, `builder.unpackHistory` trả lại ảnh ngay trước `restoreFromJson`. `builder.resetHistory` bỏ luôn kho ảnh cũ. Mã nào đọc `builder.history` phải đi qua `unpackHistory`. Số đo trên trang thật: thiết kế 3,4 MB (một ảnh 1100×700) sau 32 bước thì lịch sử chiếm 27 KB, Undo khoảng 67 ms mỗi bước; trước khi có cách này mỗi bước giữ nguyên một bản ảnh.

## 8. Căn, copy, phím tắt

Align (từ 2 control): khít trái / phải / trên / dưới của bounds cụm. Alt+mũi tên. Chỉ đáng tin khi các control cùng cha — khác hệ tọa độ sẽ nhìn sai.

Distribute (từ 3): giữ hai đầu, chia đều khe ở giữa. Alt+Shift+H hoặc V.

Ctrl+D nhân bản, lệch +20,+20. Ctrl+C copy vào clipboard **trong app**. Ctrl+Shift+V dán. Ctrl+Alt+C copy style field (không lấy vị trí). Delete xóa; xóa field thì xóa con. Chọn nhiều control thì Delete hỏi một lần rồi xóa tất cả. Xóa popup thì xóa mọi control bên trong, kể cả grid và toolbar gắn trên tiêu đề (`builder.collectDescendantIds`), không để lại control mất cha. Xóa group box / section / ESS section cũng xóa grid, toolbar nằm trong nó; xóa tab page thì xóa các thành viên của nó, kể cả khi tab page nằm trong popup. Mỗi lần xóa như vậy là một bước Undo (`builder.asOneStep`). `builder.syncControlsWithDom` chỉ giữ control còn phần tử **trên canvas** (`builder.controlElement`); bản cũ dò `[data-id]` trên cả trang nên dòng tương ứng trong Danh sách control làm nó tưởng control vẫn còn, để lại control mất cha.

Phím tắt không chạy khi focus đang ở input/textarea/select.

| Phím | Việc |
|---|---|
| Ctrl+S / Ctrl+Shift+S | Lưu / lưu thành bản mới (chạy cả khi đang gõ trong ô thuộc tính) |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Ctrl+A | Chọn mọi control trên trang |
| Ctrl+click / Shift+click | Thêm / bớt một control vào vùng chọn |
| Ctrl+C / Ctrl+Shift+V | Copy / paste control |
| Ctrl+Alt+C | Copy style |
| Ctrl+D | Duplicate |
| Delete | Xóa |
| Ctrl+G / Ctrl+Shift+G | Nhóm / hủy nhóm logic |
| Mũi tên / Shift+mũi tên | Nudge cả vùng chọn (1 bước lưới / 5 bước) |
| Ctrl + + − 0 | Zoom |
| Ctrl+\ | Ẩn / hiện Toolbox và phần thuộc tính (mục 15.3) |
| Bấm đúp vào chữ | Sửa chữ tại chỗ (mục 15.1) |
| Space+kéo | Pan |
| Escape | Bỏ chọn |

## 9. Guide, thuộc tính, layers, menu

Lúc kéo, đường hồng căn trái/giữa/phải và trên/giữa/dưới, ngưỡng hút ~5px. Nhãn `rộng × cao` dưới selection. Guide không ghi JSON. Guide chỉ so với các control **cùng cha lúc bắt đầu kéo** và đang hiển thị (`builder.collectGuideTargets`); vùng chọn có control khác cha thì không dùng guide. Độ hút tính từ quãng chuột thô, không tính từ vị trí đã hút, nên kéo chậm không bị dính. Phần tử guide được gắn lại vào đúng khung chứa mỗi lần kéo (`ensureSmartGuideEls`), kể cả sau Undo.

Panel phải sửa caption, required, cỡ, z-index, item combo, cột multiselect, màu nút ESS, ảnh, progress, cây. Đổi z-index group thì con = cha + 1. Nội dung panel của field, toolbar, popup, tab page, ESS section, đánh dấu (`.pp-body`) và tab Chung của grid (`.pp-tab-panel`) **cuộn dọc**, các nhóm không co lại; thân panel (`.prop-tab-body`) cao hết phần còn lại của cột phải. Trước đây các thẻ bị ép co cho vừa chiều cao nên trên màn hình laptop nhiều thuộc tính bị cắt mất. Cách dựng và trình bày phần thuộc tính: mục 15.11.

Tab **Danh sách control** (Layers) là cây `parentId`. Click dòng để chọn control bị che; control được chọn từ danh sách cũng được nạp thuộc tính vào tab **Thuộc tính** (`builder.selectControlFromOutline` gọi `builder.showPropertiesFor`, hàm này gọi đúng `showProperties` của từng loại control). Bấm vào bất kỳ đâu trong cột phải (`.prop-shell`: tiêu đề hai tab, thanh gập panel, lề) **không** bỏ chọn control, nên chuyển qua lại giữa hai tab vẫn giữ control đang chọn và thuộc tính của nó; chỉ bấm vào khoảng trắng của danh sách control mới bỏ chọn. Quy tắc bỏ chọn khi bấm ra ngoài nằm ở `mousedown.builderClearSelection` trong `builder.js`.

Menu chuột phải dựng lại mỗi lần mở theo control vừa bấm (`builder.contextMenuItems`), chỉ hiện mục dùng được:

- Luôn có: Nhân bản, Sao chép, Dán, Xóa, **Đánh dấu** (khoanh đỏ, bôi vàng, thêm ghi chú – mục 14), Lưu thành component.
- Field: **Đổi loại control** và **Kiểu hiển thị** (sao chép / dán kiểu). Ảnh: **Thay ảnh bằng control** và **Tách ảnh thành control** (mục 12).
- Chọn từ 2 field: **Căn chỉnh**. Chọn từ 2 control: Nhóm hoặc Hủy nhóm. Khối chứa (popup, group box, section, ESS section): **Tự xếp control bên trong**. Grid: “Đưa vào Popup / ESS Section…”.

Mục có menu con mở khi rê chuột hoặc bấm; menu và menu con luôn nằm trong vùng nhìn (`placeContextSubmenu`). Bấm chuột phải lên control chưa được chọn thì chỉ chọn control đó (`builder.selectOnly`); bấm lên control đang nằm trong vùng chọn nhiều thì giữ nguyên vùng chọn. Sự kiện `contextmenu` chạy lần lượt cho control trong cùng rồi tới các cha và `#canvas`; chỉ lần chạy đầu của mỗi lần bấm được xử lý (so `timeStamp`), `builder._contextControlId` giữ control trong cùng, `builder._contextPoint` giữ vị trí bấm.

**Đổi loại control** (`controlField.changeType(id, ftype, uiMode)`): tạo config mặc định của loại mới rồi giữ lại id, vị trí, cha, tab, nhóm, bắt buộc, khóa, đậm / nghiêng, chiều rộng; chiều cao giữ nếu nằm trong khoảng 0,5–1,6 lần chiều cao mặc định của loại mới. Chữ đi theo: caption của ô nhập thành chữ của label / nút và ngược lại; giá trị duy nhất của combobox thành giá trị của text box. Danh sách loại nằm ở `builder.fieldTypeChoices`. Chọn nhiều field thì đổi tất cả. Một lần đổi là một bước Undo.

## 10. Từng loại control

**Popup** (`type: popup`): header xanh, title bar, body. Kéo bằng header. Body để kéo field hoặc quét chọn. Con relative với body. z-index ~3000. `overflow: hidden`. Đổi kích thước bằng tay nắm mép phải, mép dưới và góc (`.ub-resize-*`), tối thiểu 350×180. Tay nắm của popup luôn nằm trên mọi control con (`.popup-design > .ub-resize` trong `Builder.aspx` có `z-index` lớn nhất trong popup): control con của popup mang `z-index` bằng `z-index` của popup cộng 1 trở lên (3001, lưới 3010), cao hơn mức 1001 của tay nắm dùng chung, nên trước đây control con chạm mép hoặc góc popup (ví dụ ESS Section rộng và cao bằng popup) che mất tay nắm và không kéo giãn popup được; kịch bản `popupresizecovered` kiểm tra việc này. Popup không nằm trong khối chứa nào.

**Tab page**: danh sách tab + `activeTabIndex`. Tab page **không** chứa con trong DOM: thành viên là control **cùng cha với tab page** (cùng nằm trên canvas, hoặc cùng là con của một popup), dùng tọa độ của cha đó và mang `tabPageId` + `tabIndex` (field, grid, toolbar, ESS section, group box). Thành viên được xác định khi thả: điểm xét (con trỏ, hoặc tâm control) nằm trong khung một tab page cùng cha thì thuộc tab đang mở (`builder.updateTabMembership`); control nằm trong group box / section / ESS section thì theo tab của khối đó. Tab page trong popup: kéo tab page thì thành viên trong popup đi theo, thả ô mới vào chỗ trống của tab thì ô thuộc tab đang mở, dời một thành viên trong tab thì nó vẫn thuộc tab (trước đây control là con của popup luôn bị bỏ khỏi tab, nên hiện ở mọi tab). Chỉ tab active hiện. Đổi tab không xóa tọa độ tab kia. **Dải tab** (`.tabpage-tabs`) là tay nắm: bấm vào dải tab hoặc tên tab thì chọn tab page và mở thuộc tính của nó (bấm tên tab còn chuyển tab), kéo từ dải tab hoặc từ tên tab thì dời tab page (kéo từ tên tab không làm chuyển tab). **Thân tab page** (mọi chỗ bên dưới dải tab, `builder.isTabBody`) không chọn và không kéo tab page: bấm vào chỗ trống để quét khối chọn các control trong tab, giống thân popup và content của group box. Kéo tab page: `builder.claimTabMembers` nhận thêm control chưa thuộc tab nào có tâm nằm trong khung, rồi `controlTabPage.moveMembers` dời các thành viên theo; phím mũi tên trên tab page đang chọn cũng dời thành viên theo; lúc render `controlTabPage.syncMember` ẩn/hiện theo tab đang mở. Dữ liệu cũ có `parentId` trỏ vào tab page được đổi sang `tabPageId` lúc vẽ (`renderControlByConfig`).

**Toolbar**: một control, các nút là dữ liệu trong config, không phải từng field. Thả lên popup thì gắn vào khung popup (`dock = "popup"`, tọa độ theo `.popup-design`); thả lên group box / section / ESS section thì là con bình thường; chỉ thả đúng trong khung mới nhận, không hút khi thả gần. Kéo dùng chung `builder.dragControlBy` / `builder.finishControlDrag`.

Toolbar vẽ phẳng như menu của Core: nền `#e7e7e5`, nút không viền, vạch ngăn mảnh, biểu tượng 16px (`.canvas-toolbar`, `.canvas-toolbar-btn` trong `Builder.aspx`). Biểu tượng chọn từ `MENU_ICON_LIST` (`common.js`), gồm cả Open Report, Download, OK / Select lấy từ source Core.

**Toolbar trên dải tiêu đề** (`controlToolbar.alignToBand`): toolbar là con của popup hoặc của Section Core và có tâm nằm trong dải tiêu đề của khối đó (`.popup-titlebar`, `.page-field-section-header`) thì được canh giữa dải theo chiều dọc và bỏ nền / viền riêng (`showBackground = false`), giống menu nằm trên dải của Core. Quy tắc chạy sau mỗi lần vẽ (`renderControlByConfig`) và mỗi lần thả (`dropControl`), nên áp dụng cho thiết kế cũ, màn hình thư viện, kết quả chụp và kéo thả tay. `setControlParent` cho phép toolbar trong Section có `top` âm tới đỉnh dải tiêu đề, nên kéo toolbar thả lên dải tiêu đề của Section là được.

**Tree** (field `ftype: "tree"`, vẽ bởi `control-tree.js`): cây cha - con kiểu ASPxTreeList của Core (Organization Structure, Functions). Config: `treeNodes[{ text, level, open, checked, focused, cells[] }]` là danh sách phẳng theo thứ tự hiển thị (`level` là cấp, `open: false` là nhánh đang đóng), `treeCheck` (`box` ô chọn, `mark` dấu tích xanh / xám ở chế độ xem, `none`), `treeRowHeight`, `treeIndent`, `treeLines`, `treeScroll` (vẽ thanh cuộn), `treeColumns[{ caption, width, type, disabled }]` (cột phụ bên phải, ví dụ cột Auto Apply), `treeHeader`, `treeCaption`. Trên canvas: bấm nút + / − để đóng mở một nhánh, bấm ô chọn để tick; kéo bắt đầu từ các nút đó vẫn là di chuyển control. Trong thuộc tính: ô **Nodes** mỗi dòng một nút, thụt 2 dấu cách mỗi cấp, tiền tố `>` dòng đang chọn, `+` nhánh đóng, `[x]` đã tick, `[ ]` tích xám (chế độ xem); giá trị cột phụ viết sau `|`. Nút được tick ở kiểu `box` có chữ xanh như Core. CSS: `.core-tree*` trong `builder.css`; biểu tượng `tree-checked.png`, `tree-unchecked.png`.

**Image**: ảnh dán, thả hoặc chọn từ tệp vào ô ảnh còn mặc định thì control lấy đúng kích thước gốc của ảnh (`setFieldImage`); ô đã được đổi cỡ hoặc đã có ảnh thì giữ kích thước. Ảnh dán khi không chọn ô ảnh nào được đặt ở góc trên trái của vùng đang nhìn thấy. Bấm vào ô ảnh trống mở hộp chọn tệp.

**Grid** (`grid` DevExtreme, `ess-grid`): một control. Kéo vào popup, group box, section, ESS section như mọi control khác; menu “Đưa vào Popup / ESS Section…” (`builder.moveGridToContainer`) cũng đi qua `builder.setControlParent`. Tay nắm mép phải đổi chiều rộng.

Grid Core bật sửa dòng của DevExtreme (`editing.mode = "row"`) để sửa dữ liệu mẫu qua biểu tượng bút chì và dấu X. Cột lệnh mà DevExtreme tự thêm ở cuối lưới (chữ `Edit` `Delete`) được khai báo tường minh là cột `type: "buttons"` tên `baRowCommands` và **mặc định ẩn** (`controlGrid.buildDxColumns`), vì màn hình HRM không có cột này và BA không cần nó khi chụp. Cột chỉ hiện trong lúc một dòng đang được sửa hoặc thêm mới để có `Save` / `Cancel` (`onEditingStart`, `onInitNewRow` bật; `onSaved`, `onEditCanceled` tắt, qua `controlGrid.showRowCommands`); Enter lưu và Escape hủy vẫn dùng được.

CSS của Builder không đặt `pointer-events` cho phần tử bên trong lưới DevExtreme (chỉ giữ `user-select: text` trong `builder.css`). DevExtreme tự đặt `pointer-events: none` cho các lớp phủ của nó, ví dụ khung focus `.dx-datagrid-focus-overlay` nằm đè lên ô đang sửa và chữ gợi ý `.dx-placeholder`, để chuột đi xuyên tới ô nhập bên dưới. Quy tắc cũ ép `pointer-events: auto` cho mọi phần tử con của lưới làm khung focus nhận hết chuột: ô đang sửa mất focus ở lần bấm thứ hai, không bấm đúp chọn từ, không kéo bôi đen và phím gõ không vào ô. Kịch bản `gridcelledit` kiểm tra các thao tác này.

Cột của grid Core có kiểu hiển thị (`column.type`, ô **Display** trong thẻ cột): để trống là chữ thường; `tag` vẽ nhãn trạng thái có màu (`column.tags = [{ text, backColor, textColor }]`, sửa trong ô **Tags**, mỗi dòng `Text|#màu`); `checkbox` vẽ ô chọn. Giá trị mẫu không khớp tag nào thì các dòng lần lượt dùng từng tag trong danh sách (`controlGrid.tagFor`); cột checkbox không có giá trị đúng / sai thì dòng chẵn lẻ xen kẽ. CSS: `.grid-cell-tag`, `.grid-cell-check` trong `builder.css`. Grid ESS dùng kiểu cột `tag` sẵn có (`tagText`, `tagBackColor`, `tagTextColor`).

Memo Core luôn vẽ 3 dòng; khi `height` của field nhỏ hơn thì ô nhập được giới hạn theo `height` (`max-height`) để không đè lên control bên dưới.

**ESS section** (`collapsible-section`): mở/đóng. Là khối chứa như group box: con nằm trong `.ess-collapsible-content` và đi theo qua DOM, không cộng delta cho con. Thu gọn rồi kéo thì con vẫn giữ tọa độ theo cha.

**Field** (`type: field`): text, memo, number, numberic-test, date, combo, multiselect, checkbox, radio, button, label, language, tag, progress, image, tree, groupbox, section. `labelWidth` chia chỗ caption. `applyLayout` bỏ qua group, section, language. Label in đậm / nghiêng theo `captionBold` / `captionItalic` (áp lên chữ của label). Field ESS: ô nhập, ô chọn (combobox) và ô ngày cao bằng `height − 8`; caption canh giữa theo chiều dọc, riêng memo canh trên; checkbox / radio ESS đặt chữ sát ô chọn.

Ô ngày (`ftype: "date"`): giá trị mặc định là chữ tự do, control hiện đúng chuỗi BA gõ (`16/11/2026`, `2026-11-16`, `dd/MM/yyyy`…), không kiểm tra và không đổi định dạng; để trống thì ô trống. Date Core là ô chữ có biểu tượng lịch ở mép phải (`.core-date` > `.core-date-input` + `.core-date-button`, kiểu trong `builder-core.css`), cùng kích thước với ô Text Core. Trước đây Date Core dùng `input type="date"` của trình duyệt, chỉ nhận giá trị dạng `yyyy-MM-dd` (chuỗi khác bị bỏ, ô để trống) và luôn hiện theo định dạng của trình duyệt (`mm/dd/yyyy`). Date ESS là nhóm flex gồm ô chữ và ô lịch (`.ess-date`); `applyEssInnerHeight` chỉ đặt chiều cao cho nhóm và ô chữ, ô lịch tự giãn theo nhóm nên luôn cao bằng ô chữ. Kịch bản `datefields` kiểm tra cả hai.

Multi-select Dropdown (`ftype: "multiselect"`): mỗi mục có khóa chọn (`multiSelectItemValue`: trường `value`, không có thì cột đầu) và nhãn (`multiSelectItemLabel`: trường `label`, không có thì cột thứ hai, rồi cột đầu). Chữ trên nút do một hàm `multiSelectText` quyết định: chưa chọn gì hiện `Select...`; có chọn thì hiện nhãn các mục đang chọn theo thứ tự trong danh sách, cách nhau bằng `; `; nếu mục có khóa `all` (không phân biệt hoa thường) đang được chọn thì chỉ hiện nhãn của mục đó. Khóa đã lưu mà không còn trong danh sách thì bỏ qua. Ô chọn ở tiêu đề bảng chọn hoặc bỏ mọi mục; chỉ ô chọn trong thân bảng mới thêm bớt từng khóa (trước đây ô ở tiêu đề còn ghi thêm một khóa thừa `on` vào `multiselectSelectedValues`). Kịch bản `multiselecttext` kiểm tra các trường hợp này.

Canh dọc nhãn và control của field, mỗi quy tắc ở đúng một nơi:

- Nhãn và control của field Core nằm trên cùng một dòng và canh giữa nhau (`vertical-align: middle` của `.page-field-caption` / `.page-field-editor` trong `Builder.aspx`). Chỉ field có ô nhiều dòng (memo, nhận bằng `:has(> .page-field-editor > textarea)` trong `builder-core.css`) mới canh nhãn lên dòng đầu. Control vẫn bám mép trên của field như trước; nhãn dài xuống dòng thì cả khối nhãn canh giữa control.
- Ô chọn của checkbox / radio (Core và ESS) có bố cục riêng trong `Builder.aspx`: `.page-field-editor:has(> label)` cao bằng field, `label` bên trong là flex canh giữa, ô chọn và `label` không có lề. Nhờ vậy ô chọn nằm giữa chiều cao field và ngang hàng với nhãn, không phụ thuộc lề mặc định của Bootstrap 3 (`label { margin-bottom: 5px }`, `input[type=checkbox] { margin: 4px 0 0 }`) vốn được nạp vào trang chỉ để lấy Glyphicon.
- Quy tắc dành cho ô nhập chữ không áp lên ô chọn: `.page-field-editor input` (rộng 100%) trong `Builder.aspx` và `.page-field.ess-field .page-field-editor input` (cao tối thiểu 26px, viền, đệm) trong `builder-ess.css` đều loại `checkbox` / `radio` bằng `:where(:not(...))` để không đổi độ ưu tiên của quy tắc; `applyEssInnerHeight` không đặt chiều cao cho ô chọn (`TOGGLE_TYPES`). Trước đây ô chọn ESS bị kéo cao 26px và ô chọn Core bị kéo rộng theo chữ giá trị.

Kiểm thử: kịch bản `fieldalign` của `Tools/builder-harness` đo tâm chữ nhãn và tâm control của từng loại field (bật và tắt khung field, nhãn bên trái, nhãn hai dòng, ô chọn ESS, hộp Xem trước), sai lệch cho phép 1px.

## 11. Lưu, preview, Word

`#txtJson` là bản đọc của `builder.controls`. Thiết kế lưu vào bảng `UiBuilderControl` (JSON, tên, dự án, cờ chia sẻ, ảnh thu nhỏ) qua `SaveDesign`; mở lại bằng `/Builder?controlId=<id>` (`hiddenControlId`). Preview dựng lớp gần runtime, không có nét đứt và tay nắm. `WordExport.aspx` đọc `Output/generated-config.json` và trả file Word.

Luồng lưu (`builder.savePageToServer(options)` → `builder.persistPage`):

| Tình huống | Hành vi |
|---|---|
| Thiết kế của chính mình đang mở (`canOverwriteDesign`: loại page, là chủ, không phải bản clone, có id) | **Lưu** / Ctrl+S ghi thẳng vào đúng id, giữ nguyên tên, dự án, cờ chia sẻ. Không hỏi lại. |
| Thiết kế mới, mở từ màn hình chuẩn, bản clone, thiết kế của người khác, control mẫu | **Lưu** mở hộp hỏi tên, dự án, chia sẻ rồi tạo bản mới. Ô chia sẻ mặc định không tick. |
| **Lưu thành bản mới…** (Ctrl+Shift+S) | Hộp hỏi với tên gợi ý “… (bản sao)”, tạo id mới, chuyển sang sửa bản mới. |
| **Đổi tên, dự án, chia sẻ…** | Hộp hỏi điền sẵn giá trị hiện tại, ghi vào đúng id. |

Sau khi lưu xong: địa chỉ trang đổi thành `/Builder?controlId=<id>` (`history.replaceState`) nên F5 mở lại đúng thiết kế vừa lưu; `currentDesignInfo` giữ `ControlId`, `Name`, `IsPublic`, `ProjectId`. `LoadControl` trả thêm `ProjectId` (chỉ khi người gọi là chủ thiết kế) để lần lưu sau không làm mất dự án.

Trạng thái lưu (`#lblSaveState`, `builder.updateSaveState`): so `JSON.stringify(builder.controls)` với `builder.savedSnapshot` (đặt bởi `markSaved` sau khi mở hoặc lưu). Hiện “Chưa lưu”, “Đang lưu...”, “Đã lưu” hoặc “Đã lưu lúc HH:mm”. Hoàn tác về đúng trạng thái đã lưu thì hết “Chưa lưu”. Khi còn thay đổi chưa lưu, đóng tab hoặc chuyển trang sẽ bị trình duyệt hỏi lại (`beforeunload`). Sau khi mở một thiết kế, history được đặt lại (`resetHistory`) nên Hoàn tác không xóa trắng thiết kế vừa mở. Ảnh thu nhỏ chụp từ bản sao của canvas đã bỏ khung chọn.

Preview (`showPreview`) và Xuất hình ảnh (`exportImage`) nhân bản `#canvas` rồi dời nội dung để có lề. Chỉ control **cấp trên cùng** được dời, mỗi control đúng một lần (`builder.shiftTopLevelControls`); control con đi theo cha nên không dời riêng (`builder.isNestedControl`). Vùng bao cũng chỉ tính từ control cấp trên cùng. Thêm loại control mới có class riêng thì bổ sung class đó vào `builder.previewControlSelector`. Khi xuất ảnh, ô chọn trong field được đặt chiều cao theo chiều cao đang hiển thị (tối thiểu 26px) để chữ nằm giữa.

Ảnh xem trước của thiết kế (file `Content/design-thumbs/design-*.png`, hiện trên thẻ ở trang danh sách) do `persistPage` tạo lúc lưu: chụp `#canvas` như trước, rồi `builder.designThumbnail` cắt lấy vùng có control (`builder.thumbnailArea`, dựa trên `contentBounds`, lề 8px của `cropCanvas`), thêm nền trắng phía dưới khi vùng đó dẹt hơn 16:9 (tỷ lệ của thẻ, để thẻ hiện đủ chiều rộng), và thu nhỏ sao cho rộng tối đa 1600px, cao tối đa 3200px (`builder.thumbnailLimits`). Thiết kế không có control nào được lưu không kèm ảnh, trang danh sách hiện ô "Chưa có ảnh xem trước". Trước đây ảnh là cả vùng canvas ở tỷ lệ 2 (rộng 2000 đến 4000px), nên thiết kế nhỏ chỉ là một cụm bé trên thẻ. Số đo trên trang kiểm thử: thiết kế một ô nhập 143 KB xuống 8 KB (552×311); màn hình Employee Profile 227 KB xuống 144 KB (1600×900); bước tạo ảnh 34 đến 49 ms xuống 13 đến 14 ms, thời gian chụp không đổi. Thiết kế đã lưu giữ ảnh cũ cho tới lần lưu kế tiếp. Ảnh vẫn theo mức zoom lúc lưu. Kịch bản `savethumb` kiểm tra các trường hợp này.

Template controls là control đơn tái sử dụng, không phải cả trang.

## 12. Tự xếp (auto-layout), cắt ảnh, nhận dạng cấu trúc từ ảnh

Dành cho BA chỉnh một màn hình đã có sẵn trong chương trình: chụp ảnh → Ctrl+V vào Builder → sửa. Không cần mạng, không gọi AI ngoài.

Script: `builder-autolayout.js`, `builder-slice.js`, `builder-import.js`, `builder-snippet.js`. Menu chuột phải gọi từng chức năng.

**Tự xếp** (`cfg.autoLayout = { mode, gap, pad, autoHeight }`, chọn group box / section / popup):

| mode | Cách xếp | Dùng cho |
|---|---|---|
| `flow` | ngang, hết chỗ thì xuống hàng | chip, thẻ |
| `stack` | dọc, từ trên xuống | các dòng form |
| `rows` | giữ cột (`left`) như ảnh, dồn theo chiều dọc, va chạm ngang thì đẩy sang phải | ảnh chụp form nhiều dòng |

Thứ tự lấy từ vị trí hiện tại của control: thả vào giữa thì nằm giữa, cắt/xóa thì khoảng trống khép lại, khối đổi cao thì khối anh em bên dưới dịch theo. Dữ liệu vẫn là `left/top/width/height`, nên lưu, preview, Word không đổi. Layout chạy trong `builder.refreshJson` (bọc lại), nên Undo vẫn một bước. Chiều cao khối = inset trên + đáy ô cuối + pad + inset dưới (đo từ DOM, không dùng chiều cao content vì content có `min-height`).

**Cắt ảnh** (`slice-image`): vẽ khung cắt / khung che trên ảnh, ra nhiều ESS Image.

**Nhận dạng cấu trúc** (`import-structure`, `builderImport.build`): quét màu và khoảng trắng trên canvas, không cần mạng. Thanh màu ngang khổ (đậm hoặc xám nhạt) mở một section. Phần còn lại cắt kiểu XY-cut đệ quy (cắt ngang theo dòng trống, cắt dọc theo cột trống); các cột nhiều dòng thẳng hàng (nhãn | ô nhập | nhãn | ô nhập) được gom lại thành từng hàng để mỗi nhãn đi cùng ô nhập của nó. Kết quả là các group box **trần** lồng nhau (`cfg.bare = true`: không viền, không tiêu đề; CSS `.page-field-groupbox-bare` trong `Builder.aspx`, class gắn ở `control-field.js`), mỗi khối bật tự xếp `rows`, lá là lát ảnh ESS Image. Nét kẻ mảnh và chấm vụn bị bỏ.

Chữ được đọc bằng Tesseract chạy ngay trong trình duyệt (`Scripts/vendor/tesseract`), loại control đoán từ điểm ảnh (`imp.classify`, `boxKind`). Ô không đoán được vẫn là lát ảnh. Menu chuột phải có hai cách sửa nhanh sau khi nhận dạng: **Thay ảnh bằng control** (lát ảnh thành control cùng vị trí, cùng cỡ) và **Đổi loại control** (mục 9).

Quy tắc đoán loại cho màn hình Core:

- Ô có mũi tên bên phải là combobox. Ô có **hai** mũi tên xếp dọc (nút tăng / giảm) là Numeric.
- Ô có giá trị dạng ngày (`14-11-2026`, `2026/11/14`…) là Date. Ô combobox trống có nhãn kết thúc bằng “Date” / “ngày” hoặc bắt đầu bằng “Date of”, “Ngày”, “Từ ngày”, “Đến ngày” (`DATE_CAPTION`) cũng là Date, vì ô ngày của HRM Core nhìn giống hệt combobox.
- Popup: dải công cụ ngay dưới tiêu đề được tìm trong 12px đầu, bỏ qua dải đệm mỏng phía trên nó (`findPopup`); chữ Save / Cancel… thành Toolbar menu của popup. Phần thân popup đi qua `imp.makePage` nên lưới bên trong popup cũng được nhận ra; lưới trong popup không có vùng “kéo cột để nhóm”.

Giới hạn: ô nhập có biểu tượng ở mép phải (ví dụ nút dịch) dễ bị nhận nhầm là combobox hoặc Numeric; cặp nút “…” và “Clear” nằm sát nhau có thể thành một combobox; thanh công cụ đầu trang (không phải popup) có thể thành section; hàng bị đẩy quá rộng thì tràn ra ngoài khung (rows chưa tự xuống dòng); nếu Preview có CSS riêng thì cần thêm rule `.page-field-groupbox-bare` tương tự.

**Tìm lưới trong ảnh** (`builderImport.findGrids`): hàng tiêu đề cột là dải nằm giữa hai đường ngang dài cách nhau 18–60px, có từ 3 đường phân cột dọc. Dải nền trắng (trùng nền trang) chỉ được nhận khi dải ngay bên dưới giữ đúng các đường phân cột đó (`tableLike`). Dải có màu nền nhưng không thẳng cột với dải dưới (ví dụ dải tên lưới và nút Add / Delete) bị bỏ qua nếu dải ngay dưới nó mới là hàng tiêu đề thật. Nhờ vậy lưới của HRM có tiêu đề nền trắng được nhận ra cả khi có và không có dòng lọc. Lưới **chưa có dòng dữ liệu** (chỉ một đường kẻ dưới hàng tiêu đề) được nhận khi ngay phía trên hàng tiêu đề có dải tên lưới có màu nền (`titleBandAbove`). Lưới dựng ra có số dòng mẫu bằng số dòng thấy trong ảnh (1–5, `sampleData`); nếu lưới trong Builder vẫn cao hơn vùng của nó trong ảnh thì các control cấp trên cùng nằm bên dưới được đẩy xuống và popup chứa nó được nới cao (`pushBelowGrids`, `gridRenderHeight`). Ô tiêu đề đầu tiên chỉ chứa một ô vuông nhỏ là cột chọn dòng, kể cả khi ô đó rộng (`squareOnly`). Còn hạn chế ở chế độ Core: nút khác Add / Delete trên dải tên lưới không được đọc; vùng sát dưới lưới (khoảng 64px) bị xóa cùng lưới nên control nằm trong vùng đó có thể mất; cột trạng thái dạng tag và cột checkbox chỉ thành cột chữ thường. Với màn hình đang chạy trong HRM, dùng “Chụp từ HRM” (mục 13) cho kết quả chính xác hơn nhận dạng từ ảnh.

**Trang Core làm theo giao diện ESS** (lệnh **Nhận dạng thành control ESS…**), ví dụ Tax Deductions & Allowances, 13th month payment:

- Bảng không có đường phân cột dọc (`findGrids`, lượt thứ hai, `plain: true`): hai đường ngang dài cùng bề ngang làm hàng tiêu đề, theo sau là các đường kẻ dòng cách đều. Đường kẻ của vùng khác nằm cạnh (thẻ tổng bên phải) được bỏ qua khi dò dòng (`nextOver`). Dải có màu nền nằm ngay trên hàng tiêu đề thật (dải công cụ) không bị nhận nhầm làm tiêu đề. Bảng **rỗng** chỉ có hàng tiêu đề được nhận khi dải tiêu đề có màu nền và có từ 3 cụm chữ màu trung tính (`captionBand`); màu đo bằng **trung bình** các điểm chữ vì chữ khử răng cưa ClearType có viền màu ở từng điểm ảnh. Bảng 1–2 dòng cần từ 2 cụm chữ trên tiêu đề; ở chế độ Core lượt này chỉ nhận bảng từ 3 dòng và 3 cụm chữ; vùng đã có lưới của lượt đầu thì bỏ qua.
- Tên cột của bảng loại này đọc bằng một lần OCR cả dải tiêu đề rồi gom chữ theo khoảng trống (`plainColumns`); phần trống đầu dòng là cột xem chi tiết (biểu tượng màu) hoặc cột chọn dòng (ô vuông ở dòng dữ liệu hay ở tiêu đề).
- Vùng bị xóa quanh bảng loại này chỉ rộng bằng bảng và chỉ kéo xuống dưới khi đọc thấy thanh phân trang (`Previous`, `Next`, `Showing`, `Page 1`, `1 of 5`), nên tiêu đề khối, nút, ô tìm kiếm và thẻ nằm cạnh bảng không bị mất.
- Dải công cụ có màu nền nằm ngay trên lưới (`tableBand`, `bandParts`, `bandControls`): chữ đứng đầu không có biểu tượng thành Label (tên lưới), các cụm “biểu tượng màu + chữ” thành một Toolbar (biểu tượng chọn theo chữ, `MENU_ICONS`), hộp nền khác màu dải (nút Filter) thành Button. Dải chỉ có Add / Delete vẫn đi theo cách cũ (tên lưới và nút Add của ESS grid).
- Lưới ESS dựng ở chế độ xem; chỉ khi dòng đầu có từ 2 ô nhập (rộng từ 30px) mới dựng ở chế độ sửa.
- Tab dạng viên thuốc ở đầu trang thành Tab page (`pillTabs`); hộp nhỏ tô màu đậm thành Tag; hộp viền màu hoặc chữ canh giữa thành Button; ô tròn nhỏ thành nút “…”.

Chế độ Core: hộp cao 22–34px có một cụm chữ canh giữa (không sát mép trái, không có mũi tên) là Button, ví dụ View Data; ảnh chỉ chụp riêng popup (dải tiêu đề chạy gần hết bề ngang ảnh) lấy đáy ảnh làm đáy popup (`findPopup`).

Kết quả đo trên ảnh chụp thật, so với dữ liệu “Chụp từ HRM” của cùng màn hình (số control cùng loại nằm đúng chỗ / tổng số):

| Ảnh | Chế độ | Kết quả |
|---|---|---|
| Tax Deductions & Allowances (danh sách) | ESS | tab 1/1, khối lọc 1/1, combo 1/1, nút 4/4, checkbox 1/1, ô tìm 1/1, lưới 1/1, nhãn 3/3 |
| Details of Tax Deductions & Allowances | ESS | tab 1/1, lưới 2/2 (một bảng rỗng), nút 2/2, ô tìm 1/1, nhãn 10/16 (ba dòng của thẻ tổng thành ô nhập) |
| 13th month payment | ESS | nút 3/3, tag 1/1, toolbar 1/1 (5 mục), lưới 1/1, nhãn 11/13 |
| Off-cycle Payroll Approval (lẫn DevExpress và ESS) | ESS | khối 1/1, tag 1/1, nút 2/2; chưa nhận tab gạch chân và combo DevExpress nhỏ |
| Salary Withholding (bộ lọc + lưới) | Core | khối 2/2, radio 2/2, group box 2/2, ngày 2/2, combo 4/4, nút 1/1, lưới 1/1 |
| Overtime (bộ lọc + lưới) | Core | khối 2/2, ngày 2/2, combo 2/2, checkbox 1/1, lưới 1/1, nút 2/3 |
| Popup Request Overtime | Core | toolbar 1/1, khối 2/2, combo 2/2, ngày 2/2, numeric 3/3, memo 1/1, lưới 1/1; ô giờ thành Numeric |

Giới hạn riêng của trang kiểu ESS: tab gạch chân (không phải viên thuốc) chưa thành Tab page; combo DevExpress nhỏ lẫn trong trang ESS vẫn là lát ảnh (sửa bằng Thay ảnh bằng control); thẻ có dải tiêu đề có thể thành ESS section với tên đọc sai; dòng thông tin có khung (nhãn bên trái, số bên phải) thành ô nhập.

**Cây trong ảnh** (`imp.findTrees`, `treeControls`, chạy đầu `imp.makePage` khi không ở chế độ ESS): tìm các đoạn nối ngang ngắn (6–36px, xám nhạt, dày 1–2px) gắn vào đường dọc của cây hoặc vào nút + / −, cách đều nhau theo chiều dọc (18–34px); từ 4 dòng trở lên và có ít nhất hai mức thụt hoặc một nút + / − thì là cây. Mỗi dòng: mức = vị trí đầu phải của đoạn nối chia cho bước thụt; sau đoạn nối là dấu tích xanh (`mark`), ô chọn (`box`, có tick hay không) hoặc chữ; dòng nền xanh là dòng đang chọn (chữ được tách nhị phân trước khi đọc); cột ô chọn thẳng hàng bên phải thành cột phụ; dải xám hẹp sát mép phải thành thanh cuộn. Dòng có nút + / − mà dòng sau không sâu hơn là nhánh đóng. Dòng cuối bị cắt ở đáy bị bỏ. Vùng cây được xóa khỏi ảnh làm việc trước khi các bước nhận dạng khác chạy. Số đo lấy theo ảnh chụp Core ở tỉ lệ 100%.

## 13. Màn hình chuẩn, chụp màn hình từ HRM, mở file draw.io

BA bắt đầu từ một màn hình có thật của HRM, hoặc từ bản vẽ draw.io đã có, thay vì vẽ lại từ đầu. Màn hình mở ra là control thật của Builder (field, grid, tab page, section, toolbar), kéo thả và sửa được ngay.

### 13.1 Cách dùng

- **Thư viện**: nút **Màn hình chuẩn** trên thanh trên cùng của Builder, hoặc **Từ màn hình chuẩn** ở trang danh sách thiết kế (`Pages/Home.aspx`, mục 16). Hộp chọn có ô tìm theo tên, lọc Core / ESS, hình xem trước. Trong Builder mỗi thẻ có hai nút: **Mở thành thiết kế mới** và **Chèn vào thiết kế này** (chèn xuống dưới phần đang có). Ở trang danh sách, chọn màn hình sẽ mở Builder với `?template=<key>`.
- **Chụp từ HRM** (nút trên thanh trên cùng, và trong hộp Màn hình chuẩn): BA kéo nút **Chụp màn hình HRM** lên thanh dấu trang một lần. Sau đó mở màn hình bất kỳ trong HRM, bấm dấu trang, bấm **Sao chép**, quay lại Builder bấm Ctrl+V (trên vùng thiết kế hoặc trong ô dán của hộp thoại). Màn hình có nhiều tab thì dấu trang hỏi chụp tất cả tab hay chỉ tab đang mở. Không cần cài gì trên máy BA.
- **Phân hệ HR**: hộp Màn hình chuẩn có ô lọc theo phân hệ (Staffing, Time-Attendance, Payroll, Insurance… do quản trị khai ở trang **Phân hệ HR**, mục 13.10), kèm lựa chọn **Chưa gán phân hệ**. Thẻ ghi phân hệ của màn hình sau tên nhóm; ô tìm khớp cả tên phân hệ; ô lọc kết hợp được với Core / ESS / Mẫu của team. Chưa khai phân hệ nào thì ô lọc ẩn.
- **Mở file draw.io**: nút trong hộp Màn hình chuẩn, nút **Từ file draw.io** ở trang danh sách thiết kế (mở `Builder?drawio=1`), hoặc kéo thả file `.drawio` vào Builder. Chi tiết ở mục 13.9.
- Mở xong, Builder tắt “Hiện khung field” để thiết kế nhìn giống màn hình thật; bật lại ở góc trên nếu cần thấy khung từng control. Lựa chọn này được nhớ cho lần mở sau.
- Bộ chụp không viết riêng cho từng chức năng: nó nhận theo mẫu markup chung của HRM (control DevExpress của Core, mẫu Bootstrap của ESS), nên dùng được cho chức năng chưa từng thử. Chức năng có cách dựng lạ thì bổ sung một quy tắc chung vào `builder-capture-page.js` (mục 13.4), không thêm nhánh theo tên chức năng.

### 13.2 Thành phần

| Tệp | Vai trò |
|---|---|
| `Scripts/builder/builder-capture-page.js` | Chạy **trong trang HRM**: đọc cấu trúc màn hình đang hiển thị thành dữ liệu `ba-screen`. Không phụ thuộc thư viện nào. |
| `Scripts/builder/builder-capture.js` | Chạy trong Builder (và Node): kiểm tra, làm sạch dữ liệu `ba-screen` rồi đổi thành mảng control. |
| `Scripts/builder/builder-drawio.js` | Chạy trong Builder (và Node): đọc file draw.io, đổi một trang thành dữ liệu `ba-screen` (mục 13.9). Không phụ thuộc thư viện nào. |
| `Scripts/builder/builder-templates.js`, `Content/builder-templates.css` | Hộp Màn hình chuẩn (kèm ô lọc phân hệ), hộp Chụp từ HRM, hộp Mở file draw.io, tạo dấu trang, xử lý Ctrl+V và thả file. |
| `Helpers/StandardScreenLibrary.cs`, `Builder.aspx.cs` (`GetStandardScreens`, `LoadStandardScreen`, `GetHrModules`) | Đọc thư viện và danh sách phân hệ trên máy chủ, cần đăng nhập. |
| `Helpers/UiHrModules.cs`, `Pages/HrModules.aspx`, `Scripts/AddUiHrModule.sql` | Phân hệ HR: danh mục, gán phân hệ cho màn hình chuẩn và mẫu của team (mục 13.10). |
| `App_Data/BuilderTemplates/index.json` + `<key>.json` | Thư viện: danh mục và dữ liệu từng màn hình. |
| `Tools/ui-capture/` | Công cụ cho người phát triển: `add-screen.js`, `make-patterns.js`, `library.js`, `test/convert.test.js`, `test/drawio.test.js`. |

Thư viện hiện có 30 mục (`index.json`), chia theo nhóm (`group`, chỉ dùng để hiển thị và tìm kiếm):

| Nhóm | Màn hình |
|---|---|
| Core (16) | Time-Sheet Policy; Salary Withholding (bộ lọc + lưới chi tiết); Overtime (bộ lọc + lưới có cột trạng thái dạng tag); Employee Profile và Transaction (master-detail trái phải, có tab); Add New Employee; Report Filter; các popup: Select Organization Structure chọn một (Add New Employee, Transactions), Select Organization Structure chọn nhiều (ô lọc của báo cáo), Organization Structure của Shift (Map to Unit), Select Employee, Shift, Salary Withholding, Request Overtime, Transaction (New Hire, 5 tab), Transaction (Former / Proposal). Ba popup Organization Structure và cây bên trái của Select Employee dùng control Tree, tên đơn vị là dữ liệu mẫu |
| ESS (4) | Request Overtime, Request Leave, Leave History, Overtime History |
| Core kiểu ESS (4) | Tax Deductions & Allowances, Details of Tax Deductions & Allowances, 13th Month Payment, Off-cycle Payroll Approval — trang trong Core dựng bằng HTML theo giao diện ESS |
| Mẫu chung (6) | Dựng tay bằng `make-patterns.js`; gồm cả mẫu cây tổ chức ở chế độ xem (Section có menu trên dải tiêu đề và cây có dấu tích xanh) |

Nhóm (`group`) nói kiểu màn hình. Phân hệ HR là cách chia thứ hai, theo nghiệp vụ; nó nằm trong database, không nằm trong `index.json` (mục 13.10).

### 13.3 Dữ liệu `ba-screen` (v1)

```
{ kind: "ba-screen", v: 1, ui: "core" | "ess", title, width, height, nodes: [...] }
```

Mỗi node có `t`, `x`, `y`, `w`, `h` (pixel, gốc là góc trên trái của nội dung màn hình) và các thuộc tính theo loại:

| `t` | Thuộc tính |
|---|---|
| `text`, `number`, `date`, `combo`, `multiselect`, `memo` | `caption`, `required`, `disabled`, `labelX` (vị trí chữ caption bên trái), hoặc `captionAbove` + `labelY/labelW/labelH`; `placeholder` (chữ gợi ý, thành giá trị mẫu khi ô không có caption) |
| `checkbox`, `radio` | `caption`, `disabled` |
| `button` | `text`, `disabled`, `bg`, `fg`, `border` (màu dạng `#rrggbb`) |
| `tag` | `text`, `bg`, `fg` (nhãn trạng thái có màu; thành field Tag của ESS) |
| `label` | `text`, `bold` |
| `image` | `src`: ảnh dạng `data:image/(png, jpeg, gif, webp);base64,...`, tối đa 12 MB mỗi ảnh và 48 MB cho cả màn hình; ảnh sai dạng hoặc vượt mức bị bỏ. Chỉ bộ đọc draw.io tạo node này (mục 13.9). Thành field Image của ESS, kéo giãn theo khung, nằm dưới các control khác (`zIndex = 0`) |
| `group`, `section` | `caption`, `children` |
| `popup` | `title`, `children` |
| `tabs` | `tabs[]`, `active`, `children` (mỗi con có `tab` = chỉ số tab chứa nó) |
| `grid` | `title`, `columns[{caption,w,type,text,bg,fg,tags}]`, `filterRow`, `pager`, `checkbox`, `actions[]` (`view`/`edit`/`delete`), `toolbar[{text}]`, `rows` (1–10), `data` (tối đa 10 dòng, mỗi dòng là mảng chữ theo thứ tự cột, mỗi ô tối đa 60 ký tự; thành dữ liệu mẫu của lưới Core, lưới ESS không dùng), `groupPanel`, `viewData`, `language`. Cột có `type: "checkbox"` hoặc `type: "tag"`; cột tag mang `text`, `bg`, `fg` của dòng đầu và `tags[{text,bg,fg}]` khi các dòng có nhiều trạng thái khác nhau (tối đa 6) |
| `toolbar` | `buttons[{text, icon}]`; `icon` là khóa biểu tượng của Core (`add`, `save`, `cancel`, `delete`, `select`, `ok`, `openreport`, `download`, `export`, `approve`…), chỉ khóa có trong `ICON_KEYS` được giữ, không có thì đoán theo chữ |
| `tree` | `check` (`box` / `mark` / `none`), `rowHeight`, `indent`, `header`, `caption`, `scroll`, `columns[{caption,w,type,disabled}]`, `items[{text,level,open,checked,focused,cells[]}]` (tối đa 200 nút, 12 cột) |

`builderCapture.normalize` chỉ giữ các loại và thuộc tính trên, bỏ ký tự `<` `>` và ký tự điều khiển, cắt chữ quá 200 ký tự, giới hạn 2000 node, 8 tầng; dữ liệu dạng chuỗi (dán từ clipboard) tối đa 2 MB. Dữ liệu dán vào và kết quả đọc file draw.io luôn đi qua bước này trước khi dùng.

### 13.4 Đọc màn hình HRM (`builder-capture-page.js`)

- `__baCapture(options)` chụp màn hình đang hiển thị; `__baCaptureAllTabs` bấm lần lượt từng tab như người dùng rồi `__baMergeTabs` gộp lại; `__baTabCount` cho biết số tab.
- Chọn tài liệu để chụp (`pickTarget`, đi sâu tối đa 4 tầng): đi vào khung (iframe) lớn nhất khi nó nằm trong tab của khung chính HRM (`.ui-tabs-panel`) hoặc trong popup modal và chiếm từ 40% vùng đó; khung nằm trong trang thường chỉ được đi vào khi chiếm từ 70% trang.
- Khung con chiếm ít hơn (ví dụ phần chi tiết bên dưới lưới của trang Transaction) được **chụp ghép** vào trang chứa nó (`captureWithFrames`, `embeddedFrames`): nội dung khung dời theo vị trí khung và đặt vào khối chứa sâu nhất bao trọn khung (`containerAt`), không có thì nằm ở gốc. Nhờ vậy trang master-detail có lưới ở trang ngoài và tab chi tiết trong khung con thành một màn hình. Khi đang có popup modal thì không ghép khung của trang phía sau.
- Popup có nội dung là một trang khác trong iframe (Select Employees mở từ nút Add, Edit Transaction của New Hire): chụp trang bên trong rồi bọc lại bằng node `popup` lấy tiêu đề và kích thước của khung popup (`wrapInPopup`).
- Dải tab được tìm cả trong popup modal đang mở và trong khung con (`tabStrip`); đang có popup thì chỉ bấm tab của popup, không bấm tab của trang phía sau. Dải tab đã nhận thì không còn bị đọc thành nút.
- Cây Core (`ASPxClientTreeList`) thành node `tree` (`treeFromTable`), không còn thành lưới một cột: mỗi dòng nhìn thấy trong khung cây là một nút, mức = số ô thụt (`dxtlIndent*`) trừ 1; có ô `dxtlSelectionCell` thì kiểu `box` và đọc trạng thái tick; ô đầu có ảnh `Checked` / `Unchecked` thì kiểu `mark`; dòng `dxtlFocusedNode` là dòng đang chọn; các ô dữ liệu sau ô tên thành cột phụ; chiều cao dòng và bước thụt đo từ dòng đầu. Dòng nằm ngoài khung cuộn bị bỏ và cây được đánh dấu có thanh cuộn; nút có nút mở / đóng mà con của nó nằm ngoài khung được ghi là nhánh đóng.
- Mục menu Core mang class `<khóa>-command-icon` (ví dụ `add-command-icon` của Set Permissions, Assign Organization Unit); khóa đó được gửi kèm để chọn đúng biểu tượng.
- Lưới Core: nhãn đứng ngay trên lưới, sát mép trái (cách đỉnh lưới không quá 14px) là tên lưới khi lưới chưa có tên. Cột có tiêu đề `Remove` chỉ chứa biểu tượng là cột xóa dòng; cột hẹp (đến 110px) có ô chỉ chứa biểu tượng xem / sửa / xóa là cột hành động dù tiêu đề có chữ; cột đầu có tiêu đề `#` chứa ô chọn là cột chọn dòng.
- Kiểu cột (`cellStyle`, xét ô của dòng dữ liệu đầu): ô chỉ có ô chọn là `checkbox`; ô có một phần tử nền màu (không trắng, không xám) bao trọn chữ của ô (tối đa 24 ký tự) là `tag`. Với cột tag, 80 dòng đầu được duyệt để lấy tối đa 6 trạng thái khác nhau (chữ và màu).
- Trang Core dựng bằng HTML theo giao diện ESS (Bootstrap 5; `ui` là `ess` khi trang không có control DevExpress nào đang hiện): `.accordion-item` thành section; `ul.nav-tabs`, `ul.nav-pills`, `ul[role=tablist]` thành tabs; `.cs-select-wrapper` thành combo; phần tử `.label` / `.badge` / `label-*` / `badge-*` có nền màu thành `tag`; thẻ `<a>` có class `btn` / `button` hoặc có khung thành nút; từ 2 nút dạng link cùng hàng thành toolbar; `placeholder` của ô nhập được giữ lại; `table` của DataTables thành lưới, ô chỉ có biểu tượng mắt / bút / thùng rác thành cột hành động; khung thẻ bo góc 4 cạnh thành group box.
- Core (DevExpress): duyệt `ASPxClientControl.GetControlCollection()` cho grid, tab, menu, popup, ô nhập; khối `dxflGroupBox` và `dxrpControl` nhận theo DOM vì nhiều khối không có đối tượng client. Tab đang mở lấy từ `li.dxtc-activeTab`, không dùng chỉ số của API vì HRM dựng lại control sau mỗi callback.
- ESS (Bootstrap): khối có `div.title` / `div.title-2` thành section; `.input-group` có một ô nhập và chỉ có biểu tượng thành một ô (có lịch thì là `date`); ô chọn ẩn có nhãn hiển thị thành checkbox / radio; phần tử class `btn` thành nút; bảng dựng bằng `ul.dv-tbl` / `li.li-th` thành grid; nhãn có class `required` hoặc dấu `*` qua CSS thành bắt buộc; thanh nút dính đáy (`position: fixed`) được đặt xuống sau nội dung; breadcrumb bị bỏ.
- Dấu bắt buộc `(*)` đứng riêng được ghép vào nhãn bên trái, kể cả khi nhãn xuống dòng.
- Thanh công cụ, tên lưới, “View Data”, “Local Data Language” nằm ngay trên lưới được gộp vào lưới.
- Phần tử có thuộc tính `data-ba-capture-ignore` bị bỏ qua (bảng thông báo của chính dấu trang).
- Popup Core nhận theo DOM (`[class*='dxpcLite']` có `.dxpc-mainDiv`), vì đối tượng client của popup không trả về phần tử chính. Popup đang mở dạng modal (có lớp phủ, hoặc chiếm từ 30% vùng nhìn) thì chỉ chụp popup, bỏ phần nền phía sau.
- Tiêu đề khối Core: chữ đứng sát trước một control trên dải tiêu đề là nhãn của control đó, không gộp vào tên khối.
- Tên màn hình: lấy từ breadcrumb; không có thì lấy tên lưới, tên popup hoặc tên khối đầu tiên (`firstNamed`), cuối cùng mới tới tiêu đề trang.
- Hàng ô có class `header-cell` (từ 3 ô) thành lưới (ví dụ lịch Roster).
- Khung (iframe) chưa có nội dung bị bỏ qua, ví dụ trang Data Setup trước khi chọn một mục.
- ESS: khối có khung nhìn thấy (viền từ 3 cạnh hoặc đổ bóng, từ 180×70px) thành section nếu dòng đầu là chữ đậm, không thì thành group box; khối chiếm từ 75% khối chứa nó bị bỏ qua để không lồng khung thừa. Thẻ bấm được cao hơn 64px và có nhiều phần tử con không bị coi là nút. Dấu `*` đứng riêng được ghép vào nhãn bên cạnh.

Mỗi quy tắc trên được thêm khi gặp một màn hình thật, nhưng viết theo dấu hiệu chung của markup, không theo tên chức năng: Select Employee, Leave Profile, Leave Policy, Shift (popup Add và popup Organization Structure), Insurance Policy, Tax Deductions & Allowances, Off-cycle Calculation, Salary Withholding, Overtime, Employee Profile, Transaction.

Đã chạy thử trên các chức năng ngoài thư viện (không sửa riêng cho chức năng nào): Core – Roster, Overtime, Time-sheet, Leave Profile, Employee Profile, Organization Structure, Transaction, Allowances & Deductions, Salary Calculation, Insurance Information, General Settings, Workflow, Loan, Training Course, Reward (cả popup Add), Company Information, Staffing Data Setup; ESS – Employee Profile, Leave Balance, Request Resignation. Màn hình Core cho kết quả ổn định hơn ESS, vì ESS có nhiều thẻ dựng riêng và giá trị hiển thị dạng chữ thường.

### 13.5 Đổi thành control (`builderCapture.convert`)

- Control gốc lệch 20px so với mép thước. Con của group / section / popup dùng tọa độ vùng content (`INSETS`).
- Caption bên trái nhập vào field (`labelWidth` nới theo độ dài chữ, tối đa thêm 60px); caption phía trên thành label riêng.
- ESS: field cao thêm 10px, label và nút bù lề của khung field ESS (`METRICS.ess`) để chữ và mặt nút nằm đúng vị trí chụp.
- Grid Core và ESS dựng trong Builder cao hơn ảnh chụp; `reflowList` nới khối chứa và đẩy các khối bên dưới xuống. Chiều cao đo sẵn: `GRID_HEIGHT` (Core), `ESS_GRID_HEIGHT` (ESS). Đổi giao diện grid trong Builder thì đo lại các số này.
- Grid và toolbar là con của khối chứa gần nhất (popup, group box, section, ESS section), nên đi theo khi kéo khối đó. Toolbar nằm trực tiếp trong popup thì gắn vào khung popup (`dock = "popup"`). Control trong tab mang `tabPageId` / `tabIndex`.
- Control nằm trên dải tiêu đề của section Core (nút, combo Company) giữ nguyên trên dải đó (top âm) và được dời sang phải nếu đè lên chữ tiêu đề.
- Nút không có chữ nhận chữ `…`.
- Cột `checkbox` và cột `tag` của lưới Core giữ kiểu hiển thị (mục 10): dữ liệu mẫu của cột tag lần lượt lấy các trạng thái đã chụp, cột checkbox xen kẽ có / không. Lưới ESS chỉ có một tag cho mỗi cột nên lấy trạng thái đầu; cột checkbox của lưới ESS vẫn là cột chữ.
- Node `tag` thành field Tag của ESS (màu nền, màu chữ như đã chụp, kể cả trong màn hình Core).

### 13.6 Dữ liệu cá nhân

Dấu trang chỉ đọc bố cục trên trình duyệt của BA, không gửi gì về máy chủ; kết quả nằm trong clipboard cho tới khi BA dán vào Builder.

- Không lấy giá trị trong ô nhập, không lấy dòng dữ liệu của lưới (chỉ tên cột và số dòng).
- ESS: giá trị gắn dữ liệu (phần tử có `data-name` mà không có `data-languagekey`) được thay khi tên trường thuộc nhóm cá nhân (`PERSONAL_KEY`: employee, name, manager, phone, mail, address, birth, passport, id card, tax, bank, salary…) hoặc khi nằm trong thẻ thông tin nhân viên (`#js-infouser` và các khối `eprofile`, `emp-info`). Giá trị thay lấy từ `SAMPLE_VALUES`; số được thay bằng `0`, ngày bằng `01/01/2026`. Chữ trong nút, liên kết và tiêu đề cột không bị thay.
- Chữ dạng “mã - họ tên” (ví dụ tiêu đề khối theo nhân viên) được thay bằng `EMP001 - Employee Name`, `EMP002 - …`; địa chỉ email thay bằng `name@company.com`.
- Số thuần có từ 7 chữ số (tổng tiền, số tài khoản) được thay bằng chữ số `0` cùng độ dài (`scrub`).
- Cột tag chỉ lấy chữ của nhãn trạng thái (tối đa 24 ký tự mỗi nhãn), không lấy giá trị của các cột khác.
- Chữ hiển thị dạng văn bản thường khác (không nằm trong ô nhập) vẫn được chụp nguyên văn, ví dụ tên công ty, chức danh, số đầu người trên thẻ số liệu. Trước khi thêm một màn hình vào thư viện phải rà lại toàn bộ chữ trong tệp và thay các giá trị đó bằng giá trị mẫu.

### 13.7 Thêm màn hình vào thư viện

1. Mở màn hình trong HRM, chạy dấu trang, sao chép, lưu nội dung vào một tệp `.json`.
2. `node Tools/ui-capture/add-screen.js <key> "<tên>" "<nhóm>" <thứ tự> <tệp.json> "<mô tả>"`. `key` chỉ gồm chữ thường, số, gạch nối. Lệnh ghi `App_Data/BuilderTemplates/<key>.json` và cập nhật `index.json` (số control, hình phác thảo).
3. Rà chữ trong tệp vừa ghi (mục 13.6), mở `Builder?template=<key>` để xem.
4. Tùy chọn: đặt ảnh `Content/builder-templates/<key>.png` rồi chạy `library.refreshThumbs()` để dùng ảnh thật thay hình phác thảo.

Kiểm thử bộ chuyển đổi: `node Tools/ui-capture/test/convert.test.js` (51 ca) và `node Tools/ui-capture/test/drawio.test.js` (22 ca, bộ đọc file draw.io).

Kiểm thử phần chạy trên trình duyệt của Builder (kéo thả, lồng control, Undo / Redo, mở màn hình chuẩn, lọc phân hệ, mở file draw.io, nhận dạng ảnh) không cần đăng nhập: `node Tools/builder-harness/server.js` rồi mở `http://localhost:3988/Builder`; 65 kịch bản (kéo thả, chọn nhiều control, Ctrl+A, quét khối, popup có tab, xóa khối chứa…) chạy bằng Playwright qua `/__runner`. Cách dùng và giới hạn ghi trong `Tools/builder-harness/README.md`.

### 13.8 Giới hạn

- Tab lồng bên trong chỉ được chụp ở trạng thái đang mở. Khối đang thu gọn chỉ có tiêu đề.
- Popup có nội dung cuộn (Edit Transaction dạng Former / Proposal) được chụp đủ nội dung nên popup trong Builder cao hơn popup thật.
- Cột biểu tượng riêng của chức năng (ví dụ OT Request) thành cột chữ thường. Lưới chưa có dòng dữ liệu thì không biết cột nào là checkbox hay tag.
- Ảnh (ảnh nhân viên, biểu tượng) không được chụp.
- Danh sách của ESS chưa có dòng nào (ví dụ View Detail của Request Overtime) không tạo được lưới.
- Dấu trang dài khoảng 69 nghìn ký tự (tăng từ 48 nghìn sau khi thêm các quy tắc ở mục 13.4). URL `javascript:` dài 48 nghìn ký tự đã chạy thử trên Chromium (trang ESS và khung chính của Core); bản 69 nghìn ký tự mới chỉ được chạy bằng cách nạp thẳng script vào trang, chưa thử qua dấu trang. Thao tác kéo lên thanh dấu trang chưa thử trên máy BA. Firefox không lưu dấu trang dài hơn 65 536 ký tự nên dấu trang này chỉ dùng được trên Chrome / Edge. Trang HRM chặn script bằng CSP thì dấu trang không chạy.
- Sửa `builder-capture-page.js` thì BA phải kéo lại dấu trang mới.

### 13.9 Mở file draw.io (`builder-drawio.js`)

BA của công ty đang vẽ mockup bằng draw.io. Chức năng này mở thẳng file đó thành thiết kế của UI Builder để BA không phải vẽ lại.

**Cách dùng.** Hộp **Mở file draw.io** (`builderTemplates.openDrawio`, phần tử `#bstDrawio`): chọn file hoặc kéo thả; ô **Trang** liệt kê các trang của file (trang không chuyển được thì bị khóa; trang được chọn sẵn là trang đầu tiên chuyển được và không phải sơ đồ quy trình); ô **Kiểu control** chọn Core hoặc ESS; bên dưới là hình phác thảo, số control, danh sách những gì đã gộp hoặc không chuyển, rồi hai nút **Mở thành thiết kế mới** và **Chèn vào thiết kế này** (dùng chung `fillApplyActions` với hộp Chụp từ HRM). Ngoài Builder, `openDrawio` chuyển tới `Builder?drawio=1`; Builder mở hộp rồi xóa tham số khỏi địa chỉ. Thả một file có đuôi `.drawio` / `.dio` (kể cả `.drawio.xml`, `.drawio.svg`, `.drawio.png`) vào bất kỳ đâu trong Builder cũng mở hộp với file đó. File được đọc ngay trên trình duyệt, không gửi lên máy chủ.

**Đọc file** (`builderDrawio.read(text, inflate)` trả về Promise của danh sách trang `{ name, model }`; `builderDrawio.textFromPng(bytes)`):

- `.drawio` / `.xml`: `<mxfile>` có một hoặc nhiều `<diagram>`; nội dung trang là `<mxGraphModel>` hoặc chuỗi nén (base64 của deflate-raw của XML đã mã hóa URL), giải nén bằng `DecompressionStream` của trình duyệt.
- `<mxGraphModel>` đứng riêng, chữ dán từ draw.io (`%3CmxGraphModel…`), `.drawio.svg` (thuộc tính `content`), `.drawio.png` (khối `tEXt` tên `mxfile`).
- Bộ đọc XML tự viết (`parseXml`), không dùng `DOMParser` nên chạy được trong Node để kiểm thử: từ chối DOCTYPE, bỏ thuộc tính `__proto__`, giới hạn 60 000 phần tử và 64 tầng. File tối đa 40 MB, 60 trang, 4000 hình mỗi trang.
- File không phải draw.io, bị hỏng hoặc vượt giới hạn trả về lỗi có chữ tiếng Việt (`error.drawio = true`); hộp thoại hiện đúng chữ đó.

**Cách BA vẽ.** Hai file thật của BA (22 trang) cho thấy: BA dán ảnh chụp màn hình HRM (1000 đến 2500 px), che phần không cần bằng các ô trắng hoặc xám không viền, rồi đặt nhãn, ô nhập, nút, bảng và biểu tượng nhỏ lên trên; một trang thường có vài mockup; vài trang là sơ đồ quy trình. Vì vậy ảnh chụp được giữ làm ảnh nền, không cố nhận dạng thành control; chỉ những gì BA vẽ thêm mới thành control.

**Đổi một trang thành `ba-screen`** (`builderDrawio.toScreen(page, { ui, title, gridHeight, paint })` trả về `{ screen, stats }`):

- Ảnh dán trong file (`shape=image`, dữ liệu PNG / JPEG / GIF / WebP) thành node `image`, giữ kích thước đã vẽ. Ảnh liên kết ngoài, ảnh SVG và hình vẽ sẵn của draw.io không chuyển.
- Hình nằm trọn trong một ảnh và được vẽ sau ảnh đó: ô không chữ có viền, nền trắng, cao 16 đến 44 px, rộng tối đa 500 px là ô nhập; ô không chữ khác (ô che, dải nền) và ảnh nhỏ (biểu tượng) được **gộp vào ảnh nền**; ô có chữ căn giữa, cao tối đa 44 px là nút; ô có chữ khác thì nền gộp vào ảnh, chữ thành label.
- Gộp vào ảnh nền: node ảnh mang danh sách `layers`; lúc BA bấm mở, `composeImages` (trong `builder-templates.js`) vẽ ảnh nền rồi từng lớp theo đúng thứ tự vẽ lên một canvas (cạnh dài tối đa 4096 px) và thay `src` bằng ảnh kết quả. Lớp chỉ bị xóa khỏi node khi gộp xong. Gộp lỗi thì không mở trang, báo lỗi, bấm lại là gộp lại từ đầu; không có đường nào mở ảnh thiếu ô che, vì ô che thường là chỗ BA giấu dữ liệu thật.
- Hình không nằm trên ảnh (bản vẽ wireframe): hình không nền không viền là label nếu có chữ; ô vuông nhỏ đến 24 px có viền là checkbox; ô không viền, không chữ, có màu thành ảnh nhỏ (vẽ bằng `paint`), nền trắng thì bỏ; ô cao tối đa 44 px là nút nếu chữ căn giữa, còn lại là ô nhập; ô có chữ căn trái ở phía trên, cao tối đa 200 px là memo; ô lớn còn lại là group box.
- Hình có tên riêng (`SHAPE_RULES`, `NAME_RULES`): bộ Mockup và Bootstrap của draw.io (button, comboBox, spinner, textBox, checkbox, radio, window thành popup, group), `text` thành label, `swimlane` thành section, hình tròn nhỏ thành radio. Tam giác nhỏ (ví dụ `mxgraph.ios7.misc.down`) nằm ở mép phải một ô nhập hoặc nút biến ô đó thành combo.
- Bảng (`shape=table` > `tableRow` > `partialRectangle`) thành lưới: hàng đầu là tên cột, tối đa 10 hàng sau thành dữ liệu mẫu (`data`). Hình vẽ đè lên bảng được bỏ; cột có ô vuông nhỏ thành cột checkbox. Bảng nằm trên ảnh chỉ giữ số dòng vừa với chiều cao đã vẽ (đo bằng `builderCapture.gridHeight`), để lưới không che phần ảnh bên dưới.
- Nhãn đứng cùng hàng bên trái một ô nhập (cách tối đa 260 px, không có control khác chen giữa) hoặc ngay phía trên (tối đa 26 px) thành caption của ô; đuôi `(*)` hoặc `*` thành bắt buộc; chữ gợi ý dạng ngày, hoặc caption có chữ `date` / `ngày`, thành ô ngày. Nhãn sát bên phải checkbox / radio thành chữ của nó.
- Khối chứa: theo quan hệ cha - con của draw.io trước (nhóm `group` trong suốt được bỏ qua), sau đó theo vị trí (hình nằm trọn trong group box / section / popup nhỏ nhất). Tối đa 6 tầng.
- Đường nối, ghi chú dạng hình, hình sơ đồ (thoi, lục giác, mây…) không chuyển. Trang có từ 5 đường nối và đường nối chiếm từ một phần tư số hình là sơ đồ quy trình (`stats.flow`): vẫn mở được nhưng các ô thành nút rời nhau, không có đường nối.
- Cả màn hình được dời về gốc theo hình trên cùng bên trái.

`stats` (`shapes`, `converted`, `kinds`, `baked`, `longTexts`, `trimmedTables`, `skipped.edge / image / note / shape`, `truncated`, `flow`) được `drawioNotes` đổi thành các dòng thông báo cho BA, để BA biết phần nào đã gộp và phần nào không chuyển.

**Dữ liệu không tin cậy.** Nội dung file chỉ đi qua bộ đọc XML tự viết và `builderCapture.normalize` (bỏ `<` `>`, giới hạn độ dài); không có đoạn nào của file được chèn thành HTML hay chạy như script; ảnh phải khớp mẫu data URL của ảnh raster, ảnh trỏ ra ngoài bị bỏ nên mở file không gây ra yêu cầu mạng nào. Ảnh chụp trong file của BA có thể chứa dữ liệu thật của nhân viên: UI Builder giữ ảnh đúng như BA đã vẽ (kể cả ô che), không tự che thêm; thiết kế lưu lại mang ảnh đó như mọi ảnh BA tự dán.

**Số đo** (trang thật, file thật của BA, máy dev): đọc file 6,6 MB / 16 trang mất 583 ms; trang 39 control (13 ảnh, 26 lớp gộp) mở trong 417 ms; trang 109 control (JSON 2,9 MB) 1032 ms; trang 141 control 811 ms. Lưu một thiết kế 3,2 MB mất 1,3 giây, mở lại đủ control và ảnh.

**Giới hạn**

- Sơ đồ quy trình, đường nối, ghi chú dạng hình, ảnh SVG và ảnh liên kết ngoài không chuyển (có đếm và báo trong hộp thoại).
- Chữ dài hơn 200 ký tự bị cắt. Định dạng chữ trong một nhãn (đậm một phần, nhiều màu) không giữ; cả nhãn chỉ giữ đậm hoặc thường.
- Bảng nằm trên ảnh chỉ giữ số dòng vừa chiều cao đã vẽ. Bảng có ô gộp (merge) chưa được thử.
- Ảnh nền lớn hơn 4096 px một cạnh bị thu nhỏ khi gộp lớp. Thiết kế mang ảnh nên nặng: JSON 1 đến 3 MB một trang là bình thường.
- Trang có nhiều mockup được mở thành một thiết kế chứa tất cả; BA tự xóa phần không cần.
- Cần Chrome hoặc Edge bản có `DecompressionStream` để mở file nén; thiếu thì hộp thoại báo rõ.

**Kiểm thử**: `node Tools/ui-capture/test/drawio.test.js` (22 ca: đọc các dạng file, giới hạn, từng quy tắc đổi); kịch bản `drawio` của `Tools/builder-harness` (file hai trang, trang nén, mở mới và chèn kiểu ESS, điểm ảnh của ô che sau khi gộp, lịch sử Undo, gộp lỗi rồi thử lại, file không phải draw.io, thả file vào trang); `Tools/page-checks/home.js` kiểm nút **Từ file draw.io**.

### 13.10 Phân hệ HR (`Helpers/UiHrModules.cs`, `Pages/HrModules.aspx`)

Màn hình chuẩn và mẫu của team được gán một phân hệ HR để BA lọc nhanh trong hộp Màn hình chuẩn.

| Bảng | Ý nghĩa |
|---|---|
| `UiHrModule` | Danh mục phân hệ: `Name` (không trùng, unique index `UX_UiHrModule_Name`), `SortOrder`, `IsActive` |
| `UiStandardScreenModule` | Phân hệ của một màn hình chuẩn: `ScreenKey` (khóa trong `index.json`) → `ModuleId`. Xóa phân hệ thì dòng này bị xóa theo (màn hình về chưa gán) |
| `UiTemplateRequest.ModuleId` | Phân hệ của một mẫu của team. Xóa phân hệ thì cột về `NULL` |

`Scripts/AddUiHrModule.sql` tạo cả ba, chạy lại được. Chỉ lúc bảng vừa tạo script mới thêm 4 phân hệ (Staffing, Time-Attendance, Payroll, Insurance) và gán sẵn 20 màn hình của thư viện, nên chạy lại không ghi đè phần quản trị đã sửa.

**Trang Phân hệ HR** (`/HrModules`, menu cùng nhóm với Mẫu UI dùng chung): chỉ người có quyền `UITemplateAdmin` hoặc Super Admin (`UiHrModules.CanManage`, cùng điều kiện với `UiTemplateLibrary.IsAdmin`). Thêm, đổi tên, ẩn / hiện, đổi thứ tự, xóa phân hệ; bảng bên dưới gán phân hệ cho từng màn hình chuẩn và từng mẫu của team (có ô tìm và lọc Tất cả / Chưa gán). Page method: `LoadAll`, `SaveModule`, `ReorderModules`, `DeleteModule`, `Assign`; mọi kiểm tra quyền và dữ liệu nằm ở `UiHrModules`.

**Quy tắc**

- Tên phân hệ: bỏ khoảng trắng thừa, tối đa 100 ký tự, không chứa `<` `>` hoặc ký tự điều khiển, không trùng tên đã có. Tối đa 100 phân hệ.
- Phân hệ đang ẩn không hiện trong Builder (`ListActive`); màn hình và mẫu thuộc phân hệ đó hiện như chưa gán cho tới khi phân hệ được hiện lại.
- `AssignScreen` chỉ nhận khóa có trong thư viện; `AssignTemplate` chỉ nhận mẫu đang trong thư viện chung.
- Builder lấy dữ liệu qua `GetHrModules` (phân hệ đang dùng) và `UiHrModules.Annotate`, hàm gắn `ModuleId` / `Module` vào danh sách màn hình chuẩn và `ModuleId` / `ModuleName` vào mẫu của team. Chưa chạy script thì `Annotate` bỏ qua, hộp Màn hình chuẩn chạy như cũ và không có ô lọc.
- Gửi mẫu chung: hộp gửi có ô **Phân hệ** (không bắt buộc), thay ô chữ tự do "Nhóm chức năng". `SubmitTemplate(..., moduleId)` gọi `SetSubmittedTemplateModule`, chỉ ghi khi phân hệ đang dùng và yêu cầu đúng là của người gửi. Yêu cầu cũ chưa có phân hệ vẫn hiện nhãn `Category` đã nhập trước đây.
- Nhật ký thao tác: `UiHrModule.Save` (thêm, sửa, đổi thứ tự), `UiHrModule.Delete`, `UiHrModule.Assign`.

**Kiểm thử**: `BADesign.Tests/UiHrModulesTests.cs` (11 ca cho phần kiểm tra tên, khóa màn hình, thứ tự); `Tools/page-checks/hr-modules.js` (31 kiểm tra trên trang thật: thêm, tên trùng, tên chứa mã HTML, đổi tên, ẩn / hiện, đổi thứ tự, gán màn hình, id không tồn tại, người chưa đăng nhập, hộp Màn hình chuẩn, xóa, chế độ sáng, tiếng Anh; dữ liệu thử tên `TEST Phân hệ…` được xóa ở cuối); kịch bản `modules` và `teamflow` của `Tools/builder-harness` (ô lọc, thẻ, tìm theo tên phân hệ, chọn phân hệ khi gửi mẫu).

## 14. Đánh dấu: khoanh đỏ, bôi vàng, ghi chú

Dùng để chỉ ra chỗ cần thêm, sửa trên một thiết kế. Script `control-annotation.js`, CSS ở cuối `Content/builder.css`.

Cách tạo:

- Bấm chuột phải lên control (hoặc lên vùng đang chọn nhiều control) rồi chọn **Khoanh đỏ**, **Bôi vàng** hoặc **Thêm ghi chú**: khung ôm sát vùng đó (khoanh cách 6px, bôi cách 2px), ghi chú nằm bên phải.
- Bấm chuột phải lên chỗ trống, hoặc kéo từ nhóm **Đánh dấu** của toolbox: tạo ở vị trí đó với cỡ mặc định.

Thao tác: kéo viền khung khoanh (phần trong khung vẫn bấm được vào control bên dưới), kéo thân vùng bôi và ghi chú, kéo ô vuông góc dưới phải để đổi cỡ, bấm đúp ghi chú để gõ chữ, Delete để xóa (không hỏi lại, Ctrl+Z để lấy lại). Panel thuộc tính: màu, kiểu khung (chữ nhật / elip), độ dày nét, nhãn của khung (ví dụ 1, 2), nội dung ghi chú, cỡ.

Config: `{ type: "annotation", kind: "box" | "highlight" | "note", color, shape: "rect" | "ellipse", thickness, text, left, top, width, height, zIndex: 6000, parentId: null }`. Đánh dấu luôn nằm thẳng trên canvas, phía trên mọi control, nên không tự đi theo khi kéo control bên dưới (quét chọn cả hai rồi kéo hoặc dùng phím mũi tên, hoặc kéo riêng). Có trong Preview, Xuất hình ảnh, Layers, Undo, lưu và mở lại.

**Bôi vàng không làm mờ nội dung bên dưới.** Vùng bôi vẫn nằm trên mọi control nhưng được trộn theo kiểu nhân màu như bút dạ quang (`.ba-annot-highlight { mix-blend-mode: multiply }` trong `builder.css`, đặt trên phần tử gốc của đánh dấu vì chỉ phần tử nằm trực tiếp trong ngữ cảnh xếp lớp của canvas mới trộn được với control): nền trắng thành màu của vùng bôi (độ đậm như cũ, `rgba(màu, 0.45)`), chữ đen giữ nguyên độ đậm. Trước đây vùng bôi phủ đè bình thường nên chữ bên dưới nhạt đi (chữ `#111827` thành khoảng `124,119,48`).

html2canvas 1.4.1 không vẽ được `mix-blend-mode`, nên mọi lần chụp ảnh của Builder đi qua `controlAnnotation.captureWithHighlights(element, options)` thay cho gọi thẳng `html2canvas`: hàm ghi lại vị trí các vùng bôi trong phần tử được chụp, ẩn chúng trong bản sao mà html2canvas dựng (`onclone`), rồi tự vẽ lại lên canvas kết quả bằng `globalCompositeOperation = "multiply"`. Trước khi vẽ phải `setTransform(1, 0, 0, 1, 0, 0)`, vì html2canvas để lại phép co giãn và dịch tọa độ trên context. Ba nơi chụp dùng hàm này: Xuất ảnh / chép ảnh (`exportImageFromPreview`), ảnh xem trước lúc lưu thiết kế (`persistPage`) và lúc lưu một control làm mẫu. Thêm nơi chụp ảnh mới thì gọi hàm này. Kịch bản `highlightblend` đo điểm ảnh của ảnh xuất và ảnh chụp canvas.

## 15. Soạn nhanh, bản nháp, xuất tài liệu, lịch sử

### 15.1 Sửa chữ tại chỗ (`builder-inline-edit.js`)

Bấm đúp vào chữ trên control để sửa ngay trên vùng thiết kế: nhãn field, tiêu đề group box / section, chữ trên nút, chữ của label / checkbox / radio / tag, chữ thanh trên và tiêu đề popup, tên tab, tiêu đề lưới và nhãn View Data, nút toolbar của lưới Core, tiêu đề cột lưới Core và ESS, nút của Toolbar, tiêu đề ESS section.

- `builderInlineEdit.resolve(el)` trả `{ box, text, apply(cfg, text) }`. Mỗi loại control có một hàm target; `apply` ghi config rồi vẽ lại đúng phần chữ (field gọi `controlField.reapplyLayout`, lưới Core gọi `controlGrid.renderHeaderAndTitle` hoặc `refreshGrid`, lưới ESS gọi `controlGridEss.render`). Thêm loại control có chữ thì thêm một hàm target.
- Enter hoặc Tab ghi, Escape bỏ. Bấm ra ngoài hoặc cuộn canvas cũng ghi. Việc ghi khi bấm ra ngoài dùng listener `mousedown` ở pha capture, không dựa vào `blur`: handler `mousedown` của `#canvas` gọi `preventDefault` trước khi quét khối, nên bấm vào vùng trống của canvas không làm ô nhập mất focus.
- Một lần sửa là một bước Undo (`_coalesceHistory` được tắt trong lúc ghi để không gộp với thao tác chuột đang diễn ra).
- Bấm đúp tên một tab chưa mở: lần bấm đầu chuyển tab (một bước Undo riêng), rồi mới sửa tên.
- Nút ESS có biểu tượng: chỉ thay phần chữ, giữ biểu tượng.

### 15.2 Đổi thứ tự và chèn cột lưới

Dòng cột trong tab Cột có ba nút ↑ ↓ ＋: đưa cột lên trước, ra sau, chèn cột mới ngay sau cột đó. Lưới Core: `.btnMoveCol`, `.btnInsertCol` trong `control-grid.js`; lưới ESS: `data-cmd="move-col"`, `insert-col` trong `control-grid-ess.js`. Tên field (Core) và key (ESS) của cột chèn không trùng cột có sẵn. `builderProps.keepListScroll(shift, work)` giữ vị trí cuộn của danh sách cột khi danh sách dài (`shift` là chiều cao của dòng vừa đổi chỗ với dòng được dời). Khi danh sách không cuộn, dòng vừa dời nháy nền và nút vừa bấm được focus lại (mục 15.11).

### 15.3 Vùng nhìn

- `builder.fitOnOpen()`: khi mở thiết kế từ server, mở màn hình chuẩn hoặc mẫu của team thành thiết kế mới, khôi phục bản nháp. Thu nhỏ cho vừa chiều ngang vùng vẽ; không phóng quá 100%, không nhỏ hơn 50%.
- `Ctrl+\` hoặc nút ◧ ở thanh dưới (`builder.togglePanels()`): ẩn cả Toolbox lẫn phần thuộc tính; bấm lần nữa hiện lại cả hai.

### 15.4 Giữ phiên và bản nháp (`builder-draft.js`, `builder-store.js`)

`builderStore` là kho khóa - giá trị trên IndexedDB của trình duyệt (`badesign-builder`, object store `kv`).

- Bản nháp: 1,5 giây sau thay đổi cuối, nếu nội dung khác bản đã lưu thì ghi `{ json, name, count, base, savedAt }` vào khóa `draft:<ControlId>` (thiết kế của mình) hoặc `draft:new`. Lưu xong thì xóa. Khi mở Builder mà còn bản nháp khác nội dung đang mở, thanh báo phía trên hiện hai nút **Khôi phục bản nháp** và **Bỏ bản nháp**. Khôi phục là một bước Undo, thiết kế ở trạng thái Chưa lưu. `base` là dấu vết của bản đã lưu lúc ghi nháp; nếu bản trên server đã khác thì thanh báo ghi chú thêm.
- Giữ phiên: 5 phút một lần gọi `Builder.aspx/KeepAlive` nếu trong 10 phút gần nhất có thao tác; quay lại tab sau hơn 5 phút cũng gọi. Server trả `false` (hết phiên) thì hiện thanh báo màu vàng có nút mở trang đăng nhập và nút Kiểm tra lại. Server chưa có method này thì tự tắt, không báo sai.
- Bản nháp nằm trên máy và trình duyệt đó, không đồng bộ sang máy khác. Màn duyệt mẫu (`builder.readOnly`) không ghi nháp.

### 15.5 Xuất ảnh

- Tên tệp lấy theo tên thiết kế (`builder.exportFileName`), bỏ ký tự không dùng được trong tên tệp.
- Nút **Xuất ảnh** tải cả trang; mũi tên bên cạnh mở menu: Tải ảnh vùng đang chọn, Chép ảnh cả trang, Chép ảnh vùng đang chọn, Bảng mô tả field. Menu chuột phải có **Ảnh của vùng chọn**.
- Vùng chọn là khung bao các control đang chọn cộng 8px mỗi phía, cắt ra từ ảnh cả trang (`builder.cropCanvas`); control khác nằm trong khung cũng có mặt.
- Chép vào clipboard: `ClipboardItem` nhận một Promise tạo ngay trong lúc bấm (`builder.beginImageCopy`), nhờ vậy vẫn còn quyền thao tác của người dùng khi ảnh dựng xong. Trình duyệt không cho chép (trang http không phải localhost) thì tải tệp về và báo.
- Ảnh xuất luôn ở tỉ lệ 100% dù đang zoom (bản sao được đặt `zoom: 1`). Bản sao ẩn dùng để xuất được gỡ khi xong.

### 15.6 Ảnh gốc sau khi nhận dạng (`builder-reference.js`)

`builderImport.commit` gọi `builderReference.keep(src)` trước khi gỡ ảnh nguồn và giữ `{ sourceId, imageData, left, top }` (tối đa 3 ảnh mỗi thiết kế). Nút **Ảnh gốc** ở thanh dưới chỉ hiện khi có ảnh gốc, bấm để xoay vòng: tắt, chồng mờ 50% đúng vị trí ảnh cũ, chỉ hiện ảnh gốc. Nút × bỏ ảnh gốc.

Lớp ảnh nằm trong `#canvas-zoom-inner`, có `pointer-events: none` và `data-html2canvas-ignore`, nên không cản thao tác và không vào ảnh xuất, ảnh thu nhỏ. Hoàn tác việc nhận dạng (ảnh nguồn quay lại) thì lớp ảnh gốc tự ẩn. Thiết kế đã lưu giữ ảnh gốc trong `builderStore` (khóa `ref:<ControlId>`, trên máy đó); thiết kế chưa lưu chỉ giữ trong phiên.

### 15.7 Mô tả field và bảng cho SRS (`builder-spec.js`)

- Thẻ **Mô tả cho SRS** được chèn vào cuối phần thuộc tính của mọi control (trừ đánh dấu) bằng một `MutationObserver` trên `#propPanel`: ô `description`, và `dataSpec` (kiểu dữ liệu, độ dài) cho ô nhập.
- **Xuất ảnh ▾ → Bảng mô tả field cho SRS**: `builderSpec.collect()` duyệt theo khối chứa (popup, tab, group, section, lưới) và thứ tự đọc (trên xuống, trái sang). Cột: STT, Khu vực, Tên field, Loại control, Bắt buộc, Chỉ đọc, Mặc định / danh sách, Kiểu dữ liệu, Mô tả. Gồm field, nút, cột lưới, nút toolbar; Label và Image chỉ có khi tick ô ở đầu hộp.
- Hai cột cuối sửa được ngay trong bảng (ghi vào config của control, cột lưới hoặc nút toolbar); đóng hộp là một bước Undo.
- **Chép bảng** đưa bảng có định dạng và bản chữ thường vào clipboard để dán vào Word, Excel. **Tải CSV** ghi UTF-8 có BOM.

### 15.8 Lịch sử phiên bản và so sánh (`builder-versions.js`, `Helpers/UiDesignVersions.cs`)

- Bảng `UiBuilderControlVersion` (script `Scripts/AddUiBuilderControlVersion.sql`). `SaveControl` với `controlType = "page"`: trước lần ghi đè đầu tiên chụp nội dung cũ thành phiên bản 1 (`CaptureBeforeUpdate`); sau khi lưu ghi một phiên bản nếu JSON khác phiên bản gần nhất (`RecordSave`); giữ 30 phiên bản gần nhất. Lỗi ghi phiên bản, kể cả khi chưa chạy script, chỉ ghi log và không chặn việc lưu.
- Bản gốc (`Kind = "baseline"`): khi mở màn hình chuẩn hoặc mẫu của team thành thiết kế mới, trình duyệt giữ JSON lúc mở (`builderVersions.setBaseline`); sau lần lưu đầu tiên gửi `SaveDesignBaseline`.
- **Lưu ▾ → Lịch sử phiên bản**: mỗi dòng có **So với bản đang mở** và **Khôi phục** (đưa nội dung vào canvas, chưa lưu, Ctrl+Z quay lại). **Lưu ▾ → So với bản gốc** so với bản gốc.
- So sánh theo `id` control (`builderVersions.diff`): control mới viền xanh lá, đổi nội dung viền cam, chỉ dời hoặc đổi cỡ viền xanh dương nét đứt, đã xóa là khung đỏ nét đứt tại chỗ cũ. Bỏ qua `activeTabIndex`, `zIndex` và khóa bắt đầu bằng `_`. Thanh tóm tắt có nút Danh sách và Tắt so sánh. Đánh dấu được vẽ lại sau mỗi thay đổi. Ảnh thu nhỏ khi lưu không có đánh dấu; ảnh xuất thì có, dùng để minh họa phần đã chỉnh.

### 15.9 Chữ trong phần thuộc tính

Nhãn trong phần thuộc tính và hộp xác nhận là tiếng Việt. Tên loại control và tên phần tử của HRM (View Data, Local Data Language, Filter Row, View / Edit / Delete) giữ tiếng Anh. Builder chưa nối engine song ngữ ([13-Song-ngu.md](13-Song-ngu.md)), nên ở chế độ English các chữ này vẫn là tiếng Việt. Thiết kế mới mặc định **không** chia sẻ; BA tự tick "Chia sẻ cho các BA khác cùng xem" khi muốn, không qua duyệt.

### 15.10 Nội dung thiết kế là dữ liệu không tin cậy

Thiết kế có thể do người khác tạo: thiết kế được chia sẻ, mẫu của team, mẫu đang chờ duyệt.

- `builder.sanitizeControls(list)` chạy ở mọi cửa nạp (`loadControlFromServer`, `loadConfig`, `restoreFromJson`, `builderSnippet.instantiate`): bỏ phần tử không phải object và control có `type` không hợp lệ; thay `id` không hợp lệ (chỉ nhận chữ, số và `_ . : -`) rồi sửa liên kết `parentId`, `tabPageId`, `groupId`; xóa `ftype`, `uiMode`, `dock` không hợp lệ; thay id cột và id nút của lưới ESS.
- Chữ của thiết kế đưa vào HTML phải qua `builder.escapeHtml` hoặc `.text()` / `textContent`. Đường vẽ control và Danh sách control đã theo quy tắc này (tiêu đề group box / section, chữ checkbox / radio, bảng multiselect, biểu tượng nút, ảnh).
- Phía server, `UiTemplateLibrary.Submit` từ chối thiết kế có `id` / `type` không hợp lệ hoặc có chữ giống mã HTML, script.
- Phần thuộc tính của mọi loại control dựng qua `builderProps` (mục 15.11): giá trị đưa vào `value`, nội dung `textarea` và chữ của nhãn đều được mã hóa trong helper.

### 15.11 Phần thuộc tính (`Scripts/builder/builder-props.js`, `Content/builder-props.css`)

Mục tiêu: trên màn hình laptop (vùng nhìn khoảng 1280×620, phần thuộc tính rộng mặc định 370px, kéo được từ 200px) thấy được nhiều nhất mà không phải cuộn, và mọi loại control dùng chung một kiểu trình bày. Ví dụ tab Cột của lưới Core hiện đủ 12 cột, thuộc tính của một ô nhập chữ nằm trọn một màn hình.

**Một nơi dựng, một nơi trình bày**

- `builder-props.js` (`window.builderProps`, trong các module gọi tắt là `P`) dựng toàn bộ HTML của phần thuộc tính và gắn hành vi dùng chung **một lần** trên `#propPanel`. Module control (`control-*.js`, `builder-spec.js`) chỉ gọi helper: không tự viết thẻ có class `pp-*`, không viết `style="..."`. Giá trị đưa vào thuộc tính và nội dung thẻ được mã hóa ngay trong helper.
- `builder-props.css` là nơi duy nhất chứa kiểu trình bày của cột phải: khung (`.prop-toggle`, `.prop-main`, `.prop-tabs`, `.prop-tab-body`) và mọi class `pp-*`. File không dùng `!important` và không có bộ chọn theo `style`. Khối `<style>` của `Builder.aspx` chỉ giữ phần bố cục trang (độ rộng `.builder-wrapper > .prop-shell`, trạng thái gập, thanh kéo). Muốn đổi giao diện phần thuộc tính thì sửa file này, không thêm CSS ở nơi khác.
- Ngoại lệ có chủ đích: màu là dữ liệu (ô màu mẫu của chú thích, màu của biểu tượng glyphicon) được đặt bằng `style` bên trong `builderProps`.
- Class trạng thái: `is-open` (dòng đang mở), `is-active` (tab đang chọn), `is-flash` (dòng vừa dời).

**Helper và cấu trúc sinh ra**

| Helper | Kết quả |
|---|---|
| `P.panel(title, meta, body, footer)` | `.pp-panel` gồm `.pp-head` (`.pp-title`, `.pp-id`), `.pp-body` (vùng cuộn) và `.pp-foot` (đứng yên ở đáy, chứa nút lưu) |
| `P.tabbedPanel(title, meta, tabs, active, panels)` + `P.tabPanel(key, active, body, cls)` | `.pp-panel--tabs` gồm `.pp-head`, `.pp-tabs` (hai `.pp-tabs-arrow` và `.pp-tabs-strip` chứa `.pp-tab[data-tab]`), các `.pp-tab-panel[data-tab]`; tab là danh sách thêm `pp-tab-panel--list` |
| `P.section(title, body, { count, action, cls })` | Nhóm có thanh tiêu đề mỏng, số đếm và nút thêm ở bên phải |
| `P.line(...)`, `P.field(label, control, cls, forId)` | Một dòng; field đầu dòng đặt nhãn vào cột nhãn (`--pp-label-w`) nên ô nhập của các dòng thẳng hàng. `pp-field--num`: ô số hẹp; `pp-field--stack`: nhãn nằm trên ô nhập |
| `P.grid(...)` | Lưới ô đều cho nhóm số hoặc nhóm màu (Rộng / Cao / Z-index, Nền / Chữ / Viền) |
| `P.text`, `P.number`, `P.select`, `P.textarea` | Ô nhập `.pp-input` (`pp-input--mono`, `pp-input--tall`, `pp-search`) |
| `P.check`, `P.radio`, `P.checks(items, cls)` | Checkbox, radio và nhóm (`pp-checks--cols2`, `pp-checks--stack`) |
| `P.toggle`, `P.toggles(...)` | Nút bật tắt B / I đặt cạnh ô nhập |
| `P.color(pickMap, textMap, value, fallback, pairMap)`, `P.colorPick`, `P.swatches` | Cặp ô chọn màu và ô mã màu; ô chọn màu đơn; dãy màu mẫu |
| `P.button`, `P.saveButton`, `P.hint`, `P.empty` | Nút, nút lưu control, chú thích, dòng báo trống |
| `P.bar`, `P.barHint`, `P.listHead`, `P.list`, `P.rows`, `P.scroll` | Thanh trên danh sách, dòng tiêu đề cột, danh sách có vùng cuộn `.pp-list-wrap`, danh sách nằm trong section, vùng cuộn khác |
| `P.row({ attrs, open, head, tools, body })`, `P.rowNo`, `P.iconButton`, `P.rowToggle` | Dòng 28px: số thứ tự, ô chính, nút; phần chi tiết mở bằng nút mũi tên. Kiểu cột: `pp-cols-0`, `pp-cols-1`, `pp-cols-2`, `pp-cols-ms`, `pp-row--fluid` |
| `P.matrix(columns, rowTitles, cell)` | Bảng (tab Quyền của lưới Core) |
| `P.iconCell(item, key)`, `P.iconEditor(item, key, options)` | Ô biểu tượng trên dòng và phần chọn / bỏ biểu tượng, màu biểu tượng |

**Hành vi dùng chung**

- Chuyển tab, mũi tên của dải tab, mở / đóng dòng (mỗi danh sách mở một dòng, nhớ theo `data-pp-owner` và `data-pp-kind` nên vẽ lại panel không làm đóng dòng), nút lưu `.pp-save`.
- Cặp màu: gõ mã màu hoặc chọn màu thì `builderProps` chuẩn hóa (`P.normalizeColor`), đồng bộ hai ô rồi phát sự kiện `pp:color`; module nhận bằng `P.onColor(input, handler)`.
- Biểu tượng: module khai `P.bindIcons(scope, { item(key), changed(structural), defaultColor })`; `builderProps` mở hộp Chọn Icon, ghi `icon`, `iconType`, `iconColor` vào đối tượng mà `item(key)` trả về rồi gọi `changed`. Chọn ô "không có biểu tượng" hoặc bấm Bỏ đều xóa biểu tượng.
- `P.validTab(keys, wanted)`: tab đang mở của panel trước không có ở panel mới thì về tab đầu (lưới Core đang ở tab Quyền rồi chọn lưới ESS).
- `P.keepListScroll`, `P.flashRow`, `P.isRowOpen`, `P.setRowOpen`, `P.rowRemoved`, `P.rowInserted`, `P.rowMoved` cho danh sách đổi thứ tự / chèn / xóa.
- `P.host()` là nơi `builder-spec.js` chèn thẻ Mô tả cho SRS; `P.render(html)`, `P.showEmpty()`, `P.showMessage(text)` thay nội dung panel.
- Module **không** gắn handler ủy quyền lên `#propPanel`: handler như vậy còn sống khi người dùng chọn loại control khác. Handler riêng của một panel gắn vào phần tử của lần vẽ đó (lưới ESS gắn vào `#propPanel > .pp-panel`), để nó mất cùng panel.

**Bố cục và bề ngang**

- `.prop-main`, `#propPanel`, `.pp-panel` là các cột flex không cuộn. Chỉ `.pp-body`, `.pp-tab-panel` và `.pp-list-wrap` cuộn, và chúng là khối thường nên phần tử con không bị bóp khi thiếu chiều cao.
- `#propPanel` là container (`container: pp / inline-size`). Nội dung rộng từ 290px trở xuống: nút của dòng hai cột xuống dòng dưới. Từ 270px trở xuống: nhãn chuyển lên trên ô nhập. Nhóm checkbox hai cột và `P.grid` tự về một cột khi không đủ chỗ.
- Dải tab dài hơn panel thì không xuống dòng: hai nút mũi tên hiện ra để cuộn dải tab; nút ở đầu mút bị mờ. Tab đang chọn luôn được đưa vào tầm nhìn, kể cả sau khi vẽ lại panel hoặc đổi bề ngang (`ResizeObserver`).
- Khi gập cột phải, thanh dọc phủ kín phần còn lại của cột.

**Lỗi có sẵn được sửa cùng đợt**

- Bấm tab Danh sách control thì phần thuộc tính vẫn hiện và danh sách chỉ còn một dải thấp ở đáy: quy tắc `#propPanel { display: flex }` trong `builder-ess.css` thắng quy tắc ẩn tab không chọn. Nay trạng thái hiện nằm ở `.prop-tab-body.prop-body-active`.
- Đổi màu biểu tượng của cột nút (lưới Core) ghi thêm thuộc tính tên `undefined` vào thiết kế: handler chung dùng bộ chọn `input[data-action-field!='visible']`, khớp cả ô không có `data-action-field`. Nay bộ chọn là `input[data-action-field]`.
- Chọn ô "không có biểu tượng" ở nút toolbar, cột nút của hai loại lưới không có tác dụng; nay xóa biểu tượng. Mọi nơi có biểu tượng đều có nút Bỏ.
- `$typeLabel is not defined` khi nút toolbar hoặc cột nút của lưới Core chưa có biểu tượng; ô tìm cột của lưới ESS không lọc khi panel có thẻ Mô tả cho SRS; tên tab của Tab Page chỉ gõ được một ký tự mỗi lần; hai loại lưới chọn qua lại làm nút mở dòng mất tác dụng.

**Kiểm thử**: `proppanel`, `proptyping`, `layout`, `gridcolumns` (bố cục, mũi tên tab, bề ngang 200 đến 431px, nút Bỏ biểu tượng, tab Danh sách control) và năm kịch bản `propsfields`, `propsess`, `propscontainers`, `propsgrids`, `propsicons` ghi lại hành vi của từng ô thuộc tính (453 giá trị trong `Tools/builder-harness/golden.json`). Sửa mã của phần thuộc tính thì chạy lại các kịch bản này; chỉ ghi lại giá trị khi thay đổi là có chủ đích.

Các kịch bản khác của mục 15: `inlineedit`, `exportimage`, `draft`, `refimage`, `spec`, `versions`, `baseline`, `teamflow`, `unsafe`.

Mẫu dùng chung của team, quy trình duyệt và màn duyệt chỉ xem: xem [15-Thu-vien-mau-va-quy-trinh-duyet.md](15-Thu-vien-mau-va-quy-trinh-duyet.md).

## 16. Trang danh sách thiết kế (`Pages/Home.aspx`)

Trang mở từ mục **Thiết kế giao diện** của sidebar (đường dẫn `/Home`). Trang dùng khung chung (`BaSidebar`, `BaTopBar`, `BaHead`, xem [14-Khung-trang-dung-chung.md](14-Khung-trang-dung-chung.md)) và các thành phần của `Content/ba-layout.css` (`ba-tabs`, `ba-btn`, `ba-input`, `ba-table`, `ba-modal`, `ba-empty-state`, `baConfirm`, `BaToast`). CSS riêng của trang có tiền tố `hd-` và chỉ dùng biến màu chung, nên đúng ở cả chế độ sáng và tối.

**Trên màn hình**

- Hai tab: **Thiết kế của tôi** và **Thiết kế công khai** (của mọi người, chỉ xem ảnh và nhân bản). Tab đang mở được ghi vào địa chỉ (`#mine`, `#shared`).
- Thanh công cụ: ô tìm (theo dữ liệu: tên thiết kế, tên dự án, người tạo, loại, ngày sửa; không tìm theo chữ của nhãn nên kết quả giống nhau ở hai ngôn ngữ), lọc dự án (chọn nhiều, có tạo và xóa dự án), lọc Công khai / Riêng tư, sắp xếp, chuyển lưới / danh sách (nhớ trong `localStorage['designs-view']`).
- Thẻ thiết kế: bấm ảnh hoặc tên để mở trong Builder; ba nút: xem ảnh lớn, chuyển công khai / riêng tư, xóa (có hỏi lại). Thẻ công khai có nút **Nhân bản** (`/Builder?cloneId=...`).
- Nút **Từ màn hình chuẩn** mở hộp Màn hình chuẩn (`builderTemplates.openGallery()`), nút **Từ file draw.io** mở Builder với hộp Mở file draw.io (`/Builder?drawio=1`, mục 13.9), nút **Thiết kế mới** mở Builder với trang trắng.

**Dữ liệu**

| Việc | Nơi xử lý |
|---|---|
| Danh sách của tôi và danh sách công khai | `Home.aspx/ListDesigns` → `Helpers/UiDesignCatalog.ListMine`, `ListPublic` |
| Xóa (xóa mềm, chỉ thiết kế của mình) | `Home.aspx/DeleteDesign` → `UiDesignCatalog.Delete` |
| Công khai / riêng tư | `Home.aspx/SetDesignPublic` → `UiDesignCatalog.SetPublic` |
| Dự án: danh sách, tạo, xóa | `Builder.aspx/GetProjects`, `CreateProject`, `DeleteProject` (dùng chung với hộp lưu của Builder) |

Xóa dự án không xóa thiết kế: `DeleteProject` xóa mềm dự án và đưa mọi thiết kế của nó (kể cả thiết kế đã xóa mềm) về chưa chọn dự án (`ProjectId` rỗng). Trang hiện **Chưa chọn dự án** cho các thiết kế này, giống hộp lưu của Builder. Không còn dự án mặc định `Uncategorized`: bản cũ của `Scripts/AddProjectSupport.sql` tạo cho mỗi người dùng một dự án tên đó và `DeleteProject` chuyển thiết kế vào nó, nên người dùng thấy hai nhóm cùng nghĩa. `Scripts/AddMergeUncategorizedProject.sql` (chạy lại được) đưa thiết kế của các dự án mặc định đó về chưa chọn dự án rồi xóa mềm dự án; nó nhận dự án mặc định bằng tên và mô tả do script cũ ghi (`Default project for existing designs`), dự án người dùng tự đặt tên `Uncategorized` thì giữ nguyên. `AddProjectSupport.sql` không còn tạo dự án mặc định, nên chạy lại không sinh lại nó.

Ba hàm của `Home.aspx` yêu cầu đã đăng nhập và có quyền `Builder`; thiếu thì trả `success = false` kèm thông báo, không trả dữ liệu. `UiDesignCatalog.SafeThumbnail` chỉ nhận đường dẫn ảnh trong `/Content/design-thumbs/`; giá trị khác, thiết kế chưa có ảnh, hoặc file ảnh không còn trên máy chủ thì trang hiện ô "Chưa có ảnh xem trước" (class `hd-noimg`, dùng chung cho thẻ, dòng danh sách và hộp xem ảnh lớn).

**Quy tắc**

- Trang dựng thẻ và dòng bằng `textContent` (hàm `el`, `data` trong script của trang); tên thiết kế, tên dự án, tên người tạo là dữ liệu nên luôn đi qua `data(...)` (có `translate="no"`). Không ghép các giá trị này vào chuỗi HTML.
- Chữ giao diện viết tiếng Việt trong trang; bản tiếng Anh nằm ở nhóm `ui-builder-home` của `Scripts/i18n/ba-i18n.en.js` (xem [13-Song-ngu.md](13-Song-ngu.md)). Hộp Màn hình chuẩn mở trên trang này dùng `builder-templates.js`, file không nằm trong phạm vi công cụ rà chữ: ở chế độ English mới có ô lọc phân hệ và nút Mở file draw.io được dịch, phần còn lại của hộp (mô tả màn hình, nút Chụp từ HRM…) vẫn là tiếng Việt như trang Builder.
- Biểu tượng là SVG vẽ sẵn trong bảng `ICONS` của trang, không nạp thêm thư viện.

**Kiểm thử**: `Tools/page-checks/home.js` chạy bằng Playwright trên trang thật sau khi đăng nhập (cách chạy ở `Tools/page-checks/README.md`); unit test của `UiDesignCatalog` nằm ở `BADesign.Tests/UiDesignCatalogTests.cs`.
