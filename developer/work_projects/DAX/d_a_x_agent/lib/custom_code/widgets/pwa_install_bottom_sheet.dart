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
import 'dart:js_interop';

// JS helpers to interact with the deferred beforeinstallprompt event
@JS('eval')
external JSString _jsEval(JSString code);

bool _hasInstallPrompt() {
  try {
    final result = _jsEval('!!window.__pwaInstallPrompt'.toJS);
    return result.toDart == 'true';
  } catch (_) {
    return false;
  }
}

void _triggerPrompt() {
  try {
    _jsEval(
        'if(window.__pwaInstallPrompt){window.__pwaInstallPrompt.prompt();window.__pwaInstallPrompt=null;}'
            .toJS);
  } catch (_) {}
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

  @override
  void initState() {
    super.initState();
    _detectPlatform();
  }

  void _detectPlatform() {
    if (!kIsWeb) return;

    final userAgent =
        web.window.navigator.userAgent.toLowerCase();

    final isIOS = userAgent.contains('iphone') ||
        userAgent.contains('ipad') ||
        userAgent.contains('ipod');

    final isAndroid = userAgent.contains('android');

    if (isIOS) {
      setState(() {
        _platform = _PlatformType.ios;
        // On iOS we always show instructions (no install event available)
        _canInstall = true;
      });
    } else if (isAndroid) {
      setState(() {
        _platform = _PlatformType.android;
        // Check if deferred prompt was captured by the inline JS in index.html
        _canInstall = _hasInstallPrompt();
      });
    }
  }

  Future<void> _triggerAndroidInstall() async {
    if (!_hasInstallPrompt()) return;
    _triggerPrompt();
    setState(() => _canInstall = false);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width ?? double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
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
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Добавьте на главный экран для\nбыстрого доступа',
                      style: FlutterFlowTheme.of(context)
                          .bodySmall
                          .override(
                            fontFamily:
                                FlutterFlowTheme.of(context).bodySmallFamily,
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

          if (_platform == _PlatformType.android) ...[
            _AndroidContent(
              canInstall: _canInstall,
              onInstall: _triggerAndroidInstall,
            ),
          ] else if (_platform == _PlatformType.ios) ...[
            const _IosContent(),
          ] else ...[
            Text(
              'Откройте это приложение в браузере\nна вашем устройстве для установки.',
              textAlign: TextAlign.center,
              style: FlutterFlowTheme.of(context).bodyMedium.override(
                    fontFamily:
                        FlutterFlowTheme.of(context).bodyMediumFamily,
                    color: FlutterFlowTheme.of(context).secondaryText,
                  ),
            ),
          ],

          const SizedBox(height: 16),

          // Dismiss button
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Text(
              'Не сейчас',
              style: FlutterFlowTheme.of(context).bodyMedium.override(
                    fontFamily:
                        FlutterFlowTheme.of(context).bodyMediumFamily,
                    color: FlutterFlowTheme.of(context).secondaryText,
                    decoration: TextDecoration.underline,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _PlatformType { ios, android, other }

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

// ── iOS section ──────────────────────────────────────────────────────────────

class _IosContent extends StatelessWidget {
  const _IosContent({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Safari warning
        Container(
          padding: const EdgeInsets.all(12),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3CD),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFFFD166)),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline,
                  color: Color(0xFF856404), size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Откройте страницу в Safari для установки',
                  style: FlutterFlowTheme.of(context).bodySmall.override(
                        fontFamily:
                            FlutterFlowTheme.of(context).bodySmallFamily,
                        color: const Color(0xFF856404),
                      ),
                ),
              ),
            ],
          ),
        ),

        Text(
          'Как установить:',
          style: FlutterFlowTheme.of(context).bodyMedium.override(
                fontFamily: FlutterFlowTheme.of(context).bodyMediumFamily,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        _Step(
          number: '1',
          icon: Icons.ios_share,
          text: 'Нажмите кнопку «Поделиться» внизу экрана Safari',
        ),
        _Step(
          number: '2',
          icon: Icons.add_box_outlined,
          text: 'Прокрутите и выберите «На экран «Домой»»',
        ),
        _Step(
          number: '3',
          icon: Icons.check_circle_outline,
          text: 'Нажмите «Добавить» в правом верхнем углу',
        ),
      ],
    );
  }
}

// ── Shared step widget ────────────────────────────────────────────────────────

class _Step extends StatelessWidget {
  const _Step({
    required this.number,
    required this.text,
    this.icon,
  });

  final String number;
  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
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
          if (icon != null) ...[
            Icon(icon, size: 18, color: FlutterFlowTheme.of(context).primary),
            const SizedBox(width: 6),
          ],
          Expanded(
            child: Text(
              text,
              style: FlutterFlowTheme.of(context).bodySmall.override(
                    fontFamily: FlutterFlowTheme.of(context).bodySmallFamily,
                    color: FlutterFlowTheme.of(context).primaryText,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
