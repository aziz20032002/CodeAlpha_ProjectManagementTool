export const TASK_STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const KANBAN_COLUMNS = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

export function getStatusLabel(status) {
  return TASK_STATUSES.find((item) => item.value === status)?.label || status;
}

export function getPriorityLabel(priority) {
  return TASK_PRIORITIES.find((item) => item.value === priority)?.label || priority;
}

export function toDateInputValue(dateString) {
  if (!dateString) return '';
  return String(dateString).slice(0, 10);
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;

  const dateOnly = toDateInputValue(dueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false;

  const [year, month, day] = dateOnly.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
}

export function enrichTask(task, members = [], currentUser = null) {
  const assignedId = task.assigned_to ?? task.assigned_user?.id ?? null;
  const member = members.find((item) => Number(item.id) === Number(assignedId));

  return {
    ...task,
    assigned_to: assignedId,
    assigned_user:
      task.assigned_user ||
      (member
        ? { id: member.id, name: member.name, email: member.email }
        : null),
    creator:
      task.creator ||
      (currentUser
        ? { id: currentUser.id, name: currentUser.name }
        : null),
  };
}
