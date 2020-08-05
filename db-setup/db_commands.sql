-- SQL commands
CREATE DATABASE splat;

-- USERS
-- User table
CREATE TABLE Users(
	username VARCHAR(18) PRIMARY KEY,
	email VARCHAR,
	chess_elo INT ,
	checkers_elo INT ,
	password VARCHAR(30) NOT NULL,
	role CHAR DEFAULT 'u',
	date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

alter table users add column rd numeric;
alter table users add column vol numeric;
alter table users add following text[] DEFAULT '{}'::text[];

alter table users add blocked text[] DEFAULT '{}'::text[];

--Insert User
INSERT INTO Users(
	username, password
) VALUES(
	'test', 'test'
);

--Insert admin for testing
INSERT INTO Users(
	username, password, role
) VALUES(
	'admin', 'root', 'a'
);
-- Table for private forums
CREATE TABLE Forums(
	f_name VARCHAR(18) PRIMARY KEY,
	f_password VARCHAR(30) NOT NULL,
	f_owner VARCHAR(18)
);

-- Creating "default" forum
INSERT INTO Forums(
	f_name, f_password, f_owner
) VALUES(
	'main', 'main', 'test'
);

alter table users add accessible text[] DEFAULT '{main}'::text[];

-- TEXTBOARD
-- threads are inherit from posts
-- t_post_id references posts, impossible to
-- implement with forieng key restraint

CREATE TABLE Posts(
	-- post data
	p_post_id SERIAL PRIMARY KEY,
	p_username VARCHAR(18) REFERENCES Users(username),
	p_text VARCHAR(1500),
	p_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	p_thread_id INT DEFAULT -1, -- -1 indicates its a thread
	p_country_code CHAR(2) DEFAULT 'AX',
	-- thread data
	t_subject VARCHAR(120),
	t_forum VARCHAR(18) DEFAULT 'main',
	t_pinned BOOLEAN DEFAULT 'f',
	t_active BOOLEAN DEFAULT 't',
	t_bump_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	t_user_num INT DEFAULT 1,
	t_post_num INT DEFAULT 1
);

CREATE TABLE Reports(
	r_report_id SERIAL PRIMARY KEY,
	r_rule VARCHAR(18),
	r_post_id INT REFERENCES Posts(p_post_id),
	r_username VARCHAR(18) REFERENCES Users(username)
);

-- table for holding replies relationship between posts
CREATE TABLE Replies(
	parent_id SERIAL REFERENCES posts(p_post_id),
	reply_id SERIAL REFERENCES posts(p_post_id)
);


-- post a thread function and return the new id
CREATE OR REPLACE FUNCTION post_thread(
	in_t_subject VARCHAR(120),
	in_t_forum VARCHAR(18),
	in_p_username VARCHAR(18),
	in_p_text VARCHAR(1500)
)
RETURNS INT AS $$
DECLARE new_post_id INT;
BEGIN
	INSERT INTO Posts(
		t_subject, t_forum, p_username, p_text)
	VALUES(
		in_t_subject, in_t_forum, in_p_username, in_p_text);

	SELECT currval(pg_get_serial_sequence('Posts', 'p_post_id')) INTO new_post_id;

	RETURN new_post_id;
END;
$$ LANGUAGE plpgsql;

-- post a thread call
SELECT "post_thread"('${tSubject}', '${tForum}', '${pUsername}', '${pText}') AS id;

-- post in a thread function
CREATE OR REPLACE FUNCTION post_reply(
	in_p_thread_id INT,
	in_p_username VARCHAR(18),
	in_p_text VARCHAR(1500),
	in_p_country_code CHAR(2)
)
RETURNS INT AS $$
DECLARE fresh_user INT := 1;
DECLARE new_post_id INT := -1;
BEGIN
	INSERT INTO Posts(
		p_thread_id, p_username, p_text, p_country_code)
	VALUES(
		in_p_thread_id, in_p_username, in_p_text, in_p_country_code);
	SELECT currval(pg_get_serial_sequence('Posts', 'p_post_id')) INTO new_post_id;
	-- sees if user has already posted
	IF EXISTS(
		SELECT 1 FROM posts
		WHERE
		p_username = in_p_username
		AND (p_thread_id = in_p_thread_id OR p_post_id = in_p_thread_id)
	)
	THEN
		RAISE INFO 'not a new user';
		fresh_user := 0;
	END IF;
	-- increments post number and user number
	UPDATE posts
	SET t_post_num = t_post_num + 1,
	t_user_num = t_user_num + fresh_user
	WHERE p_post_id = in_p_thread_id;
	RETURN new_post_id;
END;
$$ LANGUAGE plpgsql;

-- update thread stats when a new post is posted in the thread
UPDATE Threads
SET
t_bump_time = ${tBumpTime},
t_post_num = ${tPostNum},
t_user_num = ${tUserNum}
WHERE
thread_id = ${threadId};


-- delete a post function
CREATE OR REPLACE FUNCTION delete_post(
	in_p_post_id INT
)
RETURNS VOID AS $$
DECLARE found_thread_id INT;
BEGIN
	--get thread_id
	SELECT p_thread_id FROM Posts WHERE p_post_id = in_p_post_id INTO found_thread_id;
	-- change post number
	UPDATE posts
	SET t_post_num = t_post_num - 1
	WHERE p_post_id = in_p_post_id
	OR p_thread_id = found_thread_id;
	-- remove replies
	DELETE FROM Replies WHERE parent_id = in_p_post_id OR reply_id = in_p_post_id;
	-- remove reports
	DELETE FROM Reports WHERE r_post_id = in_p_post_id;
	-- remove post
	DELETE FROM Posts WHERE p_post_id = in_p_post_id;
END;
$$ LANGUAGE plpgsql;

-- delete a user and all posts
CREATE OR REPLACE FUNCTION delete_user(
	in_username VARCHAR(18)
)
RETURNS VOID AS $$
BEGIN
	-- delete all posts
	PERFORM "delete_post"(p.p_post_id)
	FROM Posts p
	WHERE p.p_username = in_username;
	-- delete forum
	--DELETE FROM forums
	--WHERE f_owner = in_username;
	-- delete user
	DELETE FROM Users
	WHERE username = in_username;
END;
$$ LANGUAGE plpgsql;
