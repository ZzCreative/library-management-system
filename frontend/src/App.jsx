import { useState } from 'react';
import MyHistory from './reader/MyHistory';
import BookSearch from './pages/BookSearch'; // 队友的组件
import './App.css';

function App() {
  // 定义一个状态，用来记录当前停留在哪个页面，默认显示你的 "history"
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* 顶部导航栏 */}
      <nav className="bg-blue-700 text-white shadow-lg p-4 mb-8">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black italic tracking-tighter">LIB-SYS</span>
            <span className="border-l pl-2 font-light text-blue-100">读者大厅</span>
          </div>
          
          <div className="flex space-x-6 text-sm font-medium">
            {/* 点击时，把状态设置为 search */}
            <span 
              onClick={() => setActiveTab('search')}
              className={`cursor-pointer transition-colors pb-1 ${activeTab === 'search' ? 'border-b-2 border-white' : 'hover:text-blue-200'}`}
            >
              图书检索
            </span>
            
            {/* 点击时，把状态设置为 history */}
            <span 
              onClick={() => setActiveTab('history')}
              className={`cursor-pointer transition-colors pb-1 ${activeTab === 'history' ? 'border-b-2 border-white' : 'hover:text-blue-200'}`}
            >
              我的借阅
            </span>
            
            <span className="cursor-pointer hover:text-blue-200 transition-colors">
              个人中心
            </span>
          </div>
        </div>
      </nav>

      {/* 主体内容区域：根据 activeTab 的值，决定显示哪个组件 */}
      <main className="container mx-auto px-4 max-w-5xl">
        {activeTab === 'search' && <BookSearch />}
        {activeTab === 'history' && <MyHistory />}
      </main>
      
      {/* 页脚 */}
      <footer className="mt-20 py-6 border-t border-slate-200 text-center text-slate-400 text-xs">
        &copy; {new Date().getFullYear()} 图书馆管理系统 - 读者服务模块
      </footer>
    </div>
  );
}

export default App;