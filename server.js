require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();

// Używamy wbudowanego parsera JSON w Express oraz middleware CORS
app.use(express.json());
app.use(cors());

// Sprawdzenie, czy zmienna środowiskowa OPENAI_API_KEY została ustawiona
if (!process.env.OPENAI_API_KEY) {
    console.error("Błąd: OPENAI_API_KEY nie jest ustawione w pliku .env");
    process.exit(1);
}

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/api/chatbot', async (req, res) => {
    try {
        const userMessage = req.body.message;
        // Walidacja: sprawdzamy, czy wiadomość istnieje oraz czy jest ciągiem znaków
        if (!userMessage || typeof userMessage !== 'string') {
            return res.status(400).json({ response: 'Brak prawidłowej wiadomości od użytkownika.' });
        }

        const prompt = `Klient: ${userMessage}\nChatbot:`;
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 150,
            temperature: 0.7,
        });

        res.json({ response: response.data.choices[0].text.trim() });
    } catch (error) {
        console.error('Błąd:', error.response ? error.response.data : error.message);
        res.status(500).json({ response: 'Wystąpił błąd serwera.' });
    }
});

// Endpoint testowy dla strony głównej
app.get("/", (req, res) => {
    res.send("Serwer działa poprawnie!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

