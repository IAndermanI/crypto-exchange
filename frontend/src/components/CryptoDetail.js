import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function CryptoDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [crypto, setCrypto] = useState(null);
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('buy');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCryptoData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cryptocurrency/${symbol}`);
      setCrypto(response.data);
      setError('');
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      if (err.response?.status !== 401 && err.response?.status !== 422) {
        setError('Ошибка загрузки данных криптовалюты');
      }
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('token');
    if (token) {
      fetchCryptoData();
    } else {
      navigate('/login');
    }
  }, [fetchCryptoData, navigate]);

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
        symbol: symbol,
        amount: parseFloat(amount)
      });
      
      setMessage(response.data.message);
      setAmount('');
      await fetchCryptoData(); // Обновляем данные
      
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
    const commission = baseTotal * 0.015;
    return transactionType === 'buy' ? baseTotal + commission : baseTotal - commission;
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!crypto) return <div>Криптовалюта не найдена</div>;

  return (
    <div className="crypto-detail">
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        ← Назад к рынку
      </button>
      
      <div className="crypto-header">
        <h2>{crypto.name} ({crypto.symbol})</h2>
        <p className="current-price">${crypto.current_price?.toFixed(2)}</p>
      </div>

      <div className="crypto-stats">
        <div className="stat">
          <span>Изменение за 24ч:</span>
          <span className={crypto.price_change_24h >= 0 ? 'positive' : 'negative'}>
            {crypto.price_change_24h >= 0 ? '+' : ''}{crypto.price_change_24h?.toFixed(2)}%
          </span>
        </div>
        <div className="stat">
          <span>Объем за 24ч:</span>
          <span>${crypto.volume_24h?.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span>Рыночная капитализация:</span>
          <span>${crypto.market_cap?.toLocaleString()}</span>
        </div>
      </div>

      {crypto.user_holdings && (
        <div className="user-holdings">
          <h3>Ваши активы</h3>
          <p>Количество: {crypto.user_holdings.amount} {crypto.symbol}</p>
          <p>Стоимость: ${crypto.user_holdings.total_value?.toFixed(2)}</p>
        </div>
      )}

      <div className="transaction-form">
        <h3>Торговля</h3>
        
        <div className="transaction-type">
          <button
            className={transactionType === 'buy' ? 'active' : ''}
            onClick={() => setTransactionType('buy')}
          >
            Купить
          </button>
          <button
            className={transactionType === 'sell' ? 'active' : ''}
            onClick={() => setTransactionType('sell')}
          >
            Продать
          </button>
        </div>

        <input
          type="number"
          placeholder={`Количество ${crypto.symbol}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.00000001"
          min="0"
        />

        {amount && (
          <div className="transaction-info">
            <p>Комиссия: 1.5%</p>
            <p>Итого: ${calculateTotal().toFixed(2)}</p>
          </div>
        )}

        <button
          className="transaction-button"
          onClick={handleTransaction}
        >
          {transactionType === 'buy' ? 'Купить' : 'Продать'} {crypto.symbol}
        </button>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
      </div>
    </div>
  );
}

export default CryptoDetail;
