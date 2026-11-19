import "./CommentMessage.css";

function formatTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

export default function CommentMessage({ comment, isOwnMessage }) {
    return (
        <div
            className={`comment-message ${
                isOwnMessage ? "comment-message-own" : ""
            }`}
        >
            <div className="comment-message-meta">
                <strong>{comment.sender_username}</strong>

                <time>{formatTime(comment.timestamp)}</time>
            </div>

            <div className="comment-message-bubble">
                {comment.message}
            </div>
        </div>
    );
}
