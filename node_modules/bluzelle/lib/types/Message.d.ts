export interface Message<T> {
    type: string;
    value: T;
}
export interface CountMessage {
    UUID: string;
    Owner: string;
}
export interface CreateMessage {
    Key: string;
    Value: string;
    Owner: string;
    Lease: string;
    UUID: string;
}
export interface GetLeaseMessage {
    Key: string;
    Owner: string;
    UUID: string;
}
export interface TransferTokensMessage {
    amount: [
        {
            amount: string;
            denom: string;
        }
    ];
    from_address: string;
    to_address: string;
}
export interface UpdateMessage {
    Key: string;
    Value: string;
    Owner: string;
    UUID: string;
    Lease: string;
}
export interface UpsertMessage {
    Key: string;
    Value: string;
    Owner: string;
    UUID: string;
    Lease: string;
}
export interface HasMessage {
    Key: string;
    Owner: string;
    UUID: string;
}
export interface KeysMessage {
    Owner: string;
    UUID: string;
}
export interface KeyValuesMessage {
    Owner: string;
    UUID: string;
}
export interface MultiUpdateMessage {
    KeyValues: {
        key: string;
        value: string;
    }[];
    Owner: string;
    UUID: string;
}
export interface ReadMessage {
    Key: string;
    Owner: string;
    UUID: string;
}
export interface RenewLeaseMessage {
    Key: string;
    Lease: string;
    Owner: string;
    UUID: string;
}
export interface RenameMessage {
    Key: string;
    NewKey: string;
    Owner: string;
    UUID: string;
}
export interface RenewLeaseAllMessage {
    Lease: string;
    Owner: string;
    UUID: string;
}
export interface DeleteMessage {
    Key: string;
    Owner: string;
    UUID: string;
}
export interface DeleteAllMessage {
    Owner: string;
    UUID: string;
}
//# sourceMappingURL=Message.d.ts.map