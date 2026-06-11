import { Component, OnInit, inject, ChangeDetectorRef, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FCanvasComponent, FFlowModule, FZoomDirective } from '@foblex/flow';
import { PoliticaWorkflow, WorkflowNode, WorkflowEdge, NodeType, PolicyStatus } from '../../../data/models/politica-workflow.model';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { DepartamentoService } from '../../../data/services/departamento.service';
import { AuthService } from '../../../data/services/auth.service';
import { NotificationService } from '../../../data/services/notification.service';
import { Departamento } from '../../../data/models/departamento.model';
import * as dagre from 'dagre';

@Component({
  selector: 'app-politica-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, FFlowModule],
  templateUrl: './politica-designer.component.html',
  styleUrls: ['./politica-designer.component.css']
})
export class PoliticaDesignerComponent implements OnInit {
  @ViewChild(FCanvasComponent, { static: false }) fCanvasRef?: FCanvasComponent;
  @ViewChild(FZoomDirective, { static: false }) fZoomDirective?: FZoomDirective;

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

  // CU-14: IA Generativa
  aiPrompt: string = '';
  generatingIA: boolean = false;
  isLoaded: boolean = false;

  // WebSocket Colaborativo
  liveCursors: Record<string, { x: number, y: number, name: string }> = {};
  private wsSubscription: any;
  zoomLevel: number = 1;
  sidebarCollapsed: boolean = false;

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

  constructor() { }

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
      this.isLoaded = true;
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
      if (event.senderId === this.authService.getToken()) return;
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
            this.aiPrompt = transcript;
            this.resetSilenceTimeout();
          }
        });
      };

      this.recognition.onerror = (event: any) => {
        console.error('--- DEPURACIÓN DE VOZ ---');
        console.error('Tipo de error:', event.error);
        if (event.error) console.error('ERROR DETALLE:', JSON.stringify(event));

        this.zone.run(() => {
          this.isListening = false;
          let msg = 'Error en reconocimiento de voz.';
          if (event.error === 'not-allowed') msg = 'Permiso de micrófono denegado.';
          if (event.error === 'network') msg = 'Error de red. Verifica tu conexión o intenta de nuevo.';
          this.notificationService.notify(msg, 'ERROR');
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          if (this.isListening) {
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
      try { this.recognition.stop(); } catch (e) { }
    }

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
      this.aiPrompt = '';
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

          const rawNodes = policy.nodes || [];
          rawNodes.forEach(n => {
            if (!n.uiPosition) n.uiPosition = { x: 100, y: 100 };
          });

          this.nodes = JSON.parse(JSON.stringify(rawNodes));
          this.edges = JSON.parse(JSON.stringify(policy.edges || []));

          this.autoAsignarDepartamentos();
          console.log('Política cargada:', id, 'Nodos:', this.nodes.length);

          this.isLoaded = true;
          this.initCollaborativeSession();

          // Forzar a Foblex a recalcular trazados de conexiones (SVG paths)
          setTimeout(() => {
            if (this.fCanvasRef) {
              try {
                this.fCanvasRef.redraw();
                console.log('Foblex canvas redrawn');
              } catch (e) {
                console.warn('Could not redraw FCanvas:', e);
              }
            }
          }, 200);
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
      this.cd.detectChanges();
    } else if (event.eventType === 'NODE_UPDATED') {
      const idx = this.nodes.findIndex(n => n.id === payload.id);
      if (idx !== -1) {
        this.nodes[idx] = payload;
      }
      this.cd.detectChanges();
    } else if (event.eventType === 'NODE_ADDED') {
      if (!this.nodes.find(n => n.id === payload.id)) {
        this.nodes.push(payload);
      }
      this.cd.detectChanges();
    } else if (event.eventType === 'NODE_REMOVED') {
      this.nodes = this.nodes.filter(n => n.id !== payload.id);
      this.edges = this.edges.filter(e => e.sourceNodeId !== payload.id && e.targetNodeId !== payload.id);
      this.cd.detectChanges();
    } else if (event.eventType === 'FULL_STATE_UPDATE') {
      this.nodes = payload.nodes;
      this.edges = payload.edges;
      this.autoAsignarDepartamentos();
      this.cd.detectChanges();
    } else if (event.eventType === 'LANES_UPDATED') {
      this.activeLanes = payload;
      this.cd.detectChanges();
    } else if (event.eventType === 'EDGE_ADDED') {
      if (!this.edges.find(e => e.id === payload.id)) {
        this.edges.push(payload);
        this.cd.detectChanges();
      }
    } else if (event.eventType === 'EDGE_REMOVED') {
      this.edges = this.edges.filter(e => e.id !== payload.id);
      this.cd.detectChanges();
    } else if (event.eventType === 'CURSOR_MOVED') {
      this.liveCursors[event.senderId] = {
        x: payload.x,
        y: payload.y,
        name: event.senderName || 'Usuario'
      };
      this.cd.detectChanges();
    }

    if (event.eventType !== 'CURSOR_MOVED') {
      this.triggerCanvasRedraw();
    }
  }

  private initCollaborativeSession(): void {
    if (!this.currentPolicy.id || this.currentPolicy.id === 'new') return;

    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }

    this.wsSubscription = this.notificationService.subscribeToTopic(
      `/topic/designer/${this.currentPolicy.id}`,
      (event: any) => {
        if (event.senderId === this.authService.getToken()) return;
        this.zone.run(() => {
          this.handleSyncEvent(event);
        });
      }
    );
  }

  private broadcastChange(type: string, payload: any): void {
    const currentUser = this.authService.currentUser();
    this.notificationService.sendMessage('/app/designer/sync', {
      idPolitica: this.currentPolicy.id || 'new',
      eventType: type,
      senderId: this.authService.getToken(),
      senderName: currentUser?.nombre || 'Usuario',
      payload: payload
    });
  }

  // ======== FOBLEX FLOW EVENT HANDLERS ========

  onNodePositionChanged(nodeId: string, newPosition: { x: number, y: number }): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    node.uiPosition = { x: newPosition.x, y: newPosition.y };

    // Auto-asignación de departamento basada en carril
    if (node.type === NodeType.USER_TASK) {
      const laneWidth = 400;
      const laneIndex = Math.floor(node.uiPosition.x / laneWidth);
      const safeIndex = Math.max(0, Math.min(this.activeLanes.length - 1, laneIndex));
      const targetLane = this.activeLanes[safeIndex];
      if (targetLane?.departamentoId) {
        node.departmentId = targetLane.departamentoId;
      }
    }

    if (this.selectedNode && this.selectedNode.id === node.id) {
      this.selectedNode = node;
    }

    this.broadcastChange('NODE_MOVED', node);
  }

  onConnectionCreated(event: any): void {
    if (!this.canEdit()) return;

    const sourceId = event.fOutputId;
    const targetId = event.fInputId;

    if (sourceId === targetId) return;

    // Extraer el nodeId del portId (formato: "out-{nodeId}" o "in-{nodeId}")
    const sourceNodeId = sourceId.replace('out-', '');
    const targetNodeId = targetId.replace('in-', '');

    const newEdge: WorkflowEdge = {
      id: `edge_${Date.now()}`,
      sourceNodeId: sourceNodeId,
      targetNodeId: targetNodeId
    };

    // Si el origen es un Gateway, pedir condición
    const sourceNode = this.nodes.find(n => n.id === sourceNodeId);
    if (sourceNode?.type === NodeType.EXCLUSIVE_GATEWAY) {
      const resp = prompt('Bifurcación condicional. ¿Esta ruta es verdadera (true) o falsa (false)?');
      if (resp !== null) {
        const val = resp.trim().toLowerCase() === 'true' ? 'true' : 'false';
        newEdge.condition = {
          variable: 'decision',
          operator: 'EQUALS',
          value: val
        } as any;
      }
    }

    this.edges = [...this.edges, newEdge];
    this.broadcastChange('EDGE_ADDED', newEdge);
    this.cd.detectChanges();
    this.triggerCanvasRedraw();
  }

  // ======== NODE OPERATIONS ========

  addNode(type: string): void {
    if (!this.canEdit()) return;

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: type as NodeType,
      name: `Nuevo ${type === 'PARALLEL_GATEWAY' ? 'Paralelo' : type}`,
      uiPosition: { x: 200, y: 200 },
      slaHours: type === 'USER_TASK' ? 24 : 0,
      formDefinition: []
    };

    if (type === 'PARALLEL_GATEWAY') {
      newNode.gatewayType = 'FORK';
      newNode.name = 'Fork Paralelo';
    }

    this.nodes = [...this.nodes, newNode];
    this.selectedNode = newNode;
    this.broadcastChange('NODE_ADDED', newNode);
    this.cd.detectChanges();
  }

  addParallelGatewayPair(): void {
    if (!this.canEdit()) return;

    const forkNode: WorkflowNode = {
      id: `node_fork_${Date.now()}`,
      type: NodeType.PARALLEL_GATEWAY,
      name: 'Fork Paralelo',
      gatewayType: 'FORK',
      uiPosition: { x: 300, y: 200 },
      slaHours: 0,
      formDefinition: []
    };

    const joinNode: WorkflowNode = {
      id: `node_join_${Date.now()}`,
      type: NodeType.PARALLEL_GATEWAY,
      name: 'Join Paralelo',
      gatewayType: 'JOIN',
      uiPosition: { x: 300, y: 500 },
      slaHours: 0,
      formDefinition: []
    };

    this.nodes = [...this.nodes, forkNode, joinNode];
    this.selectedNode = forkNode;
    this.broadcastChange('NODE_ADDED', forkNode);
    this.broadcastChange('NODE_ADDED', joinNode);
    this.cd.detectChanges();
  }

  selectNode(node: WorkflowNode): void {
    this.selectedNode = node;
    this.selectedEdge = null;
  }

  canEdit(): boolean {
    return this.isAdmin && this.currentPolicy.status === PolicyStatus.DRAFT;
  }

  removeNode(node: WorkflowNode): void {
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    this.edges = this.edges.filter(e => e.sourceNodeId !== node.id && e.targetNodeId !== node.id);
    this.selectedNode = null;
    this.broadcastChange('NODE_REMOVED', node);
    this.cd.detectChanges();
  }

  getDepartmentName(id: string | undefined): string {
    if (!id) return '';
    const d = this.departamentos.find(dept => dept.id === id);
    return d ? d.nombre : '';
  }

  getNodeIcon(type: NodeType): string {
    switch (type) {
      case NodeType.START: return '▶';
      case NodeType.USER_TASK: return '👤';
      case NodeType.EXCLUSIVE_GATEWAY: return '◆';
      case NodeType.PARALLEL_GATEWAY: return '⊞';
      case NodeType.END: return '■';
      default: return '●';
    }
  }

  trackByNode(index: number, node: WorkflowNode): string {
    return node.id;
  }

  trackByEdge(index: number, edge: WorkflowEdge): string {
    return edge.id;
  }

  // ======== EDGE OPERATIONS ========

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
      edge.condition = {
        variable: 'f_aprobado',
        operator: 'EQUALS',
        value: value
      };
    }
  }

  selectEdge(edgeId: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedEdge = edgeId;
    this.selectedNode = null;
  }

  removeEdge(edgeId: string): void {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    this.selectedEdge = null;
    this.cd.detectChanges();
  }

  getEdgeLabel(edge: WorkflowEdge): string {
    if (!edge.condition?.value) return '';
    return edge.condition.value === 'true' ? 'VERDADERO' : edge.condition.value === 'false' ? 'FALSO' : edge.condition.value.toUpperCase();
  }

  // ======== ZOOM (Foblex Canvas) ========

  disableWheelZoom = () => false;

  get currentZoomLevel(): number {
    return this.zoomLevel;
  }

  zoomIn(): void {
    if (this.fZoomDirective) {
      this.fZoomDirective.zoomIn();
      this.zoomLevel = this.fZoomDirective.getZoomValue ? this.fZoomDirective.getZoomValue() : this.zoomLevel;
      this.cd.detectChanges();
    }
  }

  zoomOut(): void {
    if (this.fZoomDirective) {
      this.fZoomDirective.zoomOut();
      this.zoomLevel = this.fZoomDirective.getZoomValue ? this.fZoomDirective.getZoomValue() : this.zoomLevel;
      this.cd.detectChanges();
    }
  }

  zoomReset(): void {
    if (this.fZoomDirective) {
      this.fZoomDirective.reset();
      this.zoomLevel = 1.0;
      this.cd.detectChanges();
    }
  }

  triggerCanvasRedraw(): void {
    setTimeout(() => {
      if (this.fCanvasRef) {
        try {
          this.fCanvasRef.redraw();
          console.log('Foblex canvas redrawn successfully');
        } catch (e) {
          console.warn('Could not redraw FCanvas:', e);
        }
      }
    }, 100);
  }

  // ======== DAGRE AUTO-LAYOUT ========

  applyDagreLayout(): void {
    if (this.nodes.length < 2) return;

    this.autoAsignarDepartamentos();

    const LANE_WIDTH = 400;
    const LANE_PADDING = 40; // margen interno del carril

    // 1) Construir un mapa de departamentoId → índice de carril
    const deptToLaneIndex: Record<string, number> = {};
    this.activeLanes.forEach((lane, idx) => {
      if (lane.departamentoId) {
        deptToLaneIndex[lane.departamentoId] = idx;
      }
    });

    // 2) Usar Dagre solo para calcular la jerarquía vertical (Y)
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: 'TB',
      nodesep: 80,
      ranksep: 140,
      edgesep: 40,
      marginx: 80,
      marginy: 80
    });
    g.setDefaultEdgeLabel(() => ({}));

    this.nodes.forEach(node => {
      const w = this.getNodeWidth(node);
      const h = this.getNodeHeight(node);
      g.setNode(node.id, { width: w, height: h });
    });

    this.edges.forEach(edge => {
      g.setEdge(edge.sourceNodeId, edge.targetNodeId);
    });

    dagre.layout(g);

    // 3) Calcular el centro horizontal de todo el lienzo (para nodos compartidos)
    const totalLanesWidth = this.activeLanes.length * LANE_WIDTH;
    const canvasCenterX = totalLanesWidth / 2;

    // 4) Asignar posiciones: Y de Dagre + X mapeado al carril correcto
    this.nodes.forEach(node => {
      const layoutNode = g.node(node.id);
      if (!layoutNode) return;

      const nodeW = this.getNodeWidth(node);
      const nodeH = this.getNodeHeight(node);

      // Posición Y del layout de Dagre (siempre se respeta)
      const yPos = layoutNode.y - (nodeH / 2);

      // Posición X: depende de si el nodo tiene departamento asignado
      let xPos: number;
      const isLaneNode = node.type === NodeType.USER_TASK && node.departmentId;

      if (isLaneNode) {
        // Nodo con departamento → centrar dentro de su carril
        const laneIdx = deptToLaneIndex[node.departmentId!];
        if (laneIdx !== undefined) {
          const laneStartX = laneIdx * LANE_WIDTH;
          xPos = laneStartX + (LANE_WIDTH / 2) - (nodeW / 2);
        } else {
          // Departamento sin carril asignado → centro general
          xPos = canvasCenterX - (nodeW / 2);
        }
      } else {
        // Nodos compartidos (START, END, GATEWAY) → centro de todos los carriles
        xPos = canvasCenterX - (nodeW / 2);
      }

      node.uiPosition = { x: xPos, y: yPos };
    });

    // 5) Resolver colisiones verticales: si hay múltiples USER_TASKs en el mismo
    //    carril con la misma Y (paralelas), escalonarlas verticalmente
    const laneYMap: Record<number, number[]> = {};
    this.nodes.forEach(node => {
      if (node.type === NodeType.USER_TASK && node.departmentId) {
        const laneIdx = deptToLaneIndex[node.departmentId] ?? -1;
        if (laneIdx >= 0) {
          if (!laneYMap[laneIdx]) laneYMap[laneIdx] = [];
          laneYMap[laneIdx].push(node.uiPosition.y);
        }
      }
    });

    // Force refresh of Foblex positions
    this.nodes = [...this.nodes];
    console.log('Dagre auto-layout (swimlane-aware) aplicado:', this.nodes.length, 'nodos');
    this.cd.detectChanges();
    this.triggerCanvasRedraw();
  }

  private getNodeWidth(node: WorkflowNode): number {
    switch (node.type) {
      case NodeType.START:
      case NodeType.END:
        return 140;
      case NodeType.EXCLUSIVE_GATEWAY:
      case NodeType.PARALLEL_GATEWAY:
        return 110;
      case NodeType.USER_TASK:
      default:
        return 180;
    }
  }

  private getNodeHeight(node: WorkflowNode): number {
    switch (node.type) {
      case NodeType.START:
      case NodeType.END:
        return 56;
      case NodeType.EXCLUSIVE_GATEWAY:
      case NodeType.PARALLEL_GATEWAY:
        return 110;
      case NodeType.USER_TASK:
      default:
        return 60;
    }
  }

  // ======== LANE / NODE CHANGE BROADCASTING ========

  onLaneChanged(): void {
    this.broadcastChange('LANES_UPDATED', this.activeLanes);
  }

  onNodeChanged(node: WorkflowNode): void {
    this.broadcastChange('NODE_UPDATED', node);
  }

  // ======== FORM BUILDER (CU-06) ========

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

  // ======== CU-14: IA GENERATIVA ========

  solicitarGeneracionIA(): void {
    if (!this.aiPrompt.trim()) return;
    this.generatingIA = true;

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

          if (res.optimizaciones_sugeridas && res.optimizaciones_sugeridas.length > 0) {
            console.log('IA Optimizations:', res.optimizaciones_sugeridas);
          }

          this.applyDagreLayout();

          this.broadcastChange('FULL_STATE_UPDATE', {
            nodes: this.nodes,
            edges: this.edges
          });

          alert('✨ Flujo actualizado exitosamente por Asistente IA.');
        }
        this.generatingIA = false;
        this.aiPrompt = '';
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
        const match = this.departamentos.find(d =>
          node.name.toLowerCase().includes(d.nombre.toLowerCase())
        );
        if (match) node.departmentId = match.id;
      }
    });

    const deptIdsUsados: string[] = [];
    this.nodes.forEach(node => {
      if (node.departmentId && !deptIdsUsados.includes(node.departmentId)) {
        deptIdsUsados.push(node.departmentId);
      }
    });

    while (this.activeLanes.length < deptIdsUsados.length) {
      this.activeLanes.push({ id: `lane_${this.activeLanes.length}`, departamentoId: '' });
    }

    deptIdsUsados.forEach((deptId, i) => {
      if (i < this.activeLanes.length) {
        this.activeLanes[i].departamentoId = deptId;
      }
    });
  }

  // ======== GUARDADO Y PERSISTENCIA ========

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

    this.currentPolicy.nodes = this.nodes;
    this.currentPolicy.edges = this.edges;

    this.workflowService.guardar(this.currentPolicy).subscribe({
      next: (savedRes) => {
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

    // Validar PARALLEL_GATEWAY: cada FORK debe tener un JOIN
    const forks = nodes.filter(n => n.type === NodeType.PARALLEL_GATEWAY && n.gatewayType === 'FORK');
    const joins = nodes.filter(n => n.type === NodeType.PARALLEL_GATEWAY && n.gatewayType === 'JOIN');
    if (forks.length !== joins.length) {
      return { valido: false, error: `Cada Gateway Paralelo (Fork) debe tener su correspondiente Join. Forks: ${forks.length}, Joins: ${joins.length}` };
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

  // ======== REQUISITOS DOCUMENTALES ========

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
}
