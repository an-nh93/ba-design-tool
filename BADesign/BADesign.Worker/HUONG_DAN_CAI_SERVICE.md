# Cài BADesign.Worker chạy ngầm (Windows Service)

Worker chỉ cần khi `Web.config` của site đặt `UseBackgroundWorker=true`. Để `false` thì job chạy ngay trong site web (IIS), không cần cài Worker; dùng cách này khi hosting chặn file exe lạ. Chi tiết: `Docs/Project/11-Job-nen-va-thong-bao.md`, mục "Nơi chạy job".

Worker và site dùng chung bộ chạy job (`BaJobRunner` trong `BADesign.dll`) và cùng các khóa `MaxConcurrentJobs`, `WorkerPollIntervalSeconds`. Trước khi chạy bản này phải chạy `Scripts/AddBaJobRunner.sql` trên database của tool. Khi service dừng (`sc stop`, tắt máy), Worker chờ job đang chạy tối đa 15 giây rồi ghi job còn dở là "bị gián đoạn".

## Log (xem Worker nhận job và lỗi)

Trong **App.config** có thể bật ghi file log:

- **WorkerLogPath**: đường dẫn file (vd `WorkerLog.txt`). Nếu để trống = không ghi. Nếu chỉ ghi tên file thì file nằm cạnh **BADesign.Worker.exe**.
- Log ghi: job claimed (Id, Type), job started, job completed hoặc failed (kèm message/exception).

Ví dụ sau khi chạy và bị lỗi, mở `C:\SourceHost\BADesignerTool\Worker\WorkerLog.txt` để xem Worker đã nhận job nào và lỗi gì.

---

# Cài service

Sau khi build Release, copy toàn bộ thư mục (exe, config, BADesign.dll, các DLL phụ thuộc) ra thư mục cố định, ví dụ: `C:\SourceHost\BADesignerTool\Worker`.

## Cách 1: Dùng lệnh sc (có sẵn trên Windows)

**Chạy CMD hoặc PowerShell với quyền Administrator.**

### Cài đặt service
```bat
sc create BADesignWorker binPath= "C:\SourceHost\BADesignerTool\Worker\BADesign.Worker.exe" start= auto
```
- `start= auto`: tự chạy khi mở máy. Dùng `start= demand` nếu chỉ muốn chạy tay.
- **Lưu ý:** có dấu cách sau `binPath= ` và sau `start= `.

### Khởi động / dừng / gỡ
```bat
sc start BADesignWorker
sc stop BADesignWorker
sc delete BADesignWorker
```

### Nếu đổi đường dẫn exe
Gỡ rồi tạo lại:
```bat
sc stop BADesignWorker
sc delete BADesignWorker
sc create BADesignWorker binPath= "ĐƯỜNG_DẪN_MỚI\BADesign.Worker.exe" start= auto
sc start BADesignWorker
```

---

## Cách 2: Dùng NSSM (không cần sửa code, dễ đặt thư mục làm việc)

1. Tải [NSSM](https://nssm.cc/download) (zip), giải nén.
2. Mở CMD **Run as Administrator**:
```bat
nssm install BADesignWorker "C:\SourceHost\BADesignerTool\Worker\BADesign.Worker.exe"
```
3. Trong cửa sổ NSSM:
   - Tab **Application**: Path đã điền; **Startup directory** đặt: `C:\SourceHost\BADesignerTool\Worker` (để config đọc đúng).
   - Tab **Details**: Display name: `BADesign Worker`, Description: `Worker xử lý job Restore / HRHelper`.
4. **Install service** → sau đó vào **Services** (services.msc) để **Start** hoặc set **Automatic**.

Gỡ: `nssm remove BADesignWorker confirm`

---

## Chạy thử ở chế độ console (không cài service)

Để test hoặc xem log ngay trên cửa sổ:
```bat
cd C:\SourceHost\BADesignerTool\Worker
BADesign.Worker.exe
```
Ctrl+C để thoát. Khi cài service thì **không** cần mở cửa sổ này, service chạy ngầm.
