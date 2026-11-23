
import { useState } from "react";
import { useNavigate } from "react-router";
import "./TeamCreated.css";

export default function TeamCreated({ name, description, joinCode, onBackToDashboard }) {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const copyJoinCode = async () => {
        if (!joinCode) return;

        try {
            await navigator.clipboard.writeText(String(joinCode));
            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to copy join code:", error);
        }
    };

    const goToDashboard = () => {
        onBackToDashboard();
    };

    return (
        <main className="team-created">
            <div className="team-created-panel">
                <div className="team-created-header">
                    <div className="team-created-success-icon">
                        ✓
                    </div>

                    <h1>Team Created!</h1>

                    <p>
                        Your team has been created successfully.
                        Share the join code to invite others.
                    </p>
                </div>

                <div className="team-created-details">
                    <div className="team-created-field">
                        <span className="team-created-label">
                            Name
                        </span>

                        <div className="team-created-value">
                            {name || "Unnamed Team"}
                        </div>
                    </div>

                    <div className="team-created-field">
                        <span className="team-created-label">
                            Description
                        </span>

                        <div className="team-created-value team-created-description">
                            {description || "No description provided."}
                        </div>
                    </div>

                    <div className="team-created-field">
                        <span className="team-created-label">
                            Join Code
                        </span>

                        <div className="team-created-code-container">
                            <code className="team-created-code">
                                {joinCode || "Unavailable"}
                            </code>

                            <button
                                type="button"
                                className={
                                    "team-created-copy" +
                                    (copied ? " team-created-copy-success" : "")
                                }
                                onClick={copyJoinCode}
                                disabled={!joinCode}
                                title={copied ? "Copied!" : "Copy join code"}
                                aria-label="Copy join code"
                            >
                                {copied ? (
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                ) : (
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect
                                            x="8"
                                            y="8"
                                            width="13"
                                            height="13"
                                            rx="2"
                                        />
                                        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {copied && (
                            <span className="team-created-copied-message">
                                Copied to clipboard!
                            </span>
                        )}
                    </div>
                </div>

                <div className="team-created-actions">
                    <button
                        type="button"
                        className="team-created-dashboard-button"
                        onClick={goToDashboard}
                    >
                        <span>←</span>
                        Go To Dashboard
                    </button>
                </div>
            </div>
        </main>
    );
}
