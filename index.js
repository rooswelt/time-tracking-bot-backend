const http = require('http')
var youtrackCtrl = require('./controller/youtrack');

/* Youtrack configuration */
const BASE_URL = process.env.YOUTRACK_BASE_URL || 'http://localhost:81';
const TOKEN = process.env.YOUTRACK_TOKEN || 'http://localhost:81';
youtrackCtrl.init(BASE_URL, TOKEN);

/* Facebook Bot */
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const FB_PORT = process.env.FB_PORT || 2000;
if (FB_PAGE_TOKEN && FB_VERIFY_TOKEN && FB_APP_SECRET) {
    require('./bot/fb_bot').start(FB_PAGE_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET, FB_PORT);
}

