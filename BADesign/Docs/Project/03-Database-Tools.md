# Database Tools

`Pages/DatabaseSearch.aspx`. Quản lý SQL Server demo: quét, backup, restore, làm sạch dữ liệu, shrink log, xóa database. Job nặng chạy nền, không khóa trình duyệt.

## Server

Thêm, sửa, xóa server (tên, port, user, password, tên hiển thị, thư mục backup, thư mục restore) và chọn role được dùng server ngay trong cùng form. Password không hiện lại trên danh sách. Quyền Manage Servers và Server Access theo role quyết định server nào user thấy.

Form có ba nút hỗ trợ thiết lập (`ProbeServer`):

- **Tự dò:** điền thư mục backup mặc định của SQL Server.
- **Kiểm tra cấu hình:** chỉ đọc. Thử kết nối, báo phiên bản, quyền sysadmin, SQL Server có thấy thư mục backup và thư mục restore không, máy web có đọc được thư mục restore không.
- **Thử ghi file:** SQL Server backup thử database `model` (COPY_ONLY) vào thư mục backup rồi xóa file, để chắc tài khoản dịch vụ SQL có quyền ghi.

Danh sách server hiện nhãn `Backup ✓`, `Restore ✓` hoặc `Chưa cấu hình` để biết server nào dùng được cho việc gì. Form Backup và Restore khóa các server chưa có thư mục tương ứng.

## Danh sách database

Load database của một server hoặc tất cả server. Tải tất cả là một request; server kiểm tra song song nhiều server và nhiều database (`ListHrmDatabases`), và nhớ database nào đã xác nhận là HRM theo ngày tạo và ngày restore gần nhất (`msdb.dbo.restorehistory`; `create_date` không đổi khi restore đè), nên lần tải sau chỉ mất vài giây. Bộ nhớ này nằm trong tiến trình web và mất khi web khởi động lại. Connection string không copy tự do. Log size để quyết định shrink.

Cột **Restore / Làm sạch** cho biết ai restore, lúc nào, và trạng thái dữ liệu: `Đã làm sạch`, `Làm sạch chưa trọn` (lần gần nhất có lỗi hoặc cảnh báo), `Chưa làm sạch` (chưa có lần làm sạch nào sau lần restore gần nhất).

## Backup

Một form: chọn server, lọc và tick database, bấm Backup. Mỗi database ra một file `{tên_db}_{ngày_giờ}.bak` trong thư mục backup của server. Chia backup thành nhiều file, nén, copy-only, verify, checksum, ngày hết hạn và shrink log nằm trong **Tùy chọn nâng cao**. Job ghi vào bảng BaJob, tiến độ lên chuông.

## Restore

Wizard ba bước (`Scripts/ba-db-restore.js`):

1. **Chọn file backup:** chọn server đích và file `.bak` trong thư mục restore. Máy web không đọc được thư mục thì danh sách file lấy qua SQL Server. Chọn xong tool đọc header file (`GetRestorePrecheck`): database gốc, ngày backup, phiên bản SQL so với server đích, dung lượng đĩa, file có đủ bộ không (backup chia nhiều file). File không đạt thì không đi tiếp được; nếu lệch phiên bản, tool gợi ý server phù hợp.
2. **Database đích:** tên được gợi ý theo `{database gốc}_{ngày backup}`. Tool kiểm tra tên (`CheckRestoreTarget`): tạo mới, hay đã tồn tại. Ghi đè chỉ cho Admin, người có quyền Connect mọi DB, hoặc người đã restore database đó, và phải tick xác nhận. Recovery state và shrink log nằm trong **Tùy chọn nâng cao**.
3. **Làm sạch dữ liệu:** bắt buộc với mọi user. Chỉ Super Admin hoặc người có quyền Manage Servers thấy hai tùy chọn **Giữ lương thật** và **Bỏ qua làm sạch**; server kiểm tra lại quyền này (`StartRestoreCore`).

Server kiểm tra lại file backup trước khi tạo job (`ReadBackupHeader`), nên file bị xóa giữa chừng không sinh ra job lỗi.

Restore luôn được đưa vào hàng đợi job và chạy bằng `ExecuteRestoreJob` trong bộ chạy job, ngay trong site hoặc trong Worker tùy `UseBackgroundWorker` (xem `11-Job-nen-va-thong-bao.md`); trang chỉ tạo job rồi theo dõi qua SignalR hoặc poll. Hủy job khi còn chạy. Chẩn đoán job khi fail (`GetRestoreJobDiagnostics`).

Thư mục backup/restore là path SQL Server đọc ghi được (thường share), không phải path của IIS. Xem `Docs/Backup-Restore-Paths.md`.

## Làm sạch dữ liệu

Code ở `Helpers/Database/` (`DbSanitizer`, `DbSanitizeCatalog`, `DbSanitizeSql`). Chạy ngay sau restore, hoặc chạy riêng cho một database có sẵn từ nút **Làm sạch** trên danh sách (`StartSanitizeDatabase`, job loại `HRHelperMultiDbReset`). Các bước:

| Bước | Việc làm |
|------|----------|
| Chuẩn bị | Đọc cấu trúc database, chuyển recovery model sang SIMPLE. Database không có bảng `Security_Users` hoặc `Staffing_Employees` (không phải cấu trúc HRM 5, ví dụ HRM thế hệ cũ với bảng `HR_`, `PR_`) bị báo lỗi "CHƯA sạch": chỉ email, điện thoại dạng thường được thay |
| Chặn kết nối ra ngoài | `Setting_EmailServers` và `Setting_FolderConfigurations` trỏ về SMTP/SFTP thử nghiệm trong App Settings (mật khẩu lưu dạng mã hóa); xóa hàng đợi mail, lịch sử gửi mail, token và chi tiết token, mã xác thực, lịch sử mật khẩu, bảng tạm import nhân viên; xóa khóa tích hợp |
| Tài khoản đăng nhập | Mọi user về mật khẩu chung (kiểu hash dò theo dữ liệu đang có), mở khóa, bỏ AD, đổi `UserEmailAddress` (và `Email` nếu đang là địa chỉ email); xóa định danh SSO và tính lại chữ ký user |
| Email, điện thoại dạng thường | Mọi cột tên chứa `Email` hoặc `Phone`: chỉ thay ô đang có giá trị; ô đang chứa chuỗi mã hóa (bảng chưa có trong danh mục) được đưa về rỗng. Bỏ qua `INS_Hospitals` (dữ liệu tham chiếu) |
| Email, điện thoại, lương cơ bản mã hóa | Mã hóa lại theo từng nhân viên: email, điện thoại, mật khẩu phiếu lương; lương cơ bản thay bằng số giả ngẫu nhiên trong khoảng cấu hình, giống nhau ở `Staffing_Transactions`, `Staffing_TransactionRequests`, `Staffing_TransactionExportDatas`, `SET_EmployeeTransactionHistories`. Bảng cuối lưu mỗi cột là một danh sách nối bằng `{{|}}`: từng phần tử lương được thay riêng, giữ nguyên số phần tử; phần tử phụ cấp được đưa về rỗng |
| Số liệu lương, thuế, bảo hiểm | Đưa về rỗng các cột mã hóa của bảng PAY_, INS_, BEN_ và bảng động `PAY_MasterPayroll…`; `PAY_MasterEmployeeSalaryDetails.JsonSalary` thành `[]`. Bỏ qua khi chọn Giữ lương thật |
| Dữ liệu mã hóa khác | Bản nháp hồ sơ ESS, chữ ký ngoài, nội dung chat; giá trị audit trail ở dòng có cờ mã hóa (`Setting_AuditTrailHierarchy.IsEncrypted = 1`) |

Bảng từ 300.000 dòng chạy theo lô theo khóa chính (int, bigint hoặc uniqueidentifier); các bảng chạy song song (mặc định 4). Giá trị ghi vào được cắt theo độ dài cột; chuỗi mã hóa không vừa cột thì ghi rỗng thay vì làm hỏng cả lệnh. Kết quả từng bước (số dòng, thời gian, cảnh báo) lưu trong `BaJob.Payload.sanitizeReport`, hiện ở chi tiết thông báo và trong email kết quả; mỗi lần chạy ghi một dòng `BaDatabaseResetLog`.

Chưa xử lý: họ tên, số giấy tờ, tài khoản ngân hàng, địa chỉ dạng thường; khóa PGP trong `Setting_FolderConfigurations`; database không phải cấu trúc HRM 5.

Hai nguồn sau được giữ nguyên theo quyết định ngày 13/11/2026 (tạm chưa xóa, sẽ phát triển sau), nên bản restore vẫn còn dữ liệu nhạy cảm dạng thường ở đó:

- Giá trị audit trail dạng thường trong `Setting_AuditTrailHierarchy` (`StringValue`, `StringOldValue` ở dòng không có cờ mã hóa): có thể chứa khóa API, mật khẩu mặc định, email của khách.
- Các bảng lịch sử migrate `MIG_History_*`: lương, tài khoản ngân hàng, họ tên và script insert dạng thường. Chỉ các cột tên chứa `Email` hoặc `Phone` được thay như mọi bảng khác.

Danh mục bảng và cột nằm ở `DbSanitizeCatalog`. Khi HRM thêm bảng chứa dữ liệu mã hóa, bổ sung vào đó. Cách tìm chỗ sót: restore một database thật rồi quét mọi cột chuỗi tìm giá trị còn dạng mã hóa hoặc còn giống email.

## Shrink và xóa

Shrink log về dung lượng đích. Xóa database là quyền riêng, ghi audit.

## Bulk reset

Reset hàng loạt nhiều database theo kịch bản email/phone/company, cũng đi qua job nền.

## Ý tưởng

Web không giữ connection lâu và không chạy restore trong request HTTP. Mọi thao tác dài là một BaJob. UI chỉ phát lệnh, theo dõi, và hủy.
