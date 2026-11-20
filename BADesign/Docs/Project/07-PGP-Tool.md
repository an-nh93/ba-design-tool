# PGP Tool

`Pages/PgpTool.aspx`. Công cụ file cho trao đổi PGP, tách khỏi mã hóa cột Cadena.

## Việc làm được

- Xuất public/private key dạng `.asc`, từ chuỗi Base64 dán vào hoặc từ cấu hình đã chọn trong DB. Đổi nguồn chỉ ẩn / hiện ô dán và ô mã tên file, không ghi đè nội dung đã nhập; khi lấy từ cấu hình, tên file dùng mã của cấu hình.
- Mã hóa một file bằng public key.
- Giải mã file PGP bằng private key. File tải về mang tên file đã chọn, bỏ đuôi `.pgp` / `.gpg` / `.asc` (`Helpers/Security/PgpFileNames.cs`): `APAC-VNM_QAA_QAA_Outbound_20261118172157.xls.pgp` → `APAC-VNM_QAA_QAA_Outbound_20261118172157.xls`. Chỉ khi tên file không có các đuôi đó mới dùng tên ghi bên trong gói PGP, rồi tới `decrypted_file`. Tên bên trong là tên lúc mã hóa: HRM mã hóa một file tạm nên tên bên trong có dạng `a7e847dd-e02b-4bd8-8f8a-ef14f1bc6eec.txt`, vì vậy không dùng nó làm tên chính.
- Nạp key của một cấu hình: nếu Public Key và Private Key lưu trong cấu hình không cùng một cặp, trang báo ngay dưới nút Nạp key, nêu key ID và ngày tạo của từng key (`PgpKeyInspector.DescribeConfigKeyPairProblem`, trả về trong `keyPairWarning` của `GetFolderConfigKeys`).

## Ý tưởng

PGP là mã hóa file trao đổi. Encrypt/Decrypt Data là mã hóa giá trị trong database HR. Hai cơ chế không thay thế nhau. Private key không ghi vào log và không trả về response sau khi người dùng đã tải.

## Lỗi thường gặp

- "File được mã hóa cho key X, nhưng private key đang dùng là key Y" (thư viện PgpCore gọi lỗi này là `Secret key for message not found`): file được mã hóa cho một cặp key khác với private key đang dùng. Mỗi file PGP ghi mã key (key ID) của public key đã dùng để mã hóa; private key phải cùng cặp. Trước khi giải mã, `DecryptPgp` đọc key ID của file và của private key bằng `Helpers/Security/PgpKeyInspector.cs` và báo câu trên khi không key nào khớp; không đọc được thì để PgpCore tự báo lỗi. Lỗi này xảy ra trước khi kiểm tra passphrase, nên đổi passphrase không giúp được. Mọi cặp key do HRM sinh (Folder Configuration) có cùng tên chủ key `cadena-hrmseries.com`, nên nhìn file `.asc` không phân biệt được; muốn biết key trong một file `.asc` là key nào thì đọc key ID (BouncyCastle: `PgpObjectFactory`, `PgpPublicKeyRing.GetPublicKeys()`, `KeyId`).
- Mã hóa bằng key của cấu hình rồi giải mã bằng key của chính cấu hình đó vẫn báo câu trên: hai cột `EncryptionPublicKey` và `EncryptionPrimaryKey` của dòng cấu hình đang giữ key của hai cặp khác nhau (đã gặp: public key tạo năm 2023, private key do HRM tạo sau và chỉ cột private key được thay). Đây là lỗi dữ liệu, không phải lỗi mã hóa; trang báo ngay lúc Nạp key. Sửa bằng cách lưu lại đúng một cặp key vào cấu hình. Màn hình Generate Key của công cụ luôn lưu cả hai key cùng lúc.
- Trang hiện nguyên câu tiếng Anh `Secret key for message not found` thay vì câu tiếng Việt ở trên: site đang chạy bản DLL cũ chưa có `PgpKeyInspector` (bản deploy chưa cập nhật). So ngày của `bin\BADesign.dll` ở site đó.
- Passphrase sai với đúng cặp key: trang báo "Passphrase không đúng với Passphrase lúc key được generate...".
- Nhập sai loại dữ liệu: trước khi gọi thư viện, `PgpKeyInspector` xác định dữ liệu là public key, private key, file đã mã hóa hay không phải PGP (`GetKind`) và báo câu tiếng Việt, thay cho thông báo của BouncyCastle / PgpCore:

| Nhập sai | Thư viện báo | Trang báo |
|---|---|---|
| Giải mã bằng public key (file hoặc chuỗi) | `PgpPublicKeyRing found where PgpSecretKeyRing expected` | Key đang dùng để giải mã là Public Key. Giải mã cần Private Key cùng cặp... |
| Giải mã, ô key là file đã mã hóa | `PgpEncryptedDataList found where PgpSecretKeyRing expected` | Key đang dùng để giải mã là file đã mã hóa, không phải Private Key. |
| Giải mã, ô key không phải key PGP | `Could not find any signing keys in keyring` | Key đang dùng để giải mã không phải key PGP hợp lệ. |
| Giải mã một file key hoặc file chưa mã hóa | `Failed to detect encrypted content format` | File đã chọn để giải mã là file key / không phải file đã mã hóa PGP. |
| Mã hóa bằng private key | `PgpSecretKeyRing found where PgpPublicKeyRing expected` | Key đang dùng để mã hóa là Private Key. Mã hóa cần Public Key của bên nhận. |
| Mã hóa, ô key không phải key PGP | `No encryption methods specified` | Key đang dùng để mã hóa không phải key PGP hợp lệ. |
| Xuất key: chuỗi là private key nhưng chọn loại Public Key, hoặc ngược lại | (không báo, file bị đặt tên sai loại) | Chuỗi key là Private Key nhưng loại key đang chọn là Public Key (và ngược lại). |

## Kiểm tra

`Tools/page-checks/pgp-tool.js` (cách chạy ở `Tools/page-checks/README.md`). Unit test của phần đọc key ID và kiểm tra cặp key của cấu hình: `BADesign.Tests/PgpKeyInspectorTests.cs`; tên file giải mã: `BADesign.Tests/PgpFileNamesTests.cs`.
