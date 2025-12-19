from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file in project root
# Try Docker path first: /app/api/main.py -> /app/.env
# Fallback to local dev path: backend/api/main.py -> .env
env_path = Path(__file__).parent.parent / '.env'
if not env_path.exists():
    env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Also try loading from current directory as fallback
load_dotenv()

app = FastAPI()

# In-memory storage for chat history
chat_history = []

# Initialize OpenAI client for MCP API
ai_builder_token = os.getenv("AI_BUILDER_TOKEN")
if ai_builder_token:
    ai_builder_token = ai_builder_token.strip()  # Remove any whitespace
if not ai_builder_token:
    print("WARNING: AI_BUILDER_TOKEN not found in environment variables!")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Looking for .env at: {env_path}")
    print(f".env file exists: {env_path.exists()}")
else:
    print(f"AI_BUILDER_TOKEN loaded successfully (length: {len(ai_builder_token)})")
    print(f"Token starts with: {ai_builder_token[:10]}...")

# Only create client if token exists
mcp_client = None
if ai_builder_token:
    mcp_client = OpenAI(
        base_url="https://space.ai-builders.com/backend/v1",
        api_key=ai_builder_token
    )

# Add CORS middleware (for development)
origins = [
    "http://localhost:3000",  # React app's address
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    message: str
    model: str = "deepseek"  # Default model

@app.get("/")
async def root():
    # In production, serve React app; in development, return API message
    # Try Docker path first: /app/api/main.py -> /app/frontend/build
    static_dir = Path(__file__).parent.parent / "frontend" / "build"
    # Fallback to local dev path: backend/api/main.py -> frontend/build
    if not static_dir.exists():
        static_dir = Path(__file__).parent.parent.parent / "frontend" / "build"
    if static_dir.exists() and (static_dir / "index.html").exists():
        return FileResponse(static_dir / "index.html")
    return {"message": "Welcome to the ChatGPT Clone Backend!"}

@app.get("/debug/token")
async def debug_token():
    """Debug endpoint to check if token is loaded (first 10 chars only for security)"""
    token = os.getenv("AI_BUILDER_TOKEN")
    if token:
        return {
            "token_loaded": True,
            "token_length": len(token),
            "token_preview": token[:10] + "..." if len(token) > 10 else token,
            "env_path": str(env_path),
            "env_exists": env_path.exists()
        }
    else:
        return {
            "token_loaded": False,
            "env_path": str(env_path),
            "env_exists": env_path.exists(),
            "cwd": os.getcwd()
        }

@app.post("/chat")
async def chat(message: Message):
    chat_history.append({"role": "user", "content": message.message})
    
    if not ai_builder_token or not mcp_client:
        error_msg = "AI_BUILDER_TOKEN is not configured. Please check your .env file."
        chat_history.append({"role": "assistant", "content": error_msg})
        return {"response": error_msg}
    
    try:
        completion = mcp_client.chat.completions.create(
            model=message.model,
            messages=chat_history
        )
        ai_response = completion.choices[0].message.content
    except Exception as e:
        error_msg = f"Error communicating with AI: {e}"
        # Log the full error for debugging
        print(f"API Error: {e}")
        print(f"Error type: {type(e)}")
        print(f"Token being used: {ai_builder_token[:10]}... (length: {len(ai_builder_token)})")
        if hasattr(e, 'response'):
            print(f"Response: {e.response}")
        if hasattr(e, 'status_code'):
            print(f"Status code: {e.status_code}")
        if hasattr(e, 'body'):
            print(f"Body: {e.body}")
        # Check if it's an authentication error
        if '401' in str(e) or 'Invalid credentials' in str(e):
            print("AUTHENTICATION ERROR: The AI_BUILDER_TOKEN appears to be invalid or expired.")
            print("Please verify your token is correct and has not expired.")
        ai_response = error_msg

    chat_history.append({"role": "assistant", "content": ai_response})
    return {"response": ai_response}

@app.get("/history")
async def get_history():
    # Convert chat_history to a format suitable for the frontend if necessary
    # For now, let's assume the frontend can handle the "role" and "content" keys
    return {"history": chat_history}

@app.post("/clear_history")
async def clear_history():
    chat_history.clear()
    return {"message": "Chat history cleared."}

# Serve static files from React build (for production) - must be last
# Try Docker path first: /app/api/main.py -> /app/frontend/build
# Fallback to local dev path: backend/api/main.py -> frontend/build
static_dir = Path(__file__).parent.parent / "frontend" / "build"
if not static_dir.exists():
    static_dir = Path(__file__).parent.parent.parent / "frontend" / "build"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir / "static")), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React app for all non-API routes"""
        # Skip API routes
        if full_path in ["chat", "history", "clear_history", "debug/token"] or full_path.startswith("api/"):
            return {"error": "Not found"}
        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Serve index.html for client-side routing
        return FileResponse(static_dir / "index.html")

