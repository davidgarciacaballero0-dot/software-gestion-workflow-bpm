import os
from pymongo import MongoClient

def get_db():
    client = MongoClient("mongodb://localhost:27017/") # Adjust according to connection string
    db = client["bpm_database"]
    return db

def export_lstm_data():
    print("Exporting data for LSTM...")
    # Add real logic to dump historical sequences later
    pass

def export_autoencoder_data():
    print("Exporting data for Autoencoder...")
    # Add logic here
    pass

def export_all():
    print("Exporting all training data from MongoDB...")
    export_lstm_data()
    export_autoencoder_data()
    print("Done exporting.")

if __name__ == "__main__":
    export_all()
