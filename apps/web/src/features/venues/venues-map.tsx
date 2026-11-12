"use client";

import { PROVINCE_CENTERS } from "@pitchkh/shared";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { cn } from "@/lib/utils";
import type { MapPin } from "./map-pins";


/** Price-pill markers drawn in HTML: no marker images to download. */
const pinIcon = (label: string, active: boolean): L.DivIcon =>
  L.divIcon({
    className: "",
    html: `<span style="display:inline-flex;transform:translate(-50%,-100%);white-space:nowrap;padding:5px 10px;border-radius:999px;font:700 13px/1 var(--font-archivo),sans-serif;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);background:${active ? "#ffc629" : "#0a7446"};color:${active ? "#221a00" : "#fff"}">${label}</span>`,
    iconSize: [0, 0],
  });

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1 && pins[0]) map.setView([pins[0].lat, pins[0].lng], 15);
    else map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 14 });
  }, [map, pins]);
  return null;
}

export default function VenuesMap({ pins, className, activeId, onOpen, interactive = true }: { pins: MapPin[]; className?: string; activeId?: string; onOpen?: (pin: MapPin) => void; interactive?: boolean }) {
  const center = useMemo<[number, number]>(() => (pins[0] ? [pins[0].lat, pins[0].lng] : [...PROVINCE_CENTERS.phnom_penh]), [pins]);
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} dragging={interactive} className={cn("size-full", className)} attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds pins={pins} />
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon(pin.label, pin.id === activeId)} title={pin.title} keyboard eventHandlers={onOpen ? { click: () => onOpen(pin) } : undefined}>
          {onOpen ? null : <Popup>{pin.title}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
