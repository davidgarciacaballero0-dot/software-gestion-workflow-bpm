import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  selectedNode: WorkflowNode | null = null;
  selectedEdge: string | null = null;
  connectingSourceNode: WorkflowNode | null = null;

  // CU-14: IA Generativa
  aiPrompt: string = '';
  generatingIA: boolean = false;

  // CU-18 State
  currentPolicy: PoliticaWorkflow = {
    idOrganizacion: '',
    nombre: 'Nueva Política de Crédito',
    version: '1.0',
    status: PolicyStatus.DRAFT,
    nodes: [],
    edges: []
  };

  private route = inject(ActivatedRoute);
  private workflowService = inject(PoliticaWorkflowService);
  private depService = inject(DepartamentoService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  constructor() {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const orgId = user?.idOrganizacion || '';
    this.currentPolicy.idOrganizacion = orgId;

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

  onNodeMoved(event: CdkDragEnd, node: WorkflowNode): void {
    const transform = event.source.getFreeDragPosition();
    node.uiPosition.x += transform.x;
    node.uiPosition.y += transform.y;
    event.source.reset();
    this.broadcastChange('NODE_MOVED', node);
  }

  selectNode(node: WorkflowNode): void {
    this.selectedNode = node;
  }

  canEdit(): boolean {
    return this.currentPolicy.status === PolicyStatus.DRAFT;
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

  // --- Helper Icons ---
  
  getNodeIcon(type: NodeType): string {
    switch (type) {
      case NodeType.START: return '▶';
      case NodeType.USER_TASK: return '👤';
      case NodeType.EXCLUSIVE_GATEWAY: return '◆';
      case NodeType.END: return '■';
      default: return '●';
    }
  }

  // Lógica de dibujo de conexiones (Bezier dinámico)
  calculatePath(edge: WorkflowEdge): string {
    const source = this.nodes.find(n => n.id === edge.sourceNodeId);
    const target = this.nodes.find(n => n.id === edge.targetNodeId);
    if (!source || !target) return '';

    const isBackwards = target.uiPosition.x < source.uiPosition.x;

    // Puntos de anclaje (ajustados a los círculos visuales)
    const startX = source.uiPosition.x + 180; // Derecha
    const startY = source.uiPosition.y + 40;
    const endX = target.uiPosition.x;         // Izquierda
    const endY = target.uiPosition.y + 40;

    if (isBackwards) {
      // Loopback: curva amplia hacia arriba o abajo para evitar solapamiento
      const midY = Math.min(startY, endY) - 60;
      const cp1X = startX + 50;
      const cp2X = endX - 50;
      return `M ${startX} ${startY} C ${cp1X} ${midY}, ${cp2X} ${midY}, ${endX} ${endY}`;
    } else {
      // Flujo normal: Bezier horizontal
      const controlX = startX + (endX - startX) / 2;
      return `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
    }
  }

  getEdgeLabelPosition(edge: WorkflowEdge): { x: number, y: number } {
    const source = this.nodes.find(n => n.id === edge.sourceNodeId);
    const target = this.nodes.find(n => n.id === edge.targetNodeId);
    if (!source || !target) return { x: 0, y: 0 };

    const startX = source.uiPosition.x + 180;
    const startY = source.uiPosition.y + 35;
    const endX = target.uiPosition.x;
    const endY = target.uiPosition.y + 35;

    return {
      x: startX + (endX - startX) / 2,
      y: startY + (endY - startY) / 2 - 10
    };
  }

  // --- CU-14: IA Generativa ---

  solicitarGeneracionIA(): void {
    if (!this.aiPrompt.trim()) return;
    this.generatingIA = true;
    
    this.workflowService.generarConIA(this.aiPrompt).subscribe({
      next: (res: any) => {
        if (res && res.nodes) {
          this.nodes = res.nodes;
          this.edges = res.edges || [];
          // Intentar auto-asignar departamentos si los nombres coinciden
          this.autoAsignarDepartamentos();
          alert('✨ Flujo generado exitosamente por Gemini.');
        }
        this.generatingIA = false;
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
        this.currentPolicy = res;
        this.nodes = res.nodes || [];
        this.edges = res.edges || [];
        this.selectedNode = null;
        alert('Se ha creado la versión ' + res.version + ' en modo borrador.');
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
}

