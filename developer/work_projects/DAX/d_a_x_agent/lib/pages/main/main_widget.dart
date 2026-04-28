import 'package:d_a_x_agent/backend/supabase/database/database.dart';

import '../../backend/api_requests/api_calls.dart';
import 'components/main_app_bar.dart';
import 'components/main_body.dart';
import '../../components/no_internet.dart';
import '/flutter_flow/index.dart';
import '/administration/city/first_city/first_city_widget.dart';
import '/administration/main/shop_botton_sheet/shop_botton_sheet_widget.dart';
import '/administration/main/shops/shop_item_main/shop_item_main_widget.dart';
import '/auth/supabase_auth/auth_util.dart';
import '/backend/backend.dart';
import '/backend/dynamic_supabase_service.dart';
import '/backend/coverage_service.dart';
import '/backend/settings_service.dart';
import '/bloc/bloc.dart';
import '/components/loading_widget.dart';
import '/components/filter_empty/filter_empty_widget.dart';
import '/flutter_flow/flutter_flow_calendar.dart';
import '/flutter_flow/flutter_flow_icon_button.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/custom_code/actions/index.dart' as actions;
import '/flutter_flow/custom_functions.dart' as functions;
import '/flutter_flow/permissions_util.dart';
import '/index.dart';
import 'package:ff_commons/api_requests/api_paging_params.dart';
import 'package:marketplace_check_internet_connection_library_vrjzhi/custom_code/actions/index.dart'
    as marketplace_check_internet_connection_library_vrjzhi_actions;
import 'package:easy_debounce/easy_debounce.dart';
import 'package:ff_theme/flutter_flow/flutter_flow_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '/custom_code/widgets/pwa_install_bottom_sheet.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:text_search/text_search.dart';
import 'main_model.dart';
export 'main_model.dart';

import 'constants.dart';

class MainWidget extends StatefulWidget {
  const MainWidget({super.key});

  static String routeName = 'main';
  static String routePath = '/main';

  @override
  State<MainWidget> createState() => _MainWidgetState();
}

class _MainWidgetState extends State<MainWidget> {
  late MainModel _model;
  final scaffoldKey = GlobalKey<ScaffoldState>();
  LatLng? currentUserLocationValue;

  @override
  void initState() {
    super.initState();
    _model = createModel(context, () => MainModel());
    _initializeComponents();
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _initializePageData();
    });
  }

  void _initializeComponents() {
    _model.coverageSearchTextFieldTextController = TextEditingController();
    _model.coverageSearchTextFieldFocusNode = FocusNode();
    _model.notCoverageSearchTextFieldTextController = TextEditingController();
    _model.notCoverageSearchTextFieldFocusNode = FocusNode();
  }

  Future<void> _initializePageData() async {
    try {
      debugPrint('🚀 Starting initialization...');
      await _getCurrentLocation();
      debugPrint(
          '📍 Location: ${currentUserLocationValue?.latitude}, ${currentUserLocationValue?.longitude}');

      await _initializeAppState();

      await Future.wait([
        _checkInternetConnection(),
        _setupPermissions(),
        _loadAndValidateUser(),
        _initializeBloCs(),
      ]);

      // Load shops AFTER app state is fully initialized
      await _loadShops();

      await _handleCitySelection();
      debugPrint(
          '✅ Initialization complete. Shops loaded: ${_model.shops.length}');
    } finally {
      _model.loading = false;
      if (mounted) safeSetState(() {});
      debugPrint('🔄 Loading state cleared');
    }
  }

  Future<void> _initializeBloCs() async {
    // Only attempt auto-connection if we have saved state
    if (DynamicSupabaseService.instance.currentCompanyName != null) {
      return; // Already connected or will be restored
    }

    // Get the current user's phone from auth
    String phoneNumber = currentPhoneNumber; // From auth_util

    // Only proceed if we have a valid authenticated user
    if (phoneNumber.isEmpty) {
      return; // No valid user, skip auto-connection
    }

    // Use default BIN for database connection
    const String defaultBin = '123456789012';

    // Initialize database connection via BLoC
    if (mounted) {
      context.read<DatabaseBloc>().add(ConnectToDatabaseEvent(
            phoneNumber: phoneNumber,
            bin: defaultBin,
          ));
    }
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

  Future<void> _getCurrentLocation() async {
    currentUserLocationValue = await getCurrentUserLocation(
      defaultLocation: const LatLng(0.0, 0.0),
      cached: true,
    );
  }

  Future<void> _initializeAppState() async {
    _model.loading = true;
    // Check coverage setting from settings table
    final coverageEnabled = await SettingsService.isCoverageEnabled();
    FFAppState().mainPageType1 = coverageEnabled;
    FFAppState().selectedDate = functions.date(getCurrentTimestamp);
    _model.searchActive = false;
    debugPrint('🔧 Coverage enabled from settings: $coverageEnabled');
    debugPrint('🔧 mainPageType1: ${FFAppState().mainPageType1}');
  }

  Future<void> _refreshEnvironmentState() async {
    // Check coverage setting from settings table
    final coverageEnabled = await SettingsService.isCoverageEnabled();
    final newMainPageType1 = coverageEnabled;

    if (FFAppState().mainPageType1 != newMainPageType1) {
      debugPrint(
          '🔄 Coverage setting changed! Updating from ${FFAppState().mainPageType1} to $newMainPageType1');
      FFAppState().mainPageType1 = newMainPageType1;
      // Reload shops with new coverage setting
      _loadShops();
    }
  }

  Future<void> _checkInternetConnection() async {
    _model.checkInternet =
        await marketplace_check_internet_connection_library_vrjzhi_actions
            .checkInternetConnection();
    _model.checkInternett = _model.checkInternet!;

    if (mounted) {
      safeSetState(() {});
    }

    if (mounted) {
      await actions.getSafeAreaPadding(context);
    }
  }

  Future<void> _setupPermissions() async {
    if (!(await getPermissionStatus(locationPermission))) {
      await requestPermission(locationPermission);
    }
  }

  Future<void> _loadShops() async {
    if (!mounted || currentUserLocationValue == null) return;

    // Only load shops via BLoC when coverage mode is enabled (mainPageType1 = true)
    // When coverage is disabled (mainPageType1 = false), shops are loaded via pagination in MainPageType2
    if (FFAppState().mainPageType1) {
      debugPrint('🏪 Loading shops via BLoC for coverage mode (mainPageType1 = true)');
      context.read<ShopsBloc>().add(LoadNearbyShops(
            userLocation: currentUserLocationValue!,
            userId: currentUserUid,
            day: functions.date(_model.calendarSelectedDay?.start),
            radius: 20000,
            enableCoverage: false, // Don't check coverage here, already checked above
            sortByDaySchedule: true, // Enable day-based sorting
          ));
    } else {
      debugPrint('🏪 Skipping BLoC load - pagination will handle shops (mainPageType1 = false)');
    }
  }

  Future<void> _loadAndValidateUser() async {
    print('👤 _loadAndValidateUser called');
    print('👤 currentPhoneNumber: "$currentPhoneNumber"');
    print('👤 currentUserUid: "$currentUserUid"');
    print('👤 currentUserEmail: "$currentUserEmail"');

    // Clear stale userInfo from previous session before any checks
    FFAppState().updateUserInfoStruct((e) => e
      ..id = ''
      ..phoneNumber = '');

    // Check if demo user by email only (most reliable - comes from active auth session)
    final isDemoUser = currentUserEmail == '+77777777777@daxagent.kz';

    print('👤 isDemoUser check: $isDemoUser');

    // Check if demo user - skip ALL database queries
    if (isDemoUser) {
      print('🎭 DEMO USER DETECTED - skipping database validation');
      print('🎭 Setting demo user info in FFAppState');
      FFAppState().updateUserInfoStruct((e) => e
        ..id = '+77777777777'
        ..role = 2
        ..lastnameUser = 'Demo'
        ..firstnameUser = 'User'
        ..patronymicUser = 'Demo'
        ..phoneNumber = '+77777777777'
        ..userRoleId = 2
        ..isActive = true);
      print('✅ Demo user info set successfully');
      print('✅ User info after set: ${FFAppState().userInfo.phoneNumber}');
      return;
    }

    print('👤 Not a demo user - proceeding with database validation');

    // Regular user flow - query database
    _model.activeUser = await UsersTable().queryRows(
      queryFn: (q) => q.eqOrNull('id', currentUserUid),
    );

    if (!mounted) return;

    if (_model.activeUser?.firstOrNull?.roleUser == 0) {
      await _handleUnauthorizedUser();
    } else {
      _updateUserInfo();
    }
  }

  Future<void> _handleUnauthorizedUser() async {
    if (!mounted) return;

    GoRouter.of(context).prepareAuthEvent();
    await authManager.signOut();
    GoRouter.of(context).clearRedirectLocation();

    if (!mounted) return;

    await showDialog(
      context: context,
      builder: (alertDialogContext) => AlertDialog(
        content: Text(FFLocalizations.of(context).getText('main_no_access')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(alertDialogContext),
            child: Text(FFLocalizations.of(context).getText('main_close')),
          ),
        ],
      ),
    );

    if (mounted) {
      context.goNamedAuth(StartPageWidget.routeName, mounted);
    }
  }

  void _updateUserInfo() {
    final user = _model.activeUser?.firstOrNull;
    if (user != null && mounted) {
      FFAppState().updateUserInfoStruct((e) => e
        ..id = user.id
        ..role = user.roleUser
        ..lastnameUser = user.lastnameUser
        ..firstnameUser = user.firstnameUser
        ..patronymicUser = user.patronymicUser
        ..iinUser = user.iinUser
        ..phoneNumber = user.phoneNumber
        ..emailUser = user.emailUser
        ..userRoleId = user.userRoleId
        ..isActive = user.isActive);
      safeSetState(() {});
    }
  }

  Future<void> _handleCitySelection() async {
    print('🏙️ _handleCitySelection called');
    print('🏙️ currentPhoneNumber: "$currentPhoneNumber"');
    print('🏙️ currentUserEmail: "$currentUserEmail"');
    print('🏙️ selectedCity.id: ${FFAppState().selectedCity.id}');

    // Check if demo user by email only (most reliable - comes from active auth session)
    final isDemoUser = currentUserEmail == '+77777777777@daxagent.kz';

    print('🏙️ isDemoUser: $isDemoUser');

    // Set demo city for demo user (always reset for demo)
    if (isDemoUser) {
      print('🎭 DEMO USER - Force setting demo city (overriding existing)');
      FFAppState().updateSelectedCityStruct((e) => e
        ..id = 9999
        ..name = 'Алматы (Demo)'
        ..latitude = 43.2220
        ..longitude = 76.8512);
      print('✅ Demo city set: ${FFAppState().selectedCity.name}');
      return;
    }

    print('🏙️ Not demo user or city already set');

    if (FFAppState().selectedCity.id == 0) {
      // Use BLoC to find nearest city
      if (mounted && currentUserLocationValue != null) {
        context
            .read<CitiesBloc>()
            .add(FindNearestCity(currentUserLocationValue!));
        // Wait a moment for the BLoC to process
        await Future.delayed(const Duration(milliseconds: 500));

        // Show city selection modal if still no city selected
        if (mounted && !((FFAppState().selectedCity.id != null) &&
            (FFAppState().selectedCity.id != 0))) {
          await _showCitySelectionModal();
        }
      }
    }
  }

  Future<void> _showCitySelectionModal() async {
    if (!mounted) return;

    await showModalBottomSheet(
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      context: context,
      builder: (context) => GestureDetector(
        onTap: () {
          FocusScope.of(context).unfocus();
          FocusManager.instance.primaryFocus?.unfocus();
        },
        child: Padding(
          padding: MediaQuery.viewInsetsOf(context),
          child: Container(
            height:
                MediaQuery.sizeOf(context).height * Constants.modalHeightRatio,
            child: FirstCityWidget(),
          ),
        ),
      ),
    ).then((value) {
      if (mounted) {
        safeSetState(() {});
      }
    });
  }

  @override
  void dispose() {
    _model.dispose();
    super.dispose();
  }

  void _performSearch(String searchText, bool isCoverage) {
    if (searchText.isEmpty) {
      _model.searchActive = false;
      safeSetState(() {});
      return;
    }

    if (isCoverage) {
      _performCoverageSearch(searchText);
    } else {
      _performNonCoverageSearch(searchText);
    }
  }

  void _performCoverageSearch(String searchText) {
    final results = TextSearch(_model.shops
            .map((e) => e.nameShop)
            .map((name) => TextSearchItem.fromTerms(name, [name]))
            .toList())
        .search(searchText)
        .map((r) => r.object)
        .take(Constants.searchResultLimit)
        .toList();

    _model.simpleSearchResults = results;
    _model.searchShops = _model.shops
        .where((shop) => results.contains(shop.nameShop))
        .cast<ShopsRow>()
        .toList();
    _model.searchActive = true;
    safeSetState(() {});
  }

  Future<void> _performNonCoverageSearch(String searchText) async {
    final shops = await actions.searchShops(searchText, '');
    _model.searchShops = shops?.cast<ShopsRow>().toList() ?? [];
    _model.searchActive = true;
    safeSetState(() {});
  }

  Future<void> _onCalendarDateChanged(DateTimeRange? newSelectedDate) async {
    if (_model.calendarSelectedDay == newSelectedDate) return;

    _model.calendarSelectedDay = newSelectedDate;
    currentUserLocationValue = await getCurrentUserLocation(
      defaultLocation: LatLng(0.0, 0.0),
    );

    // Update selected date in app state
    FFAppState().selectedDate =
        functions.date(_model.calendarSelectedDay?.start);

    // Use BLoC to reload shops with new date for coverage-aware and day-based sorting
    if (currentUserLocationValue != null && mounted) {
      context.read<ShopsBloc>().add(LoadNearbyShops(
            userLocation: currentUserLocationValue!,
            userId: currentUserUid,
            day: functions.date(_model.calendarSelectedDay?.start),
            radius: 10000,
            enableCoverage: true, // Enable coverage checking
            sortByDaySchedule: true, // Enable day-based sorting
          ));
    }

    // Clear the local model shops as BLoC will handle the state
    _model.shops = [];
    safeSetState(() {});
  }

  void _clearSearch(bool isCoverage) {
    final controller = isCoverage
        ? _model.coverageSearchTextFieldTextController
        : _model.notCoverageSearchTextFieldTextController;
    controller?.clear();
    _model.searchActive = false;
    safeSetState(() {});
  }

  void _toggleCalendar() {
    _model.calendar = !_model.calendar;
    safeSetState(() {});
  }


  Future<void> _showShopBottomSheet(ShopsRow shop) async {
    await showModalBottomSheet(
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      context: context,
      builder: (context) => GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Padding(
          padding: MediaQuery.viewInsetsOf(context),
          child: SizedBox(
            height:
                MediaQuery.sizeOf(context).height * Constants.modalHeightRatio,
            child: ShopBottonSheetWidget(rowShop: shop),
          ),
        ),
      ),
    );
    if (mounted) safeSetState(() {});
  }

  // UI Component builders
  Widget _buildSearchField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required Function(String) onChanged,
    required VoidCallback onClear,
    required bool showClearButton,
  }) {
    return Container(
      width: double.infinity,
      height: Constants.searchFieldHeight,
      decoration: BoxDecoration(
        color: FlutterFlowTheme.of(context).secondaryBackground,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(
          color: FlutterFlowTheme.of(context).primaryBackground,
          width: 2.0,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Padding(
              padding: EdgeInsetsDirectional.fromSTEB(16.0, 0.0, 6.0, 0.0),
              child: Row(
                children: [
                  Icon(
                    FFIcons.kicons8Search,
                    color: Color(0xFFC9C9C9),
                    size: 24.0,
                  ),
                  Expanded(
                    child: Padding(
                      padding:
                          EdgeInsetsDirectional.fromSTEB(8.0, 0.0, 0.0, 0.0),
                      child: TextFormField(
                        controller: controller,
                        focusNode: focusNode,
                        onChanged: onChanged,
                        autofocus: false,
                        obscureText: false,
                        decoration: InputDecoration(
                          isDense: false,
                          alignLabelWithHint: true,
                          hintText: FFLocalizations.of(context).getText('common_search'),
                          hintStyle:
                              FlutterFlowTheme.of(context).bodyMedium.override(
                                    font: GoogleFonts.inter(
                                      fontWeight: FlutterFlowTheme.of(context)
                                          .bodyMedium
                                          .fontWeight,
                                      fontStyle: FlutterFlowTheme.of(context)
                                          .bodyMedium
                                          .fontStyle,
                                    ),
                                    color: Color(0xFFC9C9C9),
                                    fontSize: 15.0,
                                    letterSpacing: 0.0,
                                    fontWeight: FlutterFlowTheme.of(context)
                                        .bodyMedium
                                        .fontWeight,
                                    fontStyle: FlutterFlowTheme.of(context)
                                        .bodyMedium
                                        .fontStyle,
                                  ),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                                color: Colors.transparent, width: 1.0),
                            borderRadius: BorderRadius.circular(8.0),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                                color: Colors.transparent, width: 1.0),
                            borderRadius: BorderRadius.circular(8.0),
                          ),
                          errorBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                                color: FlutterFlowTheme.of(context).error,
                                width: 1.0),
                            borderRadius: BorderRadius.circular(8.0),
                          ),
                          focusedErrorBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                                color: FlutterFlowTheme.of(context).error,
                                width: 1.0),
                            borderRadius: BorderRadius.circular(8.0),
                          ),
                          contentPadding: EdgeInsetsDirectional.fromSTEB(
                              0.0, 0.0, 8.0, 0.0),
                        ),
                        style: FlutterFlowTheme.of(context).bodyMedium.override(
                              font: GoogleFonts.inter(),
                              fontSize: 15.0,
                              letterSpacing: 0.0,
                            ),
                        textAlign: TextAlign.start,
                        cursorColor: FlutterFlowTheme.of(context).primaryText,
                      ),
                    ),
                  ),
                  if (showClearButton)
                    Padding(
                      padding:
                          EdgeInsetsDirectional.fromSTEB(4.0, 0.0, 4.0, 0.0),
                      child: InkWell(
                        onTap: onClear,
                        child: Icon(
                          Icons.clear_rounded,
                          color: FlutterFlowTheme.of(context).primary,
                          size: 24.0,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResultCount(int count) {
    return Padding(
      padding: EdgeInsetsDirectional.fromSTEB(0.0, 5.0, 0.0, 0.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Padding(
            padding: EdgeInsetsDirectional.fromSTEB(0.0, 0.0, 14.0, 0.0),
            child: Text(
              'Найдено [ $count ]',
              style: FlutterFlowTheme.of(context).labelMedium.override(
                    font: GoogleFonts.inter(),
                    color: Constants.searchTextColor,
                    fontSize: 13.0,
                    letterSpacing: 0.0,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShopList(List<ShopsRow> shops, String keyPrefix) {
    if (shops.isEmpty) {
      return Center(child: FilterEmptyWidget());
    }

    // Check if these are test shops
    final hasTestShops = shops.any((shop) => shop.id >= 9997);

    return Column(
      children: [
        // Show test data notice if we're displaying test shops
        if (hasTestShops)
          Container(
            margin: const EdgeInsets.all(Constants.defaultPadding),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'No shops found in database. Showing test data for development.',
                    style: FlutterFlowTheme.of(context).bodySmall.override(
                          color: Colors.orange[800],
                          fontSize: 12,
                        ),
                  ),
                ),
              ],
            ),
          ),

        Expanded(
          child: ListView.separated(
            padding: EdgeInsets.fromLTRB(
                0, Constants.defaultPadding, 0, Constants.defaultPadding),
            shrinkWrap: true,
            scrollDirection: Axis.vertical,
            itemCount: shops.length,
            separatorBuilder: (_, __) =>
                SizedBox(height: Constants.defaultPadding),
            itemBuilder: (context, index) {
              final shop = shops[index];
              return InkWell(
                onTap: () => _showShopBottomSheet(shop),
                child: ShopItemMainWidget(
                  key: Key('${keyPrefix}_${shop.id}'),
                  shopTable: shop,
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<FFAppState>();

    // Check for coverage setting changes and refresh if needed (fire-and-forget)
    _refreshEnvironmentState().then((_) {
      // State update will happen inside _refreshEnvironmentState if needed
    });

    if (currentUserLocationValue == null) {
      return Container(
        color: FlutterFlowTheme.of(context).primaryBackground,
        child: Center(
          child: SizedBox(
            width: 30.0,
            height: 30.0,
            child: SpinKitPulse(
              color: Constants.primaryColor,
              size: 30.0,
            ),
          ),
        ),
      );
    }

    return Title(
      title: 'main',
      color: FlutterFlowTheme.of(context).primary.withAlpha(0XFF),
      child: BlocListener<ShopsBloc, ShopsState>(
        listener: (context, state) {
          if (state is ShopsLoaded) {
            // Update shops from BLoC state for all environments
            _model.shops = state.shops;
            _model.loading = false;
            safeSetState(() {});
            debugPrint('✅ BLoC loaded ${state.shops.length} shops');
          } else if (state is ShopsEmpty) {
            _model.shops = [];
            _model.loading = false;
            safeSetState(() {});
          } else if (state is ShopsError) {
            _model.loading = false;
            safeSetState(() {});
            debugPrint('Error from ShopsBloc: ${state.message}');
          } else if (state is ShopsSearchResults) {
            _model.searchShops = state.shops;
            _model.searchActive = true;
            safeSetState(() {});
          }
        },
        child: GestureDetector(
          onTap: () {
            FocusScope.of(context).unfocus();
            FocusManager.instance.primaryFocus?.unfocus();
          },
          child: Scaffold(
            key: scaffoldKey,
            backgroundColor: FlutterFlowTheme.of(context).primaryBackground,
            appBar: MainAppBar(
              model: _model,
              onCalendarToggle: _toggleCalendar,
              showCalendarFilter: FFAppState().mainPageType1,
            ),
            body: MainBody(
              model: _model,
              checkInternet: _model.checkInternett,
              showCalendar: _model.calendar,
              buildNoInternetView: buildNoInternetView,
              buildSearchField: _buildSearchField,
              buildSearchResultCount: _buildSearchResultCount,
              buildShopList: _buildShopList,
              onSearchChanged: _performSearch,
              onSearchClear: _clearSearch,
              onCalendarDateChanged: _onCalendarDateChanged,
              onShopTap: _showShopBottomSheet,
              currentUserLocation: currentUserLocationValue,
            ),
            //bottomNavigationBar: NavbarWidget(pageIndex: 1),
          ),
        ),
      ),
    );
  }
}
