// Estado global observável. Cada mudança dispara 'change' com as chaves alteradas.
import { createEmitter } from './events.js';

export function createStore(initial) {
  const bus = createEmitter();
  let state = { ...initial };
  return {
    get: () => state,
    set(patch) {
      const keys = Object.keys(patch).filter((k) => state[k] !== patch[k]);
      if (!keys.length) return;
      state = { ...state, ...patch };
      bus.emit('change', { state, keys });
    },
    subscribe: (fn) => bus.on('change', fn),
  };
}
