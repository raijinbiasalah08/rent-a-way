import 'package:flutter/material.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/roxas_locations.dart';
import 'package:rentaway_mobile/core/session_controller.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _password = TextEditingController();
  bool _registering = false;
  String _role = 'customer';
  String _barangay = roxasBarangays.first.name;
  bool _busy = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _address.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      if (_registering) {
        if (_role == 'supplier') {
          final location = roxasBarangays.firstWhere(
            (item) => item.name == _barangay,
          );
          await widget.session.registerSupplier(
            name: _name.text,
            email: _email.text,
            password: _password.text,
            phone: _phone.text,
            address: _address.text,
            barangay: _barangay,
            latitude: location.latitude,
            longitude: location.longitude,
          );
        } else {
          await widget.session.registerCustomer(
            name: _name.text,
            email: _email.text,
            password: _password.text,
            phone: _phone.text,
          );
        }
      } else {
        await widget.session.signIn(_email.text, _password.text);
      }
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    } catch (_) {
      if (mounted) _message('Could not complete sign-in. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_registering ? 'Create account' : 'Welcome back'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(22, 14, 22, 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      height: 78,
                      width: 78,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F1729),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Icon(
                        Icons.handyman_rounded,
                        color: Colors.white,
                        size: 38,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      _registering
                          ? 'Join Rent-A-Way'
                          : 'Sign in to Rent-A-Way',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F1729),
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      _registering
                          ? 'Create an account to rent or list equipment.'
                          : 'Manage your equipment rentals in one place.',
                      style: const TextStyle(
                        color: Colors.black54,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 22),
                    if (_registering) ...[
                      DropdownButtonFormField<String>(
                        initialValue: _role,
                        decoration: const InputDecoration(
                          labelText: 'Account type',
                          prefixIcon: Icon(Icons.badge_outlined),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'customer',
                            child: Text('Customer'),
                          ),
                          DropdownMenuItem(
                            value: 'supplier',
                            child: Text('Supplier'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => _role = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.name],
                        decoration: const InputDecoration(
                          labelText: 'Full name',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (value) => (value?.trim().length ?? 0) < 2
                            ? 'Enter your name'
                            : null,
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Email address',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        return email.contains('@') && email.contains('.')
                            ? null
                            : 'Enter a valid email address';
                      },
                    ),
                    if (_registering) ...[
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        decoration: const InputDecoration(
                          labelText: 'Phone (optional)',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                      ),
                    ],
                    if (_registering && _role == 'supplier') ...[
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _address,
                        maxLength: 500,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Pickup address / landmark',
                          prefixIcon: Icon(Icons.location_on_outlined),
                        ),
                        validator: (value) =>
                            _role == 'supplier' &&
                                (value?.trim().isEmpty ?? true)
                            ? 'Enter a pickup address or landmark'
                            : null,
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: _barangay,
                        decoration: const InputDecoration(
                          labelText: 'Pickup barangay',
                        ),
                        items: roxasBarangays
                            .map(
                              (item) => DropdownMenuItem(
                                value: item.name,
                                child: Text(item.name),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value != null) setState(() => _barangay = value);
                        },
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'The map pin uses the barangay center for now. Add a precise pickup pin from your supplier profile after signup.',
                        style: TextStyle(
                          color: Colors.black54,
                          fontSize: 12,
                          height: 1.35,
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscurePassword,
                      autofillHints: _registering
                          ? const [AutofillHints.newPassword]
                          : const [AutofillHints.password],
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword
                              ? 'Show password'
                              : 'Hide password',
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      validator: (value) {
                        if (!_registering && (value?.isEmpty ?? true)) {
                          return 'Enter your password';
                        }
                        if (_registering && (value?.length ?? 0) < 12) {
                          return 'Use at least 12 characters';
                        }
                        if (_registering && (value?.length ?? 0) > 72) {
                          return 'Use no more than 72 characters';
                        }
                        return null;
                      },
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    if (_registering) ...[
                      const SizedBox(height: 9),
                      const Text(
                        'Passwords must be 12 to 72 characters.',
                        style: TextStyle(color: Colors.black54, fontSize: 12),
                      ),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox.square(
                              dimension: 21,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              _registering
                                  ? 'Create ${_role == 'supplier' ? 'supplier' : 'customer'} account'
                                  : 'Sign in',
                            ),
                    ),
                    const SizedBox(height: 14),
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() => _registering = !_registering),
                      child: Text(
                        _registering
                            ? 'Already have an account? Sign in'
                            : 'New to Rent-A-Way? Create account',
                      ),
                    ),
                    if (_registering)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          _role == 'supplier'
                              ? 'The barangay center is an approximate location. Set your exact pickup point in your supplier profile.'
                              : 'You can browse and request equipment as a customer.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
