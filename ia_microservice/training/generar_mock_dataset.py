import pandas as pd
import numpy as np
import os

def generar_dataset_csv():
    print("Generando dataset sintético realista para entrenamiento...")
    num_records = 15000

    # 1. Departamento: 0:IT, 1:RRHH, 2:Legal, 3:Finanzas, 4:Operaciones
    departamentos = np.random.choice([0, 1, 2, 3, 4], size=num_records)
    
    # 2. Documentos entregados: Porcentaje entre 0.4 (40%) y 1.0 (100%)
    docs_completos = np.random.uniform(0.4, 1.0, size=num_records)
    
    # 3. Complejidad del trámite: 1 (Baja) a 5 (Alta)
    complejidad = np.random.randint(1, 6, size=num_records)

    # Lógica de Demora (Target Y):
    # - Mayor complejidad = más horas
    # - Menos documentos = más horas de demora (ida y vuelta)
    # - Legal (2) y Finanzas (3) suelen tardar un poco más por validaciones
    
    demora_base = complejidad * 8.0 # 8 horas base por punto de complejidad
    penalizacion_docs = (1.0 - docs_completos) * 48.0 # hasta 48 horas extra si faltan documentos
    
    # Penalización por departamento
    penalizacion_dept = np.zeros(num_records)
    penalizacion_dept[departamentos == 2] = 24.0 # Legal tarda +24 hrs
    penalizacion_dept[departamentos == 3] = 16.0 # Finanzas tarda +16 hrs

    # Ruido aleatorio normal (variaciones del mundo real)
    ruido = np.random.normal(5, 4, size=num_records)
    
    # Calcular demora final
    demora_horas = demora_base + penalizacion_docs + penalizacion_dept + ruido
    demora_horas = np.maximum(1.0, demora_horas) # Mínimo 1 hora de demora

    # Crear DataFrame
    df = pd.DataFrame({
        'departamento_id': departamentos,
        'porcentaje_documentos': docs_completos,
        'nivel_complejidad': complejidad,
        'demora_real_horas': demora_horas
    })

    # Guardar a CSV
    output_path = 'dataset_demoras.csv'
    df.to_csv(output_path, index=False)
    
    print(f"✅ ¡Éxito! Se han generado {num_records} registros en el archivo '{output_path}'.")
    print("Ya puedes subir este archivo a Google Colab.")

if __name__ == "__main__":
    # Asegurar que estamos en el directorio correcto o guardarlo ahí
    generar_dataset_csv()
