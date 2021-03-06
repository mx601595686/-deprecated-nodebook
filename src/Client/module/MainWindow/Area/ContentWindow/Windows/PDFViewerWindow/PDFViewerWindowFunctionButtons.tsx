import * as React from 'react';

import { BaseWindowFunctionButtons } from '../BaseWindow/BaseWindowFunctionButtons';
import { PDFViewerWindowArgs } from '../../ContentWindowTypes';

export class PDFViewerWindowFunctionButtons extends BaseWindowFunctionButtons<PDFViewerWindowArgs> {

    //在新的浏览器窗口中打开
    private readonly _openInBrowserWindow = () => {
        window.open('/file/api/readFile?path=' + this.props.args.args.path);
    };

    //刷新iframe
    private readonly _refresh = () => {
        this._communicator.refresh();
    };

    protected _functionButtons = (
        <>
            <img src={`/static/res/img/buttons_icon/browser.svg`}
                style={{ width: '21px', height: '21px', padding: '7px' }}
                title={`在新的浏览器窗口中打开`} onClick={this._openInBrowserWindow} />
            <img src={`/static/res/img/buttons_icon/Refresh_inverse.svg`}
                title={`刷新`} onClick={this._refresh} />
        </>
    );
}