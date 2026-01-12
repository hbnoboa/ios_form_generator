import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";

interface DoneModalProps {
  title?: string;
  message?: string;
  onResult: (result: boolean) => void;
}

const DoneModal: React.FC<DoneModalProps> = ({
  title = "Finalizar registro?",
  message = "Marcar como concluído (Done)?",
  onResult,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResult(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResult]);

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => onResult(false)}
            ></button>
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onResult(false)}
            >
              Não
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onResult(true)}
            >
              Sim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to show the Done modal and resolve with true/false
export function askDone(): Promise<boolean> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  return new Promise<boolean>((resolve) => {
    const handle = (result: boolean) => {
      try {
        root.unmount();
        host.remove();
      } finally {
        resolve(result);
      }
    };
    root.render(<DoneModal onResult={handle} />);
  });
}

export default DoneModal;
