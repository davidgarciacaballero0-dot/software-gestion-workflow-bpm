import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Embedding, Conv1D, GlobalMaxPooling1D, Dense

class IntentClassifier:
    def __init__(self, model_path="saved_models/cnn_intent_v1.h5", vocab_size=5000, max_len=100, num_classes=10):
        self.model_path = model_path
        self.vocab_size = vocab_size
        self.max_len = max_len
        self.num_classes = num_classes
        self.model = None
        self._load_or_build()
        
    def _load_or_build(self):
        if os.path.exists(self.model_path):
            print(f"Loading IntentClassifier from {self.model_path}")
            self.model = load_model(self.model_path, compile=False)
        else:
            print("Building new IntentClassifier model")
            self._build_model()
            
    def _build_model(self):
        self.model = Sequential([
            Embedding(self.vocab_size, 128, input_length=self.max_len),
            Conv1D(128, 5, activation='relu'),
            GlobalMaxPooling1D(),
            Dense(64, activation='relu'),
            Dense(self.num_classes, activation='softmax')
        ])
        self.model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        
    def train(self, X_train, y_train, epochs=20, batch_size=32):
        print("Training IntentClassifier...")
        self.model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        history = self.model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, validation_split=0.2)
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        return history
        
    def predict(self, text_sequence):
        """
        Predicts policy intent class.
        text_sequence: padded numerical sequence of shape (1, max_len)
        """
        if self.model is None:
            raise ValueError("Model not initialized")
            
        probs = self.model.predict(text_sequence)[0]
        class_idx = np.argmax(probs)
        score = probs[class_idx]
        
        return {
            "class_idx": int(class_idx),
            "score": float(score)
        }
