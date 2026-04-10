# 🌿 Bhoomi Mitra: The Digital Backbone for Modern Agriculture

![Bhoomi Mitra Banner](assets/banner.png)

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Generative AI](https://img.shields.io/badge/Powered%20By-Gemini%20Pro-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

Bhoomi Mitra (**भूमि मित्र**, meaning *"Friend of the Land"*) is a high-tech, multilingual Agritech platform designed to democratize access to agricultural intelligence and create a fair, transparent marketplace for farmers and contractors. 

By integrating **Generative AI**, **Real-time Weather Intelligence**, and a **Robust Handshake Protocol**, we bridge the gap between rural producers and urban buyers, ensuring that the fruits of labor reach the market without middle-man friction.

---

## ✨ Core Pillars of Bhoomi Mitra

### 🤝 1. Farmer-Contractor Ecosystem
A secure, state-driven marketplace where farmers can post their harvest and contractors can show interest.
- **Handshake Protocol**: A dual-acceptance system where both parties must confirm the deal, generating a secure transaction record.
- **Overselling Protection**: Real-time inventory management ensures that a crop cannot be sold twice.
- **Dynamic Negotiation**: Built-in messaging allows for price and quantity negotiation before finalizing the deal.

![Marketplace Mockup](assets/marketplace.png)

### 🤖 2. Structured Interactive Chatbot
Our interactive assistant uses a **Logic-Based Selection** system to ensure 100% factual accuracy and high accessibility for all users.
- **Selection-Driven Flow**: Users navigate through intuitive, multilingual menus to get precise information without typing hurdles.
- **Actionable Insights**: Pulls real-time data for **MSP (Minimum Support Price)**, **Weather**, **Fertilizer Recommendations**, and **Government Schemes**.
- **Localization Integrated**: Fully mapped to regional languages, ensuring every menu and response is culturally and linguistically relevant.

### 🌎 3. Deep Multilingual Localization
Bhoomi Mitra is built for the Indian heartland, supporting:
- **English**, **Hindi (हिंदी)**, **Bengali (বাংলা)**, **Tamil (தமிழ்)**, **Telugu (తెలుగు)**, **Marathi (मराठी)**, and **Gujarati (ગુજરાતી)**.
- Full UI translation and localized crop/city labeling ensures zero literacy barriers.

---

## 🛠️ Technical Excellence

| Component | Technology |
| :--- | :--- |
| **Backend** | Python / Flask |
| **Database** | SQLite (Production-hardened with WAL mode) / PostgreSQL |
| **ORM** | SQLAlchemy 2.0 |
| **Security** | JWT (JSON Web Tokens) with 30-day persistence |
| **AI Engine** | Google Generative AI (Gemini Pro) |
| **Static Assets** | WhiteNoise (Optimized for Render & Heroku) |
| **OCR (Roadmap)** | Pytesseract for document verification |

### 🏗️ Architecture Design
- **Idempotent Operations**: API routes designed to handle retries and database locks (SQLite Busy handling).
- **Strict State Machine**: Interest lifecycle follows a rigorous `Pending → Negotiating → Accepted/Rejected` flow.
- **Concurrency**: Optimized database engine options for high-traffic scenarios.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Gemini API Key (Required for Chatbot)
- Weather API Key (for real-time updates)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Zapperer04/Bhoomi-Mitra.git
   cd Bhoomi-Mitra
   ```

2. **Set up Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   SECRET_KEY=your_secret_key
   JWT_SECRET_KEY=your_jwt_secret
   GEMINI_API_KEY=your_google_ai_key
   WEATHER_API_KEY=your_weather_api_key
   DATABASE_URL=sqlite:///instance/db.sqlite3
   ```

5. **Initialize Database**
   ```bash
   flask db upgrade
   # Or directly if using create_all in app.py
   python app.py
   ```

6. **Run Locally**
   ```bash
   python app.py
   ```

---

## 📂 Project Structure
```text
├── app.py              # Main Application Entry & Routes
├── models.py           # Database Schemas (User, Crop, Interest, Message)
├── services/           
│   ├── brain.py        # Gemini AI Reasoning Engine
│   ├── translator.py   # Multilingual Translation Service
│   └── msp_service.py  # MSP Data Management
├── data/               # Static datasets (Weather, Fertilizer, Advisory)
├── static/             # Frontend Assets (CSS, JS, Images)
├── templates/          # Jinja2 HTML Templates
└── instance/           # Local Database Storage
```

---

## 📜 Patent & Intellectual Property
**Patent Published (April 2025)**: 
*"A Multimodal Chatbot for Empowering Farmers with Efficient Trade, Learning, and Productivity Solutions."*
This project is an implementation of the frameworks outlined in the published patent research.

---

## 🤝 Contributing
We welcome contributions that help empower farmers!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for the Agriculture Community.
</p>
