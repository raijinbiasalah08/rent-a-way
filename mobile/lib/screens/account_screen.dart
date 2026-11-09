import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/screens/auth_screen.dart';
import 'package:rentaway_mobile/screens/community_screen.dart';
import 'package:rentaway_mobile/screens/inbox_screen.dart';
import 'package:rentaway_mobile/screens/notifications_screen.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final user = session.user;
    if (user == null) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 30),
        children: [
          const Text(
            'Your account',
            style: TextStyle(
              fontSize: 27,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F1729),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Sign in to view rentals, save equipment, and manage your profile.',
            style: TextStyle(color: Colors.black54, height: 1.45),
          ),
          const SizedBox(height: 22),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).push<void>(
              MaterialPageRoute(builder: (_) => AuthScreen(session: session)),
            ),
            icon: const Icon(Icons.login_rounded),
            label: const Text('Sign in or create account'),
          ),
          const SizedBox(height: 28),
          const _AccountFeature(
            icon: Icons.verified_user_outlined,
            title: 'Local suppliers',
            detail: 'Find equipment offered by people in Roxas.',
          ),
          const _AccountFeature(
            icon: Icons.calendar_month_outlined,
            title: 'Rental requests',
            detail: 'Send dates to the supplier and follow each update.',
          ),
          const _AccountFeature(
            icon: Icons.lock_outline,
            title: 'Secure account',
            detail: 'Your access token is stored in the device secure storage.',
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => CommunityScreen(session: session),
              ),
            ),
            icon: const Icon(Icons.forum_outlined),
            label: const Text('Open community'),
          ),
        ],
      );
    }

    final name = user['name']?.toString() ?? 'Rent-A-Way member';
    final role = user['role']?.toString() ?? 'customer';
    final email = user['email']?.toString() ?? '';
    final phone = user['phone']?.toString() ?? '';
    final address = user['address']?.toString() ?? '';
    final barangay = user['barangay']?.toString() ?? '';
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 34),
      children: [
        const Text(
          'Your account',
          style: TextStyle(
            fontSize: 27,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F1729),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: const Color(0xFFE8EDF4),
                  child: Text(
                    name.isEmpty ? 'R' : name[0].toUpperCase(),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F1729),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        email,
                        style: const TextStyle(color: Colors.black54),
                      ),
                      const SizedBox(height: 7),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: const Color(0xFFEAF0F8),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          child: Text(
                            role.toUpperCase(),
                            style: const TextStyle(
                              color: Color(0xFF1F4F91),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(
                  Icons.edit_outlined,
                  color: Color(0xFF1F4F91),
                ),
                title: const Text('Edit profile'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => ProfileEditScreen(session: session),
                  ),
                ),
              ),
              const Divider(height: 1, indent: 54, endIndent: 14),
              ListTile(
                leading: const Icon(
                  Icons.forum_outlined,
                  color: Color(0xFF1F4F91),
                ),
                title: const Text('Community'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => CommunityScreen(session: session),
                  ),
                ),
              ),
              const Divider(height: 1, indent: 54, endIndent: 14),
              ListTile(
                leading: const Icon(
                  Icons.chat_bubble_outline,
                  color: Color(0xFF1F4F91),
                ),
                title: const Text('Messages'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => InboxScreen(session: session),
                  ),
                ),
              ),
              const Divider(height: 1, indent: 54, endIndent: 14),
              ListTile(
                leading: const Icon(
                  Icons.notifications_none,
                  color: Color(0xFF1F4F91),
                ),
                title: const Text('Notifications'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => NotificationsScreen(session: session),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: [
              _ProfileRow(
                icon: Icons.phone_outlined,
                label: 'Phone',
                value: phone.isEmpty ? 'Not added' : phone,
              ),
              const Divider(height: 1, indent: 54, endIndent: 14),
              _ProfileRow(
                icon: Icons.location_on_outlined,
                label: 'Barangay',
                value: barangay.isEmpty ? 'Not added' : barangay,
              ),
              const Divider(height: 1, indent: 54, endIndent: 14),
              _ProfileRow(
                icon: Icons.home_outlined,
                label: 'Pickup / delivery address',
                value: address.isEmpty ? 'Not added' : address,
              ),
            ],
          ),
        ),
        if (role == 'supplier') ...[
          const SizedBox(height: 16),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Supplier workspace: manage your active listings and rental requests using the tabs below.',
                style: TextStyle(height: 1.4),
              ),
            ),
          ),
        ],
        if (role == 'admin') ...[
          const SizedBox(height: 16),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Admin tools are available in the web dashboard while native admin management is being built.',
                style: TextStyle(height: 1.4),
              ),
            ),
          ),
        ],
        const SizedBox(height: 22),
        OutlinedButton.icon(
          onPressed: () async {
            await session.signOut();
          },
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Sign out'),
        ),
      ],
    );
  }
}

class _AccountFeature extends StatelessWidget {
  const _AccountFeature({
    required this.icon,
    required this.title,
    required this.detail,
  });
  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF1F4F91)),
        const SizedBox(width: 13),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text(detail, style: const TextStyle(color: Colors.black54)),
            ],
          ),
        ),
      ],
    ),
  );
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(15),
    child: Row(
      children: [
        Icon(icon, color: const Color(0xFF1F4F91), size: 21),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    ),
  );
}

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  late final _name = TextEditingController(
    text: widget.session.user?['name']?.toString() ?? '',
  );
  late final _phone = TextEditingController(
    text: widget.session.user?['phone']?.toString() ?? '',
  );
  late final _address = TextEditingController(
    text: widget.session.user?['address']?.toString() ?? '',
  );
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().length < 2) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enter your name.')));
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.session.updateProfile(
        name: _name.text,
        phone: _phone.text,
        address: _address.text,
      );
      if (mounted) Navigator.pop(context);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Edit profile')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        TextField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Phone'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _address,
          maxLines: 2,
          decoration: const InputDecoration(labelText: 'Address'),
        ),
        if (widget.session.role == 'supplier') ...[
          const SizedBox(height: 14),
          const Text(
            'To change your verified pickup pin or barangay, use the supplier web dashboard.',
            style: TextStyle(color: Colors.black54, height: 1.4),
          ),
        ],
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Save changes'),
        ),
      ],
    ),
  );
}
