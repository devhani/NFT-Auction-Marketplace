import {GasInfo} from "../types/GasInfo";
import {None, Some} from "monet";
import {API} from "../API";
import {MessageResponse} from "../types/MessageResponse";
import {Message} from "../types/Message";
import {takeWhile, without} from 'lodash'
import {passThrough} from "promise-passthrough";

const TOKEN_NAME = 'ubnt';

interface MessageQueueItem<T, R> {
    message: Message<T>
    resolve?: (value: MessageResponse<R>) => void
    reject?: (reason: any) => void
    gasInfo: GasInfo
    transaction?: Transaction
}

interface FailedTransaction {
    txhash: string
    height: number
    failedMsg?: Message<any>
    failedMsgIdx?: number
    error: string
}

export interface Transaction {
    memo: string
}

export class CommunicationService {
    #api: API
    #messageQueue: MessageQueueItem<any, any>[] = [];
    #maxMessagesPerTransaction = 1;
    #checkTransmitQueueTail: Promise<any> = Promise.resolve();
    #currentTransaction?: Transaction;
    #transactionInFlight: boolean = false;


    static create(api: API): CommunicationService {
        return new CommunicationService(api);
    }

    private constructor(api: API) {
        this.#api = api;
    }

    setMaxMessagesPerTransaction(count: number): void {
        this.#maxMessagesPerTransaction = count;
    }

    startTransaction(transaction: Transaction): void {
        this.#currentTransaction = transaction;
    }

    endTransaction(): void {
        this.#currentTransaction = undefined;
    }

    withTransaction<T>(fn: () => T, transaction: { memo: string } = {memo: ''}): T {
        if (this.#currentTransaction) {
            throw new Error('withTransaction() can not be nested')
        }
        this.startTransaction(transaction);
        const result = fn();
        this.endTransaction();
        return result;
    }

    sendMessage<T, R>(message: Message<T>, gasInfo: GasInfo): Promise<MessageResponse<R>> {
        const p = new Promise<MessageResponse<R>>((resolve, reject) => {
            this.#messageQueue.push({
                message,
                gasInfo,
                resolve,
                reject,
                transaction: this.#currentTransaction
            })
        })
        this.#messageQueue.length === 1 && !this.#transactionInFlight && (this.#checkTransmitQueueTail = this.#checkTransmitQueueTail.then(this.checkMessageQueueNeedsTransmit.bind(this)));
        return p;
    }

    checkMessageQueueNeedsTransmit() {
        Some(this.#messageQueue)
            .flatMap(queue => queue.length ? Some<MessageQueueItem<any, any>[]>(this.#messageQueue) : None<any>())
            .map(queue => [queue[0].transaction, queue])
            .map(([transaction, queue]) => [
                takeWhile(queue, (it: MessageQueueItem<any, any>, idx: number) =>
                    it.transaction === transaction
                    && (it.transaction === undefined ? idx < this.#maxMessagesPerTransaction : true)
                ),
                queue
            ])
            .map(([messages, queue]) => {
                this.#messageQueue = without(queue, ...messages);
                return messages
            })
            .map(messages => this.transmitTransaction(messages).then(this.checkMessageQueueNeedsTransmit.bind(this)))
    }


    transmitTransaction(messages: MessageQueueItem<any, any>[]): Promise<void> {
        this.#transactionInFlight = true;
        let cosmos: any;
        return this.#api.getCosmos()
            .then(c => cosmos = c)
            .then(() => cosmos.getAccounts(this.#api.address))
            .then((data: any) =>
                Some({
                    msgs: messages.map(m => m.message),
                    chain_id: cosmos.chainId,
                    fee: getFeeInfo(combineGas(messages)),
                    memo: messages[0].transaction?.memo || 'no memo',
                    account_number: data.result.value.account_number,
                    sequence: data.result.value.sequence
                })
                    .map(cosmos.newStdMsg.bind(cosmos))
                    .map((stdSignMsg: any) => cosmos.sign(stdSignMsg, cosmos.getECPairPriv(this.#api.mnemonic), 'block'))
                    .map(cosmos.broadcast.bind(cosmos))
                    .map(passThrough(() => this.#transactionInFlight = false))
                    .map((p: any) => p
                        .then(convertDataFromHexToString)
                        .then(convertDataToObject)
                        .then((x: any) => ({...x, height: parseInt(x.height)}))
                        .then(callRequestorsWithData(messages))
                        .catch((e: any) => callRequestorsWithData(messages)({error: e}))
                    )
                    .join()
            )
    }
}

const convertDataFromHexToString = (res: any) => ({
    ...res,
    data: res.data ? Buffer.from(res.data, 'hex').toString() : undefined
})
const convertDataToObject = (res: any) => ({
    ...res,
    data: res.data !== undefined ? JSON.parse(`[${res.data.split('}{').join('},{')}]`) : undefined
})

const callRequestorsWithData = (msgs: any[]) =>
    (res: any) =>
        msgs.reduce((memo: any, msg) => {
            if (res.error) {
                return msg.reject({
                    txhash: res.txhash,
                    height: res.height,
                    failedMsg: undefined,
                    failedMsgIdx: undefined,
                    error: res.error
                })
            }
            if (/signature verification failed/.test(res.raw_log)) {
                return msg.reject({
                    txhash: res.txhash,
                    height: res.height,
                    failedMsg: undefined,
                    failedMsgIdx: undefined,
                    error: 'Unknown error'
                } as FailedTransaction)
            }
            if (/insufficient fee/.test(res.raw_log)) {
                let [x, error] = res.raw_log.split(/[:;]/);
                return msg.reject({
                    txhash: res.txhash,
                    height: res.height,
                    failedMsg: undefined,
                    failedMsgIdx: undefined,
                    error: error.trim()
                } as FailedTransaction)
            }
            if (/failed to execute message/.test(res.raw_log)) {
                let [x, error, y, failedMsgIdx] = res.raw_log.split(':');
                failedMsgIdx = parseInt(failedMsgIdx)
                return msg.reject({
                    txhash: res.txhash,
                    height: res.height,
                    failedMsg: msgs[failedMsgIdx].message,
                    failedMsgIdx: parseInt(failedMsgIdx),
                    error: error.trim()
                } as FailedTransaction)
            }
            if (/^\[.*\]$/.test(res.raw_log) === false) {
                return msg.reject({
                    txhash: res.txhash,
                    height: res.height,
                    failedMsg: undefined,
                    failedMsgIdx: undefined,
                    error: res.raw_log
                })
            }
            return msg.resolve ? msg.resolve(memo) || memo : memo
        }, res)

const getFeeInfo = ({max_fee, gas_price = 10, max_gas = 200000}: GasInfo) => ({
    amount: [{
        denom: TOKEN_NAME,
        amount: (max_fee ? max_fee : max_gas * gas_price).toString()
    }],
    gas: max_gas.toString()
});

const combineGas = (transactions: MessageQueueItem<any, any>[]): GasInfo =>
    transactions.reduce((gasInfo: GasInfo, transaction: MessageQueueItem<any, any>) => {
        return {
            max_gas: (gasInfo.max_gas || 0) + (transaction.gasInfo.max_gas || 200000),
            max_fee: (gasInfo.max_fee || 0) + (transaction.gasInfo.max_fee || 0),
            gas_price: Math.max(gasInfo.gas_price || 0, transaction.gasInfo.gas_price || 0)
        } as GasInfo
    }, {});


