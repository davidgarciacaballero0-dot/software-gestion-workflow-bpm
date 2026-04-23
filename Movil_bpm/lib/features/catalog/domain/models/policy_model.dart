// ─────────────────────────────────────────────────────────────
// lib/features/catalog/domain/models/policy_model.dart
// ─────────────────────────────────────────────────────────────

import 'workflow_node_model.dart';

class PolicyModel {
  final String id;
  final String nombre;
  final String description;
  final String version;
  final String status;
  final List<WorkflowNodeModel> nodes;

  PolicyModel({
    required this.id,
    required this.nombre,
    required this.description,
    required this.version,
    required this.status,
    required this.nodes,
  });

  factory PolicyModel.fromJson(Map<String, dynamic> json) {
    var nodesList = <WorkflowNodeModel>[];
    if (json['nodes'] != null) {
      json['nodes'].forEach((v) {
        nodesList.add(WorkflowNodeModel.fromJson(v));
      });
    }
    return PolicyModel(
      id: json['id'] ?? '',
      nombre: json['nombre'] ?? '',
      description: json['description'] ?? '',
      version: json['version'] ?? '',
      status: json['status'] ?? '',
      nodes: nodesList,
    );
  }
}
