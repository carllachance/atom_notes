import { NoteCardModel } from '../../../types';
import { ButlerTool } from '../butlerToolRegistry';

export type FindLatestDashboardInput = {
  notes: NoteCardModel[];
  query?: string;
};

export type FindLatestDashboardOutput = {
  note: NoteCardModel | null;
  searchedCount: number;
};

export const findLatestDashboardTool: ButlerTool<FindLatestDashboardInput, FindLatestDashboardOutput> = {
  id: 'find_latest_dashboard',
  label: 'Find Latest Dashboard',
  run(input) {
    const ranked = [...input.notes]
      .filter((note) => !note.archived && !note.deleted)
      .filter((note) => /dashboard|report|summary/i.test(`${note.title ?? ''} ${note.body}`))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      note: ranked[0] ?? null,
      searchedCount: ranked.length
    };
  }
};
