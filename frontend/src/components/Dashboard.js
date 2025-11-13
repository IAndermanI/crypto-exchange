import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const [cryptocurrencies, setCryptocurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCryptocurrencies();
    const interval = setInterval(fetchCryptocurrencies, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchCryptocurrencies = async () => {
    try {
      const response = await api.get('/gecko/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: false,
        },
      });

      const formattedData = response.data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        current_price: coin.current_price,
        price_change_24h: coin.price_change_percentage_24h,
        market_cap: coin.market_cap,
        volume_24h: coin.total_volume,
        market_cap_rank: coin.market_cap_rank,
      }));

      setCryptocurrencies(formattedData);
    } catch (err) {
      console.error('Error loading data from CoinGecko:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoClick = (coingecko_id) => {
    navigate(`/crypto/${coingecko_id}`);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  if (loading) return <div className="loading">Loading market data...</div>;

  return (
    <div className="dashboard">
      <h2>Cryptocurrency Market</h2>
      <div className="crypto-list">
        <div className="crypto-header">
          <span className="rank">#</span>
          <span className="name">Name</span>
          <span className="price">Price</span>
          <span className="change">24h %</span>
          <span className="market-cap">Market Cap</span>
          <span className="volume">Volume (24h)</span>
        </div>
        {cryptocurrencies.map((crypto) => (
          <div
            key={crypto.id}
            className="crypto-row"
            onClick={() => handleCryptoClick(crypto.id)}
          >
            <span className="rank">{crypto.market_cap_rank}</span>
            <span className="name">
              <strong>{crypto.symbol}</strong>
              <small>{crypto.name}</small>
            </span>
            <span className="price">
              ${crypto.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
            </span>
            <span className={`change ${crypto.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
              {crypto.price_change_24h?.toFixed(2)}%
            </span>
            <span className="market-cap">{formatNumber(crypto.market_cap)}</span>
            <span className="volume">{formatNumber(crypto.volume_24h)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
