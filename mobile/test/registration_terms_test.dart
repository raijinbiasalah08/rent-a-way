import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/screens/auth_screen.dart';

class _Session extends SessionController {
  String? acceptedVersion;

  @override
  Future<void> registerCustomer({
    required String acceptedTermsVersion,
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    acceptedVersion = acceptedTermsVersion;
  }
}

void main() {
  testWidgets(
    'reading terms preserves signup details and submitting requires consent',
    (tester) async {
      final session = _Session();
      await tester.pumpWidget(MaterialApp(home: AuthScreen(session: session)));
      Future<void> tap(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      await tap(find.text('New to Rent-A-Way? Create account'));
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'New Renter');
      await tester.enterText(fields.at(1), 'new@example.test');
      await tester.enterText(fields.last, 'valid-password-123');
      await tap(find.text('Read the Terms and Conditions'));
      expect(find.text('Community conduct'), findsOneWidget);
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        false,
      );
      await tap(find.text('Read the Terms and Conditions'));
      final submit = find.text('Create customer account');
      await tap(submit);
      expect(session.acceptedVersion, isNull);
      expect(
        find.text('Agree to the Terms and Conditions to create your account.'),
        findsOneWidget,
      );
      await tap(find.byType(CheckboxListTile));
      await tap(submit);
      expect(session.acceptedVersion, '2026-11-17');
    },
  );
}
