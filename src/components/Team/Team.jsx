
import { Link } from "react-router";
import "./Team.css";
import { useEffect, useState } from "react";
import {
    getTeamNotifications,
    registerTeamNotificationHandler
} from "../../lib/Supabase/supabase";

export default function Team({ id, name, description }) {
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
    }, [id]);

    return (
        <Link to={`/projects/${id}`} className="team-button">
            <div className="team-info">
                <span className="team-name">{name}</span>

                {description && (
                    <span
                        className="team-description"
                        title={description}
                    >
                        {description}
                    </span>
                )}
            </div>

            {notifications > 0 && (
                <span className="team-notifications">
                    {notifications > 99 ? "99+" : notifications}
                </span>
            )}

            <span className="team-arrow" aria-hidden="true">
                →
            </span>
        </Link>
    );
}
