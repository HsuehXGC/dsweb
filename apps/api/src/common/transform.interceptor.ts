import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一成功响应信封：{ data, meta } —— 对应需求文档 8.1。
 * 若 handler 已返回 { data, meta } 结构则原样透传，否则包一层 data。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload && typeof payload === 'object' && 'data' in payload) {
          return payload;
        }
        return { data: payload };
      }),
    );
  }
}
