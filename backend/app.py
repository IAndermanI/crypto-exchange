from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from database import db, init_db
from models import User, Cryptocurrency, Holdings, Transaction, Order
import requests
from datetime import datetime, timedelta
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/crypto_exchange')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# ИСПРАВЛЕННЫЙ CORS - разрешаем всё для простоты
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Ставка комиссии
COMMISSION_RATE = 0.015  # 1.5%

jwt = JWTManager(app)
init_db(app)


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
    
    access_token = create_access_token(identity=str(user.id))
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
    
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


# Прокси для CoinGecko
@app.route('/api/gecko/markets', methods=['GET'])
def gecko_markets_proxy():
    try:
        response = requests.get('https://api.coingecko.com/api/v3/coins/markets', params=request.args)
        response.raise_for_status()
        data = response.json()
        
        # Кэшируем данные в БД
        for coin_data in data:
            coingecko_id = coin_data.get('id')
            symbol = coin_data.get('symbol', '').upper()

            if not coingecko_id or not symbol:
                continue

            # Ищем монету по coingecko_id, который уникален
            crypto = Cryptocurrency.query.filter_by(coingecko_id=coingecko_id).first()
            
            if not crypto:
                # Если монеты нет, создаем новую
                crypto = Cryptocurrency(coingecko_id=coingecko_id, symbol=symbol)
                db.session.add(crypto)
            
            # Обновляем данные монеты
            crypto.symbol = symbol
            crypto.name = coin_data.get('name', '')
            crypto.current_price = coin_data.get('current_price')
            crypto.market_cap = coin_data.get('market_cap')
            crypto.volume_24h = coin_data.get('total_volume')
            crypto.price_change_24h = coin_data.get('price_change_percentage_24h')
            crypto.last_updated = datetime.utcnow()
        
        db.session.commit()
        return jsonify(data), 200
        
    except requests.exceptions.RequestException:
        # В случае ошибки возвращаем данные из нашей БД, приводя их к формату CoinGecko
        cryptos = Cryptocurrency.query.order_by(Cryptocurrency.market_cap.desc()).all()
        
        # Трансформируем данные в формат, который ожидает фронтенд (аналогичный CoinGecko)
        formatted_cryptos = []
        for crypto in cryptos:
            formatted_cryptos.append({
                'id': crypto.coingecko_id,
                'symbol': crypto.symbol,
                'name': crypto.name,
                'current_price': crypto.current_price,
                'market_cap': crypto.market_cap,
                'total_volume': crypto.volume_24h,
                'price_change_percentage_24h': crypto.price_change_24h,
                'market_cap_rank': None # Добавляем недостающее поле
            })
        return jsonify(formatted_cryptos), 200


@app.route('/api/gecko/coins/<coin_id>', methods=['GET'])
def gecko_coin_detail_proxy(coin_id):
    try:
        response = requests.get(f'https://api.coingecko.com/api/v3/coins/{coin_id}')
        response.raise_for_status()
        data = response.json()
        
        # Кэшируем данные
        symbol = data.get('symbol', '').upper()
        if not symbol:
            return jsonify(data), 200 # Не кэшируем, если нет символа

        # Ищем монету по coingecko_id, который уникален
        crypto = Cryptocurrency.query.filter_by(coingecko_id=coin_id).first()
        if not crypto:
             crypto = Cryptocurrency(coingecko_id=coin_id, symbol=symbol)
             db.session.add(crypto)

        # Обновляем символ на случай, если он изменился
        crypto.symbol = symbol
        crypto.name = data.get('name', '')
        if 'market_data' in data:
            crypto.current_price = data['market_data'].get('current_price', {}).get('usd')
            crypto.market_cap = data['market_data'].get('market_cap', {}).get('usd')
            crypto.volume_24h = data['market_data'].get('total_volume', {}).get('usd')
            crypto.price_change_24h = data['market_data'].get('price_change_percentage_24h')
        crypto.last_updated = datetime.utcnow()
        db.session.commit()
        
        return jsonify(data), 200
        
    except requests.exceptions.RequestException:
        # В случае ошибки возвращаем данные из нашей БД
        crypto = Cryptocurrency.query.filter_by(coingecko_id=coin_id).first()
        if crypto:
            # Формируем ответ, похожий на ответ от CoinGecko
            return jsonify({
                'id': crypto.coingecko_id,
                'symbol': crypto.symbol,
                'name': crypto.name,
                'image': {'large': ''}, # Нет изображения в кэше
                'description': {'en': 'Could not load description from CoinGecko.'},
                'market_data': {
                    'current_price': {'usd': crypto.current_price},
                    'price_change_percentage_24h': crypto.price_change_24h,
                    'market_cap': {'usd': crypto.market_cap},
                    'total_volume': {'usd': crypto.volume_24h}
                }
            }), 200
        else:
            return jsonify(error="Coin not found in cache"), 404

# Покупка криптовалюты
@app.route('/api/buy', methods=['POST'])
@jwt_required()
def buy_crypto():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 401
    
    data = request.json
    coingecko_id = data.get('coingecko_id')
    amount = float(data.get('amount', 0))
    
    if amount <= 0:
        return jsonify({'error': 'Неверное количество'}), 400

    # Получаем актуальные данные с CoinGecko
    try:
        response = requests.get(f'https://api.coingecko.com/api/v3/coins/{coingecko_id}')
        if response.status_code != 200:
            return jsonify({'error': 'Не удалось получить данные о криптовалюте'}), 404
        coin_data = response.json()
        current_price = coin_data['market_data']['current_price']['usd']
        symbol = coin_data['symbol'].upper()
        name = coin_data['name']
    except Exception:
        return jsonify({'error': 'Ошибка при запросе к CoinGecko'}), 500

    # Находим или создаем запись в нашей БД
    # Находим или создаем запись в нашей БД по coingecko_id
    crypto = Cryptocurrency.query.filter_by(coingecko_id=coingecko_id).first()
    if not crypto:
        crypto = Cryptocurrency(symbol=symbol, name=name, coingecko_id=coingecko_id)
        db.session.add(crypto)
    else:
        # Обновим данные, если монета уже есть
        crypto.name = name
        crypto.symbol = symbol
    
    # Обновляем цену в нашей БД для истории
    crypto.current_price = current_price
    
    # Рассчитываем стоимость с комиссией
    base_cost = amount * current_price
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
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 401
    
    data = request.json
    coingecko_id = data.get('coingecko_id')
    amount = float(data.get('amount', 0))

    if amount <= 0:
        return jsonify({'error': 'Неверное количество'}), 400

    # Получаем актуальные данные с CoinGecko
    try:
        response = requests.get(f'https://api.coingecko.com/api/v3/coins/{coingecko_id}')
        if response.status_code != 200:
            return jsonify({'error': 'Не удалось получить данные о криптовалюте'}), 404
        coin_data = response.json()
        current_price = coin_data['market_data']['current_price']['usd']
        symbol = coin_data['symbol'].upper()
    except Exception:
        return jsonify({'error': 'Ошибка при запросе к CoinGecko'}), 500

    crypto = Cryptocurrency.query.filter_by(coingecko_id=coingecko_id).first()
    if not crypto:
        # Этого не должно произойти, если пользователь покупал через наш сервис
        return jsonify({'error': 'Криптовалюта не найдена в вашей базе данных'}), 404

    # Проверяем наличие криптовалюты
    holding = Holdings.query.filter_by(user_id=user_id, crypto_id=crypto.id).first()
    if not holding or holding.amount < amount:
        return jsonify({'error': 'Недостаточно криптовалюты для продажи'}), 400

    # Рассчитываем выручку с комиссией
    base_revenue = amount * current_price
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
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 401
        
    holdings = Holdings.query.filter_by(user_id=user_id).all()
    
    portfolio_value = sum(h.amount * (h.cryptocurrency.current_price or 0) for h in holdings)
    
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
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 401
        
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

@app.route('/api/orders', methods=['GET', 'POST'])
@jwt_required()
def handle_orders():
    if request.method == 'POST':
        return create_order()
    
    # Existing GET logic
    crypto_id = request.args.get('crypto_id')
    sort_by = request.args.get('sort_by', 'timestamp')
    order = request.args.get('order', 'desc')

    query = Order.query.filter_by(is_active=True)

    if crypto_id:
        crypto = Cryptocurrency.query.filter_by(coingecko_id=crypto_id).first()
        if crypto:
            query = query.filter_by(crypto_id=crypto.id)

    if hasattr(Order, sort_by):
        if order == 'asc':
            query = query.order_by(getattr(Order, sort_by).asc())
        else:
            query = query.order_by(getattr(Order, sort_by).desc())

    orders = query.all()
    
    output = []
    for o in orders:
        user = User.query.get(o.user_id)
        crypto = Cryptocurrency.query.get(o.crypto_id)
        if user and crypto:
            output.append({
                'id': o.id,
                'user': user.username,
                'crypto_symbol': crypto.symbol,
                'crypto_name': crypto.name,
                'quantity': o.quantity,
                'price': o.price,
                'order_type': o.order_type,
                'timestamp': o.timestamp.isoformat()
            })

    return jsonify(output)

def create_order():
    data = request.get_json()
    current_user_id = get_jwt_identity()

    crypto_id = data.get('crypto_id')
    quantity = data.get('quantity')
    price = data.get('price')
    order_type = data.get('order_type')

    if not all([crypto_id, quantity, price, order_type]):
        return jsonify({'message': 'Missing required fields'}), 400

    if order_type not in ['buy', 'sell']:
        return jsonify({'message': 'Invalid order type'}), 400
    
    user = User.query.get(current_user_id)
    cryptocurrency = Cryptocurrency.query.filter_by(coingecko_id=crypto_id).first()

    if not user or not cryptocurrency:
        return jsonify({'message': 'User or cryptocurrency not found'}), 404

    if order_type == 'sell':
        portfolio_item = Holdings.query.filter_by(user_id=current_user_id, crypto_id=cryptocurrency.id).first()
        if not portfolio_item or portfolio_item.amount < quantity:
            return jsonify({'message': 'Insufficient funds to place sell order'}), 400

    new_order = Order(
        user_id=current_user_id,
        crypto_id=cryptocurrency.id,
        quantity=quantity,
        price=price,
        order_type=order_type
    )

    db.session.add(new_order)
    db.session.commit()

    return jsonify({'message': 'Order created successfully'}), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Инициализируем базу данных с начальными криптовалютами
        # Логика инициализации цен удалена, так как она больше не нужна
    
    app.run(host='0.0.0.0', port=5000, debug=True)
