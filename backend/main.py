from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, dreams, search, tags
from app.db.base import Base, engine
import os
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

app = FastAPI()

# Allow Vite dev server origins
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL"),
]

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(dreams.router, prefix="/dreams", tags=["dreams"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(tags.router, prefix="/tags", tags=["tags"])

@app.on_event("startup")
def on_startup():
    # Ensure DB tables exist
    Base.metadata.create_all(bind=engine)

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Welcome to DreamScope!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)