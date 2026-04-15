const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getReportSummaryApi(
  range: 'day' | 'week' | 'month' | 'quarter' | 'year'
) {
  const response = await fetch(`${API_BASE_URL}/reports/summary?range=${range}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được dữ liệu báo cáo');
  }

  return data;
}