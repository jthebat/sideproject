import express from 'express';
import userController from '../controllers/user';
import passport from 'passport';
import { authMiddleware } from '../middlewares/auth-middleware';
const userRouter = express.Router();

// userRouter.post('/create/user', userController.createUser);
// userRouter.get('/get/users', userController.getAllUsers);
// kakao login
userRouter.get('/kakao', passport.authenticate('kakao'));
// kakao login callback
userRouter.get('/kakao/callback', userController.kakaoCallback);
// Searching for userinfo
userRouter.get('/me', authMiddleware, userController.userInfo);
// 회원가입 후 캐릭터, 닉네임 설정
userRouter.put('/signup', userController.signup);

userRouter.post('/checknickname', userController.nicknameCheck);

export { userRouter };
