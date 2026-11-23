
import { useEffect, useRef, useState } from "react";
import { Settings2, UserRoundCheck } from "lucide-react";
import "./Card.css";
import {
    checkTaskAssigned,
    getTaskNotifications,
    registerTaskAssignmentHandler,
    registerTaskNotificationHandler
} from "../../lib/Supabase/supabase";

function getNumberOfDaysLeft(dueDate) {
    if (!dueDate) return null;

    const today = new Date();
    const [year, month, day] = dueDate.split("-").map(Number);

    const todayUTC = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const dueUTC = Date.UTC(year, month - 1, day);

    return Math.round((dueUTC - todayUTC) / 86400000);
}

function getDueDateMessage(daysLeft) {
    if (daysLeft === null) return "No due date";
    if (daysLeft < -1) return `Due ${Math.abs(daysLeft)} days ago`;
    if (daysLeft === -1) return "Due yesterday";
    if (daysLeft === 0) return "Due today";
    if (daysLeft === 1) return "Due tomorrow";

    return `Due in ${daysLeft} days`;
}

export default function Card({
    id,
    title,
    description,
    status,
    priority = "medium",
    due_date,
    onClick,
    onSettings
}) {
    const cardRef = useRef(null);
    const [dragWidth, setDragWidth] = useState(null);
    const [notifications, setNotifications] = useState(0);
    const [assigned, setAssigned] = useState(false);

    const daysLeft = getNumberOfDaysLeft(due_date);
    const dueDateMessage = getDueDateMessage(daysLeft);

    const isCompleted = status === "done";

    const dueDateClass = isCompleted
        ? ""
        : daysLeft !== null && daysLeft < 0
            ? "task-card-due-overdue"
            : daysLeft !== null && daysLeft <= 2
                ? "task-card-due-soon"
                : "";

    useEffect(() => {
        registerTaskNotificationHandler(
            id,
            (new_notifications) => {
                setNotifications(new_notifications);
            }
        );

        registerTaskAssignmentHandler(
            id,
            (is_assigned) => {
                setAssigned(is_assigned);
            }
        );

        getTaskNotifications(id).then((result) => {
            if (result) {
                setNotifications(result);
            }
        });

        checkTaskAssigned(id).then((result) => {
            setAssigned(result);
        });
    }, [id]);

    function handleSettingsClick(event) {
        onSettings(id);
    }

    return (
        <article
            id={id}
            ref={cardRef}
            className={`task-card task-card-${priority}`}
            onMouseDown={onClick}
            style={
                dragWidth !== null
                    ? {
                        width: `${dragWidth}px`,
                        minWidth: `${dragWidth}px`,
                        maxWidth: `${dragWidth}px`,
                        boxSizing: "border-box"
                    }
                    : undefined
            }
        >
            {notifications > 0 && (
                <span className="task-card-notification-badge">
                    {notifications}
                </span>
            )}

            <div className="task-card-header">
                <span className="task-card-priority-dot" />
                <h4 className="task-card-title">{title}</h4>
            </div>

            {description && (
                <p className="task-card-description">
                    {description}
                </p>
            )}

            <div className="task-card-divider" />

            <div className="task-card-footer">
                <span className={`task-card-due-date ${dueDateClass}`}>
                    {dueDateMessage}
                </span>

                <button
                    type="button"
                    className="task-card-settings"
                    onClick={handleSettingsClick}
                    aria-label="Task settings"
                >
                    <Settings2 size={16} />
                </button>
            </div>

            {assigned && (
                <div className="task-card-assigned">
                    <UserRoundCheck size={14} strokeWidth={1.8} />
                    <span>Assigned to You</span>
                </div>
            )}
        </article>
    );
}
