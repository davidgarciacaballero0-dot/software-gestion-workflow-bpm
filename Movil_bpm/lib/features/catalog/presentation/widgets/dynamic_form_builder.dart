// ─────────────────────────────────────────────────────────────
// lib/features/catalog/presentation/widgets/dynamic_form_builder.dart
// ─────────────────────────────────────────────────────────────

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import '../../domain/models/form_field_definition_model.dart';

class DynamicFormBuilder extends StatefulWidget {
  final List<FormFieldDefinitionModel> fields;
  final void Function(Map<String, dynamic> data, Map<String, File> files) onSaved;
  final GlobalKey<FormState> formKey;

  const DynamicFormBuilder({
    super.key,
    required this.fields,
    required this.onSaved,
    required this.formKey,
  });

  @override
  State<DynamicFormBuilder> createState() => DynamicFormBuilderState();
}

class DynamicFormBuilderState extends State<DynamicFormBuilder> {
  final Map<String, dynamic> _formData = {};
  final Map<String, File> _fileData = {};

  @override
  Widget build(BuildContext context) {
    return Form(
      key: widget.formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: widget.fields.map((field) => _buildField(field)).toList(),
      ),
    );
  }

  Widget _buildField(FormFieldDefinitionModel field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${field.label} ${field.required ? '*' : ''}',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          const SizedBox(height: 8),
          _buildInput(field),
        ],
      ),
    );
  }

  Widget _buildInput(FormFieldDefinitionModel field) {
    switch (field.type) {
      case 'TEXT':
        return TextFormField(
          decoration: _inputDecoration(),
          onSaved: (val) => _formData[field.fieldId] = val,
          validator: (val) => field.required && (val == null || val.isEmpty)
              ? 'Este campo es obligatorio'
              : null,
        );
      case 'NUMBER':
        return TextFormField(
          decoration: _inputDecoration(),
          keyboardType: TextInputType.number,
          onSaved: (val) {
            if (val != null && val.isNotEmpty) {
              _formData[field.fieldId] = num.tryParse(val);
            }
          },
          validator: (val) => field.required && (val == null || val.isEmpty)
              ? 'Este campo es obligatorio'
              : null,
        );
      case 'BOOLEAN':
        return SwitchListTile(
          value: _formData[field.fieldId] == true,
          contentPadding: EdgeInsets.zero,
          title: Text(_formData[field.fieldId] == true ? 'Sí' : 'No'),
          onChanged: (val) {
            setState(() {
              _formData[field.fieldId] = val;
            });
          },
        );
      case 'DROPDOWN':
        return DropdownButtonFormField<String>(
          decoration: _inputDecoration(),
          items: field.options
              .map((o) => DropdownMenuItem(value: o, child: Text(o)))
              .toList(),
          onChanged: (val) {},
          onSaved: (val) => _formData[field.fieldId] = val,
          validator: (val) => field.required && val == null
              ? 'Seleccione una opción'
              : null,
        );
      case 'FILE':
        return _buildFilePicker(field);
      default:
        return TextFormField(
          decoration: _inputDecoration(),
          onSaved: (val) => _formData[field.fieldId] = val,
        );
    }
  }

  Widget _buildFilePicker(FormFieldDefinitionModel field) {
    File? selectedFile = _fileData[field.fieldId];

    return InkWell(
      onTap: () async {
        FilePickerResult? result = await FilePicker.pickFiles();
        if (result != null && result.files.isNotEmpty) {
          final filePath = result.files.single.path;
          if (filePath != null) {
            setState(() {
              _fileData[field.fieldId] = File(filePath);
            });
          }
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(selectedFile != null ? Icons.check_circle : Icons.upload_file,
                color: selectedFile != null ? Colors.green : AppTheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                selectedFile != null
                    ? selectedFile.path.split('/').last
                    : 'Toca para seleccionar archivo',
                style: TextStyle(
                  color: selectedFile != null ? Colors.black : Colors.grey,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration() {
    return InputDecoration(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppTheme.primary, width: 2),
      ),
    );
  }

  void saveForm() {
    if (widget.formKey.currentState!.validate()) {
      widget.formKey.currentState!.save();
      // Validar si los archivos requeridos están adjuntos
      for (var field in widget.fields) {
        if (field.type == 'FILE' && field.required && !_fileData.containsKey(field.fieldId)) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('El archivo ${field.label} es obligatorio')),
          );
          return;
        }
      }
      widget.onSaved(_formData, _fileData);
    }
  }
}
