import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { PoliticaWorkflow, WorkflowNode, WorkflowEdge, NodeType, PolicyStatus } from '../../../data/models/politica-workflow.model';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { DepartamentoService } from '../../../data/services/departamento.service';
import { Departamento } from '../../../data/models/departamento.model';
import { AuthService } from '../../../data/services/auth.service';

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

  // CU-18 State
  currentPolicy: PoliticaWorkflow = {
    idOrganizacion: '',
    nombre: 'Nueva Política de Crédito',
    version: '1.0',
    status: PolicyStatus.DRAFT,
    nodes: [],
    edges: []
  };

  constructor(
    private workflowService: PoliticaWorkflowService,
    private depService: DepartamentoService,
    private authService: AuthService
  ) {}

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
  }

  onNodeMoved(event: CdkDragEnd, node: WorkflowNode): void {
    const transform = event.source.getFreeDragPosition();
    node.uiPosition.x += transform.x;
    node.uiPosition.y += transform.y;
    event.source.reset();
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

    const startX = source.uiPosition.x + 180; // Derecha del nodo
    const startY = source.uiPosition.y + 35;
    const endX = target.uiPosition.x; // Izquierda del nodo
    const endY = target.uiPosition.y + 35;

    const controlX = startX + (endX - startX) / 2;
    return `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
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
      alert('Debes guardar la política antes de publicarla.');
      return;
    }

    this.workflowService.publicar(this.currentPolicy.id).subscribe({
      next: (res: PoliticaWorkflow) => {
        this.currentPolicy = res;
        alert('🚀 ¡Política publicada con éxito! Ahora es de solo lectura.');
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

  private handleError(err: any): void {
    const message = err.error?.message || 'Ocurrió un error inesperado.';
    alert('Error: ' + message);
    console.error(err);
  }

  // Lógica simplificada para crear una conexión entre nodos
  startConnecting(source: WorkflowNode, event: MouseEvent): void {
    // En una implementación real, aquí manejaríamos el modo "hilo"
    // temporalmente crearemos una conexión automática al siguiente nodo creado
    console.log('Iniciando conexión desde:', source.id);
  }
}
