Textpoly
========

        This is a library that
          enables the developer
            to create polygons
              with text in it
                in an SVG doc

The description above could be easily written in a trapezoid.

However it's definitely possible to create a concave polygon and write in it, From readibility (and thus a11y) point of view it's not advised to do so. Sometimes it's better to create two or more polygons next to each other and use them as text columns

TODO: give examples of TOs and DON'Ts

API
---
The **Textpoly** class is exported named and for default

**constructor**([...polygons]): sets the default polygons, it accepts an array of polygons. See [addPolygon](#addPolygon)

(#addPolygon)**addPolygon**(polygon): accepts a polygon in two different formats
- an array of objects { x, y }
- a string of coordinates, just like the **points** attribute of [\<polygon\>](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polygon)

**emptyPolygons**(): empties the polygons to have a fresh start if needed

**createTextBoxes**(): generates an array of box definitions based on the polygons.
The object of each box is { startX, endX, y, y2 } - left, right, top, bottom coordinates respectively

**createTextPath**(): creates a path definition that can be used in [\<path\>](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path) as **d** attribute
