import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:rentaway_mobile/core/api_client.dart';

class SessionController extends ChangeNotifier {
  final ApiClient api = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Map<String, dynamic>? user;
  bool isReady = false;

  bool get isSignedIn => user != null;
  String get role => user?['role']?.toString() ?? 'customer';

  Future<void> restore() async {
    try {
      final savedToken = await _storage.read(key: 'rentaway_token');
      if (savedToken != null && savedToken.isNotEmpty) {
        api.token = savedToken;
        final response = await api.get('auth/me');
        user = _asMap(response['data']);
      }
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        api.token = null;
        await _storage.delete(key: 'rentaway_token');
      }
    } catch (_) {
      // Keep a saved token when the network is temporarily unavailable.
    } finally {
      isReady = true;
      notifyListeners();
    }
  }

  Future<void> signIn(String email, String password) async {
    final response = await api.post(
      'auth/login',
      body: {'email': email.trim(), 'password': password},
    );
    await _saveSession(_asMap(response['data']));
  }

  Future<void> registerCustomer({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final response = await api.post(
      'auth/register',
      body: {
        'name': name.trim(),
        'email': email.trim(),
        'password': password,
        'role': 'customer',
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      },
    );
    await _saveSession(_asMap(response['data']));
  }

  Future<void> registerSupplier({
    required String name,
    required String email,
    required String password,
    required String phone,
    required String address,
    required String barangay,
    required double latitude,
    required double longitude,
  }) async {
    final response = await api.post(
      'auth/register',
      body: {
        'name': name.trim(),
        'email': email.trim(),
        'password': password,
        'role': 'supplier',
        'phone': phone.trim(),
        'address': address.trim(),
        'barangay': barangay,
        'latitude': latitude,
        'longitude': longitude,
      },
    );
    await _saveSession(_asMap(response['data']));
  }

  Future<void> updateProfile({
    required String name,
    required String phone,
    required String address,
  }) async {
    final response = await api.put(
      'auth/profile',
      body: {
        'name': name.trim(),
        'phone': phone.trim(),
        'address': address.trim(),
      },
    );
    user = _asMap(response['data']);
    notifyListeners();
  }

  Future<void> _saveSession(Map<String, dynamic> data) async {
    final accessToken = data['token']?.toString();
    if (accessToken == null || accessToken.isEmpty) {
      throw const ApiException('The server did not return a sign-in token.');
    }
    api.token = accessToken;
    await _storage.write(key: 'rentaway_token', value: accessToken);
    user = _asMap(data['user']);
    notifyListeners();
  }

  Future<void> signOut() async {
    api.token = null;
    user = null;
    await _storage.delete(key: 'rentaway_token');
    notifyListeners();
  }
}

Map<String, dynamic> _asMap(dynamic value) =>
    value is Map<String, dynamic> ? value : <String, dynamic>{};
