import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
} catch {}

const getIcon = (status: string) => {
  const color = status === 'ativo' ? '#22c55e' : status === 'inativo' ? '#ef4444' : '#f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

interface Props {
  criadores: any[];
  center: [number, number];
}

const CriadoresMap: React.FC<Props> = ({ criadores, center }) => {
  return (
    <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {criadores.map(c => (
        <Marker key={c.id} position={[c.latitude, c.longitude]} icon={getIcon(c.status)}>
          <Popup>
            <div className="min-w-[180px] p-1">
              <h3 className="font-bold text-sm text-gray-900">{c.nome}</h3>
              <p className="text-xs text-gray-500">{c.provincia} — {c.distrito}</p>
              <p className="text-xs mt-1"><strong>Capacidade:</strong> {c.capacidade?.toLocaleString()} aves</p>
              <p className="text-xs"><strong>Tipo:</strong> {c.tipo_producao}</p>
              {c.data_prevista_venda && <p className="text-xs"><strong>Venda:</strong> {c.data_prevista_venda}</p>}
              <p className="text-xs"><strong>Telefone:</strong> {c.telefone}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default CriadoresMap;
