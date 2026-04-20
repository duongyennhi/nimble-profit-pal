import React, { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";

const STORAGE_KEY = "store_settings";

type StoreSettings = {
  storeName: string;
  address: string;
  phone: string;
  invoiceFooter: string;
};

const defaultSettings: StoreSettings = {
  storeName: "CỬA HÀNG TIỆN LỢI ABC",
  address: "123 Nguyễn Huệ, Q.1, TP.Hồ Chí Minh",
  phone: "028-1234 5678",
  invoiceFooter: "Cảm ơn quý khách! Hẹn gặp lại!",
};

const SettingsPage: React.FC = () => {
  const [form, setForm] = useState<StoreSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm({
          storeName: parsed.storeName || defaultSettings.storeName,
          address: parsed.address || defaultSettings.address,
          phone: parsed.phone || defaultSettings.phone,
          invoiceFooter: parsed.invoiceFooter || defaultSettings.invoiceFooter,
        });
      } catch (error) {
        console.error("Load settings error:", error);
      }
    }
  }, []);

  const handleChange =
    (field: keyof StoreSettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt cửa hàng",
      });
    } catch (error) {
      console.error("Save settings error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu cài đặt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Cài đặt</h1>

      <div className="rounded-2xl border bg-white p-6 shadow-sm max-w-3xl">
        <h2 className="text-2xl font-semibold mb-6">Thông tin cửa hàng</h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-base font-medium mb-2">
              Tên cửa hàng
            </label>
            <input
              type="text"
              value={form.storeName}
              onChange={handleChange("storeName")}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên cửa hàng"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-2">Địa chỉ</label>
            <input
              type="text"
              value={form.address}
              onChange={handleChange("address")}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập địa chỉ"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-2">
              Số điện thoại
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={handleChange("phone")}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-2">
              Chữ ký hóa đơn
            </label>
            <textarea
              value={form.invoiceFooter}
              onChange={handleChange("invoiceFooter")}
              rows={4}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập nội dung cuối hóa đơn"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;