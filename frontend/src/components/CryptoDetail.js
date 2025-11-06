import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';

function CryptoDetail() {
  const { id } = useParams(); // Получаем id из URL
  const navigate = useNavigate();
  const [crypto, setCrypto] = useState(null);
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('buy');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Параллельные запросы
      const [coinGeckoResponse, portfolioResponse] = await Promise.all([
        axios.get(`https://api.coingecko.com/api/v3/coins/${id}`),
        api.get('/portfolio') 
      ]);

      const coinData = coinGeckoResponse.data;
      const portfolioData = portfolioResponse.data;

      // Ищем актив в портфеле пользователя
      const userHolding = portfolioData.holdings.find(
        h => h.crypto.symbol.toLowerCase() === coinData.symbol.toLowerCase()
      );

      const formattedCrypto = {
        id: coinData.id,
        symbol: coinData.symbol.toUpperCase(),
        name: coinData.name,
        image: coinData.image.large,
        description: coinData.description.en,
        current_price: coinData.market_data.current_price.usd,
        price_change_24h: coinData.market_data.price_change_percentage_24h,
        market_cap: coinData.market_data.market_cap.usd,
        volume_24h: coinData.market_data.total_volume.usd,
        user_holdings: userHolding ? {
          amount: userHolding.amount,
          total_value: userHolding.total_value
        } : null,
      };

      setCrypto(formattedCrypto);
      setError('');
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Ошибка загрузки данных криптовалюты. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchData();
    } else {
      navigate('/login');
    }
  }, [fetchData, navigate]);

  const handleTransaction = async () => {
    setError('');
    setMessage('');

    if (!amount || amount <= 0) {
      setError('Введите корректное количество');
      return;
    }

    try {
      const endpoint = transactionType === 'buy' ? '/buy' : '/sell';
      const response = await api.post(endpoint, {
        coingecko_id: crypto.id, // Отправляем coingecko_id
        amount: parseFloat(amount)
      });
      
      setMessage(response.data.message);
      setAmount('');
      await fetchData(); // Обновляем все данные
      
      // Обновляем баланс в localStorage
      if (response.data.transaction) {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.balance_usd = response.data.transaction.new_balance;
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка транзакции');
    }
  };
  
  const calculateTotal = () => {
    if (!amount || !crypto) return 0;
    const baseTotal = parseFloat(amount) * crypto.current_price;
    const commission = baseTotal * 0.015; // 1.5% комиссия
    return transactionType === 'buy' ? baseTotal + commission : baseTotal - commission;
  };

  if (loading) return <div className="loading">Загрузка данных...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!crypto) return <div>Криптовалюта не найдена</div>;

  return (
    <div className="crypto-detail">
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        ← Назад к рынку
      </button>
      
      <div className="crypto-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img src={crypto.image} alt={crypto.name} width="50" />
        <div>
          <h2>{crypto.name} ({crypto.symbol})</h2>
          <p className="current-price">${crypto.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</p>
        </div>
      </div>

      <div className="crypto-stats">
        <div className="stat">
          <span>Изменение (24ч)</span>
          <span className={crypto.price_change_24h >= 0 ? 'positive' : 'negative'}>
            {crypto.price_change_24h?.toFixed(2)}%
          </span>
        </div>
        <div className="stat">
          <span>Объем (24ч)</span>
          <span>${crypto.volume_24h?.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span>Капитализация</span>
          <span>${crypto.market_cap?.toLocaleString()}</span>
        </div>
      </div>

      {crypto.user_holdings && (
        <div className="user-holdings" style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3>Ваши активы</h3>
          <p>Количество: {crypto.user_holdings.amount} {crypto.symbol}</p>
          <p>Стоимость: ${crypto.user_holdings.total_value?.toFixed(2)}</p>
        </div>
      )}

      <div className="transaction-form">
        <h3>Торговля</h3>
        <div className="transaction-type">
          <button className={transactionType === 'buy' ? 'active' : ''} onClick={() => setTransactionType('buy')}>Купить</button>
          <button className={transactionType === 'sell' ? 'active' : ''} onClick={() => setTransactionType('sell')}>Продать</button>
        </div>
        <input
          type="number"
          placeholder={`Количество ${crypto.symbol}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="any"
          min="0"
        />
        {amount > 0 && (
          <div className="transaction-info">
            <p>Комиссия (1.5%): ${(parseFloat(amount) * crypto.current_price * 0.015).toFixed(2)}</p>
            <p>Итого: ${calculateTotal().toFixed(2)}</p>
          </div>
        )}
        <button className="transaction-button" onClick={handleTransaction}>
          {transactionType === 'buy' ? 'Купить' : 'Продать'} {crypto.symbol}
        </button>
        {message && <div className="success" style={{ marginTop: '1rem' }}>{message}</div>}
      </div>
      
      <div className="crypto-description" style={{ marginTop: '2rem' }}>
        <h3>О {crypto.name}</h3>
        <p dangerouslySetInnerHTML={{ __html: crypto.description }}></p>
      </div>
    </div>
  );
}

export default CryptoDetail;
