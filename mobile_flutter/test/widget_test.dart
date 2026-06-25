import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:qrbulkgen_mobile_flutter/widgets/app_components.dart';

void main() {
  testWidgets('renders QRBulkGen section title', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SectionTitle(
            kicker: 'QRBulkGen',
            title: 'Mobile rebuild',
            body: 'Flutter interface',
          ),
        ),
      ),
    );

    expect(find.text('QRBulkGen'), findsOneWidget);
    expect(find.text('Mobile rebuild'), findsOneWidget);
  });
}
