import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { getRequests, getHelpTypeIcon } from '../api';
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
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  
  // Default center (India center) - will be adjusted by MapUpdater
  const defaultCenter = [20.5937, 78.9629];

  useEffect(() => {
    loadRequests();
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
        </div>

        {/* Request count */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-[1000]">
          <span className="text-sm font-medium text-gray-700">
            {requests.length} {t('requests')}
          </span>
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

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center space-x-2">
      <span className={`w-3 h-3 rounded-full ${color}`}></span>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}

export default MapView;
