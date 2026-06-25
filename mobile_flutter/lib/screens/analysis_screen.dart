import 'package:flutter/material.dart';

import '../widgets/app_components.dart';

class AnalysisScreen extends StatelessWidget {
  const AnalysisScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
      children: [
        const SectionTitle(
          kicker: 'Analysis',
          title: 'Track jobs, scans, and engagement.',
          body:
              'This Flutter screen sets the visual system for the dashboard before the full job analytics list is migrated.',
        ),
        const SizedBox(height: 16),
        const AppCard(
          child: Column(
            children: [
              Row(
                children: [
                  MetricTile(label: 'QR jobs', value: '36'),
                  SizedBox(width: 10),
                  MetricTile(label: 'Scans', value: '0', color: appBlue),
                ],
              ),
              SizedBox(height: 10),
              Row(
                children: [
                  MetricTile(label: 'Success', value: '100%', color: appGreen),
                  SizedBox(width: 10),
                  MetricTile(label: 'Issues', value: '0'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Migration note',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              const Text(
                'The React Native dashboard has a large analytics surface. This Flutter rebuild establishes the mobile UI shell first; the next step is porting job list, analysis filters, edit actions, archive/delete, and sharing.',
                style: TextStyle(color: appMuted, height: 1.45),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
