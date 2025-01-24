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

function lightenColor(hex: string, rate: number): string {
    const color = hex.replace('#', '');

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    const newR = Math.min(255, Math.round(r + (255 - r) * (rate / 100)));
    const newG = Math.min(255, Math.round(g + (255 - g) * (rate / 100)));
    const newB = Math.min(255, Math.round(b + (255 - b) * (rate / 100)));

    const rHex = newR.toString(16).padStart(2, '0');
    const gHex = newG.toString(16).padStart(2, '0');
    const bHex = newB.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

export class TreeNode {
    text: string;
    path: string;
    parent: TreeNode | null;
    x: number;
    y: number;
    width: number;
    height: number;
    bottom: number;
    fontSize: number;
    leftChildWidth: number;
    rightChildWidth: number;
    leftChildHeight: number;
    rightChildHeight: number;
    direction: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    borderWidth: number;

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
        this.direction = "";
        const pathParts = path.split('-');
        if (pathParts.length >= 2) {
            if (pathParts.length >= 4) {
                this.borderColor = lightenColor(colors[parseInt(pathParts[1]) % colors.length], (pathParts.length - 1) * 10);
                this.bgColor = lightenColor(colors[parseInt(pathParts[1]) % colors.length], (pathParts.length - 1) * 20);
                this.borderWidth = 0;
                this.textColor = this.borderColor;
            } else {
                this.borderColor = lightenColor(colors[parseInt(pathParts[1]) % colors.length], (pathParts.length - 1) * 10);
                this.bgColor = lightenColor(colors[parseInt(pathParts[1]) % colors.length], (pathParts.length - 1) * 20);
                this.borderWidth = 2;
                this.textColor = "#ffffff";
            }


        } else {
            this.bgColor = "#fff0e0";
            this.textColor = "#000000";
            this.borderColor = "#000000";
            this.borderWidth = 0;
        }

    }

    setBottom(childBottom: number) {
        if (childBottom > this.bottom) {
            this.bottom = childBottom;
            if (this.parent) {
                this.parent.setBottom(this.bottom);
            }
        }
    }

    generateSvg(base64image: string = ''): string {
        if (this.path === "0") {
            const radius = this.width / 2;
            const padding = 3;
            let imageSvg = '';
            if (base64image) {
                const imageSize = radius * 2;
                imageSvg = `<image x="${this.x}" y="${this.y - radius}" width="${imageSize}" height="${imageSize}" href="data:image/png;base64,${base64image}" style="clip-path: circle(${radius}px at ${radius}px ${radius}px);" opacity="1"/>`;
            }
            return `
<circle cx="${this.x + radius}" cy="${this.y}" r="${radius}" fill="${this.bgColor}" stroke="${this.borderColor}" stroke-width="${this.borderWidth}"/>
${imageSvg}
<rect x="${this.x}" y="${this.y - this.fontSize / 2 - padding}" width="${this.width}" height="${this.fontSize + padding * 2}" fill="white" opacity="0.7"/>
<text x="${this.x + radius}" y="${this.y}" font-size="${this.fontSize}px" text-anchor="middle" alignment-baseline="central" fill="${this.textColor}">${this.text}</text>
`;
        } else if (this.path.split('-').length >= 4) {
            const anchor = this.direction === "left" ? "end" : "start";
            const xOffset = this.direction === "left" ? this.x + this.width - 10 : this.x + 10;
            return `
<text x="${xOffset}" y="${this.y + this.height / 2}" font-size="${this.fontSize}px" text-anchor="${anchor}" alignment-baseline="central" fill="${this.textColor}" text-decoration="underline">${this.text}</text>
`;
        } else {
            return `
<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" rx="10" ry="10" fill="${this.bgColor}" stroke="${this.borderColor}" stroke-width="${this.borderWidth}"/>
<text x="${this.x + this.width / 2}" y="${this.y + this.height / 2}" font-size="${this.fontSize}px" text-anchor="middle" alignment-baseline="central" fill="${this.textColor}">${this.text}</text>
`;
        }
    }
}
