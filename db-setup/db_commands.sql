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

-- post in a thread call
SELECT "post_thread"('${tSubject}', '${pUsername}', '${pText}') AS id;



-- get newly inserted id
SELECT LAST_INSERT_ID();

-- post in a thread
INSERT INTO Posts(
	p_thread_id, p_username, p_text)
VALUES(
	${pThreadId}, '${pUsername}', '${pText}'
)


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


-- delete a thread
DELETE FROM Threads WHERE t_thread_id = ${tThreadId}
-- delete a post 
DELETE FROM Posts WHERE p_post_id = ${pPostID}

-- load thread in catalog
-- creation time
SELECT * FROM Threads ORDER BY thread_id DESC
-- bump order
SELECT * FROM Threads ORDER BY t_bump_time DESC
-- reply count
SELECT * FROM Threads ORDER BY t_post_num DESC
-- load OP
SELECT * FROM Threads WHERE thread_id = ${threadId}
-- load posts
SELECT * FROM Posts WHERE p_thread_id = ${threadId}
