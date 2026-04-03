import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const productIcon = (tipo: string) => {
  const color = tipo === 'frango' ? '#ef4444' : tipo === 'ovos' ? '#f59e0b' : '#22c55e';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

interface Producer {
  id: string;
  nome_granja: string;
  latitude: number;
  longitude: number;
  tipo_produto: string;
  quantidade_disponivel: number;
  preco: number;
}

interface AgroMapViewProps {
  producers: Producer[];
  center: [number, number];
  userPosition: [number, number] | null;
  onSelectProducer: (p: any) => void;
}

function LocationUpdater({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 13);
  }, [position, map]);
  return null;
}

const AgroMapView: React.FC<AgroMapViewProps> = ({ producers, center, userPosition, onSelectProducer }) => {
  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationUpdater position={userPosition} />
      {producers.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={productIcon(p.tipo_produto)}>
          <Popup>
            <div className="min-w-[200px] p-1">
              <h3 className="font-bold text-sm text-gray-900">{p.nome_granja}</h3>
              <p className="text-xs text-gray-500 capitalize">{p.tipo_produto}</p>
              <p className="text-sm font-semibold mt-1 text-gray-900">{p.preco.toFixed(2)} MT</p>
              <p className="text-xs text-gray-600">Disponível: {p.quantidade_disponivel}</p>
              <button
                className="mt-2 w-full bg-blue-600 text-white text-xs py-1.5 rounded-md font-medium hover:bg-blue-700 transition-colors"
                onClick={() => onSelectProducer(p)}
              >
                Fazer Pedido
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default AgroMapView;
