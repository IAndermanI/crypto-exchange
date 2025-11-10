import React, { useState, useEffect } from 'react';
import { getOrders, executeOrder } from '../services/api';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ crypto_id: '', sort_by: 'timestamp', order: 'desc' });

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getOrders(filters);
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
    }, [filters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleExecuteOrder = async (orderId) => {
        try {
            await executeOrder(orderId);
            fetchOrders(); // Refresh orders after execution
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
        <div className="orders-container">
            <h2>Orders</h2>
            <div className="filters">
                <input
                    type="text"
                    name="crypto_id"
                    placeholder="Filter by Crypto ID (e.g., bitcoin)"
                    value={filters.crypto_id}
                    onChange={handleFilterChange}
                />
                <select name="sort_by" value={filters.sort_by} onChange={handleFilterChange}>
                    <option value="timestamp">Date</option>
                    <option value="price">Price</option>
                </select>
                <select name="order" value={filters.order} onChange={handleFilterChange}>
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                </select>
            </div>
            <table className="orders-table">
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
                            <td className={`order-type ${order.order_type}`}>{order.order_type}</td>
                            <td>{order.quantity}</td>
                            <td>${order.price.toFixed(2)}</td>
                            <td>${(order.quantity * order.price).toFixed(2)}</td>
                            <td>{new Date(order.timestamp).toLocaleString()}</td>
                            <td>
                                {order.order_type === 'sell' && (
                                    <button onClick={() => handleExecuteOrder(order.id)} className="btn-buy">
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