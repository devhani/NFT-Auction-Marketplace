import "source-map-support/register";
import ProviderEngine from "@trufflesuite/web3-provider-engine";
import { JSONRPCRequestPayload, JSONRPCErrorCallback } from "ethereum-protocol";
import { Callback, JsonRPCResponse } from "web3/providers";
import { ConstructorArguments } from "./constructor/ConstructorArguments";
declare class HDWalletProvider {
    private hdwallet?;
    private walletHdpath;
    private wallets;
    private addresses;
    engine: ProviderEngine;
    constructor(...args: ConstructorArguments);
    send(payload: JSONRPCRequestPayload, callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>): void;
    sendAsync(payload: JSONRPCRequestPayload, callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>): void;
    getAddress(idx?: number): string;
    getAddresses(): string[];
    static isValidProvider(provider: string | any): boolean;
}
export = HDWalletProvider;
