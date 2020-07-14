-- SQL commands
CREATE DATABASE splat;

-- USERS
-- User table
CREATE TABLE Users(
	user_id SERIAL NOT NULL PRIMARY KEY, 
	username VARCHAR(18) NOT NULL,
	email VARCHAR, 
	chess_elo INT DEFAULT 0, 
	password VARCHAR(30) NOT NULL, 
	admin BOOLEAN DEFAULT 'f',
	unique(username)
)

alter table users add following text[] DEFAULT '{}'::text[];
--Insert User
INSERT INTO Users(
	username, password
) VALUES(
	'test', 'test'
)

-- TEXTBOARD
-- threads are inherit from posts
-- t_post_id references posts, impossible to 
-- implement with forieng key restraint

CREATE TABLE Posts(
	-- post data
	p_post_id SERIAL PRIMARY KEY,
	p_reply_id SERIAL,
	p_username VARCHAR(18) REFERENCES Users(username),
	p_text VARCHAR(1500),
	p_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	p_thread_id INT DEFAULT -1, -- -1 indicates its a thread
	-- thread data
	t_subject VARCHAR(120),
	t_pinned BOOLEAN DEFAULT 'f',
	t_active BOOLEAN DEFAULT 't',
	t_bump_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	t_user_num INT DEFAULT 1,
	t_post_num INT DEFAULT 1
)

-- table for holding replies relationship between posts
CREATE TABLE Replies(
	parent_id SERIAL REFERENCES posts(p_post_id),
	reply_id SERIAL REFERENCES posts(p_post_id)
)


-- Select for catalog
SELECT *
FROM Posts 
WHERE p_thread_id = -1
ORDER BY p_post_id DESC


-- post a thread function and return the new id
CREATE OR REPLACE FUNCTION post_thread(
	in_t_subject VARCHAR(120), 
	in_p_username VARCHAR(18), 
	in_p_text VARCHAR(1500)
)
RETURNS INT AS $$
DECLARE new_post_id INT;
BEGIN
	INSERT INTO Posts(
		t_subject, p_username, p_text)
	VALUES(
		in_t_subject, in_p_username, in_p_text);

	SELECT currval(pg_get_serial_sequence('Posts', 'p_post_id')) INTO new_post_id;

	RETURN new_post_id;
END;
$$ LANGUAGE plpgsql

-- post a thread call
SELECT "post_thread"('${tSubject}', '${pUsername}', '${pText}') AS id;

-- post in a thread function
CREATE OR REPLACE FUNCTION post_reply(
	in_p_thread_id INT, 
	in_p_username VARCHAR(18), 
	in_p_text VARCHAR(1500)
)
RETURNS INT AS $$
DECLARE fresh_user INT := 1;
DECLARE new_post_id INT := -1;
BEGIN
	INSERT INTO Posts(
		p_thread_id, p_username, p_text)
	VALUES(
		in_p_thread_id, in_p_username, in_p_text);
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
$$ LANGUAGE plpgsql

-- reply to a thread function
SELECT "post_reply"(${pThreadId}, '${pUsername}', '${pText}');



-- see if user count needs to be updates
SELECT EXISTS(SELECT 1 FROM Posts WHERE p_thread_id = '${pThreadId}');

-- update thread stats when a new post is posted in the thread
UPDATE Threads
SET 
t_bump_time = ${tBumpTime},
t_post_num = ${tPostNum},
t_user_num = ${tUserNum}
WHERE
thread_id = ${threadId};


-- select posts linked to a thread (op first) (no reply functionality yet)
SELECT * FROM Posts p WHERE p.p_thread_id = ${id} OR p.p_post_id = ${id} ORDER BY p.p_post_id;

-- delete a post function (untested at the moment)
CREATE OR REPLACE FUNCTION delete_post(
	in_p_post_id INT
)
RETURNS VOID AS $$
DECLARE found_thread_id INT;
BEGIN
	--get thread_id
	SELECT p_thread_id WHERE p_post_id = in_p_post_id INTO found_thread_id;
	-- change post number
	UPDATE posts
	SET t_post_num = t_post_num - 1
	WHERE p_post_id = in_p_post_id;
	-- remove post
	DELETE FROM Posts WHERE p_post_id = in_p_post_id;
END;
$$ LANGUAGE plpgsql


-- call the delete post function
SELECT "delete_post"(${pPostID});


-- load posts for a thread
SELECT * FROM Posts p LEFT JOIN Replies r ON r.parent_id = p.p_post_id WHERE p.p_thread_id = ${id} ORDER BY p.p_post_id; 
