const API_BASE_URL = 'http://localhost:5010/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getPurchasesApi() {
  const response = await fetch(`${API_BASE_URL}/purchases`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được danh sách phiếu nhập');
  }

  return data;
}

export async function createPurchaseApi(payload: {
  supplier_id: number;
  note?: string;
  lines: Array<{
    product_id: number;
    quantity: number;
    unit_cost: number;
  }>;
}) {
  const response = await fetch(`${API_BASE_URL}/purchases`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không tạo được phiếu nhập');
  }

  return data;
}

export async function deletePurchaseApi(id: number) {
  const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không xóa được phiếu nhập');
  }

  return data;
}

export async function updatePurchaseApi(
  id: number,
  payload: {
    supplier_id: number;
    note?: string;
    lines: Array<{
      product_id: number;
      quantity: number;
      unit_cost: number;
    }>;
  }
) {
  const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không cập nhật được phiếu nhập');
  }

  return data;
}
export async function getPurchaseDetailApi(id: number) {
  const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được chi tiết phiếu nhập');
  }

  return data;
}