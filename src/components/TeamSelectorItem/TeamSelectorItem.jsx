
import { useEffect, useState } from "react";
import "./TeamSelectorItem.css";
import { getTeamNotifications, registerTeamNotificationHandler } from "../../lib/Supabase/supabase";

export default function TeamSelectorItem({
    id,
    name,
    selected = false,
    onClick
}) {
    const [notifications, setNotifications] = useState(0);

    useEffect(() => {
        registerTeamNotificationHandler(
            id,
            (num) => {
                setNotifications(num);
            }
        );

        getTeamNotifications(id).then((result) => {
            setNotifications(result);
        });
    }, []);

    return (
        <button
            type="button"
            className={`team-selector-menu-item ${selected ? "selected" : ""}`}
            onClick={() => onClick?.(id)}
        >
            <span className="team-selector-team-avatar">
                {name.charAt(0).toUpperCase()}
            </span>

            <span className="team-selector-menu-name">
                {name}
            </span>

            {notifications > 0 && (
                <span className="team-selector-notification-badge">
                    {notifications}
                </span>
            )}

            {selected && (
                <span className="team-selector-current-dot" />
            )}
        </button>
    );
}
