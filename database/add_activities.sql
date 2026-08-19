CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER,
    task_id INTEGER,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activities_project FOREIGN KEY (project_id)
        REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_activities_task FOREIGN KEY (task_id)
        REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_project_id
ON activities(project_id);

CREATE INDEX IF NOT EXISTS idx_activities_created_at
ON activities(created_at DESC);
