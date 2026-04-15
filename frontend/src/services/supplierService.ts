const API_BASE_URL = 'http://localhost:5010/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getSuppliersApi() {
  const response = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được nhà cung cấp');
  }

  return data;
}

export async function createSupplierApi(payload: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thêm được nhà cung cấp');
  }

  return data;
}