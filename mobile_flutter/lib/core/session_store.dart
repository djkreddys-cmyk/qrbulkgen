import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class SessionStore {
  static const _key = 'qrbulkgen.mobile.flutter.auth';

  Future<StoredSession?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return null;

    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      return StoredSession.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  Future<void> save(StoredSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(session.toJson()));
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}

class StoredSession {
  const StoredSession({required this.token, required this.user});

  final String token;
  final Map<String, dynamic> user;

  factory StoredSession.fromJson(Map<String, dynamic> json) {
    return StoredSession(
      token: json['token']?.toString() ?? '',
      user: json['user'] is Map<String, dynamic>
          ? json['user'] as Map<String, dynamic>
          : <String, dynamic>{},
    );
  }

  Map<String, dynamic> toJson() => {
        'token': token,
        'user': user,
      };
}
