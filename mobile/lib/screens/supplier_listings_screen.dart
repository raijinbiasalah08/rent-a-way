import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/models/product.dart';
import 'package:rentaway_mobile/widgets/product_card.dart';

const _productCategories = [
  'Cameras',
  'Camping',
  'Sports',
  'Event',
  'Household',
  'School',
];

class SupplierListingsScreen extends StatefulWidget {
  const SupplierListingsScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<SupplierListingsScreen> createState() => _SupplierListingsScreenState();
}

class _SupplierListingsScreenState extends State<SupplierListingsScreen> {
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
      final response = await widget.session.api.get('products/mine');
      final data = response['data'];
      if (mounted) {
        setState(
          () => _products = data is List
              ? data
                    .whereType<Map>()
                    .map(
                      (item) =>
                          Product.fromJson(Map<String, dynamic>.from(item)),
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

  Future<void> _newListing() => _editListing(null);

  Future<void> _editListing(Product? product) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) =>
          _NewListingSheet(api: widget.session.api, product: product),
    );
    if (result?['created'] == true) {
      _load();
      final imageError = result?['imageError']?.toString();
      if (imageError != null && mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(imageError)));
      }
    }
  }

  Future<void> _deactivate(Product product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove listing?'),
        content: Text(
          '“${product.title}” will no longer appear in the public catalog. Existing rental records stay available.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep listing'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await widget.session.api.delete('products/${product.id}');
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
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _load,
    child: CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 14),
          sliver: SliverToBoxAdapter(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'My listings',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F1729),
                        ),
                      ),
                      SizedBox(height: 5),
                      Text(
                        'Equipment customers can request.',
                        style: TextStyle(color: Colors.black54),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton.icon(
                  onPressed: _newListing,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Add'),
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
            child: _Notice(
              title: 'Could not load listings',
              detail: _error!,
              onRetry: _load,
            ),
          )
        else if (_products.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: _Notice(
              title: 'No listings yet',
              detail:
                  'Add your first item to make it available to local renters.',
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
            sliver: SliverList.separated(
              itemCount: _products.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ProductCard(
                        product: _products[index],
                        api: widget.session.api,
                        onTap: () {},
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _editListing(_products[index]),
                              icon: const Icon(Icons.edit_outlined),
                              label: const Text('Edit'),
                            ),
                          ),
                          const SizedBox(width: 9),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _deactivate(_products[index]),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFB42318),
                              ),
                              icon: const Icon(Icons.archive_outlined),
                              label: const Text('Remove'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

class _NewListingSheet extends StatefulWidget {
  const _NewListingSheet({required this.api, this.product});
  final ApiClient api;
  final Product? product;

  @override
  State<_NewListingSheet> createState() => _NewListingSheetState();
}

class _NewListingSheetState extends State<_NewListingSheet> {
  final _form = GlobalKey<FormState>();
  late final _title = TextEditingController(text: widget.product?.title ?? '');
  late final _description = TextEditingController(
    text: widget.product?.description ?? '',
  );
  late final _price = TextEditingController(
    text: widget.product?.pricePerDay.toString() ?? '',
  );
  late final _minDays = TextEditingController(
    text: widget.product?.minDays.toString() ?? '1',
  );
  late final _maxDays = TextEditingController(
    text: widget.product?.maxDays.toString() ?? '30',
  );
  late String _category = widget.product?.category ?? _productCategories.first;
  late String _availability = widget.product?.availability ?? 'available';
  XFile? _image;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _price.dispose();
    _minDays.dispose();
    _maxDays.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final image = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (mounted && image != null) setState(() => _image = image);
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final body = {
        'title': _title.text.trim(),
        'description': _description.text.trim(),
        'specs': widget.product?.specs,
        'category': _category,
        'price_per_day': double.parse(_price.text.trim()),
        'min_days': int.parse(_minDays.text.trim()),
        'max_days': int.parse(_maxDays.text.trim()),
        if (widget.product != null) 'availability': _availability,
      };
      final response = widget.product == null
          ? await widget.api.post('products', body: body)
          : await widget.api.put('products/${widget.product!.id}', body: body);
      final data = response['data'];
      final productId = data is Map ? data['id']?.toString() : null;
      String? imageError;
      if (_image != null && productId != null) {
        try {
          await widget.api.uploadProductImage(productId, _image!.path);
        } on ApiException catch (error) {
          imageError =
              'Listing was saved, but its photo failed to upload: ${error.message}';
        } catch (_) {
          imageError = 'Listing was saved, but its photo failed to upload.';
        }
      }
      if (mounted) {
        Navigator.pop(context, {'created': true, 'imageError': imageError});
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Could not save listing. Check the price and rental limits.',
            ),
          ),
        );
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
    child: SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.product == null
                        ? 'New equipment listing'
                        : 'Edit equipment listing',
                    style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _title,
              maxLength: 150,
              decoration: const InputDecoration(labelText: 'Equipment name'),
              validator: (value) => (value?.trim().length ?? 0) < 2
                  ? 'Enter at least 2 characters'
                  : null,
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'Category'),
              items: _productCategories
                  .map(
                    (category) => DropdownMenuItem(
                      value: category,
                      child: Text(category),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => _category = value);
              },
            ),
            if (widget.product != null) ...[
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _availability,
                decoration: const InputDecoration(labelText: 'Availability'),
                items: const [
                  DropdownMenuItem(
                    value: 'available',
                    child: Text('Available'),
                  ),
                  DropdownMenuItem(
                    value: 'unavailable',
                    child: Text('Unavailable'),
                  ),
                  DropdownMenuItem(
                    value: 'maintenance',
                    child: Text('Maintenance'),
                  ),
                  DropdownMenuItem(value: 'rented', child: Text('Rented')),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _availability = value);
                },
              ),
            ],
            const SizedBox(height: 10),
            TextFormField(
              controller: _description,
              maxLines: 3,
              maxLength: 10000,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
              ),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _price,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(labelText: 'Price per day (₱)'),
              validator: (value) {
                final price = double.tryParse(value ?? '');
                return price == null || price < 0
                    ? 'Enter a valid daily price'
                    : null;
              },
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _minDays,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Minimum days',
                    ),
                    validator: _validDays,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _maxDays,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Maximum days',
                    ),
                    validator: (value) {
                      final days = int.tryParse(value ?? '');
                      if (days == null || days < 1 || days > 365) {
                        return 'Use 1–365';
                      }
                      final minimum = int.tryParse(_minDays.text) ?? 1;
                      return days < minimum ? 'Below minimum' : null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _saving ? null : _pickImage,
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: Text(
                _image == null
                    ? 'Choose a cover photo (optional)'
                    : 'Photo selected',
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Your verified supplier pickup address will be used for the listing.',
              style: TextStyle(color: Colors.black54, fontSize: 12),
            ),
            const SizedBox(height: 14),
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
                  : Text(
                      widget.product == null
                          ? 'Publish listing'
                          : 'Save changes',
                    ),
            ),
          ],
        ),
      ),
    ),
  );

  String? _validDays(String? value) {
    final days = int.tryParse(value ?? '');
    return days == null || days < 1 || days > 365 ? 'Use 1–365' : null;
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.title, required this.detail, this.onRetry});
  final String title;
  final String detail;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(26),
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
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            detail,
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
