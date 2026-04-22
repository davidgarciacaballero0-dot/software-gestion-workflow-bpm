// ─────────────────────────────────────────────────────────────
// lib/features/auth/domain/models/user_model.dart
// Entidad de dominio: el Usuario autenticado (Cliente Final).
// Homogénea con AuthResponseDTO del backend Spring Boot.
// ─────────────────────────────────────────────────────────────

class UserModel {
  final String id;
  final String token;
  final String nombre;
  final String apellidos;
  final String email;
  final String ci;
  final String celular;
  final String fechaNacimiento;
  final String createdAt;
  final String idRol;
  final String? idOrganizacion;  // null para CLIENTE (sin organización)
  final String? idDepartamento;  // null para CLIENTE (sin departamento)
  final bool esJefe;
  final String nombreRol;        // "CLIENTE" — homogéneo con DataInitializer

  const UserModel({
    required this.id,
    required this.token,
    required this.nombre,
    required this.apellidos,
    required this.email,
    required this.ci,
    required this.celular,
    required this.fechaNacimiento,
    required this.createdAt,
    required this.idRol,
    this.idOrganizacion,
    this.idDepartamento,
    required this.esJefe,
    required this.nombreRol,
  });

  /// Deserializa el JSON del endpoint /login y /register del backend
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id:              json['id']              as String,
      token:           json['token']           as String,
      nombre:          json['nombre']          as String,
      apellidos:       json['apellidos']       as String? ?? '',
      email:           json['email']           as String,
      ci:              json['ci']              as String? ?? '',
      celular:         json['celular']         as String? ?? '',
      fechaNacimiento: json['fechaNacimiento'] as String? ?? '',
      createdAt:       json['createdAt']       as String? ?? '',
      idRol:           json['idRol']           as String,
      idOrganizacion:  json['idOrganizacion']  as String?,
      idDepartamento:  json['idDepartamento']  as String?,
      esJefe:          json['esJefe']          as bool? ?? false,
      nombreRol:       json['nombreRol']       as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id':              id,
    'token':           token,
    'nombre':          nombre,
    'apellidos':       apellidos,
    'email':           email,
    'ci':              ci,
    'celular':         celular,
    'fechaNacimiento': fechaNacimiento,
    'createdAt':       createdAt,
    'idRol':           idRol,
    'idOrganizacion':  idOrganizacion,
    'idDepartamento':  idDepartamento,
    'esJefe':          esJefe,
    'nombreRol':       nombreRol,
  };

  /// Nombre completo para mostrar en la UI
  String get nombreCompleto => '$nombre $apellidos'.trim();

  /// El usuario es cliente si su rol es "CLIENTE" (sin org/depto)
  bool get esCliente => nombreRol == 'CLIENTE';
}
