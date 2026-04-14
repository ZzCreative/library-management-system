import { useState, useEffect } from 'react';
import './BookSearch.css';

function BookSearchWithLoan({ user, onLogout }) {
  const [searchTitle, setSearchTitle] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [myLoans, setMyLoans] = useState([]);
  const [showLoans, setShowLoans] = useState(false);
  const [loanLoading, setLoanLoading] = useState(false);

  const token = localStorage.getItem('token');

  // 获取我的借阅记录
  const fetchMyLoans = async () => {
    setLoanLoading(true);
    try {
      const response = await fetch('http://localhost:3001/loans/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMyLoans(data.data || []);
    } catch (error) {
      console.error('获取借阅记录失败:', error);
    } finally {
      setLoanLoading(false);
    }
  };

  // 借阅图书
  const handleBorrow = async (bookId) => {
    if (!token) {
      alert('请先登录');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:3001/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('借阅成功！');
        handleSearch(); // 刷新图书列表
        fetchMyLoans(); // 刷新借阅记录
      } else {
        alert(data.message || '借阅失败');
      }
    } catch (error) {
      alert('借阅失败：' + error.message);
    }
  };

  // 归还图书
  const handleReturn = async (loanId) => {
    try {
      const response = await fetch(`http://localhost:3001/loans/${loanId}/return`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('归还成功！');
        fetchMyLoans();
        handleSearch();
      } else {
        alert(data.message || '归还失败');
      }
    } catch (error) {
      alert('归还失败：' + error.message);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    
    try {
      const params = new URLSearchParams();
      if (searchTitle) params.append('title', searchTitle);
      if (searchAuthor) params.append('author', searchAuthor);
      if (searchKeyword) params.append('keyword', searchKeyword);
      
      const response = await fetch(`http://localhost:3001/books/search?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setBooks(result.data);
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error('搜索出错：', error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchTitle('');
    setSearchAuthor('');
    setSearchKeyword('');
    setBooks([]);
    setSearched(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    window.location.href = '/login';
  };

  const toggleLoans = () => {
    setShowLoans(!showLoans);
    if (!showLoans) {
      fetchMyLoans();
    }
  };

  return (
    <div className="book-search-container">
      <div className="header">
        <h1>图书检索系统</h1>
        <div className="user-info">
          <span>欢迎，{user?.name || user?.email || '读者'}</span>
          <button onClick={toggleLoans} className="loans-btn">
            {showLoans ? '图书搜索' : '我的借阅'}
          </button>
          <button onClick={handleLogout} className="logout-btn">退出登录</button>
        </div>
      </div>

      {!showLoans ? (
        <>
          <div className="search-form">
            <div className="search-row">
              <label>书名：</label>
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="请输入书名"
              />
            </div>
            <div className="search-row">
              <label>作者：</label>
              <input
                type="text"
                value={searchAuthor}
                onChange={(e) => setSearchAuthor(e.target.value)}
                placeholder="请输入作者"
              />
            </div>
            <div className="search-row">
              <label>关键词：</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="请输入关键词（书名或作者）"
              />
            </div>
            <div className="search-buttons">
              <button onClick={handleSearch} disabled={loading}>
                {loading ? '搜索中...' : '搜索'}
              </button>
              <button onClick={handleReset}>重置</button>
            </div>
          </div>

          <div className="search-results">
            {searched && (
              <>
                <h2>搜索结果（共 {books.length} 条）</h2>
                {books.length === 0 ? (
                  <p className="no-results">未找到相关图书</p>
                ) : (
                  <div className="books-grid">
                    {books.map((book) => (
                      <div key={book.id} className="book-card">
                        <h3>{book.title}</h3>
                        <p><strong>作者：</strong>{book.author}</p>
                        <p><strong>ISBN：</strong>{book.isbn}</p>
                        <p><strong>类型：</strong>{book.genre}</p>
                        <p><strong>状态：</strong>
                          <span className={book.available && book.availableCopies > 0 ? 'available' : 'unavailable'}>
                            {book.available && book.availableCopies > 0 ? '可借阅' : '已借出'}
                          </span>
                        </p>
                        {book.available && book.availableCopies > 0 && (
                          <button onClick={() => handleBorrow(book.id)} className="borrow-btn">
                            借阅
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="my-loans">
          <h2>我的借阅记录</h2>
          {loanLoading ? (
            <p>加载中...</p>
          ) : myLoans.length === 0 ? (
            <p>暂无借阅记录</p>
          ) : (
            <div className="loans-list">
              {myLoans.map((loan) => (
                <div key={loan.id} className="loan-card">
                  <h3>{loan.book?.title || '图书'}</h3>
                  <p><strong>借阅日期：</strong>{new Date(loan.checkoutDate).toLocaleDateString()}</p>
                  <p><strong>应还日期：</strong>{new Date(loan.dueDate).toLocaleDateString()}</p>
                  {loan.returnDate ? (
                    <p><strong>归还日期：</strong>{new Date(loan.returnDate).toLocaleDateString()}</p>
                  ) : (
                    <button onClick={() => handleReturn(loan.id)} className="return-btn">
                      归还
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BookSearchWithLoan;