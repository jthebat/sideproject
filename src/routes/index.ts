import express, { Router } from 'express';
import { userRouter } from './user';
import { roomRouter } from './studyRoom';
import { postRouter } from './post';


const router: Router = express.Router();

router.use('/user', userRouter);
router.use('/studyroom', roomRouter);
router.use('/post', postRouter);

export default router;