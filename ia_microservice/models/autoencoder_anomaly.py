import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense

class AnomalyDetector:
    def __init__(self, model_path="saved_models/autoencoder_v1.h5", threshold=0.1):
        self.model_path = model_path
        self.model = None
        self.threshold = threshold
        self._load_or_build()
        
    def _load_or_build(self):
        if os.path.exists(self.model_path):
            print(f"Loading AnomalyDetector from {self.model_path}")
            self.model = load_model(self.model_path)
        else:
            print("Building new AnomalyDetector model")
            self._build_model()
            
    def _build_model(self):
        # Features: [dias, eventos, deptos, ratio_sla, horas_prom, prioridad, archivos] (7 features)
        self.model = Sequential([
            Dense(32, activation='relu', input_shape=(7,)),
            Dense(8, activation='relu'), # bottleneck
            Dense(32, activation='relu'),
            Dense(7, activation='sigmoid') # output matches input shape, scaled 0-1
        ])
        self.model.compile(optimizer='adam', loss='mse')
        
    def train(self, X_train, epochs=50, batch_size=32):
        print("Training AnomalyDetector...")
        # Autoencoder trains to predict its input
        history = self.model.fit(X_train, X_train, epochs=epochs, batch_size=batch_size, validation_split=0.2)
        
        # Calculate dynamic threshold based on 95th percentile of training error
        reconstructions = self.model.predict(X_train)
        mse = np.mean(np.power(X_train - reconstructions, 2), axis=1)
        self.threshold = np.percentile(mse, 95)
        print(f"Set dynamic threshold to {self.threshold}")
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        return history
        
    def predict(self, features):
        """
        Calculates reconstruction error to determine if anomalous.
        features: numpy array of shape (1, 7)
        """
        if self.model is None:
            raise ValueError("Model not initialized")
            
        reconstruction = self.model.predict(features)
        mse = np.mean(np.power(features - reconstruction, 2), axis=1)[0]
        
        is_anomalous = bool(mse > self.threshold)
        
        return {
            "es_anomalo": is_anomalous,
            "reconstruction_error": float(mse),
            "umbral": float(self.threshold)
        }
