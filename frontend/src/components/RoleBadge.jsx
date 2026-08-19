export default function RoleBadge({ role }) {
  if (!role) return null;

  const label = role === 'owner' ? 'Owner' : 'Member';
  const className = `role-badge role-badge--${role === 'owner' ? 'owner' : 'member'}`;

  return <span className={className}>{label}</span>;
}
