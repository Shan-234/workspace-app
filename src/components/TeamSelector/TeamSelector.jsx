
import { useState } from "react";
import { Share2, ChevronDown } from "lucide-react";
import "./TeamSelector.css";
import TeamSelectorItem from "../TeamSelectorItem/TeamSelectorItem";
import { workspace } from "../../lib/Supabase/supabase";

export default function TeamSelector({
    id,
    name,
    onShare,
    onTeamChange
}) {
    const [isOpen, setIsOpen] = useState(false);
    const teams = [];

    for (const [team_id, team] of Object.entries(
        workspace.currentUser?.user_teams ?? {}
    )) {
        if (String(team_id) !== String(id)) {
            teams.push({
                id: team_id,
                name: team.name,
                notifications: team.notifications
            });
        }
    }

    function handleTeamChange(teamId) {
        onTeamChange?.(teamId);
        setIsOpen(false);
    }

    return (
        <div className="team-selector-container">
            <div className="team-selector">
                <div className="team-selector-info">
                    <span className="team-selector-label">
                        CURRENT TEAM
                    </span>

                    <h3 className="team-selector-name" title={name}>
                        {name}
                    </h3>
                </div>

                <div className="team-selector-actions">
                    <button
                        type="button"
                        className="team-selector-icon-button"
                        onClick={() => onShare?.(id)}
                        title="Share team joining code"
                        aria-label="Share team joining code"
                    >
                        <Share2 size={19} strokeWidth={1.8} />
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

            <div
                className="team-selector-menu"
                hidden={!isOpen}
            >
                <span className="team-selector-menu-label">
                    SWITCH TEAM
                </span>

                {teams.length === 0 ? (
                    <div className="team-selector-empty">
                        No other teams available
                    </div>
                ) : (
                    teams.map(team => (
                        <TeamSelectorItem
                            key={team.id}
                            id={team.id}
                            name={team.name}
                            notifications={team.notifications}
                            onClick={handleTeamChange}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
