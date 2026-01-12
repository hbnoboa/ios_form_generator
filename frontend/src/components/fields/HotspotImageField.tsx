import React, { useState, useRef, useEffect } from "react";
import SelectOptionsEditor from "./SelectOptionsEditor";

export interface Hotspot {
  x: number; // percentual 0-1
  y: number; // percentual 0-1
  options: string[];
}

export interface HotspotImageFieldProps {
  imageUrl?: string;
  hotspots: Hotspot[];
  value?: string; // valor selecionado (string)
  onChange?: (value: string) => void;
  onImageChange?: (img: string) => void;
  onHotspotsChange?: (hotspots: Hotspot[]) => void;
  readOnly?: boolean;
  width?: number | string;
  height?: number | string;
  showFileInput?: boolean; // novo: controla exibição do input file
}

const HotspotImageField: React.FC<HotspotImageFieldProps> = ({
  imageUrl,
  hotspots,
  value,
  onChange,
  onImageChange,
  onHotspotsChange,
  readOnly = false,
  showFileInput = false,
}) => {
  const [selectedHotspot, setSelectedHotspot] = useState<number | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Fecha popup ao clicar fora
  useEffect(() => {
    if (selectedHotspot === null) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedHotspot(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedHotspot]);

  const [imgUrl, setImgUrl] = useState<string | undefined>(imageUrl);
  const [localHotspots, setLocalHotspots] = useState<Hotspot[]>(hotspots || []);

  // Atualiza imagem local e notifica parent
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImgUrl(ev.target?.result as string);
        onImageChange?.(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Adiciona hotspot ao clicar na imagem
  const handleImageClick = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    if (readOnly) return;
    const rect = (e.target as HTMLImageElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const newHotspot: Hotspot = { x, y, options: [""] };
    const updated = [...localHotspots, newHotspot];
    setLocalHotspots(updated);
    onHotspotsChange?.(updated);
    setSelectedHotspot(updated.length - 1);
  };

  // Remover hotspot
  const handleRemoveHotspot = (idx: number) => {
    const updated = localHotspots.filter((_, i) => i !== idx);
    setLocalHotspots(updated);
    onHotspotsChange?.(updated);
    setSelectedHotspot(null);
  };

  // Editar opções do hotspot
  const handleOptionsChange = (idx: number, options: string[]) => {
    const updated = localHotspots.map((h, i) =>
      i === idx ? { ...h, options } : h
    );
    setLocalHotspots(updated);
    onHotspotsChange?.(updated);
  };

  // Editar posição do hotspot
  const handleMoveHotspot = (idx: number, x: number, y: number) => {
    const updated = localHotspots.map((h, i) =>
      i === idx ? { ...h, x, y } : h
    );
    setLocalHotspots(updated);
    onHotspotsChange?.(updated);
  };

  // Selecionar hotspot
  const handleHotspotClick = (idx: number) => {
    setSelectedHotspot(idx);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "#181818",
        color: "#fff",
        borderRadius: 8,
        padding: 12,
      }}
    >
      {showFileInput && (
        <div style={{ marginBottom: 8 }}>
          <input
            type="file"
            accept="image/*"
            className="form-control form-control-sm"
            style={{
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
            }}
            onChange={handleImageChange}
            disabled={readOnly}
          />
        </div>
      )}
      <div
        style={{
          position: "relative",
          width: "100%",
          background: "#222",
          borderRadius: 8,
          padding: 8,
        }}
      >
        <img
          src={imgUrl || "/placeholder.jpg"}
          alt="Hotspot"
          style={{
            width: "100%",
            height: "auto",
            maxHeight: "60vh",
            objectFit: "contain",
            borderRadius: 8,
            border: "1px solid #444",
            background: "#222",
            cursor: readOnly ? "default" : "crosshair",
            display: "block",
          }}
          onClick={handleImageClick}
        />
        {localHotspots.map((hotspot, idx) => {
          const left = `${hotspot.x * 100}%`;
          const top = `${hotspot.y * 100}%`;
          return (
            <button
              key={idx}
              type="button"
              style={{
                position: "absolute",
                left,
                top,
                transform: "translate(-50%, -50%)",
                zIndex: 2,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: selectedHotspot === idx ? "#0d6efd" : "#222",
                border:
                  selectedHotspot === idx
                    ? "2px solid #0d6efd"
                    : "2px solid #444",
                color: selectedHotspot === idx ? "#fff" : "#fff",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                fontWeight: 700,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleHotspotClick(idx);
              }}
              title={`Hotspot ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
        {selectedHotspot !== null && localHotspots[selectedHotspot] && (
          <div
            ref={popupRef}
            style={{
              position: "absolute",
              left: `${localHotspots[selectedHotspot].x * 100}%`,
              top: `${localHotspots[selectedHotspot].y * 100}%`,
              transform: "translate(-50%, -120%)",
              zIndex: 10,
              background: "#222",
              color: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              padding: 12,
              minWidth: 180,
              border: "1px solid #444",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            {readOnly ? (
              <>
                <div
                  style={{ fontWeight: 600, marginBottom: 4, color: "#fff" }}
                >
                  Opções do ponto:
                </div>
                <ul
                  style={{
                    paddingLeft: 18,
                    margin: 0,
                    background: "#222",
                    color: "#fff",
                    borderRadius: 6,
                    padding: 8,
                  }}
                >
                  {localHotspots[selectedHotspot].options.length === 0 && (
                    <li style={{ color: "#bbb" }}>(sem opções)</li>
                  )}
                  {localHotspots[selectedHotspot].options.map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="mb-2 d-flex gap-2 align-items-center">
                  <label className="form-label mb-0">X:</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={localHotspots[selectedHotspot].x}
                    onChange={(e) =>
                      handleMoveHotspot(
                        selectedHotspot,
                        Math.max(0, Math.min(1, parseFloat(e.target.value))),
                        localHotspots[selectedHotspot].y
                      )
                    }
                    className="form-control form-control-sm w-auto"
                    disabled={readOnly}
                  />
                  <label className="form-label mb-0">Y:</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={localHotspots[selectedHotspot].y}
                    onChange={(e) =>
                      handleMoveHotspot(
                        selectedHotspot,
                        localHotspots[selectedHotspot].x,
                        Math.max(0, Math.min(1, parseFloat(e.target.value)))
                      )
                    }
                    className="form-control form-control-sm w-auto"
                    disabled={readOnly}
                  />
                  <button
                    className="btn btn-outline-danger btn-sm ms-2"
                    type="button"
                    onClick={() => handleRemoveHotspot(selectedHotspot)}
                    disabled={readOnly}
                  >
                    Remover
                  </button>
                </div>
                <label className="form-label">Opções do ponto</label>
                <SelectOptionsEditor
                  options={localHotspots[selectedHotspot].options}
                  onChange={(opts) =>
                    handleOptionsChange(selectedHotspot, opts)
                  }
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotspotImageField;
