class Product {
  const Product({
    required this.id,
    required this.title,
    required this.category,
    required this.pricePerDay,
    required this.minDays,
    required this.maxDays,
    required this.availability,
    this.description = '',
    this.specs,
    this.image,
    this.supplierName = '',
    this.supplierId = '',
    this.barangay = '',
    this.location = '',
    this.rating,
    this.reviewCount = 0,
    this.latitude,
    this.longitude,
  });

  final String id;
  final String title;
  final String category;
  final double pricePerDay;
  final int minDays;
  final int maxDays;
  final String availability;
  final String description;
  final String? specs;
  final String? image;
  final String supplierName;
  final String supplierId;
  final String barangay;
  final String location;
  final double? rating;
  final int reviewCount;
  final double? latitude;
  final double? longitude;

  factory Product.fromJson(Map<String, dynamic> json) {
    final images = json['images'];
    String? image = json['primary_image']?.toString();
    if (images is List && images.isNotEmpty) {
      final primary = images.cast<dynamic>().firstWhere(
        (item) =>
            item is Map &&
            (item['is_primary'] == 1 || item['is_primary'] == true),
        orElse: () => images.first,
      );
      if (primary is Map) image = primary['url']?.toString() ?? image;
    }
    return Product(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Equipment',
      category: json['category']?.toString() ?? 'Equipment',
      pricePerDay: _number(json['price_per_day']),
      minDays: _integer(json['min_days'], fallback: 1),
      maxDays: _integer(json['max_days'], fallback: 30),
      availability: json['availability']?.toString() ?? 'available',
      description: json['description']?.toString() ?? '',
      specs: json['specs']?.toString(),
      image: image,
      supplierName: json['supplier_name']?.toString() ?? '',
      supplierId: json['supplier_id']?.toString() ?? '',
      barangay:
          json['barangay']?.toString() ??
          json['supplier_barangay']?.toString() ??
          '',
      location:
          json['location']?.toString() ??
          json['supplier_address']?.toString() ??
          '',
      rating: json['avg_rating'] == null ? null : _number(json['avg_rating']),
      reviewCount: _integer(json['review_count'], fallback: 0),
      latitude: _optionalNumber(json['latitude']),
      longitude: _optionalNumber(json['longitude']),
    );
  }
}

double _number(dynamic value) => double.tryParse(value?.toString() ?? '') ?? 0;

int _integer(dynamic value, {required int fallback}) =>
    int.tryParse(value?.toString() ?? '') ?? fallback;

double? _optionalNumber(dynamic value) =>
    value == null ? null : double.tryParse(value.toString());
