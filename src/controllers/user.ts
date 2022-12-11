import { NextFunction, Request, Response } from "express";
import passport from "passport";
import connectDB from "../config/mysql";
import jwt from "jsonwebtoken";
import config from "../config/config";

//카카오 콜백
const kakaoCallback = async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("kakao", { failureRedirect: "/" }, (err, user, info) => {
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
        const insertQuery = `INSERT INTO users (snsId, email, provider, refreshtoken, Ad_check) VALUE (?,?,?,?,?)`;
        const { Ad_check } = req.query;

        if (user.length === 0) {
            // 해당되는 user가 없으면 DB에 넣기
            connectDB.query(insertQuery, [info.snsId, info.email, info.provider, refreshToken, Ad_check], function (error, result) {
                if (error) return console.log(error);
                else {
                    /**front와 연결후 redirect 주소로 연결 필요  */
                    res.status(200).cookie("refreshToken", refreshToken).cookie("accessToken", accessToken).json({ status: "success" }).redirect(`http://www.naver.com`);
                    //res.status(200).cookie('refreshToken', refreshToken).cookie('accessToken', accessToken).redirect(`http://www.naver.com`);
                }
            });
        } else {
            connectDB.query(updateQuery, [refreshToken, info.snsId], function (error, result) {
                if (error) return console.log(error);
                else {
                    /**front와 연결후 redirect 주소로 연결 필요 */
                    res.status(200).cookie("refreshToken", refreshToken).cookie("accessToken", accessToken).json({ status: "success", token: accessToken }).redirect(`http://www.naver.com`);
                    //res.status(200).cookie('refreshToken', refreshToken).cookie('accessToken', accessToken).redirect(`http://www.naver.com`);
                }
            });
        }
    })(req, res, next);
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

    const query_1 = `SELECT nickname FROM users WHERE nickname=?`;
    const query_2 = `UPDATE users SET nickname=? WHERE snsId=?`;

    connectDB.query(query_1, [nickname], function (err, result) {
        if (err) return console.log(err);
        else {
            connectDB.query(query_2, [nickname, snsId], function (err, result) {
                if (err) return console.log(err);
                else {
                    res.status(200).send({
                        message: "success"
                    });
                }
            });
        }
    });
};

// 캐릭터 저장
const character = async (req: Request, res: Response) => {
    const { snsId } = res.locals.user.info;
    const { charImg } = req.body;
    const query = `INSERT INTO userCharacters (charImg, snsId) VALUE(?,?)`;

    connectDB.query(query, [charImg, snsId], function (err, result) {
        if (err) return console.log(err);
        else {
            res.status(200).send({
                message: "success"
            });
        }
    });
};

// 닉네임 중복체크
const nicknameCheck = async (req: Request, res: Response) => {
    const { nickname } = req.body;
    const query = `SELECT nickname FROM users WHERE nickname=?`;

    if (nickname) {
        connectDB.query(query, [nickname], (err, result) => {
            if (err) return console.log(err);
            else {
                if (result[0]) {
                    res.status(400).send({
                        message: "이미 있는 닉네임입니다."
                    });
                } else {
                    res.status(200).send({
                        message: "사용가능한 닉네임입니다."
                    });
                }
            }
        });
    } else {
        res.status(400).send({
            message: "닉네임을 입력하세요."
        });
    }
};

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

export default { kakaoCallback, userInfo, signup, character, nicknameCheck, signOut };
