import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
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
      final response = await widget.session.api.get(
        'notifications',
        query: const {'page': '1', 'limit': '50'},
      );
      final data = response['data'];
      final raw = data is Map ? data['notifications'] : null;
      if (mounted) {
        setState(
          () => _items = raw is List
              ? raw
                    .whereType<Map>()
                    .map((item) => Map<String, dynamic>.from(item))
                    .toList()
              : [],
        );
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAll() async {
    try {
      await widget.session.api.put('notifications/read-all');
      if (mounted) {
        setState(() {
          for (final item in _items) {
            item['is_read'] = 1;
          }
        });
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _markRead(Map<String, dynamic> item) async {
    if (item['is_read'] == 1 || item['is_read'] == true) return;
    try {
      await widget.session.api.put('notifications/${item['id']}/read');
      if (mounted) setState(() => item['is_read'] = 1);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Notifications'),
      actions: [
        if (_items.any(
          (item) => item['is_read'] == 0 || item['is_read'] == false,
        ))
          IconButton(
            tooltip: 'Mark all read',
            onPressed: _markAll,
            icon: const Icon(Icons.done_all),
          ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: _loading
          ? ListView(
              children: [
                SizedBox(
                  height: 240,
                  child: Center(child: CircularProgressIndicator()),
                ),
              ],
            )
          : _error != null
          ? ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      TextButton(
                        onPressed: _load,
                        child: const Text('Try again'),
                      ),
                    ],
                  ),
                ),
              ],
            )
          : _items.isEmpty
          ? ListView(
              children: [
                Padding(
                  padding: EdgeInsets.all(40),
                  child: Column(
                    children: [
                      Icon(
                        Icons.notifications_none_rounded,
                        size: 44,
                        color: Color(0xFF718096),
                      ),
                      SizedBox(height: 12),
                      Text(
                        'You are all caught up.',
                        style: TextStyle(color: Colors.black54),
                      ),
                    ],
                  ),
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
              itemCount: _items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = _items[index];
                final read = item['is_read'] == 1 || item['is_read'] == true;
                final date = DateTime.tryParse(
                  item['created_at']?.toString() ?? '',
                );
                return Card(
                  color: read ? Colors.white : const Color(0xFFF0F5FB),
                  child: ListTile(
                    onTap: () => _markRead(item),
                    leading: Icon(
                      read
                          ? Icons.notifications_none
                          : Icons.notifications_active_outlined,
                      color: read ? Colors.black45 : const Color(0xFF1F4F91),
                    ),
                    title: Text(
                      item['title']?.toString() ?? 'Update',
                      style: TextStyle(
                        fontWeight: read ? FontWeight.w600 : FontWeight.w800,
                      ),
                    ),
                    subtitle: Text(
                      '${item['message'] ?? ''}${date == null ? '' : '\n${DateFormat('MMM d, y · h:mm a').format(date)}'}',
                    ),
                    isThreeLine: date != null,
                  ),
                );
              },
            ),
    ),
  );
}
