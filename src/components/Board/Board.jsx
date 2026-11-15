
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Settings2, X } from "lucide-react";
import Deck from "../Deck/Deck";
import { workspace } from "../../lib/Supabase/supabase";
import "./Board.css";

const statuses = [
    "todo",
    "in_progress",
    "in_review",
    "done"
];

function FindResultDeck(mouseX, mouseY) {
    for (let i = 0; i < statuses.length; i++) {
        const deck = document.getElementById(statuses[i]);
        const rect = deck.getBoundingClientRect();

        if (
            mouseX >= rect.left &&
            mouseX <= rect.right &&
            mouseY >= rect.top &&
            mouseY <= rect.bottom
        ) {
            return statuses[i];
        }
    }

    return null;
}

export default function Board({
    project_name = "Untitled Project",
    onAddTask,
    onTaskSettings,
    onProjectSettings
}) {
    const [num, setNum] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        console.log("Component re-rendered");
    })

    let selectedCard = null;
    let offsetX = 0;
    let offsetY = 0;

    const onTaskClick = (event) => {
        selectedCard = event.currentTarget;

        const rect = selectedCard.getBoundingClientRect();

        offsetX = rect.x - event.clientX;
        offsetY = rect.y - event.clientY;

        console.log(selectedCard);
    };

    const onTaskMove = (event) => {
        if (selectedCard) {
            console.log("Moving Card");
            selectedCard.style.position = "absolute";
            selectedCard.style.left = (event.clientX + offsetX) + "px";
            selectedCard.style.top = (event.clientY + offsetY) + "px";
        }
    };

    const onMouseUp = (event) => {
        if (selectedCard) {
            const task_id = Number(selectedCard.id);
            const deck = FindResultDeck(event.clientX, event.clientY);

            if (deck) {
                for (let i = 0; i < workspace.currentProject["tasks"].length; i++) {
                    if (workspace.currentProject["tasks"][i]["id"] === task_id) {
                        workspace.currentProject["tasks"][i]["status"] = deck;
                        break;
                    }
                }
            }

            selectedCard.removeAttribute("style");
            setNum(prev => (prev + 1) % 10);
        }
    };

    return (
        <section className="board" onMouseMove={onTaskMove}>
            <header className="board-header">
                <div className="board-header-info">
                    <span className="board-eyebrow">
                        PROJECT BOARD
                    </span>

                    <h1 className="board-project-name" title={project_name}>
                        {project_name}
                    </h1>
                </div>

                <div className="board-header-actions">
                    <button
                        type="button"
                        className={`board-filter-button ${filtersOpen ? "board-filter-active" : ""}`}
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        aria-expanded={filtersOpen}
                    >
                        <SlidersHorizontal size={17} strokeWidth={1.8} />
                        <span>Filters</span>
                    </button>

                    <button
                        type="button"
                        className="board-settings-button"
                        onClick={() => onProjectSettings?.()}
                        aria-label="Project settings"
                        title="Project settings"
                    >
                        <Settings2 size={20} strokeWidth={1.8} />
                    </button>
                </div>
            </header>

            {filtersOpen && (
                <div className="board-filters-panel">
                    <div className="board-filters-heading">
                        <span>Filter tasks</span>

                        <button
                            type="button"
                            onClick={() => setFiltersOpen(false)}
                            aria-label="Close filters"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <p>
                        Filter options will appear here.
                    </p>
                </div>
            )}

            <div className="board-decks">
                {statuses.map((status) => (
                    <Deck
                        key={status}
                        status={status}
                        onAddTask={onAddTask}
                        onTaskClick={onTaskClick}
                        onTaskSettings={onTaskSettings}
                        onMouseUp={onMouseUp}
                    />
                ))}
            </div>
        </section>
    );
}
