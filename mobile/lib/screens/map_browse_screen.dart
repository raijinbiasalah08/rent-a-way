import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/models/product.dart';
import 'package:rentaway_mobile/screens/product_detail_screen.dart';
import 'package:rentaway_mobile/widgets/product_card.dart';
import 'package:url_launcher/url_launcher.dart';

const _roxasCenter = LatLng(12.587, 121.519);

class MapBrowseScreen extends StatefulWidget {
  const MapBrowseScreen({
    super.key,
    required this.session,
    required this.onBookingComplete,
  });

  final SessionController session;
  final VoidCallback onBookingComplete;

  @override
  State<MapBrowseScreen> createState() => _MapBrowseScreenState();
}

class _MapBrowseScreenState extends State<MapBrowseScreen> {
  List<Product> _products = [];
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
        'products',
        query: const {'page': '1', 'limit': '100'},
      );
      final data = response['data'];
      final raw = data is Map ? data['products'] : null;
      if (mounted) {
        setState(() {
          _products = raw is List
              ? raw
                    .whereType<Map>()
                    .map(
                      (item) =>
                          Product.fromJson(Map<String, dynamic>.from(item)),
                    )
                    .where(
                      (product) =>
                          product.latitude != null && product.longitude != null,
                    )
                    .toList()
              : [];
        });
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openProduct(Product product) async {
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

  Future<void> _showProduct(Product product) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              product.title,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 5),
            Text(
              '${product.barangay.isEmpty ? 'Roxas' : product.barangay} · ${pesoFormat.format(product.pricePerDay)} / day',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(context);
                _openProduct(product);
              },
              icon: const Icon(Icons.open_in_new_rounded),
              label: const Text('View equipment'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final markers = _products
        .map(
          (product) => Marker(
            point: LatLng(product.latitude!, product.longitude!),
            width: 48,
            height: 54,
            child: GestureDetector(
              onTap: () => _showProduct(product),
              child: const Icon(
                Icons.location_on_rounded,
                color: Color(0xFF1F4F91),
                size: 46,
                shadows: [Shadow(color: Colors.black38, blurRadius: 5)],
              ),
            ),
          ),
        )
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Equipment map'),
        actions: [
          IconButton(
            tooltip: 'Refresh listings',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: const MapOptions(
              initialCenter: _roxasCenter,
              initialZoom: 13.2,
              minZoom: 11,
              maxZoom: 19,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.rentaway.rentaway_mobile',
                maxNativeZoom: 19,
              ),
              MarkerLayer(markers: markers),
              RichAttributionWidget(
                attributions: [
                  TextSourceAttribution(
                    'OpenStreetMap contributors',
                    onTap: () => unawaited(
                      launchUrl(
                        Uri.parse('https://www.openstreetmap.org/copyright'),
                        mode: LaunchMode.externalApplication,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            top: 12,
            left: 12,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 9,
                ),
                child: Text(
                  _loading
                      ? 'Loading equipment…'
                      : _error ?? '${_products.length} listings on the map',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
          if (_error != null)
            Positioned(
              left: 14,
              right: 14,
              bottom: 18,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Expanded(child: Text(_error!)),
                      TextButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
