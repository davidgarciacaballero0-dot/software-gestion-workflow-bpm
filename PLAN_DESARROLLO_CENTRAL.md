# PLAN DESARROLLO CENTRAL Y CASOS DE USO (PUDS)

## 📦 LISTA 1 ACTUALIZADA: Casos de Uso Organizados por Paquetes (Con Actores)

### Paquete 1: Gestión de Identidad y Jerarquía (Multitenant)
- **CU-01:** Gestionar Organización y Departamentos (Actor: Diseñador / Administrador)
- **CU-02:** Gestionar Usuarios, Roles y Transferencias de Área (Actor: Diseñador / Administrador)
- **CU-03:** Autenticar Usuario (Actores: Administrador, Funcionario)
- **CU-17 [NUEVO]:** Gestionar Jerarquía de Privilegios y Jefaturas (Actor: Diseñador / Administrador)
**CU-22 [NUEVO]:** Exportación de Reportes y Sábanas de Datos. 
### Paquete 2: Diseño de Políticas (El Motor Core)
- **CU-04:** Gestionar Políticas de Negocio Básicas (Actor: Diseñador / Administrador)
- **CU-05:** Diseñar Flujo de Trabajo Interactivo (Lineal, Paralelo, Condicional) (Actor: Diseñador / Administrador)
- **CU-06:** Construir Formulario Dinámico y Gestionar Requisitos Documentales (Actor: Diseñador / Administrador)
- **CU-18 [NUEVO]:** Gestionar Ciclo de Vida y Versionado de Políticas (Actor: Diseñador / Administrador)
- **CU-19 [NUEVO]:** Configurar SLAs y Tiempos de Alerta (Actor: Diseñador / Administrador)

### Paquete 3: Ejecución, Bandejas y Supervisión (Operación Diaria)
- **CU-07:** Iniciar Nuevo Trámite (Actor: Funcionario / Usuario Final)
- **CU-08:** Visualizar Bandeja Personal y Departamental (Actor: Funcionario / Usuario Final)
- **CU-09:** Atender y Avanzar Trámite (Actor: Funcionario / Usuario Final)
- **CU-10:** Consultar Historial y Trazabilidad (Actores: Funcionario, Administrador)
- **CU-20 [NUEVO]:** Supervisión de Bandeja por Jefatura (Actor: Jefe de Departamento / Administrador)
- **CU-21 [NUEVO]:** Intervención y Reasignación Administrativa (Actor: Jefe de Departamento / Administrador)

### Paquete 4: Módulos Satélite (Soporte e Infraestructura)
- **CU-11:** Subir y Descargar Archivos Adjuntos (Actores: Funcionario, Administrador)
- **CU-12:** Recibir Notificaciones Push y WebSockets (Actor: Funcionario / Usuario Final)
- **CU-13:** Consultar Auditoría del Sistema (Actor: Diseñador / Administrador)

### Paquete 5: Módulo de Inteligencia Artificial (Innovación con FastAPI)
- **CU-14:** Generar Flujo mediante Lenguaje Natural (Actores: Diseñador / Administrador, Agente IA)
- **CU-15:** Visualizar Dashboard de Insights IA y Cuellos de Botella (Actores: Diseñador / Administrador, Agente IA)
- **CU-16:** Interactuar con Asistente de Voz (Actores: Funcionario / Usuario Final, Agente IA)

---

## 🔄 LISTA 2 ACTUALIZADA: Casos de Uso Organizados por Ciclo PUDS (Plan de Entregas)

### 🚧 CICLO 1: Cimientos y Seguridad (Fase de Inicio/Elaboración)
- **CU-01:** Gestionar Organización y Departamentos (Diseñador / Administrador)
- **CU-02:** Gestionar Usuarios, Roles y Transferencias de Área (Diseñador / Administrador)
- **CU-03:** Autenticar Usuario (Administrador, Funcionario)
- **CU-13:** Consultar Auditoría del Sistema (Diseñador / Administrador)
- **CU-17 [NUEVO]:** Gestionar Jerarquía de Privilegios y Jefaturas (Diseñador / Administrador)

### 🚧 CICLO 2: Construcción del Motor Core y Builders (Fase de Elaboración/Construcción)
- **CU-04:** Gestionar Políticas de Negocio Básicas (Diseñador / Administrador)
- **CU-05:** Diseñar Flujo de Trabajo Interactivo (Diseñador / Administrador)
- **CU-18 [NUEVO]:** Gestionar Ciclo de Vida y Versionado de Políticas (Diseñador / Administrador)
- **CU-19 [NUEVO]:** Configurar SLAs y Tiempos de Alerta (Diseñador / Administrador)
- **CU-06:** Construir Formulario Dinámico y Gestionar Requisitos Documentales (Diseñador / Administrador)

### 🚧 CICLO 3: Operación, Trámites y Tiempo Real (Fase de Construcción)
- **CU-07:** Iniciar Nuevo Trámite (Funcionario / Usuario Final)
- **CU-08:** Visualizar Bandeja Personal y Departamental (Funcionario / Usuario Final)
- **CU-09:** Atender y Avanzar Trámite (Funcionario / Usuario Final)
- **CU-10:** Consultar Historial y Trazabilidad (Funcionario, Administrador)
- **CU-11:** Subir y Descargar Archivos Adjuntos (Funcionario, Administrador)
- **CU-12:** Recibir Notificaciones Push y WebSockets (Funcionario / Usuario Final)
- **CU-20 [NUEVO]:** Supervisión de Bandeja por Jefatura (Jefe de Departamento / Administrador)
- **CU-21 [NUEVO]:** Intervención y Reasignación Administrativa (Jefe de Departamento / Administrador)

### 🚧 CICLO 4: Inteligencia Artificial y Optimización (Fase de Transición)
- **CU-14:** Generar Flujo mediante Lenguaje Natural (Diseñador/Administrador, Agente IA)
- **CU-15:** Visualizar Dashboard de Insights IA (Diseñador / Administrador, Agente IA)
- **CU-16:** Interactuar con Asistente de Voz (Funcionario / Usuario Final, Agente IA)
