import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { loginApi } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const result = await loginApi(username, password);

      localStorage.setItem('token', result.token);
      setAuthUser(result.user);

      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Đăng nhập thất bại';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-10 text-white">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                💰
              </div>
              <div>
                <h1 className="text-2xl font-bold">Quản Lý Doanh Thu</h1>
                <p className="text-sm text-white/70">
                  Hệ thống quản lý bán hàng và doanh thu
                </p>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <h2 className="text-3xl font-bold leading-tight">
                QUÁN ĂN GIA ĐÌNH ABC
              </h2>
              <p className="max-w-md text-base text-white/75">
                Khách hàng là trung tâm của chúng tôi. Chúng tôi cam kết mang đến trải nghiệm ẩm thực tuyệt vời và dịch vụ tận tâm cho mọi thành viên trong gia đình bạn.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/75">
            Đăng nhập để truy cập bảng điều khiển, quản lý sản phẩm, hóa đơn và
            báo cáo hệ thống.
          </div>
        </div>

        <div className="flex items-center justify-center bg-white p-6 sm:p-10">
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl shadow-sm">
                💰
              </div>
              <CardTitle className="text-3xl font-bold text-slate-900">
                Đăng nhập
              </CardTitle>
              <CardDescription className="text-base text-slate-500">
                Vui lòng nhập tài khoản để tiếp tục
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700">
                    Tên đăng nhập
                  </Label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên đăng nhập"
                      className="h-12 rounded-xl border-slate-200 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="h-12 rounded-xl border-slate-200 pl-10 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;