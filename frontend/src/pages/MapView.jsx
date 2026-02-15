import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { getRequests, getHelpTypeIcon, getHazardZones } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons by urgency
const createIcon = (urgency) => {
  const colors = {
    critical: '#EF4444',
    moderate: '#F59E0B',
    low: '#10B981'
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${colors[urgency] || '#3B82F6'};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Component to update map view to fit all markers
function MapUpdater({ userLocation, requests }) {
  const map = useMap();
  
  useEffect(() => {
    if (requests.length === 0 && userLocation) {
      // No requests, just center on user
      map.setView(userLocation, 13);
    } else if (requests.length > 0) {
      // Fit bounds to include all requests and user location
      const points = requests.map(r => [r.latitude, r.longitude]);
      if (userLocation) {
        points.push(userLocation);
      }
      
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [userLocation, requests, map]);
  
  return null;
}

function MapView() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [routeTo, setRouteTo] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [hazardZones, setHazardZones] = useState([]);
  const [showHazardZones, setShowHazardZones] = useState(true);
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  
  // Default center (India center) - will be adjusted by MapUpdater
  const defaultCenter = [20.5937, 78.9629];

  useEffect(() => {
    loadRequests();
    loadHazardZones();
    getUserLocation();
  }, [selectedType]);

  const loadRequests = async () => {
    try {
      // Get ALL requests including completed for map view
      const params = { per_page: 100, status: 'all' };
      if (selectedType) params.help_type = selectedType;
      const data = await getRequests(params);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHazardZones = async () => {
    try {
      const data = await getHazardZones(5);
      setHazardZones(data.hazard_zones || []);
    } catch (err) {
      console.error('Error loading hazard zones:', err);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => console.error('Location error:', err)
      );
    }
  };

  const showRoute = async (request) => {
    if (!userLocation) {
      alert('Please enable location to show route');
      return;
    }
    
    // Create simple straight line route (for demo)
    // In production, you'd use a routing API like OSRM
    setRouteTo(request.id);
    setRouteCoords([
      userLocation,
      [request.latitude, request.longitude]
    ]);
  };

  const hideRoute = () => {
    setRouteTo(null);
    setRouteCoords([]);
  };

  const openGoogleMapsDirections = (request) => {
    const origin = userLocation ? `${userLocation[0]},${userLocation[1]}` : '';
    const destination = `${request.latitude},${request.longitude}`;
    const url = origin 
      ? `https://www.google.com/maps/dir/${origin}/${destination}`
      : `https://www.google.com/maps?q=${destination}`;
    window.open(url, '_blank');
  };

  const center = userLocation || defaultCenter;

  return (
    <div className="h-[calc(100vh-140px)]">
      {/* Filter Bar */}
      <div className="bg-white p-3 shadow-sm">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <FilterButton 
            active={selectedType === ''} 
            onClick={() => setSelectedType('')}
          >
            {t('allTypes') || 'All'}
          </FilterButton>
          <FilterButton 
            active={selectedType === 'food'} 
            onClick={() => setSelectedType('food')}
          >
            🍚 {t('food')}
          </FilterButton>
          <FilterButton 
            active={selectedType === 'water'} 
            onClick={() => setSelectedType('water')}
          >
            💧 {t('water')}
          </FilterButton>
          <FilterButton 
            active={selectedType === 'medical'} 
            onClick={() => setSelectedType('medical')}
          >
            🏥 {t('medical')}
          </FilterButton>
          <FilterButton 
            active={selectedType === 'rescue'} 
            onClick={() => setSelectedType('rescue')}
          >
            🚨 {t('rescue')}
          </FilterButton>
          <FilterButton 
            active={selectedType === 'shelter'} 
            onClick={() => setSelectedType('shelter')}
          >
            🏠 {t('shelter')}
          </FilterButton>

          <div className="border-l border-gray-300 h-6 mx-1"></div>

          <button
            onClick={() => setShowHazardZones(!showHazardZones)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-1 ${
              showHazardZones
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>⚠️</span>
            <span>{t('hazardZones') || 'Hazard Zones'}</span>
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="h-full relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner mx-auto mb-2"></div>
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          </div>
        )}
        
        <MapContainer
          center={center}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater userLocation={userLocation} requests={requests} />
          
          {/* Hazard zone circles */}
          {showHazardZones && hazardZones.map((zone, idx) => {
            const severityStyles = {
              extreme: { color: '#991B1B', fillColor: '#EF4444', fillOpacity: 0.25, weight: 3, dashArray: '6, 4' },
              high:    { color: '#B45309', fillColor: '#F97316', fillOpacity: 0.20, weight: 2, dashArray: '6, 4' },
              moderate:{ color: '#A16207', fillColor: '#FACC15', fillOpacity: 0.15, weight: 2, dashArray: '8, 6' },
              low:     { color: '#166534', fillColor: '#4ADE80', fillOpacity: 0.12, weight: 1, dashArray: '10, 8' },
            };
            const style = severityStyles[zone.severity] || severityStyles.moderate;
            const radiusMeters = zone.radius_km * 1000;

            const helpTypeSummary = Object.entries(zone.help_types || {})
              .map(([type, count]) => `${getHelpTypeIcon(type)} ${type}: ${count}`)
              .join(', ');

            return (
              <Circle
                key={`hazard-${idx}`}
                center={[zone.center_lat, zone.center_lon]}
                radius={radiusMeters}
                pathOptions={style}
              >
                <Tooltip direction="top" sticky>
                  <div className="text-sm font-semibold">
                    ⚠️ {zone.severity.toUpperCase()} {t('disasterZone')}
                  </div>
                  <div className="text-xs mt-1">
                    {zone.request_count} active request{zone.request_count !== 1 ? 's' : ''}
                    {zone.critical_count > 0 && (
                      <span className="text-red-600 font-bold ml-1">
                        ({zone.critical_count} critical)
                      </span>
                    )}
                  </div>
                  {helpTypeSummary && (
                    <div className="text-xs mt-1 text-gray-600">{helpTypeSummary}</div>
                  )}
                </Tooltip>
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">⚠️</span>
                      <strong>{zone.severity.toUpperCase()} {t('disasterZone')}</strong>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>📊 <strong>{zone.request_count}</strong> active request{zone.request_count !== 1 ? 's' : ''}</p>
                      {zone.critical_count > 0 && (
                        <p className="text-red-600">🚨 <strong>{zone.critical_count}</strong> critical</p>
                      )}
                      <p>📏 {t('radiusKm')}: ~{zone.radius_km} km</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold mb-1">{t('needsBreakdown')}:</p>
                      {Object.entries(zone.help_types || {}).map(([type, count]) => (
                        <span key={type} className="inline-block bg-gray-100 rounded px-2 py-0.5 text-xs mr-1 mb-1">
                          {getHelpTypeIcon(type)} {type}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* Hyderabad Hazard Zone — static geo-fence */}
          {showHazardZones && (
            <Circle
              center={[17.385, 78.4867]}
              radius={25000}
              pathOptions={{
                color: '#DC2626',
                fillColor: '#FCA5A5',
                fillOpacity: 0.15,
                weight: 3,
                dashArray: '10, 6',
              }}
            >
              <Tooltip direction="top" sticky>
                <div className="text-sm font-semibold">
                  🏙️ {t('hyderabadHazardZone')}
                </div>
                <div className="text-xs mt-1">
                  {t('radiusKm')}: ~25 km
                </div>
              </Tooltip>
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">🏙️</span>
                    <strong>{t('hyderabadHazardZone')}</strong>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>📏 {t('radiusKm')}: ~25 km</p>
                    <p className="text-red-600 text-xs">⚠️ {t('outsideZone')}: {t('flagged')}</p>
                  </div>
                </div>
              </Popup>
            </Circle>
          )}

          {/* Route line */}
          {routeCoords.length > 0 && (
            <Polyline 
              positions={routeCoords} 
              color="#3B82F6" 
              weight={4}
              dashArray="10, 10"
            />
          )}
          
          {/* User location marker */}
          {userLocation && (
            <Marker 
              position={userLocation}
              icon={L.divIcon({
                className: 'user-marker',
                html: `<div style="
                  background-color: #3B82F6;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 4px solid white;
                  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
                "></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              })}
            >
              <Popup>
                <div className="text-center font-semibold">
                  📍 {t('yourLocation') || 'Your Location'}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* All Request markers */}
          {requests.map(request => (
            <Marker
              key={request.id}
              position={[request.latitude, request.longitude]}
              icon={createIcon(request.urgency)}
            >
              <Popup>
                <div className="min-w-[220px]">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">{getHelpTypeIcon(request.help_type)}</span>
                    <strong className="capitalize">{request.help_type} {t('needed')}</strong>
                  </div>
                  <div className={`inline-block px-2 py-1 rounded text-xs text-white mb-2 ${
                    request.urgency === 'critical' ? 'bg-red-500' :
                    request.urgency === 'moderate' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}>
                    {request.urgency.toUpperCase()}
                  </div>
                  <span className={`ml-2 inline-block px-2 py-1 rounded text-xs ${
                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                    request.status === 'accepted' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {request.status}
                  </span>
                  
                  {request.description && (
                    <p className="text-sm text-gray-600 my-2 line-clamp-2">
                      {request.description}
                    </p>
                  )}
                  
                  {request.contact_name && (
                    <p className="text-sm text-gray-700 mb-1">
                      👤 {request.contact_name}
                    </p>
                  )}
                  
                  {/* Show phone to seekers (non-authenticated users can see) */}
                  {request.phone_masked && (
                    <p className="text-sm text-gray-700 mb-2">
                      📞 {request.phone_masked}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 mb-2">{request.time_ago}</p>
                  
                  <div className="flex flex-col space-y-2">
                    <Link 
                      to={`/request/${request.id}`}
                      className="text-blue-600 text-sm font-medium"
                    >
                      {t('viewDetails')} →
                    </Link>
                    
                    {/* Route buttons for helpers */}
                    {isAuthenticated && userLocation && request.status !== 'completed' && (
                      <>
                        {routeTo === request.id ? (
                          <button
                            onClick={hideRoute}
                            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-medium"
                          >
                            {t('hideRoute') || 'Hide Route'}
                          </button>
                        ) : (
                          <button
                            onClick={() => showRoute(request)}
                            className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-medium"
                          >
                            {t('showRoute') || 'Show Route'}
                          </button>
                        )}
                        <button
                          onClick={() => openGoogleMapsDirections(request)}
                          className="bg-green-500 text-white px-3 py-1.5 rounded text-sm font-medium"
                        >
                          🗺️ {t('getDirections') || 'Get Directions'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          <div className="text-xs font-semibold text-gray-600 mb-2">{t('legend')}</div>
          <div className="space-y-1">
            <LegendItem color="bg-red-500" label={t('critical')} />
            <LegendItem color="bg-orange-500" label={t('moderate')} />
            <LegendItem color="bg-green-500" label={t('low')} />
          </div>
          {showHazardZones && (
            <>
              <div className="text-xs font-semibold text-gray-600 mt-3 mb-2">
                ⚠️ {t('hazardZones') || 'Hazard Zones'}
              </div>
              <div className="space-y-1">
                <LegendItem color="bg-red-400" label={t('extreme')} ring />
                <LegendItem color="bg-orange-400" label={t('high')} ring />
                <LegendItem color="bg-yellow-400" label={t('moderate')} ring />
                <LegendItem color="bg-green-400" label={t('low')} ring />
              </div>
            </>
          )}
        </div>

        {/* Request count */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-[1000]">
          <span className="text-sm font-medium text-gray-700">
            {requests.length} {t('requests')}
          </span>
          {showHazardZones && hazardZones.length > 0 && (
            <span className="text-sm font-medium text-red-600 ml-2">
              | ⚠️ {hazardZones.length} {t('zones')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function LegendItem({ color, label, ring }) {
  return (
    <div className="flex items-center space-x-2">
      {ring ? (
        <span className={`w-3 h-3 rounded-full ${color} opacity-50 border-2 border-current`}></span>
      ) : (
        <span className={`w-3 h-3 rounded-full ${color}`}></span>
      )}
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}

export default MapView;
