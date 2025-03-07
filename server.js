const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080; // Cloud Run wymaga dynamicznego portu

app.use(express.json());
app.use(cors());
app.use(helmet());

// Ograniczenie liczby żądań (100 żądań na 15 minut z jednego IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Zbyt wiele żądań z tego samego adresu IP, spróbuj ponownie za 15 minut."
});
app.use(limiter);

// Zmienne środowiskowe
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-04";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";

// Debugowanie zmiennych środowiskowych (usuń w produkcji)
console.log("🔹 SHOPIFY_STORE_URL:", SHOPIFY_STORE_URL);
console.log("🔹 AI_PROVIDER:", AI_PROVIDER);

// Sprawdzenie wymaganych zmiennych
if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_URL || !OPENAI_API_KEY) {
    console.error("❌ Brak wymaganych zmiennych środowiskowych. Sprawdź konfigurację.");
    process.exit(1);
}

// Pobieranie produktów z Shopify
const updateProductList = async () => {
    try {
        console.log("🔄 Pobieram produkty z Shopify...");
        const response = await axios.get(
            `${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`✅ Pobrano ${response.data.products.length} produktów.`);
        return response.data.products;
    } catch (error) {
        console.error("❌ Błąd pobierania produktów:", error.response?.data || error.message);
        return [];
    }
};

// Endpoint do ręcznej aktualizacji produktów
app.get('/api/update-products', async (req, res) => {
    const products = await updateProductList();
    res.json({ message: "Lista produktów zaktualizowana!", count: products.length });
});

// Endpoint chatbota
app.post('/api/chatbot', async (req, res) => {
    const { sessionId, message } = req.body;
    if (!message || !sessionId) return res.status(400).json({ error: 'Brak wymaganych danych' });

    const products = await updateProductList();
    const productDescriptions = products.map(p => `${p.title}: ${p.body_html}`).join("\n");
    const context = `Jesteś doradcą sklepu jubilerskiego EPIR. Pomagaj klientom w wyborze biżuterii.

Dostępne produkty:
${productDescriptions}`;

    try {
        let aiResponse;
        if (AI_PROVIDER === "openai") {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4.5-preview',
                    messages: [
                        { role: 'system', content: context },
                        { role: 'user', content: message }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            aiResponse = response.data.choices?.[0]?.message?.content || "Brak odpowiedzi od AI";
        } else if (AI_PROVIDER === "gemini") {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{ parts: [{ text: `${context}\nKlient: ${message}\nChatbot:` }] }]
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Brak odpowiedzi od AI";
        } else {
            aiResponse = "Nieobsługiwany dostawca AI";
        }
        res.json({ response: aiResponse });
    } catch (error) {
        console.error("❌ Błąd AI:", error.response?.data || error.message);
        res.status(500).json({ error: "Błąd komunikacji z AI" });
    }
});

// Obsługa błędów (zapobieganie crashom)
process.on('uncaughtException', (err) => {
    console.error('❌ Nieoczekiwany błąd:', err);
});

// Start serwera
app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
