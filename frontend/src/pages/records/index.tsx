import React, { useEffect, useState } from "react";
import ColumnChooser from "../../components/ColumnChooser";
import ActiveHeadersSearch from "../../components/ActiveHeadersSearch";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface RecordType {
  id: string;
  formId: string;
  createdBy: string;
  org: string[];
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

const DEFAULT_FIELDS = [
  { key: "id", label: "ID", visible: true, type: "text" },
  { key: "createdBy", label: "Criado por", visible: true, type: "text" },
  { key: "org", label: "Orgs", visible: true, type: "text" },
  { key: "createdAt", label: "Criado em", visible: true, type: "date" },
];

const RecordsPage: React.FC = () => {
  const { user, claims } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState<RecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<any[]>(DEFAULT_FIELDS);
  const [showChooser, setShowChooser] = useState(false);
  const [searchFields, setSearchFields] = useState<Record<string, any>>({});
  const [subforms, setSubforms] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [subrecordCounts, setSubrecordCounts] = useState<
    Record<string, Record<string, number>>
  >({});
  // Current form info and fields (for import payload)
  const [currentForm, setCurrentForm] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
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
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Get formId from query string (move up to avoid use-before-assignment)
  const searchParams = new URLSearchParams(location.search);
  const formId = searchParams.get("formId");

  // Fetch form fields; derive columns and types from the form itself and fetch recordId
  useEffect(() => {
    const fetchFormFieldsAndHeaders = async () => {
      if (!user || !formId) return;
      try {
        const token = await user.getIdToken();
        // Busca os campos do formulário
        const formRes = await axios.get(`/api/forms/${formId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentForm(formRes.data);
        const formFieldList = Array.isArray(formRes.data?.fields)
          ? formRes.data.fields
          : [];
        setFormFields(formFieldList);
        // Monta colunas usando os fields do próprio form (com tipos)
        let derived = [
          ...DEFAULT_FIELDS,
          ...formFieldList.map((ff: any) => ({
            key: ff.name,
            label: ff.label ?? ff.name,
            visible: true,
            type: ff.type,
            options: ff?.options ?? ff?.selectOptions ?? [],
          })),
        ];
        // Verifica subforms deste formulário para adicionar colunas de contagem por subform
        try {
          const subformsRes = await axios.get(`/api/subforms`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const allSubforms = Array.isArray(subformsRes.data)
            ? subformsRes.data
            : subformsRes.data?.data || [];
          const list: Array<{ id: string; name: string }> = allSubforms
            .filter((sf: any) => (sf.formId ?? sf.form) === formId)
            .map((sf: any) => ({
              id: sf.id,
              name: sf.name || sf.title || sf.id,
            }));
          setSubforms(list);
          if (list.length > 0) {
            list.forEach((sf) => {
              derived.push({
                key: `__subrecordCount_${sf.id}`,
                label: sf.name,
                visible: true,
                type: "number",
              });
            });
          }
        } catch {
          // silencioso
          setSubforms([]);
        }
        // Se existirem headers salvos no próprio form, mescla visibilidade/ordem/labels/types
        const formHeaders = Array.isArray(formRes.data?.headers)
          ? formRes.data.headers
          : [];
        if (formHeaders.length > 0) {
          const headerMap: Record<string, any> = {};
          formHeaders.forEach((h: any) => {
            headerMap[h.key] = h;
          });
          const ordered: any[] = [];
          formHeaders.forEach((h: any) => {
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
    fetchFormFieldsAndHeaders();
    // eslint-disable-next-line
  }, [user, formId]);

  // Buscar subrecords e calcular contagem por recordId e por subform quando houver subforms
  useEffect(() => {
    const run = async () => {
      if (!user || !formId) return;
      if (!subforms || subforms.length === 0) {
        setSubrecordCounts({});
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await axios.get(`/api/subrecords`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list: any[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        const subformIdSet = new Set(subforms.map((s) => s.id));
        const getSubformIdFromSr = (sr: any): string | undefined =>
          sr?.subformId ?? sr?.subform_id ?? sr?.subform ?? sr?.subFormId;
        const getRecordIdFromSr = (sr: any): string | undefined =>
          sr?.recordId ?? sr?.record_id ?? sr?.record ?? sr?.parentRecordId;
        const filtered = list.filter((sr: any) => {
          const sfid = getSubformIdFromSr(sr);
          return sfid && subformIdSet.has(sfid);
        });

        const counts: Record<string, Record<string, number>> = {};
        filtered.forEach((sr: any) => {
          const rid: string | undefined = getRecordIdFromSr(sr);
          const sfid: string | undefined = getSubformIdFromSr(sr);
          if (!rid || !sfid) return;
          if (!counts[rid]) counts[rid] = {};
          counts[rid][sfid] = (counts[rid][sfid] || 0) + 1;
        });
        setSubrecordCounts(counts);
      } catch {
        setSubrecordCounts({});
      }
    };
    run();
    // eslint-disable-next-line
  }, [user, formId, subforms.map((s) => s.id).join(",")]);

  const fetchRecords = async () => {
    if (!user || !formId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      // Buscar todos os registros do formId (sem paginação backend)
      const res = await axios.get(`/api/records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered = res.data.filter((r: RecordType) => r.formId === formId);
      setRecords(filtered);
      // Log dos itens e tipos
      if (filtered.length > 0) {
        const logArr: { campo: string; valor: any; tipo: string }[] = [];
        filtered.forEach((rec: RecordType) => {
          if (rec.recordData) {
            Object.entries(rec.recordData).forEach(
              ([key, obj]: [string, any]) => {
                logArr.push({ campo: key, valor: obj.value, tipo: obj.type });
              }
            );
          }
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao buscar registros");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line
  }, [user, formId]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Tem certeza que deseja excluir este registro?"))
      return;
    try {
      const token = await user.getIdToken();
      await axios.delete(`/api/records/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao excluir registro");
    }
  };
  // Tipos de coluna agora vêm diretamente dos fields do formulário
  const columnTypes: Record<string, string> = Object.fromEntries(
    fields.map((f: any) => [f.key, f.type])
  );

  // Formatters for PT-BR number and currency display
  const nfNumber = new Intl.NumberFormat("pt-BR");
  const nfMoney = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const formatNumberDisplay = (v: any): string => {
    if (v === null || v === undefined || v === "") return "";
    const n =
      typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? "" : nfNumber.format(n);
  };
  const formatMoneyDisplay = (v: any): string => {
    if (v === null || v === undefined || v === "") return "";
    const n =
      typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? "" : nfMoney.format(n);
  };

  // Helpers to extract raw values per field (for sorting)
  const getRawValueForField = (record: any, field: any): any => {
    const key = field.key;
    if (key.startsWith("__subrecordCount_")) {
      const sfid = key.replace("__subrecordCount_", "");
      return subrecordCounts[record.id]?.[sfid] || 0;
    }
    if (record.recordData && record.recordData[key]) {
      return record.recordData[key].value;
    }
    if (key === "org") {
      return Array.isArray(record.org) ? record.org.join(", ") : record.org;
    }
    return key in record ? record[key] : undefined;
  };
  const toNumber = (v: any): number => {
    if (v === undefined || v === null || v === "") return NaN;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
      return isNaN(n) ? NaN : n;
    }
    if (Array.isArray(v)) return toNumber(v[0]);
    return NaN;
  };
  const toDateTs = (v: any): number => {
    if (!v) return NaN;
    const d = new Date(v);
    const t = d.getTime();
    return isNaN(t) ? NaN : t;
  };
  const toStringNorm = (v: any): string => {
    if (v === undefined || v === null) return "";
    if (typeof v === "object") {
      if (Array.isArray(v)) return v.join(", ");
      if ("lat" in v && "lng" in v)
        return `${(v as any).lat}, ${(v as any).lng}`;
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  // Campos visíveis e registros filtrados (para render e contagem)
  const visibleFields = fields.filter((f: any) => f.visible);
  const filteredRecords = records.filter((record) => {
    for (const field of visibleFields) {
      const key = field.key;
      const type = field.type || "text";
      const value = searchFields[key];
      if (value === undefined || value === null || value === "") continue;
      let recValue: any = record[key];
      if (
        recValue === undefined &&
        record.recordData &&
        record.recordData[key]
      ) {
        recValue = record.recordData[key].value;
      }
      if (
        type === "text" ||
        type === "textarea" ||
        type === "hotspot" ||
        type === "list" ||
        type === "form-data-select" ||
        !type
      ) {
        if (
          !recValue ||
          !String(recValue).toLowerCase().includes(String(value).toLowerCase())
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
        if (typeof value === "object" && value?.op) {
          if (value.op === "gt") {
            const q = toNumber(value.value);
            if (isNaN(n) || isNaN(q) || !(n > q)) return false;
          } else if (value.op === "lt") {
            const q = toNumber(value.value);
            if (isNaN(n) || isNaN(q) || !(n < q)) return false;
          } else if (value.op === "between") {
            const a = toNumber(value.from);
            const b = toNumber(value.to);
            if (isNaN(n) || isNaN(a) || isNaN(b)) return false;
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            if (n < min || n > max) return false;
          }
        } else {
          // Fallback to substring match if value is a simple string
          if (
            !recValue ||
            !String(recValue)
              .toLowerCase()
              .includes(String(value).toLowerCase())
          )
            return false;
        }
      } else if (type === "checkbox" || type === "check" || type === "done") {
        if (value === true && recValue !== true) return false;
        if (value === false && recValue !== false) return false;
      } else if (type === "select") {
        if (value === "") continue;
        const selectedValues: string[] = Array.isArray(value)
          ? value.map((x: any) => String(x))
          : [String(value)];
        let rv: any = recValue;
        if (rv === undefined && record.recordData && record.recordData[key]) {
          rv = record.recordData[key].value;
        }
        const rvArray = Array.isArray(rv) ? rv : [rv];
        const rvStringArray = rvArray.map((v) => String(v));
        const match = rvStringArray.some((v) => selectedValues.includes(v));
        if (!match) return false;
      } else if (type === "date" || type === "datetime") {
        const getDateString = (v: any) => {
          if (!v) return null;
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        };
        if (value?.from) {
          const recDate = getDateString(recValue);
          if (!recDate || recDate < value.from) return false;
        }
        if (value?.to) {
          const recDate = getDateString(recValue);
          if (!recDate || recDate > value.to) return false;
        }
      } else if (type === "map") {
        let lat: string | null = null;
        let lng: string | null = null;
        if (recValue && typeof recValue === "object") {
          if ("lat" in recValue && "lng" in recValue) {
            lat = String(recValue.lat);
            lng = String(recValue.lng);
          } else if (Array.isArray(recValue) && recValue.length === 2) {
            lat = String(recValue[0]);
            lng = String(recValue[1]);
          }
        } else if (typeof recValue === "string" && recValue.includes(",")) {
          const parts = recValue.split(",");
          if (parts.length === 2) {
            lat = parts[0].trim();
            lng = parts[1].trim();
          }
        }
        if (value?.lat && lat !== null && !lat.includes(value.lat))
          return false;
        if (value?.lng && lng !== null && !lng.includes(value.lng))
          return false;
      }
    }
    return true;
  });

  // Apply sorting before pagination
  const sortedRecords = (() => {
    if (!sortKey) return filteredRecords;
    const field = fields.find((f) => f.key === sortKey) || {
      key: sortKey,
      type: columnTypes[sortKey] || "text",
    };
    const type = field.type || "text";
    const dirMul = sortDir === "asc" ? 1 : -1;
    const cmp = (a: any, b: any): number => {
      const va = getRawValueForField(a, field);
      const vb = getRawValueForField(b, field);
      let aa: any;
      let bb: any;
      if (type === "number" || type === "money") {
        aa = toNumber(va);
        bb = toNumber(vb);
        if (isNaN(aa)) aa = -Infinity;
        if (isNaN(bb)) bb = -Infinity;
      } else if (type === "date" || type === "datetime") {
        aa = toDateTs(va);
        bb = toDateTs(vb);
        if (isNaN(aa)) aa = -Infinity;
        if (isNaN(bb)) bb = -Infinity;
      } else if (type === "checkbox" || type === "check" || type === "done") {
        aa = va ? 1 : 0;
        bb = vb ? 1 : 0;
      } else {
        aa = toStringNorm(va).toLowerCase();
        bb = toStringNorm(vb).toLowerCase();
      }
      if (aa < bb) return -1 * dirMul;
      if (aa > bb) return 1 * dirMul;
      return 0;
    };
    const arr = [...filteredRecords];
    arr.sort(cmp);
    return arr;
  })();

  // Pagination derived values (10 per page)
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = sortedRecords.slice(startIdx, startIdx + pageSize);

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Registros</h2>
        <div className="d-flex gap-2">
          {(() => {
            const role = (claims?.role as string) || "";
            const isManagerOrAdmin = role === "Admin" || role === "Manager";
            if (formId && isManagerOrAdmin) {
              return (
                <>
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
                              setError(
                                "JSON vazio ou inválido para importação"
                              );
                              return;
                            }
                            const headers = Object.keys(rows[0]);
                            setImportHeaders(headers);
                            setImportRows(rows);
                            const map: Record<string, string> = {};
                            const byName: Record<string, any> = {};
                            formFields.forEach((f: any) => {
                              byName[f.name.toLowerCase()] = f;
                              if (f.label) byName[f.label.toLowerCase()] = f;
                            });
                            headers.forEach((h: string) => {
                              const key = h.toLowerCase();
                              if (byName[key]) map[h] = byName[key].name;
                              else map[h] = "";
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
                              setError("Planilha sem linhas para importação");
                              return;
                            }
                            const headers = Object.keys(rows[0]);
                            setImportHeaders(headers);
                            setImportRows(rows);
                            const map: Record<string, string> = {};
                            const byName: Record<string, any> = {};
                            formFields.forEach((f: any) => {
                              byName[f.name.toLowerCase()] = f;
                              if (f.label) byName[f.label.toLowerCase()] = f;
                            });
                            headers.forEach((h: string) => {
                              const key = h.toLowerCase();
                              if (byName[key]) map[h] = byName[key].name;
                              else map[h] = ""; // Ignorar por padrão
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
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setShowChooser(true)}
                  >
                    Editar colunas
                  </button>
                </>
              );
            }
            return null;
          })()}
          {formId && (
            <Link
              to={`/records/new?formId=${formId}`}
              className="btn btn-success"
            >
              Criar Registro
            </Link>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {!formId && (
        <div className="alert alert-warning">
          Selecione um formulário para ver os registros.
        </div>
      )}
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          {(() => {
            const role = (claims?.role as string) || "";
            const isManagerOrAdmin = role === "Admin" || role === "Manager";
            return (
              showChooser &&
              formId &&
              isManagerOrAdmin && (
                <ColumnChooser
                  fields={fields}
                  setFields={setFields}
                  formId={formId as string}
                  onClose={() => setShowChooser(false)}
                />
              )
            );
          })()}
          {/* Busca por cabeçalhos visíveis */}
          <ActiveHeadersSearch
            fields={fields.filter((f: any) => f.visible)}
            searchFields={searchFields}
            setSearchFields={setSearchFields}
          />
          {/* Import modal */}
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
                      formulário.
                    </p>
                    <div className="row fw-bold mb-2">
                      <div className="col-6">Cabeçalho do arquivo</div>
                      <div className="col-6">Campo do formulário</div>
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
                            {formFields.map((f: any) => (
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
                        disabled={importing || !currentForm}
                        onClick={async () => {
                          if (!user || !currentForm) return;
                          setImporting(true);
                          setImportErrors([]);
                          const total = importRows.length;
                          setImportProgress({ done: 0, total });
                          try {
                            const token = await user.getIdToken();
                            const fieldByName: Record<string, any> = {};
                            formFields.forEach(
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
                              if (typeof v === "string")
                                return v
                                  .split(",")
                                  .map((x) => x.trim())
                                  .filter((x) => x !== "");
                              return [];
                            };
                            const toMap = (v: any) => {
                              if (
                                v &&
                                typeof v === "object" &&
                                "lat" in v &&
                                "lng" in v
                              )
                                return v;
                              if (typeof v === "string" && v.includes(",")) {
                                const [lat, lng] = v
                                  .split(",")
                                  .map((p) => p.trim());
                                const latN = Number(lat);
                                const lngN = Number(lng);
                                if (!isNaN(latN) && !isNaN(lngN))
                                  return { lat: latN, lng: lngN };
                              }
                              return v;
                            };
                            for (let i = 0; i < importRows.length; i++) {
                              const row = importRows[i];
                              const dataToSend: Record<string, any> = {};
                              for (const srcHeader of importHeaders) {
                                const target = headerMap[srcHeader];
                                if (!target) continue; // Ignorar
                                const field = fieldByName[target];
                                if (!field) continue;
                                let value: any = row[srcHeader];
                                const type: string = field.type;
                                if (value === undefined || value === null)
                                  value = "";
                                // Coerções por tipo
                                if (type === "date") {
                                  const iso = toIso(value);
                                  value = iso || value;
                                } else if (type === "number") {
                                  const n =
                                    typeof value === "number"
                                      ? value
                                      : parseFloat(
                                          String(value).replace(",", ".")
                                        );
                                  value = isNaN(n) ? undefined : n;
                                } else if (type === "check") {
                                  const s = String(value).trim().toLowerCase();
                                  value = boolTrue.has(s);
                                } else if (type === "array") {
                                  value = toArray(value);
                                } else if (type === "map") {
                                  value = toMap(value);
                                } else if (
                                  type === "hotspot" &&
                                  typeof value === "string"
                                ) {
                                  const m = value.match(/^hotspot\d+:(.*)$/);
                                  if (m) value = m[1].trim();
                                } else if (
                                  (type === "image" || type === "file") &&
                                  typeof value === "string"
                                ) {
                                  if (value.startsWith("http")) {
                                    try {
                                      const url = value;
                                      const parts = url.split("/");
                                      let fileName = parts[parts.length - 1];
                                      fileName = fileName.split("?")[0];
                                      value = {
                                        url,
                                        name: decodeURIComponent(fileName),
                                      };
                                    } catch {
                                      value = { url: value };
                                    }
                                  }
                                }
                                dataToSend[target] = { value, type };
                              }
                              const payload = {
                                formId: currentForm.id,
                                recordData: dataToSend,
                                org: currentForm.org,
                                createdBy: user.email,
                                createdAt: new Date().toISOString(),
                              };
                              try {
                                await axios.post("/api/records", payload, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                              } catch (er: any) {
                                const msg =
                                  er?.response?.data?.error ||
                                  er?.message ||
                                  "erro";
                                setImportErrors((prev) => [
                                  ...prev,
                                  `Linha ${i + 1}: ${msg}`,
                                ]);
                              }
                              setImportProgress({ done: i + 1, total });
                            }
                            // Finalizado
                            setShowImport(false);
                            setImportRows([]);
                            setImportHeaders([]);
                            setHeaderMap({});
                            await fetchRecords();
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
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table
              className="table table-dark table-striped"
              style={{ minWidth: 900 }}
            >
              <thead>
                <tr>
                  {visibleFields.map((field: any) => (
                    <th
                      key={field.key}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setCurrentPage(1);
                        if (sortKey === field.key) {
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        } else {
                          setSortKey(field.key);
                          setSortDir("asc");
                        }
                      }}
                    >
                      {field.label}
                      {sortKey === field.key ? (
                        <span className="ms-1">
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </th>
                  ))}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((record) => (
                  <tr key={record.id}>
                    {visibleFields.map((field: any) => {
                      // Descobrir valor do campo usando recordData
                      let value: any = "";
                      let type: string = columnTypes[field.key] || "text";
                      if (field.key.startsWith("__subrecordCount_")) {
                        const sfid = field.key.replace("__subrecordCount_", "");
                        value = subrecordCounts[record.id]?.[sfid] || 0;
                        type = "number";
                      } else if (
                        record.recordData &&
                        record.recordData[field.key]
                      ) {
                        value = record.recordData[field.key].value;
                      } else if (field.key === "org") {
                        value = Array.isArray(record.org)
                          ? record.org.join(", ")
                          : record.org;
                      } else if (field.key in record) {
                        value = record[field.key];
                      }
                      // Renderização especial para tipos
                      if (type === "date" || type === "datetime") {
                        if (!value) value = "";
                        else {
                          const d = new Date(value);
                          value = !isNaN(d.getTime())
                            ? d.toLocaleString("pt-BR")
                            : "[Data Inválida]";
                        }
                      } else if (type === "map") {
                        if (value && typeof value === "object") {
                          if ("lat" in value && "lng" in value) {
                            value = `${value.lat}, ${value.lng}`;
                          } else if (
                            Array.isArray(value) &&
                            value.length === 2
                          ) {
                            value = `${value[0]}, ${value[1]}`;
                          } else {
                            value = JSON.stringify(value);
                          }
                        } else if (
                          typeof value === "string" &&
                          value.includes(",")
                        ) {
                          // já é string, não precisa reatribuir
                        } else {
                          value = "[Mapa Inválido]";
                        }
                      } else if (type === "check") {
                        value = value ? "Sim" : "Não";
                      } else if (type === "number") {
                        value = formatNumberDisplay(value);
                      } else if (type === "money") {
                        value = formatMoneyDisplay(value);
                      } else if (Array.isArray(value)) {
                        value = value.join(", ");
                      } else if (typeof value === "object" && value !== null) {
                        value = JSON.stringify(value);
                      }
                      return (
                        <td key={field.key}>
                          <span data-type={type}>{value}</span>
                        </td>
                      );
                    })}
                    <td>
                      <Link
                        to={`/records/${record.id}`}
                        className="btn btn-primary btn-sm me-2"
                      >
                        Visualizar
                      </Link>
                      <Link
                        to={`/records/${record.id}/edit`}
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
                              onClick={() => handleDelete(record.id)}
                            >
                              Excluir
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
          {/* Info mínima */}
          <div className="fw-bold mt-3" style={{ minWidth: 120 }}>
            Registros: {filteredRecords.length}
          </div>
          {/* Paginação */}
          <div className="d-flex align-items-center gap-3 mt-3">
            <nav aria-label="Paginação">
              <ul className="pagination pagination-dark mb-0 bg-dark rounded-2 p-1">
                <li
                  className={`page-item${currentPage === 1 ? " disabled" : ""}`}
                >
                  <button
                    className="page-link bg-dark text-light border-secondary"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </button>
                </li>
              </ul>
            </nav>
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

export default RecordsPage;
