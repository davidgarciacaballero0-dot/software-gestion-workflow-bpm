import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';

class IsarConfig {
  IsarConfig._();

  static late Isar _instance;
  static Isar get instance => _instance;

  static Future<void> init() async {
    final dir = await getApplicationDocumentsDirectory();
    // Aquí inicializaremos la instancia de Isar con nuestros schemas
    // Ejemplo: _instance = await Isar.open([TramiteSchema], directory: dir.path);
    _instance = await Isar.open([], directory: dir.path); // Temporalmente vacío hasta crear schemas
  }
}
