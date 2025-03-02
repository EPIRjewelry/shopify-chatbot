app.post('/api/chatbot', async (req, res) => {
    console.log("Otrzymane body:", req.body); // 🔍 Dodaj tę linię tutaj

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Brak wiadomości w żądaniu" });
        }

        const products = await getShopifyProducts();
        const productsText = products.map(p => `${p.title}: ${p.body_html}`).join("\n");

        // Wysyłanie zapytania do API OpenAI
        const openAIResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4.5-preview',
            messages: [
                { role: 'system', content: `Jesteś doradcą klienta w sklepie EPIR Jewellery. Oto aktualna lista produktów:\n${productsText}` },
                { role: 'user', content: message }
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ response: openAIResponse.data.choices[0].message.content });
    } catch (error) {
        console.error("Błąd serwera:", error.message);
        res.status(500).json({ error: "Błąd serwera", details: error.message });
    }
});

