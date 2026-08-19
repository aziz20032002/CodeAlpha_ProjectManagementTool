CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    task_id INTEGER,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at DESC);
