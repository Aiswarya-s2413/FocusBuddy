# 🧠 FOCUSBUDDY

**FocusBuddy** is a productivity platform that helps users stay focused, manage tasks, and connect with mentors for accountability and support. It features Pomodoro timers, session tracking, journaling, and a mentorship system.

---

## 🚀 Features

- ⏱️ Pomodoro timer for tracking productivity  
- 👨‍🎓 Focus sessions for combined study  
- 📔 Personal journal with mood tracking  
- 📅 Scheduled mentorship sessions  
- 🛠️ Admin dashboard for user and mentor management  
- 💼 Wallet and payment tracking for mentors  
- 🔔 Real-time notifications and reminders  

---

## 🛠️ Technologies Used

### 🔷 Frontend
- **React** – component-based UI  
- **Tailwind CSS** – utility-first CSS framework  
- **Vite** – fast frontend tooling and bundler  

### 🔶 Backend
- **Django** – robust Python web framework  
- **Django REST Framework (DRF)** – for building RESTful APIs  
- **Celery** – asynchronous task queue for background jobs  

### 🔃 Real-Time & WebRTC
- **Django Channels** – WebSocket support for real-time features  
- **WebRTC** – peer-to-peer video/audio calling  

### 🧩 Authentication
- **JWT (JSON Web Tokens)** – secure API authentication  
- **Google OAuth** – social login integration  

### 🗄️ Database
- **PostgreSQL**

### 🐳 DevOps
- **Docker** – containerization  
- **Docker Compose** – multi-container orchestration    

---

## 📁 Project Structure Overview

      FocusBuddy/
      ├── backend/ # Django backend with APIs, Celery, WebSockets
      ├── frontend/ # React frontend using Vite and Tailwind CSS
      ├── scripts/ # Dev and setup scripts
      ├── docker-compose.yml # Multi-container orchestration
      ├── .env.example # Environment variable template
      └── README.md

---

## 🚀 Getting Started

### ✅ Prerequisites

To run **FocusBuddy**, you’ll need the following tools installed **if you're not using Docker**.  
Using Docker is highly recommended for a smoother setup.

| Tool                            | Purpose                                                                 |
|----------------------------------|-------------------------------------------------------------------------|
| 🐳 **Docker & Docker Compose**   | Recommended for setting up backend, frontend, and dependencies automatically. |
| 🐍 **Python 3.8+**               | Needed if running the backend manually without Docker.                     |
| 🟢 **Node.js (v16 or higher)**   | Needed if running the frontend manually without Docker.                    |
| 🐘 **PostgreSQL**                | Recommended database. Docker will auto-setup it, or install locally if not using Docker. |
| 🔁 **Redis**                     | Required for Celery (background tasks) and Django Channels (WebSocket). Handled by Docker setup. |

### 🛠️ Installation

Follow the steps below to set up FocusBuddy on your local machine.

📦 1. Clone the Repository

      git clone https://github.com/yourusername/FocusBuddy.git
      cd FocusBuddy

🔐 2. Set Up Environment Variables

      Set up the .env file in the frontend as well as backend  

🐳 3. Run Using Docker (Recommended)

      This will spin up the entire stack (Backend, Frontend, PostgreSQL, Redis, Celery) using Docker:
      
      ./scripts/dev.sh start
      Behind the scenes: This script runs docker-compose up --build

⚙️ 4. Manual Setup (Without Docker - Optional)

      🔹 Backend Setup

          cd backend
          python3 -m venv env
          source env/bin/activate
          pip install -r requirements.txt
          python manage.py migrate
          python manage.py runserver

      🔸 Frontend Setup

          cd frontend
          npm install
          npm run dev

---

##🧪 Usage
Once the project is up and running, you can access the following interfaces:

🌐 Frontend (React App)

    URL: http://localhost:5173
    
    Description: Main user interface with focus tools, mentor sessions, journals, and more.

📡 Backend API (Django + DRF)

    User Endpoints: http://localhost:8000/api/user/
    
    Mentor Endpoints: http://localhost:8000/api/mentor/
    
    Admin Endpoints: http://localhost:8000/api/admin/

    These endpoints are secured using JWT authentication and support Google OAuth login as well.

🛠️ Django Admin Panel

    URL: http://localhost:8000/admin/
    
    Use: Superusers can manage users, mentors, journals, sessions, etc.

---

🤝 Contributing
Contributions are welcome!
Feel free to open issues or submit pull requests to improve features, fix bugs, or suggest enhancements.

---

📬 Contact
For questions, feedback, or support, feel free to reach out:
📧 aiswaryaakku9@gmail.com

---




