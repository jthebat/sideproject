import KakaoRouter from 'passport';
import connectDB from '../config/mysql';
import config from '../config/config';

const KakaoStrategy = require('passport-kakao').Strategy;

const kakaoPassport = () => {
    KakaoRouter.use(
        new KakaoStrategy(
            {
                clientID: config.social.kakao_id,
                callbackURL: config.social.kakao_url
            },
            async (accessToken: any, refreshToken: any, profile: any, done: any) => {
                try {
                    let snsId: string = profile.id;
                    let email: string = profile._json.kakao_account.email;
                    let provider: string = profile.provider;
                    let nickname: string = profile.username;

                    // sql
                    const existUser = `SELECT snsId FROM users WHERE snsId = ? AND provider =?`

                    const newUser = `INSERT INTO users (snsId, email, nickname, provider) VALUES ("${snsId}", "${email}", "${nickname}", "${provider}", "${refreshToken}")`

                    // user check
                    connectDB.query(existUser, [snsId, provider], function (error, result) {
                        if (error) return console.log(error);
                        if (result.length === 0) {
                            // 해당되는 user가 없으면 DB에 넣기
                            connectDB.query(newUser, function (error, result) {
                                if (error) return console.log(error);
                                else {
                                    return done(null, console.log('success INSERT!'));
                                }
                            })
                        } else {
                            const userSnsId = JSON.stringify(result[0]);
                            return done(null, userSnsId);
                        }
                    }

                    );
                } catch (error) {
                    console.log(error);
                    done(error);
                }
            }
        )
    );

    KakaoRouter.serializeUser((user, done) => {
        done(null, user);
    });

    KakaoRouter.deserializeUser((user: any, done) => {
        done(null, user);
    });
};

export { kakaoPassport };
