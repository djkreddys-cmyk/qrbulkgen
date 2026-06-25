import 'dart:convert';

import 'package:flutter/material.dart';

import '../core/app_state.dart';
import '../widgets/app_components.dart';

enum GenerateType { qr, shortUrl, barcode, label }

enum GenerateMode { single, bulk }

class GenerateScreen extends StatefulWidget {
  const GenerateScreen({super.key, required this.appState});

  final AppState appState;

  @override
  State<GenerateScreen> createState() => _GenerateScreenState();
}

class _GenerateScreenState extends State<GenerateScreen> {
  GenerateType type = GenerateType.qr;
  GenerateMode mode = GenerateMode.single;

  final contentController =
      TextEditingController(text: 'https://qrbulkgen.com');
  final fileNameController = TextEditingController(text: 'mobile-qr');
  final foregroundController = TextEditingController(text: '#000000');
  final backgroundController = TextEditingController(text: '#ffffff');
  String qrType = 'URL';
  bool isGenerating = false;
  String message = '';
  Map<String, dynamic>? latestJob;

  @override
  void dispose() {
    contentController.dispose();
    fileNameController.dispose();
    foregroundController.dispose();
    backgroundController.dispose();
    super.dispose();
  }

  Future<void> generateSingleQr() async {
    setState(() {
      isGenerating = true;
      message = '';
    });

    try {
      final data = await widget.appState.generateSingleQr({
        'content': contentController.text.trim(),
        'qrType': qrType,
        'fields': {
          'url': contentController.text.trim(),
          'text': contentController.text.trim()
        },
        'filenamePrefix': fileNameController.text.trim().isEmpty
            ? 'mobile-qr'
            : fileNameController.text.trim(),
        'foregroundColor': foregroundController.text.trim(),
        'backgroundColor': backgroundController.text.trim(),
        'size': 512,
        'margin': 2,
        'format': 'png',
        'errorCorrectionLevel': 'M',
      });
      setState(() {
        latestJob = data['job'] is Map<String, dynamic>
            ? data['job'] as Map<String, dynamic>
            : null;
        message = 'QR generated successfully.';
      });
    } catch (exception) {
      setState(() => message = exception.toString());
    } finally {
      setState(() => isGenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
      children: [
        const SectionTitle(
          kicker: 'Generate',
          title: 'Create QR assets from your phone.',
          body:
              'The Flutter rebuild starts with the same workspace shape as web: QR, short URL, barcode, and label flows.',
        ),
        const SizedBox(height: 16),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SegmentedPills<GenerateType>(
                value: type,
                options: const [
                  SegmentOption('QR', GenerateType.qr),
                  SegmentOption('Short', GenerateType.shortUrl),
                  SegmentOption('Barcode', GenerateType.barcode),
                  SegmentOption('Label', GenerateType.label),
                ],
                onChanged: (value) => setState(() => type = value),
              ),
              const SizedBox(height: 12),
              SegmentedPills<GenerateMode>(
                value: mode,
                options: const [
                  SegmentOption('Single', GenerateMode.single),
                  SegmentOption('Bulk', GenerateMode.bulk),
                ],
                onChanged: (value) => setState(() => mode = value),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (type == GenerateType.qr && mode == GenerateMode.single)
          _SingleQrCard(
            qrType: qrType,
            onQrTypeChanged: (value) => setState(() => qrType = value),
            contentController: contentController,
            fileNameController: fileNameController,
            foregroundController: foregroundController,
            backgroundController: backgroundController,
            isGenerating: isGenerating,
            onGenerate: generateSingleQr,
            message: message,
            latestJob: latestJob,
          )
        else
          _RoadmapCard(type: type, mode: mode),
      ],
    );
  }
}

class _SingleQrCard extends StatelessWidget {
  const _SingleQrCard({
    required this.qrType,
    required this.onQrTypeChanged,
    required this.contentController,
    required this.fileNameController,
    required this.foregroundController,
    required this.backgroundController,
    required this.isGenerating,
    required this.onGenerate,
    required this.message,
    required this.latestJob,
  });

  final String qrType;
  final ValueChanged<String> onQrTypeChanged;
  final TextEditingController contentController;
  final TextEditingController fileNameController;
  final TextEditingController foregroundController;
  final TextEditingController backgroundController;
  final bool isGenerating;
  final VoidCallback onGenerate;
  final String message;
  final Map<String, dynamic>? latestJob;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Single QR Generator',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: qrType,
            decoration: InputDecoration(
              labelText: 'QR type',
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
            items: const [
              'URL',
              'Text',
              'Email',
              'Phone',
              'WIFI',
              'Location',
              'Event'
            ]
                .map((value) =>
                    DropdownMenuItem(value: value, child: Text(value)))
                .toList(),
            onChanged: (value) {
              if (value != null) onQrTypeChanged(value);
            },
          ),
          const SizedBox(height: 12),
          AppTextField(
              label: 'Content',
              controller: contentController,
              hint: 'https://example.com',
              maxLines: 3),
          const SizedBox(height: 12),
          AppTextField(
              label: 'File name',
              controller: fileNameController,
              hint: 'mobile-qr'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                  child: AppTextField(
                      label: 'Foreground',
                      controller: foregroundController,
                      hint: '#000000')),
              const SizedBox(width: 12),
              Expanded(
                  child: AppTextField(
                      label: 'Background',
                      controller: backgroundController,
                      hint: '#ffffff')),
            ],
          ),
          const SizedBox(height: 16),
          PrimaryButton(
              label: 'Generate QR',
              onPressed: onGenerate,
              isBusy: isGenerating),
          if (message.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(message,
                style: TextStyle(
                    color: message.contains('success')
                        ? appGreen
                        : const Color(0xFFB91C1C))),
          ],
          if (latestJob != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: appPanel,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: appLine)),
              child: Text(
                const JsonEncoder.withIndent('  ').convert(latestJob),
                style: const TextStyle(
                    fontFamily: 'monospace', fontSize: 12, color: appMuted),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _RoadmapCard extends StatelessWidget {
  const _RoadmapCard({required this.type, required this.mode});

  final GenerateType type;
  final GenerateMode mode;

  @override
  Widget build(BuildContext context) {
    final label = switch (type) {
      GenerateType.shortUrl => 'Short URL',
      GenerateType.barcode => 'Barcode',
      GenerateType.label => 'Label',
      GenerateType.qr => 'QR',
    };
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$label ${mode == GenerateMode.single ? 'single' : 'bulk'} flow',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          const Text(
            'This screen is scaffolded in Flutter and ready for the next migration pass. The existing React Native app currently uses placeholders for several of these flows too.',
            style: TextStyle(color: appMuted, height: 1.45),
          ),
          const SizedBox(height: 14),
          const Row(
            children: [
              MetricTile(label: 'Status', value: 'Ready'),
              SizedBox(width: 10),
              MetricTile(label: 'Next', value: 'API'),
            ],
          ),
        ],
      ),
    );
  }
}
