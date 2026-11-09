import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/models/rental.dart';
import 'package:rentaway_mobile/screens/auth_screen.dart';
import 'package:rentaway_mobile/widgets/product_card.dart';

class RentalsScreen extends StatefulWidget {
  const RentalsScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<RentalsScreen> createState() => _RentalsScreenState();
}

class _RentalsScreenState extends State<RentalsScreen> {
  List<Rental> _rentals = [];
  bool _loading = true;
  String? _error;
  final Set<String> _updating = {};

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_sessionChanged);
    _load();
  }

  @override
  void dispose() {
    widget.session.removeListener(_sessionChanged);
    super.dispose();
  }

  void _sessionChanged() => _load();

  Future<void> _load() async {
    if (!widget.session.isSignedIn) {
      if (mounted) {
        setState(() {
          _rentals = [];
          _loading = false;
        });
      }
      return;
    }
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final response = await widget.session.api.get(
        'rentals',
        query: const {'limit': '100'},
      );
      final data = response['data'];
      if (mounted) {
        setState(
          () => _rentals = data is List
              ? data
                    .whereType<Map>()
                    .map(
                      (item) =>
                          Rental.fromJson(Map<String, dynamic>.from(item)),
                    )
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

  List<String> _actions(String status) {
    if (widget.session.role == 'customer') {
      return switch (status) {
        'pending' || 'approved' => ['cancelled'],
        'active' => ['returned'],
        _ => const [],
      };
    }
    return switch (status) {
      'pending' => ['approved', 'rejected'],
      'approved' => ['active', 'cancelled'],
      'active' => ['returned'],
      'returned' => ['completed'],
      _ => const [],
    };
  }

  String _actionLabel(String status) => switch (status) {
    'approved' => 'Approve',
    'rejected' => 'Decline',
    'cancelled' => 'Cancel',
    'active' => 'Mark handed over',
    'returned' =>
      widget.session.role == 'customer' ? 'Mark returned' : 'Confirm return',
    'completed' => 'Complete',
    _ => status,
  };

  Future<void> _changeStatus(Rental rental, String status) async {
    setState(() => _updating.add(rental.id));
    try {
      await widget.session.api.put(
        'rentals/${rental.id}/status',
        body: {'status': status},
      );
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _updating.remove(rental.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final supplierView = widget.session.role == 'supplier';
    final title = supplierView ? 'Rental requests' : 'Your rentals';
    if (!widget.session.isSignedIn) {
      return _RentalsEmpty(
        title: 'Sign in to see rentals',
        message: 'Your requests and rental updates will appear here.',
        action: 'Sign in',
        onPressed: () => Navigator.of(context).push<void>(
          MaterialPageRoute(
            builder: (_) => AuthScreen(session: widget.session),
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 14),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F1729),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    supplierView
                        ? 'Review and update customer requests.'
                        : 'Check the status and dates for your equipment.',
                    style: const TextStyle(color: Colors.black54),
                  ),
                ],
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _RentalsEmpty(
                title: 'Could not load rentals',
                message: _error!,
                action: 'Try again',
                onPressed: _load,
              ),
            )
          else if (_rentals.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _RentalsEmpty(
                title: 'No rentals yet',
                message:
                    'When you send or receive a rental request, it will show here.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
              sliver: SliverList.separated(
                itemCount: _rentals.length,
                separatorBuilder: (_, _) => const SizedBox(height: 11),
                itemBuilder: (context, index) => _RentalCard(
                  rental: _rentals[index],
                  api: widget.session.api,
                  counterpart: widget.session.role == 'customer'
                      ? _rentals[index].supplierName
                      : _rentals[index].customerName,
                  actions: _actions(_rentals[index].status),
                  actionLabel: _actionLabel,
                  busy: _updating.contains(_rentals[index].id),
                  onAction: (status) => _changeStatus(_rentals[index], status),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RentalCard extends StatelessWidget {
  const _RentalCard({
    required this.rental,
    required this.api,
    required this.counterpart,
    required this.actions,
    required this.actionLabel,
    required this.busy,
    required this.onAction,
  });

  final Rental rental;
  final ApiClient api;
  final String counterpart;
  final List<String> actions;
  final String Function(String) actionLabel;
  final bool busy;
  final ValueChanged<String> onAction;

  @override
  Widget build(BuildContext context) {
    final color = switch (rental.status) {
      'pending' => const Color(0xFF9A6700),
      'approved' || 'active' => const Color(0xFF1F4F91),
      'completed' || 'returned' => const Color(0xFF218838),
      'rejected' || 'cancelled' => const Color(0xFFB42318),
      _ => const Color(0xFF667085),
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 62,
                    height: 62,
                    child: rental.image == null
                        ? const ColoredBox(
                            color: Color(0xFFE9EDF2),
                            child: Icon(Icons.handyman_outlined),
                          )
                        : Image.network(
                            api.assetUri(rental.image).toString(),
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const ColoredBox(
                              color: Color(0xFFE9EDF2),
                              child: Icon(Icons.handyman_outlined),
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rental.productTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      if (counterpart.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Text(
                            counterpart,
                            style: const TextStyle(
                              color: Colors.black54,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: .1),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            rental.isOverdue
                                ? 'OVERDUE'
                                : rental.status.toUpperCase(),
                            style: TextStyle(
                              color: color,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: .4,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 13),
            Row(
              children: [
                const Icon(
                  Icons.date_range_rounded,
                  size: 17,
                  color: Colors.black54,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '${_formatDate(rental.startDate)} – ${_formatDate(rental.endDate)}',
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                ),
                Text(
                  pesoFormat.format(rental.totalPrice),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F1729),
                  ),
                ),
              ],
            ),
            if (rental.notes.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                'Note: ${rental.notes}',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.black54, fontSize: 12),
              ),
            ],
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: actions
                    .map(
                      (status) => OutlinedButton(
                        onPressed: busy ? null : () => onAction(status),
                        style: status == 'rejected' || status == 'cancelled'
                            ? OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFB42318),
                              )
                            : null,
                        child: busy
                            ? const SizedBox.square(
                                dimension: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(actionLabel(status)),
                      ),
                    )
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _formatDate(String value) {
  final parsed = DateTime.tryParse(value);
  return parsed == null ? value : DateFormat('MMM d, y').format(parsed);
}

class _RentalsEmpty extends StatelessWidget {
  const _RentalsEmpty({
    required this.title,
    required this.message,
    this.action,
    this.onPressed,
  });
  final String title;
  final String message;
  final String? action;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.calendar_month_outlined,
            size: 42,
            color: Color(0xFF718096),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54),
          ),
          if (action != null && onPressed != null) ...[
            const SizedBox(height: 16),
            FilledButton(onPressed: onPressed, child: Text(action!)),
          ],
        ],
      ),
    ),
  );
}
