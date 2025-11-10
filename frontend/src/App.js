import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, NavLink } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import CryptoDetail from './components/CryptoDetail';
import Orders from './components/Orders';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (token, userData) => {
    // ВАЖНО: сохраняем токен и данные пользователя
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
              <NavLink to="/dashboard">Рынок</NavLink>
              <NavLink to="/portfolio">Портфель</NavLink>
              <NavLink to="/orders">Ордера</NavLink>
              <button onClick={handleLogout}>Выйти</button>
              {user && <span className="user-info">Баланс: ${user.balance_usd?.toFixed(2)}</span>}
            </div>
          )}
        </nav>

        <main className="main-content">
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
            <Route path="/crypto/:id" element={
              isAuthenticated ? <CryptoDetail /> : <Navigate to="/login" />
            } />
            <Route path="/orders" element={
              isAuthenticated ? <Orders /> : <Navigate to="/login" />
            } />
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
