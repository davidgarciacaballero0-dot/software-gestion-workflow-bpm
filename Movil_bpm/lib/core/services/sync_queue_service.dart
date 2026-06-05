import 'package:hive_flutter/hive_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import 'package:uuid/uuid.dart';

class SyncOperation {
  final String id;
  final String type;
  final String targetId;
  final Map<String, dynamic> payload;
  final int timestamp;

  SyncOperation({
    required this.id,
    required this.type,
    required this.targetId,
    required this.payload,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'targetId': targetId,
        'payload': payload,
        'timestamp': timestamp,
      };

  factory SyncOperation.fromJson(Map<String, dynamic> json) => SyncOperation(
        id: json['id'],
        type: json['type'],
        targetId: json['targetId'],
        payload: Map<String, dynamic>.from(json['payload']),
        timestamp: json['timestamp'],
      );
}

class SyncQueueService {
  static const String boxName = 'syncQueueBox';
  final Dio _dio;
  final Connectivity _connectivity;

  SyncQueueService(this._dio, this._connectivity);

  Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox<String>(boxName);

    _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty && results.first != ConnectivityResult.none) {
        syncPendingOperations();
      }
    });
  }

  Future<void> enqueueOperation(String type, String targetId, Map<String, dynamic> payload) async {
    final box = Hive.box<String>(boxName);
    final op = SyncOperation(
      id: const Uuid().v4(),
      type: type,
      targetId: targetId,
      payload: payload,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
    await box.put(op.id, jsonEncode(op.toJson()));

    // Attempt sync immediately if online
    final results = await _connectivity.checkConnectivity();
    if (results.isNotEmpty && results.first != ConnectivityResult.none) {
      syncPendingOperations();
    }
  }

  Future<void> syncPendingOperations() async {
    final box = Hive.box<String>(boxName);
    if (box.isEmpty) return;

    final operationsJson = box.values.toList();
    final operations = operationsJson.map((jsonStr) => SyncOperation.fromJson(jsonDecode(jsonStr))).toList();
    
    // Sort by timestamp
    operations.sort((a, b) => a.timestamp.compareTo(b.timestamp));

    try {
      final response = await _dio.post('/api/v1/sync/batch', data: operations.map((o) => o.toJson()).toList());
      if (response.statusCode == 200) {
        final successIds = List<String>.from(response.data['successIds']);
        for (String id in successIds) {
          await box.delete(id);
        }
        print('Synced \${successIds.length} operations successfully');
      }
    } catch (e) {
      print('Error syncing batch: \$e');
    }
  }
}
