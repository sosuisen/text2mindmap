import { NextRequest, NextResponse } from 'next/server';
import { TreeNode } from '../../../lib/TreeNode';

// 文字数に基づいて矩形サイズを計算する関数
function calculateSizeForNodes(nodes: Map<string, TreeNode>, fontSize: number, padding: number) {
    nodes.forEach((node) => {
        const textLength = node.text.length;
        node.width = textLength * fontSize + padding * 2;
        node.height = fontSize + padding * 2;
    });
}

// ノードの位置を計算する関数
function calculatePositionForNodes(nodes: Map<string, TreeNode>, gapX: number, gapY: number) {
    console.log("# calculatePositionForNodes");
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => a.path.localeCompare(b.path));
    sortedNodes.forEach((node) => {
        console.log(node.path + " " + node.text + " " + node.childWidth + " " + node.childHeight);
        const parentNode = node.parent;
        const currentX = parentNode ? parentNode.x + parentNode.width + gapX : 0;
        const pathArr = node.path.split('-');
        const siblingIndex = Number(pathArr[pathArr.length - 1]);
        let currentY = 0;

        if (siblingIndex === 0) {
            currentY = parentNode ? parentNode.y - parentNode.childHeight / 2 : 0;
        } else {
            const siblingPath = pathArr.slice(0, -1).join('-') + '-' + (siblingIndex - 1);
            if (nodes.get(siblingPath)) {
                currentY = nodes.get(siblingPath).bottom + gapY;
            } else {
                currentY = 0;
            }
        }

        node.x = currentX;

        const height = node.height > node.childHeight ? node.height : node.childHeight;
        node.y = currentY + height / 2;
        node.bottom = node.y + height / 2;

        // 親ノードのbottomを更新
        if (parentNode) {
            parentNode.setBottom(node.bottom);
        }
    });
}

// SVGを生成する関数
function createSvgWithConnectedRects(nodes: Map<string, TreeNode>, fontSize: number, padding: number) {
    let svgRects = '';
    let svgLines = '';

    nodes.forEach((node) => {
        // 位置とサイズを設定
        node.setPositionAndSize(node.x, node.y, fontSize, padding);

        // SVGを生成
        svgRects += node.generateSvg();

        if (node.parent) {
            svgLines += `
  <line x1="${node.parent.x + node.parent.width}" y1="${node.parent.y + node.parent.height / 2}" x2="${node.x}" y2="${node.y + node.height / 2}" stroke="black" stroke-width="2"/>
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

// 子ノードの合計幅と高さを計算し、コンソールに表示する関数
function calculateAndLogChildDimensions(nodes: Map<string, TreeNode>) {
    // ノードをpathの長さでソートして、深い階層から処理する
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => b.path.length - a.path.length);

    sortedNodes.forEach((node) => {
        console.log(node.path + " " + node.text + " " + node.width + " " + node.height);
        if (node.parent) {
            const widht = node.width > node.childWidth ? node.width : node.childWidth;
            const height = node.height > node.childHeight ? node.height : node.childHeight;
            node.parent.childWidth += widht;
            node.parent.childHeight += height;
        }
    });

    // コンソールにchildHeightを一覧表示
    nodes.forEach((node, path) => {
        console.log(`Node path: ${path}, childHeight: ${node.childHeight}`);
    });
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

    // 各ノードの幅と高さを計算
    const fontSize = 10;
    const padding = 10;
    calculateSizeForNodes(nodes, fontSize, padding);

    // 子ノードの合計幅と高さを計算し、コンソールに表示
    calculateAndLogChildDimensions(nodes);

    // 各ノードの位置を計算
    const gapX = 25;
    const gapY = 15;
    calculatePositionForNodes(nodes, gapX, gapY);

    // TreeNodeに基づいてSVGを生成
    const svg = createSvgWithConnectedRects(nodes, fontSize, padding);

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
