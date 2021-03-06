/**
 *                        WHITEBOPHIR
 *********************************************************
 * @licstart  The following is the entire license notice for the
 *  JavaScript code in this page.
 *
 * Copyright (C) 2013  Ophir LOJKINE
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 */

(function () { //Code isolation

	//Indicates the id of the line the user is currently drawing or an empty string while the user is not drawing
	var curLineId = "",
		index = 0,
		cancel = false,
		lastTime = performance.now(), //The time at which the last point was drawn
		pencilData = [],
		lineElem,
		startDataX,
		startDataY;

	//The data of the message that will be sent for every new point
	function PointMessage(x, y) {
		this.type = 'child';
		this.parent = curLineId;
		this.x = x;
		this.y = y;
	}

	function startLine(x, y, evt) {
		startDataX = x ;
		startDataY = y ;
		//Prevent the press from being interpreted by the browser
		evt.preventDefault();
		if (Tools.deleteForTouches(evt, curLineId)) {
			cancel = true;
			curLineId = "";
			return;
		}
		cancel = false;
		curLineId = Tools.generateUID("l"); //"l" for line
		var size = Tools.getSize();
		if (Tools.curTool.name === 'Eraser') {
			size *= 3;
		} else if (index === 2) {
			size *= 7;
		}
		Tools.drawAndSend({
			'type': 'line',
			'id': curLineId,
			'color': Tools.curTool.name === 'Eraser' ? Tools.getCorrectorColor() : Tools.getColor(),
			'size': size,
			'opacity': (index === 2 && Tools.curTool.name !== 'Eraser') ? 0.5 : 1,
			'dotted': Tools.curTool.name === 'Pencil' ? index === 1 : false,
		}, Tools.list.Pencil);

		//Immediatly add a point to the line
		continueLine(x, y);
	}

	function continueLine(x, y, evt) {
		/*Wait 20ms before adding any point to the currently drawing line.
		This allows the animation to be smother*/
		if (!cancel) {
			if (evt) {
				evt.preventDefault();
			}
			if (curLineId !== "" && performance.now() - lastTime > 20) {
				Tools.drawAndSend(new PointMessage(x, y), Tools.list.Pencil);
				pencilData.push(new PointMessage(x, y))
				lastTime = performance.now();
			}
		}
	}

	function stopLineAt(x, y) {
		//Add a last point to the line
		continueLine(x, y);
		stopLine();

			if (Math.abs(startDataX - x) < 3 || Math.abs(startDataY - y) < 3) {
				if (pencilData.length < 3) {
					Tools.drawAndSend({
						'type': 'PointG',
						'id': lineElem.id,
						'x': pencilData[0].x,
						'y': pencilData[0].y,
						'color': Tools.curTool.name === 'Eraser' ? Tools.getCorrectorColor() : Tools.getColor(),
						'size': Tools.getSize(),
						'opacity': (index === 2 && Tools.curTool.name !== 'Eraser') ? 0.5 : 1,
					}, Tools.list.Pencil);
				} else {
					Tools.drawAndSend({
						'type': 'PointLine',
						'id': lineElem.id,
						'x': pencilData[0].x,
						'y': pencilData[0].y,
						'd': lineElem.getAttribute('d'),
						'color': Tools.curTool.name === 'Eraser' ? Tools.getCorrectorColor() : Tools.getColor(),
						'size': Tools.getSize(),
						'opacity': (index === 2 && Tools.curTool.name !== 'Eraser') ? 0.5 : 1,
					}, Tools.list.Pencil);
				}
			}
		pencilData = [];
	}

	function stopLine() {
		if (curLineId) {
			Tools.addActionToHistory({type: "delete", id: curLineId});
		}
		curLineId = "";
	}

	var renderingLine = {};
	var elementsWithoutChild = {};
	function draw(data) {
		let el;
		Tools.drawingEvent = true;
		switch (data.type) {
			case "line":
				renderingLine = createLine(data);
				pathDataCache[data.id] = "";
				break;
			case "PointG":
				el = createGPoint(data);
				renderGPoint(data, el)
				break;
			case "PointLine":
				el = createGPoint(data);
				renderGLine(data, el)
				break;
			case "child":
				if (!elementsWithoutChild[data.parent]) {
					var line = (renderingLine.id === data.parent) ? renderingLine : svg.getElementById(data.parent);
					if (!line) {
						console.error("Pencil: Hmmm... I received a point of a line that has not been created (%s).", data.parent);
						line = renderingLine = createLine({ "id": data.parent }); //create a new line in order not to loose the points
					}
					addPoint(line, data.x, data.y);
				}
				break;
			case "endline":
				//TODO?
				break;
			default:
				console.error("Pencil: Draw instruction with unknown type. ", data);
				break;
		}
	}

	var pathDataCache = {};
	function getPathData(line) {
		var pathData = pathDataCache[line.id];
		if (!pathData) {
			pathData = line.getPathData();
			pathDataCache[line.id] = pathData;
		}
		return pathData;
	}

	var svg = Tools.svg;

	function addPoint(line, x, y) {
		var pts = getPathData(line);
		pts = wboPencilPoint(pts, x, y);
		line.setPathData(pts);
	}

	function createLine(lineData) {
		//Creates a new line on the canvas, or update a line that already exists with new information
		var line = svg.getElementById(lineData.id) || Tools.createSVGElement("path");
		if (lineData.dotted) {
			line.classList.add('dotted');
		}
		line.id = lineData.id;
		//If some data is not provided, choose default value. The line may be updated later
		line.setAttribute("stroke", lineData.color || "black");
		line.setAttribute("stroke-width", lineData.size || 10);
		line.setAttribute("opacity", Math.max(0.1, Math.min(1, lineData.opacity)) || 1);
		if (lineData.properties) {
			elementsWithoutChild[lineData.id] = true;
			for (var i = 0; i < lineData.properties.length; i++) {
				line.setAttribute(lineData.properties[i][0], lineData.properties[i][1]);
			}
		}
		if (lineData.transform) {
			line.style.transform = lineData.transform;
			line.style.transformOrigin = lineData.transformOrigin;
		}
		Tools.drawingArea.appendChild(line);
		lineElem = line;
		return line;
	}

	function setIndex(newIndex) {
		index = +newIndex;
	}

	function createGPoint(data) {
		let g =  Tools.createSVGElement("g");
		g.setAttribute('id', data.id);

		let lineElem = createLine(data);
		g.innerHTML = '';
		g.appendChild(lineElem)

		let circle = Tools.createSVGElement('circle');
		circle.cx.baseVal.value = data.x;
		circle.cy.baseVal.value = data.y;
		circle.r.baseVal.value = (data.size * 50) / 100;
		circle.setAttribute('id', data.id);
		circle.setAttribute("stroke-width", data.size );
		circle.setAttribute("stroke", 'transparent' );
		circle.setAttribute("fill", data.color )
		g.appendChild(circle);

		return g
	}

	function renderGPoint(data, el) {
		el.setAttribute("stroke", data.color );
		el.setAttribute("stroke-width", data.size );
		el.setAttribute("fill", data.color);

		if (data.transform) {
			el.style.transform = data.transform;
			el.style.transformOrigin = data.transformOrigin;
		}

		if (!Tools.svg.getElementById(data.id)) Tools.drawingArea.appendChild(el);
	}

	function renderGLine(data, el) {
		el.setAttribute("stroke", data.color );
		el.setAttribute("stroke-width", data.size );
		el.setAttribute("fill", data.color);

		el.childNodes[0].setAttribute('d',data.d);

		el.childNodes[0].style.transform = data.transform;
		el.childNodes[0].style.transformOrigin = data.transformOrigin;
		el.childNodes[1].style.transform = data.transform;
		el.childNodes[1].style.transformOrigin = data.transformOrigin;

		Tools.drawingArea.appendChild(el);
	}

	var pencilTool = {
		"name": "Pencil",
		"shortcut": "p",
		"listeners": {
			"press": startLine,
			"move": continueLine,
			"release": stopLineAt,
		},
		"setIndex": setIndex,
		"draw": draw,
		"mouseCursor": "url('tools/pencil/cursor.svg'), crosshair",
		"stylesheet": "tools/pencil/pencil.css"
	};
	Tools.add(pencilTool);
	Tools.change("Pencil"); // Use the Pencil tool by default

})(); //End of code isolation
