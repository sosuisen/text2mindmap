import { NextRequest } from 'next/server';

// TreeNodeクラスの定義
class TreeNode {
    text: string;
    path: string;
    parent: TreeNode | null;
    x: number; // ノードのX座標
    y: number; // ノードのY座標
    width: number; // ノードの幅
    height: number; // ノードの高さ
    bottom: number; // ノードの底のY座標

    constructor(text: string, path: string, parent: TreeNode | null) {
        this.text = text;
        this.path = path;
        this.parent = parent;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.bottom = 0;
    }

    // ノードの位置とサイズを設定するメソッド
    setPositionAndSize(x: number, y: number, fontSize: number, padding: number) {
        const textLength = this.text.length;
        this.width = textLength * fontSize + padding * 2;
        this.height = fontSize + padding * 2;
        this.x = x;
        this.y = y;
        this.bottom = y + this.height;

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
  <rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" fill="lightblue" stroke="black" stroke-width="2"/>
  <text x="${this.x + this.width / 2}" y="${this.y + this.height / 2 + 5}" font-size="20" text-anchor="middle" fill="black">${this.text}</text>
`;
    }
}

// 文字数に基づいて矩形サイズを計算する関数
function createSvgWithConnectedRects(nodes: Map<string, TreeNode>): string {
    const padding = 20;
    const fontSize = 20;
    const gapX = 50; // 矩形間の水平距離
    const gapY = 30; // 矩形間の垂直距離
    let svgRects = '';
    let svgLines = '';

    nodes.forEach((node, path) => {
        const parentNode = node.parent;
        const currentX = parentNode ? parentNode.x + parentNode.width + gapX : 0;
        const pathArr = path.split('-');
        const siblingIndex = Number(pathArr[pathArr.length - 1]);
        let currentY = 0;
        if (siblingIndex === 0) {
            currentY = parentNode ? parentNode.y : 0;
        } else {
            const siblingPath = pathArr.slice(0, -1).join('-') + '-' + (siblingIndex - 1);
            currentY = nodes.get(siblingPath)?.bottom + gapY ?? 0;
        }
        console.log(path + " " + node.text + " (" + currentX + ", " + currentY + "), siblingIndex=" + siblingIndex);
        node.setPositionAndSize(currentX, currentY, fontSize, padding);
        svgRects += node.generateSvg();

        if (parentNode) {
            svgLines += `
  <line x1="${parentNode.x + parentNode.width}" y1="${parentNode.y + parentNode.height / 2}" x2="${node.x}" y2="${node.y + node.height / 2}" stroke="black" stroke-width="2"/>
`;
        }
    });

    const totalWidth = Math.max(...Array.from(nodes.values()).map(node => node.x + node.width)) + 200;
    const totalHeight = Math.max(...Array.from(nodes.values()).map(node => node.y + node.height)) + 50;

    return `
<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
${svgRects}
${svgLines}
</svg>
`;
}

// コードをパースしてTreeNodeのMapを作成する関数
function parseCodeToTreeNodes(code: string): Map<string, TreeNode> {
    const nodes = new Map<string, TreeNode>();
    const lines = code.trim().split('\n');
    const pathStack: number[] = [];

    lines.forEach((line, index) => {
        const depth = line.search(/\S/); // 行頭の空白文字の数をカウント
        const text = line.trim();

        // パスを計算
        while (pathStack.length > depth) {
            pathStack.pop();
        }

        if (pathStack.length === depth) {
            if (pathStack.length === 0) {
                pathStack.push(0); // 最初の行は0
            } else {
                pathStack[depth - 1] += 1;
            }
        } else {
            pathStack.push(0);
        }

        const path = pathStack.join('-');
        const parentPath = pathStack.length > 1 ? pathStack.slice(0, -1).join('-') : null;

        // TreeNodeを作成してMapに追加
        nodes.set(path, new TreeNode(text, path, nodes.get(parentPath)));
        console.log(path + " " + text + " (" + parentPath + ")");
    });

    return nodes;
}

// GETメソッド用の関数
export async function GET(req: NextRequest) {
    const code = `
 top
  基本概念の理解
   Javaの歴史と特徴
   オブジェクト指向プログラミング
    クラスとオブジェクト
    継承とポリモーフィズム
    カプセル化と抽象化
   データ型と変数
    プリミティブ型
    参照型
  開発環境の設定
   JDKのインストール
   IDEの選択と設定
    Eclipse
    IntelliJ IDEA
    NetBeans
`;

    // コードをパースしてTreeNodeのMapを作成
    const nodes = parseCodeToTreeNodes(code);

    // TreeNodeに基づいてSVGを生成
    const svg = createSvgWithConnectedRects(nodes);

    try {
        return new Response(svg, {
            headers: { 'Content-Type': 'image/svg+xml' },
            status: 200
        });
    } catch (error) {
        console.error('Error generating SVG:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate SVG' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
