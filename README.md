# ChatGPT Clone

This project aims to create a basic clone of ChatGPT with a FastAPI backend and a React frontend.

## Project Structure

- `backend/`: Contains the FastAPI application.
  - `backend/api/main.py`: Main FastAPI application file.
  - `backend/requirements.txt`: Python dependencies for the backend.
- `frontend/`: Contains the React application.
  - `frontend/src/App.js`: Main React component.
  - `frontend/src/index.js`: Entry point for the React application.
  - `frontend/package.json`: Node.js dependencies for the frontend.

## Setup and Running the Project

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI application:
   ```bash
   uvicorn api.main:app --reload
   ```
   The backend server will be running at `http://127.0.0.1:8000`.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run the React application:
   ```bash
   npm start
   ```
   The frontend development server will be running at `http://localhost:3000`.

