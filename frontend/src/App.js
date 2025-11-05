import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import CryptoDetail from './components/CryptoDetail';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>Crypto Exchange</h1>
          {isAuthenticated && (
            <div className="nav-links">
              <Link to="/dashboard">Рынок</Link>
              <Link to="/portfolio">Портфель</Link>
              <button onClick={handleLogout}>Выйти</button>
              {user && <span className="user-info">Баланс: ${user.balance_usd?.toFixed(2)}</span>}
            </div>
          )}
        </nav>

        <Routes>
          <Route path="/login" element={
            !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />
          } />
          <Route path="/register" element={
            !isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/dashboard" />
          } />
          <Route path="/dashboard" element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
          } />
          <Route path="/portfolio" element={
            isAuthenticated ? <Portfolio /> : <Navigate to="/login" />
          } />
          <Route path="/crypto/:symbol" element={
            isAuthenticated ? <CryptoDetail /> : <Navigate to="/login" />
          } />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
