// Usage:
//   node backend/scripts/update_peca_hotspot_options.js <SUBFORM_ID> <jsonPath>
// Reads a JSON file and sets options per hotspot in the 'Peça' field:
// - If JSON is an array of objects with { area: number, name: string },
//   hotspot 1 receives names of area 1, hotspot 2 area 2, and so on.
// - If JSON is an array of strings, all hotspots receive the same options.

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

function initAdmin() {
  const servicePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(__dirname, "../serviceAccountKey.json");
  const serviceAccount = require(servicePath);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

function normalize(str) {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readAreaNames(jsonPath) {
  const full = path.resolve(jsonPath);
  if (!fs.existsSync(full)) {
    throw new Error(`Arquivo JSON não encontrado: ${full}`);
  }
  const raw = fs.readFileSync(full, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error("Falha ao parsear JSON: " + e.message);
  }
  if (!Array.isArray(data)) throw new Error("JSON deve ser um array");

  // Detect shape
  const looksLikeArea = data.some(
    (it) =>
      it &&
      typeof it === "object" &&
      typeof it.name === "string" &&
      (typeof it.area === "number" || typeof it.area === "string")
  );

  if (looksLikeArea) {
    const map = new Map(); // area:number -> Set(names)
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const name = (item.name || "").toString().trim();
      const areaNum = Number(item.area);
      if (!name || !Number.isFinite(areaNum)) continue;
      if (!map.has(areaNum)) map.set(areaNum, new Set());
      map.get(areaNum).add(name);
    }
    // Convert to plain object with arrays
    const byArea = {};
    for (const [area, set] of map.entries()) {
      byArea[area] = Array.from(set);
    }
    const totalNames = Object.values(byArea).reduce(
      (acc, arr) => acc + arr.length,
      0
    );
    if (totalNames === 0)
      throw new Error("Nenhum nome válido encontrado no JSON por área");
    return { byArea, flat: null };
  }

  // Fallback: simple array of strings
  const names = data
    .map((item) => (typeof item === "string" ? item : undefined))
    .filter((s) => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const unique = Array.from(new Set(names));
  if (unique.length === 0)
    throw new Error("Nenhum nome válido encontrado no JSON");
  return { byArea: null, flat: unique };
}

async function updateHotspotOptions(db, subformId, areaOrFlat) {
  const ref = db.collection("subforms").doc(subformId);
  const snap = await ref.get();
  if (!snap.exists)
    throw new Error(`Subformulário não encontrado: ${subformId}`);
  const data = snap.data() || {};
  const fields = Array.isArray(data.fields) ? [...data.fields] : [];

  // Locate field 'Peça' / 'Peças'
  const idx = fields.findIndex((f) => {
    const label = normalize(f.label || f.name || "");
    return label === "peca" || label === "pecas";
  });
  if (idx === -1) throw new Error("Campo 'Peça' não encontrado");

  const field = { ...fields[idx] };
  if (field.type !== "hotspot") {
    console.warn(
      `Aviso: campo '${field.label || field.name}' tem tipo '${
        field.type
      }', atualizando mesmo assim o valor.hotspots.`
    );
  }
  const val = field.value || {};
  const hotspots = Array.isArray(val.hotspots) ? [...val.hotspots] : [];
  if (hotspots.length === 0) {
    console.warn(
      "Aviso: campo 'Peça' não possui hotspots; nenhuma posição será criada"
    );
  }
  const updatedHotspots = hotspots.map((h, idx) => {
    // Hotspot index is 0-based; area mapping is 1-based per requirement
    const areaNum = idx + 1;
    let options = [];
    if (areaOrFlat.byArea) {
      options = Array.isArray(areaOrFlat.byArea[areaNum])
        ? areaOrFlat.byArea[areaNum]
        : [];
    } else if (areaOrFlat.flat) {
      options = areaOrFlat.flat;
    }
    return { ...h, options };
  });
  field.value = { ...val, hotspots: updatedHotspots };

  fields[idx] = field;
  await ref.update({ fields, updatedAt: new Date() });
  return {
    fieldIndex: idx,
    hotspotsUpdated: updatedHotspots.length,
    optionsCount:
      areaOrFlat.flat?.length ??
      Object.values(areaOrFlat.byArea || {}).reduce(
        (acc, arr) => acc + arr.length,
        0
      ),
  };
}

async function main() {
  try {
    const subformId = process.argv[2];
    const jsonPath = process.argv[3];
    if (!subformId || !jsonPath) {
      throw new Error(
        "Uso: node backend/scripts/update_peca_hotspot_options.js <SUBFORM_ID> <jsonPath>"
      );
    }
    const db = initAdmin();
    const names = readAreaNames(jsonPath);
    const res = await updateHotspotOptions(db, subformId, names);
    console.log(
      `Atualizado hotspot 'Peça': ${res.hotspotsUpdated} pontos atualizados. Total de nomes considerados: ${res.optionsCount}. (Índice do campo ${res.fieldIndex}).`
    );
  } catch (err) {
    console.error("Erro:", err.message);
    process.exitCode = 1;
  }
}

main();
