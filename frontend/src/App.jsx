<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import BookSearchWithLoan from './pages/BookSearchWithLoan';
=======
import MyHistory from './reader/MyHistory';
import BookSearch from './pages/BookSearch'; // 保留搜索组件
>>>>>>> f8405073bf6609d161df33a23d071d2df001b3b2
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
<<<<<<< HEAD
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" /> : <Login onLogin={setUser} />
        } />
        <Route path="/register" element={
          user ? <Navigate to="/" /> : <Register />
        } />
        <Route path="/" element={
          user ? <BookSearchWithLoan user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />
        } />
      </Routes>
    </BrowserRouter>
=======
    <div className="min-h-screen bg-slate-100">
      
      {/* 顶部导航栏 */}
      <nav className="bg-blue-700 text-white shadow-lg p-4 mb-8">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black italic tracking-tighter">LIB-SYS</span>
            <span className="border-l pl-2 font-light text-blue-100">读者大厅</span>
          </div>
          
          <div className="flex space-x-6 text-sm font-medium">
            <span className="cursor-pointer hover:text-blue-200 transition-colors">图书检索</span>
            <span className="cursor-pointer border-b-2 border-white pb-1">我的借阅</span>
            <span className="cursor-pointer hover:text-blue-200 transition-colors">个人中心</span>
          </div>
        </div>
      </nav>

      {/* 主体内容区域 - 把两个功能都放进去 */}
      <main className="container mx-auto px-4 max-w-5xl space-y-12">
        
        {/* 1. 图书搜索功能 */}
        <section>
          <BookSearch />
        </section>

        {/* 2. 借阅历史功能 */}
        <section>
          <MyHistory />
        </section>

      </main>
      
      {/* 页脚 */}
      <footer className="mt-20 py-6 border-t border-slate-200 text-center text-slate-400 text-xs">
        &copy; {new Date().getFullYear()} 图书馆管理系统 - 读者服务模块
      </footer>
    </div>
>>>>>>> f8405073bf6609d161df33a23d071d2df001b3b2
  );
}

export default App;