import React, { useState } from 'react';
import { mockStoreSettings } from '@/data/mock';
import { StoreSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings>(mockStoreSettings);

  const handleSave = () => {
    toast.success('Cài đặt đã được lưu! (Demo)');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cài đặt</h1>
      <Card className="max-w-lg">
        <CardHeader><CardTitle className="text-base">Thông tin cửa hàng</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Tên cửa hàng</Label>
            <Input value={settings.storeName} onChange={e => setSettings({ ...settings, storeName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Địa chỉ</Label>
            <Input value={settings.storeAddress} onChange={e => setSettings({ ...settings, storeAddress: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Số điện thoại</Label>
            <Input value={settings.storePhone} onChange={e => setSettings({ ...settings, storePhone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Chữ ký hóa đơn</Label>
            <Textarea value={settings.billFooter} onChange={e => setSettings({ ...settings, billFooter: e.target.value })} />
          </div>
          <Button onClick={handleSave} className="w-full">Lưu cài đặt</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
