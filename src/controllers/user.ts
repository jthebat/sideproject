import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import pool from '../config/mysql';
import * as db from '../config/mysql'
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { FieldPacket, RowDataPacket } from 'mysql2/promise';

interface access extends RowDataPacket {
    snsId: string;
    nickname: string;
    darkMode: boolean;
}
interface characteraccess extends RowDataPacket {
    codeNum: number;
    characterImg: string;
    silhouette: string;
    missionType: string;
    requirement: string;
    progress: string;
    tip: string;
}

//카카오 콜백
const kakaoCallback = async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('kakao', { failureRedirect: '/' }, async (err: any, user: any, info: any) => {
        if (err) return next(err);
        /**refreshtoken 생성 */
        const refreshToken = jwt.sign({}, config.jwt.secretKey as jwt.Secret, {
            expiresIn: '14d',
            issuer: 'Martian'
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
            expiresIn: '1d', //for test
            // expiresIn: '1h',
            issuer: 'Martian'
        });
        /**queries */
        const updateQuery = `UPDATE USERS SET refreshtoken = ? WHERE snsId = ?`;
        const insertQuery = `INSERT INTO USERS (snsId, email, provider, refreshtoken) VALUES (?,?,?,?)`;
        const existUserQuery = `SELECT * FROM USERS WHERE snsId=?`;

        try {
            const [existUser] = await db.connect((con: any) => con.query(existUserQuery, [info.snsId]))();

            let screenMode = false;
            let statusCode = 201;
            let page = 'signin';

            // 신규가입시
            if (!existUser) {
                await db.transaction();
                await db.connect((con: any) => con.query(insertQuery, [info.snsId, info.email, info.provider, refreshToken]))();
                await db.finalCommit();

            } else {
                await db.transaction();
                await db.connect((con: any) => con.query(updateQuery, [refreshToken, info.snsId]))();
                await db.finalCommit();

                screenMode = existUser.darkMode;
                statusCode = 200;
                page = 'timer';
            }

            const domain = process.env.FOCUSMATE_DOMAIN;

            if (process.env.PROCESS_MODE === "dev") {
                return res.status(statusCode)
                    .cookie('screenMode', screenMode)
                    .cookie('refreshToken', refreshToken)
                    .cookie('accessToken', accessToken)
                    .redirect(`http://localhost:3000/${page}?accessToken=${accessToken}&refreshToken=${refreshToken}&screenMode=${screenMode}`);
            } else {
                return res.status(statusCode)
                    .cookie('screenMode', screenMode)
                    .cookie('refreshToken', refreshToken)
                    .cookie('accessToken', accessToken)
                    .redirect(`${domain}/${page}?accessToken=${accessToken}&refreshToken=${refreshToken}&screenMode=${screenMode}`);
            }
        } catch (err) {
            db.release();
            next(err)
        }
    })(req, res, next);
};

// 광고 수신 동의 확인
const ADCheck = async (req: Request, res: Response, next: NextFunction) => {
    const { adCheck } = req.body;
    const { snsId } = res.locals.user.info;

    const insert_Ad = `UPDATE USERS SET adCheck =? WHERE snsId =?`;

    const conn = await pool.getConnection();

    try {
        await conn.query(insert_Ad, [adCheck, snsId]);
        return res.status(200).send({ message: 'success' });
    } catch (err) {
        next(err);
    } finally {
        conn.release();
    }
};

// 로그인한 유저에 대한 정보 가져오기
const userInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { user } = res.locals;
    const findNickname = `SELECT nickname, darkMode FROM USERS WHERE snsId=?`;
    const conn = await pool.getConnection();

    try {
        if (!user) {
            return res.status(400).json({ result: false, message: '존재하지 않음' });
        }

        const [userinfo]: [access[], FieldPacket[]] = await conn.query(findNickname, [user.info.snsId]);

        return res.json({
            message: 'success',
            snsId: user.info.snsId,
            nickname: userinfo[0].nickname,
            screenMode: userinfo[0].darkMode
        });
    } catch (err) {
        next(err);
    } finally {
        conn.release();
    }
};

// 닉네임 변경
const signup = async (req: Request, res: Response, next: NextFunction) => {
    const { snsId } = res.locals.user.info;
    const { nickname } = req.body;

    // const query_1 = `SELECT snsId FROM USERS WHERE snsId=?`;
    const findCharacter = `SELECT snsId FROM USERCHARACTERS WHERE snsId = ? AND codeNum = ?`
    const insertFirstLoginCharacter = `INSERT INTO USERCHARACTERS (snsId, codeNum) VALUES (?,?)`
    const updateNickname = `UPDATE USERS SET nickname=? WHERE snsId=?`;
    const findFirstLoginCharacterInfo = `SELECT characterImg, requirement FROM CHARACTERSINFO WHERE codeNum = ?`

    try {
        let data = { message: 'success!' }
        const [existCharacter] = await db.connect((con: any) => con.query(findCharacter, [snsId, 0]))();

        await db.transaction();

        if (!existCharacter) {
            // 첫 로그인 캐릭터 부여
            await db.connect((con: any) => con.query(insertFirstLoginCharacter, [snsId, 0]))();
            await db.commit();

            [data] = await db.connect((con: any) => con.query(findFirstLoginCharacterInfo, [0]))();
        }

        await db.connect((con: any) => con.query(updateNickname, [nickname, snsId]))();
        await db.finalCommit();

        return res.status(201).send(data);
    } catch (err) {
        await db.release();
        next(err);
    }
};

// 스크린모드 변경
const darkMode = async (req: Request, res: Response, next: NextFunction) => {
    const { snsId } = res.locals.user.info;
    const { dark } = req.body;
    console.log('[/api/user/onDark]의 body값은 \n', req.body)

    // const query_1 = `SELECT snsId FROM USERS WHERE snsId=?`;
    const query_2 = `UPDATE USERS SET darkMode=? WHERE snsId=?`;

    try {
        await db.transaction();
        await db.connect((con: any) => con.query(query_2, [dark, snsId]))();
        await db.commit();
        
        return res.status(201).send({ message: 'success' });
    } catch (err) {
        await db.release();
        next(err);
    }
};

// 캐릭터정보 저장
const character = async (req: Request, res: Response, next: NextFunction) => {
    const { type, charImg } = req.body;
    const query = `INSERT INTO CHARACTERSINFO (type, characterImg) VALUES (?,?)`;

    const conn = await pool.getConnection();

    try {
        await conn.query(query, [type, charImg]);
        return res.status(200).send({ message: 'success' });
    } catch (err) {
        next(err);
    } finally {
        conn.release();
    }
};

//* TODO: 백엔드에서 직접 업데이트를 해줘야 하는건가? 시간이 들어오면 유저의 전체 시간 체크해서 매치..? 고려해보기
//* 획득한 캐릭터 저장 (미완)
const userCharater = async (req: Request, res: Response, next: NextFunction) => {
    const { snsId } = res.locals.user.info;
    const { } = req.body;

    const conn = await pool.getConnection();
    try {

        return res.status(200).send({ message: 'success' });
    } catch (err) {
        next(err)
    } finally {
        conn.release();
    }
};
//유저프로필캐릭터가져오기
const userProfileCharacter = async (req: Request, res: Response, next: NextFunction) => {
    const { user } = res.locals;
    const findCode = `SELECT characterCode FROM USERS WHERE snsId = ?`;
    const userCharater = `select characterImg, requirement, codeNum FROM CHARACTERSINFO where codeNum = ?`;
    const conn = await pool.getConnection();

    try {
        if (!user) {
            return res.status(400).json({ result: false, message: '존재하지 않음' });
        }

        const [code]: [access[], FieldPacket[]] = await conn.query(findCode, [user.info.snsId]);
        const [character]: [access[], FieldPacket[]] = await conn.query(userCharater, [code[0].characterCode]);

        return res.json({
            message: 'success',
            character
        });
    } catch (err) {
        next(err);
    } finally {
        conn.release();
    }
};
//대표 프로필 변경
const chgMainCharacter = async (req: Request, res: Response, next: NextFunction) => {
    const { snsId } = res.locals.user.info;
    const { codeNum } = req.body;
    //const findCode = `SELECT characterCode FROM USERS WHERE snsId = ?`;
    const query = `UPDATE USERS SET characterCode = ? WHERE USERS.snsId=?`;
    //const userCharater = `select characterImg, requirement, codeNum FROM CHARACTERSINFO where codeNum = ?`;

    const conn = await pool.getConnection();

    try {
        await conn.query(query, [codeNum, snsId]);
        return res.status(201).json({ message: 'success' });
    } catch (err) {
        next(err)
    } finally {
        conn.release();
    }
};

// 보유캐릭터 확인
const existCharacter = async (req: Request, res: Response, next: NextFunction) => {
    const { snsId } = res.locals.user.info;
    const totalcharacters = 11; //시스템의 총 캐릭터 수
    const existCharacter = `SELECT C.codeNum, C.characterImg, C.silhouette, C.missionType, C.requirement, C.progress , C.tip, W.snsId AS T FROM CHARACTERSINFO AS C LEFT JOIN (SELECT * FROM USERCHARACTERS WHERE snsId=?)AS W ON C.codeNum = W.codeNum`;

    const conn = await pool.getConnection();

    try {
        const [rows]: [characteraccess[], FieldPacket[]] = await conn.query(existCharacter, [snsId]);

        const data = rows.map(obj => ({
            codeNum: obj.codeNum,
            imageURL: obj.T ? obj.characterImg : obj.silhouette,
            missionType: obj.missionType,
            requirement: obj.requirement,
            progress: obj.progress,
            tip: obj.tip,
            collected: obj.T ? 1 : 0
        }));

        const A = data.filter((obj) => obj.missionType === 'A');
        const collectedA = A.filter((obj) => obj.collected === 1);
        const countA = collectedA.length;
        const B = data.filter((obj) => obj.missionType === 'B');
        const collectedB = B.filter((obj) => obj.collected === 1);
        const countB = collectedB.length;
        const C = data.filter((obj) => obj.missionType === 'C');
        const collectedC = C.filter((obj) => obj.collected === 1);
        const countC = collectedC.length;
        const totalcollected = countA + countB + countC;

        return res.status(200).send({
            message: 'success',
            totalcollected,
            totalcharacters,
            missionTypeA: A,
            collectedA: countA,
            missionTypeB: B,
            collectedB: countB,
            missionTypeC: C,
            collectedC: countC
        });
    } catch (err) {
        next(err);
    } finally {
        conn.release();
    }
};

// 닉네임 중복체크
const nicknameCheck = async (req: Request, res: Response, next: NextFunction) => {
    const { nickname } = req.query;
    const query = `SELECT nickname FROM USERS WHERE nickname=?`;

    const conn = await pool.getConnection();

    try {
        const [rows]: [access[], FieldPacket[]] = await conn.query(query, [nickname]);
        if (rows[0]) {
            return res.status(400).send({
                message: '이미 있는 닉네임입니다.'
            });
        } else {
            return res.status(200).send({
                message: '사용가능한 닉네임입니다.'
            });
        }
    } catch (err) {
        next(err);
    } finally {
        conn.release();
    }
};

// 회원 탈퇴
const signOut = async (req: Request, res: Response) => {
    const { snsId } = res.locals.user.info;
    const conn = await pool.getConnection();

    const signOut = `DELETE FROM USERS WHERE USERS.snsId=?`;

    conn.query(signOut, [snsId]);
    return res.status(200).send({
        message: 'success'
    });
};

export default { kakaoCallback, ADCheck, userInfo, signup, darkMode, character, userCharater, nicknameCheck, existCharacter, userProfileCharacter, chgMainCharacter, signOut };
