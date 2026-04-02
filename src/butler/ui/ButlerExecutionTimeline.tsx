import { ExecutionLog } from '../../types';

type ButlerExecutionTimelineProps = {
  logs: ExecutionLog[];
};

export function ButlerExecutionTimeline({ logs }: ButlerExecutionTimelineProps) {
  return (
    <section className="butler-detail__section">
      <div className="butler-detail__section-head">
        <strong>Execution timeline</strong>
        <span>{logs.length}</span>
      </div>
      {logs.length ? logs.map((log) => (
        <div key={log.id} className="butler-log">
          <div className="butler-log__head">
            <strong>{log.action}</strong>
            <span>{log.result}</span>
          </div>
          <p>{log.notes || log.action}</p>
          <small>{log.actorType}</small>
        </div>
      )) : <p className="butler-detail__placeholder">No execution trail yet.</p>}
    </section>
  );
}
