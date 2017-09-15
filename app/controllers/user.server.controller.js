const user = require('../models/user.server.models.js');
const jwt = require('jwt-simple');
const fs = require('fs');
exports.view_all_current_project = function (req, res) {
    var startIndex = req.query.startIndex;
    var count = req.query.count;
    // console.log(startIndex, count);
    user.get_all_project(startIndex, count, function (err, result) {
        if(err){
            if(err.message == 'Unvalidated'){
                res.status(400).send('Unvalidated');
            }
            console.log(err);
            res.status(400).send('Malformed request');
        }else{
                res.status(200).json(result);

        }

    });
};

exports.create_project = function (req, res) {
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let title = req.body.title;
    let subtitle =req.body.subtitle;
    let desc = req.body.description;
    //if imageUri cannot be used, change it to default one.
    let imageUri = req.body.imageUri;
    try{
        fs.readFile(uri, "binary");
    }
    catch (err){
        imageUri = "./image/default.jpg";
    };
    let target = req.body.target;
    let creators=req.body.creators;
    if(creators[0] == undefined){
        return res.status(400).send('Malformed project data');
    }else {
        //check if there is any same id in creators block
        let check = [];
        for (let creator of creators){
            let creator_id = creator["id"];
            check.push(creator_id);
        }
        let check1 = check.sort();
        for (let i =0; i<check1.length -1; i++){
            if(check1[i] == check1[i+1]){
                return res.status(400).send('Creator id cannot be same');
            }
        }

    }
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
    let token;
    let decoded;
    let login_id = -1;
    try{
        token = req.get('X-Authorization');
        decoded = jwt.decode(token, '123456789');
        login_id = decoded.iss;
        console.log('login user' + login_id);
    }catch(err){
        console.log('unlogin user');
    }
    user.get_a_project(pro_id, login_id, function (err, result) {
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

/*
WARNING: YOU MUST REPLACE THE PATH OF UPLOADING URI TO YOUR OWN!!!!
 */
exports.update_project_image = function (req, res) {
    let pro_id = req.params.pro_id;
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    //WARNING:
    //the uploading uri should be set by your self!!!!
    let uploadingUri = 'F:/image.JPG';
    fs.readFile(uploadingUri, 'binary', function (err, result1) {
        if(err){
            console.log(err);
            res.status(400).send('CHECK YOUR UPLOADING PATH');
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
    let amount = req.body.amount;
    let anonymous = req.body.anonymous;
    //because this token can be get from client side
    //I do not do any encoding and decoding
    if(req.body.card == undefined){
        res.status(400).send('Bad user, project, or pledge details');
    }
    let auth_token = req.body.card.authToken;
    let token = req.get('X-Authorization');
    let decoded = jwt.decode(token, '123456789');
    let login_id = decoded.iss;
    let data ={
        "pro_id": pro_id,
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
    let bodies = req.body;
    let rewards = [];

    if(bodies[0] != undefined) {
        for (let body of bodies) {
            let rew_id = body.id;
            let rew_amount = body.amount;
            let rew_desc = body.description;
            let reward = [rew_id, rew_amount, rew_desc];
            rewards.push(reward);
        }
    }else{
        res.status(400).send('Malformed request');
    }
    user.update_rewards(login_id, pro_id, rewards, function (err, result) {
        if(err){
            console.log(err);
            if(err.message==404){
                res.status(404).send('Not found');
            }else if(err.message == 403){
                res.status(403).send('Forbidden - unable to update a project you do not own');
            }else if(err.message == 'rew_id'){
                return res.status(403).send('wrong reward id');
            }else{
                return res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).send(result);
        }
    });
}

exports.create_user = function (req, res) {
    let use = req.body.user;
    if(use == undefined){
        res.status(400).send('Malformed request');
    }
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
            }else if(err.message == 'login'){
                res.status(400).send('login already');
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
            }else if(err.message =='sameuser'){
                res.status(400).send('User name has been occupied');
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
            }else if(err.message == 'lastcreator'){
                res.status(400).send('Cannot delete user because it is last creator of project');
            }else{
                res.status(400).send('Malformed request');
            }
        }else{
            res.status(200).send(result);
        }
    });
};