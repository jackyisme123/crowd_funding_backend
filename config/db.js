const mysql = require('mysql');
const state = {
    pool:null
};

exports.connect = function(done){
    state.pool = mysql.createPool({
        connectionLimit: 100,
        host: process.env.SENG365_MYSQL_HOST || 'localhost',
        port: process.env.SENG365_MYSQL_PORT || '3306',
        user: 'root',
        password: 'secret',
        database: 'CROWDFUNDING',
        multipleStatements: true
    });
    // let count = 0;
    // var timer = setInterval(function(){state.pool.getConnection(function (err, connection) {
    //     if(err){
    //         count += 1;
    //         console.log('Cannot connect database, count times = ' + count +', max count number is 5');
    //         if (count == 5){
    //             console.log('stop connecting database, please check deployment');
    //             process.exit(1);
    //         }
    //     }
    //     else {
    //         clearInterval(timer);
    //         /*if database crowdfunding is exists, drop it. If not, create a database crowdfunding and use it*/
    //         connection.query('DROP DATABASE IF EXISTS CROWDFUNDING;', function (err, result) {
    //             if (err) {
    //                 console.log(err);
    //             }
    //         });
    //         /*create tables*/
    //         let createtable = 'CREATE DATABASE IF NOT EXISTS CROWDFUNDING; USE CROWDFUNDING;' +
    //             'CREATE TABLE User (' +
    //             'user_id int(8) AUTO_INCREMENT NOT NULL,' +
    //             'user_name varchar(20) NOT NULL,' +
    //             'password varchar(20) NOT NULL,' +
    //             'location varchar(50),' +
    //             'email varchar(20),' +
    //             'status tinyint(1) NOT NULL DEFAULT 1,' +
    //             'PRIMARY KEY (user_id)' +
    //             ');' +
    //             'CREATE TABLE Project (' +
    //             'pro_id int(8) AUTO_INCREMENT NOT NULL,' +
    //             'pro_title varchar(20) NOT NULL,' +
    //             'pro_subtitle varchar(20) NOT NULL,' +
    //             'pro_imageUri varchar(100),' +
    //             'pro_desc varchar(250) NOT NULL,' +
    //             'pro_target int(20) NOT NULL,' +
    //             'current_pledge int(20) DEFAULT 0,' +
    //             'num_backers int(10) DEFAULT 0,' +
    //             'open tinyint(1) DEFAULT 1,' +
    //             'creationDate DATETIME DEFAULT NOW(),' +
    //             'PRIMARY KEY (pro_id)' +
    //             ');'+
    //             'CREATE TABLE Reward (' +
    //             'rew_id int(8) NOT NULL AUTO_INCREMENT,' +
    //             'rew_amount int(20),' +
    //             'rew_desc varchar(250),' +
    //             'pro_id int(8),' +
    //             'PRIMARY KEY (rew_id),' +
    //             'FOREIGN KEY (pro_id) REFERENCES Project (pro_id)' +
    //             ');' +
    //             'CREATE TABLE Creator(' +
    //             'num_id int(8) NOT NULL AUTO_INCREMENT,'+
    //             'creator_id int(8),' +
    //             'creator_name varchar(20),' +
    //             'pro_id int(8),' +
    //             'PRIMARY KEY (num_id),' +
    //             'FOREIGN KEY (creator_id) REFERENCES User (user_id),' +
    //             // 'FOREIGN KEY (creator_name) REFERENCES User (user_name),' +
    //             'FOREIGN KEY (pro_id) REFERENCES Project (pro_id)' +
    //             ');' +
    //             'CREATE TABLE Pledge (' +
    //             'ple_id int(8) AUTO_INCREMENT NOT NULL,' +
    //             'backer_id int(8) NOT NULL,' +
    //             'pro_id int(8) NOT NULL,' +
    //             'amount int(20) NOT NULL,' +
    //             'anonymous tinyint(1) DEFAULT 0,' +
    //             'auth_token varchar(250) NOT NULL,' +
    //             'PRIMARY KEY (ple_id),' +
    //             'FOREIGN KEY (backer_id) REFERENCES User (user_id),' +
    //             'FOREIGN KEY (pro_id) REFERENCES Project (pro_id)' +
    //             ');'+
    //             'CREATE TABLE Response('+
    //             'user_id int(8),' +
    //             'token varchar(250),' +
    //             'PRIMARY KEY (user_id),' +
    //             'FOREIGN KEY (user_id) REFERENCES User (user_id)'+
    //             ');';
    //         connection.query(createtable, function (err, result) {
    //             if(!err){
    //                 console.log('success to create tables');
    //             }else{
    //                 console.log(err);
    //             }
    //         });
    //
    //         connection.release();
    //     }
    //
    //
    // });
    //
    // }, 2000);
    done();
};

exports.get = function () {
    return state.pool;
};

exports.post = function () {
    return state.pool;
};

exports.put = function () {
    return state.pool;
};

exports.delete = function () {
    return state.pool;
}