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
    print("Listing available models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"❌ Error: {str(e)}")
