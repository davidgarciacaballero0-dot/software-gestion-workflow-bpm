from fastapi import FastAPI

app = FastAPI(title="Microservicio IA - BPM", version="1.0.0")

@app.get("/")
def read_root():
    return {"message": "Microservicio IA Activo"}
