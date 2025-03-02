const express = require('express');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config(); // Załaduj zmienne środowiskowe

// Sprawdzenie, czy plik .env istnieje
if (!fs.existsSync('.env')) {
    console.error("Błąd: Plik .env nie istnieje! Upewnij się, że został poprawnie utworzony.");
}

const app = express();
const PORT = process.env.PORT || 3000; // Railway automatycznie przypisuje port

app.use(express.json()); // Middleware do obsługi JSON

// Testowy endpoint, żeby sprawdzić, czy serwer działa
app.get('/', (req, res) => {
    res.send('Chatbot API działa poprawnie!');
});

// Zmienne środowiskowe do połączenia z Shopify
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

// Endpoint do pobierania produktów z Shopify
app.get('/api/products', async (req, res) => {
    try {
        console.log("Shopify URL:", SHOPIFY_STORE_URL);
        console.log("Shopify Access Token:", SHOPIFY_ACCESS_TOKEN ? "OK" : "Brak tokena");

        const response = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`, {
            headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Błąd połączenia z Shopify:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Błąd połączenia z Shopify', details: error.response?.data });
    }
});

// Główny endpoint chatbota
app.post('/api/chatbot', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Brak wiadomości w żądaniu' });
        }

        // Pobranie produktów z Shopify
        console.log("Pobieranie produktów z Shopify...");
        const shopifyResponse = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`, {
            headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN }
        });

        console.log("Pobrano produkty z Shopify.");
        const products = shopifyResponse.data.products.map(p => `${p.title}: ${p.body_html}`).join("\n");

        // Wysyłanie zapytania do OpenAI z kontekstem produktów
        console.log("Wysyłanie zapytania do OpenAI...");
        console.log("Używany klucz API OpenAI:", process.env.OPENAI_API_KEY ? "OK" : "Brak API Key");

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4.5-preview',
            messages: [
                { role: 'system', content: `Jesteś doradcą klienta w sklepie EPIR Jewellery. Masz dostęp do oferty sklepu. Oto aktualna lista produktów: \n${products}` },
                { role: 'user', content: message }
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Odpowiedź z OpenAI otrzymana.");
        res.json({ response: response.data.choices[0].message.content });
    } catch (error) {
        console.error("Błąd API OpenAI:", error.response ? error.response.data : error.message);
        res.status(500).json({ response: 'Wystąpił błąd w API OpenAI.', details: error.response?.data });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log('Serwer uruchomiony na:', PORT, 'API Key:', process.env.OPENAI_API_KEY ? 'OK' : 'Brak API Key');
});
