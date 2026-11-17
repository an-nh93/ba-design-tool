# Thiết kế chi tiết: Trang Encrypt/Decrypt Data (Phase 1 + 2)

## Tổng quan

- **Phase 1**: Encrypt/Decrypt đơn (mã hóa / giải mã từng giá trị, có Key).
- **Phase 2**: Generate Demo Reset Script (tạo script SQL reset phone/email/lương theo nhân viên, chạy tại khách hàng).

---

## 1. Database (DB)

### 1.1. Phase 1

**Không thay đổi DB.** Chỉ dùng `DataSecurityWrapper` + `AesHelper` hiện có.

### 1.2. Phase 2

**Không thêm bảng mới.**  
- Load danh sách employee từ **HR DB** (kết nối qua token `k` giống HR Helper).  
- Script chỉ **generate chuỗi SQL**; không lưu script xuống DB.

**Bảng HR tham chiếu (chỉ đọc / dùng cho script):**

| Bảng | Cột liên quan | Ghi chú |
|------|----------------|---------|
| `Staffing_Employees` | `ID`, `LocalEmployeeID`, `PersonalEmailAddress`, `BusinessEmailAddress`, `MobilePhone1`, `MobilePhone2`, `PayslipPassword` | Update bằng script |
| `Staffing_EmployeeInformations` | `EmployeeID`, `PersonalEmailAddress`, `BusinessEmailAddress` | Nếu tồn tại |
| `Staffing_Transactions` | `EmployeeID`, `BasicSalary`, `IsActiveTransaction = 1` | Lương |
| `PAY_EmployeeSalaries` | `EmployeeID`, `Value` | Set `Value = NULL` khi reset lương |
| `PAY_EmployeeSalaryDetails` | qua `EmployeeSalaryID` | Set `Value = NULL` khi reset lương |

---

## 2. API (WebMethods)

### 2.1. Trang / Route

- Trang: `EncryptDecrypt.aspx` (thư mục `Pages`).
- Route: `/EncryptDecrypt` → `~/Pages/EncryptDecrypt.aspx`.
- Phân quyền: `UiAuthHelper.HasFeature("EncryptDecrypt")`; không có quyền thì redirect về `GetHomeUrlByRole()`.

---

### 2.2. Phase 1 – Encrypt / Decrypt đơn

#### 2.2.1. `EncryptValue`

- **Mục đích**: Mã hóa một giá trị plain text với Key tùy chọn.
- **Handler**: WebMethod, `EnableSession = true`, `ResponseFormat.Json`.

**Request (JSON):**

```json
{
  "plainText": "0900123456",
  "keyType": "none | employeeId | string",
  "keyValue": null | 12345 | "EMP001"
}
```

| Tham số | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `plainText` | string | Có | Giá trị cần mã hóa. Để trống → trả lỗi. |
| `keyType` | string | Có | `"none"` = global; `"employeeId"` = salt theo Employee ID; `"string"` = salt theo chuỗi (vd. LocalEmployeeID). |
| `keyValue` | any | Tùy | Bỏ qua nếu `keyType = "none"`. Với `employeeId`: number; với `string`: string. |

**Response:**

```json
{ "success": true, "encrypted": "base64..." }
// hoặc
{ "success": false, "message": "..." }
```

- **Logic**:  
  - `keyType = "none"` → `DataSecurityWrapper.EncryptData(plainText, null)`.  
  - `keyType = "employeeId"` → `EncryptData(plainText, (long)keyValue)`.  
  - `keyType = "string"` → `EncryptData(plainText, (string)keyValue)`.  
- **Đặc biệt**: `plainText = "0"` hoặc `0` (số) → trả `DataSecurityWrapper.ENCRYPTED_ZERO` (tương thích BasicSalary = 0).

---

#### 2.2.2. `DecryptValue`

- **Mục đích**: Giải mã một chuỗi đã mã hóa.
- **Handler**: WebMethod, `EnableSession = true`, `ResponseFormat.Json`.

**Request (JSON):**

```json
{
  "encryptedText": "base64...",
  "keyType": "none | employeeId | string",
  "keyValue": null | 12345 | "EMP001"
}
```

**Response:**

```json
{ "success": true, "decrypted": "0900123456" }
// hoặc
{ "success": false, "message": "..." }
```

- **Logic**:  
  - `keyType = "none"` → `DecryptData<T>(encryptedText, (long?)null)` (hoặc overload dùng default salt).  
  - `keyType = "employeeId"` → `DecryptData<string>(encryptedText, (long)keyValue)`.  
  - `keyType = "string"` → `DecryptData<string>(encryptedText, (string)keyValue)`.  
- Trường hợp giải mã lỗi (sai key, không đúng format): trả `success: false` + `message` mô tả.

---

### 2.3. Phase 2 – Generate Demo Reset Script

#### 2.3.1. Nguồn dữ liệu employee

Hai luồng:

1. **Từ HR DB** (có token `k`): gọi `GetEmployeesForScript`.
2. **Từ CSV**: không cần `k`; gọi `GenerateDemoResetScriptFromCsv`.

---

#### 2.3.2. `GetEmployeesForScript`

- **Mục đích**: Lấy danh sách employee (ID, LocalID, Company) từ HR DB để chọn đối tượng reset.
- **Handler**: WebMethod, `EnableSession = true`, `ResponseFormat.Json`.

**Request (JSON):**

```json
{
  "k": "encrypted-connect-token",
  "companyID": null | 123
}
```

- `k`: token từ Connect (Database Search → Connect → HR Helper). Dùng session `HRConn_*` như HR Helper.  
- `companyID`: tùy chọn; nếu có thì lọc theo `T.CompanyID`.

**Response:**

```json
{
  "success": true,
  "list": [
    { "employeeID": 1001, "localEmployeeID": "E001", "companyID": 10, "companyName": "..." }
  ]
}
```

- **Query gợi ý**: Query nhẹ, chỉ cần `E.ID`, `E.LocalEmployeeID`, `T.CompanyID`, và tên company nếu có. Có thể tách từ `EmployeesQueryBase` hoặc dùng query riêng tối giản (vd. `Staffing_Transactions` + `Staffing_Employees` + `MultiTenant_Companies`), filter `IsActiveTransaction = 1`, có thể thêm `CompanyID` nếu truyền.

---

#### 2.3.3. `GenerateDemoResetScript`

- **Mục đích**: Tạo nội dung script SQL demo reset (phone, email, lương, payslip) theo danh sách employee từ HR DB.
- **Handler**: WebMethod, `EnableSession = true`, `ResponseFormat.Json`.

**Request (JSON):**

```json
{
  "k": "encrypted-connect-token",
  "companyID": null | 123,
  "employeeIds": [ 1001, 1002 ] | null,
  "config": {
    "demoPhone": "0900000000",
    "demoEmail": "demo@company.com",
    "maskSalary": 0,
    "resetPayslipToLocalID": true,
    "payslipCustom": null,
    "fieldsToReset": {
      "personalEmail": true,
      "businessEmail": true,
      "mobile1": true,
      "mobile2": true,
      "payslip": true,
      "basicSalary": true
    }
  }
}
```

| Tham số | Mô tả |
|--------|--------|
| `k` | Token kết nối HR DB. |
| `companyID` | Lọc company; null = tất cả (theo quyền / dữ liệu). |
| `employeeIds` | Null = tất cả (đã lọc company); có mảng = chỉ những ID này. |
| `config.demoPhone` | Số điện thoại demo cho Mobile1/Mobile2 (nếu bật). |
| `config.demoEmail` | Email demo cho Personal/Business (nếu bật). |
| `config.maskSalary` | Giá trị lương mask (thường 0). |
| `config.resetPayslipToLocalID` | True = payslip = LocalEmployeeID; false = dùng `payslipCustom`. |
| `config.payslipCustom` | Chuỗi payslip dùng chung khi không reset theo LocalID. |
| `config.fieldsToReset` | Bật/tắt từng trường reset. |

**Response:**

```json
{
  "success": true,
  "script": "-- SQL script full text...",
  "fileName": "DemoReset_20250126_143022.sql"
}
```

- **Logic**:
  1. Resolve `k` → connection string HR DB.
  2. Lấy danh sách employee (theo `companyID` + `employeeIds`), đảm bảo có `EmployeeID`, `LocalEmployeeID`.
  3. Với mỗi employee và mỗi field bật trong `fieldsToReset`:
     - Tạo giá trị plain (demo phone/email, mask salary, payslip theo config).
     - `DataSecurityWrapper.EncryptData(value, employeeID)`.
  4. Build script SQL:
     - Tạo `#EmployeeTemp` (RowId, EmployeeID, PersonalEmailAddress, BusinessEmailAddress, PayslipPassword, MobilePhone1, MobilePhone2, BasicSalary) như HR Helper.
     - Insert từng dòng encrypted vào temp.
     - Batch UPDATE (vd. 2000 dòng / batch):  
       - `Staffing_Employees`: PersonalEmail, BusinessEmail, PayslipPassword, Mobile1, Mobile2.  
       - `Staffing_EmployeeInformations`: PersonalEmail, BusinessEmail (nếu bảng tồn tại).  
       - `PAY_EmployeeSalaries` / `PAY_EmployeeSalaryDetails`: set `Value = NULL` nếu reset lương.  
       - `Staffing_Transactions`: `BasicSalary` = encrypted value.
  5. Trả `script` (full text) + `fileName` (gợi ý tên file khi tải về).

- **Lưu ý**: Chỉ **generate** script; không thực thi UPDATE trên DB. Khách hàng copy file `.sql` và chạy trên DB của họ.

---

#### 2.3.4. `GenerateDemoResetScriptFromCsv`

- **Mục đích**: Tạo cùng format script demo reset nhưng từ CSV (không cần kết nối DB).
- **Handler**: WebMethod, `EnableSession = true`, `ResponseFormat.Json`.

**Request (JSON):**

```json
{
  "csvText": "EmployeeID,LocalEmployeeID\n1001,E001\n1002,E002",
  "config": { ... }
}
```

- `config`: giống `GenerateDemoResetScript` (demoPhone, demoEmail, maskSalary, resetPayslipToLocalID, payslipCustom, fieldsToReset).
- **Logic**:
  1. Parse CSV (header bắt buộc): ít nhất `EmployeeID`; nếu reset payslip theo LocalID thì cần `LocalEmployeeID`.
  2. Validate từng dòng (EmployeeID hợp lệ, không trùng).
  3. Với mỗi dòng, encrypt các field theo config (cùng quy tắc như trên).
  4. Build script SQL giống `GenerateDemoResetScript` (temp table + batch UPDATE), không gọi DB.

**Response:** Giống `GenerateDemoResetScript` (`success`, `script`, `fileName`).

---

## 3. UI

### 3.1. Layout chung

- **Sidebar**: Giống các trang khác (Database Search, HR Helper).
  - Logo / title: **Encrypt/Decrypt Data**.
  - **← Về trang chủ**: `~/HomeRole`.
  - Có thể thêm link **Database Search**, **HR Helper** (tùy quyền).
- **Main**: Vùng nội dung, dùng tab hoặc section rõ ràng.
- **Theme**: Dùng biến CSS sẵn có (`--primary`, `--bg-card`, `--text-primary`, …) cho đồng bộ dark/light.

---

### 3.2. Phase 1 – Giao diện Encrypt / Decrypt đơn

**Section 1: Encrypt**

- **Plain text**: `<textarea>` hoặc `<input>`, placeholder "Nhập giá trị cần mã hóa (vd. số điện thoại, email, số).".
- **Key**:
  - Dropdown: **None (global)** | **Employee ID** | **String (vd. Local ID)**.
  - Nếu **Employee ID**: `<input type="number">` placeholder "Employee ID".
  - Nếu **String**: `<input type="text">` placeholder "Chuỗi key (vd. LocalEmployeeID).".
- **Encrypt**: Nút bấm → gọi `EncryptValue` → hiển thị kết quả.
- **Kết quả**: Ô read-only (textarea) + nút **Copy** (clipboard).

**Section 2: Decrypt**

- **Encrypted text**: `<textarea>` placeholder "Dán chuỗi đã mã hóa (base64).".
- **Key**: Cùng cách chọn như Encrypt (None / Employee ID / String).
- **Decrypt**: Nút bấm → gọi `DecryptValue` → hiển thị plain text.
- **Kết quả**: Ô read-only + nút **Copy**.

**Cải tiến UX (tùy chọn):**

- Checkbox **“Dùng chung Key cho Encrypt & Decrypt”**: một bộ Key, áp cho cả hai section.
- Hiển thị lỗi (vd. sai key, không giải mã được) dưới dạng message đỏ dưới nút.

---

### 3.3. Phase 2 – Giao diện Generate Demo Reset Script

**Tab / Section: "Generate Demo Reset Script"**

**Bước 1 – Nguồn dữ liệu**

- **Radio**:
  - **Từ HR DB**: Cần token `k`.
    - Nếu vào trang từ **HR Helper** (có `?k=...`): dùng `k` sẵn có, hiển thị "Đã kết nối HR DB" (có thể hiển thị tên server/DB từ session).
    - Nếu không có `k`: Nút **"Kết nối HR DB"** → chuyển đến **Database Search** → user chọn DB → **Connect** → qua **HR Helper** → từ HR Helper có link **"Generate Demo Reset Script"** mở EncryptDecrypt với `?k=...`.
  - **Từ CSV**: Không cần `k`.
    - **Upload file** hoặc **Paste** nội dung CSV.
    - Yêu cầu header: `EmployeeID`, `LocalEmployeeID` (bắt buộc nếu reset payslip theo LocalID).
    - Preview bảng (EmployeeID, LocalEmployeeID) vài dòng.

**Bước 2 – Cấu hình reset**

- **Demo phone**: `<input>`, placeholder "vd. 0900000000".
- **Demo email**: `<input>`, placeholder "vd. demo@company.com".
- **Mask salary**: `<input type="number">`, mặc định `0`.
- **Payslip**:
  - Checkbox **Reset payslip**.
  - Radio **Theo Local ID** vs **Chuỗi chung**; nếu chung → `<input>` nhập giá trị.
- **Fields to reset**: Checkbox cho từng trường:
  - Personal Email, Business Email, Mobile 1, Mobile 2, Payslip, Basic Salary.

**Bước 3 – Danh sách employee (chỉ khi “Từ HR DB”)**

- **Load employees**: Nút **"Load danh sách"** → gọi `GetEmployeesForScript` → hiển thị bảng (EmployeeID, LocalEmployeeID, Company).  
- **Lọc**: Có thể thêm filter theo Company (dropdown) trước khi Load.
- **Chọn**: Checkbox “Chọn tất cả” + checkbox từng dòng. Chỉ những dòng chọn mới đưa vào script (nếu không chọn gì có thể xem như “tất cả” đã load, tùy product).

**Bước 4 – Generate & Download**

- **Generate**: Nút **"Tạo script"**.
  - Nếu **Từ HR DB**: gọi `GenerateDemoResetScript` với `k`, `companyID`, `employeeIds`, `config`.
  - Nếu **Từ CSV**: gọi `GenerateDemoResetScriptFromCsv` với `csvText`, `config`.
- **Loading**: Hiển thị progress / spinner trong lúc gọi API.
- **Kết quả**:
  - Hiển thị đoạn script mẫu (vd. 50 dòng đầu) trong `<textarea>` read-only.
  - **Download .sql**: Nút tải file; `fileName` dùng từ API (vd. `DemoReset_yyyyMMdd_HHmmss.sql`).

**Cảnh báo:**

- Text nhỏ gần nút **Tạo script** / **Download**: "Script chạy tại DB khách hàng. Cần backup DB trước khi chạy."

---

### 3.4. Điều hướng và quyền

- **EncryptDecrypt** chỉ hiển thị với user có quyền **EncryptDecrypt** (từ Role hoặc quyền riêng).
- **HomeRole**: Đổi card **Encrypt/Decrypt Data** từ "Coming soon" sang **HyperLink** tới `/EncryptDecrypt`.
- **HR Helper**: Thêm link **"Generate Demo Reset Script"** (vd. trong header hoặc tab) → mở `/EncryptDecrypt?k=...` để giữ kết nối HR DB.

---

## 4. Luồng xử lý tóm tắt

### Phase 1

1. User vào **Encrypt/Decrypt**.
2. Nhập plain hoặc encrypted, chọn Key → Encrypt / Decrypt.
3. Copy kết quả để dùng cho update thủ công hoặc kiểm tra.

### Phase 2 – Từ HR DB

1. User **Database Search** → **Connect** → **HR Helper** (có `k`).
2. Trong HR Helper bấm **"Generate Demo Reset Script"** → mở **EncryptDecrypt?k=...**.
3. Chọn **Từ HR DB** → (tùy chọn) lọc Company → **Load danh sách** → chọn employee.
4. Nhập **config** (demo phone/email, mask salary, payslip, fields to reset) → **Tạo script**.
5. **Download** file `.sql` → gửi khách hàng chạy trên DB của họ.

### Phase 2 – Từ CSV

1. User vào **EncryptDecrypt** (không cần `k`).
2. Chọn **Từ CSV** → upload / paste CSV → preview.
3. Nhập **config** như trên → **Tạo script** → **Download** `.sql`.

---

## 5. File / Cấu trúc code gợi ý

```
Pages/
  EncryptDecrypt.aspx          # Markup + inline JS (hoặc .js riêng)
  EncryptDecrypt.aspx.cs       # Page_Load, WebMethods
  EncryptDecrypt.aspx.designer.cs

App_Start/
  RouteConfig.cs               # Thêm route /EncryptDecrypt
```

- **EncryptDecrypt.aspx.cs**:
  - Phase 1: `EncryptValue`, `DecryptValue` (gọi `DataSecurityWrapper`).
  - Phase 2: `GetEmployeesForScript`, `GenerateDemoResetScript`, `GenerateDemoResetScriptFromCsv`.
- Helper parse CSV có thể nằm trong `.cs` hoặc lớp tĩnh riêng; validate và báo lỗi rõ ràng (dòng lỗi, thiếu cột).

---

## 6. Checklist triển khai

### Phase 1

- [ ] Tạo `EncryptDecrypt.aspx` (+ .cs, .designer).
- [ ] Thêm route `/EncryptDecrypt`, bảo vệ `EncryptDecrypt`.
- [ ] WebMethod `EncryptValue` (plainText, keyType, keyValue).
- [ ] WebMethod `DecryptValue` (encryptedText, keyType, keyValue).
- [ ] UI: section Encrypt + Decrypt, Key chung, nút Copy.
- [ ] Cập nhật HomeRole: card Encrypt/Decrypt link tới `/EncryptDecrypt`.

### Phase 2

- [ ] WebMethod `GetEmployeesForScript` (k, companyID).
- [ ] WebMethod `GenerateDemoResetScript` (k, companyID, employeeIds, config).
- [ ] WebMethod `GenerateDemoResetScriptFromCsv` (csvText, config).
- [ ] UI: tab/section "Generate Demo Reset Script"; nguồn HR DB vs CSV; form config; Load employees + bảng chọn; Generate + Download.
- [ ] Link "Generate Demo Reset Script" từ HR Helper → `/EncryptDecrypt?k=...`.

---

## 7. Ghi chú bảo mật và mở rộng

- Không log plain text (password, số lương, v.v.) ra file hoặc response dư thừa.
- Token `k` chỉ dùng trong session; không gửi về client ngoài query (vd. `?k=`) khi cần.
- Sau này có thể mở rộng: thêm **template** config (vd. "Demo Vietnam", "Demo masking") lưu vào DB hoặc local config; Phase 3 Decrypt bulk từ paste CSV.

Tài liệu này đủ để triển khai Phase 1 và Phase 2 theo đúng kiến trúc HR hiện tại và có thể mở rộng dần.
