import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/models/product.dart';
import 'package:rentaway_mobile/screens/auth_screen.dart';
import 'package:rentaway_mobile/screens/booking_screen.dart';
import 'package:rentaway_mobile/screens/inbox_screen.dart';
import 'package:rentaway_mobile/widgets/product_card.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.product,
    required this.session,
    required this.onBookingComplete,
  });

  final Product product;
  final SessionController session;
  final VoidCallback onBookingComplete;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late Product _product = widget.product;
  bool _loading = true;
  bool _favorite = false;
  String? _error;
  List<Map<String, dynamic>> _reviews = [];
  String? _eligibleRentalId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await widget.session.api.get(
        'products/${widget.product.id}',
      );
      final data = response['data'];
      if (data is Map) {
        _product = Product.fromJson(Map<String, dynamic>.from(data));
        final reviews = data['reviews'];
        _reviews = reviews is List
            ? reviews
                  .whereType<Map>()
                  .map((item) => Map<String, dynamic>.from(item))
                  .toList()
            : [];
      }
      if (widget.session.isSignedIn) {
        final favorites = await widget.session.api.get('favorites');
        final data = favorites['data'];
        final ids = data is Map ? data['ids'] : null;
        _favorite =
            ids is List && ids.map((id) => id.toString()).contains(_product.id);
        if (widget.session.role == 'customer') {
          final rentals = await widget.session.api.get(
            'rentals',
            query: const {'status': 'completed', 'limit': '100'},
          );
          final completed = rentals['data'];
          if (completed is List) {
            final eligible = completed.whereType<Map>().where(
              (rental) =>
                  rental['product_id']?.toString() == _product.id &&
                  rental['review_id'] == null,
            );
            _eligibleRentalId = eligible.isEmpty
                ? null
                : eligible.first['id']?.toString();
          }
        }
      }
      if (mounted) setState(() => _error = null);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleFavorite() async {
    if (!widget.session.isSignedIn) {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(builder: (_) => AuthScreen(session: widget.session)),
      );
      if (!mounted) return;
      if (widget.session.isSignedIn) await _load();
      return;
    }
    try {
      if (_favorite) {
        await widget.session.api.delete('favorites/${_product.id}');
      } else {
        await widget.session.api.post('favorites/${_product.id}');
      }
      if (mounted) setState(() => _favorite = !_favorite);
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    }
  }

  Future<void> _book() async {
    if (!widget.session.isSignedIn) {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(builder: (_) => AuthScreen(session: widget.session)),
      );
      if (!mounted || !widget.session.isSignedIn) return;
    }
    if (widget.session.role != 'customer') {
      _message('Rental requests are available to customer accounts.');
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => BookingScreen(
          product: _product,
          session: widget.session,
          onBookingComplete: widget.onBookingComplete,
        ),
      ),
    );
  }

  Future<void> _messageSupplier() async {
    if (!widget.session.isSignedIn) {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(builder: (_) => AuthScreen(session: widget.session)),
      );
      if (!mounted || !widget.session.isSignedIn) return;
    }
    if (_product.supplierId.isEmpty ||
        _product.supplierId == widget.session.user?['id']?.toString()) {
      _message('Messaging is not available for this listing.');
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          session: widget.session,
          otherUser: {
            'other_user_id': _product.supplierId,
            'name': _product.supplierName.isEmpty
                ? 'Supplier'
                : _product.supplierName,
          },
        ),
      ),
    );
  }

  Future<void> _writeReview() async {
    final rentalId = _eligibleRentalId;
    if (rentalId == null) return;
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ReviewComposer(
        session: widget.session,
        product: _product,
        rentalId: rentalId,
      ),
    );
    if (created == true && mounted) _load();
  }

  void _message(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final displayedReviews = _reviews.take(8).toList();
    final image = _product.image == null
        ? null
        : widget.session.api.assetUri(_product.image).toString();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Equipment details'),
        actions: [
          IconButton(
            tooltip: _favorite ? 'Remove from saved' : 'Save equipment',
            onPressed: _toggleFavorite,
            icon: Icon(
              _favorite ? Icons.favorite : Icons.favorite_border,
              color: _favorite ? Colors.redAccent : null,
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _product.id.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(_error!, textAlign: TextAlign.center),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 28),
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: AspectRatio(
                    aspectRatio: 1.18,
                    child: image == null
                        ? const ColoredBox(
                            color: Color(0xFFE9EDF2),
                            child: Icon(
                              Icons.handyman_outlined,
                              size: 60,
                              color: Color(0xFF63748D),
                            ),
                          )
                        : Image.network(
                            image,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const ColoredBox(
                              color: Color(0xFFE9EDF2),
                              child: Icon(
                                Icons.handyman_outlined,
                                size: 60,
                                color: Color(0xFF63748D),
                              ),
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _product.title,
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F1729),
                          height: 1.12,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    if (_product.rating != null && _product.rating! > 0)
                      Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            color: Color(0xFFF5A623),
                          ),
                          Text(
                            _product.rating!.toStringAsFixed(1),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: 9),
                Text(
                  '${_product.category}  ·  ${_product.barangay.isEmpty ? 'Roxas, Oriental Mindoro' : _product.barangay}',
                  style: const TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      pesoFormat.format(_product.pricePerDay),
                      style: const TextStyle(
                        fontSize: 27,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F1729),
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.only(left: 5, bottom: 4),
                      child: Text(
                        '/ day',
                        style: TextStyle(color: Colors.black54),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                _DetailSection(
                  title: 'About this equipment',
                  child: Text(
                    _product.description.isEmpty
                        ? 'Ask the supplier for more details about this item.'
                        : _product.description,
                    style: const TextStyle(
                      height: 1.5,
                      color: Color(0xFF4B5563),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                _DetailSection(
                  title: 'Rental details',
                  child: Column(
                    children: [
                      _InfoRow(
                        label: 'Supplier',
                        value: _product.supplierName.isEmpty
                            ? 'Local supplier'
                            : _product.supplierName,
                      ),
                      _InfoRow(
                        label: 'Pickup area',
                        value: _product.location.isEmpty
                            ? _product.barangay
                            : _product.location,
                      ),
                      _InfoRow(
                        label: 'Minimum rental',
                        value:
                            '${_product.minDays} day${_product.minDays == 1 ? '' : 's'}',
                      ),
                      _InfoRow(
                        label: 'Maximum rental',
                        value: '${_product.maxDays} days',
                      ),
                      _InfoRow(
                        label: 'Availability',
                        value: _product.availability,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _DetailSection(
                  title: 'Customer reviews (${_reviews.length})',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (displayedReviews.isEmpty)
                        const Text(
                          'No reviews yet.',
                          style: TextStyle(color: Colors.black54),
                        )
                      else
                        for (
                          var index = 0;
                          index < displayedReviews.length;
                          index++
                        ) ...[
                          _ReviewItem(review: displayedReviews[index]),
                          if (index < displayedReviews.length - 1)
                            const Divider(height: 22),
                        ],
                      if (_eligibleRentalId != null) ...[
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: _writeReview,
                          icon: const Icon(Icons.rate_review_outlined),
                          label: const Text('Write a review'),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _DetailSection(
                  title: 'Booking note',
                  child: Text(
                    'Prices are estimates. Your request is sent to the supplier for approval. Payment is handled outside the app.',
                    style: TextStyle(
                      color: Colors.blueGrey.shade700,
                      height: 1.45,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _product.availability == 'available'
                      ? _book
                      : null,
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: const Text('Request to rent'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _messageSupplier,
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: const Text('Message supplier'),
                ),
              ],
            ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  const _DetailSection({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    ),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 132,
          child: Text(label, style: const TextStyle(color: Colors.black54)),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );
}

class _ReviewItem extends StatelessWidget {
  const _ReviewItem({required this.review});

  final Map<String, dynamic> review;

  @override
  Widget build(BuildContext context) {
    final rating = int.tryParse(review['rating']?.toString() ?? '') ?? 0;
    final name = review['name']?.toString() ?? 'Rent-A-Way member';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                name,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            Row(
              children: List.generate(
                5,
                (index) => Icon(
                  index < rating
                      ? Icons.star_rounded
                      : Icons.star_outline_rounded,
                  color: const Color(0xFFF5A623),
                  size: 18,
                ),
              ),
            ),
          ],
        ),
        if ((review['text']?.toString() ?? '').isNotEmpty) ...[
          const SizedBox(height: 5),
          Text(
            review['text'].toString(),
            style: const TextStyle(color: Colors.black54, height: 1.4),
          ),
        ],
      ],
    );
  }
}

class _ReviewComposer extends StatefulWidget {
  const _ReviewComposer({
    required this.session,
    required this.product,
    required this.rentalId,
  });

  final SessionController session;
  final Product product;
  final String rentalId;

  @override
  State<_ReviewComposer> createState() => _ReviewComposerState();
}

class _ReviewComposerState extends State<_ReviewComposer> {
  final _comment = TextEditingController();
  int _rating = 5;
  bool _saving = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      await widget.session.api.post(
        'reviews',
        body: {
          'product_id': widget.product.id,
          'rental_id': widget.rentalId,
          'rating': _rating,
          'comment': _comment.text.trim(),
        },
      );
      if (mounted) Navigator.pop(context, true);
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
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      18,
      20,
      MediaQuery.viewInsetsOf(context).bottom + 20,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Review your rental',
          style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          widget.product.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            5,
            (index) => IconButton(
              tooltip: '${index + 1} star${index == 0 ? '' : 's'}',
              onPressed: _saving
                  ? null
                  : () => setState(() => _rating = index + 1),
              icon: Icon(
                index < _rating
                    ? Icons.star_rounded
                    : Icons.star_outline_rounded,
                size: 34,
                color: const Color(0xFFF5A623),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _comment,
          maxLength: 5000,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Comment (optional)',
            hintText: 'How did the rental go?',
          ),
        ),
        const SizedBox(height: 10),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: _saving
              ? const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Publish review'),
        ),
      ],
    ),
  );
}
