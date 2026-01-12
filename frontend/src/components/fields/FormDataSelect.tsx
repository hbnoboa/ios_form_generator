import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/authContext";

// Simple in-module pub/sub to synchronize selections across FormDataSelects
type Subscriber = (recordId: string) => void;
const syncGroups: Map<string, Set<Subscriber>> = new Map();
function publishSelection(groupId: string, recordId: string) {
  const subs = syncGroups.get(groupId);
  if (!subs) return;
  subs.forEach((cb) => {
    try {
      cb(recordId);
    } catch {}
  });
}
function subscribeSelection(groupId: string, cb: Subscriber) {
  let subs = syncGroups.get(groupId);
  if (!subs) {
    subs = new Set();
    syncGroups.set(groupId, subs);
  }
  subs.add(cb);
  return () => {
    subs!.delete(cb);
    if (subs && subs.size === 0) syncGroups.delete(groupId);
  };
}

interface FormSummary {
  id: string;
  name: string;
  fields?: Array<{
    name: string;
    label?: string;
    type?: string;
    options?: any[];
    selectOptions?: any[];
  }>;
}

interface Props {
  label?: string;
  value: string | string[] | null | undefined;
  onChange: (value: string | string[] | null) => void;
  disabled?: boolean;
  initialFormId?: string; // optional preselected form
  initialFieldName?: string; // optional preselected field
  placeholderOption?: string; // placeholder for single select
  hideSourceSelectors?: boolean; // hide UI for choosing source form/field
  showValueSelect?: boolean; // show the final value select (third select)
  onSourceChange?: (info: {
    formId?: string;
    formName?: string;
    fieldName?: string;
  }) => void; // notify parent of selected source form/field
}

const FormDataSelect: React.FC<Props> = ({
  label = "Selecionar dado",
  value,
  onChange,
  disabled,
  initialFormId,
  initialFieldName,
  placeholderOption = "Selecione...",
  hideSourceSelectors = false,
  showValueSelect = true,
  onSourceChange,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [formId, setFormId] = useState<string | undefined>(initialFormId);
  const [fieldName, setFieldName] = useState<string | undefined>(
    initialFieldName
  );
  const [options, setOptions] = useState<string[]>([]);
  const [recordsForForm, setRecordsForForm] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load available forms (within user's org)
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await axios.get("/api/forms", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list: FormSummary[] = Array.isArray(res.data) ? res.data : [];
        setForms(list);
        // Autoselect first form if none provided
        if (!initialFormId && list.length > 0) {
          const autoId = list[0].id;
          const autoName = list[0].name;
          setFormId(autoId);
          onSourceChange?.({ formId: autoId, formName: autoName, fieldName });
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao carregar formulários");
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedForm = useMemo(
    () => forms.find((f) => f.id === formId),
    [forms, formId]
  );

  const formFields = useMemo(() => {
    const ff = selectedForm?.fields || [];
    // Only suggest fields that are likely to provide option values
    return ff.map((f) => ({
      name: f.name,
      label: f.label || f.name,
      type: f.type,
    }));
  }, [selectedForm]);

  // Auto-select first field when form changes (if none chosen yet)
  useEffect(() => {
    if (!fieldName && formFields.length > 0) {
      const first = formFields[0].name;
      setFieldName(first);
      const currentForm = forms.find((f) => f.id === formId);
      onSourceChange?.({
        formId,
        formName: currentForm?.name,
        fieldName: first,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formFields.length]);

  // Load options from records for selected form/field
  useEffect(() => {
    const loadOptions = async () => {
      if (!user || !formId || !fieldName) return;
      setLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await axios.get("/api/records", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const all = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const filtered = all.filter((r: any) => r.formId === formId);
        const set = new Set<string>();
        filtered.forEach((r: any) => {
          let v: any = undefined;
          if (r.recordData && r.recordData[fieldName]) {
            v = r.recordData[fieldName].value;
          } else if (r[fieldName] !== undefined) {
            v = r[fieldName];
          }
          if (Array.isArray(v)) {
            v.forEach((x) => {
              const sx = String(x).trim();
              if (sx !== "") set.add(sx);
            });
          } else if (v !== undefined && v !== null) {
            const sv = String(v).trim();
            if (sv !== "") set.add(sv);
          }
        });
        const arr = Array.from(set);
        arr.sort((a, b) =>
          a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        );
        setOptions(arr);
        setRecordsForForm(filtered);
      } catch (err: any) {
        setError(
          err.response?.data?.error || "Erro ao carregar opções do formulário"
        );
      }
      setLoading(false);
    };
    loadOptions();
  }, [user, formId, fieldName]);

  const handleMainChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const newValue = (e.target as HTMLSelectElement).value || "";
    onChange(newValue);
    const currentForm = forms.find((f) => f.id === formId);
    onSourceChange?.({
      formId,
      formName: currentForm?.name,
      fieldName,
    });
    // Attempt to locate the record corresponding to the chosen value
    if (formId && fieldName && recordsForForm.length > 0) {
      const match = recordsForForm.find((r: any) => {
        let v: any = undefined;
        if (r.recordData && r.recordData[fieldName]) {
          v = r.recordData[fieldName].value;
        } else if (r[fieldName] !== undefined) {
          v = r[fieldName];
        }
        if (Array.isArray(v))
          return v.map((x: any) => String(x)).includes(newValue);
        return String(v ?? "") === newValue;
      });
      if (match && match.id) {
        publishSelection(String(formId), match.id);
      }
    }
  };

  // Subscribe to selection changes within the same source form to auto-fill other fields
  useEffect(() => {
    if (!formId || !fieldName) return;
    const unsubscribe = subscribeSelection(
      String(formId),
      (recordId: string) => {
        // Find this field's value in the announced record and propagate via onChange
        const rec = recordsForForm.find((r) => r.id === recordId);
        if (!rec) return;
        let v: any = undefined;
        if (rec.recordData && rec.recordData[fieldName]) {
          v = rec.recordData[fieldName].value;
        } else if ((rec as any)[fieldName] !== undefined) {
          v = (rec as any)[fieldName];
        }
        let sv = "";
        if (Array.isArray(v)) {
          sv = v.length > 0 ? String(v[0]) : "";
        } else if (v !== undefined && v !== null) {
          sv = String(v);
        }
        if (sv !== String(value ?? "")) {
          onChange(sv);
        }
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, fieldName, recordsForForm, value]);

  return (
    <div className="mb-3">
      {!hideSourceSelectors && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          <div style={{ minWidth: 220 }}>
            <span className="badge bg-secondary mb-1">Formulário fonte</span>
            <select
              className="form-select form-select-sm"
              value={formId || ""}
              onChange={(e) => {
                const newId = e.target.value || undefined;
                const f = forms.find((x) => x.id === newId);
                setFormId(newId);
                setFieldName(undefined);
                setOptions([]);
                onSourceChange?.({
                  formId: newId,
                  formName: f?.name,
                  fieldName: undefined,
                });
              }}
              disabled={disabled || loading}
            >
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name || f.id}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 220 }}>
            <span className="badge bg-secondary mb-1">Campo fonte</span>
            <select
              className="form-select form-select-sm"
              value={fieldName || ""}
              onChange={(e) => {
                const newField = e.target.value || undefined;
                setFieldName(newField);
                const currentForm = forms.find((f) => f.id === formId);
                onSourceChange?.({
                  formId,
                  formName: currentForm?.name,
                  fieldName: newField,
                });
              }}
              disabled={disabled || loading || !formId}
            >
              {formFields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {showValueSelect && (
        <select
          className="form-select"
          value={String(value ?? "")}
          onChange={handleMainChange}
          disabled={disabled || loading || !formId || !fieldName}
        >
          <option value="">{placeholderOption}</option>
          {options.map((opt, idx) => (
            <option key={`${opt}-${idx}`} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {error && <div className="text-danger mt-1">{error}</div>}
    </div>
  );
};

export default FormDataSelect;
