const API_BASE_URL = 'http://localhost:5010/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getProductsApi() {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được danh sách sản phẩm');
  }

  return data;
}

export async function createProductApi(payload: any) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không tạo được sản phẩm');
  }

  return data;
}

export async function updateProductApi(id: number, payload: any) {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không cập nhật được sản phẩm');
  }

  return data;
}

export async function updateProductStatusApi(
  id: number,
  status: 'active' | 'inactive'
) {
  const response = await fetch(`${API_BASE_URL}/products/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không cập nhật được trạng thái sản phẩm');
  }

  return data;
}

export async function deleteProductApi(id: number) {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không xóa được sản phẩm');
  }

  return data;
}