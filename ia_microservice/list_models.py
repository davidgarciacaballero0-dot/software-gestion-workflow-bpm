import google.genai as genai

client = genai.Client(
    vertexai=True,
    project="workflow-smart-ia-798ae",
    location="us-central1"
)

print("=== Modelos disponibles en Vertex AI ===")
for m in client.models.list():
    name = m.name
    if name and "gemini" in name.lower():
        print(f"  {name}")
