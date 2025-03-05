# EPIR Jewelry Chatbot

Aplikacja Node.js używająca Express do stworzenia serwera internetowego, integrująca się z API Shopify oraz korzystająca z OpenAI lub Gemini do odpowiedzi AI.

## Wymagania

- Node.js
- npm (Node Package Manager)
- Konto Shopify z dostępem do API
- Klucze API OpenAI i Gemini

## Instalacja

1. Sklonuj repozytorium:
    ```bash
    git clone https://github.com/EPIRjewelry/shopify-chatbot.git
    cd shopify-chatbot
    ```

2. Zainstaluj zależności:
    ```bash
    npm install
    ```

3. Utwórz plik `.env` w głównym katalogu projektu i dodaj następujące zmienne środowiskowe:
    ```env
    SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
    SHOPIFY_STORE_URL=your_shopify_store_url
    SHOPIFY_API_VERSION=2025-01
    OPENAI_API_KEY=your_openai_api_key
    GEMINI_API_KEY=your_gemini_api_key
    AI_PROVIDER=openai # lub gemini
    PORT=3000
    ```

## Uruchamianie aplikacji

1. Uruchom aplikację:
    ```bash
    npm start
    ```

2. Serwer będzie działał na porcie określonym w pliku `.env`, domyślnie `http://localhost:3000`.

## Endpointy

### Aktualizacja produktów

- **GET** `/api/update-products`
    - Ręcznie aktualizuje listę produktów z Shopify i zapisuje je w pliku `products.json`.

### Chatbot

- **POST** `/api/chatbot`
    - Odbiera wiadomości od użytkownika i zwraca odpowiedzi generowane przez model AI.
    - Body żądania:
      ```json
      {
          "sessionId": "unique_session_id",
          "message": "Pytanie użytkownika"
      }
      ```
    - Przykładowa odpowiedź:
      ```json
      {
          "response": "Odpowiedź AI"
      }
      ```

## Bezpieczeństwo

- Upewnij się, że plik `.env` jest dodany do `.gitignore`, aby nie został przypadkowo przesłany do systemu kontroli wersji.

## Testowanie

- Dodaj testy jednostkowe i integracyjne, aby upewnić się, że wszystkie funkcje działają prawidłowo.

## Logowanie

- Zaawansowane logowanie można wdrożyć za pomocą biblioteki `winston` lub innej biblioteki logowania, aby lepiej monitorować działanie aplikacji.
