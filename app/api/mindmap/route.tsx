import { NextRequest, NextResponse } from 'next/server';
import { TreeNode } from '../../../lib/TreeNode';


// コードをパースしてTreeNodeのMapを作成する関数
function parseCodeToTreeNodes(code: string): Map<string, TreeNode> {
    const allNodes = new Map<string, TreeNode>();
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
        allNodes.set(path, new TreeNode(text, path, allNodes.get(parentPath)));
        console.log(path + " " + text + " (" + parentPath + ")");
    });

    return allNodes;
}

// 文字数に基づいて矩形サイズを計算する関数
function calculateSizeForNodes(nodes: Map<string, TreeNode>, fontSize: number, padding: number) {
    nodes.forEach((node) => {
        const textLength = node.text.length;
        node.width = textLength * fontSize + padding * 2;
        node.height = fontSize + padding * 2;
    });
}


// 深さ2のノードをrightNodesとleftNodesに分類する関数
function classifyDepthTwoNodes(nodes: Map<string, TreeNode>): { rightNodes: Map<string, TreeNode>, leftNodes: Map<string, TreeNode> } {
    const rightNodes = new Map<string, TreeNode>();
    const tmpLeftNodes = new Map<string, TreeNode>();
    const leftNodes = new Map<string, TreeNode>();

    // 深さ2のノードを抽出
    const depthTwoNodes = Array.from(nodes.values()).filter(node => node.path.split('-').length === 2);

    // ノードを半分に分ける
    const halfIndex = Math.ceil(depthTwoNodes.length / 2);
    const rightPaths = new Set<string>();
    const leftPaths = new Set<string>();

    let rightIndex = 0;
    depthTwoNodes.forEach((node, index) => {
        if (index < halfIndex) {
            rightPaths.add(node.path);
            rightNodes.set(node.path, node);
            node.direction = "right";
            rightIndex++;
        } else {
            leftPaths.add(node.path);
            tmpLeftNodes.set(node.path, node);
            node.direction = "left";
        }
    });

    // 子ノードを含める（ルートノードは除外）
    nodes.forEach((node) => {
        if (node.path === '0') return; // ルートノードをスキップ

        rightPaths.forEach((path) => {
            if (node.path.startsWith(path)) {
                rightNodes.set(node.path, node);
                node.direction = "right";
            }
        });
        leftPaths.forEach((path) => {
            if (node.path.startsWith(path)) {
                tmpLeftNodes.set(node.path, node);
                node.direction = "left";
            }
        });
    });

    tmpLeftNodes.forEach((node) => {
        const pathParts = node.path.split('-');
        const newPath = node.path.replace(/^(\d+)-(\d+)/, (match, p1, p2) => `${p1}-${Number(p2) - rightIndex}`);
        node.path = newPath;
        leftNodes.set(newPath, node);
    });

    return { rightNodes, leftNodes };
}

// 子ノードの合計幅と高さを計算する関数
function calculateChildDimensions(nodes: Map<string, TreeNode>, gapX: number, gapY: number) {
    // ノードをpathの長さでソートして、深い階層から処理する
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => b.path.length - a.path.length);

    sortedNodes.forEach((node) => {
        console.log(node.path + " " + node.text + " " + node.width + " " + node.height);
        if (node.parent) {
            if (node.direction === "left") {
                const width = node.width > node.leftChildWidth ? node.width : node.leftChildWidth;
                const height = node.height > node.leftChildHeight ? node.height : node.leftChildHeight;
                node.parent.leftChildWidth += width + gapX;
                node.parent.leftChildHeight += height + gapY;
            } else {
                const width = node.width > node.rightChildWidth ? node.width : node.rightChildWidth;
                const height = node.height > node.rightChildHeight ? node.height : node.rightChildHeight;
                node.parent.rightChildWidth += width + gapX;
                node.parent.rightChildHeight += height + gapY;
            }
        }
    });

    nodes.forEach((node, path) => {
        // 最後の余計なgapYを削除
        if (node.leftChildHeight > 0) {
            node.leftChildHeight -= gapY;
        }
        if (node.rightChildHeight > 0) {
            node.rightChildHeight -= gapY;
        }
        console.log(`Node path: ${path}, leftChildHeight: ${node.leftChildHeight}, rightChildHeight: ${node.rightChildHeight}`);
    });
}


// ルートノードの位置を計算し設定する関数
function setRootNodePosition(rootNode: TreeNode) {
    rootNode.x = rootNode.leftChildWidth;
    rootNode.y = Math.max(rootNode.leftChildHeight, rootNode.rightChildHeight) / 2;
    console.log("rootNode.x: " + rootNode.x);
    console.log("rootNode.y: " + rootNode.y);
}

// ノードの位置を計算する関数
function calculatePositionForNodes(nodes: Map<string, TreeNode>, gapX: number, gapY: number) {
    console.log("\n###### calculatePositionForNodes ######");

    // pathの値で辞書順ソート。結果的に入力テキストと同じ順になる。
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => a.path.localeCompare(b.path));
    sortedNodes.forEach((node) => {
        if (node.direction === "left") {
            console.log(node.path + " " + node.text + ", child:" + node.leftChildWidth + "x" + node.leftChildHeight);
        } else {
            console.log(node.path + " " + node.text + ", child:" + node.rightChildWidth + "x" + node.rightChildHeight);
        }
        const parentNode = node.parent;

        // x座標の計算
        // ノードの枝が左側に伸びるか右側に伸びるかをdirectionで判定
        const currentX = node.direction === "left"
            ? parentNode.x - node.width - gapX
            : parentNode.x + parentNode.width + gapX;

        node.x = currentX;

        // y座標の計算        
        let currentY = 0;
        const pathArr = node.path.split('-');
        const siblingIndex = Number(pathArr[pathArr.length - 1]);
        const parentHeight = node.direction === "left" ? parentNode.leftChildHeight : parentNode.rightChildHeight;
        const myChildHeight = node.direction === "left" ? node.leftChildHeight : node.rightChildHeight;
        const myHeight = node.height > myChildHeight ? node.height : myChildHeight;

        if (siblingIndex === 0) {
            currentY = parentNode.y - parentHeight / 2 + myHeight / 2;
        } else {
            const siblingPath = pathArr.slice(0, -1).join('-') + '-' + (siblingIndex - 1);
            console.log("siblingPath: " + siblingPath);
            currentY = nodes.get(siblingPath).bottom + gapY + myHeight / 2;
        }
        node.y = currentY;
        node.bottom = node.y + myHeight / 2;
    });
}

// SVGを生成する関数
function createSvgWithConnectedRects(node: TreeNode, fontSize: number, padding: number) {
    let svgRects = '';
    let svgLines = '';

    // 位置とサイズを設定
    node.setPositionAndSize(node.x, node.y, fontSize, padding);

    // SVGを生成
    svgRects += node.generateSvg();

    if (node.parent) {
        if (node.direction === "left") {
            // 左方向の場合
            svgLines += `
  <line x1="${node.parent.x}" y1="${node.parent.y + node.parent.height / 2}" x2="${node.x + node.width}" y2="${node.y + node.height / 2}" stroke="black" stroke-width="2"/>
`;
        } else {
            // 右方向の場合
            svgLines += `
  <line x1="${node.parent.x + node.parent.width}" y1="${node.parent.y + node.parent.height / 2}" x2="${node.x}" y2="${node.y + node.height / 2}" stroke="black" stroke-width="2"/>
`;
        }
    }

    return `${svgRects}${svgLines}`;
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
    let allNodes = parseCodeToTreeNodes(code);
    const rootNode = allNodes.get('0');

    // 各ノードの幅と高さを計算
    const fontSize = 10;
    const padding = 10;
    calculateSizeForNodes(allNodes, fontSize, padding);

    // 深さ2のノードを分類
    const { rightNodes, leftNodes } = classifyDepthTwoNodes(allNodes);
    console.log("Right Nodes:", Array.from(rightNodes.keys()));
    console.log("Left Nodes:", Array.from(leftNodes.keys()));

    // パスが書き換わってるため、allNodesはここで破棄
    allNodes = null;

    const gapX = 25;
    const gapY = 15;

    // 子ノードの合計幅と高さを計算
    calculateChildDimensions(leftNodes, gapX, gapY);
    calculateChildDimensions(rightNodes, gapX, gapY);

    // ルートノードの位置を設定
    setRootNodePosition(rootNode);

    // 各ノードの位置を計算
    calculatePositionForNodes(leftNodes, gapX, gapY);
    calculatePositionForNodes(rightNodes, gapX, gapY);

    // TreeNodeに基づいてSVGを生成
    const svgRoot = createSvgWithConnectedRects(rootNode, fontSize, padding);
    let svgLeft = "";
    leftNodes.forEach((node) => {
        svgLeft += createSvgWithConnectedRects(node, fontSize, padding);
    });
    let svgRight = "";
    rightNodes.forEach((node) => {
        svgRight += createSvgWithConnectedRects(node, fontSize, padding);
    });
    const svgPadding = 30;
    const totalWidth = Math.max(...Array.from(rightNodes.values()).map(node => node.x + node.width)) + svgPadding;
    const totalHeight = Math.max(...Array.from(leftNodes.values()).map(node => node.y + node.height), ...Array.from(rightNodes.values()).map(node => node.y + node.height)) + svgPadding;
    const svg = `
<svg id="mindmap-svg" width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
${svgRoot}
${svgLeft}
${svgRight}
</svg>
`;

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
