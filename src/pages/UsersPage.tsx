import React, { useState } from 'react';
import { mockUsers } from '@/data/mock';
import { User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const UsersPage: React.FC = () => {
  const [users] = useState<User[]>(mockUsers);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
      <Card>
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên đăng nhập</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono">{u.username}</TableCell>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.active ? 'default' : 'destructive'}>
                        {u.active ? 'Hoạt động' : 'Khóa'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
