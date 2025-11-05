import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from database import db, init_db
from models import User, Cryptocurrency, Holdings, Transaction
import requests
from datetime import datetime, timedelta
import time
import sys

# Загрузка переменных окружения
app = Flask(__name__)

# Конфигурация из переменных окружения
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost:5432/crypto_exchange')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Константы из переменных окружения
COMMISSION_RATE = float(os.environ.get('COMMISSION_RATE', '0.015'))
INITIAL_BALANCE = float(os.environ.get('INITIAL_BALANCE', '10000.0'))
FLASK_ENV = os.environ.get('FLASK_ENV', 'development')

# Настройка CORS
CORS(app, origins=['http://localhost:3000', 'http://localhost:80', os.environ.get('FRONTEND_URL', '*')])

jwt = JWTManager(app)

print(f"""
🚀 Starting Crypto Exchange Backend
📊 Configuration:
   - Environment: {FLASK_ENV}
   - Database: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[1] if '@' in app.config['SQLALCHEMY_DATABASE_URI'] else 'local'}
   - Commission Rate: {COMMISSION_RATE * 100}%
   - Initial Balance: ${INITIAL_BALANCE}
""")

init_db(app)

# Функция для обновления цен криптовалют
def update_crypto_prices():
    try:
        # Список популярных криптовалют
        crypto_ids = 'bitcoin,ethereum,binancecoin,cardano,solana,ripple,polkadot,dogecoin,avalanche-2,chainlink'
        url = f'https://api.coingecko.com/api/v3/simple/price?ids={crypto_ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true'
        
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            
            # Маппинг ID CoinGecko к символам
            symbol_map = {
                'bitcoin': 'BTC',
                'ethereum': 'ETH',
                'binancecoin': 'BNB',
                'cardano': 'ADA',
                'solana': 'SOL',
                'ripple': 'XRP',
                'polkadot': 'DOT',
                'dogecoin': 'DOGE',
                'avalanche-2': 'AVAX',
                'chainlink': 'LINK'
            }
            
            name_map = {
                'bitcoin': 'Bitcoin',
                'ethereum': 'Ethereum',
                'binancecoin': 'Binance Coin',
                'cardano': 'Cardano',
                'solana': 'Solana',
                'ripple': 'Ripple',
                'polkadot': 'Polkadot',
                'dogecoin': 'Dogecoin',
                'avalanche-2': 'Avalanche',
                'chainlink': 'Chainlink'
            }
            
            for coin_id, coin_data in data.items():
                symbol = symbol_map.get(coin_id)
                name = name_map.get(coin_id)
                
                if symbol and name:
                    crypto = Cryptocurrency.query.filter_by(symbol=symbol).first()
                    if not crypto:
                        crypto = Cryptocurrency(symbol=symbol, name=name)
                        db.session.add(crypto)
                    
                    crypto.current_price = coin_data.get('usd', 0)
                    crypto.market_cap = coin_data.get('usd_market_cap', 0)
                    crypto.volume_24h = coin_data.get('usd_24h_vol', 0)
                    crypto.price_change_24h = coin_data.get('usd_24h_change', 0)
                    crypto.last_updated = datetime.utcnow()
            
            db.session.commit()
            return True
    except Exception as e:
        print(f"Error updating prices: {e}")
        return False

# Регистрация
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'Все поля обязательны'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Пользователь с таким именем уже существует'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email уже используется'}), 400
    
    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=user.id)
    return jsonify({
        'message': 'Регистрация успешна',
        'access_token': access_token,
        'user': user.to_dict()
    }), 201

# Вход
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Введите логин и пароль'}), 400
    
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Неверный логин или пароль'}), 401
    
    access_token = create_access_token(identity=user.id)
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

# Получить список криптовалют
@app.route('/api/cryptocurrencies', methods=['GET'])
def get_cryptocurrencies():
    update_crypto_prices()  # Обновляем цены при каждом запросе
    cryptos = Cryptocurrency.query.all()
    return jsonify([crypto.to_dict() for crypto in cryptos]), 200

# Получить информацию о конкретной криптовалюте
@app.route('/api/cryptocurrency/<symbol>', methods=['GET'])
@jwt_required()
def get_cryptocurrency(symbol):
    crypto = Cryptocurrency.query.filter_by(symbol=symbol.upper()).first()
    if not crypto:
        return jsonify({'error': 'Криптовалюта не найдена'}), 404
    
    user_id = get_jwt_identity()
    holding = Holdings.query.filter_by(user_id=user_id, crypto_id=crypto.id).first()
    
    response_data = crypto.to_dict()
    response_data['user_holdings'] = {
        'amount': holding.amount if holding else 0,
        'total_value': (holding.amount * crypto.current_price) if holding else 0
    }
    
    return jsonify(response_data), 200

# Покупка криптовалюты
@app.route('/api/buy', methods=['POST'])
@jwt_required()
def buy_crypto():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    data = request.json
    symbol = data.get('symbol')
    amount = float(data.get('amount', 0))
    
    if amount <= 0:
        return jsonify({'error': 'Неверное количество'}), 400
    
    crypto = Cryptocurrency.query.filter_by(symbol=symbol.upper()).first()
    if not crypto:
        return jsonify({'error': 'Криптовалюта не найдена'}), 404
    
    # Рассчитываем стоимость с комиссией
    base_cost = amount * crypto.current_price
    fee = base_cost * COMMISSION_RATE
    total_cost = base_cost + fee
    
    if user.balance_usd < total_cost:
        return jsonify({'error': 'Недостаточно средств'}), 400
    
    # Обновляем баланс пользователя
    user.balance_usd -= total_cost
    
    # Обновляем холдинги
    holding = Holdings.query.filter_by(user_id=user_id, crypto_id=crypto.id).first()
    if not holding:
        holding = Holdings(user_id=user_id, crypto_id=crypto.id, amount=0)
        db.session.add(holding)
    holding.amount += amount
    
    # Записываем транзакцию
    transaction = Transaction(
        user_id=user_id,
        crypto_id=crypto.id,
        transaction_type='buy',
        amount=amount,
        price_at_transaction=crypto.current_price,
        fee=fee,
        total_cost=total_cost
    )
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'message': 'Покупка успешна',
        'transaction': {
            'amount': amount,
            'price': crypto.current_price,
            'fee': fee,
            'total_cost': total_cost,
            'new_balance': user.balance_usd
        }
    }), 200

# Продажа криптовалюты
@app.route('/api/sell', methods=['POST'])
@jwt_required()
def sell_crypto():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    data = request.json
    symbol = data.get('symbol')
    amount = float(data.get('amount', 0))
    
    if amount <= 0:
        return jsonify({'error': 'Неверное количество'}), 400
    
    crypto = Cryptocurrency.query.filter_by(symbol=symbol.upper()).first()
    if not crypto:
        return jsonify({'error': 'Криптовалюта не найдена'}), 404
    
    # Проверяем наличие криптовалюты
    holding = Holdings.query.filter_by(user_id=user_id, crypto_id=crypto.id).first()
    if not holding or holding.amount < amount:
        return jsonify({'error': 'Недостаточно криптовалюты'}), 400
    
    # Рассчитываем выручку с комиссией
    base_revenue = amount * crypto.current_price
    fee = base_revenue * COMMISSION_RATE
    total_revenue = base_revenue - fee
    
    # Обновляем баланс
    user.balance_usd += total_revenue
    holding.amount -= amount
    
    # Если криптовалюты не осталось, удаляем запись
    if holding.amount == 0:
        db.session.delete(holding)
    
    # Записываем транзакцию
    transaction = Transaction(
        user_id=user_id,
        crypto_id=crypto.id,
        transaction_type='sell',
        amount=amount,
        price_at_transaction=crypto.current_price,
        fee=fee,
        total_cost=total_revenue
    )
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'message': 'Продажа успешна',
        'transaction': {
            'amount': amount,
            'price': crypto.current_price,
            'fee': fee,
            'total_revenue': total_revenue,
            'new_balance': user.balance_usd
        }
    }), 200

# Получить портфель пользователя
@app.route('/api/portfolio', methods=['GET'])
@jwt_required()
def get_portfolio():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    holdings = Holdings.query.filter_by(user_id=user_id).all()
    
    portfolio_value = sum(h.amount * h.cryptocurrency.current_price for h in holdings)
    
    return jsonify({
        'balance_usd': user.balance_usd,
        'portfolio_value': portfolio_value,
        'total_value': user.balance_usd + portfolio_value,
        'holdings': [h.to_dict() for h in holdings]
    }), 200

# Получить историю транзакций
@app.route('/api/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.created_at.desc()).limit(50).all()
    
    return jsonify([{
        'id': t.id,
        'type': t.transaction_type,
        'crypto': t.cryptocurrency.symbol,
        'amount': t.amount,
        'price': t.price_at_transaction,
        'fee': t.fee,
        'total': t.total_cost,
        'date': t.created_at.isoformat()
    } for t in transactions]), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Инициализируем базу данных с начальными криптовалютами
        if not Cryptocurrency.query.first():
            update_crypto_prices()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
