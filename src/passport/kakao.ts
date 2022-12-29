import KakaoRouter from "passport";
import pool from "../config/mysql";
import config from "../config/config";

const KakaoStrategy = require("passport-kakao").Strategy;

const kakaoPassport = () => {
    KakaoRouter.use(
        new KakaoStrategy(
            {
                clientID: config.social.kakao_id,
                callbackURL: config.social.kakao_url
            },
            async (accessToken: any, refreshToken: any, profile: any, done: any) => {
                const conn = await pool.getConnection();

                let snsId: string = profile.id;
                let email: string = profile._json.kakao_account.email;
                let provider: string = profile.provider;
                let nickname: string = profile.username;

                // sql
                const existUser = `SELECT snsId FROM users WHERE snsId=? AND provider =?`;

                const info: object = { snsId, email, nickname, provider };
                try {
                    // user check
                    const [result] = await conn.query(existUser, [snsId, provider]);

                    return done(null, result, info);
                    /**done function looks like...*/
                    /*
                        function verified(err, user, info) {
                           if (err) {
                                return self.error(err);
                            }
                            if (!user) {
                                return self.fail(info);
                            }
                            self.success(user, info);
                        }
                    https://github.com/jaredhanson/passport-local/blob/master/lib/strategy.js#L80
                    */
                } catch (error) {
                    console.log(error);
                    done(error);
                } finally {
                    console.log("실행됩니다.");
                    conn.release();
                }
            }
        )
    );

    /**session 에 정보 저장? 서버에서 쓰려는거인가? */
    /*
    KakaoRouter.serializeUser((user, done) => {
        done(null, user);
    });

    KakaoRouter.deserializeUser((user: any, done) => {
        done(null, user);
    });
    */
};

export { kakaoPassport };
