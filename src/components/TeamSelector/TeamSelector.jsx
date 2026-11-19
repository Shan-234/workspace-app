
import { useState } from "react";
import { Settings, ChevronDown } from "lucide-react";
import "./TeamSelector.css";
import { workspace } from "../../lib/Supabase/supabase";

export default function TeamSelector({
    id,
    name,
    onSettings,
    onTeamChange
}) {
    const [isOpen, setIsOpen] = useState(false);
    const teams = [];

    for (const [team_id, team] of Object.entries(workspace.currentUser["user_teams"])) {
        if (team_id != id) {
            teams.push({
                id: team_id,
                name: team.name,
                notifications: team.notifications
            });
        }
    }

    return (
        <div className="team-selector-container">
            <div className="team-selector">
                <div className="team-selector-info">
                    <span className="team-selector-label">CURRENT TEAM</span>
                    <h3 className="team-selector-name" title={name}>
                        {name}
                    </h3>
                </div>

                <div className="team-selector-actions">
                    <button
                        type="button"
                        className="team-selector-icon-button"
                        onClick={() => onSettings?.(id)}
                        title="Team settings"
                        aria-label="Team settings"
                    >
                        <Settings size={19} strokeWidth={1.8} />
                    </button>

                    <div className="team-selector-divider" />

                    <button
                        type="button"
                        className={`team-selector-icon-button team-selector-dropdown-button ${isOpen ? "active" : ""}`}
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Select team"
                        aria-expanded={isOpen}
                    >
                        <ChevronDown size={21} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="team-selector-menu">
                    <span className="team-selector-menu-label">
                        SWITCH TEAM
                    </span>

                    {teams.length === 0 ? (
                        <div className="team-selector-empty">
                            No other teams available
                        </div>
                    ) : (
                        teams.map((team) => (
                            <button
                                type="button"
                                key={team.id}
                                className={`team-selector-menu-item ${team.id === id ? "selected" : ""}`}
                                onClick={() => {
                                    onTeamChange?.(team.id);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="team-selector-team-avatar">
                                    {team.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="team-selector-menu-name">
                                    {team.name}
                                </span>
                                {team.id === id && (
                                    <span className="team-selector-current-dot" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
