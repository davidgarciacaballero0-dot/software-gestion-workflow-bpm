// ─────────────────────────────────────────────────────────────
// lib/features/catalog/domain/models/workflow_node_model.dart
// ─────────────────────────────────────────────────────────────

import 'form_field_definition_model.dart';

class WorkflowNodeModel {
  final String id;
  final String type;
  final String name;
  final List<FormFieldDefinitionModel> formDefinition;

  WorkflowNodeModel({
    required this.id,
    required this.type,
    required this.name,
    required this.formDefinition,
  });

  factory WorkflowNodeModel.fromJson(Map<String, dynamic> json) {
    var formDefList = <FormFieldDefinitionModel>[];
    if (json['formDefinition'] != null) {
      json['formDefinition'].forEach((v) {
        formDefList.add(FormFieldDefinitionModel.fromJson(v));
      });
    }
    return WorkflowNodeModel(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      name: json['name'] ?? '',
      formDefinition: formDefList,
    );
  }
}
