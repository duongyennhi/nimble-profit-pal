import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  createUserApi,
  getRolesApi,
  getUsersApi,
  resetUserPasswordApi,
  toggleUserStatusApi,
  updateUserApi,
} from '@/services/userService';

type RoleApiItem = {
  id: number;
  code: string;
  name: string;
};

type UserApiItem = {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
  role_id: number;
  role_code: 'admin' | 'staff';
  role_name: string;
};

const emptyCreateForm = {
  username: '',
  password: '',
  full_name: '',
  email: '',
  phone: '',
  role_id: '',
};

const emptyEditForm = {
  username: '',
  full_name: '',
  email: '',
  phone: '',
  role_id: '',
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [roles, setRoles] = useState<RoleApiItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingUser, setEditingUser] = useState<UserApiItem | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const [resetPasswordUser, setResetPasswordUser] = useState<UserApiItem | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm_password: '',
  });

  const navigate = useNavigate();

  const roleOptions = useMemo(() => roles || [], [roles]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const userRaw = localStorage.getItem('user');
      const currentUser = userRaw ? JSON.parse(userRaw) : null;

      if (
        !currentUser ||
        (currentUser.role_code !== 'admin' && currentUser.roleCode !== 'admin')
      ) {
        toast.error('Bạn không có quyền truy cập');
        navigate('/');
        return;
      }

      const [usersData, rolesData] = await Promise.all([
        getUsersApi(),
        getRolesApi(),
      ]);

      setUsers(usersData.users || []);
      setRoles(rolesData.roles || []);
    } catch (error) {
      console.error('USERS PAGE ERROR:', error);
      const message =
        error instanceof Error ? error.message : 'Lỗi tải danh sách người dùng';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [navigate]);

  const resetCreateForm = () => {
    setCreateForm(emptyCreateForm);
  };

  const openEdit = (user: UserApiItem) => {
    setEditingUser(user);
    setEditForm({
      username: user.username || '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role_id: String(user.role_id || ''),
    });
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm(emptyEditForm);
  };

  const openResetPassword = (user: UserApiItem) => {
    setResetPasswordUser(user);
    setPasswordForm({
      new_password: '',
      confirm_password: '',
    });
  };

  const closeResetPassword = () => {
    setResetPasswordUser(null);
    setPasswordForm({
      new_password: '',
      confirm_password: '',
    });
  };

  const handleCreateUser = async () => {
    try {
      if (
        !createForm.full_name.trim() ||
        !createForm.username.trim() ||
        !createForm.password.trim() ||
        !createForm.role_id
      ) {
        toast.error('Vui lòng nhập đầy đủ họ tên, tên đăng nhập, mật khẩu và vai trò');
        return;
      }

      await createUserApi({
        full_name: createForm.full_name.trim(),
        username: createForm.username.trim(),
        password: createForm.password.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        role_id: Number(createForm.role_id),
      });

      toast.success('Tạo người dùng thành công');
      setShowCreateForm(false);
      resetCreateForm();
      fetchUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi tạo người dùng';
      toast.error(message);
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      if (
        !editForm.username.trim() ||
        !editForm.full_name.trim() ||
        !editForm.role_id
      ) {
        toast.error('Vui lòng nhập đầy đủ tên đăng nhập, họ tên và vai trò');
        return;
      }

      await updateUserApi(editingUser.id, {
        username: editForm.username.trim(),
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        role_id: Number(editForm.role_id),
      });

      toast.success('Cập nhật người dùng thành công');
      closeEdit();
      fetchUsers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi cập nhật người dùng';
      toast.error(message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    try {
      if (!passwordForm.new_password.trim()) {
        toast.error('Vui lòng nhập mật khẩu mới');
        return;
      }

      if (passwordForm.new_password.length < 6) {
        toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }

      if (passwordForm.new_password !== passwordForm.confirm_password) {
        toast.error('Xác nhận mật khẩu không khớp');
        return;
      }

      await resetUserPasswordApi(resetPasswordUser.id, {
        new_password: passwordForm.new_password,
      });

      toast.success('Đặt lại mật khẩu thành công');
      closeResetPassword();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi đặt lại mật khẩu';
      toast.error(message);
    }
  };

  const handleToggleStatus = async (user: UserApiItem) => {
    try {
      await toggleUserStatusApi(user.id);
      toast.success(
        user.status === 'active'
          ? 'Khóa tài khoản thành công'
          : 'Mở khóa tài khoản thành công'
      );
      fetchUsers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi cập nhật trạng thái';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <Button onClick={() => setShowCreateForm((prev) => !prev)}>
          {showCreateForm ? 'Đóng form' : 'Thêm người dùng'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">Tạo người dùng mới</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                placeholder="Họ tên"
                value={createForm.full_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, full_name: e.target.value })
                }
              />

              <Input
                placeholder="Tên đăng nhập"
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm({ ...createForm, username: e.target.value })
                }
              />

              <Input
                placeholder="Mật khẩu"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
              />

              <Input
                placeholder="Email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />

              <Input
                placeholder="Số điện thoại"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone: e.target.value })
                }
              />

              <select
                className="w-full rounded-md border p-2"
                value={createForm.role_id}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role_id: e.target.value,
                  })
                }
              >
                <option value="">Chọn vai trò</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateUser}>Lưu người dùng</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateForm();
                }}
              >
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên đăng nhập</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Chưa có người dùng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono">{u.username}</TableCell>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role_code === 'admin' ? 'default' : 'secondary'}
                        >
                          {u.role_name || (u.role_code === 'admin' ? 'Quản trị' : 'Nhân viên')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.status === 'active' ? 'default' : 'destructive'}
                        >
                          {u.status === 'active' ? 'Hoạt động' : 'Khóa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          Sửa thông tin
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResetPassword(u)}
                        >
                          Đặt lại mật khẩu
                        </Button>

                        <Button
                          size="sm"
                          variant={u.status === 'active' ? 'destructive' : 'default'}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingUser && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">Cập nhật người dùng</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                placeholder="Tên đăng nhập"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
              />

              <Input
                placeholder="Họ tên"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
              />

              <Input
                placeholder="Email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />

              <Input
                placeholder="Số điện thoại"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />

              <select
                className="w-full rounded-md border p-2"
                value={editForm.role_id}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    role_id: e.target.value,
                  })
                }
              >
                <option value="">Chọn vai trò</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>Lưu thay đổi</Button>
              <Button variant="outline" onClick={closeEdit}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {resetPasswordUser && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">
              Đặt lại mật khẩu cho: {resetPasswordUser.username}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                type="password"
                placeholder="Mật khẩu mới"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    new_password: e.target.value,
                  })
                }
              />

              <Input
                type="password"
                placeholder="Xác nhận mật khẩu mới"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirm_password: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleResetPassword}>Lưu mật khẩu mới</Button>
              <Button variant="outline" onClick={closeResetPassword}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UsersPage;