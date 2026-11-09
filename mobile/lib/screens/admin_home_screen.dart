import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/screens/admin_records_screen.dart';

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await widget.session.api.get('admin/stats');
      final data = response['data'];
      if (mounted) {
        setState(
          () => _stats = data is Map ? Map<String, dynamic>.from(data) : {},
        );
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _load,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 30),
      children: [
        const Text(
          'Admin overview',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F1729),
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'Platform activity at a glance.',
          style: TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 18),
        if (_loading)
          const Padding(
            padding: EdgeInsets.all(40),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_error != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: _load,
                    child: const Text('Try again'),
                  ),
                ],
              ),
            ),
          )
        else
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 11,
            crossAxisSpacing: 11,
            childAspectRatio: 1.35,
            children: [
              _Metric(
                label: 'Users',
                value: _stats['totalUsers'],
                icon: Icons.people_outline,
                color: const Color(0xFF1F4F91),
              ),
              _Metric(
                label: 'Active listings',
                value: _stats['totalProducts'],
                icon: Icons.inventory_2_outlined,
                color: const Color(0xFF218838),
              ),
              _Metric(
                label: 'Rental requests',
                value: _stats['totalRentals'],
                icon: Icons.calendar_month_outlined,
                color: const Color(0xFF8B5CF6),
              ),
              _Metric(
                label: 'Active rentals',
                value: _stats['activeRentals'],
                icon: Icons.handyman_outlined,
                color: const Color(0xFF0F766E),
              ),
              _Metric(
                label: 'Pending requests',
                value: _stats['pendingRentals'],
                icon: Icons.pending_actions_outlined,
                color: const Color(0xFF9A6700),
              ),
              _Metric(
                label: 'Open complaints',
                value: _stats['openComplaints'],
                icon: Icons.flag_outlined,
                color: const Color(0xFFB42318),
              ),
            ],
          ),
        const SizedBox(height: 16),
        const Text(
          'Management',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F1729),
          ),
        ),
        const SizedBox(height: 10),
        _AdminShortcut(
          icon: Icons.people_outline,
          title: 'Users',
          detail: 'Review roles and account access',
          onTap: () => _open(context, 'users'),
        ),
        const SizedBox(height: 8),
        _AdminShortcut(
          icon: Icons.inventory_2_outlined,
          title: 'Listings',
          detail: 'Review and activate equipment',
          onTap: () => _open(context, 'products'),
        ),
        const SizedBox(height: 8),
        _AdminShortcut(
          icon: Icons.flag_outlined,
          title: 'Complaints',
          detail: 'Review and update reported issues',
          onTap: () => _open(context, 'complaints'),
        ),
        const SizedBox(height: 8),
        _AdminShortcut(
          icon: Icons.bar_chart_outlined,
          title: 'Reports',
          detail: 'See rental activity summaries',
          onTap: () => _open(context, 'reports'),
        ),
      ],
    ),
  );

  void _open(BuildContext context, String section) {
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) =>
            AdminRecordsScreen(session: widget.session, section: section),
      ),
    );
  }
}

class _AdminShortcut extends StatelessWidget {
  const _AdminShortcut({
    required this.icon,
    required this.title,
    required this.detail,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final String detail;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      onTap: onTap,
      leading: Icon(icon, color: const Color(0xFF1F4F91)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(detail),
      trailing: const Icon(Icons.chevron_right_rounded),
    ),
  );
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });
  final String label;
  final dynamic value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value?.toString() ?? '—',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 23,
                  color: Color(0xFF0F1729),
                ),
              ),
              const SizedBox(height: 1),
              Text(
                label,
                style: const TextStyle(color: Colors.black54, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
