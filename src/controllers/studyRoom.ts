import { NextFunction, Request, Response } from 'express';
import * as db from '../config/mysql';
import pool from '../config/mysql';
import { FieldPacket, RowDataPacket } from 'mysql2';

interface access extends RowDataPacket {
    snsId: string;
    roomId: number;
    // title: string;
    createdAt: Date;
}

export default {
    // 스터디방 개설
    postRoom: async (req: Request, res: Response, next: NextFunction) => {
        const { snsId } = res.locals.user.info;
        const { title, cam, password, studyType, endDay, studyGoal, hashTag, max, description } = req.body;

        const date = new Date();

        const room_query = `INSERT INTO ROOMS (snsId, title, createdAt) VALUES (?,?,?)`;
        const roomInfo_query = `INSERT INTO ROOMINFO ( cam, host, password, studyType, startingDay, endDay, studyGoal, hashTag, max, description,  roomId) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
        const existRoom = `SELECT * FROM ROOMS WHERE snsId=? AND title=?`;

        try {
            await db.transaction();
            await db.connect((con: any) => con.query(room_query, [snsId, title, date]))();
            await db.commit();

            const [rows]: [access[], FieldPacket[]] = await db.connect((con: any) => con.query(existRoom, [snsId, title]))();

            await db.connect((con: any) => con.query(roomInfo_query, [cam, snsId, password, studyType, rows[0].createdAt, endDay, studyGoal, hashTag, max, description, rows[0].roomId]))();
            await db.commit();

            return res.status(201).send({ message: 'success' });
        } catch (err) {
            await db.rollback();
            next(err)
        }

        /*
        try {
            const promisePool = pool.promise();
            await promisePool.query(room_query, [snsId, title, date]);
            const [rows]: [access[], FieldPacket[]] = await promisePool.query(existRoom, [snsId, title]);
            console.log(rows[0]);
            await promisePool.query(roomInfo_query, [cam, password, studyType, rows[0].createdAt, endDay, studygoal, hashTag, max, description, rows[0].roomId]);
            res.status(200).send({
                message: "success"
            });
        } catch (err) {
            console.log(err);
        }
        */
    },

    /*
    // 모든 스터디방 조회
    getRoom: async (req: Request, res: Response) => {
        const { studyType, hashTag, cam } = req.query;
        const conn = await pool.getConnection();
    
        const query_in_hashTag = `SELECT ROOM.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM ROOMINFO JOIN ROOM ON ROOMINFO.roomId = ROOM.roomId WHERE studyType=? AND hashTag REGEXP ?`;
        const query_no_hashTag = `SELECT ROOM.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM ROOMINFO JOIN ROOM ON ROOMINFO.roomId = ROOM.roomId WHERE studyType=?`;
        const query_in_State_nohashTag = `SELECT ROOM.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM ROOMINFO JOIN ROOM ON ROOMINFO.roomId = ROOM.roomId WHERE studyType =? AND studyState=?`;
        const query_in_State_hashTag = `SELECT ROOM.roomId, title, max, studyState, description, createdAt, updatedAt, hashTag FROM ROOMINFO JOIN ROOM ON roomInfo.roomId = room.roomId WHERE studyType =? AND studyState=? AND hashTag REGEXP ?`;
    
        // studyType = public
        if (studyType) {
            if (hashTag !== '전체') {
                connectDB.query(query_in_State_hashTag, [studyType, cam, hashTag], function (err, result) {
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
    */
    // 내 스터디룸 목록
    myRoomList: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { snsId } = res.locals.user.info;

            const myRoomLists = `SELECT roomId, title FROM ROOMS WHERE snsId=?`;

            const [roomList] = await db.connect((con: any) => con.query(myRoomLists, [snsId]))();

            res.status(200).send({ roomList });
        } catch (err) {
            next(err);
        };
    }
};
