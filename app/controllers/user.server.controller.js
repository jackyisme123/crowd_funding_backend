const user = require('../models/user.server.models.js');
const jwt = require('jwt-simple');
const fs = require('fs');
exports.view_all_current_project = function (req, res) {
    user.get_all_project(function (result) {
        let startIndex = req.query.startIndex;
        if(startIndex == undefined){
            startIndex = 0;
        }
        let count = req.query.count;
        if (count == undefined){
            count = result.length;
        }
        let result_str = '[';
        for(let i=startIndex; i< startIndex+count; i++ ){
            if(i >= result.length){
                break;
            }
            result_str += JSON.stringify(result[i]);
            if(i<startIndex+count-1 && i < result.length-1){
                result_str += ',';
            }
        }
        result_str += ']';
        // console.log(result_str);
        res.json(JSON.parse(result_str));
    });
};

exports.create_project = function (req, res) {
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let title = req.body.title;
    let subtitle =req.body.subtitle;
    let desc = req.body.description;
    let imageUri = req.body.imageUri;
    let target = req.body.target;
    let creators=req.body.creators;
    let rewards = req.body.rewards;
    let project_data = {
        "title" : title,
        "subtitle": subtitle,
        "imageUri": imageUri,
        "desc": desc,
        "target": target,
        "creators": creators,
        "rewards": rewards
    };
    user.insert_a_project(login_id, project_data, function (err, result) {
        if(err){
            if(err.message == 401){
                res.status(401).send('Unauthorized - create account to create project');
            }else{res.status(400).send('Malformed project data');}
        }else{
            res.status(200).json(result);
        }

    });
};

exports.view_project_detail = function (req, res) {
    let pro_id = req.params.pro_id;
    user.get_a_project(pro_id, function (err, result) {
  //      console.log(result);
        if(err){
            res.status(404).send('Not found');
        }else{
            res.status(200).json(result);
        }
    });
};

exports.update_project = function (req, res) {
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let pro_id = req.params.pro_id;
    user.change_project_status(login_id, pro_id, function (err, result) {
        if(err){
            if(err.message == 403){
                res.status(403).send('Forbidden - unable to update a project you do not own');
            }else if(err.message == 404){
                res.status(404).send('Not found');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(201).send(result);
        }
    });
};

exports.view_project_image = function (req, res) {
    let pro_id = req.params.pro_id;
    user.view_image(pro_id, function (err, result) {
        if(err){
            if(err.message == 404){
                res.status(404).send('Not found');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.writeHead(200, {"Content-Type": "image/jpeg"});
            res.write(result, 'binary');
            res.end();
        }
    });
};

exports.update_project_image = function (req, res) {
    let pro_id = req.params.pro_id;
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    fs.readFile('F:/image.JPG', 'binary', function (err, result1) {
        if(err){
            console.log(err);
            res.status(400).send('Malformed request');
        }else{
           // console.log(result1);
            user.update_image(pro_id, login_id, result1, function (err, result) {
                if(err){
                    if(err.message == 403){
                        res.status(403).send('Forbidden - unable to update a project you do not own');
                    }else if(err.message == 404){
                        res.status(404).send('Not found');
                    }else{
                        res.status(400).send('Malformed request');
                    }
                }else{
                    res.status(201).send(result);
                }
            });
        }
    });

};

exports.pledge_to_project = function (req, res) {
    let pro_id = req.params.pro_id;
    let ple_id = req.body.id;
    let amount = req.body.amount;
    let anonymous = req.body.anonymous;
    let auth_token = req.body.card.authToken;
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let data ={
        "pro_id": pro_id,
        "ple_id": ple_id,
        "amount": amount,
        "anonymous": anonymous,
        "auth_token": auth_token,
        "login_id":login_id
    };
    console.log(data);
    user.pledge_an_amount(data, function (err, result) {
        if(err){
            if(err.message == 403){
                res.status(403).send('Forbidden - cannot pledge to own project - this is fraud!');
            }else if(err.message == 404){
                res.status(404).send('Not found');
            }else{
                res.status(400).send('Bad user, project, or pledge details');
            }
        }else{
            res.status(201).send(result);
        }
    });

};

exports.view_project_rewards = function (req, res) {
    let pro_id = req.params.pro_id;
    console.log(pro_id);
    user.view_rewards(pro_id, function (err, result) {
        if(err){
            if(err.message == 404){
                res.status(404).send('Not found');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).json(result);
        }
    });
};

exports.update_project_rewards = function (req, res) {
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let pro_id = req.params.pro_id;
    let bodys = req.body;
    let rewards = [];
    for(let body of bodys){
        let rew_id = body.id;
        let rew_amount = body.amount;
        let rew_desc = body.description;
        let reward = [rew_id, rew_amount, rew_desc];
        rewards.push(reward);
    }
    user.update_rewards(login_id, pro_id, rewards, function (err, result) {
        if(err){
            if(err.message==404){
                res.status(404).send('Not found');
            }else if(err.message == 403){
                res.status(403).send('Forbidden - unable to update a project you do not own');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).send(result);
        }
    });
}

exports.create_user = function (req, res) {
    let name = req.body.user.username;
    let pwd = req.body.password;
    let location = req.body.user.location;
    let email = req.body.user.email;
    let data = {
        "name" : name,
        "pwd": pwd,
        "location" : location,
        "email" : email
    };
    user.insert_a_user(data, function (err, result) {
        if(err){
            if(err.message == 'existed'){
                res.status(403).send('User name has been occupied');
            }else {
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).json(result);
        }
    });

};

exports.login = function (req, res) {
    let user_name = req.query.username;
    let password = req.query.password;
    user.log_in(user_name, password, function (err, result) {
        if(err){
            if(err.message==400){
                res.status(400).send('Invalid username/password supplied');
            }
            else if(err.message == 'invisible'){
                res.status(400).send('User has been deleted');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).json(result);
        }
    });
};

exports.logout = function (req, res) {
    let token = req.get('X-Authorization');
    user.log_out(token, function (err, result) {
        if(err){
            res.status(400).send('Invalid username/password supplied');
        }else{
            res.status(200).send(result);
        }
    });
};

exports.get_user = function (req, res) {
      // try{
      let user_id = parseInt(req.params.user_id);
    // }
    // catch (err){
    //     res.status(400).send('Invalid id supplied');
    //     return;
    // }
    user.get_user_by_id(user_id, function (err, result) {
        if(err){
            if(err.message == 404){
                res.status(404).send('User not found');
            }else{
                res.status(400).send('Invalid id supplied');
            }
        }else{
            res.status(200).json(result);
        }
    });


};

exports.update_user = function (req, res) {
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let user_id = parseInt(req.params.user_id);
    let user_name = req.body.user.username;
    let location = req.body.user.location;
    let email = req.body.user.email;
    let password = req.body.password;
    let data = {
        "login_id": login_id,
        "user_id": user_id,
        "user_name": user_name,
        "location": location,
        "email": email,
        "password": password
    }
    user.update_user_by_id(data, function (err, result) {
        if(err){
            if(err.message==403){
                res.status(403).send('Forbidden - account not owned');
            }else if(err.message ==404){
                res.status(404).send('User not found');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).send(result);
        }
    });
};

exports.delete_user = function (req, res) {
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let user_id = parseInt(req.params.user_id);
    user.delete_user_by_id(login_id, user_id, function (err, result) {
        if(err){
            if(err.message == 403){
                res.status(403).send('Forbidden - account not owned');
            }else if(err.message==404){
                res.status(404).send('User not found');
            }else if(err.message == 'last_creator'){
                res.status(400).send('Cannot delete use because it is last creator of project');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).send(result);
        }
    });
};