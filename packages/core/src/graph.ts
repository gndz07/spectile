/** Nodes that are part of a cycle, found with Tarjan's strongly connected components. */
export const findCyclic = (graph: ReadonlyMap<string, readonly string[]>) => {
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cyclic = new Set<string>();

  const visit = (node: string) => {
    const order = index.size;
    index.set(node, order);
    lowLink.set(node, order);
    stack.push(node);
    onStack.add(node);
    const edges = graph.get(node) ?? [];
    for (const next of edges) {
      if (!index.has(next)) visit(next);
      if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node) ?? order, lowLink.get(next) ?? order));
      }
    }
    if (lowLink.get(node) !== order) return;
    const component: string[] = [];
    for (let member = stack.pop(); member !== undefined; member = stack.pop()) {
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    if (component.length > 1 || edges.includes(node)) component.forEach((m) => cyclic.add(m));
  };

  graph.forEach((_, node) => {
    if (!index.has(node)) visit(node);
  });
  return cyclic;
};
