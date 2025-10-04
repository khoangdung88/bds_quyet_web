# bds_quyet_web

Ứng dụng web BĐS cho dự án Supabase `bds_quyet`, xây dựng bằng React + Vite + TypeScript, tích hợp Supabase JS v2.

## Cấu trúc thư mục

- `src/lib/supabaseClient.ts`: Khởi tạo Supabase client dùng biến môi trường Vite.
- `src/routes/ProjectsList.tsx`: Trang danh sách dự án (bảng `projects`).
- `src/routes/ProjectDetail.tsx`: Trang chi tiết dự án + danh sách BĐS thuộc dự án (bảng `properties`).
- `src/routes/PropertiesList.tsx`: Trang danh sách BĐS (bảng `properties`).
- `src/App.tsx`: Khung layout + điều hướng.
- `src/main.tsx`: Router cấu hình route.

## Biến môi trường

Tệp `.env` đã được tạo sẵn:

```
VITE_SUPABASE_URL=https://acsugjimdqfovvpymvmn.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Lưu ý: anon key có thể commit công khai; nếu cần bảo mật hơn, cân nhắc dùng key runtime/secret management ở môi trường triển khai.

## Chạy cục bộ (PowerShell)

1. Di chuyển tới thư mục dự án:

```powershell
Set-Location -Path "e:\IT\Batdongsan\bds_quyet_web"
```

2. Cài đặt phụ thuộc:

```powershell
npm install
```

3. Chạy dev server:

```powershell
npm run dev
```

Mặc định Vite chạy tại http://localhost:5173

## Build

```powershell
npm run build
```

```powershell
npm run preview
```

## Ghi chú schema Supabase (rút gọn)

- Bảng `projects`: thông tin dự án, có các trường như `name`, `developer`, `status`, `city`, `district`, `logo_url`, ...
- Bảng `properties`: thông tin BĐS, các trường `title`, `listing_type` (sale/rent/lease), `price`, `area`, `bedrooms`, `bathrooms`, `address`, `district`, `city`, `project_id`, ...

Nếu bạn muốn bổ sung xác thực (Auth) và hồ sơ người dùng (`profiles`), cần bật RLS và viết policy phù hợp.
