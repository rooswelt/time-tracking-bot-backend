var redmineCtrl = require('./redmine');

module.exports = {
    registerTime: registerTime,
    getTimeEntries: getTimeEntries,
    getProjects: getProjects,
    createProject: createProject,
    createUser: createUser
}

/**
 *
 * @param {*} duration
 * @param {*} activity
 * @param {*} note
 */
function registerTime(userId, duration, project, note) {
    return redmineCtrl.registerTime(userId, project, duration, note);
}

function getTimeEntries(userId, start, end) {
    return redmineCtrl.getTimeEntries(userId, start, end);
}

function getProjects(userId) {
    return redmineCtrl.getProjects(userId);
}

function createProject(userId, name) {
    return redmineCtrl.createProject(userId, name);
}

function createUser(username, name, surname, mail) {
    return redmineCtrl.createUser(username, name, surname, mail);
}