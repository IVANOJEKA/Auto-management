/**
 * Self-contained Time-based One-Time Password (TOTP) helper.
 * Implements standard RFC 6238 TOTP (SHA1 HMAC with Base32 keys).
 * Compatible with standard authenticator apps (Google Authenticator, Authy, etc.).
 */

function base32Decode(base32: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
        const val = alphabet.indexOf(cleaned[i]);
        if (val === -1) {
            throw new Error('Invalid base32 character');
        }
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return new Uint8Array(output);
}

function rol(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
}

function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
}

function sha1_ft(t: number, b: number, c: number, d: number): number {
    if (t < 20) return (b & c) | (~b & d);
    if (t < 40) return b ^ c ^ d;
    if (t < 60) return (b & c) | (b & d) | (c & d);
    return b ^ c ^ d;
}

function sha1_kt(t: number): number {
    return t < 20 ? 1518500249 : t < 40 ? 1859775393 : t < 60 ? -1894007588 : -899497514;
}

function sha1(message: Uint8Array): Uint8Array {
    const words: number[] = [];
    const len = message.length * 8;
    for (let i = 0; i < message.length; i++) {
        words[i >> 2] |= message[i] << (24 - (i % 4) * 8);
    }
    words[len >> 5] |= 0x80 << (24 - (len % 32));
    const padIndex = (((len + 64) >> 9) << 4) + 15;
    words[padIndex] = len;

    const w = new Array<number>(80);
    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;
    let e = -1009589776;

    for (let i = 0; i < words.length; i += 16) {
        const olda = a;
        const oldb = b;
        const oldc = c;
        const oldd = d;
        const olde = e;

        for (let j = 0; j < 80; j++) {
            if (j < 16) {
                w[j] = words[i + j] || 0;
            } else {
                w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
            }

            const t = safeAdd(safeAdd(rol(a, 5), sha1_ft(j, b, c, d)), safeAdd(safeAdd(e, w[j]), sha1_kt(j)));
            e = d;
            d = c;
            c = rol(b, 30);
            b = a;
            a = t;
        }

        a = safeAdd(a, olda);
        b = safeAdd(b, oldb);
        c = safeAdd(c, oldc);
        d = safeAdd(d, oldd);
        e = safeAdd(e, olde);
    }

    const outBytes = new Uint8Array(20);
    const hash = [a, b, c, d, e];
    for (let i = 0; i < 20; i++) {
        outBytes[i] = (hash[i >> 2] >> (24 - (i % 4) * 8)) & 255;
    }
    return outBytes;
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
    let keyBytes = key;
    if (keyBytes.length > 64) {
        keyBytes = sha1(keyBytes);
    }
    const ipad = new Uint8Array(64);
    const opad = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
        const k = keyBytes[i] || 0;
        ipad[i] = k ^ 0x36;
        opad[i] = k ^ 0x5c;
    }

    const inner = new Uint8Array(64 + message.length);
    inner.set(ipad, 0);
    inner.set(message, 64);
    const innerHash = sha1(inner);

    const outer = new Uint8Array(64 + 20);
    outer.set(opad, 0);
    outer.set(innerHash, 64);
    return sha1(outer);
}

/**
 * Calculates the current 6-digit TOTP code for a base32-encoded secret.
 */
export function generateTOTP(secretBase32: string, timeStep = 30): string {
    try {
        const key = base32Decode(secretBase32);
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / timeStep);

        const counterBytes = new Uint8Array(8);
        let tmp = counter;
        for (let i = 7; i >= 0; i--) {
            counterBytes[i] = tmp & 255;
            tmp = Math.floor(tmp / 256);
        }

        const hmac = hmacSha1(key, counterBytes);
        const offset = hmac[19] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                     ((hmac[offset + 1] & 0xff) << 16) |
                     ((hmac[offset + 2] & 0xff) << 8) |
                     (hmac[offset + 3] & 0xff);

        const digits = 6;
        let otp = (code % Math.pow(10, digits)).toString();
        while (otp.length < digits) {
            otp = '0' + otp;
        }
        return otp;
    } catch (e) {
        console.error('Error generating TOTP:', e);
        return '000000';
    }
}

/**
 * Generates a random base32 string to be used as a 2FA secret key.
 */
export function generateRandomSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
