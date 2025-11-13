import React, { useState, useEffect } from 'react';
import { getOrders, executeOrder } from '../services/api';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getOrders();
            setOrders(data);
            setError(null);
        } catch (error) {
            setError('Failed to fetch orders. Please try again later.');
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    const handleExecuteOrder = async (orderId) => {
        try {
            const response = await executeOrder(orderId);
            fetchOrders(); // Refresh orders after execution
            if (response.data && response.data.new_balance !== undefined) {
                const newBalance = response.data.new_balance;
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                userData.balance_usd = newBalance;
                localStorage.setItem('user', JSON.stringify(userData));
                window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { newBalance } }));
            }
        } catch (error) {
            alert('Failed to execute order.');
            console.error('Failed to execute order:', error);
        }
    };

    if (loading) {
        return <div>Loading orders...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="table-container">
            <h2>Public Orders</h2>
            <table className="holdings-table" style={{ marginTop: '1.5rem' }}>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Crypto</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Price (USD)</th>
                        <th>Total (USD)</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order) => (
                        <tr key={order.id}>
                            <td>{order.user}</td>
                            <td>{order.crypto_name} ({order.crypto_symbol.toUpperCase()})</td>
                            <td className={`tx-type ${order.order_type}`}><span>{order.order_type}</span></td>
                            <td>{order.quantity}</td>
                            <td>${order.price.toFixed(2)}</td>
                            <td>${(order.quantity * order.price).toFixed(2)}</td>
                            <td>{new Date(order.timestamp).toLocaleString()}</td>
                            <td>
                                {order.order_type === 'sell' && currentUser && order.user !== currentUser.username && (
                                    <button onClick={() => handleExecuteOrder(order.id)} className="transaction-button" style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>
                                        Buy
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Orders;