import React, { useState, useRef, useEffect, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

const GMAPS_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  "AIzaSyBhVOfCSGNwIEWjUxrpPw_p3qHNXmpLCeA";
const GMAPS_LIBRARIES: any = ["places"];

interface MapFieldProps {
  name?: string;
  label?: string;
  required?: boolean;
  initialValue?: { lat: number; lng: number } | string;
  onChange?: (value: { lat: number; lng: number } | null) => void;
  readOnly?: boolean;
  height?: string | number;
  width?: string | number;
}

const parseLatLng = (s: string) => {
  const m = String(s || "").match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
};

const MapField: React.FC<MapFieldProps> = ({
  name,
  label,
  required,
  initialValue,
  onChange,
  readOnly = false,
  height = 260,
  width = "100%",
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "gmaps-loader",
    googleMapsApiKey: GMAPS_KEY,
    libraries: GMAPS_LIBRARIES,
  });

  const [pos, setPos] = useState<{ lat: number; lng: number }>({
    lat: -23.55052,
    lng: -46.633308,
  });
  const [showModal, setShowModal] = useState(false);
  const mapRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setBoth = useCallback(
    (lat: number, lng: number) => {
      const fl = Number(Number(lat).toFixed(6));
      const fn = Number(Number(lng).toFixed(6));
      setPos({ lat: fl, lng: fn });
      if (inputRef.current) {
        inputRef.current.value = `${fl}, ${fn}`;
      }
      if (onChange) onChange({ lat: fl, lng: fn });
      if (mapRef.current) {
        mapRef.current.panTo({ lat: fl, lng: fn });
      }
    },
    [onChange]
  );

  useEffect(() => {
    if (!initialValue) return;
    let newPos = null;
    if (typeof initialValue === "string") {
      newPos = parseLatLng(initialValue);
    } else if (
      initialValue &&
      typeof initialValue === "object" &&
      initialValue.lat != null &&
      initialValue.lng != null
    ) {
      newPos = { lat: Number(initialValue.lat), lng: Number(initialValue.lng) };
    }
    if (
      newPos &&
      (Number(newPos.lat).toFixed(6) !== Number(pos.lat).toFixed(6) ||
        Number(newPos.lng).toFixed(6) !== Number(pos.lng).toFixed(6))
    ) {
      setBoth(newPos.lat, newPos.lng);
    }
  }, [initialValue, setBoth, pos.lat, pos.lng]);

  const handleMapClick = (e: any) => {
    if (readOnly) return;
    if (!e?.latLng) return;
    setBoth(e.latLng.lat(), e.latLng.lng());
  };

  const handleMarkerDragEnd = (e: any) => {
    if (readOnly) return;
    if (!e?.latLng) return;
    setBoth(e.latLng.lat(), e.latLng.lng());
  };

  if (loadError)
    return <div className="text-danger">Falha ao carregar mapa.</div>;
  if (!isLoaded) return <div className="text-muted">Carregando mapa…</div>;

  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      <input
        type="text"
        name={name}
        ref={inputRef}
        defaultValue={pos ? `${pos.lat}, ${pos.lng}` : ""}
        required={!!required}
        className="form-control mb-2"
        disabled={readOnly}
        onChange={(e) => {
          const parsed = parseLatLng(e.target.value);
          if (parsed) setPos(parsed);
          if (onChange) onChange(parsed);
        }}
      />
      <div
        style={{
          height,
          width,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #2e2e2e",
          position: "relative",
        }}
      >
        <GoogleMap
          onLoad={(map: any) => {
            mapRef.current = map;
          }}
          center={pos}
          zoom={13}
          mapContainerStyle={{ width: "100%", height: "100%" }}
          options={{
            zoomControl: !readOnly,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            draggable: !readOnly,
            disableDoubleClickZoom: readOnly,
            keyboardShortcuts: !readOnly,
            gestureHandling: "greedy",
          }}
          onClick={handleMapClick}
        >
          <MarkerF
            position={pos}
            draggable={!readOnly}
            onDragEnd={handleMarkerDragEnd}
          />
        </GoogleMap>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            background: "rgba(255,255,255,0.85)",
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 13,
          }}
          onClick={() => setShowModal(true)}
        >
          Ampliar mapa
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
        Lat: {pos.lat} | Lng: {pos.lng}
      </div>

      {/* Modal de mapa ampliado */}
      {showModal && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            background: "rgba(0,0,0,0.5)",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 2000,
          }}
          tabIndex={-1}
          role="dialog"
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: 900 }}
            role="document"
          >
            <div className="modal-content" style={{ borderRadius: 10 }}>
              <div className="modal-header">
                <h5 className="modal-title">Mapa ampliado</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Fechar"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ height: 500 }}>
                <GoogleMap
                  onLoad={(map: any) => {
                    mapRef.current = map;
                  }}
                  center={pos}
                  zoom={15}
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  options={{
                    zoomControl: !readOnly,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    clickableIcons: false,
                    draggable: !readOnly,
                    disableDoubleClickZoom: readOnly,
                    keyboardShortcuts: !readOnly,
                    gestureHandling: "greedy",
                  }}
                  onClick={handleMapClick}
                >
                  <MarkerF
                    position={pos}
                    draggable={!readOnly}
                    onDragEnd={handleMarkerDragEnd}
                  />
                </GoogleMap>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapField;
