import { Request, Response } from "express";
import connectDB from "../config/mysql";

export default {
    // 스터디방 개설
    postRoom: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { title, studyState, password, studyType, startingDay, endDay, studygoal, hashTag, max, description } = req.body;

        const date = new Date();

        const room_query = `INSERT INTO room (snsId, title, createdAt) VALUES (?,?,?)`;
        const roomInfo_query = `INSERT INTO roomInfo ( studyState, password, studyType, startingDay, endDay, studygoal, hashTag, max, description,  roomId) VALUES (?,?,?,?,?,?,?,?,?,?)`;
        const existRoom = `SELECT * FROM room WHERE snsId=? AND title=?`

        connectDB.query(room_query, [snsId, title, date], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            else {
                connectDB.query(existRoom, [snsId, title], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        connectDB.query(roomInfo_query, [studyState, password, studyType, startingDay, endDay, studygoal, hashTag, max, description, result[result.length - 1].roomId], function (err, result) {
                            if (err) return res.status(400).send(console.log(err));
                            else {
                                res.status(200).send({
                                    message: 'success'
                                });
                            };
                        });
                    };
                });
            };
        });
    },

    // 모든 스터디방 조회
    getRoom: async (req: Request, res: Response) => {
        const { studyType, hashTag, studyState } = req.query;

        const query_in_hashTag = `SELECT title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo as RI JOIN room ON RI.roomId = room.roomId WHERE studyType=? AND hashTag REGEXP ?`;
        const query_no_hashTag = `SELECT title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo as RI JOIN room ON RI.roomId = room.roomId WHERE studyType=?`;
        const query_in_State_nohashTag = `SELECT title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo as RI JOIN room ON RI.roomId = room.roomId WHERE studyType =? AND studyState=?`;
        const query_in_State_hashTag = `SELECT title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo as RI JOIN room ON RI.roomId = room.roomId WHERE studyType =? AND studyState=? AND hashTag REGEXP ?`;

        // studyState = public
        if (studyState) {
            if (hashTag !== '전체') {
                connectDB.query(query_in_State_hashTag, [studyType, studyState, hashTag], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        return res.status(200).send({
                            message: 'success',
                            result
                        });
                    };
                });
            } else {
                connectDB.query(query_in_State_nohashTag, [studyType, studyState], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        return res.status(200).send({
                            message: 'success',
                            result
                        });
                    };
                });
            };
        } else {
            if (hashTag !== '전체') {
                connectDB.query(query_in_hashTag, [studyType, hashTag], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        return res.status(200).send({
                            message: 'success',
                            result
                        });
                    };
                });
            } else {
                connectDB.query(query_no_hashTag, [studyType], function (err, result) {
                    if (err) return res.status(400).send(console.log(err));
                    else {
                        return res.status(200).send({
                            message: 'success',
                            result
                        });
                    };
                });
            };
        };
    },

    // 내 스터디룸 목록
    myRoomList: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        console.log(snsId)

        const myRoomList = `SELECT roomId, title FROM room WHERE snsId=?`;

        connectDB.query(myRoomList, [snsId], function (err, result) {
            if (err) return res.status(400).send(console.log(err));
            else {
                res.status(200).send({
                    message: 'success',
                    result
                });
            }
        });
    },
};