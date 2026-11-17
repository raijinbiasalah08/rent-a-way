import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rentaway_mobile/core/theme.dart';

void main() {
  for (final reduced in [false, true]) {
    testWidgets('button press with reduced motion set to $reduced', (
      tester,
    ) async {
      var taps = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildRentAwayTheme(),
          home: MediaQuery(
            data: MediaQueryData(disableAnimations: reduced),
            child: Scaffold(
              body: Center(
                child: FilledButton(
                  onPressed: () => taps++,
                  child: const Text('Save'),
                ),
              ),
            ),
          ),
        ),
      );
      final button = find.byType(FilledButton);
      final size = tester.getSize(button);
      final gesture = await tester.startGesture(tester.getCenter(button));
      await tester.pumpAndSettle();
      final scale = find.descendant(
        of: button,
        matching: find.byType(AnimatedScale),
      );
      if (reduced) {
        expect(scale, findsNothing);
      } else {
        expect(tester.widget<AnimatedScale>(scale).scale, lessThan(1));
      }
      expect(tester.getSize(button), size);
      await gesture.up();
      await tester.pumpAndSettle();
      expect(taps, 1);
      if (!reduced) expect(tester.widget<AnimatedScale>(scale).scale, 1);
    });
  }
}
