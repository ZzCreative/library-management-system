const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_BORROW_LIMIT = 3;      // 学生最多借3本
const LOAN_DURATION_DAYS = 30;   // 借期30天

// 辅助函数：获取学生当前借阅数量（未归还）
async function getCurrentBorrowCount(userId) {
  return await prisma.loan.count({
    where: {
      userId,
      returnDate: null
    }
  });
}

// 辅助函数：检查学生是否有逾期未还的图书
async function hasOverdueLoans(userId) {
  const count = await prisma.loan.count({
    where: {
      userId,
      returnDate: null,
      dueDate: { lt: new Date() }
    }
  });
  return count > 0;
}

// 1. 搜索学生（馆员/管理员专用）
router.get('/users/search', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'LIBRARIAN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Librarian or Admin only.' });
    }

    const { keyword } = req.query;
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { studentId: { contains: keyword } },
          { email: { contains: keyword.toLowerCase() } }
        ],
        role: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        role: true
      },
      take: 20
    });

    // 附加当前借阅数量和逾期状态
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const currentCount = await getCurrentBorrowCount(user.id);
      const hasOverdue = await hasOverdueLoans(user.id);
      return {
        ...user,
        currentBorrowCount: currentCount,
        hasOverdue,
        canBorrow: (currentCount < MAX_BORROW_LIMIT) && !hasOverdue
      };
    }));

    res.json({ users: usersWithStatus });
  } catch (error) {
    next(error);
  }
});

// 2. 搜索图书（馆员/管理员专用）
router.get('/books/search', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'LIBRARIAN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Librarian or Admin only.' });
    }

    const { keyword } = req.query;
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { isbn: { contains: keyword } }
        ]
      },
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        availableCopies: true,
        totalCopies: true
      },
      take: 20
    });

    res.json({ books });
  } catch (error) {
    next(error);
  }
});

// 3. 馆员借出图书给学生
// backend/src/routes/loans.js

router.post('/lend', requireAuth, async (req, res, next) => {
  const { userId, bookId } = req.body;

  try {
    // 使用 Prisma 事务：要么全部成功，要么全部失败
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. 检查库存
      const book = await tx.book.findUnique({ where: { id: parseInt(bookId) } });
      if (!book) throw new Error('找不到该书籍');
      if (book.availableCopies <= 0) throw new Error('库存不足，无法借阅');

      // 2. 检查该学生是否已经借过这本书还没还
      const existing = await tx.loan.findFirst({
        where: { userId: parseInt(userId), bookId: parseInt(bookId), returnDate: null }
      });
      if (existing) throw new Error('该学生已借阅此书且尚未归还');

      // 3. 创建借书记录
      const loan = await tx.loan.create({
        data: {
          userId: parseInt(userId),
          bookId: parseInt(bookId),
          checkoutDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天期
        }
      });

      // 4. 【核心】自动减少库存
      await tx.book.update({
        where: { id: parseInt(bookId) },
        data: { availableCopies: { decrement: 1 } } // 自动减 1
      });

      return loan;
    });

    res.json({ message: '借书成功', loan: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});





// 4. 获取当前登录用户的个人借阅历史
// backend/src/routes/loans.js

router.get('/my-history', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id; // 从中间件获取当前登录用户ID

    const history = await prisma.loan.findMany({
      where: {
        userId: userId,
      },
      include: {
        // 关键点：这里决定了返回的数据里包含哪些书籍信息
        book: {
          select: {
            title: true,
            author: true,
            isbn: true,
            genre: true,
            totalCopies: true,      // 书籍总馆藏数
            availableCopies: true,  // 书籍当前可借数
          },
        },
      },
      orderBy: {
        checkoutDate: 'desc',
      },
    });

    // 处理状态逻辑（已归还/借阅中/逾期）
    const processedHistory = history.map(loan => {
      let status = 'ON_LOAN';
      if (loan.returnDate) {
        status = 'RETURNED';
      } else if (new Date(loan.dueDate) < new Date()) {
        status = 'OVERDUE';
      }

      return {
        ...loan,
        status
      };
    });

    res.json(processedHistory);
  } catch (error) {
    next(error);
  }
});
// 5.归还书籍接口
router.post('/return/:loanId', requireAuth, async (req, res, next) => {
  const { loanId } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. 查找这条借书记录
      const loan = await tx.loan.findUnique({ where: { id: parseInt(loanId) } });
      if (!loan) throw new Error('找不到借阅记录');
      if (loan.returnDate) throw new Error('此书已在之前归还');

      // 2. 更新归还日期
      const updatedLoan = await tx.loan.update({
        where: { id: parseInt(loanId) },
        data: { returnDate: new Date() }
      });

      // 3. 【核心】自动恢复库存
      await tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } } // 自动加 1
      });

      return updatedLoan;
    });

    res.json({ message: '归还成功，库存已恢复', loan: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;