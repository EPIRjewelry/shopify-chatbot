const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Testowy endpoint
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
        const response = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`, {
            headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
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
        const shopifyResponse = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`, {
            headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN }
        });
        const products = shopifyResponse.data.products.map(p => `${p.title}: ${p.body_html}`).join("\n");

        // Wysyłanie zapytania do OpenAI
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4.5-preview',
            messages: [
                { role: 'system', content: `Jesteś doradcą klienta w sklepie EPIR Jewellery. Oto aktualna lista produktów: \n${products}` },
                { role: 'user', content: message }
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ response: response.data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ response: 'Wystąpił błąd w API OpenAI.', details: error.response?.data });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

