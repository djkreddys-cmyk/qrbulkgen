import 'package:flutter/material.dart';

import '../widgets/app_components.dart';

class ScannerScreen extends StatelessWidget {
  const ScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
      children: [
        const SectionTitle(
          kicker: 'Scanner',
          title: 'Scan QR codes and inspect destinations.',
          body:
              'Camera scanning will be wired with a Flutter camera/scanner package in the next native pass.',
        ),
        const SizedBox(height: 16),
        AppCard(
          child: Column(
            children: [
              Container(
                height: 240,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: const Center(
                  child: Icon(Icons.qr_code_scanner_rounded,
                      color: Colors.white, size: 84),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Scanner placeholder',
                style: TextStyle(
                    color: appInk, fontWeight: FontWeight.w900, fontSize: 18),
              ),
              const SizedBox(height: 6),
              const Text(
                'Add mobile_scanner or qr_code_scanner after platform folders are generated.',
                textAlign: TextAlign.center,
                style: TextStyle(color: appMuted, height: 1.45),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
