var Q = require('q');
var Redmine = require('node-redmine');

var redmine;

exports.init = init;
exports.createUser = createUser;
exports.getProjects = getProjects;
exports.registerTime = registerTime;

function init(hostname, apiKey) {
    var config = {
        apiKey: apiKey,
        format: 'json'
    };
    redmine = new Redmine(hostname, config);
}

function createUser(username, name, surname, mail) {
    var deferred = Q.defer();
    //TODO mrosetti - generate better username and password
    var userData = {};
    userData.user = {
        login: username,
        password: username,
        firstname: name,
        lastname: surname,
        mail: username + '@mail.com',
        mail_notification: 'none',
        must_change_passwd: false,
        generate_password: false
    };
    userData.send_information = false;
    redmine.create_user(userData, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data);
        }
    })
    return deferred.promise;
}

function getProjects() {
    var deferred = Q.defer();
    redmine.projects(null, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data.projects);
        }
    });
    return deferred.promise;
}

function registerTime(projectId, duration, description, date, activityId) {
    var deferred = Q.defer();
    var entry = {
        time_entry: {
            project_id: projectId,
            hours: duration,
            comments: description
        }
    };
    if (date) {
        entry.time_entry.spent_on = date;
    }
    if (activityId) {
        entry.time_entry.activity_id = activityId;
    }
    redmine.impersonate = '1909997329016116';
    redmine.create_time_entry(entry, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}