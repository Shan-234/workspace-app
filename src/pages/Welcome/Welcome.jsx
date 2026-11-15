
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { supabase } from "../../lib/Supabase/supabase";
import "./Welcome.css";

const pages = [
    {
        label: "WELCOME",
        title: "Your workspace, simplified.",
        description:
            "Welcome! Keep track of project deadlines, organize activities, and collaborate seamlessly with your teammates.",
        number: "01",
        detail: "A better way to organize your work.",
        keywords: ["PLAN", "ORGANIZE", "COLLABORATE"]
    },
    {
        label: "GETTING STARTED",
        title: "No account? No problem.",
        description:
            "We'll automatically create a guest account for you. You can personalize your username from your dashboard.",
        number: "02",
        detail: "Start immediately, without the extra steps.",
        keywords: ["GUEST ACCESS", "PERSONALIZE", "GET STARTED"]
    },
    {
        label: "YOUR DASHBOARD",
        title: "Everything in one place.",
        description:
            "Your dashboard gives you a clear overview of your projects, teams, and ongoing activities.",
        number: "03",
        detail: "Stay informed about what matters most.",
        keywords: ["OVERVIEW", "PROGRESS", "ACTIVITY"]
    },
    {
        label: "COLLABORATION",
        title: "Better work, together.",
        description:
            "Select a team to enter its workspace, manage projects, organize tasks, and stay on top of deadlines.",
        number: "04",
        detail: "Keep everyone moving in the same direction.",
        keywords: ["TEAMS", "PROJECTS", "TASKS"]
    },
    {
        label: "ALL SET",
        title: "Let's get to work.",
        description:
            "You're ready to get started. Head over to your dashboard and bring your next great project to life!",
        number: "05",
        detail: "Your next project starts here.",
        keywords: ["CREATE", "BUILD", "ACHIEVE"]
    }
];

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

export default function Welcome() {
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();

    const isLastPage = index === pages.length - 1;
    const currentPage = pages[index];

    useEffect(() => {
        getSessionId().then((result) => {
            if (result) {
                navigate("/dashboard", {
                    state: {
                        user_id: result
                    }
                });     
            }
        })
        .catch(console.error)
        .finally(() => {
            if (loading) {
                setLoading(false);
            }
        });
    }, []);

    const onNext = () => {
        if (isLastPage) {
            navigate("/dashboard", {
                state: {
                    user_id: null
                }
            });
        } else {
            setIndex(prev => prev + 1);
        }
    };

    const onBack = () => {
        setIndex(prev => Math.max(0, prev - 1));
    };

    const onSkip = () => {
        navigate("/dashboard", {
            state: {
                user_id: null
            }
        });
    };

    return (
        <main className="welcome-container">
            <div className="welcome-glow welcome-glow-one" />
            <div className="welcome-glow welcome-glow-two" />

            <header className="welcome-header">
                <div className="welcome-brand">
                    <div className="brand-icon">✦</div>
                    <span>WORKSPACE</span>
                </div>

                <div className="welcome-header-right">
                    <span className="welcome-header-caption">
                        YOUR WORKSPACE STARTS HERE
                    </span>

                    <button
                        type="button"
                        className="skip-button"
                        onClick={onSkip}
                    >
                        Skip introduction
                        <span>↗</span>
                    </button>
                </div>
            </header>

            <div className="welcome-main">
                <section className="welcome-content">
                    <div className="welcome-content-top">
                        <span className="welcome-eyebrow">
                            INTRODUCING YOUR WORKSPACE
                        </span>

                        <div className="welcome-content-rule" />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={index}
                            className="welcome-message"
                            initial={
                                reduceMotion
                                    ? false
                                    : { opacity: 0, y: 24 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                                reduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: -18 }
                            }
                            transition={{
                                duration: reduceMotion ? 0 : 0.32,
                                ease: [0.22, 1, 0.36, 1]
                            }}
                        >
                            <div className="welcome-symbol">✦</div>

                            <span className="welcome-message-category">
                                {currentPage.label}
                            </span>

                            <h1>{currentPage.title}</h1>

                            <p className="welcome-description">
                                {currentPage.description}
                            </p>

                            <div className="welcome-keywords">
                                {currentPage.keywords.map(keyword => (
                                    <span
                                        className="welcome-keyword"
                                        key={keyword}
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="welcome-content-bottom">
                        <span className="welcome-content-bottom-line" />
                        <p>PLAN SMARTER · BUILD BETTER · TOGETHER</p>
                    </div>
                </section>

                <aside className="welcome-side-panel">
                    <div className="welcome-panel-top">
                        <span className="welcome-panel-eyebrow">
                            GETTING STARTED
                        </span>

                        <span className="welcome-panel-count">
                            {currentPage.number}
                            <span> / 05</span>
                        </span>
                    </div>

                    <div className="welcome-panel-center">
                        <span className="welcome-panel-caption">
                            YOUR JOURNEY
                        </span>

                        <div className="welcome-steps">
                            {pages.map((page, pageIndex) => (
                                <button
                                    key={page.number}
                                    type="button"
                                    className={
                                        "welcome-step" +
                                        (pageIndex === index
                                            ? " welcome-step-active"
                                            : "") +
                                        (pageIndex < index
                                            ? " welcome-step-completed"
                                            : "")
                                    }
                                    onClick={() => setIndex(pageIndex)}
                                    aria-label={`Go to step ${pageIndex + 1}: ${page.label}`}
                                    aria-current={
                                        pageIndex === index
                                            ? "step"
                                            : undefined
                                    }
                                >
                                    <span className="welcome-step-indicator">
                                        <span className="welcome-step-dot" />
                                    </span>

                                    <span className="welcome-step-text">
                                        <span className="welcome-step-number">
                                            STEP {page.number}
                                        </span>

                                        <span className="welcome-step-name">
                                            {page.label}
                                        </span>
                                    </span>

                                    {pageIndex === index && (
                                        <span className="welcome-step-arrow">
                                            ↗
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="welcome-panel-bottom">
                        <div className="welcome-progress-header">
                            <span>YOUR PROGRESS</span>
                            <span>
                                {Math.round(
                                    ((index + 1) / pages.length) * 100
                                )}%
                            </span>
                        </div>

                        <div className="welcome-progress">
                            <motion.div
                                className="welcome-progress-fill"
                                animate={{
                                    width: `${((index + 1) / pages.length) * 100}%`
                                }}
                                transition={{
                                    duration: reduceMotion ? 0 : 0.4
                                }}
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.p
                                key={index}
                                className="welcome-panel-detail"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: reduceMotion ? 0 : 0.2
                                }}
                            >
                                {currentPage.detail}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </aside>
            </div>

            <footer className="welcome-bottom-bar">
                <div className="welcome-bottom-left">
                    <span className="welcome-bottom-label">
                        CURRENT SECTION
                    </span>

                    <span className="welcome-bottom-current">
                        {currentPage.number}
                        <span> — </span>
                        {currentPage.label}
                    </span>
                </div>

                <div className="welcome-actions">
                    <button
                        type="button"
                        className="back-button"
                        onClick={onBack}
                        disabled={index === 0}
                    >
                        <span>←</span>
                        Back
                    </button>

                    <button
                        type="button"
                        className="next-button"
                        onClick={onNext}
                    >
                        {isLastPage
                            ? "Go to Dashboard"
                            : "Continue"}
                        <span>→</span>
                    </button>
                </div>
            </footer>
        </main>
    );
}
