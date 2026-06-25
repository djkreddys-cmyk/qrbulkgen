import 'package:flutter/material.dart';

import 'core/app_state.dart';
import 'screens/app_shell.dart';
import 'screens/auth_screen.dart';
import 'widgets/app_components.dart';

void main() {
  runApp(const QRBulkGenFlutterApp());
}

class QRBulkGenFlutterApp extends StatefulWidget {
  const QRBulkGenFlutterApp({super.key});

  @override
  State<QRBulkGenFlutterApp> createState() => _QRBulkGenFlutterAppState();
}

class _QRBulkGenFlutterAppState extends State<QRBulkGenFlutterApp> {
  late final AppState appState;

  @override
  void initState() {
    super.initState();
    appState = AppState()..addListener(_handleStateChanged);
    appState.bootstrap();
  }

  @override
  void dispose() {
    appState.removeListener(_handleStateChanged);
    super.dispose();
  }

  void _handleStateChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QRBulkGen',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
            seedColor: appInk, brightness: Brightness.light),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF4F7FB),
        fontFamily: 'Roboto',
      ),
      home: appState.isBootstrapping
          ? const _BootScreen()
          : appState.isAuthenticated
              ? AppShell(appState: appState)
              : AuthScreen(appState: appState),
    );
  }
}

class _BootScreen extends StatelessWidget {
  const _BootScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionTitle(
                kicker: 'QRBulkGen',
                title: 'Restoring mobile session',
                body: 'Preparing your Flutter workspace.',
              ),
              SizedBox(height: 24),
              LinearProgressIndicator(),
            ],
          ),
        ),
      ),
    );
  }
}
