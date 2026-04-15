const API_BASE_URL = 'http://localhost:5010/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getUsersApi() {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được danh sách người dùng');
  }

  return data;
}

export async function getRolesApi() {
  const response = await fetch(`${API_BASE_URL}/users/roles`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được danh sách vai trò');
  }

  return data;
}

export async function createUserApi(payload: {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  phone?: string;
  role_id: number;
}) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không tạo được người dùng');
  }

  return data;
}

export async function updateUserApi(
  id: number,
  payload: {
    username: string;
    full_name: string;
    email?: string;
    phone?: string;
    role_id: number;
  }
) {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không cập nhật được người dùng');
  }

  return data;
}

export async function resetUserPasswordApi(
  id: number,
  payload: { new_password: string }
) {
  const response = await fetch(`${API_BASE_URL}/users/${id}/reset-password`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không đặt lại được mật khẩu');
  }

  return data;
}

export async function toggleUserStatusApi(id: number) {
  const response = await fetch(`${API_BASE_URL}/users/${id}/toggle-status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không cập nhật được trạng thái người dùng');
  }

  return data;
}