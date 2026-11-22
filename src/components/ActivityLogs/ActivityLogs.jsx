
import { useMemo, useState, useEffect } from "react";
import {
    Plus,
    FileText,
    Flag,
    ArrowRightCircle,
    CalendarDays,
    Activity
} from "lucide-react";
import { workspace } from "../../lib/Supabase/supabase"; // Adjust import path
import "./ActivityLogs.css";
import { refreshActivityLogs, supabase } from "../../lib/Supabase/supabase";

const topicConfig = {
    new_task: {
        icon: Plus,
        color: "blue"
    },
    description: {
        icon: FileText,
        color: "purple"
    },
    priority: {
        icon: Flag,
        color: "orange"
    },
    status: {
        icon: ArrowRightCircle,
        color: "green"
    },
    due_date: {
        icon: CalendarDays,
        color: "pink"
    }
};

function parseTimestamp(timestamp) {
    return new Date(timestamp.replace(" ", "T"));
}

function formatDate(timestamp) {
    return parseTimestamp(timestamp).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function formatTime(timestamp) {
    return parseTimestamp(timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
}

export default function ActivityLogs() {
    const [num, setNum] = useState(0);

    useEffect(() => {
        let assigned = false;

        for (let i = 0; i < workspace.currentTask["assignees"].length; i++) {
            if (workspace.currentTask["assignees"][i]["id"] === workspace.currentUser["id"]) {
                assigned = true;
                break;
            }
        }

        const channel = supabase
            .channel(`activity-logs-task-${workspace.currentTask["id"]}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "assignments",
                    filter: `user_id=eq.${workspace.currentUser["id"]}`
                },
                (payload) => {
                    if (payload.new.log_notifications > workspace.currentTask["log_notifications"]) {
                        refreshActivityLogs().then((success) => {
                            if (success) {
                                setNum(prev => (prev + 1) % 10);
                            } else {
                                console.error("Error refreshing activity logs!");
                            }
                        });
                    }    
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "tasks",
                    filter: `id=eq.${workspace.currentTask["id"]}`
                },
                (payload) => {
                    if (!assigned) {
                        refreshActivityLogs().then((success) => {
                            if (success) {
                                setNum(prev => (prev + 1) % 10);
                            } else {
                                console.error("Error refreshing activity logs!");
                            }
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log("Activity Logs Realtime Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    const activityLogs =
        workspace.currentTask?.["activity_logs"] ?? [];

    const groupedLogs = useMemo(() => {
        const sortedLogs = [...activityLogs].sort(
            (a, b) =>
                parseTimestamp(b.timestamp).getTime() -
                parseTimestamp(a.timestamp).getTime()
        );

        const groups = new Map();

        for (const log of sortedLogs) {
            const date = formatDate(log.timestamp);

            if (!groups.has(date)) {
                groups.set(date, []);
            }

            groups.get(date).push(log);
        }

        return [...groups.entries()];
    }, [activityLogs]);

    return (
        <div className="activity-logs">
            <div className="activity-logs-header">
                <div>
                    <h2>Activity Logs</h2>
                    <p>Track changes made to this task</p>
                </div>

                <span className="activity-logs-count">
                    {activityLogs.length} events
                </span>
            </div>

            <div className="activity-logs-content">
                {groupedLogs.length === 0 ? (
                    <div className="activity-logs-empty">
                        <Activity size={32} />
                        <p>No activity recorded yet.</p>
                    </div>
                ) : (
                    groupedLogs.map(([date, logs]) => (
                        <section
                            className="activity-logs-group"
                            key={date}
                        >
                            <div className="activity-logs-date">
                                <span>{date}</span>
                            </div>

                            <div className="activity-logs-timeline">
                                {logs.map((log, index) => {
                                    const config =
                                        topicConfig[log.topic] ?? {
                                            icon: Activity,
                                            color: "gray"
                                        };

                                    const Icon = config.icon;

                                    return (
                                        <div
                                            className="activity-logs-entry"
                                            key={`${log.timestamp}-${index}`}
                                        >
                                            <div
                                                className={`activity-logs-icon ${config.color}`}
                                            >
                                                <Icon size={16} />
                                            </div>

                                            <div className="activity-logs-entry-content">
                                                <p>{log.message}</p>

                                                <time>
                                                    {formatTime(log.timestamp)}
                                                </time>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
