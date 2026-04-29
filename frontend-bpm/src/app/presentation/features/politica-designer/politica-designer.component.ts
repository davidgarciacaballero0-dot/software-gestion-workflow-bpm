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

  // Requisitos documentales predefinidos
  documentRequirements = [
    { id: 'doc_ci', label: 'Carnet de Identidad (CI)', fieldId: 'f_ci' },
    { id: 'doc_boleta', label: 'Boleta de Pago', fieldId: 'f_boleta_pago' },
    { id: 'doc_extracto', label: 'Extracto Bancario', fieldId: 'f_extracto_bancario' },
    { id: 'doc_nacimiento', label: 'Certificado de Nacimiento', fieldId: 'f_cert_nacimiento' },
    { id: 'doc_servicios', label: 'Factura de Servicios', fieldId: 'f_factura_servicios' },
    { id: 'doc_trabajo', label: 'Certificado de Trabajo', fieldId: 'f_cert_trabajo' },
    { id: 'doc_nit', label: 'NIT / Registro Tributario', fieldId: 'f_nit' }
  ];
  customDocLabel: string = '';
  
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

  private silenceTimeout: any = null;

  private initVoiceRecognition(): void {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        this.zone.run(() => {
          if (transcript.trim()) {
             // Si ya había texto anterior, lo combinamos (simplificado reemplazando por ahora para que no repita en interim)
             this.aiPrompt = transcript;
             this.resetSilenceTimeout();
          }
        });
      };

      this.recognition.onerror = (event: any) => {
        console.error('--- DEPURACIÓN DE VOZ ---');
        console.error('Tipo de error:', event.error);
        console.error('Evento completo:', event);
        console.error('-------------------------');
        
        this.zone.run(() => {
          this.isListening = false;
          let msg = 'Error en reconocimiento de voz.';
          if (event.error === 'not-allowed') msg = 'Permiso de micrófono denegado.';
          if (event.error === 'network') msg = 'Error de red en reconocimiento de voz.';
          this.notificationService.notify(msg, 'ERROR');
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
           if (this.isListening) {
             // Si el navegador cortó por alguna razón, detener formalmente
             this.stopVoiceAndSubmit();
           }
        });
      };
    }
  }

  private resetSilenceTimeout(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    // 5 segundos de silencio
    this.silenceTimeout = setTimeout(() => {
      this.zone.run(() => {
        this.stopVoiceAndSubmit();
      });
    }, 5000);
  }

  private stopVoiceAndSubmit(): void {
    this.isListening = false;
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
    }
    
    // Auto-ejecución si hay texto
    if (this.aiPrompt && this.aiPrompt.trim().length > 0 && !this.generatingIA) {
      this.solicitarGeneracionIA();
    }
  }

  toggleVoiceInput(): void {
    if (!this.recognition) {
      alert('El reconocimiento de voz no está soportado en este navegador.');
      return;
    }

    if (this.isListening) {
      this.stopVoiceAndSubmit();
    } else {
      this.aiPrompt = ''; // Limpiar al iniciar
      this.isListening = true;
      try {
        this.recognition.start();
        this.resetSilenceTimeout();
      } catch (e) {
        console.error("Error al iniciar reconocimiento:", e);
        this.isListening = false;
      }
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
          
          // Auto-layout jerárquico al cargar borradores
          this.autoLayoutHierarchical();

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
      slaHours: 24,
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

  /**
   * Obtiene los bordes que salen de un nodo específico (para Gateways)
   */
  getOutgoingEdges(nodeId: string): WorkflowEdge[] {
    return this.edges.filter(e => e.sourceNodeId === nodeId);
  }

  /**
   * Obtiene el nombre de un nodo por su ID
   */
  getNodeName(nodeId: string): string {
    const node = this.nodes.find(n => n.id === nodeId);
    return node ? node.name : 'Desconocido';
  }

  /**
   * Actualiza la condición de un borde (SI/NO)
   */
  updateEdgeCondition(edge: WorkflowEdge, value: string) {
    if (!value) {
      edge.condition = undefined;
    } else {
      // Usamos f_aprobado como variable por defecto para decisiones booleanas
      edge.condition = {
        variable: 'f_aprobado',
        operator: 'EQUALS',
        value: value
      };
    }
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
      this.selectedNode = node; 
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

  autoLayoutHierarchical(): void {
    if (this.nodes.length < 2) return;

    const V_GAP = 160;
    const H_GAP = 220;
    const INIT_Y = 80;

    // Build adjacency list from edges
    const adj: Map<string, string[]> = new Map();
    const inDeg: Map<string, number> = new Map();
    this.nodes.forEach(n => { adj.set(n.id, []); inDeg.set(n.id, 0); });
    this.edges.forEach(e => {
      adj.get(e.sourceNodeId)?.push(e.targetNodeId);
      inDeg.set(e.targetNodeId, (inDeg.get(e.targetNodeId) || 0) + 1);
    });

    // Find root: START node or node with 0 in-degree
    let root = this.nodes.find(n => n.type === NodeType.START);
    if (!root) root = this.nodes.find(n => (inDeg.get(n.id) || 0) === 0);
    if (!root) root = this.nodes[0];

    // BFS to assign levels
    const levels: Map<string, number> = new Map();
    const queue: string[] = [root.id];
    levels.set(root.id, 0);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curLvl = levels.get(cur)!;
      for (const nb of (adj.get(cur) || [])) {
        if (!levels.has(nb)) {
          levels.set(nb, curLvl + 1);
          queue.push(nb);
        }
      }
    }
    // Assign unvisited nodes
    const maxLvl = levels.size > 0 ? Math.max(...levels.values()) : 0;
    this.nodes.forEach(n => { if (!levels.has(n.id)) levels.set(n.id, maxLvl + 1); });

    // Group by level
    const groups: Map<number, WorkflowNode[]> = new Map();
    this.nodes.forEach(n => {
      const lv = levels.get(n.id) || 0;
      if (!groups.has(lv)) groups.set(lv, []);
      groups.get(lv)!.push(n);
    });

    // Position nodes top-to-bottom, centered horizontally
    const sortedLvls = Array.from(groups.keys()).sort((a, b) => a - b);
    const canvasWidth = 800;
    for (const lv of sortedLvls) {
      const nodesInLvl = groups.get(lv)!;
      const totalW = (nodesInLvl.length - 1) * H_GAP;
      const startX = (canvasWidth / 2) - (totalW / 2);
      nodesInLvl.forEach((node, i) => {
        node.uiPosition = { x: startX + i * H_GAP, y: INIT_Y + lv * V_GAP };
      });
    }
    console.log('Auto-layout jerárquico aplicado:', this.nodes.length, 'nodos en', sortedLvls.length, 'niveles');
    this.cd.detectChanges();
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

  /** Dimensiones CSS reales de cada tipo de nodo */
  getNodeDimensions(node: WorkflowNode): { width: number, height: number } {
    switch (node.type) {
      case NodeType.START:
      case NodeType.END:
        return { width: 140, height: 56 };
      case NodeType.EXCLUSIVE_GATEWAY:
        return { width: 110, height: 110 };
      case NodeType.USER_TASK:
      default:
        return { width: 180, height: 60 };
    }
  }

  /** Punto de conexión en 4 direcciones, sincronizado con las formas BPMN del CSS */
  getConnectionPoint(nodeId: string, side: 'top' | 'bottom' | 'left' | 'right'): { x: number, y: number } {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const pos = this.draggingPositions[nodeId] || node.uiPosition;
    const d = this.getNodeDimensions(node);
    switch (side) {
      case 'top':    return { x: pos.x + d.width / 2, y: pos.y };
      case 'bottom': return { x: pos.x + d.width / 2, y: pos.y + d.height };
      case 'left':   return { x: pos.x, y: pos.y + d.height / 2 };
      case 'right':  return { x: pos.x + d.width, y: pos.y + d.height / 2 };
    }
  }

  // Determinar la mejor dirección de salida/entrada entre dos nodos
  private getBestSides(sNode: WorkflowNode, tNode: WorkflowNode): { src: 'top'|'bottom'|'left'|'right', tgt: 'top'|'bottom'|'left'|'right' } {
    const sPos = this.draggingPositions[sNode.id] || sNode.uiPosition;
    const tPos = this.draggingPositions[tNode.id] || tNode.uiPosition;
    const sD = this.getNodeDimensions(sNode);
    const tD = this.getNodeDimensions(tNode);
    const dx = (tPos.x + tD.width/2) - (sPos.x + sD.width/2);
    const dy = (tPos.y + tD.height/2) - (sPos.y + sD.height/2);

    if (Math.abs(dy) >= Math.abs(dx) * 0.4) {
      return dy > 0 ? { src: 'bottom', tgt: 'top' } : { src: 'top', tgt: 'bottom' };
    } else {
      return dx > 0 ? { src: 'right', tgt: 'left' } : { src: 'left', tgt: 'right' };
    }
  }

  // Conectores Ortogonales Rectilíneos (90°)
  calculatePath(edge: WorkflowEdge): string {
    const sNode = this.nodes.find(n => n.id === edge.sourceNodeId);
    const tNode = this.nodes.find(n => n.id === edge.targetNodeId);
    if (!sNode || !tNode) return '';

    const sides = this.getBestSides(sNode, tNode);
    const s = this.getConnectionPoint(edge.sourceNodeId, sides.src);
    const t = this.getConnectionPoint(edge.targetNodeId, sides.tgt);
    if (!s || !t) return '';

    const OFF = 25; // offset antes del primer giro

    if (sides.src === 'bottom' || sides.src === 'top') {
      const signS = sides.src === 'bottom' ? 1 : -1;
      const signT = sides.tgt === 'top' ? -1 : 1;
      const midY = (s.y + signS * OFF + t.y + signT * OFF) / 2;
      return `M ${s.x} ${s.y} L ${s.x} ${midY} L ${t.x} ${midY} L ${t.x} ${t.y}`;
    } else {
      const signS = sides.src === 'right' ? 1 : -1;
      const signT = sides.tgt === 'left' ? -1 : 1;
      const midX = (s.x + signS * OFF + t.x + signT * OFF) / 2;
      return `M ${s.x} ${s.y} L ${midX} ${s.y} L ${midX} ${t.y} L ${t.x} ${t.y}`;
    }
  }

  getEdgeLabelPosition(edge: WorkflowEdge): { x: number, y: number } {
    const sNode = this.nodes.find(n => n.id === edge.sourceNodeId);
    const tNode = this.nodes.find(n => n.id === edge.targetNodeId);
    if (!sNode || !tNode) return { x: 0, y: 0 };

    const sides = this.getBestSides(sNode, tNode);
    const s = this.getConnectionPoint(edge.sourceNodeId, sides.src);
    const t = this.getConnectionPoint(edge.targetNodeId, sides.tgt);

    // Posicionar la etiqueta en el punto medio de la ruta ortogonal
    if (sides.src === 'bottom' || sides.src === 'top') {
      const midY = (s.y + t.y) / 2;
      return { x: (s.x + t.x) / 2 + 10, y: midY - 6 };
    } else {
      const midX = (s.x + t.x) / 2;
      return { x: midX + 10, y: (s.y + t.y) / 2 - 6 };
    }
  }

  // --- CU-14: IA Generativa ---

  solicitarGeneracionIA(): void {
    if (!this.aiPrompt.trim()) return;
    this.generatingIA = true;
    
    // REQ: Enviar contexto actual para permitir MODIFICACIÓN INCREMENTAL
    const context = {
      prompt: this.aiPrompt,
      nodosActuales: this.nodes,
      aristasActuales: this.edges,
      departamentosDisponibles: this.departamentos.map(d => ({ id: d.id, nombre: d.nombre }))
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

          alert('✨ Flujo actualizado exitosamente por Asistente IA.');
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

  // --- Requisitos Documentales ---

  isDocRequired(node: WorkflowNode, docLabel: string): boolean {
    if (!node.requiredDocuments) return false;
    return node.requiredDocuments.includes(docLabel);
  }

  toggleDocRequirement(node: WorkflowNode, doc: { id: string, label: string, fieldId: string }): void {
    if (!node.requiredDocuments) node.requiredDocuments = [];
    const idx = node.requiredDocuments.indexOf(doc.label);
    if (idx >= 0) {
      node.requiredDocuments.splice(idx, 1);
    } else {
      node.requiredDocuments.push(doc.label);
    }
  }

  getRequiredDocsCount(node: WorkflowNode): number {
    return node.requiredDocuments ? node.requiredDocuments.length : 0;
  }

  addCustomDocRequirement(): void {
    if (!this.selectedNode || !this.customDocLabel.trim()) return;
    if (!this.selectedNode.requiredDocuments) this.selectedNode.requiredDocuments = [];
    this.selectedNode.requiredDocuments.push(this.customDocLabel.trim());
    this.customDocLabel = '';
  }

  removeCustomDocRequirement(index: number): void {
    if (this.selectedNode?.requiredDocuments) {
       this.selectedNode.requiredDocuments.splice(index, 1);
    }
  }

  isPresetDoc(label: string): boolean {
    return this.documentRequirements.some(d => d.label === label);
  }

  removeEdge(edgeId: string): void {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    this.selectedEdge = null;
  }
}

