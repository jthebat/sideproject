import KakaoRouter from 'passport';
const KakaoStrategy = require('passport-kakao').Strategy;
import config from '../config/config';

const kakaoPassport = () => {
    KakaoRouter.use(
        new KakaoStrategy(
            {
                clientID: config.social.kakao_id, // 카카오 로그인에서 발급받은 REST API 키
                callbackURL: config.social.kakao_url // 카카오 로그인 Redirect URI 경로
            },
            async (accessToken: any, refreshToken: any, profile: any, done: any) => {
                try {
                    let snsId: string = profile.id;
                    let email: string = profile._json.kakao_account.email;
                    let provider: string = profile.provider;
                    /*
                    // 카카오 플랫폼에서 로그인 했고 이메일이 일치하는경우
                    const existUser = await User.findOne({ $and: [{ email: email }, { provider: provider }] });

                    // 이미 가입된 카카오 프로필이면 성공
                    if (existUser) {
                        done(null, existUser); // 로그인 인증 완료
                    } else {
                        const newUser = await User.create({
                            email,
                            nickname: profile.username,
                            provider
                        });

                        done(null, newUser); // 회원가입하고 로그인 인증 완료
                        return;
                    }
                    */
                    done();
                    return;
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
