
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Search, Plus } from "lucide-react";
import { workspace } from "../../lib/Supabase/supabase";
import TeamSelector from "../../components/TeamSelector/TeamSelector";
import ProjectPreview from "../../components/ProjectPreview/ProjectPreview";
import Board from "../../components/Board/Board";
import "./Projects.css";

export default function Projects() {
    const { team_id } = useParams();

    const current_team = workspace.currentTeam;
    const current_project = workspace.currentProject;

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState(
        current_project?.id ?? current_team?.projects?.[0]?.id ?? null
    );

    const projects = current_team?.projects ?? [];

    const filteredProjects = useMemo(() => {
        return projects.filter((project) =>
            project.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery]);

    const selectedProject = projects.find(
        (project) => project.id === selectedProjectId
    );

    const projectName =
        selectedProject?.name ??
        current_project?.name ??
        "Select a project";
    
    let selectedCard = null;
    let mouseClicked = false;
    let offsetX = 0;
    let offsetY = 0;

    const handleProjectSelect = (projectId) => {
        setSelectedProjectId(projectId);
    };

    const handleAddProject = () => {
        console.log("Create project for team:", team_id);
    };

    const handleTeamSettings = (teamId) => {
        console.log("Team settings:", teamId);
    };

    const handleAddTask = (status) => {
        console.log("Add task to:", status);
    };

    const handleTaskSettings = (taskId) => {
        console.log("Task settings:", taskId);
    };

    const handleProjectSettings = () => {
        console.log("Project settings:", selectedProjectId);
    };

    return (
        <div className="projects-page">
            <aside className="projects-sidebar">
                <div className="projects-sidebar-header">
                    <TeamSelector
                        id={current_team?.id}
                        name={current_team?.name ?? "Unnamed Team"}
                        onSettings={handleTeamSettings}
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
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <ProjectPreview
                                key={project.id}
                                id={project.id}
                                name={project.name}
                                notifications={project.notifications}
                                most_recent_log={project.most_recent_log}
                                selected={project.id === selectedProjectId}
                                onClick={handleProjectSelect}
                            />
                        ))
                    ) : (
                        <div className="projects-no-results">
                            <Search size={24} strokeWidth={1.5} />
                            <p>No projects found</p>
                            <span>Try a different search term.</span>
                        </div>
                    )}
                </div>

                <div className="projects-sidebar-footer">
                    <span className="projects-sidebar-status-dot" />
                    <span>Workspace</span>
                    <span className="projects-sidebar-team-name">
                        {current_team?.name ?? "Team"}
                    </span>
                </div>
            </aside>

            <main className="projects-board-area">
                <Board
                    key={selectedProjectId}
                    project_name={projectName}
                    onAddTask={handleAddTask}
                    onTaskSettings={handleTaskSettings}
                    onProjectSettings={handleProjectSettings}
                />
            </main>
        </div>
    );
}
