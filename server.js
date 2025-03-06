const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const mongoose = require('mongoose');

// Pobranie adresu MongoDB z Railway
const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL;

if (!MONGO_URI || !MONGO_URI.startsWith('mongodb')) {
    console.error("❌ Błąd: Brak poprawnego adresu MongoDB w zmiennych środowiskowych!");
    process.exit(1);
}

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Połączono z MongoDB"))
.catch(err => {
    console.error("❌ Błąd połączenia z MongoDB:", err.message);
    process.exit(1);
});

const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const { celebrate, Joi, errors, Segments } = require('celebrate');

const app = express();
app.set('trust proxy', 1);

const PORT = 3000; // Ustaw port na sztywno

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Zbyt wiele żądań z tego samego adresu IP, spróbuj ponownie za 15 minut."
});
app.use(limiter);

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// *** BEZPOŚREDNIE USTAWIENIA – ZAMIAST ENV ***
const SHOPIFY_ACCESS_TOKEN = "TU_WKLEJ_SWÓJ_TOKEN";
const SHOPIFY_STORE_URL = "https://epir-art-jewellery.myshopify.com";
const API_VERSION = "2025-01";
const OPENAI_API_KEY = "TU_WKLEJ_SWÓJ_OPENAI_KEY";
const GEMINI_API_KEY = "TU_WKLEJ_SWÓJ_GEMINI_KEY";
const AI_PROVIDER = "gemini";
const MONGO_URL = "TU_WKLEJ_SWÓJ_MONGO_URI";

// *** KONFIGURACJA MONGODB ***
if (mongoose.connection.readyState === 0) {
    mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log("✅ Połączono z MongoDB!"))
        .catch(err => console.error("❌ Błąd połączenia z MongoDB:", err));
}

// Definicja schematu produktu
const productSchema = new mongoose.Schema({
    id: String,
    title: String,
    description: String
});
const Product = mongoose.model('Product', productSchema);

// *** FUNKCJA POBIERANIA PRODUKTÓW Z SHOPIFY GRAPHQL API ***
const updateProductList = async () => {
    try {
        console.log("🔄 Pobieram produkty z Shopify...");
        const response = await axios.post(
            `${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/graphql.json`,
            {
                query: `{
                    products(first: 50) {
                        edges {
                            node {
                                id
                                title
                                descriptionHtml
                            }
                        }
                    }
                }`
            },
            {
                headers: {
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.data && response.data.data.products) {
            const products = response.data.data.products.edges.map(edge => ({
                id: edge.node.id,
                title: edge.node.title,
                description: edge.node.descriptionHtml
            }));

            await Product.deleteMany({});
            await Product.insertMany(products);
            console.log("✅ Produkty zapisane w MongoDB!");
        } else {
            console.log("⚠️ Brak produktów w Shopify.");
        }
    } catch (error) {
        console.error("❌ Błąd pobierania produktów:", error.response?.data || error.message);
    }
};

// *** ENDPOINT AKTUALIZACJI PRODUKTÓW ***
app.get('/api/update-products', async (req, res) => {
    await updateProductList();
    res.json({ message: "Lista produktów zaktualizowana!" });
});

// *** WALIDACJA DANYCH DLA CHATBOTA ***
const chatbotValidation = celebrate({
    [Segments.BODY]: Joi.object().keys({
        sessionId: Joi.string().required(),
        message: Joi.string().required()
    })
});

// *** WYBÓR MODELU AI ***
const getAIResponse = async (message) => {
    const products = await Product.find({});
    const productDescriptions = products.map(p => `${p.title}: ${p.description}`).join("\n");
    const context = `Jesteś asystentem sklepu jubilerskiego EPIR. 
Specjalizujemy się w biżuterii artystycznej. 
Nasze produkty: ${productDescriptions}.
Twoim celem jest pomaganie klientom w wyborze biżuterii, odpowiadanie na pytania, sugerowanie produktów i pomoc w projektowaniu na zamówienie na bazie naszych wzorów oraz pomysłów klienta.`;

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
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`,
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
        console.error("❌ Błąd komunikacji z AI:", error.response?.data || error.message);
        return "Błąd komunikacji z AI";
    }
};

// *** ENDPOINT CHATBOTA ***
app.post('/api/chatbot', chatbotValidation, async (req, res) => {
    const { sessionId, message } = req.body;
    const botReply = await getAIResponse(message);
    res.json({ response: botReply });
});

// *** OBSŁUGA BŁĘDÓW WALIDACJI ***
app.use(errors());
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Coś poszło nie tak!' });
});

// *** START SERWERA ***
app.listen(PORT, async () => {
    console.log(`🚀 Serwer działa na porcie ${PORT}`);
    await updateProductList(); // Automatyczna aktualizacja produktów przy starcie
});
