import { Request, Response } from "express";
import { FieldPacket, RowDataPacket } from 'mysql2/promise';
import pool from "../config/mysql";

interface access extends RowDataPacket {
    snsId: number;
}

export default {
    // 게시물 작성
    post: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { roomId } = req.params;
        const { title, content } = req.body;

        const date = new Date();

        const post = `INSERT INTO POSTS (roomId, snsId ,title, content, createdAt) VALUES (?,?,?,?,?)`;
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
        const existRoom = `SELECT nickname, title, content, createdAt FROM POSTS JOIN USERS ON POSTS.snsId = USERS.snsId
        WHERE POSTS.roomId=?`;

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

        const findPost = `SELECT title, content, images, createdAt FROM POSTS WHERE postId=?`;

        const conn = await pool.getConnection();

        try {
            const [result] = await conn.query(findPost, [postId]);
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

    //  게시물 삭제
    deletePost: async (req: Request, res: Response) => {
        const { postId } = req.params;
        const { snsId } = res.locals.user.info;

        const conn = await pool.getConnection();

        const findPost = `SELECT postId, snsId FROM POSTS WHERE postId=? AND snsId=?`;
        const deletePost = `DELETE FROM POSTS as p WHERE p.postId=?`;

        const existPost = await conn.query(findPost, [postId, snsId]);
        if (existPost) {
            await conn.query(deletePost, [postId])
            res.status(200).send({
                message: "success"
            });
        } else {
            res.status(400).send({
                message: "존재하지 않는 게시물입니다."
            });
        }
    },

    // 게시물 수정
    postUpdate: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { postId } = req.params;
        const { title, content } = req.body;
        const updateTime = new Date();

        const conn = await pool.getConnection();

        const existPost = `SELECT snsId FROM POSTS WHERE postId=?`;
        const postUpdate = `UPDATE POSTS SET title=?, content=?, updatedAt=? WHERE postId=?`;

        try {
            const [rows]: [access[], FieldPacket[]] = await conn.query(existPost, [postId]);
            console.log('type: ', typeof (snsId), snsId)
            console.log('post : ', rows[0].snsId, typeof (rows[0].snsId))
            if (rows[0].snsId === snsId) {
                await conn.query(postUpdate, [title, content, updateTime, postId]);
                res.status(200).send({
                    message: "success"
                });
            } else {
                return res.status(400).send({
                    message: "작성자만 수정이 가능합니다."
                });
            }
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        };
    },
};
