# Nexus Gateway (Mini-Stripe)
### A Production-Grade Payment Gateway Architecture

Nexus Gateway is a high-performance, asynchronous payment processing engine built with FastAPI and PostgreSQL (Supabase). It simulates the end-to-end transaction lifecycle of a modern fintech platform, focusing on security, data integrity, and system reliability.

---

## System Architecture
Nexus Gateway follows a service-oriented architecture designed to handle high concurrency and asynchronous event delivery.



* **Merchant Layer:** API Key/Secret management with SHA-256 hashing.
* **Transaction Engine:** State-machine logic for payment intents (Created, Processing, Succeeded/Failed).
* **Idempotency Layer:** Prevents double-charging using unique idempotency keys.
* **Bank Simulator:** A rules-based engine simulating authorization and fraud detection.
* **Webhook Engine:** Asynchronous delivery of signed event payloads using HMAC-SHA256.

---

## Tech Stack
* **Backend:** FastAPI (Python 3.12+)
* **Database:** PostgreSQL (Managed via Supabase)
* **ORM:** SQLAlchemy 2.0
* **Asynchronous Tasks:** Python BackgroundTasks
* **Security:** HMAC-SHA256, SHA-256 Hashing, AES-256 (Simulation)
* **Deployment:** Docker-ready

---

## Key Engineering Features

### 1. Exactly-Once Processing (Idempotency)
To handle network timeouts and retries, Nexus Gateway implements a custom idempotency layer. If a merchant retries a request with the same X-Idempotency-Key, the system returns the existing record instead of creating a duplicate transaction.

### 2. Zero-Knowledge API Security
Merchant API keys are never stored in plain text. We utilize a one-way SHA-256 hashing strategy. Even in the event of a database compromise, merchant credentials remain secure.

### 3. Asynchronous Webhooks
Webhooks are fired using FastAPI BackgroundTasks. This ensures that the Payment API remains highly responsive, as it does not wait for the merchant's server to respond before finishing the transaction.

### 4. Cryptographic Webhook Signing
Every webhook payload includes an X-Nexus-Signature header. This allows merchants to verify that the notification was genuinely sent by Nexus Gateway, preventing "man-in-the-middle" or spoofing attacks.

---

## Getting Started

### Prerequisites
* Python 3.12+
* A Supabase Project (PostgreSQL)

### Setup
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/nexus-gateway.git](https://github.com/your-username/nexus-gateway.git)
   cd nexus-gateway
   
***2.Environment Variables:**
Create a .env file based on .env.example:

Code snippet
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
WEBHOOK_SECRET=your_secret_here
Installation and Initialization:

Bash
pip install -r requirements.txt
python init_db.py
Run Server:

Bash
uvicorn main:app --reload
Testing the Lifecycle
Onboarding: Create a merchant via POST /merchants/signup and save your api_key.

Create Intent: Create a payment via POST /payments/create using the X-API-KEY header.

Process: Use the payment_intent_id to call POST /payments/{id}/process.

Webhook: Run mock_merchant_listener.py to see the live, signed event delivery.