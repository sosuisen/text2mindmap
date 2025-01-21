const colors = [
    "#B70200",
    "#007520",
    "#C2B300",
    "#0077F5",
    "#845600",
    "#4B00BD",
    "#C24301",
    "#547A31",
    "#84007D",
    "#387A74",
];

// hex形式の色を明るくする関数
function lightenColor(hex: string, rate: number): string {
    // #を除去して6桁のhex値を取得
    const color = hex.replace('#', '');

    // R,G,Bの値を16進数から10進数に変換
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // 各色をrate%明るくする
    const newR = Math.min(255, Math.round(r + (255 - r) * (rate / 100)));
    const newG = Math.min(255, Math.round(g + (255 - g) * (rate / 100)));
    const newB = Math.min(255, Math.round(b + (255 - b) * (rate / 100)));

    // 10進数を16進数に変換して2桁に揃える
    const rHex = newR.toString(16).padStart(2, '0');
    const gHex = newG.toString(16).padStart(2, '0');
    const bHex = newB.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

// TreeNodeクラスの定義
export class TreeNode {
    text: string;
    path: string;
    parent: TreeNode | null;
    x: number; // ノードのX座標
    y: number; // ノードのY座標
    width: number; // ノードの幅
    height: number; // ノードの高さ
    bottom: number; // ノードの底のY座標
    fontSize: number; // ノードのフォントサイズ
    leftChildWidth: number; // 左子ノードの合計幅
    rightChildWidth: number; // 右子ノードの合計幅
    leftChildHeight: number; // 左子ノードの合計高さ
    rightChildHeight: number; // 右子ノードの合計高さ
    direction: string; // ノードの方向 ("left" または "right")
    textColor: string; // ノードのテキストの色
    bgColor: string; // ノードの色
    borderColor: string; // ノードの枠の色

    constructor(text: string, path: string, parent: TreeNode | null) {
        this.text = text;
        this.path = path;
        this.parent = parent;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.bottom = 0;
        this.fontSize = 0;
        this.leftChildWidth = 0;
        this.rightChildWidth = 0;
        this.leftChildHeight = 0;
        this.rightChildHeight = 0;
        this.direction = ""; // 初期値は空文字列
        // pathの2階層目の値を取得し、それをインデックスとして色を設定
        const pathParts = path.split('-');
        if (pathParts.length >= 2) {
            this.borderColor = lightenColor(colors[parseInt(pathParts[1]) % colors.length], (pathParts.length - 2) * 10);
            this.bgColor = lightenColor(colors[parseInt(pathParts[1]) % colors.length], (pathParts.length - 1) * 20);
            this.textColor = "#ffffff";

        } else {
            this.bgColor = "#ffffff"; // ルートノードは白
            this.textColor = "#000000"; // ルートノードは黒
            this.borderColor = "#000000"; // ルートノードは黒
        }
    }

    // 親ノードのbottomを更新するメソッド
    setBottom(childBottom: number) {
        if (childBottom > this.bottom) {
            this.bottom = childBottom;
            if (this.parent) {
                this.parent.setBottom(this.bottom);
            }
        }
    }

    // SVGを生成するメソッド
    generateSvg(): string {
        return `
<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" rx="10" ry="10" fill="${this.bgColor}" stroke="${this.borderColor}" stroke-width="2"/>
<text x="${this.x + this.width / 2}" y="${this.y + this.height / 2}" font-size="${this.fontSize}px" text-anchor="middle" alignment-baseline="central" fill="${this.textColor}">${this.text}</text>
`;
    }
}
