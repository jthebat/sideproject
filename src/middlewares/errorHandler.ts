import { NextFunction, Request, Response } from 'express'

export interface IErr extends Error {
    status: number;
    data?: any;
}

export const errorHandler = (err: IErr, req: Request, res: Response, next: NextFunction) => {
    let status = err.status || 500
    let message = err.message

    // 서버 에러
    if (err.status === 500) message = 'Server Error'

    // 라우터 에러 제외하곤 console에 error stack까지 표시
    if (err.name !== 'RouterError') {
        console.error(err.stack)
    } else { // 라우터 에러는 console에 간단히 표시
        console.error('[' + err.name + '] ' + err.message)
    }

    return res.status(status).json({ message });
}