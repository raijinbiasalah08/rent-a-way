import 'package:image_picker/image_picker.dart';
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
  String? _identityPath;
  bool _acceptedTerms = false;
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
    if (_registering && (!_acceptedTerms || _identityPath == null)) {
      _message('Agree to the Terms and Conditions to create your account.');
      return;
    }
    setState(() => _busy = true);
    try {
      if (_registering) {
        if (_role == 'supplier') {
          final location = roxasBarangays.firstWhere(
            (item) => item.name == _barangay,
          );
          await widget.session.registerSupplier(
            acceptedTermsVersion: '2026-11-19',
            identityPath: _identityPath!,
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
            acceptedTermsVersion: '2026-11-19',
            identityPath: _identityPath!,
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

  void _showTerms() {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'TERMS & CONDITIONS',
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'serif', fontWeight: FontWeight.bold),
        ),
        scrollable: true,
        content: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Divider(thickness: 3),
            Text(
              'Last updated: November 19, 2026',
              style: TextStyle(fontFamily: 'serif', fontSize: 12),
            ),
            SizedBox(height: 18),
            Text(
              "Introduction",
              style: TextStyle(
                fontFamily: 'serif',
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            SizedBox(height: 8),
            Text(
              "Welcome to Rent-A-Way. These Terms and Conditions apply to your use of our website, mobile app, and rental marketplace services. Please read them before creating an account or using the services. By selecting the agreement checkbox during registration, you confirm that you have read and agree to these Terms and Conditions. If you do not agree, you may not create an account. You may save or print a copy for future reference.",
              style: TextStyle(fontFamily: 'serif', height: 1.5),
            ),
            SizedBox(height: 18),
            Text(
              "Agreement to Terms and Conditions",
              style: TextStyle(
                fontFamily: 'serif',
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            SizedBox(height: 8),
            Text(
              "These Terms and Conditions (the \"Terms\") govern your use of Rent-A-Way and its content and services. They apply to renters and suppliers who browse listings, publish listings, communicate with other users, or arrange rentals through the platform. Provide accurate account and listing information, keep your login details private, and use the platform lawfully and respectfully. Before confirming a rental, review the price, rental dates, pickup and return arrangements, and conditions shown for the listing. Suppliers must own or have permission to rent out the listed property. Renters must use it as agreed and report damage or a missed handover to the supplier.",
              style: TextStyle(fontFamily: 'serif', height: 1.5),
            ),
            SizedBox(height: 18),
            Text(
              "Definitions/Terminology",
              style: TextStyle(
                fontFamily: 'serif',
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            SizedBox(height: 8),
            Text(
              "In these Terms, \"User\", \"Visitor\", \"Client\", \"Customer\", \"You\", and \"Your\" refer to a person accessing or using Rent-A-Way. \"Renter\" refers to a user seeking or booking a rental. \"Supplier\" refers to a user offering an item, vehicle, or apartment for rent. \"Rent-A-Way\", \"We\", \"Our\", and \"Us\" refer to the Rent-A-Way platform. \"Website\" includes our website and mobile app. \"Services\" refers to the listing, search, communication, and booking features provided through the platform. \"Rental\" refers to an arrangement between a renter and a supplier. These Terms apply to the platform serving Roxas, Oriental Mindoro, Philippines, subject to applicable Philippine law.",
              style: TextStyle(fontFamily: 'serif', height: 1.5),
            ),
            SizedBox(height: 18),
            Text(
              "Intellectual Property Rights",
              style: TextStyle(
                fontFamily: 'serif',
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            SizedBox(height: 8),
            Text(
              "You retain ownership of the content you upload, including listing descriptions and photographs. By publishing a listing, you authorize Rent-A-Way to display that content as needed to provide the marketplace services. Rent-A-Way and its licensors retain their rights in the platform design, branding, software, and other content they provide. You may access and use the platform content for the intended rental services. Upload only content you own or have permission to use, and respect the intellectual property rights of others.",
              style: TextStyle(fontFamily: 'serif', height: 1.5),
            ),
            SizedBox(height: 18),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
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
                    if (_registering) ...[
                      const Text(
                        'Government-issued or school ID (required)',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const Text(
                        'Clear JPG, PNG, or WebP image, up to 5 MB. Only authorized admins can view your ID for account security.',
                      ),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.badge_outlined),
                        label: Text(
                          _identityPath == null
                              ? 'Upload ID'
                              : 'Replace selected ID',
                        ),
                        onPressed: _busy
                            ? null
                            : () async {
                                final image = await ImagePicker().pickImage(
                                  source: ImageSource.gallery,
                                );
                                if (image == null || !mounted) return;
                                if (await image.length() > 5 * 1024 * 1024) {
                                  if (mounted) {
                                    _message('ID image must be at most 5 MB.');
                                  }
                                  return;
                                }
                                if (mounted) {
                                  setState(() => _identityPath = image.path);
                                }
                              },
                      ),
                    ],
                    if (_registering)
                      Row(
                        children: [
                          Checkbox(
                            semanticLabel:
                                'I agree to the Rent-A-Way Terms & Conditions',
                            value: _acceptedTerms,
                            onChanged: _busy
                                ? null
                                : (v) => setState(
                                    () => _acceptedTerms = v == true,
                                  ),
                          ),
                          Expanded(
                            child: Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                const Text('I agree to the Rent-A-Way '),
                                TextButton(
                                  onPressed: _showTerms,
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                  ),
                                  child: const Text(
                                    'Terms & Conditions',
                                    style: TextStyle(
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed:
                          _busy ||
                              (_registering &&
                                  (!_acceptedTerms || _identityPath == null))
                          ? null
                          : _submit,
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
                          : () => setState(() {
                              _registering = !_registering;
                              _acceptedTerms = false;
                            }),
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
