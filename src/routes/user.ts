import express from 'express';
import userController from '../controllers/user';
import passport from 'passport';
import { authMiddleware } from '../middlewares/auth-middleware';
const userRouter = express.Router();

// kakao login
userRouter.get('/kakao', passport.authenticate('kakao'));

// kakao login callback
userRouter.get('/kakao/callback', userController.kakaoCallback);

// Searching for userinfo
userRouter.get('/me', authMiddleware, userController.userInfo);

// 닉네임 변경
userRouter.put('/nickname', authMiddleware, userController.signup);

// 캐릭터 저장
userRouter.post('/character', authMiddleware, userController.character);

// 닉네임 중복체크
userRouter.post('/checknickname', userController.nicknameCheck);

// 탈퇴
userRouter.delete('/signout', authMiddleware, userController.signOut);

export { userRouter };
