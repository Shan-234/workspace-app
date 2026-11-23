
import { useEffect, useRef, useState } from "react";
import {
    Trash2,
    X,
    Plus,
    CalendarDays,
    Check,
    ClipboardList,
    ChevronUp,
    ChevronDown,
    ListTodo,
    CircleCheck,
    Clock3,
    AlertTriangle
} from "lucide-react";
import Deck from "../Deck/Deck";
import {
    supabase,
    createTask,
    updateTaskStatus,
    workspace
} from "../../lib/Supabase/supabase";
import "./Board.css";

const statuses = ["todo", "in_progress", "in_review", "done"];

const statusLabels = {
    todo: "To Do",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done"
};

const priorities = ["low", "medium", "high", "urgent"];

function FindResultDeck(mouseX, mouseY) {
    for (let i = 0; i < statuses.length; i++) {
        const deck = document.getElementById(statuses[i]);

        if (!deck) continue;

        const rect = deck.getBoundingClientRect();

        if (
            mouseX >= rect.left &&
            mouseX <= rect.right &&
            mouseY >= rect.top &&
            mouseY <= rect.bottom
        ) {
            return statuses[i];
        }
    }

    return null;
}

export default function Board({
    project_name = "Untitled Project",
    onAddTask,
    onTaskSettings
}) {
    const [num, setNum] = useState(0);
    const [progressOpen, setProgressOpen] = useState(false);
    const [createTaskOpen, setCreateTaskOpen] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("todo");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState("");
    const [assignees, setAssignees] = useState([]);
    const [memberToAdd, setMemberToAdd] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const dialogRef = useRef(null);
    const selectedCard = useRef(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const availableMembers = workspace.currentTeam?.team_members ?? [];

    const progress = (workspace.currentProject?.tasks ?? []).reduce(
        (counts, task) => {
            counts.tasks_total++;

            if (task.status === "done") {
                counts.tasks_completed++;
            } else if (task.due_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const due = new Date(
                    `${task.due_date.slice(0, 10)}T00:00:00`
                );

                const days = Math.round(
                    (due - today) / 86400000
                );

                if (days < 0) {
                    counts.tasks_overdue++;
                } else if (days <= 2) {
                    counts.tasks_due_soon++;
                }
            }

            return counts;
        },
        {
            tasks_total: 0,
            tasks_completed: 0,
            tasks_due_soon: 0,
            tasks_overdue: 0
        }
    );

    useEffect(() => {
        const channel = supabase
            .channel(`project-${workspace.currentProject["id"]}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "tasks",
                    filter: `project_id=eq.${workspace.currentProject["id"]}`
                },
                (payload) => {
                    console.log("Task Updated:", payload);

                    const task_id = payload.old.id;

                    for (
                        let i = 0;
                        i < workspace.currentProject["tasks"].length;
                        i++
                    ) {
                        const task = workspace.currentProject["tasks"][i];

                        if (task["id"] === task_id) {
                            if (task["status"] !== payload.new.status) {
                                moveTask(task_id, payload.new.status);
                            }

                            if (task["title"] !== payload.new.title) {
                                changeTaskTitle(task_id, payload.new.title);
                            }

                            if (
                                task["description"] !==
                                payload.new.description
                            ) {
                                changeTaskDescription(
                                    task_id,
                                    payload.new.description
                                );
                            }

                            if (
                                task["due_date"] !==
                                payload.new.due_date
                            ) {
                                changeTaskDueDate(
                                    task_id,
                                    payload.new.due_date
                                );
                            }

                            if (
                                task["priority"] !==
                                payload.new.priority
                            ) {
                                changeTaskPriority(
                                    task_id,
                                    payload.new.priority
                                );
                            }

                            setNum(prev => (prev + 1) % 10);
                            break;
                        }
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "tasks",
                    filter: `project_id=eq.${workspace.currentProject["id"]}`
                },
                (payload) => {
                    console.log("Task Added:", payload);

                    workspace.currentProject["tasks"].push({
                        id: payload.new.id,
                        title: payload.new.title,
                        description: payload.new.description,
                        status: payload.new.status,
                        priority: payload.new.priority,
                        due_date: payload.new.due_date
                    });

                    setNum(prev => (prev + 1) % 10);
                }
            )
            .on(
                "broadcast",
                {
                    event: "task_deleted"
                },
                ({ payload }) => {
                    console.log("Task deleted:", payload.task_id);

                    for (
                        let i = 0;
                        i < workspace.currentProject["tasks"].length;
                        i++
                    ) {
                        if (
                            workspace.currentProject["tasks"][i]["id"] ===
                            payload.task_id
                        ) {
                            workspace.currentProject["tasks"].splice(i, 1);
                            break;
                        }
                    }

                    setNum(prev => (prev + 1) % 10);
                }
            )
            .subscribe((status) => {
                console.log("Board Realtime status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const resetTaskForm = () => {
        setTitle("");
        setDescription("");
        setStatus("todo");
        setPriority("medium");
        setDueDate("");
        setAssignees([]);
        setMemberToAdd("");
    };

    const handleOpenCreateTask = (deckStatus = "todo") => {
        resetTaskForm();

        setStatus(
            statuses.includes(deckStatus) ? deckStatus : "todo"
        );

        setCreateTaskOpen(true);
    };

    const handleCloseCreateTask = () => {
        if (submitting) return;

        setCreateTaskOpen(false);
        resetTaskForm();
    };

    useEffect(() => {
        if (createTaskOpen && dialogRef.current) {
            if (!dialogRef.current.open) {
                dialogRef.current.showModal();
            }
        }
    }, [createTaskOpen]);

    const handleAddAssignee = () => {
        if (!memberToAdd) return;

        const member = availableMembers.find(
            item => String(item.id) === memberToAdd
        );

        if (!member) return;

        setAssignees(previous => {
            if (previous.some(item => item.id === member.id)) {
                return previous;
            }

            return [...previous, member];
        });

        setMemberToAdd("");
    };

    const handleRemoveAssignee = memberId => {
        setAssignees(previous =>
            previous.filter(member => member.id !== memberId)
        );
    };

    const handleCreateTask = async event => {
        event.preventDefault();

        if (!title.trim() || submitting) return;

        const new_task = {
            title: title.trim(),
            description: description.trim(),
            status: status,
            priority: priority,
            due_date: dueDate || null,
            assignees: assignees.map(member => member.id)
        };

        setSubmitting(true);

        createTask(new_task).then(success => {
            if (success) {
                setCreateTaskOpen(false);
                resetTaskForm();
                setSubmitting(false);
            } else {
                console.error("Error adding task!");
            }
        });
    };

    const moveTask = (task_id, new_status) => {
        for (
            let i = 0;
            i < workspace.currentProject["tasks"].length;
            i++
        ) {
            if (
                workspace.currentProject["tasks"][i]["id"] === task_id
            ) {
                workspace.currentProject["tasks"][i]["status"] = new_status;
                break;
            }
        }
    };

    const changeTaskTitle = (task_id, new_title) => {
        for (
            let i = 0;
            i < workspace.currentProject["tasks"].length;
            i++
        ) {
            if (
                workspace.currentProject["tasks"][i]["id"] === task_id
            ) {
                workspace.currentProject["tasks"][i]["title"] = new_title;
                break;
            }
        }
    };

    const changeTaskDescription = (task_id, new_description) => {
        for (
            let i = 0;
            i < workspace.currentProject["tasks"].length;
            i++
        ) {
            if (
                workspace.currentProject["tasks"][i]["id"] === task_id
            ) {
                workspace.currentProject["tasks"][i]["description"] =
                    new_description;
                break;
            }
        }
    };

    const changeTaskDueDate = (task_id, new_due_date) => {
        for (
            let i = 0;
            i < workspace.currentProject["tasks"].length;
            i++
        ) {
            if (
                workspace.currentProject["tasks"][i]["id"] === task_id
            ) {
                workspace.currentProject["tasks"][i]["due_date"] =
                    new_due_date;
                break;
            }
        }
    };

    const changeTaskPriority = (task_id, new_priority) => {
        for (
            let i = 0;
            i < workspace.currentProject["tasks"].length;
            i++
        ) {
            if (
                workspace.currentProject["tasks"][i]["id"] === task_id
            ) {
                workspace.currentProject["tasks"][i]["priority"] =
                    new_priority;
                break;
            }
        }
    };

    const onTaskClick = event => {
        if (event.target.closest("button")) return;

        selectedCard.current = event.currentTarget;

        const rect = selectedCard.current.getBoundingClientRect();

        dragOffset.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    };

    const onTaskMove = event => {
        if (!selectedCard.current) return;

        const card = selectedCard.current;
        const parent = card.offsetParent;

        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();

        card.style.position = "absolute";

        card.style.left =
            (
                event.clientX -
                parentRect.left -
                dragOffset.current.x +
                parent.scrollLeft
            ) + "px";

        card.style.top =
            (
                event.clientY -
                parentRect.top -
                dragOffset.current.y +
                parent.scrollTop
            ) + "px";
    };

    const onMouseUp = event => {
        if (!selectedCard.current) return;

        const task_id = selectedCard.current.id;

        const deck = FindResultDeck(
            event.clientX,
            event.clientY
        );

        if (deck) {
            const tasks = workspace.currentProject?.tasks ?? [];

            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].id === task_id) {
                    tasks[i].status = deck;
                    break;
                }
            }

            updateTaskStatus(task_id, deck).then(success => {
                if (success) {
                    console.log("Task Moved!");
                } else {
                    console.log("Error moving task!");
                }
            });
        }

        selectedCard.current.removeAttribute("style");
        selectedCard.current = null;

        setNum(previous => (previous + 1) % 10);
    };

    return (
        <section
            className="board"
            onMouseMove={onTaskMove}
        >
            <div className="board-slide-viewport">
                <div
                    className={`board-slide board-slide-main ${
                        progressOpen ? "board-slide-above" : ""
                    }`}
                    inert={progressOpen}
                >
                    <header className="board-header">
                        <div className="board-header-info">
                            <span className="board-eyebrow">
                                PROJECT BOARD
                            </span>

                            <h1
                                className="board-project-name"
                                title={project_name}
                            >
                                {project_name}
                            </h1>
                        </div>

                        <div className="board-header-actions">
                            <button
                                type="button"
                                className="board-delete-button"
                                aria-label="Delete project"
                                title="Delete project"
                            >
                                <Trash2
                                    size={17}
                                    strokeWidth={1.8}
                                />
                                <span>Delete Project</span>
                            </button>
                        </div>
                    </header>

                    <div className="board-decks">
                        {statuses.map(deckStatus => (
                            <Deck
                                key={deckStatus}
                                status={deckStatus}
                                onAddTask={handleOpenCreateTask}
                                onTaskClick={onTaskClick}
                                onTaskSettings={onTaskSettings}
                                onMouseUp={onMouseUp}
                            />
                        ))}
                    </div>
                </div>

                <div
                    className={`board-slide board-slide-progress ${
                        progressOpen ? "board-slide-visible" : ""
                    }`}
                    inert={!progressOpen}
                >
                    <div className="board-progress-heading">
                        <span className="board-eyebrow">
                            PROJECT OVERVIEW
                        </span>

                        <h2>{project_name}</h2>

                        <p>
                            Progress and upcoming deadlines across this project.
                        </p>
                    </div>

                    <div className="board-progress-grid">
                        <div className="board-progress-tile">
                            <ListTodo size={26} strokeWidth={1.7} />
                            <span>Total Tasks</span>
                            <strong>{progress.tasks_total}</strong>
                        </div>

                        <div className="board-progress-tile board-progress-completed">
                            <CircleCheck size={26} strokeWidth={1.7} />
                            <span>Completed</span>
                            <strong>{progress.tasks_completed}</strong>
                        </div>

                        <div className="board-progress-tile board-progress-soon">
                            <Clock3 size={26} strokeWidth={1.7} />
                            <span>Due Soon</span>
                            <strong>{progress.tasks_due_soon}</strong>
                        </div>

                        <div className="board-progress-tile board-progress-overdue">
                            <AlertTriangle size={26} strokeWidth={1.7} />
                            <span>Overdue</span>
                            <strong>{progress.tasks_overdue}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="board-slide-switcher"
                aria-label="Project view selector"
            >
                <button
                    type="button"
                    className={`board-slide-option ${
                        !progressOpen ? "active" : ""
                    }`}
                    onClick={() => setProgressOpen(false)}
                    aria-label="Show project board"
                    aria-pressed={!progressOpen}
                    title="Project Board"
                >
                    <span className="board-slide-option-label">
                        Board
                    </span>
                    <ChevronUp size={17} />
                </button>

                <div className="board-slide-switcher-track">
                    <span
                        className={progressOpen ? "at-bottom" : ""}
                    />
                </div>

                <button
                    type="button"
                    className={`board-slide-option ${
                        progressOpen ? "active" : ""
                    }`}
                    onClick={() => setProgressOpen(true)}
                    aria-label="Show project progress"
                    aria-pressed={progressOpen}
                    title="Project Progress"
                >
                    <span className="board-slide-option-label">
                        Progress
                    </span>
                    <ChevronDown size={17} />
                </button>
            </div>

            {createTaskOpen && (
                <dialog
                    ref={dialogRef}
                    className="board-task-dialog"
                    onClose={handleCloseCreateTask}
                    onCancel={event => {
                        event.preventDefault();
                        handleCloseCreateTask();
                    }}
                    onClick={event => {
                        if (event.target === event.currentTarget) {
                            handleCloseCreateTask();
                        }
                    }}
                >
                    <div className="board-task-dialog-content">
                        <div className="board-task-dialog-header">
                            <div className="board-task-dialog-heading">
                                <div className="board-task-dialog-icon">
                                    <ClipboardList size={21} />
                                </div>

                                <div>
                                    <span className="board-task-dialog-eyebrow">
                                        NEW TASK
                                    </span>
                                    <h2>Create a Task</h2>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="board-task-dialog-close"
                                onClick={handleCloseCreateTask}
                                aria-label="Close dialog"
                                disabled={submitting}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            id="board-create-task-form"
                            onSubmit={handleCreateTask}
                        >
                            <div className="board-task-form-grid">
                                <div className="board-task-form-left">
                                    <div className="board-task-field">
                                        <label htmlFor="board-task-title">
                                            Title
                                            <span className="board-task-required">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            id="board-task-title"
                                            type="text"
                                            placeholder="Enter task title..."
                                            value={title}
                                            onChange={event =>
                                                setTitle(event.target.value)
                                            }
                                            maxLength={150}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="board-task-field board-task-description-field">
                                        <label htmlFor="board-task-description">
                                            Description
                                        </label>

                                        <textarea
                                            id="board-task-description"
                                            placeholder="Describe what needs to be done..."
                                            value={description}
                                            onChange={event =>
                                                setDescription(event.target.value)
                                            }
                                            rows={8}
                                        />
                                    </div>
                                </div>

                                <div className="board-task-form-right">
                                    <div className="board-task-field">
                                        <label htmlFor="board-task-status">
                                            Status
                                        </label>

                                        <select
                                            id="board-task-status"
                                            value={status}
                                            onChange={event =>
                                                setStatus(event.target.value)
                                            }
                                        >
                                            {statuses.map(item => (
                                                <option
                                                    key={item}
                                                    value={item}
                                                >
                                                    {statusLabels[item]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="board-task-field">
                                        <label htmlFor="board-task-priority">
                                            Priority
                                        </label>

                                        <select
                                            id="board-task-priority"
                                            value={priority}
                                            onChange={event =>
                                                setPriority(event.target.value)
                                            }
                                        >
                                            {priorities.map(item => (
                                                <option
                                                    key={item}
                                                    value={item}
                                                >
                                                    {item.charAt(0).toUpperCase() +
                                                        item.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="board-task-field">
                                        <label htmlFor="board-task-due-date">
                                            Due Date
                                        </label>

                                        <div className="board-task-date-wrapper">
                                            <CalendarDays size={17} />

                                            <input
                                                id="board-task-due-date"
                                                type="date"
                                                value={dueDate}
                                                onChange={event =>
                                                    setDueDate(event.target.value)
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="board-task-field">
                                        <label htmlFor="board-task-member-select">
                                            Assign To
                                        </label>

                                        <div className="board-task-member-row">
                                            <select
                                                id="board-task-member-select"
                                                value={memberToAdd}
                                                onChange={event =>
                                                    setMemberToAdd(event.target.value)
                                                }
                                                disabled={availableMembers.length === 0}
                                            >
                                                <option value="">
                                                    {availableMembers.length === 0
                                                        ? "No members available"
                                                        : "Select a member"}
                                                </option>

                                                {availableMembers
                                                    .filter(member =>
                                                        !assignees.some(
                                                            assigned =>
                                                                assigned.id === member.id
                                                        )
                                                    )
                                                    .map(member => (
                                                        <option
                                                            key={member.id}
                                                            value={member.id}
                                                        >
                                                            {member.username}
                                                        </option>
                                                    ))}
                                            </select>

                                            <button
                                                type="button"
                                                className="board-task-add-member"
                                                onClick={handleAddAssignee}
                                                disabled={!memberToAdd}
                                            >
                                                <Plus size={16} />
                                                Add
                                            </button>
                                        </div>

                                        <div className="board-task-assignees">
                                            {assignees.map(member => (
                                                <div
                                                    className="board-task-assignee"
                                                    key={member.id}
                                                >
                                                    <span className="board-task-assignee-avatar">
                                                        {member.username
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>

                                                    <span>
                                                        {member.username}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveAssignee(member.id)
                                                        }
                                                        aria-label={`Remove ${member.username}`}
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ))}

                                            {assignees.length === 0 && (
                                                <p className="board-task-no-assignees">
                                                    No members assigned
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="board-task-form-footer">
                                <button
                                    type="button"
                                    className="board-task-cancel"
                                    onClick={handleCloseCreateTask}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="board-task-create"
                                    disabled={submitting}
                                >
                                    <Check size={17} />
                                    {submitting
                                        ? "Creating..."
                                        : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </dialog>
            )}
        </section>
    );
}
