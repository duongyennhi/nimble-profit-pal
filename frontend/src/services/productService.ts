const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ProductApiItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  status: 'active' | 'inactive';
  category_id?: number | null;
  category_name?: string | null;
}

export interface GetProductsResponse {
  products: ProductApiItem[];
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Không tìm thấy token xác thực');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const getProductsApi = async (): Promise<GetProductsResponse> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Lỗi lấy danh sách sản phẩm');
  }

  return response.json();
};

export const createProductApi = async (data: Omit<ProductApiItem, 'id' | 'stock_quantity' | 'category_name'>): Promise<{ message: string; id: number }> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Lỗi tạo sản phẩm');
  }

  return response.json();
};

export const updateProductApi = async (
  id: number,
  data: Omit<ProductApiItem, 'id' | 'stock_quantity' | 'category_name'>
): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Lỗi cập nhật sản phẩm');
  }

  return response.json();
};

export const updateProductStatusApi = async (
  id: number,
  status: 'active' | 'inactive'
): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Lỗi cập nhật trạng thái sản phẩm');
  }

  return response.json();
};

export const deleteProductApi = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Lỗi xóa sản phẩm');
  }

  return response.json();
};
