var youtrackCtrl = require('./youtrack');

module.exports = {
    registerTime: registerTime,
    getProjects: getProjects,
    getProjectIssues: getProjectIssues
}

/**
 *
 * @param {*} duration
 * @param {*} activity
 * @param {*} note
 */
function registerTime(duration, activity, note) {
    var today = new Date();
    return youtrackCtrl.createWorkItem(activity, today, duration, note);
}

function getProjects() {
    return youtrackCtrl.getProjects();
}

function getProjectIssues(projectId, filter, after, max) {
    return youtrackCtrl.getProjectIssues(projectId, filter, after, max);
}