const express = require('express');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Zmienne środowiskowe
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Pobieranie i zapisanie produktów z Shopify
const updateProductList = async () => {
    if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_URL) {
        console.error("Brak wymaganych zmiennych środowiskowych");
        return;
    }
    try {
        const response = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        fs.writeFileSync('products.json', JSON.stringify(response.data.products, null, 2));
        console.log("Plik products.json został zaktualizowany!");
    } catch (error) {
        console.error("Błąd pobierania produktów:", error);
    }
};

// Wczytanie produktów z pliku
const loadProductsFromFile = () => {
    try {
        const data = fs.readFileSync('products.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Błąd wczytywania pliku z produktami:", error);
        return [];
    }
};

// Endpoint do aktualizacji produktów
app.get('/api/update-products', async (req, res) => {
    await updateProductList();
    res.json({ message: "Lista produktów zaktualizowana!" });
});

// Główny endpoint chatbota
app.post('/api/chatbot', async (req, res) => {
    const { sessionId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Brak wiadomości w żądaniu' });
    if (!sessionId) return res.status(400).json({ error: 'Brak sessionId w żądaniu' });

    const products = loadProductsFromFile();
    const context = `Jesteś inteligentnym asystentem sklepu jubilerskiego EPIR. Oto lista produktów:
    ${products.map(p => `${p.title}: ${p.body_html}`).join("\n")}`;

    try {
        const openAIResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4.5-preview',
                messages: [
                    { role: 'system', content: context },
                    { role: 'user', content: message }
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const botReply = openAIResponse.data.choices?.[0]?.message?.content || "Brak odpowiedzi od AI";
        res.json({ response: botReply });
    } catch (error) {
        console.error("Błąd komunikacji z OpenAI:", error);
        res.status(500).json({ error: "Błąd komunikacji z OpenAI" });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    updateProductList(); // Automatyczna aktualizacja produktów przy uruchomieniu
});
