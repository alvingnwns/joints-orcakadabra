from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="joints-orcakadabra API")


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")
