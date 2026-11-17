# Thiết kế Tab 2: Generate Demo Reset Script (v2)

## Bối cảnh

Tab hiện tại đang fix cứng: demo reset phone/email/lương cho bảng `Staffing_Employees`, `Staffing_Transactions`, v.v.  
User cần **2 luồng** mới:

1. **Giải mã hàng loạt** – Dev/BA select SQL lấy data đã mã hóa → paste vào → giải mã → xem số liệu.
2. **Mã hóa + script linh hoạt** – Input: key + nhiều cột plain → mã hóa theo key → generate script UPDATE/INSERT tùy đối tượng (bảng/column do dev định nghĩa, không cố định).

---

## 1. Chức năng A: Giải mã hàng loạt (Decrypt Grid)

### Mục đích

- Dev chạy SQL (vd. `SELECT EmployeeID, MobilePhone1, BusinessEmailAddress FROM ...`) → copy kết quả.
- Paste vào tool → chọn cột Key (vd. EmployeeID) + các cột cần giải mã → xem data đã giải mã.

### UI

```
+------------------------------------------+
| Giải mã để xem                            |
+------------------------------------------+
| Dán dữ liệu (CSV/TSV, có header)         |
| [textarea: EmployeeID,MobilePhone1,BizEmail
|  26474,3OSo/+iDCY6...,abc123base64...
|  26475,xYz...,def456base64...]           |
|                                          |
| Cột Key (dùng để giải mã): [EmployeeID ▼]|
| Các cột giải mã (chọn nhiều):            |
|   ☑ MobilePhone1  ☑ BizEmail  ☐ Salary  |
|                                          |
| [ Giải mã ]                              |
+------------------------------------------+
| Kết quả (grid)                           |
| EmployeeID | MobilePhone1  | BizEmail    |
| 26474      | 0900123456    | a@x.com     |
| 26475      | 0911222333    | b@y.com     |
| [Copy CSV] [Export Excel]                 |
+------------------------------------------+
```

### Logic

1. Parse input: hàng đầu = header, các hàng sau = data. Hỗ trợ CSV (dấu phẩy) hoặc TSV (tab).
2. User chọn:
   - **Cột Key**: EmployeeID hoặc cột string (LocalEmployeeID) – dùng làm key giải mã.
   - **Cột giải mã**: tick các cột chứa giá trị mã hóa cần giải mã.
3. Backend: `DecryptGrid` WebMethod
   - Input: `{ rows: [[col1, col2, ...], ...], headers: ["EmployeeID","MobilePhone1",...], keyColumnIndex: 0, decryptColumnIndices: [1, 2] }`
   - Với mỗi row: lấy key từ `row[keyColumnIndex]`, giải mã `row[decryptColumnIndices[i]]` bằng `DataSecurityWrapper.DecryptData<string>(encrypted, key)`.
   - Trả về: `{ success, headers, rows }` (rows đã thay giá trị encrypted → decrypted).
4. Hiển thị grid: header + dòng đã giải mã. Copy CSV / export nếu cần.

### API

**`DecryptGrid`**
- Request: `{ csvText, keyColumnName, decryptColumnNames }`  
  - Hoặc: `{ rows, headers, keyColumnIndex, decryptColumnIndices }` (client parse CSV trước).
- Response: `{ success, headers, rows }` – rows đã decrypt.

---

## 2. Chức năng B: Mã hóa + Script linh hoạt (Encrypt & Generate Script)

### Mục đích

- Input: data có sẵn (plain) – 1 cột Key + nhiều cột giá trị cần mã hóa.
- Output: script SQL (UPDATE/INSERT) để CONS/khách hàng chạy.  
- Bảng đích, cột đích **do dev định nghĩa**, không fix cứng.

### UI – 2 chế độ

#### Chế độ 1: Nhanh (preset – giữ tương thích hiện tại)

- Giữ flow hiện tại: HR DB / CSV → chọn employee → config demo phone/email/salary/payslip → Generate.
- Dùng cho demo reset chuẩn `Staffing_Employees`, `Staffing_Transactions`, …

#### Chế độ 2: Tùy biến (Custom Mapping)

```
+------------------------------------------+
| Mã hóa & tạo script (tùy biến)           |
+------------------------------------------+
| Dán dữ liệu (CSV, header bắt buộc)       |
| [textarea: EmployeeID,Phone,Email,Amount
|  26474,0900111222,a@x.com,5000
|  26475,0900333444,b@y.com,6000]          |
|                                          |
| Cột Key: [EmployeeID ▼]                  |
| Cột cần mã hóa: ☑ Phone ☑ Email ☑ Amount|
|                                          |
| --- Cấu hình Script ---                  |
| Kiểu: ○ UPDATE  ● INSERT (batch)         |
|                                          |
| Bảng đích: [Staffing_Employees        ▼] |
| Hoặc nhập tay: [________________]        |
|                                          |
| Ánh xạ cột (Input column → DB column)    |
| Phone    → [MobilePhone1    ] [Add]      |
| Email    → [BusinessEmailAddr] [Add]     |
| Amount   → [BasicSalary     ] [Add]      |
| (Có thể nhiều dòng mapping)              |
|                                          |
| Điều kiện WHERE (vd. theo Key):          |
| WHERE [ID] = @key  ( @key = giá trị Key) |
|                                          |
| [ Tạo script ]                           |
+------------------------------------------+
| Script (preview) [Download .sql]          |
| UPDATE Staffing_Employees SET ...        |
| WHERE ID = 26474;                        |
| ...                                      |
+------------------------------------------+
```

### Logic

1. Parse CSV → rows + headers.
2. User chọn Key column + columns to encrypt.
3. User định nghĩa:
   - **Bảng đích** (hoặc dropdown preset: Staffing_Employees, Staffing_Transactions, …).
   - **Mapping**: Input column → DB column (vd. Phone → MobilePhone1).
   - **WHERE clause pattern**: `WHERE ID = @key` (hoặc `WHERE EmployeeID = @key`).
4. Backend: `GenerateEncryptScript` WebMethod
   - Input: `{ csvText, keyColumnName, encryptColumnNames, scriptConfig }`
   - `scriptConfig`: `{ tableName, columnMappings: [{inputCol, dbCol}], whereColumn, wherePattern }`
   - Với mỗi row: encrypt từng cột được chọn bằng `EncryptData(value, key)`.
   - Build script:  
     - UPDATE: `UPDATE table SET col1='enc1', col2='enc2' WHERE whereCol = key;`  
     - Hoặc INSERT: tạo temp table + INSERT values.
   - Trả: `{ success, script, fileName }`.

### API

**`GenerateEncryptScript`**
- Request:
```json
{
  "csvText": "EmployeeID,Phone,Email\n26474,090...,a@x.com",
  "keyColumnName": "EmployeeID",
  "encryptColumnNames": ["Phone", "Email"],
  "scriptConfig": {
    "scriptType": "UPDATE",
    "tableName": "Staffing_Employees",
    "whereColumn": "ID",
    "mappings": [
      { "inputColumn": "Phone", "dbColumn": "MobilePhone1" },
      { "inputColumn": "Email", "dbColumn": "BusinessEmailAddress" }
    ]
  }
}
```
- Response: `{ success, script, fileName }`.

---

## 3. Cấu trúc Tab 2 mới

Tab 2 chia **3 sub-tab** (hoặc 3 section accordion):

| Sub-tab        | Mô tả                                          |
|----------------|------------------------------------------------|
| **1. Giải mã** | Paste encrypted data → chọn Key + cột → xem grid đã giải mã |
| **2. Demo Reset** | Giữ flow hiện tại (HR DB/CSV, preset Staffing_*) |
| **3. Mã hóa + Script** | Paste plain data → mapping tùy biến → tạo script UPDATE/INSERT |

---

## 4. Thứ tự triển khai đề xuất

1. **Phase 2a**: Chức năng A – Giải mã hàng loạt (Decrypt Grid)
   - UI + WebMethod `DecryptGrid`
   - Parse CSV phía server (hoặc client parse, gửi rows + headers).
2. **Phase 2b**: Chức năng B – Mã hóa + Script tùy biến
   - UI mapping + WebMethod `GenerateEncryptScript`
   - Hỗ trợ UPDATE đơn giản (1 bảng, nhiều cột).
3. Giữ nguyên **Demo Reset** (flow cũ) như sub-tab 2.

---

## 5. Lưu ý kỹ thuật

- Giới hạn số dòng xử lý (vd. 1000–5000) để tránh timeout; có thể batch decrypt (50–100 dòng/lần) nếu cần.
- Validate CSV: header bắt buộc, key column phải tồn tại, giá trị encrypted phải base64 hợp lệ.
- Script escape: giá trị encrypted khi đưa vào SQL cần escape dấu `'` (double quote hoặc replace).
