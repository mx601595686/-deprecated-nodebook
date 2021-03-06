import * as _ from 'lodash';
import * as path from 'path';
import * as child_process from 'child_process';
import { BaseServiceModule, NodeServicesManager } from 'service-starter';

class NodeBook_MainProcess extends NodeServicesManager {
    constructor() {
        super();
        this.registerService(new SubprocessCommunicator);
    }
}

class SubprocessCommunicator extends BaseServiceModule {
    private _isDebug = (process.env.DEBUG || '').toLowerCase() === 'true';
    private _process: child_process.ChildProcess;
    private _process_onCloseCallback = () => this.servicesManager.stop();

    async onStart(): Promise<void> {
        if (this._isDebug)  //启动时就自动进入调试模式
            this._process = child_process.fork(path.resolve(__dirname, './Nodebook_Subprocess.js'), [], { execArgv: ['--inspect-brk=0.0.0.0:9229'] });
        else
            this._process = child_process.fork(path.resolve(__dirname, './Nodebook_Subprocess.js'));

        this._process.once('close', this._process_onCloseCallback);
        this._process.once('message', (msg: { signal: string, bash?: string }) => {   //使用once是因为现在只有重启的选项，同时为了确保稳定
            if (_.isObject(msg)) {
                switch (msg.signal) {
                    case 'restart': //重启服务
                        this._process.off('close', this._process_onCloseCallback);  //避免关闭主进程
                        this._process.once('close', () => this.onStart());
                        this._process.kill();
                        break;

                    case 'restartAndRun':   //重启服务并执行某些命令
                        this._process.off('close', this._process_onCloseCallback);  //避免关闭主进程
                        this._process.once('close', () => {
                            child_process.execSync(msg.bash as string, { stdio: 'inherit' });
                            this.onStart();
                        });
                        this._process.kill();
                        break;

                    default:
                        throw new Error('未定义消息类型：' + msg.signal);
                }
            } else
                throw new Error('子进程向主进程返回的消息不是一个有效的对象：' + JSON.stringify(msg));
        });
    }

    onStop(): Promise<void> {
        return new Promise((resolve) => {
            this._process.once('close', resolve);
            this._process.kill();
        });
    }
}

(new NodeBook_MainProcess).start();