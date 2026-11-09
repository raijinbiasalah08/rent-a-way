import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/models/product.dart';
import 'package:rentaway_mobile/widgets/product_card.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({
    super.key,
    required this.product,
    required this.session,
    required this.onBookingComplete,
  });

  final Product product;
  final SessionController session;
  final VoidCallback onBookingComplete;

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final _notesController = TextEditingController();
  DateTime? _start;
  DateTime? _end;
  bool _submitting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  int get _days =>
      _start == null || _end == null ? 0 : _end!.difference(_start!).inDays;

  Future<void> _pickDate({required bool start}) async {
    final now = DateTime.now();
    final initial = start
        ? (_start ?? now)
        : (_end ?? (_start ?? now).add(const Duration(days: 1)));
    final first = start
        ? DateTime(now.year, now.month, now.day)
        : (_start ?? now).add(const Duration(days: 1));
    final value = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: DateTime(now.year + 2),
      helpText: start ? 'Choose start date' : 'Choose end date',
    );
    if (value == null || !mounted) return;
    setState(() {
      if (start) {
        _start = value;
        if (_end != null && !_end!.isAfter(value)) _end = null;
      } else {
        _end = value;
      }
    });
  }

  Future<void> _submit() async {
    if (_start == null || _end == null || _days <= 0) {
      _message('Choose a valid start and end date.');
      return;
    }
    if (_days < widget.product.minDays || _days > widget.product.maxDays) {
      _message(
        'Choose between ${widget.product.minDays} and ${widget.product.maxDays} rental days.',
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await widget.session.api.post(
        'rentals',
        body: {
          'product_id': widget.product.id,
          'start_date': DateFormat('yyyy-MM-dd').format(_start!),
          'end_date': DateFormat('yyyy-MM-dd').format(_end!),
          'notes': _notesController.text.trim(),
        },
      );
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
      widget.onBookingComplete();
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _message(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final total = widget.product.pricePerDay * _days;
    final image = widget.product.image == null
        ? null
        : widget.session.api.assetUri(widget.product.image).toString();
    return Scaffold(
      appBar: AppBar(title: const Text('Rental request')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 6, 18, 30),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 78,
                      height: 78,
                      child: image == null
                          ? const ColoredBox(
                              color: Color(0xFFE9EDF2),
                              child: Icon(Icons.handyman_outlined),
                            )
                          : Image.network(
                              image,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => const ColoredBox(
                                color: Color(0xFFE9EDF2),
                                child: Icon(Icons.handyman_outlined),
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.product.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          'by ${widget.product.supplierName.isEmpty ? 'local supplier' : widget.product.supplierName}',
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          '${pesoFormat.format(widget.product.pricePerDay)} / day',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F1729),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Choose your dates',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F1729),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Requests are subject to supplier approval. Select a date range from ${widget.product.minDays} to ${widget.product.maxDays} days.',
            style: const TextStyle(color: Colors.black54, height: 1.4),
          ),
          const SizedBox(height: 16),
          _DateSelector(
            label: 'Start date',
            value: _start,
            onTap: () => _pickDate(start: true),
          ),
          const SizedBox(height: 10),
          _DateSelector(
            label: 'End date',
            value: _end,
            onTap: () => _pickDate(start: false),
          ),
          const SizedBox(height: 16),
          if (_days > 0)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _EstimateRow(
                      label: 'Duration',
                      value: '$_days day${_days == 1 ? '' : 's'}',
                    ),
                    const SizedBox(height: 9),
                    _EstimateRow(
                      label: 'Daily rate',
                      value: pesoFormat.format(widget.product.pricePerDay),
                    ),
                    const Divider(height: 24),
                    _EstimateRow(
                      label: 'Estimated total',
                      value: pesoFormat.format(total),
                      strong: true,
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),
          TextField(
            controller: _notesController,
            maxLength: 2000,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Note to supplier (optional)',
              hintText: 'Add a pickup question or special request',
            ),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: _submitting
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_rounded),
            label: Text(
              _submitting ? 'Sending request…' : 'Send rental request',
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Prices are estimates. Rent-A-Way does not process payment.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.black54, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _DateSelector extends StatelessWidget {
  const _DateSelector({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final DateTime? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Row(
          children: [
            const Icon(Icons.calendar_month_outlined, color: Color(0xFF1F4F91)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(color: Colors.black54, fontSize: 12),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    value == null
                        ? 'Select date'
                        : DateFormat('EEE, MMM d, y').format(value!),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Colors.black45),
          ],
        ),
      ),
    ),
  );
}

class _EstimateRow extends StatelessWidget {
  const _EstimateRow({
    required this.label,
    required this.value,
    this.strong = false,
  });

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          label,
          style: TextStyle(
            color: strong ? const Color(0xFF0F1729) : Colors.black54,
            fontWeight: strong ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ),
      Text(
        value,
        style: TextStyle(
          color: const Color(0xFF0F1729),
          fontSize: strong ? 18 : 14,
          fontWeight: strong ? FontWeight.w900 : FontWeight.w700,
        ),
      ),
    ],
  );
}
