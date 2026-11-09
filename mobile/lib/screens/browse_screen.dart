import 'dart:async';

import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/models/product.dart';
import 'package:rentaway_mobile/screens/product_detail_screen.dart';
import 'package:rentaway_mobile/screens/map_browse_screen.dart';
import 'package:rentaway_mobile/widgets/product_card.dart';

const _categories = [
  'All',
  'Cameras',
  'Camping',
  'Sports',
  'Event',
  'Household',
  'School',
];

class BrowseScreen extends StatefulWidget {
  const BrowseScreen({
    super.key,
    required this.session,
    required this.onBookingComplete,
  });

  final SessionController session;
  final VoidCallback onBookingComplete;

  @override
  State<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends State<BrowseScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String _query = '';
  String _category = 'All';
  List<Product> _products = [];
  int _page = 1;
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch(reset: true);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetch({bool reset = false}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _page = 1;
      });
    } else {
      setState(() => _loadingMore = true);
    }
    try {
      final response = await widget.session.api.get(
        'products',
        query: {
          'page': (reset ? 1 : _page + 1).toString(),
          'limit': '12',
          if (_query.trim().isNotEmpty) 'search': _query.trim(),
          if (_category != 'All') 'category': _category,
        },
      );
      final data = response['data'];
      final rawProducts = data is Map ? data['products'] : data;
      final items = rawProducts is List
          ? rawProducts
                .whereType<Map>()
                .map(
                  (item) => Product.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList()
          : <Product>[];
      if (!mounted) return;
      setState(() {
        _products = reset ? items : [..._products, ...items];
        _page = reset ? 1 : _page + 1;
        _hasMore =
            data is Map &&
            (_page <
                (int.tryParse(data['totalPages']?.toString() ?? '') ?? _page));
        _error = null;
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  void _searchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      setState(() => _query = value);
      _fetch(reset: true);
    });
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
  }

  Future<void> _openMap() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => MapBrowseScreen(
          session: widget.session,
          onBookingComplete: widget.onBookingComplete,
        ),
      ),
    );
  }

  Future<void> _toggleFavorite(Product product) async {
    if (!widget.session.isSignedIn) {
      _showMessage('Sign in to save equipment to your list.');
      return;
    }
    try {
      await widget.session.api.post('favorites/${product.id}');
      _showMessage('Saved to your equipment list.');
    } on ApiException catch (error) {
      _showMessage(error.message);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => _fetch(reset: true),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Rent what you need.',
                    style: TextStyle(
                      color: Color(0xFF0F1729),
                      fontSize: 27,
                      fontWeight: FontWeight.w900,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 7),
                  const Text(
                    'Find useful equipment from suppliers in Roxas.',
                    style: TextStyle(color: Colors.black54),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: _openMap,
                      icon: const Icon(Icons.map_outlined, size: 19),
                      label: const Text('Explore on map'),
                    ),
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: _searchController,
                    onChanged: _searchChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Search equipment',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchController.text.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Clear search',
                              onPressed: () {
                                _searchController.clear();
                                _searchChanged('');
                              },
                              icon: const Icon(Icons.close),
                            ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 40,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final category = _categories[index];
                        final selected = _category == category;
                        return ChoiceChip(
                          label: Text(category),
                          selected: selected,
                          onSelected: (_) {
                            setState(() => _category = category);
                            _fetch(reset: true);
                          },
                        );
                      },
                    ),
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
          else if (_error != null && _products.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _MessageState(
                message: _error!,
                onRetry: () => _fetch(reset: true),
              ),
            )
          else if (_products.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _MessageState(
                message: 'No equipment found. Try another search or category.',
              ),
            )
          else ...[
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              sliver: SliverList.separated(
                itemCount: _products.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) => ProductCard(
                  product: _products[index],
                  api: widget.session.api,
                  onTap: () => _open(_products[index]),
                  onFavorite: () => _toggleFavorite(_products[index]),
                ),
              ),
            ),
            if (_hasMore)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 30),
                  child: OutlinedButton(
                    onPressed: _loadingMore ? null : () => _fetch(),
                    child: _loadingMore
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Load more equipment'),
                  ),
                ),
              )
            else
              const SliverToBoxAdapter(child: SizedBox(height: 30)),
          ],
        ],
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.inventory_2_outlined,
            size: 42,
            color: Color(0xFF718096),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ],
      ),
    ),
  );
}
