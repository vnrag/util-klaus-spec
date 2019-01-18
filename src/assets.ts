export interface KlausAsset {
  id: string
  type: string
  url: string
}

export enum AssetType {
  Image = 'image',
  Audio = 'audio',
  Video = 'video'
}

export class Asset {
  id: string
  type: string
  private _url!: string

  constructor(url: string, id?: string, type: string = AssetType.Image) {
    Object.defineProperty(this, '_url', {
      enumerable: false,
      writable: true,
    })
    Object.defineProperty(this, 'url', {
      enumerable: true,
      writable: true,
    })

    this.id = id || Math.random().toString(36).substring(2)
    this.type = type;
    this.url = url
  }

  static fromJSON(json: KlausAsset): Asset {
    return new Asset(json.url, json.id, json.type);
  }

  static fromUrl(assetUrl: string): Asset {
    const asset = new Asset(assetUrl);
    const ext = <string>asset.url.split('.').pop()

    if (/(png|jpg|gif|webp)$/i.test(ext)) {
      asset.type = AssetType.Image
    } else if (/(mp3|ogg|aac|mp4|webm)$/i.test(ext)) {
      asset.type = AssetType.Audio
    } else if (/(mp4|avi|ogv|webm)$/i.test(ext)) {
      asset.type = AssetType.Video
    } else {
      throw new Error('File type not allowed or recognised.')
    }

    return asset
  }

  getFilename(): string {
    const url = new URL(this.url);

    return <string>url.pathname.split('/').pop();
  }

  set url(urlString: string) {
    const url = new URL(urlString);
    this._url = url.href;
  }

  get url(): string {
    return this._url
  }
}

export class Assets {
  private _items!: Asset[]

  constructor(assets: Assets|KlausAsset[] = []) {
    if (assets instanceof Assets) return assets

    Object.defineProperty(this, '_items', {
      value: assets,
      enumerable: false
    })

    this._items = [...assets].map(asset => Asset.fromJSON(asset));
  }

  *[Symbol.iterator]() {
    for (let item of this._items) {
      yield item;
    }
  }

  getAssetById(assetId: string): Asset | undefined {
    return this._items.filter(asset => asset.id === assetId)[0];
  }

  getAssetsAsCollection(): {[index: string]: Asset} {
    return this._items.reduce((obj: {[index: string]: Asset}, asset) => {
      obj[asset.id] = asset;

      return obj;
    }, {});
  }

  addFromUrl(assetUrl: string): Asset {
    const asset = Asset.fromUrl(assetUrl)

    this._items = [...this._items, asset];

    return asset;
  }

  toJSON() {
    return [...this._items];
  }

  static fromArray(assets: Assets|KlausAsset[] = []): Assets {
    if (assets instanceof Assets) return assets

    return new Assets(assets);
  }
}
