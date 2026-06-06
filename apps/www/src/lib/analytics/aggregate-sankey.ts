export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface RawTransition {
  source: string;
  target: string;
  value: number;
}

const TOP_N = 20;
const OTHER_NAME = "Other";

export function aggregateSankey(transitions: RawTransition[]): SankeyData {
  if (transitions.length === 0) {
    return { nodes: [], links: [] };
  }

  const outgoing = new Map<string, number>();
  for (const t of transitions) {
    outgoing.set(t.source, (outgoing.get(t.source) ?? 0) + t.value);
  }

  const sorted = [...outgoing.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const topSet = new Set(sorted.slice(0, TOP_N));
  const hasOther = sorted.length > TOP_N;

  const nodeIdx = new Map<string, number>();
  let idx = 0;
  for (const name of sorted) {
    if (topSet.has(name)) {
      nodeIdx.set(name, idx++);
    }
  }
  if (hasOther) {
    nodeIdx.set(OTHER_NAME, idx++);
  }

  const merged = new Map<string, number>();
  for (const t of transitions) {
    const src = topSet.has(t.source) ? t.source : OTHER_NAME;
    const tgt = topSet.has(t.target) ? t.target : OTHER_NAME;
    const key = `${src}\0${tgt}`;
    merged.set(key, (merged.get(key) ?? 0) + t.value);
  }

  const nodes: SankeyNode[] = [...nodeIdx.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => ({ name }));

  const links: SankeyLink[] = [...merged.entries()]
    .map(([key, value]) => {
      const sep = key.indexOf("\0");
      const src = key.slice(0, sep);
      const tgt = key.slice(sep + 1);
      return {
        source: nodeIdx.get(src)!,
        target: nodeIdx.get(tgt)!,
        value,
      };
    })
    .filter((l) => l.source !== l.target);

  return { nodes, links };
}
