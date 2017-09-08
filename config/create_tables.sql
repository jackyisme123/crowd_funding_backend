CREATE TABLE User (
user_id int(8) AUTO_INCREMENT NOT NULL,
user_name varchar(20) NOT NULL,
password varchar(20) NOT NULL,
location varchar(50),
email varchar(20),
token varchar(100),
PRIMARY KEY (user_id)
);

CREATE TABLE Project (
pro_id int(8) AUTO_INCREMENT NOT NULL,
pro_title varchar(20) NOT NULL,
pro_subtitle varchar(20) NOT NULL,
pro_imageUri varchar(100) NOT NULL,
pro_desc varchar(250),
pro_target int(20) NOT NULL,
creator_id int(8) NOT NULL,
current_pledge int(20) DEFAULT 0,
num_backers int(10) DEFAULT 0
PRIMARY KEY (pro_id),
FOREIGN KEY(creator_id) REFERENCES User (user_id)
);

CREATE TABLE Reward (
rew_id int(8) AUTO_INCREMENT NOT NULL,
rew_amount int(20) NOT NULL,
rew_desc varchar(250)
pro_id int(8),
PRIMARY KEY (rew_id),
FOREIGN KEY (pro_id) REFERENCES Project (pro_id)
);

CREATE TABLE Pledge (
ple_id int(8) AUTO_INCREMENT NOT NULL,
backer_id int(8) NOT NULL,
pro_id int(8) NOT NULL,
amount int(20) NOT NULL,
anonymous tinyint(1) DEFAULT 0,
auth_token varchar(100) NOT NULL,
PRIMARY KEY(ple_id),
FOREIGN KEY (backer_id) REFERENCES User (user_id),
FOREIGN KEY (pro_id) REFERENCES Project(pro_id)
);




