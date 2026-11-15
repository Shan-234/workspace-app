import { createClient } from '@supabase/supabase-js';
import Workspace from '../Workspace/Workspace';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

export const workspace = new Workspace();

// Sample Data
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