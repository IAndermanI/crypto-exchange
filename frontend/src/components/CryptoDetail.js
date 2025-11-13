import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { createOrder } from '../services/api';

function CryptoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [crypto, setCrypto] = useState(null);
  const [amount, setAmount] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [transactionType, setTransactionType] = useState('buy');
  const [orderPrice, setOrderPrice] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [coinDetailResponse, portfolioResponse] = await Promise.all([
        api.get(`/gecko/coins/${id}`),
        api.get('/portfolio')
      ]);

      const coinData = coinDetailResponse.data;
      const portfolioData = portfolioResponse.data;

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
      console.error('Error loading data:', err);
      setError('Error loading cryptocurrency data. Please try again later.');
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
      setError('Please enter a valid amount');
      return;
    }

    try {
      const endpoint = transactionType === 'buy' ? '/buy' : '/sell';
      const response = await api.post(endpoint, {
        coingecko_id: crypto.id,
        amount: parseFloat(amount)
      });
      
      setMessage(response.data.message);
      setAmount('');
      await fetchData();
      
      if (response.data.transaction && response.data.transaction.new_balance !== undefined) {
        const newBalance = response.data.transaction.new_balance;
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.balance_usd = newBalance;
        localStorage.setItem('user', JSON.stringify(userData));
        window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { newBalance } }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Transaction error');
    }
  };
  
  const calculateTotal = () => {
    if (!amount || !crypto) return 0;
    const baseTotal = parseFloat(amount) * crypto.current_price;
    const commission = baseTotal * 0.015;
    return transactionType === 'buy' ? baseTotal + commission : baseTotal - commission;
  };

  if (loading) return <div className="loading">Loading data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!crypto) return <div>Cryptocurrency not found</div>;

  return (
    <div className="crypto-detail">
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        ← Back to market
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
          <span>Change (24h)</span>
          <span className={crypto.price_change_24h >= 0 ? 'positive' : 'negative'}>
            {crypto.price_change_24h?.toFixed(2)}%
          </span>
        </div>
        <div className="stat">
          <span>Volume (24h)</span>
          <span>${crypto.volume_24h?.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span>Market Cap</span>
          <span>${crypto.market_cap?.toLocaleString()}</span>
        </div>
      </div>

      {crypto.user_holdings && (
        <div className="user-holdings" style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3>Your Assets</h3>
          <p>Amount: {crypto.user_holdings.amount} {crypto.symbol}</p>
          <p>Value: ${crypto.user_holdings.total_value?.toFixed(2)}</p>
        </div>
      )}

      <div className="transaction-form">
        <h3>Trade</h3>
        <div className="transaction-type">
          <button className={transactionType === 'buy' ? 'active' : ''} onClick={() => setTransactionType('buy')}>Buy</button>
          <button className={transactionType === 'sell' ? 'active' : ''} onClick={() => setTransactionType('sell')}>Sell</button>
        </div>
        <input
          type="number"
          placeholder={`Amount ${crypto.symbol}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="any"
          min="0"
        />
        {amount > 0 && (
          <div className="transaction-info">
            <p>Commission (1.5%): ${(parseFloat(amount) * crypto.current_price * 0.015).toFixed(2)}</p>
            <p>Total: ${calculateTotal().toFixed(2)}</p>
          </div>
        )}
        <button className="transaction-button" onClick={handleTransaction}>
          {transactionType === 'buy' ? 'Buy' : 'Sell'} {crypto.symbol}
        </button>
        {message && <div className="success" style={{ marginTop: '1rem' }}>{message}</div>}
      </div>
      
      <div className="transaction-form">
        <h3>Place a sell order</h3>
        <input
          type="number"
          placeholder={`Amount ${crypto.symbol}`}
          value={orderAmount}
          onChange={(e) => setOrderAmount(e.target.value)}
          step="any"
          min="0"
        />
        <input
          type="number"
          placeholder="Price per unit (USD)"
          value={orderPrice}
          onChange={(e) => setOrderPrice(e.target.value)}
          step="any"
          min="0"
        />
        <button className="transaction-button" onClick={handleCreateOrder} disabled={!orderAmount || !orderPrice || orderAmount <= 0 || orderPrice <= 0}>
          Place order
        </button>
      </div>

      <div className="crypto-description" style={{ marginTop: '2rem' }}>
        <h3>About {crypto.name}</h3>
        <p dangerouslySetInnerHTML={{ __html: crypto.description }}></p>
      </div>
    </div>
  );

  async function handleCreateOrder() {
    setError('');
    setMessage('');
    try {
      await createOrder({
        crypto_id: crypto.id,
        quantity: parseFloat(orderAmount),
        price: parseFloat(orderPrice),
        order_type: 'sell'
      });
      setMessage('Order placed successfully!');
      setOrderAmount('');
      setOrderPrice('');
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating order');
    }
  }
}

export default CryptoDetail;
