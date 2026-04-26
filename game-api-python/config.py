from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgres://postgres:password@localhost:5432/gameservers"
    redis_url: str = "redis://localhost:6379"
    port: int = 5000
    debug: bool = False

    model_config = {"env_file": ".env"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
