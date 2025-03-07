# Użyj oficjalnego obrazu Pythona jako bazowego
FROM python:3.9

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj pliki do kontenera
COPY . /app

# Zainstaluj zależności
RUN pip install -r requirements.txt

# Uruchom aplikację
CMD ["python", "app.py"]
