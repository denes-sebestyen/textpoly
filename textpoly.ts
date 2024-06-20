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
  options = {
    lineHeight: 15,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0
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
  }

  addPolygon(polygon: Polygon | string) {
    if (typeof polygon==='string') polygon = this.processString(polygon);
    if (!this.isPolygon(polygon)) throw new Error(`can not add polygon '${polygon}', because its format is not valid`);
    this.polygons.push(polygon);
  }

  createTextBoxes(): TextBox[] {
    const textBoxes: TextBox[] = [];
    this.polygons.forEach(polygon => {
      const copyPoly = polygon.map((point, idx) => ({ ...point, idx }));
      const minY = Math.min(...polygon.map(point => point.y));
      const maxY = Math.max(...polygon.map(point => point.y));
      const lines = copyPoly.map((A, idx) => ({ A, B: copyPoly[idx==copyPoly.length-1 ? 0 : idx+1]}))
        .map(line => line.A.x > line.B.x ? { A: line.B, B: line.A } : line);
      lines.sort((l1, l2) => l1.A.x == l2.A.x ? l1.B.x - l2.B.x : l1.A.x - l2.A.x);
      const from = minY+this.options.marginTop;
      const till = maxY-this.options.marginBottom-this.options.lineHeight;
      for (let y=from; y<=till; y+=this.options.lineHeight) {
        const y2 = y+this.options.lineHeight;
        let startX: number | null = null;
        let topCrosses: number[] = [];
        let bottomCrosses: number[] = [];
        lines.forEach(({ A, B }) => {
          const t1 = (y-B.y) / (A.y-B.y);
          if (t1 >= 0 && t1 <= 1) {
            topCrosses.push((1-t1)*B.x + t1*(A.x));
          }
          const t2 = (y2-B.y) / (A.y-B.y);
          if (t2 >= 0 && t2 <= 1) {
            bottomCrosses.push((1-t2)*B.x + t2*(A.x));
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
    });
    return textBoxes;
  }

  createTextPath(): string {
    const textBoxes = this.createTextBoxes();
    return textBoxes.map(({ startX, endX, y2 }) => `M${startX},${y2} L${endX},${y2}`).join(' ');
  }
}

export default Textpoly;