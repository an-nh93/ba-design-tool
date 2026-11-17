# Encrypt / Decrypt

`Pages/EncryptDecrypt.aspx`. Khớp cơ chế mã hóa Cadena cho dữ liệu nhạy cảm (điện thoại, email, lương), để demo và script reset ra đúng ciphertext mà ứng dụng HR đọc được.

## Tab mã hóa đơn

- Encrypt một giá trị → ciphertext.
- Decrypt một ciphertext → plain.
- Dùng khi cần kiểm tra một ô hoặc nhét một giá trị đúng vào script tay.

## Tab demo reset

Hai hướng:

- Giải mã hàng loạt trên lưới để nhìn plain trước khi quyết định reset.
- Sinh script UPDATE demo: preset nhanh (phone, email, mask lương) hoặc mapping tùy biến (cột nguồn → cách mã hóa → giá trị mới).

Nguồn nhân viên lấy từ HR DB đã connect, hoặc từ CSV. Script trả về cho user chạy, hoặc để luồng restore/HR Helper dùng cùng quy tắc.

## Ý tưởng

Không bịa thuật toán riêng. Ciphertext phải là thứ Cadena decrypt được. Giá trị mặc định (số điện thoại, email pattern) đến từ App Settings để mọi màn reset dùng một bộ số.

Chi tiết API và UI nằm ở `Docs/EncryptDecrypt-Design-Phase1-2.md` và `Docs/EncryptDecrypt-Tab2-Design-v2.md`.
