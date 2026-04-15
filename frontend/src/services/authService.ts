const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    fullName: string;
    username: string;
    roleCode: string;
    roleName: string;
  };
}

export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Đăng nhập thất bại');
  }

  return response.json();
};

export const getMeApi = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể lấy thông tin người dùng');
  }

  return response.json();
};