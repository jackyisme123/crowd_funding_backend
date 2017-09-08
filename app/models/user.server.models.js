const db = require('../../config/db.js');
//use async.waterfall which make the codes more readable and maintainable
const async = require('async');
//quite a smart program for create a token
const jwt = require('jwt-simple');
//get the current time for set token expire time, but not used yet
const moment = require('moment');
//for reading file
const fs = require('fs');

//creator some errors for distinguish different error types
var error401 = new Error('401');
var error403 = new Error('403');
var error404 = new Error('404');

exports.insert_a_project = function (login_id, project_data, done) {

    let title = project_data['title'];
    let subtitle = project_data['subtitle'];
    let imageUri = project_data['imageUri'];
    let desc = project_data['desc'];
    let target = project_data['target'];
    let creators = project_data['creators'];
    let rewards = project_data['rewards'];
    var pro_id;
    let values1 = [];
    let values2 = [];
    for (let creator of creators) {
        let creator_id = creator['id'];
        let creator_name = creator['name'].toString();
        values1.push(creator_id, creator_name, pro_id);
    }
    for (let reward of rewards) {
        let rew_id = rewards['id'];
        let rew_amount = reward['amount'];
        let rew_desc = reward['description'].toString();
        values2.push(rew_id, rew_amount, rew_desc, pro_id);
    }
    let values0 = [title, subtitle, imageUri, desc, target];

    let sql1 = 'INSERT INTO Project (pro_title, pro_subtitle, pro_imageUri, pro_desc, pro_target) VALUES (?,?,?,?,?);';
    let sql2 = 'SELECT pro_id FROM Project ORDER BY pro_id DESC LIMIT 1';
    let sql3 = 'INSERT INTO Creator (creator_id, creator_name, pro_id) VALUES (?);';
    let sql4 = 'INSERT INTO Reward (rew_id, rew_amount, rew_desc, pro_id) VALUES (?);';

    async.waterfall([
        function task1(callback) {//insert a info into  project table;
            db.post().query(sql1, values0, function (err, result) {
                if (err) {
                    callback(err, null);
                    return;
                } else {
                    let result = "success";
                    callback(null,result);
                    }

            });
        },function task2(res, callback){//get pro_id of lastest created project
        //           console.log(res);
            db.post().query(sql2, function (err, result) {
                if (err) {
                    callback(err, null);
                    return;
                } else {
                    let pro_id_str = new String(result[0].pro_id);
                    let pro_id = parseInt(pro_id_str);
                    callback(null, pro_id);

                }

            });
        },function task3(pro_id, callback) {
            let values1 = [];

            db.get().query('SELECT user_id FROM User;', function (err, result) {//get user_id
                if(err){
                    callback(err, null,pro_id);
                    return;
                }else{
                    if(result[0] == undefined){
                        callback(error401,null,pro_id);
                        return;
                    }else{
                            var flag2 =0;
                            for (let creator of creators) {
                                 var flag =0;
                                let creator_id = creator['id'];
                                //ensure creator is the account who login
                                if(creator_id == login_id){
                                    flag2=1;
                                }
                                for(let res of result){
                                    let user_id =res.user_id;
                                  // creator must from user table
                                    if(creator_id == user_id){
                                        flag = 1;
                                        break;
                                    }

                                }
                                if(flag == 0){
                                    callback(error401, null, pro_id);
                                    return;
                                }
                                let creator_name = creator['name'].toString();
                                values1.push(creator_id, creator_name, pro_id);

                            }
                            if(flag2 == 0){
                                callback(error401, null, pro_id);
                                return;
                            }


                        callback(null, values1, pro_id);

                    }
                }
            });


            },function task31(values1, pro_id ,callback){//insert info into creator
            db.post().query(sql3, [values1], function (err, res) {

                let result = pro_id;
                if(err){
                    console.log(err);
                    callback(err, result);
                    return;
                }else{

                   // console.log('create a new Creator');
                    callback(null,result);
                }
            });

        }, function task4(pro_id, callback){//insert info into reward
            if(rewards!=undefined){
                let values2 = [];
                for (let reward of rewards) {
                    let rew_id = rewards['id'];
                    let rew_amount = reward['amount'];
                    let rew_desc = reward['description'].toString();
                    values2.push(rew_id, rew_amount,rew_desc, pro_id);
                }

                let result = pro_id;
                db.post().query(sql4, [values2], function (err, res) {
                    if(err){
                        callback(err, result);
                        return;
                    }else{
                        callback(null,result);
                    }
                });

            }else{
                callback(null, pro_id);
            }
        }



    ],function (err, result) {//if fail in previous steps, roll back
        if(err){
           console.log(err);
            let values4 = [result, result, result];
            db.post().query('DELETE FROM Reward WHERE pro_id = ?;DELETE FROM Creator WHERE pro_id = ?;DELETE FROM Project WHERE pro_id = ?;',values4,function (err, result) {
                if(err){
                    console.log(err);
                }else{
                    console.log("ROLLBACK");
                }
            });
            done(err,null);
        }
        else{
            done(null,result);
        }
    });

}

exports.get_all_project = function (done) {
    db.get().query('SELECT pro_id, pro_title, pro_subtitle, pro_imageUri FROM Project;', function (err, rows) {
        if (err) {
            return done(err);
        }
        return done(rows);
    });
}

exports.get_a_project = function (pro_id, done) {
    var pro_creationDate;
    var pro_title;
    var pro_subtilte;
    var pro_desc;
    var pro_imageUri;
    var pro_target;
    var creator_id;
    var creator_name;
    var rew_id;
    var rew_amount;
    var rew_desc;
    var current_pledge;
    var num_backers;
    var backer_id;
    var backer_amount;
    var creators = [];
    var rewards = [];
    var backers = [];
    db.get().query('SELECT * FROM Project WHERE pro_id = ?', pro_id, function (err, rows1) {
        if (err) {
            console.log(err);
            return done(err, null);
        } else {
            if (rows1[0] == undefined) {
                return done(error404, null);
            }
            else {
                pro_creationDate = rows1[0].creationDate;
                pro_title = rows1[0].pro_title;
                pro_subtilte = rows1[0].pro_subtitle;
                pro_imageUri = rows1[0].pro_imageUri;
                pro_desc = rows1[0].pro_desc;
                pro_target = rows1[0].pro_target;
                current_pledge = rows1[0].current_pledge;
                num_backers = rows1[0].num_backers;
                async.waterfall([
                    function task1(callback){
                        db.get().query('SELECT * FROM Creator WHERE pro_id = ?;', pro_id, function (err, rows2) {
                            if (!err) {

                                for (let row2 of rows2) {
                                    creator_id = row2.creator_id;
                                    creator_name = row2.creator_name;
                                    let creator = [creator_id, creator_name];
                                    creators.push(creator);
                                }
                                callback(null, creators);
                            } else {
                                console.log(err);
                                callback(err,null);
                                return;
                            }
                        });
                    }, function task2(creators, callback) {
                        db.get().query('SELECT * FROM Reward WHERE pro_id =?;', pro_id, function (err, rows3) {
                            if (err) {
                                console.log(err);
                                callback(err, null,null);
                                return;
                            } else{
                                if (rows3[0] != undefined) {
                                for (let row3 of rows3) {
                                    rew_id = row3.rew_id;
                                    rew_amount = row3.rew_amount;
                                    rew_desc = row3.rew_desc;
                                    let reward = [rew_id, rew_amount, rew_desc];
                                    rewards.push(reward);
                                }
                            }
                            callback(null, creators, rewards);
                            }
                        });

                    }, function task3(creators, rewards, callback) {
                        db.get().query('SELECT * FROM Pledge WHERE pro_id=?', pro_id, function (err, rows4) {
                            if (err) {
                                console.log(err);
                                callback(err, null, null, null);
                                return;
                            } else {
                                if (rows4[0] != undefined) {
                                for (let row4 of rows4) {
                                    backer_id = row4.backer_id;
                                    backer_amount = row4.amount;
                                    let backer = [backer_id, backer_amount];
                                    backers.push(backer);
                                }
                            }
                            callback(null, creators, rewards, backers);
                            }
                        });
                    }
                    ],function final(err, creators, rewards,backers) {//make a json array as return value
                        if(err){
                            console.log(err);
                        }else{
                            let rewards_json = {"rewards": []}
                            if (rewards.length != 0) {
                                for (let i in rewards) {
                                    let reward_json = {
                                        "id": rewards[i][0],
                                        "amount": rewards[i][1],
                                        "description": rewards[i][2]
                                    }
                                    rewards_json.rewards.push(reward_json);
                                }
                            }
                            let creators_json = {"creators": []}
                            for (let i in creators) {
                                let creator_json = {
                                    "id": creators[i][0],
                                    "name": creators[i][1]
                                }
                                creators_json.creators.push(creator_json);
                            }
                            let data_json = {
                                "data": {
                                    "title": pro_title,
                                    "subtitle": pro_subtilte,
                                    "description": pro_desc,
                                    "imageUri": pro_imageUri,
                                    "target": pro_target,
                                    creators_json,
                                    rewards_json
                                }
                            }
                            let project_json = {
                                "id": pro_id,
                                "creationDate": pro_creationDate,
                                data_json
                            }
                            var progress_json = {};
                            var backers_json = {"backers":[]}
                            if (backers.length != 0) {

                                progress_json = {
                                    "progress": {
                                        "target": pro_target,
                                        "currentPledge": current_pledge,
                                        "numberOfBackers": num_backers
                                    }
                                }
                                for(let i in backers){
                                    let backer_json={
                                        "id": backers[i][0],
                                        "amount": backers[i][1]
                                    };
                                    backers_json.backers.push(backer_json);
                                }

                            }
                            let view_project_detail_json ={
                                project_json,
                                progress_json,
                                backers_json
                            }
                            return done(null,view_project_detail_json);
                        }


                });






            }
        }
    });



}

exports.change_project_status = function (login_id, pro_id, done) {
    db.get().query('SELECT open from Project WHERE pro_id = ?;', pro_id, function (err, rows1) {
        if(err){

            console.log(err);
            return done(err,null);
        }else {
            if (rows1[0] == undefined) {
                return done(error404,null);
            }else{
                var status = rows1[0].open;
                //verify the creator of project
                db.get().query('SELECT creator_id FROM Creator WHERE pro_id =?;', pro_id,function (err, rows) {
                    if(err){
                        console.log(err);
                        return done(err,null);
                    }else{
                        let flag = 0;
                        for(let row of rows){
                            if(row.creator_id == login_id){
                                flag=1;
                            }
                        }
                        if(flag==0){
                            return done(error403,null);
                        }else{
                            let change;
                            if(status == 1){
                                change=0;
                            }else{
                                change=1;
                            }
                            //change status of project;
                            db.get().query('UPDATE Project SET open = ? WHERE pro_id = ?', [change, pro_id], function (err, result) {
                                if(err){
                                    console.log(err);
                                    return done(err,null);
                                }else{
                                    return done(null,'OK');
                                }
                            });
                        }
                    }
                });
            }
        }
    });
    }


exports.view_image = function (pro_id, done) {
    db.get().query('SELECT pro_imageUri FROM Project WHERE pro_id = ?;', pro_id, function (err, rows) {
        if (err) {
            console.log(err);
            return done(err,null);
        } else {
            if(rows[0]==undefined){
                return done(error404, null);
            }
            // let uri = new String(rows[0].pro_imageUri);
            //read local file
            let uri = 'F:/crowd-funding/image/test.JPG';
            fs.readFile(uri, "binary", function (err, result) {
                if(err){
                    console.log(err);
                    return done(err, null);
                }else{
                   // console.log(result);
                    return done(null, result);
                }
            });
        }

    });
}

exports.update_image = function (pro_id, login_id, image, done) {
    db.get().query('SELECT creator_id FROM Creator WHERE pro_id = ?;', pro_id, function (err, result) {
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            if(result[0] == undefined){
                return done(error404, null);
            }else{
                let flag = 0;
                for(let res of result){
                    if(res.creator_id == login_id){
                        flag = 1;
                    }
                }
                if(flag!=1){
                    return done(error403, null);
                }else{
                    fs.writeFile('F:/crowd-funding/image/test.JPG', image, 'binary',function (err ,result) {
                        if(err){
                            console.log(err);
                            return done(err,null);
                        }else{
                            return done(null, 'OK');
                        }
                    });
                }
            }
        }
    });
}

/*
NEED MODIFY
create a pledge ,change the current_pledge of project and number of backers
*/
exports.pledge_an_amount = function (data, done) {
    let pro_id = data['pro_id'];
    let ple_id = data['ple_id'];
    let amount = data['amount'];
    let anonymous = data['anonymous'];
    let auth_token = data['auth_token'];
    let login_id = data['login_id'];
    db.get().query('SELECT * FROM Creator WHERE pro_id = ?;', pro_id, function (err, result) {
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            if(result[0]==undefined){
                return done(error404, null);
            }else if(result[0].creator_id == login_id){
                return done(error403, null);
            }else{
                let values = [ple_id, login_id, pro_id, amount, anonymous, auth_token];
                db.post().query('INSERT INTO Pledge VALUES (?);', [values], function (err, result) {
                    if(err){
                        console.log(err);
                        return done(err, null);
                    }else{
                        db.get().query('SELECT current_pledge, num_backers FROM Project WHERE pro_id = ?;', pro_id, function (err, result) {
                            if(err){
                                console.log(err);
                                return done(err, null);
                            }else{
                                //update current_pledge, number of backers from project
                                let current_pledge = result[0].current_pledge + amount;
                                let num_backers = result[0].num_backers + 1;
                                db.post().query('UPDATE Project SET current_pledge = ?, num_backers =? WHERE pro_id =?;', [current_pledge, num_backers,pro_id], function (err, result) {
                                    if(err){
                                        console.log(err);
                                        return done(err, null);

                                    }else{
                                        return done(null,'OK');
                                    }
                                });
                            }
                        });

                    }
                });
            }
        }
    });
}

exports.view_rewards = function (pro_id, done) {
    db.get().query('SELECT * FROM Reward WHERE pro_id = ?;', pro_id, function (err, result) {
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            if(result[0] == undefined){
                return done(error404, null);
            }else{
                console.log(result);
                var rewards_json = [];
                for(let resu of result){
                    let rew_id = resu.rew_id;
                    let rew_amount = resu.rew_amount;
                    let rew_desc = resu.rew_desc;
                    let reward_json = {
                        "id": rew_id,
                        "amount": rew_amount,
                        "description": rew_desc
                    };
                    rewards_json.push(reward_json);
                }
                return done(null, rewards_json);
            }
        }
    });
}


exports.update_rewards = function (login_id, pro_id, rewards, done){
    db.get().query('SELECT creator_id FROM Creator WHERE pro_id = ?;', pro_id, function (err, result) {
        if(err){
            console.log(err);
            return done(err,null);
        }else{
            if(result[0]==undefined){
                return done(error404, null);
            }else{
                let flag = 0;
                for(let res of result){
                    if(res.creator_id != login_id){
                        flag = 1;
                    }
                }
                if(flag){
                    return done(error403, null);
                }else{
                    for(let reward of rewards){
                        var result = db.put().query('UPDATE Reward  SET rew_id =?, rew_amount=?, rew_desc=? WHERE pro_id = ?;', [reward[0], reward[1], reward[2], pro_id], function (err, result) {
                            if(err){
                                console.log(err);
                                return 'break';
                            }else{
                                return 'OK';

                            }});

                        if(result == 'break'){
                            return done(err,null);
                        }
                    }
                    return done(null, 'OK');


                    }
                }
            }
        }
    );
}

//if usename has existed, you can not create user;
exports.insert_a_user = function (data, done) {
    let name = data['name'];
    let pwd = data['pwd'];
    let location = data['location'];
    if (location != null) {
        location = location.toString();
    }
    let email = data['email'];
    if (email != null) {
        email = email.toString();
    }
    let values = [name, pwd, location, email];
    let sql = 'INSERT INTO User (user_name, password, location, email) VALUES (?,?,?,?);';
    db.get().query('SELECT user_name FROM User;', function (err ,result) {
        if(err){
            console.log(err);
            done(err, null);
        }else{
            //check if the username has been occupied.
            var flag = 0;
            for(let res of result){
                if(res.user_name == name){
                    flag == 1;
                }
            }
            if(flag == 1){
                return done(new Error('existed'), null);
            }else{
                db.post().query(sql, values, function (err, result) {
                    if (err) {
                        console.log(err);
                        return done(err,null);
                    } else {
                        console.log(result);
                        db.get().query('SELECT user_id from User ORDER BY user_id DESC LIMIT 1;', function (err, result) {
                            if(err){
                                return done(err, null);
                            }
                            else{
                                let user_id_str = new String(result[0].user_id);
                                let user_id = parseInt(user_id_str);
                                return done(null,user_id);
                            }
                        });
                    }
                });
            }
        }
    });

}

exports.log_in = function (user_name, password, done) {
    let err400 = new Error('400');
    async.waterfall([
        function task1(callback) {
            db.get().query("SELECT * FROM User WHERE user_name =?;", user_name, function (err, result) {
                if(err){
                    console.log(err);
                    callback(err, null);
                    return;
                }else{
                    if(result[0]==undefined){
                        callback(err400,null);
                        return;
                    }else if(new String(result[0].password)!= password){
                        callback(err400,null);
                        return;
                    }else{
                        callback(null, result[0]);
                    }
                }
            });
        },function task2(user, callback) {
            //create a token;
            var user_status = user.status;
            if (user_status == 1) {
                var user_id = user.user_id;
                var expires = moment().add(30, 'days').valueOf();
                var token = jwt.encode({
                    iss: user_id,
                    exp: expires,
                }, '123456789', null);
                callback(null, user_id, token);
            }else{
                callback(new Error('invisible'), null, null);
            }
        }
    ],function final(err, user_id, token) {
            if(err){
                return done(err, null);
            }else{
                console.log(token);
                db.post().query("INSERT INTO Response (user_id, token) VALUES (?, ?);", [user_id, token], function (err, result) {
                    if (err){
                        console.log(err);
                    }else{
                        let token_json = {
                            "id": user_id,
                            "token":token
                        }
                        return done(null,token_json);
                    }
                });

            }
    });

}

exports.log_out = function (token, done) {
    db.delete().query('DELETE FROM Response WHERE token = ?;', token, function (err, result) {
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            return done(null,'OK');
            }

    });
}

exports.get_user_by_id = function (user_id, done) {
    db.get().query('SELECT * FROM User WHERE user_id =?;',user_id, function (err, result) {
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            if(result[0]==undefined){
                return done(error404, null);
            }else {
                let user_status = result[0].status;
                //if status == 0, cannot find user;
                if (user_status == 1) {
                    let user_id = result[0].user_id;
                    let user_name = result[0].user_name;
                    let location = result[0].location;
                    let email = result[0].result;
                    let user_json = {
                        "id": user_id,
                        "username": user_name,
                        "location": location,
                        "email": email
                    }
                    return done(null, result);
                }else{
                    return done(error404, null);
                }
            }
        }
    });
}

exports.update_user_by_id = function (data, done) {
    let login_id = data['login_id'];
    let user_id = data['user_id'];
    let user_name =data['user_name'];
    let location = data['location'];
    let email = data['email'];
    let password = data['password'];
    if(login_id!=user_id){
       return  done(error403, null);
    }else{
        db.get().query('SELECT * FROM User WHERE user_id =?;', user_id, function (err, result) {
            if(err){
                console.log(err);
                return done(err, null);
            }else{
                if(result[0]==undefined){
                    return done(error404);
                }else{
                    db.put().query('UPDATE User SET user_name=?,password=?,location=?,email=?', [user_name, password, location, email], function (err, result) {
                        if(err){
                            console.log(err);
                            return done(err, null);
                        }else{
                            return done(null, 'OK');
                        }
                    });
                }
            }
        });
    }
}

/*
if delete token, set user.status = 0, delete pledge, modify the current_pledge of project, number of backers,
if only one creator of status is 1, alarm that can not delete user.
I haven't reuse any function in this function, it is terribly complicated,
because I am not very familier with this language(JS).
 */
exports.delete_user_by_id = function (login_id, user_id, done) {
    if (login_id != user_id) {
        return done(error403, null);
    } else {
        db.get().query('SELECT * FROM User WHERE user_id = ?;', user_id, function (err, result) {
            if (err) {
                console.log(err);
                return done(err, null);
            } else {
                if (result[0] == undefined) {
                    return done(error404, null);
                } else {
                    //to get if the want-deleted user is the last creator of the project is quite complicated
                    //first step get all pro_id of the want-deleted user
                    //second get the number of creators in the project
                    //if number <=1, cannot delete usesr;
                    db.get().query('SELECT pro_id FROM Creator WHERE creator_id =?', user_id, function (err, result) {
                        if(err){
                            console.log(err);
                            return done(err, null);
                        }else {
                            //want-deleted user_id has created a project
                            if(result[0]!= undefined){
                                let pros = [];
                                for(let res of result){
                                    let pro_id = res.pro_id;
                                    pros.push(pro_id);
                                    db.get().query('SELECT COUNT(*) FROM Creator WHERE pro_id = (SELECT pro_id FROM Creator WHERE creator_id =?);', user_id, function (err, result) {
                                        if (err) {
                                            console.log(err);
                                            return done(err, null);
                                        } else {
                                            let flag = 0;
                                            for (let res in result) {
                                                if (result[0]['COUNT(*)'] <= 1) {
                                                    flag = 1;
                                                }
                                            }
                                            //set a flag to test if there is any project that want-deleted user is only one creator.
                                            // If yes, inform do not delete, delete  creators from all projects otherwise
                                            if (flag == 1) {
                                                return done(new Error('last_creator'), null);
                                            } else {
                                                //logout, delete creator_id, set status=0;
                                                db.delete().query('DELETE FROM RESPONSE WHERE user_id = ?;DELETE FROM Creator WHERE creator_id = ?;UPDATE User SET status = 0;', [user_id, user_id], function (err, result) {
                                                        if (err) {
                                                            console.log(err);
                                                            return done(err, null);

                                                        } else {
                                                            db.get().query('SELECT amount, pro_id FROM Pledge WHERE backer_id =?;', user_id, function (err, result) {
                                                                if (err) {
                                                                    console.log(err);
                                                                    return done(err, null);
                                                                } else {
                                                                    if (result[0] != undefined) {
                                                                        var amount = result[0].amount;
                                                                        var pro_id = result[0].pro_id;
                                                                        db.get().query('SELECT current_pledge, num_backers FROM Project WHERE pro_id =?;', pro_id, function (err, result) {
                                                                            if(err){
                                                                                console.log(err);
                                                                                return done(err);
                                                                            }else{
                                                                                let current_pledge = result[0].current_pledge -amount;
                                                                                let num_backers = result[0].num_backers -1;
                                                                                //update current_pledge, number of backers, delete pledge
                                                                                db.put().query('UPDATE Project SET current_pledge = ?, num_backers = ? WHERE pro_id = ?;' +
                                                                                    'DELETE FROM Pledge WHERE backer_id = ?;', [current_pledge, num_backers, pro_id, user_id], function (err, result) {
                                                                                    if (err) {
                                                                                        console.log(err);
                                                                                        return done(err, null);
                                                                                    } else {
                                                                                        return done(null, 'OK');
                                                                                    }
                                                                                });
                                                                            }
                                                                        });

                                                                    }
                                                                    else {
                                                                        return done(null, 'OK');
                                                                    }
                                                                }
                                                            });

                                                        }

                                                    }
                                                );
                                            }
                                        }
                                    });
                                }
                            //want-deleted user_id has not created a project
                            }else{
                                            //logout, set status = 0;
                                            db.delete().query('DELETE FROM RESPONSE WHERE user_id = ?;UPDATE User SET status = 0 WHERE user_id=?;', [user_id, user_id, user_id], function (err, result) {
                                                    if (err) {
                                                        console.log(err);
                                                        return done(err, null);

                                                    } else {
                                                        db.get().query('SELECT amount, pro_id FROM Pledge WHERE backer_id =?;', user_id, function (err, result) {
                                                            if (err) {
                                                                console.log(err);
                                                                return done(err, null);
                                                            } else {
                                                                if (result[0] != undefined) {
                                                                    var amount = result[0].amount;
                                                                    var pro_id = result[0].pro_id;
                                                                    db.get().query('SELECT current_pledge, num_backers FROM Project WHERE pro_id =?;', pro_id, function (err, result) {
                                                                        if(err){
                                                                            console.log(err);
                                                                            return done(err);
                                                                        }else{
                                                                            let current_pledge = result[0].current_pledge -amount;
                                                                            let num_backers = result[0].num_backers -1;
                                                                            //set current_pledge, number of backers, delete pledge
                                                                            db.put().query('UPDATE Project SET current_pledge = ?, num_backers = ? WHERE pro_id = ?;' +
                                                                                'DELETE FROM Pledge WHERE backer_id = ?;', [current_pledge, num_backers, pro_id, user_id], function (err, result) {
                                                                                if (err) {
                                                                                    console.log(err);
                                                                                    return done(err, null);
                                                                                } else {
                                                                                    return done(null, 'OK');
                                                                                }
                                                                            });
                                                                        }
                                                                    });

                                                                }
                                                                else {
                                                                    return done(null, 'OK');
                                                                }
                                                            }
                                                        });

                                                    }

                                                }
                                            );
                                        }
                                    }
                                });
                            }
                        }
                    });

                }
            }
