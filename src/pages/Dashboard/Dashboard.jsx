
import { useState, useEffect, useRef } from "react";
import Label from "../../components/Label/Label";
import Team from "../../components/Team/Team";
import "./Dashboard.css";
import { useLocation, useNavigate } from "react-router";
import { createAccount, editUsername, getUserProgress, retrieveAccount, supabase, workspace } from "../../lib/Supabase/supabase";
import EditTeams from "../../components/EditTeams/EditTeams";

function AnimatedPage({
    items,
    pageSize,
    renderItem,
    gridClassName,
    itemName
}) {
    const [pageIndex, setPageIndex] = useState(0);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const transitionTimer = useRef(null);
    const unlockTimer = useRef(null);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    const changePage = (direction) => {
        if (isChanging) return;

        const nextPage = pageIndex + direction;
        if (nextPage < 0 || nextPage >= totalPages) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setPageIndex(nextPage);
            return;
        }

        setIsChanging(true);
        setIsLeaving(true);

        transitionTimer.current = window.setTimeout(() => {
            setPageIndex(nextPage);
            setIsLeaving(false);

            unlockTimer.current = window.setTimeout(() => {
                setIsChanging(false);
            }, 520);
        }, 170);
    };

    useEffect(() => {
        return () => {
            window.clearTimeout(transitionTimer.current);
            window.clearTimeout(unlockTimer.current);
        };
    }, []);

    const firstItem = items.length === 0
        ? 0
        : pageIndex * pageSize + 1;

    const lastItem = Math.min(
        (pageIndex + 1) * pageSize,
        items.length
    );

    return (
        <div className="dashboard-paged-content">
            <div className="dashboard-page-viewport">
                <div
                    key={pageIndex}
                    className={
                        `dashboard-page-grid ${gridClassName}` +
                        (isLeaving ? " dashboard-page-leaving" : "")
                    }
                >
                    {items
                        .slice(
                            pageIndex * pageSize,
                            (pageIndex + 1) * pageSize
                        )
                        .map(renderItem)}
                </div>
            </div>

            <div className="dashboard-pagination">
                <span className="pagination-info">
                    Showing {firstItem}–{lastItem} of {items.length}
                </span>

                <div className="pagination-actions">
                    <button
                        className="dashboard-button"
                        disabled={pageIndex === 0 || isChanging}
                        onClick={() => changePage(-1)}
                        aria-label={`Previous ${itemName} page`}
                    >
                        ← Previous
                    </button>

                    <button
                        className="dashboard-button"
                        disabled={pageIndex >= totalPages - 1 || isChanging}
                        onClick={() => changePage(1)}
                        aria-label={`Next ${itemName} page`}
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}

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

async function signIn() {
    const {
        data,
        error: signInError
    } = await supabase.auth.signInAnonymously();

    if (signInError) {
        throw signInError;
    }

    return data.user.id;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();

    const { user_id } = location.state ?? {};

    const [editTeams, setEditTeams] = useState(false);

    const [userId, setUserId] = useState("");
    const [username, setUsername] = useState("");
    const [userLabels, setUserLabels] = useState({});
    const [userTeams, setUserTeams] = useState({});
    const [userProgress, setUserProgress] = useState({
        tasks_completed: "...",
        tasks_due_soon: "...",
        tasks_overdue: "...",
        tasks_total: "..."
    });
    const [loading, setLoading] = useState(true);

    // Username dialog state
    const [showUsernameDialog, setShowUsernameDialog] = useState(false);
    const [newUsername, setNewUsername] = useState("");

    const slidesRef = useRef(null);
    const [activeSlide, setActiveSlide] = useState(0);

    const labelPageSize = 16;
    const teamPageSize = 12;

    const slideItems = [
        { id: "progress-info", name: "Overview" },
        { id: "labels", name: "Organization" },
        { id: "teams", name: "Collaboration" }
    ];

    const initializeUserInformation = () => {
        setUsername(workspace.currentUser["username"]);
        setUserLabels(workspace.currentUser["user_labels"]);
        setUserTeams(workspace.currentUser["user_teams"]);

        getUserProgress().then((result) => {
            setUserProgress(result);
        });

        setLoading(false);
    };

    useEffect(() => {
        if (user_id) {
            setUserId(user_id);
            retrieveAccount(user_id).then(() => {
                initializeUserInformation();
            });
        } else {
            getSessionId().then((session_id) => {
                if (session_id) {
                    setUserId(session_id);
                    retrieveAccount(session_id).then(() => {
                        initializeUserInformation();
                    });
                } else {
                    signIn().then((new_id) => {
                        setUserId(new_id);
                        createAccount(new_id).then(() => {
                            initializeUserInformation();
                        });
                    });
                }
            });
        }
    }, []);

    // Username dialog handlers
    const openUsernameDialog = () => {
        setNewUsername(username);
        setShowUsernameDialog(true);
    };

    const closeUsernameDialog = () => {
        setShowUsernameDialog(false);
    };

    const saveUsername = (event) => {
        event.preventDefault();

        if (!newUsername.trim()) return;

        editUsername(newUsername).then((success) => {
            if (success) {
                setUsername(newUsername);
            } else {
                console.error("Error updating username");
            }
        });

        closeUsernameDialog();
    };

    const navigateToSlide = (index) => {
        const container = slidesRef.current;
        const slide = container?.querySelectorAll(".dashboard-slide")[index];

        if (!container || !slide) return;

        const top =
            slide.getBoundingClientRect().top -
            container.getBoundingClientRect().top +
            container.scrollTop;

        container.scrollTo({
            top,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth"
        });
    };

    // Updated: initialize slides only after loading finishes.
    useEffect(() => {
        if (loading) return;

        const container = slidesRef.current;
        if (!container) return;

        const slides = Array.from(
            container.querySelectorAll(".dashboard-slide")
        );

        slides[0]?.classList.add("slide-visible");

        const updateActiveSlide = () => {
            const containerRect = container.getBoundingClientRect();
            const center = containerRect.top + container.clientHeight / 2;

            let closestIndex = 0;
            let closestDistance = Infinity;

            slides.forEach((slide, index) => {
                const rect = slide.getBoundingClientRect();
                const slideCenter = rect.top + rect.height / 2;
                const distance = Math.abs(center - slideCenter);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            });

            setActiveSlide(closestIndex);
        };

        container.addEventListener("scroll", updateActiveSlide, {
            passive: true
        });

        updateActiveSlide();

        if (!("IntersectionObserver" in window)) {
            slides.forEach(slide => slide.classList.add("slide-visible"));

            return () => {
                container.removeEventListener("scroll", updateActiveSlide);
            };
        }

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    entry.target.classList.toggle(
                        "slide-visible",
                        entry.isIntersecting
                    );
                });
            },
            {
                root: container,
                threshold: 0.45
            }
        );

        slides.forEach(slide => observer.observe(slide));

        return () => {
            observer.disconnect();
            container.removeEventListener("scroll", updateActiveSlide);
        };
    }, [loading]);

    if (loading) {
        return (
            <main className="dashboard-loading">
                <div className="dashboard-loading-content">
                    <div className="dashboard-loading-spinner"></div>
                    <h2>WORKSPACE</h2>
                    <p>Loading your workspace...</p>
                </div>
            </main>
        );
    }

    if (editTeams) {
        return <EditTeams onCancel={() => { window.location.reload() }} />;
    }

    return (
        <main className="dashboard">
            <div className="dashboard-container">
                <header id="welcome-text" className="dashboard-header">
                    <div className="dashboard-header-inner">
                        <div>
                            <p className="dashboard-eyebrow">
                                WORKSPACE / DASHBOARD
                            </p>
                            <h1>
                                Welcome, <span>{username}</span>
                            </h1>
                            <p className="dashboard-subtitle">
                                Here's what's happening with your workspace.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="dashboard-button"
                            onClick={openUsernameDialog}
                        >
                            Edit Username
                        </button>
                    </div>
                </header>

                <div className="dashboard-body">
                    <nav
                        className="dashboard-slide-nav"
                        aria-label="Dashboard slide navigation"
                    >
                        <div className="slide-nav-heading">
                            <span className="slide-nav-heading-line" />
                            <span>SECTIONS</span>
                        </div>

                        <div className="slide-nav-items">
                            {slideItems.map((slide, index) => (
                                <button
                                    key={slide.id}
                                    type="button"
                                    className={
                                        "slide-nav-item" +
                                        (activeSlide === index
                                            ? " slide-nav-item-active"
                                            : "")
                                    }
                                    onClick={() => navigateToSlide(index)}
                                    aria-label={`Go to ${slide.name}`}
                                    aria-current={
                                        activeSlide === index
                                            ? "step"
                                            : undefined
                                    }
                                >
                                    <span className="slide-nav-track">
                                        <span className="slide-nav-dot" />
                                    </span>

                                    <span className="slide-nav-item-content">
                                        <span className="slide-nav-number">
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <span className="slide-nav-name">
                                            {slide.name}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="slide-nav-footer">
                            <span className="slide-nav-current">
                                {String(activeSlide + 1).padStart(2, "0")}
                            </span>
                            <span className="slide-nav-separator">/</span>
                            <span>
                                {String(slideItems.length).padStart(2, "0")}
                            </span>
                        </div>
                    </nav>

                    <div
                        className="dashboard-slides"
                        ref={slidesRef}
                        aria-label="Dashboard sections"
                    >
                        <section
                            id="progress-info"
                            className="dashboard-slide slide-visible"
                        >
                            <div className="dashboard-slide-inner">
                                <div className="dashboard-slide-content">
                                    <div className="dashboard-section-header">
                                        <div>
                                            <p className="dashboard-section-eyebrow">
                                                01 / OVERVIEW
                                            </p>
                                            <h2>Your Progress</h2>
                                        </div>
                                        <span className="dashboard-overview-badge">
                                            Overview
                                        </span>
                                    </div>

                                    <div className="dashboard-stats">
                                        <div id="total-tasks" className="dashboard-stat-card">
                                            <div className="stat-header">
                                                <h3>Total Tasks</h3>
                                                <span className="stat-icon stat-purple">▦</span>
                                            </div>
                                            <h1>{userProgress.tasks_total}</h1>
                                        </div>

                                        <div id="tasks-completed" className="dashboard-stat-card">
                                            <div className="stat-header">
                                                <h3>Tasks Completed</h3>
                                                <span className="stat-icon stat-green">✓</span>
                                            </div>
                                            <h1>{userProgress.tasks_completed}</h1>
                                        </div>

                                        <div id="tasks-due-soon" className="dashboard-stat-card">
                                            <div className="stat-header">
                                                <h3>Tasks Due Soon</h3>
                                                <span className="stat-icon stat-yellow">◷</span>
                                            </div>
                                            <h1>{userProgress.tasks_due_soon}</h1>
                                        </div>

                                        <div id="tasks-overdue" className="dashboard-stat-card">
                                            <div className="stat-header">
                                                <h3>Tasks Overdue</h3>
                                                <span className="stat-icon stat-red">!</span>
                                            </div>
                                            <h1>{userProgress.tasks_overdue}</h1>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="labels" className="dashboard-slide">
                            <div className="dashboard-slide-inner">
                                <div className="dashboard-slide-content">
                                    <div className="dashboard-section-header">
                                        <div>
                                            <p className="dashboard-section-eyebrow">
                                                02 / ORGANIZATION
                                            </p>
                                            <h2>Your Labels</h2>
                                            <p className="dashboard-section-subtitle">
                                                Organize your work with custom labels
                                            </p>
                                        </div>
                                        <button className="dashboard-button">
                                            Edit
                                        </button>
                                    </div>

                                    {Object.keys(userLabels).length > 0 ? (
                                        <AnimatedPage
                                            items={Object.entries(userLabels).map(([id, label]) => ({
                                                id: Number(id),
                                                ...label
                                            }))}
                                            pageSize={labelPageSize}
                                            gridClassName="dashboard-labels-list"
                                            itemName="labels"
                                            renderItem={label => (
                                                <Label
                                                    key={label.id}
                                                    name={label.name}
                                                    color={label.color}
                                                    size="medium"
                                                />
                                            )}
                                        />
                                    ) : (
                                        <div className="dashboard-labels-empty">
                                            <h3>You haven't created any labels yet</h3>
                                            <p>
                                                Click <strong>Edit</strong> to create labels and organize your tasks.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section id="teams" className="dashboard-slide">
                            <div className="dashboard-slide-inner">
                                <div className="dashboard-slide-content">
                                    <div className="dashboard-section-header">
                                        <div>
                                            <p className="dashboard-section-eyebrow">
                                                03 / COLLABORATION
                                            </p>
                                            <h2>Your Teams</h2>
                                            <p className="dashboard-section-subtitle">
                                                Access your shared workspaces
                                            </p>
                                        </div>
                                        <button
                                            className="dashboard-button"
                                            onClick={() => { setEditTeams(true); }}
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    {Object.keys(userTeams).length > 0 ? (
                                        <AnimatedPage
                                            items={Object.entries(userTeams).map(([id, team]) => ({
                                                id: id,
                                                ...team
                                            }))}
                                            pageSize={teamPageSize}
                                            gridClassName="dashboard-teams-list"
                                            itemName="teams"
                                            renderItem={team => (
                                                <Team
                                                    key={team.id}
                                                    id={team.id}
                                                    name={team.name}
                                                    description={team.description}
                                                />
                                            )}
                                        />
                                    ) : (
                                        <div className="dashboard-teams-empty">
                                            <h3>You haven't joined any teams yet</h3>
                                            <p>
                                                Click <strong>Edit</strong> to join a team and start collaborating.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {showUsernameDialog && (
                <div className="username-dialog-overlay">
                    <div
                        className="username-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="username-dialog-title"
                    >
                        <h2 id="username-dialog-title">
                            Edit Username
                        </h2>

                        <p>
                            Update the name displayed on your workspace.
                        </p>

                        <form onSubmit={saveUsername}>
                            <div className="username-dialog-field">
                                <label htmlFor="new-username">
                                    Username
                                </label>

                                <input
                                    id="new-username"
                                    type="text"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="username-dialog-actions">
                                <button
                                    type="button"
                                    className="username-dialog-cancel"
                                    onClick={closeUsernameDialog}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="username-dialog-save"
                                    disabled={!newUsername.trim()}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
