import * as os from 'os';
import * as child_process from 'child_process';
import * as diskusage from 'diskusage';
import * as pidusage from 'pidusage';
import log from 'log-formatter';
import getPort from 'get-port';
import { BaseServiceModule } from "service-starter";
const os_utils = require('os-utils');

import * as FilePath from '../../FilePath';

import { LogManager } from "./LogManager/LogManager";
import { MainProcessCommunicator } from '../MainProcess/MainProcessCommunicator';

/**
 * 用户任务管理器
 */
export class TaskManager extends BaseServiceModule {

    //存放正在执行的任务。key：文件路径。invokeCallback：调用任务内部方法回调，key：随机ID
    private readonly _taskList: Map<string, { process: child_process.ChildProcess, invokeCallback: Map<string, (jsonResult: string) => void> }> = new Map();
    private readonly _cpuInfo = os.cpus();

    private _logManager: LogManager;
    private _mainProcessCommunicator: MainProcessCommunicator;
    private _lastDebugPort: number = 6666; //上次调试使用的端口

    async onStart(): Promise<void> {
        this._logManager = this.services.LogManager;
        this._mainProcessCommunicator = this.services.MainProcessCommunicator;
    }

    async onStop(): Promise<void> {
        //关闭所有任务
        this._taskList.forEach(task => task.process.kill());
    }

    /**
     * 创建一个新的任务。如果任务正在运行，则不执行任何操作
     * @param debug 是否以调试方式来启动任务
     * @returns 返回的调试的端口号，如果不是调试模式则返回-1
     */
    async createTask(taskFilePath: string, debug?: boolean): Promise<number> {
        if (!this._taskList.has(taskFilePath)) {    //确保要创建的任务并未处于运行状态
            LogManager._checkPath(taskFilePath);
            const debugPort = debug ? this._lastDebugPort = await getPort({ port: this._lastDebugPort, host: '127.0.0.1' }) : -1;

            const child = child_process.fork(taskFilePath, [], {
                cwd: FilePath._programDataDir,
                execArgv: debug ? [`--inspect-brk=127.0.0.1:${debugPort}`] : [],
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            });

            const logger = this._logManager.createTaskLogger(taskFilePath);
            logger.addLog(log.location.bold.green.text.bold.format('启动', taskFilePath));

            if (child.stdout !== null && child.stderr !== null) {
                child.stdout.on('data', chunk => logger.addLog(chunk.toString()));
                child.stderr.on('data', chunk => logger.addLog(chunk.toString()));
            } else
                logger.addLog(log.location.bold.red.text.bold.format('系统异常：无法获取到子进程的stdio', taskFilePath));

            child.on('close', (code, signal) => {
                logger.status.value = code === 0 || signal === 'SIGTERM' ? 'stop' : 'crashed';
                this._taskList.delete(taskFilePath);
                logger.addLog(log.location.bold.red.text.bold.format('停止', taskFilePath));
            });

            const invokeCallback: Map<string, (jsonResult: string) => void> = new Map();

            child.on('message', async (msg: MessageType) => {
                try {
                    if (msg.type === 'request') {
                        const { taskFilePath, functionName, data } = msg.requestData;
                        const result = await this.invokeTaskFunction(taskFilePath, functionName, data);
                        if (child.connected)
                            child.send({ type: 'response', id: msg.id, responseData: result });
                    } else if (msg.type === 'response') {
                        const callback = invokeCallback.get(msg.id);
                        if (callback) {
                            invokeCallback.delete(msg.id);
                            callback(msg.responseData);
                        }
                    }
                } catch (error) {
                    log.error
                        .location
                        .text
                        .text.round
                        .text
                        .content(this.name, '任务', taskFilePath, "传递的'message'格式不正确", error);
                }
            });

            this._taskList.set(taskFilePath, { process: child, invokeCallback });
            logger.status.value = debug ? 'debugging' : 'running';

            return debugPort;
        }

        return -1;
    }

    /**
     * 删除某个正在运行的任务，如果任务不存在，则不执行任何操作
     */
    destroyTask(taskFilePath: string): void {
        const task = this._taskList.get(taskFilePath);
        if (task) task.process.kill();
    }

    /**
     * 获取某个正在运行的任务，资源消耗的情况，如果任务不存在则返回空
     */
    async getTaskResourcesConsumption(taskFilePath: string): Promise<pidusage.Status | undefined> {
        const task = this._taskList.get(taskFilePath);
        if (task) {
            const status = await pidusage(task.process.pid);
            status.cpu /= this._cpuInfo.length;
            return status;
        }
    }

    /**
     * 获取计算机的硬件信息
     */
    getSystemHardwareInfo() {
        return new Promise((resolve, reject) => {
            os_utils.cpuUsage(async (cpuUsage: number) => {
                try {
                    resolve({
                        cpuNumber: this._cpuInfo.length,                                    //CPU核心数
                        cpuName: this._cpuInfo[0].model,                                    //CPU名称
                        cpuUsage,                                                           //CPU使用百分比(0-1)
                        totalMemory: os.totalmem(),                                         //内存总量
                        freeMemory: os.freemem(),                                           //剩余内存大小
                        uptime: this._mainProcessCommunicator.systemUpTime,                 //系统的启动时间
                        userDataDir: await diskusage.check(FilePath._userDataDir),          //查看用户数据目录还有多少可用空间
                        programDataDir: await diskusage.check(FilePath._programDataDir)     //查看程序数据目录还有多少可用空间。这两个目录如果位于同一个分区下则大小一样
                    });
                } catch (error) { reject(error); }
            });
        });
    }

    /**
     * 调用任务中暴露出的方法。执行后的结果以json格式返回。如果100秒没有返回结果这判定超时
     * @param taskFilePath 任务文件路径
     * @param functionName 要调用的方法名称
     * @param jsonArgs json参数，到达任务进程中后会自动反序列化，然后传给要调用的方法
     */
    invokeTaskFunction(taskFilePath: string, functionName: string, jsonArgs?: string): Promise<string> {
        return new Promise(resolve => {
            const task = this._taskList.get(taskFilePath);
            if (task && task.process.connected) {
                const requestID = Math.random().toString();

                const timer = setTimeout(() => {
                    task.invokeCallback.delete(requestID);
                    resolve('{"error":"调用超时"}');
                }, 1000 * 100);

                task.invokeCallback.set(requestID, jsonResult => {
                    clearTimeout(timer);
                    resolve(jsonResult);
                });

                task.process.send({
                    type: 'request', id: requestID, requestData: {
                        functionName,
                        data: jsonArgs
                    }
                });
            } else
                resolve('{"error":"要调用的任务的方法无法访问"}');
        });
    }
}

/**
 * 进程间通信的消息格式
 */
interface MessageType {
    /**
     * 请求的类型
     */
    type: 'request' | 'response';

    /**
     * 该条消息的唯一编号
     */
    id: string;

    /**
     * 响应的数据。格式{ data?: any, error?: string }
     */
    responseData: string;

    /**
     * 请求数据
     */
    requestData: {
        /**
         * 向任务中发送时为空
         */
        taskFilePath: string;
        functionName: string;
        data?: string;
    }
}