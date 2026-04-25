import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("API KEY NOT FOUND")
    exit(1)

genai.configure(api_key=api_key)

for model_name in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-flash-lite"]:
    print(f"Testing {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hola")
        print(f"SUCCESS with {model_name}: {response.text[:20]}...")
    except Exception as e:
        print(f"ERROR with {model_name}: {str(e)}")
