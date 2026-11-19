
import { useEffect, useState } from "react";
import { supabase, workspace } from "../../lib/Supabase/supabase";
import "./TaskDetails.css";
import Comments from "../Comments/Comments";

const STATUS_OPTIONS = [
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_review", label: "In Review" },
    { value: "done", label: "Done" }
];

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" }
];

function createDraft(task) {
    return {
        id: task?.id ?? null,
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? "todo",
        priority: task?.priority ?? "medium",
        due_date: task?.due_date ?? "",
        assignees: (task?.assignees ?? []).map((member) => ({
            ...member
        })),
        label_ids: [...(task?.label_ids ?? [])]
    };
}

export default function TaskDetails({
    onSaveChanges,
    onDeleteTask,
    onCancel
}) {
    const [task, setTask] = useState(() =>
        createDraft(workspace.currentTask)
    );

    const [showAssignees, setShowAssignees] = useState(false);
    const [showLabels, setShowLabels] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const [taskDeleted, setTaskDeleted] = useState(false);

    useEffect(() => {
        const channel = supabase
            .channel(`project-${workspace.currentProject["id"]}`)
            .on(
                "broadcast",
                {
                    event: "task_deleted"
                },
                ({ payload }) => {
                    if ((workspace.currentTask) && (workspace.currentTask["id"] === payload.task_id)) {
                        console.log("This task has been deleted!");
                        for (let i = 0; i < workspace.currentProject["tasks"].length; i++) {
                            if (workspace.currentProject["tasks"][i]["id"] === payload.task_id) {
                                workspace.currentProject["tasks"].splice(i, 1);
                                break;
                            }
                        }
                        setTaskDeleted(true);
                    }
                }
            )
            .subscribe((status) => {
                console.log("Task Details Realtime status:", status);
            });
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const availableMembers =
        workspace.currentTeam?.team_members ?? [];

    const availableLabels =
        workspace.currentTeam?.labels ?? [];

    function updateField(field, value) {
        setTask((previous) => ({
            ...previous,
            [field]: value
        }));
    }

    function toggleAssignee(member) {
        setTask((previous) => {
            const exists = previous.assignees.some(
                (assignee) => assignee.id === member.id
            );

            return {
                ...previous,
                assignees: exists
                    ? previous.assignees.filter(
                        (assignee) => assignee.id !== member.id
                    )
                    : [
                        ...previous.assignees,
                        {
                            id: member.id,
                            username: member.username
                        }
                    ]
            };
        });
    }

    function toggleLabel(labelId) {
        setTask((previous) => {
            const exists = previous.label_ids.includes(labelId);

            return {
                ...previous,
                label_ids: exists
                    ? previous.label_ids.filter(
                        (id) => id !== labelId
                    )
                    : [...previous.label_ids, labelId]
            };
        });
    }

    function getLabel(labelId) {
        return availableLabels.find(
            (label) => label.id === labelId
        );
    }

    function handleSave() {
        if (!task.title.trim()) {
            alert("Task title cannot be empty.");
            return;
        }

        if (!workspace.currentTask) return;

        Object.assign(workspace.currentTask, {
            title: task.title.trim(),
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date || null,
            assignees: task.assignees.map((member) => ({
                ...member
            })),
            label_ids: [...task.label_ids]
        });

        onSaveChanges(task);

        console.log("Updated task:", workspace.currentTask);
    }

    function handleDelete() {
        console.log("Delete requested for task:", task.id);
        setDeleteConfirmation(false);
        onDeleteTask(task.id);
    }

    if (!task.id) {
        return (
            <div className="task-details-empty">
                No task selected.
            </div>
        );
    }

    return (
        <div className="task-details">
            <section className="task-details-editor">
                <header className="task-details-heading">
                    <h2>Edit Task</h2>
                    <p>Manage task information and assignments</p>
                </header>

                <div className="task-details-form">
                    <div className="task-details-field">
                        <label htmlFor="task-details-title">
                            Title
                        </label>

                        <input
                            id="task-details-title"
                            type="text"
                            value={task.title}
                            onChange={(event) =>
                                updateField(
                                    "title",
                                    event.target.value
                                )
                            }
                            placeholder="Task title"
                        />
                    </div>

                    <div className="task-details-form-grid">
                        <div className="task-details-column">
                            <div className="task-details-field">
                                <label htmlFor="task-details-description">
                                    Description
                                </label>

                                <textarea
                                    id="task-details-description"
                                    value={task.description}
                                    onChange={(event) =>
                                        updateField(
                                            "description",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Describe this task..."
                                    rows={6}
                                />
                            </div>

                            <div className="task-details-field">
                                <label htmlFor="task-details-status">
                                    Status
                                </label>

                                <select
                                    id="task-details-status"
                                    value={task.status}
                                    onChange={(event) =>
                                        updateField(
                                            "status",
                                            event.target.value
                                        )
                                    }
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="task-details-field">
                                <label htmlFor="task-details-priority">
                                    Priority
                                </label>

                                <select
                                    id="task-details-priority"
                                    value={task.priority}
                                    onChange={(event) =>
                                        updateField(
                                            "priority",
                                            event.target.value
                                        )
                                    }
                                >
                                    {PRIORITY_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="task-details-field">
                                <label htmlFor="task-details-date">
                                    Due Date
                                </label>

                                <input
                                    id="task-details-date"
                                    type="date"
                                    value={task.due_date ?? ""}
                                    onChange={(event) =>
                                        updateField(
                                            "due_date",
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="task-details-column">
                            <div className="task-details-field">
                                <label>Assign To</label>

                                <div className="task-details-chips">
                                    {task.assignees.map((assignee) => (
                                        <span
                                            className="task-details-chip"
                                            key={assignee.id}
                                        >
                                            <span>
                                                {assignee.username}
                                            </span>

                                            <button
                                                type="button"
                                                aria-label={`Remove ${assignee.username}`}
                                                onClick={() =>
                                                    toggleAssignee(assignee)
                                                }
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                <div className="task-details-menu-container">
                                    <button
                                        type="button"
                                        className="task-details-add-button"
                                        onClick={() => {
                                            setShowAssignees((value) => !value);
                                            setShowLabels(false);
                                        }}
                                    >
                                        + Add
                                    </button>

                                    {showAssignees && (
                                        <div className="task-details-dropdown">
                                            {availableMembers.length === 0 ? (
                                                <p className="task-details-dropdown-empty">
                                                    No members available
                                                </p>
                                            ) : (
                                                availableMembers.map((member) => {
                                                    const selected =
                                                        task.assignees.some(
                                                            (assignee) =>
                                                                assignee.id === member.id
                                                        );

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={member.id}
                                                            onClick={() =>
                                                                toggleAssignee(member)
                                                            }
                                                        >
                                                            <span>
                                                                {member.username}
                                                            </span>

                                                            {selected && (
                                                                <span className="task-details-check">
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="task-details-field">
                                <label>Labels</label>

                                <div className="task-details-chips">
                                    {task.label_ids.map((labelId) => {
                                        const label = getLabel(labelId);

                                        return (
                                            <span
                                                className="task-details-chip task-details-label-chip"
                                                key={labelId}
                                            >
                                                <span>
                                                    {label?.name ?? "Unknown Label"}
                                                </span>

                                                <button
                                                    type="button"
                                                    aria-label="Remove label"
                                                    onClick={() =>
                                                        toggleLabel(labelId)
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>

                                <div className="task-details-menu-container">
                                    <button
                                        type="button"
                                        className="task-details-add-button"
                                        onClick={() => {
                                            setShowLabels((value) => !value);
                                            setShowAssignees(false);
                                        }}
                                    >
                                        + Add
                                    </button>

                                    {showLabels && (
                                        <div className="task-details-dropdown">
                                            {availableLabels.length === 0 ? (
                                                <p className="task-details-dropdown-empty">
                                                    No labels available
                                                </p>
                                            ) : (
                                                availableLabels.map((label) => {
                                                    const selected =
                                                        task.label_ids.includes(
                                                            label.id
                                                        );

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={label.id}
                                                            onClick={() =>
                                                                toggleLabel(label.id)
                                                            }
                                                        >
                                                            <span>
                                                                {label.name}
                                                            </span>

                                                            {selected && (
                                                                <span className="task-details-check">
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="task-details-actions">
                    <button
                        type="button"
                        className="task-details-delete"
                        onClick={() => setDeleteConfirmation(true)}
                    >
                        Delete Task
                    </button>

                    <div className="task-details-action-group">
                        <button
                            type="button"
                            className="task-details-cancel"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="task-details-save"
                            onClick={handleSave}
                        >
                            Save Changes
                        </button>
                    </div>
                </footer>
            </section>

            <section className="task-details-activity">
                <Comments />
            </section>

            {deleteConfirmation && (
                <div className="task-details-confirm-overlay">
                    <div
                        className="task-details-confirm-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-delete-heading"
                    >
                        <h3 id="task-delete-heading">
                            Delete Task?
                        </h3>

                        <p>
                            Are you sure you want to delete this task?
                            This action cannot be undone once connected
                            to the database.
                        </p>

                        <div className="task-details-confirm-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    setDeleteConfirmation(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="danger"
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {taskDeleted && (
                <div className="task-details-confirm-overlay">
                    <div
                        className="task-details-confirm-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-delete-heading"
                    >
                        <h3 id="task-delete-heading">
                            Task Deleted
                        </h3>

                        <p>
                            This task has been deleted and is no longer available.
                        </p>

                        <div className="task-details-confirm-actions">
                            <button
                                type="button"
                                className="danger"
                                onClick={onCancel}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
