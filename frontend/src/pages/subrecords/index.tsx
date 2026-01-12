import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useAuth } from "../../contexts/authContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SubrecordColumnChooser, {
  ColumnDef as SRColumnDef,
} from "../../components/SubrecordColumnChooser";
import SubrecordActiveHeadersSearch from "../../components/SubrecordActiveHeadersSearch";

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  type?: string;
  options?: any[];
}

interface SubrecordType {
  id: string;
  record?: string;
  subform?: string;
  createdBy?: string;
  org?: string[];
  createdAt?: any;
  updatedAt?: any;
  recordData?: Record<string, { value: any; type?: string }>;
  [key: string]: any;
}

const DEFAULT_FIELDS: ColumnDef[] = [
  { key: "id", label: "ID", visible: true, type: "text" },
  { key: "createdBy", label: "Criado por", visible: true, type: "text" },
  { key: "org", label: "Orgs", visible: true, type: "text" },
  { key: "createdAt", label: "Criado em", visible: true, type: "date" },
];

const SubrecordsPage: React.FC = () => {
  const { user, claims } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState<SubrecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ColumnDef[]>(DEFAULT_FIELDS);
  const [showChooser, setShowChooser] = useState(false);
  const [searchFields, setSearchFields] = useState<Record<string, any>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Import UI state
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
  }>({ done: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  // Current subform and its fields (for mapping/types)
  const [currentSubform, setCurrentSubform] = useState<any>(null);
  const [subformFields, setSubformFields] = useState<any[]>([]);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const searchParams = new URLSearchParams(location.search);
  const subformId = searchParams.get("subformId") || undefined;
  const recordId = searchParams.get("recordId") || undefined;

  useEffect(() => {
    const fetchHeadersFromSubform = async () => {
      if (!user || !subformId) return;
      try {
        const token = await user.getIdToken();
        const subformRes = await axios.get(`/api/subforms/${subformId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentSubform(subformRes.data);
        const sFields = Array.isArray(subformRes.data?.fields)
          ? subformRes.data.fields
          : [];
        setSubformFields(sFields);
        let derived: ColumnDef[] = [
          ...DEFAULT_FIELDS,
          ...sFields.map((ff: any) => ({
            key: ff.name,
            label: ff.label ?? ff.name,
            visible: true,
            type: ff.type,
            options: ff?.options ?? ff?.selectOptions ?? [],
          })),
        ];
        // Merge saved headers from subform (order/visibility/labels/types), like records page
        if (
          Array.isArray(subformRes.data?.headers) &&
          subformRes.data.headers.length > 0
        ) {
          const headerMap: Record<string, any> = {};
          subformRes.data.headers.forEach((h: any) => {
            headerMap[h.key] = h;
          });
          const ordered: ColumnDef[] = [];
          subformRes.data.headers.forEach((h: any) => {
            const found = derived.find((d) => d.key === h.key);
            if (found) {
              ordered.push({
                ...found,
                label: h.label ?? found.label,
                visible: h.visible ?? true,
                type: h.type ?? found.type,
              });
            }
          });
          // Append any fields not present in saved headers
          derived.forEach((d) => {
            if (!headerMap[d.key]) ordered.push(d);
          });
          derived = ordered;
        }
        setFields(derived);
      } catch (err) {
        setFields([...DEFAULT_FIELDS]);
      }
    };
    fetchHeadersFromSubform();
    // eslint-disable-next-line
  }, [user, subformId]);

  const fetchSubrecords = async () => {
    if (!user || !subformId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await axios.get(`/api/subrecords`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data: SubrecordType[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      data = data.filter((r) => !subformId || r.subform === subformId);
      if (recordId) data = data.filter((r) => r.record === recordId);
      setRecords(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao buscar subregistros");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubrecords();
    // eslint-disable-next-line
  }, [user, subformId, recordId]);

  const handleDelete = async (
    id: string,
    parentRecordId?: string,
    parentSubformId?: string
  ) => {
    if (!user) return;
    if (!window.confirm("Tem certeza que deseja excluir este subregistro?"))
      return;
    try {
      setDeletingId(id);
      const token = await user.getIdToken();
      await axios.delete(`/api/subrecords/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords((prev) => prev.filter((r) => r.id !== id));
      // Após excluir, recalcula e atualiza o contador no record
      try {
        if (parentRecordId && parentSubformId) {
          const srListRes = await axios.get(`/api/subrecords`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          let srList: any[] = Array.isArray(srListRes.data)
            ? srListRes.data
            : srListRes.data?.data || [];
          const countForPair = srList.filter(
            (r) => r.record === parentRecordId && r.subform === parentSubformId
          ).length;
          // Busca o nome do subform para usar como chave
          const sfRes = await axios.get(`/api/subforms/${parentSubformId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const keyName = sfRes?.data?.name || parentSubformId;
          const recRes = await axios.get(`/api/records/${parentRecordId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const currentRecord = recRes.data || {};
          const newRecordData = {
            ...(currentRecord.recordData || {}),
            [keyName]: { value: countForPair, type: "number" },
          };
          await axios.put(
            `/api/records/${parentRecordId}`,
            { recordData: newRecordData, updatedAt: new Date().toISOString() },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (e) {
        // Ignora erros de atualização de contador para não travar a UX
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao excluir subregistro");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Subregistros</h2>
        <div className="d-flex gap-2">
          {(() => {
            const role = (claims?.role as string) || "";
            const isManagerOrAdmin = role === "Admin" || role === "Manager";
            if (recordId && subformId && isManagerOrAdmin) {
              return (
                <label className="btn btn-outline-success mb-0">
                  Importar (Excel/JSON)
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/json,.json"
                    style={{ display: "none" }}
                    onChange={async (
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => {
                      const inputEl = e.target as HTMLInputElement;
                      const file = inputEl.files?.[0];
                      if (!file) return;
                      try {
                        const ext = file.name.toLowerCase();
                        if (ext.endsWith(".json")) {
                          const text = await file.text();
                          const data = JSON.parse(text);
                          const rows = Array.isArray(data)
                            ? data
                            : Array.isArray((data as any)?.rows)
                            ? (data as any).rows
                            : [];
                          if (!Array.isArray(rows) || rows.length === 0) {
                            setError("Arquivo de importação vazio");
                            return;
                          }
                          const headers = Object.keys(rows[0]);
                          setImportHeaders(headers);
                          setImportRows(rows);
                          const map: Record<string, string> = {};
                          const byName: Record<string, any> = {};
                          subformFields.forEach((f: any) => {
                            byName[String(f.name).toLowerCase()] = f;
                            if (f.label)
                              byName[String(f.label).toLowerCase()] = f;
                          });
                          headers.forEach((h: string) => {
                            const f = byName[String(h).toLowerCase()];
                            if (f) map[h] = f.name;
                          });
                          setHeaderMap(map);
                        } else {
                          const buf = await file.arrayBuffer();
                          const wb = XLSX.read(buf, { type: "array" });
                          const wsName = wb.SheetNames[0];
                          const ws = wb.Sheets[wsName];
                          const rows: any[] = XLSX.utils.sheet_to_json(ws, {
                            defval: "",
                          });
                          if (!rows || rows.length === 0) {
                            setError("Planilha sem linhas");
                            return;
                          }
                          const headers = Object.keys(rows[0]);
                          setImportHeaders(headers);
                          setImportRows(rows);
                          const map: Record<string, string> = {};
                          const byName: Record<string, any> = {};
                          subformFields.forEach((f: any) => {
                            byName[String(f.name).toLowerCase()] = f;
                            if (f.label)
                              byName[String(f.label).toLowerCase()] = f;
                          });
                          headers.forEach((h: string) => {
                            const f = byName[String(h).toLowerCase()];
                            if (f) map[h] = f.name;
                          });
                          setHeaderMap(map);
                        }
                        setShowImport(true);
                        setError(null);
                      } catch (err: any) {
                        setError("Falha ao ler arquivo de importação");
                      } finally {
                        if (inputEl) inputEl.value = "";
                      }
                    }}
                  />
                </label>
              );
            }
            return null;
          })()}
          {(() => {
            const role = (claims?.role as string) || "";
            const isManagerOrAdmin = role === "Admin" || role === "Manager";
            return (
              isManagerOrAdmin && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowChooser(true)}
                  disabled={fields.length === 0}
                >
                  Editar colunas
                </button>
              )
            );
          })()}
          {recordId && subformId && (
            <Link
              to={`/subrecords/new?recordId=${recordId}&subformId=${subformId}`}
              className="btn btn-success"
            >
              Criar Subregistro
            </Link>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {!subformId && (
        <div className="alert alert-warning">
          Selecione um subformulário para ver os subregistros.
        </div>
      )}
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          {showImport && (
            <div className="modal d-block" tabIndex={-1}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Confirmar cabeçalhos</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowImport(false);
                        setImportRows([]);
                        setImportHeaders([]);
                        setHeaderMap({});
                        setImportErrors([]);
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p className="mb-2">
                      Mapeie os cabeçalhos do arquivo para os campos do
                      subformulário.
                    </p>
                    <div className="row fw-bold mb-2">
                      <div className="col-6">Cabeçalho do arquivo</div>
                      <div className="col-6">Campo do subformulário</div>
                    </div>
                    {importHeaders.map((h) => (
                      <div className="row mb-2" key={h}>
                        <div className="col-6">
                          <code>{h}</code>
                        </div>
                        <div className="col-6">
                          <select
                            className="form-select"
                            value={headerMap[h] ?? ""}
                            onChange={(e) =>
                              setHeaderMap((prev) => ({
                                ...prev,
                                [h]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Ignorar</option>
                            {subformFields.map((f: any) => (
                              <option key={f.name} value={f.name}>
                                {f.label || f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {importErrors.length > 0 && (
                      <div className="alert alert-warning mt-3">
                        {importErrors.slice(0, 5).map((er, i) => (
                          <div key={i}>{er}</div>
                        ))}
                        {importErrors.length > 5 && (
                          <div>... e mais {importErrors.length - 5} erros</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer d-flex justify-content-between align-items-center">
                    <div>
                      {importing && (
                        <span className="me-2">
                          Importando {importProgress.done}/
                          {importProgress.total}
                        </span>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary me-2"
                        disabled={importing}
                        onClick={() => {
                          setShowImport(false);
                          setImportRows([]);
                          setImportHeaders([]);
                          setHeaderMap({});
                          setImportErrors([]);
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={
                          importing ||
                          !currentSubform ||
                          !recordId ||
                          !subformId
                        }
                        onClick={async () => {
                          if (
                            !user ||
                            !currentSubform ||
                            !recordId ||
                            !subformId
                          )
                            return;
                          setImporting(true);
                          setImportErrors([]);
                          const total = importRows.length;
                          setImportProgress({ done: 0, total });
                          try {
                            const token = await user.getIdToken();
                            const fieldByName: Record<string, any> = {};
                            subformFields.forEach(
                              (f: any) => (fieldByName[f.name] = f)
                            );
                            const boolTrue = new Set([
                              "true",
                              "1",
                              "yes",
                              "sim",
                              "y",
                              "s",
                              "x",
                            ]);
                            const toIso = (v: any) => {
                              const d = new Date(v);
                              return isNaN(d.getTime())
                                ? undefined
                                : d.toISOString();
                            };
                            const toArray = (v: any) => {
                              if (Array.isArray(v)) return v;
                              if (v == null) return [];
                              if (typeof v === "string") {
                                if (v.trim() === "") return [];
                                return v.split(",").map((x) => x.trim());
                              }
                              return [v];
                            };
                            const toMap = (v: any) => {
                              if (!v) return undefined;
                              if (typeof v === "object") {
                                if (v.lat != null && v.lng != null)
                                  return { lat: v.lat, lng: v.lng };
                                return undefined;
                              }
                              if (typeof v === "string") {
                                const s = v.trim();
                                if (s.includes(",")) {
                                  const [la, ln] = s.split(",");
                                  const lat = parseFloat(String(la).trim());
                                  const lng = parseFloat(String(ln).trim());
                                  if (!isNaN(lat) && !isNaN(lng))
                                    return { lat, lng };
                                }
                                try {
                                  const obj = JSON.parse(s);
                                  if (obj.lat != null && obj.lng != null)
                                    return { lat: obj.lat, lng: obj.lng };
                                } catch {}
                              }
                              return undefined;
                            };
                            for (let i = 0; i < importRows.length; i++) {
                              const row = importRows[i];
                              try {
                                const dataToSend: Record<string, any> = {};
                                for (const hdr of importHeaders) {
                                  const mapped = headerMap[hdr];
                                  if (!mapped) continue; // ignore not mapped
                                  const f = fieldByName[mapped];
                                  if (!f) continue;
                                  const raw = row[hdr];
                                  let value: any = raw;
                                  const t = f.type;
                                  if (t === "number" || t === "money") {
                                    if (typeof raw === "string") {
                                      const n = parseFloat(
                                        raw.replace(",", ".")
                                      );
                                      value = isNaN(n) ? undefined : n;
                                    }
                                  } else if (
                                    t === "check" ||
                                    t === "checkbox"
                                  ) {
                                    if (typeof raw === "string")
                                      value = boolTrue.has(
                                        raw.trim().toLowerCase()
                                      );
                                    else value = !!raw;
                                  } else if (t === "date" || t === "datetime") {
                                    value = toIso(raw);
                                  } else if (t === "array" || t === "list") {
                                    value = toArray(raw);
                                  } else if (t === "map") {
                                    value = toMap(raw);
                                  } else if (
                                    t === "image" ||
                                    t === "file" ||
                                    t === "hotspot"
                                  ) {
                                    // leave as-is; advanced handling (upload) is not supported in bulk import
                                  } else {
                                    // text/area/select/etc
                                    value = raw;
                                  }
                                  if (value !== undefined)
                                    dataToSend[f.name] = { value, type: t };
                                }
                                const payload = {
                                  data: dataToSend,
                                  record: recordId,
                                  subform: subformId,
                                  createdBy: user.email,
                                  org: currentSubform?.org,
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                };
                                await axios.post(`/api/subrecords`, payload, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                setImportProgress((p) => ({
                                  ...p,
                                  done: p.done + 1,
                                }));
                              } catch (e: any) {
                                setImportErrors((prev) => [
                                  ...prev,
                                  `Linha ${i + 1}: ${
                                    e?.response?.data?.error ||
                                    e?.message ||
                                    "erro"
                                  }`,
                                ]);
                              }
                            }
                            setShowImport(false);
                            setImportRows([]);
                            setImportHeaders([]);
                            setHeaderMap({});
                            await fetchSubrecords();
                          } finally {
                            setImporting(false);
                          }
                        }}
                      >
                        Importar {importRows.length} linhas
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showChooser && subformId && (
            <SubrecordColumnChooser
              fields={fields as SRColumnDef[]}
              setFields={setFields}
              onClose={() => setShowChooser(false)}
              subformId={subformId}
            />
          )}
          <SubrecordActiveHeadersSearch
            fields={fields}
            searchFields={searchFields}
            setSearchFields={setSearchFields}
          />
          {(() => {
            // Compute filtered records based on visible fields and search
            const visibleFields = fields.filter((f: any) => f.visible);
            const filteredRecords = records.filter((record) => {
              for (const field of visibleFields) {
                const key = field.key;
                const type = field.type || "text";
                const value = searchFields[key];
                if (value === undefined || value === null || value === "")
                  continue;
                let recValue: any = record[key];
                if (
                  recValue === undefined &&
                  record.recordData &&
                  record.recordData[key]
                ) {
                  recValue = record.recordData[key].value;
                } else if (recValue === undefined && record.recordData) {
                  const byLabel = record.recordData[field.label];
                  if (byLabel && typeof byLabel === "object") {
                    recValue = byLabel.value;
                  }
                } else if (recValue === undefined && record.data) {
                  const byKey = (record as any).data?.[key];
                  if (byKey && typeof byKey === "object") {
                    recValue = byKey.value ?? byKey;
                  } else {
                    const byLabel2 = (record as any).data?.[field.label];
                    if (byLabel2 && typeof byLabel2 === "object") {
                      recValue = byLabel2.value ?? byLabel2;
                    }
                  }
                }
                if (
                  type === "text" ||
                  type === "area" ||
                  type === "textarea" ||
                  type === "list" ||
                  type === "hotspot" ||
                  type === "array" ||
                  type === "form-data-select" ||
                  !type
                ) {
                  if (
                    !recValue ||
                    !String(recValue)
                      .toLowerCase()
                      .includes(String(value).toLowerCase())
                  )
                    return false;
                } else if (type === "number" || type === "money") {
                  const toNumber = (v: any): number => {
                    if (v === undefined || v === null) return NaN;
                    if (typeof v === "number") return v;
                    if (typeof v === "string") {
                      const n = parseFloat(v.replace(",", "."));
                      return isNaN(n) ? NaN : n;
                    }
                    if (Array.isArray(v)) return toNumber(v[0]);
                    return NaN;
                  };
                  const n = toNumber(recValue);
                  if (typeof value === "object" && (value as any)?.op) {
                    const vobj: any = value;
                    if (vobj.op === "gt") {
                      const q = toNumber(vobj.value);
                      if (isNaN(n) || isNaN(q) || !(n > q)) return false;
                    } else if (vobj.op === "lt") {
                      const q = toNumber(vobj.value);
                      if (isNaN(n) || isNaN(q) || !(n < q)) return false;
                    } else if (vobj.op === "between") {
                      const a = toNumber(vobj.from);
                      const b = toNumber(vobj.to);
                      if (isNaN(n) || isNaN(a) || isNaN(b)) return false;
                      const min = Math.min(a, b);
                      const max = Math.max(a, b);
                      if (n < min || n > max) return false;
                    }
                  } else {
                    if (
                      !recValue ||
                      !String(recValue)
                        .toLowerCase()
                        .includes(String(value).toLowerCase())
                    )
                      return false;
                  }
                } else if (type === "checkbox" || type === "check") {
                  if (value === true && recValue !== true) return false;
                  if (value === false && recValue !== false) return false;
                } else if (type === "select") {
                  if (value === "") continue;
                  const selectedValues: string[] = Array.isArray(value)
                    ? (value as any[]).map((x: any) => String(x))
                    : [String(value)];
                  let rv: any = recValue;
                  if (
                    rv === undefined &&
                    record.recordData &&
                    record.recordData[key]
                  ) {
                    rv = record.recordData[key].value;
                  }
                  const rvArray = Array.isArray(rv) ? rv : [rv];
                  const rvStringArray = rvArray.map((v) => String(v));
                  const match = rvStringArray.some((v) =>
                    selectedValues.includes(v)
                  );
                  if (!match) return false;
                } else if (type === "date" || type === "datetime") {
                  const getDateString = (v: any) => {
                    if (!v) return "";
                    if (typeof v === "string") return v.substring(0, 10);
                    if ((v as any)?._seconds)
                      return new Date((v as any)._seconds * 1000)
                        .toISOString()
                        .substring(0, 10);
                    try {
                      return new Date(v).toISOString().substring(0, 10);
                    } catch {
                      return "";
                    }
                  };
                  const recDate = getDateString(recValue);
                  if ((value as any)?.from) {
                    const from = String((value as any).from);
                    if (!recDate || recDate < from) return false;
                  }
                  if ((value as any)?.to) {
                    const to = String((value as any).to);
                    if (!recDate || recDate > to) return false;
                  }
                } else if (type === "map") {
                  let lat: string | null = null;
                  let lng: string | null = null;
                  if (recValue && typeof recValue === "object") {
                    lat = String((recValue as any).lat ?? "");
                    lng = String((recValue as any).lng ?? "");
                  } else if (
                    typeof recValue === "string" &&
                    recValue.includes(",")
                  ) {
                    const [la, ln] = String(recValue).split(",");
                    lat = la?.trim() ?? null;
                    lng = ln?.trim() ?? null;
                  }
                  if (
                    (value as any)?.lat &&
                    lat !== null &&
                    !lat.includes((value as any).lat)
                  )
                    return false;
                  if (
                    (value as any)?.lng &&
                    lng !== null &&
                    !lng.includes((value as any).lng)
                  )
                    return false;
                }
              }
              return true;
            });

            // Pagination derived values
            const pageSize = 10;
            const totalPages = Math.max(
              1,
              Math.ceil(filteredRecords.length / pageSize)
            );
            const startIdx = (currentPage - 1) * pageSize;
            const pageItems = filteredRecords.slice(
              startIdx,
              startIdx + pageSize
            );

            return (
              <>
                <div style={{ overflowX: "auto", width: "100%" }}>
                  <table
                    className="table table-dark table-striped"
                    style={{ minWidth: 900 }}
                  >
                    <thead>
                      <tr>
                        {fields
                          .filter((f: any) => f.visible)
                          .map((field: any) => (
                            <th key={field.key}>{field.label}</th>
                          ))}
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((record) => (
                        <tr key={record.id}>
                          {fields
                            .filter((f: any) => f.visible)
                            .map((field: any) => {
                              let value: any = "";
                              let type: string =
                                (field.type as string) || "text";
                              if (
                                record.recordData &&
                                record.recordData[field.key]
                              ) {
                                value = record.recordData[field.key].value;
                              } else if (
                                record.recordData &&
                                record.recordData[field.label]
                              ) {
                                value = record.recordData[field.label].value;
                              } else if (
                                (record as any).data &&
                                (record as any).data[field.key]
                              ) {
                                const v = (record as any).data[field.key];
                                value = (v as any)?.value ?? v;
                              } else if (
                                (record as any).data &&
                                (record as any).data[field.label]
                              ) {
                                const v = (record as any).data[field.label];
                                value = (v as any)?.value ?? v;
                              } else if (field.key === "org") {
                                value = Array.isArray(record.org)
                                  ? record.org.join(", ")
                                  : (record as any).org;
                              } else if (field.key in record) {
                                value = (record as any)[field.key];
                              }
                              if (type === "date" || type === "datetime") {
                                if (!value) value = "";
                                else {
                                  if (typeof value === "string")
                                    value = new Date(value).toLocaleString(
                                      "pt-BR"
                                    );
                                  else if ((value as any)?._seconds)
                                    value = new Date(
                                      (value as any)._seconds * 1000
                                    ).toLocaleString("pt-BR");
                                  else
                                    try {
                                      value = new Date(
                                        value as any
                                      ).toLocaleString("pt-BR");
                                    } catch {
                                      value = String(value);
                                    }
                                }
                              } else if (type === "map") {
                                if (value && typeof value === "object") {
                                  const lat = (value as any).lat ?? "";
                                  const lng = (value as any).lng ?? "";
                                  value = `${lat}, ${lng}`;
                                } else if (
                                  typeof value === "string" &&
                                  value.includes(",")
                                ) {
                                } else {
                                  value = "";
                                }
                              } else if (type === "check") {
                                value = value ? "Sim" : "Não";
                              } else if (type === "number") {
                                value =
                                  value !== null && value !== undefined
                                    ? value
                                    : "";
                              } else if (Array.isArray(value)) {
                                value = value.join(", ");
                              } else if (
                                typeof value === "object" &&
                                value !== null
                              ) {
                                if (type === "image" && (value as any).url) {
                                  value = (value as any).url;
                                } else {
                                  value = JSON.stringify(value);
                                }
                              }
                              return (
                                <td key={field.key}>{String(value ?? "")}</td>
                              );
                            })}
                          <td>
                            <Link
                              to={`/subrecords/${record.id}`}
                              className="btn btn-primary btn-sm me-2"
                            >
                              Visualizar
                            </Link>
                            <Link
                              to={`/subrecords/${record.id}/edit`}
                              className="btn btn-warning btn-sm me-2"
                            >
                              Editar
                            </Link>
                            {(() => {
                              const role = (claims?.role as string) || "";
                              const isManagerOrAdmin =
                                role === "Admin" || role === "Manager";
                              return (
                                isManagerOrAdmin && (
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() =>
                                      handleDelete(
                                        record.id,
                                        (record as any)?.record,
                                        (record as any)?.subform
                                      )
                                    }
                                    disabled={deletingId === record.id}
                                  >
                                    {deletingId === record.id
                                      ? "Excluindo..."
                                      : "Excluir"}
                                  </button>
                                )
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Paginação */}
                <div className="d-flex align-items-center gap-3 mt-3">
                  <nav aria-label="Paginação">
                    <ul className="pagination pagination-dark mb-0 bg-dark rounded-2 p-1">
                      <li
                        className={`page-item${
                          currentPage === 1 ? " disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link bg-dark text-light border-secondary"
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <li
                          key={i + 1}
                          className={`page-item${
                            currentPage === i + 1 ? " active" : ""
                          }`}
                        >
                          <button
                            className={`page-link bg-dark text-light border-secondary${
                              currentPage === i + 1 ? " active" : ""
                            }`}
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`page-item${
                          currentPage === totalPages ? " disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link bg-dark text-light border-secondary"
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </>
            );
          })()}
          <div className="fw-bold mt-3" style={{ minWidth: 120 }}>
            {(() => {
              const visibleFields = fields.filter((f: any) => f.visible);
              const filteredCount = records.filter((record) => {
                for (const field of visibleFields) {
                  const key = field.key;
                  const type = field.type || "text";
                  const value = searchFields[key];
                  if (value === undefined || value === null || value === "")
                    continue;
                  let recValue: any = (record as any)[key];
                  if (
                    recValue === undefined &&
                    (record as any).recordData &&
                    (record as any).recordData[key]
                  ) {
                    recValue = (record as any).recordData[key].value;
                  }
                  if (
                    type === "text" ||
                    type === "area" ||
                    type === "textarea" ||
                    type === "list" ||
                    type === "hotspot" ||
                    type === "array" ||
                    type === "form-data-select" ||
                    !type
                  ) {
                    if (
                      !recValue ||
                      !String(recValue)
                        .toLowerCase()
                        .includes(String(value).toLowerCase())
                    )
                      return false;
                  }
                }
                return true;
              }).length;
              return <>Subregistros: {filteredCount}</>;
            })()}
          </div>
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={() => navigate(-1)}
          >
            Voltar
          </button>
        </>
      )}
    </div>
  );
};

export default SubrecordsPage;
