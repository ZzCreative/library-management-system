import { useEffect, useState } from 'react';

function AdminReturnBooks() {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoanId, setActionLoanId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      window.location.href = '/admin-login';
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (user.role !== 'ADMIN') {
        window.location.href = '/admin-login';
        return;
      }
    } catch {
      window.location.href = '/admin-login';
      return;
    }

    fetchActiveLoans();
  }, []);

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('http://localhost:3001/api/admin/loans/active', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '获取当前借阅记录失败');
      }

      setLoans(data.loans || []);
    } catch (err) {
      setError(err.message || '获取当前借阅记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveReturn = async (loanId) => {
    const confirmed = window.confirm('确认接收该图书归还并恢复为可借状态吗？');

    if (!confirmed) {
      return;
    }

    try {
      setActionLoanId(loanId);
      setError('');
      setMessage('');

      const response = await fetch(`http://localhost:3001/api/admin/loans/${loanId}/receive-return`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '接收还书失败');
      }

      const fineMessage = data.fine > 0 ? `，罚款 ${data.fine} 元` : '';
      setMessage(`已归还，副本状态已更新为可借${fineMessage}。`);
      await fetchActiveLoans();
    } catch (err) {
      setError(err.message || '接收还书失败');
    } finally {
      setActionLoanId(null);
    }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  const filteredLoans = loans.filter((loan) => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    const fields = [
      String(loan.id),
      loan.user?.name || '',
      loan.user?.studentId || '',
      loan.user?.email || '',
      loan.copy?.book?.title || '',
      loan.copy?.book?.isbn || '',
      loan.copy?.barcode || '',
    ];

    return fields.some((value) => value.toLowerCase().includes(keyword));
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 8px' }}>接收还书</h1>
          <p style={{ margin: 0, color: '#666' }}>查看当前在借记录，并在收到图书后更新副本状态。</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/admin-dashboard" style={{ padding: '10px 16px', background: '#6b7280', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
            返回控制台
          </a>
          <button
            onClick={fetchActiveLoans}
            style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            disabled={loading}
          >
            刷新列表
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="搜索借阅 ID、学生姓名、学号、邮箱、图书名、ISBN、条码"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '520px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
        />
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</div>}
      {message && <div style={{ color: '#059669', marginBottom: '12px' }}>{message}</div>}

      {loading ? (
        <div>加载中...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>借阅 ID</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>学生</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>学号</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>图书名</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>ISBN</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>条码</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>借出日期</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>应还日期</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>当前状态</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  当前没有匹配的在借记录
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => (
                <tr key={loan.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{loan.id}</td>
                  <td style={{ padding: '10px' }}>{loan.user?.name || '-'}</td>
                  <td style={{ padding: '10px' }}>{loan.user?.studentId || '-'}</td>
                  <td style={{ padding: '10px' }}>{loan.copy?.book?.title || '-'}</td>
                  <td style={{ padding: '10px' }}>{loan.copy?.book?.isbn || '-'}</td>
                  <td style={{ padding: '10px' }}>{loan.copy?.barcode || '-'}</td>
                  <td style={{ padding: '10px' }}>{new Date(loan.checkoutDate).toLocaleDateString()}</td>
                  <td style={{ padding: '10px' }}>{new Date(loan.dueDate).toLocaleDateString()}</td>
                  <td style={{ padding: '10px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        color: 'white',
                        background: isOverdue(loan.dueDate) ? '#dc2626' : '#2563eb',
                        fontSize: '12px',
                      }}
                    >
                      {isOverdue(loan.dueDate) ? '已逾期' : '借出中'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button
                      onClick={() => handleReceiveReturn(loan.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoanId === loan.id ? 'not-allowed' : 'pointer',
                        opacity: actionLoanId === loan.id ? 0.7 : 1,
                      }}
                      disabled={actionLoanId === loan.id}
                    >
                      {actionLoanId === loan.id ? '处理中...' : '接收还书'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminReturnBooks;
