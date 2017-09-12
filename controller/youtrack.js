var Connection = require('youtrack-rest-node-library');

var youtrack;

module.exports = {
    init: init,
    createIssue: createIssue,
    getIssue: getIssue,
    getProjectIssues: getProjectIssues,
    createWorkItem: createWorkItem,
    getProject: getProject,
    getProjects: getProjects
}

/**
 * Youtrack connection initialization
 *
 * @param {*} token
 * @param {*} baseUrl
 */
function init(baseUrl, token) {
    youtrack = new Connection(baseUrl, token);
}

/**
 * Create issue for specified project
 * @param {*} project
 * @param {*} summary
 * @param {*} description
 */
function createIssue(project, summary, description) {
    return youtrack.issue.createIssue(project, summary, description);
}

/**
 * Return issue
 * @param {*} issueId
 */
function getIssue(issueId) {
    return youtrack.issue.getIssue(issueId);
}

/**
 * Return issues related to a specific project
 * @param {*} projectId
 */
function getProjectIssues(projectId, filter, after, max) {
    return youtrack.issue.getProjectIssues(projectId, filter, after, max);
}

/**
 * Create work item for specified issue
 * @param {*} issueId
 * @param {*} date
 * @param {*} duration
 * @param {*} description
 */
function createWorkItem(issueId, date, duration, description) {
    return youtrack.timeTracking.createWorkItem(issueId, date, duration, description);
}

/**
 * Retrieve project details
 * @param {*} projectId
 */
function getProject(projectId) {
    return youtrack.project.getProject(projectId);
}

/**
 * Retrieve accessible projects
 */
function getProjects() {
    return youtrack.project.getProjects();
}