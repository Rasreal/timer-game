import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { divIcon, latLngBounds, type Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from '../shared/Icon'
import { FFIcon } from '../shared/FFIcon'
import { renderToStaticMarkup } from 'react-dom/server'
import { fetchShopsInBbox, type ShopMapPin } from '../features/map/api'
import { DEMO_PINS, MAP_CENTER } from '../features/map/demoPins'
import { DEMO_USER_PHONE, useAuthStore } from '../features/auth/authStore'
import { useSettingsStore } from '../features/settings/useSettingsStore'
import { useCityStore } from '../features/city/useCityStore'
import type { Shop } from '../features/favourites/types'
import { ShopActionSheet } from '../features/main/components/ShopActionSheet'
import './MapPage.css'

// Ports lib/administration/city/map/map_widget.dart + the custom
// lib/custom_code/widgets/my_map.dart (flutter_map + flutter_map_marker_cluster
// + OSM tiles, no paid map API key). This pilot has no Google Maps/Mapbox key
// configured, so we use react-leaflet + leaflet (both free/no-key, OSM tiles)
// instead of installing a paid/key-gated map SDK.
//
// Ported faithfully from my_map.dart:
// - real shop pins come from the per-company get_shops_in_bbox RPC, refetched
//   with the visible bounds (debounced 500ms) on every map move, exactly like
//   _onMapPositionChanged -> _loadShopsByBbox (demo users get DEMO_PINS, the
//   same isDemoUser split search_shops.dart uses);
// - tapping a shop pin opens the same shop bottom sheet as the main page
//   (bottomSheetAction(shop) -> ShopBottonSheetWidget) and marks the pin
//   selected (blue ring, MyMap.selectedColor);
// - markers cluster dynamically by pixel distance (MarkerClusterLayerOptions
//   maxClusterRadius: 45) — nearby pins unite into an orange numbered circle
//   at low zoom and split back into storefront pins as you zoom in;
// - clicking a cluster zooms to its bounds (the library's default
//   zoomToBoundsOnClick), which splits it;
// - a cluster containing the selected shop renders white with a blue border
//   and blue count, exactly like the Dart cluster builder.

// my_map.dart cluster options
const MAX_CLUSTER_RADIUS_PX = 45
// my_map.dart: double _zoom = 14.0 (initial map zoom)
const INITIAL_ZOOM = 14
// my_map.dart: final double _minZoomToShowRoute = 13.5
const MIN_ZOOM_TO_SHOW_ROUTE = 13.5

// my_map.dart _locationArrowMarker(): blue (Colors.blue) circle, white 2px
// border, #85AEFF glow — rendered inside a 20x20 Marker.
const userLocationIcon = divIcon({
  html: '<div class="map-pin--me"></div>',
  className: 'map-pin-wrapper',
  iconSize: [20, 20],
})

function storefrontMarkerHtml(selected: boolean) {
  // my_map.dart: icon color (and ring) switch to MyMap.selectedColor
  // (Colors.blue = #2196F3) for the selected shop, otherwise theme.primary.
  const markup = renderToStaticMarkup(
    <div className={`map-pin map-pin--single ${selected ? 'map-pin--selected' : ''}`}>
      <FFIcon name="storefront" size={16} color={selected ? '#2196F3' : 'var(--color-primary)'} />
    </div>,
  )
  return markup
}

function clusterMarkerHtml(count: number, containsSelected: boolean) {
  return renderToStaticMarkup(
    <div className={`map-pin map-pin--cluster ${containsSelected ? 'map-pin--cluster-selected' : ''}`}>
      {count}
    </div>,
  )
}

// Greedy pixel-space clustering, the same idea flutter_map_marker_cluster /
// leaflet.markercluster use: project pins at the current zoom, merge any that
// fall within MAX_CLUSTER_RADIUS_PX of a cluster seed. Recomputed on zoomend.
function ClusteredShopMarkers({
  pins,
  selectedShopId,
  onShopClick,
}: {
  pins: ShopMapPin[]
  selectedShopId: number | undefined
  onShopClick: (shop: Shop) => void
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  const clusters = useMemo(() => {
    const projected = pins.map((pin) => ({
      pin,
      point: map.project([pin.lat, pin.lng], zoom),
    }))
    const used = new Set<number>()
    const groups: (typeof projected)[] = []
    for (const seed of projected) {
      if (used.has(seed.pin.shop.id)) continue
      used.add(seed.pin.shop.id)
      const group = [seed]
      for (const other of projected) {
        if (used.has(other.pin.shop.id)) continue
        if (seed.point.distanceTo(other.point) <= MAX_CLUSTER_RADIUS_PX) {
          used.add(other.pin.shop.id)
          group.push(other)
        }
      }
      groups.push(group)
    }
    return groups
  }, [pins, zoom, map])

  return (
    <>
      {clusters.map((group) => {
        if (group.length === 1) {
          const { pin } = group[0]
          const selected = pin.shop.id === selectedShopId
          const icon = divIcon({
            html: storefrontMarkerHtml(selected),
            className: 'map-pin-wrapper',
            iconSize: [36, 36],
          })
          return (
            <Marker
              key={`shop-${pin.shop.id}`}
              position={[pin.lat, pin.lng]}
              icon={icon}
              eventHandlers={{ click: () => onShopClick(pin.shop) }}
            />
          )
        }

        const containsSelected =
          selectedShopId != null && group.some(({ pin }) => pin.shop.id === selectedShopId)
        const lat = group.reduce((sum, { pin }) => sum + pin.lat, 0) / group.length
        const lng = group.reduce((sum, { pin }) => sum + pin.lng, 0) / group.length
        const icon = divIcon({
          html: clusterMarkerHtml(group.length, containsSelected),
          className: 'map-pin-wrapper',
          iconSize: [36, 36],
        })
        const bounds = latLngBounds(group.map(({ pin }) => [pin.lat, pin.lng] as [number, number]))
        return (
          <Marker
            key={`cluster-${group.map(({ pin }) => pin.shop.id).join('-')}`}
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              // zoomToBoundsOnClick — the cluster splits as the map zooms in
              click: () => map.flyToBounds(bounds, { padding: [60, 60] }),
            }}
          />
        )
      })}
    </>
  )
}

// Ports my_map.dart's _onMapPositionChanged + _loadShopsByBbox: refetch shops
// for the visible bounds on map move, debounced 500ms; the initial load runs
// on mount. On error the previous pins are kept, matching Dart (only a
// successful response replaces _shops).
function ShopPinsLoader({
  isCoverage,
  onPins,
  onLoading,
}: {
  isCoverage: boolean
  onPins: (pins: ShopMapPin[]) => void
  onLoading: (loading: boolean) => void
}) {
  const map = useMap()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = () => {
    const b = map.getBounds()
    // my_map.dart _loadShopsByBbox: _isLoadingShops = true around the RPC,
    // which drives the white rounded spinner card at the top of the map.
    onLoading(true)
    fetchShopsInBbox(
      { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
      isCoverage,
    )
      .then(onPins)
      .catch((e) => console.error('get_shops_in_bbox failed:', e))
      .finally(() => onLoading(false))
  }

  useEffect(() => {
    load()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useMapEvents({
    moveend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(load, 500)
    },
  })

  return null
}

// my_map.dart showRoute: the OSRM polyline between the user and the selected
// shop, drawn only when zoom >= _minZoomToShowRoute (13.5). Polyline(
// strokeWidth: 6, color: Colors.blueAccent (#448AFF), isDotted: true).
function RouteLayer({ route }: { route: [number, number][] }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  if (route.length === 0 || zoom < MIN_ZOOM_TO_SHOW_ROUTE) return null
  return (
    <Polyline
      positions={route}
      pathOptions={{ color: '#448AFF', weight: 6, dashArray: '1 12', lineCap: 'round' }}
    />
  )
}

// Wires the FAB zoom buttons to the real Leaflet map instance (rendered
// inside MapContainer, so it needs the useMap() hook — this small child
// component is how react-leaflet exposes map control outside the map canvas).
// FAB stack from my_map.dart build(): zoomIn, zoomOut, center — plus, only
// while a shop is selected (_lastTappedShop != null), the Icons.map FAB that
// opens Google Maps directions (_openInGoogleMaps).
function MapControls({
  selectedPin,
  userLocation,
}: {
  selectedPin: ShopMapPin | null
  userLocation: { lat: number; lng: number } | null
}) {
  const { t } = useTranslation()
  const map = useMap()

  return (
    <div className="map-page__fabs">
      <button type="button" className="map-page__fab" aria-label={t('map_zoom_in')} onClick={() => map.zoomIn()}>
        <Icon name="add" filled color="#ffffff" size={24} />
      </button>
      <button type="button" className="map-page__fab" aria-label={t('map_zoom_out')} onClick={() => map.zoomOut()}>
        <Icon name="remove" filled color="#ffffff" size={24} />
      </button>
      <button
        type="button"
        className="map-page__fab"
        aria-label={t('map_my_location')}
        onClick={() => {
          // my_map.dart 'center' FAB: move(_currentLocation, 16.0)
          if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 16)
            return
          }
          if (!navigator.geolocation) return
          navigator.geolocation.getCurrentPosition(
            (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
            () => {
              // No permission / unavailable in this pilot environment — fall
              // back to recentering on the demo pin cluster, still gives
              // visual feedback that the button did something.
              map.setView([MAP_CENTER.lat, MAP_CENTER.lng], INITIAL_ZOOM)
            },
          )
        }}
      >
        <Icon name="my_location" filled color="#ffffff" size={24} />
      </button>
      {selectedPin && (
        <button
          type="button"
          className="map-page__fab"
          aria-label={t('map_open_route')}
          onClick={() => {
            // my_map.dart _openInGoogleMaps: google.com/maps/dir with
            // origin=current location, destination=shop, travelmode=driving.
            const origin = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ''
            window.open(
              `https://www.google.com/maps/dir/?api=1${origin}` +
                `&destination=${selectedPin.lat},${selectedPin.lng}&travelmode=driving`,
              '_blank',
            )
          }}
        >
          <Icon name="map" filled color="#ffffff" size={24} />
        </button>
      )}
    </div>
  )
}

export function MapPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialShopId = Number(searchParams.get('shopId')) || undefined
  const userId = useAuthStore((s) => s.userId)
  const isDemo = userId === DEMO_USER_PHONE
  const coverageEnabled = useSettingsStore((s) => s.coverageEnabled)
  const selectedCity = useCityStore((s) => s.selectedCity)
  // my_map.dart's _lastTappedShop: starts as the shop the user navigated from
  // (?shopId=), then follows whichever pin was tapped last.
  const [selectedShopId, setSelectedShopId] = useState<number | undefined>(initialShopId)
  const [activeShop, setActiveShop] = useState<Shop | null>(null)
  const [realPins, setRealPins] = useState<ShopMapPin[]>([])
  const [pinsLoading, setPinsLoading] = useState(false)
  // my_map.dart _currentLocation: fed by Geolocator.getPositionStream —
  // mirrored here with navigator.geolocation.watchPosition.
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  // my_map.dart _routePolyline + _routeCache (OSRM driving route to the
  // selected shop, cached per shop+origin).
  const [route, setRoute] = useState<[number, number][]>([])
  const routeCache = useRef<Map<string, [number, number][]>>(new Map())
  const mapRef = useRef<LeafletMap | null>(null)

  const pins = isDemo ? DEMO_PINS : realPins
  // my_map.dart _lastTappedShop's coordinates (route destination, maps FAB).
  const selectedPin = useMemo(
    () => pins.find((pin) => pin.shop.id === selectedShopId) ?? null,
    [pins, selectedShopId],
  )

  // _initLocationPermissionAndStream: ask for the location permission and
  // keep _currentLocation fresh from the position stream.
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Permission denied / unavailable — same as Dart, just no blue dot.
      },
      { enableHighAccuracy: true },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // _getRouteToShop: OSRM driving route (router.project-osrm.org,
  // overview=full&geometries=geojson), skipped while there is no current
  // location, cached by shop+origin like _routeCache.
  useEffect(() => {
    if (!selectedPin || !userLocation) {
      setRoute([])
      return
    }
    const key = `${selectedPin.shop.id}_${userLocation.lat}_${userLocation.lng}`
    const cached = routeCache.current.get(key)
    if (cached) {
      setRoute(cached)
      return
    }
    let cancelled = false
    fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
        `${userLocation.lng},${userLocation.lat};${selectedPin.lng},${selectedPin.lat}` +
        `?overview=full&geometries=geojson`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((js) => {
        if (cancelled || !js) return
        const coords = js.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
        if (!coords) return
        const poly = coords.map(([lng, lat]) => [lat, lng] as [number, number])
        routeCache.current.set(key, poly)
        setRoute(poly)
      })
      .catch(() => {
        // Route fetch failure just means no polyline, same as Dart.
      })
    return () => {
      cancelled = true
    }
  }, [selectedPin, userLocation])
  // Real users start centered on their selected city (my_map.dart centers on
  // the user location / selectedCity); demo users on the demo-pin area.
  const center =
    !isDemo && selectedCity?.latitude != null && selectedCity?.longitude != null
      ? { lat: selectedCity.latitude, lng: selectedCity.longitude }
      : MAP_CENTER

  const handleShopClick = (shop: Shop) => {
    // my_map.dart marker onTap: set _lastTappedShop + bottomSheetAction(shop)
    // (map_widget.dart opens ShopBottonSheetWidget with the tapped shop).
    setSelectedShopId(shop.id)
    setActiveShop(shop)
  }

  return (
    <div className="map-page">
      <header className="map-page__app-bar">
        <button
          type="button"
          className="map-page__back"
          aria-label={t('common_back')}
          onClick={() => navigate(-1)}
        >
          <Icon name="arrow_back_ios_new" color="#FF6300" />
        </button>
        <h1 className="map-page__title">{t('city_map')}</h1>
        <div style={{ width: 54 }} />
      </header>

      <div className="map-page__body">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={INITIAL_ZOOM}
          zoomControl={false}
          attributionControl={false}
          className="map-page__map"
          ref={mapRef}
        >
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {!isDemo && (
            <ShopPinsLoader
              isCoverage={coverageEnabled}
              onPins={setRealPins}
              onLoading={setPinsLoading}
            />
          )}

          <RouteLayer route={route} />

          <ClusteredShopMarkers
            pins={pins}
            selectedShopId={selectedShopId}
            onShopClick={handleShopClick}
          />

          {/* my_map.dart: MarkerLayer with _locationArrowMarker at _currentLocation */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userLocationIcon}
              interactive={false}
            />
          )}

          <MapControls selectedPin={selectedPin} userLocation={userLocation} />
        </MapContainer>

        {/* my_map.dart _isLoadingShops: white rounded card with an orange
            spinner, centered 20px from the top of the map. */}
        {pinsLoading && (
          <div className="map-page__loading" aria-hidden>
            <div className="map-page__loading-card">
              <div className="map-page__loading-spinner" />
            </div>
          </div>
        )}
      </div>

      {/* map_widget.dart bottomSheetAction: ShopBottonSheetWidget in a
          Container(height: screen * 0.9) — slightly shorter than the main
          page's 0.93 sheet. */}
      {activeShop && (
        <ShopActionSheet shop={activeShop} heightRatio={0.9} onClose={() => setActiveShop(null)} />
      )}
    </div>
  )
}
