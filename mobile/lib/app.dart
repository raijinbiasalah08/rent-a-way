import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/screens/account_screen.dart';
import 'package:rentaway_mobile/screens/browse_screen.dart';
import 'package:rentaway_mobile/screens/favorites_screen.dart';
import 'package:rentaway_mobile/screens/rentals_screen.dart';
import 'package:rentaway_mobile/screens/supplier_listings_screen.dart';
import 'package:rentaway_mobile/screens/admin_home_screen.dart';

class RentAwayHome extends StatefulWidget {
  const RentAwayHome({super.key, required this.session});

  final SessionController session;

  @override
  State<RentAwayHome> createState() => _RentAwayHomeState();
}

class _RentAwayHomeState extends State<RentAwayHome> {
  int _index = 0;

  bool get _isSupplier => widget.session.role == 'supplier';
  bool get _isAdmin => widget.session.role == 'admin';

  void _showBookings() => setState(() => _index = 2);

  @override
  Widget build(BuildContext context) {
    final destinations = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.explore_outlined),
        selectedIcon: Icon(Icons.explore),
        label: 'Explore',
      ),
      if (_isSupplier)
        const NavigationDestination(
          icon: Icon(Icons.inventory_2_outlined),
          selectedIcon: Icon(Icons.inventory_2),
          label: 'Listings',
        )
      else if (_isAdmin)
        const NavigationDestination(
          icon: Icon(Icons.admin_panel_settings_outlined),
          selectedIcon: Icon(Icons.admin_panel_settings),
          label: 'Admin',
        )
      else
        const NavigationDestination(
          icon: Icon(Icons.favorite_border),
          selectedIcon: Icon(Icons.favorite),
          label: 'Saved',
        ),
      NavigationDestination(
        icon: Icon(
          _isSupplier
              ? Icons.assignment_outlined
              : Icons.calendar_month_outlined,
        ),
        selectedIcon: Icon(
          _isSupplier ? Icons.assignment : Icons.calendar_month,
        ),
        label: _isSupplier ? 'Requests' : 'Rentals',
      ),
      const NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person),
        label: 'Account',
      ),
    ];

    final bodies = <Widget>[
      BrowseScreen(session: widget.session, onBookingComplete: _showBookings),
      if (_isSupplier)
        SupplierListingsScreen(session: widget.session)
      else if (_isAdmin)
        AdminHomeScreen(session: widget.session)
      else
        FavoritesScreen(
          session: widget.session,
          onBookingComplete: _showBookings,
        ),
      RentalsScreen(session: widget.session),
      AccountScreen(session: widget.session),
    ];

    if (_index >= bodies.length) _index = 0;
    return Scaffold(
      body: SafeArea(
        top: false,
        child: IndexedStack(index: _index, children: bodies),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: destinations,
      ),
    );
  }
}
