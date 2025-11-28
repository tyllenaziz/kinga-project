# 🌱 Kinga - Smart Pest Management API (Backend)

The intelligent "Brain" behind the Kinga ecosystem. This backend handles image processing, AI inference using PyTorch, user authentication, and database management.

## 🚀 Features
*   **AI Pest Detection:** Uses a custom-trained **ResNet18** PyTorch model to identify 10 types of agricultural pests.
*   **Confidence Logic:** Rejects non-pest images (<50%) and flags unsure predictions (50-70%).
*   **Database Management:** Connects to **MySQL (Clever Cloud)** to store user data, pest details (Causes/Effects/Solutions), and scan history.
*   **Authentication:** Secure Login/Signup with Password Hashing.
*   **Email Verification:** Integration with **Brevo API** for sending OTP codes.
*   **Smart Configuration:** Automatically switches between Cloud (Render) and Localhost database settings.

## 🛠️ Tech Stack
*   **Framework:** Python Flask
*   **AI/ML:** PyTorch, Torchvision, Pillow
*   **Database:** MySQL (Hosted on Clever Cloud), SQLAlchemy
*   **Deployment:** Render
*   **Email:** Brevo (Sendinblue)

## ⚙️ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/tyllenaziz/kinga-project.git
    cd kinga-project
    ```

2.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Environment Variables**
    Create a `.env` file or set these in your OS/Cloud provider:
    *   `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT` (MySQL Settings)
    *   `BREVO_API_KEY`, `SENDER_EMAIL` (Email Settings)

4.  **Run Locally**
    ```bash
    python app.py
    ```

## 🧠 AI Model
The system detects the following classes:
`Ants`, `Bat`, `Bedbugs`, `Cockroach`, `Flies`, `Frog`, `Silverfish`, `Snake`, `Spiders`, `Termites`.

## 🔗 Live Deployment
Base URL: `https://kinga-backend.onrender.com`
