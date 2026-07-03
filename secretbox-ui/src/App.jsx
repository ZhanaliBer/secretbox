import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://secretbox-main.onrender.com'; 

function App() {
  // Проверка сессии в локальном хранилище браузера
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('catalog');
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [menu, setMenu] = useState({});
  
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Сборка заголовка с токеном для отправки бэкенду
  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Загрузка списка кофеен
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/coffee-shops`, getAuthHeader())
      .then(response => setShops(response.data.shops))
      .catch(error => {
        console.error("Ошибка связи с базой:", error);
        if (error.response?.status === 401) handleLogout();
      });
  }, [token]);

  // Загрузка меню конкретной кофейни
  useEffect(() => {
    if (selectedShop && token) {
      axios.get(`${API_URL}/menu/${selectedShop}`, getAuthHeader())
        .then(response => setMenu(response.data.menu))
        .catch(error => {
          console.error("Ошибка загрузки меню:", error);
          if (error.response?.status === 401) handleLogout();
        });
    }
  }, [selectedShop, token]);

  // Автоматический запрос ИИ-аналитики
  useEffect(() => {
    if (!token) return;
    setLoadingAnalysis(true);
    axios.get(`${API_URL}/analytics/compare`, getAuthHeader())
      .then(response => {
        setAnalyticsData(response.data);
        setLoadingAnalysis(false);
      })
      .catch(error => {
        console.error("Ошибка аналитики:", error);
        setLoadingAnalysis(false);
        if (error.response?.status === 401) handleLogout();
      });
  }, [token]);

  // Протокол авторизации
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    axios.post(`${API_URL}/login`, { username, password })
      .then(response => {
        const receivedToken = response.data.token;
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
      })
      .catch(error => {
        setLoginError(error.response?.data?.detail || 'Ошибка авторизации');
      });
  };

  // Протокол деавторизации (выход)
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setShops([]);
    setSelectedShop('');
    setMenu({});
    setAnalyticsData([]);
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

  // СЦЕНАРИЙ А: Экран блокировки (если токен отсутствует)
  if (!token) {
    return (
      <div className="app-container">
        <h1 className="secure-title">🔒 SECRETBOX ACCESS</h1>
        <div className="login-card">
          <h2>Идентификация терминала</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Оператор</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Ведите логин..."
                required 
              />
            </div>
            <div className="input-group">
              <label>Крипто-ключ доступа</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Введите пароль..."
                required 
              />
            </div>
            {loginError && <p className="error-text">{loginError}</p>}
            <button type="submit" className="login-btn">Получить доступ</button>
          </form>
        </div>
      </div>
    );
  }

  // СЦЕНАРИЙ Б: Основной интерфейс (доступ разрешен)
  return (
    <div className="app-container">
      <div className="header-wrapper">
        <h1>☕ SECRETBOX 📦</h1>
        <button className="logout-btn" onClick={handleLogout}>Блокировать 🔓</button>
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
      </div>

      <div className="tab-content-wrapper">
        
        {/* Модуль: Каталог */}
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

        {/* Модуль: Аналитика */}
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

      </div>
    </div>
  );
}

export default App;