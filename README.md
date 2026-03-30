# 📄 Asynchronous Document Processing API

## 🚀 Overview

This project is a **backend system** that allows users to submit documents for processing.
The system processes documents **asynchronously** using background workers and provides APIs to track job status.

---

## 🎯 Features

* 📥 Submit a document (via file URL)
* 🧠 Asynchronous processing using worker-based architecture
* 🔄 Job status tracking (`pending`, `processing`, `completed`, `failed`)
* ⚡ Multiple background workers for parallel processing
* 🩺 Health check endpoint
* 🛡️ Error handling middleware

---

## 🏗️ Tech Stack

* **Node.js**
* **Express.js**
* **JavaScript (ES6)**
* **In-memory queue (for job handling)**

---

## 📂 Project Structure

```
├── index.js              # Main server file
├── docprocessing.js     # Job queue & worker logic
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```
git clone https://github.com/spyn21/Assignment-BP-Optima.git
cd Assignment-BP-Optima
```

### 2️⃣ Install dependencies

```
npm install
```

### 3️⃣ Setup environment variables

Create a `.env` file:

```
PORT=8000
```

### 4️⃣ Run the server

```
npm start
```

---

## 🌐 API Endpoints

### 🔹 1. Create Document Job

**POST** `/api/document-jobs`

Request Body:

```json
{
  "fileUrl": "https://example.com/sample.pdf"
}
```

Response:

```json
{
  "jobId": "12345",
  "status": "pending"
}
```

---

### 🔹 2. Get Job Status

**GET** `/api/document-jobs/:jobId`

Response:

```json
{
  "jobId": "12345",
  "status": "processing"
}
```

---

### 🔹 3. Health Check

**GET** `/health`

Response:

```json
{
  "status": "OK",
  "timestamp": "2026-03-30T10:00:00.000Z"
}
```

---

## 🔄 How It Works

1. User submits a document via API
2. A **job is created** and stored in memory
3. Background **workers continuously poll the queue**
4. Workers process jobs with simulated delay
5. Job status is updated accordingly

---

## 🧠 Architecture

* **Producer** → API creates jobs
* **Queue** → Stores pending jobs
* **Workers (Consumers)** → Process jobs asynchronously

---

## ⚠️ Limitations

* Uses **in-memory storage** (data lost on restart)
* No persistent database
* No real file processing (simulated)

---

## 🔮 Future Improvements

* 🔗 Integrate **Redis + Bull Queue**
* 🗄️ Add **database (MongoDB/PostgreSQL)**
* 🔁 Retry mechanism for failed jobs
* 📊 Add logging & monitoring
* 📁 Support file uploads (not just URLs)

---

## 👨‍💻 Author

**Naresh Bhukya**

---

## ⭐ Notes

This project demonstrates:

* Backend architecture design
* Asynchronous processing
* REST API development
* Worker-based systems

---

## 📌 License

This project is for learning and assignment purposes.
