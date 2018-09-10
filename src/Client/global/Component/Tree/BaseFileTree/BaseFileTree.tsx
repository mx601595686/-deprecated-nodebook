import { oMap } from 'observable-variable';

import { ServerApi } from '../../../ServerApi';
import { showMessageBox } from '../../../../module/MessageBox/MessageBox';
import { FileIconTree } from '../FileIconTree/FileIconTree';
import { throttle } from '../../../Tools/Tools';

/**
 * 基础文件树。实现了服务器端路径读取，缓存。
 */
export abstract class BaseFileTree<P extends { memorable: String }> extends FileIconTree<P, { size: number, modifyTime: number }> {

    /**
     * 是否在服务器端加载过了。value是_fullNameString
     */
    private readonly _loadedFolder: Set<string> = this._root._loadedFolder || new Set();

    /**
     * 保存目录数据
     */
    private readonly _saveFolderData: () => void = this._root._saveFolderData ||
        throttle(() => { localStorage.setItem(`ui.BaseFileTree.memory.${this.props.memorable}`, JSON.stringify(this._dataTree)) }, 1000);

    constructor(props: any, context: any) {
        super(props, context);

        //读取目录数据
        if (this._isRoot && this._memorable) {
            (this as any)._dataTree = JSON.parse(localStorage.getItem(`ui.BaseFileTree.memory.${this.props.memorable}`) ||
                `{"name":"${this._name}","data":{"size":0,"modifyTime":0},"subItem":[]}`);
        }

        //添加保存数据监听器
        if (this._memorable && this._dataTree.subItem) {
            oMap(this._dataTree, 'subItem');    //由于序列化的原因，确保subItem是ObservableMap
            this._dataTree.subItem.on('add', this._saveFolderData); //重复注册监听器不会有影响
            this._dataTree.subItem.on('remove', this._saveFolderData);
        }
    }

    /**
     * 从服务器端加载当前节点的目录数据
     */
    async refreshFolder(): Promise<false | void> {
        if (this._dataTree.subItem && !this._loading.has('_refreshFolder')) {
            try {
                this._loading.add('_refreshFolder');

                const data = await ServerApi.file.listDirectory(this._fullNameString);

                //清除不存在的
                for (const { name, subItem } of this._dataTree.subItem.values()) {
                    if (data.findIndex(item => item.name === name && item.isFile === (subItem === undefined)) === -1)
                        this._dataTree.subItem.delete(name);
                }

                //插入新的
                for (const item of data) {
                    if (!this._dataTree.subItem.has(item.name)) {
                        this._dataTree.subItem.set(item.name, {
                            name: item.name,
                            data: { size: item.size, modifyTime: item.modifyTime },
                            subItem: item.isFile ? undefined : oMap([])
                        });
                    }
                }

                this._loadedFolder.add(this._fullNameString);
            } catch (err) {
                showMessageBox({ icon: "error", title: `读取目录数据失败`, content: `目录:'${this._fullNameString}'。${err.message}` });
                return false;
            } finally {
                this._loading.delete('_refreshFolder');
            }
        }
    }

    protected async _onOpenBranch(isOpen: boolean): Promise<false | void> {
        if (isOpen) {
            if (!this._loadedFolder.has(this._fullNameString)) {    //如果没有向服务器更新过
                if ((this._dataTree.subItem as any).size > 0)   //如果有旧数据就先渲染后更新
                    this.refreshFolder();
                else    //没有数据就直接更新
                    return await this.refreshFolder();
            }
        }
    }
}