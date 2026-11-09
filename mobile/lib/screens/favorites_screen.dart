import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/models/product.dart';
import 'package:rentaway_mobile/screens/auth_screen.dart';
import 'package:rentaway_mobile/screens/product_detail_screen.dart';
import 'package:rentaway_mobile/widgets/product_card.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({
    super.key,
    required this.session,
    required this.onBookingComplete,
  });

  final SessionController session;
  final VoidCallback onBookingComplete;

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Product> _products = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_sessionChanged);
    _load();
  }

  @override
  void didUpdateWidget(covariant FavoritesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.session != widget.session) {
      oldWidget.session.removeListener(_sessionChanged);
      widget.session.addListener(_sessionChanged);
      _load();
    }
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
          _products = [];
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
      final response = await widget.session.api.get('favorites');
      final data = response['data'];
      final raw = data is Map ? data['items'] : null;
      final items = raw is List
          ? raw
                .whereType<Map>()
                .map(
                  (item) => Product.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : <Product>[];
      if (mounted) setState(() => _products = items);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Product product) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          product: product,
          session: widget.session,
          onBookingComplete: widget.onBookingComplete,
        ),
      ),
    );
    _load();
  }

  Future<void> _remove(Product product) async {
    try {
      await widget.session.api.delete('favorites/${product.id}');
      if (mounted) {
        setState(() => _products.removeWhere((item) => item.id == product.id));
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.session.isSignedIn) {
      return _EmptyState(
        title: 'Save equipment for later',
        message: 'Sign in to keep your favorite equipment in one place.',
        buttonLabel: 'Sign in',
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
          const SliverPadding(
            padding: EdgeInsets.fromLTRB(20, 24, 20, 12),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Saved equipment',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F1729),
                    ),
                  ),
                  SizedBox(height: 5),
                  Text(
                    'Your shortlist for a future rental.',
                    style: TextStyle(color: Colors.black54),
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
              child: _EmptyState(
                title: 'Could not load saved items',
                message: _error!,
                buttonLabel: 'Try again',
                onPressed: _load,
              ),
            )
          else if (_products.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(
                title: 'Nothing saved yet',
                message: 'Tap the heart on equipment you want to find again.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 2, 16, 28),
              sliver: SliverList.separated(
                itemCount: _products.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) => ProductCard(
                  product: _products[index],
                  api: widget.session.api,
                  onTap: () => _open(_products[index]),
                  isFavorite: true,
                  onFavorite: () => _remove(_products[index]),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.title,
    required this.message,
    this.buttonLabel,
    this.onPressed,
  });

  final String title;
  final String message;
  final String? buttonLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.favorite_border_rounded,
            size: 42,
            color: Color(0xFF718096),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54),
          ),
          if (buttonLabel != null && onPressed != null) ...[
            const SizedBox(height: 16),
            FilledButton(onPressed: onPressed, child: Text(buttonLabel!)),
          ],
        ],
      ),
    ),
  );
}
