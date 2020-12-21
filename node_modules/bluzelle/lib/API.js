"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _query;
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = exports.mnemonicToAddress = void 0;
const promise_passthrough_1 = require("promise-passthrough");
global.fetch || (global.fetch = require('node-fetch'));
const CommunicationService_1 = require("./services/CommunicationService");
const lodash_1 = require("lodash");
const Assert_1 = require("./Assert");
const monet_1 = require("monet");
const bip39_1 = require("bip39");
const cosmosjs = require('@cosmostation/cosmosjs');
const BLOCK_TIME_IN_SECONDS = 5.5;
exports.mnemonicToAddress = (mnemonic) => {
    const c = cosmosjs.network('http://fake.com', 'fake_chain_id');
    c.setPath("m/44'/118'/0'/0/0");
    c.bech32MainPrefix = "bluzelle";
    return c.getAddress(mnemonic);
};
class API {
    constructor(config) {
        this.chainId = '';
        this.getCosmos = lodash_1.memoize(() => fetch(`${this.url}/node_info`)
            .then(x => x.json())
            .then(x => x.node_info.network)
            .then(chainId => cosmosjs.network(this.url, chainId))
            .then(promise_passthrough_1.passThrough(cosmos => cosmos.setPath("m/44\'/118\'/0\'/0/0")))
            .then(promise_passthrough_1.passThrough(cosmos => cosmos.bech32MainPrefix = 'bluzelle')));
        this.generateBIP39Account = (entropy = '') => {
            Assert_1.assert(entropy.length === 0 || entropy.length === 64, 'Entropy must be 64 char hex');
            return entropy ? bip39_1.entropyToMnemonic(entropy) : bip39_1.generateMnemonic(256);
        };
        _query.set(this, (path) => fetch(`${this.url}/${path}`)
            .then((res) => {
            if (res.status !== 200) {
                throw {
                    status: res.status,
                    error: res.statusText
                };
            }
            return res.json().then((obj) => { var _a; return (_a = obj.result) !== null && _a !== void 0 ? _a : obj; });
        }));
        this.config = config;
        this.mnemonic = config.mnemonic;
        this.address = this.mnemonic ? exports.mnemonicToAddress(this.mnemonic) : '';
        this.uuid = config.uuid;
        this.url = config.endpoint;
        this.communicationService = CommunicationService_1.CommunicationService.create(this);
    }
    withTransaction(fn, transaction) {
        return this.communicationService.withTransaction(fn, transaction);
    }
    setMaxMessagesPerTransaction(count) {
        this.communicationService.setMaxMessagesPerTransaction(count);
    }
    account() {
        return this.getCosmos()
            .then(cosmos => cosmos.getAccounts(this.address))
            .then((x) => x.result.value);
    }
    isExistingAccount() {
        return this.account()
            .then(x => !!x.coins.length);
    }
    count() {
        return __classPrivateFieldGet(this, _query).call(this, `crud/count/${this.uuid}`)
            .then((res) => parseInt(res.count || '0'));
    }
    async create(key, value, gasInfo, leaseInfo = {}) {
        const blocks = convertLease(leaseInfo);
        Assert_1.assert(!!key, "Key cannot be empty" /* KEY_CANNOT_BE_EMPTY */);
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        Assert_1.assert(typeof value === 'string', "Value must be a string" /* VALUE_MUST_BE_A_STRING */);
        Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
        Assert_1.assert(!key.includes('/'), "Key cannot contain a slash" /* KEY_CANNOT_CONTAIN_SLASH */);
        return this.communicationService.sendMessage({
            type: "crud/create",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString(),
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    delete(key, gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/delete',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    deleteAll(gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/deleteall',
            value: {
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    getAddress() {
        return exports.mnemonicToAddress(this.mnemonic);
    }
    getLease(key) {
        return __classPrivateFieldGet(this, _query).call(this, `crud/getlease/${this.uuid}/${encodeSafe(key)}`)
            .then(res => Math.round(res.lease * BLOCK_TIME_IN_SECONDS))
            .catch(res => {
            throw res.error === 'Not Found' ? `key "${key}" not found` : res.error;
        });
    }
    async getNShortestLeases(count) {
        Assert_1.assert(count >= 0, "Invalid value specified" /* INVALID_VALUE_SPECIFIED */);
        return __classPrivateFieldGet(this, _query).call(this, `crud/getnshortestleases/${this.uuid}/${count}`)
            .then(res => res.keyleases.map(({ key, lease }) => ({ key, lease: Math.round(parseInt(lease) * BLOCK_TIME_IN_SECONDS) })));
    }
    getTx(txhash) {
        return __classPrivateFieldGet(this, _query).call(this, `txs/${txhash}`);
    }
    getBNT({ ubnt } = { ubnt: false }) {
        return this.account()
            .then(a => { var _a; return ((_a = a.coins[0]) === null || _a === void 0 ? void 0 : _a.amount) || '0'; })
            .then(a => ubnt ? a : a.slice(0, -6) || '0')
            .then(parseInt);
    }
    has(key) {
        return __classPrivateFieldGet(this, _query).call(this, `crud/has/${this.uuid}/${key}`)
            .then(res => res.has);
    }
    keys() {
        return __classPrivateFieldGet(this, _query).call(this, `crud/keys/${this.uuid}`)
            .then(res => res.keys)
            .then(keys => keys.map(decodeSafe));
    }
    keyValues() {
        return __classPrivateFieldGet(this, _query).call(this, `crud/keyvalues/${this.uuid}`)
            .then(res => res.keyvalues)
            .then(keyvalues => keyvalues.map(({ key, value }) => ({ key, value: decodeSafe(value) })));
    }
    async multiUpdate(keyValues, gasInfo) {
        Assert_1.assert(Array.isArray(keyValues), 'keyValues must be an array');
        keyValues.forEach(({ key, value }, index, array) => {
            Assert_1.assert(typeof key === 'string', "All keys must be strings" /* ALL_KEYS_MUST_BE_STRINGS */);
            Assert_1.assert(typeof value === 'string', "All values must be strings" /* ALL_VALUES_MUST_BE_STRINGS */);
        });
        return this.communicationService.sendMessage({
            type: 'crud/multiupdate',
            value: {
                KeyValues: keyValues,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    owner(key) {
        return __classPrivateFieldGet(this, _query).call(this, `crud/owner/${this.uuid}/${encodeSafe(key)}`)
            .then(res => res.owner)
            .catch((x) => {
            if (x instanceof Error) {
                throw x;
            }
            throw (new Error(x.error === 'Not Found' ? `key "${key}" not found` : x.error));
        });
    }
    read(key, prove = false) {
        return __classPrivateFieldGet(this, _query).call(this, `crud/${prove ? 'pread' : 'read'}/${this.uuid}/${encodeSafe(key)}`)
            .then(res => res.value)
            .then(decodeSafe)
            .catch((x) => {
            if (x instanceof Error) {
                throw x;
            }
            throw (new Error(x.error === 'Not Found' ? `key "${key}" not found` : x.error));
        });
    }
    async rename(key, newKey, gasInfo) {
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        Assert_1.assert(typeof newKey === 'string', "New key must be a string" /* NEW_KEY_MUST_BE_A_STRING */);
        return this.communicationService.sendMessage({
            type: 'crud/rename',
            value: {
                Key: key,
                NewKey: newKey,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    async renewLease(key, gasInfo, leaseInfo) {
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        const blocks = convertLease(leaseInfo);
        Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
        return this.communicationService.sendMessage({
            type: 'crud/renewlease',
            value: {
                Key: key,
                Lease: blocks.toString(),
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    async renewLeaseAll(gasInfo, leaseInfo = {}) {
        const blocks = convertLease(leaseInfo);
        Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
        return this.communicationService.sendMessage({
            type: 'crud/renewleaseall',
            value: {
                Lease: blocks.toString(),
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    search(searchString, options = { page: 1, limit: Number.MAX_SAFE_INTEGER, reverse: false }) {
        return __classPrivateFieldGet(this, _query).call(this, `crud/search/${this.uuid}/${searchString}/${options.page || 1}/${options.limit || Number.MAX_SAFE_INTEGER}/${options.reverse ? 'desc' : 'asc'}`)
            .then(res => res.keyvalues)
            .then(keyvalues => keyvalues.map(({ key, value }) => ({ key, value: decodeSafe(value) })));
    }
    sendMessage(message, gasInfo) {
        return this.communicationService.sendMessage(message, gasInfo);
    }
    async txCount(gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/count',
            value: {
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine(res, it => it.count !== undefined))
            .then(({ res, data }) => ({ ...standardTxResult(res), count: parseInt((data === null || data === void 0 ? void 0 : data.count) || '0') }));
    }
    async txGetLease(key, gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/getlease',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine(res, it => it.key === key && it.lease !== undefined))
            .then(({ res, data }) => ({
            ...standardTxResult(res),
            lease: Math.round(parseInt((data === null || data === void 0 ? void 0 : data.lease) || '0') * BLOCK_TIME_IN_SECONDS)
        }));
    }
    async txGetNShortestLeases(n, gasInfo) {
        return {
            txhash: 'xxx',
            height: 1,
            gasWanted: 0,
            gasUsed: 0,
            leases: []
        };
    }
    async txHas(key, gasInfo) {
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        return this.communicationService.sendMessage({
            type: 'crud/has',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address,
            }
        }, gasInfo)
            .then(res => findMine(res, it => it.key === key && it.has !== undefined))
            .then(({ res, data }) => ({
            ...standardTxResult(res),
            key: (data === null || data === void 0 ? void 0 : data.key) || '',
            has: (data === null || data === void 0 ? void 0 : data.has) || false
        }));
    }
    async txKeys(gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/keys',
            value: {
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine(res, it => it.keys !== undefined))
            .then(({ res, data }) => ({
            ...standardTxResult(res),
            keys: (data === null || data === void 0 ? void 0 : data.keys) || []
        }));
    }
    async txKeyValues(gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/keyvalues',
            value: {
                Owner: this.address,
                UUID: this.uuid
            }
        }, gasInfo)
            .then(res => findMine(res, it => {
            return Array.isArray(it.keyvalues) &&
                !!(it.keyvalues.length === 0 || (it.keyvalues[0].key && it.keyvalues[0].value));
        }))
            .then(({ res, data }) => ({ height: res.height, txhash: res.txhash, keyvalues: data === null || data === void 0 ? void 0 : data.keyvalues }))
            .then(({ height, txhash, keyvalues }) => ({
            height,
            txhash,
            keyvalues: keyvalues === null || keyvalues === void 0 ? void 0 : keyvalues.map(({ key, value }) => ({ key, value: decodeSafe(value) }))
        }));
    }
    txRead(key, gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/read',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine(res, it => it.value !== undefined && it.key === key))
            .then(({ res, data }) => ({
            ...standardTxResult(res),
            value: data === null || data === void 0 ? void 0 : data.value
        }));
    }
    async update(key, value, gasInfo, leaseInfo = {}) {
        const blocks = convertLease(leaseInfo);
        Assert_1.assert(!!key, "Key cannot be empty" /* KEY_CANNOT_BE_EMPTY */);
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        Assert_1.assert(typeof value === 'string', "Value must be a string" /* VALUE_MUST_BE_A_STRING */);
        Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
        Assert_1.assert(!key.includes('/'), "Key cannot contain a slash" /* KEY_CANNOT_CONTAIN_SLASH */);
        return this.communicationService.sendMessage({
            type: "crud/update",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString()
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    async upsert(key, value, gasInfo, leaseInfo = {}) {
        const blocks = convertLease(leaseInfo);
        Assert_1.assert(!!key, "Key cannot be empty" /* KEY_CANNOT_BE_EMPTY */);
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        Assert_1.assert(typeof value === 'string', "Value must be a string" /* VALUE_MUST_BE_A_STRING */);
        Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
        Assert_1.assert(!key.includes('/'), "Key cannot contain a slash" /* KEY_CANNOT_CONTAIN_SLASH */);
        return this.communicationService.sendMessage({
            type: "crud/upsert",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString()
            }
        }, gasInfo)
            .then(standardTxResult);
    }
    version() {
        return __classPrivateFieldGet(this, _query).call(this, 'node_info').then(res => res.application_version.version);
    }
    transferTokensTo(toAddress, amount, gasInfo, { ubnt, memo } = {
        ubnt: false,
        memo: 'transfer'
    }) {
        return this.communicationService.sendMessage({
            type: "cosmos-sdk/MsgSend",
            value: {
                amount: [
                    {
                        amount: String(ubnt ? amount.toString() : `${amount}000000`),
                        denom: "ubnt"
                    }
                ],
                from_address: this.address,
                to_address: toAddress
            }
        }, gasInfo)
            .then(standardTxResult);
    }
}
exports.API = API;
_query = new WeakMap();
const decodeSafe = (str) => decodeURI(str)
    .replace(/%../g, x => monet_1.Some(x)
    .map(x => x.replace('%', ''))
    .map(x => parseInt(x, 16))
    .map(String.fromCharCode)
    .join());
const encodeSafe = (str) => monet_1.Some(str)
    .map(str => str.replace(/([%])/g, ch => `%${ch.charCodeAt(0).toString(16)}`))
    .map(encodeURI)
    .map(str => str.replace(/([\#\?\&])/g, ch => `%${ch.charCodeAt(0).toString(16)}`))
    .join();
const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const convertLease = ({ seconds = 0, minutes = 0, hours = 0, days = 0 }) => Math.round((seconds + (minutes * MINUTE) + (hours * HOUR) + (days * DAY)) / BLOCK_TIME_IN_SECONDS);
const findMine = (res, condition) => {
    for (let i = 0; i < res.data.length; i++) {
        if (condition(res.data[i])) {
            const found = res.data[i];
            lodash_1.pullAt(res.data, i);
            return { res, data: found };
        }
    }
    return { res, data: undefined };
};
const standardTxResult = (res) => ({
    txhash: res.txhash,
    height: res.height,
    gasWanted: parseInt(res.gas_wanted),
    gasUsed: parseInt(res.gas_used)
});
//# sourceMappingURL=API.js.map