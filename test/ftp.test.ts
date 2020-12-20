/**
 * ftp 单元测试文件
 */

import ftp from 'ftp';
import FtpClient from '../src/ftp/index';

let opt = {
    host: 'localhost',
    port: 22,
    username: 'unittest',
    password: 'unittest',
    root: '.'
};
let file = './src/index.ts';
let dir = '../test/';
let initMock = jest.fn(() => { });

jest.mock('ftp', () => {
    return jest.fn().mockImplementation(() => {
        return {
            connect: initMock,
            delete: jest.fn((file, cb) => {
                if (!file) {
                    cb?.({ code: 1 })
                }
            }),
            put: jest.fn((file, remoteFile, cb) => {
                if (!remoteFile) {

                    cb?.({ code: 1 });
                }
                cb?.();
            }),
            mkdir: jest.fn((dir, cb) => {
                if (dir === 'existDir') {
                    return cb({ code: 550 });
                }
                if (dir === 'otherError') {
                    return cb({ code: 1 });
                }
                cb?.();
            }),
            list: jest.fn((dir, cb) => {
                let list = [],
                    err = { code: 1 };

                if (!dir) {
                    cb(err, list);
                }

                cb('', list);
            }),
            end: initMock,
            on: jest.fn((status, cb) => {
                if (status) {
                    cb?.();
                }
            })
        };
    });
}); // ftp 现在是一个mock函数

beforeEach(() => {
    // 每次实例化的时候清除实例引用
    ftp.mockClear();
});

describe('ftp功能测试', () => {

    it('检查是否调用了类构造函数', () => {
        let client = new FtpClient(opt);
        expect(ftp).toHaveBeenCalledTimes(1);
    });

    it('测试连接', async () => {
        let client = new FtpClient(opt);

        client.connect();
        jest.setTimeout(100);
        client.emit('ftp:connected');

        expect(initMock).toBeCalled();
    });

    it('测试删除', async () => {
        let client = new FtpClient(opt);
        let result = await client.delete(file);

        expect(result).toEqual({
            code: 0,
            file: file
        });
    });

    it('测试删除失败', async () => {
        let client = new FtpClient(opt);
        client.delete('').catch(err => {
            expect(err.code).toEqual(1);
        })
    });

    it('测试上传', async () => {
        let client = new FtpClient(opt);
        let result = await client.put(file, file);

        expect(result).toEqual({
            code: 0,
            file: file
        });
    });


    it('测试上传失败', async () => {
        let client = new FtpClient(opt);

        await client.put('', '').catch(err => {

            expect(err).toBeInstanceOf(Error);
        });

        await client.put(file, '').catch(err => {
            expect(err.code).toEqual(1);
        });
    });

    it('测试上传文件夹', async () => {
        let client = new FtpClient(opt);
        let result = await client.upload('../src');

        expect(result).toBeInstanceOf(Array);
    })

    it('测试创建文件夹成功', async () => {

        let client = new FtpClient(opt);
        client.mkdir(dir, (err) => {
            expect(err).toBeUndefined();
        });
    });

    it('测试创建已存在的文件夹', async () => {

        let client = new FtpClient(opt);
        client.mkdir('existDir', (err) => {
            expect(err.code).toEqual(550);
        });
    });

    it('测试创建文件夹失败', async () => {

        let client = new FtpClient(opt);
        client.mkdir('otherError', (err) => {
            expect(err).toBeInstanceOf(Object);
        });
    });

    it('测试查看目录', async () => {

        let client = new FtpClient(opt);
        let result = await client.list('root');

        expect(result).toBeInstanceOf(Array);
    });

    it('测试查看不存在目录', async () => {

        let client = new FtpClient(opt);

        await client.list('').catch(err => {

            expect(err.code).toEqual(1);
        });

    });

    it('测试关闭服务', () => {
        let client = new FtpClient(opt);
        client.close();

        expect(initMock).toBeCalled();
    });


    it('测试关闭服务', () => {
        let client = new FtpClient(opt);
        client.logout();

        expect(initMock).toBeCalled();
    });
});