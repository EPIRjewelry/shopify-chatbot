const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const path = require('path');

const app = express();
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;

// Usunięcie błędu z X-Forwarded-For
app.set('trust proxy', true);

// Serwowanie plików statycznych (m.in. test_chatbot.html)
app.use(express.static(path.join(__dirname)));

// Środowisko
app.use(express.json());
app.use(cors());
app.use(helmet());

// Limit żądań
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

// Debug (opcjonalny)
console.log("🔹 SHOPIFY_STORE_URL:", SHOPIFY_STORE_URL);
console.log("🔹 AI_PROVIDER:", AI_PROVIDER);

// Sprawdzenie zmiennych
if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_URL || !OPENAI_API_KEY) {
  console.error("❌ Brak wymaganych zmiennych środowiskowych. Sprawdź konfigurację.");
  process.exit(1);
}

// Funkcja pobierania produktów z Shopify
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

// Endpoint główny – serwuje plik test_chatbot.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test_chatbot.html'));
});

// Endpoint do ręcznej aktualizacji produktów
app.get('/api/update-products', async (req, res) => {
  const products = await updateProductList();
  res.json({ message: "Lista produktów zaktualizowana!", count: products.length });
});

// Endpoint chatbota (OpenAI / Gemini)
app.post('/api/chatbot', async (req, res) => {
  const { sessionId, message, task } = req.body;
  if (!message || !sessionId || !task) {
    return res.status(400).json({ error: 'Brak wymaganych danych: message, sessionId, task' });
  }

  const products = await updateProductList();
  const productDescriptions = products.map(p => `${p.title}: ${p.body_html}`).join("\n");
  const context = `Jesteś doradcą sklepu jubilerskiego EPIR. Pomagaj klientom w wyborze biżuterii.

Dostępne produkty:
${productDescriptions}`;

  let aiResponse = "Nieznane zadanie.";

  try {
    if (task === "chat") {
      // 🟢 OpenAI
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
    } else if (task === "analyze") {
      // 🔵 Gemini
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: `Analizuj to zapytanie klienta: ${message}\n` }] }]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Brak analizy od AI";
    }
  } catch (error) {
    console.error("❌ Błąd AI:", error.response?.data || error.message);
    return res.status(500).json({ error: "Błąd komunikacji z AI" });
  }

  res.json({ response: aiResponse });
});

// Obsługa błędów
process.on('uncaughtException', (err) => {
  console.error('❌ Nieoczekiwany błąd:', err);
});

// Start serwera
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
