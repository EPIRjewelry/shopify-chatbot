const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const { celebrate, Joi, errors, Segments } = require('celebrate');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());

// Ograniczenie liczby żądań – przykładowo 100 żądań na 15 minut z jednego IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 100, // maksymalnie 100 żądań na IP
    message: "Zbyt wiele żądań z tego samego adresu IP, spróbuj ponownie za 15 minut."
});
app.use(limiter);

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Zmienne środowiskowe
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";

if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_URL || !OPENAI_API_KEY || !GEMINI_API_KEY) {
    console.error("Brak wymaganych zmiennych środowiskowych. Sprawdź plik .env.");
    process.exit(1);
}

// Pobieranie i zapisanie produktów z Shopify
const updateProductList = async () => {
    try {
        const response = await axios.get(`${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json`, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        await fs.writeFile('products.json', JSON.stringify(response.data.products, null, 2));
        console.log("Plik products.json został zaktualizowany!");
    } catch (error) {
        console.error("Błąd pobierania produktów:", error.response?.data || error.message);
    }
};

// Wczytanie produktów z pliku
const loadProductsFromFile = async () => {
    try {
        const data = await fs.readFile('products.json', 'utf8');
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

// Walidacja danych wejściowych dla endpointu chatbota
const chatbotValidation = celebrate({
    [Segments.BODY]: Joi.object().keys({
        sessionId: Joi.string().required(),
        message: Joi.string().required()
    })
});

// Wybór odpowiedniego modelu AI
const getAIResponse = async (message, products) => {
    const productDescriptions = products.map(p => `${p.title}: ${p.body_html}`).join("\n");
    const context = `Jesteś inteligentnym asystentem sklepu jubilerskiego EPIR. Oto lista produktów:\n${productDescriptions}`;

    try {
        if (AI_PROVIDER === "openai") {
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
            return openAIResponse.data.choices?.[0]?.message?.content || "Brak odpowiedzi od AI";
        } else if (AI_PROVIDER === "gemini") {
            const geminiResponse = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{ parts: [{ text: `${context}\nKlient: ${message}\nChatbot:` }] }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            return geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "Brak odpowiedzi od AI";
        } else {
            return "Nieobsługiwany dostawca AI";
        }
    } catch (error) {
        console.error("Błąd komunikacji z AI:", error.response?.data || error.message);
        return "Błąd komunikacji z AI";
    }
};

// Główny endpoint chatbota z walidacją
app.post('/api/chatbot', chatbotValidation, async (req, res) => {
    const { sessionId, message } = req.body;

    const products = await loadProductsFromFile();
    const botReply = await getAIResponse(message, products);

    res.json({ response: botReply });
});

// Obsługa błędów walidacji
app.use(errors());

// Globalny middleware obsługi błędów
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Coś poszło nie tak!' });
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    updateProductList(); // Automatyczna aktualizacja produktów przy uruchomieniu
});
