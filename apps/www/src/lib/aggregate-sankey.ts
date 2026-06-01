interface Transition {
  source: string;
  target: string;
  value: number;
}

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function aggregateSankey(
  transitions: Transition[],
  maxNodes = 20,
): SankeyData {
  if (transitions.length === 0) {
    return { nodes: [], links: [] };
  }

  const degree = new Map<string, number>();
  for (const t of transitions) {
    degree.set(t.source, (degree.get(t.source) ?? 0) + t.value);
    degree.set(t.target, (degree.get(t.target) ?? 0) + t.value);
  }

  const sorted = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  if (sorted.length <= maxNodes) {
    const nodes = sorted.map((name) => ({ name }));
    const nameToIdx = new Map(nodes.map((n, i) => [n.name, i]));
    const links = transitions.map((t) => ({
      source: nameToIdx.get(t.source)!,
      target: nameToIdx.get(t.target)!,
      value: t.value,
    }));
    return { nodes, links };
  }

  const top = new Set(sorted.slice(0, maxNodes));
  const nodes = [...top].map((name) => ({ name }));
  nodes.push({ name: "Other" });
  const otherIdx = nodes.length - 1;

  const nameToIdx = new Map<string, number>();
  for (const name of top) {
    nameToIdx.set(name, nameToIdx.size);
  }
  nameToIdx.set("Other", otherIdx);

  const linkMap = new Map<string, number>();
  for (const t of transitions) {
    const s = top.has(t.source) ? t.source : "Other";
    const tgt = top.has(t.target) ? t.target : "Other";
    const key = `${nameToIdx.get(s)}:${nameToIdx.get(tgt)}`;
    linkMap.set(key, (linkMap.get(key) ?? 0) + t.value);
  }

  const links: SankeyLink[] = [];
  for (const [key, value] of linkMap) {
    const parts = key.split(":");
    links.push({
      source: Number(parts[0]),
      target: Number(parts[1]),
      value,
    });
  }

  return { nodes, links };
}
