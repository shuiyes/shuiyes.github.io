;;;/*
 * run in service worker
 */
//
// utils
//
function hexToBytes(inStr) {
  const outLen = inStr.length / 2;
  const outBuf = new Uint8Array(outLen);

  for (let i = 0; i < outLen; i++) {
      let byte = parseInt(inStr.substr(i * 2, 2), 16);
      console.assert(!isNaN(byte));
      outBuf[i] = byte;
  }
  return outBuf;
}

function bytesToHex(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    const val = bytes[i];
    let hex = val.toString(16);
    if (val < 16) {
      hex = '0' + hex;
    }
    str += hex;
  }
  return str;
}

function strHash(s) {
  let sum = 0;
  for (let i = 0, n = s.length; i < n; i++) {
    sum = (sum << 5) - sum + s.charCodeAt(i);
    sum = sum >>> 0;
  }
  return sum;
}

function memcmp(b1, b2, size) {
  // TODO: u32 optimize
  for (let i = 0; i < size; i++) {
    if (b1[i] !== b2[i]) {
      return false;
    }
  }
  return true;
}

async function hashVerify(buf, hash) {
  const subtle = crypto.subtle;
  if (!subtle) {
    return true;
  }
  const sha256 = await subtle.digest('SHA-256', buf);
  const u8 = new Uint8Array(sha256);
  return memcmp(u8, hash, hash.length);
}
class RC4 {
  constructor(key) {
    const sbox = new Uint8Array(256);
    let i, j = 0;

    for (i = 0; i < 256; i++) {
      sbox[i] = i;
    }
    for (i = 0; i < 256; i++) {
      j = (j + sbox[i] + key[i % key.length]) & 0xff;

      let tmp = sbox[i];
      sbox[i] = sbox[j];
      sbox[j] = tmp;
    }
    this.sbox = sbox;
    this.pos1 = 0;
    this.pos2 = 0;
  }

  crypt(data) {
    const sbox = this.sbox;
    let pos1 = this.pos1;
    let pos2 = this.pos2;

    for (let i = 0; i < data.length; i++) {
      pos1 = (pos1 + 1) & 0xff;
      pos2 = (pos2 + sbox[pos1]) & 0xff;

      const tmp = sbox[pos1];
      sbox[pos1] = sbox[pos2];
      sbox[pos2] = tmp;

      const j = (sbox[pos1] + sbox[pos2]) & 0xff;
      data[i] ^= sbox[j];
    }
    this.pos1 = pos1;
    this.pos2 = pos2;
  }
}const _STUB_LEN = 433;

class Img {
  async load(url, key) {
    const opt = {
      referrerPolicy: 'no-referrer',
    };

    const res = await fetch(url, opt);
    const rsr = res.body.getReader();
    const reader = new MyReader(rsr);

    await reader.aReadBytes(_STUB_LEN);

    this._reader = reader;
    this._rsr = rsr;
    this._rc4 = new RC4(key);
  }

  async read() {
    let ret;
    let avail = this._reader.avail;
    if (avail > 0) {
      ret = {
        done: this._reader.eof,
        value: this._reader.readBytes(avail),
      };
    } else {
      ret = await this._rsr.read();
    }
    if (ret.value) {
      this._rc4.crypt(ret.value);
    }
    return ret;
  }

  cancel() {
    return this._reader.cancel();
  }
}const __txtDec = new TextDecoder();

class MyReader {
  constructor(source) {
    this.avail = 0;
    this.eof = false;
    this._source = source;
    this._queue = [];
    this._offset = 0;
  }

  readUint32() {
    const buf = this.readBytes(4);
    const int = buf[3] << 24 | buf[2] << 16 | buf[1] << 8 | buf[0];
    return int >>> 0;
  }

  readUint16() {
    const buf = this.readBytes(2);
    return buf[1] << 8 | buf[0];
  }

  readTinyText() {
    const lenBuf = this.readBytes(1);
    const strBuf = this.readBytes(lenBuf[0]);
    return __txtDec.decode(strBuf);
  }

  readBytes(size, discard = true) {
    if (size > this.avail) {
      throw 'avail data not enough';
    }
    return this._readFromBuf(size, discard);
  }


  async aReadUint32() {
    const buf = await this.aReadBytes(4);
    const int = buf[3] << 24 | buf[2] << 16 | buf[1] << 8 | buf[0];
    return int >>> 0;
  }

  async aReadBytes(size, discard = true) {
    if (this.eof) {
      throw Error('EOF');
    }
    while (this.avail < size) {
      await this._load();
      if (this.eof) {
        break;
      }
    }
    return this.readBytes(size, discard);
  }

  // ...

  async _load() {
    const r = await this._source.read();
    if (r.done) {
      this.eof = true;
      return;
    }
    const chunk = r.value;
    this._queue.push(chunk);
    this.avail += chunk.length;
  }

  close() {
    this._source.cancel();
  }

  _readFromBuf(size, discard) {
    // first chunk
    let buf = this._queue[0];
    let len = buf.length;

    let beg = this._offset;
    let end = beg + size;

    // enough? (in most cases)
    if (end <= len) {
      if (discard) {
        this.avail -= size;
        this._offset = end;
      }
      return buf.subarray(beg, end);
    }

    // concat small chunks
    let dstBuf = new Uint8Array(size);
    let dstPos = 0;
    let i = 0;
    let stop;

    for (;;) {
      end = len;

      let srcBuf = buf.subarray(beg, end);
      dstBuf.set(srcBuf, dstPos);
      dstPos += (end - beg);

      if (stop) {
        break;
      }

      buf = this._queue[++i];
      len = buf.length;

      let remain = size - dstPos;
      if (len >= remain) {
        len = remain;
        stop = true;
      }
      beg = 0;
    }

    if (discard) {
      this._queue.splice(0, i); // unshift i counts
      this.avail -= size;
      this._offset = end;
    }
    return dstBuf;
  }
}const HASH_SIZE = 10;
const BLK_SIZE = 1024 * 16;

class VFile {
  constructor(url, urlKeyLen, hash) {
    this._url = url;
    this._urlKeyLen = urlKeyLen;
    this._hash = hash;
    this._remain = 0;
    this._reader = null;
    this._partNum = 0;
    this._partUrlArr = [];
    this._partHashArr = [];
    this._part1BlkNum = 0;
  }

  async open() {
    const partUrlKeyArr = [];
    const partHashArr = [];

    try {
      const img = new Img();
      await img.load(this._url, this._hash);

      const reader = new MyReader(img);

      const headLen = await reader.aReadUint32();
      const headBuf = await reader.aReadBytes(headLen, false);

      if (!hashVerify(headBuf, this._hash)) {
        throw 'head hash incorrect';
      }

      const mime = reader.readTinyText();
      const size = reader.readUint32();
      const partNum = reader.readUint16();

      for (let i = 0; i < partNum; i++) {
        this._partUrlArr[i] = await reader.readBytes(this._urlKeyLen);
      }
      for (let i = 0; i < partNum; i++) {
        this._partHashArr[i] = await reader.readBytes(HASH_SIZE);
      }

      this._part1BlkNum = reader.readUint16();
      this._hash = reader.readBytes(HASH_SIZE);

      this._remain = size;
      this._reader = reader;
      this._partNum = partNum;

      return {size, mime};

    } catch (err) {
      console.warn('read head err:', err);
      return null;
    }
  }


  async pull() {
    const blkLen = Math.min(this._remain, BLK_SIZE);
    this._remain -= blkLen;

    const isLast = (this._remain === 0);
    const bufLen = blkLen + (isLast ? 0 : HASH_SIZE);
    //
    // if i < last: buf = blk[i] + Hash[i+1]
    // if i = last: buf = blk[i]
    //
    try {
      var buf = await this._reader.aReadBytes(bufLen);
    } catch (err) {
    }

    if (!buf || buf.length !== bufLen) {
      throw 'bad size';
    }

    // verify
    if (!hashVerify(buf, this._hash)) {
      throw 'block hash incorrect';
    }

    // next hash
    if (!isLast) {
      this._hash = buf.subarray(-HASH_SIZE);
    }

    // body output
    return {
      data: buf.subarray(0, BLK_SIZE),
      done: isLast,
    };
  }

  close() {
    if (this._reader) {
      this._reader.close();
    }
  }
}const NODES_CONFIG = [
// zhihu
{
  URL_KEY_LEN: 16,
  WAY_NUM: 8,

  genUrl(id, item) {
    const keyHex = bytesToHex(item.url);
    return `pic${id+1}.zhimg.com/80/v2-${keyHex}.gif`;
  }
},

// sm.ms
{
  URL_KEY_LEN: 8,
  WAY_NUM: 2,

  genUrl(id, item) {
    // +new Date('2018/03/13 GMT')
    const DAY_BASE = 1520899200000,

    domain = ['i.loli.net', 'ooo.0o0.ooo'][id],
    urlKey = item.url,

    dayNum = (urlKey[0] << 4) | (urlKey[1] >> 4),
    dayObj = new Date(DAY_BASE + dayNum * 86400000),
    dayStr = dayObj.toISOString().substr(0, 10).replace(/-/g, '/'),

    fileHex = bytesToHex(urlKey),
    fileStr = fileHex.substr(3);

    return `${domain}/${dayStr}/${fileStr}.gif`;
  }
},
];


class Node {
  constructor(config) {
    this.urlKeyLen = config.URL_KEY_LEN;
    this.wayNum = config.WAY_NUM;
    this._genUrl = config.genUrl;
    
    this._ready = true;
    this._priority = 0;

    // this._speed = 0;
    // this._delay = 0;
    this._pathMap = null;

    this._totalNum = 0;
    this._errorNum = 0;

    this._lastErrTick = 0;
  }

  async _loadMani(info) {
    this._ready = false;

    const url = this.genUrl(info);
    console.log('load manifest:', url);

    const hash = info.hash;

    const img = new Img();
    await img.load(url, hash);

    const reader = new MyReader(img);
    const nFile = await reader.aReadUint32();

    const size = nFile * (4 + this.urlKeyLen + HASH_SIZE);
    const bytes = await reader.aReadBytes(size, false);

    if (!hashVerify(bytes, hash)) {
      throw 'manifest hash incorrect';
    }
    const map = {};

    for (let i = 0; i < nFile; i++) {
      const pathHash = reader.readUint32();
      const urlKey = reader.readBytes(this.urlKeyLen);
      const fileHash = reader.readBytes(HASH_SIZE);

      map[pathHash] = {
        url: urlKey,
        hash: fileHash,
      };
    }

    this._pathMap = map;
    this._ready = true;
  }

  genUrl(info) {
    return 'https://' + this._genUrl(0, info);
  }

  getFileInfo(path) {
    return this._pathMap[strHash(path)];
  }

  getPathInfo(path) {
    // TODO: custom rewrite
    let ret;
    if (/^$|\\/$/.test(path)) {
      ret =
        this.getFileInfo(path + 'index.html');
    } else {
      ret =
        this.getFileInfo(path) ||
        this.getFileInfo(path + '.html') ||
        this.getFileInfo(path + '/index.html');
    }
    return ret;
  }

  use() {
    this._totalNum++;
  }

  error() {
    this._errorNum++;
    this._lastErrTick = Date.now();
  }

  static choose() {
    const now = Date.now();

    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      if (!node._ready) {
        continue;
      }
      if (now - node._lastErrTick < 1000 * 60) {
        continue;
      }
      return node;
    }
    return null;
  }

  // async
  static loadManiList(listBuf, count) {
    return new Promise(y => {
      let fails = 0;
      let pos = 0;
      let count = 0;

      do {
        const node = nodeList[count++];
        const urlKeyLen = node.urlKeyLen;

        const urlKeyBuf = listBuf.subarray(pos, pos + urlKeyLen);
        pos += urlKeyLen;

        const hashBuf = listBuf.subarray(pos, pos + HASH_SIZE);
        pos += HASH_SIZE;

        const info = {
          url: urlKeyBuf, 
          hash: hashBuf
        };

        node._loadMani(info)
        .then(y)
        .catch(err => {
          console.warn('load manifest err:', err);
          node.error();

          if (++fails === count) {
            console.log('no available node!');
            y();
          }
        });
      } while (pos < listBuf.length);
    });
  }
}

const nodeList = NODES_CONFIG.map(i => new Node(i));class Task {
  constructor(path) {
    this.done = false;
    this.timeout = false;

    this._path = path;
    this._node = null;
    this._file = null;
    this._rxMax = 0;
    this._rxPos = 0;
  }

  async readHead() {
    let status = 200;

    for (;;) {
      const node = Node.choose();
      if (!node) {
        return null;
      }

      let info = node.getPathInfo(this._path);
      if (!info) {
        status = 404;
        info = node.getFileInfo('404.html');
        if (!info) {
          return null;
        }
      }

      const url = node.genUrl(info);
      const file = new VFile(url, node.urlKeyLen, info.hash);

      // node.use();

      const head = await file.open();
      if (head) {
        this._node = node;
        this._file = file;
        return {status, head};
      }

      node.error();
      file.close();
    }
  }

  async readBody() {
    console.assert(!this.done);

    for (;;) {
      let ret = await this._file.pull();
      if (!ret) {
        this._file.close();
        this._node.error();

        // choose a new node
        const head = await this.readHead();
        if (!head) {
          console.warn('node switch fail');
          this.done = true;
          return null;
        }

        // reset progress
        this._rxPos = 0;
        continue;
      }

      const {data, done} = ret;

      this._rxPos += data.length;
      if (this._rxPos <= this._rxMax) {
        // skip the data that has been downloaded
        continue;
      }
      this._rxMax = this._rxPos;

      if (done) {
        this.done = true;
      }
      return data;
    }
  }

  stop() {
    this._file.close();
  }
}

const DEFAULT_HEADERS = new Headers({
  'x-xss-protection': '1',
  'content-type': 'text/html',
});

function makeErrRes(code, text) {
  const html = `<h1>${code}: ${text}</h1><hr>${Date()}`;
  return new Response(html, {
    status: code,
    statusText: text,
    headers: DEFAULT_HEADERS,
  });
}


async function proxy(req, path) {
  const cacheEntire = await caches.open('entire');

  let res = await cacheEntire.match(req);
  if (res) {
    console.log('proxy cache hit haha:', req.url);
    return res;
  }

  const task = new Task(path);

  const ret = await task.readHead();
  if (!ret) {
    if (task.timeout) {
      return makeErrRes(504, 'Gateway Time-out');
    }
    return makeErrRes(404, 'Not Found');
  }

  const {status, head} = ret;

  let resEntire;

  // http respond
  const headers = new Headers(DEFAULT_HEADERS);
  headers.set('content-type', head.mime);

  const stream = new ReadableStream({
    async pull(controller) {
      const chunk = await task.readBody();
      if (chunk) {
        controller.enqueue(chunk);
      }
      if (task.done) {
        controller.close();

        // cache response
        if (resEntire) {
          cacheEntire.put(req, resEntire);
        }
      }
    },
    cancel(reason) {
      console.warn('stream cancel:', url, reason);
      task.stop();
    },
  });

  res = new Response(stream, {status, headers});

  if (status !== 404) {
    resEntire = res.clone();
  }

  return res;
}


exports.onfetch = function(e) {
  const req = e.request;
  const url = new URL(req.url);
  const path = url.pathname.substr(1);

  return proxy(req, path);
};

exports.oninit = function(e) {
  console.log('mod oninit');

  const listBuf = hexToBytes('3e2932e0da67bc08f6da4229072ef7bd41d5ea34ad626a76fb4a0085ab21c98203185a587627b85e5288613b');
  return Node.loadManiList(listBuf, 2);
};

exports.onterm = function(e) {
  console.log('mod onterm');
};;;;