# 🚚 EcoClean - Smart Garbage & Fleet Management System

EcoClean is a modern, full-stack, and responsive web application designed to optimize community garbage reporting and coordinate driver fleet dispatches. It provides real-time status tracking, interactive map views, image verification, and driver shift check-ins with late-arrival alarms to ensure timely operations.

---

## 🏢 System Overview

The **EcoClean** platform brings together community reporting and service dispatch:
1. **User Portal**: Allows citizens to report localized garbage issues by capturing details, GPS location, and uploading photos. Users can track their report status from pending to completed.
2. **Driver Check-in Portal**: Enables drivers to check in for their shifts, tracking lorry numbers, coordinates, and arrival times.
3. **Admin Dashboard**: Offers a high-level overview of community feedback and fleet operations. Admins can update the status of garbage cleanups and monitor driver punctuality in real-time.

---

## ✨ Key Features

### 👤 Citizen / User Portal
* **One-Click Reporting**: Easily report waste accumulations by entering a description and uploading an image.
* **GPS Auto-Detection**: Seamless browser location API integration to pinpoint the precise coordinates of the reported waste.
* **Interactive Map**: View all reports across the community plotted on a Leaflet map.
* **Status Tracking**: Keep tabs on reports through color-coded status states (`Pending`, `In Progress`, `Completed`).

### 🚚 Fleet & Driver Log Portal
* **Shift Logging**: Drivers log their shifts, lorry numbers, and expected arrival times.
* **Real-time Punctuality Verification**: Backend checks check-in time against the driver's expected arrival.
* **Late Arrival Alarm**: Interactive, audible siren alert dynamically triggers on the page if a driver checks in late.

### 🔑 Administrative Control Panel
* **Live System Metrics**: Quick cards showing total reports and state breakdown.
* **Analytical Doughnut Chart**: Modern Chart.js visual showing status ratios.
* **Fleet Dispatch Logs**: Track lorry distribution, shifts, locations, and punctuality status (Late vs Punctual).
* **Garbage Cleanup Management**: Approve and mark reports completed.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, JavaScript (ES6+), Vanilla CSS (glassmorphism/dark theme layout)
* **Map & Charts**: Leaflet.js (Carto Dark theme), Chart.js
* **Backend**: Python 3, Flask, JWT Authentication, Flask-CORS
* **Database**: SQLite3 (via Flask-SQLAlchemy, swappable to MySQL or MongoDB)

---

## 📁 Repository Structure

```text
fleet management/
└── smart-garbage-system/
    ├── backend/
    │   ├── app.py              # Flask server, models, and endpoints
    │   ├── requirements.txt    # Python server dependencies
    │   ├── garbage.db          # Auto-generated SQLite Database
    │   └── uploads/            # Uploaded verification images
    └── frontend/
        ├── css/style.css       # Premium responsive styling
        ├── js/app.js           # Frontend client & API communication logic
        ├── index.html          # Main landing page
        ├── login.html          # Authenticating users and administrators
        ├── register.html       # Signup page with role-selection
        ├── user-dashboard.html # Garbage reporting feed
        ├── admin-dashboard.html# Fleet logs and garbage report queue
        ├── driver-checkin.html # GPS check-in page with alarm system
        ├── map.html            # Leaflet map tracking reports
        └── report.html         # Garbage report submission form
```

---

## 🚀 Setup & Local Development

### Prerequisites
* **Python 3.8+**
* Web browser with location permissions enabled (e.g., Google Chrome)

### 1. Start the Flask Backend
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd smart-garbage-system/backend
   ```
2. Create and activate a Python virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Flask application:
   ```bash
   python app.py
   ```
   *The server runs locally at http://127.0.0.1:5000*

### 2. Run the Frontend
1. The frontend acts as a single-page architecture and can be launched directly:
   * Double-click `frontend/index.html` to open it in your browser.
2. Alternatively, serve it via Python's HTTP server to avoid local filesystem path restrictions:
   ```bash
   cd smart-garbage-system/frontend
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000/index.html` in your browser.

---

## 🔒 Configuration & Adaptability

The project includes SQLite configuration out of the box for an instant demo setup. To migrate to an enterprise database system (like MySQL):
* Locate backend configuration in `app.py`:
  ```python
  # Swap SQLite:
  app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///garbage.db'
  
  # To MySQL:
  app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://username:password@localhost/dbname'
  ```
