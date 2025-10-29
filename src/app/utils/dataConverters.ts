export interface FieldInference {
  numeric: string[];
  date: string[];
  categorical: string[];
  keys: string[];
}

export interface ConvertHint {
  numericKey?: string;
  idKey?: string;
}

export function inferFieldsFromValues(values: Record<string, any>[]): FieldInference {
  const numericKeys = new Set<string>();
  const dateKeys = new Set<string>();
  const stringKeys = new Set<string>();

  values.forEach((row) => {
    Object.entries(row).forEach(([k, v]) => {
      if (v == null) return;
      if (typeof v === "number") numericKeys.add(k);
      else if (v instanceof Date) dateKeys.add(k);
      else if (typeof v === "string") {
        const t = Date.parse(v);
        if (!Number.isNaN(t) && v.length >= 8 && /\d{4}/.test(v)) dateKeys.add(k);
        else stringKeys.add(k);
      } else if (typeof v === "boolean") stringKeys.add(k);
    });
  });

  return {
    numeric: Array.from(numericKeys),
    date: Array.from(dateKeys),
    categorical: Array.from(stringKeys),
    keys: values.length ? Object.keys(values[0]) : [],
  };
}

/**
 * Check if data is a 2D numeric array
 */
export function is2DNumericArray(values: any): values is number[][] {
  if (!Array.isArray(values)) return false;
  return values.every((r) => Array.isArray(r) && r.every((c: any) => typeof c === "number"));
}

/**
 * Convert table rows to nodes for graph visualizations
 */
export function toNodesFromValues(values: Record<string, any>[], idKeyHint?: string) {
  const idKeys = [idKeyHint, "id", "name", "key", "node", "label"].filter(Boolean) as string[];
  const chosenIdKey = idKeys.find((k) => values.some((v) => v[k] !== undefined));
  return values.map((row, i) => {
    const id = chosenIdKey ? row[chosenIdKey] : row.id ?? row.name ?? `n${i}`;
    return { ...row, id };
  });
}

/**
 * Extract numeric array from values with various formats
 */
export function extractNumericArrayFromValues(values: any[], preferKey?: string): number[] {
  if (!Array.isArray(values)) return [];
  const isNumberArray = values.every((v) => typeof v === "number");
  if (isNumberArray) return values as number[];

  // if array of objects and preferKey exists
  if (preferKey && values.some((v) => v && typeof v[preferKey] === "number")) {
    return values.map((v) => +v[preferKey]).filter((n) => !Number.isNaN(n));
  }

  // common numeric field names
  const candidates = ["value", "val", "rate", "count", "freq", "score", "degree"];
  const fields = new Set<string>();
  values.forEach((r) => {
    if (r && typeof r === "object") Object.keys(r).forEach((k) => fields.add(k));
  });

  // pick first candidate present
  const chosen = candidates.find((c) => fields.has(c)) ?? Array.from(fields).find((k) => values.some((v) => typeof v[k] === "number"));
  if (!chosen) {
    // fallback: try flattening x,y -> use x or y or compute distance from origin
    if (values.every((v) => v && typeof v.x === "number")) return values.map((v) => +v.x);
    if (values.every((v) => v && typeof v.y === "number")) return values.map((v) => +v.y);
    // as last resort, map to index 0..n-1
    return values.map((_, i) => i);
  }
  return values.map((v) => +v[chosen]).filter((n) => !Number.isNaN(n));
}

/**
 * Extract x,y coordinates from nodes or table rows
 */
export function extractXYFromNodesOrValues(raw: any[]): { x: number; y: number }[] {
  if (!Array.isArray(raw)) return [];
  const hasXY = raw.every((r) => r && (typeof r.x === "number" || !Number.isNaN(Number(r.x))) && (typeof r.y === "number" || !Number.isNaN(Number(r.y))));
  if (hasXY) return raw.map((r) => ({ x: +r.x, y: +r.y }));
  // Maybe coordinates are in [lng, lat] array form
  if (raw.every((r) => Array.isArray(r.position) && r.position.length >= 2 && typeof r.position[0] === "number" && typeof r.position[1] === "number")) {
    return raw.map((r) => ({ x: +r.position[0], y: +r.position[1] }));
  }
  return [];
}

/**
 * Calculate degree array for nodes in a graph
 */
export function nodesDegreeArray(nodes: any[], links: any[]): number[] {
  const deg = new Map<any, number>();
  (nodes || []).forEach((n) => deg.set(n.id ?? n.name ?? n, 0));
  (links || []).forEach((l) => {
    const s = l.source;
    const t = l.target;
    deg.set(s, (deg.get(s) ?? 0) + 1);
    deg.set(t, (deg.get(t) ?? 0) + 1);
  });
  return (nodes || []).map((n) => deg.get(n.id ?? n.name ?? n) ?? 0);
}

/**
 * Normalize data format for charts
 */
export function normalizeChartData(data: any): {
  values?: any[];
  nodes?: any[];
  links?: any[];
} {
  if (!data) return {};

  // If already in expected format
  if (data.values || data.nodes) {
    return {
      values: data.values,
      nodes: data.nodes,
      links: data.links,
    };
  }

  // If it's an array, treat as values
  if (Array.isArray(data)) {
    return { values: data };
  }

  // If it's an object with array properties
  const result: any = {};
  for (const key in data) {
    if (Array.isArray(data[key])) {
      if (key.toLowerCase().includes("node")) {
        result.nodes = data[key];
      } else if (key.toLowerCase().includes("link") || key.toLowerCase().includes("edge")) {
        result.links = data[key];
      } else if (!result.values) {
        result.values = data[key];
      }
    }
  }

  return result;
}
