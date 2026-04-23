import os
import uvicorn

def main():
    """Run the FastAPI application.
    The OpenEnv validator expects a callable named ``main`` that starts the server.
    It launches ``app.main:app`` (the FastAPI instance defined in ``app/main.py``).
    """
    # Port is configurable via the ``PORT`` environment variable (default 7860 for HF Spaces)
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, log_level="info")

if __name__ == "__main__":
    main()
