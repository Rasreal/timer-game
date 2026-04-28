import '/auth/phone_enter/phone_only_widget.dart';
import '/auth/shared/auth_utils.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/flutter_flow/flutter_flow_widgets.dart';
import '/main.dart';
import 'package:provider/provider.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart'
    as smooth_page_indicator;
import 'package:ff_theme/flutter_flow/flutter_flow_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '/custom_code/widgets/pwa_install_bottom_sheet.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'start_page_model.dart';
export 'start_page_model.dart';

class StartPageWidget extends StatefulWidget {
  const StartPageWidget({super.key});

  static String routeName = 'startPage';
  static String routePath = '/start';

  @override
  State<StartPageWidget> createState() => _StartPageWidgetState();
}

class _StartPageWidgetState extends State<StartPageWidget> {
  late StartPageModel _model;
  final scaffoldKey = GlobalKey<ScaffoldState>();

  static const List<OnboardingPage> _onboardingPages = [
    OnboardingPage(
      icon: FFIcons.kicons8FastCart64,
      title: 'DAX Agent',
      subtitle: '',
      isFirstPage: true,
    ),
    OnboardingPage(
      image: 'assets/images/cart100.png',
      title: 'Корзина заказов',
      subtitle: 'Управлять заказами \nлегко и эффективно',
    ),
    OnboardingPage(
      image: 'assets/images/cloudSync100.png',
      title: 'Синхронизация данных',
      subtitle: 'Автоматическая синхронизация \nданных с «1С-Бухгалтерия»',
    ),
    OnboardingPage(
      image: 'assets/images/finreport100.png',
      title: 'Отчеты',
      subtitle: 'Актуальные отчеты \n в реальном времени',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _model = createModel(context, () => StartPageModel());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      safeSetState(() {});
      _maybeShowPwaInstallPrompt();
    });
  }

  Future<void> _maybeShowPwaInstallPrompt() async {
    if (!kIsWeb || !mounted) return;
    if (pwaIsAlreadyInstalled()) return;
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const PwaInstallBottomSheet(),
    );
  }

  @override
  void dispose() {
    _model.dispose();
    super.dispose();
  }

  Widget _buildOnboardingPage(OnboardingPage page) {
    const animationDuration = Duration(milliseconds: 600);
    const animationCurve = Curves.easeInOut;
    const scaleBegin = Offset(0.9, 0.9);
    const scaleEnd = Offset(1.0, 1.0);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Icon or Image with consistent animation
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: page.isFirstPage
              ? _buildIconContainer(page.icon!)
              : _buildImage(page.image!),
        )
            .animate()
            .scale(
              curve: animationCurve,
              duration: animationDuration,
              begin: scaleBegin,
              end: scaleEnd,
            )
            .fade(curve: animationCurve, duration: animationDuration),

        // Title
        Padding(
          padding: EdgeInsets.only(
            top: page.isFirstPage ? 22.0 : 28.0,
            bottom: page.isFirstPage ? 86.0 : 0.0,
          ),
          child:
              page.isFirstPage ? _buildAppTitle() : _buildPageTitle(page.title),
        )
            .animate()
            .scale(
              curve: animationCurve,
              duration: animationDuration,
              begin: scaleBegin,
              end: scaleEnd,
            )
            .fade(curve: animationCurve, duration: animationDuration),

        // Subtitle (if not first page)
        if (!page.isFirstPage)
          Padding(
            padding: const EdgeInsets.only(top: 48.0),
            child: Text(
              page.subtitle,
              textAlign: TextAlign.center,
              style: FlutterFlowTheme.of(context).labelLarge.override(
                font: GoogleFonts.inter(
                  fontWeight:
                  FlutterFlowTheme.of(context).labelLarge.fontWeight,
                  fontStyle:
                  FlutterFlowTheme.of(context).labelLarge.fontStyle,
                ),
                letterSpacing: 0.0,
                fontWeight:
                FlutterFlowTheme.of(context).labelLarge.fontWeight,
                fontStyle:
                FlutterFlowTheme.of(context).labelLarge.fontStyle,
              ),
            ),
          )
              .animate()
              .scale(
                curve: animationCurve,
                duration: animationDuration,
                begin: scaleBegin,
                end: scaleEnd,
              )
              .fade(curve: animationCurve, duration: animationDuration),
      ],
    );
  }

  Widget _buildIconContainer(IconData icon) {
    return Container(
      width: 100.0,
      height: 100.0,
      decoration: const BoxDecoration(
        color: Color(0xFFFF6300),
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        color: Colors.white,
        size: 64.0,
      ),
    );
  }

  Widget _buildImage(String imagePath) {
    return Image.asset(imagePath, fit: BoxFit.fill);
  }

  Widget _buildAppTitle() {
    return RichText(
      textScaler: MediaQuery.of(context).textScaler,
      text: TextSpan(
        children: [
          TextSpan(
            text: 'DAX ',
            style: FlutterFlowTheme.of(context).displaySmall.override(
                  font: GoogleFonts.interTight(
                    fontWeight:
                        FlutterFlowTheme.of(context).displaySmall.fontWeight,
                    fontStyle:
                        FlutterFlowTheme.of(context).displaySmall.fontStyle,
                  ),
                  fontSize: 32.0,
                  letterSpacing: 0.0,
                  fontWeight:
                      FlutterFlowTheme.of(context).displaySmall.fontWeight,
                  fontStyle:
                      FlutterFlowTheme.of(context).displaySmall.fontStyle,
                ),
          ),
          TextSpan(
            text: 'Agent',
            style: FlutterFlowTheme.of(context).displaySmall.override(
                  font: GoogleFonts.interTight(
                    fontWeight:
                        FlutterFlowTheme.of(context).displaySmall.fontWeight,
                    fontStyle:
                        FlutterFlowTheme.of(context).displaySmall.fontStyle,
                  ),
                  color: Color(0xFFFF6300),
                  fontSize: 32.0,
                  letterSpacing: 0.0,
                  fontWeight:
                      FlutterFlowTheme.of(context).displaySmall.fontWeight,
                  fontStyle:
                      FlutterFlowTheme.of(context).displaySmall.fontStyle,
                ),
          ),
        ],
        style: FlutterFlowTheme.of(context).headlineSmall.override(
              font: GoogleFonts.interTight(
                fontWeight:
                    FlutterFlowTheme.of(context).headlineSmall.fontWeight,
                fontStyle: FlutterFlowTheme.of(context).headlineSmall.fontStyle,
              ),
              letterSpacing: 0.0,
              fontWeight: FlutterFlowTheme.of(context).headlineSmall.fontWeight,
              fontStyle: FlutterFlowTheme.of(context).headlineSmall.fontStyle,
            ),
      ),
    );
  }

  Widget _buildPageTitle(String title) {
    return Text(
      title,
      textAlign: TextAlign.center,
      style: FlutterFlowTheme.of(context).headlineSmall.override(
          font: GoogleFonts.interTight(
            fontWeight: FlutterFlowTheme.of(context).headlineSmall.fontWeight,
            fontStyle: FlutterFlowTheme.of(context).headlineSmall.fontStyle,
          ),
          letterSpacing: 0.0,
          fontWeight: FlutterFlowTheme.of(context).headlineSmall.fontWeight,
          fontStyle: FlutterFlowTheme.of(context).headlineSmall.fontStyle,
        ),
    );
  }

  Future<void> _showPhoneEnterModal() async {
    await AuthUtils.showAuthModal(
      context,
      child: const PhoneOnlyWidget(),
    ).then((value) => safeSetState(() {}));
  }

  // // TODO: remove before release
  // void _toggleTheme() {
  //   final appState = context.read<FFAppState>();
  //   final isDark = appState.themeMode == 'dark';
  //   final next = isDark ? 'light' : 'dark';
  //   appState.update(() => appState.themeMode = next);
  //   MyApp.of(context).setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark);
  // }

  @override
  Widget build(BuildContext context) {
    return Title(
        title: 'DAX Agent',
        color: FlutterFlowTheme.of(context).primary.withAlpha(0XFF),
        child: GestureDetector(
          onTap: () {
            FocusScope.of(context).unfocus();
            FocusManager.instance.primaryFocus?.unfocus();
          },
          child: Scaffold(
            key: scaffoldKey,
            resizeToAvoidBottomInset: false,
            backgroundColor: FlutterFlowTheme.of(context).secondaryBackground,
            body: SafeArea(
              child: Stack(
                children: [
                  Column(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Stack(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 50.0),
                                  child: PageView.builder(
                                    controller: _model.pageViewController ??=
                                        PageController(),
                                    itemCount: _onboardingPages.length,
                                    itemBuilder: (context, index) =>
                                        _buildOnboardingPage(
                                            _onboardingPages[index]),
                                  ),
                                ),
                                Align(
                                  alignment: Alignment.bottomCenter,
                                  child:
                                      smooth_page_indicator.SmoothPageIndicator(
                                    controller: _model.pageViewController ??=
                                        PageController(),
                                    count: _onboardingPages.length,
                                    onDotClicked: (index) async {
                                      await _model.pageViewController!
                                          .animateToPage(
                                        index,
                                        duration:
                                            const Duration(milliseconds: 500),
                                        curve: Curves.ease,
                                      );
                                      safeSetState(() {});
                                    },
                                    effect: const smooth_page_indicator
                                        .ExpandingDotsEffect(
                                      expansionFactor: 3.0,
                                      spacing: 8.0,
                                      radius: 8.0,
                                      dotWidth: 8.0,
                                      dotHeight: 8.0,
                                      dotColor: Color(0xFFE0E3E7),
                                      activeDotColor: Color(0xFFFF7622),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom + 24.0),
                    child: FFButtonWidget(
                      onPressed: _showPhoneEnterModal,
                      text: 'Войти',
                      options: FFButtonOptions(
                        width: 327.0,
                        height: 50.0,
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        color: const Color(0xFFFF7622),
                        textStyle:
                            FlutterFlowTheme.of(context).titleSmall.override(
                                  font: GoogleFonts.interTight(),
                                  color: Colors.white,
                                  letterSpacing: 0.0,
                                  fontWeight: FlutterFlowTheme.of(context)
                                      .titleSmall
                                      .fontWeight,
                                  fontStyle: FlutterFlowTheme.of(context)
                                      .titleSmall
                                      .fontStyle,
                                ),
                        elevation: 0.0,
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                    ),
                  ),
                ],
              ),
                  // // TODO: remove before release
                  // Positioned(
                  //   top: 8.0,
                  //   right: 8.0,
                  //   child: Consumer<FFAppState>(
                  //     builder: (context, appState, _) {
                  //       final isDark = appState.themeMode == 'dark';
                  //       return IconButton(
                  //         onPressed: _toggleTheme,
                  //         icon: Icon(
                  //           isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                  //           color: FlutterFlowTheme.of(context).secondaryText,
                  //         ),
                  //       );
                  //     },
                  //   ),
                  // ),
                ],
              ),
            ),
          ),
        ));
  }
}

class OnboardingPage {
  final String? image;
  final IconData? icon;
  final String title;
  final String subtitle;
  final bool isFirstPage;

  const OnboardingPage({
    this.image,
    this.icon,
    required this.title,
    required this.subtitle,
    this.isFirstPage = false,
  });
}
