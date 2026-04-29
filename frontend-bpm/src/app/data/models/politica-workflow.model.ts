export enum NodeType {
  START = 'START',
  USER_TASK = 'USER_TASK',
  SYSTEM_TASK = 'SYSTEM_TASK',
  EXCLUSIVE_GATEWAY = 'EXCLUSIVE_GATEWAY',
  PARALLEL_GATEWAY = 'PARALLEL_GATEWAY',
  END = 'END'
}

export enum FormFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  DROPDOWN = 'DROPDOWN',
  FILE = 'FILE'
}

export enum PolicyStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export interface UIPosition {
  x: number;
  y: number;
}

export interface FormFieldDefinition {
  fieldId: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  departmentId?: string;
  slaHours?: number;
  uiPosition: UIPosition;
  formDefinition?: FormFieldDefinition[];
  requiredDocuments?: string[];
}

export interface Condition {
  variable: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN';
  value: string;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: Condition;
}

export interface PoliticaWorkflow {
  id?: string;
  _id?: string; // Soporte para ID nativo de MongoDB
  idOrganizacion: string;
  nombre: string;
  description?: string;
  version: string;
  status: PolicyStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
}
