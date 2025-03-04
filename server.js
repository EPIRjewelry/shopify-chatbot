const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Zmienne środowiskowe
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Pamięć sesji użytkownika (tymczasowo w RAM, można zastąpić bazą danych)
const userSessions = new Map();

// Pobieranie produktów z Shopify
const getShopifyProducts = async () => {
    if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_URL) {
        console.error("Brak wymaganych zmiennych środowiskowych");
        return [];
    }
    try {
        const response = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`, {
            headers: { 
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        return response.data.products || [];
    } catch (error) {
        console.error("Błąd pobierania produktów:", error.response?.data || error.message);
        return [];
    }
};

// Pobieranie trendów sprzedaży z Shopify
const getSalesTrends = async () => {
    if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_URL) {
        console.error("Brak wymaganych zmiennych środowiskowych");
        return "Brak danych sprzedaży.";
    }
    try {
        const response = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/orders.json`, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        const orders = response.data.orders || [];
        const productCounts = {};

        orders.forEach(order => {
            order.line_items.forEach(item => {
                productCounts[item.title] = (productCounts[item.title] || 0) + item.quantity;
            });
        });

        return Object.entries(productCounts).map(([title, count]) => `${title}: sprzedano ${count} szt.`).join("\n");
    } catch (error) {
        console.error("Błąd pobierania trendów sprzedaży:", error.response?.data || error.message);
        return "Brak danych sprzedaży.";
    }
};

// Główny endpoint chatbota
app.post('/api/chatbot', async (req, res) => {
    const { sessionId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Brak wiadomości w żądaniu' });

    if (!sessionId) return res.status(400).json({ error: 'Brak sessionId w żądaniu' });

    if (!userSessions.has(sessionId)) userSessions.set(sessionId, []);
    userSessions.get(sessionId).push({ role: 'user', content: message });

    const products = await getShopifyProducts();
    const trends = await getSalesTrends();

    const context = `Jesteś inteligentnym asystentem sklepu jubilerskiego EPIR. Masz kilka ról:
    - **Doradca**: Pomagasz klientom w wyborze biżuterii.
    - **SEO & Marketing**: Doradzasz w zakresie promocji i optymalizacji treści.
    - **Analityk**: Analizujesz trendy sprzedaży i sugerujesz strategie biznesowe.
    - **Projektant**: Inspirujesz do tworzenia nowych kolekcji biżuterii.
    
    Oto najnowsze trendy sprzedaży:
    ${trends}
    
    Oto aktualne produkty:
    ${products.map(p => `${p.title}: ${p.body_html}`).join("\n")}`;

    try {
        const openAIResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4.5-preview',
                messages: [
                    { role: 'system', content: context },
                    ...userSessions.get(sessionId),
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
        userSessions.get(sessionId).push({ role: 'assistant', content: botReply });

        res.json({ response: botReply });
    } catch (error) {
        console.error("Błąd komunikacji z OpenAI:", error.response?.data || error.message);
        res.status(500).json({ error: "Błąd komunikacji z OpenAI" });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
