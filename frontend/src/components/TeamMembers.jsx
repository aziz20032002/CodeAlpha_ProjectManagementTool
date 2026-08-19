import { useCallback, useEffect, useState } from 'react';
import AddMemberModal from './AddMemberModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import RoleBadge from './RoleBadge';
import {
  addProjectMember,
  getProjectMembers,
  removeProjectMember,
} from '../services/memberService';
import { formatDate } from '../utils/formatDate';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { getInitials } from '../utils/getInitials';

function sortMembers(members) {
  return [...members].sort((a, b) => {
    if (a.role === 'owner' && b.role !== 'owner') return -1;
    if (a.role !== 'owner' && b.role === 'owner') return 1;
    return 0;
  });
}

export default function TeamMembers({
  projectId,
  isOwner,
  onSuccess,
  onMembersChange,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getProjectMembers(projectId);
      const sorted = sortMembers(data);
      setMembers(sorted);
      onMembersChange?.(sorted);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load team members.'));
      onMembersChange?.([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, onMembersChange]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleAddMember(email) {
    const data = await addProjectMember(projectId, email);

    if (data?.member) {
      setMembers((prev) => {
        const exists = prev.some((item) => item.id === data.member.id);
        const next = exists ? prev : sortMembers([...prev, data.member]);
        onMembersChange?.(next);
        return next;
      });
    } else {
      await loadMembers();
    }

    setAddOpen(false);
    onSuccess?.('Member added successfully.');
  }

  async function handleRemoveMember() {
    if (!memberToRemove || memberToRemove.role === 'owner') return;

    await removeProjectMember(projectId, memberToRemove.id);
    setMembers((prev) => {
      const next = prev.filter((item) => item.id !== memberToRemove.id);
      onMembersChange?.(next);
      return next;
    });
    setMemberToRemove(null);
    onSuccess?.('Member removed successfully.');
  }

  return (
    <section className="card team-card">
      <div className="card__header">
        <div className="team-card__heading">
          <h3 className="card__title">Team Members</h3>
          {!loading && !error && (
            <span className="team-card__count">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>
        {isOwner && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setAddOpen(true)}
          >
            Add Member
          </button>
        )}
      </div>

      <div className="card__body">
        {loading && (
          <div className="member-list">
            <div className="member-item member-item--skeleton">
              <div className="skeleton skeleton--avatar" />
              <div className="member-item__content">
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--text skeleton--short" />
              </div>
            </div>
            <div className="member-item member-item--skeleton">
              <div className="skeleton skeleton--avatar" />
              <div className="member-item__content">
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--text skeleton--short" />
              </div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="team-card__error">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={loadMembers}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <p className="team-card__empty">No team members found.</p>
        )}

        {!loading && !error && members.length > 0 && (
          <ul className="member-list">
            {members.map((member) => {
              const canRemove = isOwner && member.role !== 'owner';

              return (
                <li key={member.id} className="member-item">
                  <div className="member-item__avatar" aria-hidden="true">
                    {getInitials(member.name)}
                  </div>
                  <div className="member-item__content">
                    <div className="member-item__header">
                      <span className="member-item__name">{member.name}</span>
                      <RoleBadge role={member.role} />
                    </div>
                    <span className="member-item__email">{member.email}</span>
                    {member.joined_at && (
                      <span className="member-item__joined">
                        Joined {formatDate(member.joined_at)}
                      </span>
                    )}
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--danger-text member-item__remove"
                      onClick={() => setMemberToRemove(member)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddMemberModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddMember}
      />

      <DeleteConfirmModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove this member?"
        description="This user will lose access to this project."
        confirmLabel="Remove Member"
        submittingLabel="Removing..."
        fallbackError="Unable to remove member."
      >
        {memberToRemove && (
          <p className="modal__member-preview">
            <strong>{memberToRemove.name}</strong>
            <span>{memberToRemove.email}</span>
          </p>
        )}
      </DeleteConfirmModal>
    </section>
  );
}
