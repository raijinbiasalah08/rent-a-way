import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';

class AdminRecordsScreen extends StatefulWidget {
  const AdminRecordsScreen({
    super.key,
    required this.session,
    required this.section,
  });
  final SessionController session;
  final String section;

  @override
  State<AdminRecordsScreen> createState() => _AdminRecordsScreenState();
}

class _AdminRecordsScreenState extends State<AdminRecordsScreen> {
  List<Map<String, dynamic>> _items = [];
  Map<String, dynamic> _reports = {};
  bool _loading = true;
  String? _error;

  String get _title => switch (widget.section) {
    'users' => 'Users',
    'products' => 'Equipment listings',
    'complaints' => 'Complaints',
    _ => 'Reports',
  };

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
      if (widget.section == 'reports') {
        final response = await widget.session.api.get('admin/reports');
        final data = response['data'];
        if (mounted) {
          setState(
            () => _reports = data is Map ? Map<String, dynamic>.from(data) : {},
          );
        }
      } else {
        final endpoint = switch (widget.section) {
          'users' => 'admin/users',
          'products' => 'admin/products',
          _ => 'admin/complaints',
        };
        final response = await widget.session.api.get(
          endpoint,
          query: const {'page': '1', 'limit': '100'},
        );
        final data = response['data'];
        if (mounted) {
          setState(
            () => _items = data is List
                ? data
                      .whereType<Map>()
                      .map((item) => Map<String, dynamic>.from(item))
                      .toList()
                : [],
          );
        }
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _editUser(Map<String, dynamic> user) async {
    final name = TextEditingController(text: user['name']?.toString() ?? '');
    var role = user['role']?.toString() ?? 'customer';
    var active = user['is_active'] == 1 || user['is_active'] == true;
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Update account'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: role,
                decoration: const InputDecoration(labelText: 'Role'),
                items: const ['customer', 'supplier', 'admin']
                    .map(
                      (value) =>
                          DropdownMenuItem(value: value, child: Text(value)),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) setDialogState(() => role = value);
                },
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Account active'),
                value: active,
                onChanged: (value) => setDialogState(() => active = value),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, {
                'name': name.text.trim(),
                'role': role,
                'is_active': active ? 1 : 0,
              }),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    name.dispose();
    if (result == null) return;
    try {
      await widget.session.api.put('admin/users/${user['id']}', body: result);
      await _load();
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    }
  }

  Future<void> _toggleProduct(Map<String, dynamic> product) async {
    try {
      await widget.session.api.put('admin/products/${product['id']}/toggle');
      await _load();
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    }
  }

  Future<void> _setComplaint(
    Map<String, dynamic> complaint,
    String status,
  ) async {
    try {
      await widget.session.api.put(
        'admin/complaints/${complaint['id']}',
        body: {'status': status},
      );
      await _load();
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    }
  }

  void _message(String value) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(value)));

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(_title)),
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
                  padding: const EdgeInsets.all(24),
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
          : widget.section == 'reports'
          ? _buildReports()
          : _items.isEmpty
          ? ListView(
              children: [
                Padding(
                  padding: EdgeInsets.all(35),
                  child: Text(
                    'No records found.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.black54),
                  ),
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.all(14),
              itemCount: _items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) => _buildRecord(_items[index]),
            ),
    ),
  );

  Widget _buildRecord(Map<String, dynamic> item) {
    if (widget.section == 'users') {
      final active = item['is_active'] == 1 || item['is_active'] == true;
      return Card(
        child: ListTile(
          leading: CircleAvatar(
            child: Text(
              (item['name']?.toString().isNotEmpty ?? false)
                  ? item['name'].toString()[0].toUpperCase()
                  : '?',
            ),
          ),
          title: Text(
            item['name']?.toString() ?? 'User',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: Text(
            '${item['email'] ?? ''}\n${item['role'] ?? 'customer'} · ${active ? 'Active' : 'Disabled'}',
          ),
          isThreeLine: true,
          trailing: IconButton(
            tooltip: 'Edit user',
            onPressed: () => _editUser(item),
            icon: const Icon(Icons.edit_outlined),
          ),
        ),
      );
    }
    if (widget.section == 'products') {
      final active = item['is_active'] == 1 || item['is_active'] == true;
      return Card(
        child: ListTile(
          title: Text(
            item['title']?.toString() ?? 'Equipment',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: Text(
            '${item['supplier_name'] ?? 'Supplier'} · ${item['category'] ?? ''}\n${active ? 'Public listing' : 'Hidden listing'}',
          ),
          isThreeLine: true,
          trailing: IconButton(
            tooltip: active ? 'Hide listing' : 'Show listing',
            onPressed: () => _toggleProduct(item),
            icon: Icon(
              active
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
          ),
        ),
      );
    }
    final status = item['status']?.toString() ?? 'open';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item['subject']?.toString() ??
                        item['title']?.toString() ??
                        'Reported issue',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                Chip(label: Text(status)),
              ],
            ),
            Text(
              item['description']?.toString() ??
                  item['message']?.toString() ??
                  '',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 7),
            Text(
              'Reported by ${item['reporter_name'] ?? 'member'}',
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            ),
            const SizedBox(height: 7),
            Align(
              alignment: Alignment.centerRight,
              child: PopupMenuButton<String>(
                initialValue: status,
                tooltip: 'Update complaint',
                onSelected: (value) => _setComplaint(item, value),
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'open', child: Text('Open')),
                  PopupMenuItem(
                    value: 'investigating',
                    child: Text('Investigating'),
                  ),
                  PopupMenuItem(value: 'resolved', child: Text('Resolved')),
                  PopupMenuItem(value: 'dismissed', child: Text('Dismissed')),
                ],
                child: Text(
                  'Update status  ›',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReports() {
    final top = _reports['topProducts'] is List
        ? (_reports['topProducts'] as List).whereType<Map>().toList()
        : <Map>[];
    final categories = _reports['rentalsByCategory'] is List
        ? (_reports['rentalsByCategory'] as List).whereType<Map>().toList()
        : <Map>[];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Most rented equipment',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        const SizedBox(height: 8),
        if (top.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No completed rental data yet.'),
            ),
          )
        else
          ...top.map(
            (row) => Card(
              child: ListTile(
                title: Text(row['title']?.toString() ?? 'Equipment'),
                trailing: Text('${row['rental_count'] ?? 0} rentals'),
              ),
            ),
          ),
        const SizedBox(height: 16),
        const Text(
          'Rentals by category',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        const SizedBox(height: 8),
        if (categories.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No category data yet.'),
            ),
          )
        else
          ...categories.map(
            (row) => Card(
              child: ListTile(
                title: Text(row['category']?.toString() ?? 'Other'),
                trailing: Text('${row['count'] ?? 0} rentals'),
              ),
            ),
          ),
      ],
    );
  }
}
