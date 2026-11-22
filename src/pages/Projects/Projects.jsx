
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
    Search,
    Plus,
    PanelsTopLeft,
    ArrowLeft,
    FolderPlus,
    FileText,
    X
} from "lucide-react";
import { supabase, retrieveTeam, workspace, createProject, retrieveProject, retrieveAccount, retrieveTask, updateTask, deleteTask, clearTaskNotificationHandlers, getProjectNotifications, clearProjectNotificationHandlers, clearTeamNotificationHandlers } from "../../lib/Supabase/supabase";
import TeamSelector from "../../components/TeamSelector/TeamSelector";
import ProjectPreview from "../../components/ProjectPreview/ProjectPreview";
import Board from "../../components/Board/Board";
import "./Projects.css";
import TaskDetails from "../../components/TaskDetails/TaskDetails";

async function getSessionId() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession();

    if (error) {
        throw error;
    }

    if (session) {
        return session.user.id;
    }

    return null;
}

export default function Projects() {
    const navigate = useNavigate();
    const { team_id } = useParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [currentTeam, setCurrentTeam] = useState(null);
    const [currentProject, setCurrentProject] = useState(null);

    const [addProject, setAddProject] = useState(false);
    const [creatingProject, setCreatingProject] = useState(false);
    const [loadingProject, setLoadingProject] = useState(false);
    const [projectNameInput, setProjectNameInput] = useState("");
    const [projectDescription, setProjectDescription] = useState("");

    const [loadingTask, setLoadingTask] = useState(false);
    const [openTaskDetails, setOpenTaskDetails] = useState(false);

    const [projectNotifications, setProjectNotifications] = useState({});

    useEffect(() => {
        async function getUser() {
            const user_id = await getSessionId();

            if (user_id) {
                await retrieveAccount(user_id);
            } else {
                navigate("/dashboard");
            }
        }

        getUser();
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadTeam = async () => {
            console.log("Loading Team", team_id);
            setLoading(true);
            setError(null);
            setAddProject(false);

            try {
                const success = await retrieveTeam(team_id);

                if (cancelled) return;

                if (!success) {
                    throw new Error(
                        `Unable to retrieve team with ID ${team_id}`
                    );
                }

                const team = workspace.currentTeam;

                if (!team) {
                    throw new Error("No team was loaded.");
                }

                const projects = Array.isArray(team.projects)
                    ? team.projects
                    : [];

                const existingProject = workspace.currentProject;

                const selectedProject =
                    projects.find(
                        (project) =>
                            String(project.id) ===
                            String(existingProject?.id)
                    ) ?? null;

                workspace.currentProject = selectedProject;

                setCurrentTeam(team);
                setCurrentProject(selectedProject);

            } catch (err) {
                if (!cancelled) {
                    console.error("Error retrieving team:", err);
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load team."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadTeam();

        return () => {
            cancelled = true;
        };
    }, [team_id]);

    useEffect(() => {
        if (!team_id) return;

        const channel = supabase
            .channel(`team-${team_id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "projects",
                    filter: `team_id=eq.${team_id}`
                },
                (payload) => {
                    console.log("Project Added:", payload);
                    handleNewProject(payload.new);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "projects",
                    filter: `team_id=eq.${team_id}`
                },
                (payload) => {
                    console.log("Project Deleted:", payload);
                }
            )
            .subscribe((status) => {
                console.log("Projects Realtime status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [team_id]);

    const projects = currentTeam?.projects ?? [];

    const filteredProjects = useMemo(() => {
        return projects.filter((project) =>
            (project.name ?? "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery]);

    const selectedProjectId = currentProject?.id ?? null;

    const projectName =
        currentProject?.name ?? "Select a project";

    const onTeamChange = (id) => {
        clearTaskNotificationHandlers();
        clearProjectNotificationHandlers();
        clearTeamNotificationHandlers();
        navigate("/projects/" + id);
    };

    const onBackToDashboard = () => {
        clearTaskNotificationHandlers();
        clearProjectNotificationHandlers();
        clearTeamNotificationHandlers();
        navigate("/dashboard");
    };

    const handleProjectSelect = (projectId) => {
        setLoadingProject(true);
        retrieveProject(projectId).then((current_project) => {
            setLoadingProject(false);
            setCurrentProject(current_project);
            setAddProject(false);
            setOpenTaskDetails(false);
            workspace.currentTask = null;
        });
    };

    const handleAddProject = () => {
        console.log(currentTeam);
        setProjectNameInput("");
        setProjectDescription("");
        setAddProject(true);
    };

    const handleCancelAddProject = () => {
        setAddProject(false);
        setProjectNameInput("");
        setProjectDescription("");
    };

    const handleCreateProject = (event) => {
        event.preventDefault();

        setCreatingProject(true);

        const name = projectNameInput.trim();
        const description = projectDescription.trim();

        if (!name) return;

        createProject(name, description).then((success) => {
            if (success) {
                setCreatingProject(false);
                handleCancelAddProject();
                setCurrentTeam(workspace.currentTeam);
                setCurrentProject(workspace.currentProject);
            } else {
                console.error("Error creating project!");
            }
        });
    };

    const handleNewProject = (new_project) => {
        const project_id = new_project.id;

        for (let i = 0; i < workspace.currentTeam["projects"].length; i++) {
            if (workspace.currentTeam["projects"][i]["id"] === project_id) {
                return;
            }
        }

        const new_project_data = {
            "id": project_id,
            "name": new_project.name,
            "notifications": 0,
            "most_recent_log": ""
        };

        workspace.currentTeam["projects"].push(new_project_data);
        setCurrentTeam({
            "team_id": workspace.currentTeam.team_id,
            "name": workspace.currentTeam.name,
            "description": workspace.currentTeam.description,
            "activity_logs": workspace.currentTeam.activity_logs,
            "projects": workspace.currentTeam["projects"]
        });
    };

    const handleTeamSettings = (teamId) => {
        console.log("Team settings:", teamId);
    };

    const handleAddTask = (status) => {
        console.log("Add task to:", status);
    };

    const handleTaskSettings = (taskId) => {
        console.log("Opening Task settings...");
        setLoadingTask(true);

        retrieveTask(taskId).then((success) => {
            setLoadingTask(false);
            setOpenTaskDetails(true);
        });
    };

    const handleProjectSettings = () => {
        console.log("Project settings:", selectedProjectId);
    };

    const handleSaveTaskDetails = (task_updated) => {
        updateTask(task_updated).then((success) => {
            if (success) {
                workspace.currentTask = null;

                for (let i = 0; i < workspace.currentProject["tasks"].length; i++) {
                    if (workspace.currentProject["tasks"][i]["id"] === task_updated.id) {
                        workspace.currentProject["tasks"][i]["title"] = task_updated.title;
                        workspace.currentProject["tasks"][i]["description"] = task_updated.description;
                        workspace.currentProject["tasks"][i]["status"] = task_updated.status;
                        workspace.currentProject["tasks"][i]["priority"] = task_updated.priority;
                        workspace.currentProject["tasks"][i]["due_date"] = task_updated.due_date;
                        break;
                    }
                }

                setOpenTaskDetails(false);
                setCurrentProject(workspace.currentProject);
            } else {
                console.error("Error updating task!");
            }
        });
    };

    const handleDeleteTask = (task_id) => {
        deleteTask(task_id).then((success) => {
            if (success) {
                console.log("Successfully Deleted Task!");
                workspace.currentTask = null;

                for (let i = 0; i < workspace.currentProject["tasks"].length; i++) {
                    if (workspace.currentProject["tasks"][i]["id"] === task_id) {
                        workspace.currentProject["tasks"].splice(i, 1);
                        break;
                    }
                }

                setOpenTaskDetails(false);
                setCurrentProject(workspace.currentProject);
            } else {
                console.error("Error deleting task!");
            }
        });
    };

    const handleCancelTaskDetails = (event) => {
        workspace.currentTask = null;
        setOpenTaskDetails(false);
        setCurrentProject(workspace.currentProject);
    };

    let board = (
        <div className="projects-empty-board">
            <div className="projects-empty-board-icon">
                <PanelsTopLeft size={38} strokeWidth={1.4} />
            </div>

            <h2>Select a project</h2>

            <p>
                Choose a project from the sidebar to view its board,
                manage tasks, and track progress.
            </p>

            <div className="projects-empty-board-hint">
                <ArrowLeft size={16} strokeWidth={1.8} />
                <span>Select a project from the sidebar</span>
            </div>
        </div>
    );

    if (currentProject) {
        board = (
            <Board
                key={selectedProjectId ?? "empty"}
                project_name={projectName}
                onAddTask={handleAddTask}
                onTaskSettings={handleTaskSettings}
                onProjectSettings={handleProjectSettings}
            />
        );
    }

    if (loading) {
        clearTaskNotificationHandlers();

        return (
            <main className="projects-loading">
                <div className="projects-loading-content">
                    <div className="projects-loading-spinner"></div>
                    <h2>WORKSPACE</h2>
                    <p>Loading team projects...</p>
                </div>
            </main>
        );
    }

    if (error || !currentTeam) {
        clearTaskNotificationHandlers();

        return (
            <main className="projects-loading">
                <div className="projects-loading-content">
                    <h2>WORKSPACE</h2>
                    <p>{error ?? "Unable to load team."}</p>
                </div>
            </main>
        );
    }

    if (openTaskDetails) {
        console.log("Rendering TaskDetails Component");
        clearTaskNotificationHandlers();

        board = (
            <div className="project-task-details">
                <TaskDetails
                    onCancel={handleCancelTaskDetails}
                    onSaveChanges={handleSaveTaskDetails}
                    onDeleteTask={handleDeleteTask}
                />
            </div>
        );
    }

    if (addProject) {
        clearTaskNotificationHandlers();

        board = (
            <div className="projects-create-page">
                <div className="projects-create-container">
                    <div className="projects-create-topbar">
                        <span className="projects-create-eyebrow">
                            WORKSPACE / NEW PROJECT
                        </span>

                        <button
                            type="button"
                            className="projects-create-close"
                            onClick={handleCancelAddProject}
                            aria-label="Cancel creating project"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="projects-create-heading">
                        <div className="projects-create-icon">
                            <FolderPlus
                                size={29}
                                strokeWidth={1.6}
                            />
                        </div>

                        <h2>Create a new project</h2>

                        <p>
                            Give your project a name and description
                            to get started. Your project will belong
                            to {currentTeam.name ?? "this team"}.
                        </p>
                    </div>

                    <form
                        className="projects-create-form"
                        onSubmit={handleCreateProject}
                    >
                        <div className="projects-create-field">
                            <label htmlFor="new-project-name">
                                Project name
                                <span className="projects-required">*</span>
                            </label>

                            <div className="projects-create-input-wrapper">
                                <FolderPlus
                                    size={18}
                                    strokeWidth={1.7}
                                />

                                <input
                                    id="new-project-name"
                                    type="text"
                                    placeholder="e.g. Website Redesign"
                                    value={projectNameInput}
                                    onChange={(event) =>
                                        setProjectNameInput(
                                            event.target.value
                                        )
                                    }
                                    maxLength={100}
                                    autoFocus
                                    required
                                />
                            </div>

                            <span className="projects-create-field-hint">
                                Choose a short, recognizable name.
                            </span>
                        </div>

                        <div className="projects-create-field">
                            <label htmlFor="new-project-description">
                                Description
                                <span className="projects-optional">
                                    Optional
                                </span>
                            </label>

                            <div className="projects-create-textarea-wrapper">
                                <FileText
                                    size={18}
                                    strokeWidth={1.7}
                                />

                                <textarea
                                    id="new-project-description"
                                    placeholder="What is this project about? Describe its goals, scope, or purpose..."
                                    value={projectDescription}
                                    onChange={(event) =>
                                        setProjectDescription(
                                            event.target.value
                                        )
                                    }
                                    rows={5}
                                    maxLength={1000}
                                />
                            </div>

                            <div className="projects-create-field-bottom">
                                <span>
                                    Help your team understand the
                                    purpose of this project.
                                </span>

                                <span>
                                    {projectDescription.length}/1000
                                </span>
                            </div>
                        </div>

                        <div className="projects-create-divider" />

                        <div className="projects-create-actions">
                            <button
                                type="button"
                                className="projects-create-cancel"
                                onClick={handleCancelAddProject}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="projects-create-submit"
                                disabled={!projectNameInput.trim()}
                            >
                                <Plus size={18} strokeWidth={2} />
                                Create Project
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (creatingProject) {
        clearTaskNotificationHandlers();

        board = (
            <div className="projects-loading">
                <div className="projects-loading-content">
                    <div className="projects-loading-spinner"></div>
                    <h2>WORKSPACE</h2>
                    <p>Creating your project...</p>
                </div>
            </div>
        );
    }

    if (loadingProject) {
        clearTaskNotificationHandlers();

        board = (
            <div className="projects-loading">
                <div className="projects-loading-content">
                    <div className="projects-loading-spinner"></div>
                    <h2>WORKSPACE</h2>
                    <p>Loading your project...</p>
                </div>
            </div>
        );
    }

    if (loadingTask) {
        console.log("Loading Task...");
        clearTaskNotificationHandlers();

        board = (
            <div className="projects-loading">
                <div className="projects-loading-content">
                    <div className="projects-loading-spinner"></div>
                    <h2>WORKSPACE</h2>
                    <p>Loading task details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="projects-page">
            <aside className="projects-sidebar">
                <div className="projects-sidebar-header">
                    <button
                        type="button"
                        className="projects-back-dashboard"
                        onClick={onBackToDashboard}
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={15} strokeWidth={2} />
                        <span>Back to Dashboard</span>
                    </button>

                    <TeamSelector
                        id={currentTeam.team_id}
                        name={currentTeam.name ?? "Unnamed Team"}
                        onSettings={handleTeamSettings}
                        onTeamChange={onTeamChange}
                    />

                    <div className="projects-sidebar-search-row">
                        <div className="projects-search-container">
                            <Search
                                size={17}
                                strokeWidth={1.8}
                                className="projects-search-icon"
                            />

                            <input
                                type="text"
                                className="projects-search-input"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                            />
                        </div>

                        <button
                            type="button"
                            className="projects-add-button"
                            onClick={handleAddProject}
                            aria-label="Create new project"
                            title="Create new project"
                        >
                            <Plus size={21} strokeWidth={2} />
                        </button>
                    </div>

                    <div className="projects-sidebar-section-heading">
                        <span>YOUR PROJECTS</span>
                        <span className="projects-sidebar-project-count">
                            {projects.length}
                        </span>
                    </div>
                </div>

                <div className="projects-project-list">
                    {currentTeam["projects"].length > 0 ? (
                        currentTeam["projects"].map((project) => (
                            <ProjectPreview
                                key={project.id}
                                id={project.id}
                                name={project.name}
                                most_recent_log={project.most_recent_log}
                                selected={
                                    !addProject &&
                                    String(project.id) ===
                                    String(selectedProjectId)
                                }
                                onClick={handleProjectSelect}
                            />
                        ))
                    ) : (
                        <div className="projects-no-results">
                            <Search
                                size={24}
                                strokeWidth={1.5}
                            />
                            <p>No projects found</p>
                            <span>
                                {projects.length === 0
                                    ? "Create a project to get started."
                                    : "Try a different search term."}
                            </span>
                        </div>
                    )}
                </div>

                <div className="projects-sidebar-footer">
                    <span className="projects-sidebar-status-dot" />
                    <span>Workspace</span>
                    <span className="projects-sidebar-team-name">
                        {currentTeam.name ?? "Team"}
                    </span>
                </div>
            </aside>

            <main className="projects-board-area">
                {board}
            </main>
        </div>
    );
}
