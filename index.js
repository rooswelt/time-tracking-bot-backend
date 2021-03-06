var redmineCtrl = require('./controller/redmine');

/* Redmine consfiguration */
const REDMINE_HOST = process.env.REDMINE_HOST || 'http://redmine:3000';
const REDMINE_API_KEY = process.env.REDMINE_API_KEY || 'bb32e842e3608d594bc20fa256ff9985620e17a1';
redmineCtrl.init(REDMINE_HOST, REDMINE_API_KEY);

/* Facebook Bot */
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const FB_PORT = process.env.FB_PORT || 2000;
const AGENDA_MONGO_URL = process.env.AGENDA_MONGO_URL || 'mongodb://mongo:27017/agenda';
if (FB_PAGE_TOKEN && FB_VERIFY_TOKEN && FB_APP_SECRET) {
    require('./bot/fb_bot').start(FB_PAGE_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET, FB_PORT, AGENDA_MONGO_URL);
}

