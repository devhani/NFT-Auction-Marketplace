"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMnemonic = void 0;
// extract the mnemonic if that's the style used, or return undefined
exports.getMnemonic = (signingAuthority) => {
    if ("mnemonic" in signingAuthority) {
        return signingAuthority.mnemonic;
    }
};
//# sourceMappingURL=getMnemonic.js.map