import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense

class PriorityPredictor:
    def __init__(self, model_path="saved_models/priority_network_v1.h5"):
        self.model_path = model_path
        self.model = None
        self._load_or_build()
        
    def _load_or_build(self):
        if os.path.exists(self.model_path):
            print(f"Loading PriorityPredictor from {self.model_path}")
            self.model = load_model(self.model_path, compile=False)
        else:
            print("Building new PriorityPredictor model")
            self._build_model()
            
    def _build_model(self):
        # Features: [dias_activo, horas_restantes_sla, prioridad_original, num_eventos, departamento_encoded, tipo_politica_encoded, num_archivos]
        self.model = Sequential([
            Dense(32, activation='relu', input_shape=(7,)),
            Dense(16, activation='relu'),
            Dense(5, activation='softmax') # Classes 0-4 mapping to Priorities 1-5
        ])
        self.model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        
    def train(self, X_train, y_train, epochs=30, batch_size=32):
        print("Training PriorityPredictor...")
        self.model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        history = self.model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, validation_split=0.2)
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        return history
        
    def predict(self, features):
        """
        Predict priority 1-5
        features: shape (1, 7)
        """
        if self.model is None:
            raise ValueError("Model not initialized")
            
        probs = self.model.predict(features)[0]
        priority_idx = np.argmax(probs) # 0 to 4
        
        return {
            "prioridad": int(priority_idx + 1), # Map to 1-5
            "probabilidades": [float(p) for p in probs]
        }
