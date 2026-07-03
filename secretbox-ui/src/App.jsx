import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://secretbox-main.onrender.com';

function App() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [menu, setMenu] = useState({});
  
  // Модули для работы аналитики
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/coffee-shops`)
      .then(response => setShops(response.data.shops))
      .catch(error => console.error("Ошибка связи с базой:", error));
  }, []);

  useEffect(() => {
    if (selectedShop) {
      axios.get(`${API_URL}/menu/${selectedShop}`)
        .then(response => setMenu(response.data.menu))
        .catch(error => console.error("Ошибка загрузки меню:", error));
    }
  }, [selectedShop]);

  // Запуск ИИ-анализа цен
  const runFullAnalysis = () => {
    setLoadingAnalysis(true);
    axios.get(`${API_URL}/analytics/compare`)
      .then(response => {
        setAnalyticsData(response.data);
        setLoadingAnalysis(false);
      })
      .catch(error => {
        console.error("Ошибка анализа:", error);
        setLoadingAnalysis(false);
      });
  };

  // Динамическая сборка заголовков таблицы аналитики
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

  return (
    <div className="app-container">
      <h1>☕ SECRETBOX 📦</h1>
      
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
        
        {/* Вкладка: Каталог */}
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

        {/* Вкладка: Аналитика */}
        <div className={`tab-panel ${activeTab === 'analytics' ? 'slide-in' : 'hidden'}`}>
          <h2>Сравнение цен через ИИ</h2>
          
          <button 
            className="analysis-btn" 
            onClick={runFullAnalysis}
            disabled={loadingAnalysis}
          >
            {loadingAnalysis ? '⏳ Выполняю калибровку данных...' : '🚀 Запустить полный анализ'}
          </button>

          {analyticsData.length > 0 && (
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
          )}
        </div>

      </div>
    </div>
  );
}

export default App;