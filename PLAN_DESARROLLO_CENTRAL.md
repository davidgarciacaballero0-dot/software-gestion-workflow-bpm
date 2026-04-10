# PLAN DESARROLLO CENTRAL Y CASOS DE USO (PUDS)

## 📦 LISTA 1: Casos de Uso Organizados por Paquetes (Con Actores)

### Paquete 1: Gestión de Identidad y Jerarquía (Multitenant)
- **CU-01:** Gestionar Organización y Departamentos (Actor: Diseñador / Administrador de Políticas)
- **CU-02:** Gestionar Usuarios y Roles (Actor: Diseñador / Administrador de Políticas)
- **CU-03:** Autenticar Usuario (Actores: Diseñador / Administrador de Políticas, Funcionario / Usuario Final)

### Paquete 2: Diseño de Políticas (El Motor Core)
- **CU-04:** Gestionar Políticas de Negocio (Actor: Diseñador / Administrador de Políticas)
- **CU-05:** Diseñar Flujo de Trabajo Interactivo (Actor: Diseñador / Administrador de Políticas)
- **CU-06:** Construir Formulario Dinámico (Actor: Diseñador / Administrador de Políticas)

### Paquete 3: Ejecución y Bandejas de Entrada
- **CU-07:** Iniciar Nuevo Trámite (Actor: Funcionario / Usuario Final)
- **CU-08:** Visualizar Bandeja Departamental (Actor: Funcionario / Usuario Final)
- **CU-09:** Atender y Avanzar Trámite (Actor: Funcionario / Usuario Final)
- **CU-10:** Consultar Historial y Trazabilidad (Actores: Funcionario / Usuario Final, Diseñador / Administrador de Políticas)

### Paquete 4: Módulos Satélite (Soporte)
- **CU-11:** Subir y Descargar Archivos Adjuntos (Actores: Funcionario / Usuario Final, Diseñador / Administrador de Políticas)
- **CU-12:** Recibir Notificaciones Push y WebSockets (Actor: Funcionario / Usuario Final)
- **CU-13:** Consultar Auditoría del Sistema (Actor: Diseñador / Administrador de Políticas)

### Paquete 5: Módulo de Inteligencia Artificial (Innovación)
- **CU-14:** Generar Flujo mediante Lenguaje Natural (Actor Principal: Diseñador / Administrador de Políticas | Actor Secundario: Agente IA)
- **CU-15:** Visualizar Dashboard de Insights IA / Generar Alertas (Actor Principal: Diseñador / Administrador de Políticas | Actor Secundario: Agente IA)
- **CU-16:** Interactuar con Asistente de Voz (Actor Principal: Funcionario / Usuario Final | Actor Secundario: Agente IA)

---

## 🔄 LISTA 2: Casos de Uso Organizados por Ciclo PUDS (Plan de Entregas)

### Ciclo 1: Cimientos y Seguridad (Fase de Inicio/Elaboración)
- **CU-01:** Gestionar Organización y Departamentos
- **CU-02:** Gestionar Usuarios y Roles
- **CU-03:** Autenticar Usuario
- **CU-13:** Consultar Auditoría del Sistema

### Ciclo 2: Construcción del Motor Core y Builders (Fase de Elaboración/Construcción)
- **CU-04:** Gestionar Políticas de Negocio
- **CU-05:** Diseñar Flujo de Trabajo Interactivo
- **CU-06:** Construir Formulario Dinámico

### Ciclo 3: Operación, Trámites y Tiempo Real (Fase de Construcción)
- **CU-07:** Iniciar Nuevo Trámite
- **CU-08:** Visualizar Bandeja Departamental
- **CU-09:** Atender y Avanzar Trámite
- **CU-10:** Consultar Historial y Trazabilidad
- **CU-11:** Subir y Descargar Archivos Adjuntos
- **CU-12:** Recibir Notificaciones Push y WebSockets

### Ciclo 4: Inteligencia Artificial y Optimización (Fase de Transición)
- **CU-14:** Generar Flujo mediante Lenguaje Natural
- **CU-15:** Visualizar Dashboard de Insights IA
- **CU-16:** Interactuar con Asistente de Voz
