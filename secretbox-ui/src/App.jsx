import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

//const API_URL = 'https://secretbox-main.onrender.com'; 
const API_URL = 'http://127.0.0.1:8000'; 

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState('catalog');
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [menu, setMenu] = useState({});
  
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Состояния для чата
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef(null);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Автоматическая прокрутка чата вниз
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/coffee-shops`, getAuthHeader())
      .then(response => setShops(response.data.shops))
      .catch(error => {
        if (error.response?.status === 401) handleLogout();
      });
  }, [token]);

  useEffect(() => {
    if (selectedShop && token) {
      axios.get(`${API_URL}/menu/${selectedShop}`, getAuthHeader())
        .then(response => setMenu(response.data.menu))
        .catch(error => {
          if (error.response?.status === 401) handleLogout();
        });
    }
  }, [selectedShop, token]);

  useEffect(() => {
    if (!token) return;
    setLoadingAnalysis(true);
    axios.get(`${API_URL}/analytics/compare`, getAuthHeader())
      .then(response => {
        setAnalyticsData(response.data);
        setLoadingAnalysis(false);
      })
      .catch(error => {
        setLoadingAnalysis(false);
        if (error.response?.status === 401) handleLogout();
      });
  }, [token]);

  // Загрузка сообщений чата и живое обновление (Polling)
  const fetchChatMessages = () => {
    axios.get(`${API_URL}/chat`, getAuthHeader())
      .then(response => setChatMessages(response.data.messages))
      .catch(error => console.error("Ошибка загрузки чата:", error));
  };

  useEffect(() => {
    let interval;
    if (activeTab === 'chat' && token) {
      fetchChatMessages(); // Первичная загрузка
      interval = setInterval(fetchChatMessages, 3000); // Обновление каждые 3 секунды
    }
    return () => clearInterval(interval);
  }, [activeTab, token]);


  const handleLogin = (e) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);
    axios.post(`${API_URL}/login`, { username, password })
      .then(response => {
        const receivedToken = response.data.token;
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        setUsername('');
        setPassword('');
      })
      .catch(error => {
        setMessage(error.response?.data?.detail || 'Ошибка авторизации');
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);
    axios.post(`${API_URL}/register`, { username, password })
      .then(response => {
        setIsSuccess(true);
        setMessage(response.data.detail);
        setIsRegisterMode(false);
        setPassword('');
      })
      .catch(error => {
        setMessage(error.response?.data?.detail || 'Ошибка регистрации');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setShops([]);
    setSelectedShop('');
    setMenu({});
    setAnalyticsData([]);
    setChatMessages([]);
  };

  // Отправка сообщения в чат
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    axios.post(`${API_URL}/chat`, { text: chatInput }, getAuthHeader())
      .then(() => {
        setChatInput('');
        fetchChatMessages();
      })
      .catch(error => console.error("Ошибка отправки:", error));
  };

  const getAnalyticsColumns = () => {
    if (analyticsData.length === 0) return [];
    const keys = new Set();
    analyticsData.forEach(item => {
      Object.keys(item).forEach(key => keys.add(key));
    });
    const cols = Array.from(keys);
    const filtered = cols.filter(c => c !== 'Напиток' && c !== 'Разброс');
    return ['Напиток', ...filtered, 'Разброс'];
  };

  const analyticsColumns = getAnalyticsColumns();

  if (!token) {
    return (
      <div className="app-container">
        <h1 className="secure-title">🔒 SECRETBOX ACCESS</h1>
        <div className="login-card">
          <h2>{isRegisterMode ? 'Регистрация' : 'Авторизация'}</h2>
          <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
            <div className="input-group">
              <label>Логин</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Ведите имя..."
                required 
              />
            </div>
            <div className="input-group">
              <label>Пароль</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Введите пароль..."
                required 
              />
            </div>
            
            {message && <p className={isSuccess ? "success-text" : "error-text"}>{message}</p>}
            
            <button type="submit" className="login-btn">
              {isRegisterMode ? 'Зарегаться' : 'Получить доступ'}
            </button>
          </form>

          <div className="toggle-mode-container">
            <button className="toggle-mode-btn" onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setMessage('');
            }}>
              {isRegisterMode ? '← Вернуться к авторизации' : 'Зарегистрировать новый аккаунт →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header-wrapper">
        <h1>☕ SECRETBOX 📦</h1>
        <button className="logout-btn" onClick={handleLogout}>Лог аут 🔓</button>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'catalog' ? 'active' : ''} 
          onClick={() => setActiveTab('catalog')}
        >
          📋 Каталог
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''} 
          onClick={() => setActiveTab('analytics')}
        >
          📊 Аналитика
        </button>
        <button 
          className={activeTab === 'chat' ? 'active' : ''} 
          onClick={() => setActiveTab('chat')}
        >
          💬 Общий чат
        </button>
      </div>

      <div className="tab-content-wrapper">
        
        <div className={`tab-panel ${activeTab === 'catalog' ? 'slide-in' : 'hidden'}`}>
          <h2>Просмотр меню</h2>
          <select 
            className="shop-select"
            value={selectedShop} 
            onChange={(e) => setSelectedShop(e.target.value)}
          >
            <option value="">Выберите кофейню...</option>
            {shops.map(shop => (
              <option key={shop} value={shop}>{shop}</option>
            ))}
          </select>
          
          {Object.keys(menu).length > 0 && (
            <table className="menu-table">
              <thead>
                <tr>
                  <th>Напиток</th>
                  <th>Цена</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(menu).map(([item, price]) => (
                  <tr key={item}>
                    <td>{item}</td>
                    <td>{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={`tab-panel ${activeTab === 'analytics' ? 'slide-in' : 'hidden'}`}>
          <h2>Сравнение цен через ИИ</h2>
          
          {loadingAnalysis ? (
            <p style={{ textAlign: 'center', color: '#00e5ff', marginTop: '30px' }}>
              ⏳ Синхронизация с нейросетью... Формирую матрицу данных.
            </p>
          ) : (
            analyticsData.length > 0 && (
              <div className="table-container">
                <table className="menu-table">
                  <thead>
                    <tr>
                      {analyticsColumns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.map((row, index) => (
                      <tr key={index}>
                        {analyticsColumns.map(col => (
                          <td key={col}>{row[col] !== undefined ? row[col] : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* НОВЫЙ МОДУЛЬ: ЧАТ */}
        <div className={`tab-panel ${activeTab === 'chat' ? 'slide-in' : 'hidden'}`}>
          <h2>Канал связи операторов</h2>
          
          <div className="chat-window">
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <p className="empty-chat">Сообщений пока нет. Начните передачу данных.</p>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className="chat-message">
                    <span className="chat-author">{msg.username}</span>
                    <span className="chat-time">{new Date(msg.timestamp + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <p className="chat-text">{msg.text}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ввести сообщение..." 
              />
              <button type="submit">Отправить</button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;