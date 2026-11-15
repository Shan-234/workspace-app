export default class Workspace {
    currentUser;
    currentTeam;
    currentProject;
    currentTask;

    constructor() {
        this.currentUser = null;
        this.currentTeam = null;
        this.currentProject = null;
        this.currentTask = null;
    }
}