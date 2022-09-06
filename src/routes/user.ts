import express from 'express';
import userController from '../controllers/user';
import passport from 'passport';
const userRouter = express.Router();

userRouter.post('/create/user', userController.createUser);
userRouter.get('/get/users', userController.getAllUsers);
// kakao login
userRouter.get('/kakao', passport.authenticate('kakao'));
// kakao login callback
userRouter.get('/kakao/callback', userController.kakaoCallback);

export { userRouter };
