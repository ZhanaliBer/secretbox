import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Координаты вашего боевого сервера на Render
const API_URL = 'https://secretbox-main.onrender.com'; 

function App() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [menu, setMenu] = useState({});
  
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Инициализация базы кофеен
  useEffect(() => {
    axios.get(`${API_URL}/coffee-shops`)
      .then(response => setShops(response.data.shops))
      .catch(error => console.error("Ошибка связи с базой:", error));
  }, []);

  // Загрузка меню при выборе кофейни
  useEffect(() => {
    if (selectedShop) {
      axios.get(`${API_URL}/menu/${selectedShop}`)
        .then(response => setMenu(response.data.menu))
        .catch(error => console.error("Ошибка загрузки меню:", error));
    }
  }, [selectedShop]);

  // Автоматический фоновый запрос аналитики при старте систем
  useEffect(() => {
    setLoadingAnalysis(true);
    axios.get(`${API_URL}/analytics/compare`)
      .then(response => {
        setAnalyticsData(response.data);
        setLoadingAnalysis(false);
      })
      .catch(error => {
        console.error("Ошибка аналитики:", error);
        setLoadingAnalysis(false);
      });
  }, []);

  // Динамическая генерация структуры таблицы
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