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
    }

    // ノードの位置とサイズを設定するメソッド
    setPositionAndSize(x: number, y: number, fontSize: number, padding: number) {
        const textLength = this.text.length;
        this.width = textLength * fontSize + padding * 2;
        this.height = fontSize + padding * 2;
        this.x = x;
        this.y = y;
        this.bottom = y + this.height;
        this.fontSize = fontSize;

        // 親ノードのbottomを更新
        if (this.parent) {
            this.parent.setBottom(this.bottom);
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
<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" rx="10" ry="10" fill="lightblue" stroke="black" stroke-width="2"/>
<text x="${this.x + this.width / 2}" y="${this.y + this.height / 2}" font-size="${this.fontSize}" text-anchor="middle" alignment-baseline="central" fill="black">${this.text}</text>
`;
    }
}
