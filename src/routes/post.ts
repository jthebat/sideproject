import express from 'express';
import postCtrl from '../controllers/post';
import { authMiddleware } from '../middlewares/auth-middleware';

const postRouter = express.Router();

// 게시물 작성
postRouter.post('/post/:roomId', authMiddleware, postCtrl.post);

// 게시물 전체조회
postRouter.get('/getpost', authMiddleware, postCtrl.getPost);

// 게시물 상세조회
postRouter.get('/postdetail', authMiddleware, postCtrl.postDetail);

// 게시물 삭제
postRouter.delete('/deletepost/:postId', authMiddleware, postCtrl.deletePost);

// 게시물 수정
postRouter.put('/postupdate/:postId', authMiddleware, postCtrl.postUpdate);

export { postRouter };