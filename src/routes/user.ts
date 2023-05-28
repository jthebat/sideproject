import express from 'express';
import userController from '../controllers/user';
import passport from 'passport';
import { authMiddleware } from '../middlewares/auth-middleware';
import user from '../controllers/user';
const userRouter = express.Router();

// kakao login
userRouter.get('/kakao', passport.authenticate('kakao'));

// kakao login callback
userRouter.get('/kakao/callback', userController.kakaoCallback);

// Update AD Check
userRouter.put('/ad-check', authMiddleware, userController.ADCheck);

// Searching for userinfo
userRouter.get('/me', authMiddleware, userController.userInfo);

// 닉네임 변경
userRouter.put('/nickname', authMiddleware, userController.signup);

// 스크린모드 변경 default or dark
userRouter.put('/onDark', authMiddleware, userController.darkMode);

// 캐릭터정보 저장
userRouter.post('/character', authMiddleware, userController.character);

// 획득한 캐릭터 저장
userRouter.post('/usercharacters', authMiddleware, userController.userCharater);

// 보유캐릭터 정보 가져오기       //* output: [{type: 기능써보기, 시간, 도전 등 , characterImg: "https://~~~"}]
userRouter.get('/getcharacter', authMiddleware, userController.existCharacter);

// 닉네임 중복체크
userRouter.get('/checknickname', userController.nicknameCheck);

//유저프로필캐릭터
userRouter.get('/getmaincharacter', authMiddleware, userController.userProfileCharacter);

// 대표캐릭터 변경하기
userRouter.put('/changemaincharacter', authMiddleware, userController.chgMainCharacter);

// 탈퇴
// userRouter.delete('/signout', authMiddleware, userController.signOut);

export { userRouter };
