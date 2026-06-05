import os
import numpy as np
import tensorflow as tf

from models.lstm_delay_predictor import DelayPredictor
from models.autoencoder_anomaly import AnomalyDetector
from models.intent_classifier import IntentClassifier
from models.priority_network import PriorityPredictor
from models.document_classifier import DocumentClassifier

def generate_synthetic_data():
    print("=========================================")
    print("1/5 Entrenando LSTM Predictor de Demoras")
    print("=========================================")
    lstm = DelayPredictor()
    # (samples, sequence_length, features) -> 10, 3
    X_lstm = np.random.rand(100, 10, 3)
    y_lstm = np.random.rand(100, 1) * 72.0 # up to 72 hours
    lstm.train(X_lstm, y_lstm, epochs=5)

    print("\n=========================================")
    print("2/5 Entrenando Autoencoder (Anomalías)")
    print("=========================================")
    autoenc = AnomalyDetector()
    # (samples, 7 features)
    X_auto = np.random.rand(200, 7)
    autoenc.train(X_auto, epochs=5)

    print("\n=========================================")
    print("3/5 Entrenando CNN Clasificador de Intención")
    print("=========================================")
    intent = IntentClassifier()
    # (samples, max_len) -> 100
    X_intent = np.random.randint(0, 5000, size=(150, 100))
    y_intent = np.random.randint(0, 10, size=(150, 1))
    intent.train(X_intent, y_intent, epochs=5)

    print("\n=========================================")
    print("4/5 Entrenando Red de Prioridad")
    print("=========================================")
    priority = PriorityPredictor()
    # (samples, 7)
    X_prio = np.random.rand(200, 7)
    y_prio = np.random.randint(0, 5, size=(200, 1))
    priority.train(X_prio, y_prio, epochs=5)

    print("\n=========================================")
    print("5/5 Entrenando CNN Visión (Clasificador Doc)")
    print("=========================================")
    doc = DocumentClassifier()
    # Images: (samples, 224, 224, 3), Labels: (samples, 1)
    # Use very small batch for synthetic to avoid memory issues
    X_doc = np.random.rand(32, 224, 224, 3).astype('float32')
    y_doc = np.random.randint(0, 5, size=(32,)).astype('int32')
    
    train_dataset = tf.data.Dataset.from_tensor_slices((X_doc, y_doc)).batch(8)
    val_dataset = tf.data.Dataset.from_tensor_slices((X_doc[:8], y_doc[:8])).batch(8)
    
    doc.train(train_dataset, val_dataset, epochs=2)

    print("\n¡Entrenamiento Sintético Completado!")
    print("Se han generado todos los archivos .h5 en la carpeta 'saved_models'.")

if __name__ == "__main__":
    generate_synthetic_data()
