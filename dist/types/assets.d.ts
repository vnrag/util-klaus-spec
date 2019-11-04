export interface KlausAsset {
    id: string;
    type: string;
    url: string;
}
export declare enum AssetType {
    Image = "image",
    Audio = "audio",
    Video = "video"
}
export declare class Asset {
    id: string;
    type: string;
    private _url;
    constructor(url: string, id?: string, type?: string);
    static fromJSON(json: KlausAsset): Asset;
    static fromUrl(assetUrl: string): Asset;
    getFilename(): string;
    url: string;
}
export declare class Assets {
    private _items;
    constructor(assets?: Assets | KlausAsset[]);
    [Symbol.iterator](): Generator<Asset, void, unknown>;
    getAssetById(assetId: string): Asset | undefined;
    getAssetsAsCollection(): {
        [index: string]: Asset;
    };
    getKeys(): string[];
    addFromUrl(assetUrl: string): Asset;
    toJSON(): Asset[];
    static fromArray(assets?: Assets | KlausAsset[]): Assets;
}
