import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/core/theme.dart';
import 'package:rentaway_mobile/screens/supplier_listings_screen.dart';

class _ListingApi extends ApiClient {
  bool canPublish = false;
  String? requestedPlan;

  Map<String, dynamic> get status => {
    'canPublish': canPublish,
    'currentPlan': canPublish ? 'student' : 'free',
    'requestedPlan': requestedPlan,
    'packages': [
      {
        'id': 'free',
        'name': 'Free Account',
        'monthlyPrice': 0,
        'benefits': ['One active rental upload'],
      },
      {
        'id': 'student',
        'name': 'Premium Student',
        'monthlyPrice': 80,
        'benefits': ['Unlimited rental uploads'],
      },
    ],
  };

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
  }) async {
    if (path == 'products/mine') {
      return {
        'data': [
          {'id': '1', 'title': 'Camera'},
        ],
      };
    }
    expect(path, 'subscriptions/me');
    return {'data': status};
  }

  @override
  Future<Map<String, dynamic>> put(String path, {Object? body}) async {
    expect(path, 'subscriptions/request');
    requestedPlan = (body as Map)['plan'] as String;
    return {'data': status};
  }
}

class _ListingSession extends SessionController {
  final _listingApi = _ListingApi();

  @override
  _ListingApi get api => _listingApi;
}

void main() {
  testWidgets(
    'Add opens packages at the limit and the listing form after activation',
    (tester) async {
      final session = _ListingSession();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildRentAwayTheme(),
          home: Scaffold(body: SupplierListingsScreen(session: session)),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();
      expect(find.text('Subscription Packages'), findsOneWidget);
      expect(find.text('New equipment listing'), findsNothing);
      final request = find.text('Request Premium Student');
      await tester.ensureVisible(request);
      await tester.tap(request);
      await tester.pumpAndSettle();
      expect(session.api.requestedPlan, 'student');
      expect(find.text('Request pending'), findsOneWidget);

      await tester.ensureVisible(find.byTooltip('Close'));
      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();
      session.api.canPublish = true;
      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();
      expect(find.text('New equipment listing'), findsOneWidget);
      expect(find.text('Subscription Packages'), findsNothing);
    },
  );
}
