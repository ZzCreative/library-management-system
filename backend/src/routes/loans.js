const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// 归还图书接口
router.post('/return/:loanId', async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: { book: true }
    });

    if (!loan) {
      return res.status(404).json({ message: "借阅记录不存在" });
    }
    if (loan.returnedAt) {
      return res.status(400).json({ message: "该书籍已归还" });
    }

    // 更新借阅记录为已归还
    await prisma.loan.update({
      where: { id: parseInt(loanId) },
      data: {
        returnedAt: new Date(),
        status: "RETURNED"
      }
    });

    // 更新书籍状态为可借阅
    await prisma.book.update({
      where: { id: loan.bookId },
      data: { status: "AVAILABLE" }
    });

    res.json({
      success: true,
      message: "归还成功，书籍状态已更新为可借阅",
      bookTitle: loan.book.title
    });

  } catch (error) {
    res.status(500).json({ message: "归还失败", error: error.message });
  }
});

module.exports = router;