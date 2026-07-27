// Shared browser Geolocation wrapper, standing in for Dart's location plugin
// (getCurrentUserLocation in main_widget.dart / _getCurrentLocation). Used by
// both the first-launch nearest-city lookup and the main dashboard's shop
// distance calculation (paginated_shop_list.dart's currentUserLocation).
export function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (geoError) => {
        console.error('Geolocation failed:', geoError)
        resolve(null)
      },
      { timeout: 10000 },
    )
  })
}
