/** 
 * @file 实现上传的基类
 */

let EventEmitter = require('events');
import path from 'path';
import merge from 'lodash/merge';
import PromiseLimit from 'p-limit';

import { UPLOAD_MODE } from '../const/common';
import { setLogInfo } from '../util/log';
import { getFiles, getDirectory, parseFiles } from '../util/util';
import { UploadMode, OprStatus } from '../type/common';

export interface IUploader {
    connect();

    // put(filePath: string, remoteDir?: string): Promise<OprStatus>;`
    delete(remoteFile?: string): Promise<OprStatus>;
    list(): Promise<OprStatus>;
    close();
    mkdir(remote: string): Promise<OprStatus>;
}

export default class Uploader extends EventEmitter {
    protected options;

    constructor(opt) {
        super();
        this.init(opt);
    }

    public init(opt) {

        this.options = merge({
            port: 22,
            host: '',
            username: '',
            password: '',
            retries: 1,
            factor: 2,
            size: '',
            ext: [],
            concurrency: 3, // 并发数，只有在并行上传的情况下有效
            mode: UPLOAD_MODE.parallel, // parallel 并行上传， serial 串行上传
            minTimeout: 1000,
            root: './'
        }, opt);

        setLogInfo(opt);
    }

    /**
     * 上传本地文件到服务器
     * @param [curPath]     上传文件的路径
     * @param [remoteDir]   上传到目标路径
     * @param [mode]        指定上传模式
     */
    public async upload(curPath: string | string[], remoteDir?: string, mode?: UploadMode): Promise<Record<string, any>> {
        let remote = remoteDir ?? this.options.root,
            uploadMode = mode ?? this.options.mode,
            extName = this.options.ext;

        // 并发控制
        const concurrentLimit = PromiseLimit(this.options.concurrency);

        let files = parseFiles(curPath, extName),
            dirList: string[] = getDirectory(files, remote),
            fileList: string[] = getFiles(files),
            uploadList: Record<string, any>[] = [];

        await this.batchMkdir(dirList);

        for (const file of fileList) {

            let p = path.join(process.cwd(), file);
            let re = path.join(remote, file);

            if (uploadMode === UPLOAD_MODE.serial) {

                uploadList.push(await this.put(p, re));
            } else {

                uploadList.push(concurrentLimit(() => this.put(p, re)));
            }
        }

        return Promise.all(uploadList);
    }

    public put(filePath: string, remoteDir?: string): Promise<OprStatus> {
        throw new Error('必须重写 put 方法');
    }

    public batchMkdir(remote: string[]): Promise<Record<string, any>> {
        let list: Record<string, any>[] = [];
        remote.forEach(dir => {
            list.push(this.mkdir(dir));
        });
        return Promise.all(list);
    }

    public mkdir(remote: string): Record<string, any> {
        throw new Error('必须重写 mkdir 方法');
    }

    /**
     * 提供接口方便在销毁前做业务处理
     */
    public onBeforeDestroy() {
        this.emit('upload:beforedestroy');
    }

    public onDestroyed() {

        this.emit('upload:destroy');
    }

    public destroy() {
        if (!this.destroyed) {
            this.onBeforeDestroy();
            this.options = null;
            this.removeAllListeners();
            this.onDestroyed();
            this.destroyed = true;
        }
    }

}
