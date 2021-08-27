import React, { useEffect } from 'react';
import './App.css';

import { RoughCanvas } from 'roughjs/bin/canvas';
import { Options } from 'roughjs/bin/core';

const colors = {
  background: '#F1ECEF',
  light: '#F1ECEF',
  dark: '#D3CFD1',
  shadow: 'rgba(0, 0, 0, 0.2)'
};

interface Context {
  rc: RoughCanvas;
  width: number;
  height: number;
  shapes: {
    vectors: Vector[];
    fill?: string;
    stroke: boolean;
    sort: number;
  }[];
}

class Vector {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor (x: number, y: number, z: number, w: number = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  multiply (m: Matrix | number): Vector {
    if (typeof m === 'number') {
      return new Vector(
        this.x * m,
        this.y * m,
        this.z * m
      );
    }

    return new Vector(
      this.x * m.data[0] + this.y * m.data[4] + this.z * m.data[8 ] + this.w * m.data[12],
      this.x * m.data[1] + this.y * m.data[5] + this.z * m.data[9 ] + this.w * m.data[13],
      this.x * m.data[2] + this.y * m.data[6] + this.z * m.data[10] + this.w * m.data[14],
      this.x * m.data[3] + this.y * m.data[7] + this.z * m.data[11] + this.w * m.data[15]
    );
  }

  add (v: Vector): Vector {
    return new Vector(
      this.x + v.x,
      this.y + v.y,
      this.z + v.z
    );
  }

  substract (v: Vector): Vector {
    return new Vector(
      this.x - v.x,
      this.y - v.y,
      this.z - v.z
    );
  }

  negate (): Vector {
    return new Vector(
      -this.x,
      -this.y,
      -this.z
    );
  }
}

class Matrix {
  data: number[];

  constructor () {
    this.data = new Array(16);
    this.identity();
  }

  identity () {
    this.data.fill(0);
    this.data[0] = this.data[5] = this.data[10] = this.data[15] = 1;
  }

  multiply (m: Matrix): Matrix {
    const result = new Matrix();

    for(let y = 0; y < 4; y++){
      const col = y*4;
      for(let x = 0; x < 4; x++){
        for(let i = 0; i < 4; i++){
          result.data[x + col] += m.data[i + col] * this.data[x + i * 4];
        }
      }
    }

    return result;
  }
}

const map: {
  [key: string]: number;
} = {};
let mapI = Math.floor(Math.random() * 10);

function getId (s: string): number {
  if (s in map) return map[s];
  map[s] = mapI++;
  return map[s];
}

function distance (v1: Vector, v2: Vector): number {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const dz = v2.z - v1.z;
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2));
}

function seed (v: Vector): number {
  return v.x + v.y * 100 + v.z * 100000;
}

function project (context: Context, v: Vector, cameraPos: Vector, rx: Matrix, clipMatrix: Matrix) {
  v = v.add(cameraPos);

  v = v.multiply(rx);

  v = v.multiply(clipMatrix);
  // v = new Vector(
  //   v.x / v.w,
  //   v.y / v.w,
  //   v.z / v.w,
  //   v.w
  // );

  if (v.w < 0) {
    return [0, 0];
  }

  return [
    (v.x * context.width) / (2 * v.w) + (context.width * 0.5),
    -(v.y * context.height) / (2 * v.w) + (context.height * 0.5)
  ];
}

function shape (context: Context, vectors: Vector[], fill?: string, stroke: boolean = true): void {
  context.shapes.push({
    vectors,
    fill,
    stroke,
    sort: 0
  });
}

function cube (context: Context, v1: Vector, v2: Vector) {
  const a = new Vector(v1.x, v1.y, v1.z);
  const b = new Vector(v2.x, v1.y, v1.z);
  const c = new Vector(v2.x, v2.y, v1.z);
  const d = new Vector(v1.x, v2.y, v1.z);
  const e = new Vector(v1.x, v1.y, v2.z);
  const f = new Vector(v2.x, v1.y, v2.z);
  const g = new Vector(v2.x, v2.y, v2.z);
  const h = new Vector(v1.x, v2.y, v2.z);

  // Rectangles

  shape(context, [a, b, c, d], colors.light);
  //shape(context, [a, b, f, e], colors.light);
  shape(context, [b, c, g, f], colors.dark);
  shape(context, [d, c, g, h], colors.light);
  shape(context, [a, d, h, e], colors.light);
  //shape(context, [e, f, g, h], colors.light);

  shape(
    context, 
    [
      f, 
      b, 
      b.add(new Vector((v2.y - v1.y) * 0.7, 0, 0)), 
      f.add(new Vector((v2.y - v1.y) * 0.7, 0, 0))
    ], 
    colors.shadow,
    false
  );

  // Lines

  // shape(context, [a, b]);
  // shape(context, [b, c]);
  // shape(context, [c, d]);
  // shape(context, [d, a]);

  // shape(context, [a, e]);
  // shape(context, [b, f]);
  // shape(context, [c, g]);
  // shape(context, [d, h]);

  // shape(context, [e, f]);
  // shape(context, [f, g]);
  // shape(context, [g, h]);
  // shape(context, [h, e]);

  return [a, b, c, d, e, f, g, h];
}

function createClipMatrix (fov: number, aspectRatio: number, near: number, far: number): Matrix {
  const m = new Matrix();

  const f = 1 / Math.tan(fov * 0.5);

  m.data[0] = f / aspectRatio;
  m.data[5] = f;
  m.data[10] = far / (far - near);
  m.data[11] = 1;
  m.data[14] = -((far * near) / (far - near));
  m.data[15] = 0;

  return m;
}

function building (context: Context, v: Vector, width: number, length: number) {
  const height = Math.pow(Math.random() * 1.3, 5) + 2;

  const size = new Vector(
    width, 
    height, 
    length
  );

  const padding = 0.1;

  const [a, b, c, d, e, f, g, h] = cube(
    context, 
    v.add(new Vector(padding, 0, padding)), 
    v.add(size).substract(new Vector(padding * 2, 0, padding * 2))
  );

  if (Math.random() < 0.5) {
    shape(
      context, [
        d.substract(d.substract(g).multiply(0.05)), 
        c.substract(c.substract(h).multiply(0.05)), 
        g.substract(g.substract(d).multiply(0.05)), 
        h.substract(h.substract(c).multiply(0.05))
      ], 
      colors.light
    );
  }

  const numChimneys = Math.random() * 2;

  for (let i = 0; i < numChimneys; i++) {
    const size = new Vector(Math.random() * 0.3 + 0.1, Math.random() * 0.2 + 0.1, Math.random() * 0.3 + 0.1);
    const pos = new Vector(
      v.x + padding + Math.random() * (width - padding * 2 - size.x),
      v.y + height,
      v.z + padding + Math.random() * (length - padding * 2 - size.z)
    );

    cube(
      context, 
      pos, 
      pos.add(size)
    );
  }

  const r = Math.random();

  if (r < 0.5) {
    const windowWidth = Math.random() * 0.15 + 0.05;
    const windowHeight = Math.random() * 0.15 + 0.05;

    let windowSpacingX = Math.random() * 0.1 + 0.1;
    let windowSpacingY = Math.random() * 0.1 + 0.1;

    const numX = Math.round((width - (padding * 2)) / (windowWidth + windowSpacingX));
    const numY = Math.round((height - windowSpacingY) / (windowHeight + windowSpacingY));

    windowSpacingX = (width - (padding * 2 + numX * windowWidth)) / (numX); 
    windowSpacingY = (height - (numY * windowHeight)) / (numY + 1); 

    for (let x = padding + windowSpacingX; x <= width - (padding + windowWidth + windowSpacingY); x += windowWidth + windowSpacingX) {
      for (let y = windowSpacingY; y <= height - (windowHeight + windowSpacingY); y += windowHeight + windowSpacingY) {
        shape(
          context, 
          v.z > 20 ? [
            new Vector(v.x + x + windowWidth * 0.5, v.y + y, v.z - 0.000001),
            new Vector(v.x + x + windowWidth * 0.5, v.y + y + windowHeight, v.z - 0.000001)
          ] : [
            new Vector(v.x + x, v.y + y, v.z - 0.000001), 
            new Vector(v.x + x + windowWidth, v.y + y, v.z - 0.000001), 
            new Vector(v.x + x + windowWidth, v.y + y + windowHeight, v.z - 0.000001), 
            new Vector(v.x + x, v.y + y + windowHeight, v.z - 0.000001), 
            new Vector(v.x + x, v.y + y, v.z - 0.000001)
          ]
        );
      }
    }
  } else {
    const numX = Math.round(Math.random() * 5 + 5);
    const numY = Math.round(Math.random() * 5 + 5);

    const spacingX = (width - padding * 2) / numX;
    const spacingY = (height - padding * 2) / numY;

    for (let x = padding + spacingX; x < width - padding; x += spacingX) {
      shape(
        context, 
        [
          new Vector(v.x + x, v.y, v.z - 0.000001),
          new Vector(v.x + x, v.y + height, v.z - 0.000001)
        ]
      );
    }

    for (let y = padding + spacingY; y < height; y += spacingY) {
      shape(
        context, 
        [
          new Vector(v.x + padding, v.y + y, v.z - 0.000001),
          new Vector(v.x + width - padding * 2, v.y + y, v.z - 0.000001)
        ]
      );
    }
  }
}

function init (): Context {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const c = canvas.getContext('2d') as CanvasRenderingContext2D ;
  c.fillStyle = colors.background;
  c.fillRect(0, 0, canvas.width, canvas.height);

  const rc = new RoughCanvas(canvas);

  const context: Context = {
    rc: rc,
    width: canvas.width,
    height: canvas.height,
    shapes: []
  };

  const filled: {
    [location: string]: boolean;
  } = {};

  outer:
  for (let i = 0; i < 200;) {
    const x = Math.floor(Math.random() * 40 - 20);
    const z = Math.floor(Math.random() * 30);
    const w = Math.floor(Math.random() * 3 + 1);
    const l = Math.floor(Math.random() * 3 + 1);

    for (let xx = x; xx < x + w; xx++) {
      for (let zz = z; zz < z + l; zz++) {
        const location = `${xx},${zz}`;
        if (filled[location]) continue outer;
        filled[location] = true;
      }
    }

    building(
      context, 
      new Vector(
        x, 
        0, 
        z
      ), 
      w, 
      l
    );

    i++;
  }

  // for (let x = -40; x < 40; x++) {
  //   for (let z = 0; z < 50; z++) {
  //     shape(
  //       context, 
  //       [
  //         new Vector(x, 0, z), 
  //         new Vector(x, 0, z + 1)
  //       ]
  //     );
  //   }
  // }

  // for (let z = 0; z < 50; z++) {
  //   for (let x = -40; x < 40; x++) {
  //     shape(
  //       context, [
  //         new Vector(x, 0, z), 
  //         new Vector(x + 1, 0, z)
  //       ]
  //     );
  //   }
  // }

  return context;
}

function draw (context: Context) {
  const cameraPos = new Vector(0, -8, 2);
  const cameraRot = new Vector(Math.PI * 0.15, 0, 0);

  const near = 0.1;
  const far = 100;
  const aspect = context.width / context.height;
  const clipMatrix = createClipMatrix(60 * (Math.PI / 180), aspect, near, far);

  const startTime = new Date();

  for (const shape of context.shapes) {
    const averageZ = shape.vectors.reduce((ac, v) => 
      ac + v.z / shape.vectors.length, 
      0
    );

    const averageCameraDistance = shape.vectors.reduce((ac, v) => 
      ac + distance(v, cameraPos.negate()) / shape.vectors.length, 
      0
    );

    shape.sort = (averageZ * 1000 + averageCameraDistance + (shape.fill ? 0.001 : 0))
  }

  context.shapes.sort((a, b) => b.sort - a.sort);

  const rx = new Matrix();
  rx.data[5] = Math.cos(cameraRot.x);
  rx.data[6] = -Math.sin(cameraRot.x);
  rx.data[9] = Math.sin(cameraRot.x);
  rx.data[10] = Math.cos(cameraRot.x);

  for (const shape of context.shapes) {
    const projected = shape.vectors.map(v => project(context, v, cameraPos, rx, clipMatrix));

    if (projected.some(v => v[0] === 0 && v[1] === 0)) continue;

    const length = Math.sqrt(
      Math.pow(
        Math.max(...projected.map(v => v[0])) - 
        Math.min(...projected.map(v => v[0])), 
        2
      ) + 
      Math.pow(
        Math.max(...projected.map(v => v[1])) - 
        Math.min(...projected.map(v => v[1])), 
        2
      )
    );

    let s = 0;
    for (const v of shape.vectors) {
      s += seed(v);
    }

    const options: Options = {
      stroke: '#040106',
      strokeWidth: 2,
      roughness: 1,
      bowing: 0.1 / (Math.sqrt(length) * 0.006),
      disableMultiStroke: true,
      seed: s
    };

    if (shape.fill) {
      options.fill = shape.fill;
      options.fillStyle = 'solid';
      if (!shape.stroke) options.stroke = 'transparent';
      options.roughness = 0.5;
      context.rc.polygon(projected as [number, number][], options);
    } else {
      context.rc.linearPath(projected as [number, number][], options);
    }
  }

  console.log('Render took ' + (new Date().getTime() - startTime.getTime()) + ' ms');

  //setTimeout(() => draw(context), 0);
}

function App() {
  useEffect(() => {
    const context = init();
    draw(context);
  }, []);

  return (
    <canvas id="canvas"></canvas>
  );
}

export default App;
