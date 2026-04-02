import { ButlerItem, MemoryPreference } from '../../types';

export function resolveMemoryLinks(item: ButlerItem, memoryPreferences: MemoryPreference[]) {
  const lower = item.rawIntentText.toLowerCase();
  return memoryPreferences
    .filter((memory) => lower.includes(memory.key.replace(/_/g, ' ')) || memory.value.toLowerCase().includes(lower.slice(0, Math.min(lower.length, 18))))
    .map((memory) => memory.id);
}
