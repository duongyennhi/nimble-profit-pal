export async function createUserApi(payload: {
  full_name: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  role_code: 'admin' | 'staff';
}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`http://localhost:5010/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không tạo được người dùng');
  }

  return data;
}