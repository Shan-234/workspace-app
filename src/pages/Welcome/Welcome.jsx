
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import './Welcome.css';

const pages = [
    {
        label: "WELCOME",
        title: "Your workspace, simplified.",
        description:
            "Welcome! Keep track of project deadlines, organize activities, and collaborate seamlessly with your teammates."
    },
    {
        label: "GETTING STARTED",
        title: "No account? No problem.",
        description:
            "We'll automatically create a guest account for you. You can personalize your username from your dashboard."
    },
    {
        label: "YOUR DASHBOARD",
        title: "Everything in one place.",
        description:
            "Your dashboard gives you a clear overview of your projects, teams, and ongoing activities."
    },
    {
        label: "COLLABORATION",
        title: "Better work, together.",
        description:
            "Select a team to enter its workspace, manage projects, organize tasks, and stay on top of deadlines."
    },
    {
        label: "ALL SET",
        title: "Let's get to work.",
        description:
            "You're ready to get started. Head over to your dashboard and bring your next great project to life!"
    }
];

export default function Welcome() {
    const [index, setIndex] = useState(0);
    const navigate = useNavigate();

    const isLastPage = index === pages.length - 1;

    const onNext = () => {
        if (isLastPage) {
            navigate('/dashboard');
        } else {
            setIndex(prev => prev + 1);
        }
    };

    const onBack = () => {
        setIndex(prev => Math.max(0, prev - 1));
    };

    const onSkip = () => {
        navigate('/dashboard');
    };

    return (
        <main className="welcome-container">
            <div className="welcome-glow welcome-glow-one" />
            <div className="welcome-glow welcome-glow-two" />

            <div className="welcome-brand">
                <div className="brand-icon">✦</div>
                <span>WORKSPACE</span>
            </div>

            <div className="welcome-card">
                <div className="welcome-card-top">
                    <span className="step-label">
                        STEP {String(index + 1).padStart(2, '0')}
                        {" / "}
                        {String(pages.length).padStart(2, '0')}
                    </span>
                    <span className="step-category">
                        {pages[index].label}
                    </span>
                </div>

                <div className="welcome-progress">
                    <motion.div
                        className="welcome-progress-fill"
                        animate={{
                            width: `${((index + 1) / pages.length) * 100}%`
                        }}
                        transition={{ duration: 0.4 }}
                    />
                </div>

                <div className="welcome-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -18 }}
                            transition={{ duration: 0.25 }}
                            className="welcome-message"
                        >
                            <div className="welcome-symbol">✦</div>
                            <h1>{pages[index].title}</h1>
                            <p>{pages[index].description}</p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="welcome-pagination">
                    {pages.map((_, pageIndex) => (
                        <button
                            key={pageIndex}
                            type="button"
                            className={`page-number ${
                                pageIndex === index ? 'active' : ''
                            }`}
                            onClick={() => setIndex(pageIndex)}
                            aria-label={`Go to step ${pageIndex + 1}`}
                            aria-current={
                                pageIndex === index ? 'step' : undefined
                            }
                        >
                            {pageIndex + 1}
                        </button>
                    ))}
                </div>

                <div className="welcome-actions">
                    <button
                        className="back-button"
                        onClick={onBack}
                        disabled={index === 0}
                    >
                        ← Back
                    </button>

                    <button
                        className="next-button"
                        onClick={onNext}
                    >
                        {isLastPage ? 'Go to Dashboard' : 'Continue'}
                        <span>→</span>
                    </button>
                </div>
            </div>

            <button className="skip-button" onClick={onSkip}>
                Skip introduction
                <span> ↗</span>
            </button>

            <p className="welcome-footer">
                PLAN SMARTER · BUILD BETTER · TOGETHER
            </p>
        </main>
    );
}