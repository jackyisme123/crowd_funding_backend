const user = require('../controllers/user.server.controller.js');
const jwt = require('jwt-simple');
const db = require('../../config/db.js');
var isValidToken = function (token, done) {
    if(token!=null) {
        let login_id;
            try {
            var decoded = jwt.decode(token, '123456789');
            login_id = decoded.iss;
        } catch (err) {
            return done(null,false);
        }

        db.get().query('SELECT token FROM Response WHERE user_id =?;', login_id, function (err, result) {
                if(err){
                    console.log(err);
                    return done(null, false);
                }else if(result[0] == null){
                    return done(null, false);
                }else if(result[0].token == token){
                    return done(null, true);
                }else{
                    return done(null, false);
                }
        });
    }else{
        return done(null, false);
    }
}

const myMiddleWare = (req, res, done)=>{
    isValidToken(req.get('X-Authorization'), function(err, result) {
            if(result){
                done();
            }else{
                res.status(401).send('Unauthorized ');
            }
        });
}


module.exports = function (app) {
    app.route('/api/v1/projects').get(user.view_all_current_project)//.post(user.create_project);
    app.route('/api/v1/projects/:pro_id').get(user.view_project_detail)//.put(user.update_project);
    app.route('/api/v1/projects/:pro_id/image').get(user.view_project_image)//.put(user.update_project_image);
    //app.route('/projects/:pro_id/pledge').post(user.pledge_to_project);
    app.route('/api/v1/projects/:pro_id/rewards').get(user.view_project_rewards)//.put(user.update_project_rewards);
    app.route('/api/v1/users').post(user.create_user);
    app.route('/api/v1/users/login').post(user.login);
    //app.route('/users/logout').post(user.logout);
    app.route('/api/v1/users/:user_id').get(user.get_user)//.put(user.update_user).delete(user.delete_user);

    //app.use(myMiddleWare);
    app.put('/api/v1/projects/:pro_id', myMiddleWare, user.update_project);
    app.post('/api/v1/projects', myMiddleWare, user.create_project);
    app.put('/api/v1/projects/:pro_id/image', myMiddleWare, user.update_project_image);
    app.post('/api/v1/projects/:pro_id/pledge', myMiddleWare, user.pledge_to_project);
    app.put('/api/v1/projects/:pro_id/rewards', myMiddleWare, user.update_project_rewards);
    app.post('/api/v1/users/logout', myMiddleWare, user.logout);
    app.put('/api/v1/users/:user_id', myMiddleWare, user.update_user);
    app.delete('/api/v1/users/:user_id', myMiddleWare, user.delete_user);

}