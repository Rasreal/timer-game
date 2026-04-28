// Automatic FlutterFlow imports
import '/backend/backend.dart';
import '/backend/dynamic_supabase_service.dart';
import '/backend/schema/structs/index.dart';
import '/backend/schema/enums/enums.dart';
import '/backend/supabase/supabase.dart';
import '/actions/actions.dart' as action_blocks;
import 'package:ff_theme/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'index.dart'; // Imports other custom widgets
import '/custom_code/actions/index.dart'; // Imports custom actions
import '/flutter_flow/custom_functions.dart'; // Imports custom functions
import 'package:flutter/material.dart';
// Begin custom widget code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:web/web.dart' as web;
import 'dart:js_util' as js_util;

bool _hasInstallPrompt() {
  try {
    final prompt = js_util.getProperty<Object?>(js_util.globalThis, '__pwaInstallPrompt');
    return prompt != null;
  } catch (_) {
    return false;
  }
}

bool pwaIsAlreadyInstalled() {
  try {
    final isStandalone = web.window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return true;
    final nav = js_util.getProperty<Object?>(js_util.globalThis, 'navigator');
    if (nav != null) {
      final standalone = js_util.getProperty<Object?>(nav, 'standalone');
      if (standalone == true) return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

void _triggerPrompt() {
  try {
    final w = js_util.globalThis;
    final prompt = js_util.getProperty<Object?>(w, '__pwaInstallPrompt');
    if (prompt != null) {
      js_util.callMethod(prompt, 'prompt', []);
      js_util.setProperty(w, '__pwaInstallPrompt', null);
    }
  } catch (_) {}
}

/// Registers a JS listener for beforeinstallprompt and calls [onPrompt] when
/// it fires. Returns a cleanup function to remove the listener.
void Function() _listenForInstallPrompt(void Function() onPrompt) {
  try {
    final handler = js_util.allowInterop((_) {
      onPrompt();
    });
    web.window.addEventListener('beforeinstallprompt', handler as web.EventListener);
    return () {
      try {
        web.window.removeEventListener('beforeinstallprompt', handler as web.EventListener);
      } catch (_) {}
    };
  } catch (_) {
    return () {};
  }
}

class PwaInstallBottomSheet extends StatefulWidget {
  const PwaInstallBottomSheet({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<PwaInstallBottomSheet> createState() => _PwaInstallBottomSheetState();
}

class _PwaInstallBottomSheetState extends State<PwaInstallBottomSheet> {
  _PlatformType _platform = _PlatformType.other;
  bool _canInstall = false;
  bool _isInstalled = false;
  void Function()? _removePromptListener;

  @override
  void initState() {
    super.initState();
    _detectPlatform();
  }

  @override
  void dispose() {
    _removePromptListener?.call();
    super.dispose();
  }

  void _detectPlatform() {
    if (!kIsWeb) return;

    if (pwaIsAlreadyInstalled()) {
      setState(() => _isInstalled = true);
      return;
    }

    final userAgent = web.window.navigator.userAgent.toLowerCase();

    final isIOS = userAgent.contains('iphone') ||
        userAgent.contains('ipad') ||
        userAgent.contains('ipod');

    final isAndroid = userAgent.contains('android');

    if (isIOS) {
      setState(() {
        _platform = _PlatformType.ios;
        _canInstall = true;
      });
    } else if (isAndroid) {
      setState(() {
        _platform = _PlatformType.android;
        _canInstall = _hasInstallPrompt();
      });
      if (!_canInstall) _waitForPrompt();
    } else {
      // Desktop: Mac/Windows Chrome, Edge, etc.
      setState(() {
        _platform = _PlatformType.desktop;
        _canInstall = _hasInstallPrompt();
      });
      if (!_canInstall) _waitForPrompt();
    }
  }

  /// If the prompt wasn't captured yet (race condition), attach a live listener.
  /// This covers the case where beforeinstallprompt fires after Flutter loads.
  void _waitForPrompt() {
    _removePromptListener = _listenForInstallPrompt(() {
      if (mounted) setState(() => _canInstall = true);
    });
  }

  Future<void> _triggerAndroidInstall() async {
    if (!_hasInstallPrompt()) return;
    _triggerPrompt();
    setState(() => _canInstall = false);
  }

  @override
  Widget build(BuildContext context) {
    // Don't show the sheet if already installed as a PWA
    if (_isInstalled) return const SizedBox.shrink();

    return Container(
      width: widget.width ?? double.infinity,
      padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).padding.bottom + 32),
      decoration: BoxDecoration(
        color: FlutterFlowTheme.of(context).secondaryBackground,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: FlutterFlowTheme.of(context).primaryBackground,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // App icon + title
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  'assets/images/app_launcher_icon.png',
                  width: 52,
                  height: 52,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: FlutterFlowTheme.of(context).primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.apps,
                        color: Colors.white, size: 28),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Установить приложение',
                      style: FlutterFlowTheme.of(context)
                          .titleMedium
                          .override(
                            fontFamily: FlutterFlowTheme.of(context)
                                .titleMediumFamily,
                            fontSize: 20.0,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Добавьте ярлык приложения на главный экран для быстрого доступа.',
                      style: FlutterFlowTheme.of(context)
                          .bodySmall
                          .override(
                            fontFamily:
                                FlutterFlowTheme.of(context).bodySmallFamily,
                            fontSize: 13.0,
                            color:
                                FlutterFlowTheme.of(context).secondaryText,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          if (_platform == _PlatformType.ios) ...[
            const _IosContent(),
          ] else if (_platform == _PlatformType.desktop) ...[
            _DesktopContent(
              canInstall: _canInstall,
              onInstall: _triggerAndroidInstall,
            ),
          ] else ...[
            _AndroidContent(
              canInstall: _canInstall,
              onInstall: _triggerAndroidInstall,
            ),
          ],

          const SizedBox(height: 20),

          // Primary button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: FlutterFlowTheme.of(context).primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Text(
                'Понятно',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),

          const SizedBox(height: 10),

          // Dismiss button
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'Не сейчас',
                style: TextStyle(
                  color: FlutterFlowTheme.of(context).secondaryText,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _PlatformType { ios, android, desktop, other }

// ── Android section ──────────────────────────────────────────────────────────

class _AndroidContent extends StatelessWidget {
  const _AndroidContent({
    required this.canInstall,
    required this.onInstall,
  });

  final bool canInstall;
  final VoidCallback onInstall;

  @override
  Widget build(BuildContext context) {
    if (canInstall) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: onInstall,
          icon: const Icon(Icons.add_to_home_screen, color: Colors.white),
          label: const Text(
            'Добавить на главный экран',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: FlutterFlowTheme.of(context).primary,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
    }

    // Fallback: manual steps when prompt is not available
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Как установить:',
          style: FlutterFlowTheme.of(context).bodyMedium.override(
                fontFamily: FlutterFlowTheme.of(context).bodyMediumFamily,
                fontWeight: FontWeight.w600,
                fontSize: 15
              ),
        ),
        const SizedBox(height: 12),
        _Step(
          number: '1',
          text: 'Нажмите на меню браузера (⋮) в правом верхнем углу',
        ),
        _Step(
          number: '2',
          text: 'Выберите «Добавить на главный экран»',
        ),
        _Step(
          number: '3',
          text: 'Нажмите «Добавить» для подтверждения',
        ),
      ],
    );
  }
}

// ── Desktop section ──────────────────────────────────────────────────────────

class _DesktopContent extends StatelessWidget {
  const _DesktopContent({
    required this.canInstall,
    required this.onInstall,
  });

  final bool canInstall;
  final VoidCallback onInstall;

  @override
  Widget build(BuildContext context) {
    if (canInstall) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: onInstall,
          icon: const Icon(Icons.desktop_windows, color: Colors.white),
          label: const Text(
            'Установить приложение',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: FlutterFlowTheme.of(context).primary,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
    }

    // Fallback: manual steps for desktop browsers without prompt
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Как установить:',
          style: FlutterFlowTheme.of(context).bodyMedium.override(
                fontFamily: FlutterFlowTheme.of(context).bodyMediumFamily,
                fontWeight: FontWeight.w600,
                fontSize: 15,
              ),
        ),
        const SizedBox(height: 12),
        _Step(
          number: '1',
          text: 'Нажмите на значок установки (⊕) в адресной строке браузера',
        ),
        _Step(
          number: '2',
          text: 'Или откройте меню браузера (⋮) и выберите «Установить приложение»',
        ),
        _Step(
          number: '3',
          text: 'Нажмите «Установить» для подтверждения',
        ),
      ],
    );
  }
}

// ── iOS section ──────────────────────────────────────────────────────────────

class _IosContent extends StatelessWidget {
  const _IosContent();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Как установить:',
          style: FlutterFlowTheme.of(context).bodyMedium.override(
                fontFamily: FlutterFlowTheme.of(context).bodyMediumFamily,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: FlutterFlowTheme.of(context).primaryBackground,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _IosStep(
                icon: Icons.ios_share,
                text: 'Нажмите "Поделиться" в Safari',
              ),
              _IosStep(
                icon: Icons.add_box_outlined,
                text: 'Добавить на экран Домой',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── iOS step (icon only, no number) ──────────────────────────────────────────

class _IosStep extends StatelessWidget {
  const _IosStep({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 22, color: FlutterFlowTheme.of(context).secondaryText),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: FlutterFlowTheme.of(context).bodySmall.override(
                    fontFamily: FlutterFlowTheme.of(context).bodySmallFamily,
                    fontSize: (FlutterFlowTheme.of(context).bodySmall.fontSize ?? 12) + 4,
                    color: FlutterFlowTheme.of(context).primaryText,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shared step widget ────────────────────────────────────────────────────────

class _Step extends StatelessWidget {
  const _Step({
    required this.number,
    required this.text,
  });

  final String number;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: FlutterFlowTheme.of(context).primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Text(
              number,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: FlutterFlowTheme.of(context).primary,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: FlutterFlowTheme.of(context).bodySmall.override(
                    fontFamily: FlutterFlowTheme.of(context).bodySmallFamily,
                    fontSize: (FlutterFlowTheme.of(context).bodySmall.fontSize ?? 12) + 4,
                    color: FlutterFlowTheme.of(context).primaryText,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
