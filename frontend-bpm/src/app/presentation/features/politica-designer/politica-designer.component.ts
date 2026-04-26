import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { PoliticaWorkflow, WorkflowNode, WorkflowEdge, NodeType, PolicyStatus } from '../../../data/models/politica-workflow.model';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { DepartamentoService } from '../../../data/services/departamento.service';
import { AuthService } from '../../../data/services/auth.service';
import { NotificationService } from '../../../data/services/notification.service';
import { Departamento } from '../../../data/models/departamento.model';

@Component({
  selector: 'app-politica-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './politica-designer.component.html',
  styleUrls: ['./politica-designer.component.css']
})
export class PoliticaDesignerComponent implements OnInit {
  nodes: WorkflowNode[] = [];
  edges: WorkflowEdge[] = [];
  departamentos: Departamento[] = [];

  // Configuración de Carriles (Swimlanes) Dinámicos
  activeLanes: any[] = [
    { id: 'lane_0', departamentoId: '' },
    { id: 'lane_1', departamentoId: '' },
    { id: 'lane_2', departamentoId: '' }
  ];

  addLane(): void {
    if (this.activeLanes.length < this.departamentos.length || this.activeLanes.length < 10) {
      this.activeLanes.push({ id: `lane_${this.activeLanes.length}`, departamentoId: '' });
      this.cd.detectChanges();
    }
  }

  removeLane(): void {
    if (this.activeLanes.length > 1) {
      this.activeLanes.pop();
      this.cd.detectChanges();
    }
  }

  selectedNode: WorkflowNode | null = null;
  selectedEdge: string | null = null;
  connectingSourceNode: WorkflowNode | null = null;

  // CU-14: IA Generativa
  aiPrompt: string = '';
  generatingIA: boolean = false;
  isLoaded: boolean = false; // Flag to force DOM recreation
  draggingPositions: Record<string, { x: number, y: number }> = {};
  
  // Soporte de Voz
  isListening: boolean = false;
  private recognition: any;

  // CU-18 State
  currentPolicy: PoliticaWorkflow = {
    idOrganizacion: '',
    nombre: 'Nueva Política de Crédito',
    version: '1.0',
    status: PolicyStatus.DRAFT,
    nodes: [],
    edges: []
  };
  
  isAdmin = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workflowService = inject(PoliticaWorkflowService);
  private depService = inject(DepartamentoService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private cd = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  constructor() {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.isAdmin = user?.nombreRol === 'ADMIN';
    const orgId = user?.idOrganizacion || '';
    this.currentPolicy.idOrganizacion = orgId;

    // CAPTURAR ID DESDE LA URL (REQ-18 Fix)
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.loadPolicy(id);
    } else {
      this.isLoaded = true; // Si es nuevo, mostrar lienzo de inmediato
    }

    // Cargar departamentos para las USER_TASKS
    this.depService.listarPorOrganizacion(orgId).subscribe({
      next: (data: Departamento[]) => {
        this.departamentos = data;
      },
      error: (err: any) => console.error(err)
    });

    // REQ-10: Suscripción a colaboración en tiempo real
    this.notificationService.subscribeToTopic('/topic/designer', (event: any) => {
      if (event.senderId === this.authService.getToken()) return; // Ignorar mis propios mensajes
      
      console.log('Sync Event Received:', event);
      this.handleSyncEvent(event);
    });

    this.initVoiceRecognition();
  }

  private initVoiceRecognition(): void {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.zone.run(() => {
          this.aiPrompt = transcript;
          this.isListening = false;
        });
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech Recognition Error', event);
        this.zone.run(() => this.isListening = false);
      };

      this.recognition.onend = () => {
        this.zone.run(() => this.isListening = false);
      };
    }
  }

  toggleVoiceInput(): void {
    if (!this.recognition) {
      alert('El reconocimiento de voz no está soportado en este navegador.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.isListening = true;
      this.recognition.start();
    }
  }

  private loadPolicy(id: string): void {
    this.workflowService.obtenerPorId(id).subscribe({
      next: (policy: PoliticaWorkflow) => {
        this.zone.run(() => {
          this.currentPolicy = policy;
          
          // Asegurar que cada nodo tenga un objeto uiPosition válido
          const rawNodes = policy.nodes || [];
          rawNodes.forEach(n => {
            if (!n.uiPosition) n.uiPosition = { x: 100, y: 100 };
          });

          this.nodes = JSON.parse(JSON.stringify(rawNodes));
          this.edges = JSON.parse(JSON.stringify(policy.edges || []));
          
          // Forzar redistribución si hay solapamiento (en cualquier parte del lienzo)
          this.reorganizeNodesIfCrowded();

          console.log('Política cargada:', id, 'Nodos:', this.nodes.length);
          
          // Mostrar lienzo
          this.isLoaded = true;
        });
      },
      error: (err: any) => {
        this.notificationService.notify('Error al cargar la política', 'ERROR');
        console.error(err);
      }
    });
  }

  private handleSyncEvent(event: any): void {
    const payload = event.payload;
    if (event.eventType === 'NODE_MOVED') {
      const node = this.nodes.find(n => n.id === payload.id);
      if (node) {
        node.uiPosition = payload.uiPosition;
      }
    } else if (event.eventType === 'NODE_ADDED') {
      if (!this.nodes.find(n => n.id === payload.id)) {
        this.nodes.push(payload);
      }
    } else if (event.eventType === 'NODE_REMOVED') {
      this.nodes = this.nodes.filter(n => n.id !== payload.id);
      this.edges = this.edges.filter(e => e.sourceNodeId !== payload.id && e.targetNodeId !== payload.id);
    } else if (event.eventType === 'FULL_STATE_UPDATE') {
      this.nodes = payload.nodes;
      this.edges = payload.edges;
      this.autoAsignarDepartamentos();
    }
    // Podríamos agregar más eventos como conexiones agregadas, etc.
  }

  private broadcastChange(type: string, payload: any): void {
    this.notificationService.sendMessage('/app/designer/sync', {
      idPolitica: this.currentPolicy.id || 'new',
      eventType: type,
      senderId: this.authService.getToken(),
      payload: payload
    });
  }

  addNode(type: string): void {
    if (!this.canEdit()) return;

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: type as NodeType,
      name: `Nuevo ${type}`,
      uiPosition: { x: 50, y: 50 },
      formDefinition: []
    };
    this.nodes.push(newNode);
    this.selectedNode = newNode;
    this.broadcastChange('NODE_ADDED', newNode);
  }

  onNodeDragStarted(node: WorkflowNode): void {
    if (!this.canEdit()) return;
    this.draggingPositions[node.id] = { ...node.uiPosition };
  }

  onNodeDragMoved(event: any, node: WorkflowNode): void {
    if (!this.canEdit()) return;
    
    const pos = event.source.getFreeDragPosition();
    this.draggingPositions[node.id] = { x: pos.x, y: pos.y };
    
    this.cd.detectChanges();
  }

  onNodeMoved(event: CdkDragEnd, node: WorkflowNode): void {
    if (!this.canEdit()) return;
    
    const pos = event.source.getFreeDragPosition();
    node.uiPosition = { x: pos.x, y: pos.y };
    
    delete this.draggingPositions[node.id];
    
    // Auto-Asignación basada en la coordenada X (Carril)
    const laneWidth = 400; 
    const laneIndex = Math.floor(node.uiPosition.x / laneWidth);
    const safeIndex = Math.max(0, Math.min(this.activeLanes.length - 1, laneIndex));
    
    const targetLane = this.activeLanes[safeIndex];
    if (node.type === NodeType.USER_TASK && targetLane) {
      // Si el carril tiene un departamento, lo asignamos. 
      // Si el carril está vacío, mantenemos el actual o limpiamos? El usuario dice "No se actualiza", 
      // probablemente espera que si la calle tiene depto, se asigne.
      if (targetLane.departamentoId) {
        node.departmentId = targetLane.departamentoId;
        console.log(`Nodo auto-asignado: ${node.name} -> Lane ${safeIndex} (${targetLane.departamentoId})`);
      }
    }

    // Importante: Si este es el nodo seleccionado, forzamos que el panel de propiedades se entere
    if (this.selectedNode && this.selectedNode.id === node.id) {
      this.selectedNode = { ...node }; // Trigger change detection for property panel
    }

    this.broadcastChange('NODE_MOVED', node);
    this.cd.detectChanges();
  }

  getDepartmentName(id: string | undefined): string {
    if (!id) return '';
    const d = this.departamentos.find(dept => dept.id === id);
    return d ? d.nombre : '';
  }

  selectNode(node: WorkflowNode): void {
    this.selectedNode = node;
  }

  canEdit(): boolean {
    return this.isAdmin && this.currentPolicy.status === PolicyStatus.DRAFT;
  }

  removeNode(node: WorkflowNode): void {
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    this.edges = this.edges.filter(e => e.sourceNodeId !== node.id && e.targetNodeId !== node.id);
    this.selectedNode = null;
    this.broadcastChange('NODE_REMOVED', node);
  }

  // --- Lógica del Form Builder (CU-06) ---
  
  addField(): void {
    if (!this.selectedNode) return;
    if (!this.selectedNode.formDefinition) {
      this.selectedNode.formDefinition = [];
    }
    
    this.selectedNode.formDefinition.push({
      fieldId: `f_${Date.now()}`,
      label: 'Nuevo Campo',
      type: 'TEXT' as any,
      required: false
    });
  }

  removeField(index: number): void {
    if (this.selectedNode?.formDefinition) {
      this.selectedNode.formDefinition.splice(index, 1);
    }
  }

  private reorganizeNodesIfCrowded(): void {
    if (this.nodes.length < 2) return;

    let isCrowded = false;
    // Verificar si algún par de nodos choca en un área de 200x150
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = Math.abs(this.nodes[i].uiPosition.x - this.nodes[j].uiPosition.x);
        const dy = Math.abs(this.nodes[i].uiPosition.y - this.nodes[j].uiPosition.y);
        
        // Cajas de colisión amplias (200px ancho x 160px alto)
        if (dx < 200 && dy < 160) {
          isCrowded = true;
          break;
        }
      }
      if (isCrowded) break;
    }
    
    if (isCrowded) {
      console.log('Detectado amontonamiento de nodos. Auto-distribuyendo...');
      this.nodes.forEach((node, index) => {
        // Asignar una posición en cascada vertical limpia
        node.uiPosition = { 
          x: 200, 
          y: 60 + (index * 220) // 220px de espacio vertical
        };
      });
    }
  }



  // --- Operaciones de Edición Básicas ---
  
  getNodeIcon(type: NodeType): string {
    switch (type) {
      case NodeType.START: return '▶';
      case NodeType.USER_TASK: return '👤';
      case NodeType.EXCLUSIVE_GATEWAY: return '◆';
      case NodeType.END: return '■';
      default: return '●';
    }
  }

  /**
   * Calcula el punto exacto de conexión según el tipo y forma del nodo
   * Sincronizado con las medidas exactas de politica-designer.component.css
   */
  getConnectionPoint(nodeId: string, side: 'left' | 'right'): { x: number, y: number } {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    // PRIORIDAD: Si el nodo se está arrastrando, usamos la posición temporal
    const pos = this.draggingPositions[nodeId] || node.uiPosition;

    let width = 180;
    let height = 100; // Altura estándar para tareas y gateways

    // Ajustar dimensiones según el estándar visual definido en CSS (.node-item.START, .node-item.END)
    if (node.type === NodeType.START || node.type === NodeType.END) {
      width = 75;  // Sincronizado con CSS línea 220
      height = 75; // Sincronizado con CSS línea 221
    } else if (node.type === NodeType.EXCLUSIVE_GATEWAY) {
      width = 180;
      height = 100; // Sincronizado con CSS línea 271 (min-height)
    }

    const x = side === 'left' ? pos.x : pos.x + width;
    const y = pos.y + (height / 2);

    return { x, y };
  }

  // Lógica de dibujo de conexiones (Curvas Bezier Suaves con detección de dirección)
  calculatePath(edge: WorkflowEdge): string {
    const sourceNode = this.nodes.find(n => n.id === edge.sourceNodeId);
    const targetNode = this.nodes.find(n => n.id === edge.targetNodeId);
    if (!sourceNode || !targetNode) return '';

    const sPos = this.draggingPositions[sourceNode.id] || sourceNode.uiPosition;
    const tPos = this.draggingPositions[targetNode.id] || targetNode.uiPosition;

    // Decidir dinámicamente si conectar derecha->izquierda o viceversa para evitar bucles feos
    const sourceIsLeft = sPos.x < tPos.x;
    const sourceSide = sourceIsLeft ? 'right' : 'left';
    const targetSide = sourceIsLeft ? 'left' : 'right';

    const source = this.getConnectionPoint(edge.sourceNodeId, sourceSide);
    const target = this.getConnectionPoint(edge.targetNodeId, targetSide);

    if (!source || !target) return '';

    // Ajuste de suavizado según la distancia horizontal
    const deltaX = Math.abs(target.x - source.x);
    const curveIntensity = Math.min(deltaX / 2, 100); 

    const cp1x = sourceIsLeft ? source.x + curveIntensity : source.x - curveIntensity;
    const cp2x = sourceIsLeft ? target.x - curveIntensity : target.x + curveIntensity;

    return `M ${source.x} ${source.y} C ${cp1x} ${source.y}, ${cp2x} ${target.y}, ${target.x} ${target.y}`;
  }

  getEdgeLabelPosition(edge: WorkflowEdge): { x: number, y: number } {
    const sourceNode = this.nodes.find(n => n.id === edge.sourceNodeId);
    const targetNode = this.nodes.find(n => n.id === edge.targetNodeId);
    if (!sourceNode || !targetNode) return { x: 0, y: 0 };

    // Usar posiciones en tiempo real si se están arrastrando
    const sPos = this.draggingPositions[sourceNode.id] || sourceNode.uiPosition;
    const tPos = this.draggingPositions[targetNode.id] || targetNode.uiPosition;

    // Calcular el centro de la curva Bezier (aproximado al punto medio)
    const startX = sPos.x + 180;
    const startY = sPos.y + 40;
    const endX = tPos.x;
    const endY = tPos.y + 40;

    return {
      x: startX + (endX - startX) / 2,
      y: startY + (endY - startY) / 2 - 10
    };
  }

  // --- CU-14: IA Generativa ---

  solicitarGeneracionIA(): void {
    if (!this.aiPrompt.trim()) return;
    this.generatingIA = true;
    
    // REQ: Enviar contexto actual para permitir MODIFICACIÓN INCREMENTAL
    const context = {
      prompt: this.aiPrompt,
      nodosActuales: this.nodes,
      aristasActuales: this.edges
    };

    this.workflowService.generarConIA(context).subscribe({
      next: (res: any) => {
        if (res && res.nodes) {
          this.nodes = res.nodes;
          this.edges = res.edges || [];
          
          // Mostrar sugerencias si existen
          if (res.optimizaciones_sugeridas && res.optimizaciones_sugeridas.length > 0) {
            console.log('IA Optimizations:', res.optimizaciones_sugeridas);
          }

          this.autoAsignarDepartamentos();
          this.cd.detectChanges();
          
          // REQ-10: Sincronizar cambios por WebSocket con otros diseñadores
          this.broadcastChange('FULL_STATE_UPDATE', { 
            nodes: this.nodes, 
            edges: this.edges 
          });

          alert('✨ Flujo actualizado exitosamente por Gemini.');
        }
        this.generatingIA = false;
        this.aiPrompt = ''; // Limpiar después de éxito
      },
      error: (err) => {
        console.error(err);
        alert('❌ Error al generar flujo con IA. Verifique su descripción.');
        this.generatingIA = false;
      }
    });
  }

  private autoAsignarDepartamentos(): void {
    this.nodes.forEach(node => {
      if (node.type === NodeType.USER_TASK && !node.departmentId) {
        // Lógica simple: si el nombre del nodo contiene el nombre de un depto
        const match = this.departamentos.find(d => 
          node.name.toLowerCase().includes(d.nombre.toLowerCase())
        );
        if (match) node.departmentId = match.id;
      }
    });
  }

  // Guardado y Persistencia
  saveWorkflow(): void {
    this.currentPolicy.nodes = this.nodes;
    this.currentPolicy.edges = this.edges;

    this.workflowService.guardar(this.currentPolicy).subscribe({
      next: (res: PoliticaWorkflow) => {
        this.currentPolicy = res;
        this.nodes = [...(res.nodes || [])];
        this.edges = [...(res.edges || [])];
        this.cd.detectChanges();
        alert('Política guardada exitosamente (v' + res.version + ')');
      },
      error: (err: any) => this.handleError(err)
    });
  }

  onPublish(): void {
    if (!this.currentPolicy.id) {
      alert('Debes guardar la política al menos una vez antes de publicarla.');
      return;
    }

    const { valido, error } = this.validarEstructuraLocal();
    if (!valido) {
      alert('⚠️ Validación local fallida:\n' + error);
      return;
    }

    if (!confirm('¿Estás seguro de que deseas publicar esta política? Se volverá de solo lectura.')) return;

    // Auto-guardado antes de publicar para asegurar la consistencia del "flujo definido"
    this.currentPolicy.nodes = this.nodes;
    this.currentPolicy.edges = this.edges;
    
    this.workflowService.guardar(this.currentPolicy).subscribe({
      next: (savedRes) => {
         // Una vez guardado con éxito, solicitamos la publicación
         this.workflowService.publicar(this.currentPolicy.id!).subscribe({
           next: (res: PoliticaWorkflow) => {
             this.currentPolicy = res;
             alert('🚀 ¡Política publicada con éxito!');
           },
           error: (err: any) => this.handleError(err)
         });
      },
      error: (err: any) => this.handleError(err)
    });
  }

  onNewVersion(): void {
    if (!this.currentPolicy.id) return;

    this.workflowService.nuevaVersion(this.currentPolicy.id).subscribe({
      next: (res: PoliticaWorkflow) => {
        // Redirigir a la nueva versión para que la URL sea correcta y permita editar
        this.router.navigate(['/app/designer', res.id]);
        this.notificationService.notify('Se ha creado la versión ' + res.version + ' en modo borrador.', 'SUCCESS');
      },
      error: (err: any) => this.handleError(err)
    });
  }

  private validarEstructuraLocal(): { valido: boolean, error?: string } {
    const nodes = this.nodes;
    if (nodes.length === 0) return { valido: false, error: 'No hay nodos en el diagrama.' };

    const hasStart = nodes.some(n => n.type === NodeType.START);
    const hasEnd = nodes.some(n => n.type === NodeType.END);

    if (!hasStart) return { valido: false, error: 'Falta el nodo de Inicio (START).' };
    if (!hasEnd) return { valido: false, error: 'Falta el nodo de Fin (END).' };

    // Validar que las USER_TASK tengan departamento asignado y SLA > 0
    for (const node of nodes) {
      if (node.type === NodeType.USER_TASK) {
        if (!node.departmentId) {
          return { valido: false, error: `El paso "${node.name}" no tiene un departamento asignado.` };
        }
        if (!node.slaHours || node.slaHours <= 0) {
          return { valido: false, error: `El paso "${node.name}" debe tener un tiempo SLA mayor a 0 horas.` };
        }
      }
    }

    return { valido: true };
  }

  private handleError(err: any): void {
    console.error('Designer Error Log:', err);
    let message = 'Ocurrió un error inesperado al procesar la solicitud.';
    
    if (err.error) {
      if (typeof err.error === 'string') {
        message = err.error;
      } else if (err.error.message) {
        message = err.error.message;
      }
    } else if (err.message) {
      message = err.message;
    }

    alert('❌ Error:\n' + message);
  }

  // Lógica interactiva para crear conexiones entre nodos (2 clics)
  startConnecting(source: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.canEdit()) return;
    this.connectingSourceNode = source;
    // Opcional: mostrar un mensaje temporal
    console.log('Iniciando conexión desde:', source.id);
  }

  isConnecting(): boolean {
    return this.connectingSourceNode !== null;
  }

  finishConnecting(target: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.canEdit() || !this.connectingSourceNode) return;
    if (this.connectingSourceNode.id === target.id) {
       this.connectingSourceNode = null;
       return; // No conectar a sí mismo
    }

    const newEdge: WorkflowEdge = {
       id: `edge_${Date.now()}`,
       sourceNodeId: this.connectingSourceNode.id,
       targetNodeId: target.id
    };

    // Si el origen es un Gateway Exclusivo, pedimos la condición (TRUE o FALSE)
    if (this.connectingSourceNode.type === NodeType.EXCLUSIVE_GATEWAY) {
       const resp = prompt('Esta es una bifurcación condicional. ¿Esta ruta es para cuando la condición es verdadera (true) o falsa (false)? Escriba "true" o "false":');
       if (resp !== null) {
          const val = resp.trim().toLowerCase() === 'true' ? 'true' : 'false';
          newEdge.condition = {
             variable: 'decision', // Valor genérico, puede mejorarse
             operator: 'EQUALS',
             value: val
          } as any;
       }
    }

    this.edges.push(newEdge);
    this.connectingSourceNode = null; // Reiniciar
  }

  // Permite arrancar la conexión haciendo click derecho o escape
  cancelConnecting(event?: MouseEvent): void {
    if (this.connectingSourceNode) {
       this.connectingSourceNode = null;
    }
  }

  selectEdge(edgeId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedEdge = edgeId;
  }
}

