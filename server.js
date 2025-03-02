const express = require('express');
const axios = require('axios');
require('dotenv').config(); // Załaduj zmienne środowiskowe

const app = express();
const PORT = process.env.PORT || 3000; // Railway przydziela dynamiczny port

app.use(express.json()); // Middleware do obsługi JSON

// Testowy endpoint do sprawdzenia, czy serwer działa
app.get('/', (req, res) => {
    res.send('Chatbot API działa!');
});

// Główny endpoint chatbota
app.post('/api/chatbot', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Brak wiadomości w żądaniu' });
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4', // Możesz zmienić na 'gpt-3.5-turbo'
            messages: [{ role: 'user', content: message }],
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 
                'OpenAI-Organization': process.env.OPENAI_ORG_ID, // Wczytaj ID organizacji z Railway
                'Content-Type': 'application/json'
            }
        });

        res.json({ response: response.data.choices[0].message.content });
    } catch (error) {
        console.error("Błąd API OpenAI:", error.response ? error.response.data : error.message);
        res.status(500).json({ response: 'Wystąpił błąd w API OpenAI.', details: error.response?.data });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
