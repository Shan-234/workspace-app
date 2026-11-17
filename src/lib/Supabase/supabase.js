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

    return true;
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
    
    const { error: member_insert_error } = await supabase
        .from("members")
        .insert({
            user_id: workspace.currentUser["id"],
            team_id: team_id,
            notifications: 0
        });
    
    const { data: team_data, error: team_select_error } = await supabase
        .from("teams")
        .select("*")
        .eq("team_id", team_id)
        .single();
    
    
    console.log(team_data);

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
    
    workspace.currentProject["tasks"] = tasks_data;

    return workspace.currentProject;
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
            due_date: new_task.due_date
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
            notifications: 0
        });
    }

    const { error: assignments_error } = await supabase
        .from("assignments")
        .insert(assignment_entries);
    
    if (assignments_error) {
        return false;
    }

    return true;
}

export async function updateTaskStatus(task_id, status) {
    const { error: task_error } = await supabase
        .from("tasks")
        .update({
            status: status
        })
        .eq("id", task_id);
    
    if (task_error) {
        return false;
    }

    return true;
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
};*/