import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  static const baseUrl = 'https://qrbulkgen-production.up.railway.app/api';

  final http.Client _client;

  Future<Map<String, dynamic>> request(
    String path, {
    String method = 'GET',
    Map<String, String>? headers,
    Object? body,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final requestHeaders = <String, String>{
      'Content-Type': 'application/json',
      ...?headers,
    };

    final response = switch (method.toUpperCase()) {
      'POST' => await _client.post(uri,
          headers: requestHeaders, body: _encodeBody(body)),
      'PUT' => await _client.put(uri,
          headers: requestHeaders, body: _encodeBody(body)),
      'DELETE' => await _client.delete(uri, headers: requestHeaders),
      _ => await _client.get(uri, headers: requestHeaders),
    };

    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? decoded['error'] is Map<String, dynamic>
              ? decoded['error']['message']?.toString()
              : decoded['message']?.toString()
          : null;
      throw ApiException(message ?? 'Request failed',
          statusCode: response.statusCode);
    }

    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }

  String? _encodeBody(Object? body) {
    if (body == null) return null;
    if (body is String) return body;
    return jsonEncode(body);
  }

  static Map<String, String> authHeaders(String token) {
    return token.isEmpty ? const {} : {'Authorization': 'Bearer $token'};
  }
}
