
## Endpointy API

### **Aktualizacja produktów**
- **GET** `/api/update-products`  
 Ręcznie aktualizuje listę produktów z Shopify.

### **Chatbot**
- **POST** `/api/chatbot`  
 Odbiera wiadomości od użytkownika i zwraca odpowiedzi generowane przez model AI.

 **Przykładowe żądanie:**
 ```json
 {
     "sessionId": "unique_session_id",
     "message": "Jaki pierścionek na zaręczyny polecasz?"
 }
 ```

 **Przykładowa odpowiedź:**
 ```json
 {
     "response": "Polecam pierścionek z białego złota z diamentem."
 }
 ```

---

## **Wdrożenie na Google Cloud Run**
1. **Zaloguj się do Google Cloud:**
 ```bash
 gcloud auth login
 gcloud config set project YOUR_PROJECT_ID
 ```

2. **Zbuduj obraz Dockera i wyślij go do Google Container Registry:**
 ```bash
 gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/shopify-chatbot
 ```

3. **Wdrożenie na Cloud Run:**
 ```bash
 gcloud run deploy shopify-chatbot --image gcr.io/YOUR_PROJECT_ID/shopify-chatbot --platform managed --allow-unauthenticated --region europe-west1
 ```

4. **Po wdrożeniu otrzymasz URL aplikacji, np.:**
 ```
 https://shopify-chatbot-xyz.a.run.app
 ```

---

## **Bezpieczeństwo**
- **Plik `.env`** powinien być dodany do `.gitignore`, aby nie został przypadkowo przesłany do repozytorium.
- Zaleca się użycie **Google Secrets Manager** do przechowywania kluczy API.

---

## **Testowanie**
- Możesz użyć **Postmana** lub **cURL**, aby przetestować endpointy API.

🎯 **Teraz aplikacja jest gotowa do wdrożenia na Google Cloud Run!** 🚀
