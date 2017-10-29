const Bot = require('bootbot');
const Q = require('q');
const _ = require('lodash');
const moment = require('moment');
const timeTrackingCtrl = require('../controller/timeTracking');
const agendaCtrl = require('../controller/agenda');
const cronParser = require('cron-parser');

const DATE_FORMAT = "YYYY-MM-DD";

var bot;

module.exports = {
    start: start
}

/**
 *
 * @param {*} pageToken
 * @param {*} verifyToken
 * @param {*} appSecret
 */
function start(pageToken, verifyToken, appSecret, port, agendaMongoUrl) {
    bot = new Bot({
        accessToken: pageToken,
        verifyToken: verifyToken,
        appSecret: appSecret
    });

    agendaCtrl.init(agendaMongoUrl);

    bot.setGreetingText('Ciao! Io sono il Time Tracking Bot!');
    bot.setGetStartedButton((payload, chat) => {
        chat.getUserProfile().then((user) => {
            chat.say(`Ciao, ${user.first_name}!`);
            createUser(chat).then(() => {
                mainMenu(chat);
            })
        });
    });
    bot.setPersistentMenu([
        {
            type: 'postback',
            title: 'Registra Attività',
            payload: 'REGISTER_ACTIVITY'
        },
        {
            type: 'postback',
            title: 'Resoconto',
            payload: 'REPORT'
        },
        {
            type: 'postback',
            title: 'Ricomincia',
            payload: 'RESTART'
        }
    ]);

    bot.start(port);

    bot.on('message', _onMessageReceived);

    bot.on('postback:REGISTER_ACTIVITY', (payload, chat) => { createUser(chat).then(() => { registerActivity(payload, chat) }) });
    bot.on('postback:REPORT', (payload, chat) => { createUser(chat).then(() => { generateReport(payload, chat) }) });
    bot.on('postback:SCHEDULE', (payload, chat) => { createUser(chat).then(() => { scheduleReminder(payload, chat) }) });
    bot.on('postback:RESTART', (payload, chat) => { createUser(chat).then(() => { mainMenu(chat) }) });
}

function _onMessageReceived(payload, chat) {
    const text = payload.message.text;
    chat.sendTypingIndicator(1000).then(() => mainMenu(chat));
}

function mainMenu(chat) {
    const buttons = [
        { type: 'postback', title: 'Registra attività', payload: 'REGISTER_ACTIVITY' },
        { type: 'postback', title: 'Promemoria', payload: 'SCHEDULE' },
        { type: 'postback', title: 'Resoconto', payload: 'REPORT' }
    ];
    chat.sendButtonTemplate('Cosa vuoi fare?', buttons);
}

function createUser(chat) {
    var deferred = Q.defer();
    chat.getUserProfile().then((user) => {
        timeTrackingCtrl.createUser(user.id, user.first_name, user.last_name).then((createdUser) => {
            deferred.resolve(createdUser);
        }).catch((error) => {
            console.error('Error in user creation', error);
            deferred.reject(error);
        })
    });
    return deferred.promise;
}

function askProjectName(conv) {
    var deferred = Q.defer();
    conv.ask(`Nome del progetto?`, (payload, conv) => {
        const projectName = payload.message.text;
        conv.set('projectName', projectName);
        timeTrackingCtrl.createProject(conv.userId, projectName).then((project) => {
            conv.set('projectName', project.name);
            conv.set('projectId', project.id);
            deferred.resolve(project);
        }).catch((error) => {
            console.error('Error in project creation', error);
            deferred.reject(error);
        });
    })
    return deferred.promise;
}

function scheduleReminder(payload, chat) {
    chat.say('Presto disponibile').then(() => mainMenu(chat));
    /*agendaCtrl.getUserJobs(chat.userId).then((jobs) => {
        if (!jobs || jobs.length == 0) {
            _enableReminder(payload, chat);
        } else {
            _disableReminder(payload, chat, jobs)
        }
    })*/
}

function _enableReminder(payload, chat) {
    chat.say(`Imposta un promemoria per non dimenticarti di registrare il tuo tempo speso`).then(() => {
        chat.conversation((conv) => {
            const question = {
                text: `Quando? Puoi usare una risposta veloce o inserire una espressione CRON https://en.wikipedia.org/wiki/Cron`,
                quickReplies: ["Alle 18 sempre", "Alle 13 e 18 sempre", "Alle 18, lun-ven", "13 e 18, lun-ven"]
            }

            const answer = (payload, chat) => {
                const answer = payload.message.text;
                var cronExpression;
                switch (answer) {
                    case "Alle 18 sempre":
                        cronExpression = "0 0 18 ? * * *";
                        break;
                    case "Alle 13 e 18 sempre":
                        cronExpression = "0 0 13,18 ? * * *";
                        break;
                    case "Alle 18, lun-ven":
                        cronExpression = "0 0 18 ? * 1-5 *";
                        break;
                    case "13 e 18, lun-ven":
                        cronExpression = "0 0 13,18 ? * 1-5 *";
                        break;
                    default:
                        try {
                            cronParser.parseExpression(answer);
                            cronExpression = answer;
                        } catch (e) {
                            console.error('Error parsing cron expression ' + answer, e);
                        }
                        break;
                }
                if (_.isEmpty(cronExpression)) {
                    chat.say(`Non ho capito`).then(() => { conv.ask(question, cronExpression); });
                } else {
                    agendaCtrl.scheduleJob(function (params) {
                        chat.say('Reminder! ' + JSON.stringify(params));//.then(() => registerActivity(payload, chat));
                    }, answer, chat.userId);
                    chat.say(`Promemoria impostato!`).then(() => {
                        conv.end();
                        mainMenu(chat);
                    });
                }
            }
            conv.ask(question, answer);
        });
    })
}

function _disableReminder(payload, chat, jobs) {
    var job = jobs[0];
    const disableReminder = (conv) => {
        agendaCtrl.cancelUserJob(job.attrs.name, chat.userId).then(() => {
            conv.say(`Promemoria disabilitato`).then(() => {
                conv.end();
                mainMenu(chat);
            });

        }, (error) => {
            conv.say(`C'è stato un errore: ` + JSON.stringify(error)).then(() => {
                conv.end();
                mainMenu(chat);
            });
        })
    };
    chat.say(`Hai già un promemoria ` + JSON.stringify(job)).then(() => {
        chat.conversation((conv) => {
            _yesNoQuestion(conv, 'Vuoi disabilitarlo?', disableReminder, function () {
                conv.end();
                mainMenu(chat);
            });
        });
    });
}

function generateReport(payload, chat) {

    const askPeriod = (conv) => {
        const quickReplies = [
            "Oggi", "Ieri", "Questa settimana", "Settimana scorsa", "Questo mese", "Mese scorso", "Tutto"
        ];
        //TODO possiblità di specificare periodo di tempo custom
        const question = {
            text: `In quale periodo?`,
            quickReplies: quickReplies
        }

        const answer = (payload, conv) => {
            const answer = payload.message.text;
            var startDay = moment("1900-01-01");
            var endDay = moment("2999-12-31");
            switch (answer) {
                case "Oggi":
                    stastartDayrt = moment();
                    endDay = moment();
                    break;
                case "Ieri":
                    startDay = moment().subtract(1, "days");
                    endDay = moment().subtract(1, "days");
                    break;
                case "Questa settimana":
                    startDay = moment().startOf("isoWeek");
                    endDay = moment().endOf("isoWeek");
                    break;
                case "Settimana scorsa":
                    startDay = moment().subtract(1, "weeks").startOf("isoWeek");
                    endDay = moment().subtract(1, "weeks").endOf("isoWeek");
                    break;
                case "Questo mese":
                    startDay = moment().startOf("month");
                    endDay = moment().endOf("month");
                    break;
                case "Mese scorso":
                    startDay = moment().subtract(1, "month").startOf("isoWeek");
                    endDay = moment().subtract(1, "month").endOf("isoWeek");
                    break;
            }

            timeTrackingCtrl.getTimeEntries(chat.userId, startDay.format(DATE_FORMAT), endDay.format(DATE_FORMAT)).then((data) => {
                var projects = _groupByProject(data);
                var pairs = _.toPairs(projects)
                if (pairs && pairs.length > 0) {
                    var details = `${answer}, hai lavorato a \n`;
                    _.forEach(pairs, function (project) {
                        var name = project[0];
                        var hours = project[1];
                        details += ` - ${hours} ore a ${name}\n`;
                    })
                    conv.say(details);
                } else {
                    conv.say(answer + ': nessuna attività registrata');
                }
                conv.end();
                mainMenu(chat);
            }).catch((error) => {
                console.error('Error', error);
                conv.say('Errore: ' + JSON.stringify(error));
                conv.end();
                mainMenu(chat);
            });
        };

        conv.ask(question, answer);
    }

    chat.conversation((conv) => {
        askPeriod(conv);
    });
}

function _groupByProject(entries) {
    var results = {};
    _.forEach(entries, function (entry) {
        var projectName = entry.project.name;
        var total = results[projectName] | 0;
        results[projectName] = (total += entry.hours);
    });
    return results;
}

function registerActivity(payload, chat) {
    const askProject = (conv) => {
        timeTrackingCtrl.getProjects(conv.userId).then((projects) => {
            if (!projects || projects.length == 0) {
                askProjectName(conv).then((project) => askDuration(conv));
            } else {
                var quickReplies = [];
                _.each(projects, function (project) {
                    quickReplies.push(`${project.id} - ${project.name}`);
                });
                quickReplies.push('Nuovo progetto');
                const question = {
                    text: `Quale progetto?`,
                    quickReplies: quickReplies
                };

                const answer = (payload, conv) => {
                    const project = payload.message.text;
                    if (project === 'Nuovo progetto') {
                        askProjectName(conv).then((project) => askDuration(conv));
                    } else {
                        const projectId = project.substring(0, project.indexOf('-') - 1);
                        const projectName = project.substring(project.indexOf('-') + 1);
                        conv.set('projectName', projectName);
                        conv.set('projectId', projectId);
                        conv.say(`Ok, progetto ${project}.`).then(() => askDuration(conv));
                    }
                };
                conv.ask(question, answer);
            }
        });
    };

    const askDuration = (conv) => {
        const question = {
            text: 'Quante ore?',
            quickReplies: ['0.5', '1', '2', '4', '8']
        }

        const answer = (payload, conv) => {
            const duration = payload.message.text;
            conv.set('duration', duration);
            askNote(conv);
        };

        conv.ask(question, answer);
    }

    const askNote = (conv) => {
        conv.ask(`Descrivi brevemente cosa hai fatto`, (payload, conv) => {
            const note = payload.message.text;
            conv.set('note', note);
            sendSummary(conv);
        })
    }

    const sendSummary = (conv) => {
        conv.say(`Quindi, ricapitolando:\n - Progetto: ${conv.get('projectName')}\n - Durata: ${conv.get('duration')}\n - Attività: ${conv.get('note')}`);
        _yesNoQuestion(conv, 'Giusto?', registerActivity, askProject, { typing: true });
    };

    const registerActivity = (conv) => {
        var projectId = conv.get('projectId');
        var duration = conv.get('duration');
        var hours = parseFloat(duration);
        var note = conv.get('note');
        timeTrackingCtrl.registerTime(conv.userId, hours, projectId, note).then(function () {
            conv.say('Attività registrata correttamente');
            conv.end();
            mainMenu(chat);
        }, function (error) {
            conv.say('Errore nella registrazione: ' + JSON.stringify(error));
            conv.say('Per favore riprova, se il problema persiste contatta lo sviluppatore: rooswelt83@gmail.com');
            conv.end();
            mainMenu(chat);
        });
    };

    chat.conversation((conv) => {
        askProject(conv);
    });
}

function _yesNoQuestion(conv, message, onYes, onNo, options) {
    const question = {
        text: message,
        quickReplies: ['Sì', 'No']
    };

    const answer = (payload, conv) => {
        const text = payload.message.text;
        conv.say(`You said ${text}!`);
    };

    const callbacks = [
        {
            pattern: ['s', 'S', 'Sì', 'sì', 'si', 'Si', 'SI'],
            callback: (payload, conv) => { onYes(conv) }
        },
        {
            pattern: ['n', 'N', 'no', 'No', 'NO'],
            callback: (payload, conv) => { onNo(conv) }
        }
    ];
    conv.ask(question, answer, callbacks, options);
}

function newProject(payload, chat) {
    chat.conversation((conv) => {
        askProjectName(conv).then((project) => {
            conv.say('Progetto ' + project.name + ' registrato');
            mainMenu(chat)
        });
    });
}