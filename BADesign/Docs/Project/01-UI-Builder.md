# UI Builder

Màn `Pages/Builder.aspx`, script `Scripts/builder/`. BA kéo control lên canvas để vẽ form Core hoặc ESS. Kết quả là mảng `builder.controls`, lưu DB khi bấm **Lưu** (mục 11).

Code chính: `builder.js` (canvas, history, chọn, kéo, align, lưu), `control-field.js`, `control-popup.js`, `control-grid.js`, `control-grid-ess.js`, `control-tabpage.js`, `control-toolbar.js`, `control-collapsible-section.js`, `control-annotation.js` (đánh dấu, mục 14), `control-tree.js` và `control-splitter.js` (field tự vẽ, mục 10). Thư viện màn hình chuẩn và chụp màn hình từ HRM: mục 13.

## 1. Mô hình tọa độ

Mỗi control là một object trong `builder.controls`.

- `id`, `type` (`field`, `popup`, `grid`, `ess-grid`, `toolbar`, `tabpage`, `collapsible-section`, `annotation`)
- `left`, `top`, `width`, `height` — pixel CSS, chưa nhân zoom
- `parentId` — cha, hoặc `null` nếu nằm thẳng trên canvas
- `paneIndex` (`0` | `1`) — chỉ có ở control là con trực tiếp của Splitter: vùng chứa nó (mục 10)
- `zIndex`
- Field thêm `ftype` và `uiMode` (`core` | `ess`)

`left` / `top` luôn relative với **cha trực tiếp**.

| Cha | Gốc tọa độ của con |
|---|---|
| Không có | Canvas `#canvas-zoom-inner`, cách mép thước khoảng 20px |
| Popup | `.popup-body`. Riêng toolbar gắn vào popup (`dock = "popup"`) thì gốc là khung `.popup-design`, để đặt được lên vùng tiêu đề |
| Group box / Section | Vùng content (`.page-field-groupbox-content`, `.page-field-section-content`) |
| ESS collapsible section | Vùng content `.ess-collapsible-content` |
| Splitter | Vùng chứa control: `.core-splitter-pane[data-pane="0"]` hoặc `[data-pane="1"]`, theo `paneIndex` của con |

Ví dụ multiselect trong group, group trong popup: popup dùng tọa độ canvas, group dùng tọa độ popup, multiselect dùng tọa độ content của group.

**Khối chứa** là popup, group box, section, ESS section và Splitter (`builder.isContainerConfig`). Splitter có hai phần nội dung (hai vùng, mục 10), các khối chứa khác có một. Mọi loại control đều làm con của khối chứa được — field, grid, ESS grid, toolbar, ESS section, Splitter, và cả group box / section lồng nhau — trừ popup và đánh dấu (`builder.canNest`). Tab page chỉ làm con của **popup** và **Splitter** (`builder.hostsTabPages`: popup có tab và màn hình master / detail có tab ở một vùng là hai mẫu rất hay gặp ở Core); thả lên group box / section thì nó vẫn nằm trên canvas. Tab page không phải khối chứa trong DOM (mục 10).

Việc gán cha chỉ nằm ở một chỗ, dùng chung cho thả từ toolbox, bấm để thêm, kéo, kéo nhiều control:

1. **Chọn cha theo hình học** — `builder.containerAt(el, cfg, point)`: lấy khối chứa nằm **trên cùng** (so thứ tự xếp lớp bằng `builder.isStackedAbove`) mà khung của nó chứa điểm xét. Điểm xét là **vị trí con trỏ** với control đang nắm hoặc vừa thả từ toolbox, là **tâm** control với các control đi kèm trong vùng chọn nhiều. Không có vùng “hút” quanh khối chứa và không đòi control nằm lọt trong khối chứa. Phép thử dùng khung của control chứa, không dùng phần tử content (content của group box / section chỉ cao khoảng 60px). Riêng Splitter thử theo khung của từng vùng để biết control rơi vào vùng nào; hàm trả `{ id, pane }` (`pane` là `null` với khối chứa khác). Điểm rơi đúng lên thanh chia 6px không thuộc vùng nào, nên control thuộc về khối chứa bên ngoài Splitter. Khối chứa không nhận chính nó hoặc con cháu của nó làm cha.
2. **Đổi cha không đổi vị trí trên màn hình** — `builder.setControlParent(cfg, parentId, pane)`: đo `getBoundingClientRect`, chuyển phần tử sang content của cha mới, đo lại rồi bù chênh lệch (chia `builder.cssScale()`) vào `left` / `top`. Không cộng trừ `cfg.left` của cha và không dùng số ước lượng chiều cao header. Hàm này cũng đặt `dock` cho toolbar, thứ tự chồng lớp (z-index) cho control không phải field, và `paneIndex` (ghi khi cha là Splitter, xóa khi cha là khối khác hoặc không có cha). Thứ tự chồng lớp của lưới, lưới ESS và toolbar (`builder.derivesStacking`) chỉ được tính ở một nơi, `builder.applyStacking(cfg, $el)`: lưới trong popup lấy z-index của popup cộng 10, lưới trong ESS section lấy của section cộng 1, còn lại không đặt z-index để trình duyệt xếp theo thứ tự vẽ. Hàm vẽ lưới (`control-grid.js`, `control-grid-ess.js`) và `updateDescendantsZIndex` của `control-field.js` gọi cùng hàm đó. Trước ngày 2026-11-25 đường thả control đặt z-index 1 còn đường vẽ lại thì không, nên lưới nhân bản hoặc dán trong một khối chứa bị vẽ dưới bản gốc dù đứng sau trong danh sách control (kịch bản `dupstack`).
3. `builder.dropControl(cfg, point)` gộp bước 1 và 2, làm tròn theo lưới khi đổi cha, rồi cập nhật tab (`builder.updateTabMembership`).
4. Khi vẽ lại từ JSON (undo, mở thiết kế, dán, nhân bản): `builder.renderControlByConfig` vẽ control rồi `builder.mountInParent` đưa phần tử vào content của cha (với Splitter là vùng theo `paneIndex`). `left` / `top` trong JSON luôn là tọa độ theo cha và được dùng nguyên; hàm vẽ của từng loại control không quy đổi tọa độ. Cờ `_fromRestore` còn được gắn ở vài nơi gọi nhưng không còn tác dụng.
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
- Control đặc biệt: language combo, toolbar, tab page, tree (cây cha - con), splitter (khối hai vùng có thanh chia)
- Control mẫu đã lưu: control đã lưu, tải lúc mở trang

`data-control` là loại, `data-ui` là core hoặc ess. `builder.addControl(type, uiMode, dropPoint)` luôn tạo control trên canvas với góc trên trái đúng tại điểm thả (kể cả popup, tab page, ESS section, toolbar – `builder.placeAtDropPoint`), rồi gọi `builder.dropControl` để gán cha theo mục 1: thả lên khối chứa nào thì vào khối đó, thả ra ngoài mép (dù chỉ vài pixel) thì nằm trên canvas. Các hàm `addNew` của từng loại control không tự dò cha. Kéo từ toolbox không dùng quán tính: control rơi đúng chỗ nhả chuột kể cả khi nhả lúc đang rê nhanh. Cả lần thêm là một bước Undo. `builder.addControl` bỏ chọn mọi control trước khi thêm, vì bấm trong toolbox và trên thanh trên cùng không còn bỏ chọn như bấm ra vùng trống. Bấm để thêm popup hoặc đánh dấu thì luôn đặt trên canvas, không theo khối đang chọn; bấm để thêm tab page khi đang chọn một popup thì tab page nằm trong popup đó. Tab page vừa thêm (kéo hoặc bấm) được gán cha theo điểm thả bằng `builder.placeInContainer` (chỉ nhận popup): trước đây tab page thả lên popup vẫn nằm trên canvas và bị popup che mất.

Mục toolbox có `data-control="screen:<key>"` chèn cả một màn hình của thư viện tại điểm thả (`builderTemplates.insertAt(key, dropPoint)`). Đang có ba mục: Popup Select Organization (chọn một), Popup Select Organization (chọn nhiều), Popup Organization Structure (Map to Unit).

Khi kéo từ toolbox, nhãn tên control đi theo con trỏ (`builder.showDragHint` / `moveDragHint`), con trỏ là `copy`, và là `no-drop` khi đang ở trên toolbox. `builder.toolboxDropPoint` quyết định điểm thả: nhả trên toolbox thì không thêm gì; nhả ngoài vùng vẽ đang nhìn thấy (trên phần thuộc tính, thanh trên cùng, thanh zoom) thì control được đặt vào mép gần nhất của vùng nhìn thấy. Sau khi thêm, `builder.revealControl` cuộn vùng vẽ để phần nhìn thấy được của control mới nằm trọn trong tầm nhìn: `builder.visibleBox` cắt khung của control theo mọi khối chứa có `overflow` khác `visible` (vùng của Splitter, popup), nên control rộng hơn khối chứa nó (Splitter rộng 600px thả vào vùng rộng 300px) không làm vùng vẽ cuộn tới phần bị cắt và đẩy góc của khối chứa ra khỏi tầm nhìn (kịch bản `splittermove`). Lưới thả vào vùng của Splitter thì đã được thu cho vừa vùng trước khi cuộn (mục 10).

Nút đóng / mở toolbox (`#toolboxToggle`) là `position: fixed` ở giữa mép phải của toolbox, nên vẫn nhìn thấy và bấm được khi danh sách control cuộn xuống.

## 4. Chọn

Click chọn một control và mở thuộc tính của nó; control khác bị bỏ chọn. Ctrl+click hoặc Shift+click thêm / bớt một control thuộc bất kỳ loại nào (field, grid, toolbar, popup, tab page, đánh dấu). Click nhỏ trên vùng trống hoặc Escape thì bỏ chọn. Click content của group không chọn group — để quét hoặc chọn con. Vùng của Splitter khác ở một điểm: Splitter không có thanh tiêu đề để bấm, nên bấm nhỏ (không kéo) vào chỗ trống của một vùng thì chọn Splitter đó (`builder.endMarquee`; người dùng yêu cầu ngày 2026-11-26); kéo trên chỗ trống vẫn là quét chọn control bên trong. Bấm vào thanh chia cũng chọn Splitter.

**Ctrl+A** chọn mọi control đang hiển thị nằm thẳng trên trang (`builder.selectAll`). Control nằm trong popup, group box, section, ESS section, Splitter được chọn theo khối chứa của nó; control ở tab không mở đi theo tab page. Trình duyệt không còn bôi đen chữ của cả trang. Khi con trỏ đang ở ô nhập thì Ctrl+A vẫn là chọn chữ trong ô; khi đang mở hộp thoại thì Builder không can thiệp.

**Quét khối** (kéo trên vùng trống) chọn các control chạm khung quét và **cùng cấp với nơi bắt đầu quét** (`builder.beginMarquee` ghi phạm vi, `builder.endMarquee` chọn):

| Bắt đầu quét ở | Được chọn |
|---|---|
| Vùng trống của canvas | Control nằm thẳng trên canvas, kể cả popup, tab page và thành viên của tab đang mở. Không chọn con của khối chứa. |
| Thân popup, content của group box / section / ESS section, vùng của Splitter | Chỉ con trực tiếp của khối đó, không chọn chính khối. Với Splitter là control của cả hai vùng nếu khung quét vắt qua thanh chia. |
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

**Phân biệt di chuyển và đổi kích thước.** Di chuyển: nắm vào bất kỳ đâu trên control, kể cả ô nhập, ô chọn và sát mép (ô nhập trên canvas có `pointer-events: none`, chỉ là hình vẽ). Popup kéo bằng vùng tiêu đề, grid và lưới ESS kéo bằng các dải phía trên bảng (lưới Core: dải tên lưới, dải nút, dải tiêu đề; lưới ESS: `.ess-grid-header`) hoặc bằng nút dời ở góc trên trái (`.ub-move`, dựng bởi `builder.ensureMoveHandle`, hiện và nhận chuột khi rê chuột lên lưới hoặc khi lưới đang được chọn; cùng kiểu trình bày với nút dời của Splitter trong `builder.css`), ESS section kéo bằng header, tab page kéo bằng dải tab (cả phần trống lẫn tên tab; thân tab page để quét khối), Splitter kéo bằng nút dời ở góc trên trái (hiện khi Splitter đang được chọn; bấm thanh chia để chọn nó), toolbar kéo ở bất kỳ đâu kể cả trên nút (toolbar nằm trên dải tiêu đề không có nền riêng nên không còn phần "không phải nút" để nắm). Đổi kích thước: chỉ bằng **tay nắm nhìn thấy được** ở mép phải, mép dưới và góc, và tay nắm chỉ hoạt động khi control đang được chọn (field: `.page-field-resizer`, `.page-field-resize-handle-right/bottom`; popup, tab page, ESS section, lưới Core, lưới ESS: `.ub-resize-right/bottom/corner`). Không còn vùng resize vô hình: mép trái popup, mép control chưa chọn và vùng tiêu đề sát mép đều là di chuyển. Với interact.js phải khai báo `edges` bằng selector của tay nắm; dùng `edges: true` kèm `allowFrom` và `margin` thì bấm gần mép không ra thao tác nào.

**Lưới không còn dải nào để nắm.** Bấm hoặc kéo trong bảng của lưới (ô, tiêu đề cột) không chọn và không dời lưới, nên lưới chỉ dời được từ các dải phía trên bảng. Lưới tắt tiêu đề và không có nút (ví dụ lưới chụp từ một bảng HTML thường) thì lưới Core không còn dải nào (cả ba dải cao 0px), lưới ESS chỉ còn dải đệm 11px. Nút dời `.ub-move` là chỗ nắm luôn có ở cả hai loại lưới; kịch bản `gridmove` kiểm tra.

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

**Splitter** (field `ftype: "splitter"`, `uiMode: "core"`, vẽ bởi `control-splitter.js`): khối chia vùng kiểu ASPxSplitter của Core, gồm hai vùng và một thanh chia ở giữa, dùng cho màn hình master / detail. Splitter là **khối chứa** (mục 1): mỗi vùng chứa được field, lưới, toolbar, tab page, group box, Section, ESS section và Splitter khác; không chứa popup. Bản thân Splitter nằm được trên canvas, trong popup, group box, Section, ESS section, tab page và trong vùng của một Splitter khác.

Config: `splitOrientation` (`horizontal` là thanh nằm ngang, hai vùng trên / dưới; `vertical` là thanh đứng, hai vùng trái / phải), `splitGrip` (nút nắm ở giữa thanh, mặc định bật; Toolbox, chụp từ HRM và tách ảnh đều không ghi giá trị này, nên Splitter nào cũng có nút nắm cho tới khi người thiết kế bỏ tick ô **Nút nắm** – người dùng quy định ngày 2026-11-25), `splitRatio` (phần trăm của vùng 1 trên chỗ còn lại sau khi trừ thanh, mặc định 50), `width` / `height` của cả khối (mặc định 600×300). Control con trực tiếp ghi `parentId` là id của Splitter và `paneIndex` (`0` là vùng trên hoặc trái, `1` là vùng dưới hoặc phải); `left` / `top` của nó tính từ góc của vùng đó. Vùng cắt phần nội dung tràn ra ngoài.

Kích thước vùng chỉ được tính ở một chỗ: `builderCapture.SPLIT` (`room(total)` là chỗ còn lại sau khi trừ thanh dày `METRICS.core.splitter` = 6px; `first(room, ratio)` là cỡ vùng 1; `ratio(first, room)` là phép ngược lại, làm tròn 4 chữ số thập phân) và `controlSplitter.boxes(cfg)` trả kích thước hai vùng. Bộ chuyển đổi màn hình chụp từ HRM (mục 13.5) và bộ tách ảnh (mục 12) dùng cùng các hàm này, nên màn hình chụp về có vùng đúng từng pixel. Mỗi vùng nhỏ nhất 20px (`MIN_PANE`); khối ngắn hơn 46px theo chiều chia thì hai vùng chia đôi chỗ còn lại.

- **Kéo thanh chia** (interact.js gắn trên `.core-splitter-bar`): vùng 1 đổi theo bước của lưới bắt dính (`builder.snapStep`) khi đang bật bắt dính, vùng 2 nhận phần còn lại. Phần thuộc tính có ô **Vùng 1 (%)** và **Vùng 2 (%)**: gõ một ô thì ô kia là phần bù (gõ 30 thì ô kia là 70); giá trị không phải số hoặc nằm ngoài khoảng 0–100 bị bỏ qua và ô trở về giá trị đang có.
- **Đổi Hướng thanh chia** giữ nguyên `width`, `height` và tỷ lệ; hai vùng chuyển từ trên / dưới sang trái / phải.
- **Kéo giãn khối** bằng ba tay nắm của field (mép phải, mép dưới, góc) hoặc ô Rộng / Cao: tỷ lệ giữ nguyên, hai vùng cùng đổi cỡ.
- **Chọn và dời khối**: bấm vào thanh chia hoặc bấm nhỏ vào chỗ trống của một vùng để chọn Splitter, rồi kéo nút dời ở góc trên trái (`.core-splitter-move`). Nút dời hiện và nhận chuột khi Splitter đang được chọn, và khi con trỏ ở trên phần của chính Splitter (thanh chia, chỗ trống của vùng, nút dời): `trackHover` trong `control-splitter.js` (một handler `mouseover` trên `document`) gắn class `core-splitter-hover` cho đúng Splitter đó. Con trỏ ở trên control con thì nút dời của Splitter ẩn, để không che nút dời của control con nằm ở góc vùng; Splitter lồng chỉ hiện nút của chính nó. Kéo nút dời khi Splitter chưa được chọn vẫn dời được và chọn luôn Splitter. Hai vùng và thanh chia không dùng để kéo cả khối (`dragIgnore`): kéo trên vùng là để quét chọn control bên trong, kéo thanh là để chia lại vùng. Đo ngày 2026-11-26 trên một Splitter có 300 ô nhập, 200 lần di chuột giữa các ô: thời gian tính lại kiểu trình bày khoảng 18ms, bằng lúc không có quy tắc hiện nút; quy tắc CSS `.page-field-splitter:hover:not(:has(.canvas-control:hover))` cho cùng kết quả mất khoảng 330ms (viết `:has(> … > .core-splitter-pane > .canvas-control:hover)` cũng vậy), vì mỗi lần con trỏ sang ô khác trình duyệt tính lại kiểu cho cả Splitter. Handler `mouseover` không làm tăng thời gian chạy script đo được (khoảng 100ms cho 200 lần di chuột, có hay không có handler).
- **Control giãn theo vùng**: lúc bắt đầu một thao tác làm đổi cỡ vùng (kéo thanh, gõ phần trăm, đổi hướng, kéo giãn khối), `snapshot` ghi lại control con trực tiếp nào đang chạm mép xa của vùng (dung sai `EDGE_SLACK` 2px). Control chạm mép phải của vùng được đổi bề rộng theo vùng; chiều cao chỉ đổi với tab page, khối chứa và field `tree`, `memo`, `image` (`stretchesHeight`), vì các control khác cao theo nội dung. Splitter lồng bên trong được ghi và áp tiếp theo cùng cách. Thao tác kết thúc mà có control con đổi cỡ thì cả thiết kế được dựng lại bằng `builder.restoreFromJson`, để từng loại control tự vẽ theo cỡ mới; cả thao tác là một bước Undo. Control là con của group box, Section hoặc ESS section nằm trong vùng thì chưa giãn theo (chỉ khối chứa đó giãn); thành viên của tab page là con trực tiếp của vùng nên theo cùng quy tắc với control khác.
- **Lưới Core theo chiều cao vùng** (`docksHeight`): khi chiều cao vùng đổi, lưới kéo dài hoặc thu lại cho vừa tới mép dưới của vùng, chiều cao mới là chiều cao vùng trừ `top` của lưới (tối thiểu `MIN_CHILD` 20px) và được ghi vào `height` của lưới (xem **Grid** bên dưới). Lưới đã có `height` thì đi theo khi đang chạm hoặc vượt mép dưới của vùng. Lưới cao theo số dòng thì đi theo khi không control nào cùng vùng, cùng tab bắt đầu thấp hơn nó trong cùng dải ngang (`isLowest`: control nằm bên cạnh không tính); lưới thuộc một tab page thì tab page đó cũng phải chạm mép dưới của vùng (`tabPageOf`). Trong lúc kéo, lưới đã hiện theo chiều cao mới (`controlGrid.applyHeight`); trong cùng một thao tác mà chiều cao vùng trở về như lúc đầu thì lưới trở về như trước thao tác và không có bước Undo nào. Kéo thanh đứng (hai vùng trái / phải) không đổi chiều cao vùng nên không đổi chiều cao lưới. Trước ngày 2026-11-25 lưới không có `height` nên bị bỏ qua: vùng nhỏ lại thì lưới bị vùng cắt, vùng lớn lên thì dưới lưới còn khoảng trống. Kịch bản `splittergrid` (hai lưới, kéo thanh hai chiều, kéo hết cỡ rồi kéo lại, kéo giãn khối, đổi hướng) và `splittergridtab` (lưới có control bên dưới, lưới trong tab đang mở và tab không mở, tab page chưa chạm mép) kiểm tra.
- **Lưới ESS theo chiều cao vùng** (người dùng đồng ý ngày 2026-11-26): lưới ESS có chiều cao riêng mà mép dưới chạm mép dưới của vùng (bám mép dưới) đi theo chiều cao vùng như lưới Core (`docksHeight`). Lưới ESS khác (cao theo số dòng, hoặc chiều cao riêng chưa chạm mép dưới) không kéo dài theo vùng; chỉ khi vùng thấp lại tới mức mép dưới của lưới lọt khỏi vùng thì lưới thu lại vừa tới mép dưới bằng chiều cao riêng, nhờ vậy tay nắm mép dưới luôn nằm trong vùng. Chiều cao đang vẽ của các lưới này được đo một lần lúc bắt đầu thao tác (`drawnHeight` trong `snapshot`); trong cùng thao tác mà vùng cao trở lại quá mép dưới cũ của lưới thì lưới trở về như trước thao tác. Sau thao tác, lưới đã thu lại chạm mép dưới nên từ thao tác sau đi theo vùng như lưới bám mép dưới. Cấu hình chiều cao của hai loại lưới đổi qua cùng một hàm, `setGridHeight` gọi `setOwnHeight` và `applyHeight` của module lưới (lưới Core: `height`; lưới ESS: `height` cùng `ownHeight`). Kịch bản `splitteressheight` kiểm tra. Đo ngày 2026-11-26 trên harness, Splitter 1200×900 có 300 ô nhập ở vùng trên và 10 lưới ESS ở vùng dưới, kéo thanh cho vùng dưới thấp dần rồi cao lại (50 lần di chuột): lúc bắt đầu 1,9–4,7ms (bản trước 0,2–0,7ms), mỗi lần di chuột trung vị 3,8–4,8ms, tối đa 9,2ms (bản trước 1,5ms, tối đa 3,6ms, vì khi đó lưới không đổi cỡ mà lọt khỏi vùng); lúc nhả chuột 388–403ms vì dựng lại cả thiết kế 311 control như khi lưới Core đổi cỡ (bản trước 1ms vì không control nào đổi cỡ); nhân bản 300 ô nhập cùng 2 lưới ESS trong vùng 705–707ms, bản trước 694–706ms.
- **Lưới tới một vùng** (`fit`, `lift`, `land`; người dùng quy định ngày 2026-11-25 cho lưới Core, ngày 2026-11-26 cho lưới ESS): lưới lấp vùng ngay khi tới, không chờ vùng đổi cỡ. `fit(child, controls)` chỉ sửa cấu hình: lưới rộng quá mép phải của vùng thì thu lại cho vừa tới mép phải, mép trái giữ nguyên (tối thiểu `MIN_WIDTH` của loại lưới: `controlGrid.MIN_WIDTH` 200px, `controlGridEss.MIN_WIDTH` 300px, bằng mức nhỏ nhất khi kéo giãn lưới ESS bằng tay; chỗ còn lại hẹp hơn mức này thì vùng cắt phần thừa); lưới đủ điều kiện `docksHeight` thì cao khít mép dưới của vùng. Lưới ESS có mép dưới lọt khỏi vùng (`overflowsPane`: chiều cao đang vẽ, theo số dòng hoặc chiều cao riêng, lớn hơn chỗ còn lại của vùng) thì thu lại vừa tới mép dưới bằng chiều cao riêng; lưới ESS thấp hơn chỗ còn lại giữ nguyên, không kéo dài như lưới Core (người dùng đồng ý ngày 2026-11-26). Chiều cao theo số dòng của lưới ESS phải đo trên canvas (`controlGridEss.naturalHeight`; lưới đang vẽ theo chiều cao riêng thì tạm bỏ để đo), vì số ước tính lệch nhiều (bộ chụp ước tính 252px cho lưới mặc định, lưới vẽ ra cao 323px); lưới chưa vẽ hoặc đang ẩn trong tab không mở thì chưa đo được và chưa thu. Khung lưới ESS hẹp lại thì các cột co tới vừa chữ rồi phần còn lại của bảng cuộn ngang trong lưới, như khi kéo hẹp bằng tay (cách bảng ESS chia cột không đổi; ví dụ trong vùng 477px các cột mặc định còn 25, 78, 123, 82, 56, 97px). Bề rộng đặt cho cột (ô "Rộng" của cột, kéo mép cột) chỉ là bề rộng mong muốn; người dùng quyết định ngày 2026-11-26 giữ cách chia cột này, không chuyển sang vẽ đúng bề rộng đã đặt (khi đó bảng hẹp sẽ cuộn ngang và chỉ thấy vài cột đầu). `gridModule(cfg)` trả module của loại lưới (`controlGrid`, `controlGridEss`), nơi có `MIN_WIDTH`, `hasOwnHeight`, `setOwnHeight`, `applyHeight` và `applySize`; control khác không đi qua `fit`. Các đường tới vùng: thả từ Toolbox (`builder.addControl`; lưới mới còn bề rộng mặc định nên rộng luôn tới mép phải của vùng), kéo một hoặc nhiều control (`finishControlDrag`, `dropDraggedControls`), phím mũi tên (`moveSelectionBy`), và mọi lần chèn qua `builderSnippet.instantiate` (dán control, nhân bản, màn hình chuẩn, mẫu team, màn hình chụp từ HRM, kết quả tách ảnh; `fit` chạy trước khi vẽ, rồi `land` chạy cho từng control đã vẽ để đo chiều cao lưới ESS). Trước khi một lưới rời chỗ cũ, `lift` nhớ nó đang chạm mép phải và đang bám mép dưới của vùng (chiều cao riêng chạm mép dưới) hay không (`builder.liftForDrag` và `moveSelectionBy` gọi). `land` chạy sau khi mọi control của thao tác đã ở chỗ mới: lưới đang chạm mép phải thì lại rộng tới mép phải của vùng mới; lưới đang bám mép dưới thì bỏ chiều cao riêng cũ rồi tính lại theo chỗ mới (lưới ESS vừa bám mép dưới được tính như lưới Core cao theo số dòng: là control dưới cùng thì bám mép dưới của vùng mới), nên ra ngoài Splitter hoặc nằm trên một control khác thì lưới trở về chiều cao theo số dòng. Lưới ESS bỏ chiều cao riêng thì `height` thành chiều cao theo số dòng đo được, để chiều cao ước tính trong cấu hình đúng với lưới đang vẽ. Lưới có `height` do người thiết kế gõ mà chưa chạm mép dưới thì giữ nguyên khi dời. `land` vẽ lại bằng `applySize` của loại lưới (không ghi lịch sử; lưới Core cập nhật ô Rộng lưới / Cao lưới đang mở, lưới ESS không có ô bề rộng), nên cả thao tác vẫn là một bước Undo. Mở thiết kế đã lưu và Undo / Redo không đi qua `fit`: thiết kế đã lưu có lưới rộng hơn vùng giữ nguyên cho tới khi lưới được dời. Chưa áp dụng cho lệnh căn hàng / dàn đều và cho lưới là con của group box hoặc Section nằm trong vùng. Đo ngày 2026-11-25 trên Splitter có 300 ô nhập và một lưới: `lift` + `land` 0,37ms mỗi lần dời lưới, `fit` cho 301 control được dán 0,07ms. Kịch bản `splitterfill` (lưới Core) và `splitteressgrid` (lưới ESS: thả, kéo thanh, phím mũi tên, sang vùng kia, nhân bản, kéo ra canvas, kéo giãn tay tới 300px, dời lưới không chạm mép, chỗ còn lại hẹp hơn 300px) kiểm tra; chạy với bản trước ngày 2026-11-26, `splitteressgrid` sai 10 trên 13 kiểm tra, và bước kéo giãn bằng tay không làm được vì tay nắm của lưới nằm ngoài vùng.
- **Kéo giãn lưới trong vùng** (người dùng yêu cầu ngày 2026-11-26): tay nắm của lưới Core và lưới ESS dùng `controlSplitter.resizeLimits(minWidth, minHeight)`, một danh sách modifier của interact.js: `restrictSize` giữ mức nhỏ nhất của loại lưới (đổi sang pixel trên màn hình theo `builder.cssScale()`), rồi `restrictEdges({ outer: ".core-splitter-pane" })` cho mép phải và mép dưới dừng ở mép của vùng gần nhất chứa lưới, nên tay nắm không bị vùng che mất. Modifier áp theo thứ tự nên mép vùng thắng mức nhỏ nhất: lưới Core bám đáy vùng cao 147px của Splitter mặc định (chia trên / dưới) cao 137px, kéo tay nắm mép dưới lên thì lưới vẫn cao 137px, không nhảy lên 200px rồi lọt khỏi vùng. Lưới không nằm trong vùng nào chỉ bị giới hạn bởi mức nhỏ nhất. Vùng còn ít chỗ hơn mức nhỏ nhất thì lưới chỉ có đúng một cỡ (vd lưới ESS trong vùng 147px: mức nhỏ nhất 150px, vùng cho 137px), kéo tay nắm không đổi gì. Lưới vẫn có thể cao hoặc rộng hơn chỗ còn lại của vùng trong vài trường hợp: chiều cao lưới Core gõ ở ô Cao lưới lớn hơn vùng, lưới ESS 300px trong chỗ hẹp hơn 300px, lưới ESS ẩn trong tab không mở lúc tới vùng, thiết kế đã lưu có lưới bị vùng cắt (mở thiết kế không đi qua `fit`). Khi đó mép bị vùng che và tay nắm ở mép đó không với tới được; tay nắm ở mép còn lại vẫn dùng được. Lưới ESS cao theo số dòng trong vùng thấp không còn bị che vì đã thu lại khi tới vùng (xem **Lưới tới một vùng**). Kịch bản `gridresize` kiểm tra.
- Đo ngày 2026-11-25 trên thiết kế 280 control (màn hình `core-timesheet-policy` thêm một Splitter chứa tab page và lưới): ghi lúc bắt đầu 0,1ms, mỗi lần di chuột 0,5ms, lúc nhả chuột 214ms vì dựng lại cả thiết kế (một lần dựng lại như Undo mất 207ms); `builder.containerAt` 0,2ms mỗi lần với 37 phần nội dung của khối chứa. Đo lại cùng ngày sau khi thêm quy tắc của lưới, trên một Splitter có 300 ô nhập: ghi lúc bắt đầu 0,02ms và mỗi lần di chuột 0,3ms; thêm 10 lưới cùng đổi chiều cao: 0,06ms và 1,6ms.

Vùng của Splitter tạo ngữ cảnh xếp lớp riêng (`position: relative; z-index: 1`, giống content của group box và Section); thiếu nó thì tay nắm đổi cỡ của control con (z-index 1001) nằm đè lên tay nắm của chính Splitter (1000) và kéo góc Splitter lại thành kéo giãn control con (kịch bản `splittercorner`).

Splitter là control trình bày: không có caption, không có Bắt buộc và giá trị mặc định, menu chuột phải không có **Đổi loại control**, và không thành dòng của bảng mô tả field của SRS trừ khi chọn liệt kê tất cả (`LAYOUT_ONLY` trong `builder-spec.js`); field nằm trong hai vùng thì vẫn được liệt kê (mục 15.7). Splitter không nhận control đang nằm đè lên nó làm con khi bị kéo (`adoptControlsIntoGroup` chỉ áp cho group box, Section và ESS section): control chỉ thành con khi được thả hoặc thêm vào một vùng, giống popup. Menu **Tự xếp control bên trong** không có ở Splitter (bộ tự xếp chỉ biết khối có một phần nội dung).

Thiết kế và dữ liệu chụp tạo ngày 2026-11-25 lúc Splitter còn là một thanh (khối 600×6 không có `splitRatio`; node `splitter` không có `split`, `children`) vẫn mở được: chúng hiện thành một khối mỏng trông như thanh cũ, kéo giãn ra là có hai vùng. Dấu trang kéo từ bản đó phải kéo lại để chụp được khối hai vùng.

CSS: `.page-field-splitter`, `.core-splitter`, `.core-splitter-h` / `-v`, `.core-splitter-pane`, `.core-splitter-bar`, `.core-splitter-grip`, `.core-splitter-move`, `.core-splitter-hover` trong `builder.css`. Kịch bản `splitter`, `splitternest`, `splittercorner`, `splittergrid`, `splittergridtab`, `splitterfill`, `splitteressgrid`, `splittermove`, `gridresize` và `splitteressheight` kiểm tra.

Field tự vẽ (`tree`, `splitter`) đăng ký ở `SELF_DRAWN` của `control-field.js` và được tra bằng `selfDrawnModule(ftype)`. Module của field tự vẽ cung cấp `ensure(cfg)` (điền giá trị mặc định), `build(cfg)` (dựng phần tử), `propertiesHtml(cfg)` và `bindProperties(cfg)` (mục riêng trong phần thuộc tính, dựng bằng `builderProps` theo mục 15.11). Module có thể khai báo thêm `dragIgnore` (selector của những phần không dùng để kéo cả control) và các hook `beginResize(cfg)`, `resizing(cfg)`, `endResize(cfg)`; `control-field.js` gọi các hook này qua `drawnHook` khi control đổi kích thước bằng tay nắm hoặc bằng ô Rộng / Cao. Thêm loại tự vẽ mới thì thêm module và một dòng đăng ký; không thêm nhánh `ftype === "..."` rải trong `control-field.js`.

**Image**: ảnh dán, thả hoặc chọn từ tệp vào ô ảnh còn mặc định thì control lấy đúng kích thước gốc của ảnh (`setFieldImage`); ô đã được đổi cỡ hoặc đã có ảnh thì giữ kích thước. Ảnh dán khi không chọn ô ảnh nào được đặt ở góc trên trái của vùng đang nhìn thấy. Bấm vào ô ảnh trống mở hộp chọn tệp.

**Grid** (`grid` DevExtreme, `ess-grid`): một control. Kéo vào popup, group box, section, ESS section như mọi control khác; menu “Đưa vào Popup / ESS Section…” (`builder.moveGridToContainer`) cũng đi qua `builder.setControlParent`. Ba tay nắm `.ub-resize-right`, `.ub-resize-bottom`, `.ub-resize-corner` như popup, tab page, ESS section (người dùng yêu cầu ngày 2026-11-26; trước đó lưới chỉ có tay nắm mép phải, lưới ESS dùng tay nắm riêng `.ess-grid-resize-handle` đã bỏ): mép phải đổi chiều rộng, mép dưới đổi chiều cao, góc đổi cả hai. Mức nhỏ nhất khi kéo: lưới Core 200 × 200px (`controlGrid.MIN_WIDTH`, `MIN_HEIGHT`; ở 200px các dải phía trên và tiêu đề cột của lưới mặc định còn nguyên, phần dòng thu lại và tự cuộn), lưới ESS 300 × 150px (`MIN_WIDTH`, `MIN_HEIGHT` trong `control-grid-ess.js`, bằng mức nhỏ nhất của tab page; còn thấy dải tiêu đề, tiêu đề cột và một dòng). Lưới nằm trong vùng của Splitter: xem **Kéo giãn lưới trong vùng** ở mục Splitter.

Chiều cao của grid Core: mặc định lưới cao theo số dòng mẫu (cấu hình không có `height`). Ô **Cao lưới (px)** ở mục Kích thước ghi `height` (số nguyên dương): khung lưới giữ đúng chiều cao đó, các dải phía trên (ô tìm kiếm, View Data, tiêu đề) giữ cỡ, phần `dxDataGrid` (`.grid-dx-body`) lấp chỗ còn lại và tự cuộn khi dòng nhiều hơn chỗ. Cách vẽ nằm ở một chỗ: `controlGrid.hasOwnHeight`, `dxHeight` (`"100%"` hoặc `null` cho tùy chọn `height` của `dxDataGrid`) và `applyHeight` (class `grid-fixed-height` và chiều cao của khung), dùng lúc dựng lưới, lúc đổi thuộc tính (`refreshGrid`) và lúc Splitter đổi chiều cao lưới; `applySize` áp bề rộng và chiều cao trong cấu hình lên lưới đang vẽ mà không ghi lịch sử, rồi cập nhật hai ô Rộng lưới / Cao lưới nếu phần Thuộc tính đang mở cho lưới đó (dùng khi lưới tới một vùng của Splitter); CSS `.canvas-control.grid-fixed-height` trong `builder.css`. Để trống ô thì bỏ `height` và lưới cao theo số dòng như cũ; số 0, số âm, số làm tròn về 0 và chữ không phải số bị bỏ qua, ô hiện lại giá trị đang có; không có mức trần. Khung lưới (viền và đệm) cao 22px, nên `height` nhỏ hơn 22 vẫn vẽ cao 22px; lưới thấp hơn phần tiêu đề cột và dòng lọc thì các phần đó bị cắt ở mép dưới khung. Lưới nằm trong vùng của Splitter tự nhận `height` khi tới vùng và khi chiều cao vùng đổi (xem **Splitter**); kéo lưới đang bám mép dưới của vùng ra khỏi Splitter thì `height` đó bị bỏ và lưới lại cao theo số dòng. Kéo tay nắm mép dưới (hoặc góc) ghi `height` như gõ vào ô và ô hiện số mới. Kịch bản `gridheight` (ô Cao lưới) và `gridresize` (tay nắm) kiểm tra.

Chiều cao của grid ESS: mặc định lưới cao theo số dòng; `height` có sẵn trong cấu hình (260 ở lưới mới, số ước tính của bộ chụp từ HRM và bộ đọc draw.io) chỉ là chiều cao ước tính, không dùng để vẽ. Kéo tay nắm mép dưới (hoặc góc) thì lưới có chiều cao riêng: `height` mới cùng cờ `ownHeight: true`; khung lưới giữ đúng chiều cao đó, dải tiêu đề giữ cỡ, bảng (`.ess-grid-table-wrapper`) lấp chỗ còn lại và tự cuộn (cùng class `grid-fixed-height` và cùng quy tắc trong `builder.css` với lưới Core). Nhờ cờ riêng, thiết kế đã lưu không đổi: lưới chưa kéo vẫn cao theo số dòng như trước. Cách vẽ ở `hasOwnHeight`, `applyHeight`, `applySize` của `control-grid-ess.js`, dùng lúc dựng lưới và lúc kéo; `setOwnHeight` đặt hoặc bỏ chiều cao riêng; khi bỏ, `height` thành chiều cao ước tính được truyền vào (Splitter dùng cách này để trả lưới về như lúc bắt đầu thao tác mà không đo lại); không truyền thì thành chiều cao theo số dòng do `naturalHeight` đo trên canvas. Trong vùng của Splitter, lưới ESS cao hơn chỗ còn lại của vùng tự thu lại bằng chiều cao riêng, và lưới bám mép dưới đi theo chiều cao vùng (xem **Splitter**). Lưới ESS chưa có ô nhập chiều cao trong phần Thuộc tính; muốn lưới cao theo số dòng trở lại thì Undo, hoặc dời lưới đang bám mép dưới ra khỏi Splitter. Kịch bản `gridresize` và `splitteressheight` kiểm tra.

Grid Core bật sửa dòng của DevExtreme (`editing.mode = "row"`) để sửa dữ liệu mẫu qua biểu tượng bút chì và dấu X. Cột lệnh mà DevExtreme tự thêm ở cuối lưới (chữ `Edit` `Delete`) được khai báo tường minh là cột `type: "buttons"` tên `baRowCommands` và **mặc định ẩn** (`controlGrid.buildDxColumns`), vì màn hình HRM không có cột này và BA không cần nó khi chụp. Cột chỉ hiện trong lúc một dòng đang được sửa hoặc thêm mới để có `Save` / `Cancel` (`onEditingStart`, `onInitNewRow` bật; `onSaved`, `onEditCanceled` tắt, qua `controlGrid.showRowCommands`); Enter lưu và Escape hủy vẫn dùng được.

CSS của Builder không đặt `pointer-events` cho phần tử bên trong lưới DevExtreme (chỉ giữ `user-select: text` trong `builder.css`). DevExtreme tự đặt `pointer-events: none` cho các lớp phủ của nó, ví dụ khung focus `.dx-datagrid-focus-overlay` nằm đè lên ô đang sửa và chữ gợi ý `.dx-placeholder`, để chuột đi xuyên tới ô nhập bên dưới. Quy tắc cũ ép `pointer-events: auto` cho mọi phần tử con của lưới làm khung focus nhận hết chuột: ô đang sửa mất focus ở lần bấm thứ hai, không bấm đúp chọn từ, không kéo bôi đen và phím gõ không vào ô. Kịch bản `gridcelledit` kiểm tra các thao tác này.

Ô **Dòng lọc** của grid Core (`filterRow`) bật / tắt cùng lúc dòng lọc và biểu tượng lọc trên tiêu đề cột (`headerFilter.visible` lấy theo `filterRow` trong `control-grid.js`, cả lúc dựng lưới và lúc đổi thuộc tính); canvas và hộp Xem trước dùng chung cách vẽ nên giống nhau. Trước đây tắt dòng lọc thì biểu tượng lọc vẫn còn trên từng cột.

Cột của grid Core có kiểu hiển thị (`column.type`, ô **Display** trong thẻ cột): để trống là chữ thường; `tag` vẽ nhãn trạng thái có màu (`column.tags = [{ text, backColor, textColor }]`, sửa trong ô **Tags**, mỗi dòng `Text|#màu`); `checkbox` vẽ ô chọn. Giá trị mẫu không khớp tag nào thì các dòng lần lượt dùng từng tag trong danh sách (`controlGrid.tagFor`); cột checkbox không có giá trị đúng / sai thì dòng chẵn lẻ xen kẽ. CSS: `.grid-cell-tag`, `.grid-cell-check` trong `builder.css`. Grid ESS dùng kiểu cột `tag` sẵn có (`tagText`, `tagBackColor`, `tagTextColor`).

Memo Core luôn vẽ 3 dòng; khi `height` của field nhỏ hơn thì ô nhập được giới hạn theo `height` (`max-height`) để không đè lên control bên dưới.

**ESS section** (`collapsible-section`): mở/đóng. Là khối chứa như group box: con nằm trong `.ess-collapsible-content` và đi theo qua DOM, không cộng delta cho con. Thu gọn rồi kéo thì con vẫn giữ tọa độ theo cha.

**Field** (`type: field`): text, memo, number, numberic-test, date, combo, multiselect, checkbox, radio, button, label, language, tag, progress, image, tree, splitter, groupbox, section. `labelWidth` chia chỗ caption. `applyLayout` bỏ qua group, section, language. Label in đậm / nghiêng theo `captionBold` / `captionItalic` (áp lên chữ của label). Field ESS: ô nhập, ô chọn (combobox) và ô ngày cao bằng `height − 8`; caption canh giữa theo chiều dọc, riêng memo canh trên; checkbox / radio ESS đặt chữ sát ô chọn.

Ô ngày (`ftype: "date"`): giá trị mặc định là chữ tự do, control hiện đúng chuỗi BA gõ (`16/11/2026`, `2026-11-16`, `dd/MM/yyyy`…), không kiểm tra và không đổi định dạng; để trống thì ô trống. Date Core là ô chữ có biểu tượng lịch ở mép phải (`.core-date` > `.core-date-input` + `.core-date-button`, kiểu trong `builder-core.css`), cùng kích thước với ô Text Core. Trước đây Date Core dùng `input type="date"` của trình duyệt, chỉ nhận giá trị dạng `yyyy-MM-dd` (chuỗi khác bị bỏ, ô để trống) và luôn hiện theo định dạng của trình duyệt (`mm/dd/yyyy`). Date ESS là nhóm flex gồm ô chữ và ô lịch (`.ess-date`); `applyEssInnerHeight` chỉ đặt chiều cao cho nhóm và ô chữ, ô lịch tự giãn theo nhóm nên luôn cao bằng ô chữ. Kịch bản `datefields` kiểm tra cả hai.

Multi-select Dropdown (`ftype: "multiselect"`): mỗi mục có khóa chọn (`multiSelectItemValue`: trường `value`, không có thì cột đầu) và nhãn (`multiSelectItemLabel`: trường `label`, không có thì cột thứ hai, rồi cột đầu). Chữ trên nút do một hàm `multiSelectText` quyết định: chưa chọn gì hiện `Select...`; có chọn thì hiện nhãn các mục đang chọn theo thứ tự trong danh sách, cách nhau bằng `; `; nếu mục có khóa `all` (không phân biệt hoa thường) đang được chọn thì chỉ hiện nhãn của mục đó. Khóa đã lưu mà không còn trong danh sách thì bỏ qua. Ô chọn ở tiêu đề bảng chọn hoặc bỏ mọi mục; chỉ ô chọn trong thân bảng mới thêm bớt từng khóa (trước đây ô ở tiêu đề còn ghi thêm một khóa thừa `on` vào `multiselectSelectedValues`). Kịch bản `multiselecttext` kiểm tra các trường hợp này.

Canh dọc nhãn và control của field, mỗi quy tắc ở đúng một nơi:

- Nhãn và control của field Core nằm trên cùng một dòng và canh giữa nhau (`vertical-align: middle` của `.page-field-caption` / `.page-field-editor` trong `Builder.aspx`). Chỉ field có ô nhiều dòng (memo, nhận bằng `:has(> .page-field-editor > textarea)` trong `builder-core.css`) mới canh nhãn lên dòng đầu. Control vẫn bám mép trên của field như trước; nhãn dài xuống dòng thì cả khối nhãn canh giữa control.
- Ô chọn của checkbox / radio (Core và ESS) có bố cục riêng trong `Builder.aspx`: `.page-field-editor:has(> label)` cao bằng field, `label` bên trong là flex canh giữa, ô chọn và `label` không có lề. Nhờ vậy ô chọn nằm giữa chiều cao field và ngang hàng với nhãn, không phụ thuộc lề mặc định của Bootstrap 3 (`label { margin-bottom: 5px }`, `input[type=checkbox] { margin: 4px 0 0 }`) vốn được nạp vào trang chỉ để lấy Glyphicon.
- Quy tắc dành cho ô nhập chữ không áp lên ô chọn: `.page-field-editor input` (rộng 100%) trong `Builder.aspx` và `.page-field.ess-field .page-field-editor input` (cao tối thiểu 26px, viền, đệm) trong `builder-ess.css` đều loại `checkbox` / `radio` bằng `:where(:not(...))` để không đổi độ ưu tiên của quy tắc; `applyEssInnerHeight` không đặt chiều cao cho ô chọn (`TOGGLE_TYPES`). Trước đây ô chọn ESS bị kéo cao 26px và ô chọn Core bị kéo rộng theo chữ giá trị.

Kiểm thử: kịch bản `fieldalign` của `Tools/builder-harness` đo tâm chữ nhãn và tâm control của từng loại field (bật và tắt khung field, nhãn bên trái, nhãn hai dòng, ô chọn ESS, hộp Xem trước), sai lệch cho phép 1px.

## 11. Lưu và preview

`#txtJson` là bản đọc của `builder.controls`. Thiết kế lưu vào bảng `UiBuilderControl` (JSON, tên, dự án, cờ chia sẻ, ảnh thu nhỏ) qua `SaveDesign`; mở lại bằng `/Builder?controlId=<id>` (`hiddenControlId`). Preview dựng lớp gần runtime, không có nét đứt và tay nắm.

**Ai đọc và ghi được thiết kế** (kiểm tra ở server, `Pages/Builder.aspx.cs`):

- `LoadControl` đòi đăng nhập trước khi truy vấn và chỉ trả thiết kế của chính người gọi hoặc thiết kế public (`UiDesignCatalog.CanRead`). Thiết kế riêng của người khác trả `null`, giống hệt một id không tồn tại, để người gọi không dò được id nào có thật. Trước ngày 2026-11-25 người đã đăng nhập đoán id là đọc được thiết kế riêng của người khác.
- `SaveControl` kiểm chủ sở hữu (`UiDesignCatalog.Owns`) trước khi ghi ảnh thu nhỏ `design-<id>.png`; trước đó file ảnh của thiết kế người khác bị ghi đè rồi câu `UPDATE` mới từ chối. `UiDesignVersions` dùng cùng hàm `Owns` này.
- `LoadConfig` (bản JSON tạm, đường cũ từ thời tool một người dùng; trang Builder mới gọi lúc mở) đòi đăng nhập và đọc file riêng của người đang đăng nhập: `App_Data/BuilderScratch/design-<userId>.json` (`Helpers/UiDesignScratch.cs`). Trước ngày 2026-11-25 nó cùng `SaveConfig`, `Pages/Preview.aspx`, `Pages/WordExport.aspx` dùng chung một file `Output/generated-config.json` nằm trong vùng web phục vụ file tĩnh, ghi và đọc không cần đăng nhập. Ngày 2026-11-26 đã xóa `SaveConfig`, hai trang cũ, các lớp chỉ hai trang đó dùng (`Common/UiBuilderModels.cs`) và các hàm JS không còn nút gọi (`saveConfig`, `exportWord`, bản `showPreview` mở `Preview.aspx` vốn bị bản xem trước trong trang ghi đè); `UiDesignScratch.Write` nay chỉ còn test dùng. Bỏ hẳn `LoadConfig` thì phải viết lại cách khởi động Builder (`builder-review.js`, `builder-templates.js` chờ `ajaxComplete` của nó), nên để thành việc riêng.

Đã kiểm ngày 2026-11-25 trên site local. Không đăng nhập: `LoadConfig`, `LoadControl`, `SaveConfig` trả 500, hai trang cũ chuyển về trang đăng nhập. Đã đăng nhập bằng một tài khoản: thiết kế riêng của mình nạp được (8 control, mở trong Builder vẽ đủ 8), thiết kế public của người khác nạp được và không kèm `ProjectId`, id không tồn tại trả `null`, danh sách thiết kế không có thiết kế riêng của người khác, trang Builder mới mở trống, `SaveConfig` rồi `LoadConfig` trả đúng nội dung và ghi đúng một file `design-<userId>.json`, lưu vào một id không tồn tại kèm ảnh thu nhỏ bị từ chối và không file ảnh nào được ghi, hai trang cũ trả 200. Chưa kiểm trên site: người khác mở thiết kế riêng của mình nhận `null` (cần tài khoản thứ hai; phần này mới có unit test của `CanRead`). Ngày 2026-11-26, sau khi xóa: `/Pages/Preview.aspx`, `/Pages/WordExport.aspx`, `/Preview`, `/WordExport` trả 404, `SaveConfig` không còn; trang Builder mới gọi `LoadConfig` nhận 200, 0 lỗi JavaScript.

**Khi lưu bị từ chối.** Site thay thân của mọi câu trả lời 500 bằng trang lỗi chung (`httpErrors existingResponse="Replace"` trong `Web.config`), nên `SaveDesign` và `SaveControl` không ném lỗi khi từ chối mà trả `{ success: false, message }` theo mẫu của `CreateProject`, `UpdateProject`: dự án không thuộc về người gọi → “Dự án không tồn tại hoặc không thuộc về bạn.”; thiết kế không phải của mình hoặc id không tồn tại → “Không có quyền update control này.”; lưu được → `{ success: true, controlId }`. Builder hiện đúng câu đó: lưu thiết kế → “Chưa lưu được thiết kế. <câu báo>” (nút Lưu bật lại, thiết kế vẫn tính là chưa lưu nếu có thay đổi); lưu control → “Lỗi khi lưu control: <câu báo>”; lưu component (`builder-snippet.js`) → “Lỗi lưu component: <câu báo>”. Lỗi mạng hoặc lỗi máy chủ thật đọc qua `builder.ajaxErrorText(xhr)` (“Máy chủ không phản hồi (mã N).”; mã 401 nhắc đăng nhập lại), không bao giờ in HTML của trang lỗi. Trước ngày 2026-11-26 hai hàm ném lỗi nên toast hiện cả mã HTML của trang lỗi. Kịch bản harness `saveerrors` kiểm các đường này. Đã kiểm ngày 2026-11-26 trên site local: id không tồn tại → 200 kèm câu báo và không file ảnh `Content/design-thumbs/design-<id>.png` nào được ghi; dự án không tồn tại → câu báo dự án; mở một thiết kế TEST của mình, xóa nó bằng hàm xóa của trang Home (`DeleteDesign`) rồi bấm Ctrl+S → toast “Chưa lưu được thiết kế. Không có quyền update control này.”, không có HTML, 0 lỗi JavaScript.

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

Thứ tự lấy từ vị trí hiện tại của control: thả vào giữa thì nằm giữa, cắt/xóa thì khoảng trống khép lại, khối đổi cao thì khối anh em bên dưới dịch theo. Dữ liệu vẫn là `left/top/width/height`, nên lưu và preview không đổi. Layout chạy trong `builder.refreshJson` (bọc lại), nên Undo vẫn một bước. Chiều cao khối = inset trên + đáy ô cuối + pad + inset dưới (đo từ DOM, không dùng chiều cao content vì content có `min-height`).

**Cắt ảnh** (`slice-image`): vẽ khung cắt / khung che trên ảnh, ra nhiều ESS Image.

**Nhận dạng cấu trúc** (`import-structure`, `builderImport.build`): quét màu và khoảng trắng trên canvas, không cần mạng. Thanh màu ngang khổ (đậm hoặc xám nhạt) mở một section. Phần còn lại cắt kiểu XY-cut đệ quy (cắt ngang theo dòng trống, cắt dọc theo cột trống); các cột nhiều dòng thẳng hàng (nhãn | ô nhập | nhãn | ô nhập) được gom lại thành từng hàng để mỗi nhãn đi cùng ô nhập của nó. Kết quả là các group box **trần** lồng nhau (`cfg.bare = true`: không viền, không tiêu đề; CSS `.page-field-groupbox-bare` trong `Builder.aspx`, class gắn ở `control-field.js`), mỗi khối bật tự xếp `rows`, lá là lát ảnh ESS Image. Nét kẻ mảnh và chấm vụn bị bỏ.

Chữ được đọc bằng Tesseract chạy ngay trong trình duyệt (`Scripts/vendor/tesseract`), loại control đoán từ điểm ảnh (`imp.classify`, `boxKind`). Ô không đoán được vẫn là lát ảnh. Menu chuột phải có hai cách sửa nhanh sau khi nhận dạng: **Thay ảnh bằng control** (lát ảnh thành control cùng vị trí, cùng cỡ) và **Đổi loại control** (mục 9).

Quy tắc đoán loại cho màn hình Core:

- Ô có mũi tên bên phải là combobox. Ô có **hai** mũi tên xếp dọc (nút tăng / giảm) là Numeric.
- Ô có giá trị dạng ngày (`14-11-2026`, `2026/11/14`…) là Date. Ô combobox trống có nhãn kết thúc bằng “Date” / “ngày” hoặc bắt đầu bằng “Date of”, “Ngày”, “Từ ngày”, “Đến ngày” (`DATE_CAPTION`) cũng là Date, vì ô ngày của HRM Core nhìn giống hệt combobox.
- Popup: dải công cụ ngay dưới tiêu đề được tìm trong 12px đầu, bỏ qua dải đệm mỏng phía trên nó (`findPopup`); chữ Save / Cancel… thành Toolbar menu của popup. Phần thân popup đi qua `imp.makePage` nên lưới bên trong popup cũng được nhận ra; lưới trong popup không có vùng “kéo cột để nhóm”.

Giới hạn: ô nhập có biểu tượng ở mép phải (ví dụ nút dịch) dễ bị nhận nhầm là combobox hoặc Numeric; cặp nút “…” và “Clear” nằm sát nhau có thể thành một combobox; thanh công cụ đầu trang (không phải popup) có thể thành section; hàng bị đẩy quá rộng thì tràn ra ngoài khung (rows chưa tự xuống dòng); nếu Preview có CSS riêng thì cần thêm rule `.page-field-groupbox-bare` tương tự.

**Tìm lưới trong ảnh** (`builderImport.findGrids`): hàng tiêu đề cột là dải nằm giữa hai đường ngang dài cách nhau 18–60px, có từ 3 đường phân cột dọc. Dải nền trắng (trùng nền trang) chỉ được nhận khi dải ngay bên dưới giữ đúng các đường phân cột đó (`tableLike`). Dải có màu nền nhưng không thẳng cột với dải dưới (ví dụ dải tên lưới và nút Add / Delete) bị bỏ qua nếu dải ngay dưới nó mới là hàng tiêu đề thật. Nhờ vậy lưới của HRM có tiêu đề nền trắng được nhận ra cả khi có và không có dòng lọc. Lưới **chưa có dòng dữ liệu** (chỉ một đường kẻ dưới hàng tiêu đề) được nhận khi ngay phía trên hàng tiêu đề có dải tên lưới có màu nền (`titleBandAbove`). Lưới dựng ra có số dòng mẫu bằng số dòng thấy trong ảnh (1–5, `sampleData`); nếu lưới trong Builder vẫn cao hơn vùng của nó trong ảnh thì mọi thứ nằm bên dưới được đẩy xuống, khối chứa lưới và popup chứa nó được nới cao (`settleGrids`, `gridRenderHeight`; chi tiết ở đoạn **Lưới và khối chứa** bên dưới). Ô tiêu đề đầu tiên chỉ chứa một ô vuông nhỏ là cột chọn dòng, kể cả khi ô đó rộng (`squareOnly`). Còn hạn chế ở chế độ Core: nút khác Add / Delete trên dải tên lưới không được đọc; vùng sát dưới lưới (khoảng 64px) bị xóa cùng lưới nên control nằm trong vùng đó có thể mất; cột trạng thái dạng tag và cột checkbox chỉ thành cột chữ thường. Với màn hình đang chạy trong HRM, dùng “Chụp từ HRM” (mục 13) cho kết quả chính xác hơn nhận dạng từ ảnh.

**Trang Core làm theo giao diện ESS** (lệnh **Nhận dạng thành control ESS…**), ví dụ Tax Deductions & Allowances, 13th month payment:

- Bảng không có đường phân cột dọc (`findGrids`, lượt thứ hai, `plain: true`): hai đường ngang dài cùng bề ngang làm hàng tiêu đề, theo sau là các đường kẻ dòng cách đều. Đường kẻ của vùng khác nằm cạnh (thẻ tổng bên phải) được bỏ qua khi dò dòng (`nextOver`). Dải có màu nền nằm ngay trên hàng tiêu đề thật (dải công cụ) không bị nhận nhầm làm tiêu đề. Bảng **rỗng** chỉ có hàng tiêu đề được nhận khi dải tiêu đề có màu nền và có từ 3 cụm chữ màu trung tính (`captionBand`); màu đo bằng **trung bình** các điểm chữ vì chữ khử răng cưa ClearType có viền màu ở từng điểm ảnh. Bảng 1–2 dòng cần từ 2 cụm chữ trên tiêu đề; ở chế độ Core lượt này chỉ nhận bảng từ 3 dòng và 3 cụm chữ; vùng đã có lưới của lượt đầu thì bỏ qua.
- Tên cột của bảng loại này đọc bằng một lần OCR cả dải tiêu đề rồi gom chữ theo khoảng trống (`plainColumns`); phần trống đầu dòng là cột xem chi tiết (biểu tượng màu) hoặc cột chọn dòng (ô vuông ở dòng dữ liệu hay ở tiêu đề).
- Vùng bị xóa quanh bảng loại này chỉ rộng bằng bảng và chỉ kéo xuống dưới khi đọc thấy thanh phân trang (`Previous`, `Next`, `Showing`, `Page 1`, `1 of 5`), nên tiêu đề khối, nút, ô tìm kiếm và thẻ nằm cạnh bảng không bị mất.
- Dải công cụ có màu nền nằm ngay trên lưới (`tableBand`, `bandParts`, `bandControls`): chữ đứng đầu không có biểu tượng thành Label (tên lưới), các cụm “biểu tượng màu + chữ” thành một Toolbar (biểu tượng chọn theo chữ, `MENU_ICONS`), hộp nền khác màu dải (nút Filter) thành Button. Dải chỉ có Add / Delete vẫn đi theo cách cũ (tên lưới và nút Add của ESS grid).
- Lưới ESS dựng ở chế độ xem; chỉ khi dòng đầu có từ 2 ô nhập (rộng từ 30px) mới dựng ở chế độ sửa.
- Tab dạng viên thuốc ở đầu trang thành Tab page (`pillTabs`); hộp nhỏ tô màu đậm thành Tag; hộp viền màu hoặc chữ canh giữa thành Button; ô tròn nhỏ thành nút “…”.

Chế độ Core: hộp cao 22–34px có một cụm chữ canh giữa (không sát mép trái, không có mũi tên) là Button, ví dụ View Data; ảnh chỉ chụp riêng popup (dải tiêu đề chạy gần hết bề ngang ảnh) lấy đáy ảnh làm đáy popup (`findPopup`).

**Luồng chạy** (chế độ Core): `builderImport.runForSelection` → `imp.build` → `imp.makeAll` → popup thì `imp.popupFlow`, còn lại `imp.makePanes` → `imp.makePage` → `imp.runSections` → `imp.runInterior` / `imp.runPipeline` (`imp.alignFields(imp.compose(...))`) → `imp.commit`. `imp.commit` gọi `builderSnippet.instantiate` với vị trí của ảnh nguồn, nên control cấp trên cùng có `left` / `top` nhỏ nhất nằm đúng góc trên trái của ảnh.

**Ảnh chụp cả trang** (`imp.makePanes`), mỗi vùng được nhận dạng như một trang riêng rồi ghép lại theo vị trí (`makeRows`):

- Ảnh có cả menu của ứng dụng: chỉ nhận dạng khung nội dung (`imp.findContent`: mọi dải tên bắt đầu cách mép trái ảnh, phần bên trái chỉ có chữ và biểu tượng).
- Ảnh có thanh chia dọc (`imp.findSplit`: hai đường kẻ dọc cách nhau 3–12px, khe giữa trống): vùng trái, vùng phải và dải phía trên / dưới thanh chia được nhận dạng riêng. Hai vùng thành hai vùng của **một khối Splitter dọc** (mục 10, `splitterBlock`): khối rộng bằng vùng trái + thanh 6px + vùng phải, cao bằng phần cao hơn giữa khe trong ảnh và kết quả nhận dạng của hai vùng; control cấp trên cùng của mỗi vùng thành con của khối (`paneIndex` 0 / 1) với tọa độ tính theo vùng; `splitRatio` tính bằng `builderCapture.SPLIT.ratio`, nên vùng trái rộng đúng như trong ảnh. Khe có hay không có các chấm tay nắm đều được nhận là thanh chia (`emptyGap`); khối luôn có nút nắm như mọi Splitter mới (mục 10). Thanh chia nằm ngang chưa được dò từ ảnh; với màn hình đang chạy trong HRM thì “Chụp từ HRM” lấy được cả thanh ngang và thanh bị ẩn (mục 13.4). Kịch bản `imagesplitter` kiểm tra bằng ảnh tự vẽ.
- Ảnh có dải tab (`imp.findTabStrip`: hàng khối màu liền nhau, ngay dưới là gạch chân cùng màu tab đang mở): phần trên dải tab và phần nội dung tab được nhận dạng riêng, tên tab đọc bằng OCR, control cấp trên cùng của phần nội dung thuộc tab đang mở.

**Section, group box** (`imp.findBands`, `imp.findSections`, `imp.findFieldsets`, `imp.runSections`, `imp.runFieldsets`): dải tên có màu nền (cao 18–44px) mở một Section; khung viền mảnh có chữ đè lên cạnh trên là group box. Control con dùng gốc tọa độ của khối chứa trong Builder, lấy từ một bảng dùng chung với bộ chuyển đổi của Chụp từ HRM (`builderCapture.INSETS`: Section 5 / 36, group box 5 / 11, ESS Section 11 / 52, viền popup 2), không dùng số riêng trong `builder-import.js`. Trước đây con của Section lệch (+4, +1) và con của group box lệch (+4, +2) so với ảnh.

**Lưới và khối chứa**:

- Số dòng của lưới Core đếm theo vùng còn vạch phân cột (`ruledBottom`), nên vùng trống của lưới rỗng, thanh cuộn và thanh phân trang không bị tính là dòng. Bảng chỉ có hàng tiêu đề (bảng Organization của Add New Employee) và lưới hai, ba cột (danh sách nhân viên ở vùng trái) vẫn được nhận (`headerOnly`, `fewColumnHeader`).
- Dải tên của lưới là dải nằm ngay trên hàng tiêu đề cột và cùng mép trái với lưới; dải thụt ra ngoài lưới là tiêu đề của Section chứa lưới (`titleBandOf`). Đáy vùng lưới là đáy khung của lưới (`frameBottomOf`); không dò được khung thì dừng ở hàng cuối.
- Nút hoặc ô nhập nằm phía trên bảng, cách hàng tiêu đề ít nhất một hàng nền, không thuộc lưới và không bị xóa cùng lưới (trước đây cần hai hàng nền, nên nút “…” và nhãn Organization Structure của Add New Employee bị mất).
- Phía trên hàng tiêu đề cột không đọc được gì thuộc lưới (tên lưới, nút, Local Data Language, vùng kéo cột để nhóm) thì lưới bắt đầu ở đúng hàng tiêu đề cột (`startsAtHeader`); trước đây lưới bị đặt cao hơn tới 28px.
- `settleGrids`: mọi thứ nằm dưới lưới dời xuống bằng phần lưới cao thêm; khối chứa lưới cao thêm bấy nhiêu; con của một khối chỉ dời theo các lưới thuộc khối đó. Sau đó lưới thành **con** của khối có khung nhỏ nhất bao trọn vùng lưới (Section, group box, ESS Section), nên kéo khối thì lưới đi theo. Trước đây lưới là control cấp trên cùng nằm đè lên Section.

**Đặt field Core đúng vị trí trong ảnh** (`imp.alignFields`: `alignEditors` → `placeFields` → `packBareRows`):

- Bề rộng chữ nhãn đo bằng một nhãn thật gắn tạm vào canvas (`captionProbe`, cùng class và font với nhãn của field), không ước lượng theo hệ số. Số đo cho thấy chữ nhãn trong Builder rộng bằng 1,00–1,05 lần chữ trong ảnh HRM; hệ số 1,25 dùng trước đây làm ô nhập bị đẩy sang phải 3–21px và bị bóp hẹp. Hệ số này (`TEXT_GROWTH`) chỉ còn dùng cho nhãn field ESS và nhãn nhiều dòng của ô chọn, là hai chỗ chưa đo được.
- `placeEditor` đổi vị trí hộp trong ảnh sang hình học của field Core (`CORE_FIELD`, `EDITOR_GAP`): chữ nhãn bắt đầu ở x = 4, ô nhập bắt đầu ở `labelWidth + 7`, cao 18 (ô số 20) và cách đỉnh field 2; nhãn dài hơn `labelWidth` thì xuống dòng và ô nhập nằm giữa khối nhãn.
- `placeCheck` đặt checkbox / radio theo tâm ô chọn trong ảnh (`glyphY`) và chiều cao thật của khối nhãn, nên ô chọn có nhãn hai dòng không còn thấp hơn ảnh.
- Loại ô: vùng nút ở mép phải có một tam giác đặc quay xuống là combo hoặc ô ngày, có một tam giác lên và một xuống là ô số (`arrowGlyphs`); chữ của giá trị tràn tới mép phải không có dạng này.
- Popup: thân popup được nhận dạng với tọa độ tuyệt đối (`absTop`) rồi lùi một khoảng bằng viền của Popup; trước đây nội dung popup cao hơn ảnh 11px và lệch 2px.

**Không tải được bộ đọc chữ**: thiếu thư mục `Scripts/vendor/tesseract` trên máy chủ thì lệnh nhận dạng báo lỗi nêu rõ đường dẫn và giữ nguyên ảnh (`ocrReady`); trước đây ảnh vẫn bị tách nhưng mọi nhãn và tên cột thành lát ảnh. Thư mục này và `Scripts/builder/builder-drawio.js` được khai báo trong `BADesign.csproj` (`Scripts\vendor\tesseract\*`) để Publish mang theo.

Số đo trên trang thật sau các thay đổi trên (luồng `runForSelection`, đọc vị trí từ DOM, so với hộp trong ảnh): Add New Employee 38/43 ô nhập trùng vị trí, 5 ô còn lại lệch dọc tối đa 1–2px, bề rộng đúng; popup Bank 8/9 ô trùng, 1 ô lệch dọc 1px; checkbox và radio lệch tâm không quá 0,5px. Trên 19 ảnh mẫu (Add New Employee, Leave Profile, Warehouse, Loan, Allowances & Deductions, Reward, Company, Bank, Tax Deductions…) không còn control nào đè lên control cùng cấp hay tràn ra ngoài khối chứa, trừ một ô chọn ESS (xem giới hạn).

Kiểm thử: kịch bản `imagefields` (form Core tự vẽ: loại control, nhãn, vị trí ô nhập, nhãn và ô chọn so với ảnh) và `imagegrid` (Section tự vẽ chứa ô nhập, lưới và ô nhập dưới lưới: lưới là con của Section, bắt đầu ở hàng tiêu đề cột, ô nhập dưới lưới giữ đúng khoảng cách, kéo Section thì lưới và ô nhập đi theo) của `Tools/builder-harness`. Hai kịch bản dùng ảnh tự vẽ, không dùng ảnh chụp màn hình thật.

Giới hạn của phần này: ô nhập Core của Builder cao 18px (HRM 19px) nên đáy ô thấp hơn ảnh 1px; ô số của HRM cao 21px và cao hơn các ô cùng hàng 1px ở phía trên, nên các ô khác trong hàng có ô số lệch dọc 1px; ô số của Builder hẹp hơn 5px; khung của control lưới nằm trong đường viền 1px của lưới trong ảnh (lệch 1px mỗi bên) và hàng tiêu đề của lưới trong Builder thấp hơn mép trên của control 11px; “(%)”, “~” đứng riêng vẫn là lát ảnh; lưới thấp hơn vùng của nó trong ảnh thì nội dung bên dưới không được kéo lên; hình học field ESS chưa được đo lại (bước dịch field ESS chỉ chạy khi có từ hai field có nhãn; nhãn của ô chọn ESS bắt đầu xa ô chọn hơn trong ảnh nên có thể đè vài pixel lên control đứng sát bên phải, đã thấy ở Tax Deductions & Allowances); bộ dò giả định ảnh chụp ở tỷ lệ 100%.

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

BA bắt đầu từ một màn hình có thật của HRM, từ bản vẽ draw.io đã có, hoặc từ file HTML (mockup do AI vẽ), thay vì vẽ lại từ đầu. Màn hình mở ra là control thật của Builder (field, grid, tab page, section, toolbar), kéo thả và sửa được ngay.

### 13.1 Cách dùng

- **Thư viện**: nút **Màn hình chuẩn** trên thanh trên cùng của Builder, hoặc **Từ màn hình chuẩn** ở trang danh sách thiết kế (`Pages/Home.aspx`, mục 16). Hộp chọn có ô tìm theo tên, lọc Core / ESS, hình xem trước. Trong Builder mỗi thẻ có hai nút: **Mở thành thiết kế mới** và **Chèn vào thiết kế này** (chèn xuống dưới phần đang có). Ở trang danh sách, chọn màn hình sẽ mở Builder với `?template=<key>`.
- **Chụp từ HRM** (nút trên thanh trên cùng, và trong hộp Màn hình chuẩn): BA kéo nút **Chụp màn hình HRM** lên thanh dấu trang một lần. Sau đó mở màn hình bất kỳ trong HRM, bấm dấu trang, bấm **Sao chép**, quay lại Builder bấm Ctrl+V (trên vùng thiết kế hoặc trong ô dán của hộp thoại). Màn hình có nhiều tab thì dấu trang hỏi chụp tất cả tab hay chỉ tab đang mở. Không cần cài gì trên máy BA.
- **Chụp một phần màn hình**: sau khi chụp, bảng của dấu trang liệt kê các phần của màn hình: mỗi lưới và cây, mỗi tab có nội dung, mỗi khối Section / group box ở tầng trên cùng hoặc ngay trong popup, và **Các ô và nút còn lại**. Mặc định là **Cả màn hình**; chọn **Chỉ các phần được chọn** rồi tick phần cần lấy (tick một phần thì bảng tự chuyển sang lựa chọn này). Rê chuột vào một dòng thì phần đó được khoanh khung xanh trên trang HRM. Phần được chọn được dời về góc trên trái. Chọn một hoặc vài tab thì control tab giữ lại đúng các tab đó; phần nằm trong một phần khác đã chọn không bị lấy hai lần; chưa tick phần nào mà bấm Sao chép thì bảng báo “Chưa chọn phần nào.” và không sao chép gì. Màn hình chỉ có một phần thì bảng không hiện danh sách. Muốn chụp popup thì mở popup rồi mới bấm dấu trang; muốn chọn được tab chưa mở thì bấm **Chụp tất cả tab**.
- **Tùy chọn của bảng dấu trang**: **Lấy cả dữ liệu đang hiện trong lưới (tối đa 10 dòng mỗi lưới)** chỉ hiện khi màn hình Core có lưới đang có dòng, mặc định tắt (mục 13.6); **Giữ khối chia vùng (Splitter)** chỉ hiện khi màn hình có Splitter, mặc định bật; bỏ tick thì control trong hai vùng được chép như control rời, giữ nguyên vị trí trên màn hình.
- Ctrl+V trên vùng thiết kế khi clipboard của máy có dữ liệu màn hình đã chụp: nếu vừa bấm Ctrl+C trên một control trong Builder (trong 20 giây, `builder.shouldPreferAppPaste`, cùng quy tắc với dán ảnh) thì dán control đó; không thì mở hộp Chụp từ HRM. Trước đây dữ liệu màn hình luôn được ưu tiên, nên sau khi dán một màn hình chụp, mỗi lần sao chép rồi dán control lại mở hộp Chụp từ HRM cho tới khi clipboard của máy có nội dung khác. Kịch bản `capturepaste` kiểm tra cả hai trường hợp.
- Sau khi dán control (bộ định tuyến `paste.builderRouter` trong `builder.js`) và sau khi dán ảnh (`control-field.js`), Builder ghi chuỗi rỗng vào clipboard của máy (`builder.clearSystemClipboard`); trình duyệt không cho thì bỏ qua. Người dùng vì vậy mất nội dung clipboard đang có sau mỗi lần dán trong Builder; đây là hành vi có chủ đích và được giữ nguyên (người dùng quyết định ngày 2026-11-25). Khi kiểm thử trên máy đang có người dùng, harness thay `navigator.clipboard` của trang bằng bản giả (`Tools/builder-harness/README.md`).
- **Phân hệ HR**: hộp Màn hình chuẩn có ô lọc theo phân hệ (Staffing, Time-Attendance, Payroll, Insurance… do quản trị khai ở trang **Phân hệ HR**, mục 13.10), kèm lựa chọn **Chưa gán phân hệ**. Thẻ ghi phân hệ của màn hình sau tên nhóm (thẻ mẫu của team ghi thêm nhãn `Category` cũ nếu có); ô tìm khớp cả tên phân hệ và nhãn đó; ô lọc kết hợp được với Core / ESS / Mẫu của team. Chưa khai phân hệ nào thì ô lọc ẩn.
- **Tiếng Anh**: hộp Màn hình chuẩn và hộp Chụp từ HRM mở ở trang danh sách thiết kế chế độ English thì hiện tiếng Anh: nút, câu báo, tên, nhóm và mô tả của màn hình chuẩn (khóa trong từ điển, xem [13-Song-ngu.md](13-Song-ngu.md)), và bảng của dấu trang kéo từ trang đó. Ô tìm khớp cả chữ tiếng Việt gốc lẫn chữ tiếng Anh đang hiện. Tên, mô tả, nhãn của mẫu của team, tên phân hệ, tên người gửi và người duyệt là dữ liệu, giữ nguyên chữ đã nhập. Trong Builder hai hộp vẫn là tiếng Việt vì Builder chưa nối engine song ngữ.
- **Mở file draw.io**: nút trong hộp Màn hình chuẩn, nút **Từ file draw.io** ở trang danh sách thiết kế (mở `Builder?drawio=1`), hoặc kéo thả file `.drawio` vào Builder. Chi tiết ở mục 13.9.
- **Mở file HTML**: nút trong hộp Màn hình chuẩn, nút **Từ file HTML** ở trang danh sách thiết kế (mở `Builder?htmlfile=1`), hoặc kéo thả file `.html` vào Builder. Trang chính và từng popup của file thành control. Chi tiết ở mục 13.11.
- Mở xong, Builder tắt “Hiện khung field” để thiết kế nhìn giống màn hình thật; bật lại ở góc trên nếu cần thấy khung từng control. Lựa chọn này được nhớ cho lần mở sau.
- Bộ chụp không viết riêng cho từng chức năng: nó nhận theo mẫu markup chung của HRM (control DevExpress của Core, mẫu Bootstrap của ESS), nên dùng được cho chức năng chưa từng thử. Chức năng có cách dựng lạ thì bổ sung một quy tắc chung vào `builder-capture-page.js` (mục 13.4), không thêm nhánh theo tên chức năng.

### 13.2 Thành phần

| Tệp | Vai trò |
|---|---|
| `Scripts/builder/builder-capture-page.js` | Chạy **trong trang HRM**: đọc cấu trúc màn hình đang hiển thị thành dữ liệu `ba-screen`. Không phụ thuộc thư viện nào. Cũng chạy trong khung cách ly của hộp Mở file HTML để đọc một file HTML bất kỳ (`__baCaptureScreens`, mục 13.11). |
| `Scripts/builder/builder-capture.js` | Chạy trong Builder (và Node): kiểm tra, làm sạch dữ liệu `ba-screen` rồi đổi thành mảng control. |
| `Scripts/builder/builder-drawio.js` | Chạy trong Builder (và Node): đọc file draw.io, đổi một trang thành dữ liệu `ba-screen` (mục 13.9). Không phụ thuộc thư viện nào. |
| `Scripts/builder/builder-html.js` | Chạy trong Builder: dựng một file HTML trong `iframe` cách ly, chạy `builder-capture-page.js` trong đó và nhận về dữ liệu `ba-screen` của trang chính và từng popup (mục 13.11). |
| `Scripts/builder/builder-templates.js`, `Content/builder-templates.css` | Hộp Màn hình chuẩn (kèm ô lọc phân hệ), hộp Chụp từ HRM, hộp Mở file draw.io và hộp Mở file HTML (hai hộp mở file dựng chung bằng `buildFileDialog`), tạo dấu trang, bảng của dấu trang hiện trên trang HRM (`pageRunner`: hỏi kiểu chụp tab, danh sách phần, tùy chọn, Sao chép; chữ của bảng nằm trong `RUNNER_TEXT`, được dịch theo ngôn ngữ của trang lúc dựng dấu trang, số đếm có hai dạng `one` / `many` trong `amounts`), xử lý Ctrl+V và thả file. |
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
| `button` | `text`, `disabled`, `bg`, `fg`, `border` (màu dạng `#rrggbb`). Bộ chụp luôn ghi đủ ba màu như đang thấy trên trang: `bg` là màu trong ô của nút (nền trong suốt thì là màu phía sau nút), `border` là màu viền đang kẻ (không kẻ viền thì trùng `bg`) |
| `tag` | `text`, `bg`, `fg` (nhãn trạng thái có màu; thành field Tag của ESS) |
| `label` | `text`, `bold` |
| `image` | `src`: ảnh dạng `data:image/(png, jpeg, gif, webp);base64,...`, tối đa 12 MB mỗi ảnh và 48 MB cho cả màn hình; ảnh sai dạng hoặc vượt mức bị bỏ. Chỉ bộ đọc draw.io tạo node này (mục 13.9). Thành field Image của ESS, kéo giãn theo khung, nằm dưới các control khác (`zIndex = 0`) |
| `group`, `section` | `caption`, `children` |
| `popup` | `title`, `children`, `head` (không bắt buộc: chiều cao phần đầu riêng của popup trên trang gốc, chỉ có khi đọc file HTML; xem `rehead` ở mục 13.5) |
| `tabs` | `tabs[]`, `active`, `children` (mỗi con có `tab` = chỉ số tab chứa nó) |
| `grid` | `title`, `columns[{caption,w,type,text,bg,fg,tags}]`, `filterRow`, `pager`, `checkbox`, `actions[]` (`view`/`edit`/`delete`), `toolbar[{text}]`, `rows` (1–10), `data` (tối đa 10 dòng, mỗi dòng là mảng chữ theo thứ tự `columns`, mỗi ô tối đa 60 ký tự, ô chọn đã tick ghi là `x`; thành dữ liệu mẫu của lưới Core và khi có `data` thì `rows` lấy theo số dòng của `data`; chỉ được giữ khi `ui` là `core`), `groupPanel`, `viewData`, `language`. Cột có `type: "checkbox"` hoặc `type: "tag"`; cột tag mang `text`, `bg`, `fg` của dòng đầu và `tags[{text,bg,fg}]` khi các dòng có nhiều trạng thái khác nhau (tối đa 6) |
| `toolbar` | `buttons[{text, icon}]`; `icon` là khóa biểu tượng của Core (`add`, `save`, `cancel`, `delete`, `select`, `ok`, `openreport`, `download`, `export`, `approve`…), chỉ khóa có trong `ICON_KEYS` được giữ, không có thì đoán theo chữ |
| `tree` | `check` (`box` / `mark` / `none`), `rowHeight`, `indent`, `header`, `caption`, `scroll`, `columns[{caption,w,type,disabled}]`, `items[{text,level,open,checked,focused,cells[]}]` (tối đa 200 nút, 12 cột) |
| `splitter` | Khối hai vùng. `x`, `y`, `w`, `h` là khung của cả khối; `vertical` (`true` là thanh đứng, hai vùng trái / phải; không có là thanh ngang, hai vùng trên / dưới); `split` (cỡ vùng 1 theo chiều chia, pixel; không ghi thì chia đôi); `bar` (bề dày thanh chia trên HRM, `0` khi thanh bị ẩn, tối đa 6); `children` (mỗi con có `pane` = `0` hoặc `1`; tọa độ của con vẫn tính từ gốc màn hình như mọi node). Dữ liệu chép bằng dấu trang cũ còn mang `grip`: giá trị đó bị bỏ, không cần kéo lại dấu trang |

`builderCapture.normalize` chỉ giữ các loại và thuộc tính trên, bỏ ký tự `<` `>` và ký tự điều khiển, cắt chữ quá 200 ký tự (ô dữ liệu của lưới và ô của cây 60 ký tự, `LIMITS.cell`; số dòng dữ liệu của lưới `LIMITS.gridRows`), giới hạn 2000 node, 8 tầng; dữ liệu dạng chuỗi (dán từ clipboard) tối đa 2 MB. Dữ liệu dán vào và kết quả đọc file draw.io luôn đi qua bước này trước khi dùng.

### 13.4 Đọc màn hình HRM (`builder-capture-page.js`)

- `__baCapture(options)` chụp màn hình đang hiển thị; `__baCaptureAllTabs` bấm lần lượt từng tab như người dùng rồi `__baMergeTabs` gộp lại; `__baTabCount` cho biết số tab.
- Các phần của màn hình: `__baParts(screen)` trả danh sách phần `{ id, kind, title, box, counts, within, columns, names }`, `kind` là `grid`, `tree`, `tab`, `box` (Section / group box) hoặc `rest` (các node rời còn lại của tầng trên cùng; Splitter không phải một phần, node trong hai vùng của nó được xét như node của tầng chứa Splitter). Lưới, cây và tab được liệt kê ở mọi tầng (`within` cho biết nó nằm trong tab hay khối nào); khối chỉ được liệt kê ở tầng trên cùng hoặc ngay trong popup; vỏ popup không phải một phần; tab không có nội dung bị bỏ. `__baSelect(screen, { parts, gridData, splitters })` trả một bản sao chỉ còn các phần được chọn (`parts` là mảng `id`, không truyền là cả màn hình): tab được chọn giữ trong control tab và đánh lại chỉ số (`keepTabs`), phần nằm trong phần khác đã chọn bị bỏ qua (`pickParts`), `data` của lưới bị bỏ khi `gridData` không bật, khi `splitters === false` thì node `splitter` bị bỏ và các node trong hai vùng lên thay chỗ nó, nhận `pane` / `tab` của Splitter (`prune`), rồi kết quả được dời về gốc và tính lại kích thước (`fitToNodes`, dùng `extentOf` tính cả vị trí chữ caption `labelX` / `labelY` để caption bên trái không rơi ra ngoài). `__baHighlight(box)` vẽ khung khoanh vùng trên tài liệu vừa chụp (kể cả khi tài liệu đó nằm trong khung con, `lastView`), gọi với `null` để xóa khung.
- Bảng của dấu trang luôn chụp với `gridData: true` rồi mới lọc bằng `__baSelect` lúc bấm Sao chép, nên BA đổi lựa chọn phần và tùy chọn mà không phải chụp lại. Dữ liệu lưới chỉ rời trang HRM khi ô tùy chọn được tick.
- Khối chia vùng (`collectSplitters`): một bảng `dxsplControl` / `dxsplP` của ASPxSplitter có n ô vùng (`dxsplPane`) thành n − 1 node `splitter` lồng nhau; node thứ k chia vùng k (vùng 1) với phần còn lại (vùng 2), nên bảng hai vùng là một node và bảng ba vùng là hai node. Khung của node là hợp các vùng nó chứa, `split` là cỡ vùng 1, `bar` là bề dày ô `dxsplVSeparator` / `dxsplHSeparator` nằm giữa (ảnh tay nắm trong ô đó không được ghi lại). Hai ô vùng đứng liền nhau mà không có ô thanh chia ở giữa, tức thanh bị ẩn như ở Warehouse, cho `bar = 0`: vùng xếp trên dưới là thanh ngang, xếp trái phải là thanh đứng (`hiddenBar`). Ô thanh chia được đánh dấu đã dùng (`claim`) để ảnh tay nắm không thành control Image. Control và khối nằm trong một vùng thành con của node với `pane` 0 / 1 (`nest`, `paneAt`); khung của node `splitter` không nới theo con, vì vùng cắt nội dung tràn ra ngoài. Khi tìm khung lồng và khung bao (`collectFramedBoxes`), node `splitter` được bỏ qua để kết quả của màn hình không có Splitter giữ nguyên.
- Dữ liệu lưới (`gridFromTable`, `cellValue`): khi `options.gridData === true` và tài liệu được chụp là màn hình Core (`uiOf`), mỗi lưới DevExpress có thêm `data` là chữ đang hiện của tối đa 10 dòng đầu, theo đúng các cột đã chụp (không gồm cột chọn dòng và cột hành động); ô chỉ có ô chọn ghi `x` khi đã tick và để trống khi chưa tick. Trang kiểu ESS không đọc dòng, kể cả khi lưới đang có dòng.
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

- Control gốc nằm ở vị trí trên màn hình chụp cộng lề 20px tính từ mép thước (`CANVAS_MIN`). Control nào lấn ra ngoài lề đó (nút và nhãn của ESS, ô nhập lùi lại một khoảng đệm; caption dài nới field sang trái) thì **cả màn hình được dời một lần** cho control ngoài cùng nằm đúng lề (`keepMargin`), nên khoảng cách giữa các control giữ đúng như trên màn hình chụp. Trước ngày 2026-11-25 `place` kẹp riêng từng control gốc vào lề: control sát mép bị đẩy lệch đúng bằng phần đệm của nó (hai nút ESS cạnh nhau lệch 7px và đè nhau, ô nhập Core ở hàng đầu thấp hơn 3px, field có caption dài lệch cột tới 60px), dễ gặp khi chụp từng phần vì phần được chọn luôn được dời về góc. Con của group / section / popup dùng tọa độ vùng content (`INSETS`) và vẫn dừng ở mép vùng content, vì vùng content cắt phần nằm ngoài nó; riêng control nằm hẳn trên phần đầu của popup hoặc của ESS section thì cả phần nội dung được đẩy xuống (`headroom`, bên dưới).
- Caption bên trái nhập vào field (`labelWidth` nới theo độ dài chữ, tối đa thêm 60px); caption phía trên thành label riêng.
- ESS: field cao thêm 10px, label và nút bù lề của khung field ESS (`METRICS.ess`) để chữ và mặt nút nằm đúng vị trí chụp.
- Grid Core và ESS dựng trong Builder cao hơn ảnh chụp; `reflowList` nới khối chứa và đẩy các khối bên dưới xuống. Chiều cao đo sẵn: `GRID_HEIGHT` (Core), `ESS_GRID_HEIGHT` (ESS). Đổi giao diện grid trong Builder thì đo lại các số này.
- `reflowList(ui, nodes, axis)` chạy cho cả hai chiều (`ACROSS` rồi `DOWN`). Node dựng trong Builder lớn hơn chỗ của nó trên màn hình chụp (`ownGrowth`: lưới cao theo số dòng mẫu) được nới ra; mọi node cùng cấp nằm **sau** nó theo chiều đang xét bị đẩy đi một khoảng bằng tổng phần nới của các node đứng trước (`shiftOf`), và khối chứa nới theo. “Nằm sau” xét theo vị trí gốc trên màn hình chụp (`comesAfter`, dung sai `EDGE_SLACK` 2px), không theo thứ tự trong danh sách. Node cùng cấp ở cột hoặc hàng khác cũng bị đẩy theo để các hàng, cột giữ thẳng với nhau.
- Hai vùng của node `splitter` được dàn lại riêng (`reflowSplitter`). Theo chiều chia: thanh lấy bề dày của Builder (6px, kể cả khi `bar = 0`), vùng 1 dài thêm bao nhiêu thì `split` tăng bấy nhiêu, mọi node của vùng 2 lùi một khoảng bằng phần đó cộng phần thanh dày thêm, và cả khối dài thêm bằng tổng phần dài thêm của hai vùng và của thanh. Theo chiều còn lại: cả khối lớn theo vùng dài thêm nhiều hơn. Vùng của Builder cắt nội dung tràn ra ngoài, còn trên HRM một control có thể dài hơn vùng chứa nó mà vẫn hiện (đã gặp ở màn hình Warehouse: tab control cao 478px trong vùng 475px). Vì vậy node tràn khỏi vùng trên màn hình chụp làm vùng đó dài thêm đúng bằng phần tràn (`spillOf`), cộng với phần dài thêm ở trên.
- Node `splitter` thành field Splitter của Core (`emitSplitter`, mục 10): `width` / `height` là khung của node sau khi dàn lại, `splitOrientation` theo node (nút nắm không lấy từ màn hình chụp, xem mục 10), `splitRatio = SPLIT.ratio(split, SPLIT.room(cỡ theo chiều chia))` nên vùng 1 trong Builder dài đúng bằng `split`. Node con được phát với gốc tọa độ là góc của vùng chứa nó (vùng 2 bắt đầu sau `split` + 6px) và control con trực tiếp nhận `paneIndex`. Thanh bị ẩn trên HRM (`bar = 0`) vẫn được dựng dày 6px có nút nắm, để BA thấy và kéo được ranh giới hai vùng. Màn hình không có Splitter thì vị trí các control không đổi so với trước.
- Lưới Core có `data` lấy đúng các dòng đã chụp làm dữ liệu mẫu (`sampleRows`): cột checkbox coi `x` / `true` / `yes` / `1` là có tick, cột tag hiện chữ đã chụp, ô trống để trống (riêng ô trống của cột tag vẫn hiện tag xoay vòng theo `controlGrid.tagFor`, mục 10). Lưới ESS không dùng `data`: chế độ xem của lưới ESS hiện chữ mẫu `Caption N` cho ô trống và không có cột checkbox, nên dòng thật và dòng mẫu sẽ lẫn vào nhau.
- Cột không có tiêu đề (cột chọn dòng, cột biểu tượng của một bảng HTML) không có chữ mẫu: ô của cột đó để trống ở cả lưới Core (`sampleRows`, `controlGrid.createSampleData`) và lưới ESS (hàm vẽ ô của `control-grid-ess.js`). Trước ngày 2026-11-25 lưới ESS hiện `Column N` và lưới Core hiện `Col1 N` ở cột này.
- Grid và toolbar là con của khối chứa gần nhất (popup, group box, section, ESS section), nên đi theo khi kéo khối đó. Toolbar nằm trực tiếp trong popup thì gắn vào khung popup (`dock = "popup"`). Control trong tab mang `tabPageId` / `tabIndex`, kể cả ESS section (trước ngày 2026-11-25 ESS section nằm trong tab không mang hai giá trị này nên hiện ở mọi tab).
- Control nằm trên dải tiêu đề của section Core (nút, combo Company) giữ nguyên trên dải đó (top âm) và được dời sang phải nếu đè lên chữ tiêu đề. “Nằm trên dải tiêu đề” là `onHeader`: tâm của control cao hơn mép vùng content quá `HEADER_SLACK` (4px).
- Phần đầu của popup (thanh tiêu đề và thanh nút, 59px) và của ESS section (52px) trong Builder không đặt control lên được. Khối trên màn hình gốc có control nằm ở đó (cùng phép thử `onHeader`) thì `headroom` đẩy **cả phần nội dung** của khối xuống cho control cao nhất chạm mép vùng content, khối cao thêm đúng bằng khoảng đó và các khối bên dưới lùi theo (`reflowList`). Gặp ở popup không có thanh tiêu đề và ở khung có nút nằm ngay trên dải tiêu đề trong file HTML (mục 13.11). Kẹp riêng từng control ở mép trên vùng content, như trước đó, làm các control hàng đầu chồng lên nhau. Thanh nút gắn vào popup không tính là nội dung. Khối có nội dung bắt đầu trong khoảng đệm ngay dưới phần đầu (ESS section trên trang HRM thật: 41px so với 52px của Builder) không đổi: hàng đầu dừng ở mép vùng content.
- Popup có `head` (đọc từ file HTML, mục 13.11) đi đường riêng `rehead`: phần đầu của popup trên trang gốc cao bao nhiêu là tùy trang (mockup mẫu: dải tiêu đề 44px + dải nút 36px = 80px), còn phần đầu của popup Builder luôn là 59px. Thanh nút nằm trên phần đầu gốc được đặt ở `POPUP_BAR_TOP` (32px, đúng chỗ của thanh nút trên popup HRM), nên tâm của nó rơi vào dải `.popup-titlebar` và `controlToolbar.alignToBand` canh nó giữa dải. Mọi control còn lại dời cùng một khoảng `59 - head`, để khoảng cách từ mép dưới phần đầu tới nội dung giữ như trang gốc, và popup cao thêm hoặc thấp đi đúng bằng khoảng đó. Thanh nút nằm dưới phần đầu (ví dụ hàng nút ở đáy popup) dời theo nội dung. `head` không xuống quá control nội dung đầu tiên, và `normalize` giữ nó trong `0..h`. Popup chụp từ HRM không có `head` nên không đổi. Trước khi có quy tắc này, thanh nút giữ nguyên khoảng cách tới mép trên popup (50px ở mockup mẫu) nên bị vẽ vắt qua mép dưới dải, đè lên vùng nội dung.
- Nút không có chữ nhận chữ `…`.
- Màu của nút: bộ chụp dựng mọi nút (thẻ `a`, `button`, nút DevExpress, ô có con trỏ bấm) bằng một hàm, `buttonAtom` trong `builder-capture-page.js`, và luôn ghi đủ ba màu như đang thấy trên trang. Nền trong suốt lấy màu của phần tử cha gần nhất có nền (`paintBehind`; không cha nào có nền thì là nền trắng của trang). Nút không kẻ viền (bề dày dưới 1px hoặc kiểu `none`) lấy viền trùng màu nền. Lý do: thiếu một màu thì nút ESS trong Builder vẽ màu của nút mới (nền đỏ `#ed120b`, viền xanh `#0A75BA`), không liên quan tới trang gốc. Ba màu chỉ có tác dụng với nút ESS; nút Core trong Builder không tô theo chúng. Nền là ảnh hoặc dải màu chuyển (gradient) chưa được đọc: nút đó nhận màu phía sau nó.
- Nút khóa: nút chỉ thành nút khóa (`disabled`) khi trang khóa nó theo cách chuẩn, tức thuộc tính `disabled`, `aria-disabled="true"`, class `disabled` hoặc class khóa của DevExpress (`isDisabled`, một quy tắc cho mọi loại nút). Class chỉ chặn chuột mà không đổi cách hiển thị (ví dụ `deactive-event` với `pointer-events: none` ở màn hình Overtime Limit Assessment) không khóa nút, vì Builder làm mờ control khóa còn 50% (`.page-field-disabled .page-field-editor`) và nút sẽ nhạt hơn trang gốc. Nút đã xám sẵn trên trang gốc vẫn xám nhờ ba màu đã chụp. BA muốn thể hiện nút đang khóa thì tick “Khóa” trong phần Thuộc tính.
- Cột `checkbox` và cột `tag` của lưới Core giữ kiểu hiển thị (mục 10): dữ liệu mẫu của cột tag lần lượt lấy các trạng thái đã chụp, cột checkbox xen kẽ có / không. Lưới ESS chỉ có một tag cho mỗi cột nên lấy trạng thái đầu; cột checkbox của lưới ESS vẫn là cột chữ.
- Node `tag` thành field Tag của ESS (màu nền, màu chữ như đã chụp, kể cả trong màn hình Core).

### 13.6 Dữ liệu cá nhân

Dấu trang chỉ đọc bố cục trên trình duyệt của BA, không gửi gì về máy chủ; kết quả nằm trong clipboard cho tới khi BA dán vào Builder.

- Không lấy giá trị trong ô nhập. Dòng dữ liệu của lưới mặc định không lấy (chỉ tên cột và số dòng).
- Chỉ khi BA tick **Lấy cả dữ liệu đang hiện trong lưới** trên bảng của dấu trang thì tối đa 10 dòng đang hiện của mỗi lưới Core mới nằm trong dữ liệu sao chép, nguyên văn như trên màn hình (không qua `scrub`, không thay tên hay số). Khi ô này được tick, dòng ghi chú của bảng đổi thành cảnh báo màu cam “Dữ liệu đang hiện trong lưới sẽ nằm trong thiết kế. Chỉ nên dùng với dữ liệu mẫu.” Tùy chọn này dành cho trường hợp BA tự tạo dữ liệu mẫu trên HRM rồi chụp; dùng với dữ liệu thật thì họ tên, số liệu trong lưới sẽ nằm trong thiết kế và trong mọi bản chia sẻ của thiết kế đó.
- ESS: giá trị gắn dữ liệu (phần tử có `data-name` mà không có `data-languagekey`) được thay khi tên trường thuộc nhóm cá nhân (`PERSONAL_KEY`: employee, name, manager, phone, mail, address, birth, passport, id card, tax, bank, salary…) hoặc khi nằm trong thẻ thông tin nhân viên (`#js-infouser` và các khối `eprofile`, `emp-info`). Giá trị thay lấy từ `SAMPLE_VALUES`; số được thay bằng `0`, ngày bằng `01/01/2026`. Chữ trong nút, liên kết và tiêu đề cột không bị thay.
- Chữ dạng “mã - họ tên” (ví dụ tiêu đề khối theo nhân viên) được thay bằng `EMP001 - Employee Name`, `EMP002 - …`; địa chỉ email thay bằng `name@company.com`.
- Số thuần có từ 7 chữ số (tổng tiền, số tài khoản) được thay bằng chữ số `0` cùng độ dài (`scrub`).
- Cột tag chỉ lấy chữ của nhãn trạng thái (tối đa 24 ký tự mỗi nhãn), không lấy giá trị của các cột khác.
- Chữ hiển thị dạng văn bản thường khác (không nằm trong ô nhập) vẫn được chụp nguyên văn, ví dụ tên công ty, chức danh, số đầu người trên thẻ số liệu. Trước khi thêm một màn hình vào thư viện phải rà lại toàn bộ chữ trong tệp và thay các giá trị đó bằng giá trị mẫu.

### 13.7 Thêm màn hình vào thư viện

1. Mở màn hình trong HRM, chạy dấu trang, sao chép, lưu nội dung vào một tệp `.json`.
2. `node Tools/ui-capture/add-screen.js <key> "<tên>" "<nhóm>" <thứ tự> <tệp.json> "<mô tả>"`. `key` chỉ gồm chữ thường, số, gạch nối. Lệnh ghi `App_Data/BuilderTemplates/<key>.json` và cập nhật `index.json` (số control, hình phác thảo).
3. Rà chữ trong tệp vừa ghi (mục 13.6), mở `Builder?template=<key>` để xem.
4. Tên, nhóm, mô tả viết tiếng Việt thì thêm bản tiếng Anh vào nhóm `ui-builder-home` của `Scripts/i18n/ba-i18n.en.js` (khóa là câu trong `index.json`, viết theo mục "Viết khóa trong từ điển" của [13-Song-ngu.md](13-Song-ngu.md)), rồi chạy `node Tools/i18n/i18n-check.js`: phải báo thiếu 0. Công cụ rà đọc `index.json` nên câu nào chưa có bản dịch sẽ bị báo.
5. Tùy chọn: đặt ảnh `Content/builder-templates/<key>.png` rồi chạy `library.refreshThumbs()` để dùng ảnh thật thay hình phác thảo.

Kiểm thử bộ chuyển đổi: `node Tools/ui-capture/test/convert.test.js` (88 ca; gồm cả `__baParts` / `__baSelect` của `builder-capture-page.js`, là hai hàm thuần chạy được trong Node) và `node Tools/ui-capture/test/drawio.test.js` (22 ca, bộ đọc file draw.io).

Kiểm thử phần chạy trên trình duyệt của Builder (kéo thả, lồng control, Undo / Redo, mở màn hình chuẩn, lọc phân hệ, mở file draw.io, mở file HTML, nhận dạng ảnh) không cần đăng nhập: `node Tools/builder-harness/server.js` rồi mở `http://localhost:3988/Builder`; 91 kịch bản (kéo thả, chọn nhiều control, Ctrl+A, quét khối, popup có tab, xóa khối chứa, file biểu tượng, lưới Core và lưới ESS theo vùng của Splitter, chiều cao lưới, kéo giãn lưới Core và lưới ESS bằng tay nắm phải / dưới / góc cả trong vùng của Splitter, lưới ESS thu chiều cao cho vừa vùng thấp, bản sao nằm trên bản gốc, mở file HTML, dời lưới không tiêu đề bằng nút dời, chữ có mã HTML ở các thao tác của người mở thiết kế, màu và trạng thái khóa của nút chụp từ HRM, câu báo khi lưu bị từ chối, hộp Màn hình chuẩn và hộp Chụp từ HRM ở chế độ English, chọn và dời Splitter khi trong vùng có lưới rộng hơn vùng…) chạy bằng Playwright qua `/__runner`. Cách dùng và giới hạn ghi trong `Tools/builder-harness/README.md`. Phần chụp từ HRM có năm kịch bản: `capturepaste` (ưu tiên dán), `capturesplitter` (dán màn hình master / detail có Splitter ẩn thanh và dữ liệu lưới), `capturesplitnest` (chạy dấu trang trên trang mẫu `Tools/builder-harness/hrm-splitter-page.html` có bảng ba vùng và một bảng lồng bên trong, rồi dán vào Builder), `capturebuttons` (chạy dấu trang trên trang mẫu dựng bằng HTML thường `Tools/builder-harness/hrm-plain-page.html`: ba màu và trạng thái khóa của từng nút lúc chụp, lúc Builder vẽ và trong phần Thuộc tính, lưới có cột đầu không tiêu đề; thêm hai nút DevExpress trên trang mẫu Core) và `capturepanel` (chạy dấu trang thật trên trang HRM mẫu `Tools/builder-harness/hrm-sample-page.html`: danh sách phần, khoanh vùng, sao chép từng phần, dữ liệu lưới, chụp tất cả tab, dán vào Builder).

### 13.8 Giới hạn

- Danh sách phần của dấu trang gồm lưới, cây, tab, khối Section / group box ở tầng trên cùng (hoặc ngay trong popup) và phần còn lại. Chưa chọn riêng được một khối nằm bên trong tab hay bên trong khối khác, hay một ô nhập đơn lẻ; muốn vậy thì chụp phần chứa nó rồi xóa phần thừa trong Builder. Tab chưa được chụp nội dung (đã chọn **Chỉ tab đang mở**) không có trong danh sách. Phần “còn lại” chỉ toàn nhãn thì dòng của nó không ghi số lượng.
- Bảng chia vùng của HRM thành khối Splitter có hai vùng co giãn theo thanh (mục 10). Control trong một vùng chỉ giãn theo vùng khi nó là con trực tiếp và đang chạm mép xa của vùng; control là con của group box hoặc Section ở trong vùng thì chưa giãn theo. Lưới Core vừa dán vào Builder cao theo số dòng mẫu: lưới cao hơn chỗ của nó trên HRM thì vùng chứa nó dài thêm và vùng sau lùi theo; lưới thấp hơn thì dưới lưới còn khoảng trống, ứng với phần lưới trống trên HRM. Khoảng trống đó mất khi BA kéo thanh chia hoặc đổi cỡ khối lần đầu, vì lúc đó lưới kéo dài tới mép dưới của vùng (mục 10). Control dài hơn vùng chứa nó trên HRM thì vùng đó trong Builder dài thêm cho vừa control (mục 13.5), nên khối Splitter trong Builder có thể dài hơn bảng chia vùng trên HRM vài px. Thả một control đúng lên thanh chia 6px thì nó không vào vùng nào.
- Dữ liệu lưới chỉ lấy được ở màn hình Core, tối đa 10 dòng đang hiện trong khung lưới và 60 ký tự mỗi ô; dòng phải cuộn mới thấy không được lấy. Trang kiểu ESS chưa hỗ trợ (lý do ở mục 13.5).
- Trang có nội dung nằm trong một khung chiếm từ 70% trang (các trang Data Setup: thanh điều hướng bên trái, thanh chia, khung nội dung bên phải): chỉ nội dung trong khung được chụp, thanh điều hướng và thanh chia cạnh nó không có trong kết quả (`pickTarget`). Bấm dấu trang khi khung nội dung chưa tải xong thì kết quả chỉ có các dòng chữ của thanh điều hướng.
- Con của group box, section và popup dừng ở mép vùng content của khối (`place` không cho tọa độ âm, vì vùng content cắt phần nằm ngoài nó). Hàng control đầu tiên của một khối mà trên màn hình gốc bắt đầu cao hơn vùng content của Builder vài px (ESS section trên trang HRM thật: nội dung bắt đầu ở 41px, vùng content của Builder ở 52px) vì vậy sát hàng thứ hai hơn màn hình gốc đúng bằng phần chênh. Control gốc của màn hình không còn bị kẹp riêng (`keepMargin`, mục 13.5), và control nằm hẳn trên phần đầu của popup hoặc ESS section thì cả phần nội dung được đẩy xuống (`headroom`, mục 13.5).
- Tab lồng bên trong chỉ được chụp ở trạng thái đang mở. Khối đang thu gọn chỉ có tiêu đề.
- Popup có nội dung cuộn (Edit Transaction dạng Former / Proposal) được chụp đủ nội dung nên popup trong Builder cao hơn popup thật.
- Cột biểu tượng riêng của chức năng (ví dụ OT Request) thành cột chữ thường. Lưới chưa có dòng dữ liệu thì không biết cột nào là checkbox hay tag.
- Ảnh (ảnh nhân viên, biểu tượng) không được chụp.
- Danh sách của ESS chưa có dòng nào (ví dụ View Detail của Request Overtime) không tạo được lưới.
- Dấu trang dài khoảng 120 nghìn ký tự (URL `javascript:` 120 327 ký tự, mã bên trong 105 383 ký tự, đo ngày 2026-11-25 sau khi gom việc chụp nút về `buttonAtom`). Bản này đã chạy cùng ngày trên ba trang mẫu của harness (kịch bản `capturepanel`, `capturesplitnest`, `capturebuttons`) và trên site Master thử nghiệm với màn hình Overtime Limit Assessment (URL tạo từ Builder của harness, gán vào `location.href` của trang HRM trên Chromium, cửa sổ 1600×950, chức năng mở thẳng bằng `BasicForm.aspx`), rồi đưa vào Builder của harness:
  - Overtime Limit Assessment: trang Core dựng bằng HTML thường, không có control DevExpress nào đang hiện nên được nhận là giao diện ESS. 20 control, trong đó 5 nút và một lưới 6 cột có cột đầu không tiêu đề. Nút “Load currently selected employee(s)” là thẻ `a` nền trong suốt, viền 1px, mang class chỉ chặn chuột: được chụp nền `#ffffff` (màu của khối phía sau), chữ `#0a75ba`, viền `#eceef2`, không khóa; Builder vẽ đúng ba màu đó và không làm mờ (trước khi sửa: nền đỏ `#ed120b` và mờ 50%). Lưới thành ESS grid: tiêu đề và ô của cột đầu để trống, năm cột còn lại có chữ mẫu, có một nút dời, kéo nút dời thì lưới đi theo và được chọn.

  Bản dài 91 823 ký tự (sớm hơn cùng ngày) đã chạy trên hai trang mẫu của harness (`capturepanel`, `capturesplitnest`) và trên site Master thử nghiệm với hai màn hình có bảng chia vùng (URL tạo từ Builder trên `localhost:3393`, cùng cách chạy), rồi dán vào Builder trên `localhost:3393`; hai màn hình này chưa chạy lại với bản hiện tại:
  - Warehouse, chụp tất cả tab: 17 control (4 lưới, 3 tab). Một Splitter ngang 1600×950 thanh ẩn: vùng trên 475px có 3 control, trong đó lưới chính 1600×450; vùng dưới là tab control 1600×478 (mỗi tab một Section có lưới). Trong Builder khối thành 1600×959 với hai vùng 475 và 478px, không control nào bị vùng cắt, không cặp control nào đè nhau. Bỏ tick Giữ khối chia vùng: 16 control, cả 4 node gốc giữ nguyên vị trí. Kéo thanh lên 40px: hai vùng thành 435 và 518px; Undo / Redo trả đúng. Chỉ tab đang mở: 9 control, cùng cấu trúc.
  - Leave Profile: 23 control. Splitter dọc 1600×943 có thanh 6px nhìn thấy: vùng trái 265px chứa lưới, vùng phải chứa một Splitter ngang 1329×943 thanh ẩn (14 control ở vùng trên 135px; 6 control ở vùng dưới, trong đó lưới 1329×781). Trong Builder: khối ngoài 1600×949 (hai vùng 265 và 1329px), khối trong 1329×949 (hai vùng 135 và 808px) là con của vùng phải; không lỗi cấu trúc, không control nào đè nhau hay bị cắt. Bỏ tick Giữ khối chia vùng: 21 control, cả 21 giữ nguyên vị trí. Kéo thanh ngoài sang trái 40px: hai vùng thành 225 và 1369px; Undo / Redo trả đúng.

  Các số dưới đây đo cùng ngày với bản ngay trước đó (URL dài 89 310 ký tự, Splitter còn là một thanh), cùng cách chạy; các phần này chưa chạy lại với bản hiện tại:
  - Warehouse: 17 control với 3 tab và một thanh chia ẩn. Chọn riêng lưới chính, một tab, hai tab kèm lưới bên trong (không lấy hai lần), tab chưa mở, lưới của tab chưa mở, phần còn lại đều ra đúng phần đó ở góc (0,0); khung khoanh vùng trùng phần tử thật. Popup Input Warehouse 6 control và từng phần của popup.
  - Leave Profile: 23 control, thanh chia đứng nhìn thấy (6×943) và thanh ngang ẩn; thanh Add / Delete ngay trên lưới chi tiết không được gộp vào lưới và chạm khoảng 3px vào lề trên (trống) của control lưới.
  - Leave Data Setup / Leave Type và Organization Data Setup / Country - Nationality: tùy chọn dữ liệu lưới mặc định tắt (dữ liệu sao chép không có `data`); bật lên thì lấy đúng 5 dòng và 10 dòng đầu của lưới 20 dòng, từng ô trùng chữ trên màn hình.
  - ESS (Leave History, Time-sheet, Request Leave): có danh sách phần và khoanh vùng trong khung nội dung, không có tùy chọn dữ liệu lưới kể cả khi bảng đang có dòng.
  - Sao chép vào clipboard rồi Ctrl+V trong Builder mở đúng hộp Chụp từ HRM; sau khi dán, các màn hình Core trên không có control nào đè nhau hay tràn khỏi khối chứa. Màn hình ESS còn lỗi lệch ở mép nêu trên.

  Thao tác kéo nút lên thanh dấu trang và bấm dấu trang bằng tay chưa thử trên máy BA. Firefox không lưu dấu trang dài hơn 65 536 ký tự nên dấu trang này chỉ dùng được trên Chrome / Edge. Trang HRM chặn script bằng CSP thì dấu trang không chạy.
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

**Trang Phân hệ HR** (`/HrModules`, menu cùng nhóm với Mẫu UI dùng chung): chỉ người có quyền `UITemplateAdmin` hoặc Super Admin (`UiHrModules.CanManage`, cùng điều kiện với `UiTemplateLibrary.IsAdmin`). Thêm, đổi tên, ẩn / hiện, đổi thứ tự, xóa phân hệ; bảng bên dưới gán phân hệ cho từng màn hình chuẩn và từng mẫu của team (có ô tìm và lọc Tất cả / Chưa gán). Ở chế độ English tên và nhóm của màn hình chuẩn được dịch như trong hộp Màn hình chuẩn, ô tìm khớp cả chữ gốc lẫn chữ đang hiện; tên mẫu của team giữ nguyên. Page method: `LoadAll`, `SaveModule`, `ReorderModules`, `DeleteModule`, `Assign`; mọi kiểm tra quyền và dữ liệu nằm ở `UiHrModules`.

**Quy tắc**

- Tên phân hệ: bỏ khoảng trắng thừa, tối đa 100 ký tự, không chứa `<` `>` hoặc ký tự điều khiển, không trùng tên đã có. Tối đa 100 phân hệ.
- Phân hệ đang ẩn không hiện trong Builder (`ListActive`); màn hình và mẫu thuộc phân hệ đó hiện như chưa gán cho tới khi phân hệ được hiện lại.
- `AssignScreen` chỉ nhận khóa có trong thư viện; `AssignTemplate` chỉ nhận mẫu đang trong thư viện chung.
- Builder lấy dữ liệu qua `GetHrModules` (phân hệ đang dùng) và `UiHrModules.Annotate`, hàm gắn `ModuleId` / `Module` vào danh sách màn hình chuẩn và `ModuleId` / `ModuleName` vào mẫu của team. Chưa chạy script thì `Annotate` bỏ qua, hộp Màn hình chuẩn chạy như cũ và không có ô lọc.
- Gửi mẫu chung: hộp gửi có ô **Phân hệ** (không bắt buộc), thay ô chữ tự do "Nhóm chức năng". `SubmitTemplate(..., moduleId)` gọi `SetSubmittedTemplateModule`, chỉ ghi khi phân hệ đang dùng và yêu cầu đúng là của người gửi. Yêu cầu cũ chưa có phân hệ vẫn hiện nhãn `Category` đã nhập trước đây.
- Nhật ký thao tác: `UiHrModule.Save` (thêm, sửa, đổi thứ tự), `UiHrModule.Delete`, `UiHrModule.Assign`.

**Kiểm thử**: `BADesign.Tests/UiHrModulesTests.cs` (11 ca cho phần kiểm tra tên, khóa màn hình, thứ tự); `Tools/page-checks/hr-modules.js` (33 kiểm tra trên trang thật: thêm, tên trùng, tên chứa mã HTML, đổi tên, ẩn / hiện, đổi thứ tự, gán màn hình, id không tồn tại, người chưa đăng nhập, hộp Màn hình chuẩn, xóa, chế độ sáng, tiếng Anh kể cả tên, nhóm và ô tìm của màn hình chuẩn; dữ liệu thử tên `TEST Phân hệ…` được xóa ở cuối); kịch bản `modules` và `teamflow` của `Tools/builder-harness` (ô lọc, thẻ, tìm theo tên phân hệ, chọn phân hệ khi gửi mẫu).

### 13.11 Mở file HTML (`builder-html.js`)

BA nhờ AI vẽ màn hình thành file HTML (mockup). File đó mở bằng trình duyệt thì chỉ xem được, muốn sửa lại phải nhờ AI vẽ lại. Chức năng này đổi file thành control của UI Builder để BA chỉnh tiếp bằng kéo thả.

**Cách dùng.** Hộp **Mở file HTML** (`builderTemplates.openHtml`, phần tử `#bstHtml`; dựng bằng `buildFileDialog`, dùng chung với hộp Mở file draw.io): chọn file hoặc kéo thả. Ô **Màn hình** liệt kê **Tất cả (trang chính + N popup)** (mặc định), **Trang chính** và từng **Popup: tiêu đề**; ô **Kiểu control** chọn Core hoặc ESS; ô **Tài nguyên ngoài** chọn **Không tải** (mặc định) hoặc **Cho phép tải**. Bên dưới là hình phác thảo, số control, ghi chú, rồi hai nút **Mở thành thiết kế mới** và **Chèn vào thiết kế này**. Chọn Tất cả thì trang chính nằm trên, các popup xếp thành hàng bên dưới, cách nhau 40px, hết chỗ thì xuống hàng (`arrange`). Ngoài Builder, `openHtml` chuyển tới `Builder?htmlfile=1`; Builder mở hộp rồi xóa tham số khỏi địa chỉ. Thả file `.html` / `.htm` vào bất kỳ đâu trong Builder cũng mở hộp với file đó. File tối đa 5 MB, tối đa 40 màn hình. Giá trị mẫu trong ô nhập không được đưa vào thiết kế, như Chụp từ HRM (mục 13.6).

**Khung cách ly** (`builderHtml.read(markup, { source, ui, network, timeout })`, trả về Promise của `{ screens: [{ kind, title, screen }], all, skipped, external }`). File HTML là dữ liệu không tin cậy và có script, nên nó không bao giờ được chèn vào trang Builder:

- File được dựng trong một `iframe sandbox="allow-scripts"` không có `allow-same-origin`: khung có nguồn riêng, script của file không đọc được trang Builder, cookie hay bộ nhớ trình duyệt của HR Helper.
- Nội dung khung (`srcdoc`) gồm thẻ meta chính sách bảo mật (CSP), mã của `builder-capture-page.js`, đoạn chạy (`runner`), rồi mới tới nội dung file. Mã của công cụ đứng trước để thẻ chưa đóng trong file không nuốt mất nó và để CSP có hiệu lực trước mọi thẻ của file.
- CSP mặc định: `default-src 'none'`, chỉ cho script và style viết ngay trong file, ảnh `data:` / `blob:`; không yêu cầu mạng nào được gửi đi, form và khung con bị chặn. **Cho phép tải** thêm `http: https:` cho script, style, ảnh và font (file dùng CDN như Tailwind, Bootstrap); `fetch` / XHR vẫn bị chặn. Mỗi file mới mở bắt đầu lại ở **Không tải**.
- Kết quả về qua `postMessage` kèm một mã ngẫu nhiên; trang chỉ nhận thông điệp của đúng khung đó và đúng mã. Kết quả vẫn là dữ liệu không tin cậy (script của file có thể thay hàm đọc và trả về bất cứ gì): `tidy` chỉ giữ cấu trúc cần dùng và cắt tiêu đề còn 200 ký tự; mỗi màn hình đi qua `builderCapture.normalize` trước khi hiển thị và trước khi thành control; chữ lấy từ file chỉ được gán bằng `textContent`.
- Khung rộng 1600×900, nằm trong vùng nhìn thấy nhưng trong suốt và không nhận chuột (`.bst-html-frame` trong `builder-templates.css`), bị gỡ ngay khi đọc xong, khi lỗi, hoặc khi hết 20 giây (“File không dựng xong sau 20 giây nên chưa đọc được.”).
- Khung chạy trong tiến trình riêng của trình duyệt (đo trên Chromium): file có vòng lặp không dừng không làm treo trang Builder, hết thời gian chờ thì khung bị gỡ. Cũng vì vậy kích thước của khung được báo cho nó sau, có lúc sau cả sự kiện `load`; trước lúc đó vùng nhìn của khung là 0×0 và mọi tọa độ đọc được bằng 0. `runner` chờ `innerWidth` / `innerHeight` khác 0 (sự kiện `resize`) rồi mới đọc. Tài nguyên ngoài tải mãi không xong thì bắt đầu đọc sau 4 giây kể từ `DOMContentLoaded`.

**Đọc theo cấu trúc** (`__baCaptureScreens({ ui })` trong `builder-capture-page.js`). `captureDocument(doc, ui, withData, plan)` chạy ở chế độ cấu trúc khi có `plan = { scope, popup, ignore }`; không có `plan` thì chạy như cũ, nên kết quả Chụp từ HRM không đổi. Chế độ này nhận diện theo kiểu trình bày, hình học và `role`, không theo tên class của một bộ giao diện nào:

- Trang chính: vùng `main` / `[role=main]` lớn nhất (không có thì `body`). Bỏ `nav`, `[role=navigation]`, `[role=banner]` và `header` / `footer` / `aside` ngay dưới `body`.
- Popup: `[role=dialog]`, `[role=alertdialog]`, `<dialog>`, và con duy nhất của một lớp phủ kín trang đang ẩn (`findDialogs`). Từng popup được hiện ra tạm thời (`reveal`: gỡ `hidden`, đặt `open`, đặt lại `display` / `visibility` / `opacity` trên đúng phần tử đang ẩn), đọc, rồi trả về như cũ. Tiêu đề lấy theo `aria-labelledby`, heading đầu tiên, hoặc `aria-label`. Popup không hiện ra được có tên trong ghi chú của hộp thoại. Bộ đọc ghi thêm `head` cho popup (`popupBox`, `joinHead`): mép dưới của dải tiêu đề, cộng dải nút là phần tử nhìn thấy kế ngay sau dải đó (chỉ một dải nút); popup không có tiêu đề thì `head = 0`; tiêu đề không nằm trong một dải ở mép trên popup thì không ghi `head`.
- Tab: `[role=tablist]` và `[role=tab]`. Từng tab được bấm lần lượt để đọc nội dung (`captureEveryTab`; `calm` chờ hiệu ứng chạy xong), các lần đọc gộp bằng `__baMergeTabs`, rồi tab ban đầu được mở lại. Tab là liên kết sang trang khác thì không bấm.
- Lưới: `table`, hoặc các hàng `div` cùng mép cột nằm sát nhau (`collectRowGrids`). Nhận hàng tiêu đề (không có ô nhập; nền hoặc độ đậm khác hàng dưới), dòng lọc (từ 2 ô nhập), cột chọn, cột View / Edit / Delete, cột tag (nút màu), phân trang ngay bên dưới. Dấu sắp xếp (▲ ▼) không thuộc tên cột. Lưới rộng hơn khung cuộn bọc nó thì lấy bề rộng của khung. Các dòng thẳng cột mà không có hàng tiêu đề vẫn là chữ.
- Ô nhập: `input`, `select`, `textarea`, và khung có viền đủ 4 cạnh (`collectBoxFields`): chữ bên trong dạng ngày thành ô ngày, có mũi tên hoặc biểu tượng ở mép phải thành ô chọn, cao trên 48px thành memo, còn lại thành ô chữ. Nền xám nhạt, `aria-disabled` hoặc `aria-readonly` thành chỉ đọc. Khung ôm sát chữ (thẻ trạng thái) vẫn là chữ; khung có chữ và con trỏ bấm được thành nút.
- Nút: nút có nền hoặc viền là nút rời; các nút phẳng cùng hàng thành toolbar; dải nút phẳng nằm ngay trong hộp popup là thanh nút của popup, kể cả khi chỉ có một nút (`isPopupBar`), và không bị gộp vào lưới bên dưới.
- Khối: khung có viền hoặc bóng và có dải tiêu đề (`headingBar`) thành Section (ESS: collapsible section), không có tiêu đề thành group box; `fieldset` thành group box. Khung chỉ bọc một lưới: Core gộp tiêu đề và nút của khung vào lưới (`framesOneGrid`, `foldGridHeaders`); ESS giữ Section, lưới và toolbar nằm trong nó.

**Ghi chú trong hộp thoại** (`htmlNotes`): số tài nguyên ngoài chưa được tải kèm gợi ý chọn Cho phép tải; số popup không mở ra được và tên của chúng. File không có control nào đọc được (`screens` rỗng) hiện “Không tìm thấy control nào trong file này.” cùng hai ghi chú đó, để BA biết nên thử Cho phép tải (mockup dựng toàn bộ nội dung bằng script từ CDN sẽ rơi vào trường hợp này).

**Số đo** (hai file mockup thật do AI vẽ, máy dev, không tải tài nguyên ngoài; kiểu Core đo trên harness và trên `localhost:3393` cho cùng kết quả, kiểu ESS chỉ đo trên harness). File 199 dòng: đọc 0,45 giây; kiểu Core 16 control (2 lưới 7 cột có dòng lọc, popup có thanh OK / Cancel với 6 ô chọn và 1 memo), kiểu ESS 18 control. File 576 dòng: đọc 2 giây; kiểu Core 99 control (tab control có nội dung ở cả hai tab, 5 lưới, 3 Section, 8 popup đều đọc được), kiểu ESS 105 control. Kiểu Core không có cặp control cùng cấp nào đè nhau; kiểu ESS có 3 cặp nút đè nhau 6 đến 8px ở phần đệm trong suốt của control, mặt nút cách nhau 4 đến 6px.

**Giới hạn**

- Popup bị ẩn theo cách không gỡ được (ví dụ `display: none !important` trong stylesheet, hoặc đẩy ra ngoài màn hình) không đọc được; hộp thoại nêu tên nó.
- Nội dung chỉ có sau khi mockup tự chạy script (đổ dữ liệu vào popup lúc bấm nút) thì không có trong kết quả. Popup ẩn hiện từng phần theo script thì mọi phần cùng hiện.
- Trang thứ hai nằm ẩn trong cùng file (không phải popup) không được đọc. Lớp phủ đang hiện mà không khai báo `role` không tách được khỏi trang chính.
- Lưới dựng bằng CSS grid không có phần tử cho từng hàng chưa được nhận. Lịch đang mở có thể thành nhiều ô nhập.
- Ô có mũi tên ở mép phải luôn thành ô chọn, kể cả khi nhãn của nó là ngày. Thanh tab của ứng dụng không khai báo `role=tablist` thành các nhãn rời.
- **Cho phép tải** chạy cả script từ CDN, vẫn trong khung cách ly; chỉ nên bật với file biết rõ nguồn. Script chặn việc dựng trang mà tải mãi không xong (ví dụ CDN bị mạng công ty chặn) làm hết 20 giây; khi đó chọn lại Không tải.
- Khung vẫn tự chuyển sang địa chỉ khác được (khi đó cũng hết thời gian chờ và khung bị gỡ); CSP chỉ ràng buộc nội dung của file.
- Chỉ thử trên Chromium. Trình duyệt không chạy khung cách ly trong tiến trình riêng thì file có vòng lặp không dừng có thể làm treo tab.

**Kiểm thử**: kịch bản `htmlimport` của `Tools/builder-harness` (44 bước, 39 kiểm tra, file mẫu `html-mockup-page.html`): danh sách màn hình và xem trước từng màn hình; khung cách ly và việc file tự báo không ra được trang Builder, bộ nhớ, cookie, mạng; phần đầu trang và menu bị bỏ; ô nhập giả, lưới từ hàng `div`, bảng không có `thead`, tab thứ hai; bốn kiểu popup ẩn; thanh nút của popup nằm trọn trong dải của popup Builder và nội dung giữ khoảng cách tới phần đầu; mở mới và chèn kiểu ESS cùng Undo / Redo; Cho phép tải; khung nhận kích thước muộn; tài nguyên tải mãi không xong; hết thời gian chờ; file giữ bộ xử lý bận; file hỏng thẻ; file thay hàm đọc để trả về mã HTML; file không có control; file trên 5 MB; Escape; thả file; nút trong hộp Màn hình chuẩn; địa chỉ `?htmlfile=1`. `node Tools/ui-capture/test/convert.test.js` có ca cho `headroom` của popup, của ESS section và cho ESS section trong tab. `Tools/page-checks/home.js` kiểm nút **Từ file HTML**.

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
- **Xuất ảnh ▾ → Bảng mô tả field cho SRS**: `builderSpec.collect()` duyệt theo khối chứa (popup, tab, group, section, hai vùng của Splitter, lưới) và thứ tự đọc (trên xuống, trái sang). Cột: STT, Khu vực, Tên field, Loại control, Bắt buộc, Chỉ đọc, Mặc định / danh sách, Kiểu dữ liệu, Mô tả. Gồm field, nút, cột lưới, nút toolbar; Label, Image và Splitter (`LAYOUT_ONLY`) chỉ có khi tick ô ở đầu hộp; field nằm trong hai vùng của Splitter thì luôn được liệt kê, ở cùng khu vực với Splitter (vùng 1 trước, vùng 2 sau).
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

- `builder.sanitizeControls(list)` chạy ở mọi cửa nạp (`loadControlFromServer`, `loadConfig`, `restoreFromJson`, `builderSnippet.instantiate`, `addTemplateToCanvas`): bỏ phần tử không phải object và control có `type` không hợp lệ; thay `id` không hợp lệ (chỉ nhận chữ, số và `_ . : -`) rồi sửa liên kết `parentId`, `tabPageId`, `groupId`; xóa `ftype`, `uiMode`, `dock` không hợp lệ; thay id cột và id nút của lưới ESS.
- Chữ của thiết kế đưa vào HTML phải qua `builder.escapeHtml` hoặc `.text()` / `textContent`. Đường vẽ control và Danh sách control đã theo quy tắc này (tiêu đề group box / section, chữ checkbox / radio, bảng multiselect, biểu tượng nút, ảnh).
- Phía server, `UiTemplateLibrary.Submit` từ chối thiết kế có `id` / `type` không hợp lệ hoặc có chữ giống mã HTML, script.
- Phần thuộc tính của mọi loại control dựng qua `builderProps` (mục 15.11): giá trị đưa vào `value`, nội dung `textarea` và chữ của nhãn đều được mã hóa trong helper.
- Các đường chỉ chạy khi người mở thiết kế thao tác cũng theo quy tắc trên (rà và sửa ngày 2026-11-25, kịch bản `unsafeactions`): hộp "Đưa GridView vào Popup / ESS Section" dựng từng `<option>` bằng `.val()` / `.text()`; `builder.showConfirm` nhận **chữ thường** cho tiêu đề, câu hỏi và hai nút (đặt bằng `.text()`), nơi gọi không tự mã hóa trước; lúc xuất ảnh, chữ của tag ESS chép sang bản xem trước qua `builder.escapeHtml`; biểu tượng nút ESS chỉ dựng ở một hàm `essButtonIcon` của `control-field.js` (`addClass` / `attr("src")`), dùng cho cả đường vẽ và đường đổi biểu tượng. Trước ngày đó tiêu đề popup, tiêu đề section và chữ của tag trong thiết kế của người khác chạy được script ở ba chỗ đầu, và một template có `type` chứa mã HTML chạy được khi bấm "Dùng".
- Tìm chỗ còn sót: tìm chuỗi HTML được ghép với một giá trị không qua `escapeHtml` / `esc`, và các lệnh `.html(biến)`, `.append(chuỗi)`, `innerHTML =`. Lần rà ngày 2026-11-25 trên `Scripts/builder` và các trang `Home`, `Builder`, `TemplateRequests`, `TemplateWorkflow`, `HrModules` không còn chỗ nào nhận dữ liệu của thiết kế.

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
- Nút **Từ màn hình chuẩn** mở hộp Màn hình chuẩn (`builderTemplates.openGallery()`), nút **Từ file draw.io** mở Builder với hộp Mở file draw.io (`/Builder?drawio=1`, mục 13.9), nút **Từ file HTML** mở Builder với hộp Mở file HTML (`/Builder?htmlfile=1`, mục 13.11), nút **Thiết kế mới** mở Builder với trang trắng. Bốn nút nằm cùng hàng với hai tab khi đủ chỗ; hẹp hơn thì cả nhóm nút xuống dưới hai tab, hẹp nữa (vùng nội dung dưới khoảng 565px) thì các nút tự xuống dòng (`.hd-head-actions` có `flex-wrap`), không tràn khỏi trang.

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
- Chữ giao diện viết tiếng Việt trong trang; bản tiếng Anh nằm ở nhóm `ui-builder-home` của `Scripts/i18n/ba-i18n.en.js` (xem [13-Song-ngu.md](13-Song-ngu.md)). Hộp Màn hình chuẩn và hộp Chụp từ HRM mở trên trang này dùng `builder-templates.js` và `builder-capture.js`; hai file này và danh mục `App_Data/BuilderTemplates/index.json` nằm trong nhóm `ui-builder-home` của công cụ rà chữ, nên ở chế độ English cả hai hộp được dịch (mục 13.1). Trước ngày 26/11/2026 `builder-templates.js` không được rà và hai hộp còn khoảng 100 chữ tiếng Việt.
- Biểu tượng là SVG vẽ sẵn trong bảng `ICONS` của trang, không nạp thêm thư viện.

**Kiểm thử**: `Tools/page-checks/home.js` chạy bằng Playwright trên trang thật sau khi đăng nhập (cách chạy ở `Tools/page-checks/README.md`); unit test của `UiDesignCatalog` nằm ở `BADesign.Tests/UiDesignCatalogTests.cs`.
