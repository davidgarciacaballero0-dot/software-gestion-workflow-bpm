import 'package:dio/dio.dart';
import '../services/sync_queue_service.dart';

class OfflineInterceptor extends Interceptor {
  final SyncQueueService syncQueueService;

  OfflineInterceptor(this.syncQueueService);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Check if error is due to network failure
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        err.error != null && err.error.toString().contains('SocketException')) {
      
      // If it's a mutating request (POST, PUT, PATCH, DELETE), queue it for later
      final method = err.requestOptions.method.toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].contains(method)) {
        
        // Basic mapping of endpoint to operation type
        String opType = 'UNKNOWN';
        String targetId = '';
        
        if (err.requestOptions.path.contains('/api/v1/tramites')) {
            opType = method == 'POST' ? 'CREATE_TRAMITE' : 'UPDATE_TRAMITE';
            // Try to extract ID from URL if PUT/PATCH
            final parts = err.requestOptions.path.split('/');
            targetId = parts.last;
        }
        
        if (opType != 'UNKNOWN') {
            await syncQueueService.enqueueOperation(
              opType, 
              targetId, 
              err.requestOptions.data is Map ? err.requestOptions.data : {}
            );
            
            // Return a mock success response so the UI doesn't crash,
            // or return a specific error indicating offline queued status.
            return handler.resolve(Response(
              requestOptions: err.requestOptions,
              statusCode: 202, // Accepted for processing later
              data: {'message': 'Operación guardada para sincronización offline.'}
            ));
        }
      }
    }
    
    super.onError(err, handler);
  }
}
