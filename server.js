require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(bodyParser.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/api/chatbot', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ response: 'Brak wiadomości od użytkownika.' });
    }

    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Klient: ${userMessage}\nChatbot:`,
      max_tokens: 150,
      temperature: 0.7,
    });

    res.json({ response: response.data.choices[0].text.trim() });
  } catch (error) {
    console.error('Błąd:', error);
    res.status(500).json({ response: 'Wystąpił błąd.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
