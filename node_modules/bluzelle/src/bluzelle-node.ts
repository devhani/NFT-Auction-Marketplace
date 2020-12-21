import {BluzelleConfig} from "./types/BluzelleConfig";
import {API} from "./API";

export {API} from './API';
export {BluzelleConfig} from './types/BluzelleConfig'
export {SearchOptions} from './API'
export {mnemonicToAddress} from './API'

export const bluzelle = (config: BluzelleConfig): API => new API(config);



