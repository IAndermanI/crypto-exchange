import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const [cryptocurrencies, setCryptocurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCryptocurrencies();
    const interval = setInterval(fetchCryptocurrencies, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCryptocurrencies = async () => {
    try {
      const response = await api.get('/cryptocurrencies');
      setCryptocurrencies(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setLoading(false);
    }
  };

  const handleCryptoClick = (symbol) => {
    navigate(`/crypto/${symbol}`);
  };

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num?.toLocaleString();
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      <h2>Рынок криптовалют</h2>
      <div className="crypto-list">
        <div className="crypto-header">
          <span className="rank">#</span>
          <span className="name">Название</span>
          <span className="price">Цена</span>
          <span className="change">24ч</span>
          <span className="market-cap">Капитализация</span>
          <span className="volume">Объем (24ч)</span>
        </div>
        {cryptocurrencies.map((crypto, index) => (
          <div
            key={crypto.id}
            className="crypto-row"
            onClick={() => handleCryptoClick(crypto.symbol)}
          >
            <span className="rank">{index + 1}</span>
            <span className="name">
              <strong>{crypto.symbol}</strong>
              <small>{crypto.name}</small>
            </span>
            <span className="price">${crypto.current_price?.toFixed(2)}</span>
            <span className={`change ${crypto.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
              {crypto.price_change_24h >= 0 ? '+' : ''}{crypto.price_change_24h?.toFixed(2)}%
            </span>
            <span className="market-cap">${formatNumber(crypto.market_cap)}</span>
            <span className="volume">${formatNumber(crypto.volume_24h)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
