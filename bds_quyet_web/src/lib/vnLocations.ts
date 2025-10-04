export type VNProvince = {
  Name: string;
  Code: string;
  Districts: Array<{
    Name: string;
    Code: string;
    Wards: Array<{
      Name: string;
      Code: string;
    }>;
  }>;
};

export async function fetchVNLocations(): Promise<VNProvince[]> {
  // Nguồn dữ liệu hành chính Việt Nam công khai (tĩnh)
  const url = 'https://raw.githubusercontent.com/kenzouno1/DiaGioiHanhChinhVN/master/data.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không tải được danh sách địa giới hành chính');
  const data = (await res.json()) as VNProvince[];
  return data;
}
