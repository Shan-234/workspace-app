
import { Plus } from "lucide-react";
import { supabase, workspace } from "../../lib/Supabase/supabase";
import Card from "../Card/Card";
import "./Deck.css";
import { useEffect, useState } from "react";

const statusTitles = {
    todo: "TO DO",
    in_progress: "IN PROGRESS",
    in_review: "IN REVIEW",
    done: "DONE"
};

export default function Deck({
    status,
    onAddTask,
    onTaskClick,
    onTaskSettings,
    onMouseUp
}) {
    const [num, setNum] = useState(0);
    const title = statusTitles[status] ?? "TASKS";

    useEffect(() => {
        console.log("Deck " + status + " re-rendered.");
    });

    const currentTasks = workspace.currentProject?.tasks ?? [];

    const cards = currentTasks.filter(
        (task) => task.status && (task.status === status)
    );

    return (
        <section id={status} className={`deck deck-${status}`} onMouseUp={onMouseUp}>
            <div className="deck-header">
                <div className="deck-title-box">
                    <h3 className="deck-title">{title}</h3>
                    <span className="deck-task-count">
                        {cards.length}
                    </span>
                </div>
            </div>

            <div className="deck-cards-list">
                {cards.length > 0 ? (
                    cards.map((task) => (
                        <Card
                            key={task.id}
                            id={task.id}
                            title={task.title}
                            description={task.description}
                            status={task.status}
                            priority={task.priority}
                            due_date={task.due_date}
                            onClick={onTaskClick}
                            onSettings={onTaskSettings}
                        />
                    ))
                ) : (
                    <div className="deck-empty">
                        <p>No tasks yet</p>
                        <span>Add a task to get started</span>
                    </div>
                )}
            </div>

            <div className="deck-footer">
                <button
                    type="button"
                    className="deck-add-task"
                    onClick={() => onAddTask?.(status)}
                >
                    <Plus size={18} strokeWidth={2.2} />
                    <span>Add Task</span>
                </button>
            </div>
        </section>
    );
}
