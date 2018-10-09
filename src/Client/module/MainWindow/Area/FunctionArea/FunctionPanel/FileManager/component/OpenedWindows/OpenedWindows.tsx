import * as React from 'react';
import * as classnames from 'classnames';

import { FoldableContainer } from '../../../../../../../../global/Component/FoldableContainer/FoldableContainer';
import { FoldableContainerPropsType } from '../../../../../../../../global/Component/FoldableContainer/FoldableContainerPropsType';
import { ObservableComponent, ObservableComponentWrapper } from '../../../../../../../../global/Tools/ObservableComponent';
import { processingItems } from '../../../../../../../../global/Component/Tree/EditableFileTree/EditableFileTree';
import { FileIcon } from '../../../../../../../../global/Component/FileIcon/FileIcon';
import { showContextMenu } from '../../../../../../../ContextMenu/ContextMenu';
import { windowList, closeAllWindow, closeWindow, closeOtherWindow, moveToOtherSide, focusWindow } from '../../../../../ContentWindow/WindowList';
import { WindowArgs, WindowType } from '../../../../../ContentWindow/ContentWindowTypes';

const less = require('./OpenedWindows.less');

/**
 * 打开的窗口
 */
export class OpenedWindows extends FoldableContainer<FoldableContainerPropsType>  {

    protected renderTitleBar(): JSX.Element {
        return (
            <div className={less.titleButtons}>
                <img title="关闭全部窗口" src="/static/res/img/buttons_icon/closeall_inverse.svg" onClick={() => closeAllWindow()} />
            </div>
        );
    }

    protected renderContent(): JSX.Element {
        let windowLeft, windowRight;

        if (windowList.leftWindows.windowList.length > 0) {
            windowLeft = (
                <>
                    {windowList.rightWindows.windowList.length > 0 &&
                        <div className={less.windowSideTitle}>
                            <span>左侧</span>
                            <img title="关闭左侧窗口" src="/static/res/img/buttons_icon/closeall_inverse.svg" onClick={() => closeAllWindow('left')} />
                        </div>
                    }
                    {windowList.leftWindows.windowList.map(item => <OpenedWindowItem key={item.id} args={item} side="left" />)}
                </>
            );
        }

        if (windowList.rightWindows.windowList.length > 0) {
            windowRight = (
                <>
                    {
                        windowList.leftWindows.windowList.length > 0 &&
                        <div className={less.windowSideTitle}>
                            <span>右侧</span>
                            <img title="关闭右侧窗口" src="/static/res/img/buttons_icon/closeall_inverse.svg" onClick={() => closeAllWindow('right')} />
                        </div>
                    }
                    {windowList.rightWindows.windowList.map(item => <OpenedWindowItem key={item.id} args={item} side="right" />)}
                </>
            );
        }

        return <>{windowLeft}{windowRight}</>;
    }

    componentDidMount() {
        super.componentDidMount();
        this.watch([windowList.leftWindows.windowList, windowList.rightWindows.windowList]);
    }

    render() {
        this._titleBarStyle.display = windowList.leftWindows.windowList.length === 0 &&
            windowList.rightWindows.windowList.length === 0 ? 'none' : '';

        return super.render();
    }
}

class OpenedWindowItem extends ObservableComponent<{ side: 'left' | 'right', args: WindowArgs }>{

    private readonly _thisSide = this.props.side === 'left' ? windowList.leftWindows : windowList.rightWindows;

    //关闭窗口按钮
    private readonly _closeWindow = (
        <div className={less.close} title="关闭窗口"
            onClick={() => closeWindow(this.props.args.id, this.props.side)}>×</div>
    );

    //关闭窗口按钮和加载动画
    private readonly _closeAndLoading = (
        this.props.args.args.path ?
            <ObservableComponentWrapper watch={[processingItems]}
                render={() => processingItems.has(this.props.args.args.path) ? <i className={less.loading} /> : this._closeWindow} /> :
            this._closeWindow
    );

    //窗口图标
    private readonly _icon = <FileIcon className={less.fileIcon} filename={
        this.props.args.type === WindowType.task ? '.volt' : //闪电符号
            this.props.args.type === WindowType.service ? '.apib' : //圆圈三角形
                this.props.args.type === WindowType.settings ? '.plist' : //齿轮
                    (this.props.args as any).args.path.split('/').pop()
    } />

    //文件名称
    private readonly _fileName = (
        <>
            <div className={less.fileName}>{this.props.args.name}</div>
            {this.props.args.args.path &&
                <div className={less.fileFullName}>{this.props.args.args.path}</div>}
        </>
    )

    //右键菜单
    private readonly _contextMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (e.button === 2) {
            showContextMenu({
                position: { x: e.clientX, y: e.clientY },
                items: [
                    [
                        { name: '关闭窗口', callback: () => closeWindow(this.props.args.id, this.props.side) },
                        { name: '关闭其他窗口', callback: () => closeOtherWindow(this.props.args.id, this.props.side) },
                    ],
                    [
                        {
                            name: `${this.props.args.fixed.value ? '取消' : ''}固定窗口`,
                            callback: () => this.props.args.fixed.value = !this.props.args.fixed.value
                        },
                    ],
                    [
                        {
                            name: `移动到${this.props.side === 'left' ? '右' : '左'}侧显示`,
                            callback: () => moveToOtherSide(this.props.args.id, this.props.side)
                        },
                    ],
                ]
            });
        }
    }

    componentDidMount() {
        this.watch([this.props.args.fixed, this._thisSide.displayOrder, windowList.focusedSide]);
    }

    render() {
        return (
            <div className={classnames(less.contentItem, {
                [less.focused]: windowList.focusedSide.value === this.props.side &&
                    this._thisSide.displayOrder.last === this.props.args.id,
                [less.fixed]: this.props.args.fixed.value
            })}
                onClick={() => focusWindow(this.props.args.id, this.props.side)}
                onDoubleClick={() => this.props.args.fixed.value = true}
                onContextMenu={this._contextMenu}>
                {this._closeAndLoading}
                {this._icon}
                {this._fileName}
            </div>
        );
    }
}