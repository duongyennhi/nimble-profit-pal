const API_BASE_URL = 'http://localhost:5010/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

type PaymentMethod = 'cash' | 'bank_transfer' | 'pos';

type SalesLinePayload = {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
};

type SalesInvoicePayload = {
  customer_name?: string;
  note?: string;
  discount_amount?: number;
  payment_method: PaymentMethod;
  customer_paid?: number;
  change_amount?: number;
  lines: SalesLinePayload[];
};

export async function createSalesInvoiceApi(payload: SalesInvoicePayload) {
  const response = await fetch(`${API_BASE_URL}/sales`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không tạo được hóa đơn');
  }

  return data;
}

export async function getSalesInvoicesApi() {
  const response = await fetch(`${API_BASE_URL}/sales`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được danh sách hóa đơn');
  }

  return data;
}

export async function getSalesInvoiceDetailApi(id: number) {
  const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không lấy được chi tiết hóa đơn');
  }

  return data;
}

export async function updateSalesInvoiceApi(
  id: number,
  payload: SalesInvoicePayload
) {
  const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không cập nhật được hóa đơn');
  }

  return data;
}
export async function confirmSalesInvoicePaymentApi(id: number) {
  const response = await fetch(`${API_BASE_URL}/sales/${id}/confirm-payment`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không xác nhận được thanh toán');
  }

  return data;
}