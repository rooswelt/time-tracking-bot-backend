var Q = require('q');
var Redmine = require('node-redmine');

var redmine;

exports.init = init;
exports.createUser = createUser;
exports.getProjects = getProjects;
exports.createProject = createProject;
exports.registerTime = registerTime;
exports.getTimeEntries = getTimeEntries;

function init(hostname, apiKey) {
    var config = {
        apiKey: apiKey,
        format: 'json'
    };
    redmine = new Redmine(hostname, config);
}

function createUser(username, name, surname, mail) {
    var deferred = Q.defer();
    redmine.impersonate = null;
    //TODO mrosetti - generate better username and password
    _getUser(username).then((user) => {
        if (user) {
            deferred.resolve(user);
        } else {
            var userData = {};
            userData.user = {
                login: username,
                password: username,
                firstname: name,
                lastname: surname,
                mail: mail || username + '@mail.com',
                mail_notification: 'none',
                must_change_passwd: false,
                generate_password: false
            };
            userData.send_information = false;
            redmine.create_user(userData, function (err, data) {
                if (err) {
                    deferred.reject(err);
                } else {
                    console.log('Redmine user created', data.user);
                    deferred.resolve(data.user);
                }
            })
        }
    }, (error) => {
        deferred.reject(error);
    })
    return deferred.promise;
}

function createProject(userId, projectName) {
    var deferred = Q.defer();
    var identifier = _generateProjectIdentifier(projectName, userId);
    if (userId) {
        redmine.impersonate = userId;
    }
    _getProject(userId, projectName).then((project) => {
        if (project) {
            deferred.resolve(project);
        } else {
            var project = {
                project: {
                    name: projectName,
                    identifier: identifier,
                    enabled_module_names: ['time_tracking']
                }
            };
            redmine.create_project(project, function (err, data) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(data.project);
                }
            });
        }
    }, (error) => {
        deferred.reject(error);
    })
    return deferred.promise;
}

function getProjects(userId) {
    var deferred = Q.defer();
    if (userId) {
        redmine.impersonate = userId;
    }
    redmine.projects(null, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data.projects);
        }
    });
    return deferred.promise;
}

function registerTime(userId, projectId, duration, description, date, activityId) {
    var deferred = Q.defer();
    if (userId) {
        redmine.impersonate = userId;
    }
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
    redmine.create_time_entry(entry, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}

function getTimeEntries(userId, start, end) {
    if (userId) {
        redmine.impersonate = userId;
    }

    var start = start || '1900-01-01';
    var end = end || '2999-12-31';
    var deferred = Q.defer();
    redmine.time_entries({ spent_on: '><' + start + '|' + end }, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data.time_entries);
        }
    });
    return deferred.promise;
}



/// INTERNAL FUNCTIONS ///
function _generateProjectIdentifier(name, userId) {
    if (!name) {
        return '';
    }
    var result = name.toLowerCase().replace(/[^A-Z0-9]+/ig, "_");
    if (userId) {
        result += '_' + userId;
    }
    return result;
}

function _getProject(userId, identifier) {
    if (userId) {
        redmine.impersonate = userId;
    }
    var deferred = Q.defer();
    redmine.get_project_by_id(identifier, {}, function (err, data) {
        if (err) {
            var parsedError;
            try {
                parsedError = JSON.parse(err);
            } catch (parsingError) { }
            if (parsedError && parsedError.ErrorCode == 404) {
                deferred.resolve();
            } else {
                deferred.reject(err);
            }
        } else {
            deferred.resolve(data.project);
        }
    });
    return deferred.promise;
}

function _getUser(login) {
    var deferred = Q.defer();
    redmine.impersonate = null;
    redmine.users({ name: login }, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            if (data.users && data.users.length > 0) {
                deferred.resolve(data.users[0]);
            } else {
                deferred.resolve();
            }

        }
    });
    return deferred.promise;
}