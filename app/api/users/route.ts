import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { z } from 'zod';

const userSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  email: z.string().email('邮箱格式不正确').optional(),
  name: z.string().optional(),
  password: z.string().min(6, '密码至少6个字符'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).default('USER'),
});

// 获取用户列表
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '没有权限访问' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const where = {
      OR: search ? [
        { username: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } },
      ] : undefined,
    };

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建用户
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '没有权限创建用户' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = userSchema.parse(body);

    // 检查用户名是否已存在
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          data.email ? { email: data.email } : undefined,
        ].filter(Boolean),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: '用户名或邮箱已存在' },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(newUser);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || '创建用户失败' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(req: Request) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '没有权限更新用户' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { password, ...data } = userSchema.partial().parse(body);

    // 检查用户名或邮箱是否被其他用户使用
    if (data.username || data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            data.username ? { username: data.username } : undefined,
            data.email ? { email: data.email } : undefined,
          ].filter(Boolean),
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: '用户名或邮箱已被使用' },
          { status: 400 }
        );
      }
    }

    // 如果提供了新密码，则加密
    const updateData = password
      ? { ...data, password: await hashPassword(password) }
      : data;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || '更新用户失败' },
      { status: 500 }
    );
  }
}
