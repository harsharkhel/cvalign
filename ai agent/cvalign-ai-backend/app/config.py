from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./cvalign_ai.db")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change_this_secret_key")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "your_google_client_id_here")
    upload_dir: str = os.getenv("UPLOAD_DIR", "app/uploads")
    max_upload_size_bytes: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", "10485760"))


settings = Settings()
