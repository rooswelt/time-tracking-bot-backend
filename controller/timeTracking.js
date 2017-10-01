var redmineCtrl = require('./redmine');

module.exports = {
    registerTime: registerTime,
    getProjects: getProjects
}

/**
 *
 * @param {*} duration
 * @param {*} activity
 * @param {*} note
 */
function registerTime(duration, project, note) {
    return redmineCtrl.registerTime(project, duration, note);
}

function getProjects() {
    return redmineCtrl.getProjects();
}