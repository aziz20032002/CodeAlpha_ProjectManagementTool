import { getPriorityLabel } from '../utils/taskUtils';

export default function PriorityBadge({ priority }) {
  if (!priority) return null;

  return (
    <span className={`task-card__priority task-card__priority--${priority}`}>
      {getPriorityLabel(priority)}
    </span>
  );
}
