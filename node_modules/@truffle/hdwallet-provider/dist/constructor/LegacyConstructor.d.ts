import { MnemonicPhrase, PrivateKey, ProviderOrUrl, AddressIndex, NumberOfAddresses, ShareNonce, DerivationPath } from "./types";
export declare type Credentials = MnemonicPhrase | PrivateKey | PrivateKey[];
declare type PossibleArguments = [Credentials, ProviderOrUrl, AddressIndex, NumberOfAddresses, ShareNonce, DerivationPath];
export declare type Arguments = [PossibleArguments[0], PossibleArguments[1]] | [PossibleArguments[0], PossibleArguments[1], PossibleArguments[2]] | [PossibleArguments[0], PossibleArguments[1], PossibleArguments[2], PossibleArguments[3]] | [PossibleArguments[0], PossibleArguments[1], PossibleArguments[2], PossibleArguments[3], PossibleArguments[4]] | [PossibleArguments[0], PossibleArguments[1], PossibleArguments[2], PossibleArguments[3], PossibleArguments[4], PossibleArguments[5]];
export {};
