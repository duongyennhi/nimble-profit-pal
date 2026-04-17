import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Receipt,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleCode = user?.role_code || user?.roleCode || '';
  const isAdmin = roleCode === 'admin';
  const isStaff = roleCode === 'staff';

  const displayName = user?.full_name || user?.fullName || 'Người dùng';
  const displayRole = isAdmin ? 'Quản trị' : 'Nhân viên';

  const navItems = useMemo(
    () => [
      ...(isAdmin ? [{ to: '/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard }] : []),
      { to: '/products', label: 'Sản phẩm', icon: Package },
      { to: '/purchases', label: 'Nhập hàng', icon: Receipt },
      { to: '/sales', label: 'Bán hàng', icon: ShoppingCart },
      { to: '/invoices', label: 'Hóa đơn', icon: FileText },
      ...(isAdmin
        ? [
            { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
            { to: '/users', label: 'Người dùng', icon: Users },
          ]
        : []),
      { to: '/settings', label: 'Cài đặt', icon: Settings },
    ],
    [isAdmin]
  );

  useEffect(() => {
    // Chỉ redirect nếu không còn đang load dữ liệu auth
    if (!isLoading && !user) {
      navigate('/login');
      return;
    }

    if (user && isStaff) {
      const blockedPaths = ['/dashboard', '/reports', '/users'];

      if (blockedPaths.includes(location.pathname)) {
        navigate('/sales', { replace: true });
      }
    }
  }, [user, isStaff, isLoading, location.pathname, navigate]);

  // Hiển thị loading khi đang xác minh token
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
          <p className="text-slate-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Nếu sau khi load xong mà không có user, không render gì (useEffect sẽ redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <h1 className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">
            💰 Quản Lý Doanh Thu
          </h1>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground">
              {displayName.charAt(0)}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-sidebar-foreground">{displayRole}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block" />

          <div className="text-sm text-muted-foreground">
            Xin chào, <span className="font-medium text-foreground">{displayName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;