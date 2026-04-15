// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
// --- 关键：引入项目自带的 token 工具 ---
const { signToken } = require('../lib/token'); 

const { signLibrarianToken } = require('../lib/librarianToken');

const router = express.Router();
const prisma = new PrismaClient();

function normalizeQueryResult(result) {
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }
  return result || null;
}

async function findLibrarianByEmployeeId(employeeId) {
  if (prisma.librarian) {
    return prisma.librarian.findUnique({ where: { employeeId } });
  }
  const result = await prisma.$queryRaw`
    SELECT id, employee_id AS "employeeId", name, password
    FROM librarians
    WHERE employee_id = ${employeeId}
    LIMIT 1
  `;
  return normalizeQueryResult(result);
}

async function findLibrarianById(id) {
  if (prisma.librarian) {
    return prisma.librarian.findUnique({ where: { id } });
  }
  const result = await prisma.$queryRaw`
    SELECT id, employee_id AS "employeeId", name, password
    FROM librarians
    WHERE id = ${id}
    LIMIT 1
  `;
  return normalizeQueryResult(result);
}

async function createLibrarian(employeeId, name, password) {
  if (prisma.librarian) {
    return prisma.librarian.create({ data: { employeeId, name, password } });
  }

  await prisma.$executeRaw`
    INSERT INTO librarians (employee_id, name, password, created_at, updated_at)
    VALUES (${employeeId}, ${name}, ${password}, datetime('now'), datetime('now'))
  `;

  return findLibrarianByEmployeeId(employeeId);
}

async function librarianExistsByEmployeeId(employeeId) {
  if (prisma.librarian) {
    const existing = await prisma.librarian.findUnique({ where: { employeeId } });
    return Boolean(existing);
  }
  const result = await prisma.$queryRaw`
    SELECT id
    FROM librarians
    WHERE employee_id = ${employeeId}
    LIMIT 1
  `;
  if (Array.isArray(result)) {
    return result.length > 0;
  }
  return Boolean(result);
}

// ... 馆员注册/登录代码 (如果也要改，就把 jwt.sign 换成 signToken) ...

// --- 学生登录接口 (使用数据库真实数据) ---
router.post('/login-student', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. 在数据库 User 表中根据 email 查找真实学生
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 2. 验证密码：将用户输入的 password 与数据库中的 passwordHash 进行对比
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: '密码错误' });
    }

// 3. 生成 Token (使用项目自带的 signToken 函数)
    const token = signToken({
      sub: String(user.id), // 对应中间件的要求
      id: user.id,
      role: user.role
    });

    res.json({
      message: '学生登录成功',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '登录过程中发生错误' });
  }
});

// --- 图书管理员注册 ---
router.post('/register', async (req, res) => {
  const { employeeId, name, password } = req.body;

  if (!employeeId || !name || !password) {
    return res.status(400).json({ error: '工号、姓名和密码都是必需的' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于6位' });
  }

  try {
    const exists = await librarianExistsByEmployeeId(employeeId);
    if (exists) {
      return res.status(409).json({ error: '工号已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const librarian = await createLibrarian(employeeId, name, hashedPassword);

    res.json({
      message: '图书管理员注册成功',
      librarian: {
        id: librarian.id,
        employeeId: librarian.employeeId,
        name: librarian.name,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '工号已存在' });
    }
    console.error(error);
    res.status(500).json({ error: '注册过程中发生错误' });
  }
});

// --- 图书管理员登录 ---
router.post('/login', async (req, res) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ error: '工号和密码都是必需的' });
  }

  try {
    const librarian = await findLibrarianByEmployeeId(employeeId);

    if (!librarian) {
      return res.status(401).json({ error: '工号不存在' });
    }

    const isValid = await bcrypt.compare(password, librarian.password);
    if (!isValid) {
      return res.status(401).json({ error: '密码错误' });
    }

    const token = signLibrarianToken({ id: librarian.id });

    res.json({
      message: '图书管理员登录成功',
      token,
      librarian: {
        id: librarian.id,
        employeeId: librarian.employeeId,
        name: librarian.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '登录过程中发生错误' });
  }
});

module.exports = router;
