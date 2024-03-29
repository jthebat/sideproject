import { Response, Request, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authorization = req.headers.authorization as string;

        if (!authorization) return res.status(401).json({ message: "토큰이 존재하지 않습니다!" })

        const [tokentype, tokenvalue] = authorization.split(' ');
        if (tokenvalue == 'null') {
            res.locals.users = null;
            next();
            return;
        }
        if (tokentype !== 'Bearer') {
            res.status(401).send({
                message: '토큰값 에러'
            });
            return;
        }

        const user: jwt.JwtPayload | string = jwt.verify(tokenvalue, config.jwt.secretKey as jwt.Secret);

        res.locals = { user };
        // console.log('test', typeof user, user);
        return next();
    } catch (err) {
        res.status(401).send({
            message: '로그인 후 사용하세요'
        });
        console.log(err);
        return;
    }
};

export default authMiddleware;
