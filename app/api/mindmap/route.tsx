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

// ルートノードの位置を計算し設定する関数
function setRootNodePosition(nodes: Map<string, TreeNode>, leftNodes: Map<string, TreeNode>) {
    const rootNode = nodes.get('0');
    if (!rootNode) return;

    const maxLeftNodeWidth = Math.max(...Array.from(leftNodes.values()).map(node => node.width + node.childWidth));
    console.log("Max Left Node Width for Root Node:", maxLeftNodeWidth);

    rootNode.x = maxLeftNodeWidth;
    rootNode.y = rootNode.childHeight / 2;
}

// ノードの位置を計算する関数
function calculatePositionForNodes(nodes: Map<string, TreeNode>, gapX: number, gapY: number) {
    console.log("# calculatePositionForNodes");

    // pathの値で辞書順ソート。結果的に入力テキストと同じ順になる。
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => a.path.localeCompare(b.path));
    sortedNodes.forEach((node) => {
        console.log(node.path + " " + node.text + " " + node.childWidth + " " + node.childHeight);
        const parentNode = node.parent;
        // nodesにはルートノードが含まれないため、必ずparentNodeが存在する。
        const currentX = parentNode.x + parentNode.width + gapX;
        const pathArr = node.path.split('-');
        const siblingIndex = Number(pathArr[pathArr.length - 1]);
        let currentY = 0;

        if (siblingIndex === 0) {
            currentY = parentNode.y - parentNode.childHeight / 2;
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
        parentNode.setBottom(node.bottom);
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

// 深さ2のノードをrightNodesとleftNodesに分類する関数
function classifyDepthTwoNodes(nodes: Map<string, TreeNode>): { rightNodes: Map<string, TreeNode>, leftNodes: Map<string, TreeNode> } {
    const rightNodes = new Map<string, TreeNode>();
    const leftNodes = new Map<string, TreeNode>();

    // 深さ2のノードを抽出
    const depthTwoNodes = Array.from(nodes.values()).filter(node => node.path.split('-').length === 2);

    // ノードを半分に分ける
    const halfIndex = Math.ceil(depthTwoNodes.length / 2);
    const rightPaths = new Set<string>();
    const leftPaths = new Set<string>();

    depthTwoNodes.forEach((node, index) => {
        if (index < halfIndex) {
            rightNodes.set(node.path, node);
            rightPaths.add(node.path);
        } else {
            leftNodes.set(node.path, node);
            leftPaths.add(node.path);
        }
    });

    // 子ノードを含める
    nodes.forEach((node) => {
        rightPaths.forEach((path) => {
            if (node.path.startsWith(path)) {
                rightNodes.set(node.path, node);
            }
        });
        leftPaths.forEach((path) => {
            if (node.path.startsWith(path)) {
                leftNodes.set(node.path, node);
            }
        });
    });

    return { rightNodes, leftNodes };
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

    // 深さ2のノードを分類
    const { rightNodes, leftNodes } = classifyDepthTwoNodes(nodes);
    console.log("Right Nodes:", Array.from(rightNodes.keys()));
    console.log("Left Nodes:", Array.from(leftNodes.keys()));

    // ルートノードの位置を設定
    setRootNodePosition(nodes, leftNodes);

    // 各ノードの位置を計算
    const gapX = 25;
    const gapY = 15;
    calculatePositionForNodes(leftNodes, gapX, gapY, nodes.get('0')?.x || 0);
    calculatePositionForNodes(rightNodes, gapX, gapY, nodes.get('0')?.x || 0);

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
