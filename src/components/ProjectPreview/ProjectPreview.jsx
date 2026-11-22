
import { useEffect, useState } from "react";
import "./ProjectPreview.css";
import { getProjectNotifications, registerProjectNotificationHandler, workspace } from "../../lib/Supabase/supabase";

export default function ProjectPreview({
    id = 0,
    name = "UnNamed",
    most_recent_log = "",
    selected = false,
    onClick
}) {
    const [notifications, setNotifications] = useState(0);
    const initial = name?.trim().charAt(0).toUpperCase() || "?";

    useEffect(() => {
        registerProjectNotificationHandler(
            id,
            (num) => {
                setNotifications(num);
            }
        );

        getProjectNotifications(id).then((result) => {
            setNotifications(result);
        });
    }, []);

    return (
        <button
            type="button"
            className={`project-preview ${selected ? "project-preview-selected" : ""}`}
            onClick={() => onClick?.(id)}
            aria-pressed={selected}
        >
            <div className="project-preview-avatar" aria-hidden="true">
                {initial}
            </div>

            <div className="project-preview-content">
                <h3 className="project-preview-name" title={name}>
                    {name}
                </h3>
            </div>

            {notifications > 0 && (
                <span
                    className="project-preview-notifications"
                    aria-label={`${notifications} unread notifications`}
                >
                    {notifications > 99 ? "99+" : notifications}
                </span>
            )}
        </button>
    );
}
