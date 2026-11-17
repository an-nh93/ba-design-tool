# Thiết kế: Dev Share – Chia sẻ kỹ năng code (hướng dẫn + diễn đàn)

Tài liệu thiết kế tính năng **Dev Share**: nơi dev chia sẻ bài hướng dẫn code (tutorial), bình luận góp ý/chỉnh sửa, xem code đúng style nhiều ngôn ngữ, copy code và tải file mẫu.

---

## 1. Tổng quan

### 1.1 Mục tiêu

- **Chia sẻ kỹ năng code**: Ví dụ "Group by report 2 cấp", "Dynamic query", "Cách dùng SignalR với ASP.NET"…
- **Định dạng hướng dẫn**, không phải Q&A như Stack Overflow: mỗi bài là một tutorial có cấu trúc (mục đích → bước → code → giải thích).
- **Comment** dưới mỗi bài để góp ý, đề xuất chỉnh sửa code hoặc đặt câu hỏi bổ sung.
- **Giao diện code chuyên nghiệp**: syntax highlighting nhiều ngôn ngữ, font monospace, nút copy từng block.
- **Đính kèm file**: Upload ZIP hoặc file code mẫu để người đọc tải về tham khảo.

### 1.2 Đối tượng

- **Giai đoạn 1**: Dev nội bộ (cùng hệ thống BADesign, đã đăng nhập).
- **Giai đoạn sau**: Có thể mở rộng quyền xem/đăng cho nhóm khác nếu cần.

### 1.3 Khác biệt so với Stack Overflow

| Khía cạnh | Stack Overflow | Dev Share (đề xuất) |
|-----------|----------------|---------------------|
| Mục đích | Hỏi đáp (Q&A) | **Hướng dẫn** (tutorial, how-to) |
| Cấu trúc bài | Câu hỏi + câu trả lời được vote | Bài viết có đề mục, nhiều block code, có thể đính kèm file |
| Code | Nhiều snippet trong câu trả lời | Nhiều block code có **label ngôn ngữ**, **copy**, **file đính kèm** |
| Bình luận | Thảo luận ngắn | Góp ý / đề xuất chỉnh code / câu hỏi bổ sung |
| Vote | Up/down vote câu trả lời | Có thể thêm "Hữu ích" (like) cho bài hoặc comment (tùy phase) |

---

## 2. Mô hình dữ liệu (gợi ý)

### 2.1 Bảng chính

- **DevSharePost**
  - Id, Title, Slug (URL-friendly), Summary (mô tả ngắn), Body (HTML hoặc Markdown tùy editor).
  - AuthorId (User), CreatedAt, UpdatedAt, PublishedAt (nullable = bản nháp).
  - LanguageTags (ví dụ: "C#,SQL,ASP.NET" hoặc bảng riêng DevSharePostTag).
  - ViewCount, UsefulCount (số lượt "Hữu ích") — tùy chọn.

- **DevShareComment**
  - Id, PostId, ParentId (nullable, cho reply), AuthorId, Body (text/HTML), CreatedAt, UpdatedAt.

- **DevShareCodeAttachment**
  - Id, PostId, FileName, OriginalFileName, StoragePath, FileSizeBytes, ContentType (application/zip, text/plain…), UploadedAt, UploadedBy.
  - Cho phép nhiều file/ZIP mỗi bài.

- **DevSharePostTag** (nếu tách tag)
  - PostId, TagId hoặc TagName (ví dụ "C#", "SQL", "Report").

### 2.2 Lưu nội dung bài viết

- **Option A**: Lưu **HTML** (từ editor WYSIWYG hoặc Markdown render ra). Code block lưu dạng `<pre data-lang="csharp"><code>...</code></pre>` để front-end highlight và gắn nút copy.
- **Option B**: Lưu **Markdown**; render khi xem. Code block chuẩn Markdown với language identifier (ví dụ ` ```csharp `). Phù hợp dev, dễ diff, cần thư viện render (vd: marked + Prism/Highlight.js).

Đề xuất: **Markdown** cho body bài viết, kèm metadata ngôn ngữ/tag.

---

## 3. Giao diện từng màn hình

### 3.1 Danh sách bài (List)

- **Layout**: Dùng chung `ba-layout` (sidebar + top bar) như HRHelper/Database Search; thêm mục menu "Dev Share" hoặc "Chia sẻ code".
- **Top**: Tiêu đề "Dev Share" / "Chia sẻ kỹ năng code", mô tả một dòng: "Chia sẻ bài hướng dẫn code, ví dụ report 2 cấp, dynamic query, C#, SQL, ASP.NET…"
- **Toolbar**:
  - Ô **tìm kiếm** (theo tiêu đề, tag, tóm tắt).
  - **Bộ lọc**: Tag/ngôn ngữ (C#, JavaScript, SQL, ASP.NET, PHP, …), "Mới nhất" / "Nhiều lượt xem" / "Hữu ích".
  - Nút **"Viết bài"** (primary) → trang tạo bài mới.
- **Danh sách bài**:
  - Mỗi item: **Tiêu đề** (link), **Tóm tắt** (1–2 dòng), **Tag** (badge), **Tác giả**, **Ngày**, có thể **số lượt xem / Hữu ích**.
  - Card hoặc table tùy style hiện tại; empty state: "Chưa có bài nào. Bạn có thể **Viết bài** đầu tiên."

**Wireframe list (mô tả):**
```
[ Sidebar ]  [ Dev Share | Chia sẻ kỹ năng code                    ] [ Theme ] [ User ]
             [ Mô tả: Chia sẻ bài hướng dẫn code, C#, SQL, ...     ]
             [ [Tìm kiếm...]  [Tag: Tất cả ▼] [Sắp xếp ▼]  [Viết bài] ]
             ┌─────────────────────────────────────────────────────────┐
             │ 📄 Group by report 2 cấp – Dynamic                      │
             │    Cách làm report nhóm 2 cấp với C# và SQL...          │
             │    [C#] [SQL] [ASP.NET]  •  Nguyễn A  •  25/02/2026     │
             ├─────────────────────────────────────────────────────────┤
             │ 📄 SignalR với ASP.NET – Push thông báo                 │
             │    Hướng dẫn tích hợp SignalR vào WebForms...           │
             │    [C#] [JavaScript]  •  Trần B  •  24/02/2026          │
             └─────────────────────────────────────────────────────────┘
```

### 3.2 Xem bài (Detail)

- **Header**: Tiêu đề (H1), tác giả, ngày cập nhật, tag.
- **Body**: Nội dung đã render (Markdown → HTML). **Code block** (xem mục 4) có syntax highlight và nút copy.
- **Phần đính kèm** (nếu có):
  - Tiêu đề nhỏ "File đính kèm" / "Code mẫu".
  - Danh sách file (tên, dung lượng, icon ZIP/file). Nút **"Tải về"** từng file.
- **Hành động**: Nút "Hữu ích" (optional), "Chỉnh sửa" (nếu là tác giả hoặc quyền admin).
- **Comment**:
  - Danh sách comment (flat hoặc thread nếu có reply).
  - Form "Thêm bình luận" (textarea + nút Gửi). Có thể hỗ trợ Markdown nhẹ hoặc plain text.
  - Mỗi comment: nội dung, tác giả, thời gian; (tùy chọn) "Trả lời", "Chỉnh sửa" (tác giả).

### 3.3 Tạo / Chỉnh sửa bài (Editor)

- **Form**:
  - **Tiêu đề** (bắt buộc).
  - **Tóm tắt** (optional, hiển thị ở list).
  - **Nội dung**: Editor soạn bài.
    - **Đề xuất**: Editor **Markdown** với preview (split view hoặc tab), có nút chèn code block và chọn ngôn ngữ (C#, JavaScript, SQL, CSS, PHP, ASP.NET, …).
    - Hoặc WYSIWYG có block "Code" với chọn ngôn ngữ; khi lưu ra HTML có `data-lang="csharp"` cho từng block.
  - **Tag / Ngôn ngữ**: Chọn hoặc nhập tag (C#, SQL, JavaScript, …).
  - **File đính kèm**: Khu vực upload (ZIP hoặc file code: .cs, .js, .sql, .config, …). Hiển thị danh sách file đã upload, có thể xóa trước khi lưu.
- **Lưu**: "Lưu nháp" và "Xuất bản" (hoặc "Đăng bài").

---

## 4. Code block: style và tính năng

### 4.1 Yêu cầu

- **Nhiều ngôn ngữ**: C#, CSS, JavaScript, jQuery, PHP, SQL, MySQL, ASP.NET (C#/VB), HTML, JSON, XML, Bash, … (chuẩn tên Prism/Highlight.js).
- **Style thống nhất**: Font monospace (Consolas, "Fira Code", "JetBrains Mono", hoặc system monospace), nền và viền theo theme (dark/light của `ba-layout.css`).
- **Mỗi block có**:
  - **Label ngôn ngữ** (góc trên trái hoặc phải của block): ví dụ "C#", "SQL".
  - **Nút "Copy"** góc trên phải: copy toàn bộ nội dung block; sau khi click có feedback (toast "Đã copy" hoặc đổi text "Đã copy!").

### 4.2 Cấu trúc HTML gợi ý (sau khi render)

```html
<div class="devshare-code-block">
  <div class="devshare-code-header">
    <span class="devshare-code-lang">C#</span>
    <button type="button" class="ba-btn ba-btn-sm devshare-code-copy" data-target="code-1">Copy</button>
  </div>
  <pre class="language-csharp"><code id="code-1">// code here</code></pre>
</div>
```

- Class `language-*` dùng cho Prism.js hoặc Highlight.js để highlight.
- `data-target` trỏ tới `id` của `<code>` để copy đúng nội dung.

### 4.3 CSS gợi ý (đồng bộ theme)

- Dùng biến từ `ba-layout.css`: `--bg-card`, `--border`, `--text-primary`, `--text-secondary`.
- Font: `font-family: Consolas, "Fira Code", "JetBrains Mono", monospace;`
- `pre`: padding, overflow-x auto, border-radius, viền nhẹ.
- `.devshare-code-header`: flex, space-between, padding nhỏ, nền nhạt hơn `pre`.
- Nút copy: dùng `.ba-btn-sm.ba-btn-secondary` hoặc style nhỏ gọn, không lấn át code.

### 4.4 Thư viện syntax highlighting

- **Prism.js**: Nhẹ, nhiều theme, nhiều ngôn ngữ (C#, JavaScript, SQL, PHP, CSS, …). Chỉ cần thêm file prism.css + prism.js + components (languages).
- **Highlight.js**: Tương tự, auto-detect ngôn ngữ nếu không chỉ định.
- **Đề xuất**: Prism.js với theme phù hợp dark/light (hoặc custom từ `:root` / `body.light-theme`).

---

## 5. Upload file (ZIP / code mẫu)

### 5.1 Quy tắc

- **Định dạng**: ZIP (khuyến nghị cho nhiều file), hoặc file đơn: .cs, .js, .sql, .config, .html, .css, .php, .aspx, …
- **Giới hạn**: Kích thước tối đa mỗi file (vd: 10–20 MB); số file tối đa mỗi bài (vd: 5).
- **Lưu trữ**: Thư mục riêng (vd: `~/Content/DevShareAttachments/{Year}/{PostId}/`) hoặc blob; lưu path và metadata vào `DevShareCodeAttachment`.

### 5.2 Giao diện

- **Trong form tạo/sửa bài**: Khu vực "File đính kèm" với input file (multiple) hoặc kéo thả. Sau upload hiển thị danh sách (tên, size, nút xóa). Chỉ lưu DB khi user bấm "Lưu nháp" hoặc "Xuất bản".
- **Handler upload**: Tương tự `UploadFeedbackImage.ashx`: nhận file, validate extension và size, lưu vào thư mục tạm hoặc trực tiếp theo PostId (nếu đã có post). Trả về JSON (success, path, fileName, size) để front-end cập nhật list.
- **Trang xem bài**: Liệt kê file với nút "Tải về" (link trực tiếp hoặc handler force-download).

### 5.3 Bảo mật

- Chỉ user đã đăng nhập mới upload; kiểm tra quyền (ví dụ cùng role với trang Dev Share).
- Validate extension whitelist; không thực thi file (chỉ lưu và phục vụ download).
- Tên file lưu trên đĩa nên sanitize (vd: GUID + extension gốc) để tránh path traversal.

---

## 6. UX cho developer

### 6.1 Giao diện thân thiện dev

- **Font**: Monospace rõ ràng cho code; sans-serif cho nội dung bài (đã có từ ba-layout).
- **Theme**: Dùng sẵn dark/light của `ba-layout.css`; code block theo theme (nền tối khi dark, sáng khi light).
- **Mật độ thông tin**: List gọn; trang chi tiết ưu tiên nội dung và code, sidebar/top bar không chiếm quá nhiều chỗ.
- **Empty state**: Luôn có mô tả và CTA ("Viết bài", "Tìm kiếm theo tag").

### 6.2 Copy code

- Một click copy toàn bộ block; toast "Đã copy" (giống Feedback/Database Search).
- (Tùy chọn) Copy không kèm comment hoặc line number nếu sau này thêm số dòng.

### 6.3 Phím tắt (tùy chọn phase sau)

- Trang list: `/` focus ô tìm kiếm.
- Trang bài: C khi focus vào code block → copy block đó.
- Có thể ghi chú ngắn dưới trang "Phím tắt" trong footer hoặc help.

### 6.4 Responsive

- Trên mobile: Code block scroll ngang; nút Copy vẫn dễ bấm; list chuyển 1 cột.

---

## 7. Công nghệ / thư viện đề xuất

| Thành phần | Đề xuất | Ghi chú |
|------------|---------|--------|
| Syntax highlight | Prism.js | Theme One Dark / Coy (hoặc custom); chỉ load language cần dùng |
| Markdown editor | SimpleMDE / EasyMDE hoặc editor Markdown có sẵn | Có preview, nút chèn code block |
| Render Markdown | marked hoặc markdown-it | Chạy phía client hoặc server khi hiển thị bài |
| Copy clipboard | Clipboard API (navigator.clipboard) | Fallback: selection + document.execCommand('copy') |
| Upload file | FormData + XMLHttpRequest/fetch; handler .ashx | Giống UploadFeedbackImage, mở rộng cho ZIP và extension whitelist |
| Layout / UI | ba-layout.css, BaTopBar, sidebar | Thêm 1 mục "Dev Share" trong sidebar |

---

## 8. Lộ trình triển khai gợi ý

### Phase 1 – MVP (dùng nội bộ dev)

1. **DB**: Tạo bảng DevSharePost, DevShareComment, DevShareCodeAttachment (và tag nếu dùng).
2. **Trang list**: Danh sách bài (mock hoặc từ DB), tìm kiếm đơn giản, nút "Viết bài".
3. **Trang xem bài**: Render body (Markdown → HTML), code block với Prism.js + nút Copy, CSS code block theo theme.
4. **Trang tạo/sửa bài**: Form tiêu đề, tóm tắt, body (Markdown), tag; lưu nháp / xuất bản.
5. **Comment**: Danh sách comment + form gửi comment (lưu DB, hiển thị dưới bài).

### Phase 2

6. **Upload file**: Handler upload ZIP/file; lưu đính kèm theo bài; trang xem bài hiển thị danh sách file + nút tải về.
7. **Bộ lọc tag**, sắp xếp (mới nhất, lượt xem, hữu ích).
8. **"Hữu ích"**: Nút like cho bài (và có thể cho comment).

### Phase 3 (tùy chọn)

9. **Chỉnh sửa comment**, reply (thread).
10. **Phím tắt**, cải thiện a11y.
11. **Phân quyền**: Chỉ tác giả/admin sửa bài; ẩn bài nháp với người khác.

---

## 9. Tóm tắt nhanh

- **Dev Share** = trang hướng dẫn code (tutorial) + comment, khác Stack Overflow (Q&A).
- **Bài viết**: Tiêu đề, tóm tắt, body (Markdown), tag; code block nhiều ngôn ngữ với **syntax highlight** và **nút Copy**; có thể **đính kèm ZIP/file code** để tải về.
- **Giao diện**: Dùng chung ba-layout, theme dark/light; code block font monospace, style đồng bộ; list + detail + editor; empty state và mô tả rõ.
- **Công nghệ**: Prism.js (highlight), Markdown (soạn + render), handler upload (ZIP/file), Clipboard API (copy).
- **Lộ trình**: Phase 1 = bài + comment + code block + copy; Phase 2 = upload file + lọc/tag + like; Phase 3 = reply, phím tắt, quyền.

Bạn có thể bắt đầu từ Phase 1: tạo bảng, trang list đơn giản, trang xem bài với Markdown + Prism + Copy, form tạo bài và comment. Sau đó bổ sung upload file và lọc theo tag.
