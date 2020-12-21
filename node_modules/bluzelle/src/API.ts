import {passThrough} from "promise-passthrough";

global.fetch || (global.fetch = require('node-fetch'));


import {BluzelleConfig} from "./types/BluzelleConfig";
import {GasInfo} from "./types/GasInfo";
import {AccountResult} from "./types/cosmos/AccountResult";
import {AccountsResult} from "./types/cosmos/AccountsResult";
import {
    QueryCountResult, QueryGetLeaseResult, QueryGetNShortestLeasesResult,
    QueryHasResult,
    QueryKeysResult,
    QueryKeyValuesResult, QueryOwnerResult,
    QueryReadResult
} from "./types/QueryResult";
import {CommunicationService, Transaction} from "./services/CommunicationService";
import {
    CountMessage,
    CreateMessage,
    DeleteAllMessage,
    DeleteMessage, GetLeaseMessage, HasMessage, KeysMessage, KeyValuesMessage, MultiUpdateMessage,
    ReadMessage, RenameMessage, RenewLeaseAllMessage,
    RenewLeaseMessage, TransferTokensMessage, UpdateMessage, UpsertMessage
} from "./types/Message";
import {
    MessageResponse,
    TxCountResponse,
    TxGetLeaseResponse,
    TxHasResponse,
    TxKeysResponse, TxKeyValuesResponse,
    TxReadResponse
} from "./types/MessageResponse";
import {LeaseInfo} from "./types/LeaseInfo";
import {ClientErrors} from "./ClientErrors";
import {pullAt, memoize} from 'lodash'
import {
    TxCountResult,
    TxGetLeaseResult,
    TxGetNShortestLeasesResult,
    TxHasResult, TxKeysResult,
    TxReadResult,
    TxResult
} from "./types/TxResult";
import {assert} from "./Assert";
import {Some} from "monet";
import {entropyToMnemonic, generateMnemonic} from "bip39";


const cosmosjs = require('@cosmostation/cosmosjs');


const BLOCK_TIME_IN_SECONDS = 5.5;

interface QueryError {
    status: number
    error: string
}

export interface SearchOptions {
    page?: number
    limit?: number
    reverse?: boolean
}

export const mnemonicToAddress = (mnemonic: string) => {
    const c = cosmosjs.network('http://fake.com', 'fake_chain_id');
    c.setPath("m/44'/118'/0'/0/0");
    c.bech32MainPrefix = "bluzelle"
    return c.getAddress(mnemonic);
}

export class API {
    cosmos: any;
    address: string;
    mnemonic: string;
    chainId: string = '';
    uuid: string;
    url: string;
    config: BluzelleConfig
    communicationService: CommunicationService


    constructor(config: BluzelleConfig) {
        this.config = config;
        this.mnemonic = config.mnemonic;
        this.address = this.mnemonic ? mnemonicToAddress(this.mnemonic) : '';
        this.uuid = config.uuid;
        this.url = config.endpoint;
        this.communicationService = CommunicationService.create(this);
    }

    getCosmos = memoize(() =>
        fetch(`${this.url}/node_info`)
            .then(x => x.json())
            .then(x => x.node_info.network)
            .then(chainId => cosmosjs.network(this.url, chainId))
            .then(passThrough<any>(cosmos => cosmos.setPath("m/44\'/118\'/0\'/0/0")))
            .then(passThrough<any>(cosmos => cosmos.bech32MainPrefix = 'bluzelle'))
    )

    withTransaction<T>(fn: () => any, transaction?: Transaction): T {
        return this.communicationService.withTransaction<T>(fn, transaction);
    }

    setMaxMessagesPerTransaction(count: number) {
        this.communicationService.setMaxMessagesPerTransaction(count);
    }

    account(): Promise<AccountResult> {
        return this.getCosmos()
            .then(cosmos => cosmos.getAccounts(this.address))
            .then((x: AccountsResult) => x.result.value);
    }

    isExistingAccount(): Promise<boolean> {
        return this.account()
            .then(x => !!x.coins.length)
    }

    count(): Promise<number> {
        return this.#query<QueryCountResult>(`crud/count/${this.uuid}`)
            .then((res: QueryCountResult) => parseInt(res.count || '0'));
    }

    async create(key: string, value: string, gasInfo: GasInfo, leaseInfo: LeaseInfo = {}): Promise<TxResult> {
        const blocks = convertLease(leaseInfo);

        assert(!!key, ClientErrors.KEY_CANNOT_BE_EMPTY);
        assert(typeof key === 'string', ClientErrors.KEY_MUST_BE_A_STRING);
        assert(typeof value === 'string', ClientErrors.VALUE_MUST_BE_A_STRING);
        assert(blocks >= 0, ClientErrors.INVALID_LEASE_TIME);
        assert(!key.includes('/'), ClientErrors.KEY_CANNOT_CONTAIN_SLASH)

        return this.communicationService.sendMessage<CreateMessage, void>({
            type: "crud/create",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString(),
            }
        }, gasInfo)
            .then(standardTxResult)
    }


    delete(key: string, gasInfo: GasInfo): Promise<TxResult> {
        return this.communicationService.sendMessage<DeleteMessage, void>({
            type: 'crud/delete',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult)
    }

    deleteAll(gasInfo: GasInfo): Promise<TxResult> {
        return this.communicationService.sendMessage<DeleteAllMessage, void>({
            type: 'crud/deleteall',
            value: {
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult)
    }

    getAddress() {
        return mnemonicToAddress(this.mnemonic);
    }

    getLease(key: string): Promise<number> {
        return this.#query<QueryGetLeaseResult & { error: string }>(`crud/getlease/${this.uuid}/${encodeSafe(key)}`)
            .then(res => Math.round(res.lease * BLOCK_TIME_IN_SECONDS))
            .catch(res => {
                throw res.error === 'Not Found' ? `key "${key}" not found` : res.error
            })
    }

    generateBIP39Account = (entropy: string = ''): string => {
        assert(entropy.length === 0 || entropy.length === 64, 'Entropy must be 64 char hex');
        return entropy ? entropyToMnemonic(entropy) : generateMnemonic(256);
    }

    async getNShortestLeases(count: number) {
        assert(count >= 0, ClientErrors.INVALID_VALUE_SPECIFIED);
        return this.#query<QueryGetNShortestLeasesResult>(`crud/getnshortestleases/${this.uuid}/${count}`)
            .then(res => res.keyleases.map(({key, lease}) => ({key, lease: Math.round(parseInt(lease) * BLOCK_TIME_IN_SECONDS)})));
    }

    getTx(txhash: string) {
        return this.#query(`txs/${txhash}`)
    }

    getBNT({ubnt}: { ubnt?: boolean } = {ubnt: false}): Promise<number> {
        return this.account()
            .then(a => a.coins[0]?.amount || '0')
            .then(a => ubnt ? a : a.slice(0, -6) || '0')
            .then(parseInt)
    }

    has(key: string): Promise<boolean> {
        return this.#query<QueryHasResult>(`crud/has/${this.uuid}/${key}`)
            .then(res => res.has);
    }

    keys(): Promise<string[]> {
        return this.#query<QueryKeysResult>(`crud/keys/${this.uuid}`)
            .then(res => res.keys)
            .then(keys => keys.map(decodeSafe));
    }

    keyValues(): Promise<{ key: string, value: string }[]> {
        return this.#query<QueryKeyValuesResult>(`crud/keyvalues/${this.uuid}`)
            .then(res => res.keyvalues)
            .then(keyvalues => keyvalues.map(({key, value}) => ({key, value: decodeSafe(value)})))
    }

    async multiUpdate(keyValues: { key: string, value: string }[], gasInfo: GasInfo): Promise<TxResult> {
        assert(Array.isArray(keyValues), 'keyValues must be an array');

        keyValues.forEach(({key, value}, index, array) => {
            assert(typeof key === 'string', ClientErrors.ALL_KEYS_MUST_BE_STRINGS);
            assert(typeof value === 'string', ClientErrors.ALL_VALUES_MUST_BE_STRINGS);
        });

        return this.communicationService.sendMessage<MultiUpdateMessage, void>({
            type: 'crud/multiupdate',
            value: {
                KeyValues: keyValues,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult)
    }

    owner(key: string): Promise<string> {
        return this.#query<QueryOwnerResult>(`crud/owner/${this.uuid}/${encodeSafe(key)}`)
            .then(res => res.owner)
            .catch((x) => {
                if (x instanceof Error) {
                    throw x;
                }
                throw(new Error(x.error === 'Not Found' ? `key "${key}" not found` : x.error))
            });
    }


    read(key: string, prove: boolean = false): Promise<string> {
        return this.#query<QueryReadResult>(`crud/${prove ? 'pread' : 'read'}/${this.uuid}/${encodeSafe(key)}`)
            .then(res => res.value)
            .then(decodeSafe)
            .catch((x) => {
                if (x instanceof Error) {
                    throw x;
                }
                throw(new Error(x.error === 'Not Found' ? `key "${key}" not found` : x.error))
            });
    }

    async rename(key: string, newKey: string, gasInfo: GasInfo): Promise<TxResult> {
        assert(typeof key === 'string', ClientErrors.KEY_MUST_BE_A_STRING);
        assert(typeof newKey === 'string', ClientErrors.NEW_KEY_MUST_BE_A_STRING);

        return this.communicationService.sendMessage<RenameMessage, void>({
            type: 'crud/rename',
            value: {
                Key: key,
                NewKey: newKey,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult)

    }


    async renewLease(key: string, gasInfo: GasInfo, leaseInfo: LeaseInfo): Promise<TxResult> {
        assert(typeof key === 'string', ClientErrors.KEY_MUST_BE_A_STRING);

        const blocks = convertLease(leaseInfo);

        assert(blocks >= 0, ClientErrors.INVALID_LEASE_TIME)

        return this.communicationService.sendMessage<RenewLeaseMessage, void>({
            type: 'crud/renewlease',
            value: {
                Key: key,
                Lease: blocks.toString(),
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult)
    }


    async renewLeaseAll(gasInfo: GasInfo, leaseInfo: LeaseInfo = {}): Promise<TxResult> {
        const blocks = convertLease(leaseInfo);
        assert(blocks >= 0, ClientErrors.INVALID_LEASE_TIME);

        return this.communicationService.sendMessage<RenewLeaseAllMessage, void>({
            type: 'crud/renewleaseall',
            value: {
                Lease: blocks.toString(),
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(standardTxResult)
    }

    search(searchString: string, options: SearchOptions = {page: 1, limit: Number.MAX_SAFE_INTEGER, reverse: false}): Promise<{ key: string, value: string }[]> {
        return this.#query<QueryKeyValuesResult>(`crud/search/${this.uuid}/${searchString}/${options.page || 1}/${options.limit || Number.MAX_SAFE_INTEGER}/${options.reverse ? 'desc' : 'asc'}`)
            .then(res => res.keyvalues)
            .then(keyvalues => keyvalues.map(({key, value}) => ({key, value: decodeSafe(value)})))
    }


    sendMessage(message: any, gasInfo: GasInfo) {
        return this.communicationService.sendMessage(message, gasInfo);
    }

    async txCount(gasInfo: GasInfo): Promise<TxCountResult> {
        return this.communicationService.sendMessage<CountMessage, TxCountResponse>({
            type: 'crud/count',
            value: {
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine<TxCountResponse>(res, it => it.count !== undefined))
            .then(({res, data}) => ({...standardTxResult(res), count: parseInt(data?.count || '0')}))
    }

    async txGetLease(key: string, gasInfo: GasInfo): Promise<TxGetLeaseResult> {
        return this.communicationService.sendMessage<GetLeaseMessage, TxGetLeaseResponse>({
            type: 'crud/getlease',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine<TxGetLeaseResponse>(res, it => it.key === key && it.lease !== undefined))
            .then(({res, data}) => ({
                ...standardTxResult(res),
                lease: Math.round(parseInt(data?.lease || '0') * BLOCK_TIME_IN_SECONDS)
            }))
    }

    async txGetNShortestLeases(n: number, gasInfo: GasInfo): Promise<TxGetNShortestLeasesResult> {
        return {
            txhash: 'xxx',
            height: 1,
            gasWanted: 0,
            gasUsed: 0,
            leases: []
        }
    }

    async txHas(key: string, gasInfo: GasInfo): Promise<TxHasResult> {
        assert(typeof key === 'string', ClientErrors.KEY_MUST_BE_A_STRING);

        return this.communicationService.sendMessage<HasMessage, TxHasResponse>({
            type: 'crud/has',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address,
            }
        }, gasInfo)
            .then(res => findMine<TxHasResponse>(res, it => it.key === key && it.has !== undefined))
            .then(({res, data}) => ({
                ...standardTxResult(res),
                key: data?.key || '',
                has: data?.has || false
            }))

    }

    async txKeys(gasInfo: GasInfo): Promise<TxKeysResult> {
        return this.communicationService.sendMessage<KeysMessage, TxKeysResponse>({
            type: 'crud/keys',
            value: {
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine<TxKeysResponse>(res, it => it.keys !== undefined))
            .then(({res, data}) => ({
                ...standardTxResult(res),
                keys: data?.keys || []
            }))
    }

    async txKeyValues(gasInfo: GasInfo): Promise<any> {
        return this.communicationService.sendMessage<KeyValuesMessage, TxKeyValuesResponse>({
            type: 'crud/keyvalues',
            value: {
                Owner: this.address,
                UUID: this.uuid
            }
        }, gasInfo)
            .then(res => findMine<TxKeyValuesResponse>(res, it => {
                return Array.isArray(it.keyvalues) &&
                    !!(it.keyvalues.length === 0 || (it.keyvalues[0].key && it.keyvalues[0].value))
            }))
            .then(({res, data}) => ({height: res.height, txhash: res.txhash, keyvalues: data?.keyvalues}))
            .then(({height, txhash, keyvalues}) => ({
                height,
                txhash,
                keyvalues: keyvalues?.map(({key, value}) => ({key, value: decodeSafe(value)}))
            }))
    }


    txRead(key: string, gasInfo: GasInfo): Promise<TxReadResult | undefined> {
        return this.communicationService.sendMessage<ReadMessage, TxReadResponse>({
            type: 'crud/read',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine<TxReadResponse>(res, it => it.value !== undefined && it.key === key))
            .then(({res, data}) => ({
                ...standardTxResult(res),
                value: data?.value
            }))
    }

    async update(key: string, value: string, gasInfo: GasInfo, leaseInfo: LeaseInfo = {}): Promise<TxResult> {

        const blocks = convertLease(leaseInfo);

        assert(!!key, ClientErrors.KEY_CANNOT_BE_EMPTY);
        assert(typeof key === 'string', ClientErrors.KEY_MUST_BE_A_STRING);
        assert(typeof value === 'string', ClientErrors.VALUE_MUST_BE_A_STRING);
        assert(blocks >= 0, ClientErrors.INVALID_LEASE_TIME);
        assert(!key.includes('/'), ClientErrors.KEY_CANNOT_CONTAIN_SLASH)

        return this.communicationService.sendMessage<UpdateMessage, void>({
            type: "crud/update",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString()
            }
        }, gasInfo)
            .then(standardTxResult)
    }

    async upsert(key: string, value: string, gasInfo: GasInfo, leaseInfo: LeaseInfo = {}): Promise<TxResult> {

        const blocks = convertLease(leaseInfo);

        assert(!!key, ClientErrors.KEY_CANNOT_BE_EMPTY);
        assert(typeof key === 'string', ClientErrors.KEY_MUST_BE_A_STRING);
        assert(typeof value === 'string', ClientErrors.VALUE_MUST_BE_A_STRING);
        assert(blocks >= 0, ClientErrors.INVALID_LEASE_TIME);
        assert(!key.includes('/'), ClientErrors.KEY_CANNOT_CONTAIN_SLASH)

        return this.communicationService.sendMessage<UpsertMessage, void>({
            type: "crud/upsert",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString()
            }
        }, gasInfo)
            .then(standardTxResult)
    }


    version(): Promise<string> {
        return this.#query<any>('node_info').then(res => res.application_version.version);
    }

    transferTokensTo(toAddress: string, amount: number, gasInfo: GasInfo, {ubnt, memo}: { ubnt?: boolean, memo?: string } = {
        ubnt: false,
        memo: 'transfer'
    }): Promise<TxResult> {
        return this.communicationService.sendMessage<TransferTokensMessage, void>({
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
            .then(standardTxResult)
    }

    #query = <T>(path: string): Promise<T> =>
        fetch(`${this.url}/${path}`)
            .then((res: any) => {
                if (res.status !== 200) {
                    throw {
                        status: res.status,
                        error: res.statusText
                    } as QueryError
                }
                return res.json().then((obj: any) => obj.result ?? obj)
            })
}


const decodeSafe = (str: string): string =>
    decodeURI(str)
        .replace(/%../g, x => Some(x)
            .map(x => x.replace('%', ''))
            .map(x => parseInt(x, 16))
            .map(String.fromCharCode)
            .join()
        )


const encodeSafe = (str: string): string => Some(str)
    .map(str => str.replace(/([%])/g, ch => `%${ch.charCodeAt(0).toString(16)}`))
    .map(encodeURI)
    .map(str => str.replace(/([\#\?\&])/g, ch => `%${ch.charCodeAt(0).toString(16)}`))
    .join();


const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24
const convertLease = ({seconds = 0, minutes = 0, hours = 0, days = 0}: LeaseInfo): number =>
    Math.round((seconds + (minutes * MINUTE) + (hours * HOUR) + (days * DAY)) / BLOCK_TIME_IN_SECONDS)

const findMine = <T>(res: { data: T[] }, condition: (x: T) => boolean): { res: any, data: T | undefined } => {
    for (let i: number = 0; i < res.data.length; i++) {
        if (condition(res.data[i])) {
            const found = res.data[i];
            pullAt(res.data, i)
            return {res, data: found}
        }
    }
    return {res, data: undefined}
}

const standardTxResult = (res: MessageResponse<void>): TxResult => ({
    txhash: res.txhash,
    height: res.height,
    gasWanted: parseInt(res.gas_wanted),
    gasUsed: parseInt(res.gas_used)
})