import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем токен перед загрузкой
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchPortfolio();
    fetchTransactions();
  }, [navigate]);

  const fetchPortfolio = async () => {
    try {
      const response = await api.get('/portfolio');
      setPortfolio(response.data);
    } catch (err) {
      console.error('Ошибка загрузки портфеля:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data);
    } catch (err) {
      console.error('Ошибка загрузки транзакций:', err);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!portfolio) return <div>Ошибка загрузки портфеля</div>;

  return (
    <div className="portfolio">
      <h2>Мой портфель</h2>
      
      <div className="portfolio-summary">
        <div className="summary-card">
          <h3>Баланс USD</h3>
          <p className="amount">${portfolio.balance_usd?.toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h3>Стоимость криптовалют</h3>
          <p className="amount">${portfolio.portfolio_value?.toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h3>Общая стоимость</h3>
          <p className="amount total">${portfolio.total_value?.toFixed(2)}</p>
        </div>
      </div>

      <div className="holdings-section">
        <h3>Мои активы</h3>
        {portfolio.holdings && portfolio.holdings.length > 0 ? (
          <table className="holdings-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Символ</th>
                <th>Количество</th>
                <th>Текущая цена</th>
                <th>Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((holding) => (
                <tr
                  key={holding.id}
                  className="holdings-row"
                  onClick={() => navigate(`/crypto/${holding.crypto.coingecko_id}`)}
                >
                  <td className="name">{holding.crypto.name}</td>
                  <td className="symbol">{holding.crypto.symbol}</td>
                  <td>{holding.amount}</td>
                  <td>${holding.crypto.current_price?.toFixed(2)}</td>
                  <td className="total-value">${holding.total_value?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-holdings">У вас пока нет криптовалют</p>
        )}
      </div>

      <div className="transactions-section">
        <h3>История транзакций</h3>
        {transactions.length > 0 ? (
          <div className="transactions-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div className="tx-type">
                  <span className={tx.type === 'buy' ? 'buy' : 'sell'}>
                    {tx.type === 'buy' ? 'Покупка' : 'Продажа'}
                  </span>
                  <span>{tx.crypto}</span>
                </div>
                <div className="tx-details">
                  <span>Количество: {tx.amount}</span>
                  <span>Цена: ${tx.price?.toFixed(2)}</span>
                  <span>Комиссия: ${tx.fee?.toFixed(2)}</span>
                  <span>Итого: ${tx.total?.toFixed(2)}</span>
                </div>
                <div className="tx-date">
                  {new Date(tx.date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Нет транзакций</p>
        )}
      </div>
    </div>
  );
}

export default Portfolio;
