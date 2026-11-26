# Secret store check

Kiểm phần "Mã hóa dữ liệu nhạy cảm" (`BADesign/Helpers/Security/BaSecretStore.cs`) trên một instance LocalDB dựng tạm, không đụng database dùng chung của tool.
Script dựng bảng bằng chính các script của dự án (`AddBaAppSetting.sql` khối đầu, `AddBaDatabaseSearch.sql`, `AddBaJob.sql`), nạp giá trị giả
(20 mật khẩu server, 5 dòng cấu hình, 184 job đủ các loại), rồi gọi `Status` / `Switch` của `BaSecretStore` như nút trên trang Cài đặt.

## Kiểm gì

- Lúc tắt: đếm đúng số giá trị dạng thường, `ForStorage` / `PayloadForStorage` giữ nguyên.
- Cột `BaDatabaseServer.Password` còn hẹp: bật bị từ chối, câu báo nêu `AddStoredSecretEncryption.sql`, dữ liệu không đổi.
  Chạy script nới cột hai lần: cột thành `NVARCHAR(1024) NOT NULL`, dữ liệu không đổi.
- Lỗi giữa chừng khi chuyển job: mọi bảng và công tắc quay về như cũ.
- Bật: mọi giá trị bí mật được mã hóa và giải ra đúng từng ký tự; bộ chạy job (`BaJobSecrets.Read`) và trình duyệt (`BaJobView.Payload`) nhận cùng giá trị
  như trước; payload không có bí mật (restore, làm sạch, phân tích, xóa nhân viên, backup) không đổi; bật lần nữa không đổi gì.
- Bản cũ ghi một giá trị dạng thường trong lúc đang bật: được đếm, bấm bật lần nữa thì được mã hóa.
- Dòng đã đọc trong giao dịch bị khóa tới khi giao dịch kết thúc.
- Tắt: mọi giá trị trở về đúng văn bản gốc, công tắc bằng 0.

## Chạy

Cần LocalDB (cài cùng Visual Studio, lệnh `sqllocaldb`) và Windows PowerShell 5.1.

1. Build để có `BADesign.dll` mới nhất. Mặc định script đọc `BADesign/bin`. Muốn khỏi build lại site đang chạy thì build project test ra thư mục tạm
   (`MSBuild.exe BADesign.Tests/BADesign.Tests.csproj -p:Configuration=Debug "-p:OutDir=<thư mục tạm>/"`) rồi truyền thư mục đó bằng `-Folder`.
2. Chạy từ gốc repo:

```
powershell -NoProfile -ExecutionPolicy Bypass -File Tools\secret-store-check\check-secret-store.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File Tools\secret-store-check\check-secret-store.ps1 -Folder <thư mục chứa BADesign.dll và Newtonsoft.Json.dll>
```

Tham số khác: `-Repo` (gốc repo, mặc định là hai cấp trên thư mục script), `-Work` (thư mục chứa file database tạm, mặc định `%TEMP%\BaSecretCheck`).
Script tạo instance `BaSecretCheck`, xóa nó cùng thư mục `-Work` khi xong, kể cả khi có kiểm tra sai.

Script chỉ in dòng `PASS` / `FAIL`, số đếm và thời gian, không in giá trị. Giữ file ở dạng ASCII: Windows PowerShell 5.1 đọc file không có BOM theo bảng mã ANSI.

Dòng cuối khi đạt:

```
RESULT checks=26 failures=0
cleanup: instance deleted, work folder present=False
```
