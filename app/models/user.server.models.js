const db = require('../../config/db.js');
//use async.waterfall which make the codes more readable and maintainable
const async = require('async');
//quite a smart program for create a token
const jwt = require('jwt-simple');
//get the current time for set token expire time, but not used yet
const moment = require('moment');
//for reading file
const fs = require('fs');
const Math = require('math');

//creator some errors for distinguish different error types
var error401 = new Error('401');
var error403 = new Error('403');
var error404 = new Error('404');

//if you want to insert a project, you must:
//1.login and your id and name must be contained in creators block of json
//2.the other creator (id and name) must be created
//3.creator should be at least one person who login
//4.there will not be two creators owned same id
//5.imageUri will be tried to read file, if throw an err, it the imageUri will be set as default path
exports.insert_a_project = function (login_id, project_data, done) {

    let title = project_data['title'];
    let subtitle = project_data['subtitle'];
    let imageUri = project_data['imageUri'];
    let desc = project_data['desc'];
    let target = project_data['target'];
    let creators = project_data['creators'];
    let rewards = project_data['rewards'];
    var pro_id;
    let creator_names = [];
    for (let creator of creators) {
        let creator_id = creator['id'];
        let creator_name = creator['name'];
        creator_names.push([creator_id, creator_name]);
    }

    let values0 = [title, subtitle, imageUri, desc, target];

    let sql1 = 'INSERT INTO Project (pro_title, pro_subtitle, pro_imageUri, pro_desc, pro_target) VALUES (?,?,?,?,?);';
    let sql2 = 'SELECT pro_id FROM Project ORDER BY pro_id DESC LIMIT 1;';
    let sql3 = 'INSERT INTO Creator (creator_id, creator_name, pro_id) VALUES (?,?,?);';
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
        },function task2(res, callback){//get pro_id of latest created project
            db.post().query(sql2, function (err, result) {
                if (err) {
                    console.log(err);
                    callback(err, null);
                    return;
                } else {
                    let pro_id = result[0].pro_id;
                    callback(null, pro_id);
                }

            });
        },function task3(pro_id, callback) {
            let values1 = [];
            //check user_id and user_name can matched or not
            db.get().query('SELECT user_id, user_name FROM Users WHERE (user_id, user_name) in (?);', [creator_names], function (err, result) {
                console.log(creator_names);
                console.log(result);
                if(err){
                    callback(err,pro_id);
                    return;
                }else{
                    if(result[0] == undefined){
                        callback(error401, pro_id);
                        return;
                    }else if(result.length != creator_names.length){
                        callback(error401, pro_id);
                        return;
                    }else{
                        var flag = 0;
                        for(let row of result){
                            let creator_id = row.user_id;
                            let creator_name = row.user_name;
                            if (creator_id == login_id) {
                                flag =1;
                            }
                            values1.push([creator_id, creator_name, pro_id]);
                        }
                        if(flag != 1){
                            callback(error401, pro_id);
                        }else{

                            callback(null, values1, pro_id);
                        }
                    }
                }
            });
            },function task31(values1, pro_id ,callback){//insert info into creator
            let flag = 0;
            let count = 0;
            //insert creators into table
            for(let value of values1){
                console.log(value);
                db.post().query(sql3, value, function (err, res) {
                    if(err){
                        console.log(err);
                        flag =1;
                        callback(new Error('cannot insert into creator'), pro_id);
                    }

                });
                //if err out of loop
                if(flag ==1 ){
                    break;
                    //if to the end of loop, callback
                }else if(count == values1.length-1){
                    console.log('create a new Creator');
                    return callback(null, pro_id);
                }
                count++;
                console.log(count);
            }
        }, function task4(pro_id, callback){//insert info into reward
            if(rewards[0]!=undefined){
                let values2 = [];
                if(rewards[0]!=undefined) {
                    for (let reward of rewards) {
                        let rew_id = rewards['id'];
                        let rew_amount = reward['amount'];
                        let rew_desc = reward['description'].toString();
                        values2.push(rew_id, rew_amount, rew_desc, pro_id);
                    }
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
            console.log(result);
            db.post().query('DELETE FROM Reward WHERE pro_id = ?;DELETE FROM Creator WHERE' +
                ' pro_id = ?;DELETE FROM Project WHERE pro_id = ?;',values4,function (err, result) {
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



exports.get_all_project = function (startIndex, count, done) {
    db.get().query('SELECT pro_id, pro_title, pro_subtitle, pro_imageUri, open FROM Project;', function (err, rows) {
        // console.log(startIndex, count);
        if (err) {
            console.log(err);
            return done(err, null);
        }else{
            //if startIndex is not existed, set 0
            if(startIndex == undefined){
                startIndex =0;
            }
            else{
                startIndex = parseInt(startIndex);
                //if startIndex < 0, return err;
                if(startIndex < 0){
                return (new Error('Unvalidated'), null);
            } else if(startIndex >= rows.length){
                //if startIndex>rows.length, return empty []
                return done(null, []);
            }
            }
            //if count is not existed, set to longest length
            if(count == undefined){
                count = rows.length - startIndex;
            }else{
                count =parseInt(count);
            if (count < 0){
               //if count < 0, return err
                return (new Error('Unvalidated'), null);
            }else if(count > rows.length - startIndex) {
                //if count is too big, let it be maximum length
                count = rows.length - startIndex;
            }
            console.log(count);
            }
            let projects_json = [];
            for(let i = startIndex; i< count+startIndex ; i++){
                let pro_id = rows[i].pro_id;
                let pro_title = rows[i].pro_title;
                let pro_subtitle = rows[i].pro_subtitle;
                let pro_imageUri = rows[i].pro_imageUri;
                let open = rows[i].open;
                //if project is open, let it be shown when call, otherwise invisible
                if(open == 1){
                    let project_json = {
                        "id": pro_id,
                        "title": pro_title,
                        "subtitle": pro_subtitle,
                        "imageUri": pro_imageUri
                    };
                    projects_json.push(project_json);
                }
            }
            return done(null, projects_json);
        }

    });
}
/*
get project detail by id
login or unlogin user can check it.
if the project status is closed, just its creator can check it
if the backer is anonymous, just show anonymous in id and amount
-----------------------------------------------------------------------------------------------------------------------
I cannot really understand why type of creationDate will be set to be integer. I use timestamp instead of.
In my opinion, if it is an integer, it should be set a standard time point such as 1970-01-01 00:00:00, then save
millisecond numbers from that time point to now. I thought it would be a little complicated and maybe confused the user
who uses database.
Overall, In this case I use timestamp and use function now() to help record the creationDate.
Maybe use DateTime will be more reasonable, because timestamp may have the problem of 'YEAR-2037';
 */
exports.get_a_project = function (pro_id, login_id, done) {
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
    var anonymous;
    var creators = [];
    var rewards = [];
    var backers = [];
    var open;
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
                open = rows1[0].open;
                current_pledge = rows1[0].current_pledge;
                num_backers = rows1[0].num_backers;
                async.waterfall([
                    function task1(callback){
                        db.get().query('SELECT * FROM Creator WHERE pro_id = ?;', pro_id, function (err, rows2) {
                            if (!err) {
                                var flag = 0;
                                for (let row2 of rows2) {
                                    creator_id = row2.creator_id;
                                    creator_name = row2.creator_name;
                                    if (creator_id == login_id){
                                        flag = 1;
                                    }
                                    let creator = [creator_id, creator_name];
                                    creators.push(creator);
                                }
                                //if (no login user or login user is not the user who create the project) and project status is closed,
                                // the user can not view the project
                                if(flag == 1){
                                    callback(null, creators);
                                }else{
                                    if(open == 1){
                                        callback(null, creators);
                                    }else{
                                        return callback(error404, null);
                                    }
                                }
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
                                    anonymous = row4.anonymos;
                                    let backer = [backer_id, backer_amount, anonymous];
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
                            return done(err, null);

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
                                    //if backer is anonymous, show id and amount anonymous
                                    if (backers[i][2] == 0) {
                                        var backer_json = {
                                            "id": backers[i][0],
                                            "amount": backers[i][1]
                                        };
                                    }else{
                                        var backer_json = {
                                            "id": "anonymous",
                                            "amount": "anonymous"
                                        };
                                    }
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

//just the creator can change the project
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

//get project image from imageUri
exports.view_image = function (pro_id, done) {
    db.get().query('SELECT open FROM Project WHERE pro_id =?;', pro_id, function (err, results) {//check if the project is open
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            if(results[0] == undefined){
                return done(error404, null);
            }else{
            if(results[0].open == 0){
                return done(error404, null);
            }else {
                db.get().query('SELECT pro_imageUri FROM Project WHERE pro_id = ?;', pro_id, function (err, rows) {
                    if (err) {
                        console.log(err);
                        return done(err, null);
                    } else {
                        if (rows[0] == undefined) {
                            return done(error404, null);
                        }
                        let uri = rows[0].pro_imageUri;
                        console.log(uri);
                        //read local file
                        // let uri = 'F:/crowd-funding/image/test.JPG';
                        fs.readFile(uri, "binary", function (err, result) {
                            if (err) {
                                console.log(err);
                                return done(err, null);
                            } else {
                                // console.log(result);
                                return done(null, result);
                            }
                        });
                    }

                });
            } }}});

}

//put file into './image/' and modify the imageUri in table project;
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
                    let imageUri = './image/pro_'+pro_id+'.JPG';
                   //your image will be stored in image folder, and given name pro_ + project name
                    fs.writeFile(imageUri, image, 'binary',function (err ,result) {
                        if(err){
                            console.log(err);
                            return done(err,null);
                        }else{
                            db.put().query('UPDATE Project SET pro_imageUri = ? WHERE pro_id = ?', [imageUri, pro_id],function (err, result) {
                                if(err){
                                    console.log(err);
                                }else{
                                    return done(null, 'OK');
                                }
                            });
                        }
                    });
                }
            }
        }
    });
}

/*
login user can make a pledge, but creator can not do it,
If a pledge was made, the current pledge and number of backers will be changed
 */
exports.pledge_an_amount = function (data, done) {
    let pro_id = data['pro_id'];
    let amount = data['amount'];
    let anonymous = data['anonymous'];
    let auth_token = data['auth_token'];
    let login_id = data['login_id'];
    db.get().query('SELECT open FROM Project WHERE pro_id =?;', pro_id, function (err, results) {//check if the project is open
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            if(results[0] == undefined){
                return done(error404, null);
            }else{
            if(results[0].open == 0){
                return done(error404, null);
            }else{
                db.get().query('SELECT * FROM Creator WHERE pro_id = ?;', pro_id, function (err, result) {
                    if(err){
                        console.log(err);
                        return done(err, null);
                    }else {
                        if (result[0] == undefined) {
                            return done(error404, null);
                        } else {
                            let flag = 0;
                            for(let res of result){
                                if (res.creator_id == login_id) {//check if there is any creators want to make a pledge
                                    flag = 1;
                                    break;
                                }
                            }
                            if (flag==1) {
                                return done(error403, null);
                            } else {
                                let values = [null, login_id, pro_id, amount, anonymous, auth_token];
                                db.post().query('INSERT INTO Pledge VALUES (?);', [values], function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        return done(err, null);
                                    } else {
                                        db.get().query('SELECT current_pledge, num_backers FROM Project WHERE pro_id = ?;', pro_id, function (err, result) {
                                            if (err) {
                                                console.log(err);
                                                return done(err, null);
                                            } else {
                                                //update current_pledge, number of backers from project
                                                let current_pledge = result[0].current_pledge + amount;
                                                let num_backers = result[0].num_backers + 1;
                                                db.post().query('UPDATE Project SET current_pledge = ?, num_backers =? WHERE pro_id =?;', [current_pledge, num_backers, pro_id], function (err, result) {
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
                                });
                            }
                        }
                    }
                });
            }
            } }
    });


}


//people can view rewards of project which is open
exports.view_rewards = function (pro_id, done) {
    db.get().query('SELECT open FROM Project WHERE pro_id =?;', pro_id, function (err, results) {//check if the project is open
        if(err){
            console.log(err);
            return done(err, null);
        }else{
            if(results[0]!= undefined){
            if(results[0].open == 0){
                return done(error404, null);
            }else{
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
            }}
        else{
                return done(error404, null);
            }
        }});

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
                    if(res.creator_id == login_id){
                        flag = 1;
                    }
                }
                if(flag!=1){
                    return done(error403, null);
                }else{
                    let count = 0;
                        for(let reward of rewards){
                            db.put().query('UPDATE Reward  SET rew_amount=?, rew_desc=? WHERE rew_id = ? AND pro_id =?;', [reward[1], reward[2], reward[0], pro_id], function (err, result) {
                                if(err){
                                    console.log(err);
                                    return done(err, null);
                                }else{
                                    console.log(result);
                                    if(!result.affectedRows){
                                        return done(new Error('rew_id'), null);
                                    }else{
                                        if(count == rewards.length -1) {
                                            return done(null, 'OK');
                                        }
                                        count++;
                                    }
                                }
                            });

                        }


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
    let sql = 'INSERT INTO Users (user_name, password, location, email) VALUES (?,?,?,?);';
    db.get().query('SELECT user_name FROM Users;', function (err ,result) {
        if(err){
            console.log(err);
            done(err, null);
        }else{
            //check if the username has been occupied.
            var flag = 0;
            for(let res of result){
                if(res.user_name == name){
                    flag = 1;
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
                        db.get().query('SELECT user_id from Users ORDER BY user_id DESC LIMIT 1;', function (err, result) {
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

/*
1.check if there is correctness of username and password
2.create a token but I did not set expired date, it's easy for test
3.insert the token into table response
 */
exports.log_in = function (user_name, password, done) {
    let err400 = new Error('400');
    async.waterfall([
        function task1(callback) {
            db.get().query("SELECT * FROM Users WHERE user_name =?;", user_name, function (err, result) {
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
                    //if user already login, which cannot insert a repetitive user_id,
                    if (err){
                        console.log(err);
                        return done(new Error("login"), null);
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

//delete token info from table response
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

//get user info by user id
exports.get_user_by_id = function (user_id, done) {
    db.get().query('SELECT * FROM Users WHERE user_id =?;',user_id, function (err, result) {
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
                    let email = result[0].email;
                    let user_json = {
                        "id": user_id,
                        "username": user_name,
                        "location": location,
                        "email": email
                    }
                    return done(null, user_json);
                }else{
                    return done(error404, null);
                }
            }
        }
    });
}


//update user info by user_id
//1.check if user id is existed
//2.check if the user name is existed
//3.update user data
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
        db.get().query('SELECT * FROM Users;', function (err, result) {
            console.log(result);
            if(err){
                console.log(err);
                return done(err, null);
            }else{
                if(result[0]==undefined){
                    return done(error404);
                }else{
                    let flag = 0;
                    for (let res of result){
                        if(res.user_name == user_name){
                            flag = 1;
                        }
                    }
                    //can not set same user name
                    if(flag == 1){
                        return done(new Error('sameuser'), null);

                    }else{
                    db.put().query('UPDATE Users SET user_name=?,password=?,location=?,email=? WHERE user_id = ?', [user_name, password, location, email,user_id], function (err, result) {
                        if(err){
                            console.log(err);
                            return done(err, null);
                        }else{
                            return done(null, 'OK');
                        }
                    });
                }
            }
            }
        });
    }
}


/*
I think it is the most complicated function in the whole api
because there are several different conditions.
------------------------------------------------------------------------------------------
1. distinguish if the want-deleted user is the last creator of a project
if the user do not own any project => step 2
else if the user own project(s), but not the last creator in any project, => step 2
else => reject delete request
2. user logout, remove user from creator table, set user.status in users table to false;
if the use own some pledge(s), it should also be removed from pledge table. And
the current_pledge and number of backers should be modified.
------------------------------------------------------------------------------------------
I wrote a delete and modify function to do step 2.
 */
exports.delete_user_by_id = function (login_id, user_id, done) {
    if(login_id != user_id){
        return done(error403, null);
    }else{
        db.get().query('SELECT * FROM Creator WHERE creator_id = ?;', user_id, function (err, result) {
            if(err){
                console.log(err);
                return done(err, null);
            }else{
                //if user id did not create a project, then delete pledge if did and modify the current pledge
                //and number of backers in project, delete user, logout and so on.
                if(result[0] == undefined){
                    delete_and_modify(user_id, function (err, result1) {
                        if(err){
                            console.log(err);
                            return done(err, null);
                        }else{
                            return done(null, result1);
                        }
                    });
                }else {
                    // collect all projects created by user, and traverse all creators in the these projects to check
                    //if the user is the last creator of any project.
                    //if yes, return 'last creator, cannot be deleted',
                    //else, delete user, call delete_and_modify function which has been introduced as above.
                    let flag1 = 0;
                    let count = 0;
                    for(let res of result){
                        db.get().query('SELECT COUNT(*) FROM Creator WHERE pro_id = ?', res.pro_id, function (err, result2) {
                            if(err){
                                console.log(err);
                            }else{
                                for(let res2 of result2){
                                    if(res2['COUNT(*)'] == 1){
                                        flag1 = 1;
                                        break;
                                    }
                                }
                                if(flag1 == 1){
                                    return done(new Error('lastcreator'), null);
                                }else{
                                    if(count == result.length - 1){
                                        delete_and_modify(user_id, function (err, result1) {
                                            if(err){
                                                console.log(err);
                                                return done(err, null);
                                            }else{
                                                return done(null, result1);
                                            }
                                        });
                                    }
                                    count++;

                                }


                            }
                        });
                    }
                    console.log(flag1);

                }
            }
        });
    }
}


/*
Because function delete_user_by_id, creator 2 branches at step1, I wrote delete_and_modify for reuse
1.delete user token for logging out, delete user in table creator, set user status to 0 in user table
2-4. change update current_pledge and number of backers in project table and delete user from pledge table
 */
var delete_and_modify = function (user_id, done) {
    db.delete().query('DELETE FROM RESPONSE WHERE user_id = ?;DELETE FROM Creator WHERE creator_id = ?;UPDATE Users SET status = 0 WHERE user_id = ?;', [user_id, user_id, user_id], function (err, result) {
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
                                if (err) {
                                    console.log(err);
                                    return done(err);
                                } else {
                                    let current_pledge = result[0].current_pledge - amount;
                                    let num_backers = result[0].num_backers - 1;
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

