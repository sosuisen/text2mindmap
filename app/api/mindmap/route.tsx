import { NextRequest, NextResponse } from 'next/server';
import { TreeNode } from '../../../lib/TreeNode';


function escapeForSVG(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}


// コードをパースしてTreeNodeのMapを作成する関数
function parseCodeToTreeNodes(code: string): Map<string, TreeNode> {
    const allNodes = new Map<string, TreeNode>();
    const lines = code.trim().split('\n');
    const pathStack: number[] = [];

    lines.forEach((line) => {
        const depth = line.search(/\S/); // 行頭の空白文字の数をカウント
        const text = escapeForSVG(line.trim());

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

// 文字列の長さを計算する関数 (1byte文字=1, その他=2)
function calculateStringLength(str: string): number {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
        // 1byte文字(ASCII文字)かどうかを判定
        if (str.charCodeAt(i) <= 0x7F) {
            length += 1;
        } else {
            length += 2;
        }
    }
    return length;
}


// 文字数に基づいて矩形サイズを計算する関数
function calculateSizeForNodes(nodes: Map<string, TreeNode>, fontSize: number, padding: number, broadChar: boolean) {
    nodes.forEach((node) => {
        node.fontSize = fontSize;
        if (broadChar) {
            // Agent.aiから呼ばれるときは、文字数ではなく、テキストの長さで計算する 
            const textLength = calculateStringLength(node.text);
            node.width = textLength * fontSize + padding * 2;
            node.height = fontSize + padding * 2;
        } else {
            node.width = node.text.length * fontSize + padding * 2;
            node.height = fontSize + padding * 2;
        }
        if (node.path === "0") {
            node.height = node.width;
        }
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
                const height = node.height > node.leftChildHeight ? node.height : node.leftChildHeight;
                node.parent.leftChildWidth = Math.max(node.parent.leftChildWidth, node.width + node.leftChildWidth + gapX);
                node.parent.leftChildHeight += height + gapY;
            } else {
                const height = node.height > node.rightChildHeight ? node.height : node.rightChildHeight;
                node.parent.rightChildWidth = Math.max(node.parent.rightChildWidth, node.width + node.rightChildWidth + gapX);
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
function setRootNodePosition(rootNode: TreeNode, svgPadding: number) {
    rootNode.x = rootNode.leftChildWidth + svgPadding / 2;
    rootNode.y = Math.max(rootNode.leftChildHeight, rootNode.rightChildHeight) / 2 + svgPadding / 2;
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
function createSvgWithConnectedRects(node: TreeNode) {
    let svgRects = '';
    let svgLines = '';

    // SVGを生成
    svgRects += node.generateSvg();

    if (node.parent) {
        const color = node.borderColor;
        const startX = node.direction === "left" ? node.parent.x : node.parent.x + node.parent.width;
        const startY = node.parent.y + node.parent.height / 2;
        const endX = node.direction === "left" ? node.x + node.width : node.x;
        const endY = node.y + node.height / 2;

        // スプライン曲線を描画
        const controlPointX1 = startX + (endX - startX) / 3;
        const controlPointX2 = startX + 2 * (endX - startX) / 3;

        svgLines += `
  <path d="M ${startX} ${startY} C ${controlPointX1} ${startY}, ${controlPointX2} ${endY}, ${endX} ${endY}" stroke="${color}" stroke-width="2" fill="none"/>
`;
    }

    return `${svgRects}${svgLines}`;
}

export async function POST(request: NextRequest) {
    let type: string;
    let code: string;
    let broadChar: boolean;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        // JSON形式のリクエストボディを処理
        const json = await request.json();
        type = json.type;
        code = json.code;
        broadChar = json.broadChar === true;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // form形式のリクエストボディを処理
        const formData = await request.formData();
        type = formData.get('type') as string;
        code = formData.get('code') as string;
        broadChar = formData.get('broadChar') === 'true';
    } else {
        return new NextResponse(JSON.stringify({ error: 'Unsupported content type' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400
        });
    }

    return generateMindmap(code, type, broadChar);
}


// GETメソッド用の関数
export async function GET(request: NextRequest) {
    const type = request.nextUrl.searchParams.get('type');
    const broadChar = request.nextUrl.searchParams.get('broadChar') === 'true';
    const code1 = `
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
`;
    console.log(code1);

    const code2 = `
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
    console.log(code2);

    const code3 = `
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
  デバッグ
   デバッグの基本
   デバッグツールの利用
   デバッグの実践
`;
    console.log(code3);

    const code4 = `
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
  デバッグ
   デバッグの基本
   デバッグツールの利用
   デバッグの実践
  テスト
   テストの基本
   テストツールの利用について考える
`;
    console.log(code4);

    return generateMindmap(code4, type, broadChar);
}

function generateMindmap(code: string, type: string, broadChar: boolean) {
    // コードをパースしてTreeNodeのMapを作成
    let allNodes = parseCodeToTreeNodes(code);
    const rootNode = allNodes.get('0');

    // 各ノードの幅と高さを計算
    const fontSize = 10;
    const padding = 10;
    calculateSizeForNodes(allNodes, fontSize, padding, broadChar);

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
    const svgPadding = 30;
    setRootNodePosition(rootNode, svgPadding);

    // 各ノードの位置を計算
    calculatePositionForNodes(leftNodes, gapX, gapY);
    calculatePositionForNodes(rightNodes, gapX, gapY);

    // TreeNodeに基づいてSVGを生成
    const svgRoot = createSvgWithConnectedRects(rootNode);
    let svgLeft = "";
    leftNodes.forEach((node) => {
        svgLeft += createSvgWithConnectedRects(node);
    });
    let svgRight = "";
    rightNodes.forEach((node) => {
        svgRight += createSvgWithConnectedRects(node);
    });
    const totalWidth = Math.max(...Array.from(rightNodes.values()).map(node => node.x + node.width)) + svgPadding;
    const totalHeight = Math.max(...Array.from(leftNodes.values()).map(node => node.y + node.height), ...Array.from(rightNodes.values()).map(node => node.y + node.height)) + svgPadding;
    const svg = `
<svg id="mindmap-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
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
