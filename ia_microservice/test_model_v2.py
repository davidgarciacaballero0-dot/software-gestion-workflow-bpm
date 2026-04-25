import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ API KEY NOT FOUND")
    exit(1)

genai.configure(api_key=api_key)

model_name = "gemini-2.5-flash"
print(f"Testing {model_name}...")
try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hola")
    print(f"✅ Success: {response.text[:20]}...")
except Exception as e:
    print(f"❌ Error with {model_name}: {str(e)}")

model_name = "gemini-1.5-flash"
print(f"Testing {model_name}...")
try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hola")
    print(f"✅ Success: {response.text[:20]}...")
except Exception as e:
    print(f"❌ Error with {model_name}: {str(e)}")
