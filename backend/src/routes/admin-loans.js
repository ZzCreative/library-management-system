const express = require('express');

const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied' });
  }

  return next();
}

async function calculateFine(tx, dueDate, returnDate) {
  if (!returnDate || returnDate <= dueDate) {
    return 0;
  }

  const diffDays = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
  const fineRateConfig = await tx.config.findUnique({
    where: { key: 'FINE_RATE_PER_DAY' },
  });
  const rate = fineRateConfig ? Number.parseFloat(fineRateConfig.value) : 0.5;

  return diffDays * rate;
}

router.get('/active', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      where: {
        returnDate: null,
      },
      select: {
        id: true,
        checkoutDate: true,
        dueDate: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
          },
        },
        copy: {
          select: {
            id: true,
            barcode: true,
            status: true,
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                isbn: true,
              },
            },
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { checkoutDate: 'desc' },
      ],
    });

    res.json({ loans });
  } catch (error) {
    next(error);
  }
});

router.post('/:loanId/receive-return', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const loanId = Number.parseInt(req.params.loanId, 10);

    if (Number.isNaN(loanId)) {
      return res.status(400).json({ message: 'Invalid loan id' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        copy: {
          include: {
            book: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan record not found' });
    }

    if (loan.returnDate !== null) {
      return res.status(400).json({ message: 'Loan record already returned' });
    }

    const returnDate = new Date();
    const fine = await prisma.$transaction(async (tx) => {
      const calculatedFine = await calculateFine(tx, loan.dueDate, returnDate);
      const updatedLoan = await tx.loan.updateMany({
        where: {
          id: loanId,
          returnDate: null,
        },
        data: {
          returnDate,
          fineAmount: calculatedFine,
          finePaid: false,
        },
      });

      if (updatedLoan.count === 0) {
        const error = new Error('Loan record already returned');
        error.statusCode = 400;
        throw error;
      }

      await tx.copy.update({
        where: { id: loan.copyId },
        data: { status: 'AVAILABLE' },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ADMIN_RECEIVE_RETURN',
          entity: 'Loan',
          entityId: loan.id,
          detail: `Admin ${req.user.id} received return for loan ${loan.id}, copy ${loan.copyId}, book "${loan.copy.book.title}".`,
        },
      });

      return calculatedFine;
    });

    res.json({
      message:
        fine > 0
          ? `Book returned late. Fine: ${fine}元`
          : 'Book returned successfully',
      loanId: loan.id,
      returnDate,
      fine,
      copyStatus: 'AVAILABLE',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
