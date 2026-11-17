import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/screens/browse_screen.dart';

class _SearchApi extends ApiClient {
  final firstSearch = Completer<Map<String, dynamic>>();

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
  }) async {
    if (query?['search'] == 'camera') return firstSearch.future;
    final items = query?['search'] == 'missing'
        ? []
        : [
            {'id': '1', 'title': 'Camping tent'},
          ];
    return {
      'data': {'products': items, 'totalPages': 1},
    };
  }
}

class _Session extends SessionController {
  final _search = _SearchApi();
  @override
  _SearchApi get api => _search;
}

void main() {
  testWidgets(
    'late searches cannot replace newer results and clearing filters restores the catalog',
    (tester) async {
      final session = _Session();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BrowseScreen(session: session, onBookingComplete: () {}),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final search = find.byType(TextField);
      await tester.enterText(search, 'camera');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.enterText(search, 'missing');
      await tester.pump(const Duration(milliseconds: 400));
      session.api.firstSearch.complete({
        'data': {
          'products': [
            {'id': '2', 'title': 'Old result'},
          ],
        },
      });
      await tester.pumpAndSettle();
      expect(find.text('Old result'), findsNothing);
      final reset = find.text('Clear filters');
      await tester.ensureVisible(reset);
      await tester.tap(reset);
      await tester.pumpAndSettle();
      expect(find.text('Camping tent'), findsOneWidget);
    },
  );
}
