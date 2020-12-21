"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrivateKeys = void 0;
// extract the private keys if that's the style used, or return undefined
exports.getPrivateKeys = (signingAuthority) => {
    if ("privateKeys" in signingAuthority) {
        return signingAuthority.privateKeys;
    }
    else {
        return undefined;
    }
};
//# sourceMappingURL=getPrivateKeys.js.map