import { Link } from 'react-router-dom';
import PriorityBadge from './PriorityBadge';
import { formatDueDate } from '../utils/formatDate';
import { isOverdue, TASK_STATUSES } from '../utils/taskUtils';

export default function TaskCard({
  task,
  canManage,
  onMove,
  onEdit,
  onDelete,
  isDragging = false,
  isMoving = false,
  onDragStart,
  onDragEnd,
}) {
  const assigneeName = task.assigned_user?.name || 'Unassigned';
  const overdue = isOverdue(task.due_date, task.status);
  const moveOptions = TASK_STATUSES.filter((item) => item.value !== task.status);

  function handleMoveChange(event) {
    const nextStatus = event.target.value;
    event.target.value = '';
    if (nextStatus) onMove(task, nextStatus);
  }

  return (
    <article className={`task-card${isDragging ? ' task-card--dragging' : ''}${isMoving ? ' task-card--moving' : ''}`}>
      {canManage && (
        <button
          type="button"
          className="task-card__drag-handle"
          draggable={!isMoving}
          onDragStart={(event) => onDragStart(event, task)}
          onDragEnd={onDragEnd}
          aria-label={`Drag ${task.title} to another status`}
          title="Drag to move task"
        >
          <span aria-hidden="true">⋮⋮</span>
        </button>
      )}
      <Link to={`/tasks/${task.id}`} className="task-card__link">
        <h4 className="task-card__title">{task.title}</h4>
        {task.description && (
          <p className="task-card__description">{task.description}</p>
        )}
        <div className="task-card__footer">
          <PriorityBadge priority={task.priority} />
          <span className="task-card__assignee">{assigneeName}</span>
          {task.due_date && (
            <span
              className={`task-card__due${overdue ? ' task-card__due--overdue' : ''}`}
            >
              {overdue ? 'Overdue' : `Due ${formatDueDate(task.due_date)}`}
            </span>
          )}
        </div>
      </Link>

      {canManage && (
        <div className="task-card__actions">
          <label className="sr-only" htmlFor={`move-task-${task.id}`}>
            Move to
          </label>
          <select
            id={`move-task-${task.id}`}
            className="task-card__move"
            key={`${task.id}-${task.status}`}
            defaultValue=""
            onChange={handleMoveChange}
            disabled={isMoving}
          >
            <option value="" disabled>
              Move to...
            </option>
            {moveOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onEdit(task)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--danger-text"
            onClick={() => onDelete(task)}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
