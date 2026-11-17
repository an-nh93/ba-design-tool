# PGP Tool

`Pages/PgpTool.aspx`. Công cụ file cho trao đổi PGP, tách khỏi mã hóa cột Cadena.

## Việc làm được

- Xuất public/private key dạng `.asc`, từ chuỗi Base64 dán vào hoặc từ cấu hình đã chọn trong DB. Đổi nguồn chỉ ẩn / hiện ô dán và ô mã tên file, không ghi đè nội dung đã nhập; khi lấy từ cấu hình, tên file dùng mã của cấu hình.
- Mã hóa một file bằng public key.
- Giải mã file PGP bằng private key.

## Ý tưởng

PGP là mã hóa file trao đổi. Encrypt/Decrypt Data là mã hóa giá trị trong database HR. Hai cơ chế không thay thế nhau. Private key không ghi vào log và không trả về response sau khi người dùng đã tải.

## Lỗi thường gặp

- "File được mã hóa cho key X, nhưng private key đang dùng là key Y" (thư viện PgpCore gọi lỗi này là `Secret key for message not found`): file được mã hóa cho một cặp key khác với private key đang dùng. Mỗi file PGP ghi mã key (key ID) của public key đã dùng để mã hóa; private key phải cùng cặp. Trước khi giải mã, `DecryptPgp` đọc key ID của file và của private key bằng `Helpers/Security/PgpKeyInspector.cs` và báo câu trên khi không key nào khớp; không đọc được thì để PgpCore tự báo lỗi. Lỗi này xảy ra trước khi kiểm tra passphrase, nên đổi passphrase không giúp được. Mọi cặp key do HRM sinh (Folder Configuration) có cùng tên chủ key `cadena-hrmseries.com`, nên nhìn file `.asc` không phân biệt được; muốn biết key trong một file `.asc` là key nào thì đọc key ID (BouncyCastle: `PgpObjectFactory`, `PgpPublicKeyRing.GetPublicKeys()`, `KeyId`).
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

`Tools/page-checks/pgp-tool.js` (cách chạy ở `Tools/page-checks/README.md`). Unit test của phần đọc key ID: `BADesign.Tests/PgpKeyInspectorTests.cs`.
