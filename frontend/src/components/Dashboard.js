import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const [cryptocurrencies, setCryptocurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCryptocurrencies();
    const interval = setInterval(fetchCryptocurrencies, 30000); // Обновляем каждые 30 секунд
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

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      <h2>Рынок криптовалют</h2>
      <div className="crypto-grid">
        {cryptocurrencies.map((crypto) => (
          <div
            key={crypto.id}
            className="crypto-card"
            onClick={() => handleCryptoClick(crypto.symbol)}
          >
            <h3>{crypto.name}</h3>
            <p className="crypto-symbol">{crypto.symbol}</p>
            <p className="crypto-price">${crypto.current_price?.toFixed(2)}</p>
            <p className={`price-change ${crypto.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
              {crypto.price_change_24h >= 0 ? '+' : ''}{crypto.price_change_24h?.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
