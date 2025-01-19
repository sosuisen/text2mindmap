import { NextRequest } from 'next/server';

// TreeNodeクラスの定義
class TreeNode {
    text: string;
    path: string;
    parent: string | null;

    constructor(text: string, path: string, parent: string | null) {
        this.text = text;
        this.path = path;
        this.parent = parent;
    }

    // SVGを生成するメソッド
    generateSvg(x: number, y: number, fontSize: number, padding: number): string {
        const textLength = this.text.length;
        const width = textLength * fontSize + padding * 2;
        const height = fontSize + padding * 2;
        return `
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="lightblue" stroke="black" stroke-width="2"/>
  <text x="${x + width / 2}" y="${y + height / 2 + fontSize / 4}" font-size="${fontSize}" text-anchor="middle" fill="black">${this.text}</text>
`;
    }
}

// 文字数に基づいて矩形サイズを計算する関数
function createSvgWithConnectedRects(nodes: Map<string, TreeNode>): string {
    const padding = 20;
    const fontSize = 20;
    const gap = 50; // 矩形間の距離
    let currentX = 0;
    const height = fontSize + padding * 2;
    let svgRects = '';
    let svgLines = '';

    Array.from(nodes.values()).forEach((node, index) => {
        svgRects += node.generateSvg(currentX, 0, fontSize, padding);
        const textLength = node.text.length;
        const width = textLength * fontSize + padding * 2;
        if (index > 0) {
            svgLines += `
  <line x1="${currentX - gap}" y1="${height / 2}" x2="${currentX}" y2="${height / 2}" stroke="black" stroke-width="2"/>
`;
        }
        currentX += width + gap;
    });

    const totalWidth = currentX - gap;

    return `
<svg width="${totalWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">
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
    let lastPath: string | null = null;

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

        console.log(path + " " + text + " (" + parentPath + ")");
        // TreeNodeを作成してMapに追加
        nodes.set(path, new TreeNode(text, path, parentPath));
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
