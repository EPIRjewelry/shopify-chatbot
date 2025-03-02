require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Sprawdzenie, czy klucz API jest ustawiony
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
        console.error('Błąd:', error);
        res.status(500).json({ response: 'Wystąpił błąd.' });
    }
});

// **Nowy endpoint dla GET "/"** (Dodaj to przed `app.listen(...)`)
app.get("/", (req, res) => {
    res.send("Serwer działa poprawnie!");
});

// **Serwer uruchomiony na porcie**
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

