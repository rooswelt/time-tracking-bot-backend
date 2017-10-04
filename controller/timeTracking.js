var redmineCtrl = require('./redmine');

module.exports = {
    registerTime: registerTime,
    getProjects: getProjects,
    createUser: createUser
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

function createUser(username, name, surname, mail) {
    return redmineCtrl.createUser(username, name, surname, mail);
}