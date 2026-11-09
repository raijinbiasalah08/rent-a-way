class Rental {
  const Rental({
    required this.id,
    required this.productTitle,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.totalPrice,
    this.image,
    this.customerName = '',
    this.supplierName = '',
    this.notes = '',
    this.isOverdue = false,
  });

  final String id;
  final String productTitle;
  final String status;
  final String startDate;
  final String endDate;
  final double totalPrice;
  final String? image;
  final String customerName;
  final String supplierName;
  final String notes;
  final bool isOverdue;

  factory Rental.fromJson(Map<String, dynamic> json) => Rental(
    id: json['id']?.toString() ?? '',
    productTitle: json['product_title']?.toString() ?? 'Equipment rental',
    status: json['status']?.toString() ?? 'pending',
    startDate: json['start_date']?.toString() ?? '',
    endDate: json['end_date']?.toString() ?? '',
    totalPrice: double.tryParse(json['total_price']?.toString() ?? '') ?? 0,
    image: json['primary_image']?.toString(),
    customerName: json['customer_name']?.toString() ?? '',
    supplierName: json['supplier_name']?.toString() ?? '',
    notes: json['notes']?.toString() ?? '',
    isOverdue: json['is_overdue'] == true || json['is_overdue'] == 1,
  );
}
