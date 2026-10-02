import type { EstablishmentSearchHit } from "@/lib/types";

const MEN_URL =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records";
const ESR_URL =
  "https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records";

function escapeOds(value: string): string {
  return value.replace(/["'\\]/g, " ").trim();
}

function mapSchoolType(raw: string | null | undefined): string {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("coll")) return "Collège";
  if (value.includes("lyc")) return "Lycée";
  if (value.includes("univ") || value.includes("supérieur") || value.includes("superieur")) {
    return "Université";
  }
  return raw || "Établissement";
}

async function fetchJson(url: string): Promise<{ results?: Record<string, unknown>[] }> {
  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new Error(`Open Data HTTP ${response.status}`);
  }
  return response.json();
}

export async function searchEstablishments(
  query: string,
  city?: string
): Promise<EstablishmentSearchHit[]> {
  const q = escapeOds(query);
  const c = city ? escapeOds(city) : "";
  const hits: EstablishmentSearchHit[] = [];

  const schoolWhere = [
    "etat = 'OUVERT'",
    "type_etablissement in ('Collège','Lycée')",
  ];
  if (c) schoolWhere.push(`search(nom_commune, "${c}")`);
  if (q) schoolWhere.push(`search(nom_etablissement, "${q}")`);

  const schoolUrl = `${MEN_URL}?limit=12&where=${encodeURIComponent(schoolWhere.join(" AND "))}`;

  const esrClauses: string[] = [];
  if (c) esrClauses.push(`search(com_nom, "${c}")`);
  if (q) esrClauses.push(`search(uo_lib, "${q}")`);
  const esrUrl = `${ESR_URL}?limit=8${
    esrClauses.length ? `&where=${encodeURIComponent(esrClauses.join(" AND "))}` : ""
  }`;

  const [schools, universities] = await Promise.allSettled([
    fetchJson(schoolUrl),
    fetchJson(esrUrl),
  ]);

  if (schools.status === "fulfilled") {
    for (const row of schools.value.results ?? []) {
      hits.push({
        code_uai: String(row.identifiant_de_l_etablissement ?? ""),
        name: String(row.nom_etablissement ?? ""),
        city: String(row.nom_commune ?? ""),
        type: mapSchoolType(String(row.type_etablissement ?? "")),
      });
    }
  }

  if (universities.status === "fulfilled") {
    for (const row of universities.value.results ?? []) {
      const uai = String(row.uai ?? row.identifiant ?? "");
      if (!uai) continue;
      hits.push({
        code_uai: uai,
        name: String(row.uo_lib ?? row.nom ?? ""),
        city: String(row.com_nom ?? row.commune ?? ""),
        type: "Université",
      });
    }
  }

  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (!hit.code_uai || !hit.name) return false;
    if (seen.has(hit.code_uai)) return false;
    seen.add(hit.code_uai);
    return true;
  });
}
