-- =============================================
-- License Key (dev-debug)
-- =============================================
-- KHÔNG cần quyền trong DB cho tính năng này.
-- Việc hiển thị/sử dụng License Key được giới hạn theo USERNAME (whitelist) ở tầng code:
--   BADesign.LicenseKeyAccess  (mặc định: romls93, an.nh)
-- Có thể chỉnh danh sách bằng appSetting "LicenseKeyAllowedUsers" trong Web.config
-- mà không cần build lại, ví dụ:
--   <add key="LicenseKeyAllowedUsers" value="romls93,an.nh" />
--
-- Script này cố ý để trống (no-op) để không cấp quyền qua Role/Permission,
-- tránh các đồng nghiệp khác nhìn thấy tính năng.
PRINT 'License Key: access is controlled by username whitelist in code (LicenseKeyAccess), no DB permission needed.';
GO
