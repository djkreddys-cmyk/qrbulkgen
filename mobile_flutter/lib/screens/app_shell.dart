import 'package:flutter/material.dart';

import '../core/app_state.dart';
import '../widgets/app_components.dart';
import 'analysis_screen.dart';
import 'generate_screen.dart';
import 'scanner_screen.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.appState});

  final AppState appState;

  @override
  Widget build(BuildContext context) {
    final screen = switch (appState.activeRoute) {
      AppRoute.generate => GenerateScreen(appState: appState),
      AppRoute.analysis => const AnalysisScreen(),
      AppRoute.scanner => const ScannerScreen(),
    };

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('QRBulkGen',
                style: TextStyle(fontWeight: FontWeight.w900)),
            Text(appState.displayName,
                style: const TextStyle(color: appMuted, fontSize: 12)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: appState.logout,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: screen,
      bottomNavigationBar: NavigationBar(
        selectedIndex: AppRoute.values.indexOf(appState.activeRoute),
        onDestinationSelected: (index) =>
            appState.setRoute(AppRoute.values[index]),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.auto_awesome_rounded), label: 'Generate'),
          NavigationDestination(
              icon: Icon(Icons.insights_rounded), label: 'Analysis'),
          NavigationDestination(
              icon: Icon(Icons.qr_code_scanner_rounded), label: 'Scanner'),
        ],
      ),
    );
  }
}
