import * as koa from 'koa';
import randomString = require('crypto-random-string');

/**
 * 随机生成的url访问地址
 */
export let healthCheckingUrlPath = `/${randomString({ length: 31 })}`;

/**
 * server健康检查，健康则返回OK
 */
export function HealthCheck(): koa.Middleware {
    return function HealthChecking(ctx, next) {
        if (ctx.originalUrl === healthCheckingUrlPath && ctx.method === 'POST') {
            ctx.body = healthCheckingUrlPath;
            healthCheckingUrlPath = `/${randomString({ length: 31 })}`;   //更新随机访问地址
        } else {
            return next();
        }
    }
}