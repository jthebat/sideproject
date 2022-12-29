import { NextFunction, Request, Response } from "express";
import passport from "passport";
import pool from "../config/mysql";
import jwt from "jsonwebtoken";
import config from "../config/config";
import { FieldPacket, RowDataPacket } from "mysql2/promise";

interface access extends RowDataPacket {
    nickname: string;
}

//카카오 콜백
const kakaoCallback = async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("kakao", { failureRedirect: "/" }, async (err, user, info) => {
        if (err) return next(err);
        /**refreshtoken 생성 */
        const refreshToken = jwt.sign({}, config.jwt.secretKey as jwt.Secret, {
            expiresIn: "14d",
            issuer: "Martian"
        });
        /**accesstoken 생성 서비스 특성상 시간을 길게 보장해줘야하는지 아니면 refreshtoken이 해결해줄수 있는 부분인지? ?? */
        const accessToken = jwt.sign({ info }, config.jwt.secretKey as jwt.Secret, {
            /**example of expiresIn */
            /*
            ms('2 days')  // 172800000
            ms('1d')      // 86400000
            ms('10h')     // 36000000
            ms('2.5 hrs') // 9000000
            ms('2h')      // 7200000
            ms('1m')      // 60000
            ms('5s')      // 5000
            ms('1y')      // 31557600000
            ms('100')     // 100
            ms('-3 days') // -259200000
            ms('-1h')     // -3600000
            ms('-200')    // -200
            */
            expiresIn: "1d", //for test
            // expiresIn: '1h',
            issuer: "Martian"
        });
        /**queries */
        const updateQuery = `update users set refreshtoken = ? where snsId = ?`;
        const insertQuery = `INSERT INTO users (snsId, email, provider, refreshtoken) VALUE (?,?,?,?)`;
        const conn = await pool.getConnection();

        try {
            if (user.length === 0) {
                await conn.query(insertQuery, [info.snsId, info.email, info.provider, refreshToken]);
                /**front와 연결후 redirect 주소로 연결 필요 */
                res.status(200).cookie("refreshToken", refreshToken).cookie("accessToken", accessToken).json({ status: "success" });
            } else {
                await conn.query(updateQuery, [refreshToken, info.snsId]);
                /**front와 연결후 redirect 주소로 연결 필요 */
                res.status(200).cookie("refreshToken", refreshToken).cookie("accessToken", accessToken).json({ status: "success", token: accessToken });
            }
        } catch (err) {
            console.log(err);
        } finally {
            conn.release();
        }
    })(req, res, next);
};

// 광고 수신 동의 확인
const ADCheck = async (req: Request, res: Response) => {
    const { Ad_check } = req.body;
    const { snsId } = res.locals.user.info;

    const insert_Ad = `UPDATE users SET AD_Check =? WHERE snsId =?`;

    const conn = await pool.getConnection();

    try {
        await conn.query(insert_Ad, [Ad_check, snsId]);
        res.status(200).send({ message: "success" });
    } catch (err) {
        console.log(err);
    } finally {
        conn.release();
    }
};

// 로그인한 유저에 대한 정보 가져오기
const userInfo = async (req: Request, res: Response) => {
    const { user } = res.locals;

    if (!user) {
        return res.status(400).json({ result: false, message: "존재하지 않음" });
    }

    return res.json({
        message: "success",
        snsId: user.info.snsId,
        nickname: user.info.nickname
    });
};

// 닉네임 변경
const signup = async (req: Request, res: Response) => {
    const { snsId } = res.locals.user.info;
    const { nickname } = req.body;

    // const query_1 = `SELECT snsId FROM users WHERE snsId=?`;
    const query_2 = `UPDATE users SET nickname=? WHERE snsId=?`;

    const conn = await pool.getConnection();

    try {
        await conn.query(query_2, [nickname, snsId]);
        res.status(200).send({ message: "success" });
    } catch (err) {
        console.log(err);
    } finally {
        conn.release();
    }
};

// 캐릭터 저장
const character = async (req: Request, res: Response) => {
    const { snsId } = res.locals.user.info;
    const { charImg } = req.body;
    const query = `INSERT INTO userCharacters (charImg, snsId) VALUE(?,?)`;

    const conn = await pool.getConnection();

    try {
        await conn.query(query, [charImg, snsId]);
        res.status(200).send({ message: "success" });
    } catch (err) {
        console.log(err);
    } finally {
        conn.release();
    }
};

// 닉네임 중복체크
const nicknameCheck = async (req: Request, res: Response) => {
    const { nickname } = req.params;
    const query = `SELECT nickname FROM users WHERE nickname=?`;

    const conn = await pool.getConnection();

    try {
        const [rows]: [access[], FieldPacket[]] = await conn.query(query, [nickname]);
        if (rows[0]) {
            res.status(400).send({
                message: "이미 있는 닉네임입니다."
            });
        } else {
            res.status(200).send({
                message: "사용가능한 닉네임입니다."
            });
        }
    } catch (err) {
        console.log(err);
    } finally {
        conn.release();
    }
};

/*
// 회원 탈퇴 (삭제할게 더 있는지 확인해야함 - 미완)
const signOut = async (req: Request, res: Response) => {
    const { snsId } = res.locals.user.info;

    const signOut = `DELETE FROM users WHERE users.snsId=? IN (SELECT * FROM usersCharacters as UC WHERE UC.snsId=?)`;

    connectDB.query(signOut, [snsId], function (err, result) {
        if (err) return res.status(400).send(console.log(err));
        else {
            res.status(200).send({
                message: "success"
            });
        }
    });
};
*/
export default { kakaoCallback, ADCheck, userInfo, signup, character, nicknameCheck };
