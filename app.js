const db =require('./config/db.js');
const express = require('./config/express.js');
const app = express();

db.connect(function (err) {
    if (err) {
        console.log(err);

    }else {
        app.listen(4941, function () {
            console.log('Listening on port ' + 4941);
        });
    }
});