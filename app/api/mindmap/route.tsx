import { NextRequest, NextResponse } from 'next/server';
import { TreeNode } from '../../../lib/TreeNode';

// 文字数に基づいて矩形サイズを計算する関数
function createSvgWithConnectedRects(nodes: Map<string, TreeNode>): string {
    const padding = 10;
    const fontSize = 10;
    const gapX = 25;
    const gapY = 15;
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
            if (nodes.get(siblingPath)) {
                currentY = nodes.get(siblingPath).bottom + gapY;
            } else {
                currentY = 0;
            }
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

    const totalWidth = Math.max(...Array.from(nodes.values()).map(node => node.x + node.width)) + 100;
    const totalHeight = Math.max(...Array.from(nodes.values()).map(node => node.y + node.height)) + 25;

    return `
<svg id="mindmap-svg" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
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

    lines.forEach((line) => {
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
export async function GET(request: NextRequest) {
    const type = request.nextUrl.searchParams.get('type');

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
        if (type === 'image') {
            return new NextResponse(svg, {
                headers: { 'Content-Type': 'image/svg+xml' },
                status: 200
            });
        } else {
            const json = {
                svg,
            };
            return new NextResponse(JSON.stringify(json), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        }
    } catch (error) {
        console.error('Error generating SVG:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to generate SVG' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
