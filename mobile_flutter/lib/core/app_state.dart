import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'session_store.dart';

enum AppRoute { generate, analysis, scanner }

class AppState extends ChangeNotifier {
  AppState({ApiClient? apiClient, SessionStore? sessionStore})
      : _apiClient = apiClient ?? ApiClient(),
        _sessionStore = sessionStore ?? SessionStore();

  final ApiClient _apiClient;
  final SessionStore _sessionStore;

  bool isBootstrapping = true;
  bool isSubmitting = false;
  String error = '';
  String token = '';
  Map<String, dynamic>? user;
  AppRoute activeRoute = AppRoute.analysis;

  bool get isAuthenticated => token.isNotEmpty && user != null;
  String get displayName => user?['name']?.toString().trim().isNotEmpty == true
      ? user!['name'].toString()
      : user?['email']?.toString() ?? 'QRBulkGen user';

  Future<void> bootstrap() async {
    try {
      final stored = await _sessionStore.load();
      if (stored == null || stored.token.isEmpty) return;

      final data = await _apiClient.request(
        '/auth/me',
        headers: ApiClient.authHeaders(stored.token),
      );
      token = stored.token;
      user = data['user'] is Map<String, dynamic>
          ? data['user'] as Map<String, dynamic>
          : stored.user;
    } catch (_) {
      await _sessionStore.clear();
    } finally {
      isBootstrapping = false;
      notifyListeners();
    }
  }

  Future<void> login(
      {required String identifier, required String password}) async {
    await _submitAuth('/auth/login', {
      'identifier': identifier,
      'password': password,
    });
  }

  Future<void> register(
      {required String name,
      required String identifier,
      required String password}) async {
    await _submitAuth('/auth/register', {
      'name': name,
      'identifier': identifier,
      'password': password,
    });
  }

  Future<void> _submitAuth(String path, Map<String, String> payload) async {
    error = '';
    isSubmitting = true;
    notifyListeners();
    try {
      final data =
          await _apiClient.request(path, method: 'POST', body: payload);
      token = data['token']?.toString() ?? '';
      user = data['user'] is Map<String, dynamic>
          ? data['user'] as Map<String, dynamic>
          : <String, dynamic>{};
      activeRoute = AppRoute.analysis;
      await _sessionStore
          .save(StoredSession(token: token, user: user ?? <String, dynamic>{}));
    } catch (exception) {
      error = exception.toString();
      rethrow;
    } finally {
      isSubmitting = false;
      notifyListeners();
    }
  }

  void setRoute(AppRoute route) {
    activeRoute = route;
    notifyListeners();
  }

  Future<Map<String, dynamic>> generateSingleQr(Map<String, dynamic> payload) {
    return _apiClient.request(
      '/qr/single',
      method: 'POST',
      headers: ApiClient.authHeaders(token),
      body: payload,
    );
  }

  Future<void> logout() async {
    token = '';
    user = null;
    activeRoute = AppRoute.analysis;
    error = '';
    await _sessionStore.clear();
    notifyListeners();
  }
}
