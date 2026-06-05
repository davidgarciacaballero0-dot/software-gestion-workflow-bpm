import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from PIL import Image

class DocumentClassifier:
    def __init__(self, model_path="saved_models/doc_classifier_v1.h5", num_classes=5):
        self.model_path = model_path
        self.num_classes = num_classes
        self.model = None
        self.class_names = ["CI", "FACTURA", "CONTRATO", "CERTIFICADO", "OTRO"]
        self._load_or_build()
        
    def _load_or_build(self):
        if os.path.exists(self.model_path):
            print(f"Loading DocumentClassifier from {self.model_path}")
            self.model = load_model(self.model_path)
        else:
            print("Building new DocumentClassifier model")
            self._build_model()
            
    def _build_model(self):
        base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
        # Freeze base model
        base_model.trainable = False
        
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(128, activation='relu')(x)
        predictions = Dense(self.num_classes, activation='softmax')(x)
        
        self.model = Model(inputs=base_model.input, outputs=predictions)
        self.model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        
    def train(self, train_dataset, val_dataset, epochs=10):
        print("Training DocumentClassifier...")
        history = self.model.fit(train_dataset, validation_data=val_dataset, epochs=epochs)
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        return history
        
    def predict(self, image_path):
        """
        Predict document class from image file
        """
        if self.model is None:
            raise ValueError("Model not initialized")
            
        try:
            img = Image.open(image_path).resize((224, 224))
            img_array = np.array(img)
            # Handle grayscale or RGBA
            if len(img_array.shape) == 2:
                img_array = np.stack((img_array,)*3, axis=-1)
            elif img_array.shape[2] == 4:
                img_array = img_array[:,:,:3]
                
            # Normalize
            img_array = img_array / 255.0
            img_batch = np.expand_dims(img_array, axis=0)
            
            probs = self.model.predict(img_batch)[0]
            class_idx = np.argmax(probs)
            
            return {
                "tipo": self.class_names[class_idx],
                "score": float(probs[class_idx])
            }
        except Exception as e:
            print(f"Error classifying document: {e}")
            return {"tipo": "ERROR", "score": 0.0}
