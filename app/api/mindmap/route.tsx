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


function parseCodeToTreeNodes(code: string): Map<string, TreeNode> {
    const allNodes = new Map<string, TreeNode>();
    const lines = code.trim().split('\n');
    const pathStack: number[] = [];

    lines.forEach((line) => {
        const depth = line.search(/\S/); // Count the number of leading whitespace characters
        const text = escapeForSVG(line.trim());

        while (pathStack.length > depth) {
            pathStack.pop();
        }

        if (pathStack.length === depth) {
            if (pathStack.length === 0) {
                pathStack.push(0); // The first line is 0
            } else {
                pathStack[depth - 1] += 1;
            }
        } else {
            pathStack.push(0);
        }

        const path = pathStack.join('-');
        const parentPath = pathStack.length > 1 ? pathStack.slice(0, -1).join('-') : null;

        allNodes.set(path, new TreeNode(text, path, allNodes.get(parentPath)));
        // console.log(path + " " + text + " (" + parentPath + ")");
    });

    return allNodes;
}

// Function to calculate the length of a string (1 byte character = 1, others = 2)
function calculateStringLength(str: string): number {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
        // Determine if it is a 1-byte character (ASCII character)
        if (str.charCodeAt(i) <= 0x7F) {
            length += 1;
        } else {
            length += 2;
        }
    }
    return length;
}

function calculateRootNodeSize(rootNode: TreeNode, fontSize: number, padding: number, broadChar: boolean) {
    rootNode.fontSize = fontSize * 1.5;

    let size: number;
    if (broadChar) {
        const textLength = calculateStringLength(rootNode.text);
        size = textLength * rootNode.fontSize * 0.6 + padding * 2;
    } else {
        size = rootNode.text.length * rootNode.fontSize * 0.6 + padding * 2;
    }
    size = size > 70 ? size : 70;
    rootNode.height = rootNode.width = size;
}

// Function to calculate rectangle size based on character count
function calculateNodeSize(nodes: Map<string, TreeNode>, fontSize: number, padding: number, broadChar: boolean) {
    nodes.forEach((node) => {
        node.fontSize = fontSize;
        if (broadChar) {
            // When called from Agent.ai, calculate based on text length instead of character count 
            const textLength = calculateStringLength(node.text);
            node.width = textLength * node.fontSize + padding * 2;
            node.height = node.fontSize + padding * 2;
        } else {
            node.width = node.text.length * node.fontSize + padding * 2;
            node.height = node.fontSize + padding * 2;
        }
    });
}


// Function to classify depth 2 nodes into rightNodes and leftNodes
function classifyDepthTwoNodes(nodes: Map<string, TreeNode>): { rightNodes: Map<string, TreeNode>, leftNodes: Map<string, TreeNode> } {
    const rightNodes = new Map<string, TreeNode>();
    const tmpLeftNodes = new Map<string, TreeNode>();
    const leftNodes = new Map<string, TreeNode>();

    // Extract depth 2 nodes
    const depthTwoNodes = Array.from(nodes.values()).filter(node => node.path.split('-').length === 2);

    // Divide nodes in half
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

    nodes.forEach((node) => {
        if (node.path === '0') return; // Skip the root node

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

function calculateChildRegion(nodes: Map<string, TreeNode>, gapX: number, gapY: number) {
    // Sort nodes by path length to process from deeper levels
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => b.path.length - a.path.length);

    sortedNodes.forEach((node) => {
        // console.log(node.path + " " + node.text + " " + node.width + " " + node.height);
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

    nodes.forEach((node) => {
        // Remove extra gapY at the end
        if (node.leftChildHeight > 0) {
            node.leftChildHeight -= gapY;
        }
        if (node.rightChildHeight > 0) {
            node.rightChildHeight -= gapY;
        }
        // console.log(`Node path: ${path}, leftChildHeight: ${node.leftChildHeight}, rightChildHeight: ${node.rightChildHeight}`);
    });
}


function calculateRootNodePosition(rootNode: TreeNode, svgPadding: number) {
    rootNode.x = rootNode.leftChildWidth + svgPadding / 2;
    rootNode.y = Math.max(rootNode.leftChildHeight, rootNode.rightChildHeight) / 2 + svgPadding / 2;

    if (rootNode.leftChildWidth === 0 && rootNode.rightChildWidth === 0) {
        rootNode.x = svgPadding / 2;
        rootNode.y = rootNode.height / 2 + svgPadding / 2;
    }
}


function calculateNodePosition(nodes: Map<string, TreeNode>, gapX: number, gapY: number) {
    const jitterXPercentage = 0.07;
    const jitterYPercentage = 0.2;

    // Sort nodes by path value in lexicographical order, resulting in the same order as the input text
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => a.path.localeCompare(b.path));
    sortedNodes.forEach((node) => {
        const parentNode = node.parent;

        // Calculate x coordinate
        const currentX = node.direction === "left"
            ? parentNode.x - node.width - gapX
            : parentNode.x + parentNode.width + gapX;

        // Introduce jitter
        const jitterX = (Math.random() - 0.5) * jitterXPercentage * node.width;
        const jitterY = (Math.random() - 0.5) * jitterYPercentage * node.height;

        node.x = currentX + jitterX;

        // Calculate y coordinate
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
            currentY = nodes.get(siblingPath).bottom + gapY + myHeight / 2;
        }
        node.y = currentY + jitterY;
        node.bottom = node.y + myHeight / 2;
    });
}

function createSvgWithConnectedRects(node: TreeNode, base64image: string = '') {
    let svgRects = '';
    let svgLines = '';

    svgRects += node.generateSvg(base64image);

    if (node.parent) {
        const color = node.borderColor;
        const startX = node.direction === "left" ? node.parent.x : node.parent.x + node.parent.width;
        let startY = node.parent.y + node.parent.height / 2;
        if (node.parent.path === "0") {
            startY -= node.parent.height / 2;
        }
        const endX = node.direction === "left" ? node.x + node.width : node.x;
        const endY = node.y + node.height / 2;

        // Draw a spline curve
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
    let base64image: string;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        const json = await request.json();
        type = json.type;
        code = json.code;
        broadChar = json.broadChar === true;
        base64image = json.base64image;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        type = formData.get('type') as string;
        code = formData.get('code') as string;
        broadChar = formData.get('broadChar') === 'true';
        base64image = formData.get('base64image') as string;
    } else {
        return new NextResponse(JSON.stringify({ error: 'Unsupported content type' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400
        });
    }

    return generateMindmap(code, base64image, type, broadChar);
}

function generateMindmap(code: string, base64image: string, type: string, broadChar: boolean) {
    let allNodes = parseCodeToTreeNodes(code);
    const rootNode = allNodes.get('0');
    const { rightNodes, leftNodes } = classifyDepthTwoNodes(allNodes);
    // Discard allNodes here because the path has been rewritten
    allNodes = null;

    // Parameters for nodes
    const fontSize = 10;
    const padding = 10;
    const gapX = 25;
    const gapY = 15;

    calculateRootNodeSize(rootNode, fontSize, padding, broadChar);
    calculateNodeSize(leftNodes, fontSize, padding, broadChar);
    calculateNodeSize(rightNodes, fontSize, padding, broadChar);

    calculateChildRegion(leftNodes, gapX, gapY);
    calculateChildRegion(rightNodes, gapX, gapY);

    const svgPadding = 30;
    calculateRootNodePosition(rootNode, svgPadding);

    calculateNodePosition(leftNodes, gapX, gapY);
    calculateNodePosition(rightNodes, gapX, gapY);

    const svgRoot = createSvgWithConnectedRects(rootNode, base64image);
    let svgLeft = "";
    leftNodes.forEach((node) => {
        svgLeft += createSvgWithConnectedRects(node);
    });
    let svgRight = "";
    rightNodes.forEach((node) => {
        svgRight += createSvgWithConnectedRects(node);
    });
    let totalWidth = Math.max(...Array.from(rightNodes.values()).map(node => node.x + node.width)) + svgPadding;
    let totalHeight = Math.max(...Array.from(leftNodes.values()).map(node => node.y + node.height), ...Array.from(rightNodes.values()).map(node => node.y + node.height)) + svgPadding;
    totalWidth = totalWidth < rootNode.width + svgPadding ? rootNode.width + svgPadding : totalWidth;
    totalHeight = totalHeight < rootNode.height + svgPadding ? rootNode.height + svgPadding : totalHeight;
    const svg = `
<svg id="mindmap-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#FFFFE0"/>
  ${svgLeft}
  ${svgRight}
  ${svgRoot}
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

/*
export async function GET(request: NextRequest) {
    const type = request.nextUrl.searchParams.get('type');
    const broadChar = request.nextUrl.searchParams.get('broadChar') === 'true';

    const fs = require('fs');
    const path = require('path');
    const base64image = fs.readFileSync(path.join(process.cwd(), 'test/base64image.txt'), 'utf8');
    const code = fs.readFileSync(path.join(process.cwd(), 'test/code5.txt'), 'utf8');

    return generateMindmap(code, base64image, type, broadChar);
}
*/
