import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:url_launcher/url_launcher.dart';

class SubscriptionPackages extends StatefulWidget {
  const SubscriptionPackages({
    super.key,
    required this.api,
    required this.status,
  });

  final ApiClient api;
  final Map<String, dynamic> status;

  @override
  State<SubscriptionPackages> createState() => _SubscriptionPackagesState();
}

class _SubscriptionPackagesState extends State<SubscriptionPackages> {
  late Map<String, dynamic> _status = widget.status;
  bool _saving = false;
  String? _error;
  Map<String, dynamic>? _checkout;
  bool _showQr = false;
  String _reference = '';

  Future<void> _request(String plan) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final response = await widget.api.put(
        'subscriptions/request',
        body: {
          'plan': plan,
          if (_reference.trim().isNotEmpty) 'reference': _reference,
        },
      );
      if (mounted) {
        setState(() {
          _status = response['data'] as Map<String, dynamic>;
          _checkout = null;
        });
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _contact(String subject) async {
    final uri = Uri(
      scheme: 'mailto',
      path: 'suppliers@rentaway.ph',
      query: 'subject=${Uri.encodeComponent(subject)}',
    );
    try {
      if (await launchUrl(uri)) return;
    } catch (_) {
      // Devices without a mail app can still use the address below.
    }
    if (mounted) {
      setState(
        () => _error = 'Email the supplier team at suppliers@rentaway.ph.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _status['currentPlan'];
    final pending = _status['requestedPlan'];
    final opportunity = current == 'business'
        ? 'business advertising'
        : 'featured listing';
    final expiry = DateTime.tryParse(_status['expiresAt']?.toString() ?? '');
    if (_checkout case final checkout?) {
      return _buildCheckout(context, checkout, _status['receiver']);
    }
    return ListView(
      shrinkWrap: true,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Subscription Packages',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            IconButton(
              tooltip: 'Close',
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        if (_status['canPublish'] == false)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Your free listing slot is in use. Choose a premium plan to publish another item.',
            ),
          ),
        for (final pkg
            in (_status['packages'] as List).cast<Map<String, dynamic>>())
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    pkg['name'] as String,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '₱${pkg['monthlyPrice']}/month',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  for (final benefit
                      in (pkg['benefits'] as List).cast<String>())
                    Text('✓  $benefit'),
                  const SizedBox(height: 8),
                  if (pkg['id'] == current)
                    Text(
                      expiry == null
                          ? 'Current plan'
                          : 'Current plan · Until ${DateFormat.yMMMd().format(expiry.toLocal())}',
                    ),
                  if (pkg['id'] != 'free')
                    FilledButton(
                      onPressed: _saving || pending != null
                          ? null
                          : () => setState(() {
                              _checkout = pkg;
                              _reference = '';
                              _showQr = false;
                              _error = null;
                            }),
                      child: Text(
                        pkg['id'] == pending
                            ? 'Request pending'
                            : pkg['id'] == current
                            ? 'Request renewal'
                            : 'Request ${pkg['name']}',
                      ),
                    ),
                ],
              ),
            ),
          ),
        if (pending != null) ...[
          const Text(
            'Your request is awaiting admin verification. Please wait for review before making another payment.',
          ),
          TextButton(
            onPressed: () => _contact('Subscription payment'),
            child: const Text('Contact supplier team'),
          ),
        ] else
          const Text(
            'Paid plans activate for one month after payment confirmation. When a plan expires, existing listings stay visible and the free upload limit applies.',
          ),
        if (current != 'free')
          TextButton(
            onPressed: () => _contact('$opportunity inquiry'),
            child: Text('Ask about $opportunity opportunities'),
          ),
        if (_error != null)
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
      ],
    );
  }

  Widget _buildCheckout(
    BuildContext context,
    Map<String, dynamic> checkout,
    dynamic receiver,
  ) {
    final theme = Theme.of(context);
    return ListView(
      shrinkWrap: true,
      padding: EdgeInsets.fromLTRB(
        20,
        8,
        20,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Pay with GCash', style: theme.textTheme.titleLarge),
            ),
            IconButton(
              tooltip: 'Close',
              onPressed: _saving ? null : () => Navigator.pop(context),
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        Text(
          '${checkout['name']} · ₱${checkout['monthlyPrice']} for one month',
          style: theme.textTheme.titleMedium,
        ),
        if (receiver is Map) ...[
          Text(
            'Confirm the recipient in GCash is ${receiver['account_name']} before paying.',
          ),
          OutlinedButton(
            onPressed: () => setState(() => _showQr = !_showQr),
            child: Text(_showQr ? 'Hide GCash QR code' : 'Show GCash QR code'),
          ),
          if (_showQr) ...[
            Image.network(
              widget.api.assetUri(receiver['qr_url']).toString(),
              height: 230,
              fit: BoxFit.contain,
              semanticLabel: 'GCash receiving QR',
              errorBuilder: (_, _, _) =>
                  const Text('The QR image could not load.'),
            ),
            const Text(
              'On one phone, take a screenshot of the QR and select it in the GCash QR scanner.',
            ),
          ],
          TextField(
            keyboardType: TextInputType.number,
            maxLength: 50,
            decoration: const InputDecoration(
              labelText: 'GCash payment reference',
            ),
            onChanged: (value) => setState(() => _reference = value),
          ),
          FilledButton(
            onPressed:
                !_saving &&
                    RegExp(
                      r'^\d{10,20}$',
                    ).hasMatch(_reference.replaceAll(RegExp(r'[ -]'), ''))
                ? () => _request(checkout['id'])
                : null,
            child: Text(
              _saving ? 'Submitting…' : 'Submit for admin verification',
            ),
          ),
        ] else ...[
          const Text(
            'The GCash receiving account has not been set up yet. Contact the team to arrange payment, then submit for manual review.',
          ),
          TextButton(
            onPressed: () => _contact('Subscription payment'),
            child: const Text('Contact supplier team'),
          ),
          FilledButton(
            onPressed: _saving ? null : () => _request(checkout['id']),
            child: Text(
              _saving ? 'Submitting…' : 'Request plan for manual confirmation',
            ),
          ),
        ],
        if (_error != null)
          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        TextButton(
          onPressed: _saving
              ? null
              : () => setState(() {
                  _checkout = null;
                  _error = null;
                }),
          child: const Text('Back to plans'),
        ),
      ],
    );
  }
}
