import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import BookSearchWithLoan from './pages/BookSearchWithLoan';
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
  );
}

export default App;