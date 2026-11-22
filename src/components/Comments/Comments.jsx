
import { useState, useEffect, useRef } from "react";
import {
    supabase,
    createNewComment,
    refreshComments,
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
    const [comments, setComments] = useState(
        () => [...(workspace.currentTask?.comments ?? [])]
    );

    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const commentsContainerRef = useRef(null);
    const hasMountedRef = useRef(false);

    const taskId = workspace.currentTask?.id;
    const userId = workspace.currentUser?.id;

    const currentUsername =
        workspace.currentUser?.username ?? "You";

    useEffect(() => {
        let assigned = false;

        for (let i = 0; i < workspace.currentTask["assignees"].length; i++) {
            if (workspace.currentTask["assignees"][i]["id"] === workspace.currentUser["id"]) {
                assigned = true;
                break;
            }
        }

        const channel = supabase
            .channel(`comments-task-${taskId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "assignments",
                    filter: `user_id=eq.${workspace.currentUser["id"]}`
                },
                (payload) => {
                    if (payload.new.comment_notifications > workspace.currentTask["comment_notifications"]) {
                        refreshComments().then((success) => {
                            if (success) {
                                setComments(workspace.currentTask["comments"]);
                            } else {
                                console.error("Error refreshing comments!");
                            }
                        });
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "comments",
                    filter: `task_id=eq.${taskId}`
                },
                (payload) => {
                    if (!assigned && (payload.new.creator_id !== workspace.currentUser["id"])) {
                        const new_comment = {
                            "id": payload.new.id,
                            "sender_username": payload.new.creator_username,
                            "timestamp": payload.new.created_at,
                            "message": payload.new.comment
                        };

                        setComments(previous => [...previous, new_comment]);
                    }
                }
            )
            .subscribe((status) => {
                console.log("Comments Real-time Status:", status);
            });
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (!taskId) return;

        let active = true;

        async function loadComments() {
            try {
                const success = await refreshComments();

                if (
                    success &&
                    active &&
                    workspace.currentTask?.id === taskId
                ) {
                    setComments([
                        ...(workspace.currentTask?.comments ?? [])
                    ]);
                }
            } catch (error) {
                console.error(
                    "Failed to load comments:",
                    error
                );
            }
        }

        void loadComments();

        return () => {
            active = false;
        };
    }, [taskId, userId]);

    useEffect(() => {
        const container = commentsContainerRef.current;

        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: hasMountedRef.current
                ? "smooth"
                : "instant"
        });

        hasMountedRef.current = true;
    }, [comments]);

    const sortedComments = [...comments].sort(
        (a, b) =>
            parseTimestamp(a.timestamp).getTime() -
            parseTimestamp(b.timestamp).getTime()
    );

    async function handleSendComment() {
        const text = message.trim();

        if (!text || sending || !taskId) {
            return;
        }

        if (workspace.currentTask?.id !== taskId) {
            return;
        }

        setSending(true);

        try {
            const response = await createNewComment(text);

            if (!response) return;

            if (workspace.currentTask?.id !== taskId) {
                return;
            }

            const newComment = {
                id: response.id,
                sender_username: response.creator_username,
                timestamp: response.created_at,
                message: response.comment
            };

            setComments((previous) => {
                if (
                    previous.some(
                        (existing) =>
                            existing.id === newComment.id
                    )
                ) {
                    return previous;
                }

                return [...previous, newComment];
            });

            if (
                !Array.isArray(
                    workspace.currentTask.comments
                )
            ) {
                workspace.currentTask.comments = [];
            }

            if (
                !workspace.currentTask.comments.some(
                    (existing) =>
                        existing.id === newComment.id
                )
            ) {
                workspace.currentTask.comments.push(
                    newComment
                );
            }

            setMessage("");
        } catch (error) {
            console.error(
                "Failed to send comment:",
                error
            );
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="comments-container">
            <div className="comments-panel">
                <div className="comments-new-heading">
                    COMMENTS
                </div>

                <div
                    className="comments-messages"
                    ref={commentsContainerRef}
                >
                    {sortedComments.length === 0 ? (
                        <div className="comments-empty">
                            No comments yet. Start the conversation.
                        </div>
                    ) : (
                        sortedComments.map((comment, index) => {
                            const currentDate =
                                getDateKey(comment.timestamp);

                            const previousComment =
                                index > 0
                                    ? sortedComments[index - 1]
                                    : null;

                            const previousDate = previousComment
                                ? getDateKey(
                                    previousComment.timestamp
                                )
                                : null;

                            const showDate =
                                index === 0 ||
                                currentDate !== previousDate;

                            return (
                                <div
                                    key={comment.id}
                                    className="comments-message-group"
                                >
                                    {showDate && (
                                        <div className="comments-date">
                                            <span>
                                                {formatDate(
                                                    comment.timestamp
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    <CommentMessage
                                        comment={comment}
                                        isOwnMessage={
                                            comment.sender_username ===
                                            currentUsername
                                        }
                                    />
                                </div>
                            );
                        })
                    )}
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
                                void handleSendComment();
                            }
                        }}
                    />

                    <button
                        type="button"
                        disabled={!message.trim() || sending}
                        onClick={() =>
                            void handleSendComment()
                        }
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
            </div>
        </div>
    );
}
