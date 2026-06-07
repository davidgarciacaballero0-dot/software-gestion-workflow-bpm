import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout

class DelayPredictor:
    def __init__(self, model_path="saved_models/lstm_delay_v1.h5"):
        self.model_path = model_path
        self.model = None
        self._load_or_build()
        
    def _load_or_build(self):
        if os.path.exists(self.model_path):
            print(f"Loading DelayPredictor from {self.model_path}")
            self.model = load_model(self.model_path, compile=False)
        else:
            print("Building new DelayPredictor model")
            self._build_model()
            
    def _build_model(self):
        # Input shape: (sequence_length, features)
        # Assuming sequence_length=10, features=3 [dias_en_nodo, tipo_evento_encoded, depto_encoded]
        self.model = Sequential([
            LSTM(64, activation='relu', return_sequences=True, input_shape=(10, 3)),
            Dropout(0.2),
            LSTM(32, activation='relu'),
            Dense(16, activation='relu'),
            Dense(1, activation='linear') # Regression output (horas)
        ])
        self.model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
    def train(self, X_train, y_train, epochs=50, batch_size=32):
        print("Training DelayPredictor...")
        self.model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        history = self.model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, validation_split=0.2)
        # Ensure dir exists
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        return history
        
    def predict(self, sequence):
        """
        Predict hours until delay based on a sequence of events.
        sequence should be shaped (1, sequence_length, features)
        """
        if self.model is None:
            raise ValueError("Model not initialized")
            
        prediction = self.model.predict(sequence)
        # Return estimated hours
        return float(prediction[0][0])
