import { Link } from 'react-router';
import './Team.css';
import { useEffect, useState } from 'react';
import { getTeamNotifications, registerTeamNotificationHandler } from '../../lib/Supabase/supabase';

export default function Team({ id, name }) {
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
        <Link to={`/projects/${id}`} className="team-button">
            <span className="team-name">{name}</span>

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
