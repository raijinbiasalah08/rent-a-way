import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/models/product.dart';

final pesoFormat = NumberFormat.currency(
  locale: 'en_PH',
  symbol: '₱',
  decimalDigits: 0,
);

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.api,
    required this.onTap,
    this.onFavorite,
    this.isFavorite = false,
  });

  final Product product;
  final ApiClient api;
  final VoidCallback onTap;
  final VoidCallback? onFavorite;
  final bool isFavorite;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                SizedBox(
                  height: 158,
                  width: double.infinity,
                  child: product.image == null
                      ? const _ImagePlaceholder()
                      : Image.network(
                          api.assetUri(product.image).toString(),
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const _ImagePlaceholder(),
                        ),
                ),
                if (onFavorite != null)
                  Positioned(
                    top: 9,
                    right: 9,
                    child: Material(
                      color: Colors.white.withValues(alpha: .95),
                      shape: const CircleBorder(),
                      child: IconButton(
                        visualDensity: VisualDensity.compact,
                        tooltip: isFavorite ? 'Remove saved item' : 'Save item',
                        onPressed: onFavorite,
                        icon: Icon(
                          isFavorite ? Icons.favorite : Icons.favorite_border,
                          color: isFavorite
                              ? Colors.redAccent
                              : const Color(0xFF26364F),
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  left: 10,
                  top: 10,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .94),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      child: Text(
                        product.category,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 15,
                        color: Colors.black54,
                      ),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(
                          product.barangay.isEmpty
                              ? 'Roxas, Oriental Mindoro'
                              : product.barangay,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      if (product.rating != null && product.rating! > 0) ...[
                        const Icon(
                          Icons.star_rounded,
                          color: Color(0xFFF5A623),
                          size: 17,
                        ),
                        Text(
                          product.rating!.toStringAsFixed(1),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 9),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        pesoFormat.format(product.pricePerDay),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F1729),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(left: 4, bottom: 2),
                        child: Text(
                          '/ day',
                          style: TextStyle(color: Colors.black54, fontSize: 12),
                        ),
                      ),
                      const Spacer(),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        size: 19,
                        color: Color(0xFF1F4F91),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder();

  @override
  Widget build(BuildContext context) => Container(
    color: const Color(0xFFE9EDF2),
    alignment: Alignment.center,
    child: const Icon(
      Icons.handyman_outlined,
      size: 44,
      color: Color(0xFF63748D),
    ),
  );
}
