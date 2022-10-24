import { Request, Response } from 'express';
import connectDB from '../config/mysql';

export default {
    // 게시물 작성
    post: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { roomId } = req.params;
        const { title, content } = req.body;

        const date = new Date();

        const post = `INSERT INTO posts (roomId, snsId ,title, content, createdAt) VALUES (?,?,?,?,?)`;

        connectDB.query(post, [roomId, snsId, title, content, date], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            else {
                res.status(200).send({
                    message: 'success'
                });
            };
        });
    },

    // 게시물 전체조회
    getPost: async (req: Request, res: Response) => {
        const { roomId } = req.query;
        const existRoom = `SELECT nickname, title, content, createdAt FROM posts JOIN users ON posts.snsId = users.snsId
        WHERE posts.roomId=?`;

        connectDB.query(existRoom, [roomId], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            else {
                res.status(200).send({
                    message: 'success',
                    result
                });
            };
        });
    },

    // 게시물 상세 조회
    postDetail: async (req: Request, res: Response) => {
        const { postId } = req.query;

        const findPost = `SELECT title, content, images, createdAt FROM posts WHERE postId=?`;

        connectDB.query(findPost, [postId], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            else {
                res.status(200).send({
                    message: 'success',
                    result: result[0]
                });
            };
        });
    },

    //  게시물 삭제
    deletePost: async (req: Request, res: Response) => {
        const { postId } = req.params;
        const { snsId } = res.locals.user.info;

        const findPost = `SELECT postId, snsId FROM posts WHERE postId=? AND snsId=?`;
        const deletePost = `DELETE FROM posts as p WHERE p.postId=?`;

        connectDB.query(findPost, [postId, snsId], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            if (result[0] && result[0].snsId === String(snsId)) {
                connectDB.query(deletePost, [postId], function (err, result) {
                    if (err)
                        return res.status(400).send(console.log(err));
                    else {
                        res.status(200).send({
                            message: 'success'
                        });
                    };
                });
            } else {
                res.status(400).send({
                    message: '존재하지 않는 게시물입니다.'
                });
            };
        });
    },

    // 게시물 수정
    postUpdate: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { postId } = req.params;
        const { title, content } = req.body;
        const updateTime = new Date();

        const existPost = `SELECT snsId FROM posts WHERE postId=?`
        const postUpdate = `UPDATE posts SET title=?, content=?, updatedAt=? WHERE postId=?`;

        connectDB.query(existPost, [postId], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            if (result[0].snsId === String(snsId)) {
                connectDB.query(postUpdate, [title, content, updateTime, postId], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        res.status(200).send({
                            message: 'success'
                        });
                    };
                });
            } else {
                return res.status(400).send({
                    message: '작성자만 수정이 가능합니다.'
                })
            };
        });
    },
};