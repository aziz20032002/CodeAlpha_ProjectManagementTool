import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';
import { KANBAN_COLUMNS } from '../utils/taskUtils';

function TaskCardSkeleton() {
  return (
    <div className="task-card task-card--skeleton">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton skeleton--text skeleton--short" />
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  loading,
  error,
  onRetry,
  canManageTask,
  canCreateTask,
  onAddTask,
  onMove,
  onEdit,
  onDelete,
  members = [],
  movingTaskIds = new Set(),
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState('');

  const filtersActive =
    Boolean(searchQuery.trim()) || priorityFilter !== 'all' || assigneeFilter !== 'all';
  const visibleTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedQuery || task.title?.toLowerCase().includes(normalizedQuery);
      const matchesPriority =
        priorityFilter === 'all' || task.priority === priorityFilter;
      const taskAssignee = task.assigned_to ?? task.assigned_user?.id ?? null;
      const matchesAssignee =
        assigneeFilter === 'all' ||
        (assigneeFilter === 'unassigned'
          ? taskAssignee === null
          : Number(taskAssignee) === Number(assigneeFilter));
      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter]);

  function clearFilters() {
    setSearchQuery('');
    setPriorityFilter('all');
    setAssigneeFilter('all');
  }

  function handleDragStart(event, task) {
    if (!canManageTask(task) || movingTaskIds.has(Number(task.id))) {
      event.preventDefault();
      return;
    }
    setDraggingTaskId(Number(task.id));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
  }

  function handleDrop(event, status) {
    event.preventDefault();
    const task = tasks.find((item) => Number(item.id) === Number(draggingTaskId));
    setDragOverStatus('');
    setDraggingTaskId(null);
    if (!task || !canManageTask(task) || task.status === status) return;
    onMove(task, status);
  }

  return (
    <section className="kanban-section">
      <div className="kanban-section__header">
        <div>
          <h2 className="kanban-section__title">Project Board</h2>
          <p className="kanban-section__subtitle">
            Manage tasks across different stages.
          </p>
        </div>
      </div>

      <div className="filter-toolbar task-filter-toolbar" aria-label="Task filters">
        <label className="filter-toolbar__search">
          <span className="sr-only">Search tasks</span>
          <input
            type="search"
            className="form-input"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <label className="filter-toolbar__field">
          <span>Priority</span>
          <select
            className="form-select"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="filter-toolbar__field filter-toolbar__field--assignee">
          <span>Assignee</span>
          <select
            className="form-select"
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>
        {filtersActive && (
          <button type="button" className="btn btn--ghost btn--sm filter-toolbar__clear" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="kanban-error">
          <p>{error}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
            Try Again
          </button>
        </div>
      )}

      <div className="kanban-board">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.status);

          return (
            <div
              key={column.status}
              className={`kanban-column${dragOverStatus === column.status ? ' kanban-column--drag-over' : ''}`}
              onDragOver={(event) => {
                if (draggingTaskId !== null) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDragOverStatus(column.status);
                }
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStatus('');
              }}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <div className="kanban-column__header">
                <h3 className="kanban-column__title">{column.title}</h3>
                <span className="kanban-column__count">
                  {loading ? '—' : columnTasks.length}
                </span>
              </div>

              <div className="kanban-column__tasks">
                {loading && (
                  <>
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                  </>
                )}

                {!loading && !error && columnTasks.length === 0 && (
                  <div className="kanban-column__empty">
                    <p>{filtersActive ? 'No tasks match filters.' : 'No tasks here.'}</p>
                    {!filtersActive && canCreateTask && column.status === 'todo' && (
                      <p className="kanban-column__empty-hint">
                        Create a task to get started.
                      </p>
                    )}
                  </div>
                )}

                {!loading &&
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canManage={canManageTask(task)}
                      onMove={onMove}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      isDragging={Number(task.id) === draggingTaskId}
                      isMoving={movingTaskIds.has(Number(task.id))}
                      onDragStart={handleDragStart}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setDragOverStatus('');
                      }}
                    />
                  ))}
              </div>

              {canCreateTask && (
                <button
                  type="button"
                  className="kanban-column__add-btn"
                  onClick={() => onAddTask(column.status)}
                >
                  + Add Task
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
