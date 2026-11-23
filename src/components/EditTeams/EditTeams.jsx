
import { useState } from "react";
import { useNavigate } from "react-router";
import "./EditTeams.css";
import { createNewTeam, joinExistingTeam, leaveTeam, workspace } from "../../lib/Supabase/supabase";
import TeamCreated from "../TeamCreated/TeamCreated";

export default function EditTeams({
    onCancel
}) {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("create");
    const [teamName, setTeamName] = useState("");
    const [description, setDescription] = useState("");
    const [projects, setProjects] = useState([]);

    const [showProjectPanel, setShowProjectPanel] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");

    const [createdTeam, setCreatedTeam] = useState(null);

    const [teamCode, setTeamCode] = useState("");
    const [joinedTeam, setJoinedTeam] = useState(null);
    const [joinError, setJoinError] = useState(null);

    const [teamToLeave, setTeamToLeave] = useState(null);

    const openProjectPanel = () => {
        setProjectName("");
        setProjectDescription("");
        setShowProjectPanel(true);
    };

    const closeProjectPanel = () => {
        setShowProjectPanel(false);
    };

    const addProject = (event) => {
        event.preventDefault();

        if (!projectName.trim()) return;

        setProjects(prev => [
            ...prev,
            {
                name: projectName.trim(),
                description: projectDescription.trim()
            }
        ]);

        closeProjectPanel();
    };

    const removeProject = (id) => {
        setProjects(prev =>
            prev.filter(project => project.id !== id)
        );
    };

    const createTeam = (event) => {
        event.preventDefault();

        const newTeam = {
            name: teamName.trim(),
            description: description.trim(),
            projects: projects.map(project => ({
                name: project.name,
                description: project.description
            }))
        };

        console.log("Creating team:", newTeam);

        createNewTeam(newTeam).then((team_data) => {
            setCreatedTeam(team_data);
        });
    };

    const joinTeam = (event) => {
        event.preventDefault();

        if (!teamCode.trim()) return;

        setJoinError(null);
        setJoinedTeam(null);

        joinExistingTeam(teamCode.trim())
            .then((status) => {
                if (status.success) {
                    setJoinedTeam(status.message);
                    setJoinError(null);
                } else {
                    setJoinError(status.message);
                    setJoinedTeam(null);
                }
            })
            .catch((error) => {
                console.error("Failed to join team:", error);
                setJoinError("Something went wrong. Please try again.");
                setJoinedTeam(null);
            });
    };

    const onLeaveTeam = (id, name) => {
        setTeamToLeave({
            id: id,
            name: name
        });
    };

    const confirmLeaveTeam = () => {
        leaveTeam(teamToLeave.id).then((success) => {
            if (success) {
                navigate(-1);
            } else {
                console.error("Error leaving team with ID", teamToLeave.id);
            }
        });
        setTeamToLeave(null);
    };

    const goToDashboard = () => {
        onCancel();
    };

    const cancel = () => {
        onCancel();
    };

    if (createdTeam) {
        const name = createdTeam.name;
        const description = createdTeam.description;
        const joinCode = createdTeam.team_id;

        return (
            <TeamCreated
                name={name}
                description={description}
                joinCode={joinCode}
            />
        );
    }

    return (
        <main className="edit-teams">
            <div className="edit-teams-panel">
                <div className="edit-teams-tabs">
                    <button
                        type="button"
                        className={activeTab === "create" ? "active" : ""}
                        onClick={() => setActiveTab("create")}
                    >
                        Create
                    </button>

                    <button
                        type="button"
                        className={activeTab === "join" ? "active" : ""}
                        onClick={() => {
                            setActiveTab("join");
                            closeProjectPanel();
                        }}
                    >
                        Join
                    </button>

                    <button
                        type="button"
                        className={activeTab === "leave" ? "active" : ""}
                        onClick={() => {
                            setActiveTab("leave");
                            closeProjectPanel();
                        }}
                    >
                        Leave
                    </button>
                </div>

                {activeTab === "create" ? (
                    <form
                        onSubmit={createTeam}
                        className="edit-teams-form"
                    >
                        <div className="edit-teams-field">
                            <label htmlFor="team-name">
                                Name
                            </label>

                            <input
                                id="team-name"
                                type="text"
                                placeholder="Enter team name"
                                value={teamName}
                                onChange={e => setTeamName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="edit-teams-field">
                            <label htmlFor="team-description">
                                Description
                            </label>

                            <textarea
                                id="team-description"
                                placeholder="What is this team about?"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="edit-teams-projects">
                            <div className="edit-teams-projects-header">
                                <h3>Add Projects</h3>

                                {projects.length > 0 && (
                                    <span className="edit-teams-project-count">
                                        {projects.length}{" "}
                                        {projects.length === 1
                                            ? "project"
                                            : "projects"}
                                    </span>
                                )}
                            </div>

                            <div className="edit-teams-project-list">
                                {projects.map(project => (
                                    <div
                                        className="edit-teams-project-card"
                                        key={project.id}
                                    >
                                        <div className="edit-teams-project-icon">
                                            <span>▦</span>
                                        </div>

                                        <div className="edit-teams-project-details">
                                            <h4>{project.name}</h4>
                                            <p>
                                                {project.description ||
                                                    "No description provided"}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="edit-teams-project-remove"
                                            onClick={() =>
                                                removeProject(project.id)
                                            }
                                            aria-label={`Remove ${project.name}`}
                                            title="Remove project"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                className="edit-teams-add-project"
                                onClick={openProjectPanel}
                            >
                                + New Project
                            </button>
                        </div>

                        <div className="edit-teams-actions">
                            <button
                                type="button"
                                className="edit-teams-cancel"
                                onClick={cancel}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="edit-teams-submit"
                                disabled={!teamName.trim()}
                            >
                                Create Team
                            </button>
                        </div>
                    </form>
                ) : activeTab === "join" ? (
                    <div className="edit-teams-join">
                        <form
                            className="edit-teams-join-form"
                            onSubmit={joinTeam}
                        >
                            <div className="edit-teams-field">
                                <label htmlFor="team-code">
                                    Enter Team Code
                                </label>

                                <input
                                    id="team-code"
                                    type="text"
                                    placeholder="Enter your team code"
                                    value={teamCode}
                                    onChange={e => {
                                        setTeamCode(e.target.value);
                                        setJoinedTeam(null);
                                        setJoinError(null);
                                    }}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="edit-teams-submit edit-teams-join-button"
                                disabled={!teamCode.trim()}
                            >
                                Join
                            </button>
                        </form>

                        <div className="edit-teams-join-success">
                            {joinError ? (
                                <h2 className="edit-teams-join-error">
                                    {joinError}
                                </h2>
                            ) : joinedTeam ? (
                                <h2>
                                    You joined team{" "}
                                    <span>{joinedTeam}</span>!
                                </h2>
                            ) : null}

                            <button
                                type="button"
                                className="edit-teams-dashboard-button"
                                onClick={goToDashboard}
                            >
                                <span>←</span>
                                Go To Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    Object.keys(
                        workspace.currentUser["user_teams"] ?? {}
                    ).length > 0 ? (
                        <div className="edit-teams-leave">
                            <h2>Your Teams</h2>

                            <div className="edit-teams-leave-list">
                                {Object.entries(
                                    workspace.currentUser["user_teams"] ?? {}
                                ).map(([teamId, team]) => (
                                    <div
                                        key={teamId}
                                        className="edit-teams-leave-card"
                                    >
                                        <span className="edit-teams-leave-name">
                                            {team.name}
                                        </span>

                                        <button
                                            type="button"
                                            className="edit-teams-leave-button"
                                            onClick={() =>
                                                onLeaveTeam(teamId, team.name)
                                            }
                                        >
                                            Leave
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="edit-teams-leave-placeholder">
                            <h3>Leave a Team</h3>
                            <p>Select a team to leave.</p>
                        </div>
                    )
                )}
            </div>

            <div
                className={
                    "edit-project-overlay" +
                    (showProjectPanel
                        ? " edit-project-overlay-visible"
                        : "")
                }
                onClick={closeProjectPanel}
                aria-hidden="true"
            />

            <aside
                className={
                    "edit-project-panel" +
                    (showProjectPanel
                        ? " edit-project-panel-open"
                        : "")
                }
                role="dialog"
                aria-modal={showProjectPanel ? "true" : undefined}
                aria-label="Create Project"
                aria-hidden={!showProjectPanel}
                inert={!showProjectPanel}
            >
                <div className="edit-project-panel-header">
                    <h2>Create Project</h2>
                </div>

                <form
                    className="edit-project-form"
                    onSubmit={addProject}
                >
                    <div className="edit-teams-field">
                        <label htmlFor="project-name">
                            Name
                        </label>

                        <input
                            id="project-name"
                            type="text"
                            placeholder="Enter project name"
                            value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="edit-teams-field">
                        <label htmlFor="project-description">
                            Description
                        </label>

                        <textarea
                            id="project-description"
                            placeholder="Describe your project..."
                            value={projectDescription}
                            onChange={e =>
                                setProjectDescription(e.target.value)
                            }
                            rows={7}
                        />
                    </div>

                    <div className="edit-project-actions">
                        <button
                            type="button"
                            className="edit-teams-cancel"
                            onClick={closeProjectPanel}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="edit-teams-submit"
                            disabled={!projectName.trim()}
                        >
                            Add
                        </button>
                    </div>
                </form>
            </aside>

            {teamToLeave && (
                <div className="leave-team-overlay">
                    <div
                        className="leave-team-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="leave-team-title"
                        aria-describedby="leave-team-description"
                    >
                        <h2 id="leave-team-title">
                            Leave Team?
                        </h2>

                        <p id="leave-team-description">
                            Are you sure you want to leave{" "}
                            <strong>{teamToLeave.name}</strong>?
                        </p>

                        <div className="leave-team-dialog-actions">
                            <button
                                type="button"
                                className="leave-team-cancel"
                                onClick={() => setTeamToLeave(null)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="leave-team-confirm"
                                onClick={confirmLeaveTeam}
                            >
                                Leave Team
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
