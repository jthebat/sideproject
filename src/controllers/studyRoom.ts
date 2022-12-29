import { Request, Response } from "express";
import pool from "../config/mysql";
import { FieldPacket, RowDataPacket } from "mysql2";

interface access extends RowDataPacket {
    roomId: number;
    createdAt: Date;
}

export default {
    // 스터디방 개설
    postRoom: async (req: Request, res: Response) => {
        const { snsId } = res.locals.user.info;
        const { title, studyState, password, studyType, endDay, studygoal, hashTag, max, description } = req.body;

        const date = new Date();

        const room_query = `INSERT INTO room (snsId, title, createdAt) VALUES (?,?,?)`;
        const roomInfo_query = `INSERT INTO roomInfo ( studyState, password, studyType, startingDay, endDay, studygoal, hashTag, max, description,  roomId) VALUES (?,?,?,?,?,?,?,?,?,?)`;
        const existRoom = `SELECT * FROM room WHERE snsId=? AND title=?`;

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query(room_query, [snsId, title, date]);
            const [rows]: [access[], FieldPacket[]] = await conn.query(existRoom, [snsId, title]);
            console.log(rows[0]);
            await conn.query(roomInfo_query, [studyState, password, studyType, rows[0].createdAt, endDay, studygoal, hashTag, max, description, rows[0].roomId]);
            await conn.commit();
            res.status(200).send({
                message: "success"
            });
        } catch (err) {
            await conn.rollback();
            console.log(err);
        } finally {
            conn.release();
        }

        /*
        try {
            const promisePool = pool.promise();
            await promisePool.query(room_query, [snsId, title, date]);
            const [rows]: [access[], FieldPacket[]] = await promisePool.query(existRoom, [snsId, title]);
            console.log(rows[0]);
            await promisePool.query(roomInfo_query, [studyState, password, studyType, rows[0].createdAt, endDay, studygoal, hashTag, max, description, rows[0].roomId]);
            res.status(200).send({
                message: "success"
            });
        } catch (err) {
            console.log(err);
        }
        */
    }

    // 모든 스터디방 조회
    /*
    getRoom: async (req: Request, res: Response) => {
        const { studyType, hashTag, studyState } = req.query;

        const query_in_hashTag = `SELECT room.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo JOIN room ON roomInfo.roomId = room.roomId WHERE studyType=? AND hashTag REGEXP ?`;
        const query_no_hashTag = `SELECT room.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo JOIN room ON roomInfo.roomId = room.roomId WHERE studyType=?`;
        const query_in_State_nohashTag = `SELECT room.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo JOIN room ON roomInfo.roomId = room.roomId WHERE studyType =? AND studyState=?`;
        const query_in_State_hashTag = `SELECT room.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM roomInfo JOIN room ON roomInfo.roomId = room.roomId WHERE studyType =? AND studyState=? AND hashTag REGEXP ?`;

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
    */
};
