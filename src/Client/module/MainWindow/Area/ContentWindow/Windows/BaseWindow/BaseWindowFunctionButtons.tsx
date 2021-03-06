import * as React from 'react';

import { ObservableComponent } from '../../../../../../global/Tools/ObservableComponent';
import { WindowArgs } from '../../ContentWindowTypes';
import { windowList, moveToOtherSide } from '../../WindowList';

const less = require('./BaseWindow.less');

/**
 * 功能按钮
 */
export abstract class BaseWindowFunctionButtons<T extends WindowArgs> extends ObservableComponent<{ args: T, side: 'left' | 'right', _communicator: { [key: string]: any } }> {

    private readonly _thisSide = this.props.side === 'left' ? windowList.leftWindows : windowList.rightWindows;

    /**
     * 窗口组件间通信对象
     */
    protected readonly _communicator = this.props._communicator;

    protected abstract _functionButtons: React.ReactNode;

    componentDidMount() {
        this.watch([this._thisSide.displayOrder]);
    }

    render() {
        return (
            <div className={less.functionButtons}
                style={{ display: this._thisSide.displayOrder.last === this.props.args.id ? 'block' : 'none' }}>
                {this._functionButtons}
                <img style={{ height: '21px', width: '21px', padding: '7px' } /* 这一个图标要小一些 */}
                    src={`/static/res/img/buttons_icon/${this.props.side === 'left' ? 'next' : 'previous'}-inverse.svg`}
                    title={`移动到${this.props.side === 'left' ? '右' : '左'}侧显示`}
                    onClick={() => moveToOtherSide(this.props.args.id, this.props.side)} />
            </div>
        );
    }
}