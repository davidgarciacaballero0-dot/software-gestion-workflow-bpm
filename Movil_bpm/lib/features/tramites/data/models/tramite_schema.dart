import 'package:isar/isar.dart';

part 'tramite_schema.g.dart';

@collection
class TramiteOffline {
  Id id = Isar.autoIncrement;

  @Index(unique: true)
  late String localId;

  late String nombreTramite;
  late String jsonFormularioData; // Respuestas del usuario en JSON String
  
  late bool synced; // Si ya fue enviado al backend

  @Index()
  late DateTime fechaCreacion;
}
