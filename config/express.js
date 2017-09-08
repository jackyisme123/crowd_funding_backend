const express = require('express');
const bodyParser = require('body-parser');

module.exports = function () {
    const app = express();
    app.use(bodyParser.urlencoded({extends: true}));
    app.use(bodyParser.json());
    const Routes = require('../app/routes/user.server.routes.js');
    Routes(app);
    return app;
};