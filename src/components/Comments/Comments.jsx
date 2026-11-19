
import { useState, useEffect, useRef } from "react";
import {
    supabase,
    createNewComment,
    workspace
} from "../../lib/Supabase/supabase";
import CommentMessage from "../CommentMessage/CommentMessage";
import "./Comments.css";

function parseTimestamp(timestamp) {
    if (!timestamp) return new Date(NaN);

    return new Date(timestamp.replace(" ", "T"));
}

function formatDate(timestamp) {
    const date = parseTimestamp(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatDateTime(timestamp) {
    const date = parseTimestamp(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function getDateKey(timestamp) {
    const date = parseTimestamp(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

export default function Comments() {
    const [activeTab, setActiveTab] = useState("comments");
    const [message, setMessage] = useState("");
    const [comments, setComments] = useState(
        () => [...(workspace.currentTask?.comments ?? [])]
    );

    const commentsContainerRef = useRef(null);
    const hasMountedRef = useRef(false);

    const taskId = workspace.currentTask?.id;

    useEffect(() => {
        if (!taskId) return;

        const channel = supabase
            .channel(`comments-task-${taskId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "comments",
                    filter: `task_id=eq.${taskId}`
                },
                (payload) => {
                    console.log("Comment Added:", payload);
                    receiveComment(payload.new);
                }
            )
            .subscribe((status) => {
                console.log("Comments Realtime status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [taskId]);

    // Scroll to the bottom when a comment is added.
    // On initial mount, jump directly to the bottom.
    useEffect(() => {
        if (activeTab !== "comments") return;

        const container = commentsContainerRef.current;

        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: hasMountedRef.current ? "smooth" : "instant"
        });

        hasMountedRef.current = true;
    }, [comments, activeTab]);

    const activityLogs =
        workspace.currentTask?.activity_logs ?? [];

    const currentUsername =
        workspace.currentUser?.username ?? "You";

    const sortedComments = [...comments].sort(
        (a, b) =>
            parseTimestamp(a.timestamp).getTime() -
            parseTimestamp(b.timestamp).getTime()
    );

    const sortedActivityLogs = [...activityLogs].sort(
        (a, b) =>
            parseTimestamp(b.timestamp).getTime() -
            parseTimestamp(a.timestamp).getTime()
    );

    function receiveComment(comment) {
        if (comment.creator_id === workspace.currentUser?.id) {
            return;
        }

        const newComment = {
            id: comment.id,
            sender_username: comment.creator_username,
            timestamp: comment.created_at,
            message: comment.comment
        };

        if (!Array.isArray(workspace.currentTask.comments)) {
            workspace.currentTask.comments = [];
        }

        if (
            workspace.currentTask.comments.some(
                (existing) => existing.id === newComment.id
            )
        ) {
            return;
        }

        workspace.currentTask.comments.push(newComment);

        setComments((previous) => {
            if (
                previous.some(
                    (existing) => existing.id === newComment.id
                )
            ) {
                return previous;
            }

            return [...previous, newComment];
        });
    }

    async function handleSendComment() {
        const text = message.trim();

        if (!text || !workspace.currentTask) return;

        try {
            const response = await createNewComment(text);

            if (!response) return;

            if (!Array.isArray(workspace.currentTask.comments)) {
                workspace.currentTask.comments = [];
            }

            const newComment = {
                id: response.id,
                sender_username: response.creator_username,
                timestamp: response.created_at,
                message: response.comment
            };

            if (
                !workspace.currentTask.comments.some(
                    (existing) => existing.id === newComment.id
                )
            ) {
                workspace.currentTask.comments.push(newComment);
            }

            setComments((previous) => {
                if (
                    previous.some(
                        (existing) => existing.id === newComment.id
                    )
                ) {
                    return previous;
                }

                return [...previous, newComment];
            });

            setMessage("");

            console.log("New comment:", newComment);
        } catch (error) {
            console.error("Failed to send comment:", error);
        }
    }

    function renderComments() {
        if (sortedComments.length === 0) {
            return (
                <div className="comments-empty">
                    No comments yet. Start the conversation.
                </div>
            );
        }

        return sortedComments.map((comment, index) => {
            const currentDate = getDateKey(comment.timestamp);

            const previousComment =
                index > 0 ? sortedComments[index - 1] : null;

            const previousDate = previousComment
                ? getDateKey(previousComment.timestamp)
                : null;

            const showDate =
                index === 0 || currentDate !== previousDate;

            return (
                <div
                    key={comment.id}
                    className="comments-message-group"
                >
                    {showDate && (
                        <div className="comments-date">
                            <span>
                                {formatDate(comment.timestamp)}
                            </span>
                        </div>
                    )}

                    <CommentMessage
                        comment={comment}
                        isOwnMessage={
                            comment.sender_username === currentUsername
                        }
                    />
                </div>
            );
        });
    }

    function renderActivityLogs() {
        if (sortedActivityLogs.length === 0) {
            return (
                <div className="comments-empty">
                    No activity recorded for this task.
                </div>
            );
        }

        return sortedActivityLogs.map((log, index) => (
            <div
                className="comments-activity-item"
                key={`${log.timestamp}-${index}`}
            >
                <div className="comments-activity-dot" />

                <div className="comments-activity-content">
                    <p>{log.message}</p>

                    <time>
                        {formatDateTime(log.timestamp)}
                    </time>
                </div>
            </div>
        ));
    }

    return (
        <div className="comments-container">
            <div className="comments-tabs">
                <button
                    type="button"
                    className={
                        activeTab === "comments" ? "active" : ""
                    }
                    onClick={() => setActiveTab("comments")}
                >
                    Comments
                </button>

                <button
                    type="button"
                    className={
                        activeTab === "activity" ? "active" : ""
                    }
                    onClick={() => setActiveTab("activity")}
                >
                    Activity Logs
                </button>
            </div>

            <div className="comments-panel">
                {activeTab === "comments" ? (
                    <>
                        <div className="comments-new-heading">
                            COMMENTS
                        </div>

                        <div
                            className="comments-messages"
                            ref={commentsContainerRef}
                        >
                            {renderComments()}
                        </div>

                        <div className="comments-compose">
                            <input
                                type="text"
                                value={message}
                                placeholder="Write a comment..."
                                onChange={(event) =>
                                    setMessage(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        handleSendComment();
                                    }
                                }}
                            />

                            <button
                                type="button"
                                disabled={!message.trim()}
                                onClick={handleSendComment}
                                aria-label="Send comment"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M22 2 11 13" />
                                    <path d="m22 2-7 20-4-9-9-4Z" />
                                </svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="comments-activity-list">
                        {renderActivityLogs()}
                    </div>
                )}
            </div>
        </div>
    );
}
