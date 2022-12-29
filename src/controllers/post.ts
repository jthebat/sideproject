import { Request, Response } from "express";
import pool from "../config/mysql";

export default {
    // 게시물 작성
    post: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { roomId } = req.params;
        const { title, content } = req.body;

        const date = new Date();

        const post = `INSERT INTO posts (roomId, snsId ,title, content, createdAt) VALUES (?,?,?,?,?)`;
        const conn = await pool.getConnection();
        try {
            await conn.query(post, [roomId, snsId, title, content, date]);
            res.status(200).send({ message: "success" });
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        }
    },

    // 게시물 전체조회
    getPost: async (req: Request, res: Response) => {
        const { roomId } = req.query;
        const existRoom = `SELECT nickname, title, content, createdAt FROM posts JOIN users ON posts.snsId = users.snsId
        WHERE posts.roomId=?`;

        const conn = await pool.getConnection();

        try {
            const [result] = await conn.query(existRoom, [roomId]);
            res.status(200).send({
                message: "success",
                result
            });
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        }
    },

    // 게시물 상세 조회
    postDetail: async (req: Request, res: Response) => {
        const { postId } = req.query;

        const findPost = `SELECT title, content, images, createdAt FROM posts WHERE postId=?`;

        const conn = await pool.getConnection();

        try {
            const result = await conn.query(findPost, [postId]);
            res.status(200).send({
                message: "success"
                // result: result[0]
            });
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        }
    },

    //  게시물 삭제
    deletePost: async (req: Request, res: Response) => {
        const { postId } = req.params;
        const { snsId } = res.locals.user.info;

        const findPost = `SELECT postId, snsId FROM posts WHERE postId=? AND snsId=?`;
        const deletePost = `DELETE FROM posts as p WHERE p.postId=?`;
        /*
        connectDB.query(findPost, [postId, snsId], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            if (1) {
                connectDB.query(deletePost, [postId], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        res.status(200).send({
                            message: "success"
                        });
                    }
                });
            } else {
                res.status(400).send({
                    message: "존재하지 않는 게시물입니다."
                });
            }
        });
        */
    },

    // 게시물 수정
    postUpdate: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { postId } = req.params;
        const { title, content } = req.body;
        const updateTime = new Date();

        const existPost = `SELECT snsId FROM posts WHERE postId=?`;
        const postUpdate = `UPDATE posts SET title=?, content=?, updatedAt=? WHERE postId=?`;
        /*
        connectDB.query(existPost, [postId], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            if (1) {
                connectDB.query(postUpdate, [title, content, updateTime, postId], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        res.status(200).send({
                            message: "success"
                        });
                    }
                });
            } else {
                return res.status(400).send({
                    message: "작성자만 수정이 가능합니다."
                });
            }
        });
        */
    }
};
