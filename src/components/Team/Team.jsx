import { Link } from 'react-router';
import './Team.css';

export default function Team({ id, name, notifications = 0 }) {
    return (
        <Link to={`/Projects/${id}`} className="team-button">
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
