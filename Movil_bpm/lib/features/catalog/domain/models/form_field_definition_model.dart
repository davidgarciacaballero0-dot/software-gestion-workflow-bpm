// ─────────────────────────────────────────────────────────────
// lib/features/catalog/domain/models/form_field_definition_model.dart
// ─────────────────────────────────────────────────────────────

class FormFieldDefinitionModel {
  final String fieldId;
  final String label;
  final String type; // TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN, FILE
  final bool required;
  final List<String> options;

  FormFieldDefinitionModel({
    required this.fieldId,
    required this.label,
    required this.type,
    required this.required,
    required this.options,
  });

  factory FormFieldDefinitionModel.fromJson(Map<String, dynamic> json) {
    return FormFieldDefinitionModel(
      fieldId: json['fieldId'] ?? '',
      label: json['label'] ?? '',
      type: json['type'] ?? 'TEXT',
      required: json['required'] ?? false,
      options: json['options'] != null ? List<String>.from(json['options']) : [],
    );
  }
}
