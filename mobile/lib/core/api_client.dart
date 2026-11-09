import 'dart:async';
import 'dart:convert';
import 'dart:io';

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

  final http.Client _client;
  String? token;

  static const _configuredOrigin = String.fromEnvironment(
    'RENT_AWAY_API_ORIGIN',
  );

  String get origin {
    if (_configuredOrigin.trim().isNotEmpty) {
      return _configuredOrigin.trim().replaceAll(RegExp(r'/+$'), '');
    }
    if (Platform.isAndroid) return 'http://10.0.2.2:5000';
    return 'http://127.0.0.1:5000';
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse('$origin/api/');
    return base
        .resolve(path.replaceFirst(RegExp(r'^/+'), ''))
        .replace(queryParameters: (query?.isEmpty ?? true) ? null : query);
  }

  Uri assetUri(String? path) {
    if (path == null || path.isEmpty) return Uri();
    final parsed = Uri.tryParse(path);
    if (parsed != null &&
        (parsed.scheme == 'http' || parsed.scheme == 'https')) {
      return parsed;
    }
    return Uri.parse('$origin/').resolve(path.replaceFirst(RegExp(r'^/+'), ''));
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, query: query);

  Future<Map<String, dynamic>> post(String path, {Object? body}) =>
      _send('POST', path, body: body);

  Future<Map<String, dynamic>> put(String path, {Object? body}) =>
      _send('PUT', path, body: body);

  Future<Map<String, dynamic>> delete(String path) => _send('DELETE', path);

  Future<Map<String, dynamic>> uploadProductImage(
    String productId,
    String filePath,
  ) async {
    final request = http.MultipartRequest(
      'POST',
      _uri('products/$productId/images'),
    );
    if (token case final value?) {
      request.headers['Authorization'] = 'Bearer $value';
    }
    request.files.add(await http.MultipartFile.fromPath('image', filePath));
    try {
      final streamed = await _client
          .send(request)
          .timeout(const Duration(seconds: 45));
      final response = await http.Response.fromStream(streamed);
      final decoded = response.body.isEmpty
          ? <String, dynamic>{}
          : (jsonDecode(response.body) as Map).cast<String, dynamic>();
      if (response.statusCode < 200 ||
          response.statusCode >= 300 ||
          decoded['success'] == false) {
        throw ApiException(
          decoded['message']?.toString() ?? 'Image upload failed.',
          statusCode: response.statusCode,
        );
      }
      return decoded;
    } on ApiException {
      rethrow;
    } on SocketException {
      throw const ApiException(
        'Could not reach Rent-A-Way. Check your connection.',
      );
    } on http.ClientException {
      throw const ApiException('Could not connect to the Rent-A-Way server.');
    }
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
  }) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token case final value?) headers['Authorization'] = 'Bearer $value';
    final request = http.Request(method, _uri(path, query))
      ..headers.addAll(headers);
    if (body != null) request.body = jsonEncode(body);

    try {
      final streamed = await _client
          .send(request)
          .timeout(const Duration(seconds: 25));
      final response = await http.Response.fromStream(streamed);
      Map<String, dynamic> decoded = <String, dynamic>{};
      if (response.body.isNotEmpty) {
        final value = jsonDecode(response.body);
        if (value is Map<String, dynamic>) decoded = value;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(
          decoded['message']?.toString() ?? 'Unable to complete the request.',
          statusCode: response.statusCode,
        );
      }
      if (decoded['success'] == false) {
        throw ApiException(decoded['message']?.toString() ?? 'Request failed.');
      }
      return decoded;
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw const ApiException('The server took too long to respond.');
    } on FormatException {
      throw const ApiException('The server returned an unreadable response.');
    } on SocketException {
      throw const ApiException(
        'Could not reach Rent-A-Way. Check your connection and API address.',
      );
    } on http.ClientException {
      throw const ApiException('Could not connect to the Rent-A-Way server.');
    }
  }
}
