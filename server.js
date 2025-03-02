const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
console.log("SHOPIFY_ACCESS_TOKEN:", process.env.SHOPIFY_ACCESS_TOKEN ? "Loaded" : "MISSING");
console.log("SHOPIFY_STORE_URL:", process.env.SHOPIFY_STORE_URL);
console.log("SHOPIFY_API_VERSION:", process.env.SHOPIFY_API_VERSION);

// Testowy endpoint
app.get('/', (req, res) => {
    res.send('Chatbot API działa poprawnie!');
});

// Zmienne środowiskowe do połączenia z Shopify
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

// Funkcja pomocnicza do pobierania produktów z Shopify
const getShopifyProducts = async () => {
    try {
        const response = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/products.json`, {
    headers: { 
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
    }
});

        });
        return response.data.products;
    } catch (error) {
        console.error('Błąd podczas pobierania produktów z Shopify:', error.response?.data || error.message);
        throw new Error('Błąd połączenia z Shopify');
    }
};

// Endpoint do pobierania produktów z Shopify
app.get('/api/products', async (req, res) => {
    try {
        const products = await getShopifyProducts();
        res.json({ products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Główny endpoint chatbota
app.post('/api/chatbot', async (req, res) => {
    // Logujemy, co przychodzi w body (dla debugowania)
    console.log("Otrzymane body:", req.body);

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Brak wiadomości w żądaniu' });
        }

        // Pobieramy produkty z Shopify
        const products = await getShopifyProducts();
        const productsText = products.map(p => `${p.title}: ${p.body_html}`).join("\n");

        // Wysyłanie zapytania do OpenAI
        const openAIResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4.5-preview',
                messages: [
                    { role: 'system', content: `Jesteś doradcą klienta w sklepie EPIR Jewellery. Oto aktualna lista produktów:\n${productsText}` },
                    { role: 'user', content: message }
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ response: openAIResponse.data.choices[0].message.content });
    } catch (error) {
        console.error("Błąd serwera:", error.message);
        res.status(500).json({ error: "Błąd serwera", details: error.message });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
