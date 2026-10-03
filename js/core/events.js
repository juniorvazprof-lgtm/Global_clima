// Barramento de eventos mínimo: desacopla dados, globo e interface.

export function createEmitter() {
  const handlers = new Map();
  return {
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(fn);
      return () => handlers.get(type).delete(fn);
    },
    emit(type, payload) {
      handlers.get(type)?.forEach((fn) => fn(payload));
    },
  };
}
