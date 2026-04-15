import { useState, useEffect } from 'react';

function MyHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renewMessage, setRenewMessage] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/reader/my-borrows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setHistory(data.loans || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (loanId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/api/reader/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ loanIds: [loanId] })
      });
      const data = await response.json();
      const result = data.results[0];
      if (result.success) {
        setRenewMessage('Renew success! New due date: ' + new Date(result.newDueDate).toLocaleDateString());
        fetchHistory();
      } else {
        setRenewMessage('Renew failed: ' + result.message);
      }
    } catch (error) {
      setRenewMessage('Renew failed');
    }
    setTimeout(() => setRenewMessage(''), 3000);
  };

  const getStatusText = (loan) => {
    if (loan.returnDate) return 'Returned';
    const dueDate = new Date(loan.dueDate);
    if (dueDate < new Date()) return 'Overdue';
    return 'On Loan';
  };

  const getStatusColor = (loan) => {
    if (loan.returnDate) return '#10b981';
    const dueDate = new Date(loan.dueDate);
    if (dueDate < new Date()) return '#ef4444';
    return '#3b82f6';
  };

  const canRenew = (loan) => {
    if (loan.returnDate) return false;
    const dueDate = new Date(loan.dueDate);
    if (dueDate < new Date()) return false;
    return (loan.renewCount || 0) < 2;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2>My Borrow History</h2>
      {renewMessage && <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: renewMessage.includes('success') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>{renewMessage}</div>}
      {history.length === 0 ? <p>No records</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Author</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Borrow Date</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Due Date</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Renew Count</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.map(loan => (
              <tr key={loan.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{loan.book?.title || 'Unknown'}</td>
                <td style={{ padding: '12px' }}>{loan.book?.author || 'Unknown'}</td>
                <td style={{ padding: '12px' }}>{new Date(loan.checkoutDate).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>{new Date(loan.dueDate).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>{loan.renewCount || 0}/2</td>
                <td style={{ padding: '12px' }}><span style={{ backgroundColor: getStatusColor(loan), color: 'white', padding: '2px 8px', borderRadius: '12px' }}>{getStatusText(loan)}</span></td>
                <td style={{ padding: '12px' }}>
                  {canRenew(loan) && <button onClick={() => handleRenew(loan.id)} style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Renew</button>}
                  {!canRenew(loan) && !loan.returnDate && <span style={{ color: '#dc3545' }}>{loan.renewCount >= 2 ? 'Max renewals' : 'Overdue'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyHistory;