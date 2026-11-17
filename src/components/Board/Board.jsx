
import { useEffect, useRef, useState } from "react";
import {
    SlidersHorizontal,
    Settings2,
    X,
    Plus,
    CalendarDays,
    Check,
    ClipboardList
} from "lucide-react";
import Deck from "../Deck/Deck";
import { supabase, createTask, updateTaskStatus, workspace } from "../../lib/Supabase/supabase";
import "./Board.css";
import { create } from "motion/react-m";

const statuses = [
    "todo",
    "in_progress",
    "in_review",
    "done"
];

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
    onTaskSettings,
    onProjectSettings
}) {
    const [num, setNum] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);
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

                    for (let i = 0; i < workspace.currentProject["tasks"].length; i++) {
                        if (workspace.currentProject["tasks"][i]["id"] === task_id) {
                            if (workspace.currentProject["tasks"][i]["status"] !== payload.new.status) {
                                moveTask(task_id, payload.new.status);
                                break;
                            }
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
                        "id": payload.new.id,
                        "title": payload.new.title,
                        "description": payload.new.description,
                        "status": payload.new.status,
                        "priority": payload.new.priority,
                        "due_date": payload.new.due_date
                    });
                    setNum(prev => (prev + 1) % 10);
                }
            )
            .subscribe((status) => {
                console.log("Realtime status:", status);
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
            (item) => String(item.id) === memberToAdd
        );

        if (!member) return;

        setAssignees((previous) => {
            if (
                previous.some(
                    (item) => item.id === member.id
                )
            ) {
                return previous;
            }

            return [...previous, member];
        });

        setMemberToAdd("");
    };

    const handleRemoveAssignee = (memberId) => {
        setAssignees((previous) =>
            previous.filter(
                (member) => member.id !== memberId
            )
        );
    };

    const handleCreateTask = async (event) => {
        event.preventDefault();

        if (!title.trim() || submitting) return;

        const new_task = {
            title: title.trim(),
            description: description.trim(),
            status: status,
            priority: priority,
            due_date: dueDate || null,
            assignees: assignees.map(
                (member) => member.id
            )
        };

        setSubmitting(true);

        createTask(new_task).then((success) => {
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
        for (let i = 0; i < workspace.currentProject["tasks"].length; i++) {
            if (workspace.currentProject["tasks"][i]["id"] === task_id) {
                workspace.currentProject["tasks"][i]["status"] = new_status;
                break;
            }
        }

        setNum(prev => (prev + 1) % 10);
    };

    const onTaskClick = (event) => {
        selectedCard.current = event.currentTarget;

        const rect =
            selectedCard.current.getBoundingClientRect();

        dragOffset.current = {
            x: rect.x - event.clientX,
            y: rect.y - event.clientY
        };
    };

    const onTaskMove = (event) => {
        if (!selectedCard.current) return;

        selectedCard.current.style.position = "absolute";

        selectedCard.current.style.left =
            (event.clientX + dragOffset.current.x) + "px";

        selectedCard.current.style.top =
            (event.clientY + dragOffset.current.y) + "px";
    };

    const onMouseUp = (event) => {
        if (!selectedCard.current) return;

        const task_id = selectedCard.current.id;

        const deck = FindResultDeck(
            event.clientX,
            event.clientY
        );

        if (deck) {
            const tasks =
                workspace.currentProject?.tasks ?? [];

            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].id === task_id) {
                    tasks[i].status = deck;
                    break;
                }
            }

            updateTaskStatus(task_id, deck).then((success) => {
                if (success) {
                    console.log("Task Moved!");
                } else {
                    console.log("Error moving task!");
                }
            });
        }

        selectedCard.current.removeAttribute("style");
        selectedCard.current = null;

        setNum((previous) => (previous + 1) % 10);
    };

    return (
        <section
            className="board"
            onMouseMove={onTaskMove}
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
                        className={`board-filter-button ${
                            filtersOpen
                                ? "board-filter-active"
                                : ""
                        }`}
                        onClick={() =>
                            setFiltersOpen(!filtersOpen)
                        }
                        aria-expanded={filtersOpen}
                    >
                        <SlidersHorizontal
                            size={17}
                            strokeWidth={1.8}
                        />
                        <span>Filters</span>
                    </button>

                    <button
                        type="button"
                        className="board-settings-button"
                        onClick={() =>
                            onProjectSettings?.()
                        }
                        aria-label="Project settings"
                        title="Project settings"
                    >
                        <Settings2
                            size={20}
                            strokeWidth={1.8}
                        />
                    </button>
                </div>
            </header>

            {filtersOpen && (
                <div className="board-filters-panel">
                    <div className="board-filters-heading">
                        <span>Filter tasks</span>

                        <button
                            type="button"
                            onClick={() =>
                                setFiltersOpen(false)
                            }
                            aria-label="Close filters"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <p>
                        Filter options will appear here.
                    </p>
                </div>
            )}

            <div className="board-decks">
                {statuses.map((deckStatus) => (
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

            {createTaskOpen && (
                <dialog
                    ref={dialogRef}
                    className="board-task-dialog"
                    onClose={handleCloseCreateTask}
                    onCancel={(event) => {
                        event.preventDefault();
                        handleCloseCreateTask();
                    }}
                    onClick={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
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
                                            onChange={(event) =>
                                                setTitle(
                                                    event.target.value
                                                )
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
                                            onChange={(event) =>
                                                setDescription(
                                                    event.target.value
                                                )
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
                                            onChange={(event) =>
                                                setStatus(
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {statuses.map((item) => (
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
                                            onChange={(event) =>
                                                setPriority(
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {priorities.map((item) => (
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
                                                onChange={(event) =>
                                                    setDueDate(
                                                        event.target.value
                                                    )
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
                                                onChange={(event) =>
                                                    setMemberToAdd(
                                                        event.target.value
                                                    )
                                                }
                                                disabled={
                                                    availableMembers.length === 0
                                                }
                                            >
                                                <option value="">
                                                    {availableMembers.length === 0
                                                        ? "No members available"
                                                        : "Select a member"}
                                                </option>

                                                {availableMembers
                                                    .filter(
                                                        (member) =>
                                                            !assignees.some(
                                                                (assigned) =>
                                                                    assigned.id ===
                                                                    member.id
                                                            )
                                                    )
                                                    .map((member) => (
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
                                            {assignees.map((member) => (
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
                                                            handleRemoveAssignee(
                                                                member.id
                                                            )
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
