import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ API KEY NOT FOUND")
    exit(1)

genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Hola, dime 'OK' si recibes esto.")
    print(f"✅ Gemini Response: {response.text}")
except Exception as e:
    print(f"❌ Gemini Error: {str(e)}")
