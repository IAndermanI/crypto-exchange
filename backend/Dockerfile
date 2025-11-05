FROM python:3.10-slim

RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Копируем скрипт ожидания БД
COPY wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh

CMD ["/wait-for-db.sh", "python", "app.py"]  # Запуск через скрипт
