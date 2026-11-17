# Thư viện mẫu UI dùng chung và quy trình duyệt

BA gửi một thiết kế đẹp làm mẫu chung. Mẫu đi qua một quy trình duyệt nhiều bước theo bộ phận của người gửi. Mẫu được duyệt xuất hiện trong hộp **Màn hình chuẩn** của UI Builder, nhóm **Mẫu của team**, kèm tên người gửi và người duyệt.

"Chia sẻ" (Public) của một thiết kế là việc khác: BA tự bật, không qua duyệt, người khác thấy thiết kế đó trong danh sách thiết kế công khai. Chỉ thư viện chung mới cần duyệt.

## Thành phần

| Phần | File |
|---|---|
| Bảng và quyền | `Scripts/AddUiTemplateLibrary.sql` |
| Nghiệp vụ, truy vấn, email | `Helpers/UiTemplateLibrary.cs` |
| Trang định nghĩa quy trình | `Pages/TemplateWorkflow.aspx` (`/TemplateWorkflow`) |
| Trang yêu cầu và thư viện | `Pages/TemplateRequests.aspx` (`/TemplateRequests`) |
| Page method cho Builder | `Pages/Builder.aspx.cs`: `GetTemplateSubmitInfo`, `SubmitTemplate`, `GetTeamTemplates`, `LoadTeamTemplate`, `LoadTemplateRequest`, `ReviewTemplateRequest` |
| Hộp gửi mẫu, màn duyệt | `Scripts/builder/builder-review.js`, style trong `Content/builder-features.css` |
| Nhóm Mẫu của team trong hộp Màn hình chuẩn | `Scripts/builder/builder-templates.js` (`teamItem`, khóa `team-<RequestId>`) |
| Phân hệ HR của mẫu | `Helpers/UiHrModules.cs`, `Pages/HrModules.aspx`, `Scripts/AddUiHrModule.sql` (xem [01-UI-Builder.md](01-UI-Builder.md), mục 13.10) |
| Menu | `BaSidebar.ascx`: **Mẫu UI dùng chung** (có số việc chờ duyệt), **Quy trình duyệt mẫu UI**, **Phân hệ HR** |

## Dữ liệu

| Bảng | Ý nghĩa |
|---|---|
| `UiTemplateWorkflow` | Quy trình: tên, mô tả, `IsDefault`, `IsActive` |
| `UiTemplateWorkflowRole` | Role (bộ phận) dùng quy trình. Mỗi role chỉ thuộc một quy trình |
| `UiTemplateWorkflowStep`, `UiTemplateWorkflowStepApprover` | Các bước theo thứ tự. Mỗi bước là một trong hai kiểu: `UseRoleManager = 1` (người duyệt là sếp của role người gửi, không kèm người nào khác) hoặc danh sách người cụ thể (một người duyệt là đủ) |
| `UiRoleManager` | Sếp của từng role (role - user), khai ở trang Phân quyền. Mỗi role một sếp: unique index `UX_UiRoleManager_Role` |
| `UiTemplateRequest` | Một yêu cầu gửi mẫu: bản chụp `JsonConfig` lúc gửi, ảnh thu nhỏ riêng, người gửi, role lúc gửi, trạng thái, bước hiện tại, người kết thúc, `IsInLibrary`, `ModuleId` (phân hệ HR người gửi chọn; quản trị đổi được ở trang Phân hệ HR) |
| `UiTemplateRequestStep`, `UiTemplateRequestStepApprover` | Bản chép các bước và người duyệt lúc gửi, cùng kết quả từng bước (ai, lúc nào, ý kiến) |

Trạng thái yêu cầu: `Pending`, `Approved`, `Rejected`, `Cancelled`. Trạng thái bước: `Waiting`, `Pending`, `Approved`, `Rejected`, `Auto`.

Mẫu trong thư viện là yêu cầu có `Status = Approved` và `IsInLibrary = 1`. Thông tin người gửi, người duyệt, thời điểm nằm ngay trên yêu cầu và các bước của nó.

## Quyền

- Gửi mẫu: người có quyền `UIBuilder` và là chủ thiết kế.
- Duyệt: người có tên trong bước đang chờ của yêu cầu. Người có quyền `UITemplateAdmin` (hoặc Super Admin) duyệt thay được. Không ai duyệt được yêu cầu do chính mình gửi.
- Định nghĩa quy trình, xem mọi yêu cầu: `UITemplateAdmin` hoặc Super Admin.
- Khai sếp của role: chỉ Super Admin (trang Phân quyền).
- Gỡ mẫu khỏi thư viện: `UITemplateAdmin`, Super Admin, hoặc chính người gửi.
- Xem một yêu cầu: người gửi, người duyệt của bất kỳ bước nào, quản trị mẫu; mẫu đang trong thư viện thì mọi người có quyền `UIBuilder`.

Mọi kiểm tra nằm ở server (`UiTemplateLibrary`). Trang chỉ ẩn nút theo `CanAct`, `CanCancel`, `CanRemove` do server trả.

## Luồng

1. **Chọn quy trình** (`ResolveWorkflow`): quy trình đang dùng có gán role của người gửi; không có thì quy trình mặc định; không có nữa thì báo chưa có quy trình. Role của người gửi đọc từ database lúc gửi (`GetUserRoleId`), không theo phiên đăng nhập. Người duyệt của một bước do `StepApproverIds` quyết định: bước `UseRoleManager` lấy đúng sếp của role người gửi (`UiRoleManagers.GetActiveManagerId`), bước còn lại lấy những người cụ thể đã khai. Ví dụ quy trình 3 bước cho BA: bước 1 là sếp của role (BA chuẩn và BA dự án có sếp khác nhau), bước 3 là một người cụ thể nắm chung cả hai nhóm. Người duyệt đã bị khóa tài khoản được bỏ khỏi bước; bước nào không còn người duyệt đang hoạt động, hoặc cần sếp mà role chưa khai sếp, thì không gửi được và người gửi nhận thông báo nêu số bước (`WorkflowProblem`).
2. **Gửi** (`Submit`): thiết kế phải đã lưu và không còn thay đổi chưa lưu (trình duyệt chặn), phải là của người gửi, loại page, JSON hợp lệ, tối đa 3000 control và 8 MB, `id` / `type` hợp lệ, không có chữ giống mã HTML. Một thiết kế chỉ có một yêu cầu đang chờ. Server chép JSON và ảnh thu nhỏ (`template-<guid>.png`), chép các bước của quy trình vào yêu cầu. Hộp gửi có ô **Phân hệ** (không bắt buộc, danh sách lấy từ `GetHrModules`), thay ô chữ tự do "Nhóm chức năng" trước đây; gửi xong `SubmitTemplate` ghi phân hệ bằng `UiHrModules.SetSubmittedTemplateModule`. Yêu cầu cũ chưa có phân hệ vẫn hiện nhãn `Category` đã nhập.
3. **Tự duyệt** (`PlanAdvance`, `Advance`): đi lần lượt các bước còn lại; bước nào có người gửi, hoặc người vừa duyệt bước trước, trong danh sách người duyệt thì ghi `Auto` kèm `ActedByUserId` là người đó, rồi xét tiếp bước sau. Gặp bước không có ai trong hai người này thì bước đó thành `Pending`. Mọi bước còn lại đều tự duyệt thì mẫu vào thư viện ngay. Người quản trị duyệt thay không có tên trong bước sau thì bước sau không tự duyệt.
4. **Duyệt** (`Review`): khóa dòng yêu cầu, kiểm tra người duyệt, cập nhật bước với điều kiện `Status = Pending` (hai người cùng bấm thì người sau nhận thông báo), rồi sang bước kế hoặc kết thúc. Từ chối bắt buộc có lý do và kết thúc yêu cầu.
5. **Vào thư viện**: `IsInLibrary = 1`. Mẫu cũ đã duyệt của cùng thiết kế và cùng người gửi bị thay (`IsInLibrary = 0`, `ReplacedByRequestId`).
6. **Hủy** (`Cancel`): chỉ người gửi, khi còn chờ. **Gỡ** (`RemoveFromLibrary`): ghi `RemovedAt`, `RemovedByUserId`.

Sửa hay xóa quy trình không ảnh hưởng yêu cầu đang chờ, vì yêu cầu mang bản chép các bước của riêng nó.

## Email

Gửi nền bằng `Task.Run`, qua `EmailHelper.SendEmail` (SMTP ở Cài đặt ứng dụng). Thư bằng tiếng Việt.

| Lúc | Người nhận |
|---|---|
| Có yêu cầu mới, hoặc yêu cầu sang bước kế | Người duyệt của bước đang chờ |
| Bước cuối được duyệt | Người gửi |
| Bị từ chối | Người gửi, kèm lý do |

Mọi giá trị do người dùng nhập được `HtmlEncode` trước khi đưa vào thư; link dựng từ `UiAuthHelper.GetBaseUrlForEmail()` cộng `/Builder?reviewId=<id>`. User không có email thì bỏ qua. Lỗi gửi thư ghi log, không làm hỏng thao tác duyệt.

## Timeline

`GetRequest` trả `Timeline`: Gửi mẫu, từng bước (đã duyệt, từ chối, tự duyệt vì người gửi là người duyệt `auto`, tự duyệt vì cùng người duyệt với bước trước `autochain`, đang chờ kèm tên người duyệt, chưa tới), kết quả cuối, và việc gỡ khỏi thư viện nếu có. Trang **Mẫu UI dùng chung** hiện timeline trong hộp **Tiến trình**; màn duyệt hiện ở khung bên phải.

## Màn duyệt trong UI Builder

`/Builder?reviewId=<RequestId>` (`builderReview.start`):

- `builder.readOnly = true`, `body.ub-review`: ẩn Toolbox, phần thuộc tính, nút Lưu, Hoàn tác, Màn hình chuẩn, Chụp từ HRM, các nút căn chỉnh. Còn Xem trước, Xuất ảnh và zoom.
- Thiết kế hiện bằng `builder.restoreFromJson` từ bản chụp của yêu cầu, không phải từ thiết kế gốc của BA.
- Một lớp chắn trong suốt (`.ub-review-shield`) phủ vùng vẽ: nhận mọi thao tác chuột nên không kéo, chọn, sửa được control. Lăn chuột và kéo để cuộn; bấm vào tên tab hoặc nút mở / đóng ESS section thì lớp chắn chuyển tiếp để xem được mọi tab.
- Phím bị chặn ở pha capture, trừ zoom và Escape. Dán và thả tệp cũng bị chặn. `builder.isDirty` luôn trả `false` nên rời trang không bị hỏi.
- Khung bên phải: tên mẫu, người gửi, mô tả, ghi chú, timeline, ô ý kiến và hai nút **Duyệt**, **Từ chối** khi người xem được duyệt bước hiện tại.
- Khung rộng 320px (40px khi thu gọn). `.builder-wrapper` hẹp lại bằng `width: calc(100% - 320px)`, không bằng `margin`, vì wrapper đặt `width: 100%`; nhờ vậy vùng thiết kế dừng ở mép khung và **Vừa chiều rộng** tính theo phần còn nhìn thấy.

Trang không gọi page method lưu nào ở màn duyệt. Quyền xem và quyền duyệt do `LoadTemplateRequest` / `ReviewTemplateRequest` kiểm tra.

## Dùng mẫu

Hộp **Màn hình chuẩn** có bộ lọc **Mẫu của team**. Thẻ mẫu ghi phân hệ, người gửi, người duyệt, ngày duyệt; ô lọc phân hệ của hộp áp dụng cho cả mẫu của team. **Mở thành thiết kế mới** hoặc **Chèn vào thiết kế này** dựng control với id mới (`builderSnippet.instantiate`), nên thiết kế tạo ra độc lập với mẫu. Địa chỉ `/Builder?template=team-<RequestId>` mở thẳng một mẫu.

## Cài đặt

1. Chạy `Scripts/AddUiTemplateLibrary.sql`, `Scripts/AddUiBuilderControlVersion.sql` và `Scripts/AddUiRoleManagers.sql` trên database của tool; cả ba chạy lại được. Hai script đầu chỉ thêm bảng, một cột và một quyền. Script thứ ba đổi tên hiển thị của role `BA` thành "BA chuẩn" (chỉ khi tên còn là "Business Analyst"), thêm role `BA_PROJECT` "BA dự án" kèm bản chép quyền và server access của role BA lúc tạo, tạo bảng `UiRoleManager` và unique index mỗi role một sếp (role đang có nhiều sếp thì script chỉ báo, không xóa dữ liệu; để lại một sếp rồi chạy lại). Muốn dùng phân hệ HR thì chạy thêm `Scripts/AddUiHrModule.sql` sau `AddUiTemplateLibrary.sql` (script thêm cột `ModuleId` vào `UiTemplateRequest`; nếu lỡ chạy trước thì chạy lại một lần nữa).
2. Build và deploy web. Chưa chạy script thì web vẫn chạy: menu không báo lỗi, thư viện rỗng, việc lưu thiết kế không bị ảnh hưởng.
3. Ở **Phân quyền**: cấp `UI Builder` cho role cần dùng Builder; cấp **Quản trị mẫu UI** cho người quản lý quy trình.
4. Ở **Phân quyền**: tick quyền **UI Builder** cho các role được gửi mẫu (BA chuẩn, BA dự án), nếu không người gửi bị từ chối với thông báo "Bạn không có quyền dùng UI Builder". Ở thẻ **Sếp của từng Role**: chọn một sếp cho từng role (ví dụ BA chuẩn và BA dự án có sếp khác nhau). Ở **Users**: gán từng BA vào role BA chuẩn hoặc BA dự án.
5. Ở **Quy trình duyệt mẫu UI**: tạo ít nhất một quy trình, gán role, khai người duyệt từng bước (chọn **Sếp của role người gửi** hoặc **Người cụ thể** rồi thêm tên). Một quy trình mặc định có một bước "Sếp của role người gửi" là đủ cho mọi role đã khai sếp.

## Nhật ký thao tác

Mỗi thao tác ghi một dòng `UiUserActionLog` qua `UserActionLogHelper.Log`: `UiTemplate.Submit`, `UiTemplate.Approve`, `UiTemplate.Reject`, `UiTemplate.Cancel`, `UiTemplate.RemoveFromLibrary`, `UiTemplate.SaveWorkflow`, `UiTemplate.DeleteWorkflow`, `UiTemplate.SaveRoleManagers`; trang Phân hệ HR ghi `UiHrModule.Save`, `UiHrModule.Delete`, `UiHrModule.Assign`. Nhãn hiển thị và ô lọc của trang **Nhật ký thao tác** khai trong `AuditLog.aspx.cs` (`GetActionCodes`, `GetActionLabel`); thêm mã mới thì thêm ở cả hai nơi và trong từ điển nhóm `admin`.

## Kiểm thử

- Bộ kịch bản `teamflow` trong `Tools/builder-harness` chạy luồng gửi (có chọn phân hệ), màn duyệt, duyệt hai bước, từ chối và mở mẫu từ thư viện với server giả; `modules` kiểm ô lọc phân hệ và mẫu của team theo phân hệ; `teamchain` kiểm cách màn duyệt hiện bước tự duyệt khi cùng một người duyệt hai bước liền nhau.
- Unit test `BADesign.Tests/UiTemplateLibraryTests.cs`: `ValidateDesign` (nội dung mẫu) và `WorkflowProblem`. Build `BADesign.Tests.csproj` bằng MSBuild của Visual Studio rồi chạy `dotnet test BADesign.Tests\bin\Debug\net48\BADesign.Tests.dll --filter "FullyQualifiedName~UiTemplateLibraryTests"`.
- Phần server thật (quyền, giao dịch, email) phải thử trên trang thật bằng hai tài khoản: một người gửi, một người duyệt. Đặt tên dữ liệu thử là TEST và xóa sau khi kiểm (yêu cầu, phiên bản, ảnh `template-*.png` và `design-*.png` trong `Content/design-thumbs`).
- Trước khi chạy script trên database của tool, có thể chạy thử hai lần trên một database tạm LocalDB có các bảng nền `UiUser`, `UiRole`, `UiPermission`, `UiBuilderControl`.
