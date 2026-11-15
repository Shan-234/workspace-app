
import { useState, useEffect, useRef } from "react";
import Label from "../../components/Label/Label";
import Team from "../../components/Team/Team";
import "./Dashboard.css";
import { useLocation, useNavigate } from "react-router";
import { supabase } from "../../lib/Supabase/supabase";

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

    const [userId, setUserId] = useState("");

    const slidesRef = useRef(null);
    const [activeSlide, setActiveSlide] = useState(0);

    const username = "user_123";
    const labelPageSize = 16;
    const teamPageSize = 12;

    const slideItems = [
        { id: "progress-info", name: "Overview" },
        { id: "labels", name: "Organization" },
        { id: "teams", name: "Collaboration" }
    ];

    useEffect(() => {
        if (user_id) {
            setUserId(user_id);
        } else {
            getSessionId().then((session_id) => {
                if (session_id) {
                    setUserId(session_id);
                } else {
                    signIn().then((new_id) => {
                        setUserId(new_id);
                    });
                }
            });
        }
    }, []);

    const user_progress = {
        tasks_total: 29,
        tasks_completed: 5,
        tasks_due_soon: 10,
        tasks_overdue: 2
    };

    const user_labels = [
        { id: 1, name: "Bug", description: "Software defects and issues.", color: "#EF4444" },
        { id: 2, name: "Feature", description: "New functionality and features.", color: "#3B82F6" },
        { id: 3, name: "Enhancement", description: "Improvements to existing functionality.", color: "#8B5CF6" },
        { id: 4, name: "Documentation", description: "Documentation and technical guides.", color: "#06B6D4" },
        { id: 5, name: "Testing", description: "Software testing and quality assurance.", color: "#F59E0B" },
        { id: 6, name: "Design", description: "UI/UX and system design.", color: "#EC4899" },
        { id: 7, name: "Research", description: "Research and experimentation.", color: "#14B8A6" },
        { id: 8, name: "High Priority", description: "Urgent tasks requiring attention.", color: "#DC2626" },
        { id: 9, name: "Low Priority", description: "Tasks with lower urgency.", color: "#84CC16" },
        { id: 10, name: "Blocked", description: "Tasks waiting on dependencies.", color: "#F97316" },
        { id: 11, name: "Back-end", description: "Server-side application development.", color: "#6366F1" },
        { id: 12, name: "Front-end", description: "Client-side application development.", color: "#22C55E" },
        { id: 13, name: "Security", description: "Application security improvements.", color: "#E11D48" },
        { id: 14, name: "Performance", description: "Speed and scalability improvements.", color: "#0EA5E9" },
        { id: 15, name: "Deployment", description: "Deployment and release management.", color: "#A855F7" },
        { id: 16, name: "Database", description: "Database development and maintenance.", color: "#10B981" },
        { id: 17, name: "API", description: "API development and integration.", color: "#2563EB" },
        { id: 18, name: "Refactoring", description: "Code restructuring and cleanup.", color: "#D946EF" },
        { id: 19, name: "Maintenance", description: "Routine software maintenance.", color: "#64748B" },
        { id: 20, name: "Infrastructure", description: "Infrastructure development.", color: "#0891B2" },
        { id: 21, name: "Automation", description: "Workflow and process automation.", color: "#7C3AED" },
        { id: 22, name: "Integration", description: "Integration with external services.", color: "#0D9488" },
        { id: 23, name: "Accessibility", description: "Accessibility improvements.", color: "#65A30D" },
        { id: 24, name: "Optimization", description: "Resource and performance optimization.", color: "#EA580C" },
        { id: 25, name: "Code Review", description: "Reviewing and improving code quality.", color: "#9333EA" },
        { id: 26, name: "Planning", description: "Project planning and organization.", color: "#0284C7" },
        { id: 27, name: "Analytics", description: "Data analysis and reporting.", color: "#059669" },
        { id: 28, name: "Monitoring", description: "System monitoring and observability.", color: "#DB2777" },
        { id: 29, name: "DevOps", description: "Development operations and tooling.", color: "#4F46E5" },
        { id: 30, name: "Cloud", description: "Cloud infrastructure and services.", color: "#0E7490" },
        { id: 31, name: "Machine Learning", description: "Machine learning development.", color: "#C026D3" },
        { id: 32, name: "Data Processing", description: "Data transformation and processing.", color: "#16A34A" },
        { id: 33, name: "Authentication", description: "User authentication and authorization.", color: "#BE123C" },
        { id: 34, name: "Networking", description: "Network communication and protocols.", color: "#1D4ED8" },
        { id: 35, name: "Mobile", description: "Mobile application development.", color: "#CA8A04" },
        { id: 36, name: "UI Components", description: "Reusable interface components.", color: "#E879F9" },
        { id: 37, name: "User Feedback", description: "Feedback and feature requests.", color: "#F43F5E" },
        { id: 38, name: "Release", description: "Release preparation and coordination.", color: "#38BDF8" },
        { id: 39, name: "Prototyping", description: "Rapid prototypes and experiments.", color: "#A3E635" },
        { id: 40, name: "Technical Debt", description: "Addressing accumulated technical debt.", color: "#FB923C" }
    ];

    const user_teams = [
        { id: 21, name: "App Dev", notifications: 2 },
        { id: 22, name: "Web Development", notifications: 5 },
        { id: 23, name: "UI/UX Design", notifications: 3 },
        { id: 24, name: "Back-end Engineering", notifications: 0 },
        { id: 25, name: "Data Science", notifications: 7 },
        { id: 26, name: "Quality Assurance", notifications: 1 },
        { id: 27, name: "DevOps", notifications: 4 },
        { id: 28, name: "Product Management", notifications: 6 },
        { id: 29, name: "AI Research", notifications: 0 },
        { id: 30, name: "Cybersecurity", notifications: 2 },
        { id: 31, name: "Database Engineering", notifications: 8 },
        { id: 32, name: "Cloud Infrastructure", notifications: 3 },
        { id: 33, name: "Mobile Development", notifications: 4 },
        { id: 34, name: "Platform Engineering", notifications: 1 },
        { id: 35, name: "API Development", notifications: 6 },
        { id: 36, name: "Machine Learning", notifications: 9 },
        { id: 37, name: "Data Engineering", notifications: 2 },
        { id: 38, name: "Infrastructure Operations", notifications: 5 },
        { id: 39, name: "Release Management", notifications: 0 },
        { id: 40, name: "Automation Engineering", notifications: 3 },
        { id: 41, name: "Technical Documentation", notifications: 1 },
        { id: 42, name: "Research and Development", notifications: 7 },
        { id: 43, name: "Systems Architecture", notifications: 4 },
        { id: 44, name: "Network Engineering", notifications: 2 },
        { id: 45, name: "Application Security", notifications: 8 },
        { id: 46, name: "Business Analytics", notifications: 3 },
        { id: 47, name: "Customer Experience", notifications: 5 },
        { id: 48, name: "Design Systems", notifications: 1 },
        { id: 49, name: "Performance Engineering", notifications: 6 },
        { id: 50, name: "Site Reliability", notifications: 4 },
        { id: 51, name: "Cloud Security", notifications: 2 },
        { id: 52, name: "Developer Experience", notifications: 7 },
        { id: 53, name: "Product Research", notifications: 0 },
        { id: 54, name: "Data Visualization", notifications: 3 },
        { id: 55, name: "Integration Services", notifications: 5 },
        { id: 56, name: "Testing Automation", notifications: 2 },
        { id: 57, name: "Enterprise Applications", notifications: 8 },
        { id: 58, name: "Distributed Systems", notifications: 4 },
        { id: 59, name: "Innovation Lab", notifications: 6 },
        { id: 60, name: "Technical Support", notifications: 1 }
    ];

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

    useEffect(() => {
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
    }, []);

    const NavigateToProjects = (team_id) => {

    };

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
                        <button className="dashboard-button">
                            Edit Profile
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
                                            <h1>{user_progress.tasks_total}</h1>
                                        </div>

                                        <div id="tasks-completed" className="dashboard-stat-card">
                                            <div className="stat-header">
                                                <h3>Tasks Completed</h3>
                                                <span className="stat-icon stat-green">✓</span>
                                            </div>
                                            <h1>{user_progress.tasks_completed}</h1>
                                        </div>

                                        <div id="tasks-due-soon" className="dashboard-stat-card">
                                            <div className="stat-header">
                                                <h3>Tasks Due Soon</h3>
                                                <span className="stat-icon stat-yellow">◷</span>
                                            </div>
                                            <h1>{user_progress.tasks_due_soon}</h1>
                                        </div>

                                        <div id="tasks-overdue" className="dashboard-stat-card">
                                            <div className="stat-header">
                                                <h3>Tasks Overdue</h3>
                                                <span className="stat-icon stat-red">!</span>
                                            </div>
                                            <h1>{user_progress.tasks_overdue}</h1>
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

                                    <AnimatedPage
                                        items={user_labels}
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
                                        <button className="dashboard-button">
                                            Edit
                                        </button>
                                    </div>

                                    <AnimatedPage
                                        items={user_teams}
                                        pageSize={teamPageSize}
                                        gridClassName="dashboard-teams-list"
                                        itemName="teams"
                                        renderItem={team => (
                                            <Team
                                                key={team.id}
                                                id={team.id}
                                                name={team.name}
                                                notifications={team.notifications}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
