export interface Point {
  x: number,
  y: number,
}

export type Polygon = Point[];

export interface TextBox {
  startX: number,
  endX: number,
  y: number,
  y2: number,
}

export class Textpoly {
  private polygons: Polygon[];
  private memoizedBoxes: TextBox[] | null = null;
  options = {
    lineHeight: 15,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    method: 1
  };

  private isPoint(point): point is Point {
    return typeof point==='object' && typeof point.x==='number' && typeof point.y==='number';
  }

  private isPolygon(polygon): polygon is Polygon {
    if (!Array.isArray(polygon)) {
      return false;
    }
    if (polygon.some(point => !this.isPoint(point))) {
      return false;
    }
    return true;
  }

  private processString(polygon: string): Polygon {
    const points = polygon.split(' ').filter(point => point);
    const re = /^(\d+),(\d+)$/;
    if (points.some(point => !re.test(point))) throw new Error(`error processing '${polygon}'`);  // TODO: add '${point}' is not a point back somehow
    return points.map(point => { const [x,y] = point.split(','); return { x: Number(x), y: Number(y) } });
  }

  constructor(...polygons: (Polygon | string)[]) {
    this.polygons = [];
    polygons.map(polygon => typeof polygon==='string' ? this.processString(polygon) : polygon)
      .filter(polygon => this.isPolygon(polygon))
      .forEach(polygon => this.polygons.push(polygon));
  }

  emptyPolygons() {
    this.polygons = [];
    this.memoizedBoxes = null;
  }

  addPolygon(polygon: Polygon | string) {
    if (typeof polygon==='string') polygon = this.processString(polygon);
    if (!this.isPolygon(polygon)) throw new Error(`can not add polygon '${polygon}', because its format is not valid`);
    this.polygons.push(polygon);
    this.memoizedBoxes = null;
  }

  createTextBoxes(): TextBox[] {
    if (this.memoizedBoxes) { return this.memoizedBoxes; }
    const textBoxes: TextBox[] = [];
    const lineHeight = this.options.lineHeight;
    this.polygons.forEach(polygon => {
      const copyPoly = polygon.map((point, idx) => ({ ...point, idx }));
      const minX = Math.min(...polygon.map(point => point.x));
      const maxX = Math.max(...polygon.map(point => point.x));
      const minY = Math.min(...polygon.map(point => point.y));
      const maxY = Math.max(...polygon.map(point => point.y));
      const lines = copyPoly.map((A, idx) => ({ A, B: copyPoly[idx==copyPoly.length-1 ? 0 : idx+1]}))
        .map(line => line.A.x > line.B.x ? { A: line.B, B: line.A } : line);
      lines.sort((l1, l2) => l1.A.x == l2.A.x ? l1.B.x - l2.B.x : l1.A.x - l2.A.x);
      const from = minY+this.options.marginTop;
      const till = maxY-this.options.marginBottom;
      interface Segment { left: number; right: number }
      interface Build {
        topLeft: boolean; topRight: boolean; bottomLeft: boolean; bottomRight: boolean;
        left: number; right: number; bottomX?: number;
      }
      interface Row { top: number; bottom: number; segments: Segment[]; build: Build }
      if (this.options.method === 1) {
        const defaultBuild: Build = {
          topLeft: false, topRight: false, bottomLeft: false, bottomRight: false,
          left: minX, right: maxX
        }
        const rows: Row[] = new Array(Math.floor((till-from) / lineHeight))
          .fill({})
          .map((_, idx) => ({ top: from+idx*lineHeight, bottom: from+(idx+1)*lineHeight, segments: [], build: { ...defaultBuild } }));
        lines.forEach(({ A, B }) => {
          const [ upper, lower ] = A.y < B.y ? [ A, B] : [ B, A ];
          const LUy = lower.y - upper.y;
          rows.filter(row => row.bottom > upper.y && row.top < lower.y)
            .forEach((row, idx, rowsFiltered) => {
              const build = row.build;
              if (idx === 0 && rowsFiltered.length === 0) { // only row
                if (build.topLeft && build.bottomLeft) {
                  build.right = Math.min(build.right, A.x, B.x);
                } else {
                  build.left = Math.max(build.left, A.x, B.x);
                }
              } else if (upper.y > row.top) { // first row
                const t = (row.bottom - upper.y) / LUy;
                const bottomX = (1-t)*upper.x + t*(lower.x);
                if (build.topLeft && build.bottomLeft) {
                  build.right = Math.min(build.right, upper.x, bottomX);
                  build.bottomRight = true;
                } else {
                  build.left = Math.max(build.left, upper.x, bottomX);
                  build.bottomLeft = true;
                }
                build.bottomX = bottomX;
              } else if (lower.y >= row.bottom) { // middle rows
                let topX;
                if (idx > 0) {
                  topX = rowsFiltered[idx-1].build.bottomX;
                } else {
                  const t = (row.top - upper.y) / LUy;
                  topX = (1-t)*upper.x + t*(lower.x);
                }
                const t = (row.bottom - upper.y) / LUy;
                const bottomX = (1-t)*upper.x + t*(lower.x);
                if (build.topLeft && build.bottomLeft) {
                  build.right = Math.min(build.right, topX, bottomX);
                  build.topRight = true;
                  build.bottomRight = true;
                } else {
                  build.left = Math.max(build.left, topX, bottomX);
                  build.topLeft = true;
                  build.bottomLeft = true;
                }
                build.bottomX = bottomX;
              } else { // last row
                let topX;
                if (idx > 0) {
                  topX = rowsFiltered[idx-1].build.bottomX;
                } else {
                  const t = (row.top - upper.y) / LUy;
                  topX = (1-t)*upper.x + t*(lower.x);
                }
                if (build.topLeft && build.bottomLeft) {
                  build.right = Math.min(build.right, topX, lower.x);
                  build.topRight = true;
                } else {
                  build.left = Math.max(build.left, topX, lower.x);
                  build.topLeft = true;
                }
              }
              if (build.topLeft && build.topRight && build.bottomLeft && build.bottomRight) {
                row.segments.push({ left: build.left, right: build.right });
                row.build = { ...row.build, ...defaultBuild };
              }
            });
        });
        rows.forEach(row => row.segments.forEach(segment => {
          textBoxes.push({ startX: segment.left, endX: segment.right, y: row.top, y2: row.bottom })
        }));
      } else {
        for (let y=from; y<=till; y+=lineHeight) {
          const y2 = y+lineHeight;
          let startX: number | null = null;
          let topCrosses: number[] = [];
          let bottomCrosses: number[] = [];
          lines.forEach(({ A, B }) => {
            const ABy = A.y - B.y;
            if (ABy !== 0) {
              const t1 = (y-B.y) / ABy;
              if (t1 >= 0 && t1 <= 1) {
                topCrosses.push((1-t1)*B.x + t1*(A.x));
              }
              const t2 = (y2-B.y) / ABy;
              if (t2 >= 0 && t2 <= 1) {
                bottomCrosses.push((1-t2)*B.x + t2*(A.x));
              }
            }
            if (startX === null) {
              if (topCrosses.length > 0 && bottomCrosses.length > 0) {
                startX = Math.max(...topCrosses, ...bottomCrosses);
                topCrosses = [];
                bottomCrosses = [];
              }
            } else {
              if (topCrosses.length > 0 && bottomCrosses.length > 0) {
                textBoxes.push({ startX, endX: Math.min(...topCrosses, ...bottomCrosses), y, y2 });
                topCrosses = [];
                bottomCrosses = [];
              }
            }
          });
        }
      }
    });
    return this.memoizedBoxes = textBoxes;
  }

  createTextPath(): string {
    const textBoxes = this.createTextBoxes();
    return textBoxes.map(({ startX, endX, y2 }) => `M${startX},${y2} L${endX},${y2}`).join(' ');
  }
}

export default Textpoly;