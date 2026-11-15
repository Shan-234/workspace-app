
import "./ProjectPreview.css";

export default function ProjectPreview({
    id = 0,
    name = "UnNamed",
    notifications = 0,
    most_recent_log = "",
    selected = false,
    onClick
}) {
    return (
        <button
            type="button"
            className={`project-preview ${selected ? "project-preview-selected" : ""}`}
            onClick={() => onClick?.(id)}
            aria-pressed={selected}
        >
            <div className="project-preview-content">
                <h3 className="project-preview-name" title={name}>
                    {name}
                </h3>

                <p
                    className="project-preview-log"
                    title={most_recent_log}
                >
                    {most_recent_log || "No recent activity"}
                </p>
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
