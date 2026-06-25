import 'package:flutter/material.dart';

import '../core/app_state.dart';
import '../widgets/app_components.dart';

enum AuthMode { login, register }

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.appState});

  final AppState appState;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  AuthMode mode = AuthMode.login;
  final nameController = TextEditingController();
  final identifierController = TextEditingController();
  final passwordController = TextEditingController();
  bool obscurePassword = true;

  @override
  void dispose() {
    nameController.dispose();
    identifierController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    try {
      if (mode == AuthMode.login) {
        await widget.appState.login(
          identifier: identifierController.text.trim(),
          password: passwordController.text,
        );
      } else {
        await widget.appState.register(
          name: nameController.text.trim(),
          identifier: identifierController.text.trim(),
          password: passwordController.text,
        );
      }
    } catch (_) {
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = widget.appState;
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FB),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 18),
            const SectionTitle(
              kicker: 'QRBulkGen',
              title: 'Bulk QR workflows, rebuilt for mobile.',
              body:
                  'Generate, manage, and inspect QR operations from a cleaner Flutter interface.',
            ),
            const SizedBox(height: 20),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SegmentedPills<AuthMode>(
                    value: mode,
                    options: const [
                      SegmentOption('Login', AuthMode.login),
                      SegmentOption('Register', AuthMode.register),
                    ],
                    onChanged: (value) => setState(() => mode = value),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    mode == AuthMode.login ? 'Welcome back' : 'Create account',
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 16),
                  if (mode == AuthMode.register) ...[
                    AppTextField(
                        label: 'Name',
                        controller: nameController,
                        hint: 'Your name'),
                    const SizedBox(height: 12),
                  ],
                  AppTextField(
                    label: 'Email or mobile number',
                    controller: identifierController,
                    hint: 'name@example.com',
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: 'Password',
                    controller: passwordController,
                    hint: 'Password',
                    obscureText: obscurePassword,
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () =>
                          setState(() => obscurePassword = !obscurePassword),
                      child: Text(
                          obscurePassword ? 'Show password' : 'Hide password'),
                    ),
                  ),
                  if (appState.error.isNotEmpty) ...[
                    Text(appState.error,
                        style: const TextStyle(color: Color(0xFFB91C1C))),
                    const SizedBox(height: 12),
                  ],
                  PrimaryButton(
                    label: mode == AuthMode.login ? 'Login' : 'Register',
                    onPressed: submit,
                    isBusy: appState.isSubmitting,
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
