-- Tạo bảng property_sellers để lưu quan hệ nhiều-nhiều giữa properties và profiles
CREATE TABLE IF NOT EXISTS public.property_sellers (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(property_id, profile_id)
);

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_property_sellers_property_id ON public.property_sellers(property_id);
CREATE INDEX IF NOT EXISTS idx_property_sellers_profile_id ON public.property_sellers(profile_id);

-- Thêm RLS (Row Level Security) nếu cần
ALTER TABLE public.property_sellers ENABLE ROW LEVEL SECURITY;

-- Tạo policy để cho phép đọc công khai (có thể điều chỉnh tùy theo yêu cầu bảo mật)
CREATE POLICY "Allow public read access" ON public.property_sellers
  FOR SELECT USING (true);

-- Chỉ cho phép người dùng đã xác thực thêm/sửa/xóa
CREATE POLICY "Allow authenticated users to manage their own property_sellers" ON public.property_sellers
  FOR ALL USING (auth.role() = 'authenticated');

-- Tạo hàm trigger để cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger cho bảng property_sellers
CREATE TRIGGER set_property_sellers_updated_at
BEFORE UPDATE ON public.property_sellers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tạo view để dễ dàng truy vấn thông tin property và seller
CREATE OR REPLACE VIEW public.property_with_sellers AS
SELECT 
  p.*,
  array_agg(ps.profile_id) AS seller_ids,
  jsonb_agg(
    jsonb_build_object(
      'id', pr.id,
      'full_name', pr.full_name,
      'email', pr.email,
      'phone', pr.phone,
      'company', pr.company
    )
  ) AS sellers
FROM 
  public.properties p
  LEFT JOIN public.property_sellers ps ON p.id = ps.property_id
  LEFT JOIN public.profiles pr ON ps.profile_id = pr.id
GROUP BY 
  p.id;
