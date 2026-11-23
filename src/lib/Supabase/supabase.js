import { createClient } from '@supabase/supabase-js';
import Workspace from '../Workspace/Workspace';
import { title } from 'motion/react-client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const workspace = new Workspace();
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

const notifications_channel = supabase.channel("notifications_channel");
const task_assignment_handlers = {};
const task_notification_handlers = {};
const project_notification_handlers = {};
const team_notification_handlers = {};

const handleTeamNotifications = (payload) => {
    let team_id = null;

    if (payload.eventType === "UPDATE") {
        team_id = payload.new.team_id;
    } else if (payload.eventType === "DELETE") {
        team_id = payload.old.team_id;
    }

    if (Object.hasOwn(team_notification_handlers, team_id)) {
        getTeamNotifications(team_id).then((result) => {
            team_notification_handlers[team_id](result);
        });
    }
};

const handleProjectNotifications = (payload) => {
    let project_id = null;

    if (payload.eventType === "UPDATE") {
        project_id = payload.new.project_id;
    } else if (payload.eventType === "DELETE") {
        project_id = payload.old.project_id;
    }

    if (Object.hasOwn(project_notification_handlers, project_id)) {
        getProjectNotifications(project_id).then((result) => {
            project_notification_handlers[project_id](result);
        });
    }
};

const handleTaskNotifications = (payload) => {
    if (Object.hasOwn(task_notification_handlers, payload.new.task_id)) {
        task_notification_handlers[payload.new.task_id](payload.new.log_notifications + payload.new.comment_notifications);
    }
};

const handleTaskAssignment = (payload) => {
    if (payload.eventType === "INSERT") {
        if (Object.hasOwn(task_assignment_handlers, payload.new.task_id)) {
            task_assignment_handlers[payload.new.task_id](true);
        }
    } else if (payload.eventType === "DELETE") {
        if (Object.hasOwn(task_assignment_handlers, payload.old.task_id)) {
            task_assignment_handlers[payload.old.task_id](false);
        }
    }
};

const joinNotificationsChannel = () => {
    if (notifications_channel.state === "joined") {
        return;
    }

    console.log("Joining Task Notifications Channel");

    notifications_channel.on(
        "postgres_changes",
        {
            event: "UPDATE",
            schema: "public",
            table: "assignments",
            filter: `user_id=eq.${workspace.currentUser["id"]}`
        },
        (payload) => {
            if (workspace.currentProject) {
                handleTaskNotifications(payload);
            }

            if (workspace.currentTeam) {
                handleProjectNotifications(payload);
            }

            if (workspace.currentUser) {
                handleTeamNotifications(payload);
            }
        }
    )
    .on(
        "postgres_changes",
        {
            event: "DELETE",
            schema: "public",
            table: "assignments"
        },
        (payload) => {
            if (payload.old.user_id !== workspace.currentUser["id"]) {
                return;
            }

            if (workspace.currentProject) {
                handleTaskAssignment(payload);
            }

            if (workspace.currentTeam) {
                handleProjectNotifications(payload);
            }

            if (workspace.currentUser) {
                handleTeamNotifications(payload);
            }
        }
    )
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "assignments",
            filter: `user_id=eq.${workspace.currentUser["id"]}`
        },
        (payload) => {
            if (workspace.currentProject) {
                handleTaskAssignment(payload);
            }
        }
    )
    .subscribe((status) => {
        console.log("Notifications Channel Status:", status);
    });
};

export function clearTaskAssignmentHandlers() {
    for (const task_id in task_assignment_handlers) {
        if (Object.hasOwn(task_assignment_handlers, task_id)) {
            delete task_assignment_handlers[task_id];
        }
    }
}

export function clearTaskNotificationHandlers() {
    for (const task_id in task_notification_handlers) {
        if (Object.hasOwn(task_notification_handlers, task_id)) {
            delete task_notification_handlers[task_id];
        }
    }
}

export function clearProjectNotificationHandlers() {
    for (const project_id in project_notification_handlers) {
        if (Object.hasOwn(project_notification_handlers, project_id)) {
            delete project_notification_handlers[project_id];
        }
    }
}

export function clearTeamNotificationHandlers() {
    for (const team_id in team_notification_handlers) {
        if (Object.hasOwn(team_notification_handlers, team_id)) {
            delete team_notification_handlers[team_id];
        }
    }
}

export function registerTeamNotificationHandler(team_id, handler) {
    team_notification_handlers[team_id] = handler;
}

export function registerProjectNotificationHandler(project_id, handler) {
    project_notification_handlers[project_id] = handler;
}

export function registerTaskNotificationHandler(task_id, handler) {
    task_notification_handlers[task_id] = handler;
}

export function registerTaskAssignmentHandler(task_id, handler) {
    task_assignment_handlers[task_id] = handler;
};

export async function createAccount(user_id) {
    const username = "user_" + user_id.substring(0, 4);
    const { data, error } = await supabase
        .from("accounts")
        .insert({
            id: user_id,
            username: username,
            user_progress: {
                "tasks_total": 0,
                "tasks_completed": 0,
                "tasks_due_soon": 0,
                "tasks_overdue": 0
            }
        })
        .select()
        .single();
    
    console.log(data);
    
    workspace.currentUser = {
        "id": user_id,
        "username": username,
        "user_progress": {
            "tasks_total": 0,
            "tasks_completed": 0,
            "tasks_due_soon": 0,
            "tasks_overdue": 0
        },
        "user_labels": [],
        "user_teams": []
    };

    joinNotificationsChannel();
};

export async function retrieveAccount(user_id) {
    const { data: user, error: user_error } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", user_id)
        .single();

    const { data: teams, error: teams_error } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", user_id);

    let team_ids = [];

    workspace.currentUser = {
        "id": user_id,
        "username": user.username,
        "user_progress": user.user_progress,
        "user_labels": {},
        "user_teams": {}
    };

    for (let i = 0; i < teams.length; i++) {
        team_ids.push(teams[i].team_id);

        workspace.currentUser["user_teams"][teams[i]["team_id"]] = {
            "name": "",
            "notifications": teams[i].notifications
        };
    }

    const { data: team_names, error: names_error } = await supabase
        .from("teams")
        .select("team_id, name")
        .in("team_id", team_ids);
    
    console.log(team_names);

    for (let i = 0; i < team_names.length; i++) {
        workspace.currentUser["user_teams"][team_names[i].team_id]["name"] = team_names[i].name;
    }

    joinNotificationsChannel();
}

export async function editUsername(new_username) {
    const { error } = await supabase
        .from("accounts")
        .update({
            username: new_username
        })
        .eq("id", workspace.currentUser["id"]);
    
    if (error) {
        return false;
    }

    workspace.currentUser["username"] = new_username;

    return true;
}

export async function getUserProgress() {
    const { data: user_data, error: user_error } = await supabase
        .from("assignments")
        .select("task_id")
        .eq("user_id", workspace.currentUser["id"]);
    
    if (user_error) {
        throw user_error;
    }

    const task_ids = user_data.map(item => item.task_id);

    const { data: tasks_data, error: tasks_error } = await supabase
        .from("tasks")
        .select("id, status, due_date")
        .in("id", task_ids);
    
    if (tasks_error) {
        throw tasks_error;
    }

    const result = {
        tasks_total: tasks_data.length,
        tasks_completed: 0,
        tasks_due_soon: 0,
        tasks_overdue: 0
    };

    for (let i = 0; i < tasks_data.length; i++) {
        const now = new Date();
        const dueDate = new Date(tasks_data[i].due_date);
        const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const isCompleted = tasks_data[i].status === "done";

        const isOverdue =
            !isCompleted &&
            dueDate < now;

        const isDueSoon =
            !isCompleted &&
            dueDate >= now &&
            dueDate <= dueSoonThreshold;
        
        if (isCompleted) {
            result.tasks_completed += 1;
        } else if (isDueSoon) {
            result.tasks_due_soon += 1;
        } else if (isOverdue) {
            result.tasks_overdue += 1;
        }
    }

    return result;
}

export async function createNewTeam(team_info) {
    const team_id = crypto.randomUUID();
    const today = new Date();

    const { error: team_insert_error } = await supabase
        .from("teams")
        .insert({
            team_id: team_id,
            name: team_info.name,
            description: team_info.description,
            activity_logs: [{
                timestamp: today.toLocaleDateString(),
                message: workspace.currentUser["username"] + " created team " + team_info.name
            }]
        });
    
    if (team_insert_error) {
        throw team_insert_error;
    }
    
    const { error: member_insert_error } = await supabase
        .from("members")
        .insert({
            user_id: workspace.currentUser["id"],
            team_id: team_id,
            notifications: 0
        });
    
    if (member_insert_error){
        throw member_insert_error;
    }
    
    for (let i = 0; i < team_info.projects.length; i++) {
        team_info.projects[i]["team_id"] = team_id;
    }

    const { error: project_error } = await supabase
        .from("projects")
        .insert(team_info.projects)

    if (project_error) {
        throw project_error;
    }

    const { data: team_data, error: team_error } = await supabase
        .from("teams")
        .select("*")
        .eq("team_id", team_id)
        .single();

    return team_data;
}

export async function joinExistingTeam(team_code) {
    const result = {
        success: true,
        message: null
    };

    const { data: member_data, error: member_error } = await supabase
        .from("members")
        .insert({
            user_id: workspace.currentUser["id"],
            team_id: team_code,
            notifications: 0
        })
        .select()
        .single();
    
    if (member_error) {
        result.success = false;

        if (member_error.code === "23503") {
            result.message = "This team does not exist.";
        } else if (member_error.code === "23505") {
            result.message = "You are already a member of this team.";
        } else if (member_error.code === "22P02") {
            result.message = "Invalid team code format.";
        } else {
            result.message = "Sorry... There was an unexpected error!";
        }

        return result;
    }

    const { data: team_data, error: team_error } = await supabase
        .from("teams")
        .select("name")
        .eq("team_id", team_code)
        .single();
    
    result.message = team_data.name;

    return result;
}

export async function leaveTeam(team_id) {
    const today = new Date();

    const { data: team_activity, error: team_activity_error } = await supabase
        .from("teams")
        .select("activity_logs")
        .eq("team_id", team_id)
        .single();
    
    if (team_activity_error) {
        return false;
    }

    team_activity.activity_logs.push({
        "message": workspace.currentUser["username"] + " has left the team.",
        "timestamp": today.toLocaleDateString()
    });

    const { error: log_update_error } = await supabase
        .from("teams")
        .update(team_activity)
        .eq("team_id", team_id);
    
    if (log_update_error) {
        return false;
    }

    const { error } = await supabase
        .from("members")
        .delete()
        .eq("user_id", workspace.currentUser["id"])
        .eq("team_id", team_id);
    
    if (error) {
        return false;
    }

    return true;
}

export async function retrieveTeam(team_id) {
    const { data: team_data, error: team_error } = await supabase
        .from("teams")
        .select("*")
        .eq("team_id", team_id)
        .single();
    
    if (team_error) {
        return false;
    }

    workspace.currentTeam = {
        "team_id": team_data.team_id,
        "name": team_data.name,
        "description": team_data.description,
        "activity_logs": team_data.activity_logs,
        "team_members": [],
        "projects": []
    };

    const { data: members_data, error: members_error } = await supabase
        .from("members")
        .select("user_id")
        .eq("team_id", team_id);

    if (members_error) {
        return false;
    }

    const member_ids = members_data.map(member => member.user_id);
    const { data: accounts_data, error: accounts_error } = await supabase
        .from("accounts")
        .select("id, username")
        .in("id", member_ids);
    
    workspace.currentTeam["team_members"] = accounts_data;

    const { data: project_data, error: project_error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("team_id", team_id);
    
    if (project_error) {
        return false;
    }

    for (let i = 0; i < project_data.length; i++) {
        workspace.currentTeam["projects"].push({
            "id": project_data[i].id,
            "name": project_data[i].name,
            "notifications": 0,
            "most_recent_log": ""
        });
    }

    return true;
}

export async function createProject(name, description) {
    const today = new Date();
    const { data: project_data, error: project_error } = await supabase
        .from("projects")
        .insert({
            team_id: workspace.currentTeam["team_id"],
            name: name,
            description: description,
            project_info: {
                "tasks_total": 0,
                "tasks_completed": 0,
                "tasks_due_soon": 0,
                "tasks_overdue": 0
            }
        })
        .select()
        .single();
    
    if (project_error) {
        return false;
    }

    console.log(workspace.currentUser);

    workspace.currentTeam["projects"].push({
        "id": project_data.id,
        "name": project_data.name,
        "notifications": 0,
        "most_recent_log": workspace.currentUser["username"] + " created Project " + name
    });

    workspace.currentTeam["activity_logs"].push({
        "message": workspace.currentUser["username"] + " created Project " + name,
        "timestamp": today.toLocaleDateString()
    });

    workspace.currentProject = {
        "id": project_data.id,
        "name": name,
        "description": description,
        "project_info": {
            "tasks_total": 0,
            "tasks_completed": 0,
            "tasks_due_soon": 0,
            "tasks_overdue": 0
        },
        "tasks": []
    };

    return true;
}

export async function retrieveProject(project_id) {
    const { data: project_data, error: project_error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project_id)
        .single();

    if (project_error) {
        throw project_error;
    }

    workspace.currentProject = {
        "id": project_data.id,
        "name": project_data.name,
        "description": project_data.description,
        "project_info": project_data.project_info,
        "tasks": []
    };

    const { data: tasks_data, error: tasks_error } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority, due_date")
        .eq("project_id", project_id);
    
    if (tasks_error) {
        throw tasks_error;
    }

    workspace.currentProject["tasks"] = tasks_data;

    return workspace.currentProject;
}

export async function deleteProject(project_id) {
    const { data: tasks_data, error: tasks_error } = await supabase
        .from("tasks")
        .select("id")
        .eq("project_id", project_id);
    
    if (tasks_error) {
        throw tasks_error;
    }

    const task_ids = tasks_data.map((task) => task.id);

    const { error: comments_error } = await supabase
        .from("comments")
        .delete()
        .in("task_id", task_ids);
    
    if (comments_error) {
        throw comments_error;
    }

    const { error: assignments_error } = await supabase
        .from("assignments")
        .delete()
        .eq("project_id", project_id);
    
    if (assignments_error) {
        throw assignments_error;
    }

    const { error: tasks_delete_error } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", project_id);
    
    if (tasks_delete_error) {
        throw tasks_delete_error;
    }

    const { error: project_error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project_id);
    
    if (project_error) {
        throw project_error;
    }

    return true;
}

export async function createTask(new_task) {
    const { data: task_data, error: task_error } = await supabase
        .from("tasks")
        .insert({
            project_id: workspace.currentProject["id"],
            creator_id: workspace.currentUser["id"],
            activity_logs: [],
            title: new_task.title,
            description: new_task.description,
            status: new_task.status,
            priority: new_task.priority,
            due_date: new_task.due_date,
            last_updated_by: workspace.currentUser["id"]
        })
        .select()
        .single();
    
    if (task_error) {
        console.log(task_error);
        return false;
    }

    let assignment_entries = [];

    for (let i = 0; i < new_task.assignees.length; i++) {
        assignment_entries.push({
            user_id: new_task.assignees[i],
            task_id: task_data.id,
            project_id: workspace.currentProject["id"],
            team_id: workspace.currentTeam["team_id"],
            log_notifications: 0,
            comment_notifications: 0
        });
    }

    const { error: assignments_error } = await supabase
        .from("assignments")
        .upsert(assignment_entries, {
            onConflict: "user_id,task_id,project_id,team_id",
            ignoreDuplicates: true
        });
    
    if (assignments_error) {
        console.error(assignments_error);
        return false;
    }

    return true;
}

export async function retrieveTask(task_id) {
    const { data: task_data, error: task_error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", task_id)
        .single();
    
    if (task_error) {
        return false;
    }

    const { data: creator_data, error: creator_error } = await supabase
        .from("accounts")
        .select("username")
        .eq("id", task_data.creator_id)
        .single();
    
    if (creator_error) {
        console.log(creator_error);
        return false;
    }

    task_data["creator_username"] = creator_data.username;

    const { data: notifications_data, error: notifications_error } = await supabase
        .from("assignments")
        .select("log_notifications", "comment_notifications")
        .eq("user_id", workspace.currentUser["id"])
        .eq("task_id", task_id);
    
    if (notifications_error) {
        console.error(notifications_error);
        return false;
    }

    if (notifications_data.length) {
        task_data["log_notifications"] = notifications_data[0].log_notifications;
        task_data["comment_notifications"] = notifications_data[0].comment_notifications;
    } else {
        task_data["log_notifications"] = 0;
        task_data["comment_notifications"] = 0;
    }

    const { data: assignments_data, error: assignments_error } = await supabase
        .from("assignments")
        .select("user_id")
        .eq("task_id", task_id);
    
    if (assignments_error) {
        return false;
    }

    const assignee_ids = [];

    for (let i = 0; i < assignments_data.length; i++) {
        assignee_ids.push(assignments_data[i].user_id);
    }

    const { data: assignees_data, error: assignees_error } = await supabase
        .from("accounts")
        .select("id, username")
        .in("id", assignee_ids);
    
    if (assignees_error) {
        console.log(assignees_error);
        return false;
    }

    task_data["assignees"] = assignees_data;

    const { data: comments_data, error: comments_error } = await supabase
        .from("comments")
        .select("*")
        .eq("task_id", task_id);
    
    task_data["comments"] = [];

    for (let i = 0; i < comments_data.length; i++) {
        const comment = {
            "id": comments_data[i].id,
            "sender_username": comments_data[i].creator_username,
            "timestamp": comments_data[i].created_at,
            "message": comments_data[i].comment
        };

        task_data["comments"].push(comment);
    }

    task_data["label_ids"] = [];

    workspace.currentTask = task_data;

    return true;
}

export async function updateTaskStatus(task_id, status) {
    const { error: task_error } = await supabase
        .from("tasks")
        .update({
            status: status,
            last_updated_by: workspace.currentUser["id"]
        })
        .eq("id", task_id);
    
    if (task_error) {
        return false;
    }

    return true;
}

export async function updateTask(task_updated) {
    const { error: task_error } = await supabase
        .from("tasks")
        .update({
            title: task_updated.title,
            description: task_updated.description,
            status: task_updated.status,
            priority: task_updated.priority,
            due_date: task_updated.due_date,
            last_updated_by: workspace.currentUser["id"]
        })
        .eq("id", task_updated.id);
    
    if (task_error) {
        console.log(task_error);
        return false;
    }
    const assignments = [];

    for (let i = 0; i < task_updated.assignees.length; i++) {
        assignments.push({
            user_id: task_updated.assignees[i].id,
            task_id: task_updated.id,
            project_id: workspace.currentProject["id"],
            team_id: workspace.currentTeam["team_id"],
            log_notifications: 0,
            comment_notifications: 0
        });
    }

    const { error: assignments_error } = await supabase
        .from("assignments")
        .upsert(assignments, {
            onConflict: "user_id,task_id,project_id,team_id",
            ignoreDuplicates: true
        });
    
    if (assignments_error) {
        console.log(assignments_error);
        return false;
    }

    return true;
}

export async function deleteTask(task_id) {
    const { error: comments_error } = await supabase
        .from("comments")
        .delete()
        .eq("task_id", task_id);
    
    if (comments_error) {
        console.log(comments_error);
        return false;
    }

    const { error: assignments_error } = await supabase
        .from("assignments")
        .delete()
        .eq("task_id", task_id);
    
    if (assignments_error) {
        console.log(assignments_error);
        return false;
    }

    const { error: task_error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task_id);
    
    if (task_error) {
        console.log(task_error);
        return false;
    }

    return true;
}

export async function checkTaskAssigned(task_id) {
    const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("user_id", workspace.currentUser["id"])
        .eq("task_id", task_id);
    
    if (error) {
        throw error;
    }

    return data.length > 0;
}

export async function createNewComment(message) {
    const today = new Date();
    const { data: comment_data, error: comment_error } = await supabase
        .from("comments")
        .insert({
            task_id: workspace.currentTask["id"],
            creator_id: workspace.currentUser["id"],
            creator_username: workspace.currentUser["username"],
            comment: message,
            created_at: today.toISOString()
        })
        .select()
        .single();
    
    if (comment_error) {
        return null;
    }

    return comment_data;
}

export async function refreshActivityLogs() {
    if (!workspace.currentTask) {
        return;
    }

    const { data, error } = await supabase
        .from("tasks")
        .select("activity_logs")
        .eq("id", workspace.currentTask["id"])
        .single();
    
    if (error) {
        throw error;
    }

    workspace.currentTask["activity_logs"] = data.activity_logs;

    return true;
}

export async function refreshComments() {
    const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("task_id", workspace.currentTask["id"]);
    
    if (error) {
        throw error;
    }

    workspace.currentTask["comments"] = [];

    for (let i = 0; i < data.length; i++) {
        workspace.currentTask["comments"].push({
            "id": data[i].id,
            "sender_username": data[i].creator_username,
            "timestamp": data[i].created_at,
            "message": data[i].comment
        });
    }

    console.log(data);

    return true;
}

export async function resetLogNotifications() {
    const { error } = await supabase.rpc(
        "reset_log_notifications",
        {
            p_task_id: workspace.currentTask["id"]
        }
    );
    
    if (error) {
        console.error(error);
        return false;
    }

    workspace.currentTask["log_notifications"] = 0;

    return true;
}

export async function resetCommentNotifications() {
    const { error } = await supabase.rpc(
        "reset_comment_notifications",
        {
            p_task_id: workspace.currentTask["id"]
        }
    );
    
    if (error) {
        console.error(error);
        return false;
    }

    workspace.currentTask["comment_notifications"] = 0;

    return true;
}

export async function getTeamNotifications(team_id) {
    const { data, error } = await supabase
        .from("assignments")
        .select("log_notifications, comment_notifications")
        .eq("user_id", workspace.currentUser["id"])
        .eq("team_id", team_id);
    
    if (error) {
        throw error;
    }

    let result = 0;

    for (let i = 0; i < data.length; i++) {
        result += data[i].log_notifications + data[i].comment_notifications;
    }

    return result;
}

export async function getProjectNotifications(project_id) {
    const { data, error } = await supabase
        .from("assignments")
        .select("log_notifications, comment_notifications")
        .eq("user_id", workspace.currentUser["id"])
        .eq("project_id", project_id);
    
    if (error) {
        throw error;
    }

    let result = 0;

    for (let i = 0; i < data.length; i++) {
        result += data[i].log_notifications + data[i].comment_notifications;
    }

    return result;
}

export async function getTaskNotifications(task_id) {
    const { data, error } = await supabase
        .from("assignments")
        .select("log_notifications, comment_notifications")
        .eq("user_id", workspace.currentUser["id"])
        .eq("task_id", task_id);

    if (data.length) {
        return data[0].log_notifications + data[0].comment_notifications;
    }

    return 0;
}

// Sample Data

/*
workspace.currentUser = {
    "id": 1,
    "username": "user_123",
    "session_id": "njno5u0tuwjgw",
    "user_progress": {
        "tasks_total": 29,
        "tasks_completed": 5,
        "tasks_due_soon": 10,
        "tasks_overdue": 2
    },
    "user_labels": [
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
    ],
    "user_teams": [
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
    ]
};

workspace.currentTeam = {
    "id": 1,
    "name": "App Dev",
    "description": "We develop apps.",
    "team_code": "E34-FG6-SD1",
    "activity_logs": [],
    "projects": [
        {
            "id": 1,
            "name": "Mobile App",
            "notifications": 2,
            "most_recent_log": "User_432 created Task 'Fix Dashboard Bug'"
        },
        {
            "id": 2,
            "name": "Website Redesign",
            "notifications": 5,
            "most_recent_log": "User_128 completed Task 'Update Homepage Layout'"
        },
        {
            "id": 3,
            "name": "E-Commerce Platform",
            "notifications": 3,
            "most_recent_log": "User_567 created Task 'Implement Payment Gateway'"
        },
        {
            "id": 4,
            "name": "AI Chatbot",
            "notifications": 7,
            "most_recent_log": "User_291 updated Task 'Train Language Model'"
        },
        {
            "id": 5,
            "name": "Database Migration",
            "notifications": 1,
            "most_recent_log": "User_845 completed Task 'Migrate User Records'"
        },
        {
            "id": 6,
            "name": "Authentication System",
            "notifications": 4,
            "most_recent_log": "User_312 created Task 'Implement OAuth Login'"
        },
        {
            "id": 7,
            "name": "Analytics Dashboard",
            "notifications": 6,
            "most_recent_log": "User_674 updated Task 'Add Revenue Charts'"
        },
        {
            "id": 8,
            "name": "Cloud Infrastructure",
            "notifications": 0,
            "most_recent_log": "User_193 completed Task 'Configure Load Balancer'"
        },
        {
            "id": 9,
            "name": "Inventory Management",
            "notifications": 8,
            "most_recent_log": "User_726 created Task 'Implement Stock Alerts'"
        },
        {
            "id": 10,
            "name": "Customer Support Portal",
            "notifications": 2,
            "most_recent_log": "User_458 updated Task 'Improve Ticket Filtering'"
        },
        {
            "id": 11,
            "name": "CI/CD Pipeline",
            "notifications": 3,
            "most_recent_log": "User_839 completed Task 'Configure GitHub Actions'"
        },
        {
            "id": 12,
            "name": "Research Management System",
            "notifications": 5,
            "most_recent_log": "User_215 created Task 'Design Experiment Tracker'"
        }
    ]
};

workspace.currentProject = {
    "id": 1,
    "name": "Mobile App",
    "description": "Creating a mobile front-end.",
    "project_info": {
        "total_tasks": 12,
        "tasks_completed": 4,
        "tasks_due_soon": 2,
        "tasks_overdue": 1
    },
    "tasks": [
        {
            "id": 1,
            "title": "Design Login Screen",
            "description": "Create a responsive login screen with email, password, and social authentication options.",
            "status": "done",
            "priority": "high",
            "due_date": "2026-10-20"
        },
        {
            "id": 2,
            "title": "Implement User Registration",
            "description": "Build the registration form with input validation and integration with the authentication service.",
            "status": "done",
            "priority": "high",
            "due_date": "2026-10-25"
        },
        {
            "id": 3,
            "title": "Create Navigation Components",
            "description": "Develop reusable navigation bars, menus, and tab components for the mobile interface.",
            "status": "done",
            "priority": "medium",
            "due_date": "2026-10-30"
        },
        {
            "id": 4,
            "title": "Build User Profile Page",
            "description": "Implement a profile page displaying user information, profile pictures, and account settings.",
            "status": "done",
            "priority": "medium",
            "due_date": "2026-11-05"
        },
        {
            "id": 5,
            "title": "Implement Dashboard Layout",
            "description": "Create the main dashboard with summary cards, recent activity, and quick navigation.",
            "status": "in_progress",
            "priority": "high",
            "due_date": "2026-11-10"
        },
        {
            "id": 6,
            "title": "Integrate Push Notifications",
            "description": "Implement push notification support for important application events and user updates.",
            "status": "in_progress",
            "priority": "high",
            "due_date": "2026-11-16"
        },
        {
            "id": 7,
            "title": "Develop Search Functionality",
            "description": "Add a search interface with filtering, suggestions, and dynamic search results.",
            "status": "in_progress",
            "priority": "medium",
            "due_date": "2026-11-17"
        },
        {
            "id": 8,
            "title": "Review Authentication Flow",
            "description": "Test login, registration, session persistence, and logout functionality across different devices.",
            "status": "in_review",
            "priority": "high",
            "due_date": "2026-11-20"
        },
        {
            "id": 9,
            "title": "Test Responsive Design",
            "description": "Verify that application layouts and components display correctly across different screen sizes.",
            "status": "in_review",
            "priority": "medium",
            "due_date": "2026-11-22"
        },
        {
            "id": 10,
            "title": "Implement Dark Mode",
            "description": "Add a dark theme with persistent user preferences and smooth transitions between themes.",
            "status": "todo",
            "priority": "low",
            "due_date": "2026-11-25"
        },
        {
            "id": 11,
            "title": "Optimize Application Performance",
            "description": "Improve loading times by optimizing images, reducing unnecessary renders, and implementing lazy loading.",
            "status": "todo",
            "priority": "medium",
            "due_date": "2026-11-28"
        },
        {
            "id": 12,
            "title": "Prepare Production Release",
            "description": "Complete final testing, resolve outstanding bugs, and prepare the mobile application for deployment.",
            "status": "todo",
            "priority": "high",
            "due_date": "2026-12-05"
        }
    ]
};

workspace.currentTask = {
    "id": 1,
    "name": "Prepare Production Release",
    "description": "Complete final testing, resolve outstanding bugs, and prepare the mobile application for deployment.",
    "status": "todo",
    "priority": "high",
    "due_date": "2026-12-05",
    "creator_username": "user_432",
    "comment_notifications": 0,
    "log_notifications": 0,
    "assignees": [
        {
            "id": 1,
            "username": "user_432"
        },
        {
            "id": 5,
            "username": "user_576"
        }
    ],
    "label_ids": [1, 2],
    "comments": [
        {
            "id": 1,
            "sender_username": "user_432",
            "timestamp": "2026-11-12 12:45:32",
            "message": "This task should be medium priority."
        },
        {
            "id": 2,
            "sender_username": "dev_alex",
            "timestamp": "2026-11-12 14:18:07",
            "message": "I've started working on the implementation. Should have an update by tomorrow."
        },
        {
            "id": 3,
            "sender_username": "sarah_dev",
            "timestamp": "2026-11-13 09:32:15",
            "message": "Can someone review the latest changes before we merge?"
        },
        {
            "id": 4,
            "sender_username": "user_108",
            "timestamp": "2026-11-13 11:06:48",
            "message": "The API integration is complete, but I'm still testing the error handling."
        },
        {
            "id": 5,
            "sender_username": "mike_tech",
            "timestamp": "2026-11-13 16:24:03",
            "message": "Found a small bug when submitting the form with empty fields."
        },
        {
            "id": 6,
            "sender_username": "dev_alex",
            "timestamp": "2026-11-14 10:15:29",
            "message": "Fixed the validation issue. Everything seems to be working now."
        },
        {
            "id": 7,
            "sender_username": "user_432",
            "timestamp": "2026-11-14 13:47:56",
            "message": "Let's move this task to In Review once the remaining tests pass."
        },
        {
            "id": 8,
            "sender_username": "sarah_dev",
            "timestamp": "2026-11-15 08:53:12",
            "message": "The UI looks good overall. I suggest adjusting the spacing between the buttons."
        },
        {
            "id": 9,
            "sender_username": "mike_tech",
            "timestamp": "2026-11-15 15:39:41",
            "message": "All unit tests are passing. Ready for the final review."
        },
        {
            "id": 10,
            "sender_username": "user_108",
            "timestamp": "2026-11-16 17:12:08",
            "message": "Changes have been approved and merged into the main branch."
        }
    ],
    "activity_logs": [
        {
            "timestamp": "2026-11-12 09:15:23",
            "topic": "new_task",
            "message": "user_432 created the task."
        },
        {
            "timestamp": "2026-11-12 10:42:17",
            "topic": "description",
            "message": "sarah_dev updated the task description."
        },
        {
            "timestamp": "2026-11-12 14:28:35",
            "topic": "priority",
            "message": "dev_alex changed priority from Low to Medium."
        },
        {
            "timestamp": "2026-11-13 12:32:56",
            "topic": "status",
            "message": "sarah_dev moved task from To Do -> In Progress."
        },
        {
            "timestamp": "2026-11-14 11:18:43",
            "topic": "due_date",
            "message": "mike_tech updated the task's due date to November 18, 2026."
        },
        {
            "timestamp": "2026-11-15 09:23:51",
            "topic": "status",
            "message": "dev_alex moved task from In Progress -> In Review."
        },
        {
            "timestamp": "2026-11-16 13:05:38",
            "topic": "priority",
            "message": "sarah_dev changed priority from Medium to High."
        },
        {
            "timestamp": "2026-11-17 10:36:14",
            "topic": "status",
            "message": "user_108 moved task from In Review -> Done."
        }
    ]
};

*/