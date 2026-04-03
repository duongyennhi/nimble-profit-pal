import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success('Đăng nhập thành công!');
      navigate('/');
    } else {
      toast.error('Tên đăng nhập không đúng!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">💰</div>
          <CardTitle className="text-2xl">Quản Lý Thu Chi</CardTitle>
          <CardDescription>Đăng nhập để tiếp tục</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin hoặc staff1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu bất kỳ" />
            </div>
            <Button type="submit" className="w-full">Đăng nhập</Button>
          </form>
          <div className="mt-4 p-3 rounded-md bg-muted text-xs text-muted-foreground">
            <p className="font-medium mb-1">Tài khoản demo:</p>
            <p><strong>admin</strong> — Quản trị (xem tất cả)</p>
            <p><strong>staff1</strong> — Nhân viên (chỉ bán hàng)</p>
            <p>Mật khẩu: bất kỳ</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
