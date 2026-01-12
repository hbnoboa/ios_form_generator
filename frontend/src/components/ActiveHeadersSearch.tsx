import React from "react";

interface Field {
  key: string;
  label: string;
  type?: string;
  visible?: boolean;
}

type SearchFields = Record<string, any>;

interface ActiveHeadersSearchProps {
  fields: Field[]; // only active (visible) headers should be passed
  searchFields: SearchFields;
  setSearchFields: (fields: SearchFields) => void;
}

const ActiveHeadersSearch: React.FC<ActiveHeadersSearchProps> = ({
  fields,
  searchFields,
  setSearchFields,
}) => {
  return (
    <div className="mb-3 p-3 bg-dark rounded-2 text-light border border-secondary">
      <style>
        {`
          .search-input::placeholder { color: #ffffff; opacity: 0.75; }
          .search-select { min-width: 160px; }
          .search-field { min-width: 160px; }
        `}
      </style>
      <div className="mb-2 fw-bold">Buscar nos campos visíveis:</div>
      <div className="d-flex flex-wrap gap-2 align-items-end">
        {fields.map((field) => {
          const type = field.type || "text";
          const isTextLike = [
            "text",
            "textarea",
            "hotspot",
            "list",
            "form-data-select",
          ].includes(type);
          const isNumberMoney = type === "number" || type === "money";
          const isBoolean =
            type === "check" || type === "checkbox" || type === "done";
          const isSelect = type === "select";
          const options: any[] = (field as any).options || [];
          return (
            <div key={field.key} className="me-2 mb-2 search-field">
              <span className="badge bg-secondary mb-1">{field.label}</span>
              {isTextLike && (
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                  placeholder={`Buscar por ${field.label}`}
                  value={searchFields[field.key] || ""}
                  onChange={(e) =>
                    setSearchFields({
                      ...searchFields,
                      [field.key]: e.target.value,
                    })
                  }
                  style={{ minWidth: 140 }}
                />
              )}
              {isNumberMoney && (
                <div className="d-flex flex-row gap-2 align-items-end">
                  <select
                    className="form-select form-select-sm bg-dark text-light border-secondary search-select"
                    value={String(searchFields[field.key]?.op ?? "")}
                    onChange={(e) => {
                      const op = e.target.value;
                      if (!op) {
                        setSearchFields({
                          ...searchFields,
                          [field.key]: undefined,
                        });
                      } else {
                        setSearchFields({
                          ...searchFields,
                          [field.key]: { op, value: "", from: "", to: "" },
                        });
                      }
                    }}
                  >
                    <option value="">Qualquer</option>
                    <option value="gt">Maior</option>
                    <option value="lt">Menor</option>
                    <option value="between">Entre</option>
                  </select>
                  {searchFields[field.key]?.op === "between" ? (
                    <div className="d-flex flex-row gap-2">
                      <input
                        type="text"
                        className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                        placeholder="De"
                        value={String(searchFields[field.key]?.from ?? "")}
                        onChange={(e) =>
                          setSearchFields({
                            ...searchFields,
                            [field.key]: {
                              ...searchFields[field.key],
                              from: e.target.value,
                            },
                          })
                        }
                        style={{ minWidth: 100 }}
                      />
                      <input
                        type="text"
                        className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                        placeholder="Até"
                        value={String(searchFields[field.key]?.to ?? "")}
                        onChange={(e) =>
                          setSearchFields({
                            ...searchFields,
                            [field.key]: {
                              ...searchFields[field.key],
                              to: e.target.value,
                            },
                          })
                        }
                        style={{ minWidth: 100 }}
                      />
                    </div>
                  ) : (
                    searchFields[field.key]?.op && (
                      <input
                        type="text"
                        className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                        placeholder="Valor"
                        value={String(searchFields[field.key]?.value ?? "")}
                        onChange={(e) =>
                          setSearchFields({
                            ...searchFields,
                            [field.key]: {
                              ...searchFields[field.key],
                              value: e.target.value,
                            },
                          })
                        }
                        style={{ minWidth: 120 }}
                      />
                    )
                  )}
                </div>
              )}
              {isBoolean && (
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={!!searchFields[field.key]}
                    onChange={(e) =>
                      setSearchFields({
                        ...searchFields,
                        // checked => true (filtra verdadeiros), unchecked => false (filtra falsos)
                        [field.key]: e.target.checked,
                      })
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setSearchFields({
                        ...searchFields,
                        // limpar filtro (qualquer)
                        [field.key]: undefined,
                      })
                    }
                  >
                    Qualquer
                  </button>
                </div>
              )}
              {(type === "date" || type === "datetime") && (
                <div className="d-flex flex-column gap-1">
                  <input
                    type="date"
                    className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                    placeholder="De"
                    value={searchFields[field.key]?.from || ""}
                    onChange={(e) =>
                      setSearchFields({
                        ...searchFields,
                        [field.key]: {
                          ...searchFields[field.key],
                          from: e.target.value,
                        },
                      })
                    }
                  />
                  <input
                    type="date"
                    className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                    placeholder="Até"
                    value={searchFields[field.key]?.to || ""}
                    onChange={(e) =>
                      setSearchFields({
                        ...searchFields,
                        [field.key]: {
                          ...searchFields[field.key],
                          to: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              )}
              {type === "map" && (
                <div className="d-flex flex-row gap-1">
                  <input
                    type="text"
                    className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                    placeholder="Latitude"
                    value={searchFields[field.key]?.lat || ""}
                    onChange={(e) =>
                      setSearchFields({
                        ...searchFields,
                        [field.key]: {
                          ...searchFields[field.key],
                          lat: e.target.value,
                        },
                      })
                    }
                    style={{ minWidth: 100 }}
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm bg-dark text-light border-secondary search-input"
                    placeholder="Longitude"
                    value={searchFields[field.key]?.lng || ""}
                    onChange={(e) =>
                      setSearchFields({
                        ...searchFields,
                        [field.key]: {
                          ...searchFields[field.key],
                          lng: e.target.value,
                        },
                      })
                    }
                    style={{ minWidth: 100 }}
                  />
                </div>
              )}
              {isSelect && (
                <select
                  className="form-select form-select-sm bg-dark text-light border-secondary search-select"
                  value={String(searchFields[field.key] ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchFields({
                      ...searchFields,
                      [field.key]: v === "" ? undefined : v,
                    });
                  }}
                >
                  <option value="">Qualquer</option>
                  {(options || []).map((opt: any, idx: number) => {
                    const val = String(opt?.value ?? opt);
                    const label = String(opt?.label ?? opt);
                    return (
                      <option key={`${field.key}-${idx}`} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveHeadersSearch;
