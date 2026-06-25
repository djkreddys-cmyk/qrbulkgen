import 'package:flutter/material.dart';

const appInk = Color(0xFF0F172A);
const appMuted = Color(0xFF64748B);
const appLine = Color(0xFFD8E2EF);
const appPanel = Color(0xFFF8FAFC);
const appBlue = Color(0xFF2563EB);
const appGreen = Color(0xFF059669);

class AppCard extends StatelessWidget {
  const AppCard(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(18)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: appLine),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: appInk.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(
      {super.key, required this.kicker, required this.title, this.body});

  final String kicker;
  final String title;
  final String? body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          kicker.toUpperCase(),
          style: const TextStyle(
            color: appMuted,
            fontWeight: FontWeight.w800,
            fontSize: 11,
            letterSpacing: 1.8,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: appInk,
                fontWeight: FontWeight.w900,
                height: 1.05,
              ),
        ),
        if (body != null) ...[
          const SizedBox(height: 8),
          Text(
            body!,
            style: const TextStyle(color: appMuted, height: 1.45),
          ),
        ],
      ],
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isBusy = false,
    this.isSecondary = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isBusy;
  final bool isSecondary;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: isBusy ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: isSecondary ? Colors.white : Colors.black,
        foregroundColor: isSecondary ? appInk : Colors.white,
        disabledBackgroundColor:
            isSecondary ? Colors.white : Colors.black.withValues(alpha: 0.5),
        disabledForegroundColor: isSecondary ? appMuted : Colors.white,
        side: BorderSide(color: isSecondary ? appLine : Colors.black),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      child: Text(isBusy ? 'Please wait...' : label,
          style: const TextStyle(fontWeight: FontWeight.w800)),
    );
  }
}

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.obscureText = false,
    this.maxLines = 1,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(),
            style: const TextStyle(
                color: appMuted, fontSize: 11, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          maxLines: obscureText ? 1 : maxLines,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: Colors.white,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: appLine)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: appLine)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: appInk, width: 1.3)),
          ),
        ),
      ],
    );
  }
}

class SegmentedPills<T> extends StatelessWidget {
  const SegmentedPills(
      {super.key,
      required this.value,
      required this.options,
      required this.onChanged});

  final T value;
  final List<SegmentOption<T>> options;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: options.map((option) {
        final active = option.value == value;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: option == options.last ? 0 : 8),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => onChanged(option.value),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                padding:
                    const EdgeInsets.symmetric(vertical: 11, horizontal: 10),
                decoration: BoxDecoration(
                  color: active ? appInk : Colors.white,
                  border: Border.all(color: active ? appInk : appLine),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  option.label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: active ? Colors.white : appInk,
                      fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class SegmentOption<T> {
  const SegmentOption(this.label, this.value);

  final String label;
  final T value;
}

class MetricTile extends StatelessWidget {
  const MetricTile(
      {super.key,
      required this.label,
      required this.value,
      this.color = appInk});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: appPanel,
          border: Border.all(color: appLine),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    color: appMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(value,
                style: TextStyle(
                    color: color, fontSize: 22, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }
}
