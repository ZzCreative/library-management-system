import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:3001/api'

export default function ReturnBook() {
  // 1. 完全复用你原来的状态结构
  const [userId, setUserId] = useState('')
  const [bookName, setBookName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // 2. 验证逻辑
  const validateUserId = (value) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, userId: '请输入读者ID' }))
      return false
    }
    setFieldErrors(prev => ({ ...prev, userId: '' }))
    return true
  }

  const validateBookName = (value) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, bookName: '请输入书籍名称' }))
      return false
    }
    setFieldErrors(prev => ({ ...prev, bookName: '' }))
    return true
  }

  // 3. 提交还书
  const handleSubmit = async (e) => {
    e.preventDefault()

    const isUserIdValid = validateUserId(userId)
    const isBookNameValid = validateBookName(bookName)

    if (!isUserIdValid || !isBookNameValid) {
      setError('请填写完整信息')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const token = localStorage.getItem('librarianToken')

      const res = await fetch(`${API_URL}/loans/return-by-user-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId.trim(),
          bookName: bookName.trim()
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '还书失败，请检查信息是否正确')
        setLoading(false)
        return
      }

      // 还书成功：更新书籍状态为可借阅
      setMessage('还书成功！书籍状态已更新为【可借阅】')
      setUserId('')
      setBookName('')
      setLoading(false)
    } catch (err) {
      setError('网络错误，请确保后端已启动')
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">图书归还</h1>
          <p className="text-gray-500 mt-2">输入读者ID与书籍名称办理还书</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 读者ID */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              读者ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition
                ${fieldErrors.userId
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'}`}
              placeholder="请输入读者ID"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                validateUserId(e.target.value)
              }}
              disabled={loading}
              autoFocus
            />
            {fieldErrors.userId && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.userId}</p>
            )}
          </div>

          {/* 书籍名称 */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              书籍名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition
                ${fieldErrors.bookName
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'}`}
              placeholder="请输入书籍名称"
              value={bookName}
              onChange={(e) => {
                setBookName(e.target.value)
                validateBookName(e.target.value)
              }}
              disabled={loading}
            />
            {fieldErrors.bookName && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.bookName}</p>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              {message}
            </div>
          )}

          {/* 登录按钮 */}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                处理中...
              </span>
            ) : '确认归还书籍'}
          </button>
        </form>
      </div>
    </div>
  )
}