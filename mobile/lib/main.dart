import 'dart:async';

import 'package:flutter/material.dart';
import 'package:rentaway_mobile/app.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/core/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final session = SessionController();
  runApp(RentAwayApp(session: session));
  unawaited(session.restore());
}

class RentAwayApp extends StatelessWidget {
  const RentAwayApp({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rent-A-Way',
      debugShowCheckedModeBanner: false,
      theme: buildRentAwayTheme(),
      home: AnimatedBuilder(
        animation: session,
        builder: (context, _) {
          if (!session.isReady) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return RentAwayHome(session: session);
        },
      ),
    );
  }
}
