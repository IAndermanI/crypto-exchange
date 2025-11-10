from database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    balance_usd = db.Column(db.Float, default=float(os.environ.get('INITIAL_BALANCE', '10000.0')))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    holdings = db.relationship('Holdings', backref='user', lazy=True)
    transactions = db.relationship('Transaction', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'balance_usd': self.balance_usd
        }

class Cryptocurrency(db.Model):
    __tablename__ = 'cryptocurrencies'
    
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(10), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    coingecko_id = db.Column(db.String(100), unique=True, nullable=True)
    current_price = db.Column(db.Float, nullable=True)
    market_cap = db.Column(db.Float)
    volume_24h = db.Column(db.Float)
    price_change_24h = db.Column(db.Float)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'symbol': self.symbol,
            'name': self.name,
            'coingecko_id': self.coingecko_id,
            'current_price': self.current_price,
            'market_cap': self.market_cap,
            'volume_24h': self.volume_24h,
            'price_change_24h': self.price_change_24h,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

class Holdings(db.Model):
    __tablename__ = 'holdings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    crypto_id = db.Column(db.Integer, db.ForeignKey('cryptocurrencies.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    
    cryptocurrency = db.relationship('Cryptocurrency', backref='holdings')
    
    def to_dict(self):
        return {
            'id': self.id,
            'crypto': self.cryptocurrency.to_dict(),
            'amount': self.amount,
            'total_value': self.amount * (self.cryptocurrency.current_price or 0)
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    crypto_id = db.Column(db.Integer, db.ForeignKey('cryptocurrencies.id'), nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False)  # 'buy' или 'sell'
    amount = db.Column(db.Float, nullable=False)
    price_at_transaction = db.Column(db.Float, nullable=False)
    fee = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    cryptocurrency = db.relationship('Cryptocurrency', backref='transactions')


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    crypto_id = db.Column(db.Integer, db.ForeignKey('cryptocurrencies.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    order_type = db.Column(db.String(4), nullable=False)  # 'buy' or 'sell'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    user = db.relationship('User', backref='orders')
    cryptocurrency = db.relationship('Cryptocurrency', backref='orders')
