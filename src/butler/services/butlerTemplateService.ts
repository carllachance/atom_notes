import { ButlerItem } from '../../types';

export function getTemplateHint(item: ButlerItem) {
  if (item.category === 'reporting') return 'dashboard-prep-mvp';
  if (item.category === 'notes') return 'meeting-notes-mvp';
  if (item.category === 'email') return 'email-draft-mvp';
  return null;
}
