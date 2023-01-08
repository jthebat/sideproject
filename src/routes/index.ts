import express, { Router } from 'express';
import { userRouter } from './user';
import { roomRouter } from './studyRoom';
import { postRouter } from './post';
import { timeRouter } from './studyTime';


const router: Router = express.Router();

router.use('/user', userRouter);
router.use('/studyroom', roomRouter);
router.use('/post', postRouter);
router.use('/time', timeRouter);

export default router;